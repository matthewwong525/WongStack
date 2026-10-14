// Exercise the real Worker, SQL guards and the company sign-in's roles over the existing D1/R2 fixture.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { handleMemory, hashKey, newKey, MAX_TRANSCRIPT_BYTES, mayTouch } from '../../.agents/skills/memory/worker/memory-worker.mjs';
import { ADMIN_WRITES, FTS_HITS, LEGACY_FTS_HITS, readRefusal, shadowCtes, supersedeSql, WRITES } from '../../.agents/skills/memory/worker/statements.mjs';
import { keyMachine } from '../../.agents/skills/memory/scripts/lib/store.mjs';
import { personalFilter } from '../../.agents/skills/memory/scripts/lib/digest.mjs';
import { fakeSignIn, memory, node, setup, signInAs, tempDir, testToken, writeJsonFile } from './fixtures/memory/harness.mjs';

const OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SESSION = '11111111-1111-4111-8111-111111111111';
const EMAIL = 'same@example.com';
const iso = () => new Date().toISOString();
const admin = { env: { CLOUDFLARE_API_TOKEN: 'test-memory-token-value' } };
const token = env => readFileSync(join(env.repo.root, '.env'), 'utf8').match(/^CLOUDFLARE_MEMORY_TOKEN=(\S+)/m)[1];
const bindings = env => {
  const db = env.fake.db;
  const statement = (sql, params = []) => ({ bind: (...values) => statement(sql, values), first: async () => db.prepare(sql).get(...params) || null,
    all: async () => ({ results: db.prepare(sql).all(...params), meta: {} }) });
  return { MEMORY_DB: { prepare: sql => statement(sql), batch: async statements => {
    db.exec('BEGIN');
    try { const out = []; for (const each of statements) out.push(await each.all()); db.exec('COMMIT'); return out; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  } }, MEMORY_BUCKET: { get: async key => env.fake.objects.has(key) ? { body: env.fake.objects.get(key) } : null,
    put: async (key, value) => env.fake.objects.set(key, Buffer.from(value)) } };
};
// A sign-in token goes in cf-access-token, an old key as a Bearer, a schedule's as its two headers.
const credential = key => typeof key === 'object' ? { 'CF-Access-Client-Id': key.id, 'CF-Access-Client-Secret': key.secret }
  : key.startsWith('wongm_') ? { Authorization: `Bearer ${key}` } : { 'cf-access-token': key };
const call = (env, key, path, init = {}) => handleMemory(new Request(`https://app.example/_memory/${path}`, { ...init, headers: { ...credential(key), ...init.headers } }), bindings(env), fakeSignIn);
const query = (env, key, body) => call(env, key, 'accounts/a/d1/database/db1/query', { method: 'POST', body: JSON.stringify(body) });
const object = (env, key, path, method = 'GET', body, headers = {}) => call(env, key, `accounts/a/r2/buckets/b/objects/${encodeURIComponent(path)}`, { method, headers, ...(method === 'PUT' ? { body } : {}) });
const fact = (owner, body, type = 'project', author = EMAIL) => ({ sql: WRITES.fact.sql, params: ['x', type, body, null, 'save', iso(), author, owner, 1] });
const session = (owner, id = `claude:${SESSION}`, email = EMAIL) => ({ sql: WRITES.session.sql,
  params: [id, 'claude', email, 'same-host', 'main', '/repo', null, null, 'skipped', 'awaiting capture', null, null, null, iso(), owner, email] });
const grant = (subject = OWNER, role = 'member', claims = {}) => testToken({ sub: subject, email: EMAIL, role, ...claims });
// Another computer of this repo, signed in as `subject` (or with an old key in .env when `key` is one).
function local(t, env, subject, key) {
  const home = tempDir(t, 'machine-user-');
  const dataHome = join(home, 'data'), machineId = randomUUID();
  mkdirSync(join(dataHome, 'wongstack'), { recursive: true });
  writeFileSync(join(dataHome, 'wongstack', 'machine-id'), `${machineId}\n`, { mode: 0o600 });
  const repo = { ...env.repo, home, dataHome, bin: join(home, 'bin'), machineId, stateBase: join(home, 'state'), stateDir: join(home, 'state', machineId) };
  signInAs(repo, key && !key.startsWith('wongm_') ? key : null);
  return repo;
}
const run = (env, repo, key, args) => memory(repo, env.fake, args, { env: key.startsWith('wongm_') ? { CLOUDFLARE_MEMORY_TOKEN: key } : {} });
const bodies = async response => (await response.json()).result[0].results.map(row => row.body);
const insert = (env, owner, type, body, shared = 1) => env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author, owner_subject, shared) VALUES ('x', ?, ?, 'save', ?, ?, ?, ?) RETURNING id").get(type, body, iso(), EMAIL, owner, shared).id;
async function schedule(env, name = 'nightly', secret = 'schedule-secret') {
  const id = `${name}.access`;
  env.fake.db.prepare('INSERT INTO memory_schedules (client_id, name, secret_hash, token_id, created_at) VALUES (?, ?, ?, ?, ?)').run(id, name, await hashKey(secret), 'tok', iso());
  return { id, secret };
}

