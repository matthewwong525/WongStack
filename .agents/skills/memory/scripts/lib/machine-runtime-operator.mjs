// Inactive entrypoints. No route, client, CLI, provider dispatch or live activation caller.
import { inspectMachinePins, initializeMachineMemory, sameMachineValue, machineDigest } from './machine-operator.mjs';
import { machineScopes, machineScopePolicy } from './machine-enrollment.mjs';
import { resourceTarget, exactKeys, opaqueId, requireValue, query, rows, digest, MemoryOperatorError } from './installation-validation.mjs';
import { machineHash } from './machine-state.mjs';
import { machineRuntimeMigrations } from './machine-runtime-migrations.mjs';
import { readRuntimeState, readRuntimeBaseline, validateCompleted12, runtimeManifestHash, runtimePending, activeRuntimeMachine } from './machine-runtime-state.mjs';
import { planMachineRuntime, planRuntimeBootstrap } from './machine-runtime-planners.mjs';
import { runtimeContext, providerMachineContext } from '../../worker/machine-context.mjs';
import { verifyMachineProof, rawCapabilityHash } from '../../worker/machine-proof.mjs';

export async function trustedMachineRuntimeContext(operator, installation) {
  const target = resourceTarget(installation, true);
  requireValue(typeof operator?.readMigration === 'function' && typeof operator?.cloudflare === 'function', 'machine-context-denied');
  await inspectMachinePins(operator, target);
  return providerMachineContext(installation, (sql,params=[]) => rows(operator,target,sql,params),
    statements => query(operator,target,statements), () => inspectMachinePins(operator,target), filename => operator.readMigration(filename));
}
export async function prepareMachineRuntime(context, input) {
  const internal = runtimeContext(context,true);
  exactKeys(input,['operationId','expected','pinHash']);
  requireValue(opaqueId(input.operationId) && machineDigest(input.pinHash));
  requireValue(await internal.inspectPins() === input.pinHash, 'target-mismatch');
  const versions = await internal.read('SELECT version FROM schema_migrations ORDER BY version');
  requireValue([12,13].includes(versions.length), 'schema-unsupported');
  const baseline = await readRuntimeBaseline(context,versions.length);
  requireValue(baseline.configuration.pin_hash === input.pinHash, 'target-mismatch');
  const requestHash = await machineHash({ version:13,installation:internal.installation,operationId:input.operationId,
    expected:input.expected,pinHash:input.pinHash,baselineHash:baseline.baselineHash });
  if (versions.length === 12) {
    await validateCompleted12(context);
    const c = baseline.configuration;
    // The exact original schema12 snapshot is supplied; never reset/adopt a store.
    const expected = { authRevision:c.auth_revision,pinRevision:c.pin_revision,snapshotHash:await machineHash({
      installationId:c.installation_id,repositoryId:c.repository_id,target:JSON.parse(c.target_json),requestHash:c.request_hash,pinHash:c.pin_hash,
      authRevision:c.auth_revision,pinRevision:c.pin_revision,state:c.state,barrier:c.barrier_attempt_id }) };
    requireValue(sameMachineValue(expected,input.expected), 'machine-authority-stale');
    let sql;
    try { sql = await internal.readMigration(machineRuntimeMigrations.at(-1).filename); }
    catch { throw new MemoryOperatorError('migration-bundle-invalid'); }
    requireValue(typeof sql === 'string' && await digest(sql) === machineRuntimeMigrations.at(-1).sha256, 'migration-bundle-invalid');
    try { await internal.write([{sql,params:[]},...planRuntimeBootstrap(baseline,input,requestHash,await runtimeManifestHash())]); }
    catch { /* Completion below requires exact durable receipt; provider envelope is irrelevant. */ }
  }
  const state = await readRuntimeState(context);
  requireValue(state.runtime.operation_id === input.operationId && state.runtime.request_hash === requestHash
    && state.runtime.state === 'pending' && state.configuration.state === 'pending', 'machine-operation-incomplete');
  return runtimePending(state);
}
export async function prepareFreshMachineRuntime(operator,input) {
  exactKeys(input,['bootstrap','operationId']);
  exactKeys(input.bootstrap,['target','operationId','expectedInstallation','pinHash']);
  requireValue(opaqueId(input.operationId) && opaqueId(input.bootstrap.operationId) && machineDigest(input.bootstrap.pinHash));
  const target=resourceTarget(input.bootstrap.target);
  requireValue(await inspectMachinePins(operator,target) === input.bootstrap.pinHash,'target-mismatch');
  const runtimeTables=await rows(operator,target,"SELECT name FROM sqlite_master WHERE type='table' AND name='memory_runtime_configuration'");
  if(runtimeTables.length) {
    const baseline=await rows(operator,target,'SELECT * FROM memory_machine_configuration');
    const runtime=await rows(operator,target,'SELECT * FROM memory_runtime_configuration');
    requireValue(baseline.length === 1 && runtime.length === 1,'machine-operation-incomplete');
    requireValue(baseline[0].operation_id === input.bootstrap.operationId
      && baseline[0].request_hash === await machineHash({version:2,target,operationId:input.bootstrap.operationId,pinHash:input.bootstrap.pinHash}), 'installation-conflict');
    const installation={...target,installationId:baseline[0].installation_id,repositoryId:baseline[0].repository_id};
    if(input.bootstrap.expectedInstallation !== null) {
      exactKeys(input.bootstrap.expectedInstallation,['installationId','repositoryId']);
      requireValue(input.bootstrap.expectedInstallation.installationId === installation.installationId
        && input.bootstrap.expectedInstallation.repositoryId === installation.repositoryId,'installation-conflict');
    }
    const context=await trustedMachineRuntimeContext(operator,installation);
    return prepareMachineRuntime(context,{operationId:input.operationId,expected:JSON.parse(runtime[0].upgrade_expected_json),pinHash:input.bootstrap.pinHash});
  }
  const prepared = await initializeMachineMemory(operator,input.bootstrap);
  const context = await trustedMachineRuntimeContext(operator,prepared.installation);
  return prepareMachineRuntime(context,{operationId:input.operationId,expected:prepared.snapshot,pinHash:input.bootstrap.pinHash});
}
export async function readMachineRuntimeStatus(context) { runtimeContext(context,true); return runtimePending(await readRuntimeState(context)); }
const integer = value => Number.isSafeInteger(value) && value >= 1;
function baseInput(input,proof = false,enroll = false) {
  exactKeys(input,['attemptId','expected','payload',...(proof ? ['proof'] : []),...(enroll ? ['capability'] : [])]);
  exactKeys(input.expected,['authRevision','pinRevision','runtimeRevision','snapshotHash']);
  requireValue(opaqueId(input.attemptId) && ['authRevision','pinRevision','runtimeRevision'].every(key => integer(input.expected[key]))
    && machineDigest(input.expected.snapshotHash));
}
export const runtimePayloadFields = Object.freeze({
  issue:['grantId','machineCommitment','capabilityHash','scope','expiresAt'],
  enroll:['grantId','machineId','machineCommitment','capabilityHash','scope','credentialHash','credentialExpiresAt','overlapUntil'],
  revoke:['machineId','grantId','machineRevision','grantRevision'],
  renew:['grantId','machineId','machineCommitment','scope','credentialHash','credentialExpiresAt','overlapUntil','previousHash','generation','machineRevision','grantRevision'],
  stage:['grantId','machineId','machineCommitment','scope','machineRevision','grantRevision','credentialGeneration','objectHash','sessionHash','contentHash','visibility'],
  publish:['grantId','machineId','machineCommitment','scope','machineRevision','grantRevision','credentialGeneration','objectHash','sessionHash','contentHash','visibility','stageAttemptId'],
  activate:['protocolHash','routeContractHash'],
});
function validatePayload(action,payload) {
  exactKeys(payload,runtimePayloadFields[action]);
  for (const [key,value] of Object.entries(payload)) {
    if (key.endsWith('Id')) requireValue(opaqueId(value));
    else if (key.endsWith('Hash') || key === 'machineCommitment') requireValue(machineDigest(value));
    else if (key === 'scope') requireValue(machineScopes.includes(value));
    else if (key === 'visibility') requireValue(['private','shared'].includes(value));
    else requireValue(integer(value));
  }
}
async function exactCompletion(context,state,input,action,payload,requestHash) {
  const { read } = runtimeContext(context);
  const attempts = await read('SELECT * FROM memory_runtime_attempts WHERE id=?',[input.attemptId]);
  if (!attempts.length) return null;
  const a = attempts[0];
  requireValue(a.action === action && a.installation_id === state.installation.installationId && a.request_hash === requestHash
    && a.payload_json === JSON.stringify(payload) && a.snapshot_hash === input.expected.snapshotHash
    && a.auth_revision === input.expected.authRevision && a.pin_revision === input.expected.pinRevision
    && a.runtime_revision === input.expected.runtimeRevision && a.baseline_hash === state.baselineHash && a.pin_hash === state.runtime.pin_hash,
  'machine-attempt-conflict');
  const receipts = await read(`SELECT d.attempt_id FROM memory_runtime_completions d
    JOIN memory_runtime_audit audit ON audit.id=d.audit_id AND audit.attempt_id=d.attempt_id
    JOIN memory_runtime_outcomes o ON o.id=d.attempt_id AND o.installation_id=d.installation_id
    WHERE d.attempt_id=? AND d.request_hash=o.request_hash AND d.audit_id=o.audit_id AND d.auth_revision=o.auth_revision
    AND d.runtime_revision=o.runtime_revision AND audit.action=o.action AND audit.target_id=o.target_id AND audit.request_hash=o.request_hash`,[input.attemptId]);
  requireValue(receipts.length === 1 && state.runtime.state === 'pending' && state.runtime.barrier_attempt_id === null
    && state.configuration.state === 'pending' && state.configuration.barrier_attempt_id === null, 'machine-operation-incomplete');
  return { ...runtimePending(state), operation:{action,attemptId:input.attemptId,completed:true,requestHash} };
}
async function evidence(context,state,action,payload) {
  const { read } = runtimeContext(context), now = Math.floor(Date.now()/1000);
  if (action === 'activate') {
    for (const table of ['memory_keys','memory_admins','memory_credentials','memory_devices','memory_identity_bindings','memory_memberships',
      'memory_providers','memory_owner_intents','memory_installation_configuration','memory_bootstrap_completion','memory_schema_receipts'])
      requireValue((await read(`SELECT count(*) n FROM ${table}`))[0].n === 0, 'legacy-cutover-required');
    requireValue((await read('SELECT * FROM memory_runtime_activations')).length === 0, 'machine-operation-incomplete');
    return;
  }
  if (action === 'issue') {
    requireValue(payload.expiresAt > now && payload.expiresAt <= now+600, 'machine-grant-unavailable');
    requireValue((await read('SELECT id FROM memory_machine_grants WHERE id=? OR secret_hash=?',[payload.grantId,payload.capabilityHash])).length === 0,
      'machine-grant-unavailable');
    return;
  }
  if (action === 'enroll') {
    const grants = await read(`SELECT g.* FROM memory_machine_grants g
      JOIN memory_machine_completions done ON done.attempt_id=g.issued_attempt_id
      JOIN memory_machine_attempts a ON a.id=done.attempt_id AND a.audit_id=done.audit_id AND a.request_hash=done.request_hash
      JOIN memory_machine_audit audit ON audit.id=done.audit_id AND audit.attempt_id=a.id AND audit.action='issue' AND audit.target_id=g.id
      WHERE g.id=? AND g.installation_id=? AND g.repository_id=? AND g.state='pending' AND g.revision=1
      AND g.commitment=? AND g.secret_hash=? AND g.expires_at>unixepoch()`,
    [payload.grantId,state.installation.installationId,state.installation.repositoryId,payload.machineCommitment,payload.capabilityHash]);
    requireValue(grants.length === 1 && machineScopes.indexOf(payload.scope) <= machineScopes.indexOf(grants[0].scope), 'machine-proof-denied');
    requireValue((await read('SELECT id FROM memory_principals WHERE id=?',[payload.machineId])).length === 0, 'machine-proof-denied');
  } else {
    const machine = await activeRuntimeMachine(context,state,payload.machineId,payload.grantId);
    requireValue(machine.revision === payload.machineRevision && machine.grant_revision === payload.grantRevision, 'machine-proof-denied');
    if (action !== 'revoke') {
      requireValue(machine.scope === payload.scope && machine.commitment === payload.machineCommitment, 'machine-proof-denied');
      const keys = await read('SELECT * FROM memory_runtime_keys WHERE machine_id=?',[payload.machineId]);
      requireValue((keys.length === 1 && keys[0].commitment === payload.machineCommitment && keys[0].public_key_json === payload.publicKeyJson)
        || (action === 'renew' && keys.length === 0 && payload.generation === 1), 'machine-proof-denied');
    }
  }
  if (action === 'enroll' || action === 'renew') {
    requireValue(payload.credentialExpiresAt > now && payload.credentialExpiresAt <= now+2592000
      && payload.overlapUntil > now && payload.overlapUntil <= now+120, 'machine-proof-denied');
    requireValue((await read('SELECT hash FROM memory_machine_credentials WHERE hash=?',[payload.credentialHash])).length === 0
      && (await read('SELECT hash FROM memory_runtime_rotations WHERE hash=?',[payload.credentialHash])).length === 0, 'machine-proof-denied');
  }
  if (action === 'renew') {
    const latest = await read('SELECT * FROM memory_runtime_rotations WHERE machine_id=? ORDER BY generation DESC LIMIT 1',[payload.machineId]);
    const baseline = latest.length ? [] : await read(`SELECT k.* FROM memory_machine_credentials k
      JOIN memory_machine_completions d ON d.attempt_id=k.attempt_id JOIN memory_machine_attempts a ON a.id=d.attempt_id
      JOIN memory_machine_audit audit ON audit.id=d.audit_id AND audit.attempt_id=a.id
      WHERE k.machine_id=? AND k.hash=? AND k.machine_revision=? AND k.grant_revision=? AND a.action='enroll'
      AND audit.action='enroll' AND audit.target_id=k.machine_id AND d.request_hash=a.request_hash AND d.audit_id=a.audit_id`,
    [payload.machineId,payload.previousHash,payload.machineRevision,payload.grantRevision]);
    requireValue((latest.length === 1 && payload.previousHash === latest[0].hash && payload.generation === latest[0].generation+1
      && latest[0].scope === payload.scope && latest[0].machine_revision === payload.machineRevision && latest[0].grant_revision === payload.grantRevision)
      || (latest.length === 0 && baseline.length === 1 && payload.generation === 1),
    'machine-proof-denied'); // Old bearer expiry deliberately does not matter: fresh private-key proof does.
  }
  if (action === 'stage' || action === 'publish') {
    requireValue(payload.visibility === 'private' || machineScopePolicy(payload.scope).writeOwnShared, 'machine-proof-denied');
    const latest=await read('SELECT generation FROM memory_runtime_rotations WHERE machine_id=? ORDER BY generation DESC LIMIT 1',[payload.machineId]);
    requireValue(latest.length === 1 && latest[0].generation === payload.credentialGeneration, 'machine-proof-denied');
    if (action === 'publish') {
      const stages = await read(`SELECT staged.* FROM memory_runtime_transcripts staged JOIN memory_runtime_completions done ON done.attempt_id=staged.attempt_id
        WHERE staged.attempt_id=? AND staged.event='staged'`,[payload.stageAttemptId]);
      requireValue(stages.length === 1 && stages[0].machine_id === payload.machineId && stages[0].object_hash === payload.objectHash
        && stages[0].session_hash === payload.sessionHash && stages[0].content_hash === payload.contentHash && stages[0].visibility === payload.visibility
        && stages[0].credential_generation === payload.credentialGeneration && stages[0].grant_revision === payload.grantRevision
        && stages[0].machine_revision === payload.machineRevision, 'machine-proof-denied');
    }
  }
}
async function mutate(context,input,action) {
  const publicProof = ['enroll','renew','stage','publish'].includes(action);
  runtimeContext(context,!publicProof); baseInput(input,publicProof,action === 'enroll'); validatePayload(action,input.payload);
  let state = await readRuntimeState(context), payload = { ...input.payload };
  if (publicProof) {
    // This is a source primitive, not production readiness: durable trusted activation is still required.
    requireValue((await runtimeContext(context).read(`SELECT x.attempt_id FROM memory_runtime_activations x
      JOIN memory_runtime_completions d ON d.attempt_id=x.attempt_id WHERE x.installation_id=? AND x.pin_hash=? AND x.baseline_hash=?`,
    [state.installation.installationId,state.runtime.pin_hash,state.baselineHash])).length === 1, 'machine-runtime-inactive');
    const verified = await verifyMachineProof({installation:state.installation,purpose:action,attemptId:input.attemptId,expected:input.expected,payload},input.proof);
    requireValue(verified.commitment === payload.machineCommitment, 'machine-proof-denied');
    if (action === 'enroll') {
      requireValue(await rawCapabilityHash(input.capability) === payload.capabilityHash, 'machine-proof-denied');
      payload = { ...payload,generation:1,previousHash:null,machineRevision:1,grantRevision:2 };
    }
    payload = { ...payload,...verified };
    delete payload.commitment;
    const priorProof = await runtimeContext(context).read('SELECT attempt_id FROM memory_runtime_proofs WHERE nonce_hash=?',[payload.nonceHash]);
    requireValue(!priorProof.length || priorProof[0].attempt_id === input.attemptId, 'machine-proof-denied');
  }
  const requestHash = await machineHash({version:13,installation:state.installation,action,attemptId:input.attemptId,expected:input.expected,payload});
  const prior = await exactCompletion(context,state,input,action,payload,requestHash);
  if (prior) return prior;
  requireValue(state.runtime.state === 'pending' && state.configuration.state === 'pending' && state.runtime.barrier_attempt_id === null
    && state.configuration.barrier_attempt_id === null, 'machine-operation-incomplete');
  requireValue(sameMachineValue(state.snapshot,input.expected), 'machine-authority-stale');
  await evidence(context,state,action,payload);
  const planned=planMachineRuntime(context,state,input,action,payload,requestHash);
  runtimeContext(context).reserve?.(planned.length+12);
  try { await runtimeContext(context).write(planned); }
  catch { /* Never expose provider/D1 error details or infer completion from success. */ }
  state = await readRuntimeState(context);
  const result = await exactCompletion(context,state,input,action,payload,requestHash);
  requireValue(result !== null, 'machine-operation-incomplete');
  return result;
}
export const issueRuntimeMachineGrant = (context,input) => mutate(context,input,'issue');
export const enrollRuntimeMachine = (context,input) => mutate(context,input,'enroll');
export const revokeRuntimeMachine = (context,input) => mutate(context,input,'revoke');
export const renewRuntimeMachine = (context,input) => mutate(context,input,'renew');
export const stageRuntimeTranscript = (context,input) => mutate(context,input,'stage');
export const publishRuntimeTranscript = (context,input) => mutate(context,input,'publish');
export const activateMachineRuntime = (context,input) => mutate(context,input,'activate');

