// Inactive trusted-process one-use grants. All values are hashes; no secret is generated/logged here.
import { exactKeys, opaqueId, requireValue, query, rows, MemoryOperatorError } from './installation-validation.mjs';
import { machineEnvironment, machineDigest, sameMachineValue } from './machine-operator.mjs';
import { machineHash, machineSetupResult } from './machine-state.mjs';

export const machineScopes = Object.freeze(['memory:read', 'memory:read memory:write', 'memory:read memory:write memory:admin']);
// Reader capture is a distinct own-private capability; it never publishes shared records.
// Future core routes must enforce ownership/visibility and verify raw machine proof.
export function machineScopePolicy(scope) {
  requireValue(machineScopes.includes(scope));
  return Object.freeze({ readShared: true, captureOwnPrivate: true, writeOwnShared: machineScopes.indexOf(scope) >= 1,
    administerData: machineScopes.indexOf(scope) === 2, changeAuthority: false });
}
const integer = value => Number.isSafeInteger(value) && value >= 1;
function validateBase(input, fields) {
  exactKeys(input, ['installation', 'attemptId', 'expected', ...fields]);
  requireValue(opaqueId(input.attemptId));
  exactKeys(input.expected, ['authRevision', 'pinRevision', 'snapshotHash']);
  requireValue(integer(input.expected.authRevision) && integer(input.expected.pinRevision) && machineDigest(input.expected.snapshotHash));
}
const guard = (context, attemptId, requestHash, payloadJson) => ({
  sql: `EXISTS (SELECT 1 FROM memory_machine_attempts a JOIN memory_machine_configuration c USING(installation_id)
    WHERE a.id = ? AND a.request_hash = ? AND a.payload_json = ? AND a.snapshot_hash = ?
      AND a.installation_id = ? AND c.repository_id = ? AND c.target_json = ?
      AND a.pin_hash = ? AND c.pin_hash = a.pin_hash AND c.pin_revision = a.pin_revision
      AND a.pin_revision = ? AND a.auth_revision = ? AND c.auth_revision = a.auth_revision + 1
      AND c.state = 'maintenance' AND c.barrier_attempt_id = a.id
      AND NOT EXISTS (SELECT 1 FROM memory_machine_completions done WHERE done.attempt_id = a.id))`,
  params: [attemptId, requestHash, payloadJson, context.expected.snapshotHash, context.state.installation_id,
    context.state.repository_id, context.state.target_json, context.state.pin_hash, context.expected.pinRevision, context.expected.authRevision],
});

function outcomeProof(action, payload, attemptId, state) {
  const target = [state.installation_id, state.repository_id];
  if (action === 'issue') return { sql: `EXISTS (SELECT 1 FROM memory_machine_grants g
    WHERE g.id = ? AND g.installation_id = ? AND g.repository_id = ? AND g.issued_attempt_id = ?
      AND g.commitment = ? AND g.secret_hash = ? AND g.scope = ? AND g.expires_at = ?
      AND g.state = 'pending' AND g.revision = 1 AND g.machine_id IS NULL AND g.expires_at > unixepoch())`,
  params: [payload.grantId, ...target, attemptId, payload.machineCommitment, payload.capabilityHash, payload.scope, payload.expiresAt] };
  if (action === 'enroll') return { sql: `EXISTS (SELECT 1 FROM memory_machine_grants g
    JOIN memory_machine_principals p ON p.grant_id = g.id AND p.id = g.machine_id
      AND p.installation_id = g.installation_id AND p.repository_id = g.repository_id
    JOIN memory_principals generic ON generic.id = p.id AND generic.installation_id = p.installation_id AND generic.status = 'active'
    JOIN memory_machine_credentials k ON k.machine_id = p.id AND k.grant_revision = g.revision AND k.machine_revision = p.revision
    WHERE g.id = ? AND g.installation_id = ? AND g.repository_id = ? AND g.state = 'consumed' AND g.revision = 2
      AND g.consumed_attempt_id = ? AND g.commitment = ? AND g.secret_hash = ?
      AND p.id = ? AND p.commitment = g.commitment AND p.scope = ? AND p.status = 'active' AND p.revision = 1
      AND p.enrollment_attempt_id = ? AND k.attempt_id = ? AND k.hash = ? AND k.expires_at = ? AND k.expires_at > unixepoch())`,
  params: [payload.grantId, ...target, attemptId, payload.machineCommitment, payload.capabilityHash, payload.machineId,
    payload.scope, attemptId, attemptId, payload.credentialHash, payload.credentialExpiresAt] };
  return { sql: `EXISTS (SELECT 1 FROM memory_machine_principals p JOIN memory_machine_grants g ON g.id = p.grant_id
    JOIN memory_principals generic ON generic.id = p.id AND generic.installation_id = p.installation_id AND generic.status = 'removed'
    WHERE p.id = ? AND p.installation_id = ? AND p.repository_id = ? AND p.status = 'revoked' AND p.revision = ?
      AND g.state = 'revoked' AND g.revision = ? AND g.machine_id = p.id AND g.installation_id = p.installation_id
      AND g.repository_id = p.repository_id)`, params: [payload.machineId, ...target, payload.machineRevision + 1, payload.grantRevision + 1] };
}

