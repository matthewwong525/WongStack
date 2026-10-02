// SQL construction for the trusted operator only; no transport or routes here.
import { memoryMigrations } from './installation-migrations.mjs';
export function candidateGuard(context, attempt = null) {
  const { installation: pin, state, candidate: c, access } = context;
  const barrier = attempt !== null;
  return {
    sql: `EXISTS (SELECT 1 FROM memory_installation i
      JOIN memory_installation_configuration config ON config.installation_id = i.installation_id
      JOIN memory_owner_intents intent ON intent.installation_id = i.installation_id
      JOIN memory_providers provider ON provider.id = intent.provider_id AND provider.installation_id = i.installation_id
      JOIN memory_login_candidates c ON c.installation_id = i.installation_id AND c.provider_id = provider.id
      WHERE i.installation_id = ? AND i.repository_id = ? AND i.state = ? AND i.auth_revision = ?
        AND config.pin_revision = ? AND config.access_json = ? AND config.owner_email = ?
        AND (SELECT count(*) FROM schema_migrations) = ${memoryMigrations.length}
        AND NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version NOT IN (${memoryMigrations.map(row => row.version).join(',')}))
        AND EXISTS (SELECT 1 FROM memory_schema_receipts receipt JOIN memory_bootstrap_completion done
          ON done.installation_id = receipt.installation_id AND done.audit_id = receipt.audit_id AND done.request_hash = receipt.request_hash
          WHERE receipt.installation_id = i.installation_id AND receipt.repository_id = i.repository_id
            AND receipt.schema_version = 11 AND receipt.manifest_hash = ? AND receipt.request_hash = config.request_hash)
        AND provider.id = ? AND provider.issuer = ? AND provider.audience = ? AND provider.status = 'active'
        AND c.id = ? AND c.issuer = provider.issuer AND c.subject = ? AND c.verified_email = ? AND c.code_hash = ?
        AND c.created_at = ? AND c.expires_at = ? AND c.purpose = 'owner' AND intent.email = c.verified_email
        ${barrier ? `AND (c.state = 'pending' OR c.state = 'consumed' AND c.consumed_principal_id = ?)
          AND (intent.state = 'pending' OR intent.state = 'consumed' AND intent.owner_principal_id = ?)`
    : "AND c.state = 'pending' AND c.expires_at > unixepoch() AND intent.state = 'pending'"}
        AND NOT EXISTS (SELECT 1 FROM memory_memberships m WHERE m.installation_id = i.installation_id
          AND m.role = 'owner' AND m.status = 'active' ${barrier ? 'AND m.principal_id != ?' : ''}))`,
    params: [pin.installationId, pin.repositoryId, barrier ? 'maintenance' : 'pending', state.auth_revision + (barrier ? 1 : 0),
      state.pin_revision, state.access_json, state.owner_email, context.manifestHash, access.providerConfigurationId, access.issuer, access.audience,
      c.id, c.subject, c.verified_email, c.code_hash, c.created_at, c.expires_at,
      ...(barrier ? [attempt.principalId, attempt.principalId, attempt.principalId] : [])],
  };
}

