import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { legacyFixture, hash } from './fixtures/memory/legacy-cutover.mjs';
import { inspectLegacyMemory, legacySchemaContract, legacyHash } from '../../.agents/skills/memory/scripts/lib/machine-legacy-inventory.mjs';
import { publicMachineContext } from '../../.agents/skills/memory/worker/machine-context.mjs';
import { coreFixture } from './fixtures/memory/core.mjs';
import { MemoryOperatorError } from '../../.agents/skills/memory/scripts/lib/installation-validation.mjs';
import { LEGACY_PROJECTION_BYTES } from '../../.agents/skills/memory/scripts/lib/machine-legacy-closure.mjs';
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
 const responses = [];
 const adapter = { ...legacy.adapter, machineContext: f.context, read: async (sql, params = []) => {
  const rows = f.db.prepare(sql).all(...params).map(row => ({ ...row })), bytes = Buffer.byteLength(JSON.stringify(rows));
  assert.ok(bytes <= LEGACY_PROJECTION_BYTES); responses.push({ sql, params, bytes, count: rows.length }); return rows;
 } };
 legacy.source.targetHash = await legacyHash(f.target);
 legacy.source.credentials = legacy.source.credentials.filter(row => row.kind !== 'memory-key');
 const wholeDdl = f.db.prepare('SELECT name,type,sql FROM sqlite_master ORDER BY name').all();
 assert.ok(Buffer.byteLength(JSON.stringify(wholeDdl)) > LEGACY_PROJECTION_BYTES);
 const expected = await legacySchemaContract(adapter.readMigration, 14), objects = [];
 for (const name of Object.keys(expected).sort()) objects.push({ name, objectHash: await legacyHash(expected[name]) });
 assert.ok(Buffer.byteLength(JSON.stringify(objects)) <= LEGACY_PROJECTION_BYTES);
 const inventory = await inspectLegacyMemory(adapter, { target: f.target, selection: { factIds: [], sessionIds: [], rawKeys: [] } });
 assert.equal(inventory.history.kind, 'completed14'); assert.equal(inventory.history.installationId, f.installation.installationId);
 assert.equal(inventory.schemaHash, await legacyHash(objects));
 assert.ok(responses.some(row => row.sql === 'SELECT name,type FROM sqlite_master ORDER BY name'));
 const ddlResponses = responses.filter(row => row.sql.includes('sql FROM sqlite_master'));
 assert.equal(ddlResponses.length, Object.keys(expected).length + 4);
 assert.ok(ddlResponses.every(row => row.sql === 'SELECT name,type,sql FROM sqlite_master WHERE name=? AND type=?' && row.params.length === 2 && row.count === 1));
 assert.deepEqual(new Set(ddlResponses.map(row => row.params[0])), new Set([...Object.keys(expected), 'facts_fts_data', 'facts_fts_idx', 'facts_fts_docsize', 'facts_fts_config']));
 const publicContext = publicMachineContext(f.env.MEMORY_DB, f.installation);
 await assert.rejects(inspectLegacyMemory({ ...adapter, machineContext: publicContext }, { target: f.target, selection: { factIds: [], sessionIds: [], rawKeys: [] } }), rejected('machine-context-denied'));
});
test('an oversized single-object DDL response refuses without lifting the projection cap', async t => {
 const f = await legacyFixture(t), before = f.db.prepare('SELECT name,type,sql FROM sqlite_master ORDER BY name').all();
 let oversizedBytes = 0;
 const adapter = { ...f.adapter, read: async (sql, params = []) => {
  const rows = await f.adapter.read(sql, params);
  if (sql === 'SELECT name,type,sql FROM sqlite_master WHERE name=? AND type=?' && params[0] === 'facts') {
   rows[0].sql += 'é'.repeat(LEGACY_PROJECTION_BYTES / 2); oversizedBytes = Buffer.byteLength(JSON.stringify(rows));
  }
  return rows;
 } };
 await assert.rejects(inspectLegacyMemory(adapter, { target: f.target, selection: f.selection }), rejected('legacy-projection-too-large'));
 assert.ok(oversizedBytes > LEGACY_PROJECTION_BYTES);
 assert.deepEqual(f.db.prepare('SELECT name,type,sql FROM sqlite_master ORDER BY name').all(), before);
 assert.ok(f.reads.every(row => row.sql.startsWith('SELECT ')));
});
test('single-object DDL readbacks must retain the exact object and release definition', async t => {
 const f = await legacyFixture(t);
 for (const mutate of [() => [], rows => [...rows, ...rows], rows => [{ ...rows[0], name: 'foreign_table' }],
  rows => [{ ...rows[0], type: 'view' }], rows => [{ ...rows[0], sql: 'CREATE TABLE facts(id INTEGER)' }]]) {
  const adapter = { ...f.adapter, read: async (sql, params = []) => {
   const rows = await f.adapter.read(sql, params);
   return sql === 'SELECT name,type,sql FROM sqlite_master WHERE name=? AND type=?' && params[0] === 'facts' ? mutate(rows) : rows;
  } };
  await assert.rejects(inspectLegacyMemory(adapter, { target: f.target, selection: f.selection }), rejected('legacy-schema-conflict'));
 }
});
test('schema commitments are deterministic across metadata order and bind every exact definition', async t => {
 const f = await legacyFixture(t), first = await inspect(f), expected = await legacySchemaContract(f.adapter.readMigration, 6);
 const sha256 = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
 const objects = Object.keys(expected).sort().map(name => ({ name, objectHash: sha256({ sql: expected[name].sql, type: expected[name].type }) }));
 assert.equal(first.schemaHash, sha256(objects));
 const reversed = { ...f.adapter, read: async (sql, params = []) => {
  const rows = await f.adapter.read(sql, params); return sql === 'SELECT name,type FROM sqlite_master ORDER BY name' ? rows.reverse() : rows;
 } };
 const second = await inspectLegacyMemory(reversed, { target: f.target, selection: f.selection });
 assert.equal(second.schemaHash, first.schemaHash); assert.equal(second.inventoryHash, first.inventoryHash);
 const changed = objects.map(row => row.name === 'facts' ? { ...row, objectHash: sha256({ sql: expected.facts.sql + ' changed', type: expected.facts.type }) } : row);
 assert.notEqual(first.schemaHash, sha256(changed));
});
test('malformed, duplicate, missing and foreign schema metadata refuse before reading object SQL', async t => {
 const f = await legacyFixture(t);
 for (const mutate of [rows => [{ ...rows[0], name: null }, ...rows.slice(1)], rows => [{ ...rows[0], type: null }, ...rows.slice(1)],
  rows => [...rows, rows[0]], rows => rows.filter(row => row.name !== 'facts'), rows => [...rows, { name: 'foreign_table', type: 'table' }]]) {
  let ddlReads = 0;
  const adapter = { ...f.adapter, read: async (sql, params = []) => {
   if (sql.includes('sql FROM sqlite_master')) ddlReads++;
   const rows = await f.adapter.read(sql, params); return sql === 'SELECT name,type FROM sqlite_master ORDER BY name' ? mutate(rows) : rows;
  } };
  await assert.rejects(inspectLegacyMemory(adapter, { target: f.target, selection: f.selection }), rejected('legacy-schema-conflict'));
  assert.equal(ddlReads, 0);
 }
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
