import test from 'node:test';
import assert from 'node:assert/strict';
import { issueMachineGrant as issue, enrollMemoryMachine as enroll, revokeMemoryMachine as revoke, machineScopePolicy } from '../../.agents/skills/memory/scripts/lib/machine-enrollment.mjs';
import { readMachineSetupStatus } from '../../.agents/skills/memory/scripts/lib/machine-operator.mjs';
import { migrationSql } from './fixtures/memory/identity.mjs';
import { preparedMachineFixture, enrolledMachineFixture, issueInput, enrollInput, revokeInput,
  codeRejected, attempt, MACHINE, CREDENTIAL_HASH } from './fixtures/memory/machines.mjs';

async function grantFixture(t, scope) {
  const f = await preparedMachineFixture(t);
  f.issue = await issueInput(f, scope ? { scope } : {}); await issue(f.operator, f.issue);
  return f;
}
const current = f => readMachineSetupStatus(f.operator, { installation: f.installation });
const count = (f, name) => f.db.prepare(`SELECT count(*) n FROM memory_machine_${name}`).get().n;

// Controlled corruption restores guards afterward to test durable evidence, not merely absent triggers.
function corrupt(f, table, sql, params = []) {
  const prefix = `memory_machine_${table}`;
  const guards = f.db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'trigger' AND tbl_name = ?").all(prefix);
  for (const guard of guards) f.db.exec(`DROP TRIGGER ${guard.name}`);
  f.db.prepare(sql).run(...params);
  for (const guard of guards) f.db.exec(guard.sql);
}

test('one-use grant enrolls exact isolated machine with scope ceiling; every result stays pending for runtime proof', async t => {
  const f = await grantFixture(t, 'memory:read memory:write memory:admin');
  const input = await enrollInput(f, { scope: 'memory:read' });
  const result = await enroll(f.operator, input);
  assert.equal(result.operation.machineId, MACHINE); assert.equal(result.operation.completed, true);
  assert.equal(result.memory.status, 'pending-setup'); assert.equal(Object.hasOwn(result.memory, 'action'), false);
  assert.equal(f.db.prepare('SELECT scope FROM memory_machine_principals').get().scope, 'memory:read');
  assert.equal(f.db.prepare('SELECT state, revision FROM memory_machine_grants').get().state, 'consumed');
  assert.equal(count(f, 'credentials'), 1); assert.equal(count(f, 'completions'), 2);
  assert.equal(f.db.prepare('SELECT auth_revision FROM memory_machine_configuration').get().auth_revision, 3);
  assert.deepEqual(await enroll(f.operator, input), result);
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_identity_bindings').get().n, 0);
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_memberships').get().n, 0);
  const noProof = await current(f); assert.equal(noProof.memory.status, 'pending-setup');
  assert.equal(JSON.stringify(result).includes(input.credentialHash), false);
  assert.equal(JSON.stringify(result).includes(input.capabilityHash), false);
});

test('expiry, wrong capability/commitment, widened scope, replay, different machine and foreign pins refuse', async t => {
  const f = await grantFixture(t, 'memory:read');
  const base = await enrollInput(f, { scope: 'memory:read' });
  for (const changes of [{ scope: 'memory:read memory:write' }, { capabilityHash: '0'.repeat(64) },
    { machineCommitment: '1'.repeat(64) }, { credentialExpiresAt: Math.floor(Date.now() / 1000) - 1 },
    { credentialExpiresAt: Math.floor(Date.now() / 1000) + 2592100 }]) {
    const before = f.snapshot(), batches = f.batches;
    await assert.rejects(enroll(f.operator, { ...base, ...changes }), codeRejected('machine-grant-unavailable'));
    assert.deepEqual(f.snapshot(), before); assert.equal(f.batches, batches);
  }
  await assert.rejects(enroll(f.operator, { ...base, installation: { ...base.installation, repositoryId: 'x'.repeat(32) } }), codeRejected('installation-conflict'));
  await enroll(f.operator, base);
  await assert.rejects(enroll(f.operator, { ...base, machineId: 'another'.padEnd(32,'0') }), codeRejected('machine-attempt-conflict'));
  await assert.rejects(enroll(f.operator, { ...base, attemptId: attempt('replay'), expected: await f.expected() }), codeRejected('machine-grant-unavailable'));
  const g = await grantFixture(t); const expiredAt = Math.floor(Date.now() / 1000) - 1;
  corrupt(g, 'grants', 'UPDATE memory_machine_grants SET created_at = ?, expires_at = ?', [expiredAt - 600, expiredAt]);
  await assert.rejects(enroll(g.operator, await enrollInput(g)), codeRejected('machine-grant-unavailable'));
  assert.equal(count(g, 'principals'), 0);
});

