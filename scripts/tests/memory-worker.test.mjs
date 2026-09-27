// The memory route of the app's production Worker and the admin's key commands: the real handler runs
// behind a local server with node:sqlite and Map bindings over the harness's store, routed the way
// app/worker/index.ts routes it; the admin commands reach the same store through the fake Cloudflare API.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { after, test } from 'node:test';
import { handleMemory, hashKey, MEMORY_PREFIX } from '../../.agents/skills/memory/worker/memory-worker.mjs';
import { batchRefusal, memberRefusal, supersedeSql, WRITES } from '../../.agents/skills/memory/worker/statements.mjs';
import { personalFilter } from '../../.agents/skills/memory/scripts/lib/digest.mjs';
import { keyEmail } from '../../.agents/skills/memory/scripts/lib/store.mjs';
import { memory, node, setup, tempDir, writeJsonFile } from './fixtures/memory/harness.mjs';

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
async function team(t) {
  const env = await setup(t);
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

test('member add prints a key once, stores only its hash in the store, and --env writes the admin key to .env', async t => {
  const { env, anaKey, added, self } = await team(t);
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

test('member add stops when no Worker URL is recorded', async t => {
  const env = await setup(t);
  const result = await memory(env.repo, env.fake, ['member', 'add', 'ana@example.com'], asAdmin(env));
  assert.equal(result.code, 1);
  assert.match(result.stderr, /no memory Worker URL is recorded/);
  assert.equal(env.fake.db.prepare('SELECT count(*) AS n FROM memory_keys').get().n, 0);
});

test('a token that cannot write D1 names the permission and adds no key', async t => {
  const { env } = await team(t);
  const result = await memory(env.repo, env.fake, ['member', 'add', 'bo@example.com'], { env: { ...asAdmin(env).env, CLOUDFLARE_API_TOKEN: 'narrow-token' } });
  assert.equal(result.code, 1);
  assert.match(result.stderr, /lacks D1 Write/);
  assert.equal(env.fake.db.prepare("SELECT count(*) AS n FROM memory_keys WHERE email = 'bo@example.com'").get().n, 0);
});

test('a member searches through the Worker; an unknown or removed key is refused', async t => {
  const { env, anaKey } = await team(t);
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

test('a key for another repo\'s store is unknown here', async t => {
  const { url } = await team(t);
  const other = new DatabaseSync(':memory:');
  other.exec(KEYS_SCHEMA);
  other.prepare("INSERT INTO memory_keys VALUES (?, 'bo@example.com', 'admin', '2026-09-26T00:00:00Z')").run(await hashKey('wongm_Ym8.other'));
  const response = await call(url, 'wongm_Ym8.other', { sql: 'SELECT 1' });
  assert.equal(response.status, 401);
});

test('no key can name the keys table or unlock the schema, and nothing in the batch runs', async t => {
  const { env, url } = await team(t);
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

test('a Worker with no memory store answers 404, and a store with no bucket keeps no transcripts', async t => {
  const staging = await appWorker({});
  const response = await call(staging, 'wongm_any.key', { sql: 'SELECT 1' });
  assert.equal(response.status, 404);
  assert.equal((await response.json()).errors[0].code, 'no_store');

  const env = await setup(t);
  const url = await appWorker({ MEMORY_DB: d1(env.fake.db) });
  env.fake.db.prepare("INSERT INTO memory_keys (hash, email, role, created_at) VALUES (?, 'dev@example.com', 'admin', 'now')").run(await hashKey('wongm_ZGV2.k'));
  const object = await fetch(`${url}/_memory/accounts/acct/r2/buckets/repo-memory/objects/sessions/x`, { headers: { Authorization: 'Bearer wongm_ZGV2.k' } });
  assert.equal(object.status, 404);
  assert.equal((await object.json()).errors[0].code, 'no_bucket');
  const other = await fetch(`${url}/_memory/nothing`, { headers: { Authorization: 'Bearer wongm_ZGV2.k' } });
  assert.equal((await other.json()).errors[0].code, 'no_route');
});

test('a member reads only their own transcripts; the admin reads every key', async t => {
  const { env, url, anaKey } = await team(t);
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

test('in a team, user and feedback facts are only your own, matched on every email on your people page', async t => {
  const { env } = await team(t);
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

test('a solo repo does not filter by person', async t => {
  const env = await setup(t);
  env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('x', 'feedback', 'someone else prefers tabs', 'save', '2026-09-26T00:00:00Z', 'other@example.com')").run();
  const result = await memory(env.repo, env.fake, ['search', 'tabs']);
  assert.match(result.stdout, /prefers tabs/);
});

test('uploads are filed under the key\'s email', async () => {
  assert.equal(keyEmail(`wongm_${Buffer.from('ana@example.com').toString('base64url')}.abc`), 'ana@example.com');
  assert.equal(keyEmail('cf-token-value'), null);
});

test('an older store\'s Cloudflare token goes to the REST API even with a Worker recorded', async t => {
  const env = await setup(t);
  let workerCalls = 0;
  setWorker(env, `${await listen(() => { workerCalls += 1; return new Response(null, { status: 500 }); })}/_memory`);
  env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('x', 'project', 'still on the old token', 'save', '2026-09-26T00:00:00Z', 'dev@example.com')").run();
  const result = await memory(env.repo, env.fake, ['search', 'token'], { env: { WONG_MEMORY_API: '', WONG_CLOUDFLARE_API: env.fake.api } });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /still on the old token/);
  assert.equal(workerCalls, 0);
});

test('before production deploys the route, a key\'s write waits in the spool', async t => {
  const env = await setup(t);
  setWorker(env, `${await listen(() => new Response('There is nothing here yet', { status: 404 }))}/_memory`);
  const input = writeJsonFile(env.repo.home, 'facts.json', { source: 'save', slug: 'sp', facts: [{ action: 'add', type: 'project', body: 'Written before the first deploy.' }] });
  const result = await memory(env.repo, env.fake, ['put-facts', '--file', input], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: `wongm_${Buffer.from('dev@example.com').toString('base64url')}.k` }));
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /spooled: 1 facts wait in/);
  assert.equal(readdirSync(join(env.repo.stateDir, 'spool')).length, 1);
});

test('a memory key with no recorded Worker stops with a clear message', async t => {
  const env = await setup(t);
  const result = await memory(env.repo, env.fake, ['search', 'x'], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: 'wongm_YUBiLmNv.k' }));
  assert.equal(result.code, 1);
  assert.match(result.stderr, /records no components\.memory\.worker/);
});

test('there is no worker deploy command', async t => {
  const env = await setup(t);
  const result = await memory(env.repo, env.fake, ['worker', 'deploy'], asAdmin(env));
  assert.equal(result.code, 2);
  assert.match(result.stderr, /unknown command: worker\nusage:/);
  assert.doesNotMatch(result.stderr, /worker deploy/);
});

test('with a Worker recorded, migrate runs with the admin token straight to Cloudflare', async t => {
  const { env } = await team(t);
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

// ---------- expiry, the team header, and what a member key may write ----------

const keyFor = email => `wongm_${Buffer.from(email).toString('base64url')}.k${Math.random().toString(36).slice(2)}`;
async function addKey(db, email, role, { machine = null, expiresAt = null } = {}) {
  const key = keyFor(email);
  db.prepare('INSERT INTO memory_keys (hash, email, role, created_at, machine, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(await hashKey(key), email, role, '2026-09-27T00:00:00Z', machine, expiresAt);
  return key;
}

test('an expired key runs nothing and the script says join renews it; a key with no expiry keeps working', async t => {
  const { env, url } = await team(t);
  const old = await addKey(env.fake.db, 'bo@example.com', 'member', { machine: 'm1', expiresAt: '2026-01-01T00:00:00Z' });
  const response = await call(url, old, { sql: 'SELECT 1' });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).errors[0].code, 'key_expired');
  const search = await memory(env.repo, env.fake, ['search', 'x'], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: old }));
  assert.equal(search.code, 1);
  assert.match(search.stderr, /expired; `node \.claude\/skills\/memory\/scripts\/memory\.mjs join` renews it/);
  const future = await addKey(env.fake.db, 'cy@example.com', 'member', { machine: 'm2', expiresAt: '2999-01-01T00:00:00Z' });
  assert.equal((await call(url, future, { sql: 'SELECT 1' })).status, 200);
  assert.equal((await call(url, envKey(env), { sql: 'SELECT 1' })).status, 200, 'the admin key from setup has no expiry');
});

test('the Worker says when more than one email holds a key, and the script turns on the personal filter from it', async t => {
  const env = await setup(t);
  const url = await appWorker({ MEMORY_DB: d1(env.fake.db), MEMORY_BUCKET: r2(env.fake.objects) });
  setWorker(env, `${url}/_memory`);
  const devKey = await addKey(env.fake.db, 'dev@example.com', 'admin');
  const solo = await call(url, devKey, { sql: 'SELECT 1' });
  assert.equal(solo.headers.get('Wong-Memory-Team'), '0');
  env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('x', 'feedback', 'ana prefers tabs', 'save', '2026-09-26T00:00:00Z', 'ana@example.com')").run();
  const before = await memory(env.repo, env.fake, ['search', 'tabs'], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: devKey }));
  assert.match(before.stdout, /prefers tabs/, 'a solo store does not filter');
  await addKey(env.fake.db, 'ana@example.com', 'member', { machine: 'm1', expiresAt: '2999-01-01T00:00:00Z' });
  assert.equal((await call(url, devKey, { sql: 'SELECT 1' })).headers.get('Wong-Memory-Team'), '1');
  await memory(env.repo, env.fake, ['search', 'tabs'], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: devKey }));
  assert.equal(record(env).team, undefined, 'the committed record is not changed');
  const after = await memory(env.repo, env.fake, ['search', 'tabs'], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: devKey }));
  assert.doesNotMatch(after.stdout, /prefers tabs/, 'the next call filters by person');
});

