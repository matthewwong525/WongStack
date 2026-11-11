// The app's memory route, the D1 store's visibility rules and the company sign-in's roles, over the D1/R2 fixture.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { d1Store, handleMemory, hashKey, newKey } from '../../.agents/memory/d1/store.mjs';
import { keyMachine } from '../../.agents/memory/d1/connect.mjs';
import { MAX_TRANSCRIPT_BYTES } from '../../.agents/plugins/memory/store/interface.mjs';
import { d1Binding, fakeSignIn, memory, node, setup, signInAs, tempDir, TEST_AUD, testToken, writeJsonFile } from './fixtures/memory/harness.mjs';

const OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SESSION = '11111111-1111-4111-8111-111111111111';
const EMAIL = 'same@example.com';
// operations.mjs sits in WongStack's extras, beside the plugin the harness runs scripts from.
const OPERATIONS = '../../../memory/operations.mjs';
const iso = () => new Date().toISOString();
const admin = { env: { CLOUDFLARE_API_TOKEN: 'test-memory-token-value' } };
const token = env => readFileSync(join(env.repo.root, '.env'), 'utf8').match(/^CLOUDFLARE_MEMORY_TOKEN=(\S+)/m)[1];
const bucket = env => ({ get: async key => env.fake.objects.has(key) ? { body: env.fake.objects.get(key) } : null,
  put: async (key, value) => env.fake.objects.set(key, Buffer.from(value)) });
const bindings = env => ({ MEMORY_DB: d1Binding(env.fake.db), MEMORY_BUCKET: bucket(env) });
// A sign-in token goes in cf-access-token, an old key as a Bearer, a schedule's as its two headers.
const credential = key => !key ? {} : typeof key === 'object' ? { 'CF-Access-Client-Id': key.id, 'CF-Access-Client-Secret': key.secret }
  : key.startsWith('wongm_') ? { Authorization: `Bearer ${key}` } : { 'cf-access-token': key };
