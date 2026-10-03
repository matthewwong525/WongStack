// Validated schema14 extension. No initializer, provider calls or readiness claims.
import { runtimeContext } from '../../worker/machine-context.mjs';
import { machineDataMigrations } from './machine-data-migrations.mjs';
import { dataTables,dataTriggers,dataViews,dataDdl,compiledDataHashes } from '../../worker/machine-data-contract.mjs';
import { machineHash } from './machine-state.mjs';
import { digest,requireValue } from './installation-validation.mjs';
export { dataTables,dataTriggers,dataViews };
export const dataManifestHash=()=>digest(JSON.stringify(machineDataMigrations));
export async function dataSchemaHash(read) {
 const actual=await read("SELECT name,type,sql FROM sqlite_master WHERE name LIKE 'memory_data_%' ORDER BY name");
 requireValue(actual.length===Object.keys(dataDdl).length&&actual.every(row=>dataDdl[row.name]?.type===row.type&&dataDdl[row.name].sql===row.sql.trim().replace(/\s+/g,' ')), 'installation-conflict');
 for(const [table,names] of [['facts',['capture_attempt_id','capture_ordinal']],['sessions',['capture_attempt_id']],['runs',['capture_attempt_id']]]) {
  const columns=await read(`PRAGMA table_info(${table})`);
  requireValue(names.every(name=>columns.some(row=>row.name===name&&row.type===(name==='capture_ordinal'?'INTEGER':'TEXT')&&row.notnull===0&&row.dflt_value===null)), 'installation-conflict');
 }
 return digest(JSON.stringify(dataDdl));
}
async function validEvidence(evidence,targetJson) {
 requireValue(evidence&&evidence.targetJson===targetJson&&evidence.projection?.version===2&&Array.isArray(evidence.projection.workers)
 &&evidence.pinHash===await machineHash(evidence.projection)&&JSON.stringify(evidence.projection.target)===targetJson,'installation-conflict');
 const identity={target:evidence.projection.target,subdomain:evidence.projection.subdomain,
 workers:evidence.projection.workers.map(w=>({name:w.name,id:w.id})).sort((a,b)=>a.name.localeCompare(b.name))};
 requireValue(JSON.stringify(evidence.identity)===JSON.stringify(identity),'installation-conflict');
}
export async function validateDataExtension(context,baseline,runtime) {
 const {read,installation}=runtimeContext(context);
 const configurations=await read('SELECT * FROM memory_data_configuration'),bootstraps=await read('SELECT * FROM memory_data_bootstrap');
 requireValue(configurations.length===1&&bootstraps.length===1,'machine-operation-incomplete');
 const d=configurations[0],b=bootstraps[0];
 requireValue(d.installation_id===installation.installationId&&d.repository_id===installation.repositoryId
 &&d.baseline_hash===baseline.baselineHash&&d.original_pin_hash===runtime.pin_hash&&d.manifest_hash===await dataManifestHash()
 &&d.schema_hash===await dataSchemaHash(read)&&b.installation_id===d.installation_id&&b.operation_id===d.operation_id&&b.request_hash===d.request_hash,
 'installation-conflict');
 requireValue(d.request_hash===await machineHash({version:14,installation,operationId:d.operation_id,expected:JSON.parse(d.expected_json),baselineHash:d.baseline_hash,
 originalPinHash:d.original_pin_hash,genesis:JSON.parse(b.genesis_json)}),'installation-conflict');
 const genesis=JSON.parse(b.genesis_json),compiled=await compiledDataHashes();
 await validEvidence(genesis.evidence,runtime.target_json);
 requireValue(genesis.evidence.pinHash===genesis.pinHash&&genesis.pinHash===runtime.pin_hash&&genesis.targetJson===runtime.target_json,'installation-conflict');
 const rows=await read(`SELECT x.*,a.payload_json,a.request_hash,a.expected_json,a.revision,a.installation_id,c.request_hash completed_hash,c.outcome_json,c.revision completed_revision,
 audit.request_hash audit_hash FROM memory_data_deployments x JOIN memory_data_attempts a ON a.id=x.attempt_id
 JOIN memory_data_completions c ON c.attempt_id=a.id AND c.audit_id=a.audit_id JOIN memory_data_audit audit ON audit.id=c.audit_id AND audit.attempt_id=a.id`);
 let head={id:b.operation_id,pinHash:genesis.pinHash,evidence:genesis.evidence},remaining=[...rows];
 while(remaining.length) {
  const successors=remaining.filter(x=>x.predecessor_id===head.id);
  requireValue(successors.length===1,'installation-conflict');
  const x=successors[0],payload=JSON.parse(x.payload_json),evidence=JSON.parse(x.evidence_json);
  await validEvidence(evidence,runtime.target_json);
  requireValue(x.installation_id===d.installation_id&&x.previous_pin_hash===head.pinHash&&x.request_hash===x.completed_hash&&x.audit_hash===x.request_hash
  &&x.completed_revision===x.revision+1&&x.review_hash===await machineHash(evidence)&&x.protocol_hash===compiled.protocolHash&&x.route_contract_hash===compiled.routeContractHash
  &&payload.predecessorId===head.id&&payload.previousPinHash===head.pinHash&&payload.pinHash===x.pin_hash&&payload.reviewHash===x.review_hash
  &&JSON.stringify(payload.evidence)===x.evidence_json&&payload.protocolHash===x.protocol_hash&&payload.routeContractHash===x.route_contract_hash
  &&Number(payload.rollback)===x.rollback&&evidence.targetJson===runtime.target_json
  &&JSON.stringify(evidence.identity)===JSON.stringify(genesis.evidence.identity)
  &&x.request_hash===await machineHash({version:14,installation,action:'deployment',attemptId:x.attempt_id,expected:JSON.parse(x.expected_json),payload}), 'installation-conflict');
  requireValue(JSON.stringify(JSON.parse(x.outcome_json))===JSON.stringify({action:'deployment',attemptId:x.attempt_id,predecessorId:head.id,pinHash:x.pin_hash,reviewHash:x.review_hash}),'installation-conflict');
  head={id:x.attempt_id,pinHash:x.pin_hash,evidence};remaining=remaining.filter(row=>row!==x);
 }
 const all=await read('SELECT * FROM memory_data_deployments');
 requireValue(all.length===rows.length || (d.state==='maintenance'&&all.length===rows.length+1),'machine-operation-incomplete');
 return {configuration:d,bootstrap:b,head};
}
export async function dataSnapshot(state) {
 requireValue(state.data,'schema-unsupported');
 return {...state.snapshot,dataRevision:state.data.configuration.revision,deploymentHead:state.data.head.id};
}
export const dataPending=async state=>({memory:{protocolVersion:2,installationId:state.installation.installationId,repositoryId:state.installation.repositoryId,
 appUrl:state.target.appUrl,memoryOrigin:state.target.memoryOrigin,status:(state.data.configuration.state==='maintenance'||state.runtime.state==='maintenance'||state.configuration.state==='maintenance')?'blocked':'pending-setup',
 reason:(state.data.configuration.state==='maintenance'||state.runtime.state==='maintenance'||state.configuration.state==='maintenance')?'incomplete-machine-operation':'machine-operation-proof-required'},schemaVersion:14,snapshot:await dataSnapshot(state)});
