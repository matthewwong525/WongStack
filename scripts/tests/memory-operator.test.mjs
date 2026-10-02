import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeMemoryInstallation as initialize, readMemorySetupStatus as status, MemoryOperatorError } from '../../.agents/skills/memory/scripts/lib/installation-operator.mjs';
import { memoryMigrations } from '../../.agents/skills/memory/scripts/lib/installation-migrations.mjs';
import { digest } from '../../.agents/skills/memory/scripts/lib/installation-validation.mjs';
import { migrationFiles, migrationSql, applyMigrations } from './fixtures/memory/identity.mjs';
import { operatorFixture, inputFor, confirmFixtureOwner, OPERATION } from './fixtures/memory/operator.mjs';

const rejectsCode = (promise, code) => assert.rejects(promise, error => error instanceof MemoryOperatorError && error.message === code && error.code === code);
const tableCount = f => f.db.prepare("SELECT count(*) n FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").get().n;

test('initializer manifest matches every bundled forward migration exactly', async () => {
  assert.deepEqual(memoryMigrations.map(row => row.filename), migrationFiles());
  for (const [index, row] of memoryMigrations.entries()) {
    assert.equal(row.version, index + 1);
    assert.equal(await digest(migrationSql(row.filename)), row.sha256);
  }
});

for (const options of [{}, { standalone: true, bucket: false }]) test(`initializer pins one installation without creating authority ${JSON.stringify(options)}`, async t => {
  const f = operatorFixture(t, options); const input = inputFor(f);
  const result = await initialize(f.operator, input);
  assert.equal(result.schemaVersion, 10);
  assert.deepEqual(result.appliedMigrations, memoryMigrations.map(row => row.version));
  assert.equal(result.memory.status, 'pending-owner');
  assert.equal(result.memory.reason, 'owner-unconfirmed');
  assert.deepEqual(result.memory.action, { kind: 'confirm-owner', url: `${f.target.appUrl}/apps/devices/`, operatorConfirmationRequired: true });
  assert.equal(result.installation.memoryOrigin, f.target.memoryOrigin);
  assert.notEqual(result.installation.installationId, result.installation.repositoryId);
  for (const table of ['memory_principals', 'memory_memberships', 'memory_identity_bindings', 'memory_devices', 'memory_credentials', 'memory_keys', 'memory_admins'])
    assert.equal(f.db.prepare(`SELECT count(*) n FROM ${table}`).get().n, 0);
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_audit').get().n, 1);
  const retry = await initialize(f.operator, input);
  assert.deepEqual(retry.installation, result.installation);
  assert.deepEqual(retry.appliedMigrations, []);
  assert.equal(f.batches, 1);
  assert.deepEqual(await status(f.operator, { installation: result.installation }), { memory: result.memory });
  assert.equal(JSON.stringify(result).includes(input.ownerIntent.email), false);
  assert.equal(f.calls.filter(row => row.method !== 'GET').every(row => row.method === 'POST' && row.path.endsWith('/query')), true);
});

test('initializer requires matching receipt or expected IDs and never repins implicitly', async t => {
  const f = operatorFixture(t); const input = inputFor(f);
  const result = await initialize(f.operator, input);
  await rejectsCode(initialize(f.operator, { ...input, operationId: 'another-operation'.padEnd(32, '0') }), 'installation-conflict');
  const expectedInstallation = { installationId: result.installation.installationId, repositoryId: result.installation.repositoryId };
  const retry = await initialize(f.operator, { ...input, operationId: 'another-operation'.padEnd(32, '0'), expectedInstallation });
  assert.deepEqual(retry.installation, result.installation);
  for (const changes of [
    { ownerIntent: { email: 'different@example.com' } },
    { access: { ...input.access, providerConfigurationId: 'different-provider' } },
    { expectedInstallation: { ...expectedInstallation, repositoryId: 'x'.repeat(32) } },
    { access: null },
  ]) await rejectsCode(initialize(f.operator, { ...input, ...changes }), 'installation-conflict');
  await rejectsCode(status(f.operator, { installation: { ...result.installation, installationId: 'x'.repeat(32) } }), 'installation-conflict');
  assert.equal(f.batches, 1);
});