async function completed(context, input, action, payload, requestHash) {
  const { operator, target, state } = context;
  const attempts = await rows(operator, target, 'SELECT * FROM memory_machine_attempts WHERE id = ?', [input.attemptId]);
  if (!attempts.length) return null;
  const attempt = attempts[0];
  requireValue(attempt.installation_id === state.installation_id && attempt.action === action && attempt.request_hash === requestHash
    && attempt.payload_json === JSON.stringify(payload) && attempt.snapshot_hash === input.expected.snapshotHash
    && attempt.auth_revision === input.expected.authRevision && attempt.pin_revision === input.expected.pinRevision
    && attempt.pin_hash === state.pin_hash, 'machine-attempt-conflict');
  const proof = outcomeProof(action, payload, input.attemptId, state);
  const results = await rows(operator, target, `SELECT done.attempt_id FROM memory_machine_completions done
    JOIN memory_machine_audit audit ON audit.id = done.audit_id AND audit.attempt_id = done.attempt_id
    JOIN memory_machine_attempts a ON a.id = done.attempt_id AND a.audit_id = done.audit_id
    JOIN memory_machine_configuration c ON c.installation_id = a.installation_id
    WHERE a.id = ? AND done.installation_id = a.installation_id AND done.request_hash = a.request_hash
      AND audit.installation_id = a.installation_id AND audit.request_hash = a.request_hash AND audit.action = a.action AND audit.target_id = a.target_id
      AND c.state = 'pending' AND c.barrier_attempt_id IS NULL AND c.auth_revision = done.auth_revision
      AND done.auth_revision = a.auth_revision + 1 AND c.pin_revision = a.pin_revision AND c.pin_hash = a.pin_hash
      AND ${proof.sql}`, [input.attemptId, ...proof.params]);
  requireValue(results.length === 1, 'machine-operation-incomplete');
  return { ...machineSetupResult(target, state), operation: { action, attemptId: input.attemptId, completed: true,
    ...(action === 'issue' ? { grantId: payload.grantId } : { machineId: payload.machineId }) } };
}