export async function validateRuntimeBearer(context,input) {
  exactKeys(input,['machineId','credentialHash']);
  requireValue(opaqueId(input.machineId) && machineDigest(input.credentialHash));
  const state = await readRuntimeState(context), { read } = runtimeContext(context);
  requireValue(state.runtime.state === 'pending' && state.configuration.state === 'pending', 'machine-proof-denied');
  requireValue((await read(`SELECT x.attempt_id FROM memory_runtime_activations x JOIN memory_runtime_completions d ON d.attempt_id=x.attempt_id
    WHERE x.installation_id=? AND x.baseline_hash=? AND x.pin_hash=?`,[state.installation.installationId,state.baselineHash,state.runtime.pin_hash])).length === 1, 'machine-runtime-inactive');
  const rotations = await read(`SELECT k.* FROM memory_runtime_rotations k JOIN memory_runtime_completions done ON done.attempt_id=k.attempt_id
    JOIN memory_runtime_attempts a ON a.id=done.attempt_id AND a.audit_id=done.audit_id AND a.request_hash=done.request_hash
    JOIN memory_runtime_audit audit ON audit.id=done.audit_id AND audit.attempt_id=a.id AND audit.action=a.action
    AND audit.target_id=k.machine_id AND audit.request_hash=a.request_hash AND audit.installation_id=a.installation_id
    WHERE k.machine_id=? AND done.installation_id=a.installation_id AND a.installation_id=?
    AND done.runtime_revision=a.runtime_revision+1 AND done.auth_revision=a.auth_revision+CASE WHEN a.action='enroll' THEN 1 ELSE 0 END
    AND json_extract(a.payload_json,'$.credentialHash')=k.hash AND json_extract(a.payload_json,'$.generation')=k.generation
    AND json_extract(a.payload_json,'$.machineId')=k.machine_id ORDER BY k.generation DESC`,[input.machineId,state.installation.installationId]);
  requireValue(rotations.length > 0, 'machine-proof-denied');
  const latest = rotations[0], selected = rotations.find(k => k.hash === input.credentialHash), now = Math.floor(Date.now()/1000);
  requireValue(selected && selected.expires_at > now && (selected.hash === latest.hash
    || (selected.hash === latest.previous_hash && selected.generation === latest.generation-1 && latest.overlap_until > now)), 'machine-proof-denied');
  const machine = await activeRuntimeMachine(context,state,input.machineId,selected.grant_id);
  requireValue(machine.revision === selected.machine_revision && machine.grant_revision === selected.grant_revision && machine.scope === selected.scope, 'machine-proof-denied');
  return { machineId:input.machineId,scope:machine.scope,policy:machineScopePolicy(machine.scope),snapshot:state.snapshot };
}