// One operation as the plugin's client sends it: JSON, or a transcript's bytes with its arguments in the query.
function call(env, key, op, args = {}, { bytes, extra = bindings(env), headers = {} } = {}) {
  const query = bytes ? `?args=${encodeURIComponent(JSON.stringify(args))}` : '';
  return handleMemory(new Request(`https://app.example/_memory/v2/${op}${query}`, { method: 'POST', body: bytes ?? JSON.stringify(args), headers: { ...credential(key), ...headers } }), extra, fakeSignIn);
}
const result = async response => (await response.json()).result;
const bodies = async (env, key, q = {}) => (await result(await call(env, key, 'facts', [q])))[0].map(fact => fact.body).sort();
const sessionArgs = (id = `claude:${SESSION}`) => ({ id, agent: 'claude', host: 'same-host', branch: 'main', cwd: '/repo', startedAt: null, endedAt: null, status: 'skipped', reason: 'awaiting capture', readThrough: null, rawBytes: null });
const note = (body, extra = {}) => ({ source: 'save', slug: 'x', facts: [{ type: 'project', body }], ...extra });
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
const insert = (env, owner, type, body, shared = 1, session = null) => env.fake.db.prepare("INSERT INTO facts (slug, type, body, session_id, source, created_at, author, owner_subject, shared) VALUES ('x', ?, ?, ?, 'save', ?, ?, ?, ?) RETURNING id").get(type, body, session, iso(), EMAIL, owner, shared).id;
const count = (env, table = 'facts') => env.fake.db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n;
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
    assert.deepEqual(await bodies(env, key), ['own private', 'shared team fact']);
    assert.deepEqual(await bodies(env, key, { everyone: true }), ['own private', 'shared team fact'], 'only the admin widens to everyone');
    assert.equal((await call(env, key, 'putSession', sessionArgs())).status, 200);
    env.fake.db.prepare("INSERT INTO sessions (id, agent, status, author, machine, updated_at) VALUES ('claude:legacy', 'claude', 'captured', ?, 'same-host', 'now')").run(EMAIL);
    assert.equal((await result(await call(env, key, 'session', { id: `claude:${SESSION}` }))).id, `claude:${SESSION}`);
    assert.equal(await result(await call(env, key, 'session', { id: 'claude:legacy' })), null);
    assert.equal((await call(env, key, 'putSession', sessionArgs('claude:legacy'))).status, 403);
  });
  test(`${role}: the store sets author, owner and sharing from the sign-in, and a source names only its own session`, async t => {
    const env = await setup(t); const key = grant(OWNER, role);
    const own = `claude:${SESSION}`;
    const sent = await call(env, key, 'write', note('own note', { session: sessionArgs(own), facts: [{ type: 'project', body: 'own note', sources: [`session:${own}`] }] }));
    assert.equal(sent.status, 200);
    assert.equal((await call(env, key, 'write', note('forged', { session: sessionArgs(own), facts: [{ type: 'project', body: 'forged', sources: ['session:claude:other'] }] }))).status, 403);
    const row = env.fake.db.prepare('SELECT author, owner_subject, shared, session_id FROM facts').get();
    assert.deepEqual({ ...row }, { author: EMAIL, owner_subject: OWNER, shared: role === 'reader' ? 0 : 1, session_id: own });
    const [[read]] = await result(await call(env, key, 'facts', [{}]));
    assert.deepEqual(read.sources, [`session:${own}`]);
  });
  test(`${role}: supersedes affect only its own facts`, async t => {
    const env = await setup(t); const key = grant(OWNER, role);
    const own = insert(env, OWNER, 'project', 'old own'); const other = insert(env, OTHER, 'project', 'old other');
    const legacy = insert(env, null, 'project', 'legacy');
    const response = await call(env, key, 'write', { source: 'save', slug: 'x', facts: [{ type: 'project', body: 'replacement', supersedes: [own, other, legacy] }] });
    assert.equal(response.status, 200);
    const { superseded, left } = await result(response);
    assert.deepEqual(superseded, [{ asked: [own, other, legacy], marked: [own] }]);
    assert.deepEqual(left.map(row => row.id), [other, legacy]);
    for (const id of [other, legacy]) assert.equal(env.fake.db.prepare('SELECT superseded_by FROM facts WHERE id = ?').get(id).superseded_by, null);
    assert.equal((await call(env, key, 'write', { source: 'consolidation', facts: [{ restate: other, tags: ['x'] }] })).status, 403);
    assert.equal((await call(env, key, 'write', { source: 'consolidation', facts: [{ close: other, body: 'closed' }] })).status, 403);
  });
  test(`${role}: every normal read keeps privacy including --everyone, search, gate and tags`, async t => {
    const env = await setup(t); const key = grant(OWNER, role); const repo = local(t, env, OWNER, key);
    insert(env, OWNER, 'feedback', 'visible deploy preference'); insert(env, OTHER, 'feedback', 'hidden deploy preference');
    insert(env, OTHER, 'project', 'visible deploy schedule'); insert(env, OTHER, 'project', 'hidden deploy reader note', 0);
    env.fake.db.exec("INSERT INTO tags (name, definition, created_at) VALUES ('deploy', 'Deploys', 'now')");
    env.fake.db.prepare('INSERT INTO fact_tags (fact_id, tag) SELECT id, ? FROM facts').run('deploy');
    const input = writeJsonFile(repo.home, 'gate.json', { slug: 'x', facts: [{ type: 'project', body: 'Deploy preferences and schedules.' }] });
    for (const args of [['search', 'deploy'], ['search', 'deploy', '--everyone'], ['search', 'deploy', '--all'], ['search', '--tag', 'deploy', '--all', '--everyone'], ['search', '--author', 'same', '--everyone'], ['show', 'x', '--everyone'], ['live', '--everyone'], ['digest'], ['gate', '--file', input], ['tags'], ['areas', 'app/worker/index.ts']]) {
      const out = await run(env, repo, key, args); assert.equal(out.code, 0, out.stderr); assert.doesNotMatch(out.stdout, /hidden deploy/);
    }
  });
}

test('the person owns private memory across computers and an email change, never by a matching email', async t => {
  const env = await setup(t);
  insert(env, OWNER, 'feedback', 'person preference'); insert(env, OTHER, 'feedback', 'same email, other person');
  for (const key of [grant(OWNER), grant(OWNER, 'member', { email: 'changed@example.com' })]) {
    const repo = local(t, env, OWNER, key);
    const out = await run(env, repo, key, ['search', 'preference', '--everyone']);
    assert.equal(out.code, 0, out.stderr); assert.match(out.stdout, /person preference/); assert.doesNotMatch(out.stdout, /other person/);
  }
});

test('a sign-in for another app, an expired one, or none at all reaches nothing', async t => {
  const env = await setup(t); insert(env, null, 'project', 'shared');
  for (const key of [grant(OWNER, 'member', { aud: 'another-app' }), grant(OWNER, 'admin', { exp: 1 }), 'not-a-token', null]) {
    const response = await call(env, key, 'facts', [{}]);
    assert.equal(response.status, 401); assert.match((await response.json()).error, /sign in to the company app again/);
  }
});

test('a signed-in admin reads everything only with everyone; rows with no owner are admin-only', async t => {
  const env = await setup(t); const key = grant('owner-subject', 'admin');
  insert(env, null, 'user', 'unassigned private'); insert(env, null, 'reference', 'unassigned unshared', 0); insert(env, OTHER, 'feedback', 'other private');
  assert.equal((await bodies(env, key, { everyone: true })).length, 3);
  assert.deepEqual(await bodies(env, key), []);
  for (const role of ['member', 'reader']) assert.deepEqual(await bodies(env, grant(OWNER, role), { everyone: true }), []);
  assert.deepEqual(await result(await call(env, key, 'caller')), { role: 'admin', subject: 'owner-subject', email: EMAIL });
});

