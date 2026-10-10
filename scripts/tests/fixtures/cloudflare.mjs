// A fake Cloudflare API over HTTP, with D1 on node:sqlite, and a fake `gh` on PATH, for the provisioning
// script's tests. Callers spawn children asynchronously: a synchronous spawn
// would block the event loop this server answers on.
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { d1Query } from './d1.mjs';

export const TOKEN = 'cf-user-secret-value';
export const ACCOUNT = '0123456789abcdef0123456789abcdef';

/** The one Artifacts namespace every install in an account shares. */
const NAMESPACE = 'wongstack';

// The groups the tables in permission-groups.md name, with their real ids, plus the zone-scoped trap copy.
// A scope is one of the API's own (`user`, `account`, `account.zone`) or, spelled in full, another product's.
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
  ['Access: Apps and Policies Read', 'account', '7ea222f6d5064cfa89ea366d7c1fee89'],
  ['Access: Apps and Policies Write', 'account', '1e13c5124ca64b72b1969a67e8829049'],
  ['Access: Organizations, Identity Providers, and Groups Write', 'account', 'bfe0d8686a584fa680f4c53b5eb0de6d'],
  ['Access: Service Tokens Write', 'account', 'a1c0fec57cf94af79479a6d827fa518c'],
  ['Zero Trust Write', 'account', 'b33f02c6f7284e05a6f20741c0bb0567'],
  ['Access: Apps and Policies Write', 'account.zone', '959972745952452f8be2452be8cbb9f2'],
  ['D1 Write', 'account.zone', 'zone0000000000000000000000000d1w'],
  // The rest of the read-only look-up key, with the zone-scoped copy of its one ambiguous name.
  ['Workers Scripts Read', 'account', '1a71c399035b4950a1bd1466bbe4f420'],
  ['Workers Tail Read', 'account', '05880cd1bdc24d8bae0be2136972816b'],
  ['Account Analytics Read', 'account', 'b89a480218d04ceb98b4fe57ca29dc1f'],
  ['Access: Audit Logs Read', 'account', 'b05b28e839c54467a7d6cba5d3abb5a3'],
  ['Zone Read', 'account.zone', 'c8fed203ed3043cba015a93ad1616f1f'],
  ['DNS Read', 'account.zone', '82e64a83756745bbbb1c9c2701bf816b'],
  ['Analytics Read', 'account.zone', '9c88f9c5bce24ce7af9a958ba9c504db'],
  ['Access: Apps and Policies Read', 'account.zone', 'zone00000000000000000000000appsr'],
  ['Artifacts Write', 'account', 'f9e1ba803b8d4d52b4d4184825b07a28'],
  ['Workers Containers Write', 'account', 'bdbcd690c763475a985e8641dddc09f7'],
  ['Billing Read', 'account', '7cf72faf220841aabcfdfab81c43c4f6'],
  // Legacy model permission groups remain available as traps: setup must not grant them.
  ['AI Gateway Write', 'account', '6c8a3737f07f46369c1ea1f22138daaf'],
  ['AI Gateway Run', 'account', '644535f4ed854494a59cb289d634b257'],
  ['Workers AI Read', 'account', 'a92d2450e05d4e7bb7d0a64968f83d11'],
  ['Workers R2 Storage Bucket Item Write', 'com.cloudflare.edge.r2.bucket', '2efd5506f9c8494dacb1fa10a3e7d5b6'],
].map(([name, scope, id]) => ({ id, name, scopes: [scope.startsWith('com.') ? scope : `com.cloudflare.api.${scope}`] }));

export const groupId = (name) => GROUPS.find((g) => g.name === name && !g.scopes[0].includes('zone')).id;

/** The two policies of a freshly made user token: the two rows the person grants. */
export const startingPolicies = () => [
  { id: 'p1', effect: 'allow', resources: { 'com.cloudflare.api.user.u1': '*' }, permission_groups: [{ id: groupId('API Tokens Write') }] },
  { id: 'p2', effect: 'allow', resources: { [`com.cloudflare.api.account.${ACCOUNT}`]: '*' }, permission_groups: [{ id: groupId('Account API Tokens Write') }] },
];

