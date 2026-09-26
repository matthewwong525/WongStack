// The memory route of the app's production Worker and the admin's key commands: the real handler runs
// behind a local server with node:sqlite and Map bindings over the harness's store, routed the way
// app/worker/index.ts routes it; the admin commands reach the same store through the fake Cloudflare API.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { after, test } from 'node:test';
import { handleMemory, hashKey, MEMORY_PREFIX } from '../../.agents/skills/memory/worker/memory-worker.mjs';
import { keyEmail } from '../../.agents/skills/memory/scripts/lib/store.mjs';
import { memory, setup, writeJsonFile } from './fixtures/memory/harness.mjs';

const ADMIN_TOKEN = 'test-memory-token-value';
const KEYS_SCHEMA = readFileSync(new URL('../../.agents/skills/memory/migrations/0002_keys.sql', import.meta.url), 'utf8');
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
    const body = Buffer.concat(chunks);
    const request = new Request(`http://worker${req.url}`, {
      method: req.method,
      headers: Object.fromEntries(['authorization', 'content-type'].filter(name => req.headers[name]).map(name => [name, req.headers[name]])),
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
    });
    const response = await handler(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  });
  servers.push(server);
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  return `http://127.0.0.1:${server.address().port}`;
}

// The app Worker's routing: /_memory/ goes to the memory route, anything else is the app's 404.
const appWorker = bindings => listen(request => new URL(request.url).pathname.startsWith(MEMORY_PREFIX)
  ? handleMemory(request, bindings)
  : new Response(null, { status: 404 }));

const record = env => JSON.parse(readFileSync(join(env.repo.root, '.claude', '.wong-stack.json'), 'utf8')).components.memory;
const setWorker = (env, url) => {
  const file = join(env.repo.root, '.claude', '.wong-stack.json');
  const next = JSON.parse(readFileSync(file, 'utf8'));
  next.components.memory.worker = url;
  writeFileSync(file, JSON.stringify(next));
};
const envKey = env => readFileSync(join(env.repo.root, '.env'), 'utf8').match(/^CLOUDFLARE_MEMORY_TOKEN=(\S+)$/m)[1];

// The admin's commands go straight to the fake Cloudflare API with CLOUDFLARE_API_TOKEN.
const asAdmin = env => ({ env: { WONG_CLOUDFLARE_API: env.fake.api, CLOUDFLARE_API_TOKEN: ADMIN_TOKEN } });
// A key's calls go to the recorded Worker URL, not the harness's REST fake.
const viaWorker = (extra = {}) => ({ env: { WONG_MEMORY_API: '', ...extra } });

// A store served by an app Worker, an admin key in .env, and a member key for ana.
async function team() {
  const env = await setup();
  const url = await appWorker({ MEMORY_DB: d1(env.fake.db), MEMORY_BUCKET: r2(env.fake.objects) });
  setWorker(env, `${url}/_memory`);
  const added = await memory(env.repo, env.fake, ['member', 'add', 'Ana@Example.com'], asAdmin(env));
  assert.equal(added.code, 0, added.stderr);
  const anaKey = added.stdout.match(/^CLOUDFLARE_MEMORY_TOKEN=(\S+)$/m)[1];
  const self = await memory(env.repo, env.fake, ['member', 'add', 'dev@example.com', '--admin', '--env'], asAdmin(env));
  assert.equal(self.code, 0, self.stderr);
  return { env, url, anaKey, added, self };
}

const call = (url, key, body) => fetch(`${url}/_memory/accounts/acct/d1/database/db1/query`, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: JSON.stringify(body) });

test('member add prints a key once, stores only its hash in the store, and --env writes the admin key to .env', async () => {
  const { env, anaKey, added, self } = await team();
  assert.equal(keyEmail(anaKey), 'ana@example.com');
  const rows = env.fake.db.prepare('SELECT hash, email, role FROM memory_keys ORDER BY email').all().map(row => ({ ...row }));
  assert.deepEqual(rows.map(row => [row.email, row.role]), [['ana@example.com', 'member'], ['dev@example.com', 'admin']]);
  assert.equal(rows[0].hash, await hashKey(anaKey));
  assert.ok(!JSON.stringify(rows).includes(anaKey));
  assert.match(added.stdout, /shown once/);
  assert.doesNotMatch(self.stdout, /wongm_/);
  assert.match(envKey(env), /^wongm_/);
  assert.equal(record(env).team, true);
  const listed = await memory(env.repo, env.fake, ['member', 'list'], asAdmin(env));
  assert.equal(listed.code, 0, listed.stderr);
  assert.match(listed.stdout, /ana@example\.com \(member/);
  assert.doesNotMatch(listed.stdout, /wongm_|[0-9a-f]{64}/);
});

test('member add stops when no Worker URL is recorded', async () => {
  const env = await setup();
  const result = await memory(env.repo, env.fake, ['member', 'add', 'ana@example.com'], asAdmin(env));
  assert.equal(result.code, 1);
  assert.match(result.stderr, /no memory Worker URL is recorded/);
  assert.equal(env.fake.db.prepare('SELECT count(*) AS n FROM memory_keys').get().n, 0);
});

test('a token that cannot write D1 names the permission and adds no key', async () => {
  const { env } = await team();
  const result = await memory(env.repo, env.fake, ['member', 'add', 'bo@example.com'], { env: { ...asAdmin(env).env, CLOUDFLARE_API_TOKEN: 'narrow-token' } });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /lacks D1 Write/);
  assert.equal(env.fake.db.prepare("SELECT count(*) AS n FROM memory_keys WHERE email = 'bo@example.com'").get().n, 0);
});

