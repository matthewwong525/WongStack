// Exact15 validation. Historical14 receipts and request frames remain distinct.
import { runtimeContext } from '../../worker/machine-context.mjs';
import { coreProtectionDdl,normalizeCoreDdl,compiledCoreHashes } from '../../worker/machine-core-contract.mjs';
import { legacyDdl,legacyTables,compiledLegacyHashes } from '../../worker/machine-legacy-contract.mjs';
import { machineLegacyMigrations } from './machine-legacy-migrations.mjs';
import { machineDataMigrations } from './machine-data-migrations.mjs';
import { machineHash } from './machine-state.mjs';
import { legacyHash,legacyDigest } from './machine-legacy-inventory.mjs';
import { boundLegacyProjection } from './machine-legacy-closure.mjs';
import { digest,requireValue } from './installation-validation.mjs';
export const legacyManifestHash=()=>digest(JSON.stringify(machineLegacyMigrations));
export const legacySchemaHash=()=>digest(JSON.stringify({...coreProtectionDdl,...legacyDdl}));
const parse=value=>{const result=JSON.parse(value);boundLegacyProjection(result);return result;};
const one=(rows,code='machine-operation-incomplete')=>{requireValue(rows.length===1,code);return rows[0];};
export async function validateLegacySchema(read) {
 const metadata=await read('SELECT name,type FROM sqlite_master ORDER BY name'),expected={...coreProtectionDdl,...legacyDdl};boundLegacyProjection(metadata);
 const shadows=['facts_fts_data','facts_fts_idx','facts_fts_docsize','facts_fts_config'];
 requireValue(metadata.every(row=>typeof row.name==='string'&&typeof row.type==='string')&&new Set(metadata.map(row=>row.name)).size===metadata.length,'legacy-schema-conflict');
 const ordinary=metadata.filter(row=>!row.name.startsWith('sqlite_')&&!row.name.startsWith('_cf_')&&!shadows.includes(row.name));
 requireValue(ordinary.length===Object.keys(expected).length&&shadows.every(name=>metadata.some(row=>row.name===name&&row.type==='table')),'legacy-schema-conflict');
 for(const [name,row] of Object.entries(expected)) {
  const actual=await read('SELECT name,type,sql FROM sqlite_master WHERE name=? AND type=?',[name,row.type]);boundLegacyProjection(actual);
  requireValue(actual.length===1&&actual[0].name===name&&actual[0].type===row.type&&typeof actual[0].sql==='string'&&normalizeCoreDdl(actual[0].sql)===row.sql,'legacy-schema-conflict');
 }
 return legacySchemaHash();
}

