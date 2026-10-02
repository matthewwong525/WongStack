import { migrationManifestHash } from '../../.agents/skills/memory/scripts/lib/installation-state.mjs';
import { inspectResources, inspectProtection, protectionDigest } from '../../.agents/skills/memory/scripts/lib/installation-resources.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { planMemoryRestProbe, runRestTransportProbe, runMemoryInitializationProbe } from '../pilots/memory-rest/probe.mjs';
import { boundedTransport } from '../pilots/memory-rest/transport.mjs';
import { operatorFixture, inputFor } from './fixtures/memory/operator.mjs';

async function fixture(t) {
  const f = operatorFixture(t);
  const databaseName = 'fixture-project-memory';
  f.receipts.get(`/accounts/${f.target.accountId}/d1/database/${f.target.databaseId}`).name = databaseName;
  const resources = await inspectResources(f.operator, f.target);
  await inspectProtection(f.operator, f.target, f.access, resources);
  f.calls.length = 0;
  const input = { protocolVersion: 2, sourceRevision: 'b'.repeat(40), runId: 'c'.repeat(32),
    target: { accountId: f.target.accountId, databaseId: f.target.databaseId, databaseName }, initialization: inputFor(f) };
  input.snapshot = { sourceRevision: input.sourceRevision, schemaVersion: 11, manifestHash: await migrationManifestHash(), assetDigest: 'e'.repeat(64) };
  input.protectionDigest = await protectionDigest(resources);
  const manifest = { version: 1, account: f.target.accountId, prefix: 'fixture', sourceGate: { sourceCommit: input.sourceRevision, requiredChecks: 'SUCCESS', snapshot: structuredClone(input.snapshot) },
    resources: [{ kind: 'd1', environment: 'memory', id: f.target.databaseId, name: databaseName, status: 'created',
      receipt: { uuid: f.target.databaseId, name: databaseName, accountId: f.target.accountId, source: 'create-response' } }] };
  const records = [];
  const context = {
    readManifest: async () => structuredClone(manifest),
    readSnapshotReceipt: async () => structuredClone(input.snapshot),
    record: async value => {
      if (value.status === 'INTENT' && records.some(row => row.phase === value.phase && row.status === 'INTENT')) throw new Error('Phase already claimed');
      records.push(structuredClone(value));
    },
    readTransportEvidence: async () => records.find(row => row.phase === 'transport' && row.status === 'PASS'),
    cloudflare: async (method, path, body, options) => {
      assert.equal(options.signal instanceof AbortSignal, true);
      return f.operator.cloudflare(method, path, body);
    },
    readMigration: filename => f.operator.readMigration(filename),
  };
  return { ...f, input, manifest, context, records, original: f };
}
const objects = f => f.db.prepare("SELECT name FROM sqlite_master WHERE name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*'").all().map(row => row.name);

test('probe planning is read-only, scoped to an exact owned memory receipt and hides owner intent', async t => {
  const f = await fixture(t);
  const plan = await planMemoryRestProbe(f.manifest, f.input);
  assert.deepEqual(plan.phases, ['transport', 'initialization']);
  assert.equal(plan.executionAuthorized, false); assert.equal(plan.createsResources, false);
  assert.equal(plan.officialGuarantee, false); assert.equal(plan.integrationReleased, false);
  assert.equal(plan.target.environment, 'memory'); assert.equal(plan.planDigest.length, 64);
  assert.equal(JSON.stringify(plan).includes('owner@example.com'), false);
  assert.deepEqual(f.calls, []); assert.deepEqual(objects(f), []);
  const transportOnly = await planMemoryRestProbe(f.manifest, { ...f.input, initialization: null });
  assert.deepEqual(transportOnly.phases, ['transport']);
  assert.notEqual(transportOnly.planDigest, plan.planDigest);
});

test('plan refuses business databases, absent/ambiguous receipts, wrong gates and injected identifiers', async t => {
  const f = await fixture(t);
  const changes = [
    m => { m.resources[0].environment = 'production'; },
    m => { m.resources[0].environment = 'staging'; },
    m => { m.resources[0].status = 'creating'; },
    m => { delete m.resources[0].receipt; },
    m => { m.resources[0].receipt.uuid = 'foreign'; },
    m => { m.resources[0].receipt.accountId = 'foreign'; },
    m => { m.resources[0].receipt.source = 'get-readback'; },
    m => { m.resources.push({ ...m.resources[0] }); },
    m => { m.resources = []; },
    m => { m.sourceGate.requiredChecks = 'PENDING'; },
    m => { m.sourceGate.sourceCommit = 'f'.repeat(40); },
    m => { m.prefix = 'foreign'; },
  ];
  for (const mutate of changes) {
    const manifest = structuredClone(f.manifest); mutate(manifest);
    await assert.rejects(planMemoryRestProbe(manifest, f.input));
  }
  for (const change of [{ runId: "x'; DROP TABLE memory_installation;" }, { sourceRevision: 'main' },
    { target: { ...f.input.target, accountId: 'f'.repeat(32) } }, { target: { ...f.input.target, databaseId: 'foreign' } },
    { initialization: { ...f.input.initialization, expectedInstallation: {} } }])
    await assert.rejects(planMemoryRestProbe(f.manifest, { ...f.input, ...change }));
  assert.equal(f.calls.length, 0);
});

