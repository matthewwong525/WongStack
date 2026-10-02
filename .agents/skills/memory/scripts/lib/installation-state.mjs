import { memoryMigrations, memorySchemaVersion } from './installation-migrations.mjs';
import { requireValue, opaqueId, digest, rows, MemoryOperatorError } from './installation-validation.mjs';

export async function readInstallation(operator, target) {
  const tables = await rows(operator, target, "SELECT name FROM sqlite_master WHERE type = 'table'");
  requireValue(tables.every(row => typeof row.name === 'string'), 'provider-unavailable');
  const names = tables.map(row => row.name).filter(name => !name.startsWith('sqlite_') && !name.startsWith('_cf_'));
  if (!names.length) return null;
  requireValue(['memory_installation_configuration', 'memory_bootstrap_completion', 'schema_migrations'].every(name => names.includes(name)), 'installation-conflict');
  const versions = await rows(operator, target, 'SELECT version FROM schema_migrations ORDER BY version');
  requireValue(versions.length === memoryMigrations.length && versions.every((row, index) => row.version === memoryMigrations[index].version), 'schema-unsupported');
  const state = await rows(operator, target, `SELECT i.*, c.app_origin, c.memory_origin, c.app_worker_name, c.memory_worker_name,
    c.operation_id, c.request_hash, c.owner_email, c.access_json, c.pin_revision
    FROM memory_installation i JOIN memory_installation_configuration c USING (installation_id)
    JOIN memory_bootstrap_completion done ON done.installation_id = i.installation_id AND done.request_hash = c.request_hash
    JOIN memory_audit audit ON audit.id = done.audit_id AND audit.installation_id = i.installation_id
      AND audit.actor_kind = 'operator' AND audit.action = 'installation-initialized'
      AND audit.target_id = i.installation_id AND audit.result = 'allowed'`);
  requireValue(state.length === 1, 'installation-conflict');
  const value = state[0];
  requireValue(opaqueId(value.installation_id) && opaqueId(value.repository_id) && ['pending', 'maintenance', 'ready'].includes(value.state), 'installation-conflict');
  requireValue(value.account_id === target.accountId && value.database_id === target.databaseId && value.bucket_name === target.bucketName &&
    value.canonical_origin === target.appUrl && value.app_origin === target.appUrl && value.memory_origin === target.memoryOrigin &&
    value.app_worker_name === target.appWorkerName && value.memory_worker_name === target.memoryWorkerName && value.minimum_protocol === 1, 'installation-conflict');
  return value;
}

export async function trustedMigrations(operator) {
  requireValue(typeof operator?.readMigration === 'function');
  const statements = [];
  for (const migration of memoryMigrations) {
    let sql;
    try { sql = await operator.readMigration(migration.filename); }
    catch { throw new MemoryOperatorError('migration-bundle-invalid'); }
    requireValue(typeof sql === 'string' && await digest(sql) === migration.sha256, 'migration-bundle-invalid');
    statements.push({ sql, params: [] }, {
      sql: 'INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)',
      params: [migration.version, new Date().toISOString()],
    });
  }
  return statements;
}