for (const role of ['member', 'reader']) {
  test(`${role}: the same email never expands private fact or session scope`, async t => {
    const env = await setup(t);
    const key = grant(OWNER, role);
    insert(env, OWNER, 'feedback', 'own private');
    insert(env, OTHER, 'feedback', 'other private');
    insert(env, null, 'user', 'unassigned private');
    insert(env, OTHER, 'project', 'shared team fact');
    insert(env, OTHER, 'reference', 'unshared reader fact', 0);
    assert.deepEqual(await bodies(await query(env, key, { sql: 'SELECT body FROM facts ORDER BY id' })), ['own private', 'shared team fact']);
    await query(env, key, session(OWNER));
    env.fake.db.prepare("INSERT INTO sessions (id, agent, status, author, machine, updated_at) VALUES ('claude:legacy', 'claude', 'captured', ?, 'same-host', 'now')").run(EMAIL);
    const rows = (await (await query(env, key, { sql: 'SELECT id FROM sessions' })).json()).result[0].results;
    assert.deepEqual(rows.map(row => row.id), [`claude:${SESSION}`]);
    assert.equal((await query(env, key, session(OWNER, 'claude:legacy'))).status, 403);
  });
  test(`${role}: author labels stay independent and another owner or email cannot be claimed`, async t => {
    const env = await setup(t); const key = grant(OWNER, role);
    assert.equal((await query(env, key, fact(OWNER, 'own note', 'project', 'original-label'))).status, 200);
    assert.equal((await query(env, key, fact(OTHER, 'forged note'))).status, 403);
    assert.equal((await query(env, key, session(OWNER, `claude:${SESSION}`, 'other@example.com'))).status, 403);
    const row = env.fake.db.prepare('SELECT author, owner_subject, shared FROM facts').get();
    assert.deepEqual({ ...row }, { author: 'original-label', owner_subject: OWNER, shared: role === 'reader' ? 0 : 1 });
  });
  test(`${role}: supersedes affect only its own facts and require its replacement in the batch`, async t => {
    const env = await setup(t); const key = grant(OWNER, role);
    const own = insert(env, OWNER, 'project', 'old own'); const other = insert(env, OTHER, 'project', 'old other');
    const legacy = insert(env, null, 'project', 'legacy');
    assert.equal((await query(env, key, { sql: supersedeSql(1), params: [other] })).status, 403);
    const response = await query(env, key, { batch: [fact(OWNER, 'replacement'), { sql: supersedeSql(3), params: [own, other, legacy] }] });
    assert.equal(response.status, 200);
    assert.ok(env.fake.db.prepare('SELECT superseded_by FROM facts WHERE id = ?').get(own).superseded_by);
    for (const id of [other, legacy]) assert.equal(env.fake.db.prepare('SELECT superseded_by FROM facts WHERE id = ?').get(id).superseded_by, null);
  });
  test(`${role}: every normal read keeps privacy including --everyone, search, gate and tags`, async t => {
    const env = await setup(t); const key = grant(OWNER, role); const repo = local(t, env, OWNER, key);
    insert(env, OWNER, 'feedback', 'visible deploy preference'); insert(env, OTHER, 'feedback', 'hidden deploy preference');
    insert(env, OTHER, 'project', 'visible deploy schedule'); insert(env, OTHER, 'project', 'hidden deploy reader note', 0);
    env.fake.db.exec("INSERT INTO tags (name, definition, created_at) VALUES ('deploy', 'Deploys', 'now')");
    env.fake.db.prepare('INSERT INTO fact_tags (fact_id, tag) SELECT id, ? FROM facts').run('deploy');
    const input = writeJsonFile(repo.home, 'gate.json', { slug: 'x', facts: [{ type: 'project', body: 'Deploy preferences and schedules.' }] });
    for (const args of [['search', 'deploy'], ['search', 'deploy', '--everyone'], ['search', 'deploy', '--all'], ['search', '--tag', 'deploy', '--all', '--everyone'], ['search', '--author', 'same', '--everyone'], ['show', 'x', '--everyone'], ['live', '--everyone'], ['digest'], ['gate', '--file', input], ['tags'], ['areas', 'app/worker/index.ts']]) {
      const result = await run(env, repo, key, args); assert.equal(result.code, 0, result.stderr); assert.doesNotMatch(result.stdout, /hidden deploy/);
    }
  });
}

test('the person owns private memory across computers and an email change, never by a matching email', async t => {
  const env = await setup(t);
  insert(env, OWNER, 'feedback', 'person preference'); insert(env, OTHER, 'feedback', 'same email, other person');
  for (const key of [grant(OWNER), grant(OWNER, 'member', { email: 'changed@example.com' })]) {
    const repo = local(t, env, OWNER, key);
    const result = await run(env, repo, key, ['search', 'preference', '--everyone']);
    assert.equal(result.code, 0, result.stderr); assert.match(result.stdout, /person preference/); assert.doesNotMatch(result.stdout, /other person/);
  }
});

