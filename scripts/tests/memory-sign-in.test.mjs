// Memory on the company sign-in: the start-of-chat expiry warning, moving old notes to people, and schedule sign-ins.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { hashKey, newKey } from '../../.agents/skills/memory/worker/memory-worker.mjs';
import { repoContext } from '../../.agents/skills/memory/scripts/lib/store.mjs';
import { list, make, revoke } from '../../.agents/skills/wong-setup/scripts/memory-schedule.mjs';
import { memory, node, rows, setup, signInAs, tempDir } from './fixtures/memory/harness.mjs';

const admin = { env: { CLOUDFLARE_API_TOKEN: 'test-memory-token-value' } };
const DAY = 86400;
const hook = env => node(env.repo, env.fake, 'session-start.mjs', [], { input: JSON.stringify({ session_id: randomUUID() }), env: { WONG_MEMORY_NO_HEADLESS: '1' } });
const noKey = env => writeFileSync(join(env.repo.root, '.env'), 'OTHER=1\n');
const person = (days, claims = {}) => ({ sub: 'ana', email: 'ana@example.com', role: 'admin', exp: Math.floor(Date.now() / 1000) + days * DAY, ...claims });
const insertFact = (env, machine, body) => env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author, owner_machine_id) VALUES ('x', 'feedback', ?, 'save', 'now', 'dev@example.com', ?)").run(body, machine);
const insertSession = (env, id, machine) => env.fake.db.prepare("INSERT INTO sessions (id, agent, status, updated_at, owner_machine_id) VALUES (?, 'claude', 'captured', 'now', ?)").run(id, machine);
function signInOn(env) {
  const file = join(env.repo.root, '.claude', '.wong-stack.json');
  const record = JSON.parse(readFileSync(file, 'utf8'));
  writeFileSync(file, JSON.stringify({ components: { ...record.components, access: { audience: 'aud' } } }));
}

test('a valid sign-in starts quietly; one near its end warns first and names the command', async t => {
  const env = await setup(t); noKey(env);
  signInAs(env.repo, person(20));
  const valid = await hook(env);
  assert.equal(valid.code, 0); assert.doesNotMatch(valid.stdout, /sign-in ends|skipped the store/);
  signInAs(env.repo, person(2.5));
  const near = await hook(env);
  assert.match(near.stdout.split('\n')[0], /^Memory: your company sign-in ends in 3 days; to sign in, run `cloudflared access login http:\/\/127\.0\.0\.1:\d+` and show the person the link it prints\.$/);
  assert.doesNotMatch(near.stdout, /skipped the store/);
});

test('an ended or missing sign-in loads the cached digest and holds writes in the spool', async t => {
  const env = await setup(t); noKey(env);
  env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author, shared) VALUES ('x', 'project', 'Cached team decision.', 'save', 'now', 'dev@example.com', 1)").run();
  signInAs(env.repo, person(20));
  assert.equal((await memory(env.repo, env.fake, ['digest'])).code, 0);
  for (const [claims, why] of [[person(-1), /your company sign-in has ended/], [null, /this computer is not signed in to the company app/]]) {
    signInAs(env.repo, claims);
    const result = await hook(env);
    assert.equal(result.code, 0); assert.match(result.stdout, /Cached team decision/); assert.match(result.stdout, /not up to date until you sign in/);
    assert.match(result.stdout, why); assert.match(result.stdout, /cloudflared access login/);
  }
  const before = env.fake.db.prepare('SELECT count(*) AS n FROM facts').get().n;
  const put = await memory(env.repo, env.fake, ['put-facts', '--file', '-'], { input: JSON.stringify({ source: 'save', slug: 'x', facts: [{ action: 'add', type: 'project', body: 'Waits for the sign-in.' }] }) });
  assert.match(put.stdout + put.stderr, /spool|wait/i);
  assert.equal(env.fake.db.prepare('SELECT count(*) AS n FROM facts').get().n, before);
});