test('a store not yet migrated to schema 3 still serves its keys', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(KEYS_SCHEMA);
  db.prepare("INSERT INTO memory_keys VALUES (?, 'a@b.co', 'member', 'now')").run(await hashKey('wongm_old.1'));
  const response = await handleMemory(new Request('http://w/_memory/accounts/a/d1/database/db1/query', { method: 'POST', headers: { Authorization: 'Bearer wongm_old.1' }, body: JSON.stringify({ sql: 'SELECT 1 AS n' }) }), { MEMORY_DB: d1(db) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Wong-Memory-Team'), '0');
});

test('every write the memory script sends passes for a member under its own email, and no other name', () => {
  const email = 'ana@example.com';
  const params = { session: ['claude:1', 'claude', email], tag: ['t', 'd', null, email, 'now'], fact: ['s', 'project', 'b', null, 'save', 'now', email], factTag: ['t'], supersede: [1, 2], run: ['capture'] };
  for (const [name, write] of Object.entries(WRITES)) {
    const sql = name === 'supersede' ? supersedeSql(2) : write.sql;
    assert.equal(memberRefusal({ sql, params: params[name] }, email), null, name);
    if (write.author === undefined) continue;
    const other = [...params[name]];
    other[write.author] = 'bo@example.com';
    assert.match(memberRefusal({ sql, params: other }, email), /only under its own email/, name);
  }
  for (const sql of ['SELECT body FROM facts WHERE body LIKE ?', 'WITH x AS (SELECT 1) SELECT * FROM x', 'select 1;', 'SELECT updated_at, created_by FROM tags']) {
    assert.equal(memberRefusal({ sql }, email), null, sql);
  }
  // A read is checked on its whole text: a write word anywhere is refused, even inside a literal.
  assert.match(memberRefusal({ sql: "SELECT body FROM facts WHERE body LIKE '%delete%'" }, email), /not change or delete/);
});

test('a member tags or supersedes only after its own fact in the same batch', () => {
  const email = 'ana@example.com';
  const fact = { sql: WRITES.fact.sql, params: ['s', 'project', 'b', null, 'save', 'now', email] };
  const tag = { sql: WRITES.factTag.sql, params: ['t'] };
  const supersede = { sql: supersedeSql(1), params: [3] };
  assert.equal(batchRefusal([fact, tag, supersede], email), null);
  for (const batch of [[supersede], [tag], [supersede, fact], [{ sql: 'SELECT 1' }, supersede]]) {
    assert.match(batchRefusal(batch, email), /only after writing its own fact/);
  }
});

test('a member key cannot change, delete, or write under another name, and a refused batch runs nothing', async t => {
  const { env, url, anaKey } = await team(t);
  const [{ id }] = env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('x', 'project', 'keep me', 'save', '2026-09-26T00:00:00Z', 'dev@example.com') RETURNING id").all();
  const refused = [
    `DELETE FROM facts WHERE id = ${id}`,
    `UPDATE facts SET body = 'x' WHERE id = ${id}`,
    `update FACTS set BODY = 'x'`,
    "INSERT OR REPLACE INTO facts (id, slug, type, body, source, created_at) VALUES (1, 'x', 'project', 'y', 'save', 'now')",
    'DROP TABLE facts',
    'DROP TRIGGER facts_never_deleted',
    `UPDATE facts SET superseded_by = 1 WHERE id = ${id}`,
    'DELETE FROM sessions',
    'PRAGMA foreign_keys = OFF',
    "ATTACH DATABASE 'x' AS y",
    `SELECT 1; DELETE FROM facts`,
    `SELECT 1 /* */ ; DELETE FROM facts`,
    `WITH x AS (SELECT 1) DELETE FROM facts`,
    `SELECT 1 -- '\nDELETE FROM facts`,
    "WITH a AS (SELECT 1 AS [']) DELETE FROM tags WHERE 'x'='x'",
    "SELECT 1 AS \"'\"; DELETE FROM tags WHERE 'x'='x'",
    { sql: supersedeSql(1), params: [id] },
  ];
  env.fake.db.prepare("INSERT INTO tags (name, definition, created_at) VALUES ('keep', 'A tag to keep.', 'now')").run();
  for (const each of refused) {
    const statement = typeof each === 'string' ? { sql: each } : each;
    const response = await call(url, anaKey, statement);
    assert.equal(response.status, 403, statement.sql);
    assert.equal((await response.json()).errors[0].code, 'member_write', statement.sql);
  }
  assert.equal(env.fake.db.prepare("SELECT count(*) AS n FROM tags WHERE name = 'keep'").get().n, 1, 'no tag was deleted');
  assert.equal(env.fake.db.prepare('SELECT superseded_by FROM facts WHERE id = ?').get(id).superseded_by, null, 'the fact stays live');
  const asBo = await call(url, anaKey, { sql: WRITES.fact.sql, params: ['x', 'project', 'as bo', null, 'save', 'now', 'bo@example.com'] });
  assert.equal(asBo.status, 403);
  const hidden = await call(url, anaKey, { batch: [
    { sql: WRITES.fact.sql, params: ['x', 'project', 'first', null, 'save', 'now', 'ana@example.com'] },
    { sql: `DELETE FROM facts WHERE id = ${id}` },
  ] });
  assert.equal(hidden.status, 403);
  assert.deepEqual(env.fake.db.prepare('SELECT body FROM facts').all().map(row => row.body), ['keep me']);
  const admin = await call(url, envKey(env), { sql: 'DELETE FROM runs' });
  assert.equal(admin.status, 200, 'the admin key is not limited to the script\'s writes');
});

test('a member saves and supersedes through the script, under the key\'s email even when git says otherwise', async t => {
  const { env, anaKey } = await team(t);
  const first = writeJsonFile(env.repo.home, 'first.json', { source: 'save', slug: 'm', facts: [{ action: 'add', type: 'feedback', body: 'Ana wants short plans.' }] });
  const added = await memory(env.repo, env.fake, ['put-facts', '--file', first], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: anaKey }));
  assert.equal(added.code, 0, added.stderr);
  const [{ id, author }] = env.fake.db.prepare("SELECT id, author FROM facts WHERE slug = 'm'").all();
  assert.equal(author, 'ana@example.com', 'git config says dev@example.com; the key says ana');
  const second = writeJsonFile(env.repo.home, 'second.json', { source: 'save', slug: 'm', newTags: [{ name: 'plans', definition: 'How plans are written.' }],
    facts: [{ action: 'supersede', supersedes: [id], type: 'feedback', body: 'Ana wants short plans with one drawing.', tags: ['plans'] }] });
  const replaced = await memory(env.repo, env.fake, ['put-facts', '--file', second], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: anaKey }));
  assert.equal(replaced.code, 0, replaced.stderr);
  assert.match(replaced.stdout, /added 0, superseded 1/);
  const mine = await memory(env.repo, env.fake, ['search', 'plans'], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: anaKey }));
  assert.match(mine.stdout, /one drawing/, 'Ana sees her own feedback in a team');
});

