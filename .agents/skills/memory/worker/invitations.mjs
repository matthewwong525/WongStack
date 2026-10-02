import { andGuard, humanGuard, identityMutation, MemoryIdentityError, normalizeEmail, rolePolicy, verifiedHuman } from './identity.mjs';

export async function inviteMemoryMember(db, actor, { email, role }) {
  const guard = humanGuard(actor, true, db);
  const normalized = normalizeEmail(email);
  rolePolicy(role);
  const id = crypto.randomUUID();
  await identityMutation(db, { installationId: actor.installationId, actorId: actor.principalId,
    action: 'invitation.create', targetId: id, guard }, gate => [
    { sql: `UPDATE memory_invitations SET state = 'expired' WHERE repository_id = ? AND email = ?
        AND state = 'pending' AND expires_at <= unixepoch() AND ${gate.sql}`, params: [actor.repositoryId, normalized, ...gate.params] },
    { sql: `INSERT INTO memory_invitations (id, repository_id, email, role, actor_principal_id, created_at, expires_at)
        SELECT ?, ?, ?, ?, ?, unixepoch(), unixepoch() + 604800 WHERE ${gate.sql}`,
    params: [id, actor.repositoryId, normalized, role, actor.principalId, ...gate.params] },
  ]);
  return { invitationId: id, email: normalized, role };
}

export async function revokeMemoryInvitation(db, actor, invitationId) {
  const guard = andGuard(humanGuard(actor, true, db), `EXISTS (SELECT 1 FROM memory_invitations
    WHERE id = ? AND repository_id = ? AND state = 'pending')`, [invitationId, actor.repositoryId]);
  await identityMutation(db, { installationId: actor.installationId, actorId: actor.principalId,
    action: 'invitation.revoke', targetId: invitationId, guard }, gate => [
    { sql: `UPDATE memory_invitations SET state = 'revoked' WHERE id = ? AND ${gate.sql}`, params: [invitationId, ...gate.params] },
  ]);
}

// Run only after the protected router verifies a human and CSRF. Even a matching
// verified email is prospective access: collisions, including tombstones, need
// owner-reviewed identity recovery and never claim an existing principal.
export async function consumeMemoryInvitation(db, installationId, human, invitationId) {
  const proof = verifiedHuman(human);
  const principalId = crypto.randomUUID();
  const bindingId = crypto.randomUUID();
  const provider = await db.prepare(`SELECT p.id, i.repository_id, i.auth_revision FROM memory_providers p
    JOIN memory_installation i ON i.installation_id = p.installation_id
    WHERE i.installation_id = ? AND i.state != 'maintenance' AND p.issuer = ? AND p.audience = ? AND p.status = 'active'`)
    .bind(installationId, proof.issuer, proof.audience).first();
  if (!provider) throw new MemoryIdentityError('membership-review-required');
  const guard = {
    sql: `EXISTS (SELECT 1 FROM memory_installation i JOIN memory_providers p ON p.installation_id = i.installation_id
      JOIN memory_invitations invitation ON invitation.repository_id = i.repository_id
      WHERE i.installation_id = ? AND i.auth_revision = ? AND i.state != 'maintenance'
        AND p.id = ? AND p.issuer = ? AND p.audience = ? AND p.status = 'active'
        AND invitation.id = ? AND invitation.email = ? AND invitation.state = 'pending' AND invitation.expires_at > unixepoch())
      AND NOT EXISTS (SELECT 1 FROM memory_identity_bindings WHERE installation_id = ?
        AND (lower(verified_email) = ? OR (provider_id = ? AND issuer = ? AND subject = ?)))`,
    params: [installationId, provider.auth_revision, provider.id, proof.issuer, proof.audience,
      invitationId, proof.email, installationId, proof.email, provider.id, proof.issuer, proof.subject],
  };
  // No principal exists at authorization time. The consumed invitation supplies
  // its immutable identity link; the audit contains neither email nor claims.
  await identityMutation(db, { installationId, actorId: null, action: 'invitation.consume', targetId: invitationId, guard }, gate => [
    { sql: `INSERT INTO memory_principals (id, installation_id, created_at)
        SELECT ?, ?, unixepoch() WHERE ${gate.sql}`, params: [principalId, installationId, ...gate.params] },
    { sql: `INSERT INTO memory_identity_bindings
        (id, installation_id, provider_id, principal_id, issuer, subject, verified_email, status, created_at, updated_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, 'active', unixepoch(), unixepoch() WHERE ${gate.sql}`,
    params: [bindingId, installationId, provider.id, principalId, proof.issuer, proof.subject, proof.email, ...gate.params] },
    { sql: `INSERT INTO memory_memberships (installation_id, repository_id, principal_id, role, status, created_at, updated_at)
        SELECT ?, repository_id, ?, role, 'active', unixepoch(), unixepoch() FROM memory_invitations WHERE id = ? AND ${gate.sql}`,
    params: [installationId, principalId, invitationId, ...gate.params] },
    { sql: `UPDATE memory_invitations SET state = 'consumed', consumed_principal_id = ? WHERE id = ? AND ${gate.sql}`,
      params: [principalId, invitationId, ...gate.params] },
  ]);
  return { principalId, bindingId };
}