test('a schedule sign-in reads and writes team facts only, never a person or a chat, until revoked', async t => {
  const env = await setup(t); const team = await schedule(env);
  insert(env, OWNER, 'feedback', 'private preference'); insert(env, null, 'user', 'unassigned private'); insert(env, OTHER, 'project', 'shared decision');
  insert(env, OTHER, 'reference', 'reader note', 0);
  const read = await call(env, team, 'facts', [{ everyone: true }]);
  assert.deepEqual((await result(read))[0].map(fact => fact.body), ['shared decision']); assert.equal(read.headers.get('Wong-Memory-Role'), 'team');
  assert.equal((await call(env, team, 'write', note('nightly report sent'))).status, 200);
  assert.deepEqual({ ...env.fake.db.prepare("SELECT owner_subject, shared FROM facts WHERE body = 'nightly report sent'").get() }, { owner_subject: null, shared: 1 });
  assert.equal((await call(env, team, 'putSession', sessionArgs())).status, 403);
  assert.equal((await call(env, team, 'write', note('with a chat', { session: sessionArgs() }))).status, 403);
  assert.equal((await call(env, team, 'putTranscript', { sessionId: `claude:${SESSION}`, agent: 'claude' }, { bytes: Buffer.from('x') })).status, 403);
  assert.equal((await call(env, team, 'defineTag', { name: 'x', definition: 'X.' })).status, 403);
  assert.equal((await call(env, { ...team, secret: 'wrong' }, 'caller')).status, 401);
  env.fake.db.prepare('UPDATE memory_schedules SET revoked_at = ?').run(iso());
  assert.equal((await call(env, team, 'caller')).status, 401);
});

test('no caller sends SQL: the old query and object routes, and any unknown operation, answer 404', async t => {
  const env = await setup(t);
  for (const key of [grant(), token(env), grant('owner-subject', 'admin')]) {
    for (const op of ['query', 'accounts/a/d1/database/db1/query', `accounts/a/r2/buckets/b/objects/${encodeURIComponent(`sessions/${OTHER}/claude/${SESSION}.jsonl`)}`]) {
      assert.equal((await call(env, key, op, { sql: 'SELECT * FROM memory_keys' })).status, 404, op);
    }
  }
  const outside = await handleMemory(new Request('https://app.example/_memory/caller', { method: 'POST', body: '{}', headers: credential(token(env)) }), bindings(env), fakeSignIn);
  assert.equal(outside.status, 404);
});

test('search terms can not reach a teammate\'s private note, whatever their full-text syntax', async t => {
  const env = await setup(t);
  const shared = insert(env, OTHER, 'project', 'shared deploy checklist');
  const hidden = insert(env, OTHER, 'user', 'confidential deploy salary for chase');
  for (const role of ['member', 'reader']) {
    for (const terms of ['salary', 'confidential', 'conf*', 'chase', 'deploy', '"salary" OR "deploy"', 'NEAR(salary chase)']) {
      const response = await call(env, grant(OWNER, role), 'facts', [{ terms }]);
      assert.equal(response.status, 200, terms);
      const found = (await result(response))[0].map(fact => fact.id);
      assert.ok(!found.includes(hidden), `${role} found the hidden fact by ${terms}`);
    }
    assert.deepEqual((await result(await call(env, grant(OWNER, role), 'facts', [{ terms: 'deploy' }])))[0].map(fact => fact.id), [shared]);
  }
});

test('a refused write leaves its entire batch unchanged', async t => {
  const env = await setup(t); const key = grant();
  const other = insert(env, OTHER, 'project', 'teammate decision');
  const before = count(env);
  for (const facts of [
    [{ type: 'project', body: 'must roll back' }, { type: 'project', body: 'forged', sources: ['session:claude:other'] }],
    [{ type: 'project', body: 'must roll back' }, { restate: other, tags: ['x'] }],
  ]) assert.equal((await call(env, key, 'write', { source: 'save', slug: 'x', facts })).status, 403);
  assert.equal((await call(env, key, 'write', { source: 'bogus', slug: 'x', facts: [{ type: 'project', body: 'bad source' }] })).status, 400);
  assert.equal(count(env), before);
});

