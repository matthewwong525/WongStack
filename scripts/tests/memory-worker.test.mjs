// The memory route of the app's production Worker and the admin's key commands: the real handler runs
// behind a local server with node:sqlite and Map bindings over the harness's store, routed the way
// app/worker/index.ts routes it; the admin commands reach the same store through the fake Cloudflare API.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { after, test } from 'node:test';
import { handleMemory, hashKey, KEY_LIMIT, MAX_TRANSCRIPT_BYTES, MEMORY_PREFIX } from '../../.agents/skills/memory/worker/memory-worker.mjs';
import { batchRefusal, FTS_HITS, memberRefusal, readRefusal, shadowCtes, shadowRead, supersedeSql, WRITES } from '../../.agents/skills/memory/worker/statements.mjs';
import { personalFilter } from '../../.agents/skills/memory/scripts/lib/digest.mjs';
import { keyEmail } from '../../.agents/skills/memory/scripts/lib/store.mjs';
import { memory, node, setup, tempDir, writeJsonFile } from './fixtures/memory/harness.mjs';

const ADMIN_TOKEN = 'test-memory-token-value';
const KEYS_SCHEMA = readFileSync(new URL('../../.agents/skills/memory/migrations/0002_keys.sql', import.meta.url), 'utf8');
const servers = [];
after(() => Promise.all(servers.map(server => new Promise(done => server.close(done)))));

// A fake gh on PATH for every command: `gh auth token` prints FAKE_GH_TOKEN and `gh api user` prints
// FAKE_GH_USER; each fails when its variable is empty, as gh does when signed out.
const GH_BIN = mkdtempSync(join(tmpdir(), 'wong-test-fake-gh-'));
writeFileSync(join(GH_BIN, 'gh'), '#!/bin/sh\n[ "$1 $2" = "auth token" ] && [ -n "$FAKE_GH_TOKEN" ] && { echo "$FAKE_GH_TOKEN"; exit 0; }\n[ "$1 $2" = "api user" ] && [ -n "$FAKE_GH_USER" ] && { echo "$FAKE_GH_USER"; exit 0; }\nexit 1\n', { mode: 0o755 });
after(() => rmSync(GH_BIN, { recursive: true, force: true }));
const GH_PATH = `${GH_BIN}:${process.env.PATH}`;
const inDays = days => new Date(Date.now() + days * 86400000).toISOString().replace(/\.\d{3}Z$/, 'Z');

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
const envKey = env => readFileSync(join(env.repo.root, '.env'), 'utf8').match(/^CLOUDFLARE_MEMORY_TOKEN=(\S+)$/m)?.[1];

// The admin's commands go straight to the fake Cloudflare API with CLOUDFLARE_API_TOKEN. gh is signed in as
// `user`, by default the admin's GitHub account 101, or signed out when it is ''.
const DEV = JSON.stringify({ id: 101, login: 'dev' });
const asAdmin = (env, user = DEV) => ({ env: { WONG_CLOUDFLARE_API: env.fake.api, CLOUDFLARE_API_TOKEN: ADMIN_TOKEN, PATH: GH_PATH, FAKE_GH_USER: user, FAKE_GH_TOKEN: '' } });
// A key's calls go to the recorded Worker URL, not the harness's REST fake.
const viaWorker = (extra = {}) => ({ env: { WONG_MEMORY_API: '', ...extra } });

// A store served by an app Worker, the admin's key from member admin in .env, and ana's key as a join makes it.
async function team(t) {
  const env = await setup(t);
  const url = await appWorker({ MEMORY_DB: d1(env.fake.db), MEMORY_BUCKET: r2(env.fake.objects) });
  setWorker(env, `${url}/_memory`);
  const self = await memory(env.repo, env.fake, ['member', 'admin'], asAdmin(env));
  assert.equal(self.code, 0, self.stderr);
  const anaKey = await addKey(env.fake.db, 'ana@example.com', 'member', { machine: 'ana-laptop', expiresAt: inDays(30), githubId: '201' });
  // Two emails hold keys, so the Worker's answers say team; the script records that on its first call.
  writeJsonFile(env.repo.stateDir, 'team.json', { team: true });
  return { env, url, anaKey, self };
}

const call = (url, key, body) => fetch(`${url}/_memory/accounts/acct/d1/database/db1/query`, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: JSON.stringify(body) });

