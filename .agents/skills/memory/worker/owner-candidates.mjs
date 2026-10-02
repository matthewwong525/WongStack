// Pending first-owner candidates only. No route, principal, membership or operator grant.
import { andGuard, identityMutation, MemoryIdentityError } from './identity.mjs';
import { emptyOwnerBody, hashOwnerMaterial, ownerNeed, takeInitialOwnerRequest } from './owner-request.mjs';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export async function createInitialOwnerCandidate(db, context) {
  const { request, proof, row, sessionHash, guard: ownerGuard } = takeInitialOwnerRequest(db, context, 'POST');
  await emptyOwnerBody(request);
  const csrf = request.headers.get('X-Memory-CSRF');
  ownerNeed(typeof csrf === 'string' && /^wm_csrf_[a-f0-9]{64}$/.test(csrf), 'owner-csrf-required');
  const csrfHash = await hashOwnerMaterial(csrf);
  const guard = andGuard(ownerGuard, `EXISTS (SELECT 1 FROM memory_csrf_proofs WHERE hash = ?
      AND installation_id = ? AND provider_id = ? AND issuer = ? AND subject = ? AND session_hash = ?
      AND binding_id IS NULL AND membership_revision IS NULL AND expires_at > unixepoch())
    AND (SELECT count(*) FROM memory_login_candidates WHERE installation_id = ? AND provider_id = ?
      AND subject = ? AND purpose = 'owner' AND created_at > unixepoch() - 600) < 3`,
  [csrfHash, row.installation_id, row.provider_id, proof.issuer, proof.subject, sessionHash, row.installation_id, row.provider_id, proof.subject]);
  const id = crypto.randomUUID();
  const rawCode = Array.from(crypto.getRandomValues(new Uint8Array(8)), byte => alphabet[byte & 31]).join('');
  const codeHash = await hashOwnerMaterial(rawCode);
  await identityMutation(db, { installationId: row.installation_id, actorId: null, action: 'owner-candidate-created', targetId: id, guard }, gate => [
    { sql: `UPDATE memory_login_candidates SET state = 'revoked' WHERE installation_id = ? AND provider_id = ?
        AND issuer = ? AND subject = ? AND purpose = 'owner' AND state = 'pending' AND ${gate.sql}`,
    params: [row.installation_id, row.provider_id, proof.issuer, proof.subject, ...gate.params] },
    { sql: `INSERT INTO memory_login_candidates (id, installation_id, provider_id, issuer, subject, verified_email, code_hash, purpose, created_at, expires_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, 'owner', unixepoch(), unixepoch() + 600 WHERE ${gate.sql}`,
    params: [id, row.installation_id, row.provider_id, proof.issuer, proof.subject, proof.email, codeHash, ...gate.params] },
    { sql: `DELETE FROM memory_csrf_proofs WHERE hash = ? AND ${gate.sql}`, params: [csrfHash, ...gate.params] },
  ]);
  let candidate;
  try { candidate = await db.prepare("SELECT expires_at FROM memory_login_candidates WHERE id = ? AND state = 'pending' AND expires_at > unixepoch()").bind(id).first(); }
  catch { throw new MemoryIdentityError('owner-setup-unavailable'); }
  ownerNeed(candidate, 'owner-candidate-unavailable');
  return { candidateId: id, comparisonCode: `${rawCode.slice(0, 4)}-${rawCode.slice(4)}`, expiresAt: candidate.expires_at };
}
