// A fake Cloudflare API over HTTP, with D1 on node:sqlite, and a fake `gh` on PATH, for the provisioning
// script's and the server installer's tests. Callers spawn children asynchronously: a synchronous spawn
// would block the event loop this server answers on.
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const TOKEN = 'cf-user-secret-value';
export const ACCOUNT = '0123456789abcdef0123456789abcdef';

// The groups the tables in permission-groups.md name, with their real ids, plus the zone-scoped trap copy.
export const GROUPS = [
  ['API Tokens Write', 'user', '686d18d5ac6c441c867cbf6771e58a0a'],
  ['Account API Tokens Write', 'account', '5bc3f8b21c554832afc660159ab75fa4'],
  ['Workers Scripts Write', 'account', 'e086da7e2179491d91ee5f35b3ca210a'],
  ['D1 Write', 'account', '09b2857d1c31407795e75e3fed8617a1'],
  ['Account Settings Read', 'account', 'c1fde68c7bcc44588cbb6ddbc16d6480'],
  ['Workers CI Read', 'account', 'ad99c5ae555e45c4bef5bdf2678388ba'],
  ['Workers CI Write', 'account', '2e095cf436e2455fa62c9a9c2e18c478'],
  ['User Details Read', 'user', '8acbe5bb0d54464ab867149d7f7cf8ac'],
  ['Workers R2 Storage Write', 'account', 'bf7481a1826f439697cb59a20b22293e'],
  ['Workers Routes Write', 'account.zone', '28f4b596e7d643029c524985477ae49a'],
  ['D1 Write', 'account.zone', 'zone0000000000000000000000000d1w'],
].map(([name, scope, id]) => ({ id, name, scopes: [`com.cloudflare.api.${scope}`] }));

export const groupId = (name) => GROUPS.find((g) => g.name === name && !g.scopes[0].includes('zone')).id;

/** The two policies of a freshly made user token: the two rows the person grants. */
export const startingPolicies = () => [
  { id: 'p1', effect: 'allow', resources: { 'com.cloudflare.api.user.u1': '*' }, permission_groups: [{ id: groupId('API Tokens Write') }] },
  { id: 'p2', effect: 'allow', resources: { [`com.cloudflare.api.account.${ACCOUNT}`]: '*' }, permission_groups: [{ id: groupId('Account API Tokens Write') }] },
];

const run = (db, sql, params = []) => (params.length === 0 && /;\s*\S/.test(sql.trim().replace(/;\s*$/, '')) ? (db.exec(sql), []) : db.prepare(sql).all(...params));

/**
 * The fake. `state` is live: tests read and change it between runs. `refuse` holds `METHOD /path`
 * prefixes that answer 500; `forbiddenPolls` 403s the widen's probe that many times; `d1Failures`
 * fails that many D1 queries.
 */
