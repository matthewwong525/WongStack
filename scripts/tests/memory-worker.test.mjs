// The account's memory Worker and the admin commands: the real Worker module runs behind a local
// server with node:sqlite bindings, and a fake Cloudflare API serves deploys and the keys database.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { after, test } from 'node:test';
import worker, { bindingFor, hashKey } from '../../.agents/skills/memory/worker/memory-worker.mjs';
import { keyEmail } from '../../.agents/skills/memory/scripts/lib/store.mjs';
import { memory, setup } from './fixtures/memory/harness.mjs';

const KEYS_SCHEMA = readFileSync(new URL('../../.agents/skills/memory/worker/keys.sql', import.meta.url), 'utf8');
const ADMIN_TOKEN = 'admin-api-token';
const servers = [];
after(() => Promise.all(servers.map(server => new Promise(done => server.close(done)))));

// A D1 binding over node:sqlite, and an R2 binding over a Map.
function d1(db) {
  const statement = (sql, params = []) => ({
    bind: (...next) => statement(sql, next),
    all: async () => ({ success: true, results: db.prepare(sql).all(...params).map(row => ({ ...row })), meta: {} }),
    first: async () => { const row = db.prepare(sql).get(...params); return row ? { ...row } : null; },
  });
  return {
    prepare: sql => statement(sql),
    batch: async statements => {
      db.exec('BEGIN');
      try { const out = []; for (const each of statements) out.push(await each.all()); db.exec('COMMIT'); return out; } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
  };
}
const r2 = objects => ({
  get: async key => objects.has(key) ? { body: new Blob([objects.get(key)]).stream() } : null,
  put: async (key, value) => { objects.set(key, Buffer.from(value)); },
});

async function listen(handler) {
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const response = await handler(req, Buffer.concat(chunks));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  });
  servers.push(server);
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  return `http://127.0.0.1:${server.address().port}`;
}

const toRequest = (base, req, body) => new Request(`${base}${req.url}`, {
  method: req.method,
  headers: Object.fromEntries(['authorization', 'content-type'].filter(name => req.headers[name]).map(name => [name, req.headers[name]])),
  body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
});

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// A fake Cloudflare API for the admin commands: D1 list/create/query for the keys database, and Worker deploys.
async function fakeAdminApi(keysDb, { existingBindings = [], databases = ['db1', 'other'], buckets = ['repo-memory'] } = {}) {
  const state = { keysCreated: false, uploads: [], bindings: existingBindings, databases, buckets, denyScripts: false, subdomainRoute: false };
  const api = await listen(async (req, body) => {
    const request = toRequest('http://fake', req, body);
    const path = new URL(request.url).pathname.replace(/^\/client\/v4\/accounts\/acct/, '');
    if (request.headers.get('authorization') !== `Bearer ${ADMIN_TOKEN}`) return json(401, { success: false, errors: [{ message: 'bad token' }] });
    if (path === '/d1/database' && request.method === 'GET') {
      const all = [...(state.keysCreated ? [{ name: 'wong-memory-keys', uuid: 'keys-db' }] : []), ...state.databases.map(uuid => ({ name: uuid, uuid }))];
      const name = new URL(request.url).searchParams.get('name');
      return json(200, { success: true, result: name ? all.filter(database => database.name === name) : all });
    }
    if (path === '/r2/buckets') return json(200, { success: true, result: { buckets: state.buckets.map(name => ({ name })) } });
    if (path === '/d1/database' && request.method === 'POST') { state.keysCreated = true; return json(200, { success: true, result: { uuid: 'keys-db' } }); }
    if (path === '/d1/database/keys-db/query') {
      const input = await request.json();
      const result = (input.batch || [input]).map(({ sql, params = [] }) => ({ results: keysDb.prepare(sql).all(...params).map(row => ({ ...row })) }));
      return json(200, { success: true, result });
    }
    if (path.startsWith('/workers/') && state.denyScripts) return json(403, { success: false, errors: [{ message: 'forbidden' }] });
    if (path === '/workers/scripts/wong-memory/settings') {
      return state.uploads.length || state.bindings.length ? json(200, { success: true, result: { bindings: state.bindings } }) : json(404, { success: false, errors: [{ code: 10007 }] });
    }
    if (path === '/workers/scripts/wong-memory' && request.method === 'PUT') {
      const form = await request.formData();
      const metadata = JSON.parse(await form.get('metadata').text());
      state.uploads.push({ metadata, module: await form.get('memory-worker.mjs').text() });
      state.bindings = metadata.bindings.map(binding => binding.type === 'd1' ? { ...binding, database_id: binding.id } : binding);
      return json(200, { success: true, result: {} });
    }
    if (path === '/workers/scripts/wong-memory/subdomain') { state.subdomainRoute = true; return json(200, { success: true, result: {} }); }
    if (path === '/workers/subdomain') return json(200, { success: true, result: { subdomain: 'testsub' } });
    return json(404, { success: false, errors: [{ message: `no route ${path}` }] });
  });
  return { api: `${api}/client/v4`, state };
}