test('a member cannot rewrite a session another author holds, or one written before keys', async t => {
  const { env, url, anaKey } = await team(t);
  const insert = env.fake.db.prepare("INSERT INTO sessions (id, agent, author, status, reason, updated_at) VALUES (?, 'claude', ?, 'captured', 'theirs', 'now')");
  insert.run('claude:bo', 'bo@example.com');
  insert.run('claude:old', null);
  insert.run('claude:ana', 'ana@example.com');
  const upsert = (id, reason) => ({ sql: WRITES.session.sql, params: [id, 'claude', 'ana@example.com', null, null, null, null, null, 'skipped', reason, null, null, null, 'later'] });
  for (const id of ['claude:bo', 'claude:old']) {
    const response = await call(url, anaKey, upsert(id, 'mine now'));
    assert.equal(response.status, 403, id);
    assert.match((await response.json()).errors[0].message, /belongs to another author/);
  }
  assert.equal((await call(url, anaKey, upsert('claude:ana', 'still mine'))).status, 200);
  assert.equal((await call(url, anaKey, upsert('claude:new', 'new'))).status, 200);
  const reasons = Object.fromEntries(env.fake.db.prepare('SELECT id, reason FROM sessions').all().map(row => [row.id, row.reason]));
  assert.deepEqual(reasons, { 'claude:bo': 'theirs', 'claude:old': 'theirs', 'claude:ana': 'still mine', 'claude:new': 'new' });
});

