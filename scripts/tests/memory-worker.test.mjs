// Exercise the real Worker, SQL guards and trusted issuance over the existing D1/R2 fixture.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { handleMemory, hashKey, newKey, MAX_TRANSCRIPT_BYTES, mayTouch } from '../../.agents/skills/memory/worker/memory-worker.mjs';
import { associateLogin, loginMarker } from '../../.agents/skills/memory/worker/login-link.mjs';
import { ADMIN_WRITES, FTS_HITS, readRefusal, shadowCtes, supersedeSql, WRITES } from '../../.agents/skills/memory/worker/statements.mjs';
import { keyMachine } from '../../.agents/skills/memory/scripts/lib/store.mjs';
import { personalFilter } from '../../.agents/skills/memory/scripts/lib/digest.mjs';
import { memory, node, setup, tempDir, writeJsonFile } from './fixtures/memory/harness.mjs';

const OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SESSION = '11111111-1111-4111-8111-111111111111';
const iso = () => new Date().toISOString();
const admin = { env: { CLOUDFLARE_API_TOKEN: 'test-memory-token-value', FAKE_GH_USER: '', FAKE_GH_TOKEN: '' } };
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
const query = (env, key, body) => handleMemory(new Request('https://app.example/_memory/accounts/a/d1/database/db1/query', {
  method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: JSON.stringify(body),
}), bindings(env));
const object = (env, key, path, method = 'GET', body, extra = {}) => handleMemory(new Request(`https://app.example/_memory/accounts/a/r2/buckets/b/objects/${encodeURIComponent(path)}`, {
  method, headers: { Authorization: `Bearer ${key}`, ...extra }, ...(method === 'PUT' ? { body } : {}),
}), bindings(env));
const fact = (owner, body, type = 'project', author = 'same@example.com') => ({ sql: WRITES.fact.sql, params: ['x', type, body, null, 'save', iso(), author, owner, 1] });
const session = (owner, id = `claude:${SESSION}`, author = 'same@example.com') => ({ sql: WRITES.session.sql,
  params: [id, 'claude', author, 'same-host', 'main', '/repo', null, null, 'skipped', 'awaiting capture', null, null, null, iso(), owner] });
async function grant(env, owner = OWNER, role = 'member') {
  const key = newKey(owner);
  env.fake.db.prepare('INSERT INTO memory_keys (hash, email, role, reader, created_at, machine_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(await hashKey(key), 'same@example.com', role === 'reader' ? 'member' : role, role === 'reader' ? 1 : 0, iso(), owner);
  return key;
}
function local(t, env, owner) {
  const home = tempDir(t, 'machine-user-');
  const dataHome = join(home, 'data');
  mkdirSync(join(dataHome, 'wongstack'), { recursive: true });
  writeFileSync(join(dataHome, 'wongstack', 'machine-id'), `${owner}\n`, { mode: 0o600 });
  return { ...env.repo, home, dataHome, machineId: owner, stateBase: join(home, 'state'), stateDir: join(home, 'state', owner) };
}
const run = (env, repo, key, args, extra = {}) => memory(repo, env.fake, args, { env: { CLOUDFLARE_MEMORY_TOKEN: key, ...extra } });
const bodies = async response => (await response.json()).result[0].results.map(row => row.body);
const insert = (env, owner, type, body, shared = 1) => env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author, owner_machine_id, shared) VALUES ('x', ?, ?, 'save', ?, 'same@example.com', ?, ?) RETURNING id").get(type, body, iso(), owner, shared).id;

