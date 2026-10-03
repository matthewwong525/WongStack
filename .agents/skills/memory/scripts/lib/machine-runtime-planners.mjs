// Pure SQL/parameter planners. Dispatch context and possession checks live in the operator module.
import { machineScopes } from './machine-enrollment.mjs';
import { requireValue } from './installation-validation.mjs';
import { runtimeContext } from '../../worker/machine-context.mjs';
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

function legacyStatements(context, input, action, payload, requestHash) {
  const { state } = context;
  const payloadJson = JSON.stringify(payload), auditId = context.auditId;
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

export function planMachineRuntime(context, state, input, action, payload, requestHash) {
  runtimeContext(context, ['issue','revoke','activate'].includes(action));
  requireValue(['issue','enroll','revoke','renew','stage','publish','activate'].includes(action));
  const c = state.configuration, r = state.runtime, auditId = crypto.randomUUID(), payloadJson = JSON.stringify(payload);
  const targetId = action === 'activate' ? c.installation_id : action === 'issue' ? payload.grantId : payload.machineId;
  const statements = [{ sql: `INSERT INTO memory_runtime_attempts(id,installation_id,action,target_id,request_hash,payload_json,
    snapshot_hash,baseline_hash,pin_hash,pin_revision,auth_revision,runtime_revision,audit_id,created_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,unixepoch() FROM memory_runtime_configuration r JOIN memory_machine_configuration c USING(installation_id)
    WHERE r.installation_id=? AND r.repository_id=? AND r.target_json=? AND r.request_hash=? AND r.baseline_hash=?
    AND r.pin_hash=? AND c.pin_hash=r.pin_hash AND c.pin_revision=? AND c.auth_revision=? AND r.runtime_revision=?
    AND r.state='pending' AND r.barrier_attempt_id IS NULL AND c.state='pending' AND c.barrier_attempt_id IS NULL`,
  params: [input.attemptId,c.installation_id,action,targetId,requestHash,payloadJson,input.expected.snapshotHash,r.baseline_hash,r.pin_hash,
    input.expected.pinRevision,input.expected.authRevision,input.expected.runtimeRevision,auditId,c.installation_id,c.repository_id,
    c.target_json,r.request_hash,r.baseline_hash,r.pin_hash,input.expected.pinRevision,input.expected.authRevision,input.expected.runtimeRevision] }];
  const guardSql = `EXISTS(SELECT 1 FROM memory_runtime_attempts a JOIN memory_runtime_configuration r USING(installation_id)
    JOIN memory_machine_configuration c USING(installation_id) WHERE a.id=? AND a.audit_id=? AND a.request_hash=? AND a.payload_json=?
    AND a.snapshot_hash=? AND a.baseline_hash=? AND r.baseline_hash=a.baseline_hash AND r.state='maintenance' AND r.barrier_attempt_id=a.id
    AND r.runtime_revision=a.runtime_revision+1 AND a.runtime_revision=? AND r.pin_hash=a.pin_hash AND c.pin_hash=a.pin_hash
    AND c.pin_revision=a.pin_revision AND a.pin_revision=? AND a.auth_revision=? AND r.target_json=?
    AND c.auth_revision=a.auth_revision+? AND c.state='pending' AND c.barrier_attempt_id IS NULL)`;
  const guards = before => [input.attemptId,auditId,requestHash,payloadJson,input.expected.snapshotHash,r.baseline_hash,
    input.expected.runtimeRevision,input.expected.pinRevision,input.expected.authRevision,c.target_json,
    before ? 0 : ['issue','enroll','revoke'].includes(action) ? 1 : 0];
  const append = (sql, params, before = false) => statements.push({ sql: `${sql} AND ${guardSql}`, params: [...params,...guards(before)] });
  if (payload.nonceHash) append(`INSERT INTO memory_runtime_proofs(nonce_hash,attempt_id,machine_id,grant_id,commitment,proof_hash,deadline,created_at)
    SELECT ?,?,?,?,?,?,?,unixepoch() WHERE ?>unixepoch()`,
  [payload.nonceHash,input.attemptId,payload.machineId,payload.grantId,payload.machineCommitment,payload.proofHash,payload.deadline,payload.deadline], true);
  if (['issue','enroll','revoke'].includes(action)) statements.push(...legacyStatements({ state:c,expected:input.expected,auditId },input,action,payload,requestHash));
  if (action === 'enroll' || (action === 'renew' && payload.generation === 1)) append(`INSERT INTO memory_runtime_keys(machine_id,commitment,public_key_json,attempt_id)
    SELECT ?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM memory_runtime_keys WHERE machine_id=?)`, [payload.machineId,payload.machineCommitment,payload.publicKeyJson,input.attemptId,payload.machineId]);
  if (action === 'enroll' || action === 'renew') append(`INSERT INTO memory_runtime_rotations(hash,machine_id,grant_id,generation,previous_hash,
    overlap_until,scope,grant_revision,machine_revision,issued_at,expires_at,attempt_id)
    SELECT ?,?,?,?,?,?,?,?,?,unixepoch(),?,? WHERE ?>unixepoch() AND ?<=unixepoch()+120 AND ?>unixepoch() AND ?<=unixepoch()+2592000`,
  [payload.credentialHash,payload.machineId,payload.grantId,payload.generation,payload.previousHash,payload.overlapUntil,payload.scope,
    payload.grantRevision,payload.machineRevision,payload.credentialExpiresAt,input.attemptId,payload.overlapUntil,payload.overlapUntil,
    payload.credentialExpiresAt,payload.credentialExpiresAt]);
  if (action === 'stage' || action === 'publish') append(`INSERT INTO memory_runtime_transcripts(attempt_id,machine_id,object_hash,session_hash,
    content_hash,visibility,event,stage_attempt_id,auth_revision,grant_revision,machine_revision,credential_generation,created_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,?,unixepoch() WHERE 1`,
  [input.attemptId,payload.machineId,payload.objectHash,payload.sessionHash,payload.contentHash,payload.visibility,
    action === 'stage' ? 'staged' : 'published',action === 'stage' ? null : payload.stageAttemptId,input.expected.authRevision,payload.grantRevision,payload.machineRevision,payload.credentialGeneration]);
  if (action === 'activate') append(`INSERT INTO memory_runtime_activations(attempt_id,installation_id,baseline_hash,pin_hash,protocol_hash,route_contract_hash,auth_revision,created_at)
    SELECT ?,?,?,?,?,?,?,unixepoch() WHERE 1`, [input.attemptId,c.installation_id,r.baseline_hash,r.pin_hash,payload.protocolHash,payload.routeContractHash,c.auth_revision]);
  append(`INSERT INTO memory_runtime_audit(id,installation_id,attempt_id,action,target_id,request_hash,created_at)
    SELECT ?,?,?,?,?,?,unixepoch() WHERE EXISTS(SELECT 1 FROM memory_runtime_outcomes WHERE id=?)`,
  [auditId,c.installation_id,input.attemptId,action,targetId,requestHash,input.attemptId]);
  append(`INSERT INTO memory_runtime_completions(attempt_id,installation_id,request_hash,audit_id,auth_revision,runtime_revision,created_at)
    SELECT id,installation_id,request_hash,audit_id,auth_revision,runtime_revision,unixepoch() FROM memory_runtime_outcomes WHERE id=?`, [input.attemptId]);
  return statements;
}

export function planRuntimeBootstrap(state, input, requestHash, manifestHash) {
  const c = state.configuration, auditId = crypto.randomUUID();
  return [{ sql: `INSERT INTO memory_runtime_configuration(installation_id,repository_id,target_json,baseline_hash,baseline_request_hash,
    baseline_audit_id,pin_hash,operation_id,request_hash,upgrade_expected_json,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,unixepoch()
    FROM memory_machine_configuration c WHERE c.installation_id=? AND c.repository_id=? AND c.target_json=?
    AND c.request_hash=? AND c.pin_hash=? AND c.auth_revision=? AND c.pin_revision=? AND c.state='pending' AND c.barrier_attempt_id IS NULL`,
  params: [c.installation_id,c.repository_id,c.target_json,state.baselineHash,c.request_hash,state.baselineAuditId,c.pin_hash,input.operationId,
    requestHash,JSON.stringify(input.expected),c.installation_id,c.repository_id,c.target_json,c.request_hash,c.pin_hash,c.auth_revision,c.pin_revision] },
  { sql: `INSERT INTO memory_runtime_audit(id,installation_id,attempt_id,action,target_id,request_hash,created_at)
    SELECT ?,installation_id,operation_id,'upgrade',installation_id,request_hash,unixepoch() FROM memory_runtime_configuration
    WHERE operation_id=? AND request_hash=?`, params:[auditId,input.operationId,requestHash] },
  { sql: `INSERT INTO memory_runtime_manifests(installation_id,repository_id,schema_version,manifest_hash,baseline_hash,request_hash,audit_id)
    SELECT installation_id,repository_id,13,?,baseline_hash,request_hash,? FROM memory_runtime_configuration WHERE operation_id=? AND request_hash=?`,
  params:[manifestHash,auditId,input.operationId,requestHash] },
  { sql: `INSERT INTO memory_runtime_bootstrap(installation_id,operation_id,request_hash,baseline_hash,audit_id)
    SELECT r.installation_id,r.operation_id,r.request_hash,r.baseline_hash,a.id FROM memory_runtime_configuration r
    JOIN memory_runtime_manifests m USING(installation_id) JOIN memory_runtime_audit a ON a.id=m.audit_id
    WHERE r.operation_id=? AND r.request_hash=? AND m.manifest_hash=? AND a.id=?`, params:[input.operationId,requestHash,manifestHash,auditId] }];
}