test('stale auth/pin/snapshot and unrecognized cloud/service/email proof cannot reserve authority', async t => {
  const f = await grantFixture(t); const input = await enrollInput(f); const before = f.snapshot(), batches = f.batches;
  for (const changes of [{ expected: { ...input.expected, authRevision: input.expected.authRevision + 1 } },
    { expected: { ...input.expected, pinRevision: 2 } }, { expected: { ...input.expected, snapshotHash: '0'.repeat(64) } }])
    await assert.rejects(enroll(f.operator, { ...input, ...changes }), codeRejected('machine-authority-stale'));
  for (const changes of [{ serviceToken: true }, { cloudRole: 'owner' }, { email: 'owner@example.com' }, { scope: 'all' }, { machineId: 'short' }, { credentialHash: 'BAD' }])
    await assert.rejects(enroll(f.operator, { ...input, ...changes }), codeRejected('invalid-input'));
  assert.deepEqual(f.snapshot(), before); assert.equal(f.batches, batches);
});

test('grant expiry and conflicting identifiers refuse issuance before reserving a barrier', async t => {
  const f = await preparedMachineFixture(t);
  for (const expiresAt of [Math.floor(Date.now() / 1000) - 1, Math.floor(Date.now() / 1000) + 700]) {
    await assert.rejects(issue(f.operator, await issueInput(f, { expiresAt })), codeRejected('machine-grant-unavailable'));
    assert.equal(count(f, 'attempts'), 0);
  }
  const input = await issueInput(f); await issue(f.operator, input);
  await assert.rejects(issue(f.operator, { ...input, attemptId: attempt('different-issue'), expected: await f.expected() }), codeRejected('machine-grant-unavailable'));
});

test('atomic write failure and envelope success without an outcome never manufacture grant completion', async t => {
  const f = await grantFixture(t), input = await enrollInput(f), before = f.snapshot();
  f.failAt = 3;
  await assert.rejects(enroll(f.operator, input), codeRejected('provider-unavailable'));
  assert.deepEqual(f.snapshot(), before);
  f.failAt = null;
  f.intercept = async (method, path, body) => body?.batch ? [{ success: true, results: [] }] : undefined;
  await assert.rejects(enroll(f.operator, input), codeRejected('machine-operation-incomplete'));
  assert.deepEqual(f.snapshot(), before);
});

for (const action of ['issue','enroll','revoke']) test(`every nontransactional ${action} statement boundary closes authority without automatic repair`, async t => {
  // reservation + authority mutations + exact audit + final receipt/release
  const length = { issue: 4, enroll: 7, revoke: 6 }[action];
  for (let failAt = 1; failAt < length; failAt++) {
    const f = action === 'issue' ? await preparedMachineFixture(t) : action === 'enroll' ? await grantFixture(t) : await enrolledMachineFixture(t);
    const input = await ({ issue: issueInput, enroll: enrollInput, revoke: revokeInput }[action])(f);
    const call = { issue, enroll, revoke }[action];
    f.atomic = false; f.failAt = failAt;
    await assert.rejects(call(f.operator, input), codeRejected('machine-operation-incomplete'));
    assert.equal(f.db.prepare('SELECT state FROM memory_machine_configuration').get().state, 'maintenance');
    const before = f.snapshot(), batches = f.batches; f.failAt = null;
    await assert.rejects(call(f.operator, input), codeRejected('machine-operation-incomplete'));
    const competing = { ...input, attemptId: attempt(`competing-${action}`), expected: (await current(f)).snapshot };
    await assert.rejects(call(f.operator, competing), codeRejected('machine-operation-incomplete'));
    assert.deepEqual(f.snapshot(), before); assert.equal(f.batches, batches);
    assert.equal((await current(f)).memory.status, 'blocked');
  }
});

for (const action of ['issue','enroll','revoke']) test(`identical/competing ${action} attempts and exact lost response converge only on durable receipt`, async t => {
  const prepare = action === 'issue' ? preparedMachineFixture : action === 'enroll' ? grantFixture : enrolledMachineFixture;
  const inputs = { issue: issueInput, enroll: enrollInput, revoke: revokeInput }, call = { issue, enroll, revoke }[action];
  const f = await prepare(t), input = await inputs[action](f); f.loseResponse = true;
  const recovered = await call(f.operator, input); assert.equal(recovered.operation.completed, true);
  assert.equal(recovered.memory.status, 'pending-setup'); assert.deepEqual(await call(f.operator, input), recovered);
  const g = await prepare(t), same = await inputs[action](g);
  const identical = await Promise.all([call(g.operator, same), call(g.operator, same)]);
  assert.deepEqual(identical[0], identical[1]);
  const h = await prepare(t), one = await inputs[action](h);
  const competing = await Promise.allSettled([call(h.operator, one), call(h.operator, { ...one, attemptId: attempt(`other-${action}`) })]);
  assert.equal(competing.filter(row => row.status === 'fulfilled').length, 1);
  assert.equal(competing.filter(row => row.status === 'rejected').length, 1);
});