function mutationStatements(context, input, action, payload, requestHash) {
  const { state } = context;
  const payloadJson = JSON.stringify(payload), auditId = crypto.randomUUID();
  const live = guard(context, input.attemptId, requestHash, payloadJson);
  const guarded = (sql, params) => ({ sql: `${sql} AND ${live.sql}`, params: [...params, ...live.params] });
  const targetId = action === 'issue' ? payload.grantId : payload.machineId;
  const result = [{ sql: `INSERT INTO memory_machine_attempts(id, installation_id, action, target_id, request_hash, payload_json,
    snapshot_hash, pin_hash, pin_revision, auth_revision, audit_id, created_at)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch() FROM memory_machine_configuration c
    WHERE c.installation_id = ? AND c.repository_id = ? AND c.target_json = ? AND c.request_hash = ?
      AND c.pin_hash = ? AND c.pin_revision = ? AND c.auth_revision = ? AND c.state = 'pending' AND c.barrier_attempt_id IS NULL`,
  params: [input.attemptId, state.installation_id, action, targetId, requestHash, payloadJson, input.expected.snapshotHash,
    state.pin_hash, input.expected.pinRevision, input.expected.authRevision, auditId, state.installation_id, state.repository_id,
    state.target_json, state.request_hash, state.pin_hash, input.expected.pinRevision, input.expected.authRevision] }];
  // Include audit identity in every mutation guard: a losing identical attempt cannot continue a winner's incomplete batch.
  live.sql += ' AND EXISTS (SELECT 1 FROM memory_machine_attempts WHERE id = ? AND audit_id = ?)';
  live.params.push(input.attemptId, auditId);
  if (action === 'issue') result.push(guarded(`INSERT INTO memory_machine_grants(id, installation_id, repository_id, commitment,
    secret_hash, scope, issued_attempt_id, created_at, expires_at) SELECT ?, ?, ?, ?, ?, ?, ?, unixepoch(), ?
    WHERE ? > unixepoch() AND ? <= unixepoch() + 600`, [payload.grantId, state.installation_id, state.repository_id,
    payload.machineCommitment, payload.capabilityHash, payload.scope, input.attemptId, payload.expiresAt, payload.expiresAt, payload.expiresAt]));
  if (action === 'enroll') {
    const ceilings = machineScopes.slice(machineScopes.indexOf(payload.scope));
    result.push(guarded(`UPDATE memory_machine_grants SET state = 'consumed', revision = revision + 1, consumed_attempt_id = ?, machine_id = ?
      WHERE id = ? AND installation_id = ? AND repository_id = ? AND state = 'pending' AND revision = 1
        AND secret_hash = ? AND commitment = ? AND expires_at > unixepoch() AND scope IN (${ceilings.map(() => '?').join(',')})
        AND EXISTS (SELECT 1 FROM memory_machine_completions done WHERE done.attempt_id = memory_machine_grants.issued_attempt_id)
        AND NOT EXISTS (SELECT 1 FROM memory_machine_principals WHERE id = ?)`,
    [input.attemptId, payload.machineId, payload.grantId, state.installation_id, state.repository_id, payload.capabilityHash,
      payload.machineCommitment, ...ceilings, payload.machineId]));
    const consumed = `EXISTS (SELECT 1 FROM memory_machine_grants WHERE id = ? AND state = 'consumed' AND revision = 2
      AND machine_id = ? AND consumed_attempt_id = ? AND commitment = ? AND secret_hash = ?)`;
    const consumption = [payload.grantId, payload.machineId, input.attemptId, payload.machineCommitment, payload.capabilityHash];
    result.push(guarded(`INSERT INTO memory_principals(id, installation_id, created_at)
      SELECT ?, ?, unixepoch() WHERE ${consumed}`, [payload.machineId, state.installation_id, ...consumption]));
    result.push(guarded(`INSERT INTO memory_machine_principals(id, installation_id, repository_id, commitment, grant_id, scope,
      enrollment_attempt_id, created_at) SELECT ?, ?, ?, ?, ?, ?, ?, unixepoch() WHERE ${consumed}`,
    [payload.machineId, state.installation_id, state.repository_id, payload.machineCommitment, payload.grantId, payload.scope, input.attemptId, ...consumption]));
    result.push(guarded(`INSERT INTO memory_machine_credentials(hash, machine_id, grant_revision, machine_revision, attempt_id, issued_at, expires_at)
      SELECT ?, p.id, 2, 1, ?, unixepoch(), ? FROM memory_machine_principals p
      WHERE p.id = ? AND p.status = 'active' AND p.revision = 1 AND p.enrollment_attempt_id = ? AND ${consumed}`,
    [payload.credentialHash, input.attemptId, payload.credentialExpiresAt, payload.machineId, input.attemptId, ...consumption]));
  }
  if (action === 'revoke') {
    result.push(guarded(`UPDATE memory_machine_grants SET state = 'revoked', revision = revision + 1
      WHERE machine_id = ? AND installation_id = ? AND repository_id = ? AND state = 'consumed' AND revision = ?
        AND EXISTS (SELECT 1 FROM memory_machine_principals p WHERE p.id = ? AND p.status = 'active' AND p.revision = ?)`,
    [payload.machineId, state.installation_id, state.repository_id, payload.grantRevision, payload.machineId, payload.machineRevision]));
    result.push(guarded(`UPDATE memory_machine_principals SET status = 'revoked', revision = revision + 1
      WHERE id = ? AND installation_id = ? AND repository_id = ? AND status = 'active' AND revision = ?
        AND EXISTS (SELECT 1 FROM memory_machine_grants g WHERE g.id = memory_machine_principals.grant_id
          AND g.machine_id = ? AND g.state = 'revoked' AND g.revision = ?)`,
    [payload.machineId, state.installation_id, state.repository_id, payload.machineRevision, payload.machineId, payload.grantRevision + 1]));
  }
  if (action === 'revoke') result.push(guarded(`UPDATE memory_principals SET status = 'removed' WHERE id = ? AND installation_id = ?
    AND status = 'active' AND EXISTS (SELECT 1 FROM memory_machine_principals p WHERE p.id = ? AND p.status = 'revoked'
      AND p.revision = ?)`, [payload.machineId, state.installation_id, payload.machineId, payload.machineRevision + 1]));
  const proof = outcomeProof(action, payload, input.attemptId, state);
  result.push(guarded(`INSERT INTO memory_machine_audit(id, installation_id, attempt_id, action, target_id, request_hash, created_at)
    SELECT ?, ?, ?, ?, ?, ?, unixepoch() WHERE ${proof.sql}`, [auditId, state.installation_id, input.attemptId, action, targetId, requestHash, ...proof.params]));
  result.push(guarded(`INSERT INTO memory_machine_completions(attempt_id, installation_id, request_hash, audit_id, auth_revision, created_at)
    SELECT ?, ?, ?, ?, ?, unixepoch() WHERE ${proof.sql}`, [input.attemptId, state.installation_id, requestHash, auditId,
    input.expected.authRevision + 1, ...proof.params]));
  return result;
}