export function confirmationStatements(context, review, requestHash) {
  const { installation: pin, candidate: c, state } = context;
  const attempt = { id: crypto.randomUUID(), principalId: crypto.randomUUID(), bindingId: crypto.randomUUID(), auditId: crypto.randomUUID() };
  const pending = candidateGuard(context);
  const live = candidateGuard(context, attempt);
  const receipt = { sql: `EXISTS (SELECT 1 FROM memory_owner_reviews r WHERE r.id = ? AND r.installation_id = ?
    AND r.candidate_id = ? AND r.snapshot_hash = ? AND r.target_hash = ? AND r.protection_hash = ?
    AND r.code_hash = ? AND r.auth_revision = ? AND r.pin_revision = ? AND r.state = 'pending' AND r.expires_at > unixepoch())`,
  params: [review.id, pin.installationId, c.id, context.snapshotHash, context.targetHash, context.protectionHash,
    c.code_hash, state.auth_revision, state.pin_revision] };
  const owned = { sql: `EXISTS (SELECT 1 FROM memory_owner_attempts a JOIN memory_owner_reviews r ON r.id = a.review_id
    WHERE a.id = ? AND a.installation_id = ? AND a.review_id = ? AND a.request_hash = ?
      AND r.snapshot_hash = ? AND r.target_hash = ? AND r.protection_hash = ? AND r.code_hash = ?
      AND r.auth_revision = ? AND r.pin_revision = ?
      AND (r.state = 'pending' OR r.state = 'consumed' AND r.consumed_attempt_id = a.id))`,
  params: [attempt.id, pin.installationId, review.id, requestHash, context.snapshotHash, context.targetHash,
    context.protectionHash, c.code_hash, state.auth_revision, state.pin_revision] };
  const guard = { sql: `${owned.sql} AND ${live.sql}`, params: [...owned.params, ...live.params] };
  const authority = { sql: `EXISTS (SELECT 1 FROM memory_principals p
      JOIN memory_identity_bindings b ON b.principal_id = p.id AND b.installation_id = p.installation_id
      JOIN memory_memberships m ON m.principal_id = p.id AND m.installation_id = p.installation_id
      WHERE p.id = ? AND p.installation_id = ? AND p.status = 'active' AND b.id = ? AND b.status = 'active'
        AND b.provider_id = ? AND b.issuer = ? AND b.subject = ? AND b.verified_email = ?
        AND m.repository_id = ? AND m.role = 'owner' AND m.status = 'active' AND m.revision = 1)`,
  params: [attempt.principalId, pin.installationId, attempt.bindingId, c.provider_id, c.issuer, c.subject, c.verified_email, pin.repositoryId] };
  const finished = { sql: `EXISTS (SELECT 1 FROM memory_owner_reviews r
      JOIN memory_login_candidates c ON c.id = r.candidate_id
      JOIN memory_owner_intents intent ON intent.installation_id = r.installation_id
      WHERE r.id = ? AND r.state = 'consumed' AND r.consumed_attempt_id = ?
        AND c.state = 'consumed' AND c.consumed_principal_id = ?
        AND intent.state = 'consumed' AND intent.owner_principal_id = ?)
      AND ${authority.sql}`, params: [review.id, attempt.id, attempt.principalId, attempt.principalId, ...authority.params] };
  return [
    { sql: `INSERT INTO memory_owner_attempts (id, installation_id, review_id, request_hash, principal_id, binding_id, audit_id, created_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, unixepoch() WHERE ${pending.sql} AND ${receipt.sql}
      AND NOT EXISTS (SELECT 1 FROM memory_owner_attempts WHERE installation_id = ?)`,
    params: [attempt.id, pin.installationId, review.id, requestHash, attempt.principalId, attempt.bindingId, attempt.auditId,
      ...pending.params, ...receipt.params, pin.installationId] },
    { sql: `UPDATE memory_installation SET state = 'maintenance', auth_revision = auth_revision + 1
      WHERE installation_id = ? AND ${owned.sql} AND ${pending.sql}`, params: [pin.installationId, ...owned.params, ...pending.params] },
    { sql: `INSERT INTO memory_principals (id, installation_id, created_at)
      SELECT ?, ?, unixepoch() WHERE ${guard.sql}`, params: [attempt.principalId, pin.installationId, ...guard.params] },
    { sql: `INSERT INTO memory_identity_bindings (id, installation_id, provider_id, principal_id, issuer, subject, verified_email, status, created_at, updated_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, 'active', unixepoch(), unixepoch() WHERE ${guard.sql}`,
    params: [attempt.bindingId, pin.installationId, c.provider_id, attempt.principalId, c.issuer, c.subject, c.verified_email, ...guard.params] },
    { sql: `INSERT INTO memory_memberships (installation_id, repository_id, principal_id, role, status, created_at, updated_at)
      SELECT ?, ?, ?, 'owner', 'active', unixepoch(), unixepoch() WHERE ${guard.sql}`,
    params: [pin.installationId, pin.repositoryId, attempt.principalId, ...guard.params] },
    { sql: `UPDATE memory_login_candidates SET state = 'consumed', consumed_principal_id = ? WHERE id = ?
      AND state = 'pending' AND ${guard.sql} AND ${authority.sql}`,
    params: [attempt.principalId, c.id, ...guard.params, ...authority.params] },
    { sql: `UPDATE memory_owner_intents SET state = 'consumed', owner_principal_id = ? WHERE installation_id = ?
      AND state = 'pending' AND ${guard.sql} AND ${authority.sql}`,
    params: [attempt.principalId, pin.installationId, ...guard.params, ...authority.params] },
    { sql: `UPDATE memory_owner_reviews SET state = 'consumed', consumed_attempt_id = ? WHERE id = ? AND state = 'pending'
      AND ${guard.sql} AND ${authority.sql}`, params: [attempt.id, review.id, ...guard.params, ...authority.params] },
    { sql: `INSERT INTO memory_audit (id, installation_id, actor_kind, action, target_id, result, created_at)
      SELECT ?, ?, 'operator', 'owner-confirmed', ?, 'allowed', unixepoch() WHERE ${guard.sql} AND ${finished.sql}`,
    params: [attempt.auditId, pin.installationId, attempt.principalId, ...guard.params, ...finished.params] },
    { sql: `INSERT INTO memory_owner_completions (attempt_id, installation_id, review_id, principal_id, binding_id, audit_id, created_at)
      SELECT ?, ?, ?, ?, ?, ?, unixepoch() WHERE ${guard.sql} AND ${finished.sql}
      AND EXISTS (SELECT 1 FROM memory_audit WHERE id = ? AND action = 'owner-confirmed' AND target_id = ?)`,
    params: [attempt.id, pin.installationId, review.id, attempt.principalId, attempt.bindingId, attempt.auditId,
      ...guard.params, ...finished.params, attempt.auditId, attempt.principalId] },
    { sql: `UPDATE memory_installation SET state = 'pending' WHERE installation_id = ? AND ${guard.sql} AND ${finished.sql}
      AND EXISTS (SELECT 1 FROM memory_owner_completions WHERE attempt_id = ? AND review_id = ? AND principal_id = ? AND audit_id = ?)`,
    params: [pin.installationId, ...guard.params, ...finished.params, attempt.id, review.id, attempt.principalId, attempt.auditId] },
  ];
}
