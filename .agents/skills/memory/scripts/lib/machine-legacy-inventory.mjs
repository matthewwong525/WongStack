// Read-only, trusted-process preparation. No provider transport, DDL or admission.
import { machineDataMigrations } from './machine-data-migrations.mjs';
import { readRuntimeState } from './machine-runtime-state.mjs';
import { runtimeContext } from '../../worker/machine-context.mjs';
import { normalizeCoreDdl } from '../../worker/machine-core-contract.mjs';
import { canonicalMemoryValue } from './installation-resources.mjs';
import { digest, exactKeys, opaqueId, requireValue, resourceTarget, accessConfiguration } from './installation-validation.mjs';
import { boundLegacyProjection, validateLegacySource, legacyReadback } from './machine-legacy-closure.mjs';

export const LEGACY_SELECTION_LIMIT = 20;
export const legacyHash = value => { boundLegacyProjection(value); return digest(JSON.stringify(canonicalMemoryValue(value))); };
export const legacyDigest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export const legacyText = (value, max = 200) => typeof value === 'string' && value.length > 0 && value.length <= max && !value.includes('\0');
const inventories = new WeakSet();
const shadowNames = ['facts_fts_data', 'facts_fts_idx', 'facts_fts_docsize', 'facts_fts_config'];
const supported = [1, 2, 3, 4, 5, 6, 10, 11, 14];
export function retainedLegacyInventory(value) { requireValue(inventories.has(value), 'legacy-inventory-unproven'); return value; }
export function freezeLegacy(value) {
 if (value && typeof value === 'object') { for (const item of Object.values(value)) freezeLegacy(item); Object.freeze(value); }
 return value;
}