test('a malformed object path is a 400, not a crash', async t => {
  const { url, anaKey } = await team(t);
  const response = await fetch(`${url}/_memory/accounts/a/r2/buckets/b/objects/%E0`, { headers: { Authorization: `Bearer ${anaKey}` } });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).errors[0].code, 'bad_path');
});

test('every read the memory script sends passes for a member', async t => {
  const { env, anaKey } = await team(t);
  env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('x', 'thread', 'deploys need a tag', 'save', '2026-09-01T00:00:00Z', 'dev@example.com')").run();
  const input = writeJsonFile(env.repo.home, 'gate.json', { source: 'save', slug: 'x', facts: [{ type: 'project', body: 'Deploys need a tag.' }] });
  const reads = [
    ['search', 'deploys'], ['search', '--tag', 'x', '--type', 'thread', '--slug', 'x', '--since', '2026-01-01', '--until', '2999-01-01', '--author', 'dev', '--all', '--everyone'],
    ['search', '--branch', 'main', '--state', 'conversation', '--limit', '5'], ['show', 'x', '--all'], ['live'], ['tags'], ['gate', '--file', input],
  ];
  for (const args of reads) {
    const result = await memory(env.repo, env.fake, args, viaWorker({ CLOUDFLARE_MEMORY_TOKEN: anaKey }));
    assert.equal(result.code, 0, `${args.join(' ')}: ${result.stderr}`);
  }
});

// ---------- joining through GitHub ----------

// A fake GitHub API: each token is one account, with the repositories it can see and its emails.
const ACCOUNTS = {
  'tok-ana': { repos: { 'owner/app': { private: true, permissions: { pull: true, push: false } } }, emails: [{ email: 'ana@example.com', verified: true, primary: true }] },
  'tok-cy': { repos: { 'owner/app': { private: true, permissions: { pull: true, push: true } } }, emails: [{ email: 'cy@example.com', verified: true, primary: true }] },
  'tok-dev': { repos: { 'owner/app': { private: true, permissions: { pull: true, push: true } } }, emails: [{ email: 'Dev@Example.com', verified: true, primary: true }] },
  'tok-bo': { repos: { 'owner/app': { private: true, permissions: { pull: true } } }, emails: [{ email: 'bo@example.com', verified: false }, { email: 'bo@work.com', verified: true, primary: true }] },
  'tok-noscope': { repos: { 'owner/app': { private: true, permissions: { pull: true } } } },
  'tok-reader': { repos: { 'owner/pub': { private: false, permissions: { pull: true, push: false } } }, emails: [{ email: 'rae@example.com', verified: true, primary: true }] },
  'tok-pusher': { repos: { 'owner/pub': { private: false, permissions: { pull: true, push: true } } }, emails: [{ email: 'pat@example.com', verified: true, primary: true }] },
  'tok-stranger': { repos: { 'evil/fork': { private: true, permissions: { pull: true, push: true } } }, emails: [{ email: 'eve@example.com', verified: true, primary: true }] },
};

async function fakeGitHub() {
  const seen = [];
  const url = await listen(request => {
    const { pathname } = new URL(request.url);
    seen.push(pathname);
    const account = ACCOUNTS[(request.headers.get('authorization') || '').replace(/^Bearer /, '')];
    if (!account) return Response.json({ message: 'Bad credentials' }, { status: 401 });
    if (pathname.startsWith('/repos/')) {
      const repo = account.repos[pathname.slice('/repos/'.length)];
      return repo ? Response.json(repo) : Response.json({ message: 'Not Found' }, { status: 404 });
    }
    if (pathname === '/user/emails') return account.emails ? Response.json(account.emails) : Response.json({ message: 'Resource not accessible' }, { status: 403 });
    return Response.json({ message: 'Not Found' }, { status: 404 });
  });
  return { url, seen };
}