export async function readLegacyState(context,{maintenance=false}={}) {
 const {read,target,installation}=runtimeContext(context);if(maintenance)runtimeContext(context,true);
 const schemaHash=await validateLegacySchema(read),versions=await read('SELECT version FROM schema_migrations ORDER BY version');
 requireValue(versions.length===15&&versions.every((row,index)=>row.version===index+1),'schema-unsupported');
 const c=one(await read('SELECT * FROM memory_legacy_configuration'));
 const a=one(await read('SELECT * FROM memory_legacy_attempts')),b=one(await read('SELECT * FROM memory_legacy_baselines'));
 const m=one(await read('SELECT * FROM memory_legacy_manifests')),compiled=await compiledLegacyHashes();
 requireValue(c.installation_id===installation.installationId&&c.repository_id===installation.repositoryId&&c.target_json===JSON.stringify(target)
 &&a.id===c.attempt_id&&a.installation_id===c.installation_id&&a.repository_id===c.repository_id&&a.target_json===c.target_json&&a.pin_hash===c.pin_hash
 &&a.request_hash===c.request_hash&&b.installation_id===c.installation_id&&b.attempt_id===a.id&&b.request_hash===a.request_hash&&b.baseline_hash===c.baseline_hash
 &&b.source_version===a.source_version&&b.backup_hash===a.backup_hash&&b.history_hash===a.history_hash&&b.ownership_hash===a.ownership_hash
 &&b.source_manifest_hash===await digest(JSON.stringify(machineDataMigrations.slice(0,a.source_version)))
 &&m.attempt_id===a.id&&m.schema_version===15&&m.manifest_hash===await legacyManifestHash()&&m.schema_hash===schemaHash
 &&m.protocol_hash===compiled.protocolHash&&m.route_contract_hash===compiled.routeContractHash,'installation-conflict');
 const source=parse(a.source_json),review=parse(a.review_json),universe=parse(a.universe_json),original=parse(b.original_json);
 requireValue(a.inventory_hash===review.inventoryHash&&a.review_hash===review.reviewHash&&a.history_hash===review.history.historyHash
 &&a.source_schema_hash===review.schemaHash&&a.backup_hash===review.backupHash&&a.ownership_hash===review.resourceOwnershipHash
 &&await legacyHash(universe)===a.universe_hash&&source.resourceOwnershipHash===a.ownership_hash&&source.backupHash===a.backup_hash
 &&JSON.stringify(review.destination.installation)===JSON.stringify(installation),'installation-conflict');
 const reviewValue={...review};delete reviewValue.reviewHash;requireValue(await legacyHash(reviewValue)===a.review_hash,'legacy-review-invalid');
 requireValue(a.request_hash===await machineHash({version:15,installation,attemptId:a.id,reviewHash:a.review_hash,inventoryHash:a.inventory_hash,
 universeHash:a.universe_hash,pinHash:a.pin_hash,predecessorId:a.predecessor_id}),'installation-conflict');
 requireValue(b.baseline_hash===await machineHash({version:15,installation,sourceVersion:a.source_version,sourceSchemaHash:a.source_schema_hash,
 historyHash:a.history_hash,backupHash:a.backup_hash,ownershipHash:a.ownership_hash,requestHash:a.request_hash,original}),'installation-conflict');
 requireValue(b.lineage===(a.source_version===14?'retained14':a.source_version===10?'retained10':a.source_version===11?'retained11':'reviewed-adoption'),'installation-conflict');
 if(a.source_version!==14) {
  requireValue((await read('SELECT * FROM memory_machine_manifest_receipts')).length===0&&(await read('SELECT * FROM memory_machine_bootstrap_completions')).length===0,'installation-conflict');
  const attempts=await read('SELECT * FROM memory_machine_attempts'),audits=await read('SELECT * FROM memory_machine_audit'),completions=await read('SELECT * FROM memory_machine_completions');
  const issue=one(attempts.filter(row=>row.id===b.compatibility_attempt_id)),audit=one(audits.filter(row=>row.id===b.compatibility_audit_id)),done=one(completions.filter(row=>row.attempt_id===issue.id)),payload=parse(issue.payload_json);
  const grants=await read('SELECT * FROM memory_machine_grants'),grant=one(grants.filter(row=>row.id===issue.target_id));
  requireValue(issue.action==='issue'&&issue.installation_id===c.installation_id&&audit.action==='issue'&&audit.target_id===grant.id&&audit.attempt_id===issue.id
   &&issue.audit_id===audit.id&&audit.request_hash===issue.request_hash&&done.audit_id===audit.id&&done.request_hash===issue.request_hash&&done.auth_revision===issue.auth_revision+1
   &&issue.request_hash===await machineHash({version:2,installation,action:'issue',attemptId:issue.id,expected:{authRevision:issue.auth_revision,pinRevision:issue.pin_revision,snapshotHash:issue.snapshot_hash},payload})
   &&grant.issued_attempt_id===issue.id&&grant.id===review.destination.grantId&&grant.commitment===payload.machineCommitment&&payload.machineCommitment===review.destination.machineCommitment
   &&grant.secret_hash===payload.capabilityHash&&grant.scope===payload.scope&&grant.expires_at===payload.expiresAt,'installation-conflict');
 }
 const closures=await read('SELECT * FROM memory_legacy_closures'),retirements=await read('SELECT * FROM memory_legacy_retirements');
 requireValue(closures.length>0&&closures.every(row=>row.attempt_id===a.id&&row.inventory_hash===a.inventory_hash&&legacyDigest(row.closure_hash)&&legacyDigest(row.revision_hash)),'legacy-closure-incomplete');
 for(const row of closures) {
  const evidence=parse(row.evidence_json);requireValue(await legacyHash(evidence)===row.closure_hash&&evidence.inventoryHash===a.inventory_hash&&evidence.targetHash===await legacyHash(target)
   &&evidence.observationId===row.observation_id&&evidence.observedAt===row.observed_at&&evidence.revisionHash===row.revision_hash,'legacy-closure-incomplete');
 }
 requireValue(retirements.length===source.credentials.length&&source.credentials.every(credential=>retirements.some(row=>row.attempt_id===a.id&&row.credential_id===credential.id
 &&row.kind===credential.kind&&row.original_scope_hash===credential.scopeHash&&row.permissions_hash===credential.businessPermissionsHash)),'legacy-closure-incomplete');
 const pieces=await read('SELECT * FROM memory_legacy_pieces'),claims=await read('SELECT * FROM memory_legacy_claims'),quarantine=await read('SELECT * FROM memory_legacy_quarantine');
 requireValue(new Set(universe.map(row=>JSON.stringify([row.kind,row.id]))).size===universe.length,'legacy-inventory-incomplete');
 for(const piece of pieces){requireValue(piece.attempt_id===a.id&&piece.payload_hash===await legacyHash(parse(piece.payload_json)),'installation-conflict');}
 for(const claim of claims) {
  const record=parse(claim.record_json),piece=one(pieces.filter(row=>row.attempt_id===a.id&&row.ordinal===claim.ordinal));
  const selected=one(review.selected.filter(row=>row.kind===claim.kind&&String(row.id)===claim.original_id));
  for(const [key,column] of Object.entries({machineId:'machine_id',grantId:'grant_id',machineCommitment:'key_commitment',scope:'scope',machineRevision:'machine_revision',grantRevision:'grant_revision',credentialGeneration:'credential_generation'}))requireValue(claim[column]===review.destination[key],'legacy-destination-unproven');
  requireValue(claim.visibility===(claim.kind==='fact'?selected.visibility:'private'),'legacy-mapping-unproven');
  const signed=one(parse(piece.payload_json).filter(row=>row.id===claim.id));
  requireValue(universe.some(row=>row.kind===claim.kind&&String(row.id)===claim.original_id&&row.snapshotHash===claim.snapshot_hash)
   &&review.selected.some(row=>row.kind===claim.kind&&String(row.id)===claim.original_id&&row.snapshotHash===claim.snapshot_hash)
   &&signed.recordJson===claim.record_json&&signed.snapshotHash===claim.snapshot_hash&&signed.machineId===claim.machine_id&&signed.grantId===claim.grant_id
   &&signed.keyCommitment===claim.key_commitment&&signed.scope===claim.scope&&signed.machineRevision===claim.machine_revision&&signed.grantRevision===claim.grant_revision
   &&signed.credentialGeneration===claim.credential_generation&&signed.visibility===claim.visibility&&signed.evidenceHash===claim.evidence_hash
   &&await legacyHash(record)===claim.snapshot_hash,'legacy-mapping-unproven');
 }
 const completions=await read('SELECT * FROM memory_legacy_completions'),audits=await read('SELECT * FROM memory_legacy_audit');
 let completion=null;
 if(c.state==='exposed'||completions.length) {
  completion=one(completions);const audit=one(audits),closure=one(closures.filter(row=>row.id===completion.closure_id));
  requireValue(completion.attempt_id===a.id&&completion.request_hash===a.request_hash&&completion.audit_id===audit.id&&audit.attempt_id===a.id&&audit.request_hash===a.request_hash
   &&audit.closure_id===closure.id&&audit.outcome_json===JSON.stringify({version:15,action:'legacy-cutover',attemptId:a.id,requestHash:a.request_hash,universeHash:a.universe_hash,claimsHash:await legacyHash(claims),closureHash:closure.closure_hash})&&completion.universe_hash===a.universe_hash&&completion.claim_count===claims.length&&claims.length===review.selected.length
   &&completion.piece_count===pieces.length&&completion.quarantine_count===quarantine.length&&completion.claims_hash===await legacyHash(claims)
   &&claims.length+quarantine.length===universe.length&&universe.every(row=>claims.filter(claim=>claim.kind===row.kind&&claim.original_id===String(row.id)&&claim.snapshot_hash===row.snapshotHash).length
    +quarantine.filter(q=>q.kind===row.kind&&q.original_id===String(row.id)&&q.snapshot_hash===row.snapshotHash).length===1)
   &&(c.state!=='exposed'||c.final_id===a.id),'machine-operation-incomplete');
  for(const key of ['machineId','grantId','machineCommitment','scope','machineRevision','grantRevision','credentialGeneration']) {
   const column={machineId:'machine_id',grantId:'grant_id',machineCommitment:'key_commitment',scope:'scope',machineRevision:'machine_revision',grantRevision:'grant_revision',credentialGeneration:'credential_generation'}[key];
   requireValue(completion[column]===review.destination[key],'legacy-destination-unproven');
  }
 }
 requireValue(maintenance||c.state==='exposed','machine-operation-incomplete');
 const transitions=await read('SELECT * FROM memory_legacy_protocol_transitions'),deployments=await read('SELECT * FROM memory_legacy_deployments');
 let transition=null,head=null;
 if(c.state==='exposed') {
  transition=one(transitions);const genesisRows=deployments.filter(row=>row.predecessor_id===a.predecessor_id),deployment=one(genesisRows),activations=await read('SELECT * FROM memory_runtime_activations'),activation=one(activations);
  requireValue(transition.attempt_id===a.id&&transition.predecessor_activation_id===activation.attempt_id&&transition.predecessor_hash===await machineHash(activation)
   &&transition.protocol_hash===compiled.protocolHash&&transition.route_contract_hash===compiled.routeContractHash&&transition.source_hash===deployment.source_hash
   &&deployment.attempt_id===a.id&&deployment.protocol_hash===compiled.protocolHash&&deployment.route_contract_hash===compiled.routeContractHash
   &&deployment.pin_hash===c.pin_hash&&transition.pin_hash===c.pin_hash&&deployment.review_hash===await machineHash(parse(deployment.evidence_json)),'unreviewed-deployment');
  const oldCore=await compiledCoreHashes();requireValue(activation.protocol_hash===oldCore.protocolHash&&activation.route_contract_hash===oldCore.routeContractHash,'machine-core-unsupported');
  const activationAttempts=await read('SELECT * FROM memory_runtime_attempts'),activationDone=await read('SELECT * FROM memory_runtime_completions'),activationAudits=await read('SELECT * FROM memory_runtime_audit');
  const activated=one(activationAttempts.filter(row=>row.id===activation.attempt_id)),activatedDone=one(activationDone.filter(row=>row.attempt_id===activation.attempt_id)),activatedAudit=one(activationAudits.filter(row=>row.id===activated.audit_id));
  requireValue(activated.action==='activate'&&activated.installation_id===installation.installationId&&activated.request_hash===activatedDone.request_hash&&activatedDone.audit_id===activated.audit_id
   &&activatedAudit.attempt_id===activated.id&&activatedAudit.installation_id===installation.installationId&&activatedAudit.action==='activate'&&activatedAudit.target_id===installation.installationId&&activatedAudit.request_hash===activated.request_hash
   &&activation.baseline_hash===activated.baseline_hash&&activation.pin_hash===activated.pin_hash&&activation.auth_revision===activated.auth_revision
   &&activatedDone.auth_revision===activated.auth_revision&&activatedDone.runtime_revision===activated.runtime_revision+1
   &&activated.request_hash===await machineHash({version:13,installation,action:'activate',attemptId:activated.id,expected:{authRevision:activated.auth_revision,pinRevision:activated.pin_revision,runtimeRevision:activated.runtime_revision,snapshotHash:activated.snapshot_hash},payload:parse(activated.payload_json)}),'machine-operation-incomplete');
  head={id:deployment.id,pinHash:deployment.pin_hash,evidence:parse(deployment.evidence_json)};
  const attempts=await read('SELECT * FROM memory_legacy_deployment_attempts'),receipts=await read('SELECT * FROM memory_legacy_deployment_completions'),deploymentAudits=await read('SELECT * FROM memory_legacy_deployment_audit');
  let remaining=deployments.filter(row=>row!==deployment);
  while(remaining.length) {
   const successor=one(remaining.filter(row=>row.predecessor_id===head.id)),attempt=one(attempts.filter(row=>row.id===successor.id)),done=one(receipts.filter(row=>row.attempt_id===attempt.id)),audit=one(deploymentAudits.filter(row=>row.id===done.audit_id));
   const payload=parse(attempt.payload_json),expected=parse(attempt.expected_json),evidence=parse(successor.evidence_json);
   requireValue(attempt.installation_id===installation.installationId&&successor.previous_pin_hash===head.pinHash&&successor.source_hash===attempt.source_hash&&successor.protocol_hash===compiled.protocolHash&&successor.route_contract_hash===compiled.routeContractHash
    &&payload.predecessorId===head.id&&payload.previousPinHash===head.pinHash&&payload.pinHash===successor.pin_hash&&payload.reviewHash===successor.review_hash&&JSON.stringify(payload.evidence)===successor.evidence_json&&Number(payload.rollback)===successor.rollback
    &&payload.protocolHash===compiled.protocolHash&&payload.routeContractHash===compiled.routeContractHash&&successor.review_hash===await machineHash(evidence)&&evidence.targetJson===c.target_json
    &&JSON.stringify(evidence.identity)===JSON.stringify(head.evidence.identity)&&attempt.request_hash===await machineHash({version:15,installation,action:'deployment',attemptId:attempt.id,expected,payload})
    &&done.request_hash===attempt.request_hash&&audit.attempt_id===attempt.id&&audit.request_hash===attempt.request_hash&&audit.outcome_json===done.outcome_json
    &&done.outcome_json===JSON.stringify({action:'deployment',attemptId:attempt.id,predecessorId:head.id,pinHash:successor.pin_hash,reviewHash:successor.review_hash}),'unreviewed-deployment');
   head={id:successor.id,pinHash:successor.pin_hash,evidence};remaining=remaining.filter(row=>row!==successor);
  }
  requireValue(attempts.length===receipts.length&&receipts.length===deployments.length-1&&deploymentAudits.length===receipts.length,'machine-operation-incomplete');
 }
 const ownership=await read('SELECT * FROM memory_legacy_ownership_corrections'),ownershipDone=await read('SELECT * FROM memory_legacy_ownership_completions');
 requireValue(ownership.length===ownershipDone.length,'machine-operation-incomplete');
 const effectiveClaims=[];
 for(const originalClaim of claims) {
  let current={...originalClaim},predecessor=originalClaim.id,remaining=ownership.filter(row=>row.claim_id===originalClaim.id);
  while(remaining.length) {
   const correction=one(remaining.filter(row=>row.predecessor_id===predecessor)),done=one(ownershipDone.filter(row=>row.correction_id===correction.id)),destination=parse(correction.destination_json),evidence=parse(correction.evidence_json);
   const input={correctionId:correction.id,predecessorId:correction.predecessor_id,claimId:correction.claim_id,recordHash:correction.record_hash,evidence,destination,visibility:correction.visibility};
   requireValue(correction.record_hash===originalClaim.snapshot_hash&&JSON.stringify(destination.installation)===JSON.stringify(installation)&&evidence.backupHash===a.backup_hash&&evidence.ownershipHash===a.ownership_hash
    &&correction.request_hash===await machineHash({version:15,installation,action:'ownership-correction',input})&&done.request_hash===correction.request_hash
    &&done.audit_hash===await legacyHash({action:'ownership-correction',requestHash:correction.request_hash,input}),'legacy-mapping-unproven');
   current={...current,machine_id:destination.machineId,grant_id:destination.grantId,key_commitment:destination.machineCommitment,scope:destination.scope,machine_revision:destination.machineRevision,grant_revision:destination.grantRevision,credential_generation:destination.credentialGeneration,visibility:correction.visibility};
   predecessor=correction.id;remaining=remaining.filter(row=>row!==correction);
  }
  effectiveClaims.push(current);
 }
 requireValue(ownership.every(row=>claims.some(claim=>claim.id===row.claim_id)),'legacy-mapping-unproven');
 return {configuration:c,attempt:a,baseline:b,manifest:m,review,source,universe,original,completion,transition,head,claims:effectiveClaims,originalClaims:claims,quarantine};
}
export function legacyExposureGuard(state) {
 return state.legacy?{sql:'EXISTS(SELECT 1 FROM memory_legacy_exposure e WHERE e.installation_id=? AND e.attempt_id=? AND e.revision=?)',params:[state.installation.installationId,state.legacy.attempt.id,state.legacy.configuration.revision]}:{sql:'1',params:[]};
}