test('transport observes positive DDL/metadata and failed-batch rollback, then removes only owned probe tables', async t => {
  const f = await fixture(t); const plan = await planMemoryRestProbe(f.manifest, f.input);
  const result = await runRestTransportProbe(f.context, f.input, plan);
  assert.equal(result.status, 'PASS'); assert.equal(result.rollbackObserved, true);
  assert.equal(result.emptyAfterCleanup, true); assert.equal(result.officialGuarantee, false);
  assert.equal(result.integrationReleased, false); assert.deepEqual(objects(f), []);
  assert.deepEqual(f.records.map(row => row.status), ['INTENT', 'POSITIVE_OBSERVED', 'ROLLBACK_OBSERVED', 'CLEANUP_INTENT', 'PASS']);
  assert.equal(f.calls.every(row => row.path.startsWith(`/accounts/${f.target.accountId}/d1/database/${f.target.databaseId}`)), true);
  assert.equal(f.calls.length <= plan.limits.transportCalls, true);
  const calls = f.calls.length;
  await assert.rejects(runRestTransportProbe(f.context, f.input, plan), { code: 'evidence-write-failed' });
  assert.equal(f.calls.length, calls); // Atomic INTENT ownership prevents duplicate execution.
});

test('nontransactional REST behavior retains effects and never advances to initializer', async t => {
  const f = await fixture(t); f.original.atomic = false;
  const plan = await planMemoryRestProbe(f.manifest, f.input);
  await assert.rejects(runRestTransportProbe(f.context, f.input, plan), { code: 'rollback-left-effects' });
  assert.equal(objects(f).some(name => name.includes('_rollback_')), true);
  assert.equal(f.records.at(-1).retainForInspection, true);
  assert.equal(f.records.some(row => row.status === 'CLEANUP_INTENT'), false);
  assert.equal(objects(f).includes('memory_installation'), false);
  await assert.rejects(runMemoryInitializationProbe(f.context, f.input, plan), { code: 'transport-evidence-required' });
});

test('wrong provider identity and pre-existing data stop before probe writes', async t => {
  for (const prepare of [f => { f.receipts.get(`/accounts/${f.target.accountId}/d1/database/${f.target.databaseId}`).name = 'foreign'; },
    f => { f.db.exec('CREATE TABLE business (id TEXT)'); }]) {
    const f = await fixture(t); prepare(f);
    const plan = await planMemoryRestProbe(f.manifest, f.input);
    await assert.rejects(runRestTransportProbe(f.context, f.input, plan));
    assert.equal(f.original.batches, 0);
    assert.equal(f.records.at(-1).status, 'FAIL');
  }
});

test('an unrelated failure is not rollback evidence; raw provider errors never enter reports', async t => {
  const f = await fixture(t); const plan = await planMemoryRestProbe(f.manifest, f.input);
  f.original.intercept = async (method, path, body) => {
    if (body?.batch?.[0].sql.includes('_rollback_')) throw new Error('PRIVATE_PROVIDER_BODY_AND_SECRET');
  };
  await assert.rejects(runRestTransportProbe(f.context, f.input, plan), { code: 'expected-constraint-not-observed' });
  assert.equal(JSON.stringify(f.records).includes('PRIVATE_PROVIDER'), false);
  assert.equal(objects(f).some(name => name.includes('_ok_')), true);
  assert.equal(f.records.some(row => row.status === 'CLEANUP_INTENT'), false);
});

test('manifest/evidence changes and unavailable durable recording refuse before execution', async t => {
  const f = await fixture(t); const plan = await planMemoryRestProbe(f.manifest, f.input);
  await assert.rejects(runRestTransportProbe({ ...f.context, record: undefined }, f.input, plan), { code: 'private-context-required' });
  await assert.rejects(runRestTransportProbe({ ...f.context, readManifest: async () => { throw new Error('private'); } }, f.input, plan), { code: 'manifest-read-failed' });
  await assert.rejects(runRestTransportProbe(f.context, f.input, { ...plan, planDigest: 'x' }), { code: 'plan-changed' });
  await assert.rejects(runRestTransportProbe({ ...f.context, record: async () => { throw new Error('private'); } }, f.input, plan), { code: 'evidence-write-failed' });
  assert.equal(f.calls.length, 0);
});