test('a sign-in for another app, an expired one, or none at all reaches nothing', async t => {
  const env = await setup(t); insert(env, null, 'project', 'shared');
  for (const key of [grant(OWNER, 'member', { aud: 'another-app' }), grant(OWNER, 'admin', { exp: 1 }), 'not-a-token']) {
    const response = await query(env, key, { sql: 'SELECT body FROM facts' });
    assert.equal(response.status, 401); assert.match((await response.json()).errors[0].message, /sign in to the company app again/);
  }
  assert.equal((await handleMemory(new Request('https://app.example/_memory/caller'), bindings(env))).status, 401);
});

test('a signed-in admin reads everything; rows with no owner are admin-only', async t => {
  const env = await setup(t);
  insert(env, null, 'user', 'unassigned private'); insert(env, null, 'reference', 'unassigned unshared', 0); insert(env, OTHER, 'feedback', 'other private');
  assert.deepEqual((await bodies(await query(env, grant('owner-subject', 'admin'), { sql: 'SELECT body FROM facts ORDER BY id' }))).length, 3);
  for (const role of ['member', 'reader']) assert.deepEqual(await bodies(await query(env, grant(OWNER, role), { sql: 'SELECT body FROM facts' })), []);
  const caller = await (await call(env, grant('owner-subject', 'admin'), 'caller')).json();
  assert.deepEqual(caller.result, { role: 'admin', subject: 'owner-subject', email: EMAIL });
});

test('a schedule sign-in reads and writes team facts only, never a person or a chat, until revoked', async t => {
  const env = await setup(t); const team = await schedule(env);
  insert(env, OWNER, 'feedback', 'private preference'); insert(env, null, 'user', 'unassigned private'); insert(env, OTHER, 'project', 'shared decision');
  insert(env, OTHER, 'reference', 'reader note', 0);
  const read = await query(env, team, { sql: 'SELECT body FROM facts ORDER BY id' });
  assert.deepEqual(await bodies(read), ['shared decision']); assert.equal(read.headers.get('Wong-Memory-Role'), 'team');
  assert.equal((await query(env, team, fact(null, 'nightly report sent'))).status, 200);
  assert.deepEqual({ ...env.fake.db.prepare("SELECT owner_subject, shared FROM facts WHERE body = 'nightly report sent'").get() }, { owner_subject: null, shared: 1 });
  assert.equal((await query(env, team, fact(OWNER, 'claims a person'))).status, 403);
  assert.equal((await query(env, team, session(null))).status, 403);
  assert.equal((await object(env, team, `sessions/${OWNER}/claude/${SESSION}.jsonl`)).status, 403);
  assert.equal((await query(env, { ...team, secret: 'wrong' }, { sql: 'SELECT 1' })).status, 401);
  assert.equal((await query(env, team, { sql: 'SELECT * FROM memory_schedules' })).status, 403);
  env.fake.db.prepare('UPDATE memory_schedules SET revoked_at = ?').run(iso());
  assert.equal((await query(env, team, { sql: 'SELECT 1' })).status, 401);
});

for (const sql of [
  'SELECT body FROM main.facts', 'SELECT body FROM "main"."facts"', 'SELECT body FROM [MAIN].facts', 'SELECT body FROM main/**/.facts',
  'SELECT * FROM temp.facts', 'SELECT * FROM `facts_fts`', 'SELECT * FROM "FACTS_FTS"', 'SELECT * FROM [facts_fts_idx]', 'SELECT * FROM sqlite_dbpage', 'SELECT * FROM facts_fts', 'SELECT * FROM facts_fts_data',
  'WITH facts AS (SELECT 1) SELECT * FROM facts', 'WITH fact_tags AS (SELECT 1) SELECT * FROM fact_tags',
  'WITH sessions AS (SELECT 1) SELECT * FROM sessions', 'SELECT * FROM (WITH "Facts"(id) AS MATERIALIZED (SELECT 1) SELECT * FROM facts)',
]) test(`a member refuses SQL privacy bypass: ${sql}`, async t => {
  const env = await setup(t);
  assert.match(readRefusal(sql), /plain names|full-text fragment/);
  assert.equal((await query(env, grant(), { sql })).status, 403);
});

for (const sql of ['DELETE FROM facts', "UPDATE facts SET body = 'changed'", "SELECT 'UPDATE' AS hidden_write", 'PRAGMA writable_schema = ON', 'SELECT * FROM memory_keys', 'SELECT * FROM memory_admins', 'SELECT * FROM memory_schedules', 'SELECT 1; DELETE FROM sessions']) {
  test(`a refused statement leaves its entire batch unchanged: ${sql}`, async t => {
    const env = await setup(t);
    const before = env.fake.db.prepare('SELECT count(*) AS n FROM facts').get().n;
    assert.equal((await query(env, grant(), { batch: [fact(OWNER, 'must roll back'), { sql }] })).status, 403);
    assert.equal(env.fake.db.prepare('SELECT count(*) AS n FROM facts').get().n, before);
  });
}

