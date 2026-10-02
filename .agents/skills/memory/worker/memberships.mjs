import { andGuard, humanGuard, identityMutation, invalidatePrincipal, MemoryIdentityError, revisionChange, rolePolicy } from './identity.mjs';

function membershipTargetGuard(db, actor, principalId, revision, { removing = false, role }) {
  if (!Number.isSafeInteger(revision) || revision < 1) throw new MemoryIdentityError('invalid-revision');
  let guard = andGuard(humanGuard(actor, true, db), `EXISTS (SELECT 1 FROM memory_memberships m
    JOIN memory_principals p ON p.id = m.principal_id AND p.installation_id = m.installation_id
    WHERE m.repository_id = ? AND m.principal_id = ? AND m.revision = ? AND m.status = 'active' AND p.status = 'active')`,
  [actor.repositoryId, principalId, revision]);
  if (removing || role !== 'owner') {
    guard = andGuard(guard, `(NOT EXISTS (SELECT 1 FROM memory_memberships
      WHERE repository_id = ? AND principal_id = ? AND role = 'owner') OR
      (SELECT count(*) FROM memory_memberships m JOIN memory_principals p
        ON p.id = m.principal_id AND p.installation_id = m.installation_id
        WHERE m.installation_id = ? AND m.repository_id = ? AND m.role = 'owner' AND m.status = 'active' AND p.status = 'active') > 1)`,
    [actor.repositoryId, principalId, actor.installationId, actor.repositoryId]);
  }
  return guard;
}

export async function changeMemoryRole(db, actor, { principalId, revision, role }) {
  rolePolicy(role);
  const guard = membershipTargetGuard(db, actor, principalId, revision, { role });
  await identityMutation(db, { installationId: actor.installationId, actorId: actor.principalId,
    action: 'membership.role', targetId: principalId, guard }, gate => [
    { sql: `UPDATE memory_memberships SET role = ?, revision = revision + 1, updated_at = unixepoch()
      WHERE repository_id = ? AND principal_id = ? AND ${gate.sql}`, params: [role, actor.repositoryId, principalId, ...gate.params] },
    ...invalidatePrincipal(principalId, gate, { revokeDevices: false }), revisionChange(actor.installationId, gate),
  ]);
}

export async function removeMemoryMember(db, actor, { principalId, revision }) {
  const guard = membershipTargetGuard(db, actor, principalId, revision, { removing: true });
  await identityMutation(db, { installationId: actor.installationId, actorId: actor.principalId,
    action: 'membership.remove', targetId: principalId, guard }, gate => [
    { sql: `UPDATE memory_memberships SET status = 'removed', revision = revision + 1, updated_at = unixepoch()
      WHERE repository_id = ? AND principal_id = ? AND ${gate.sql}`, params: [actor.repositoryId, principalId, ...gate.params] },
    { sql: `UPDATE memory_principals SET status = 'removed' WHERE id = ? AND ${gate.sql}`, params: [principalId, ...gate.params] },
    ...invalidatePrincipal(principalId, gate, { revokeDevices: true }),
    { sql: `UPDATE memory_identity_bindings SET status = 'retired', updated_at = unixepoch()
      WHERE principal_id = ? AND status != 'retired' AND ${gate.sql}`, params: [principalId, ...gate.params] },
    revisionChange(actor.installationId, gate),
  ]);
}