// This recognizes only the grammar in the digest-pinned release files. It never
// accepts arbitrary SQL or executes a migration. Schema6's FTS rename is explicit.
export async function legacySchemaContract(readMigration, version) {
 requireValue(typeof readMigration === 'function' && supported.includes(version), 'schema-unsupported');
 const objects = new Map();
 for (const migration of machineDataMigrations.slice(0, version)) {
  const source = await legacyReadback(() => readMigration(migration.filename), 'migration-bundle-invalid');
  boundLegacyProjection(source);
  requireValue(typeof source === 'string' && await digest(source) === migration.sha256, 'migration-bundle-invalid');
  const sql = source.replace(/--[^\n]*/g, '');
  const statements = sql.match(/CREATE\s+(?:VIRTUAL\s+TABLE|TABLE|(?:UNIQUE\s+)?INDEX|VIEW)\b[^;]*;|CREATE\s+TRIGGER\b[\s\S]*?\bEND\s*;|ALTER\s+TABLE\b[^;]*;|DROP\s+(?:TABLE|TRIGGER)\b[^;]*;/gi) || [];
  for (let statement of statements) {
   statement = statement.trim().replace(/;$/, '').replace(/\bIF\s+(?:NOT\s+)?EXISTS\s+/gi, '');
   const create = statement.match(/^CREATE\s+(VIRTUAL\s+TABLE|TABLE|(?:UNIQUE\s+)?INDEX|TRIGGER|VIEW)\s+(\w+)/i);
   if (create) { objects.set(create[2], { type: /TABLE/i.test(create[1]) ? 'table' : /INDEX/i.test(create[1]) ? 'index' : create[1].toLowerCase(), sql: statement }); continue; }
   const drop = statement.match(/^DROP\s+(?:TABLE|TRIGGER)\s+(\w+)$/i);
   if (drop) { objects.delete(drop[1]); continue; }
   const add = statement.match(/^ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+([\s\S]+)$/i);
   if (add) {
    const previous = objects.get(add[1]); requireValue(previous?.type === 'table' && previous.sql.endsWith(')'), 'migration-bundle-invalid');
    objects.set(add[1], { ...previous, sql: previous.sql.slice(0, -1) + ', ' + add[2] + ')' }); continue;
   }
   requireValue(version >= 6 && /^ALTER\s+TABLE\s+facts_fts_new\s+RENAME\s+TO\s+facts_fts$/i.test(statement), 'migration-bundle-invalid');
   const previous = objects.get('facts_fts_new'); requireValue(previous, 'migration-bundle-invalid');
   objects.delete('facts_fts_new'); objects.set('facts_fts', { ...previous, sql: previous.sql.replace('facts_fts_new', 'facts_fts') });
  }
 }
 return Object.fromEntries([...objects].map(([name, row]) => [name, { ...row, sql: normalizeCoreDdl(row.sql) }]));
}
async function readRows(adapter, sql, params = []) {
 const rows = await legacyReadback(() => adapter.read(sql, params), 'legacy-read-unavailable');
 boundLegacyProjection(rows);
 requireValue(Array.isArray(rows) && rows.length <= 1000 && rows.every(row => row && typeof row === 'object' && !Array.isArray(row)), 'legacy-inventory-incomplete');
 return rows;
}
async function inspectSchema(adapter, expected) {
 const metadata = await readRows(adapter, 'SELECT name,type FROM sqlite_master ORDER BY name');
 requireValue(metadata.every(row => typeof row.name === 'string' && typeof row.type === 'string')
  && new Set(metadata.map(row => row.name)).size === metadata.length, 'legacy-schema-conflict');
 const actual = metadata.filter(row => !row.name.startsWith('sqlite_') && !row.name.startsWith('_cf_'));
 const ordinary = actual.filter(row => !shadowNames.includes(row.name));
 requireValue(ordinary.length === Object.keys(expected).length && ordinary.every(row => expected[row.name]?.type === row.type)
  && shadowNames.every(name => actual.filter(row => row.name === name && row.type === 'table').length === 1), 'legacy-schema-conflict');
 const objects = [];
 // Each response and hash input retains its own projection bound. These
 // sequential reads are review evidence, not a transaction snapshot; the
 // eventual15 mutation must independently revalidate the reviewed schema.
 for (const object of actual) {
  const rows = await readRows(adapter, 'SELECT name,type,sql FROM sqlite_master WHERE name=? AND type=?', [object.name, object.type]);
  requireValue(rows.length === 1 && rows[0].name === object.name && rows[0].type === object.type, 'legacy-schema-conflict');
  if (shadowNames.includes(object.name)) continue;
  const row = rows[0];
  requireValue(typeof row.sql === 'string' && normalizeCoreDdl(row.sql) === expected[row.name].sql, 'legacy-schema-conflict');
  objects.push({ name: row.name, objectHash: await legacyHash(expected[row.name]) });
 }
 return legacyHash(objects.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}
async function completedHistory(adapter, target, version) {
 const authority = {};
 for (const table of [...(version >= 2 ? ['memory_keys'] : []), ...(version >= 5 ? ['memory_admins'] : []),
  ...(version >= 10 && version !== 14 ? ['memory_principals', 'memory_providers', 'memory_identity_bindings', 'memory_memberships',
   'memory_invitations', 'memory_owner_intents', 'memory_login_candidates', 'memory_device_requests', 'memory_devices', 'memory_credentials',
   'memory_ownership_mappings', 'memory_legacy_evidence', 'memory_identity_reviews', 'memory_audit'] : [])]) authority[table] = await readRows(adapter, `SELECT * FROM ${table}`);
 if (version <= 6) return { installationId: null, repositoryId: null, kind: 'legacy-without-stable-ids', historyHash: await legacyHash({ version, authority }) };
 if (version === 14) {
  runtimeContext(adapter.machineContext, true);
  const state = await legacyReadback(() => readRuntimeState(adapter.machineContext), 'legacy-history-unavailable');
  requireValue(state.configuration.state === 'pending' && state.runtime.state === 'pending' && state.data?.configuration.state === 'pending'
   && JSON.stringify(state.target) === JSON.stringify(target), 'legacy-history-incomplete');
  return { installationId: state.installation.installationId, repositoryId: state.installation.repositoryId, kind: 'completed14',
   historyHash: await legacyHash({ baseline: state.baselineHash, snapshot: state.snapshot, bootstrap: state.data.bootstrap }) };
 }
 const installation = await readRows(adapter, 'SELECT * FROM memory_installation');
 const configuration = await readRows(adapter, 'SELECT * FROM memory_installation_configuration');
 const completion = await readRows(adapter, 'SELECT * FROM memory_bootstrap_completion');
 requireValue([installation, configuration, completion].every(rows => rows.length === 1), 'legacy-history-incomplete');
 const i = installation[0], c = configuration[0], b = completion[0];
 requireValue(opaqueId(i.installation_id) && opaqueId(i.repository_id) && i.singleton === 1 && i.minimum_protocol === 1 && i.state !== 'maintenance'
  && i.account_id === target.accountId && i.database_id === target.databaseId && i.bucket_name === target.bucketName && i.canonical_origin === target.appUrl
  && c.installation_id === i.installation_id && c.app_origin === target.appUrl && c.memory_origin === target.memoryOrigin
  && c.app_worker_name === target.appWorkerName && c.memory_worker_name === target.memoryWorkerName && opaqueId(c.operation_id)
  && c.pin_revision === 1 && Number.isSafeInteger(i.auth_revision) && i.auth_revision >= 1
  && ['pending', 'ready'].includes(i.state) && b.installation_id === i.installation_id && b.request_hash === c.request_hash, 'legacy-history-incomplete');
 let access; try { access = accessConfiguration(c.access_json === null ? null : JSON.parse(c.access_json)); } catch { requireValue(false, 'legacy-history-incomplete'); }
 requireValue(c.request_hash === await digest(JSON.stringify({ target, access, ownerEmail: c.owner_email })), 'legacy-history-incomplete');
 const audit = await readRows(adapter, 'SELECT * FROM memory_audit WHERE id=?', [b.audit_id]);
 requireValue(audit.length === 1 && audit[0].installation_id === i.installation_id && audit[0].actor_kind === 'operator'
  && audit[0].action === 'installation-initialized' && audit[0].target_id === i.installation_id && audit[0].result === 'allowed', 'legacy-history-incomplete');
 let receipt = null;
 let ownerHistory = null;
 if (version === 11) {
  const receipts = await readRows(adapter, 'SELECT * FROM memory_schema_receipts');
  requireValue(receipts.length === 1, 'legacy-history-incomplete'); receipt = receipts[0];
  requireValue(receipt.installation_id === i.installation_id && receipt.repository_id === i.repository_id && receipt.schema_version === 11
   && receipt.request_hash === c.request_hash && receipt.audit_id === b.audit_id
   && receipt.manifest_hash === await digest(JSON.stringify(machineDataMigrations.slice(0, 11))), 'legacy-history-incomplete');
  const attempts = await readRows(adapter, 'SELECT * FROM memory_owner_attempts');
  const completions = await readRows(adapter, 'SELECT * FROM memory_owner_completions');
  const reviews = await readRows(adapter, 'SELECT * FROM memory_owner_reviews');
  requireValue(attempts.length === completions.length && attempts.every(a => {
   const done = completions.find(value => value.attempt_id === a.id), review = reviews.find(value => value.id === a.review_id);
   const principal = authority.memory_principals.find(value => value.id === a.principal_id);
   const binding = authority.memory_identity_bindings.find(value => value.id === a.binding_id);
   const ownerAudit = authority.memory_audit.find(value => value.id === a.audit_id);
   return done && done.installation_id === i.installation_id && done.installation_id === a.installation_id && done.review_id === a.review_id
    && done.principal_id === a.principal_id && done.binding_id === a.binding_id && done.audit_id === a.audit_id
    && review?.state === 'consumed' && review.consumed_attempt_id === a.id && review.installation_id === i.installation_id
    && Number.isSafeInteger(review.auth_revision) && review.auth_revision < i.auth_revision && review.pin_revision === c.pin_revision
    && principal?.installation_id === i.installation_id && binding?.installation_id === i.installation_id && binding.principal_id === a.principal_id
    && authority.memory_memberships.some(value => value.installation_id === i.installation_id && value.repository_id === i.repository_id && value.principal_id === a.principal_id)
    && ownerAudit?.installation_id === i.installation_id && ownerAudit.actor_kind === 'operator' && ownerAudit.action === 'owner-confirmed'
    && ownerAudit.target_id === a.principal_id && ownerAudit.result === 'allowed';
  }) && reviews.every(review => review.installation_id === i.installation_id
   && (review.state === 'consumed' ? attempts.some(a => a.id === review.consumed_attempt_id && a.review_id === review.id) : review.consumed_attempt_id === null)), 'legacy-history-incomplete');
  ownerHistory = { attempts, completions, reviews };
 }
 requireValue(authority.memory_memberships.every(row => row.installation_id === i.installation_id && row.repository_id === i.repository_id
  && Number.isSafeInteger(row.revision) && row.revision >= 1 && authority.memory_principals.some(p => p.id === row.principal_id && p.installation_id === i.installation_id))
  && authority.memory_identity_bindings.every(row => row.installation_id === i.installation_id
   && authority.memory_principals.some(p => p.id === row.principal_id && p.installation_id === i.installation_id)
   && authority.memory_providers.some(p => p.id === row.provider_id && p.installation_id === i.installation_id && p.issuer === row.issuer)), 'legacy-history-incomplete');
 return { installationId: i.installation_id, repositoryId: i.repository_id, kind: `completed${version}`,
  historyHash: await legacyHash({ installation: i, configuration: c, completion: b, audit: audit[0], receipt, authority, ownerHistory }) };
}
function selection(input) {
 exactKeys(input, ['factIds', 'sessionIds', 'rawKeys']);
 for (const [name, values] of Object.entries(input)) requireValue(Array.isArray(values) && values.length <= LEGACY_SELECTION_LIMIT
  && new Set(values).size === values.length && values.every(value => name === 'factIds' ? Number.isSafeInteger(value) && value > 0 : legacyText(value, name === 'rawKeys' ? 1024 : 200)), 'legacy-selection-invalid');
 requireValue(Object.values(input).reduce((sum, values) => sum + values.length, 0) <= LEGACY_SELECTION_LIMIT, 'legacy-selection-invalid');
}
export async function inspectLegacyMemory(adapter, input) {
 boundLegacyProjection(input); exactKeys(input, ['target', 'selection']); const target = resourceTarget(input.target); selection(input.selection);
 requireValue(adapter && ['read', 'readMigration', 'inspectSource', 'inspectRaw'].every(name => typeof adapter[name] === 'function'), 'legacy-operator-required');
 const targetHash = await legacyHash(target), source = await legacyReadback(() => adapter.inspectSource(target), 'legacy-source-unavailable');
 exactKeys(source, ['targetHash', 'observationId', 'observedAt', 'resourceOwnershipHash', 'backupHash', 'serving', 'credentials', 'bucket']);
 requireValue(source.targetHash === targetHash && opaqueId(source.observationId) && Number.isSafeInteger(source.observedAt)
  && source.observedAt <= Math.floor(Date.now() / 1000) && Math.floor(Date.now() / 1000) - source.observedAt <= 120
  && legacyDigest(source.resourceOwnershipHash) && legacyDigest(source.backupHash), 'legacy-source-unproven');
 validateLegacySource(source);
 requireValue(source.serving.some(row => row.kind === 'canonical' && new URL(row.url).origin === target.memoryOrigin)
  && (target.bucketName === null ? source.bucket === null : source.bucket?.name === target.bucketName), 'legacy-source-unproven');
 const versions = await readRows(adapter, 'SELECT version FROM schema_migrations ORDER BY version');
 const version = versions.length;
 requireValue(supported.includes(version) && versions.every((row, index) => row.version === index + 1), 'schema-unsupported');
 const expected = await legacySchemaContract(adapter.readMigration, version);
 const schemaHash = await inspectSchema(adapter, expected);
 const keys = version >= 2 ? await readRows(adapter, 'SELECT hash FROM memory_keys ORDER BY hash') : [];
 const devices = version >= 10 ? await readRows(adapter, 'SELECT hash FROM memory_credentials ORDER BY hash') : [];
 for (const [kind, rows] of [['memory-key', keys], ['legacy-device', devices]]) {
  const ids = source.credentials.filter(row => row.kind === kind).map(row => row.id);
  requireValue(ids.length === rows.length && rows.every(row => ids.includes(row.hash)), 'legacy-credential-inventory-incomplete');
 }
 const history = await completedHistory(adapter, target, version);
 const records = [], sessions = new Map();
 for (const id of input.selection.sessionIds) {
  const rows = await readRows(adapter, 'SELECT * FROM sessions WHERE id=?', [id]); requireValue(rows.length === 1, 'legacy-selection-missing'); sessions.set(id, rows[0]);
  records.push({ kind: 'session', id, snapshotHash: await legacyHash(rows[0]), rawKey: rows[0].raw_key });
 }
 for (const id of input.selection.factIds) {
  const rows = await readRows(adapter, 'SELECT * FROM facts WHERE id=?', [id]); requireValue(rows.length === 1 && !rows[0].capture_attempt_id, 'legacy-selection-missing');
  const tags = await readRows(adapter, 'SELECT t.* FROM tags t JOIN fact_tags ft ON ft.tag=t.name WHERE ft.fact_id=? ORDER BY t.name', [id]);
  const f = rows[0]; requireValue(f.session_id === null || sessions.has(f.session_id), 'legacy-session-selection-required');
  records.push({ kind: 'fact', id, snapshotHash: await legacyHash({ fact: f, tags }), sessionId: f.session_id, type: f.type,
   visibility: ['user', 'feedback'].includes(f.type) || (version >= 4 && f.shared !== 1) ? 'private' : 'shared' });
 }
 for (const key of input.selection.rawKeys) {
  requireValue(target.bucketName !== null, 'legacy-raw-unavailable');
  const owners = [...sessions.values()].filter(row => row.raw_key === key);
  requireValue(owners.length === 1 && owners[0].status !== 'private', 'legacy-raw-session-required');
  const raw = await legacyReadback(() => adapter.inspectRaw(target, key), 'legacy-raw-unavailable');
  exactKeys(raw, ['key', 'contentHash', 'bytes', 'evidenceHash']);
  requireValue(raw.key === key && legacyDigest(raw.contentHash) && legacyDigest(raw.evidenceHash) && Number.isSafeInteger(raw.bytes)
   && raw.bytes >= 0 && raw.bytes <= 50 * 1024 * 1024 && raw.bytes === owners[0].raw_bytes, 'legacy-raw-unproven');
  records.push({ kind: 'raw', id: key, snapshotHash: await legacyHash(raw), sessionId: owners[0].id, contentHash: raw.contentHash, bytes: raw.bytes });
 }
 const counts = await readRows(adapter, 'SELECT (SELECT count(*) FROM facts) facts,(SELECT count(*) FROM sessions) sessions');
 requireValue(counts.length === 1 && ['facts', 'sessions'].every(key => Number.isSafeInteger(counts[0][key]) && counts[0][key] >= 0), 'legacy-inventory-incomplete');
 const value = { version: 1, status: 'review-only', target, targetHash, sourceVersion: version, schemaHash, history, source,
  selected: records, counts: counts[0], restrictions: 'unmapped-admin-only-no-ordinary-capture-adoption' };
 boundLegacyProjection(value);
 const inventory = freezeLegacy({ ...value, inventoryHash: await legacyHash(value) }); inventories.add(inventory); return inventory;
}
