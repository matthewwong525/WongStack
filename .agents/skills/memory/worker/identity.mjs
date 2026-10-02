// Core-only boundary: human is the result of getAccessHumanIdentity(request, env),
// never request JSON, a device grant, an email header or decoded JWT claims.
// This module resolves membership; signature verification belongs to that adapter.
const contexts = new WeakMap();
export const MEMORY_ROLES = Object.freeze(['owner', 'admin', 'member', 'reader']);

export class MemoryIdentityError extends Error {
  constructor(code) {
    super(code);
    this.name = 'MemoryIdentityError';
    this.code = code;
  }
}

export function normalizeEmail(email) {
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    throw new MemoryIdentityError('invalid-email');
  }
  return email.trim().toLowerCase();
}

export function rolePolicy(role) {
  if (!MEMORY_ROLES.includes(role)) throw new MemoryIdentityError('invalid-role');
  return Object.freeze({ managePeople: role === 'owner', administerMemory: ['owner', 'admin'].includes(role), shareWrites: role !== 'reader' });
}

// A promoted member's pre-existing device never acquires admin scope. A demoted
// admin immediately loses it, even if its approved scope still names it.
export function devicePolicy(role, approvedScope) {
  const policy = rolePolicy(role);
  const scopes = ['memory:read', 'memory:read memory:write', 'memory:read memory:write memory:admin'];
  if (!scopes.includes(approvedScope)) throw new MemoryIdentityError('invalid-scope');
  return { read: true, write: approvedScope.includes('memory:write'),
    administerMemory: policy.administerMemory && approvedScope.includes('memory:admin'),
    shareWrites: policy.shareWrites && approvedScope.includes('memory:write'), managePeople: false };
}

export function verifiedHuman(human) {
  if (!human || typeof human.issuer !== 'string' || !human.issuer.startsWith('https://') ||
      typeof human.audience !== 'string' || !human.audience || typeof human.subject !== 'string' ||
      !human.subject.trim() || typeof human.email !== 'string' || human.email !== human.email.trim()) {
    throw new MemoryIdentityError('human-required');
  }
  return { issuer: human.issuer, audience: human.audience, subject: human.subject, email: normalizeEmail(human.email) };
}

// Contexts are per-request capabilities: resolve anew AFTER JWT verification on
// every request. Never cache them across requests; the adapter's tuple has no JWT
// lifetime and a membership snapshot is not a substitute for a fresh human login.
export async function resolveMemoryHuman(db, installationId, human) {
  const proof = verifiedHuman(human);
  const row = await db.prepare(`SELECT i.repository_id, i.auth_revision, b.id AS binding_id,
      p.id AS provider_id, b.principal_id, m.role, m.revision
    FROM memory_installation i
    JOIN memory_providers p ON p.installation_id = i.installation_id
    JOIN memory_identity_bindings b ON b.installation_id = i.installation_id AND b.provider_id = p.id
    JOIN memory_principals person ON person.id = b.principal_id AND person.installation_id = i.installation_id
    JOIN memory_memberships m ON m.repository_id = i.repository_id AND m.principal_id = person.id
    WHERE i.installation_id = ? AND i.state != 'maintenance' AND p.status = 'active'
      AND p.issuer = ? AND p.audience = ? AND b.issuer = p.issuer AND b.subject = ?
      AND lower(b.verified_email) = ? AND b.status = 'active' AND person.status = 'active' AND m.status = 'active'`)
    .bind(installationId, proof.issuer, proof.audience, proof.subject, proof.email).first();
  if (!row) throw new MemoryIdentityError('membership-review-required');
  const context = Object.freeze({ installationId, repositoryId: row.repository_id, principalId: row.principal_id,
    role: row.role, revision: row.revision });
  contexts.set(context, { ...row, installationId, db, ...proof });
  return context;
}