test('atomic initializer handles failure, response loss and competing retries', async t => {
  const f = operatorFixture(t); const input = inputFor(f);
  f.failAt = 20; // All ten SQL scripts/markers ran; no IDs should survive a later failure.
  await rejectsCode(initialize(f.operator, input), 'provider-unavailable');
  assert.equal(tableCount(f), 0);
  f.failAt = null; f.loseResponse = true;
  const result = await initialize(f.operator, input);
  assert.equal(result.memory.status, 'pending-owner');
  assert.deepEqual(result.appliedMigrations, []); // Lost receipt is recovered, never claimed as an observed write.
  assert.deepEqual((await initialize(f.operator, input)).installation, result.installation);
  const g = operatorFixture(t);
  const concurrent = await Promise.all([initialize(g.operator, inputFor(g)), initialize(g.operator, inputFor(g))]);
  assert.deepEqual(concurrent[0].installation, concurrent[1].installation);
  assert.equal(g.db.prepare('SELECT count(*) n FROM memory_installation').get().n, 1);
  const h = operatorFixture(t);
  const competing = await Promise.allSettled([initialize(h.operator, inputFor(h)), initialize(h.operator, { ...inputFor(h), operationId: 'different'.padEnd(32, '0') })]);
  assert.equal(competing.filter(row => row.status === 'fulfilled').length, 1);
  assert.equal(competing.find(row => row.status === 'rejected').reason.code, 'installation-conflict');
});

test('untrusted migration bytes fail before mutation, including a missing final migration', async t => {
  for (const readMigration of [async name => migrationSql(name) + '\n', async name => {
    if (name.startsWith('0010')) throw new Error('private path');
    return migrationSql(name);
  }, async () => null]) {
    const f = operatorFixture(t); f.operator.readMigration = readMigration;
    await rejectsCode(initialize(f.operator, inputFor(f)), 'migration-bundle-invalid');
    assert.equal(f.batches, 0); assert.equal(tableCount(f), 0);
  }
});

test('partial nontransactional provider writes never qualify as completed bootstrap', async t => {
  for (const failAt of [20, 22, 24, 25]) {
    const f = operatorFixture(t); f.atomic = false; f.failAt = failAt;
    await rejectsCode(initialize(f.operator, inputFor(f)), 'installation-conflict');
    assert.equal(f.db.prepare('SELECT count(*) n FROM memory_bootstrap_completion').get().n, 0);
    assert.equal(f.db.prepare('SELECT count(*) n FROM memory_principals').get().n, 0);
    const batches = f.batches;
    f.failAt = null;
    await rejectsCode(initialize(f.operator, inputFor(f)), 'installation-conflict');
    assert.equal(f.batches, batches); // Requires explicit inspection/recovery, never automatic adoption.
  }
});

test('bootstrap receipt is retained and provider retirement blocks progression', async t => {
  const f = operatorFixture(t); const result = await initialize(f.operator, inputFor(f));
  assert.throws(() => f.db.exec("UPDATE memory_bootstrap_completion SET request_hash = 'a'"), /immutable/);
  assert.throws(() => f.db.exec('DELETE FROM memory_bootstrap_completion'), /retained/);
  assert.throws(() => f.db.exec('DELETE FROM memory_installation_configuration'), /retained/);
  assert.throws(() => f.db.exec("UPDATE memory_installation_configuration SET owner_email = 'other@example.com'"), /explicit revision/);
  f.db.exec("UPDATE memory_providers SET status = 'retired'");
  const observed = await status(f.operator, { installation: result.installation });
  assert.equal(observed.memory.reason, 'access-unverified');
  assert.equal(observed.memory.action, null);
});

test('foreign and legacy stores require explicit migration; schema gaps and future versions fail closed', async t => {
  for (const prepare of [db => db.exec('CREATE TABLE foreign_business_data (id TEXT)'), db => applyMigrations(db)]) {
    const f = operatorFixture(t); prepare(f.db); const before = tableCount(f);
    await rejectsCode(initialize(f.operator, inputFor(f)), 'installation-conflict');
    assert.equal(tableCount(f), before); assert.equal(f.batches, 0);
  }
  const f = operatorFixture(t); const result = await initialize(f.operator, inputFor(f));
  f.db.exec("INSERT INTO schema_migrations VALUES (999, 'fixture')");
  await rejectsCode(status(f.operator, { installation: result.installation }), 'schema-unsupported');
  f.db.exec('DELETE FROM schema_migrations WHERE version IN (999, 3)');
  await rejectsCode(initialize(f.operator, inputFor(f)), 'schema-unsupported');
  const g = operatorFixture(t);
  await rejectsCode(initialize(g.operator, { ...inputFor(g), expectedInstallation: { installationId: 'i'.repeat(32), repositoryId: 'r'.repeat(32) } }), 'installation-conflict');
  assert.equal(g.batches, 0);
});