// The real Worker module behind a local server, with bindings to the harness's store.
async function workerServer(env, keysDb) {
  const bindings = {
    KEYS: d1(keysDb),
    [bindingFor.database('db1')]: d1(env.fake.db),
    [bindingFor.bucket('repo-memory')]: r2(env.fake.objects),
  };
  return listen((req, body) => worker.fetch(toRequest('http://worker', req, body), bindings));
}

const config = env => JSON.parse(readFileSync(join(env.repo.root, '.claude', '.wong-stack.json'), 'utf8')).components.memory;
const setWorker = (env, url) => {
  const file = join(env.repo.root, '.claude', '.wong-stack.json');
  const record = JSON.parse(readFileSync(file, 'utf8'));
  record.components.memory.worker = url;
  writeFileSync(file, JSON.stringify(record));
};

// A store with a deployed Worker, an admin key in .env, and a member key for ana.
async function team() {
  const env = await setup();
  const keysDb = new DatabaseSync(':memory:');
  const admin = await fakeAdminApi(keysDb, { existingBindings: [
    { type: 'd1', name: 'DB_other', id: 'other', database_id: 'other' },
    { type: 'd1', name: 'DB_gone', id: 'gone', database_id: 'gone' },
    { type: 'r2_bucket', name: 'R2_gone_memory', bucket_name: 'gone-memory' },
  ] });
  writeFileSync(join(env.repo.root, '.env'), `${readFileSync(join(env.repo.root, '.env'), 'utf8')}CLOUDFLARE_API_TOKEN=${ADMIN_TOKEN}\n`);
  const options = { env: { WONG_CLOUDFLARE_API: admin.api } };
  const deployed = await memory(env.repo, env.fake, ['worker', 'deploy'], options);
  assert.equal(deployed.code, 0, deployed.stderr);
  const added = await memory(env.repo, env.fake, ['member', 'add', 'Ana@Example.com'], options);
  assert.equal(added.code, 0, added.stderr);
  const anaKey = added.stdout.match(/^CLOUDFLARE_MEMORY_TOKEN=(\S+)$/m)[1];
  const self = await memory(env.repo, env.fake, ['member', 'add', 'dev@example.com', '--admin', '--env'], options);
  assert.equal(self.code, 0, self.stderr);
  const url = await workerServer(env, keysDb);
  setWorker(env, url);
  return { env, keysDb, admin, options, anaKey, deployed, added, self, url };
}

// Through the Worker, not the harness's REST fake.
const viaWorker = (extra = {}) => ({ env: { WONG_MEMORY_API: '', ...extra } });

test('worker deploy keeps other repos\' bindings, drops deleted ones, attaches this repo, and records the URL', async () => {
  const { env, admin, deployed } = await team();
  const [upload] = admin.state.uploads;
  assert.deepEqual(upload.metadata.bindings.map(binding => binding.name).sort(), ['DB_db1', 'DB_other', 'KEYS', 'R2_repo_memory']);
  assert.equal(upload.metadata.main_module, 'memory-worker.mjs');
  assert.match(upload.module, /export default/);
  assert.ok(admin.state.subdomainRoute);
  assert.match(deployed.stdout, /https:\/\/wong-memory\.testsub\.workers\.dev/);
  assert.equal(config(env).team, true);
});

