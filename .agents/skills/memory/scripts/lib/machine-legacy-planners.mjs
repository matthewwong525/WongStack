// Finite15 SQL. Operator readbacks, exact source authority and private journals own execution.
import { machineHash } from './machine-state.mjs';
import { legacyHash } from './machine-legacy-inventory.mjs';
import { legacyManifestHash,legacySchemaHash } from './machine-legacy-state.mjs';
import { compiledLegacyHashes } from '../../worker/machine-legacy-contract.mjs';
import { machineManifestHash } from './machine-state.mjs';
import { runtimeManifestHash } from './machine-runtime-state.mjs';
import { dataManifestHash } from './machine-data-state.mjs';
import { digest } from './installation-validation.mjs';
import { machineDataMigrations } from './machine-data-migrations.mjs';
const insert=(table,record)=>({sql:`INSERT INTO ${table}(${Object.keys(record).join(',')}) VALUES(${Object.keys(record).map(()=>'?').join(',')})`,params:Object.values(record)});
export const legacyInsert=insert;
export async function planLegacyBarrier(intent) {
 const {installation,inventory,review,universe,universeHash,pinHash,attemptId,requestHash,baselineHash}=intent;
 return [insert('memory_legacy_attempts',{id:attemptId,installation_id:installation.installationId,repository_id:installation.repositoryId,request_hash:requestHash,review_hash:review.reviewHash,
 inventory_hash:inventory.inventoryHash,source_version:inventory.sourceVersion,target_json:JSON.stringify(inventory.target),pin_hash:pinHash,source_json:JSON.stringify(inventory.source),review_json:JSON.stringify(review),universe_json:JSON.stringify(universe),universe_hash:universeHash,
 source_schema_hash:inventory.schemaHash,history_hash:inventory.history.historyHash,backup_hash:inventory.source.backupHash,ownership_hash:inventory.source.resourceOwnershipHash,predecessor_id:intent.predecessorId,created_at:intent.createdAt}),
 insert('memory_legacy_configuration',{installation_id:installation.installationId,repository_id:installation.repositoryId,attempt_id:attemptId,request_hash:requestHash,baseline_hash:baselineHash,target_json:JSON.stringify(inventory.target),pin_hash:pinHash}),
 insert('memory_legacy_manifests',{attempt_id:attemptId,schema_version:15,manifest_hash:await legacyManifestHash(),schema_hash:await legacySchemaHash(),...Object.fromEntries(Object.entries(await compiledLegacyHashes()).map(([k,v])=>[k==='protocolHash'?'protocol_hash':'route_contract_hash',v]))})];
}
export function planLegacyClosure(intent,closure) {
 const record={id:closure.observationId,attempt_id:intent.attemptId,inventory_hash:intent.inventory.inventoryHash,closure_hash:closure.closureHash,revision_hash:closure.revisionHash,
 observation_id:closure.observationId,observed_at:closure.observedAt,evidence_json:JSON.stringify(closure.evidence)};
 return [insert('memory_legacy_closures',record),...closure.retirements.map(row=>{
 const old=intent.inventory.source.credentials.find(credential=>credential.id===row.id);
 return {sql:`INSERT INTO memory_legacy_retirements(attempt_id,credential_id,kind,original_scope_hash,readback_hash,permissions_hash) SELECT ?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM memory_legacy_retirements WHERE attempt_id=? AND credential_id=?)`,params:[intent.attemptId,row.id,old.kind,row.originalScopeHash,row.readbackHash,row.replacementPermissionsHash,intent.attemptId,row.id]};})];
}
export async function planLegacyIssueWitness(intent,payload) {
 const {installation}=intent,id=intent.witnessAttemptId,auditId=intent.witnessAuditId;
 const expected={authRevision:1,pinRevision:1,snapshotHash:await machineHash({version:15,attemptId:intent.attemptId,barrierHash:intent.requestHash})};
 const requestHash=await machineHash({version:2,installation,action:'issue',attemptId:id,expected,payload});
 return [insert('memory_machine_attempts',{id,installation_id:installation.installationId,action:'issue',target_id:payload.grantId,request_hash:requestHash,payload_json:JSON.stringify(payload),snapshot_hash:expected.snapshotHash,pin_hash:intent.pinHash,pin_revision:1,auth_revision:1,audit_id:auditId,created_at:intent.createdAt}),
 insert('memory_machine_grants',{id:payload.grantId,installation_id:installation.installationId,repository_id:installation.repositoryId,commitment:payload.machineCommitment,secret_hash:payload.capabilityHash,scope:payload.scope,issued_attempt_id:id,created_at:intent.createdAt,expires_at:payload.expiresAt}),
 insert('memory_machine_audit',{id:auditId,installation_id:installation.installationId,attempt_id:id,action:'issue',target_id:payload.grantId,request_hash:requestHash,created_at:intent.createdAt}),
 insert('memory_machine_completions',{attempt_id:id,installation_id:installation.installationId,request_hash:requestHash,audit_id:auditId,auth_revision:2,created_at:intent.createdAt})];
}
export async function planLegacyBaseline(intent,original) {
 const version=intent.inventory.sourceVersion;
 return insert('memory_legacy_baselines',{installation_id:intent.installation.installationId,attempt_id:intent.attemptId,baseline_hash:intent.baselineHash,request_hash:intent.requestHash,source_version:version,
 lineage:version===14?'retained14':version===10?'retained10':version===11?'retained11':'reviewed-adoption',source_manifest_hash:await digest(JSON.stringify(machineDataMigrations.slice(0,version))),
 history_hash:intent.inventory.history.historyHash,backup_hash:intent.inventory.source.backupHash,ownership_hash:intent.inventory.source.resourceOwnershipHash,original_json:JSON.stringify(original),
 compatibility_attempt_id:version===14?null:intent.witnessAttemptId,compatibility_audit_id:version===14?null:intent.witnessAuditId});
}
export async function planLegacyEra(intent,genesis) {
 const i=intent.installation,target=JSON.stringify(intent.inventory.target),rId=intent.runtimeOperationId,dId=intent.dataOperationId,aId=intent.runtimeAuditId;
 const expected={authRevision:2,pinRevision:1,runtimeRevision:1,snapshotHash:intent.requestHash};
 const runtimeRequest=await machineHash({version:15,installation:i,operationId:rId,expected,pinHash:intent.pinHash,baselineHash:intent.baselineHash});
 const dataExpected={...expected,dataRevision:1,deploymentHead:dId};
 const dataRequest=await machineHash({version:15,installation:i,operationId:dId,expected:dataExpected,baselineHash:intent.baselineHash,originalPinHash:intent.pinHash,genesis});
 return [insert('memory_runtime_configuration',{installation_id:i.installationId,repository_id:i.repositoryId,target_json:target,baseline_hash:intent.baselineHash,baseline_request_hash:intent.requestHash,baseline_audit_id:intent.witnessAuditId,pin_hash:intent.pinHash,operation_id:rId,request_hash:runtimeRequest,upgrade_expected_json:JSON.stringify(expected),created_at:intent.createdAt}),
 insert('memory_runtime_audit',{id:aId,installation_id:i.installationId,attempt_id:rId,action:'upgrade',target_id:i.installationId,request_hash:runtimeRequest,created_at:intent.createdAt}),
 insert('memory_runtime_manifests',{installation_id:i.installationId,repository_id:i.repositoryId,schema_version:13,manifest_hash:await runtimeManifestHash(),baseline_hash:intent.baselineHash,request_hash:runtimeRequest,audit_id:aId}),
 insert('memory_runtime_bootstrap',{installation_id:i.installationId,operation_id:rId,request_hash:runtimeRequest,baseline_hash:intent.baselineHash,audit_id:aId}),
 insert('memory_data_configuration',{installation_id:i.installationId,repository_id:i.repositoryId,operation_id:dId,request_hash:dataRequest,manifest_hash:await dataManifestHash(),schema_hash:genesis.schemaHash,baseline_hash:intent.baselineHash,original_pin_hash:intent.pinHash,expected_json:JSON.stringify(dataExpected)}),
 insert('memory_data_bootstrap',{installation_id:i.installationId,operation_id:dId,request_hash:dataRequest,genesis_json:JSON.stringify(genesis)})];
}
export async function planLegacyPiece(intent,ordinal,claims) {
 return [insert('memory_legacy_pieces',{attempt_id:intent.attemptId,ordinal,payload_json:JSON.stringify(claims),payload_hash:await legacyHash(claims)}),
 ...claims.map(c=>insert('memory_legacy_claims',{id:c.id,attempt_id:intent.attemptId,ordinal,kind:c.kind,original_id:c.originalId,snapshot_hash:c.snapshotHash,evidence_hash:c.evidenceHash,record_json:c.recordJson,
 machine_id:c.machineId,grant_id:c.grantId,key_commitment:c.keyCommitment,scope:c.scope,machine_revision:c.machineRevision,grant_revision:c.grantRevision,credential_generation:c.credentialGeneration,visibility:c.visibility}))];
}
export function planLegacyQuarantine(intent) {
 return intent.universe.filter(row=>!intent.review.selected.some(selected=>selected.kind===row.kind&&String(selected.id)===String(row.id))).map(row=>insert('memory_legacy_quarantine',{attempt_id:intent.attemptId,kind:row.kind,original_id:String(row.id),snapshot_hash:row.snapshotHash}));
}
export async function planLegacyFinal(intent,closure,claims,source,activation,evidence) {
 const compiled=await compiledLegacyHashes(),d=intent.review.destination,auditId=intent.finalAuditId;
 const outcome={version:15,action:'legacy-cutover',attemptId:intent.attemptId,requestHash:intent.requestHash,universeHash:intent.universeHash,claimsHash:await legacyHash(claims),closureHash:closure.closureHash};
 return [insert('memory_legacy_protocol_transitions',{id:intent.transitionId,attempt_id:intent.attemptId,predecessor_activation_id:activation.attempt_id,predecessor_hash:await machineHash(activation),protocol_hash:compiled.protocolHash,route_contract_hash:compiled.routeContractHash,source_hash:source.digest,pin_hash:intent.pinHash}),
 insert('memory_legacy_deployments',{id:intent.deploymentId,attempt_id:intent.attemptId,predecessor_id:intent.predecessorId,previous_pin_hash:intent.previousPinHash,pin_hash:intent.pinHash,source_hash:source.digest,evidence_json:JSON.stringify(evidence),review_hash:await machineHash(evidence),protocol_hash:compiled.protocolHash,route_contract_hash:compiled.routeContractHash,rollback:0}),
 insert('memory_legacy_audit',{id:auditId,attempt_id:intent.attemptId,request_hash:intent.requestHash,closure_id:closure.observationId,outcome_json:JSON.stringify(outcome)}),
 insert('memory_legacy_completions',{attempt_id:intent.attemptId,request_hash:intent.requestHash,audit_id:auditId,closure_id:closure.observationId,claims_hash:outcome.claimsHash,universe_hash:intent.universeHash,
 claim_count:claims.length,piece_count:intent.review.selected.length,quarantine_count:intent.universe.length-claims.length,machine_id:d.machineId,grant_id:d.grantId,key_commitment:d.machineCommitment,machine_revision:d.machineRevision,grant_revision:d.grantRevision,credential_generation:d.credentialGeneration,scope:d.scope,created_at:intent.createdAt}),
 {sql:"UPDATE memory_legacy_configuration SET state='exposed',revision=revision+1,final_id=? WHERE attempt_id=? AND request_hash=? AND state='maintenance'",params:[intent.attemptId,intent.attemptId,intent.requestHash]}];
}
