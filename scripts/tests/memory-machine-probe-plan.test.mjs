import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { machineProbeAssets, planMachineMemoryProbe as plan } from '../pilots/memory-rest/machine-plan.mjs';
import { machineHash, machineManifestHash } from '../../.agents/skills/memory/scripts/lib/machine-state.mjs';
import { digest } from '../../.agents/skills/memory/scripts/lib/installation-validation.mjs';
import { TARGET } from './fixtures/memory/operator.mjs';

async function fixture() {
  const assets = await Promise.all(machineProbeAssets.map(async path => ({ path,
    sha256: await digest(readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')) })));
  const sourceRevision = 'b'.repeat(40), account = TARGET.accountId, databaseId = TARGET.databaseId, databaseName = 'new-machine-probe-memory';
  const snapshot = { sourceRevision, schemaVersion: 12, manifestHash: await machineManifestHash(), assetDigest: await machineHash(assets) };
  const input = { protocolVersion: 3, runId: 'c'.repeat(32), sourceRevision, snapshot, target: { accountId: account, databaseId, databaseName },
    pinHash: 'd'.repeat(64), phase: 'transport', phaseInput: null, priorEvidence: [] };
  const manifest = { version: 2, account, prefix: 'new-machine-probe', sourceGate: { sourceCommit: sourceRevision, requiredChecks: 'SUCCESS', snapshot, assets },
    resources: [{ kind: 'd1', id: databaseId, name: databaseName, environment: 'memory', status: 'created', receipt:
      { accountId: account, uuid: databaseId, name: databaseName, source: 'create-response' } }] };
  return { input, manifest };
}
const evidence = (f, phase) => ({ protocolVersion: 3, phase, status: 'observed-pass', sourceRevision: f.input.sourceRevision,
  snapshot: f.input.snapshot, target: f.input.target, pinHash: f.input.pinHash, planDigest: 'e'.repeat(64), evidenceDigest: 'f'.repeat(64) });
const initialization = f => ({ target: { ...TARGET }, operationId: 'probe-init'.padEnd(32,'0'), expectedInstallation: null, pinHash: f.input.pinHash });

test('machine probe is pure digest-bound schema12 preparation with separately planned phases', async () => {
  const f = await fixture(), first = await plan(f.manifest, f.input);
  assert.equal(first.protocolVersion, 3); assert.equal(first.snapshot.schemaVersion, 12); assert.equal(first.executionAuthorized, false);
  assert.equal(first.createsResources, false); assert.equal(first.integrationReleased, false); assert.equal(first.ready, false);
  assert.deepEqual(await plan(f.manifest, f.input), first);
  f.input.phase = 'initialization'; f.input.phaseInput = initialization(f); f.input.priorEvidence = [evidence(f,'transport')];
  const init = await plan(f.manifest, f.input); assert.notEqual(init.planDigest, first.planDigest);
  f.input.phase = 'grant'; f.input.phaseInput = { installation: { ...TARGET, installationId: 'i'.repeat(32), repositoryId: 'r'.repeat(32) },
    operationInputDigest: 'a'.repeat(64), pinHash: f.input.pinHash };
  f.input.priorEvidence.push(evidence(f,'initialization'));
  assert.equal((await plan(f.manifest, f.input)).phase, 'grant');
});

test('old protocol/schema11, mixed source/assets, incomplete source gates and changed snapshots never inherit evidence', async () => {
  for (const mutate of [f => { f.input.protocolVersion = 2; }, f => { f.manifest.version = 1; },
    f => { f.input.snapshot.schemaVersion = 11; }, f => { f.manifest.sourceGate.requiredChecks = 'PENDING'; },
    f => { f.input.sourceRevision = '1'.repeat(40); }, f => { f.input.snapshot.manifestHash = '0'.repeat(64); },
    f => { f.manifest.sourceGate.assets.pop(); }, f => { f.manifest.sourceGate.assets[0].sha256 = '0'.repeat(64); },
    f => { f.manifest.sourceGate.snapshot = { ...f.input.snapshot, assetDigest: '0'.repeat(64) }; }]) {
    const f = await fixture(); mutate(f); await assert.rejects(plan(f.manifest, f.input));
  }
});

test('original creation receipt must own exact memory D1, with no business resources or aliases', async () => {
  for (const mutate of [f => { f.manifest.resources[0].environment = 'production'; },
    f => { f.manifest.resources[0].receipt.source = 'get-readback'; }, f => { f.manifest.resources[0].receipt.uuid = 'other'; },
    f => { f.manifest.resources.push(structuredClone(f.manifest.resources[0])); },
    f => { f.input.target.databaseId = '99999999-2222-3333-4444-555555555555'; }, f => { f.manifest.prefix = 'other'; }]) {
    const f = await fixture(); mutate(f); await assert.rejects(plan(f.manifest, f.input));
  }
});

test('initialization/grant plans require individually matching observed phase evidence without releasing execution', async () => {
  const f = await fixture(); f.input.phase = 'initialization'; f.input.phaseInput = initialization(f);
  await assert.rejects(plan(f.manifest, f.input)); f.input.priorEvidence = [evidence(f,'transport')];
  assert.equal((await plan(f.manifest, f.input)).executionAuthorized, false);
  for (const changes of [{ protocolVersion: 2 }, { phase: 'initialization' }, { status: 'source-pass' }, { pinHash: '0'.repeat(64) },
    { sourceRevision: '0'.repeat(40) }, { snapshot: { ...f.input.snapshot, schemaVersion: 11 } }]) {
    const changed = { ...f.input, priorEvidence: [{ ...evidence(f,'transport'), ...changes }] };
    await assert.rejects(plan(f.manifest, changed));
  }
  await assert.rejects(plan(f.manifest, { ...f.input, phaseInput: { ...f.input.phaseInput, ownerIntent: { email: 'owner@example.com' } } }));
  await assert.rejects(plan(f.manifest, { ...f.input, phaseInput: { ...f.input.phaseInput, target: { ...TARGET, databaseId: '99999999-2222-3333-4444-555555555555' } } }));
});

test('incidental resource receipt fields and asset order do not change plan digests', async () => {
  const f = await fixture(), first = await plan(f.manifest, f.input);
  f.manifest.resources[0].receipt.providerTimestamp = 'unused'; f.manifest.sourceGate.assets.reverse();
  assert.deepEqual(await plan(f.manifest, f.input), first);
});