// A team store whose Worker knows its repository and asks the fake GitHub.
async function joinable(t, { repo = 'owner/app', db } = {}) {
  const base = await team(t);
  const github = await fakeGitHub();
  const url = await appWorker({ MEMORY_DB: d1(db || base.env.fake.db), MEMORY_BUCKET: r2(base.env.fake.objects), ...(repo ? { GITHUB_REPOSITORY: repo } : {}), GITHUB_API: github.url });
  setWorker(base.env, `${url}/_memory`);
  return { ...base, url, github };
}
const joinCall = (url, body) => fetch(`${url}/_memory/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const errorCode = async response => (await response.json()).errors?.[0]?.code;

test('a reader of a private repo joins with a 30-day reader key for their verified email; push gives a member key', async t => {
  const { env, url } = await joinable(t);
  const response = await joinCall(url, { token: 'tok-ana', machine: 'laptop-a1', email: 'ana@example.com' });
  assert.equal(response.status, 200);
  const { key, email, role, machine, expiresAt } = (await response.json()).result;
  assert.deepEqual([keyEmail(key), email, role, machine], ['ana@example.com', 'ana@example.com', 'reader', 'laptop-a1']);
  const days = (Date.parse(expiresAt) - Date.now()) / 86400000;
  assert.ok(days > 29.9 && days <= 30, `expires in ${days} days`);
  const row = env.fake.db.prepare("SELECT role, reader, machine, expires_at FROM memory_keys WHERE hash = ?").get(await hashKey(key));
  assert.deepEqual({ ...row }, { role: 'member', reader: 1, machine: 'laptop-a1', expires_at: expiresAt });
  assert.equal((await call(url, key, { sql: 'SELECT 1' })).status, 200);
  const pusher = (await (await joinCall(url, { token: 'tok-cy', machine: 'm' })).json()).result;
  assert.equal(pusher.role, 'member');
  assert.equal(env.fake.db.prepare('SELECT reader FROM memory_keys WHERE hash = ?').get(await hashKey(pusher.key)).reader, 0);
});

test('a store before the reader migration refuses only a reader\'s join, and still refuses an expired key', async t => {
  const old = new DatabaseSync(':memory:');
  for (const file of ['0001_memory.sql', '0002_keys.sql', '0003_key_machines.sql']) old.exec(readFileSync(new URL(`../../.agents/skills/memory/migrations/${file}`, import.meta.url), 'utf8'));
  const { url } = await joinable(t, { db: old });
  const reader = await joinCall(url, { token: 'tok-ana', machine: 'm' });
  assert.deepEqual([reader.status, await errorCode(reader)], [503, 'not_migrated']);
  const member = await joinCall(url, { token: 'tok-cy', machine: 'm' });
  assert.equal(member.status, 200);
  const joined = (await member.json()).result;
  assert.equal(joined.role, 'member');
  assert.equal((await call(url, joined.key, { sql: 'SELECT 1' })).status, 200);
  const expired = await addKey(old, 'bo@example.com', 'member', { machine: 'm1', expiresAt: '2026-01-01T00:00:00Z' });
  assert.equal((await call(url, expired, { sql: 'SELECT 1' })).status, 401);
});

test('a join is refused to a public repo\'s reader, a stranger, a token GitHub rejects, and a token that cannot read emails', async t => {
  const { env, url } = await joinable(t);
  const before = env.fake.db.prepare('SELECT count(*) AS n FROM memory_keys').get().n;
  const stranger = await joinCall(url, { token: 'tok-stranger', machine: 'm', email: 'eve@example.com' });
  assert.deepEqual([stranger.status, await errorCode(stranger)], [403, 'no_access']);
  const bad = await joinCall(url, { token: 'tok-nobody', machine: 'm' });
  assert.deepEqual([bad.status, await errorCode(bad)], [401, 'github_token']);
  const noScope = await joinCall(url, { token: 'tok-noscope', machine: 'm' });
  assert.deepEqual([noScope.status, await errorCode(noScope)], [403, 'needs_scope']);
  const pub = await joinable(t, { repo: 'owner/pub', db: env.fake.db });
  const reader = await joinCall(pub.url, { token: 'tok-reader', machine: 'm' });
  assert.deepEqual([reader.status, await errorCode(reader)], [403, 'no_access']);
  assert.equal(env.fake.db.prepare('SELECT count(*) AS n FROM memory_keys').get().n, before, 'no refused join made a key');
  const pusher = await joinCall(pub.url, { token: 'tok-pusher', machine: 'm' });
  assert.equal(pusher.status, 200, 'push access to a public repo is enough');
});

test('a join checks only the Worker\'s own repository at its own GitHub address, whatever the request names', async t => {
  const { url, github } = await joinable(t);
  const forked = await joinCall(url, { token: 'tok-stranger', machine: 'm', repo: 'evil/fork', repository: 'evil/fork', api: 'http://127.0.0.1:1', githubApi: 'http://127.0.0.1:1' });
  assert.equal(forked.status, 403);
  assert.deepEqual(github.seen, ['/repos/owner/app'], 'only the deployed repository is asked about');
});

test('an unverified git email gets the primary verified one, and the owner\'s new laptop gets an admin key', async t => {
  const { url } = await joinable(t);
  const bo = (await (await joinCall(url, { token: 'tok-bo', machine: 'm', email: 'bo@example.com' })).json()).result;
  assert.equal(bo.email, 'bo@work.com');
  const dev = (await (await joinCall(url, { token: 'tok-dev', machine: 'new-laptop', email: 'dev@example.com' })).json()).result;
  assert.deepEqual([dev.email, dev.role], ['dev@example.com', 'admin']);
  assert.ok(dev.expiresAt, 'a joined admin key expires too');
});

test('two machines keep two keys, and joining again from one machine replaces only its key', async t => {
  const { env, url } = await joinable(t);
  const join = async machine => (await (await joinCall(url, { token: 'tok-ana', machine })).json()).result.key;
  const first = await join('laptop');
  const second = await join('desktop');
  assert.equal((await call(url, first, { sql: 'SELECT 1' })).status, 200);
  assert.equal((await call(url, second, { sql: 'SELECT 1' })).status, 200);
  const renewed = await join('laptop');
  assert.equal((await call(url, first, { sql: 'SELECT 1' })).status, 401);
  assert.equal((await call(url, renewed, { sql: 'SELECT 1' })).status, 200);
  assert.equal(env.fake.db.prepare("SELECT count(*) AS n FROM memory_keys WHERE email = 'ana@example.com' AND machine IS NOT NULL").get().n, 2);
});

test('a Worker with no repository or an unmigrated store refuses a join, and the token is never logged', async t => {
  const { url: noRepo } = await joinable(t, { repo: null });
  const refused = await joinCall(noRepo, { token: 'tok-ana', machine: 'm' });
  assert.deepEqual([refused.status, await errorCode(refused)], [503, 'no_repo']);
  const old = new DatabaseSync(':memory:');
  old.exec(KEYS_SCHEMA);
  const { url: unmigrated } = await joinable(t, { db: old });
  const early = await joinCall(unmigrated, { token: 'tok-ana', machine: 'm' });
  assert.deepEqual([early.status, await errorCode(early)], [503, 'not_migrated']);

  const { url } = await joinable(t);
  const logged = [];
  for (const level of ['log', 'info', 'warn', 'error', 'debug']) t.mock.method(console, level, (...args) => logged.push(args.join(' ')));
  for (const token of ['tok-ana', 'tok-stranger', 'tok-noscope']) await joinCall(url, { token, machine: 'm' });
  assert.ok(!logged.join('\n').includes('tok-'), 'no GitHub token appears in a log');
});

// ---------- memory.mjs join, member list, and the session-start hook ----------

// A fake gh on PATH that prints FAKE_GH_TOKEN for `gh auth token`, or fails when it is empty.
function fakeGh(t) {
  const bin = tempDir(t, 'wong-fake-gh-');
  writeFileSync(join(bin, 'gh'), '#!/bin/sh\n[ "$1 $2" = "auth token" ] && [ -n "$FAKE_GH_TOKEN" ] && { echo "$FAKE_GH_TOKEN"; exit 0; }\nexit 1\n', { mode: 0o755 });
  return token => viaWorker({ PATH: `${bin}:${process.env.PATH}`, FAKE_GH_TOKEN: token });
}
const withoutKey = env => writeFileSync(join(env.repo.root, '.env'), readFileSync(join(env.repo.root, '.env'), 'utf8').replace(/^CLOUDFLARE_MEMORY_TOKEN=.*\n/m, ''));
const stateFile = (env, name) => join(env.repo.stateDir, name);

test('memory.mjs join writes the key to .env and never prints it; renewing replaces it', async t => {
  const { env, url } = await joinable(t);
  const gh = fakeGh(t);
  env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('x', 'project', 'deploys need a tag', 'save', '2026-09-01T00:00:00Z', 'dev@example.com')").run();
  withoutKey(env);
  const joined = await memory(env.repo, env.fake, ['join'], gh('tok-bo'));
  assert.equal(joined.code, 0, joined.stderr);
  assert.match(joined.stdout, /joined this repo's memory as bo@work\.com \(dev@example\.com is not a verified email/);
  assert.doesNotMatch(joined.stdout, /wongm_/);
  const first = envKey(env);
  assert.equal(keyEmail(first), 'bo@work.com');
  const saved = JSON.parse(readFileSync(stateFile(env, 'key.json'), 'utf8'));
  assert.equal(saved.email, 'bo@work.com');
  const search = await memory(env.repo, env.fake, ['search', 'deploys'], viaWorker());
  assert.match(search.stdout, /deploys need a tag/);
  const again = await memory(env.repo, env.fake, ['join'], gh('tok-bo'));
  assert.equal(again.code, 0, again.stderr);
  assert.notEqual(envKey(env), first);
  assert.equal(JSON.parse(readFileSync(stateFile(env, 'key.json'), 'utf8')).machine, saved.machine, 'the machine name is kept');
  assert.equal((await call(url, first, { sql: 'SELECT 1' })).status, 401);
});

test('a refused join changes no file and prints its fix; in the background it is kept for the hook', async t => {
  const { env } = await joinable(t);
  const gh = fakeGh(t);
  const envBefore = readFileSync(join(env.repo.root, '.env'), 'utf8');
  const noScope = await memory(env.repo, env.fake, ['join'], gh('tok-noscope'));
  assert.equal(noScope.code, 1);
  assert.match(noScope.stderr, /gh auth refresh -h github\.com -s user:email/);
  const stranger = await memory(env.repo, env.fake, ['join'], gh('tok-stranger'));
  assert.match(stranger.stderr, /ask the repo's owner/);
  const signedOut = await memory(env.repo, env.fake, ['join', '--background'], gh(''));
  assert.match(signedOut.stderr, /GitHub is not signed in on this machine; sign in to GitHub on this machine: gh auth login/);
  assert.equal(readFileSync(join(env.repo.root, '.env'), 'utf8'), envBefore);
  assert.ok(!existsSync(stateFile(env, 'key.json')));
  assert.match(JSON.parse(readFileSync(stateFile(env, 'join-error.json'), 'utf8')).message, /gh auth login/);
});

test('member list shows each machine and expiry; member remove revokes joined keys too; member add keeps them', async t => {
  const { env, url, anaKey } = await joinable(t);
  const laptop = (await (await joinCall(url, { token: 'tok-ana', machine: 'laptop' })).json()).result.key;
  const desktop = (await (await joinCall(url, { token: 'tok-ana', machine: 'desktop' })).json()).result.key;
  const readded = await memory(env.repo, env.fake, ['member', 'add', 'ana@example.com'], asAdmin(env));
  assert.equal(readded.code, 0, readded.stderr);
  assert.equal((await call(url, anaKey, { sql: 'SELECT 1' })).status, 401, 'member add replaces its own earlier key');
  assert.equal((await call(url, laptop, { sql: 'SELECT 1' })).status, 200, 'and keeps the joined ones');
  const listed = await memory(env.repo, env.fake, ['member', 'list'], asAdmin(env));
  assert.match(listed.stdout, /ana@example\.com \(member, reader, since \S+, machine desktop, expires \d{4}-\d{2}-\d{2}\)/);
  assert.match(listed.stdout, /ana@example\.com \(member, reader, since \S+, machine laptop, expires/);
  assert.match(listed.stdout, /ana@example\.com \(member, since \S+, made by member add, no expiry\)/);
  assert.doesNotMatch(listed.stdout, /wongm_|[0-9a-f]{64}/);
  const removed = await memory(env.repo, env.fake, ['member', 'remove', 'ana@example.com'], asAdmin(env));
  assert.match(removed.stdout, /3 keys no longer open/);
  for (const key of [laptop, desktop]) assert.equal((await call(url, key, { sql: 'SELECT 1' })).status, 401);
});

const hookRun = (env, extra) => node(env.repo, env.fake, 'session-start.mjs', ['--agent', 'claude'], { input: JSON.stringify({ session_id: 's1', cwd: env.repo.root }), env: extra });
async function until(check, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (check()) return true; await new Promise(done => setTimeout(done, 100)); }
  return false;
}

test('the hook sets up memory through GitHub in the background, and the next session loads it', async t => {
  const { env } = await joinable(t);
  const gh = fakeGh(t);
  withoutKey(env);
  const started = Date.now();
  const first = await hookRun(env, gh('tok-ana').env);
  assert.equal(first.code, 0, first.stderr);
  assert.ok(Date.now() - started < 5000, 'the hook ends inside its timeout');
  assert.match(first.stdout, /setting up this repo's memory through your GitHub access; it loads next session/);
  assert.ok(await until(() => /wongm_/.test(readFileSync(join(env.repo.root, '.env'), 'utf8'))), 'the background join wrote a key');
  await until(() => !existsSync(stateFile(env, 'join.lock')));
  const next = await hookRun(env, gh('tok-ana').env);
  assert.doesNotMatch(next.stdout, /setting up|renewing|skipped the store/);
});

test('the hook renews a key near expiry, and shows a failure the person must fix without retrying', async t => {
  const { env } = await joinable(t);
  const gh = fakeGh(t);
  const joined = await memory(env.repo, env.fake, ['join'], gh('tok-ana'));
  assert.equal(joined.code, 0, joined.stderr);
  const key = envKey(env);
  const saved = JSON.parse(readFileSync(stateFile(env, 'key.json'), 'utf8'));
  writeFileSync(stateFile(env, 'key.json'), JSON.stringify({ ...saved, expiresAt: new Date(Date.now() + 5 * 86400000).toISOString() }));
  const soon = await hookRun(env, gh('tok-ana').env);
  assert.match(soon.stdout, /renewing this machine's memory key through GitHub/);
  assert.ok(await until(() => envKey(env) !== key), 'the renewal replaced the key');
  await until(() => !existsSync(stateFile(env, 'join.lock')));

  withoutKey(env);
  writeFileSync(stateFile(env, 'join-error.json'), JSON.stringify({ message: 'GitHub is not signed in on this machine; sign in to GitHub on this machine: gh auth login' }));
  const blocked = await hookRun(env, gh('tok-ana').env);
  assert.match(blocked.stdout, /could not join through GitHub: GitHub is not signed in on this machine; sign in to GitHub on this machine: gh auth login\. Then run/);
  await new Promise(done => setTimeout(done, 1000));
  assert.doesNotMatch(readFileSync(join(env.repo.root, '.env'), 'utf8'), /wongm_/, 'no join started');
});

test('in a linked worktree, the key and a join go only to the main checkout\'s memory address', async t => {
  const { env } = await joinable(t);
  const gh = fakeGh(t);
  const seen = [];
  const elsewhere = await listen(request => { seen.push(new URL(request.url).pathname); return new Response(null, { status: 500 }); });
  const tree = join(tempDir(t, 'wong-memory-tree-'), 'tree');
  execFileSync('git', ['worktree', 'add', '-q', tree], { cwd: env.repo.root });
  const branchRecord = worker => writeJsonFile(join(tree, '.claude'), '.wong-stack.json', { components: { memory: { ...record(env), worker } } });
  mkdirSync(join(tree, '.claude'), { recursive: true });
  branchRecord(`${elsewhere}/_memory`);
  const inTree = { ...env.repo, root: tree };
  const treeHook = () => node(inTree, env.fake, 'session-start.mjs', ['--agent', 'claude'], { input: JSON.stringify({ session_id: 's1', cwd: tree }), env: viaWorker().env });
  env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('x', 'project', 'deploys need a tag', 'save', '2026-09-01T00:00:00Z', 'dev@example.com')").run();

  const hook = await treeHook();
  assert.equal(hook.code, 0, hook.stderr);
  assert.match(hook.stdout, /this branch names another memory address \(http:\/\/127\.0\.0\.1:\d+\/_memory\); memory uses the main checkout's/);
  assert.match(hook.stdout, /deploys need a tag/, 'the digest came from the main checkout\'s Worker');
  withoutKey(env);
  const joined = await memory(inTree, env.fake, ['join'], gh('tok-dev'));
  assert.equal(joined.code, 0, joined.stderr);
  assert.match(envKey(env), /^wongm_/, 'the key went to the main checkout\'s .env');
  assert.deepEqual(seen, [], 'the branch\'s address got no request');

  branchRecord(record(env).worker);
  const matching = await treeHook();
  assert.equal(matching.code, 0, matching.stderr);
  assert.doesNotMatch(matching.stdout, /another memory address/);
});

// ---------- own notes only, and reader keys ----------

const joinedKey = async (url, token) => (await (await joinCall(url, { token, machine: 'm' })).json()).result.key;
const factRow = (env, id) => ({ ...env.fake.db.prepare('SELECT author, shared, superseded_by FROM facts WHERE id = ?').get(id) });

test('only the admin supersedes a teammate\'s fact; a member\'s or a reader\'s supersede leaves it live and says who wrote it', async t => {
  const { env, url } = await joinable(t);
  const readerKey = await joinedKey(url, 'tok-ana');
  const memberKey = await joinedKey(url, 'tok-cy');
  const [{ id: bo }] = env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('m', 'project', 'Bo says deploys run at noon.', 'save', '2026-09-26T00:00:00Z', 'bo@example.com') RETURNING id").all();
  const replace = (name, body) => writeJsonFile(env.repo.home, `${name}.json`, { source: 'save', slug: 'm', facts: [{ action: 'supersede', supersedes: [bo], type: 'project', body }] });

  const asAna = await memory(env.repo, env.fake, ['put-facts', '--file', replace('ana', 'Deploys run at one.')], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: readerKey }));
  assert.equal(asAna.code, 0, asAna.stderr);
  assert.match(asAna.stdout, /added 1, superseded 0/);
  assert.match(asAna.stdout, new RegExp(`left #${bo} live: bo@example\\.com wrote it, so only they or the admin can supersede it`));
  assert.equal(factRow(env, bo).superseded_by, null);
  const asCy = await memory(env.repo, env.fake, ['put-facts', '--file', replace('cy', 'Deploys run at two.')], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: memberKey }));
  assert.match(asCy.stdout, /left #\d+ live: bo@example\.com wrote it/);
  assert.equal(factRow(env, bo).superseded_by, null, 'a member can not replace a teammate\'s fact either');

  const [own] = env.fake.db.prepare("SELECT id FROM facts WHERE body = 'Deploys run at two.'").all();
  const ownAgain = await memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, 'own.json', { source: 'save', slug: 'm', facts: [{ action: 'supersede', supersedes: [own.id], type: 'project', body: 'Deploys run at three.' }] })], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: memberKey }));
  assert.match(ownAgain.stdout, /added 0, superseded 1/, 'a member still supersedes its own fact');
  assert.doesNotMatch(ownAgain.stdout, /left #/);

  const asAdmin = await memory(env.repo, env.fake, ['put-facts', '--file', replace('dev', 'Deploys run at four.')], viaWorker());
  assert.match(asAdmin.stdout, /added 0, superseded 1/);
  assert.notEqual(factRow(env, bo).superseded_by, null, 'the admin supersedes anyone\'s fact');
});