test('filtered FTS, nested reads and tag counts expose only visible facts', async t => {
  const env = await setup(t); const key = grant();
  const visible = insert(env, OWNER, 'feedback', 'visible deploy preference');
  insert(env, OTHER, 'feedback', 'hidden deploy preference');
  env.fake.db.exec("INSERT INTO tags (name, definition, created_at) VALUES ('deploy', 'Deploys', 'now')");
  env.fake.db.prepare('INSERT INTO fact_tags (fact_id, tag) SELECT id, ? FROM facts').run('deploy');
  // The current fragment and the one a computer that has not updated still sends.
  const queries = [FTS_HITS, LEGACY_FTS_HITS].map(fragment =>
    [`SELECT hits.rowid AS id FROM (SELECT 1 AS id) f JOIN ${fragment} hits ON 1 = 1 ORDER BY hits.rowid`, ['hidden OR visible']]).concat([
    ['SELECT id FROM (WITH x AS (SELECT * FROM facts) SELECT * FROM x)', []],
    ['WITH x AS (SELECT id FROM facts) SELECT id FROM x', []],
    ['WITH RECURSIVE x(id) AS (SELECT id FROM facts) SELECT id FROM x', []],
  ]);
  for (const [sql, params] of queries) assert.deepEqual((await (await query(env, key, { sql, params })).json()).result[0].results.map(row => row.id), [visible]);
  assert.deepEqual((await (await query(env, key, { sql: 'SELECT count(*) AS n FROM fact_tags' })).json()).result[0].results, [{ n: 1 }]);
  assert.match(shadowCtes(OWNER), /sessions AS .*owner_subject/);
});

test('a search runs its full-text match once, not once per stored fact, and finds what the old fragment found', async t => {
  const env = await setup(t);
  const words = ['preview', 'deploy', 'cache', 'cold', 'worker', 'memory', 'search', 'branch'];
  for (let i = 0; i < 200; i++) insert(env, OWNER, 'project', `Fact ${i}: ${words[i % 8]} ${words[(i * 3) % 8]}.`);
  // The save gate's neighbour lookup (memory.mjs) and a search (lib/read-facts.mjs).
  const shapes = fragment => [
    [`SELECT f.id FROM facts f JOIN ${fragment} hits ON hits.rowid = f.id WHERE f.superseded_by IS NULL AND f.slug != ? ORDER BY hits.rank LIMIT 5`, ['"cold" OR "preview" OR "memory"', 'y']],
    [`SELECT f.id FROM facts f JOIN ${fragment} hits ON hits.rowid = f.id WHERE f.superseded_by IS NULL ORDER BY hits.rank, f.created_at DESC, f.id DESC LIMIT 30`, ['"cold" OR "preview" OR "memory"']],
  ];
  const ids = ([sql, params]) => env.fake.db.prepare(sql).all(...params).map(row => row.id);
  for (const [index, [sql, params]] of shapes(FTS_HITS).entries()) {
    const plan = env.fake.db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...params).map(row => String(row.detail));
    // facts_fts leads on its MATCH alone; an `=` after the colon is a rowid lookup that re-runs the MATCH per fact.
    assert.match(plan[0], /^SCAN facts_fts VIRTUAL TABLE INDEX \d+:M/, plan.join(' | '));
    assert.ok(ids([sql, params]).length > 0);
    assert.deepEqual(ids([sql, params]), ids(shapes(LEGACY_FTS_HITS)[index]));
  }
});

test('an old admin key opens memory with no person; an old member key needs the sign-in', async t => {
  const env = await setup(t);
  const member = newKey(OWNER);
  env.fake.db.prepare('INSERT INTO memory_keys (hash, email, role, created_at, machine_id) VALUES (?, ?, ?, ?, ?)').run(await hashKey(member), EMAIL, 'member', iso(), OWNER);
  assert.equal((await query(env, member, { sql: 'SELECT 1' })).status, 401);
  assert.deepEqual((await (await call(env, token(env), 'caller')).json()).result, { role: 'admin', subject: null, email: 'dev@example.com' });
  assert.equal((await query(env, newKey(OWNER), { sql: 'SELECT 1' })).status, 401);
});

test('the admin defaults to its own private facts and --everyone widens to all', async t => {
  const env = await setup(t); const key = grant('owner-subject', 'admin'); const repo = local(t, env, 'owner-subject', key);
  insert(env, 'owner-subject', 'feedback', 'own deploy preference'); insert(env, OTHER, 'feedback', 'other deploy preference'); insert(env, null, 'feedback', 'legacy deploy preference');
  const mine = await run(env, repo, key, ['search', 'deploy']);
  assert.match(mine.stdout, /own deploy/); assert.doesNotMatch(mine.stdout, /other deploy|legacy deploy/);
  const everyone = await run(env, repo, key, ['search', 'deploy', '--everyone']);
  assert.match(everyone.stdout, /other deploy/); assert.match(everyone.stdout, /legacy deploy/);
  const filter = await personalFilter({}, { owner: OWNER });
  assert.deepEqual(filter.params, [OWNER]); assert.doesNotMatch(filter.clause, /author|email/);
});