test('migrate-people moves linked computers to their person, leaves the rest admin-only, and reruns safely', async t => {
  const env = await setup(t);
  const [linked, unlinked] = [randomUUID(), randomUUID()];
  env.fake.db.prepare('INSERT INTO memory_keys (hash, email, role, created_at, machine_id, login_identity) VALUES (?, ?, ?, ?, ?, ?)')
    .run(await hashKey(newKey(linked)), 'ana@example.com', 'member', 'now', linked, JSON.stringify({ subject: 'ana', email: 'ana@example.com' }));
  insertFact(env, linked, 'Ana prefers short notes.'); insertSession(env, 'claude:ana', linked);
  insertFact(env, unlinked, 'Nobody signed in here.'); insertSession(env, 'claude:old', unlinked);
  const first = await memory(env.repo, env.fake, ['migrate-people'], admin);
  assert.equal(first.code, 0, first.stderr);
  assert.match(first.stdout, /Moved 1 facts and 1 chats/); assert.match(first.stdout, new RegExp(`${unlinked} \\(1 facts, 1 chats\\)`));
  assert.match(first.stdout, /no sign-in yet, so the admin key stays on/);
  assert.deepEqual(rows(env, 'SELECT owner_subject, owner_email FROM facts ORDER BY id'), [{ owner_subject: 'ana', owner_email: 'ana@example.com' }, { owner_subject: null, owner_email: null }]);
  assert.deepEqual(rows(env, 'SELECT owner_subject FROM sessions ORDER BY id'), [{ owner_subject: 'ana' }, { owner_subject: null }]);
  assert.equal(rows(env, 'SELECT count(*) AS n FROM memory_keys WHERE expires_at IS NOT NULL')[0].n, 0);
  const again = await memory(env.repo, env.fake, ['migrate-people'], admin);
  assert.match(again.stdout, /Moved 0 facts and 0 chats/);
  // A member only sees what it owns: the waiting computer's notes stay with the admins.
  signInAs(env.repo, { sub: 'bo', email: 'bo@example.com', role: 'member' });
  assert.doesNotMatch((await memory(env.repo, env.fake, ['search', '--everyone', '--all'])).stdout, /Nobody signed in/);
});

test('with a sign-in on, migrate-people turns old keys off only after the move succeeds', async t => {
  const env = await setup(t); signInOn(env);
  const linked = randomUUID();
  env.fake.db.prepare('INSERT INTO memory_keys (hash, email, role, created_at, machine_id, login_identity) VALUES (?, ?, ?, ?, ?, ?)')
    .run(await hashKey(newKey(linked)), 'ana@example.com', 'member', 'now', linked, JSON.stringify({ subject: 'ana', email: 'ana@example.com' }));
  insertFact(env, linked, 'Ana prefers short notes.');
  env.fake.db.exec("CREATE TRIGGER fail_move BEFORE UPDATE OF owner_subject ON facts BEGIN SELECT RAISE(ABORT, 'move failed'); END");
  const failed = await memory(env.repo, env.fake, ['migrate-people'], admin);
  assert.equal(failed.code, 1);
  assert.equal(rows(env, 'SELECT count(*) AS n FROM memory_keys WHERE expires_at IS NOT NULL')[0].n, 0);
  assert.equal(rows(env, 'SELECT owner_subject FROM facts')[0].owner_subject, null);
  env.fake.db.exec('DROP TRIGGER fail_move');
  const done = await memory(env.repo, env.fake, ['migrate-people'], admin);
  assert.equal(done.code, 0, done.stderr); assert.match(done.stdout, /Old memory keys are off/);
  assert.equal(rows(env, 'SELECT count(*) AS n FROM memory_keys WHERE expires_at IS NULL')[0].n, 0);
  assert.equal((await memory(env.repo, env.fake, ['search', 'x'])).code, 1, 'the old admin key no longer opens memory');
});