test('a member searches through the Worker; an unknown or removed key is refused', async () => {
  const { env, anaKey } = await team();
  env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('x', 'project', 'deploys need a tag', 'save', '2026-09-01T00:00:00Z', 'dev@example.com')").run();
  const calls = env.fake.calls.length;
  const asAna = await memory(env.repo, env.fake, ['search', 'deploys'], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: anaKey }));
  assert.equal(asAna.code, 0, asAna.stderr);
  assert.match(asAna.stdout, /deploys need a tag/);
  assert.equal(env.fake.calls.length, calls, 'a key never reaches the REST API');
  const unknown = await memory(env.repo, env.fake, ['search', 'deploys'], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: 'wongm_YUBiLmNv.nope' }));
  assert.equal(unknown.code, 1);
  assert.match(unknown.stderr, /rejected CLOUDFLARE_MEMORY_TOKEN \(HTTP 401\)/);
  const removed = await memory(env.repo, env.fake, ['member', 'remove', 'ana@example.com'], asAdmin(env));
  assert.match(removed.stdout, /no longer opens/);
  const later = await memory(env.repo, env.fake, ['search', 'deploys'], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: anaKey }));
  assert.match(later.stderr, /HTTP 401/);
});

test('a key for another repo\'s store is unknown here', async () => {
  const { url } = await team();
  const other = new DatabaseSync(':memory:');
  other.exec(KEYS_SCHEMA);
  other.prepare("INSERT INTO memory_keys VALUES (?, 'bo@example.com', 'admin', '2026-09-26T00:00:00Z')").run(await hashKey('wongm_Ym8.other'));
  const response = await call(url, 'wongm_Ym8.other', { sql: 'SELECT 1' });
  assert.equal(response.status, 401);
});

test('no key can name the keys table or unlock the schema, and nothing in the batch runs', async () => {
  const { env, url } = await team();
  const adminKey = envKey(env);
  const refused = [
    'SELECT * FROM memory_keys',
    'select hash from MEMORY_KEYS',
    'SELECT * FROM "memory_keys"',
    'SELECT * FROM [memory_keys]',
    'SELECT * FROM `Memory_Keys`',
    "INSERT INTO memory_keys VALUES ('h', 'x@y.co', 'admin', 'now')",
    "CREATE TRIGGER t AFTER INSERT ON facts BEGIN INSERT INTO memory_keys VALUES ('h', 'x@y.co', 'admin', 'now'); END",
    'PRAGMA writable_schema = ON',
  ];
  for (const sql of refused) {
    const response = await call(url, adminKey, { sql });
    assert.equal(response.status, 403, sql);
    assert.equal((await response.json()).errors[0].code, 'keys_table', sql);
  }
  const before = env.fake.db.prepare('SELECT count(*) AS n FROM facts').get().n;
  const batch = await call(url, adminKey, { batch: [
    { sql: "INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('x', 'project', 'first', 'save', 'now', 'a@b.co')" },
    { sql: 'DELETE FROM memory_keys' },
  ] });
  assert.equal(batch.status, 403);
  assert.equal(env.fake.db.prepare('SELECT count(*) AS n FROM facts').get().n, before);
  assert.equal(env.fake.db.prepare('SELECT count(*) AS n FROM memory_keys').get().n, 2);
});