test('admin retag and upkeep keep original authors and unassigned ownership', async t => {
  const env = await setup(t);
  const id = insert(env, null, 'project', 'Legacy route lives in app/worker/api/.');
  const input = writeJsonFile(env.repo.home, 'retag.json', { retag: [{ id, tags: ['worker'] }], newTags: [{ name: 'worker', definition: 'Worker code.' }] });
  const result = await memory(env.repo, env.fake, ['retag', '--file', input, '--everyone']);
  assert.equal(result.code, 0, result.stderr);
  const all = env.fake.db.prepare('SELECT author, owner_subject, body FROM facts ORDER BY id').all();
  assert.ok(all.length >= 2); assert.ok(all.every(row => row.author === EMAIL && row.owner_subject === null));
  const privateId = insert(env, OTHER, 'reference', 'Reader note must stay unshared', 0);
  const privateInput = writeJsonFile(env.repo.home, 'private-retag.json', { retag: [{ id: privateId, tags: ['worker'] }] });
  assert.equal((await memory(env.repo, env.fake, ['retag', '--file', privateInput])).code, 0);
  const restated = env.fake.db.prepare('SELECT owner_subject, author, shared FROM facts WHERE id = (SELECT superseded_by FROM facts WHERE id = ?)').get(privateId);
  assert.deepEqual({ ...restated }, { owner_subject: OTHER, author: EMAIL, shared: 0 });
});

test('member retag and upkeep change only owned facts, keeping attribution', async t => {
  const env = await setup(t); const key = grant(); const repo = local(t, env, OWNER, key);
  const own = insert(env, OWNER, 'project', 'Own routes in app/worker/api/.'); const other = insert(env, OTHER, 'project', 'Other routes in app/worker/api/.');
  env.fake.db.exec("INSERT INTO tags (name, definition, created_at) VALUES ('worker', 'Worker code', 'now')");
  const input = writeJsonFile(repo.home, 'retag.json', { retag: [{ id: own, tags: ['worker'] }, { id: other, tags: ['worker'] }] });
  const result = await run(env, repo, key, ['retag', '--file', input]); assert.equal(result.code, 0, result.stderr);
  assert.equal(env.fake.db.prepare('SELECT superseded_by FROM facts WHERE id = ?').get(other).superseded_by, null);
  assert.equal((await run(env, repo, key, ['upkeep'])).code, 0);
});

test('only the admin updates shared tags and no caller can read the sign-in tables', async t => {
  const env = await setup(t); const key = grant();
  assert.equal((await query(env, key, { sql: ADMIN_WRITES.tagUpdate.sql, params: ['new', null, 'worker'] })).status, 403);
  for (const caller of [key, token(env), grant('owner-subject', 'admin')]) for (const sql of ['SELECT * FROM memory_keys', 'SELECT * FROM memory_admins']) assert.equal((await query(env, caller, { sql })).status, 403);
});

test('member raw objects are isolated by person, including historical paths', async t => {
  const env = await setup(t); const key = grant();
  assert.equal((await query(env, key, session(OWNER))).status, 200);
  const path = `sessions/${OWNER}/claude/${SESSION}.jsonl`;
  assert.equal((await object(env, key, path, 'PUT', 'own transcript')).status, 200);
  assert.equal(await (await object(env, key, path)).text(), 'own transcript');
  for (const historical of [`sessions/${OTHER}/claude/${SESSION}.jsonl`, `sessions/${EMAIL}/claude/old.jsonl`, 'sessions/claude/old.jsonl']) {
    env.fake.objects.set(historical, Buffer.from('legacy raw'));
    assert.equal((await object(env, key, historical)).status, 403);
    assert.equal(await (await object(env, token(env), historical)).text(), 'legacy raw');
    assert.equal((await object(env, key, historical, 'PUT', 'claim')).status, 403);
  }
  assert.equal((await object(env, key, path, 'DELETE')).status, 405);
  assert.equal((await object(env, key, `sessions/${OWNER}/claude/missing.jsonl`)).status, 404);
  assert.equal(mayTouch({ role: 'member', subject: OWNER }, `sessions/${OWNER}-fake/claude/a`), false);
  assert.equal(mayTouch({ role: 'team', subject: null }, 'sessions/null/claude/a'), false);
});