test('an identical concurrent loser cannot finish another attempt left deliberately partial', async t => {
  const f = await grantFixture(t), input = await enrollInput(f); f.atomic = false; f.failAt = 3;
  await assert.rejects(enroll(f.operator, input), codeRejected('machine-operation-incomplete'));
  f.failAt = null; const batches = f.batches;
  const same = await Promise.allSettled([enroll(f.operator, input), enroll(f.operator, input)]);
  assert.equal(same.every(row => row.status === 'rejected' && row.reason.code === 'machine-operation-incomplete'), true);
  assert.equal(f.batches, batches); assert.equal(count(f, 'credentials'), 0);
});

test('lost enrollment response followed by revocation never recovers or reenrolls removed authority', async t => {
  const f = await grantFixture(t), input = await enrollInput(f); f.loseResponse = true;
  await enroll(f.operator, input);
  const revokeRequest = await revokeInput(f); f.loseResponse = true;
  const removed = await revoke(f.operator, revokeRequest);
  assert.equal(removed.operation.completed, true);
  assert.equal(f.db.prepare('SELECT status FROM memory_principals WHERE id = ?').get(MACHINE).status, 'removed');
  assert.equal(f.db.prepare('SELECT status FROM memory_machine_principals').get().status, 'revoked');
  assert.equal(f.db.prepare('SELECT state FROM memory_machine_grants').get().state, 'revoked');
  const before = f.snapshot(), batches = f.batches;
  await assert.rejects(enroll(f.operator, input), codeRejected('machine-operation-incomplete'));
  await assert.rejects(enroll(f.operator, { ...input, attemptId: attempt('reenroll'), expected: await f.expected() }), codeRejected('machine-grant-unavailable'));
  assert.deepEqual(f.snapshot(), before); assert.equal(f.batches, batches);
  assert.throws(() => f.db.exec("UPDATE memory_machine_principals SET status = 'active', revision = revision + 1"), /maintenance|revived/);
  assert.deepEqual(await revoke(f.operator, revokeRequest), removed);
});

test('changed live grant/credential or receipt/audit invalidates exact replay even when provider reported success', async t => {
  for (const mutate of [f => corrupt(f, 'credentials', 'UPDATE memory_machine_credentials SET hash = ?', ['a'.repeat(64)]),
    f => corrupt(f, 'audit', "UPDATE memory_machine_audit SET target_id = 'wrong' WHERE action = 'enroll'"),
    f => corrupt(f, 'completions', "UPDATE memory_machine_completions SET auth_revision = 99 WHERE attempt_id = ?", [attempt('enroll')]),
    f => f.db.prepare("UPDATE memory_principals SET status = 'removed' WHERE id = ?").run(MACHINE)]) {
    const f = await enrolledMachineFixture(t); mutate(f); const before = f.snapshot(), batches = f.batches;
    await assert.rejects(enroll(f.operator, f.enroll), codeRejected('machine-operation-incomplete'));
    assert.deepEqual(f.snapshot(), before); assert.equal(f.batches, batches);
  }
});

test('final SQL receipt rejects an omitted outcome despite audit presence and retains maintenance', async t => {
  const f = await grantFixture(t), input = await enrollInput(f); f.atomic = false; f.failAt = 6;
  await assert.rejects(enroll(f.operator, input), codeRejected('machine-operation-incomplete'));
  const batch = f.statementBatches.at(-1), receipt = batch.at(-1);
  assert.equal(f.db.prepare("SELECT count(*) n FROM memory_machine_audit WHERE action = 'enroll'").get().n, 1);
  corrupt(f, 'credentials', 'DELETE FROM memory_machine_credentials WHERE hash = ?', [CREDENTIAL_HASH]);
  // Bypass the SELECT predicate to exercise the receipt trigger independently.
  const a = f.db.prepare('SELECT * FROM memory_machine_attempts WHERE id = ?').get(input.attemptId);
  assert.throws(() => f.db.prepare(`INSERT INTO memory_machine_completions(attempt_id,installation_id,request_hash,audit_id,auth_revision,created_at)
    VALUES(?,?,?,?,?,unixepoch())`).run(a.id, a.installation_id, a.request_hash, a.audit_id, a.auth_revision + 1), /exact current outcome/);
  f.db.prepare(receipt.sql).run(...receipt.params); // Its guarded SELECT also refuses to publish.
  assert.equal(count(f, 'completions'), 1); // Only prior issue completion.
  assert.equal(f.db.prepare('SELECT state FROM memory_machine_configuration').get().state, 'maintenance');
});