test('tag filters and tag counts expose only visible facts; only the admin defines a tag', async t => {
  const env = await setup(t); const key = grant();
  const visible = insert(env, OWNER, 'feedback', 'visible deploy preference');
  insert(env, OTHER, 'feedback', 'hidden deploy preference');
  env.fake.db.exec("INSERT INTO tags (name, definition, created_at) VALUES ('deploy', 'Deploys', 'now')");
  env.fake.db.prepare('INSERT INTO fact_tags (fact_id, tag) SELECT id, ? FROM facts').run('deploy');
  for (const q of [{ terms: 'hidden visible' }, { tags: ['deploy'] }, { tags: ['deploy'], everyone: true }]) {
    assert.deepEqual((await result(await call(env, key, 'facts', [q])))[0].map(fact => fact.id), [visible]);
  }
  assert.equal((await result(await call(env, key, 'tags'))).find(tag => tag.name === 'deploy').uses, 1);
  assert.equal((await call(env, key, 'defineTag', { name: 'deploy', definition: 'Changed.' })).status, 403);
  assert.equal((await call(env, grant('owner-subject', 'admin'), 'defineTag', { name: 'deploy', definition: 'Changed.' })).status, 200);
});

test('a search runs its full-text match once, not once per stored fact', async t => {
  const env = await setup(t);
  const words = ['preview', 'deploy', 'cache', 'cold', 'worker', 'memory', 'search', 'branch'];
  for (let i = 0; i < 200; i++) insert(env, OWNER, 'project', `Fact ${i}: ${words[i % 8]} ${words[(i * 3) % 8]}.`);
  // The store's own statement, recorded on its way to the database, so the plan is the one it runs.
  const seen = [], binding = d1Binding(env.fake.db);
  const recording = { ...binding, prepare: sql => ({ ...binding.prepare(sql), bind: (...params) => { seen.push([sql, params]); return binding.prepare(sql).bind(...params); } }) };
  const store = d1Store(recording, null, { role: 'member', subject: OWNER, email: EMAIL });
  for (const q of [{ terms: 'cold preview memory', notSlug: 'y', limit: 5 }, { terms: 'cold preview memory', limit: 30 }]) {
    seen.length = 0;
    const [found] = await store.facts([q]);
    assert.ok(found.length > 0);
    const [sql, params] = seen[0];
    const plan = env.fake.db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...params).map(row => String(row.detail));
    // facts_fts leads on its MATCH alone; an `=` after the colon is a rowid lookup that re-runs the MATCH per fact.
    assert.match(plan[0], /^SCAN facts_fts VIRTUAL TABLE INDEX \d+:M/, plan.join(' | '));
  }
});

test('an old admin key opens memory with no person; an old member key needs the sign-in', async t => {
  const env = await setup(t);
  const member = newKey(OWNER);
  env.fake.db.prepare('INSERT INTO memory_keys (hash, email, role, created_at, machine_id) VALUES (?, ?, ?, ?, ?)').run(await hashKey(member), EMAIL, 'member', iso(), OWNER);
  assert.equal((await call(env, member, 'caller')).status, 401);
  assert.deepEqual(await result(await call(env, token(env), 'caller')), { role: 'admin', subject: null, email: 'dev@example.com' });
  assert.equal((await call(env, newKey(OWNER), 'caller')).status, 401);
  insert(env, null, 'user', 'unassigned private'); insert(env, OTHER, 'user', 'teammate private');
  assert.deepEqual(await bodies(env, token(env)), ['unassigned private'], 'an old admin key owns the unassigned rows');
  assert.deepEqual(await bodies(env, token(env), { everyone: true }), ['teammate private', 'unassigned private']);
});

test('the admin defaults to its own private facts and --everyone widens to all', async t => {
  const env = await setup(t); const key = grant('owner-subject', 'admin'); const repo = local(t, env, 'owner-subject', key);
  insert(env, 'owner-subject', 'feedback', 'own deploy preference'); insert(env, OTHER, 'feedback', 'other deploy preference'); insert(env, null, 'feedback', 'legacy deploy preference');
  const mine = await run(env, repo, key, ['search', 'deploy']);
  assert.match(mine.stdout, /own deploy/); assert.doesNotMatch(mine.stdout, /other deploy|legacy deploy/);
  const everyone = await run(env, repo, key, ['search', 'deploy', '--everyone']);
  assert.match(everyone.stdout, /other deploy/); assert.match(everyone.stdout, /legacy deploy/);
});

test('admin retag and upkeep keep original authors and unassigned ownership', async t => {
  const env = await setup(t);
  const id = insert(env, null, 'project', 'Legacy route lives in app/worker/api/.');
  const input = writeJsonFile(env.repo.home, 'retag.json', { retag: [{ id, tags: ['worker'] }], newTags: [{ name: 'worker', definition: 'Worker code.' }] });
  const out = await memory(env.repo, env.fake, ['retag', '--file', input, '--everyone']);
  assert.equal(out.code, 0, out.stderr);
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
  const out = await run(env, repo, key, ['retag', '--file', input]); assert.equal(out.code, 0, out.stderr);
  assert.equal(env.fake.db.prepare('SELECT superseded_by FROM facts WHERE id = ?').get(other).superseded_by, null);
  assert.equal((await run(env, repo, key, ['upkeep'])).code, 0);
});

