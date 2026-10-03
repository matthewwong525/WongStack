import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeMachineMemory as initialize, readMachineSetupStatus as status, inspectMachinePins } from '../../.agents/skills/memory/scripts/lib/machine-operator.mjs';
import { initializeMemoryInstallation } from '../../.agents/skills/memory/scripts/lib/installation-operator.mjs';
import { machineMigrations } from '../../.agents/skills/memory/scripts/lib/machine-migrations.mjs';
import { machineManifestHash } from '../../.agents/skills/memory/scripts/lib/machine-state.mjs';
import { migrationSql, applyMigrations } from './fixtures/memory/identity.mjs';
import { inputFor } from './fixtures/memory/operator.mjs';
import { completedSchema10 } from './fixtures/memory/schema10.mjs';
import { machineFixture, machineInput, preparedMachineFixture, codeRejected, attempt } from './fixtures/memory/machines.mjs';

for (const options of [{}, { standalone: true, bucket: false }]) test(`fresh machine12 is pending with separate exact receipts ${JSON.stringify(options)}`, async t => {
  const f = await preparedMachineFixture(t, options), result = f.initial;
  assert.equal(result.schemaVersion, 12); assert.equal(result.memory.protocolVersion, 2);
  assert.equal(result.memory.status, 'pending-setup'); assert.equal(result.memory.reason, 'machine-operation-proof-required');
  assert.equal(Object.hasOwn(result.memory, 'action'), false);
  for (const table of ['memory_principals','memory_memberships','memory_providers','memory_identity_bindings','memory_owner_intents',
    'memory_installation_configuration','memory_bootstrap_completion','memory_schema_receipts','memory_machine_grants','memory_machine_credentials'])
    assert.equal(f.db.prepare(`SELECT count(*) n FROM ${table}`).get().n, 0);
  const manifest = f.db.prepare('SELECT * FROM memory_machine_manifest_receipts').get();
  assert.equal(manifest.schema_version, 12); assert.equal(manifest.manifest_hash, await machineManifestHash());
  assert.equal(manifest.repository_id, result.installation.repositoryId);
  assert.notEqual(result.installation.installationId, result.installation.repositoryId);
  const retry = await initialize(f.operator, f.input);
  assert.deepEqual(retry.installation, result.installation); assert.deepEqual(retry.appliedMigrations, []); assert.equal(f.batches, 1);
  const expectedInstallation = { installationId: result.installation.installationId, repositoryId: result.installation.repositoryId };
  assert.deepEqual((await initialize(f.operator, { ...f.input, expectedInstallation })).installation, result.installation);
  assert.equal((await status(f.operator, { installation: f.installation })).memory.status, 'pending-setup');
});

test('completed10/11, foreign and partial stores refuse without any write or changed IDs/receipts', async t => {
  for (const prepare of [f => completedSchema10(f), f => initializeMemoryInstallation(f.operator, inputFor(f)),
    f => f.db.exec('CREATE TABLE foreign_data(id TEXT)'), f => applyMigrations(f.db, 9), f => applyMigrations(f.db, 12)]) {
    const f = machineFixture(t); await prepare(f); const input = await machineInput(f);
    const before = f.snapshot(), batches = f.batches;
    await assert.rejects(initialize(f.operator, input), error => ['schema-unsupported','installation-conflict'].includes(error.code));
    assert.deepEqual(f.snapshot(), before); assert.equal(f.batches, batches);
  }
});

