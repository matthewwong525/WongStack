// Completed schema-10 fixture, intentionally independent of the schema-11 initializer.
// Old forward SQL stays byte-identical; these are synthetic metadata and receipts.
import { applyMigrations } from './identity.mjs';
import { inputFor } from './operator.mjs';
import { digest } from '../../../../.agents/skills/memory/scripts/lib/installation-validation.mjs';

export async function completedSchema10(f) {
  applyMigrations(f.db, 10);
  const input = inputFor(f);
  const installationId = 'old-installation'.padEnd(32, '0');
  const repositoryId = 'old-repository'.padEnd(32, '0');
  const auditId = 'old-bootstrap-audit';
  const requestHash = await digest(JSON.stringify({ target: input.target, access: input.access, ownerEmail: input.ownerIntent.email }));
  f.db.prepare(`INSERT INTO memory_installation (singleton, installation_id, repository_id, account_id, database_id, bucket_name, canonical_origin, created_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, unixepoch())`).run(installationId, repositoryId, f.target.accountId, f.target.databaseId, f.target.bucketName, f.target.appUrl);
  f.db.prepare(`INSERT INTO memory_installation_configuration
    (installation_id, app_origin, memory_origin, app_worker_name, memory_worker_name, operation_id, request_hash, owner_email, access_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`).run(installationId, f.target.appUrl, f.target.memoryOrigin,
    f.target.appWorkerName, f.target.memoryWorkerName, input.operationId, requestHash, input.ownerIntent.email, JSON.stringify(input.access));
  f.db.prepare("INSERT INTO memory_providers (id, installation_id, issuer, audience, status, created_at) VALUES (?, ?, ?, ?, 'active', unixepoch())")
    .run(f.access.providerConfigurationId, installationId, f.access.issuer, f.access.audience);
  f.db.prepare('INSERT INTO memory_owner_intents (installation_id, provider_id, email, created_at) VALUES (?, ?, ?, unixepoch())')
    .run(installationId, f.access.providerConfigurationId, input.ownerIntent.email);
  f.db.prepare("INSERT INTO memory_audit (id, installation_id, actor_kind, action, target_id, result, created_at) VALUES (?, ?, 'operator', 'installation-initialized', ?, 'allowed', unixepoch())")
    .run(auditId, installationId, installationId);
  f.db.prepare('INSERT INTO memory_bootstrap_completion (installation_id, request_hash, audit_id) VALUES (?, ?, ?)').run(installationId, requestHash, auditId);
  return { ...f.target, installationId, repositoryId };
}