test('a transcript is kept under its owner and read only by them or the admin', async t => {
  const env = await setup(t); const key = grant();
  const own = `claude:${SESSION}`;
  const written = await result(await call(env, key, 'write', note('from my chat', { session: sessionArgs(own), facts: [{ type: 'project', body: 'from my chat' }] })));
  const kept = await result(await call(env, key, 'putTranscript', { sessionId: own, agent: 'claude' }, { bytes: Buffer.from('own transcript') }));
  assert.deepEqual(kept, { key: `sessions/${OWNER}/claude/${SESSION}.jsonl` });
  assert.equal(await (await call(env, key, 'transcript', { factId: written.ids[0] })).text(), 'own transcript');
  const theirs = `claude:${randomUUID()}`;
  env.fake.db.prepare("INSERT INTO sessions (id, agent, author, status, raw_key, updated_at, owner_subject) VALUES (?, 'claude', ?, 'captured', 'sessions/other/raw.jsonl', 'now', ?)").run(theirs, EMAIL, OTHER);
  env.fake.objects.set('sessions/other/raw.jsonl', Buffer.from('their transcript'));
  const shared = insert(env, OTHER, 'project', 'shared from their chat', 1, theirs);
  assert.match((await result(await call(env, key, 'transcript', { factId: shared }))).missing, /only its owner and the admin/);
  assert.equal(await (await call(env, token(env), 'transcript', { factId: shared })).text(), 'their transcript');
  assert.equal((await call(env, key, 'putTranscript', { sessionId: theirs, agent: 'claude' }, { bytes: Buffer.from('claim') })).status, 403);
  assert.equal(env.fake.objects.get('sessions/other/raw.jsonl').toString(), 'their transcript');
  const hidden = insert(env, OTHER, 'feedback', 'their private fact', 1, theirs);
  assert.deepEqual(await result(await call(env, key, 'transcript', { factId: hidden })), { fact: null });
});

test('raw uploads require a nonprivate owned ledger row before storing bytes', async t => {
  const env = await setup(t); const key = grant();
  const upload = () => call(env, key, 'putTranscript', { sessionId: `claude:${SESSION}`, agent: 'claude' }, { bytes: Buffer.from('raw') });
  assert.equal((await upload()).status, 403);
  await call(env, key, 'putSession', sessionArgs());
  env.fake.db.prepare("UPDATE sessions SET status = 'private' WHERE id = ?").run(`claude:${SESSION}`);
  assert.equal((await upload()).status, 403);
  assert.equal((await call(env, key, 'putSession', sessionArgs())).status, 403);
  assert.equal((await call(env, key, 'putTranscript', { sessionId: '../escape', agent: 'claude' }, { bytes: Buffer.from('raw') })).status, 400);
  assert.equal(env.fake.objects.size, 0);
});

test('the store refuses advertised and actual transcripts over 50 MB and accepts the exact cap', async t => {
  const env = await setup(t); const key = grant(); await call(env, key, 'putSession', sessionArgs());
  const upload = (bytes, headers) => call(env, key, 'putTranscript', { sessionId: `claude:${SESSION}`, agent: 'claude' }, { bytes, headers });
  assert.equal((await upload(Buffer.from('small'), { 'Content-Length': String(MAX_TRANSCRIPT_BYTES + 1) })).status, 413);
  assert.equal((await upload(Buffer.alloc(MAX_TRANSCRIPT_BYTES + 1))).status, 413);
  assert.equal(env.fake.objects.size, 0);
  assert.equal((await upload(Buffer.alloc(MAX_TRANSCRIPT_BYTES))).status, 200);
  assert.equal(env.fake.objects.get(`sessions/${OWNER}/claude/${SESSION}.jsonl`).length, MAX_TRANSCRIPT_BYTES);
});

test('staging has no store and no-R2 production keeps normal fact writes', async t => {
  const env = await setup(t, { bucket: false });
  assert.equal((await handleMemory(new Request('https://preview/_memory/v2/caller', { method: 'POST', body: '{}' }), {})).status, 404);
  const extra = { MEMORY_DB: d1Binding(env.fake.db) };
  const key = grant();
  await call(env, key, 'putSession', sessionArgs(), { extra });
  const kept = await result(await call(env, key, 'putTranscript', { sessionId: `claude:${SESSION}`, agent: 'claude' }, { bytes: Buffer.from('raw'), extra }));
  assert.match(kept.missing, /no R2 bucket/);
  assert.equal((await call(env, token(env), 'write', note('facts without raw'), { extra })).status, 200);
});

