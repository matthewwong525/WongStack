// Node-free schema12 state and exact durable receipt checks. No ordinary data API.
import { machineMigrations, machineSchemaVersion } from './machine-migrations.mjs';
import { digest, rows, requireValue, MemoryOperatorError } from './installation-validation.mjs';
import { canonicalMemoryValue } from './installation-resources.mjs';

export const machineManifestHash = () => digest(JSON.stringify(machineMigrations));
export const machineHash = value => digest(JSON.stringify(canonicalMemoryValue(value)));
export const machineTables = Object.freeze(['configuration', 'audit', 'manifest_receipts', 'bootstrap_completions',
  'attempts', 'grants', 'principals', 'credentials', 'completions'].map(name => `memory_machine_${name}`));
export const machineTriggers = Object.freeze([
  'attempt_barrier', 'attempt_close', 'configuration_guard', 'completion_guard', 'completion_release',
  'grant_transition', 'principal_transition', 'configuration_retained', 'grants_retained', 'principals_retained',
  'credentials_immutable', 'credentials_retained', 'grant_insert_guard', 'grant_update_guard',
  'principal_insert_guard', 'principal_update_guard', 'credential_insert_guard', 'completion_outcome_guard', 'audit_insert_guard',
  ...['audit', 'manifest_receipts', 'bootstrap_completions', 'attempts', 'completions'].flatMap(name => [`${name}_immutable`, `${name}_retained`]),
].map(name => `memory_machine_${name}`));

export async function trustedMachineMigrations(operator) {
  requireValue(typeof operator?.readMigration === 'function', 'migration-bundle-invalid');
  const statements = [];
  for (const migration of machineMigrations) {
    let sql;
    try { sql = await operator.readMigration(migration.filename); }
    catch { throw new MemoryOperatorError('migration-bundle-invalid'); }
    requireValue(typeof sql === 'string' && await digest(sql) === migration.sha256, 'migration-bundle-invalid');
    statements.push({ sql, params: [] }, { sql: 'INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (?, ?)',
      params: [migration.version, 'machine-bootstrap'] });
  }
  return statements;
}

const historicalTables = Object.freeze(['schema_migrations', 'sessions', 'facts', 'tags', 'fact_tags', 'facts_fts',
  'facts_fts_data', 'facts_fts_idx', 'facts_fts_docsize', 'facts_fts_config', 'runs', 'memory_keys', 'memory_admins',
  'memory_installation', 'memory_principals', 'memory_providers', 'memory_identity_bindings', 'memory_memberships',
  'memory_invitations', 'memory_owner_intents', 'memory_login_candidates', 'memory_device_requests', 'memory_devices',
  'memory_credentials', 'memory_csrf_proofs', 'memory_quotas', 'memory_audit', 'memory_ownership_mappings',
  'memory_legacy_evidence', 'memory_identity_reviews', 'memory_installation_configuration', 'memory_bootstrap_completion',
  'memory_schema_receipts', 'memory_owner_reviews', 'memory_owner_attempts', 'memory_owner_completions']);

export async function readMachineState(operator, target) {
  const names = (await rows(operator, target, "SELECT name FROM sqlite_master WHERE type = 'table'"))
    .map(row => row.name).filter(name => !name.startsWith('sqlite_') && !name.startsWith('_cf_'));
  if (!names.length) return null;
  requireValue(names.includes('schema_migrations'), 'installation-conflict');
  const versions = await rows(operator, target, 'SELECT version FROM schema_migrations ORDER BY version');
  requireValue(versions.length === 12 && versions.every((row, index) => row.version === index + 1), 'schema-unsupported');
  const expectedTables = [...historicalTables, ...machineTables];
  requireValue(expectedTables.length === names.length && expectedTables.every(name => names.includes(name)), 'installation-conflict');
  const triggers = await rows(operator, target, "SELECT name FROM sqlite_master WHERE type = 'trigger'");
  requireValue(machineTriggers.every(name => triggers.some(row => row.name === name)), 'installation-conflict');
  const states = await rows(operator, target, `SELECT c.*, i.account_id, i.database_id, i.bucket_name, i.canonical_origin, i.minimum_protocol
    FROM memory_machine_configuration c JOIN memory_installation i USING(installation_id, repository_id)
    JOIN memory_machine_bootstrap_completions b ON b.installation_id = c.installation_id
      AND b.operation_id = c.operation_id AND b.request_hash = c.request_hash AND b.pin_hash = c.pin_hash
    JOIN memory_machine_manifest_receipts m ON m.installation_id = c.installation_id AND m.repository_id = c.repository_id
      AND m.schema_version = ? AND m.manifest_hash = ? AND m.request_hash = c.request_hash AND m.audit_id = b.audit_id
    JOIN memory_machine_audit a ON a.id = b.audit_id AND a.installation_id = c.installation_id
      AND a.action = 'bootstrap' AND a.target_id = c.installation_id AND a.request_hash = c.request_hash AND a.attempt_id = c.operation_id`,
  [machineSchemaVersion, await machineManifestHash()]);
  requireValue(states.length === 1, 'installation-conflict');
  const state = states[0];
  requireValue(state.target_json === JSON.stringify(target) && state.account_id === target.accountId && state.database_id === target.databaseId
    && state.bucket_name === target.bucketName && state.canonical_origin === target.appUrl && state.minimum_protocol === 2, 'installation-conflict');
  return state;
}