test('member add prints a key once, stores only its hash, and --env writes the admin key to .env', async () => {
  const { env, keysDb, anaKey, added, self, options } = await team();
  assert.equal(keyEmail(anaKey), 'ana@example.com');
  const rows = keysDb.prepare('SELECT hash, email, role, database_id, bucket FROM keys ORDER BY email').all().map(row => ({ ...row }));
  assert.deepEqual(rows.map(row => [row.email, row.role, row.database_id, row.bucket]), [['ana@example.com', 'member', 'db1', 'repo-memory'], ['dev@example.com', 'admin', 'db1', 'repo-memory']]);
  assert.equal(rows[0].hash, await hashKey(anaKey));
  assert.ok(!JSON.stringify(rows).includes(anaKey));
  assert.match(added.stdout, /shown once/);
  assert.doesNotMatch(self.stdout, /wongm_/);
  assert.match(readFileSync(join(env.repo.root, '.env'), 'utf8'), /^CLOUDFLARE_MEMORY_TOKEN=wongm_/m);
  const listed = await memory(env.repo, env.fake, ['member', 'list'], options);
  assert.equal(listed.code, 0, listed.stderr);
  assert.match(listed.stdout, /ana@example\.com \(member/);
  assert.doesNotMatch(listed.stdout, /wongm_|[0-9a-f]{64}/);
});

test('a member searches through the Worker; an unknown or removed key is refused', async () => {
  const { env, anaKey, options } = await team();
  env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('x', 'project', 'deploys need a tag', 'save', '2026-09-01T00:00:00Z', 'dev@example.com')").run();
  const asAna = await memory(env.repo, env.fake, ['search', 'deploys'], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: anaKey }));
  assert.equal(asAna.code, 0, asAna.stderr);
  assert.match(asAna.stdout, /deploys need a tag/);
  const unknown = await memory(env.repo, env.fake, ['search', 'deploys'], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: 'wongm_YUBiLmNv.nope' }));
  assert.equal(unknown.code, 1);
  assert.match(unknown.stderr, /rejected CLOUDFLARE_MEMORY_TOKEN \(HTTP 401\)/);
  const removed = await memory(env.repo, env.fake, ['member', 'remove', 'ana@example.com'], options);
  assert.match(removed.stdout, /no longer opens/);
  const after = await memory(env.repo, env.fake, ['search', 'deploys'], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: anaKey }));
  assert.match(after.stderr, /HTTP 401/);
});

test('a key opens only its own repo\'s store', async () => {
  const { url, keysDb } = await team();
  keysDb.prepare("INSERT INTO keys VALUES (?, 'bo@example.com', 'admin', 'other', 'other-memory', '2026-09-26T00:00:00Z')").run(await hashKey('wongm_Ym8.other'));
  const response = await fetch(`${url}/accounts/acct/d1/database/db1/query`, { method: 'POST', headers: { Authorization: 'Bearer wongm_Ym8.other' }, body: JSON.stringify({ sql: 'SELECT 1' }) });
  assert.equal(response.status, 403);
  const object = await fetch(`${url}/accounts/acct/r2/buckets/repo-memory/objects/sessions/bo@example.com/x`, { headers: { Authorization: 'Bearer wongm_Ym8.other' } });
  assert.equal(object.status, 403);
});

test('a member reads only their own transcripts; the admin reads every key', async () => {
  const { env, url, anaKey } = await team();
  const adminKey = readFileSync(join(env.repo.root, '.env'), 'utf8').match(/^CLOUDFLARE_MEMORY_TOKEN=(\S+)$/m)[1];
  const at = key => `${url}/accounts/acct/r2/buckets/repo-memory/objects/${encodeURI(key)}`;
  const as = key => ({ headers: { Authorization: `Bearer ${key}` } });
  assert.equal((await fetch(at('sessions/ana@example.com/claude/a.jsonl'), { method: 'PUT', body: 'mine', ...as(anaKey) })).status, 200);
  assert.equal(await (await fetch(at('sessions/ana@example.com/claude/a.jsonl'), as(anaKey))).text(), 'mine');
  env.fake.objects.set('sessions/dev@example.com/claude/d.jsonl', Buffer.from('dev'));
  env.fake.objects.set('sessions/claude/old.jsonl', Buffer.from('old'));
  for (const key of ['sessions/dev@example.com/claude/d.jsonl', 'sessions/claude/old.jsonl']) {
    const refused = await fetch(at(key), as(anaKey));
    assert.equal(refused.status, 403);
    assert.equal((await refused.json()).errors[0].code, 'not_author');
  }
  assert.equal((await fetch(at('sessions/claude/x.jsonl'), { method: 'PUT', body: 'no', ...as(anaKey) })).status, 403);
  assert.equal(await (await fetch(at('sessions/claude/old.jsonl'), as(adminKey))).text(), 'old');
  assert.equal(await (await fetch(at('sessions/ana@example.com/claude/a.jsonl'), as(adminKey))).text(), 'mine');

  env.fake.db.prepare("INSERT INTO sessions (id, agent, author, status, raw_key, updated_at) VALUES ('claude:d', 'claude', 'dev@example.com', 'captured', 'sessions/dev@example.com/claude/d.jsonl', '2026-09-26')").run();
  const [{ id }] = env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author, session_id) VALUES ('x', 'project', 'from dev', 'save', '2026-09-26T00:00:00Z', 'dev@example.com', 'claude:d') RETURNING id").all();
  const source = await memory(env.repo, env.fake, ['source', String(id)], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: anaKey }));
  assert.equal(source.code, 0, source.stderr);
  assert.match(source.stdout, /only the author and the admin can read this transcript/);
});