test('member admin links the GitHub account and writes a 30-day admin key to .env and key.json, printing no key', async t => {
  const { env, url, anaKey, self } = await team(t);
  const adminKey = envKey(env);
  assert.equal(keyEmail(adminKey), 'dev@example.com');
  assert.doesNotMatch(self.stdout, /wongm_/);
  assert.match(self.stdout, /linked GitHub account dev as this store's admin, for dev@example\.com/);
  const saved = JSON.parse(readFileSync(join(env.repo.stateDir, 'key.json'), 'utf8'));
  const [row] = env.fake.db.prepare("SELECT hash, role, machine, expires_at, github_id FROM memory_keys WHERE email = 'dev@example.com'").all().map(each => ({ ...each }));
  assert.deepEqual(row, { hash: await hashKey(adminKey), role: 'admin', machine: saved.machine, expires_at: saved.expiresAt, github_id: '101' });
  assert.deepEqual([saved.email, saved.role], ['dev@example.com', 'admin']);
  const days = (Date.parse(saved.expiresAt) - Date.now()) / 86400000;
  assert.ok(days > 29.9 && days <= 30, `expires in ${days} days`);
  assert.deepEqual(env.fake.db.prepare('SELECT github_id, login, email FROM memory_admins').all().map(each => ({ ...each })), [{ github_id: '101', login: 'dev', email: 'dev@example.com' }]);
  assert.ok(!JSON.stringify(env.fake.db.prepare('SELECT * FROM memory_keys').all()).includes(adminKey), 'only the hash is stored');

  const again = await memory(env.repo, env.fake, ['member', 'admin'], asAdmin(env));
  assert.equal(again.code, 0, again.stderr);
  assert.equal(env.fake.db.prepare("SELECT count(*) AS n FROM memory_keys WHERE email = 'dev@example.com'").get().n, 1, 'this machine\'s key is replaced');
  assert.equal((await call(url, anaKey, { sql: 'SELECT 1' })).status, 200, 'and no one else\'s');

  const listed = await memory(env.repo, env.fake, ['member', 'list'], asAdmin(env));
  assert.equal(listed.code, 0, listed.stderr);
  assert.match(listed.stdout, /ana@example\.com \(member, since \S+, machine ana-laptop, GitHub 201, expires \d{4}-\d{2}-\d{2}\)/);
  assert.match(listed.stdout, /dev@example\.com \(admin, since \S+, machine \S+, GitHub 101, expires/);
  assert.match(listed.stdout, /Linked admin: dev \(GitHub 101\), dev@example\.com/);
  assert.doesNotMatch(`${self.stdout}${again.stdout}${listed.stdout}`, /wongm_|[0-9a-f]{64}/);
});

test('no command makes a key for another person: member add says they join through GitHub', async t => {
  const { env } = await team(t);
  const before = env.fake.db.prepare('SELECT count(*) AS n FROM memory_keys').get().n;
  for (const args of [['member', 'add', 'bo@example.com'], ['member', 'add', 'bo@example.com', '--admin', '--env']]) {
    const result = await memory(env.repo, env.fake, args, asAdmin(env));
    assert.notEqual(result.code, 0);
    assert.doesNotMatch(`${result.stdout}${result.stderr}`, /wongm_/);
  }
  const refused = await memory(env.repo, env.fake, ['member', 'add', 'bo@example.com'], asAdmin(env));
  assert.match(refused.stderr, /no key is made by hand for bo@example\.com: a teammate joins through GitHub/);
  assert.match(refused.stderr, /member admin/);
  assert.equal(env.fake.db.prepare('SELECT count(*) AS n FROM memory_keys').get().n, before);
});

test('member admin changes nothing without a Worker URL, a signed-in gh, a git email, or a token that writes D1', async t => {
  const solo = await setup(t);
  const noWorker = await memory(solo.repo, solo.fake, ['member', 'admin'], asAdmin(solo));
  assert.equal(noWorker.code, 1);
  assert.match(noWorker.stderr, /no memory Worker URL is recorded/);
  assert.equal(solo.fake.db.prepare('SELECT count(*) AS n FROM memory_keys').get().n, 0);

  const { env } = await team(t);
  const files = () => [readFileSync(join(env.repo.root, '.env'), 'utf8'), readFileSync(join(env.repo.stateDir, 'key.json'), 'utf8')];
  const tables = () => JSON.stringify([env.fake.db.prepare('SELECT * FROM memory_keys ORDER BY hash').all(), env.fake.db.prepare('SELECT * FROM memory_admins').all()]);
  const [filesBefore, tablesBefore] = [files(), tables()];
  const signedOut = await memory(env.repo, env.fake, ['member', 'admin'], asAdmin(env, ''));
  assert.equal(signedOut.code, 1);
  assert.match(signedOut.stderr, /GitHub is not signed in on this machine/);
  const narrow = await memory(env.repo, env.fake, ['member', 'admin'], { env: { ...asAdmin(env).env, CLOUDFLARE_API_TOKEN: 'narrow-token' } });
  assert.equal(narrow.code, 1);
  assert.match(narrow.stderr, /lacks D1 Write/);
  execFileSync('git', ['config', 'user.email', ''], { cwd: env.repo.root });
  const noEmail = await memory(env.repo, env.fake, ['member', 'admin'], asAdmin(env));
  assert.equal(noEmail.code, 1);
  assert.match(noEmail.stderr, /no git email is set/);
  assert.deepEqual(files(), filesBefore);
  assert.equal(tables(), tablesBefore);
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
  assert.doesNotMatch(removed.stdout, /linked/, 'ana was never the admin');
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
    'SELECT * FROM memory_admins',
    "INSERT INTO memory_admins VALUES ('999', 'eve', 'eve@example.com', 'now')",
    'DELETE FROM Memory_Admins',
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
  assert.equal(env.fake.db.prepare('SELECT count(*) AS n FROM memory_admins').get().n, 1);
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

test('the bucket refuses a transcript over 50 MB by its Content-Length or its body, and keeps one of exactly 50 MB', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec(KEYS_SCHEMA);
  db.prepare("INSERT INTO memory_keys VALUES (?, 'a@b.co', 'member', 'now')").run(await hashKey('wongm_k.1'));
  const objects = new Map();
  const put = (name, body, headers = {}) => handleMemory(new Request(`http://w/_memory/accounts/a/r2/buckets/b/objects/sessions/a@b.co/${name}`, { method: 'PUT', headers: { Authorization: 'Bearer wongm_k.1', ...headers }, body }), { MEMORY_DB: d1(db), MEMORY_BUCKET: r2(objects) });
  const said = await put('said.jsonl', 'small', { 'Content-Length': String(MAX_TRANSCRIPT_BYTES + 1) });
  assert.deepEqual([said.status, (await said.json()).errors[0].code], [413, 'too_large']);
  const sent = await put('sent.jsonl', Buffer.alloc(MAX_TRANSCRIPT_BYTES + 1));
  assert.deepEqual([sent.status, (await sent.json()).errors[0].code], [413, 'too_large']);
  assert.equal(objects.size, 0);
  assert.equal((await put('full.jsonl', Buffer.alloc(MAX_TRANSCRIPT_BYTES))).status, 200);
  assert.equal(objects.get('sessions/a@b.co/full.jsonl').length, MAX_TRANSCRIPT_BYTES);
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
  assert.match(digest.stdout, /only your own user and feedback facts\. See everyone's: .*--everyone/, 'the admin is told how to see everyone\'s');
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
// A key row as join or member admin makes it; githubId only on a store with schema 5.
async function addKey(db, email, role, { machine = null, expiresAt = null, githubId } = {}) {
  const key = keyFor(email);
  const row = { hash: await hashKey(key), email, role, created_at: '2026-09-27T00:00:00Z', machine, expires_at: expiresAt, ...(githubId ? { github_id: githubId } : {}) };
  db.prepare(`INSERT INTO memory_keys (${Object.keys(row).join(', ')}) VALUES (${Object.keys(row).map(() => '?').join(', ')})`).run(...Object.values(row));
  return key;
}

// Put a migrated store back before schema 5, holding a key made the old way: no machine and no end date.
function beforeSchema5(env) {
  env.fake.db.exec('DROP TABLE memory_admins; ALTER TABLE memory_keys DROP COLUMN github_id; DELETE FROM schema_migrations WHERE version = 5');
  return addKey(env.fake.db, 'bo@example.com', 'member');
}

test('migrate applies schema 5: every key without an end date stops, and the running admin\'s GitHub account is linked', async t => {
  const { env, url } = await team(t);
  const handMade = await beforeSchema5(env);
  assert.equal((await call(url, handMade, { sql: 'SELECT 1' })).status, 200, 'a key with no end date works until the update');
  const migrated = await memory(env.repo, env.fake, ['migrate'], asAdmin(env));
  assert.equal(migrated.code, 0, migrated.stderr);
  assert.match(migrated.stdout, /applied 0005_admin_accounts\.sql/);
  assert.match(migrated.stdout, /linked GitHub account dev as this store's admin, for dev@example\.com/);
  assert.deepEqual(env.fake.db.prepare('SELECT github_id, email FROM memory_admins').all().map(row => ({ ...row })), [{ github_id: '101', email: 'dev@example.com' }]);
  assert.equal(env.fake.db.prepare('SELECT count(*) AS n FROM memory_keys WHERE expires_at IS NULL').get().n, 0);
  const stopped = await call(url, handMade, { sql: 'SELECT 1' });
  assert.deepEqual([stopped.status, (await stopped.json()).errors[0].code], [401, 'key_expired']);
});

test('migrate without gh signed in links no one and says how to link the admin', async t => {
  const { env } = await team(t);
  await beforeSchema5(env);
  const migrated = await memory(env.repo, env.fake, ['migrate'], asAdmin(env, ''));
  assert.equal(migrated.code, 0, migrated.stderr);
  assert.match(migrated.stdout, /applied 0005_admin_accounts\.sql/);
  assert.match(migrated.stdout, /gh auth login`, then run `node \.claude\/skills\/memory\/scripts\/memory\.mjs member admin`/);
  assert.equal(env.fake.db.prepare('SELECT count(*) AS n FROM memory_admins').get().n, 0);
  const again = await memory(env.repo, env.fake, ['migrate'], asAdmin(env));
  assert.match(again.stdout, /up to date/);
  assert.doesNotMatch(again.stdout, /linked/, 'a later migrate leaves linking to member admin');
});

test('an expired key runs nothing and the script says join renews it; a key before its end date keeps working', async t => {
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
  assert.equal((await call(url, envKey(env), { sql: 'SELECT 1' })).status, 200, 'the admin key from member admin has not ended');
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

test("a member's retag skips another author's fact and still writes its own", async t => {
  const { env, anaKey } = await team(t);
  const insert = env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('routes', 'project', ?, 'save', '2026-09-30T00:00:00Z', ?) RETURNING id");
  const devs = insert.get('Dev: test every route.', 'dev@example.com').id;
  const anas = insert.get('Ana: routes need tests.', 'ana@example.com').id;
  const file = writeJsonFile(env.repo.home, 'retag.json', { retag: [{ id: devs, tags: ['worker'] }, { id: anas, tags: ['worker'] }] });
  const result = await memory(env.repo, env.fake, ['retag', '--file', file], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: anaKey }));
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stdout.trim(), `retagged: 1\nskipped #${devs}: dev@example.com wrote it, so only they or the admin can re-tag it`);
  const live = env.fake.db.prepare('SELECT body, author FROM facts WHERE superseded_by IS NULL ORDER BY id').all().map(row => ({ ...row }));
  assert.deepEqual(live, [{ body: 'Dev: test every route.', author: 'dev@example.com' }, { body: 'Ana: routes need tests.', author: 'ana@example.com' }]);
  assert.equal(env.fake.db.prepare('SELECT superseded_by FROM facts WHERE id = ?').get(anas).superseded_by, anas + 1);
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
    ['search', '--branch', 'main', '--state', 'conversation', '--limit', '5'], ['show', 'x', '--all'], ['live'], ['tags'], ['gate', '--file', input], ['areas', 'app/worker/index.ts'],
  ];
  for (const args of reads) {
    const result = await memory(env.repo, env.fake, args, viaWorker({ CLOUDFLARE_MEMORY_TOKEN: anaKey }));
    assert.equal(result.code, 0, `${args.join(' ')}: ${result.stderr}`);
    assert.doesNotMatch(result.stdout, /not loaded/, args.join(' '));
  }
});

// ---------- joining through GitHub ----------

// A fake GitHub API: each token is one account, with the repositories it can see and its emails.
const ACCOUNTS = {
  'tok-dev-twin': { id: 102, repos: { 'owner/app': { private: true, permissions: { pull: true, push: true } } }, emails: [{ email: 'dev@example.com', verified: true, primary: true }] },
  'tok-ana': { id: 201, repos: { 'owner/app': { private: true, permissions: { pull: true, push: false } } }, emails: [{ email: 'ana@example.com', verified: true, primary: true }] },
  'tok-cy': { id: 202, repos: { 'owner/app': { private: true, permissions: { pull: true, push: true } } }, emails: [{ email: 'cy@example.com', verified: true, primary: true }] },
  'tok-dev': { id: 101, repos: { 'owner/app': { private: true, permissions: { pull: true, push: true } } }, emails: [{ email: 'Dev@Example.com', verified: true, primary: true }] },
  'tok-bo': { id: 203, repos: { 'owner/app': { private: true, permissions: { pull: true } } }, emails: [{ email: 'bo@example.com', verified: false }, { email: 'bo@work.com', verified: true, primary: true }] },
  'tok-noscope': { id: 204, repos: { 'owner/app': { private: true, permissions: { pull: true } } } },
  'tok-reader': { id: 205, repos: { 'owner/pub': { private: false, permissions: { pull: true, push: false } } }, emails: [{ email: 'rae@example.com', verified: true, primary: true }] },
  'tok-pusher': { id: 206, repos: { 'owner/pub': { private: false, permissions: { pull: true, push: true } } }, emails: [{ email: 'pat@example.com', verified: true, primary: true }] },
  'tok-stranger': { id: 207, repos: { 'evil/fork': { private: true, permissions: { pull: true, push: true } } }, emails: [{ email: 'eve@example.com', verified: true, primary: true }] },
};

async function fakeGitHub() {
  const seen = [];
  const url = await listen(request => {
    const { pathname } = new URL(request.url);
    seen.push(pathname);
    const token = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
    const account = ACCOUNTS[token];
    if (!account) return Response.json({ message: 'Bad credentials' }, { status: 401 });
    if (pathname.startsWith('/repos/')) {
      const repo = account.repos[pathname.slice('/repos/'.length)];
      return repo ? Response.json(repo) : Response.json({ message: 'Not Found' }, { status: 404 });
    }
    if (pathname === '/user/emails') return account.emails ? Response.json(account.emails) : Response.json({ message: 'Resource not accessible' }, { status: 403 });
    if (pathname === '/user') return Response.json({ id: account.id, login: token.slice('tok-'.length) });
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
const joinedKey = async (url, token, machine = 'm') => (await (await joinCall(url, { token, machine })).json()).result.key;

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

test('an unverified git email gets the primary verified one, and only the linked GitHub account joins as admin', async t => {
  const { env, url } = await joinable(t);
  const bo = (await (await joinCall(url, { token: 'tok-bo', machine: 'm', email: 'bo@example.com' })).json()).result;
  assert.equal(bo.email, 'bo@work.com');
  const dev = (await (await joinCall(url, { token: 'tok-dev', machine: 'new-laptop', email: 'dev@example.com' })).json()).result;
  assert.deepEqual([dev.email, dev.role], ['dev@example.com', 'admin']);
  assert.ok(dev.expiresAt, 'a joined admin key expires too');
  const twin = (await (await joinCall(url, { token: 'tok-dev-twin', machine: 'twin', email: 'dev@example.com' })).json()).result;
  assert.deepEqual([twin.email, twin.role], ['dev@example.com', 'member'], 'another account with the admin\'s verified email is a member');
  const stored = hash => ({ ...env.fake.db.prepare('SELECT role, github_id FROM memory_keys WHERE hash = ?').get(hash) });
  assert.deepEqual(stored(await hashKey(dev.key)), { role: 'admin', github_id: '101' });
  assert.deepEqual(stored(await hashKey(twin.key)), { role: 'member', github_id: '102' });
  assert.equal((await call(url, twin.key, { sql: 'DELETE FROM runs' })).status, 403, 'the twin\'s key is a member\'s');
});

test('a store before schema 5 makes nobody admin through join, and its old keys keep working', async t => {
  const old = new DatabaseSync(':memory:');
  for (const file of ['0001_memory.sql', '0002_keys.sql', '0003_key_machines.sql', '0004_readers.sql']) old.exec(readFileSync(new URL(`../../.agents/skills/memory/migrations/${file}`, import.meta.url), 'utf8'));
  const oldAdmin = await addKey(old, 'dev@example.com', 'admin');
  const { url } = await joinable(t, { db: old });
  const dev = (await (await joinCall(url, { token: 'tok-dev', machine: 'm', email: 'dev@example.com' })).json()).result;
  assert.deepEqual([dev.email, dev.role], ['dev@example.com', 'member'], 'an email alone never makes an admin');
  assert.equal((await call(url, dev.key, { sql: 'SELECT 1' })).status, 200);
  assert.equal((await call(url, oldAdmin, { sql: 'SELECT 1' })).status, 200);
});

test('one GitHub account holds at most 10 keys: an eleventh machine stops the one that joined longest ago', async t => {
  const { env, url } = await joinable(t);
  const expired = await addKey(env.fake.db, 'cy@example.com', 'member', { machine: 'gone', expiresAt: '2026-01-01T00:00:00Z', githubId: '202' });
  const keys = [];
  for (let n = 0; n < KEY_LIMIT; n += 1) keys.push(await joinedKey(url, 'tok-cy', `m${n}`));
  assert.equal(env.fake.db.prepare("SELECT count(*) AS n FROM memory_keys WHERE hash = ?").get(await hashKey(expired)).n, 0, 'a join drops the account\'s expired keys');
  const count = () => env.fake.db.prepare("SELECT count(*) AS n FROM memory_keys WHERE github_id = '202'").get().n;
  assert.equal(count(), KEY_LIMIT);
  for (const key of keys) assert.equal((await call(url, key, { sql: 'SELECT 1' })).status, 200);
  const eleventh = await joinedKey(url, 'tok-cy', 'm10');
  assert.equal(count(), KEY_LIMIT);
  assert.equal((await call(url, eleventh, { sql: 'SELECT 1' })).status, 200);
  assert.equal((await call(url, keys[0], { sql: 'SELECT 1' })).status, 401, 'the machine that joined longest ago stops');
  for (const key of keys.slice(1)) assert.equal((await call(url, key, { sql: 'SELECT 1' })).status, 200);
  const renewed = await joinedKey(url, 'tok-cy', 'm1');
  assert.equal(count(), KEY_LIMIT, 'a renewal replaces its own key and stops no other');
  assert.equal((await call(url, keys[2], { sql: 'SELECT 1' })).status, 200);
  assert.equal((await call(url, renewed, { sql: 'SELECT 1' })).status, 200);
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
  assert.equal(env.fake.db.prepare("SELECT count(*) AS n FROM memory_keys WHERE email = 'ana@example.com' AND machine IN ('laptop', 'desktop')").get().n, 2);
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

// The fake gh signed in with a GitHub token, for join.
const fakeGh = () => token => viaWorker({ PATH: GH_PATH, FAKE_GH_TOKEN: token });
const withoutKey = env => writeFileSync(join(env.repo.root, '.env'), readFileSync(join(env.repo.root, '.env'), 'utf8').replace(/^CLOUDFLARE_MEMORY_TOKEN=.*\n/m, ''));
const stateFile = (env, name) => join(env.repo.stateDir, name);

test('memory.mjs join writes the key to .env and never prints it; renewing replaces it', async t => {
  const { env, url } = await joinable(t);
  const gh = fakeGh();
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
  const gh = fakeGh();
  const envBefore = readFileSync(join(env.repo.root, '.env'), 'utf8');
  const keyBefore = readFileSync(stateFile(env, 'key.json'), 'utf8');
  const noScope = await memory(env.repo, env.fake, ['join'], gh('tok-noscope'));
  assert.equal(noScope.code, 1);
  assert.match(noScope.stderr, /gh auth refresh -h github\.com -s user:email/);
  const stranger = await memory(env.repo, env.fake, ['join'], gh('tok-stranger'));
  assert.match(stranger.stderr, /ask the repo's owner/);
  const signedOut = await memory(env.repo, env.fake, ['join', '--background'], gh(''));
  assert.match(signedOut.stderr, /GitHub is not signed in on this machine; sign in to GitHub on this machine: gh auth login/);
  assert.equal(readFileSync(join(env.repo.root, '.env'), 'utf8'), envBefore);
  assert.equal(readFileSync(stateFile(env, 'key.json'), 'utf8'), keyBefore);
  assert.match(JSON.parse(readFileSync(stateFile(env, 'join-error.json'), 'utf8')).message, /gh auth login/);
});

test('member list shows each key\'s machine, GitHub account, and expiry; member remove revokes every key of an email and unlinks the admin', async t => {
  const { env, url, anaKey } = await joinable(t);
  const laptop = await joinedKey(url, 'tok-ana', 'laptop');
  const desktop = await joinedKey(url, 'tok-ana', 'desktop');
  const listed = await memory(env.repo, env.fake, ['member', 'list'], asAdmin(env));
  assert.match(listed.stdout, /ana@example\.com \(member, reader, since \S+, machine desktop, GitHub 201, expires \d{4}-\d{2}-\d{2}\)/);
  assert.match(listed.stdout, /ana@example\.com \(member, reader, since \S+, machine laptop, GitHub 201, expires/);
  assert.match(listed.stdout, /ana@example\.com \(member, since \S+, machine ana-laptop, GitHub 201, expires/);
  assert.doesNotMatch(listed.stdout, /wongm_|[0-9a-f]{64}/);
  const removed = await memory(env.repo, env.fake, ['member', 'remove', 'ana@example.com'], asAdmin(env));
  assert.match(removed.stdout, /3 keys no longer open/);
  for (const key of [laptop, desktop, anaKey]) assert.equal((await call(url, key, { sql: 'SELECT 1' })).status, 401);

  const unlinked = await memory(env.repo, env.fake, ['member', 'remove', 'dev@example.com'], asAdmin(env));
  assert.match(unlinked.stdout, /removed dev@example\.com: their key no longer opens this store; GitHub account dev is no longer linked as the admin/);
  assert.equal(env.fake.db.prepare('SELECT count(*) AS n FROM memory_admins').get().n, 0);
  const after = await memory(env.repo, env.fake, ['member', 'list'], asAdmin(env));
  assert.match(after.stdout, /No keys open this store\.\nNo GitHub account is linked as admin; `node \.claude\/skills\/memory\/scripts\/memory\.mjs member admin` links yours\./);
  const rejoined = (await (await joinCall(url, { token: 'tok-dev', machine: 'm', email: 'dev@example.com' })).json()).result;
  assert.equal(rejoined.role, 'member', 'an unlinked account joins as a member');
});

const hookRun = (env, extra) => node(env.repo, env.fake, 'session-start.mjs', ['--agent', 'claude'], { input: JSON.stringify({ session_id: 's1', cwd: env.repo.root }), env: extra });
async function until(check, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (check()) return true; await new Promise(done => setTimeout(done, 100)); }
  return false;
}

test('the hook sets up memory through GitHub in the background, and the next session loads it', async t => {
  const { env } = await joinable(t);
  const gh = fakeGh();
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
  const gh = fakeGh();
  const joined = await memory(env.repo, env.fake, ['join'], gh('tok-ana'));
  assert.equal(joined.code, 0, joined.stderr);
  const key = envKey(env);
  const saved = JSON.parse(readFileSync(stateFile(env, 'key.json'), 'utf8'));
  writeFileSync(stateFile(env, 'key.json'), JSON.stringify({ ...saved, expiresAt: new Date(Date.now() + 5 * 86400000).toISOString() }));
  const soon = await hookRun(env, gh('tok-ana').env);
  assert.match(soon.stdout, /renewing this machine's memory key through GitHub/);
  // A half-written .env holds no key yet: that is "not yet", never a pass.
  assert.ok(await until(() => { const next = envKey(env); return next && next !== key; }), 'the renewal replaced the key');
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
  const gh = fakeGh();
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

test('a reader\'s fact is absent from a teammate\'s live and show, even with --everyone, and present for the admin\'s --everyone and the reader', async t => {
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
    }
    assert.doesNotMatch((await run([...args, '--everyone'], memberKey)).stdout, NOTE, `${args[0]} --everyone as a member`);
    assert.match((await run([...args, '--everyone'])).stdout, NOTE, `${args[0]} --everyone as the admin`);
  }
});

// ---------- the Worker's lock: a member or reader key reads only what it may see ----------

test('the shadow CTEs keep a teammate\'s personal and unshared facts out, with or without the reader schema', () => {
  assert.equal(shadowCtes('Ana@Example.com'),
    "facts AS (SELECT * FROM main.facts WHERE (type NOT IN ('user', 'feedback') AND shared = 1) OR lower(author) = 'ana@example.com'), "
    + 'fact_tags AS (SELECT * FROM main.fact_tags WHERE fact_id IN (SELECT id FROM facts))');
  assert.match(shadowCtes('ana@example.com', { readerSchema: false }), /^facts AS \(SELECT \* FROM main\.facts WHERE type NOT IN \('user', 'feedback'\) OR lower/);
  assert.match(shadowCtes("o'hara@example.com"), /lower\(author\) = 'o''hara@example\.com'/, 'a quote in the email stays inside its literal');
  assert.match(shadowRead('SELECT 1', 'a@b.co'), /^WITH facts AS \(.*\), fact_tags AS \(.*\) SELECT 1$/);
  assert.match(shadowRead('WITH x AS (SELECT 1) SELECT * FROM x', 'a@b.co'), /^WITH facts AS \(.*\), fact_tags AS \(.*\), x AS \(SELECT 1\) SELECT \* FROM x$/);
  assert.match(shadowRead('with recursive x(n) AS (SELECT 1) SELECT n FROM x', 'a@b.co'), /^WITH RECURSIVE facts AS .*, x\(n\) AS \(SELECT 1\) SELECT n FROM x$/i);
  assert.equal(FTS_HITS, '(SELECT rowid, rank FROM facts_fts WHERE facts_fts MATCH ? AND rowid IN (SELECT id FROM facts))');
});

test('a member read may not name a schema or raw pages, and reads the full-text index only through the fragment', () => {
  for (const sql of ['SELECT body FROM main.facts', 'SELECT body FROM "main"."facts"', 'SELECT body FROM [MAIN].facts', 'SELECT body FROM main /* x */ . facts', 'SELECT * FROM temp.facts', 'SELECT * FROM sqlite_dbpage']) {
    assert.match(readRefusal(sql), /plain names/, sql);
  }
  for (const sql of ['SELECT rowid FROM facts_fts', 'SELECT * FROM facts f JOIN facts_fts ON facts_fts.rowid = f.id WHERE facts_fts MATCH ?', `SELECT * FROM ${FTS_HITS} hits, facts_fts_data`, 'SELECT * FROM "FACTS_FTS"']) {
    assert.match(readRefusal(sql), /update this branch from main to search memory/, sql);
  }
  for (const sql of ['SELECT count(*) AS n FROM facts', 'SELECT f.id AS fid FROM facts f', 'SELECT body FROM facts', `SELECT f.id FROM facts f JOIN ${FTS_HITS} hits ON hits.rowid = f.id ORDER BY hits.rank`, 'SELECT * FROM sessions WHERE branch = ?', "SELECT 'domain.com', maintain, attempt FROM facts"]) {
    assert.equal(readRefusal(sql), null, sql);
  }
});

// A team whose facts hold every kind the lock must hide from ana's member key: dev's user and feedback facts,
// and an unshared fact a reader wrote. Each hidden body says "hidden"; each fact ana may see says "visible".
async function lockedTeam(t) {
  const base = await team(t);
  const db = base.env.fake.db;
  db.prepare("INSERT INTO tags (name, definition, created_at) VALUES ('deploy', 'How deploys run.', 'now')").run();
  const insert = (type, body, author, shared = 1) => {
    const [{ id }] = db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author, shared) VALUES ('x', ?, ?, 'save', '2026-09-26T00:00:00Z', ?, ?) RETURNING id").all(type, body, author, shared);
    db.prepare("INSERT INTO fact_tags (fact_id, tag) VALUES (?, 'deploy')").run(id);
    return id;
  };
  const hidden = [
    insert('feedback', 'hidden: dev wants deploy logs', 'dev@example.com'),
    insert('user', 'hidden: dev has a deploy call every Tuesday', 'Dev@Example.com'),
    insert('project', 'hidden: rae keeps deploy notes', 'rae@example.com', 0),
  ];
  const visible = [
    insert('project', 'visible: deploy runs at noon', 'dev@example.com'),
    insert('feedback', 'visible: ana likes short deploy notes', 'ana@example.com'),
    insert('thread', 'visible: does deploy need a tag', 'rae@example.com'),
  ];
  return { ...base, hidden, visible };
}

test('every read the script sends, under a member key, returns no teammate\'s personal or unshared fact; the admin sees all', async t => {
  const { env, anaKey, hidden, visible } = await lockedTeam(t);
  const gate = writeJsonFile(env.repo.home, 'gate.json', { source: 'save', slug: 'y', facts: [{ type: 'project', body: 'Deploy logs and notes every Tuesday.' }] });
  const reads = [
    ['search', 'deploy'], ['search', 'deploy', '--everyone'], ['search', '--tag', 'deploy', '--everyone', '--all'], ['search', '--author', 'dev', '--everyone'],
    ['show', 'x'], ['show', 'x', '--everyone', '--all'], ['live'], ['live', '--everyone'], ['digest'], ['gate', '--file', gate],
  ];
  for (const args of reads) {
    const result = await memory(env.repo, env.fake, args, viaWorker({ CLOUDFLARE_MEMORY_TOKEN: anaKey }));
    assert.equal(result.code, 0, `${args.join(' ')}: ${result.stderr}`);
    assert.doesNotMatch(result.stdout, /hidden:/, args.join(' '));
  }
  const everyone = await memory(env.repo, env.fake, ['search', 'deploy', '--everyone'], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: anaKey }));
  assert.equal(everyone.stdout.match(/visible:/g).length, visible.length, 'a member sees every fact it may');
  const tags = await memory(env.repo, env.fake, ['tags'], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: anaKey }));
  assert.match(tags.stdout, new RegExp(`deploy \\(${visible.length}\\)`), 'tag counts leave hidden facts out');
  const source = await memory(env.repo, env.fake, ['source', String(hidden[0])], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: anaKey }));
  assert.match(source.stderr, new RegExp(`no fact #${hidden[0]}`));

  const admin = await memory(env.repo, env.fake, ['search', 'deploy', '--everyone'], viaWorker());
  assert.equal(admin.stdout.match(/hidden:|visible:/g).length, hidden.length + visible.length);
});

test('a member cannot get round the lock however it writes the read', async t => {
  const { env, url, anaKey, hidden, visible } = await lockedTeam(t);
  const read = async (sql, params = []) => {
    const response = await call(url, anaKey, { sql, params });
    return { status: response.status, body: await response.json() };
  };
  for (const sql of ['SELECT body FROM main.facts', 'SELECT body FROM "main".facts', 'SELECT body FROM main/**/.facts', 'SELECT body FROM temp.facts', 'SELECT data FROM sqlite_dbpage', 'SELECT rowid FROM facts_fts WHERE facts_fts MATCH ?']) {
    const refused = await read(sql, sql.includes('?') ? ['hidden'] : []);
    assert.deepEqual([refused.status, refused.body.errors[0].code], [403, 'member_read'], sql);
  }
  const old = await read("SELECT f.body FROM facts f JOIN facts_fts ON facts_fts.rowid = f.id WHERE facts_fts MATCH ? ORDER BY bm25(facts_fts)", ['deploy']);
  assert.equal(old.status, 403);
  assert.match(old.body.errors[0].message, /update this branch from main to search memory/);

  const rowsOf = response => response.body.result[0].results;
  const plain = await read('SELECT id, body FROM facts ORDER BY id');
  assert.deepEqual(rowsOf(plain).map(row => row.id), visible);
  const alias = await read(`SELECT hits.rowid AS id FROM (SELECT 1 AS id) f JOIN ${FTS_HITS} hits ON 1 = 1 ORDER BY hits.rowid`, ['hidden OR visible']);
  assert.deepEqual(rowsOf(alias).map(row => row.id), visible, 'a fake alias joined to the fragment gets only visible ids');
  const counted = await read(`SELECT count(*) AS n FROM ${FTS_HITS} hits`, ['hidden']);
  assert.deepEqual(rowsOf(counted), [{ n: 0 }], 'count(*) over the fragment counts no hidden fact');
  const tagged = await read("SELECT count(*) AS n FROM fact_tags WHERE tag = 'deploy'");
  assert.deepEqual(rowsOf(tagged), [{ n: visible.length }]);
  for (const sql of ['WITH facts AS (SELECT * FROM sessions) SELECT * FROM facts', `SELECT * FROM (WITH facts AS (SELECT ${hidden[0]} AS id) SELECT hits.rowid FROM ${FTS_HITS} hits)`, `SELECT * FROM (WITH "Facts"(id) AS MATERIALIZED (SELECT ${hidden[0]}) SELECT hits.rowid FROM ${FTS_HITS} hits)`, 'SELECT * FROM (WITH fact_tags AS (SELECT 1) SELECT * FROM fact_tags)']) {
    const refused = await read(sql, sql.includes('?') ? ['hidden'] : []);
    assert.deepEqual([refused.status, refused.body.errors[0].code], [403, 'member_read'], `a read with its own facts CTE is refused: ${sql}`);
  }
  const nested = await read('SELECT * FROM (WITH x AS (SELECT * FROM facts) SELECT * FROM x) ORDER BY id');
  assert.deepEqual(rowsOf(nested).map(row => row.id), visible);

  const admin = await call(url, envKey(env), { sql: 'SELECT count(*) AS n FROM main.facts' });
  assert.deepEqual((await admin.json()).result[0].results, [{ n: hidden.length + visible.length }], 'the admin reads the store whole');
});

test('each answer names the key\'s role, and only the admin\'s digest offers everyone\'s facts', async t => {
  const { env, url, anaKey } = await joinable(t);
  const readerKey = await joinedKey(url, 'tok-ana');
  const roleOf = async key => (await call(url, key, { sql: 'SELECT 1' })).headers.get('Wong-Memory-Role');
  assert.deepEqual([await roleOf(envKey(env)), await roleOf(anaKey), await roleOf(readerKey)], ['admin', 'member', 'reader']);
  env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('x', 'project', 'deploy runs at noon', 'save', '2026-09-26T00:00:00Z', 'dev@example.com')").run();
  const member = await memory(env.repo, env.fake, ['digest'], viaWorker({ CLOUDFLARE_MEMORY_TOKEN: anaKey }));
  assert.match(member.stdout, /This team repo shows only your own user and feedback facts\.\n/);
  assert.doesNotMatch(member.stdout, /See everyone's/);
  assert.equal(JSON.parse(readFileSync(stateFile(env, 'team.json'), 'utf8')).role, 'member');
  const admin = await memory(env.repo, env.fake, ['digest'], viaWorker());
  assert.match(admin.stdout, /See everyone's: `.* --everyone`/);
  assert.equal(JSON.parse(readFileSync(stateFile(env, 'team.json'), 'utf8')).role, 'admin');
});

test('on a store before the reader schema, a member still reads through the lock', async () => {
  const db = new DatabaseSync(':memory:');
  for (const file of ['0001_memory.sql', '0002_keys.sql', '0003_key_machines.sql']) db.exec(readFileSync(new URL(`../../.agents/skills/memory/migrations/${file}`, import.meta.url), 'utf8'));
  const anaKey = keyFor('ana@example.com');
  db.prepare("INSERT INTO memory_keys (hash, email, role, created_at) VALUES (?, 'ana@example.com', 'member', 'now'), ('h', 'dev@example.com', 'admin', 'now')").run(await hashKey(anaKey));
  db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('x', 'feedback', 'dev wants logs', 'save', 'now', 'dev@example.com'), ('x', 'project', 'deploy at noon', 'save', 'now', 'dev@example.com')").run();
  const response = await handleMemory(new Request('http://w/_memory/accounts/a/d1/database/db1/query', { method: 'POST', headers: { Authorization: `Bearer ${anaKey}` }, body: JSON.stringify({ sql: 'SELECT body FROM facts' }) }), { MEMORY_DB: d1(db) });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).result[0].results, [{ body: 'deploy at noon' }]);
});

test('outside a team, nothing is shadowed', async t => {
  const env = await setup(t);
  const url = await appWorker({ MEMORY_DB: d1(env.fake.db) });
  const anaKey = await addKey(env.fake.db, 'ana@example.com', 'member');
  env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author) VALUES ('x', 'feedback', 'someone prefers tabs', 'save', 'now', 'other@example.com')").run();
  const response = await call(url, anaKey, { sql: 'SELECT f.body FROM facts f JOIN facts_fts ON facts_fts.rowid = f.id WHERE facts_fts MATCH ?', params: ['tabs'] });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).result[0].results, [{ body: 'someone prefers tabs' }]);
});