test('an app with no sign-in yet issues its admin key with no git email and stores only hashes', async t => {
  const env = await setup(t); execFileSync('git', ['config', 'user.email', ''], { cwd: env.repo.root });
  const old = token(env);
  const out = await memory(env.repo, env.fake, ['member', 'admin'], admin);
  assert.equal(out.code, 0, out.stderr); assert.doesNotMatch(out.stdout, /wongm_|[0-9a-f]{64}/);
  const key = token(env); assert.equal(keyMachine(key), env.repo.machineId); assert.notEqual(key, old);
  const row = env.fake.db.prepare('SELECT machine_id, expires_at FROM memory_keys WHERE hash = ?').get(await hashKey(key));
  assert.equal(row.machine_id, env.repo.machineId); assert.equal(row.expires_at, null);
  assert.ok(!JSON.stringify(env.fake.db.prepare('SELECT * FROM memory_keys').all()).includes(key));
  assert.equal((await call(env, old, 'caller')).status, 401);
  assert.equal((await call(env, key, 'caller')).status, 200);
});

test('with a sign-in on, member admin, member add and join point to Access and change nothing', async t => {
  const env = await setup(t);
  const config = join(env.repo.root, '.claude', '.wong-stack.json');
  const record = JSON.parse(readFileSync(config, 'utf8'));
  writeFileSync(config, JSON.stringify({ components: { ...record.components, access: { audience: 'aud' } } }));
  const before = count(env, 'memory_keys'); const env0 = readFileSync(join(env.repo.root, '.env'), 'utf8');
  for (const args of [['member', 'admin'], ['member', 'add', OWNER], ['join', '--file', '/tmp/key.json']]) {
    const out = await memory(env.repo, env.fake, args, admin);
    assert.equal(out.code, 1, args.join(' ')); assert.match(out.stderr, /company sign-in now: no key to hand out/);
  }
  assert.equal(count(env, 'memory_keys'), before);
  assert.equal(readFileSync(join(env.repo.root, '.env'), 'utf8'), env0);
});

test('listing shows machine IDs, roles, revocation and the signed-in person, never secrets', async t => {
  const env = await setup(t); const key = newKey(OWNER);
  env.fake.db.prepare('INSERT INTO memory_keys (hash, email, role, reader, created_at, machine_id, login_identity) VALUES (?, ?, ?, 1, ?, ?, ?)')
    .run(await hashKey(key), EMAIL, 'member', iso(), OWNER, JSON.stringify({ issuer: 'https://login', subject: 'verified-person', email: 'person@example.com' }));
  const out = await memory(env.repo, env.fake, ['member', 'list'], admin);
  assert.equal(out.code, 0, out.stderr); assert.match(out.stdout, /reader/); assert.match(out.stdout, /person@example\.com/);
  assert.doesNotMatch(out.stdout, /wongm_|wongl_|[0-9a-f]{64}/);
});

test('removal turns off every key for a computer', async t => {
  const env = await setup(t);
  const out = await memory(env.repo, env.fake, ['member', 'remove', env.repo.machineId], admin);
  assert.equal(out.code, 0, out.stderr);
  assert.equal((await call(env, token(env), 'caller')).status, 401);
});

test('a malformed key and no sign-in never fall back to Cloudflare API authority', async t => {
  const env = await setup(t);
  for (const key of ['cloudflare-token', 'wongm_YUBiLmNv.nope', `wongm_${Buffer.from(EMAIL).toString('base64url')}.${'q'.repeat(43)}`]) {
    const before = env.fake.calls.length;
    const out = await memory(env.repo, env.fake, ['search', 'x'], { env: { CLOUDFLARE_MEMORY_TOKEN: key } });
    assert.equal(out.code, 1); assert.match(out.stderr, /not signed in to the company app/);
    assert.equal(env.fake.calls.length, before);
  }
});

test('missing ownership schema fails clearly without email fallback', async t => {
  const env = await setup(t);
  const oldDb = { prepare: () => ({ bind: () => ({ first: async () => { throw new Error('no such column: owner_subject'); } }) }) };
  const response = await handleMemory(new Request('https://prod/_memory/v2/caller', { method: 'POST', body: '{}', headers: credential(token(env)) }), { MEMORY_DB: oldDb });
  assert.equal(response.status, 503); assert.match((await response.json()).error, /latest migration/);
});

test('no route enrols a person or hands out a key', async t => {
  const env = await setup(t);
  const before = count(env, 'memory_keys');
  for (const op of ['join', 'login-link']) {
    assert.equal((await call(env, null, op)).status, 401);
    assert.equal((await call(env, token(env), op)).status, 404);
  }
  assert.equal(count(env, 'memory_keys'), before);
});

test('migrations use provisioning authority and stay repeatable', async t => {
  const env = await setup(t); const out = await memory(env.repo, env.fake, ['migrate'], admin);
  assert.equal(out.code, 0, out.stderr); assert.match(out.stdout, /up to date/);
  assert.equal(count(env, 'memory_admins'), 0);
});