export async function fakeCloudflare({ r2 = true, subdomain = 'ada', accounts = [{ id: ACCOUNT, name: 'Ada' }] } = {}) {
  const state = {
    r2,
    subdomain,
    accounts,
    policies: startingPolicies(),
    condition: undefined,
    workers: [],
    databases: [],
    buckets: [],
    accountTokens: [],
    refuse: [],
    forbiddenPolls: 0,
    d1Failures: 0,
    minted: [],
    puts: [],
  };
  const sqlite = new Map();
  const calls = [];
  let serial = 0;

  const ok = (result) => [200, { success: true, errors: [], result }];
  const no = (status, code = 1000, message = 'refused') => [status, { success: false, errors: [{ code, message }] }];
  const account = `/accounts/${ACCOUNT}`;

  function handle(method, path, body) {
    const url = new URL(`http://x${path}`);
    const route = `${method} ${url.pathname}`;
    const query = url.searchParams;
    if (route === 'GET /user/tokens/verify') return ok({ id: 'tok1', status: 'active' });
    if (route === 'GET /user/tokens/tok1') return ok({ id: 'tok1', name: 'WongStack', status: 'active', policies: structuredClone(state.policies), ...(state.condition && { condition: state.condition }) });
    if (route === 'GET /user/tokens/permission_groups') return ok(GROUPS);
    if (route === 'PUT /user/tokens/tok1') {
      state.policies = body.policies;
      state.puts.push(body);
      return ok({ id: 'tok1' });
    }
    if (route === 'GET /accounts') return ok(state.accounts);
    if (route === `GET ${account}/d1/database`) {
      if (query.get('per_page') === '1' && state.forbiddenPolls > 0) {
        state.forbiddenPolls--;
        return no(403, 10000, 'Authentication error');
      }
      const name = query.get('name');
      return ok(state.databases.filter((d) => !name || d.name.includes(name)));
    }
    if (route === `POST ${account}/d1/database`) {
      const db = { uuid: `uuid-${body.name}`, name: body.name };
      state.databases.push(db);
      return ok(db);
    }
    const d1 = url.pathname.match(new RegExp(`^${account}/d1/database/([^/]+)/query$`));
    if (method === 'POST' && d1) {
      if (!state.databases.some((d) => d.uuid === d1[1])) return no(404, 7404, 'no such database');
      if (state.d1Failures > 0) {
        state.d1Failures--;
        return no(500, 7500, 'try again');
      }
      if (!sqlite.has(d1[1])) sqlite.set(d1[1], new DatabaseSync(':memory:'));
      const db = sqlite.get(d1[1]);
      const statements = body.batch || [body];
      try {
        db.exec('BEGIN');
        const result = statements.map(({ sql, params }) => ({ success: true, results: run(db, sql, params || []).map((row) => ({ ...row })), meta: {} }));
        db.exec('COMMIT');
        return ok(result);
      } catch (error) {
        db.exec('ROLLBACK');
        return no(400, 7500, error.message);
      }
    }
    if (route === `GET ${account}/workers/scripts`) return ok(state.workers.map((id) => ({ id })));
    if (route === `GET ${account}/r2/buckets`) return state.r2 ? ok({ buckets: state.buckets.map((name) => ({ name })) }) : no(403, 10042, 'Please enable R2 through the Cloudflare Dashboard.');
    if (route === `POST ${account}/r2/buckets`) {
      if (!state.r2) return no(403, 10042, 'Please enable R2 through the Cloudflare Dashboard.');
      state.buckets.push(body.name);
      return ok({ name: body.name });
    }
    if (route === `GET ${account}/workers/subdomain`) return state.subdomain ? ok({ subdomain: state.subdomain }) : no(404, 10007, 'no subdomain');
    if (route === `PUT ${account}/workers/subdomain`) {
      if (body.subdomain === 'ada') return no(409, 10036, 'taken');
      state.subdomain = body.subdomain;
      return ok({ subdomain: body.subdomain });
    }
    if (route === `GET ${account}/tokens`) return ok(state.accountTokens.map(({ id, name }) => ({ id, name })));
    if (route === `POST ${account}/tokens`) {
      const value = `deploy-secret-${++serial}`;
      state.accountTokens.push({ id: `a-${body.name}`, name: body.name, status: 'active', policies: body.policies });
      state.minted.push(value);
      return ok({ id: `a-${body.name}`, value });
    }
    const accountToken = url.pathname.match(new RegExp(`^${account}/tokens/([^/]+)(/value)?$`));
    if (accountToken) {
      const found = state.accountTokens.find((t) => t.id === accountToken[1]);
      if (!found) return no(404, 1003, 'no such token');
      if (method === 'GET' && !accountToken[2]) return ok(structuredClone(found));
      if (method === 'PUT' && !accountToken[2]) {
        found.policies = body.policies;
        return ok({ id: found.id });
      }
      if (method === 'PUT') {
        const value = `deploy-rolled-${++serial}`;
        state.minted.push(value);
        return ok(value);
      }
    }
    return no(500, 1000, `no route ${route}`);
  }

  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const text = Buffer.concat(chunks).toString('utf8');
    const path = req.url.replace(/^\/client\/v4/, '');
    calls.push({ method: req.method, path, body: text });
    const send = ([status, data]) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(no(403, 9109, 'Invalid access token'));
    if (state.refuse.some((prefix) => `${req.method} ${path}`.startsWith(prefix))) return send(no(500, 1000, 'refused by the test'));
    send(handle(req.method, path, text ? JSON.parse(text) : undefined));
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const api = `http://127.0.0.1:${server.address().port}/client/v4`;
  return {
    api,
    state,
    calls,
    /** Rows from one fake D1 database, by name. */
    rows: (name, sql) => {
      const uuid = state.databases.find((d) => d.name === name)?.uuid;
      return uuid && sqlite.has(uuid) ? sqlite.get(uuid).prepare(sql).all().map((row) => ({ ...row })) : [];
    },
    count: (prefix) => calls.filter((call) => `${call.method} ${call.path}`.startsWith(prefix)).length,
    close: () =>
      new Promise((done) => {
        server.closeAllConnections();
        server.close(done);
      }),
  };
}

/**
 * A fake `gh` in `<dir>/bin`: `secret list` and `secret set` against `<dir>/secrets`, and `api user` as ada's
 * GitHub account, 4242; every argument list logged to `<dir>/calls`. A `<dir>/fail` file makes every secret call fail.
 */
export function fakeGh(dir) {
  const bin = join(dir, 'bin');
  mkdirSync(join(dir, 'secrets'), { recursive: true });
  mkdirSync(bin, { recursive: true });
  const script = `#!/bin/sh
echo "$*" >> "${dir}/calls"
[ "$1 $2" = "api user" ] && { echo '{"id":4242,"login":"ada"}'; exit 0; }
[ -e "${dir}/fail" ] && { echo "gh: HTTP 403" >&2; exit 1; }
case "$1 $2" in
  "secret list") for f in "${dir}/secrets"/*; do [ -e "$f" ] && printf '%s\\t2026-01-01T00:00:00Z\\n' "$(basename "$f")"; done; exit 0 ;;
  "secret set") cat > "${dir}/secrets/$3"; exit 0 ;;
esac
exit 1
`;
  writeFileSync(join(bin, 'gh'), script);
  chmodSync(join(bin, 'gh'), 0o755);
  return {
    bin,
    calls: () => (existsSync(join(dir, 'calls')) ? readFileSync(join(dir, 'calls'), 'utf8') : ''),
    secrets: () => Object.fromEntries(readdirSync(join(dir, 'secrets')).map((name) => [name, readFileSync(join(dir, 'secrets', name), 'utf8')])),
    fail: (on = true) => (on ? writeFileSync(join(dir, 'fail'), '') : rmSync(join(dir, 'fail'), { force: true })),
  };
}
