// Trusted-process SOURCE ONLY. No caller, route, CLI or live activation is supplied.
import { rows, query, requireValue, digest, MemoryOperatorError } from './installation-validation.mjs';
import { setupResult, readInstallation } from './installation-state.mjs';
import { readOwnerEnvironment, readOwnerCandidate, ownerDisplay } from './owner-review.mjs';
import { validateMemoryOwnerConfirmation } from './owner-confirmation-input.mjs';
import { candidateGuard, confirmationStatements } from './owner-confirmation-state.mjs';

export async function inspectMemoryOwnerCandidate(operator, input) {
  const context = await readOwnerCandidate(await readOwnerEnvironment(operator, input));
  const { installation, candidate, state } = context;
  const guard = candidateGuard(context);
  let failure;
  try {
    await query(operator, installation, [{ sql: `INSERT OR IGNORE INTO memory_owner_reviews
      (id, installation_id, candidate_id, snapshot_hash, target_hash, protection_hash, code_hash, auth_revision, pin_revision, created_at, expires_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), ? WHERE ${guard.sql}
        AND NOT EXISTS (SELECT 1 FROM memory_owner_attempts WHERE installation_id = ?)`,
    params: [crypto.randomUUID(), installation.installationId, candidate.id, context.snapshotHash, context.targetHash,
      context.protectionHash, candidate.code_hash, state.auth_revision, state.pin_revision, candidate.expires_at,
      ...guard.params, installation.installationId] }]);
  } catch (error) { failure = error; }
  const reviews = await rows(operator, installation, `SELECT id, expires_at FROM memory_owner_reviews
    WHERE installation_id = ? AND candidate_id = ? AND snapshot_hash = ? AND state = 'pending' AND expires_at > unixepoch()
      AND ${guard.sql} AND NOT EXISTS (SELECT 1 FROM memory_owner_attempts WHERE installation_id = ?)`,
  [installation.installationId, candidate.id, context.snapshotHash, ...guard.params, installation.installationId]);
  if (reviews.length !== 1) throw failure ?? new MemoryOperatorError('candidate-unavailable');
  return { ...ownerDisplay(context), confirmationId: reviews[0].id, expiresAt: reviews[0].expires_at };
}

async function completedOutcome(context, input, requestHash) {
  const { operator, installation } = context;
  const attempts = await rows(operator, installation, 'SELECT * FROM memory_owner_attempts WHERE installation_id = ?', [installation.installationId]);
  if (!attempts.length) return null;
  requireValue(attempts.length === 1, 'confirmation-incomplete');
  const attempt = attempts[0];
  requireValue(attempt.review_id === input.confirmationId && attempt.request_hash === requestHash, 'owner-already-confirmed');
  const done = await rows(operator, installation, `SELECT done.attempt_id FROM memory_owner_completions done
    JOIN memory_owner_attempts a ON a.id = done.attempt_id AND a.installation_id = done.installation_id
    JOIN memory_owner_reviews r ON r.id = a.review_id AND r.installation_id = a.installation_id
    JOIN memory_installation i ON i.installation_id = a.installation_id
    JOIN memory_owner_intents intent ON intent.installation_id = i.installation_id
    JOIN memory_login_candidates c ON c.id = r.candidate_id AND c.installation_id = i.installation_id
    JOIN memory_principals p ON p.id = a.principal_id AND p.installation_id = i.installation_id
    JOIN memory_identity_bindings b ON b.id = a.binding_id AND b.principal_id = p.id AND b.installation_id = i.installation_id
    JOIN memory_audit audit ON audit.id = a.audit_id AND audit.installation_id = i.installation_id
    WHERE a.id = ? AND a.request_hash = ? AND done.review_id = a.review_id AND done.principal_id = a.principal_id
      AND done.binding_id = a.binding_id AND done.audit_id = a.audit_id
      AND r.state = 'consumed' AND r.consumed_attempt_id = a.id AND r.candidate_id = ?
      AND r.target_hash = ? AND r.protection_hash = ? AND r.code_hash = ?
      AND c.state = 'consumed' AND c.consumed_principal_id = p.id AND c.subject = b.subject
      AND c.provider_id = b.provider_id AND c.issuer = b.issuer AND c.verified_email = b.verified_email
      AND intent.state = 'consumed' AND intent.owner_principal_id = p.id
      AND audit.actor_kind = 'operator' AND audit.action = 'owner-confirmed' AND audit.target_id = p.id AND audit.result = 'allowed'
      AND i.state != 'maintenance'`,
  [attempt.id, requestHash, input.candidateId, context.targetHash, context.protectionHash, await digest(input.comparisonCode)]);
  requireValue(done.length === 1, 'confirmation-incomplete');
  const state = await readInstallation(operator, installation);
  return setupResult(operator, installation, state, null, context.access);
}

export async function confirmMemoryOwner(operator, input) {
  const normalized = validateMemoryOwnerConfirmation(input);
  const context = await readOwnerEnvironment(operator, { installation: normalized.installation, candidateId: normalized.candidateId }, true);
  const requestHash = await digest(JSON.stringify({ version: 1, targetHash: context.targetHash,
    candidateId: normalized.candidateId, confirmationId: normalized.confirmationId, codeHash: await digest(normalized.comparisonCode) }));
  const previous = await completedOutcome(context, normalized, requestHash);
  if (previous) return previous;
  let failure;
  try {
    const current = await readOwnerCandidate(context);
    const reviews = await rows(operator, context.installation, `SELECT * FROM memory_owner_reviews WHERE id = ? AND installation_id = ? AND candidate_id = ?`,
      [normalized.confirmationId, context.installation.installationId, normalized.candidateId]);
    requireValue(reviews.length === 1, 'confirmation-required');
    const review = reviews[0];
    requireValue(review.state === 'pending' && review.expires_at > Math.floor(Date.now() / 1000), 'confirmation-expired');
    requireValue(review.snapshot_hash === current.snapshotHash && review.target_hash === context.targetHash &&
      review.protection_hash === context.protectionHash, 'confirmation-required');
    requireValue(review.code_hash === await digest(normalized.comparisonCode), 'code-mismatch');
    await query(operator, context.installation, confirmationStatements(current, review, requestHash));
  }
  catch (error) { failure = error; }
  const outcome = await completedOutcome(context, normalized, requestHash);
  if (outcome) return outcome;
  throw failure ?? new MemoryOperatorError('candidate-unavailable');
}