test('a request that is not JSON answers 400 and names it', async t => {
  const env = await setup(t);
  const response = await handleMemory(new Request('https://app.example/_memory/v2/facts', { method: 'POST', body: '{broken', headers: credential(token(env)) }), bindings(env), fakeSignIn);
  assert.equal(response.status, 400); assert.match((await response.json()).error, /not JSON/);
});

test("members cannot overwrite another person's or an unassigned session, even with matching emails", async t => {
  const env = await setup(t); const key = grant();
  for (const owner of [OTHER, null]) {
    const id = `claude:${randomUUID()}`;
    env.fake.db.prepare("INSERT INTO sessions (id, agent, author, status, updated_at, owner_subject) VALUES (?, 'claude', ?, 'captured', 'now', ?)").run(id, EMAIL, owner);
    assert.equal((await call(env, key, 'write', note('no partial write', { session: sessionArgs(id) }))).status, 403);
  }
  assert.equal(count(env), 0);
});

test('the hook names the sign-in step when there is none, and never enrols', async t => {
  const env = await setup(t); writeFileSync(join(env.repo.root, '.env'), 'OTHER=1\n');
  const out = await node(env.repo, env.fake, 'session-start.mjs', [], { input: JSON.stringify({ session_id: 'missing' }), env: { WONG_MEMORY_NO_HEADLESS: '1' } });
  assert.equal(out.code, 0); assert.match(out.stdout, /cloudflared access login/); assert.doesNotMatch(out.stdout, /GitHub|join --file/);
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
  const out = await memory({ ...env.repo, root: linked }, env.fake, ['search', 'x']); assert.equal(out.code, 0, out.stderr);
  const hook = await node({ ...env.repo, root: linked }, env.fake, 'session-start.mjs', [], { input: JSON.stringify({ cwd: linked, session_id: 'linked' }), env: { WONG_MEMORY_NO_HEADLESS: '1' } });
  assert.match(hook.stdout, /branch names another memory address/);
});

test('a shared teammate fact reveals no private transcript through source', async t => {
  const env = await setup(t); const key = grant(); const repo = local(t, env, OWNER, key);
  env.fake.db.prepare("INSERT INTO sessions (id, agent, author, status, raw_key, updated_at, owner_subject) VALUES ('claude:other', 'claude', ?, 'captured', 'sessions/other/raw.jsonl', 'now', ?)").run(EMAIL, OTHER);
  const sourceId = insert(env, OTHER, 'project', 'shared source', 1, 'claude:other');
  env.fake.objects.set('sessions/other/raw.jsonl', Buffer.from('private transcript'));
  const out = await run(env, repo, key, ['source', String(sourceId)]);
  assert.equal(out.code, 0, out.stderr); assert.match(out.stdout, /only its owner and the admin/); assert.doesNotMatch(out.stdout, /private transcript/);
  const privateId = insert(env, OTHER, 'feedback', 'private fact');
  assert.match((await run(env, repo, key, ['source', String(privateId)])).stderr, /no fact/);
});

test('described reads keep two people apart and fail closed without a sign-in, naming the step', async t => {
  const env = await setup(t);
  insert(env, OWNER, 'feedback', 'first person private'); insert(env, OTHER, 'feedback', 'second person private'); insert(env, OTHER, 'project', 'shared delivery');
  for (const [subject, own, other] of [[OWNER, 'first person private', 'second person private'], [OTHER, 'second person private', 'first person private']]) {
    const repo = local(t, env, subject, grant(subject));
    const adapted = await node(repo, env.fake, OPERATIONS, ['call', 'memory.search', '--file', '-'], { input: '{}', env: { COMPANY_API_ORIGIN: 'https://preview.example.com' } });
    const answer = JSON.parse(adapted.stdout); assert.match(answer.text, new RegExp(own)); assert.doesNotMatch(answer.text, new RegExp(other)); assert.match(answer.text, /shared delivery/);
    const described = await node(repo, env.fake, OPERATIONS, ['describe', 'memory.search']); assert.doesNotMatch(described.stdout, /person private|shared delivery/);
  }
  writeFileSync(join(env.repo.root, '.env'), 'OTHER=1\n');
  const ended = local(t, env, OWNER, grant(OWNER, 'member', { exp: 1 }));
  const refused = JSON.parse((await node(ended, env.fake, OPERATIONS, ['call', 'memory.search', '--file', '-'], { input: '{}' })).stdout);
  assert.equal(refused.error.code, 'unavailable'); assert.match(refused.error.message, /sign-in has ended.*company-api\.mjs login/);
  const otherApp = local(t, env, OWNER, grant(OWNER, 'member', { aud: 'another-app' }));
  const denied = JSON.parse((await node(otherApp, env.fake, OPERATIONS, ['call', 'memory.search', '--file', '-'], { input: '{}' })).stdout);
  assert.equal(denied.error.code, 'unavailable'); assert.doesNotMatch(JSON.stringify(denied), /first person private|shared delivery/);
});