async function validateMutationEvidence(context, action, payload) {
  const { operator, target, state } = context;
  const now = Math.floor(Date.now() / 1000);
  if (action === 'issue') {
    requireValue(payload.expiresAt > now && payload.expiresAt <= now + 600, 'machine-grant-unavailable');
    const prior = await rows(operator, target, 'SELECT id FROM memory_machine_grants WHERE id = ? OR secret_hash = ?',
      [payload.grantId, payload.capabilityHash]);
    requireValue(prior.length === 0, 'machine-grant-unavailable');
    return;
  }
  if (action === 'enroll') {
    const grants = await rows(operator, target, `SELECT g.* FROM memory_machine_grants g
      JOIN memory_machine_attempts a ON a.id = g.issued_attempt_id AND a.installation_id = g.installation_id
      JOIN memory_machine_completions done ON done.attempt_id = a.id AND done.installation_id = a.installation_id
        AND done.request_hash = a.request_hash AND done.audit_id = a.audit_id AND done.auth_revision = a.auth_revision + 1
      JOIN memory_machine_audit audit ON audit.id = done.audit_id AND audit.attempt_id = a.id
        AND audit.installation_id = a.installation_id AND audit.action = 'issue' AND audit.target_id = g.id AND audit.request_hash = a.request_hash
      WHERE g.id = ? AND g.installation_id = ? AND g.repository_id = ? AND g.state = 'pending' AND g.revision = 1
        AND g.secret_hash = ? AND g.commitment = ? AND g.expires_at > unixepoch()
        AND a.action = 'issue' AND a.target_id = g.id AND json_extract(a.payload_json, '$.grantId') = g.id
        AND json_extract(a.payload_json, '$.machineCommitment') = g.commitment AND json_extract(a.payload_json, '$.capabilityHash') = g.secret_hash
        AND json_extract(a.payload_json, '$.scope') = g.scope AND json_extract(a.payload_json, '$.expiresAt') = g.expires_at`,
      [payload.grantId, state.installation_id, state.repository_id, payload.capabilityHash, payload.machineCommitment]);
    requireValue(grants.length === 1 && machineScopes.indexOf(payload.scope) <= machineScopes.indexOf(grants[0].scope), 'machine-grant-unavailable');
    requireValue(payload.credentialExpiresAt > now && payload.credentialExpiresAt <= now + 2592000, 'machine-grant-unavailable');
    const principals = await rows(operator, target, 'SELECT id FROM memory_principals WHERE id = ?', [payload.machineId]);
    const credentials = await rows(operator, target, 'SELECT hash FROM memory_machine_credentials WHERE hash = ?', [payload.credentialHash]);
    requireValue(principals.length === 0 && credentials.length === 0, 'machine-grant-unavailable');
    return;
  }
  const machines = await rows(operator, target, `SELECT p.id FROM memory_machine_principals p
    JOIN memory_machine_grants g ON g.id = p.grant_id AND g.machine_id = p.id AND g.installation_id = p.installation_id AND g.repository_id = p.repository_id
    JOIN memory_principals generic ON generic.id = p.id AND generic.installation_id = p.installation_id AND generic.status = 'active'
    WHERE p.id = ? AND p.installation_id = ? AND p.repository_id = ? AND p.status = 'active' AND p.revision = ?
      AND g.state = 'consumed' AND g.revision = ?`,
    [payload.machineId, state.installation_id, state.repository_id, payload.machineRevision, payload.grantRevision]);
  requireValue(machines.length === 1, 'machine-grant-unavailable');
}