test('assign gives a waiting computer to a person found by their own signed-in chats', async t => {
  const env = await setup(t); const machine = randomUUID();
  insertFact(env, machine, 'Waiting note.');
  const unknown = await memory(env.repo, env.fake, ['assign', machine, 'bo@example.com'], admin);
  assert.equal(unknown.code, 1); assert.match(unknown.stderr, /has not used memory with the company sign-in yet/);
  env.fake.db.prepare("INSERT INTO sessions (id, agent, status, updated_at, owner_subject, owner_email) VALUES ('claude:bo', 'claude', 'captured', 'now', 'bo', 'Bo@example.com')").run();
  const result = await memory(env.repo, env.fake, ['assign', machine, 'bo@example.com'], admin);
  assert.equal(result.code, 0, result.stderr); assert.match(result.stdout, /Gave 1 facts and 0 chats/);
  assert.deepEqual(rows(env, "SELECT owner_subject FROM facts WHERE body = 'Waiting note.'"), [{ owner_subject: 'bo' }]);
  assert.equal((await memory(env.repo, env.fake, ['assign', 'not-a-machine', 'bo@example.com'], admin)).code, 1);
});

test('the owner makes, lists and revokes a schedule sign-in that sees team facts only', async t => {
  const env = await setup(t);
  const saved = { api: process.env.WONG_CLOUDFLARE_API, token: process.env.CLOUDFLARE_API_TOKEN };
  Object.assign(process.env, { WONG_CLOUDFLARE_API: env.fake.api, CLOUDFLARE_API_TOKEN: 'test-memory-token-value' });
  t.after(() => { process.env.WONG_CLOUDFLARE_API = saved.api ?? ''; process.env.CLOUDFLARE_API_TOKEN = saved.token ?? ''; });
  const printed = []; const log = console.log; console.log = line => printed.push(line); t.after(() => { console.log = log; });
  const calls = [];
  const cf = async (method, path, body) => { calls.push([method, path, body]); return method === 'POST' ? { id: 'tok-1', client_id: 'nightly.access', client_secret: 'schedule-secret-value' } : null; };
  const ctx = repoContext(env.repo.root);
  await assert.rejects(make(ctx, 'nightly', join(env.repo.root, 'secret.env'), cf), /outside every checkout/);
  assert.equal(calls.length, 0);
  const file = join(tempDir(t, 'schedule-secret-'), 'nightly.env');
  await make(ctx, 'nightly', file, cf);
  assert.deepEqual(calls[0], ['POST', '/accounts/acct/access/service_tokens', { name: 'memory-schedule:nightly', duration: '8760h' }]);
  assert.equal(readFileSync(file, 'utf8'), 'WONG_MEMORY_CLIENT_ID=nightly.access\nWONG_MEMORY_CLIENT_SECRET=schedule-secret-value\n');
  assert.equal(statSync(file).mode & 0o777, 0o600);
  assert.doesNotMatch(printed.join('\n'), /schedule-secret-value/);
  assert.equal(rows(env, 'SELECT secret_hash FROM memory_schedules')[0].secret_hash, await hashKey('schedule-secret-value'));
  await assert.rejects(make(ctx, 'nightly', join(tempDir(t, 'again-'), 'x.env'), cf), /already has a memory sign-in/);

  env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author, owner_subject, shared) VALUES ('x', 'project', ?, 'save', 'now', 'a@example.com', ?, 1)").run('Shared schedule decision.', 'ana');
  env.fake.db.prepare("INSERT INTO facts (slug, type, body, source, created_at, author, owner_subject, shared) VALUES ('x', 'feedback', ?, 'save', 'now', 'a@example.com', ?, 1)").run('Ana private schedule preference.', 'ana');
  noKey(env);
  const scheduleEnv = { env: { WONG_MEMORY_CLIENT_ID: 'nightly.access', WONG_MEMORY_CLIENT_SECRET: 'schedule-secret-value' } };
  const seen = await memory(env.repo, env.fake, ['search', 'schedule', '--everyone'], scheduleEnv);
  assert.equal(seen.code, 0, seen.stderr); assert.match(seen.stdout, /Shared schedule decision/); assert.doesNotMatch(seen.stdout, /Ana private/);

  await list(ctx); assert.match(printed.at(-1), /memory-schedule:nightly \(made \d{4}-\d\d-\d\d, on\)/);
  await revoke(ctx, 'nightly', cf);
  assert.deepEqual(calls.at(-1), ['DELETE', '/accounts/acct/access/service_tokens/tok-1', undefined]);
  assert.equal((await memory(env.repo, env.fake, ['search', 'schedule'], scheduleEnv)).code, 1);
  await assert.rejects(revoke(ctx, 'nightly', cf), /no memory sign-in that is on/);
});