for (const role of ['member', 'reader']) {
  test(`${role}: same email and hostname never expand private fact or session scope`, async t => {
    const env = await setup(t);
    const key = await grant(env, OWNER, role);
    insert(env, OWNER, 'feedback', 'own private');
    insert(env, OTHER, 'feedback', 'other private');
    insert(env, null, 'user', 'unassigned private');
    insert(env, OTHER, 'project', 'shared team fact');
    insert(env, OTHER, 'reference', 'unshared reader fact', 0);
    assert.deepEqual(await bodies(await query(env, key, { sql: 'SELECT body FROM facts ORDER BY id' })), ['own private', 'shared team fact']);
    await query(env, key, session(OWNER));
    env.fake.db.prepare("INSERT INTO sessions (id, agent, status, author, machine, updated_at) VALUES ('claude:legacy', 'claude', 'captured', 'same@example.com', 'same-host', 'now')").run();
    const rows = (await (await query(env, key, { sql: 'SELECT id FROM sessions' })).json()).result[0].results;
    assert.deepEqual(rows.map(row => row.id), [`claude:${SESSION}`]);
    assert.equal((await query(env, key, session(OWNER, 'claude:legacy'))).status, 403);
  });
  test(`${role}: author labels remain independent and another owner cannot be claimed`, async t => {
    const env = await setup(t); const key = await grant(env, OWNER, role);
    assert.equal((await query(env, key, fact(OWNER, 'own note', 'project', 'original-label'))).status, 200);
    assert.equal((await query(env, key, fact(OTHER, 'forged note'))).status, 403);
    const row = env.fake.db.prepare('SELECT author, owner_machine_id, shared FROM facts').get();
    assert.deepEqual({ ...row }, { author: 'original-label', owner_machine_id: OWNER, shared: role === 'reader' ? 0 : 1 });
  });
  test(`${role}: supersedes affect only its own owner and require its replacement in the batch`, async t => {
    const env = await setup(t); const key = await grant(env, OWNER, role);
    const own = insert(env, OWNER, 'project', 'old own'); const other = insert(env, OTHER, 'project', 'old other');
    const legacy = insert(env, null, 'project', 'legacy');
    assert.equal((await query(env, key, { sql: supersedeSql(1), params: [other] })).status, 403);
    const response = await query(env, key, { batch: [fact(OWNER, 'replacement'), { sql: supersedeSql(3), params: [own, other, legacy] }] });
    assert.equal(response.status, 200);
    assert.ok(env.fake.db.prepare('SELECT superseded_by FROM facts WHERE id = ?').get(own).superseded_by);
    for (const id of [other, legacy]) assert.equal(env.fake.db.prepare('SELECT superseded_by FROM facts WHERE id = ?').get(id).superseded_by, null);
  });
  test(`${role}: every normal read retains privacy including --everyone, search, gate and tags`, async t => {
    const env = await setup(t); const key = await grant(env, OWNER, role); const repo = local(t, env, OWNER);
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

for (const sql of [
  'SELECT body FROM main.facts', 'SELECT body FROM "main"."facts"', 'SELECT body FROM [MAIN].facts', 'SELECT body FROM main/**/.facts',
  'SELECT * FROM temp.facts', 'SELECT * FROM `facts_fts`', 'SELECT * FROM "FACTS_FTS"', 'SELECT * FROM [facts_fts_idx]', 'SELECT * FROM sqlite_dbpage', 'SELECT * FROM facts_fts', 'SELECT * FROM facts_fts_data',
  'WITH facts AS (SELECT 1) SELECT * FROM facts', 'WITH fact_tags AS (SELECT 1) SELECT * FROM fact_tags',
  'WITH sessions AS (SELECT 1) SELECT * FROM sessions', 'SELECT * FROM (WITH "Facts"(id) AS MATERIALIZED (SELECT 1) SELECT * FROM facts)',
]) test(`a machine grant refuses SQL privacy bypass: ${sql}`, async t => {
  const env = await setup(t); const key = await grant(env);
  assert.match(readRefusal(sql), /plain names|full-text fragment/);
  assert.equal((await query(env, key, { sql })).status, 403);
});

for (const sql of ['DELETE FROM facts', "UPDATE facts SET body = 'changed'", "SELECT 'UPDATE' AS hidden_write", 'PRAGMA writable_schema = ON', 'SELECT * FROM memory_keys', 'SELECT * FROM memory_admins', 'SELECT 1; DELETE FROM sessions']) {
  test(`a refused statement leaves its entire batch unchanged: ${sql}`, async t => {
    const env = await setup(t); const key = await grant(env);
    const before = env.fake.db.prepare('SELECT count(*) AS n FROM facts').get().n;
    assert.equal((await query(env, key, { batch: [fact(OWNER, 'must roll back'), { sql }] })).status, 403);
    assert.equal(env.fake.db.prepare('SELECT count(*) AS n FROM facts').get().n, before);
  });
}

test('filtered FTS, nested reads and tag counts expose only visible facts', async t => {
  const env = await setup(t); const key = await grant(env);
  const visible = insert(env, OWNER, 'feedback', 'visible deploy preference');
  insert(env, OTHER, 'feedback', 'hidden deploy preference');
  env.fake.db.exec("INSERT INTO tags (name, definition, created_at) VALUES ('deploy', 'Deploys', 'now')");
  env.fake.db.prepare('INSERT INTO fact_tags (fact_id, tag) SELECT id, ? FROM facts').run('deploy');
  const queries = [
    [`SELECT hits.rowid AS id FROM (SELECT 1 AS id) f JOIN ${FTS_HITS} hits ON 1 = 1 ORDER BY hits.rowid`, ['hidden OR visible']],
    ['SELECT id FROM (WITH x AS (SELECT * FROM facts) SELECT * FROM x)', []],
    ['WITH x AS (SELECT id FROM facts) SELECT id FROM x', []],
    ['WITH RECURSIVE x(id) AS (SELECT id FROM facts) SELECT id FROM x', []],
  ];
  for (const [sql, params] of queries) assert.deepEqual((await (await query(env, key, { sql, params })).json()).result[0].results.map(row => row.id), [visible]);
  assert.deepEqual((await (await query(env, key, { sql: 'SELECT count(*) AS n FROM fact_tags' })).json()).result[0].results, [{ n: 1 }]);
  assert.match(shadowCtes(OWNER), /sessions AS .*owner_machine_id/);
});

test('privacy remains enforced after only one active machine key remains', async t => {
  const env = await setup(t); const key = await grant(env);
  env.fake.db.prepare('UPDATE memory_keys SET expires_at = ? WHERE machine_id != ?').run('2000-01-01', OWNER);
  insert(env, OTHER, 'feedback', 'another private preference');
  const response = await query(env, key, { sql: 'SELECT body FROM facts' });
  assert.deepEqual(await bodies(response), []);
  assert.equal(response.headers.get('Wong-Memory-Team'), '1');
});

test('admin defaults to its machine and --everyone explicitly widens all private history', async t => {
  const env = await setup(t); const key = token(env);
  insert(env, env.repo.machineId, 'feedback', 'own deploy preference'); insert(env, OTHER, 'feedback', 'other deploy preference'); insert(env, null, 'feedback', 'legacy deploy preference');
  const mine = await run(env, env.repo, key, ['search', 'deploy']);
  assert.match(mine.stdout, /own deploy/); assert.doesNotMatch(mine.stdout, /other deploy|legacy deploy/);
  const everyone = await run(env, env.repo, key, ['search', 'deploy', '--everyone']);
  assert.match(everyone.stdout, /other deploy/); assert.match(everyone.stdout, /legacy deploy/);
  const filter = await personalFilter({ machineId: OWNER }, { ownerMachineId: OWNER });
  assert.deepEqual(filter.params, [OWNER]); assert.doesNotMatch(filter.clause, /author|email/);
});

test('admin retag and upkeep preserve original authors and unassigned machine ownership', async t => {
  const env = await setup(t);
  const id = insert(env, null, 'project', 'Legacy route lives in app/worker/api/.');
  const input = writeJsonFile(env.repo.home, 'retag.json', { retag: [{ id, tags: ['worker'] }], newTags: [{ name: 'worker', definition: 'Worker code.' }] });
  const result = await memory(env.repo, env.fake, ['retag', '--file', input, '--everyone']);
  assert.equal(result.code, 0, result.stderr);
  // Retag is an admin upkeep operation, independent of its digest/search defaults.
  const all = env.fake.db.prepare('SELECT author, owner_machine_id, body FROM facts ORDER BY id').all();
  assert.ok(all.length >= 2); assert.ok(all.every(row => row.author === 'same@example.com' && row.owner_machine_id === null));
  const privateId = insert(env, OTHER, 'reference', 'Reader note must stay unshared', 0);
  const privateInput = writeJsonFile(env.repo.home, 'private-retag.json', { retag: [{ id: privateId, tags: ['worker'] }] });
  assert.equal((await memory(env.repo, env.fake, ['retag', '--file', privateInput])).code, 0);
  const restated = env.fake.db.prepare('SELECT owner_machine_id, author, shared FROM facts WHERE id = (SELECT superseded_by FROM facts WHERE id = ?)').get(privateId);
  assert.deepEqual({ ...restated }, { owner_machine_id: OTHER, author: 'same@example.com', shared: 0 });
});

test('member retag and upkeep change only owned facts, keeping attribution', async t => {
  const env = await setup(t); const key = await grant(env); const repo = local(t, env, OWNER);
  const own = insert(env, OWNER, 'project', 'Own routes in app/worker/api/.'); const other = insert(env, OTHER, 'project', 'Other routes in app/worker/api/.');
  env.fake.db.exec("INSERT INTO tags (name, definition, created_at) VALUES ('worker', 'Worker code', 'now')");
  const input = writeJsonFile(repo.home, 'retag.json', { retag: [{ id: own, tags: ['worker'] }, { id: other, tags: ['worker'] }] });
  const result = await run(env, repo, key, ['retag', '--file', input]); assert.equal(result.code, 0, result.stderr);
  assert.equal(env.fake.db.prepare('SELECT superseded_by FROM facts WHERE id = ?').get(other).superseded_by, null);
  assert.equal((await run(env, repo, key, ['upkeep'])).code, 0);
});

test('only admin updates shared tags and no ordinary key can read authorization tables', async t => {
  const env = await setup(t); const key = await grant(env);
  assert.equal((await query(env, key, { sql: ADMIN_WRITES.tagUpdate.sql, params: ['new', null, 'worker'] })).status, 403);
  for (const credential of [key, token(env)]) for (const sql of ['SELECT * FROM memory_keys', 'SELECT * FROM memory_admins']) assert.equal((await query(env, credential, { sql })).status, 403);
});

test('member raw objects are isolated by machine, including historical email paths', async t => {
  const env = await setup(t); const key = await grant(env);
  assert.equal((await query(env, key, session(OWNER))).status, 200);
  const path = `sessions/${OWNER}/claude/${SESSION}.jsonl`;
  assert.equal((await object(env, key, path, 'PUT', 'own transcript')).status, 200);
  assert.equal(await (await object(env, key, path)).text(), 'own transcript');
  for (const historical of [`sessions/${OTHER}/claude/${SESSION}.jsonl`, 'sessions/same@example.com/claude/old.jsonl', 'sessions/claude/old.jsonl']) {
    env.fake.objects.set(historical, Buffer.from('legacy raw'));
    assert.equal((await object(env, key, historical)).status, 403);
    assert.equal(await (await object(env, token(env), historical)).text(), 'legacy raw');
    assert.equal((await object(env, key, historical, 'PUT', 'claim')).status, 403);
  }
  assert.equal((await object(env, key, path, 'DELETE')).status, 405);
  assert.equal((await object(env, key, `sessions/${OWNER}/claude/missing.jsonl`)).status, 404);
  assert.equal(mayTouch({ role: 'member', machine_id: OWNER }, `sessions/${OWNER}-fake/claude/a`), false);
});

test('raw uploads require a nonprivate owned ledger row before storing bytes', async t => {
  const env = await setup(t); const key = await grant(env);
  const path = `sessions/${OWNER}/claude/${SESSION}.jsonl`;
  assert.equal((await object(env, key, path, 'PUT', 'unregistered')).status, 403);
  await query(env, key, session(OWNER));
  env.fake.db.prepare("UPDATE sessions SET status = 'private' WHERE id = ?").run(`claude:${SESSION}`);
  assert.equal((await object(env, key, path, 'PUT', 'private')).status, 403);
  assert.equal((await query(env, key, session(OWNER))).status, 403);
  assert.equal(env.fake.objects.size, 0);
});

test('the bucket rejects both advertised and actual transcripts over 50 MB and accepts the exact cap', async t => {
  const env = await setup(t); const key = await grant(env); await query(env, key, session(OWNER));
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
  assert.equal((await query(env, token(env), fact(env.repo.machineId, 'facts without raw'))).status, 200);
});

test('trusted admin issuance needs no git email or GitHub and stores only hashes with no expiry', async t => {
  const env = await setup(t); execFileSync('git', ['config', 'user.email', ''], { cwd: env.repo.root });
  const result = await memory(env.repo, env.fake, ['member', 'admin'], admin);
  assert.equal(result.code, 0, result.stderr); assert.doesNotMatch(result.stdout, /wongm_|[0-9a-f]{64}/);
  const key = token(env); assert.equal(keyMachine(key), env.repo.machineId);
  const row = env.fake.db.prepare('SELECT machine_id, expires_at, login_link_hash FROM memory_keys WHERE hash = ?').get(await hashKey(key));
  assert.equal(row.machine_id, env.repo.machineId); assert.equal(row.expires_at, null); assert.equal(row.login_link_hash.length, 64);
  assert.equal(env.fake.db.prepare('SELECT count(*) AS n FROM memory_admins').get().n, 0);
  assert.ok(!JSON.stringify(env.fake.db.prepare('SELECT * FROM memory_keys').all()).includes(key));
  assert.match(result.stdout, /memory_login_link=wongl_/);
});

test('trusted issuance installs a restricted transfer file and never prints its key', async t => {
  const env = await setup(t); const dir = tempDir(t, 'transfer-'); const file = join(dir, 'member.json');
  const result = await memory(env.repo, env.fake, ['member', 'add', OWNER, '--key-file', file, '--label', 'same@example.com'], admin);
  assert.equal(result.code, 0, result.stderr); assert.doesNotMatch(result.stdout, /wongm_|[0-9a-f]{64}/);
  const transfer = JSON.parse(readFileSync(file, 'utf8')); assert.equal(keyMachine(transfer.key), OWNER);
  const repo = local(t, env, OWNER);
  const joined = await memory(repo, env.fake, ['join', '--file', file]);
  assert.equal(joined.code, 0, joined.stderr); assert.match(joined.stdout, /ordinary chats load and capture memory automatically/); assert.match(joined.stdout, /memory_login_link=wongl_/);
  assert.ok(readFileSync(join(repo.root, '.env'), 'utf8').includes(transfer.key));
  assert.doesNotMatch(joined.stdout, /wongm_/);
  const payload = writeJsonFile(repo.home, 'facts.json', { slug: 'x', facts: [{ action: 'add', type: 'project', body: 'Member contributes shared knowledge automatically.' }] });
  assert.equal((await run(env, repo, transfer.key, ['put-facts', '--file', payload])).code, 0);
  assert.equal(env.fake.db.prepare('SELECT shared FROM facts').get().shared, 1);
});

test('reader issuance installs normally but all contributed facts remain unshared', async t => {
  const env = await setup(t); const file = join(tempDir(t, 'reader-transfer-'), 'reader.json');
  assert.equal((await memory(env.repo, env.fake, ['member', 'add', OWNER, '--role', 'reader', '--key-file', file], admin)).code, 0);
  const transfer = JSON.parse(readFileSync(file, 'utf8')); const repo = local(t, env, OWNER);
  assert.equal((await memory(repo, env.fake, ['join', '--file', file])).code, 0);
  assert.equal((await query(env, transfer.key, fact(OWNER, 'reader knowledge'))).status, 200);
  assert.equal(env.fake.db.prepare('SELECT shared FROM facts').get().shared, 0);
});

for (const bad of ['arbitrary-id', 'same@example.com', OWNER]) test(`untrusted issuance cannot grant access for ${bad}`, async t => {
  const env = await setup(t); const before = env.fake.db.prepare('SELECT count(*) AS n FROM memory_keys').get().n;
  const result = await memory(env.repo, env.fake, ['member', 'add', bad, '--key-file', join(tempDir(t, 'unauthorized-'), 'key.json')], { env: { CLOUDFLARE_API_TOKEN: 'insufficient' } });
  assert.notEqual(result.code, 0); assert.doesNotMatch(result.stdout + result.stderr, /wongm_/);
  assert.equal(env.fake.db.prepare('SELECT count(*) AS n FROM memory_keys').get().n, before);
});

test('private transfer files cannot be created in a repository or overwrite an existing file', async t => {
  const env = await setup(t);
  for (const file of [join(env.repo.root, 'key.json'), join(env.repo.root, '.env')]) {
    assert.notEqual((await memory(env.repo, env.fake, ['member', 'add', OWNER, '--key-file', file], admin)).code, 0);
  }
  const file = writeJsonFile(tempDir(t, 'existing-transfer-'), 'key.json', { keep: true });
  assert.notEqual((await memory(env.repo, env.fake, ['member', 'add', OWNER, '--key-file', file], admin)).code, 0);
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { keep: true });
});

test('credential import rejects wrong local machine or repository before installing anything', async t => {
  const env = await setup(t); const before = readFileSync(join(env.repo.root, '.env'), 'utf8');
  for (const input of [{ machineId: OTHER, key: newKey(OTHER), worker: env.fake.api, databaseId: 'db1' },
    { machineId: env.repo.machineId, key: newKey(env.repo.machineId), worker: 'https://other/_memory', databaseId: 'db1' },
    { machineId: env.repo.machineId, key: newKey(env.repo.machineId), worker: env.fake.api, databaseId: 'another' }]) {
    const file = join(tempDir(t, 'bad-import-'), 'key.json'); writeFileSync(file, JSON.stringify(input), { mode: 0o600 });
    const result = await memory(env.repo, env.fake, ['join', '--file', file]); assert.equal(result.code, 1); assert.doesNotMatch(result.stderr, /wongm_/);
    assert.equal(readFileSync(join(env.repo.root, '.env'), 'utf8'), before);
  }
});

test('replacement revokes earlier keys immediately, preserves identity and leaves other machines active', async t => {
  const env = await setup(t); const old = token(env); const otherKey = await grant(env, OTHER);
  const identity = JSON.stringify({ issuer: 'https://login', subject: 'person', email: 'same@example.com', linkedAt: iso() });
  env.fake.db.prepare('UPDATE memory_keys SET login_identity = ? WHERE hash = ?').run(identity, await hashKey(old));
  const result = await memory(env.repo, env.fake, ['member', 'admin'], admin); assert.equal(result.code, 0, result.stderr);
  const replacement = token(env); assert.notEqual(replacement, old);
  assert.equal((await query(env, old, { sql: 'SELECT 1' })).status, 401); assert.equal((await query(env, otherKey, { sql: 'SELECT 1' })).status, 200);
  assert.equal(env.fake.db.prepare('SELECT login_identity FROM memory_keys WHERE hash = ?').get(await hashKey(replacement)).login_identity, identity);
  assert.equal(env.fake.db.prepare('SELECT login_link_hash FROM memory_keys WHERE hash = ?').get(await hashKey(old)).login_link_hash, null);
});

test('listing exposes IDs, roles, revocation and verified identity, never secrets or markers', async t => {
  const env = await setup(t); const key = await grant(env, OWNER, 'reader');
  env.fake.db.prepare('UPDATE memory_keys SET login_identity = ? WHERE hash = ?').run(JSON.stringify({ issuer: 'https://login', subject: 'verified-person' }), await hashKey(key));
  const result = await memory(env.repo, env.fake, ['member', 'list'], admin);
  assert.equal(result.code, 0, result.stderr); assert.match(result.stdout, /reader/); assert.match(result.stdout, /verified-person/);
  assert.doesNotMatch(result.stdout, /wongm_|wongl_|[0-9a-f]{64}/);
});

test('removal revokes every machine key and pending marker while retaining association metadata', async t => {
  const env = await setup(t); const a = await grant(env); const b = await grant(env);
  env.fake.db.prepare('UPDATE memory_keys SET login_identity = ? WHERE machine_id = ?').run('{"subject":"kept"}', OWNER);
  env.fake.db.prepare('UPDATE memory_keys SET login_link_hash = ? WHERE hash = ?').run('old-marker', await hashKey(a));
  // Unique markers are per key; retain label on both rows but only one pending marker.
  const result = await memory(env.repo, env.fake, ['member', 'remove', OWNER], admin);
  assert.equal(result.code, 0, result.stderr);
  for (const key of [a, b]) assert.equal((await query(env, key, { sql: 'SELECT 1' })).status, 401);
  assert.ok(env.fake.db.prepare('SELECT login_identity, login_link_hash FROM memory_keys WHERE machine_id = ?').all(OWNER).every(row => row.login_identity && !row.login_link_hash));
});

test('malformed and legacy keys never fall back to Cloudflare API authority', async t => {
  const env = await setup(t);
  for (const key of ['cloudflare-token', 'wongm_YUBiLmNv.nope', `wongm_${Buffer.from('same@example.com').toString('base64url')}.${'q'.repeat(43)}`]) {
    const before = env.fake.calls.length;
    const result = await run(env, env.repo, key, ['search', 'x']); assert.equal(result.code, 1); assert.match(result.stderr, /legacy memory key/);
    assert.equal(env.fake.calls.length, before);
  }
});

test('unknown or cross-repository credentials run nothing and legacy grants need replacement', async t => {
  const env = await setup(t); const unknown = newKey(OWNER);
  assert.equal((await query(env, unknown, { sql: 'SELECT 1' })).status, 401);
  const legacy = 'legacy-bearer'; env.fake.db.prepare('INSERT INTO memory_keys (hash, email, role, created_at) VALUES (?, ?, ?, ?)').run(await hashKey(legacy), 'same@example.com', 'member', 'now');
  const response = await query(env, legacy, { sql: 'SELECT 1' }); assert.equal(response.status, 401); assert.equal((await response.json()).errors[0].code, 'legacy_key');
});

test('missing ownership schema fails clearly without email fallback', async t => {
  const env = await setup(t);
  const oldDb = { prepare: () => ({ bind: () => ({ first: async () => { throw new Error('no such column: machine_id'); } }) }) };
  const response = await handleMemory(new Request('https://prod/_memory/caller', { headers: { Authorization: `Bearer ${token(env)}` } }), { MEMORY_DB: oldDb });
  assert.equal(response.status, 503); assert.equal((await response.json()).errors[0].code, 'not_migrated');
});

test('anonymous GitHub enrollment is absent even with a supplied token and machine ID', async t => {
  const env = await setup(t);
  const before = env.fake.db.prepare('SELECT count(*) AS n FROM memory_keys').get().n;
  const response = await handleMemory(new Request('https://prod/_memory/join', { method: 'POST', body: JSON.stringify({ token: 'github-token', machine: OWNER }) }), bindings(env));
  assert.equal(response.status, 404); assert.equal(env.fake.db.prepare('SELECT count(*) AS n FROM memory_keys').get().n, before);
});

test('migrations use provisioning authority without GitHub auto-linking and remain repeatable', async t => {
  const env = await setup(t); const result = await memory(env.repo, env.fake, ['migrate'], admin);
  assert.equal(result.code, 0, result.stderr); assert.match(result.stdout, /up to date/);
  assert.equal(env.fake.db.prepare('SELECT count(*) AS n FROM memory_admins').get().n, 0);
});

test('the public route retains Cloudflare batch shape and meaningful errors', async t => {
  const env = await setup(t); const response = await query(env, token(env), { batch: [{ sql: 'SELECT ? AS n', params: [7] }, { sql: 'SELECT 2 AS m' }] });
  assert.deepEqual((await response.json()).result.map(row => row.results), [[{ n: 7 }], [{ m: 2 }]]);
  assert.equal((await query(env, token(env), {})).status, 400);
  assert.equal((await query(env, token(env), { sql: 'SELECT nope FROM nowhere' })).status, 400);
});

test('members cannot overwrite another machine or unassigned session, even with matching authors', async t => {
  const env = await setup(t); const key = await grant(env);
  for (const owner of [OTHER, null]) {
    const id = `claude:${randomUUID()}`;
    env.fake.db.prepare("INSERT INTO sessions (id, agent, author, status, updated_at, owner_machine_id) VALUES (?, 'claude', 'same@example.com', 'captured', 'now', ?)").run(id, owner);
    assert.equal((await query(env, key, { batch: [session(OWNER, id), fact(OWNER, 'no partial write')] })).status, 403);
  }
  assert.equal(env.fake.db.prepare('SELECT count(*) AS n FROM facts').get().n, 0);
});

test('the hook reports missing credentials and never starts GitHub auto-enrollment', async t => {
  const env = await setup(t); writeFileSync(join(env.repo.root, '.env'), 'OTHER=1\n');
  const result = await node(env.repo, env.fake, 'session-start.mjs', [], { input: JSON.stringify({ session_id: 'missing' }), env: { WONG_MEMORY_NO_HEADLESS: '1' } });
  assert.equal(result.code, 0); assert.match(result.stdout, /join --file/); assert.doesNotMatch(result.stdout, /GitHub|setting up|renew/);
});

test('an authorization refusal cannot replay a cached private digest, including a later offline start', async t => {
  const env = await setup(t); insert(env, env.repo.machineId, 'feedback', 'cached private preference');
  await memory(env.repo, env.fake, ['digest']);
  env.fake.db.prepare('UPDATE memory_keys SET expires_at = ?').run('2000-01-01');
  const hook = () => node(env.repo, env.fake, 'session-start.mjs', [], { input: '{"session_id":"refused"}', env: { WONG_MEMORY_NO_HEADLESS: '1' } });
  const refused = await hook(); assert.match(refused.stdout, /rejected/); assert.doesNotMatch(refused.stdout, /cached private preference/);
  env.fake.setOffline(true); const offline = await hook(); assert.doesNotMatch(offline.stdout, /cached private preference/);
});

test('a linked worktree ignores a branch memory URL and uses the same machine identity', async t => {
  const env = await setup(t); const linked = join(tempDir(t, 'linked-'), 'checkout');
  execFileSync('git', ['worktree', 'add', '-q', '-b', 'linked', linked], { cwd: env.repo.root });
  mkdirSync(join(linked, '.claude'), { recursive: true });
  writeFileSync(join(linked, '.claude', '.wong-stack.json'), JSON.stringify({ components: { memory: { accountId: 'acct', databaseId: 'db1', worker: 'https://wrong/_memory' } } }));
  writeFileSync(join(linked, '.env'), `CLOUDFLARE_MEMORY_TOKEN=${newKey(OTHER)}\n`);
  const result = await memory({ ...env.repo, root: linked }, env.fake, ['search', 'x']); assert.equal(result.code, 0, result.stderr);
  const hook = await node({ ...env.repo, root: linked }, env.fake, 'session-start.mjs', [], { input: JSON.stringify({ cwd: linked, session_id: 'linked' }), env: { WONG_MEMORY_NO_HEADLESS: '1' } });
  assert.match(hook.stdout, /branch names another memory address/);
});

async function marker(env, key = token(env)) {
  const response = await handleMemory(new Request('https://prod.example/_memory/login-link', { method: 'POST', headers: { Authorization: `Bearer ${key}` } }), bindings(env));
  assert.equal(response.status, 200); const data = await response.json();
  const url = new URL(data.result.url); assert.equal(url.origin, 'https://prod.example');
  return url.searchParams.get('memory_login_link');
}
const human = (subject = 'verified-person', email = 'person@example.com') => ({ kind: 'user', claims: { iss: 'https://login.example', sub: subject, email } });

test('ordinary login association identifies existing machine notes without changing author, owner or role', async t => {
  const env = await setup(t); const id = insert(env, env.repo.machineId, 'feedback', 'note predates login');
  const before = { ...env.fake.db.prepare('SELECT * FROM facts WHERE id = ?').get(id) };
  const link = await marker(env); const db = bindings(env).MEMORY_DB;
  assert.equal(await associateLogin(db, link, human()), true);
  assert.deepEqual({ ...env.fake.db.prepare('SELECT * FROM facts WHERE id = ?').get(id) }, before);
  const row = env.fake.db.prepare('SELECT login_identity, role, login_link_hash FROM memory_keys WHERE hash = ?').get(await hashKey(token(env)));
  assert.equal(JSON.parse(row.login_identity).subject, 'verified-person'); assert.equal(row.role, 'admin'); assert.equal(row.login_link_hash, null);
  assert.equal((await query(env, token(env), { sql: 'SELECT 1' })).status, 200);
});

test('markers cannot authorize memory and the current-caller response contains sanitized metadata only', async t => {
  const env = await setup(t); const link = await marker(env);
  assert.equal((await query(env, link, { sql: 'SELECT * FROM facts' })).status, 401);
  await associateLogin(bindings(env).MEMORY_DB, link, human());
  const response = await handleMemory(new Request('https://prod/_memory/caller', { headers: { Authorization: `Bearer ${token(env)}` } }), bindings(env));
  const text = await response.text(); assert.match(text, /verified-person/); assert.doesNotMatch(text, /login_link_hash|wongl_|wongm_|"hash"/);
});

for (const kind of ['expired', 'revoked', 'invalid', 'service', 'anonymous', 'missing-subject']) test(`login association refuses ${kind} without changing memory`, async t => {
  const env = await setup(t); let link = await marker(env); let identity = human();
  if (kind === 'expired') env.fake.db.exec("UPDATE memory_keys SET login_link_expires_at = '2000-01-01'");
  if (kind === 'revoked') env.fake.db.exec("UPDATE memory_keys SET expires_at = '2000-01-01'");
  if (kind === 'invalid') link = loginMarker();
  if (kind === 'service') identity = { kind: 'service', claims: { iss: 'https://login.example', sub: '', common_name: 'service' } };
  if (kind === 'anonymous') identity = null;
  if (kind === 'missing-subject') identity = { kind: 'user', claims: { iss: 'https://login.example', email: 'person@example.com' } };
  assert.equal(await associateLogin(bindings(env).MEMORY_DB, link, identity), false);
  assert.equal(env.fake.db.prepare('SELECT login_identity FROM memory_keys').get().login_identity, null);
});

test('one-use login completion is atomic across concurrent returns and replay', async t => {
  const env = await setup(t); const link = await marker(env); const db = bindings(env).MEMORY_DB;
  const results = await Promise.all([associateLogin(db, link, human()), associateLogin(db, link, human())]);
  assert.deepEqual(results.sort(), [false, true]); assert.equal(await associateLogin(db, link, human()), false);
});

test('a changed email retains the verified subject while another person cannot replace it', async t => {
  const env = await setup(t); const db = bindings(env).MEMORY_DB;
  assert.equal(await associateLogin(db, await marker(env), human()), true);
  assert.equal(await associateLogin(db, await marker(env), human('verified-person', 'changed@example.com')), true);
  assert.equal(await associateLogin(db, await marker(env), human('another-person')), false);
  const saved = JSON.parse(env.fake.db.prepare('SELECT login_identity FROM memory_keys').get().login_identity);
  assert.equal(saved.subject, 'verified-person'); assert.equal(saved.email, 'changed@example.com');
});

test('matching login identities on two machines never merge their private memory', async t => {
  const env = await setup(t); const otherKey = await grant(env, OTHER); const db = bindings(env).MEMORY_DB;
  assert.equal(await associateLogin(db, await marker(env), human()), true);
  assert.equal(await associateLogin(db, await marker(env, otherKey), human()), true);
  insert(env, env.repo.machineId, 'feedback', 'first machine preference'); insert(env, OTHER, 'feedback', 'second machine preference');
  assert.deepEqual(await bodies(await query(env, otherKey, { sql: 'SELECT body FROM facts' })), ['second machine preference']);
});


test('a shared teammate fact reveals no private transcript through source or joined session reads', async t => {
  const env = await setup(t); const key = await grant(env); const repo = local(t, env, OWNER);
  env.fake.db.prepare("INSERT INTO sessions (id, agent, author, status, raw_key, updated_at, owner_machine_id) VALUES ('claude:other', 'claude', 'same@example.com', 'captured', 'sessions/other/raw.jsonl', 'now', ?)").run(OTHER);
  const id = insert(env, OTHER, 'project', 'shared fact about deploy');
  // Fact origins are immutable; seed the source as an authored historical write.
  const sourceId = env.fake.db.prepare("INSERT INTO facts (slug, type, body, session_id, source, created_at, author, owner_machine_id) VALUES ('x', 'project', 'shared source', 'claude:other', 'save', 'now', 'same@example.com', ?) RETURNING id").get(OTHER).id;
  env.fake.objects.set('sessions/other/raw.jsonl', Buffer.from('private transcript'));
  const result = await run(env, repo, key, ['source', String(sourceId)]);
  assert.equal(result.code, 0, result.stderr); assert.match(result.stdout, /only the owning machine and the admin/); assert.doesNotMatch(result.stdout, /private transcript/);
  const privateId = insert(env, OTHER, 'feedback', 'private fact');
  assert.match((await run(env, repo, key, ['source', String(privateId)])).stderr, /no fact/);
  assert.ok(id);
});

test('malformed percent-encoding in object paths returns a controlled 400', async t => {
  const env = await setup(t); const response = await handleMemory(new Request('https://prod/_memory/r2/buckets/b/objects/%zz', { headers: { Authorization: `Bearer ${token(env)}` } }), bindings(env));
  assert.equal(response.status, 400); assert.equal((await response.json()).errors[0].code, 'bad_path');
});

test('described reads keep two matching human labels separate and fail closed after memory revocation', async t => {
  const env = await setup(t); const keyA = await grant(env, OWNER), keyB = await grant(env, OTHER);
  const sameLogin = JSON.stringify({ issuer: 'https://login.example.com', subject: 'same-person', email: 'same@example.com' });
  env.fake.db.prepare('UPDATE memory_keys SET login_identity = ?').run(sameLogin);
  insert(env, OWNER, 'feedback', 'first machine private'); insert(env, OTHER, 'feedback', 'second machine private'); insert(env, OTHER, 'project', 'shared delivery');
  for (const [owner, key, own, other] of [[OWNER, keyA, 'first machine private', 'second machine private'], [OTHER, keyB, 'second machine private', 'first machine private']]) {
    const repo = local(t, env, owner);
    const adapted = await node(repo, env.fake, 'operations.mjs', ['call', 'memory.search', '--file', '-'],
      { input: '{}', env: { CLOUDFLARE_MEMORY_TOKEN: key, COMPANY_API_ORIGIN: 'https://preview.example.com' } });
    const result = JSON.parse(adapted.stdout); assert.match(result.text, new RegExp(own)); assert.doesNotMatch(result.text, new RegExp(other)); assert.match(result.text, /shared delivery/);
    const described = await node(repo, env.fake, 'operations.mjs', ['describe', 'memory.search']); assert.doesNotMatch(described.stdout, /machine private|shared delivery/);
  }
  env.fake.db.prepare("UPDATE memory_keys SET expires_at = '2000-01-01' WHERE hash = ?").run(await hashKey(keyA));
  const refused = await node(local(t, env, OWNER), env.fake, 'operations.mjs', ['call', 'memory.search', '--file', '-'], { input: '{}', env: { CLOUDFLARE_MEMORY_TOKEN: keyA } });
  assert.equal(JSON.parse(refused.stdout).error.code, 'unavailable'); assert.doesNotMatch(refused.stdout, /first machine private|shared delivery/);
});