export async function machineSnapshot(state) {
  return { authRevision: state.auth_revision, pinRevision: state.pin_revision,
    snapshotHash: await machineHash({ installationId: state.installation_id, repositoryId: state.repository_id,
      target: JSON.parse(state.target_json), requestHash: state.request_hash, pinHash: state.pin_hash,
      authRevision: state.auth_revision, pinRevision: state.pin_revision, state: state.state, barrier: state.barrier_attempt_id }) };
}

export function machineSetupResult(target, state) {
  return { memory: { protocolVersion: 2, installationId: state.installation_id, repositoryId: state.repository_id,
    appUrl: target.appUrl, memoryOrigin: target.memoryOrigin, status: state.state === 'maintenance' ? 'blocked' : 'pending-setup',
    reason: state.state === 'maintenance' ? 'incomplete-machine-operation' : 'machine-operation-proof-required' } };
}

export async function machineBootstrapStatements(target, input, requestHash, pinHash) {
  const installationId = crypto.randomUUID(), repositoryId = crypto.randomUUID(), auditId = crypto.randomUUID();
  return [{ sql: `INSERT INTO memory_installation(singleton, installation_id, repository_id, account_id, database_id,
    bucket_name, canonical_origin, minimum_protocol, created_at) VALUES(1, ?, ?, ?, ?, ?, ?, 2, unixepoch())`,
  params: [installationId, repositoryId, target.accountId, target.databaseId, target.bucketName, target.appUrl] },
  { sql: `INSERT INTO memory_machine_configuration(installation_id, repository_id, target_json, pin_hash, operation_id, request_hash, created_at)
    VALUES(?, ?, ?, ?, ?, ?, unixepoch())`, params: [installationId, repositoryId, JSON.stringify(target), pinHash, input.operationId, requestHash] },
  { sql: `INSERT INTO memory_machine_audit(id, installation_id, attempt_id, action, target_id, request_hash, created_at)
    VALUES(?, ?, ?, 'bootstrap', ?, ?, unixepoch())`, params: [auditId, installationId, input.operationId, installationId, requestHash] },
  { sql: `INSERT INTO memory_machine_manifest_receipts(installation_id, repository_id, schema_version, manifest_hash, request_hash, audit_id)
    VALUES(?, ?, 12, ?, ?, ?)`, params: [installationId, repositoryId, await machineManifestHash(), requestHash, auditId] },
  { sql: `INSERT INTO memory_machine_bootstrap_completions(installation_id, operation_id, request_hash, pin_hash, audit_id)
    SELECT c.installation_id, c.operation_id, c.request_hash, c.pin_hash, a.id FROM memory_machine_configuration c
    JOIN memory_machine_audit a ON a.installation_id = c.installation_id AND a.action = 'bootstrap'
      AND a.attempt_id = c.operation_id AND a.request_hash = c.request_hash AND a.target_id = c.installation_id
    JOIN memory_machine_manifest_receipts m ON m.installation_id = c.installation_id AND m.repository_id = c.repository_id
      AND m.audit_id = a.id AND m.request_hash = c.request_hash AND m.schema_version = 12 AND m.manifest_hash = ?
    WHERE c.installation_id = ? AND c.operation_id = ? AND c.request_hash = ? AND c.pin_hash = ?
      AND c.auth_revision = 1 AND c.pin_revision = 1 AND c.state = 'pending' AND c.barrier_attempt_id IS NULL`,
  params: [await machineManifestHash(), installationId, input.operationId, requestHash, pinHash] }];
}