test('audit outcome guard refuses a skipped machine mutation and never opens the barrier', async t => {
  const f = await grantFixture(t), input = await enrollInput(f); f.atomic = false; f.failAt = 4;
  await assert.rejects(enroll(f.operator, input), codeRejected('machine-operation-incomplete'));
  const a = f.db.prepare('SELECT * FROM memory_machine_attempts WHERE id = ?').get(input.attemptId);
  assert.throws(() => f.db.prepare(`INSERT INTO memory_machine_audit(id,installation_id,attempt_id,action,target_id,request_hash,created_at)
    VALUES(?,?,?,'enroll',?,?,unixepoch())`).run(a.audit_id, a.installation_id, a.id, a.target_id, a.request_hash), /exact current outcome/);
  assert.equal(count(f, 'credentials'), 0); assert.equal(f.db.prepare('SELECT state FROM memory_machine_configuration').get().state, 'maintenance');
  assert.ok(migrationSql('0012_machine_authorization.sql').includes('memory_machine_completion_outcome_guard'));
});

for (const failAfter of [0,1,2,3,4,5]) test(`auth revision change after enrollment mutation ${failAfter} closes later guards`, async t => {
  const f = await grantFixture(t), input = await enrollInput(f); f.atomic = false;
  f.afterStatement = async index => {
    if (index !== failAfter) return;
    const ddl = f.db.prepare("SELECT sql FROM sqlite_master WHERE name = 'memory_machine_configuration_guard'").get().sql;
    f.db.exec('DROP TRIGGER memory_machine_configuration_guard');
    f.db.exec('UPDATE memory_machine_configuration SET auth_revision = auth_revision + 1');
    f.db.exec(ddl);
  };
  await assert.rejects(enroll(f.operator, input), codeRejected('machine-operation-incomplete'));
  assert.equal(f.db.prepare('SELECT state FROM memory_machine_configuration').get().state, 'maintenance');
  assert.equal(count(f, 'completions'), 1);
  const batches = f.batches; f.afterStatement = null;
  await assert.rejects(enroll(f.operator, input), codeRejected('machine-operation-incomplete'));
  assert.equal(f.batches, batches);
});

test('revocation between credential write and final receipt cannot publish or recover enrollment', async t => {
  const f = await grantFixture(t), input = await enrollInput(f); f.atomic = false;
  f.afterStatement = async index => {
    if (index !== 4) return;
    corrupt(f, 'grants', "UPDATE memory_machine_grants SET state = 'revoked', revision = revision + 1");
    corrupt(f, 'principals', "UPDATE memory_machine_principals SET status = 'revoked', revision = revision + 1");
    f.db.prepare("UPDATE memory_principals SET status = 'removed' WHERE id = ?").run(MACHINE);
  };
  await assert.rejects(enroll(f.operator, input), codeRejected('machine-operation-incomplete'));
  assert.equal(count(f, 'completions'), 1); assert.equal((await current(f)).memory.status, 'blocked');
  f.afterStatement = null; const before = f.snapshot(), batches = f.batches;
  await assert.rejects(enroll(f.operator, input), codeRejected('machine-operation-incomplete'));
  assert.deepEqual(f.snapshot(), before); assert.equal(f.batches, batches);
});


test('reader scope explicitly captures own private memory while refusing shared writes and authority changes', () => {
  assert.deepEqual(machineScopePolicy('memory:read'), { readShared: true, captureOwnPrivate: true, writeOwnShared: false,
    administerData: false, changeAuthority: false });
  assert.deepEqual(machineScopePolicy('memory:read memory:write'), { readShared: true, captureOwnPrivate: true, writeOwnShared: true,
    administerData: false, changeAuthority: false });
  assert.equal(machineScopePolicy('memory:read memory:write memory:admin').administerData, true);
  assert.equal(machineScopePolicy('memory:read memory:write memory:admin').changeAuthority, false);
  assert.throws(() => machineScopePolicy('all'), /invalid-input/);
});