/**
 * The fake. `state` is live: tests read and change it between runs. `refuse` holds `METHOD /path`
 * prefixes that answer 500; `refusedPolls` refuses the widen's probe that many times with `refusedStatus`
 * (`403` or `401`, code `10000`), as Cloudflare does while a widen takes effect; `refusedAccessPolls` does
 * the same to the widen's Access probes, as an account without a card may; `d1Failures` fails that
 * many D1 queries. `needsOnboarding` refuses a new Zero Trust organization with a 403, as an account
 * without a card does.
 *
 * For an Artifacts install: `paid` says whether the account's subscriptions list Workers Paid. `repos`
 * names repositories another project already made in the shared namespace. `repos`, `namespaces` and
 * `repoTokens` (each `active` until revoked) are the Artifacts side; `lifecycles` holds each bucket's
 * rules; `workerSecrets` each Worker's secrets by name, readable only once the Worker exists;
 * `tokenValues` each account token's current value by id.
 * `forbidTokens` answers every account-token call 403, as a user token narrowed back from Account API
 * Tokens Write does. `newerPreview` names Workers whose newest uploaded version is not the deployed one:
 * storing a secret there answers 400, code `10215`. `gateways` holds each AI Gateway a routine runner made.
 */
export async function fakeCloudflare({ r2 = true, subdomain = 'ada', accounts = [{ id: ACCOUNT, name: 'Ada' }], paid = true, repos = [] } = {}) {
  const remoteOf = (namespace, name) => `https://${ACCOUNT}.artifacts.cloudflare.net/git/${namespace}/${name}.git`;
  const state = {
    r2,
    paid,
    namespaces: repos.length ? [NAMESPACE] : [],
    repos: repos.map((name) => ({ id: `foreign-${name}`, namespace: NAMESPACE, name, default_branch: 'main', remote: remoteOf(NAMESPACE, name) })),
    repoTokens: [],
    lifecycles: {},
    gateways: [],
    workerSecrets: {},
    tokenValues: {},
    subdomain,
    accounts,
    policies: startingPolicies(),
    condition: undefined,
    workers: [],
    databases: [],
    buckets: [],
    accountTokens: [],
    refuse: [],
    needsOnboarding: false,
    refusedPolls: 0,
    refusedAccessPolls: 0,
    refusedStatus: 403,
    d1Failures: 0,
    minted: [],
    puts: [],
    organization: { auth_domain: 'ada.cloudflareaccess.com', name: 'Existing organization', session_duration: '24h' },
    identityProviders: [{ id: 'pin-existing', type: 'onetimepin' }, { id: 'oidc-existing', type: 'oidc' }],
    accessApps: [],
    serviceTokens: [],
    workerDetails: {},
    workerSubdomains: {},
    forbidTokens: false,
    newerPreview: [],
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
    if (route === `GET ${account}/subscriptions`) {
      const other = { id: 'sub-zero-trust', rate_plan: { id: 'teams_free', public_name: 'Zero Trust Free' } };
      return ok(state.paid ? [other, { id: 'sub-workers', rate_plan: { id: 'workers_paid', public_name: 'Workers Paid' } }] : [other]);
    }
    const spaces = `${account}/artifacts/namespaces`;
    if (route === `POST ${spaces}`) {
      if (state.namespaces.includes(body.namespace)) return no(409, 1000, 'this namespace already exists');
      state.namespaces.push(body.namespace);
      return ok({ name: body.namespace });
    }
    const artifacts = url.pathname.match(new RegExp(`^${spaces}/([^/]+)(?:/(repos|tokens)(?:/([^/]+)(/tokens)?)?)?$`));
    if (artifacts) {
      const [, namespace, kind, name, tokens] = artifacts;
      if (!state.namespaces.includes(namespace)) return no(404, 1000, 'no such namespace');
      const inSpace = state.repos.filter((each) => each.namespace === namespace);
      const repo = inSpace.find((each) => each.name === name);
      if (method === 'GET' && !kind) return ok({ name: namespace });
      if (method === 'GET' && kind === 'repos' && !name) return ok(structuredClone(inSpace.slice(0, Number(query.get('limit') ?? 50))));
      if (method === 'POST' && kind === 'repos' && !name) {
        if (inSpace.some((each) => each.name === body.name)) return no(409, 1000, 'this repository already exists');
        const made = { id: `repo-${++serial}`, namespace, name: body.name, default_branch: body.default_branch ?? 'main', remote: remoteOf(namespace, body.name) };
        const token = `art_v2_x_${createHash('sha1').update(`${body.name}:${serial}`).digest('hex')}?expires=1900000000`;
        state.repos.push(made);
        state.repoTokens.push({ id: `repo-token-${++serial}`, namespace, repo: body.name, scope: 'write', state: 'active', plaintext: token });
        return ok({ ...made, token });
      }
      if (method === 'GET' && kind === 'repos' && name) {
        if (!repo) return no(404, 1000, 'no such repository');
        if (!tokens) return ok(structuredClone(repo));
        const wanted = query.get('state');
        return ok(state.repoTokens.filter((each) => each.namespace === namespace && each.repo === name && (!wanted || each.state === wanted)).map(({ plaintext: _plaintext, ...token }) => token));
      }
      if (method === 'DELETE' && kind === 'tokens' && name && !tokens) {
        const token = state.repoTokens.find((each) => each.namespace === namespace && each.id === name);
        if (!token) return no(404, 1000, 'no such token');
        token.state = 'revoked';
        return ok({ id: token.id });
      }
    }
    if (method === 'GET' && query.get('per_page') === '1' && /\/access\/(apps|identity_providers|service_tokens)$/.test(url.pathname) && state.refusedAccessPolls > 0) {
      state.refusedAccessPolls--;
      return no(state.refusedStatus, 10000, 'Authentication error');
    }
    if (route === `GET ${account}/access/organizations`) return state.organization ? ok(state.organization) : no(404);
    if (route === `POST ${account}/access/organizations`) {
      if (state.needsOnboarding) return no(403, 12130, 'finish Zero Trust onboarding first');
      state.organization = body;
      return ok(body);
    }
    if (route === `GET ${account}/access/identity_providers`) return ok(state.identityProviders);
    if (route === `POST ${account}/access/identity_providers`) {
      const provider = { ...body, id: `provider-${++serial}` };
      state.identityProviders.push(provider);
      return ok(provider);
    }
    if (route === `GET ${account}/access/apps`) {
      const page = Number(query.get('page') ?? 1);
      const size = Number(query.get('per_page') ?? 1000);
      return ok(state.accessApps.slice((page - 1) * size, page * size));
    }
    if (route === `POST ${account}/access/apps`) {
      const app = { ...body, id: `app-${++serial}`, aud: `aud-${serial}` };
      state.accessApps.push(app);
      return ok(app);
    }
    if (route === `GET ${account}/access/service_tokens`) return ok(state.serviceTokens.map(({ client_secret: _clientSecret, ...token }) => token));
    if (route === `POST ${account}/access/service_tokens`) {
      const token = { ...body, id: `service-${++serial}`, client_id: `client-${serial}.access`, client_secret: `service-secret-${serial}` };
      state.serviceTokens.push(token);
      return ok(token);
    }
    const rotateService = url.pathname.match(new RegExp(`^${account}/access/service_tokens/([^/]+)/rotate$`));
    if (method === 'POST' && rotateService) {
      const token = state.serviceTokens.find(item => item.id === rotateService[1]);
      if (!token) return no(404);
      token.client_secret = `service-secret-${++serial}`;
      return ok(token);
    }
    const accessApp = url.pathname.match(new RegExp(`^${account}/access/apps/([^/]+)(/policies(?:/([^/]+))?)?$`));
    if (accessApp) {
      const app = state.accessApps.find(item => item.id === accessApp[1]);
      if (!app) return no(404);
      if (!accessApp[2]) {
        if (method === 'GET') return ok(app);
        if (method === 'PUT') {
          const previous = app.policies;
          Object.assign(app, body);
          app.policies = body.policies.map(ref => previous.find(policy => policy.id === ref.id));
          return ok(app);
        }
      } else {
        if (method === 'GET') return ok(app.policies);
        if (method === 'POST') {
          const policy = { ...body, id: `policy-${++serial}` };
          app.policies.push(policy);
          return ok(policy);
        }
        if (method === 'PUT') {
          const policy = app.policies.find(item => item.id === accessApp[3]);
          Object.assign(policy, body);
          return ok(policy);
        }
      }
    }
    if (route === `GET ${account}/d1/database`) {
      if (query.get('per_page') === '1' && state.refusedPolls > 0) {
        state.refusedPolls--;
        return no(state.refusedStatus, 10000, 'Authentication error');
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
      return d1Query(sqlite.get(d1[1]), body);
    }
    if (route === `GET ${account}/workers/scripts`) return ok(state.workers.map((id) => ({ id, routes: state.workerDetails[id]?.routes ?? [] })));
    const workerLookup = url.pathname.match(new RegExp(`^${account}/workers/workers/([^/]+)$`));
    if (method === 'GET' && workerLookup) {
      const name = workerLookup[1];
      if (!state.workers.includes(name)) return no(404);
      return ok(state.workerDetails[name] ?? { id: createHash('md5').update(name).digest('hex'), name, references: { domains: [] } });
    }
    const workerSecrets = url.pathname.match(new RegExp(`^${account}/workers/scripts/([^/]+)/secrets$`));
    if (workerSecrets && (method === 'GET' || method === 'PUT')) {
      const script = workerSecrets[1];
      if (!state.workers.includes(script)) return no(404, 10007, 'This Worker does not exist on your account.');
      if (method === 'GET') return ok(Object.keys(state.workerSecrets[script] ?? {}).map((name) => ({ name, type: 'secret_text' })));
      if (state.newerPreview.includes(script)) return no(400, 10215, "Secret edit failed. The latest version of your Worker isn't currently deployed.");
      state.workerSecrets[script] = { ...state.workerSecrets[script], [body.name]: body.text };
      return ok({ name: body.name, type: body.type });
    }
    const workerSecret = url.pathname.match(new RegExp(`^${account}/workers/scripts/([^/]+)/secrets/([^/]+)$`));
    if (workerSecret && method === 'DELETE') {
      const [, script, name] = workerSecret;
      if (!Object.hasOwn(state.workerSecrets[script] ?? {}, name)) return no(404, 10056, 'Binding not found.');
      delete state.workerSecrets[script][name];
      return ok(null);
    }
    const gateways = `${account}/ai-gateway/gateways`;
    if (route === `POST ${gateways}`) {
      if (state.gateways.some((gateway) => gateway.id === body.id)) return no(409, 7002, 'this gateway already exists');
      state.gateways.push(body);
      return ok(body);
    }
    if (method === 'GET' && url.pathname.startsWith(`${gateways}/`)) {
      const found = state.gateways.find((gateway) => gateway.id === url.pathname.slice(gateways.length + 1));
      return found ? ok(found) : no(404, 7002, 'Not Found');
    }
    const workerScript = url.pathname.match(new RegExp(`^${account}/workers/scripts/([^/]+)(/subdomain)?$`));
    if (workerScript && method === 'PUT' && !workerScript[2]) {
      if (!state.workers.includes(workerScript[1])) state.workers.push(workerScript[1]);
      return ok({ id: workerScript[1] });
    }
    if (workerScript && method === 'POST' && workerScript[2]) {
      state.workerSubdomains[workerScript[1]] = body;
      return ok(body);
    }
    if (workerScript && method === 'GET' && workerScript[2]) {
      return ok(state.workerSubdomains[workerScript[1]] ?? { enabled: false, previews_enabled: false });
    }
    if (route === `GET ${account}/r2/buckets`) return state.r2 ? ok({ buckets: state.buckets.map((name) => ({ name })) }) : no(403, 10042, 'Please enable R2 through the Cloudflare Dashboard.');
    if (route === `POST ${account}/r2/buckets`) {
      if (!state.r2) return no(403, 10042, 'Please enable R2 through the Cloudflare Dashboard.');
      state.buckets.push(body.name);
      return ok({ name: body.name });
    }
    const lifecycle = url.pathname.match(new RegExp(`^${account}/r2/buckets/([^/]+)/lifecycle$`));
    if (method === 'PUT' && lifecycle) {
      if (!state.r2) return no(403, 10042, 'Please enable R2 through the Cloudflare Dashboard.');
      if (!state.buckets.includes(lifecycle[1])) return no(404, 10006, 'The specified bucket does not exist.');
      state.lifecycles[lifecycle[1]] = body.rules;
      return ok({});
    }
    if (route === `GET ${account}/workers/subdomain`) return state.subdomain ? ok({ subdomain: state.subdomain }) : no(404, 10007, 'no subdomain');
    if (route === `PUT ${account}/workers/subdomain`) {
      if (body.subdomain === 'ada') return no(409, 10036, 'taken');
      state.subdomain = body.subdomain;
      return ok({ subdomain: body.subdomain });
    }
    if (state.forbidTokens && url.pathname.startsWith(`${account}/tokens`)) return no(403, 9109, 'Unauthorized to access requested resource');
    if (route === `GET ${account}/tokens`) return ok(state.accountTokens.map(({ id, name }) => ({ id, name })));
    if (route === `POST ${account}/tokens`) {
      const value = `deploy-secret-${++serial}`;
      const id = createHash('md5').update(`${body.name}:${serial}`).digest('hex');
      state.accountTokens.push({ id, name: body.name, status: 'active', policies: body.policies });
      state.minted.push(value);
      state.tokenValues[id] = value;
      return ok({ id, value });
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
        state.tokenValues[found.id] = value;
        return ok(value);
      }
      if (method === 'DELETE') {
        state.accountTokens = state.accountTokens.filter(token => token.id !== found.id);
        delete state.tokenValues[found.id];
        return ok({ id: found.id });
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
    const multipart = req.headers['content-type']?.startsWith('multipart/form-data');
    send(handle(req.method, path, text ? (multipart ? text : JSON.parse(text)) : undefined));
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