test('raw uploads require a nonprivate owned ledger row before storing bytes', async t => {
  const env = await setup(t); const key = grant();
  const path = `sessions/${OWNER}/claude/${SESSION}.jsonl`;
  assert.equal((await object(env, key, path, 'PUT', 'unregistered')).status, 403);
  await query(env, key, session(OWNER));
  env.fake.db.prepare("UPDATE sessions SET status = 'private' WHERE id = ?").run(`claude:${SESSION}`);
  assert.equal((await object(env, key, path, 'PUT', 'private')).status, 403);
  assert.equal((await query(env, key, session(OWNER))).status, 403);
  assert.equal(env.fake.objects.size, 0);
});

test('the bucket rejects both advertised and actual transcripts over 50 MB and accepts the exact cap', async t => {
  const env = await setup(t); const key = grant(); await query(env, key, session(OWNER));
  const path = `sessions/${OWNER}/claude/${SESSION}.jsonl`;
  assert.equal((await object(env, key, path, 'PUT', 'small', { 'Content-Length': String(MAX_TRANSCRIPT_BYTES + 1) })).status, 413);
  assert.equal((await object(env, key, path, 'PUT', Buffer.alloc(MAX_TRANSCRIPT_BYTES + 1))).status, 413);
  assert.equal(env.fake.objects.size, 0);
  assert.equal((await object(env, key, path, 'PUT', Buffer.alloc(MAX_TRANSCRIPT_BYTES))).status, 200);
  assert.equal(env.fake.objects.get(path).length, MAX_TRANSCRIPT_BYTES);
});

test('staging has no store and no-R2 production keeps normal fact queries', async t => {
  const env = await setup(t, { bucket: false });
  assert.equal((await handleMemory(new Request('https://preview/_memory/caller'), {})).status, 404);
  const noBucket = await handleMemory(new Request('https://prod/_memory/r2/buckets/b/objects/a', { headers: { Authorization: `Bearer ${token(env)}` } }), { MEMORY_DB: bindings(env).MEMORY_DB });
  assert.equal(noBucket.status, 404); assert.equal((await noBucket.json()).errors[0].code, 'no_bucket');
  assert.equal((await query(env, token(env), fact(null, 'facts without raw'))).status, 200);
});

test('an app with no sign-in yet issues its admin key with no git email and stores only hashes', async t => {
  const env = await setup(t); execFileSync('git', ['config', 'user.email', ''], { cwd: env.repo.root });
  const old = token(env);
  const result = await memory(env.repo, env.fake, ['member', 'admin'], admin);
  assert.equal(result.code, 0, result.stderr); assert.doesNotMatch(result.stdout, /wongm_|[0-9a-f]{64}/);
  const key = token(env); assert.equal(keyMachine(key), env.repo.machineId); assert.notEqual(key, old);
  const row = env.fake.db.prepare('SELECT machine_id, expires_at FROM memory_keys WHERE hash = ?').get(await hashKey(key));
  assert.equal(row.machine_id, env.repo.machineId); assert.equal(row.expires_at, null);
  assert.ok(!JSON.stringify(env.fake.db.prepare('SELECT * FROM memory_keys').all()).includes(key));
  assert.equal((await query(env, old, { sql: 'SELECT 1' })).status, 401);
  assert.equal((await query(env, key, { sql: 'SELECT 1' })).status, 200);
});

test('with a sign-in on, member admin, member add and join point to Access and change nothing', async t => {
  const env = await setup(t);
  const config = join(env.repo.root, '.claude', '.wong-stack.json');
  const record = JSON.parse(readFileSync(config, 'utf8'));
  writeFileSync(config, JSON.stringify({ components: { ...record.components, access: { audience: 'aud' } } }));
  const before = env.fake.db.prepare('SELECT count(*) AS n FROM memory_keys').get().n; const env0 = readFileSync(join(env.repo.root, '.env'), 'utf8');
  for (const args of [['member', 'admin'], ['member', 'add', OWNER], ['join', '--file', '/tmp/key.json']]) {
    const result = await memory(env.repo, env.fake, args, admin);
    assert.equal(result.code, 1, args.join(' ')); assert.match(result.stderr, /company sign-in now: no key to hand out/);
  }
  assert.equal(env.fake.db.prepare('SELECT count(*) AS n FROM memory_keys').get().n, before);
  assert.equal(readFileSync(join(env.repo.root, '.env'), 'utf8'), env0);
});

test('listing shows machine IDs, roles, revocation and the signed-in person, never secrets', async t => {
  const env = await setup(t); const key = newKey(OWNER);
  env.fake.db.prepare('INSERT INTO memory_keys (hash, email, role, reader, created_at, machine_id, login_identity) VALUES (?, ?, ?, 1, ?, ?, ?)')
    .run(await hashKey(key), EMAIL, 'member', iso(), OWNER, JSON.stringify({ issuer: 'https://login', subject: 'verified-person', email: 'person@example.com' }));
  const result = await memory(env.repo, env.fake, ['member', 'list'], admin);
  assert.equal(result.code, 0, result.stderr); assert.match(result.stdout, /reader/); assert.match(result.stdout, /person@example\.com/);
  assert.doesNotMatch(result.stdout, /wongm_|wongl_|[0-9a-f]{64}/);
});

