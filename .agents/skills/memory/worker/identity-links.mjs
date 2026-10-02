import { andGuard, humanGuard, identityMutation, invalidatePrincipal, MemoryIdentityError, revisionChange, rolePolicy } from './identity.mjs';

// Owner review is explicit: null principalId admits a NEW person, while an ID
// asserts evidenced continuity with that exact person. Neither path maps facts.
// Candidate creation is a protected verified-human operation owned by the router.
export async function linkMemoryIdentity(db, actor, { candidateId, principalId, revision, role, evidenceRef }) {
  let guard = humanGuard(actor, true, db);
  rolePolicy(role);
  if (typeof evidenceRef !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,199}$/.test(evidenceRef)) {
    throw new MemoryIdentityError('evidence-reference-required');
  }
  const fresh = principalId === null;
  const targetId = fresh ? crypto.randomUUID() : principalId;
  if (!fresh) {
    if (!Number.isSafeInteger(revision) || revision < 1) throw new MemoryIdentityError('invalid-revision');
    guard = andGuard(guard, `EXISTS (SELECT 1 FROM memory_memberships m JOIN memory_principals p
      ON p.id = m.principal_id AND p.installation_id = m.installation_id
      WHERE m.repository_id = ? AND m.principal_id = ? AND m.revision = ?
        AND ((m.status = 'active' AND p.status = 'active' AND m.role = ?) OR (m.status = 'removed' AND p.status = 'removed')))`,
    [actor.repositoryId, targetId, revision, role]);
  }
  guard = andGuard(guard, `EXISTS (SELECT 1 FROM memory_login_candidates c JOIN memory_providers p
    ON p.id = c.provider_id AND p.installation_id = c.installation_id AND p.issuer = c.issuer
    WHERE c.id = ? AND c.installation_id = ? AND c.purpose IN ('link', 'recovery')
      AND c.state = 'pending' AND c.expires_at > unixepoch() AND p.status = 'active'
      AND NOT EXISTS (SELECT 1 FROM memory_identity_bindings b WHERE b.installation_id = c.installation_id
        AND b.principal_id != ? AND b.status != 'retired'
        AND (lower(b.verified_email) = lower(c.verified_email) OR
          (b.provider_id = c.provider_id AND b.issuer = c.issuer AND b.subject = c.subject))))`,
  [candidateId, actor.installationId, targetId]);
  const bindingId = crypto.randomUUID();
  const reviewId = crypto.randomUUID();
  await identityMutation(db, { installationId: actor.installationId, actorId: actor.principalId,
    action: fresh ? 'identity.new-person' : 'identity.continuity', targetId, guard }, gate => [
    ...(fresh ? [
      { sql: `INSERT INTO memory_principals (id, installation_id, created_at) SELECT ?, ?, unixepoch() WHERE ${gate.sql}`,
        params: [targetId, actor.installationId, ...gate.params] },
      { sql: `INSERT INTO memory_memberships (installation_id, repository_id, principal_id, role, status, created_at, updated_at)
          SELECT ?, ?, ?, ?, 'active', unixepoch(), unixepoch() WHERE ${gate.sql}`,
        params: [actor.installationId, actor.repositoryId, targetId, role, ...gate.params] },
    ] : [
      { sql: `UPDATE memory_principals SET status = 'active' WHERE id = ? AND ${gate.sql}`, params: [targetId, ...gate.params] },
      { sql: `UPDATE memory_memberships SET status = 'active', role = ?, revision = revision + 1, updated_at = unixepoch()
          WHERE repository_id = ? AND principal_id = ? AND ${gate.sql}`, params: [role, actor.repositoryId, targetId, ...gate.params] },
    ]),
    { sql: `UPDATE memory_login_candidates SET state = 'consumed', consumed_principal_id = ? WHERE id = ? AND ${gate.sql}`,
      params: [targetId, candidateId, ...gate.params] },
    ...invalidatePrincipal(targetId, gate, { revokeDevices: true }),
    { sql: `UPDATE memory_identity_bindings SET status = 'retired', updated_at = unixepoch()
        WHERE principal_id = ? AND status != 'retired' AND ${gate.sql}`, params: [targetId, ...gate.params] },
    { sql: `INSERT INTO memory_identity_bindings
        (id, installation_id, provider_id, principal_id, issuer, subject, verified_email, status,
          created_at, updated_at, replaces_binding_id, evidence_ref)
        SELECT ?, c.installation_id, c.provider_id, ?, c.issuer, c.subject, lower(c.verified_email), 'active',
          unixepoch(), unixepoch(), previous.id, CASE WHEN previous.id IS NULL THEN NULL ELSE ? END
        FROM memory_login_candidates c LEFT JOIN memory_identity_bindings previous
          ON previous.installation_id = c.installation_id AND previous.provider_id = c.provider_id
          AND previous.issuer = c.issuer AND previous.subject = c.subject AND previous.status = 'retired'
          AND NOT EXISTS (SELECT 1 FROM memory_identity_bindings next WHERE next.replaces_binding_id = previous.id)
        WHERE c.id = ? AND ${gate.sql}`, params: [bindingId, targetId, evidenceRef, candidateId, ...gate.params] },
    { sql: `INSERT INTO memory_identity_reviews
        (id, installation_id, actor_principal_id, target_principal_id, binding_id, candidate_id, outcome, evidence_ref, created_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, unixepoch() WHERE ${gate.sql}`,
      params: [reviewId, actor.installationId, actor.principalId, targetId, bindingId, candidateId,
        fresh ? 'new-person' : 'continuity', evidenceRef, ...gate.params] },
    revisionChange(actor.installationId, gate),
  ]);
  return { principalId: targetId, bindingId, reviewId };
}