test('future/gapped schema, missing machine table/guard or corrupted exact manifest/audit/bootstrap receipts refuse', async t => {
  for (const mutate of [f => f.db.exec("INSERT INTO schema_migrations VALUES(999,'fixture')"),
    f => f.db.exec('DELETE FROM schema_migrations WHERE version = 3'), f => f.db.exec('DROP TRIGGER memory_machine_attempt_barrier'),
    f => f.db.exec('DROP TABLE memory_machine_credentials'), f => f.db.exec('CREATE TABLE foreign_business_table(id TEXT)'), f => {
      f.db.exec('DROP TRIGGER memory_machine_manifest_receipts_immutable');
      f.db.prepare('UPDATE memory_machine_manifest_receipts SET manifest_hash = ?').run('0'.repeat(64));
      // Restore the exact guard so receipt validation is independently tested.
      const sql = migrationSql('0012_machine_authorization.sql').match(/CREATE TRIGGER memory_machine_manifest_receipts_immutable[\s\S]*?END;/)[0];
      f.db.exec(sql);
    }, f => {
      f.db.exec('DROP TRIGGER memory_machine_audit_immutable');
      f.db.exec("UPDATE memory_machine_audit SET target_id = 'wrong'");
      f.db.exec(migrationSql('0012_machine_authorization.sql').match(/CREATE TRIGGER memory_machine_audit_immutable[\s\S]*?END;/)[0]);
    }]) {
    const f = await preparedMachineFixture(t); mutate(f); const before = f.snapshot(), batches = f.batches;
    await assert.rejects(initialize(f.operator, f.input));
    await assert.rejects(status(f.operator, { installation: f.installation }));
    assert.deepEqual(f.snapshot(), before); assert.equal(f.batches, batches);
  }
});

test('initializer requires exact target/pin/request/operation and IDs; rejects unrecognized public authority hints', async t => {
  const f = await preparedMachineFixture(t); const batches = f.batches;
  for (const changes of [{ operationId: attempt('different') }, { expectedInstallation: { installationId: 'z'.repeat(32), repositoryId: 'r'.repeat(32) } },
    { pinHash: 'a'.repeat(64) }, { ownerIntent: { email: 'owner@example.com' } }, { cloudRole: 'owner' }, { machineProof: true },
    { target: { ...f.input.target, appUrl: f.input.target.appUrl + '/' } }]) await assert.rejects(initialize(f.operator, { ...f.input, ...changes }));
  await assert.rejects(status(f.operator, { installation: { ...f.installation, repositoryId: 'x'.repeat(32) } }), codeRejected('installation-conflict'));
  await assert.rejects(status(f.operator, { installation: f.installation, ready: true }), codeRejected('invalid-input'));
  assert.equal(f.batches, batches);
});

test('pins project only critical fields, sorted independently of provider decorations and Access policy email', async t => {
  const f = machineFixture(t);
  for (const w of f.workers.values()) {
    w.info.references.domains = [{ hostname: 'alias.fixture.example' }, { hostname: 'alias2.fixture.example' }];
    w.info.routes = [{ pattern: 'fixture.example/*' }, { pattern: 'fixture2.example/*' }];
  }
  const before = await inspectMachinePins(f.operator, f.target);
  for (const w of f.workers.values()) {
    w.info.references.domains.reverse().forEach(row => { row.created_on = 'incidental'; row.providerExtra = 'unused'; });
    w.info.routes.reverse().forEach(row => { row.id = 'incidental'; row.providerExtra = 'unused'; });
    w.settings.bindings.reverse(); w.active.resources.bindings.reverse(); w.policy.include = [{ email: { email: 'other@example.com' } }];
  }
  assert.equal(await inspectMachinePins(f.operator, f.target), before);
  const w = f.workers.get(f.target.memoryWorkerName);
  w.info.routes[0].pattern = 'changed.example/*'; assert.notEqual(await inspectMachinePins(f.operator, f.target), before);
  w.info.routes[0].pattern = 'fixture2.example/*';
  w.info.references.domains[0].hostname = 'changed.fixture.example'; assert.notEqual(await inspectMachinePins(f.operator, f.target), before);
});