test('removal turns off every key for a computer', async t => {
  const env = await setup(t);
  const result = await memory(env.repo, env.fake, ['member', 'remove', env.repo.machineId], admin);
  assert.equal(result.code, 0, result.stderr);
  assert.equal((await query(env, token(env), { sql: 'SELECT 1' })).status, 401);
});

test('a malformed key and no sign-in never fall back to Cloudflare API authority', async t => {
  const env = await setup(t);
  for (const key of ['cloudflare-token', 'wongm_YUBiLmNv.nope', `wongm_${Buffer.from(EMAIL).toString('base64url')}.${'q'.repeat(43)}`]) {
    const before = env.fake.calls.length;
    const result = await memory(env.repo, env.fake, ['search', 'x'], { env: { CLOUDFLARE_MEMORY_TOKEN: key } });
    assert.equal(result.code, 1); assert.match(result.stderr, /not signed in to the company app/);
    assert.equal(env.fake.calls.length, before);
  }
});

test('missing ownership schema fails clearly without email fallback', async t => {
  const env = await setup(t);
  const oldDb = { prepare: () => ({ bind: () => ({ first: async () => { throw new Error('no such column: owner_subject'); } }) }) };
  const response = await handleMemory(new Request('https://prod/_memory/caller', { headers: { Authorization: `Bearer ${token(env)}` } }), { MEMORY_DB: oldDb });
  assert.equal(response.status, 503); assert.equal((await response.json()).errors[0].code, 'not_migrated');
});

test('no route enrols a person or hands out a key', async t => {
  const env = await setup(t);
  const before = env.fake.db.prepare('SELECT count(*) AS n FROM memory_keys').get().n;
  for (const path of ['join', 'login-link']) {
    assert.equal((await handleMemory(new Request(`https://prod/_memory/${path}`, { method: 'POST', body: '{}' }), bindings(env))).status, 401);
    assert.equal((await call(env, token(env), path, { method: 'POST', body: '{}' })).status, 404);
  }
  assert.equal(env.fake.db.prepare('SELECT count(*) AS n FROM memory_keys').get().n, before);
});

test('migrations use provisioning authority and stay repeatable', async t => {
  const env = await setup(t); const result = await memory(env.repo, env.fake, ['migrate'], admin);
  assert.equal(result.code, 0, result.stderr); assert.match(result.stdout, /up to date/);
  assert.equal(env.fake.db.prepare('SELECT count(*) AS n FROM memory_admins').get().n, 0);
});

test('the public route keeps Cloudflare batch shape and meaningful errors', async t => {
  const env = await setup(t); const response = await query(env, token(env), { batch: [{ sql: 'SELECT ? AS n', params: [7] }, { sql: 'SELECT 2 AS m' }] });
  assert.deepEqual((await response.json()).result.map(row => row.results), [[{ n: 7 }], [{ m: 2 }]]);
  assert.equal((await query(env, token(env), {})).status, 400);
  assert.equal((await query(env, token(env), { sql: 'SELECT nope FROM nowhere' })).status, 400);
});

test("members cannot overwrite another person's or an unassigned session, even with matching emails", async t => {
  const env = await setup(t); const key = grant();
  for (const owner of [OTHER, null]) {
    const id = `claude:${randomUUID()}`;
    env.fake.db.prepare("INSERT INTO sessions (id, agent, author, status, updated_at, owner_subject) VALUES (?, 'claude', ?, 'captured', 'now', ?)").run(id, EMAIL, owner);
    assert.equal((await query(env, key, { batch: [session(OWNER, id), fact(OWNER, 'no partial write')] })).status, 403);
  }
  assert.equal(env.fake.db.prepare('SELECT count(*) AS n FROM facts').get().n, 0);
});

test('the hook names the sign-in step when there is none, and never enrols', async t => {
  const env = await setup(t); writeFileSync(join(env.repo.root, '.env'), 'OTHER=1\n');
  const result = await node(env.repo, env.fake, 'session-start.mjs', [], { input: JSON.stringify({ session_id: 'missing' }), env: { WONG_MEMORY_NO_HEADLESS: '1' } });
  assert.equal(result.code, 0); assert.match(result.stdout, /cloudflared access login/); assert.doesNotMatch(result.stdout, /GitHub|join --file/);
});

test('a refused sign-in cannot replay a cached private digest, including a later offline start', async t => {
  const env = await setup(t); insert(env, null, 'feedback', 'cached private preference');
  await memory(env.repo, env.fake, ['digest']);
  env.fake.db.prepare('UPDATE memory_keys SET expires_at = ?').run('2000-01-01');
  const hook = () => node(env.repo, env.fake, 'session-start.mjs', [], { input: '{"session_id":"refused"}', env: { WONG_MEMORY_NO_HEADLESS: '1' } });
  const refused = await hook(); assert.match(refused.stdout, /refused/); assert.doesNotMatch(refused.stdout, /cached private preference/);
  env.fake.setOffline(true); const offline = await hook(); assert.doesNotMatch(offline.stdout, /cached private preference/);
});