test('bounded transport cannot write another DB, provision resources or exceed its call budget', async t => {
  const f = await fixture(t); const plan = await planMemoryRestProbe(f.manifest, f.input);
  const transport = boundedTransport(f.context, plan, 1);
  for (const [method, path] of [['POST', `/accounts/${f.target.accountId}/workers/scripts/new`], ['DELETE', `/accounts/${f.target.accountId}/d1/database/${f.target.databaseId}`],
    ['POST', `/accounts/${f.target.accountId}/d1/database/foreign/query`], ['GET', `/accounts/${'b'.repeat(32)}/workers/subdomain`],
    ['GET', `/accounts/${f.target.accountId}/tokens`], ['GET', `/accounts/${f.target.accountId}/d1/database/foreign`],
    ['GET', `/accounts/${f.target.accountId}/../tokens`]])
    await assert.rejects(transport(method, path), { code: 'transport-scope-denied' });
  await transport('GET', `/accounts/${f.target.accountId}/workers/subdomain`);
  await assert.rejects(transport('GET', `/accounts/${f.target.accountId}/workers/subdomain`), { code: 'request-budget-exhausted' });
  assert.equal(f.calls.length, 1);
});

test('source-only transport plan cannot authorize initializer, and an unreadable evidence record remains blocked', async t => {
  const f = await fixture(t); const input = { ...f.input, initialization: null };
  const plan = await planMemoryRestProbe(f.manifest, input);
  await assert.rejects(runMemoryInitializationProbe(f.context, input, plan), { code: 'initialization-input-required' });
  const full = await planMemoryRestProbe(f.manifest, f.input);
  await assert.rejects(runMemoryInitializationProbe({ ...f.context, readTransportEvidence: async () => { throw new Error('private file'); } }, f.input, full), { code: 'transport-evidence-required' });
  assert.equal(f.calls.length, 0);
});

test('separate initializer phase races actual canonical exports, recovers simulated response loss and retains pending state', async t => {
  const f = await fixture(t); const plan = await planMemoryRestProbe(f.manifest, f.input);
  await runRestTransportProbe(f.context, f.input, plan);
  assert.equal(objects(f).includes('memory_installation'), false);
  const result = await runMemoryInitializationProbe(f.context, f.input, plan);
  assert.equal(result.status, 'PASS'); assert.equal(result.simultaneousAttempts, 3);
  assert.equal(result.simulatedResponseLoss, true); assert.equal(result.stableRetry, true);
  assert.equal(result.conflictingOperationDenied, true); assert.equal(result.retainsInstallation, true);
  assert.equal(result.memory.status, 'pending-owner'); assert.equal(result.integrationReleased, false);
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_bootstrap_completion').get().n, 1);
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_principals').get().n, 0);
  assert.equal(JSON.stringify(f.records).includes('owner@example.com'), false);
  assert.equal(f.calls.every(row => row.method === 'GET' || row.method === 'POST' && row.path.endsWith('/query')), true);
});

test('initializer phase requires recorded same-plan transport PASS and closed protected Workers', async t => {
  const f = await fixture(t); const plan = await planMemoryRestProbe(f.manifest, f.input);
  await assert.rejects(runMemoryInitializationProbe(f.context, f.input, plan), { code: 'transport-evidence-required' });
  await runRestTransportProbe(f.context, f.input, plan);
  const receipt = f.records.find(row => row.status === 'PASS');
  for (const change of [{ status: 'FAIL' }, { sourceRevision: 'f'.repeat(40) }, { planDigest: 'foreign' }, { officialGuarantee: true }, { integrationReleased: true }])
    await assert.rejects(runMemoryInitializationProbe({ ...f.context, readTransportEvidence: async () => ({ ...receipt, ...change }) }, f.input, plan), { code: 'transport-evidence-required' });
  for (const row of f.workers.get(f.target.memoryWorkerName).app.destinations) row.overrides = [{ behavior: 'public', path_pattern: '/_memory/*' }];
  const changed = await inspectResources(f.operator, f.target);
  await inspectProtection(f.operator, f.target, f.access, changed);
  const openedInput = { ...f.input, protectionDigest: await protectionDigest(changed) };
  const openedPlan = await planMemoryRestProbe(f.manifest, openedInput);
  const openedContext = { ...f.context, readTransportEvidence: async () => ({ ...receipt, planDigest: openedPlan.planDigest, protectionDigest: openedPlan.protectionDigest }) };
  const before = f.original.batches;
  await assert.rejects(runMemoryInitializationProbe(openedContext, openedInput, openedPlan), { code: 'closed-access-required' });
  assert.equal(f.original.batches, before); assert.deepEqual(objects(f), []);
});