// Raw ledger privacy is independent of summary provenance ('shared' never grants raw bytes).
export async function readRuntimeTranscriptOwner(context,input) {
  exactKeys(input,['machineId','grantId','credentialHash','objectHash']);
  requireValue(opaqueId(input.machineId) && opaqueId(input.grantId) && machineDigest(input.objectHash));
  await validateRuntimeBearer(context,{machineId:input.machineId,credentialHash:input.credentialHash});
  const state = await readRuntimeState(context);
  requireValue(state.runtime.state === 'pending' && state.configuration.state === 'pending', 'machine-proof-denied');
  const machine = await activeRuntimeMachine(context,state,input.machineId,input.grantId);
  const values = await runtimeContext(context).read(`SELECT x.machine_id,x.object_hash,x.content_hash FROM memory_runtime_transcripts x
    JOIN memory_runtime_completions done ON done.attempt_id=x.attempt_id
    JOIN memory_runtime_attempts a ON a.id=done.attempt_id AND a.audit_id=done.audit_id AND a.request_hash=done.request_hash
    JOIN memory_runtime_audit audit ON audit.id=done.audit_id AND audit.attempt_id=a.id AND audit.action='publish'
    AND audit.target_id=x.machine_id AND audit.request_hash=a.request_hash
    WHERE x.object_hash=? AND x.event='published' AND a.installation_id=? AND done.installation_id=a.installation_id
    AND json_extract(a.payload_json,'$.objectHash')=x.object_hash AND json_extract(a.payload_json,'$.contentHash')=x.content_hash
    AND json_extract(a.payload_json,'$.machineId')=x.machine_id`,[input.objectHash,state.installation.installationId]);
  requireValue(values.length === 1 && (values[0].machine_id === input.machineId || machineScopePolicy(machine.scope).administerData), 'machine-proof-denied');
  return {machineId:values[0].machine_id,objectHash:values[0].object_hash,contentHash:values[0].content_hash};
}