test('status without this machine proof remains pending even with confirmed owner and another device', async t => {
  const f = operatorFixture(t); const result = await initialize(f.operator, inputFor(f));
  const person = confirmFixtureOwner(f, result.installation);
  const { installationId, repositoryId } = result.installation;
  const now = Math.floor(Date.now() / 1000); const hash = 'f'.repeat(64); const request = 'r'.repeat(32); const device = 'd'.repeat(32);
  f.db.prepare(`INSERT INTO memory_device_requests (id, installation_id, repository_id, nonce_hash, secret_hash, credential_hash,
    comparison_code, label, scope, state, principal_id, membership_revision, approved_at, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, 'ABCD2345', 'Another machine', 'memory:read', 'approved', ?, 1, ?, ?, ?)`)
    .run(request, installationId, repositoryId, hash, hash, hash, person, now, now, now + 600);
  f.db.prepare(`INSERT INTO memory_devices (id, request_id, installation_id, repository_id, principal_id, label, scope, membership_revision, approved_at, reauthorize_at)
    VALUES (?, ?, ?, ?, ?, 'Another machine', 'memory:read', 1, ?, ?)`)
    .run(device, request, installationId, repositoryId, person, now, now + 7776000);
  f.db.prepare('INSERT INTO memory_credentials (hash, device_id, generation, issued_at, expires_at) VALUES (?, ?, 1, ?, ?)').run(hash, device, now, now + 2592000);
  let observed = await status(f.operator, { installation: result.installation });
  assert.equal(observed.memory.status, 'pending-device');
  assert.equal(observed.memory.reason, 'no-current-device');
  assert.equal(observed.memory.action.kind, 'connect-device');
  assert.equal(observed.memory.action.operatorConfirmationRequired, false);
  await rejectsCode(status(f.operator, { installation: result.installation, deviceId: device }), 'invalid-input');
  f.db.exec("UPDATE memory_installation SET state = 'maintenance'");
  observed = await status(f.operator, { installation: result.installation });
  assert.equal(observed.memory.reason, 'maintenance'); assert.equal(observed.memory.action, null);
  f.db.exec("UPDATE memory_installation SET state = 'pending'");
  f.db.prepare("UPDATE memory_memberships SET status = 'removed', revision = revision + 1 WHERE principal_id = ?").run(person);
  observed = await status(f.operator, { installation: result.installation });
  assert.equal(observed.memory.status, 'pending-owner');
  assert.equal(observed.memory.reason, 'owner-unconfirmed');
});

test('input validation rejects URLs, unknown proof fields, malformed IDs and private provider errors', async t => {
  const f = operatorFixture(t); const input = inputFor(f);
  for (const appUrl of ['http://fixture.example', f.target.appUrl + '/', f.target.appUrl + '?a=1', 'https://localhost', 'https://user:pass@fixture.example', 'https://fixture.example:8443', 'not-a-url'])
    await rejectsCode(initialize(f.operator, { ...input, target: { ...input.target, appUrl } }), 'invalid-input');
  for (const changes of [{ operationId: 'short' }, { ownerIntent: { email: 'invalid' } }, { target: { ...input.target, databaseId: 'wrong' } },
    { access: { ...input.access, issuer: 'https://evil.example' } }, { cloudRole: 'owner' }, { expectedInstallation: {} }])
    await rejectsCode(initialize(f.operator, { ...input, ...changes }), 'invalid-input');
  assert.equal(f.calls.length, 0);
  for (const [providerStatus, code] of [[403, 'operator-denied'], [404, 'target-mismatch'], [500, 'provider-unavailable']]) {
    f.intercept = async () => { throw Object.assign(new Error('DO NOT PRINT private-provider-secret'), { status: providerStatus }); };
    await rejectsCode(initialize(f.operator, input), code);
  }
  assert.equal(OPERATION.length, 32);
});