test('initializer preflight failure cancels competing attempts and retains any ambiguity', async t => {
  const f = await fixture(t); const plan = await planMemoryRestProbe(f.manifest, f.input);
  await runRestTransportProbe(f.context, f.input, plan);
  f.operator.readMigration = async () => { throw new Error('private migration path'); };
  const before = f.original.batches;
  await assert.rejects(runMemoryInitializationProbe(f.context, f.input, plan), { code: 'concurrency-not-observed' });
  assert.equal(f.original.batches, before);
  assert.equal(f.records.at(-1).retainForInspection, true);
  assert.equal(JSON.stringify(f.records).includes('private migration path'), false);
});

test('read-only CLI prints a plan and has no mutation or credential switch', async t => {
  const f = await fixture(t); const dir = mkdtempSync(join(tmpdir(), 'memory-probe-plan-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const manifest = join(dir, 'manifest.json'); const input = join(dir, 'input.json');
  writeFileSync(manifest, JSON.stringify(f.manifest)); writeFileSync(input, JSON.stringify(f.input));
  const cli = new URL('../pilots/memory-rest/probe.mjs', import.meta.url).pathname;
  const run = args => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  const planned = run(['--manifest', manifest, '--input', input]);
  assert.equal(planned.status, 0, planned.stderr);
  assert.equal(JSON.parse(planned.stdout).executionAuthorized, false);
  assert.notEqual(run(['--manifest', manifest, '--input', input, '--execute']).status, 0);
  assert.notEqual(run([]).status, 0);
  writeFileSync(input, 'invalid JSON private file content');
  const invalid = run(['--manifest', manifest, '--input', input]);
  assert.notEqual(invalid.status, 0); assert.equal(invalid.stderr.includes('private file content'), false);
  assert.deepEqual(f.calls, []);
});

test('schema11 plan rejects old protocol, wrong manifests and mixed snapshot receipts before transport', async t => {
  const f = await fixture(t);
  for (const change of [{ protocolVersion: 1 }, { snapshot: { ...f.input.snapshot, schemaVersion: 10 } },
    { snapshot: { ...f.input.snapshot, manifestHash: '0'.repeat(64) } }, { snapshot: { ...f.input.snapshot, sourceRevision: 'a'.repeat(40) } },
    { snapshot: { ...f.input.snapshot, assetDigest: 'a'.repeat(64) } }, { protectionDigest: null }]) {
    await assert.rejects(planMemoryRestProbe(f.manifest, { ...f.input, ...change }));
  }
  const plan = await planMemoryRestProbe(f.manifest, f.input);
  assert.equal(plan.protocolVersion, 2); assert.equal(plan.snapshot.schemaVersion, 11);
  await assert.rejects(runRestTransportProbe({ ...f.context, readSnapshotReceipt: undefined }, f.input, plan), { code: 'snapshot-verification-required' });
  await assert.rejects(runRestTransportProbe({ ...f.context, readSnapshotReceipt: async () => { throw new Error('private snapshot path'); } }, f.input, plan), { code: 'snapshot-verification-required' });
  await assert.rejects(runRestTransportProbe({ ...f.context, readSnapshotReceipt: async () => ({ ...f.input.snapshot, assetDigest: '0'.repeat(64) }) }, f.input, plan), { code: 'snapshot-mismatch' });
  await assert.rejects(runRestTransportProbe(f.context, f.input, { ...plan, protocolVersion: 1 }), { code: 'plan-changed' });
  assert.equal(f.calls.length, 0); assert.deepEqual(objects(f), []);
});

test('old phase evidence and changed actual deployment pins cannot release schema11 initialization', async t => {
  const f = await fixture(t); const plan = await planMemoryRestProbe(f.manifest, f.input);
  await runRestTransportProbe(f.context, f.input, plan);
  const evidence = f.records.find(row => row.status === 'PASS');
  for (const change of [{ protocolVersion: 1 }, { snapshot: { ...evidence.snapshot, schemaVersion: 10 } }, { protectionDigest: '0'.repeat(64) }]) {
    await assert.rejects(runMemoryInitializationProbe({ ...f.context, readTransportEvidence: async () => ({ ...evidence, ...change }) }, f.input, plan), { code: 'transport-evidence-required' });
  }
  f.workers.get(f.target.appWorkerName).policy.include.push({ email: { email: 'new@example.com' } });
  const before = f.original.batches;
  await assert.rejects(runMemoryInitializationProbe(f.context, f.input, plan), { code: 'protection-pins-changed' });
  assert.equal(f.original.batches, before); assert.deepEqual(objects(f), []);
});