test('active deployment/settings/resource changes deny instead of quietly repinning', async t => {
  for (const mutate of [f => f.setBinding(f.target.memoryWorkerName, 'MEMORY_DB', { type: 'd1', database_id: '99999999-2222-3333-4444-555555555555' }),
    f => f.setBinding(f.target.memoryWorkerName, 'WONG_ENVIRONMENT', { type: 'plain_text', text: 'staging' }),
    f => { f.workers.get(f.target.memoryWorkerName).active.resources.bindings[0].database_id = 'different'; },
    f => { f.workers.get(f.target.memoryWorkerName).deployment.deployments[0].versions[0].percentage = 50; },
    f => { f.workers.get(f.target.memoryWorkerName).info.references.domains = [{ hostname: 'another.fixture.example' }]; },
    f => f.setBinding(f.target.memoryWorkerName, 'CF_ACCESS_AUD', { type: 'plain_text', text: 'changed-audience' }),
    f => {
      const w = f.workers.get(f.target.memoryWorkerName), next = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
      w.deployment.deployments[0].versions[0].version_id = next;
      f.receipts.set(`/accounts/${f.target.accountId}/workers/scripts/${f.target.memoryWorkerName}/versions/${next}`,
        { ...structuredClone(w.active), id: next });
    }]) {
    const f = await preparedMachineFixture(t); mutate(f); const batches = f.batches;
    await assert.rejects(initialize(f.operator, f.input), codeRejected('target-mismatch'));
    assert.equal(f.batches, batches);
  }
});

test('missing/changed migration bytes and provider success without durable receipts never completes setup', async t => {
  for (const readMigration of [async file => migrationSql(file) + '\n', async () => null, async file => {
    if (file.startsWith('0012')) throw new Error('private-path'); return migrationSql(file);
  }]) {
    const f = machineFixture(t); const input = await machineInput(f); f.operator.readMigration = readMigration;
    await assert.rejects(initialize(f.operator, input), codeRejected('migration-bundle-invalid')); assert.equal(f.batches, 0);
  }
  const f = machineFixture(t); const input = await machineInput(f);
  f.intercept = async (method, path, body) => body?.batch ? [{ success: true, results: [] }] : undefined;
  await assert.rejects(initialize(f.operator, input), codeRejected('installation-conflict'));
  assert.equal(f.snapshot().length, 0);
});

test('every nontransactional bootstrap boundary remains closed and refuses automatic repair', async t => {
  const total = machineMigrations.length * 2 + 5;
  for (let failAt = 0; failAt < total; failAt++) {
    const f = machineFixture(t); f.atomic = false; f.failAt = failAt;
    const input = await machineInput(f); await assert.rejects(initialize(f.operator, input));
    const before = f.snapshot(), batches = f.batches;
    f.failAt = null;
    if (failAt === 0) { // No first statement ran: an empty store may start a new exact attempt.
      assert.equal(before.length, 0); continue;
    }
    await assert.rejects(initialize(f.operator, input));
    assert.deepEqual(f.snapshot(), before); assert.equal(f.batches, batches);
  }
});

test('atomic failure, identical/competing initializer races and lost response recover only exact durable receipt', async t => {
  const f = machineFixture(t), input = await machineInput(f); f.failAt = 25;
  await assert.rejects(initialize(f.operator, input)); assert.equal(f.snapshot().length, 0);
  f.failAt = null; f.loseResponse = true;
  const recovered = await initialize(f.operator, input);
  assert.deepEqual(recovered.appliedMigrations, []); assert.equal(recovered.memory.status, 'pending-setup');
  const g = machineFixture(t), same = await machineInput(g);
  const results = await Promise.all([initialize(g.operator, same), initialize(g.operator, same)]);
  assert.deepEqual(results[0].installation, results[1].installation);
  const h = machineFixture(t), one = await machineInput(h);
  const competing = await Promise.allSettled([initialize(h.operator, one), initialize(h.operator, { ...one, operationId: attempt('competing') })]);
  assert.equal(competing.filter(row => row.status === 'fulfilled').length, 1);
  assert.equal(h.db.prepare('SELECT count(*) n FROM memory_machine_bootstrap_completions').get().n, 1);
});