test('a Worker with no memory store answers 404, and a store with no bucket keeps no transcripts', async () => {
  const staging = await appWorker({});
  const response = await call(staging, 'wongm_any.key', { sql: 'SELECT 1' });
  assert.equal(response.status, 404);
  assert.equal((await response.json()).errors[0].code, 'no_store');

  const env = await setup();
  const url = await appWorker({ MEMORY_DB: d1(env.fake.db) });
  env.fake.db.prepare("INSERT INTO memory_keys VALUES (?, 'dev@example.com', 'admin', 'now')").run(await hashKey('wongm_ZGV2.k'));
  const object = await fetch(`${url}/_memory/accounts/acct/r2/buckets/repo-memory/objects/sessions/x`, { headers: { Authorization: 'Bearer wongm_ZGV2.k' } });
  assert.equal(object.status, 404);
  assert.equal((await object.json()).errors[0].code, 'no_bucket');
  const other = await fetch(`${url}/_memory/nothing`, { headers: { Authorization: 'Bearer wongm_ZGV2.k' } });
  assert.equal((await other.json()).errors[0].code, 'no_route');
});

test('a member reads only their own transcripts; the admin reads every key', async () => {
  const { env, url, anaKey } = await team();
  const adminKey = envKey(env);
  const at = key => `${url}/_memory/accounts/acct/r2/buckets/repo-memory/objects/${encodeURI(key)}`;
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
  assert.equal((await fetch(at('sessions/ana@example.com/claude/a.jsonl'), { method: 'DELETE', ...as(anaKey) })).status, 405);
  assert.equal((await fetch(at('sessions/ana@example.com/none.jsonl'), as(anaKey))).status, 404);
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

test('an older store\'s Cloudflare token goes to the REST API even with a Worker recorded', async () => {
  const env = await setup();
  let workerCalls = 0;
  setWorker(env, `${await listen(() => { workerCalls += 1; return new Response(null, { status: 500 }); })}/_memory`);
  env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('x', 'project', 'still on the old token', 'save', '2026-09-26T00:00:00Z', 'dev@example.com')").run();
  const result = await memory(env.repo, env.fake, ['search', 'token'], { env: { WONG_MEMORY_API: '', WONG_CLOUDFLARE_API: env.fake.api } });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /still on the old token/);
  assert.equal(workerCalls, 0);
});

test('before production deploys the route, a key\'s write waits in the spool', async () => {
  const env = await setup();
  setWorker(env, `${await listen(() => new Response('There is nothing here yet', { status: 404 }))}/_memory`);
  const input = writeJsonFile(env.repo.home, 'facts.json', { source: 'save', slug: 'sp', facts: [{ action: 'add', type: 'project', body: 'Written before the first deploy.' }] });
  const result = await memory(env.repo, env.fake, ['put-facts', '--file', input], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: `wongm_${Buffer.from('dev@example.com').toString('base64url')}.k` }));
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /spooled: 1 facts wait in/);
  assert.equal(readdirSync(join(env.repo.stateDir, 'spool')).length, 1);
});

test('a memory key with no recorded Worker stops with a clear message', async () => {
  const env = await setup();
  const result = await memory(env.repo, env.fake, ['search', 'x'], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: 'wongm_YUBiLmNv.k' }));
  assert.equal(result.code, 1);
  assert.match(result.stderr, /records no components\.memory\.worker/);
});

test('there is no worker deploy command', async () => {
  const env = await setup();
  const result = await memory(env.repo, env.fake, ['worker', 'deploy'], asAdmin(env));
  assert.equal(result.code, 2);
  assert.match(result.stderr, /unknown command: worker\nusage:/);
  assert.doesNotMatch(result.stderr, /worker deploy/);
});

test('with a Worker recorded, migrate runs with the admin token straight to Cloudflare', async () => {
  const { env } = await team();
  const result = await memory(env.repo, env.fake, ['migrate'], asAdmin(env));
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /up to date/);
});

test('the route answers a batch in Cloudflare\'s shape and refuses a request with no key', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(KEYS_SCHEMA);
  db.prepare("INSERT INTO memory_keys VALUES (?, 'a@b.co', 'admin', 'now')").run(await hashKey('wongm_k.1'));
  const route = (headers, body) => handleMemory(new Request('http://w/_memory/accounts/a/d1/database/db1/query', { method: 'POST', headers, body: JSON.stringify(body) }), { MEMORY_DB: d1(db) });
  assert.equal((await route({}, { sql: 'SELECT 1' })).status, 401);
  const ok = await (await route({ Authorization: 'Bearer wongm_k.1' }, { batch: [{ sql: 'SELECT ? AS n', params: [7] }, { sql: 'SELECT 2 AS m' }] })).json();
  assert.equal(ok.success, true);
  assert.deepEqual(ok.result.map(result => result.results), [[{ n: 7 }], [{ m: 2 }]]);
  const bad = await route({ Authorization: 'Bearer wongm_k.1' }, { sql: 'SELECT nope FROM nowhere' });
  assert.equal(bad.status, 400);
  assert.equal((await bad.json()).success, false);
  assert.equal((await route({ Authorization: 'Bearer wongm_k.1' }, {})).status, 400);
});