// An audit is authority only after the exact row is independently read back with current credential/exposure.
export async function auditLegacyAccess(context,state,{machineId,grantId,credentialHash,operation,requestHash,scope}) {
 requireValue(state.legacy&&legacyDigest(credentialHash)&&legacyDigest(requestHash),'machine-proof-denied');
 const {read,write}=runtimeContext(context),exposure=legacyExposureGuard(state),scopeJson=JSON.stringify(scope),id=crypto.randomUUID();
 const authority=`EXISTS(SELECT 1 FROM memory_machine_principals p JOIN memory_machine_grants g ON g.id=p.grant_id AND g.machine_id=p.id JOIN memory_principals generic ON generic.id=p.id
 JOIN memory_runtime_rotations rotation ON rotation.machine_id=p.id AND rotation.grant_id=g.id JOIN memory_runtime_completions done ON done.attempt_id=rotation.attempt_id JOIN memory_runtime_attempts attempt ON attempt.id=done.attempt_id AND attempt.request_hash=done.request_hash AND attempt.audit_id=done.audit_id JOIN memory_runtime_audit proof ON proof.id=done.audit_id AND proof.attempt_id=attempt.id AND proof.request_hash=attempt.request_hash
 JOIN memory_machine_configuration m ON m.installation_id=p.installation_id JOIN memory_runtime_configuration r ON r.installation_id=p.installation_id JOIN memory_data_configuration d ON d.installation_id=p.installation_id
 WHERE p.id=? AND p.grant_id=? AND p.installation_id=? AND p.repository_id=? AND p.status='active' AND generic.status='active' AND g.state='consumed' AND p.scope='memory:read memory:write memory:admin'
 AND rotation.hash=? AND rotation.expires_at>unixepoch() AND rotation.machine_revision=p.revision AND rotation.grant_revision=g.revision AND rotation.scope=p.scope AND rotation.generation=(SELECT max(generation) FROM memory_runtime_rotations WHERE machine_id=p.id)
 AND m.state='pending' AND m.barrier_attempt_id IS NULL AND r.state='pending' AND r.barrier_attempt_id IS NULL AND d.state='pending' AND d.barrier_attempt_id IS NULL AND m.auth_revision=? AND m.pin_revision=? AND r.runtime_revision=? AND d.revision=?) AND ${exposure.sql}`;
 const params=[machineId,grantId,state.installation.installationId,state.installation.repositoryId,credentialHash,state.snapshot.authRevision,state.snapshot.pinRevision,state.snapshot.runtimeRevision,state.data.configuration.revision,...exposure.params];
 const record=[id,state.installation.installationId,machineId,grantId,operation,requestHash,scopeJson];
 await write([{sql:`INSERT INTO memory_legacy_access_audit(id,installation_id,machine_id,grant_id,operation,request_hash,scope_json,created_at) SELECT ?,?,?,?,?,?,?,unixepoch() WHERE ${authority}`,params:[...record,...params]}]);
 const rows=await read(`SELECT * FROM memory_legacy_access_audit WHERE id=? AND installation_id=? AND machine_id=? AND grant_id=? AND operation=? AND request_hash=? AND scope_json=? AND ${authority}`,[...record,...params]);
 const row=one(rows,'machine-proof-denied');requireValue(Number.isSafeInteger(row.created_at)&&['id','installation_id','machine_id','grant_id','operation','request_hash','scope_json'].every((key,index)=>row[key]===record[index]),'machine-proof-denied');return row;
}