test('a linked worktree ignores a branch memory URL', async t => {
  const env = await setup(t); const linked = join(tempDir(t, 'linked-'), 'checkout');
  execFileSync('git', ['worktree', 'add', '-q', '-b', 'linked', linked], { cwd: env.repo.root });
  mkdirSync(join(linked, '.claude'), { recursive: true });
  writeFileSync(join(linked, '.claude', '.wong-stack.json'), JSON.stringify({ components: { memory: { accountId: 'acct', databaseId: 'db1', worker: 'https://wrong/_memory' } } }));
  writeFileSync(join(linked, '.env'), `CLOUDFLARE_MEMORY_TOKEN=${newKey(OTHER)}\n`);
  const result = await memory({ ...env.repo, root: linked }, env.fake, ['search', 'x']); assert.equal(result.code, 0, result.stderr);
  const hook = await node({ ...env.repo, root: linked }, env.fake, 'session-start.mjs', [], { input: JSON.stringify({ cwd: linked, session_id: 'linked' }), env: { WONG_MEMORY_NO_HEADLESS: '1' } });
  assert.match(hook.stdout, /branch names another memory address/);
});

test('a shared teammate fact reveals no private transcript through source or joined session reads', async t => {
  const env = await setup(t); const key = grant(); const repo = local(t, env, OWNER, key);
  env.fake.db.prepare("INSERT INTO sessions (id, agent, author, status, raw_key, updated_at, owner_subject) VALUES ('claude:other', 'claude', ?, 'captured', 'sessions/other/raw.jsonl', 'now', ?)").run(EMAIL, OTHER);
  const sourceId = env.fake.db.prepare("INSERT INTO facts (slug, type, body, session_id, source, created_at, author, owner_subject) VALUES ('x', 'project', 'shared source', 'claude:other', 'save', 'now', ?, ?) RETURNING id").get(EMAIL, OTHER).id;
  env.fake.objects.set('sessions/other/raw.jsonl', Buffer.from('private transcript'));
  const result = await run(env, repo, key, ['source', String(sourceId)]);
  assert.equal(result.code, 0, result.stderr); assert.match(result.stdout, /only its owner and the admin/); assert.doesNotMatch(result.stdout, /private transcript/);
  const privateId = insert(env, OTHER, 'feedback', 'private fact');
  assert.match((await run(env, repo, key, ['source', String(privateId)])).stderr, /no fact/);
});

test('malformed percent-encoding in object paths returns a controlled 400', async t => {
  const env = await setup(t); const response = await handleMemory(new Request('https://prod/_memory/r2/buckets/b/objects/%zz', { headers: { Authorization: `Bearer ${token(env)}` } }), bindings(env));
  assert.equal(response.status, 400); assert.equal((await response.json()).errors[0].code, 'bad_path');
});

test('described reads keep two people apart and fail closed without a sign-in, naming the step', async t => {
  const env = await setup(t);
  insert(env, OWNER, 'feedback', 'first person private'); insert(env, OTHER, 'feedback', 'second person private'); insert(env, OTHER, 'project', 'shared delivery');
  for (const [subject, own, other] of [[OWNER, 'first person private', 'second person private'], [OTHER, 'second person private', 'first person private']]) {
    const repo = local(t, env, subject, grant(subject));
    const adapted = await node(repo, env.fake, 'operations.mjs', ['call', 'memory.search', '--file', '-'], { input: '{}', env: { COMPANY_API_ORIGIN: 'https://preview.example.com' } });
    const result = JSON.parse(adapted.stdout); assert.match(result.text, new RegExp(own)); assert.doesNotMatch(result.text, new RegExp(other)); assert.match(result.text, /shared delivery/);
    const described = await node(repo, env.fake, 'operations.mjs', ['describe', 'memory.search']); assert.doesNotMatch(described.stdout, /person private|shared delivery/);
  }
  writeFileSync(join(env.repo.root, '.env'), 'OTHER=1\n');
  const ended = local(t, env, OWNER, grant(OWNER, 'member', { exp: 1 }));
  const refused = JSON.parse((await node(ended, env.fake, 'operations.mjs', ['call', 'memory.search', '--file', '-'], { input: '{}' })).stdout);
  assert.equal(refused.error.code, 'unavailable'); assert.match(refused.error.message, /sign-in has ended.*company-api\.mjs login/);
  const otherApp = local(t, env, OWNER, grant(OWNER, 'member', { aud: 'another-app' }));
  const denied = JSON.parse((await node(otherApp, env.fake, 'operations.mjs', ['call', 'memory.search', '--file', '-'], { input: '{}' })).stdout);
  assert.equal(denied.error.code, 'unavailable'); assert.doesNotMatch(JSON.stringify(denied), /first person private|shared delivery/);
});