export function bootstrapStatements(target, input, requestHash, installationId, repositoryId) {
  const now = Math.floor(Date.now() / 1000);
  const auditId = crypto.randomUUID();
  const statements = [{
    sql: `INSERT INTO memory_installation (singleton, installation_id, repository_id, account_id, database_id, bucket_name, canonical_origin, created_at)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
    params: [installationId, repositoryId, target.accountId, target.databaseId, target.bucketName, target.appUrl, now],
  }, {
    sql: `INSERT INTO memory_installation_configuration
      (installation_id, app_origin, memory_origin, app_worker_name, memory_worker_name, operation_id, request_hash, owner_email, access_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params: [installationId, target.appUrl, target.memoryOrigin, target.appWorkerName, target.memoryWorkerName,
      input.operationId, requestHash, input.ownerEmail, input.access === null ? null : JSON.stringify(input.access), now],
  }];
  if (input.access !== null) statements.push({
    sql: "INSERT INTO memory_providers (id, installation_id, issuer, audience, status, created_at) VALUES (?, ?, ?, ?, 'active', ?)",
    params: [input.access.providerConfigurationId, installationId, input.access.issuer, input.access.audience, now],
  }, {
    sql: 'INSERT INTO memory_owner_intents (installation_id, provider_id, email, created_at) VALUES (?, ?, ?, ?)',
    params: [installationId, input.access.providerConfigurationId, input.ownerEmail, now],
  });
  statements.push({
    sql: `INSERT INTO memory_audit (id, installation_id, actor_kind, action, target_id, result, created_at)
      VALUES (?, ?, 'operator', 'installation-initialized', ?, 'allowed', ?)`,
    params: [auditId, installationId, installationId, now],
  }, {
    sql: `INSERT INTO memory_bootstrap_completion (installation_id, request_hash, audit_id)
      SELECT c.installation_id, c.request_hash, ? FROM memory_installation_configuration c
      JOIN memory_installation i ON i.installation_id = c.installation_id
      WHERE c.installation_id = ? AND c.request_hash = ? AND (c.access_json IS NULL OR EXISTS (
        SELECT 1 FROM memory_providers v JOIN memory_owner_intents intent ON intent.installation_id = v.installation_id AND intent.provider_id = v.id
        WHERE v.installation_id = c.installation_id AND v.id = json_extract(c.access_json, '$.providerConfigurationId')
          AND v.issuer = json_extract(c.access_json, '$.issuer') AND v.audience = json_extract(c.access_json, '$.audience')
          AND v.status = 'active' AND intent.state = 'pending' AND intent.email = c.owner_email))`,
    params: [auditId, installationId, requestHash],
  });
  return statements;
}

export async function setupResult(operator, target, state, blocked, access) {
  if (access !== null) {
    const providers = await rows(operator, target, `SELECT id FROM memory_providers WHERE installation_id = ?
      AND id = ? AND issuer = ? AND audience = ? AND status = 'active'`,
    [state.installation_id, access.providerConfigurationId, access.issuer, access.audience]);
    if (providers.length !== 1) blocked ||= 'access-unverified';
  }
  const owners = await rows(operator, target, `SELECT m.principal_id FROM memory_memberships m
    JOIN memory_principals p ON p.id = m.principal_id AND p.installation_id = m.installation_id
    JOIN memory_identity_bindings b ON b.principal_id = p.id AND b.installation_id = p.installation_id
    JOIN memory_providers v ON v.id = b.provider_id AND v.installation_id = b.installation_id
    JOIN memory_owner_intents intent ON intent.installation_id = m.installation_id
    WHERE m.installation_id = ? AND m.repository_id = ? AND m.role = 'owner' AND m.status = 'active'
      AND p.status = 'active' AND b.status = 'active' AND v.status = 'active' AND intent.state = 'consumed'
      AND v.id = ? AND v.issuer = ? AND v.audience = ? LIMIT 1`,
  [state.installation_id, state.repository_id, access?.providerConfigurationId ?? '', access?.issuer ?? '', access?.audience ?? '']);
  const owner = owners.length > 0;
  const reason = state.state === 'maintenance' ? 'maintenance' : blocked || (owner ? 'no-current-device' : 'owner-unconfirmed');
  return { memory: {
    protocolVersion: 1, installationId: state.installation_id, repositoryId: state.repository_id,
    appUrl: target.appUrl, memoryOrigin: target.memoryOrigin,
    status: owner ? 'pending-device' : 'pending-owner', reason,
    action: blocked || reason === 'maintenance' ? null : {
      kind: owner ? 'connect-device' : 'confirm-owner', url: `${target.appUrl}/apps/devices/`, operatorConfirmationRequired: !owner,
    },
  } };
}

export { memorySchemaVersion };