// Read-only self-status proofs cannot authorize a write or enumerate any other machine.
export async function readSignedMachineSnapshot(context,input) {
  baseInput(input,true); exactKeys(input.payload,['machineId','grantId','machineCommitment']);
  requireValue(opaqueId(input.payload.machineId) && opaqueId(input.payload.grantId) && machineDigest(input.payload.machineCommitment));
  const state = await readRuntimeState(context);
  requireValue(state.runtime.state === 'pending' && state.configuration.state === 'pending', 'machine-proof-denied');
  const verified = await verifyMachineProof({installation:state.installation,purpose:'self-status',attemptId:input.attemptId,
    expected:input.expected,payload:input.payload},input.proof);
  const machine = await activeRuntimeMachine(context,state,input.payload.machineId,input.payload.grantId);
  requireValue(machine.commitment === verified.commitment && input.payload.machineCommitment === verified.commitment, 'machine-proof-denied');
  const rotations = await runtimeContext(context).read(`SELECT k.hash,k.generation,k.attempt_id,k.expires_at FROM memory_runtime_rotations k
    JOIN memory_runtime_completions done ON done.attempt_id=k.attempt_id
    JOIN memory_runtime_attempts a ON a.id=done.attempt_id AND a.audit_id=done.audit_id AND a.request_hash=done.request_hash
    JOIN memory_runtime_audit audit ON audit.id=done.audit_id AND audit.attempt_id=a.id AND audit.action=a.action AND audit.target_id=k.machine_id
    AND audit.request_hash=a.request_hash AND audit.installation_id=a.installation_id
    WHERE k.machine_id=? AND k.grant_id=? AND k.machine_revision=? AND k.grant_revision=? AND k.scope=?
    AND a.installation_id=? AND done.installation_id=a.installation_id AND done.runtime_revision=a.runtime_revision+1
    AND done.auth_revision=a.auth_revision+CASE WHEN a.action='enroll' THEN 1 ELSE 0 END
    AND json_extract(a.payload_json,'$.credentialHash')=k.hash AND json_extract(a.payload_json,'$.generation')=k.generation
    ORDER BY k.generation DESC LIMIT 1`,
  [machine.id,machine.grant_id,machine.revision,machine.grant_revision,machine.scope,state.installation.installationId]);
  return {machineId:machine.id,snapshot:state.snapshot,status:'pending-setup',reason:'machine-operation-proof-required',
    credential:rotations.length ? {hash:rotations[0].hash,generation:rotations[0].generation,attemptId:rotations[0].attempt_id,
      expiresAt:rotations[0].expires_at} : null};
}

