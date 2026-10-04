import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { taskIdentity } from '../../.agents/skills/memory/scripts/lib/extract-ledger.mjs';
import { hashKey, newKey } from '../../.agents/skills/memory/worker/memory-worker.mjs';
import { memory, setup } from './fixtures/memory/harness.mjs';

const otherMachine = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const resultIds = (text, format) => (format === 'json' ? JSON.parse(text).facts.map(fact => fact.id) : [...text.matchAll(/#(\d+)(?: ·|\))/g)].map(match => Number(match[1]))).sort((a, b) => a - b);

test('search, JSON, brief and extract preserve machine privacy and source permissions for every role', async t => {
  const env = await setup(t);
  const insert = env.fake.db.prepare("INSERT INTO facts (slug,type,body,source,created_at,author,owner_machine_id,shared) VALUES ('topic',?,?,'migration','2026-10-01','same-label@example.com',?,?) RETURNING id");
  const put = (type, body, owner, shared = 1) => Number(insert.get(type, `Evidence ${body}.`, owner, shared).id);
  const ownPrivate = put('user', 'own personal', env.repo.machineId);
  const ownReader = put('project', 'own unshared', env.repo.machineId, 0);
  const shared = put('project', 'team decision', otherMachine);
  const reference = put('reference', 'team reference', null);
  const otherPrivate = put('feedback', 'other personal', otherMachine);
  const otherReader = put('project', 'other unshared', otherMachine, 0);
  const historicPrivate = put('user', 'unassigned historical personal', null);
  const replaced = put('project', 'replaced old decision', otherMachine);
  env.fake.db.prepare('UPDATE facts SET superseded_by = ? WHERE id = ?').run(shared, replaced);
  const privateSession = 'claude:private-evidence';
  const sharedSession = 'claude:shared-private-source';
  const rawKey = `sessions/${otherMachine}/claude/11111111-1111-4111-8111-111111111111.jsonl`;
  const insertSession = env.fake.db.prepare("INSERT INTO sessions (id,agent,author,owner_machine_id,status,raw_key,updated_at) VALUES (?,'claude','same-label@example.com',?,'captured',?,'2026-10-01')");
  insertSession.run(privateSession, otherMachine, 'private-object-key');
  insertSession.run(sharedSession, otherMachine, rawKey);
  env.fake.db.prepare('UPDATE facts SET session_id = ? WHERE id = ?').run(privateSession, otherPrivate);
  env.fake.db.prepare('UPDATE facts SET session_id = ? WHERE id = ?').run(sharedSession, shared);
  env.fake.objects.set(rawKey, Buffer.from('PRIVATE TRANSCRIPT CONTENT'));
  let transcriptGets = 0;
  const getObject = env.fake.objects.get.bind(env.fake.objects);
  env.fake.objects.get = key => { transcriptGets += 1; return getObject(key); };
  const narrow = [ownPrivate, ownReader, shared, reference].sort((a, b) => a - b);
  const broad = [...narrow, otherPrivate, otherReader, historicPrivate].sort((a, b) => a - b);
  for (const role of ['admin', 'member', 'reader']) {
    const token = newKey(env.repo.machineId);
    env.fake.db.prepare('INSERT INTO memory_keys (hash,email,role,reader,created_at,machine_id) VALUES (?,?,?,?,?,?)')
      .run(await hashKey(token), 'same-label@example.com', role === 'reader' ? 'member' : role, Number(role === 'reader'), 'now', env.repo.machineId);
    const options = { env: { CLOUDFLARE_MEMORY_TOKEN: token } };
    for (const everyone of [false, true]) {
      for (const format of ['text', 'json', 'brief', 'extract']) {
        const filters = ['--slug', 'topic', ...(everyone ? ['--everyone'] : [])];
        let args;
        if (format === 'extract') {
          const issued = await memory(env.repo, env.fake, ['extract-task', ...filters], options);
          assert.equal(issued.code, 0, issued.stderr);
          args = ['extract', 'evidence', '--task', issued.stdout.trim(), '--agent', 'codex', ...filters];
        } else args = [format === 'brief' ? 'brief' : 'search', 'evidence', ...filters, ...(format === 'json' ? ['--json'] : [])];
        const result = await memory(env.repo, env.fake, args, options);
        assert.equal(result.code, 0, result.stderr);
        assert.deepEqual(resultIds(result.stdout, format), role === 'admin' && everyone ? broad : narrow, `${format}, ${role}, everyone=${everyone}`);
        assert.doesNotMatch(result.stdout, /raw_key|private-object-key|sessions\/|PRIVATE TRANSCRIPT CONTENT|replaced old decision/);
        if (role !== 'admin' || !everyone) assert.doesNotMatch(result.stdout, /claude:private-evidence/);
        if (format === 'brief' || format === 'extract') assert.match(result.stdout, /session: claude:shared-private-source/);
      }
    }
    if (role !== 'admin') {
      const source = await memory(env.repo, env.fake, ['source', String(shared)], options);
      assert.equal(source.code, 0, source.stderr);
      assert.match(source.stdout, /only the owning machine and the admin/);
      assert.doesNotMatch(source.stdout, /PRIVATE TRANSCRIPT CONTENT/);
    }
  }
  assert.equal(transcriptGets, 0, 'facts and briefs never fetch private transcript bytes');
  assert.ok(env.fake.calls.every(call => !call.includes('/r2/')), 'extraction never follows transcript sources');
  for (const args of [['search', 'evidence', '--json'], ['brief', 'evidence']]) {
    const denied = await memory(env.repo, env.fake, args, { env: { CLOUDFLARE_MEMORY_TOKEN: 'invalid-credential' } });
    assert.equal(denied.code, 1); assert.doesNotMatch(denied.stdout, /No matching|Memory brief|Evidence/);
  }
});

test('task identity follows machine and credential rather than changing author labels', async t => {
  const ctx = { commonDir: '/repo', machineId: otherMachine, author: 'old@example.com' };
  const identity = taskIdentity(ctx, { slug: 'topic' }, 'credential-fingerprint');
  assert.equal(taskIdentity({ ...ctx, author: 'new@example.com' }, { slug: 'topic' }, 'credential-fingerprint'), identity);
  assert.notEqual(taskIdentity({ ...ctx, machineId: 'another-machine' }, { slug: 'topic' }, 'credential-fingerprint'), identity);
  assert.notEqual(taskIdentity(ctx, { slug: 'topic' }, 'replacement-credential-fingerprint'), identity);

  const env = await setup(t);
  env.fake.db.prepare("INSERT INTO facts (slug,type,body,source,created_at,author,owner_machine_id) VALUES ('topic','user','Evidence owned by this machine.','migration','2026-10-01','old@example.com',?)").run(env.repo.machineId);
  const issued = await memory(env.repo, env.fake, ['extract-task', '--slug', 'topic']);
  assert.equal(issued.code, 0, issued.stderr);
  execFileSync('git', ['config', 'user.email', 'new@example.com'], { cwd: env.repo.root });
  const args = ['extract', 'evidence', '--task', issued.stdout.trim(), '--slug', 'topic', '--agent', 'codex'];
  const result = await memory(env.repo, env.fake, args);
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Evidence owned by this machine/);
  assert.match(result.stdout, /author: old@example.com/);
  const replacement = newKey(env.repo.machineId);
  env.fake.db.prepare('INSERT INTO memory_keys (hash,email,role,created_at,machine_id) VALUES (?,?,?,?,?)').run(await hashKey(replacement), 'new@example.com', 'admin', 'now', env.repo.machineId);
  const rotated = await memory(env.repo, env.fake, args, { env: { CLOUDFLARE_MEMORY_TOKEN: replacement } });
  assert.notEqual(rotated.code, 0); assert.equal(rotated.stdout, ''); assert.match(rotated.stderr, /mismatch/);
});

test('revoked credentials return denied without previously supplied facts or private-cache fallback', async t => {
  const env = await setup(t);
  const token = readFileSync(join(env.repo.root, '.env'), 'utf8').match(/^CLOUDFLARE_MEMORY_TOKEN=(.*)$/m)[1];
  const issued = await memory(env.repo, env.fake, ['extract-task', '--slug', 'topic']);
  assert.equal(issued.code, 0, issued.stderr);
  writeFileSync(join(env.repo.stateDir, 'digest.txt'), 'Evidence stale private cache.');
  env.fake.db.prepare('UPDATE memory_keys SET expires_at = ? WHERE hash = ?').run('2000-01-01T00:00:00Z', await hashKey(token));
  const result = await memory(env.repo, env.fake, ['extract', 'evidence', '--task', issued.stdout.trim(), '--slug', 'topic', '--agent', 'codex']);
  assert.equal(result.code, 1); assert.match(result.stdout, /denied/); assert.doesNotMatch(result.stdout, /Evidence|Fact #|stale private cache/);
});