test('a run record is stored under the sign-in that sent it, whatever its arguments say', async t => {
  const env = await setup(t);
  const record = { kind: 'capture', host: 'laptop', startedAt: iso(), status: 'ok', counts: {}, owner: OTHER, owner_subject: OTHER };
  for (const caller of [grant(OWNER, 'reader'), grant(OWNER, 'member'), grant('owner-subject', 'admin'), await schedule(env), token(env)]) {
    assert.equal((await call(env, caller, 'putRun', record)).status, 200);
  }
  assert.deepEqual(env.fake.db.prepare('SELECT owner_subject FROM runs ORDER BY id').all().map(row => row.owner_subject), [OWNER, OWNER, 'owner-subject', null, null]);
});

test("each caller's digest shows only its own last run, and a read naming no runs needs no 0009", async t => {
  const env = await setup(t); const team = await schedule(env);
  env.fake.db.prepare("INSERT INTO runs (kind, host, started_at, finished_at, status, reason, counts, owner_subject) VALUES ('capture', 'legacy-laptop', ?, ?, 'ok', 'legacy reason', '{}', 'legacy:unowned')").run(iso(), iso());
  const callers = [[grant(OWNER, 'reader'), 'reader-laptop'], [grant(OTHER), 'member-laptop'], [team, 'schedule-host'], [grant('owner-subject', 'admin'), 'admin-laptop']];
  for (const [caller, host] of callers) assert.equal((await call(env, caller, 'putRun', { kind: 'capture', host, startedAt: iso(), status: 'ok', reason: `${host} reason`, counts: {} })).status, 200);
  for (const [caller, host] of callers) assert.equal((await result(await call(env, caller, 'digest', {}))).run.host, host);
  // A store that skipped `migrate`: a read naming no runs still works; the digest waits for the migration.
  env.fake.db.exec('DROP INDEX runs_owner; ALTER TABLE runs DROP COLUMN owner_subject');
  assert.equal((await call(env, grant(), 'facts', [{}])).status, 200);
  assert.equal((await call(env, grant(), 'digest', {})).status, 503);
});

test('an open-site key stops once the Worker has a sign-in, and an expiry it can not read has passed', async t => {
  const env = await setup(t); const key = token(env);
  const theirs = `claude:${SESSION}`;
  env.fake.db.prepare("INSERT INTO sessions (id, agent, author, status, raw_key, updated_at, owner_subject) VALUES (?, 'claude', ?, 'captured', 'sessions/x.jsonl', 'now', ?)").run(theirs, EMAIL, OTHER);
  env.fake.objects.set('sessions/x.jsonl', Buffer.from('private transcript'));
  const fact = insert(env, OTHER, 'user', 'private preference', 1, theirs);
  const withAccess = (op, args, access = { CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com', CF_ACCESS_AUD: TEST_AUD }) =>
    call(env, key, op, args, { extra: { ...bindings(env), ...access } });
  for (const [op, args] of [['caller', {}], ['facts', [{ everyone: true }]], ['transcript', { factId: fact }]]) assert.equal((await withAccess(op, args)).status, 401, op);
  for (const access of [{ CF_ACCESS_AUD: TEST_AUD }, { CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com' }]) assert.equal((await withAccess('caller', {}, access)).status, 401);
  assert.equal((await result(await call(env, key, 'caller'))).role, 'admin');
  env.fake.db.prepare('UPDATE memory_keys SET expires_at = ?').run('not-a-date');
  assert.equal((await call(env, key, 'caller')).status, 401);
});

test('a fact dated ahead, or not in plain UTC, is stored at the store\'s time; a past plain UTC date is kept', async t => {
  const env = await setup(t); const team = await schedule(env);
  const stored = body => env.fake.db.prepare('SELECT created_at FROM facts WHERE body = ?').get(body).created_at;
  const start = Math.floor(Date.now() / 1000) * 1000;
  for (const [name, caller] of [['member', grant()], ['reader', grant(OWNER, 'reader')], ['schedule', team], ['admin', grant('owner-subject', 'admin')]]) {
    for (const createdAt of ['2999-12-31T00:00:00Z', 'Tue Oct 20 2026']) {
      const body = `${name} note dated ${createdAt}`;
      assert.equal((await call(env, caller, 'write', note(body, { createdAt }))).status, 200);
      const at = Date.parse(stored(body));
      assert.ok(at >= start && at <= Date.now(), `${name}: ${stored(body)}`);
    }
    assert.equal((await call(env, caller, 'write', note(`${name} re-tag`, { createdAt: '2026-09-21T08:00:00Z' }))).status, 200);
    assert.equal(stored(`${name} re-tag`), '2026-09-21T08:00:00Z');
  }
});