test('in a team, user and feedback facts are only your own, matched on every email on your people page', async () => {
  const { env } = await team();
  const insert = (type, body, author) => env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('x', ?, ?, 'save', '2026-09-26T00:00:00Z', ?)").run(type, body, author);
  insert('feedback', 'ana likes short deploy notes', 'ana@example.com');
  insert('project', 'ana says deploy runs at noon', 'ana@example.com');
  insert('feedback', 'dev wants deploy logs', 'dev@example.com');
  insert('user', 'dev deploy from home', 'dev@home.example');
  mkdirSync(join(env.repo.root, 'wiki', 'people'), { recursive: true });
  writeFileSync(join(env.repo.root, 'wiki', 'people', 'dev.md'), '# Dev\n\nGit emails: dev@example.com, dev@home.example\n');
  const mine = await memory(env.repo, env.fake, ['search', 'deploy'], viaWorker());
  assert.equal(mine.code, 0, mine.stderr);
  assert.doesNotMatch(mine.stdout, /short deploy notes/);
  assert.match(mine.stdout, /runs at noon/);
  assert.match(mine.stdout, /deploy logs/);
  assert.match(mine.stdout, /from home/);
  const everyone = await memory(env.repo, env.fake, ['search', 'deploy', '--everyone'], viaWorker());
  assert.match(everyone.stdout, /short deploy notes/);
  const digest = await memory(env.repo, env.fake, ['digest'], viaWorker());
  assert.match(digest.stdout, /only your own user and feedback facts/);
  assert.doesNotMatch(digest.stdout, /short deploy notes/);
  assert.match(digest.stdout, /runs at noon/);
});

test('a solo repo does not filter by person', async () => {
  const env = await setup();
  env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('x', 'feedback', 'someone else prefers tabs', 'save', '2026-09-26T00:00:00Z', 'other@example.com')").run();
  const result = await memory(env.repo, env.fake, ['search', 'tabs']);
  assert.match(result.stdout, /prefers tabs/);
});

test('uploads are filed under the key\'s email', async () => {
  assert.equal(keyEmail(`wongm_${Buffer.from('ana@example.com').toString('base64url')}.abc`), 'ana@example.com');
  assert.equal(keyEmail('cf-token-value'), null);
});

test('a token that cannot deploy Workers names the permission and records nothing', async () => {
  const env = await setup();
  const admin = await fakeAdminApi(new DatabaseSync(':memory:'));
  admin.state.denyScripts = true;
  writeFileSync(join(env.repo.root, '.env'), `${readFileSync(join(env.repo.root, '.env'), 'utf8')}CLOUDFLARE_API_TOKEN=${ADMIN_TOKEN}\n`);
  const result = await memory(env.repo, env.fake, ['worker', 'deploy'], { env: { WONG_CLOUDFLARE_API: admin.api } });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /lacks Workers Scripts Write/);
  assert.equal(config(env).worker, undefined);
});

test('a memory key with no recorded Worker stops with a clear message', async () => {
  const env = await setup();
  const result = await memory(env.repo, env.fake, ['search', 'x'], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: 'wongm_YUBiLmNv.k' }));
  assert.equal(result.code, 1);
  assert.match(result.stderr, /records no components\.memory\.worker/);
});

test('with a Worker recorded, migrate runs with the admin token straight to Cloudflare', async () => {
  const { env, options } = await team();
  const result = await memory(env.repo, env.fake, ['migrate'], { env: { ...options.env, WONG_CLOUDFLARE_API: env.fake.api, CLOUDFLARE_API_TOKEN: 'test-memory-token-value' } });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /up to date/);
});

test('the Worker answers a batch in Cloudflare\'s shape and refuses a request with no key', async () => {
  const keysDb = new DatabaseSync(':memory:');
  keysDb.exec(KEYS_SCHEMA);
  keysDb.prepare("INSERT INTO keys VALUES (?, 'a@b.co', 'admin', 'db1', NULL, 'now')").run(await hashKey('wongm_k.1'));
  const bindings = { KEYS: d1(keysDb), DB_db1: d1(new DatabaseSync(':memory:')) };
  const call = (headers, body) => worker.fetch(new Request('http://w/accounts/a/d1/database/db1/query', { method: 'POST', headers, body: JSON.stringify(body) }), bindings);
  assert.equal((await call({}, { sql: 'SELECT 1' })).status, 401);
  const ok = await (await call({ Authorization: 'Bearer wongm_k.1' }, { batch: [{ sql: 'SELECT ? AS n', params: [7] }, { sql: 'SELECT 2 AS m' }] })).json();
  assert.equal(ok.success, true);
  assert.deepEqual(ok.result.map(result => result.results), [[{ n: 7 }], [{ m: 2 }]]);
  const bad = await call({ Authorization: 'Bearer wongm_k.1' }, { sql: 'SELECT nope FROM nowhere' });
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).success, false);
});
