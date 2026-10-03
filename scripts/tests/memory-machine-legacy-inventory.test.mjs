import test from 'node:test';
import assert from 'node:assert/strict';
import { legacyFixture, hash } from './fixtures/memory/legacy-cutover.mjs';
import { inspectLegacyMemory, legacySchemaContract, legacyHash } from '../../.agents/skills/memory/scripts/lib/machine-legacy-inventory.mjs';
import { publicMachineContext } from '../../.agents/skills/memory/worker/machine-context.mjs';
import { coreFixture } from './fixtures/memory/core.mjs';
import { MemoryOperatorError } from '../../.agents/skills/memory/scripts/lib/installation-validation.mjs';
const rejected = code => error => error.code === code;
const inspect = f => inspectLegacyMemory(f.adapter, { target: f.target, selection: f.selection });

for (const version of [1, 2, 3, 4, 5, 6, 10, 11]) test(`exact historical${version} inventory is read-only and preserves authored data`, async t => {
 const f = await legacyFixture(t, version), before = f.db.prepare('SELECT * FROM facts').all();
 const inventory = await inspect(f);
 assert.equal(inventory.status, 'review-only'); assert.equal(inventory.sourceVersion, version); assert.equal(inventory.selected.length, 4);
 assert.equal(inventory.selected.find(row => row.kind === 'fact' && row.id === 2).visibility, 'private');
 assert.equal(inventory.history.installationId, version <= 6 ? null : f.installation.installationId);
 assert.equal(inventory.history.repositoryId, version <= 6 ? null : f.installation.repositoryId);
 assert.deepEqual(f.db.prepare('SELECT * FROM facts').all(), before);
 assert.ok(f.reads.every(row => row.sql.startsWith('SELECT ')));
 assert.doesNotMatch(JSON.stringify(inventory), /Original authored|Original private|old-label|"email"|"author"/);
 assert.ok(Object.isFrozen(inventory.selected)); assert.equal(inventory.counts.facts, 2);
});
test('schema14 inventory validates genuine baseline receipts without relabeling captures', async t => {
 const f = await coreFixture(t), legacy = await legacyFixture(t);
 const adapter = { ...legacy.adapter, machineContext: f.context, read: async (sql, params = []) => f.db.prepare(sql).all(...params).map(row => ({ ...row })) };
 legacy.source.targetHash = await legacyHash(f.target);
 legacy.source.credentials = legacy.source.credentials.filter(row => row.kind !== 'memory-key');
 const inventory = await inspectLegacyMemory(adapter, { target: f.target, selection: { factIds: [], sessionIds: [], rawKeys: [] } });
 assert.equal(inventory.history.kind, 'completed14'); assert.equal(inventory.history.installationId, f.installation.installationId);
 const publicContext = publicMachineContext(f.env.MEMORY_DB, f.installation);
 await assert.rejects(inspectLegacyMemory({ ...adapter, machineContext: publicContext }, { target: f.target, selection: { factIds: [], sessionIds: [], rawKeys: [] } }), rejected('machine-context-denied'));
});
test('gaps, incomplete installation, future or foreign schema refuse with no writes', async t => {
 for (const mutate of [f => f.db.exec('DELETE FROM schema_migrations WHERE version=3'),
  f => f.db.exec("INSERT INTO schema_migrations VALUES(999,'fixture')"), f => f.db.exec('CREATE TABLE foreign_table(id TEXT)'),
  f => f.db.exec('DROP TRIGGER facts_never_edited')]) {
  const f = await legacyFixture(t); mutate(f); await assert.rejects(inspect(f)); assert.ok(f.reads.every(row => row.sql.startsWith('SELECT ')));
 }
 for (const version of [10, 11]) {
  const f = await legacyFixture(t, version);
  f.db.exec("UPDATE memory_installation SET state='maintenance'"); await assert.rejects(inspect(f), rejected('legacy-history-incomplete'));
 }
 const f = await legacyFixture(t, 11); f.db.exec("UPDATE memory_installation SET minimum_protocol=2");
 await assert.rejects(inspect(f), rejected('legacy-history-incomplete'));
});
test('source bundle, selection bounds, missing provenance and raw bytes refuse explicitly', async t => {
 const f = await legacyFixture(t);
 await assert.rejects(inspectLegacyMemory({ ...f.adapter, readMigration: async () => 'changed SQL' }, { target: f.target, selection: f.selection }), rejected('migration-bundle-invalid'));
 await assert.rejects(legacySchemaContract(f.adapter.readMigration, 9), rejected('schema-unsupported'));
 for (const selection of [{ ...f.selection, factIds: [1, 1] }, { ...f.selection, factIds: Array.from({ length: 21 }, (_, i) => i + 1) },
  { ...f.selection, rawKeys: ['x'.repeat(1025)] }, { ...f.selection, unknown: true }]) await assert.rejects(inspectLegacyMemory(f.adapter, { target: f.target, selection }));
 await assert.rejects(inspectLegacyMemory(f.adapter, { target: f.target, selection: { ...f.selection, sessionIds: [] } }), rejected('legacy-session-selection-required'));
 await assert.rejects(inspectLegacyMemory({ ...f.adapter, inspectRaw: async (_target, key) => ({ key, contentHash: hash('a'), bytes: 3, evidenceHash: hash('b') }) }, { target: f.target, selection: f.selection }));
 f.source.credentials = f.source.credentials.filter(row => row.kind !== 'memory-key'); await assert.rejects(inspect(f), rejected('legacy-credential-inventory-incomplete'));
});
test('stale/future source readbacks and configuration repins require separate review', async t => {
 for (const offset of [-121, 30]) {
  const f = await legacyFixture(t); f.source.observedAt += offset;
  await assert.rejects(inspect(f), rejected('legacy-source-unproven'));
 }
 const f = await legacyFixture(t, 11); f.db.exec('UPDATE memory_installation_configuration SET pin_revision=pin_revision+1');
 await assert.rejects(inspect(f), rejected('legacy-history-incomplete'));
});
test('historical removals remain hashed and partial owner review attempts stay closed', async t => {
 const f = await legacyFixture(t, 11), first = await inspect(f), principal = 'removed-principal'.padEnd(32, '0');
 f.db.prepare("INSERT INTO memory_principals(id,installation_id,status,created_at) VALUES(?,?,'removed',1)").run(principal, f.installation.installationId);
 f.db.prepare("INSERT INTO memory_memberships(installation_id,repository_id,principal_id,role,status,created_at,updated_at) VALUES(?,?,?,'member','removed',1,1)")
  .run(f.installation.installationId, f.installation.repositoryId, principal);
 const removed = await inspect(f); assert.notEqual(first.history.historyHash, removed.history.historyHash);
 assert.equal(f.db.prepare('SELECT status FROM memory_principals WHERE id=?').get(principal).status, 'removed');
 f.db.prepare(`INSERT INTO memory_owner_reviews(id,installation_id,candidate_id,snapshot_hash,target_hash,protection_hash,code_hash,auth_revision,pin_revision,created_at,expires_at)
  VALUES(?,?,'missing-candidate',?,?,?,?,1,1,1,100)`).run('partial-review'.padEnd(32, '0'), f.installation.installationId, hash('a'), hash('b'), hash('c'), hash('d'));
 f.db.prepare(`INSERT INTO memory_owner_attempts(id,installation_id,review_id,request_hash,principal_id,binding_id,audit_id,created_at)
  VALUES(?,?,?,?,?,'partial-binding','partial-audit',1)`).run('partial-attempt'.padEnd(32, '0'), f.installation.installationId, 'partial-review'.padEnd(32, '0'), hash('e'), principal);
 await assert.rejects(inspect(f), rejected('legacy-history-incomplete'));
});
test('review inventory commits exact tags and immutable original session/raw path', async t => {
 const f = await legacyFixture(t), first = await inspect(f);
 f.db.exec("INSERT INTO tags(name,definition,created_at) VALUES('extra','Another original tag','fixture'); INSERT INTO fact_tags VALUES(1,'extra')");
 const second = await inspect(f); assert.notEqual(first.inventoryHash, second.inventoryHash);
 assert.notEqual(first.selected.find(row => row.kind === 'fact' && row.id === 1).snapshotHash, second.selected.find(row => row.kind === 'fact' && row.id === 1).snapshotHash);
 assert.equal(second.selected.find(row => row.kind === 'session').rawKey, 'old@example.com/raw/session');
});
test('read-only adapter errors discard sentinel secret messages and retain safe refusal codes', async t => {
 const f = await legacyFixture(t), sentinel = 'sentinel-secret-credential';
 for (const [name, code] of [['read', 'legacy-read-unavailable'], ['readMigration', 'migration-bundle-invalid'],
  ['inspectSource', 'legacy-source-unavailable'], ['inspectRaw', 'legacy-raw-unavailable']]) {
  for (const makeError of [() => new Error(sentinel), () => new MemoryOperatorError(sentinel), () => {
   const error = new MemoryOperatorError('operator-denied'); error.message = sentinel; error.cause = { token: sentinel }; return error;
  }]) await assert.rejects(inspectLegacyMemory({ ...f.adapter, [name]: async () => { throw makeError(); } }, { target: f.target, selection: f.selection }), error => {
   assert.ok([code, 'operator-denied'].includes(error.code)); assert.equal(error.message, error.code); assert.equal(error.cause, undefined); assert.doesNotMatch(error.stack, /sentinel-secret/); return true;
  });
 }
 await assert.rejects(inspectLegacyMemory({ ...f.adapter, read: async () => { throw new MemoryOperatorError('operator-denied'); } }, { target: f.target, selection: f.selection }), rejected('operator-denied'));
 for (const input of [undefined, null, {}, { target: f.target, selection: { factIds: [], sessionIds: [], rawKeys: [], secret: sentinel } }])
  await assert.rejects(inspectLegacyMemory(f.adapter, input), error => { assert.ok(error instanceof MemoryOperatorError); assert.doesNotMatch(error.message, /sentinel-secret/); return true; });
});