test('a reader\'s facts are stored unshared, whatever the request asks', async t => {
  const { env, url } = await joinable(t);
  const readerKey = await joinedKey(url, 'tok-ana');
  const memberKey = await joinedKey(url, 'tok-cy');
  const fact = (author, body) => ({ sql: WRITES.fact.sql, params: ['r', 'project', body, null, 'save', 'now', author] });
  const saved = await (await call(url, readerKey, fact('ana@example.com', 'a reader note'))).json();
  assert.equal(factRow(env, saved.result[0].results[0].id).shared, 0);
  const shared = await call(url, readerKey, { sql: 'INSERT INTO facts (slug, type, body, session_id, source, created_at, author, shared) VALUES (?, ?, ?, ?, ?, ?, ?, 1) RETURNING id', params: fact('ana@example.com', 'share me').params });
  assert.deepEqual([shared.status, await errorCode(shared)], [403, 'member_write']);
  const byMember = await (await call(url, memberKey, fact('cy@example.com', 'a member note'))).json();
  assert.equal(factRow(env, byMember.result[0].results[0].id).shared, 1);
});

test('a reader\'s thread shows in their own digest, search, and gate, never a teammate\'s, and shows for everyone on request', async t => {
  const { env, url } = await joinable(t);
  const readerKey = await joinedKey(url, 'tok-ana');
  const memberKey = await joinedKey(url, 'tok-cy');
  mkdirSync(join(env.repo.root, 'openspec', 'changes', 'x'), { recursive: true });
  writeFileSync(join(env.repo.root, 'openspec', 'changes', 'x', 'proposal.md'), '# X\n\n**Branch:** main\n');
  const input = writeJsonFile(env.repo.home, 'thread.json', { source: 'save', slug: 'x', facts: [{ action: 'add', type: 'thread', body: 'Ana wonders whether deploys need a tag.' }] });
  const saved = await memory(env.repo, env.fake, ['put-facts', '--file', input], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: readerKey }));
  assert.equal(saved.code, 0, saved.stderr);
  const as = key => viaWorker(key ? { CLOUDFLARE_MEMORY_TOKEN: key } : {});
  const run = (args, key) => memory(env.repo, env.fake, args, as(key));
  const THREAD = /Ana wonders/;

  assert.match((await run(['digest'], readerKey)).stdout, THREAD);
  assert.match((await run(['search', 'deploys'], readerKey)).stdout, THREAD);
  for (const key of [memberKey, null]) {
    const digest = await run(['digest'], key);
    assert.equal(digest.code, 0, digest.stderr);
    assert.doesNotMatch(digest.stdout, THREAD);
    assert.doesNotMatch((await run(['search', 'deploys'], key)).stdout, THREAD);
    const gate = await run(['gate', '--file', writeJsonFile(env.repo.home, 'gate.json', { slug: 'x', facts: [{ type: 'project', body: 'Deploys need a tag.' }] })], key);
    assert.equal(gate.code, 0, gate.stderr);
    assert.doesNotMatch(gate.stdout, THREAD);
  }
  assert.match((await run(['search', 'deploys', '--everyone'])).stdout, THREAD, 'the admin sees it with --everyone');
});