export async function readSignedEnrollmentSnapshot(context,input) {
  baseInput(input,true,true); exactKeys(input.payload,['machineId','grantId','machineCommitment','capabilityHash']);
  requireValue(opaqueId(input.payload.machineId) && opaqueId(input.payload.grantId) && machineDigest(input.payload.machineCommitment)
    && machineDigest(input.payload.capabilityHash));
  const state = await readRuntimeState(context);
  requireValue(state.runtime.state === 'pending' && state.configuration.state === 'pending', 'machine-proof-denied');
  const verified = await verifyMachineProof({installation:state.installation,purpose:'enrollment-status',attemptId:input.attemptId,
    expected:input.expected,payload:input.payload},input.proof);
  requireValue(verified.commitment === input.payload.machineCommitment && await rawCapabilityHash(input.capability) === input.payload.capabilityHash,
    'machine-proof-denied');
  const rows = await runtimeContext(context).read(`SELECT g.id FROM memory_machine_grants g
    JOIN memory_machine_completions d ON d.attempt_id=g.issued_attempt_id JOIN memory_machine_attempts a ON a.id=d.attempt_id
    JOIN memory_machine_audit audit ON audit.id=d.audit_id AND audit.attempt_id=a.id AND audit.action='issue' AND audit.target_id=g.id
    WHERE g.id=? AND g.installation_id=? AND g.repository_id=? AND g.state='pending' AND g.revision=1
    AND g.machine_id IS NULL AND g.commitment=? AND g.secret_hash=? AND g.expires_at>unixepoch()
    AND d.request_hash=a.request_hash AND d.audit_id=a.audit_id`,
  [input.payload.grantId,state.installation.installationId,state.installation.repositoryId,verified.commitment,input.payload.capabilityHash]);
  requireValue(rows.length === 1, 'machine-proof-denied');
  return {machineId:input.payload.machineId,snapshot:state.snapshot,status:'pending-setup',reason:'machine-operation-proof-required'};
}
