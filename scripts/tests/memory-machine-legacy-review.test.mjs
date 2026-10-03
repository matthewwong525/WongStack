import test from 'node:test';
import assert from 'node:assert/strict';
import { legacyFixture, closureFor, hash, id } from './fixtures/memory/legacy-cutover.mjs';
import { inspectLegacyMemory, legacyHash } from '../../.agents/skills/memory/scripts/lib/machine-legacy-inventory.mjs';
import { reviewLegacyMemory } from '../../.agents/skills/memory/scripts/lib/machine-legacy-review.mjs';
import { inspectLegacyClosure } from '../../.agents/skills/memory/scripts/lib/machine-legacy-closure.mjs';
import { MemoryOperatorError } from '../../.agents/skills/memory/scripts/lib/installation-validation.mjs';
const rejected = code => error => error.code === code;
async function prepared(t, version = 6) {
 const f = await legacyFixture(t, version); f.inventory = await inspectLegacyMemory(f.adapter, { target: f.target, selection: f.selection }); return f;
}
test('exact decisions commit selected hashes/grant scope and never grant readiness', async t => {
 const f = await prepared(t, 11), input = f.reviewInput(f.inventory), before = f.db.prepare('SELECT * FROM sessions').all();
 const intent = await reviewLegacyMemory(f.adapter, f.inventory, input);
 assert.equal(intent.status, 'review-only'); assert.equal(intent.closure, null); assert.equal(intent.history.installationId, f.installation.installationId);
 assert.equal(intent.destination.grantId, f.destination.grantId); assert.equal(intent.unmapped, 'admin-only'); assert.equal(intent.requires.length, 3);
 assert.deepEqual(f.db.prepare('SELECT * FROM sessions').all(), before); assert.ok(Object.isFrozen(intent.destination));
 assert.doesNotMatch(JSON.stringify(intent), /"token"|"privateKey"|Original authored|"author"|"email"|pending-setup|"ready"/);
});
test('GET never becomes original creation; explicit adoption remains distinct', async t => {
 const f = await prepared(t); const input = f.reviewInput(f.inventory); input.ownership.method = 'GET';
 await assert.rejects(reviewLegacyMemory(f.adapter, f.inventory, input), rejected('legacy-ownership-unproven'));
 const g = await legacyFixture(t);
 g.ownership = { kind: 'reviewed-adoption', accountId: g.target.accountId, databaseId: g.target.databaseId, decisionId: id('adoption-decision'),
  operatorAuthorityHash: hash('a'), resourceReadbackHash: hash('b'), backupHash: g.source.backupHash, evidenceRef: 'private-adoption-evidence' };
 g.source.resourceOwnershipHash = await legacyHash(g.ownership); g.inventory = await inspectLegacyMemory(g.adapter, { target: g.target, selection: g.selection });
 const adopted = await reviewLegacyMemory(g.adapter, g.inventory, g.reviewInput(g.inventory));
 assert.equal(adopted.ownershipKind, 'reviewed-adoption'); assert.equal(adopted.history.installationId, null);
 assert.equal(adopted.status, 'review-only');
});
test('email/label inference, omitted/changed mappings, overlong evidence and foreign grants refuse', async t => {
 const f = await prepared(t, 10);
 for (const mutate of [input => { input.destination.email = 'old@example.com'; }, input => { input.mappings[0].evidenceType = 'email-match'; },
  input => { input.mappings.pop(); }, input => { input.mappings[0].snapshotHash = hash('f'); }, input => { input.destination.machineId = id('other-machine'); },
  input => { input.destination.installation.installationId = id('foreign-installation'); }, input => { input.mappings[0].evidenceRef = 'x'.repeat(201); },
  input => { input.unmapped = 'shared'; }, input => { input.destination.scope = 'memory:read'; }, input => { input.inventoryHash = hash('f'); }]) {
  const input = f.reviewInput(f.inventory); mutate(input); await assert.rejects(reviewLegacyMemory(f.adapter, f.inventory, input));
 }
 await assert.rejects(reviewLegacyMemory(f.adapter, structuredClone(f.inventory), f.reviewInput(f.inventory)), rejected('legacy-inventory-unproven'));
});
test('exact source readback seam validates all endpoint/credential classes while remaining review-only', async t => {
 const f = await prepared(t), input = f.reviewInput(f.inventory); input.closure = 'require-readbacks';
 const intent = await reviewLegacyMemory(f.adapter, f.inventory, input);
 assert.equal(intent.closure.status, 'review-only'); assert.match(intent.closure.closureHash, /^[a-f0-9]{64}$/);
 assert.equal(f.db.prepare('SELECT count(*) n FROM memory_keys').get().n, 1);
});
test('stale, partial, changed, redirected, leaking and ambiguous closure readbacks refuse', async t => {
 const f = await prepared(t);
 for (const mutate of [r => { r.serving.pop(); }, r => { r.credentials.pop(); }, r => { r.probes.pop(); },
  r => { r.probes[0].status = 200; }, r => { r.probes[0].redirected = true; }, r => { r.probes[0].memoryReturned = true; },
  r => { r.probes[0].revisionHash = hash('f'); }, r => { r.credentials[0].state = 'active'; },
  r => { r.credentials[0].replacementPermissionsHash = hash('f'); }, r => { r.serving[0].inventoryBindingHash = hash('f'); },
  r => { r.observedAt -= 121; }, r => { r.coverage.routes.pages[0].nextPage = 2; }, r => { r.probes.push(r.probes[0]); },
  r => { r.coverage.workers.ids.push('unreviewed-worker'); }, r => { r.serving[0].legacyServing = true; },
  r => { r.serving[1].routeEnabled = true; }, r => { r.serving[0].handlerSourceHash = hash('f'); },
  r => { r.bucket.publicAccessEnabled = true; }, r => { r.bucket.closedOrigins = []; }, r => { r.bucket.name = 'foreign-memory'; },
  r => { r.credentials[0].directMemoryStatus = 200; },
  r => { r.token = 'private-value'; }, r => { r.inventoryHash = hash('f'); }]) {
  const readback = closureFor(f); mutate(readback);
  await assert.rejects(inspectLegacyClosure({ inspectClosure: async () => readback }, f.inventory));
 }
 await assert.rejects(inspectLegacyClosure({}, f.inventory), rejected('legacy-closure-adapter-required'));
 const input = f.reviewInput(f.inventory); input.unexpected = 'x'.repeat(128 * 1024);
 await assert.rejects(reviewLegacyMemory(f.adapter, f.inventory, input), rejected('legacy-projection-too-large'));
});
test('no-bucket installations require honest absence instead of inferred public closure', async t => {
 const f = await legacyFixture(t); f.target.bucketName = null; f.destination.installation.bucketName = null;
 f.source.targetHash = await legacyHash(f.target); f.source.bucket = null;
 f.ownership.databaseId = f.target.databaseId; f.source.resourceOwnershipHash = await legacyHash(f.ownership);
 f.selection.rawKeys = []; f.inventory = await inspectLegacyMemory(f.adapter, { target: f.target, selection: f.selection });
 const result = await inspectLegacyClosure(f.adapter, f.inventory); assert.equal(result.status, 'review-only');
 const readback = closureFor(f); readback.bucket = { name: 'unexpected' };
 await assert.rejects(inspectLegacyClosure({ inspectClosure: async () => readback }, f.inventory), rejected('legacy-bucket-unproven'));
});
test('provider and service credentials cannot use database-key retirement actions', async t => {
 for (const kind of ['direct-provider', 'service-token']) for (const retirement of ['remove-key', 'revoke-device']) {
  const f = await legacyFixture(t); f.source.credentials[0].kind = kind; f.source.credentials[0].retirement = retirement;
  await assert.rejects(inspectLegacyMemory(f.adapter, { target: f.target, selection: f.selection }), rejected('legacy-closure-incomplete'));
 }
});
test('destination and closure transport errors never expose secret envelopes', async t => {
 const f = await prepared(t), sentinel = 'sentinel-secret-credential';
 for (const [name, code] of [['inspectDestination', 'legacy-destination-unavailable'], ['inspectClosure', 'legacy-closure-unavailable']]) {
  const input = f.reviewInput(f.inventory); input.closure = 'require-readbacks';
  for (const makeError of [() => new Error(sentinel), () => new MemoryOperatorError(sentinel)])
   await assert.rejects(reviewLegacyMemory({ ...f.adapter, [name]: async () => { throw makeError(); } }, f.inventory, input), error => {
    assert.equal(error.message, code); assert.equal(error.code, code); assert.equal(error.cause, undefined); assert.doesNotMatch(error.stack, /sentinel-secret/); return true;
   });
 }
 await assert.rejects(inspectLegacyClosure({ inspectClosure: async () => { throw new MemoryOperatorError('operator-denied'); } }, f.inventory), rejected('operator-denied'));
 const cyclic = {}; cyclic.self = cyclic;
 await assert.rejects(reviewLegacyMemory(f.adapter, f.inventory, cyclic), rejected('legacy-projection-invalid'));
});