test('the team filter adds the reader clause only when the store has the reader schema', async () => {
  const store = n => ({ config: { team: true }, email: 'ana@example.com', query: async () => [{ n }] });
  const ctx = { author: 'ana@example.com', root: '/nowhere' };
  const before = await personalFilter(ctx, store(0));
  assert.deepEqual(before, { clause: "(f.type NOT IN ('user', 'feedback') OR lower(f.author) IN (?))", params: ['ana@example.com'] });
  const after = await personalFilter(ctx, store(1));
  assert.equal(after.clause, `${before.clause} AND (f.shared = 1 OR lower(f.author) IN (?))`);
  assert.deepEqual(after.params, ['ana@example.com', 'ana@example.com']);
  assert.equal(await personalFilter(ctx, { ...store(1), config: { team: false } }), null);
});

test('a reader\'s fact is absent from a teammate\'s live and show, and present with --everyone and for the reader', async t => {
  const { env, url } = await joinable(t);
  const readerKey = await joinedKey(url, 'tok-ana');
  const memberKey = await joinedKey(url, 'tok-cy');
  const input = writeJsonFile(env.repo.home, 'note.json', { source: 'save', slug: 'x', facts: [{ action: 'add', type: 'project', body: 'Ana keeps her deploy notes here.' }] });
  assert.equal((await memory(env.repo, env.fake, ['put-facts', '--file', input], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: readerKey }))).code, 0);
  const run = (args, key) => memory(env.repo, env.fake, args, viaWorker(key ? { CLOUDFLARE_MEMORY_TOKEN: key } : {}));
  const NOTE = /Ana keeps her deploy notes/;
  for (const args of [['live'], ['show', 'x']]) {
    assert.match((await run(args, readerKey)).stdout, NOTE, `${args[0]} as the reader`);
    for (const key of [memberKey, null]) {
      const result = await run(args, key);
      assert.equal(result.code, 0, result.stderr);
      assert.doesNotMatch(result.stdout, NOTE, `${args[0]} as a teammate`);
      assert.match((await run([...args, '--everyone'], key)).stdout, NOTE, `${args[0]} --everyone`);
    }
  }
});