async function mutate(operator, input, action, payload) {
  const context = await machineEnvironment(operator, input.installation);
  context.expected = input.expected;
  const requestHash = await machineHash({ version: 2, installation: input.installation, action, attemptId: input.attemptId, expected: input.expected, payload });
  const prior = await completed(context, input, action, payload, requestHash);
  if (prior) return prior;
  requireValue(context.state.state === 'pending' && context.state.barrier_attempt_id === null, 'machine-operation-incomplete');
  requireValue(sameMachineValue(context.snapshot, input.expected), 'machine-authority-stale');
  await validateMutationEvidence(context, action, payload);
  let failure;
  try { await query(operator, context.target, mutationStatements(context, input, action, payload, requestHash)); }
  catch (error) { failure = error; }
  const current = await machineEnvironment(operator, input.installation);
  const outcome = await completed(current, input, action, payload, requestHash);
  if (outcome) return outcome;
  throw failure ?? new MemoryOperatorError('machine-operation-incomplete');
}

export async function issueMachineGrant(operator, input) {
  const fields = ['grantId', 'machineCommitment', 'capabilityHash', 'scope', 'expiresAt'];
  validateBase(input, fields);
  requireValue(opaqueId(input.grantId) && machineDigest(input.machineCommitment) && machineDigest(input.capabilityHash)
    && machineScopes.includes(input.scope) && integer(input.expiresAt));
  return mutate(operator, input, 'issue', Object.fromEntries(fields.map(key => [key, input[key]])));
}
export async function enrollMemoryMachine(operator, input) {
  const fields = ['grantId', 'machineId', 'machineCommitment', 'capabilityHash', 'scope', 'credentialHash', 'credentialExpiresAt'];
  validateBase(input, fields);
  requireValue(opaqueId(input.grantId) && opaqueId(input.machineId) && machineDigest(input.machineCommitment)
    && machineDigest(input.capabilityHash) && machineScopes.includes(input.scope) && machineDigest(input.credentialHash) && integer(input.credentialExpiresAt));
  return mutate(operator, input, 'enroll', Object.fromEntries(fields.map(key => [key, input[key]])));
}
export async function revokeMemoryMachine(operator, input) {
  const fields = ['machineId', 'machineRevision', 'grantRevision'];
  validateBase(input, fields);
  requireValue(opaqueId(input.machineId) && integer(input.machineRevision) && integer(input.grantRevision));
  return mutate(operator, input, 'revoke', Object.fromEntries(fields.map(key => [key, input[key]])));
}