export function humanGuard(context, ownerOnly = true, db) {
  const actor = contexts.get(context);
  if (!actor || (db && actor.db !== db) || (ownerOnly && actor.role !== 'owner')) throw new MemoryIdentityError('owner-required');
  return {
    sql: `EXISTS (SELECT 1 FROM memory_installation i
      JOIN memory_providers p ON p.installation_id = i.installation_id
      JOIN memory_identity_bindings b ON b.installation_id = i.installation_id AND b.provider_id = p.id
      JOIN memory_principals person ON person.id = b.principal_id AND person.installation_id = i.installation_id
      JOIN memory_memberships m ON m.repository_id = i.repository_id AND m.principal_id = person.id
      WHERE i.installation_id = ? AND i.auth_revision = ? AND i.state != 'maintenance'
        AND p.id = ? AND p.status = 'active' AND p.issuer = ? AND p.audience = ?
        AND b.id = ? AND b.issuer = p.issuer AND b.subject = ? AND lower(b.verified_email) = ?
        AND b.status = 'active' AND person.status = 'active' AND m.status = 'active'
        AND m.revision = ? AND m.role = ?)`,
    params: [actor.installationId, actor.auth_revision, actor.provider_id, actor.issuer, actor.audience,
      actor.binding_id, actor.subject, actor.email, actor.revision, actor.role],
  };
}

// Each batch starts by checking live authority AND the target preconditions.
// Later writes depend on its unique receipt, even when the first mutation changes
// the actor's own role. D1 batch rollback keeps that receipt and all writes atomic.
export async function identityMutation(db, { installationId, actorId, action, targetId, guard }, changes) {
  const receipt = crypto.randomUUID();
  const gate = { sql: 'EXISTS (SELECT 1 FROM memory_audit WHERE id = ?)', params: [receipt] };
  const statements = [db.prepare(`INSERT INTO memory_audit
    (id, installation_id, actor_principal_id, actor_kind, action, target_id, result, created_at)
    SELECT ?, ?, ?, 'human', ?, ?, 'allowed', unixepoch() WHERE ${guard.sql}`)
    .bind(receipt, installationId, actorId, action, targetId, ...guard.params),
  ...changes(gate).map(({ sql, params }) => db.prepare(sql).bind(...params)),
  db.prepare('SELECT id FROM memory_audit WHERE id = ?').bind(receipt)];
  let result;
  try { result = await db.batch(statements); }
  catch { throw new MemoryIdentityError('identity-change-failed'); }
  if (!Array.isArray(result) || result.some(item => item?.success !== true)) throw new MemoryIdentityError('identity-change-failed');
  if (!result.at(-1)?.results?.some(row => row.id === receipt)) throw new MemoryIdentityError('identity-change-conflict');
}

export function andGuard(first, sql, params = []) {
  return { sql: `${first.sql} AND (${sql})`, params: [...first.params, ...params] };
}

export const revisionChange = (installationId, gate) => ({
  sql: `UPDATE memory_installation SET auth_revision = auth_revision + 1 WHERE installation_id = ? AND ${gate.sql}`,
  params: [installationId, ...gate.params],
});

export function invalidatePrincipal(principalId, gate, { revokeDevices }) {
  return [
    ...(revokeDevices ? [{ sql: `UPDATE memory_login_candidates SET state = 'revoked' WHERE state = 'pending'
      AND EXISTS (SELECT 1 FROM memory_identity_bindings b WHERE b.principal_id = ?
        AND b.installation_id = memory_login_candidates.installation_id AND b.provider_id = memory_login_candidates.provider_id
        AND b.issuer = memory_login_candidates.issuer AND b.subject = memory_login_candidates.subject)
      AND ${gate.sql}`, params: [principalId, ...gate.params] }] : []),
    { sql: `UPDATE memory_device_requests SET state = 'revoked'
        WHERE principal_id = ? AND state IN ('pending', 'approved') AND ${gate.sql}`, params: [principalId, ...gate.params] },
    { sql: `DELETE FROM memory_csrf_proofs WHERE binding_id IN
        (SELECT id FROM memory_identity_bindings WHERE principal_id = ?) AND ${gate.sql}`, params: [principalId, ...gate.params] },
    { sql: revokeDevices
      ? `UPDATE memory_devices SET status = 'revoked', revoked_at = unixepoch() WHERE principal_id = ? AND status = 'active' AND ${gate.sql}`
      : `UPDATE memory_devices SET membership_revision = (SELECT revision FROM memory_memberships m
          WHERE m.principal_id = memory_devices.principal_id AND m.repository_id = memory_devices.repository_id)
          WHERE principal_id = ? AND status = 'active' AND ${gate.sql}`,
    params: [principalId, ...gate.params] },
  ];
}
