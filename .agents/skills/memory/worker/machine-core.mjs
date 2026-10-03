// Closed finite production API. Public contexts never receive operator capabilities.
import { publicMachineContext, runtimeContext } from './machine-context.mjs';
import { CORE_ROUTES, CORE_OPERATIONS, compiledCoreHashes, normalizeCoreDdl, coreProtectionDdl } from './machine-core-contract.mjs';
import { exactKeys, requireValue, resourceTarget, opaqueId, digest } from '../scripts/lib/installation-validation.mjs';
import { readRuntimeState } from '../scripts/lib/machine-runtime-state.mjs';
import { dataSnapshot } from '../scripts/lib/machine-data-state.mjs';
import { enrollRuntimeMachine, renewRuntimeMachine, readSignedMachineSnapshot, readSignedEnrollmentSnapshot, validateRuntimeBearer } from '../scripts/lib/machine-runtime-operator.mjs';
import { captureMachineData, readSignedMachineDataStatus } from '../scripts/lib/machine-data-operator.mjs';
import { legacyExposureGuard,auditLegacyAccess } from '../scripts/lib/machine-legacy-state.mjs';
import { legacyDdl,compiledLegacyHashes } from './machine-legacy-contract.mjs';
import { verifyMachineProof } from './machine-proof.mjs';
import { machineHash } from '../scripts/lib/machine-state.mjs';
import { handleCoreTranscript } from './machine-core-transcripts.mjs';

export const json = (status,body) => Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const routePattern=/^\/_memory\/v2\/repositories\/([A-Za-z0-9_-]{32,128})\/machines\/([A-Za-z0-9_-]{32,128})\/(enroll|enrollment-status|self-status|renew|capture|capture-status|query|stage|publish|transcript|upload)$/;
export async function coreState(context) {
 const state=await readRuntimeState(context),internal=runtimeContext(context),execution=internal.execution;
 requireValue(state.data&&state.configuration.state==='pending'&&state.configuration.barrier_attempt_id===null&&state.runtime.state==='pending'&&state.runtime.barrier_attempt_id===null,'machine-operation-incomplete');
 const hashes=await (state.legacy?compiledLegacyHashes():compiledCoreHashes());
 const activation=state.legacy?await internal.read(`SELECT t.* FROM memory_legacy_protocol_transitions t JOIN memory_legacy_exposure e ON e.attempt_id=t.attempt_id WHERE e.installation_id=? AND t.protocol_hash=? AND t.route_contract_hash=?`,[state.installation.installationId,hashes.protocolHash,hashes.routeContractHash]):await internal.read(`SELECT x.* FROM memory_runtime_activations x JOIN memory_runtime_completions c ON c.attempt_id=x.attempt_id
 JOIN memory_runtime_attempts a ON a.id=c.attempt_id AND a.audit_id=c.audit_id AND a.request_hash=c.request_hash
 JOIN memory_runtime_audit audit ON audit.id=c.audit_id AND audit.attempt_id=a.id AND audit.action='activate' AND audit.request_hash=a.request_hash
 WHERE x.installation_id=? AND x.baseline_hash=? AND x.pin_hash=? AND x.protocol_hash=? AND x.route_contract_hash=?
 AND c.installation_id=a.installation_id AND c.runtime_revision=a.runtime_revision+1 AND c.auth_revision=a.auth_revision`,
 [state.installation.installationId,state.baselineHash,state.runtime.pin_hash,hashes.protocolHash,hashes.routeContractHash]);
 requireValue(activation.length===1,'machine-core-unsupported');
 const target=resourceTarget(state.installation,true),workers=state.data.head.evidence.projection.workers;
 const executing=workers.find(w=>w.name===target.memoryWorkerName);
 requireValue(execution&&execution.environment==='production'&&execution.origin===target.memoryOrigin&&execution.databaseId===target.databaseId
 &&execution.bucketName===target.bucketName&&execution.workerName===target.memoryWorkerName&&executing&&executing.versionId===execution.versionId,'unreviewed-deployment');
 const bindings=executing.bindings;
 if(state.legacy)requireValue(execution.schemaVersion===15&&bindings.some(binding=>binding.name==='MEMORY_SCHEMA_VERSION'&&binding.text==='15'),'unreviewed-deployment');
 requireValue(bindings.some(b=>b.name==='MEMORY_DB'&&b.type==='d1'&&b.databaseId===target.databaseId)
 &&(target.bucketName===null||bindings.some(b=>b.name==='MEMORY_BUCKET'&&b.type==='r2_bucket'&&b.bucketName===target.bucketName))
 &&bindings.some(b=>b.name==='WONG_ENVIRONMENT'&&b.text==='production'),'target-mismatch');
 return state;
}
export const bearerHash = async request => {
 const match=/^Bearer ([A-Za-z0-9_-]{43,128})$/.exec(request.headers.get('Authorization')||'');
 requireValue(match,'machine-proof-denied');return digest(match[1]);
};
const boundedText=(value,max)=>typeof value==='string'&&value.length<=max&&!value.includes('\0');
const integer=value=>Number.isSafeInteger(value)&&value>=1;
const fields='f.id,f.slug,f.type,f.body,f.author,f.created_at,f.session_id,f.superseded_by,f.shared,f.owner_principal_id,f.source';
// Every read includes current principal/grant/credential/barrier guards in the SQL itself.
export function liveGuard(state,machineId,credentialHash) {
 const sql=`EXISTS(SELECT 1 FROM memory_machine_principals actor JOIN memory_machine_grants g ON g.id=actor.grant_id AND g.machine_id=actor.id
 JOIN memory_principals generic ON generic.id=actor.id AND generic.installation_id=actor.installation_id
 JOIN memory_runtime_rotations k ON k.machine_id=actor.id AND k.grant_id=g.id
 JOIN memory_runtime_completions c ON c.attempt_id=k.attempt_id JOIN memory_runtime_attempts a ON a.id=c.attempt_id AND a.request_hash=c.request_hash AND a.audit_id=c.audit_id
 JOIN memory_runtime_audit audit ON audit.id=c.audit_id AND audit.attempt_id=a.id AND audit.request_hash=a.request_hash
 JOIN memory_machine_configuration m ON m.installation_id=actor.installation_id JOIN memory_runtime_configuration r ON r.installation_id=m.installation_id
 JOIN memory_data_configuration d ON d.installation_id=m.installation_id
 WHERE actor.id=? AND actor.installation_id=? AND actor.repository_id=? AND actor.status='active' AND generic.status='active' AND g.state='consumed'
 AND k.hash=? AND k.expires_at>unixepoch() AND k.machine_revision=actor.revision AND k.grant_revision=g.revision AND k.scope=actor.scope
 AND (k.generation=(SELECT max(generation) FROM memory_runtime_rotations WHERE machine_id=actor.id)
 OR EXISTS(SELECT 1 FROM memory_runtime_rotations newest WHERE newest.machine_id=actor.id AND newest.previous_hash=k.hash AND newest.generation=k.generation+1
 AND newest.overlap_until>unixepoch() AND newest.generation=(SELECT max(generation) FROM memory_runtime_rotations WHERE machine_id=actor.id)))
 AND m.state='pending' AND m.barrier_attempt_id IS NULL AND r.state='pending' AND r.barrier_attempt_id IS NULL AND d.state='pending' AND d.barrier_attempt_id IS NULL
 AND m.auth_revision=? AND m.pin_revision=? AND r.runtime_revision=? AND d.revision=?)`;
 const exposure=legacyExposureGuard(state);return {sql:`(${sql}) AND ${exposure.sql}`,params:[machineId,state.installation.installationId,state.installation.repositoryId,credentialHash,state.snapshot.authRevision,state.snapshot.pinRevision,state.snapshot.runtimeRevision,state.data.configuration.revision,...exposure.params]};
}
// Last await before a response: current authority and protection DDL in one SQL.
export async function finalCoreGuard(context,machineId,credentialHash,own=null,pending=false,accessAudit=null) {
 const state=await coreState(context),{read}=runtimeContext(context);
 let guard;
 if(pending) {
  guard={sql:`EXISTS(SELECT 1 FROM memory_machine_grants g JOIN memory_machine_configuration m ON m.installation_id=g.installation_id JOIN memory_runtime_configuration r ON r.installation_id=m.installation_id JOIN memory_data_configuration d ON d.installation_id=m.installation_id WHERE g.id=? AND g.installation_id=? AND g.repository_id=? AND g.state='pending' AND g.machine_id IS NULL AND g.commitment=? AND g.secret_hash=? AND g.expires_at>unixepoch() AND m.state='pending' AND m.barrier_attempt_id IS NULL AND r.state='pending' AND r.barrier_attempt_id IS NULL AND d.state='pending' AND d.barrier_attempt_id IS NULL AND m.auth_revision=? AND m.pin_revision=? AND r.runtime_revision=? AND d.revision=? AND ?>unixepoch())`,params:[own.grantId,state.installation.installationId,state.installation.repositoryId,own.machineCommitment,own.capabilityHash,state.snapshot.authRevision,state.snapshot.pinRevision,state.snapshot.runtimeRevision,state.data.configuration.revision,own.proofDeadline]};
 } else if(credentialHash)guard=liveGuard(state,machineId,credentialHash);
 else {
  guard={sql:`EXISTS(SELECT 1 FROM memory_machine_principals p JOIN memory_machine_grants g ON g.id=p.grant_id AND g.machine_id=p.id
  JOIN memory_principals generic ON generic.id=p.id AND generic.installation_id=p.installation_id
  JOIN memory_runtime_keys k ON k.machine_id=p.id JOIN memory_machine_configuration m ON m.installation_id=p.installation_id
  JOIN memory_runtime_configuration r ON r.installation_id=m.installation_id JOIN memory_data_configuration d ON d.installation_id=m.installation_id
  WHERE p.id=? AND p.installation_id=? AND p.repository_id=? AND p.grant_id=? AND p.commitment=? AND k.commitment=p.commitment
  AND p.status='active' AND g.state='consumed' AND generic.status='active' AND m.state='pending' AND m.barrier_attempt_id IS NULL AND r.state='pending' AND r.barrier_attempt_id IS NULL AND d.state='pending' AND d.barrier_attempt_id IS NULL
  AND m.auth_revision=? AND m.pin_revision=? AND r.runtime_revision=? AND d.revision=? AND ?>unixepoch())`,params:[machineId,state.installation.installationId,state.installation.repositoryId,own.grantId,own.machineCommitment,state.snapshot.authRevision,state.snapshot.pinRevision,state.snapshot.runtimeRevision,state.data.configuration.revision,own.proofDeadline]};
 }
 if(accessAudit) {
  const sql='EXISTS(SELECT 1 FROM memory_legacy_access_audit audit WHERE audit.id=? AND audit.installation_id=? AND audit.machine_id=? AND audit.grant_id=? AND audit.operation=? AND audit.request_hash=? AND audit.scope_json=? AND audit.created_at=?)';
  guard={sql:`(${guard.sql}) AND ${sql}`,params:[...guard.params,...['id','installation_id','machine_id','grant_id','operation','request_hash','scope_json','created_at'].map(key=>accessAudit[key])]};
 }
 const hashes=await (state.legacy?compiledLegacyHashes():compiledCoreHashes());
 const exposure=legacyExposureGuard(state);guard={sql:`(${guard.sql}) AND ${exposure.sql}`,params:[...guard.params,...exposure.params]};
 const head=`coalesce((SELECT x.attempt_id FROM memory_data_deployments x JOIN memory_data_completions c ON c.attempt_id=x.attempt_id
 WHERE NOT EXISTS(SELECT 1 FROM memory_data_deployments next JOIN memory_data_completions nc ON nc.attempt_id=next.attempt_id WHERE next.predecessor_id=x.attempt_id)),(SELECT operation_id FROM memory_data_configuration))=?`;
 const activation=`EXISTS(SELECT 1 FROM memory_runtime_activations x JOIN memory_runtime_completions c ON c.attempt_id=x.attempt_id
 WHERE x.installation_id=? AND x.baseline_hash=? AND x.pin_hash=? AND x.protocol_hash=? AND x.route_contract_hash=?)`;
 const evidence=`CASE WHEN (SELECT operation_id FROM memory_data_configuration)=? THEN (SELECT json_extract(genesis_json,'$.evidence') FROM memory_data_bootstrap) ELSE (SELECT evidence_json FROM memory_data_deployments WHERE attempt_id=?) END=?`;
 const rows=state.legacy?await read(`SELECT name,type,sql FROM sqlite_master WHERE ${guard.sql} AND EXISTS(SELECT 1 FROM memory_legacy_deployments d JOIN memory_legacy_exposure e ON e.installation_id=? JOIN memory_legacy_protocol_transitions t ON t.attempt_id=e.attempt_id WHERE d.id=? AND d.evidence_json=? AND t.protocol_hash=? AND t.route_contract_hash=?)`,[...guard.params,state.installation.installationId,state.data.head.id,JSON.stringify(state.data.head.evidence),hashes.protocolHash,hashes.routeContractHash]):await read(`SELECT name,type,sql FROM sqlite_master WHERE ${guard.sql} AND ${head} AND ${activation} AND ${evidence}`,
 [...guard.params,state.data.head.id,state.installation.installationId,state.baselineHash,state.runtime.pin_hash,hashes.protocolHash,hashes.routeContractHash,state.data.head.id,state.data.head.id,JSON.stringify(state.data.head.evidence)]);
 requireValue(rows.length>0,'machine-proof-denied');
 for(const [name,expected] of Object.entries({...coreProtectionDdl,...(state.legacy?legacyDdl:{})})){const row=rows.find(r=>r.name===name);requireValue(row&&row.type===expected.type&&normalizeCoreDdl(row.sql)===expected.sql,'installation-conflict');}
 // No crypto, storage or network await may follow this guard before returning.
}
const privacy=(machineId,admin)=>({sql:`(f.owner_principal_id=?${admin?' OR 1=1':" OR (f.shared=1 AND f.type NOT IN ('user','feedback'))"}) AND EXISTS(SELECT 1 FROM memory_data_fact_links l JOIN memory_data_completions c ON c.attempt_id=l.attempt_id WHERE l.fact_id=f.id)`,params:[machineId]});
export // Count the completed finite pieces of this exact source/session update, rather than
// treating the last bounded piece's immutable schema14 run count as a whole capture.
const completedRunCounts=`(SELECT json_object('added',coalesce(sum(json_array_length(piece.payload_json,'$.facts')),0),'superseded',coalesce(sum((SELECT coalesce(sum(json_array_length(value,'$.supersedes')),0) FROM json_each(piece.payload_json,'$.facts'))),0),'captured',CASE WHEN json_type(a.payload_json,'$.session')='object' THEN 1 ELSE 0 END)
 FROM memory_data_attempts piece JOIN memory_data_completions done ON done.attempt_id=piece.id
 WHERE piece.action='capture' AND done.revision<=c.revision
 AND json_extract(piece.payload_json,'$.machineId')=json_extract(a.payload_json,'$.machineId') AND json_extract(piece.payload_json,'$.grantId')=json_extract(a.payload_json,'$.grantId')
 AND json_extract(piece.payload_json,'$.source')=json_extract(a.payload_json,'$.source') AND json_extract(piece.payload_json,'$.session.id')=json_extract(a.payload_json,'$.session.id')
 AND json_extract(piece.payload_json,'$.session.updatedAt')=json_extract(a.payload_json,'$.session.updatedAt') AND json_extract(piece.payload_json,'$.session.previousCursor') IS json_extract(a.payload_json,'$.session.previousCursor'))`;
async function finiteQuery(context,request,machineId,input) {
 exactKeys(input,['operation','params']);requireValue(CORE_OPERATIONS.includes(input.operation),'memory-sql-retired');
 const hash=await bearerHash(request),grant=await validateRuntimeBearer(context,{machineId,credentialHash:hash}),state=await coreState(context);
 const p=input.params;requireValue(p&&typeof p==='object'&&!Array.isArray(p));
 const everyone=p.everyone===true;requireValue(!everyone||grant.policy.administerData,'machine-proof-denied');
 const guard=liveGuard(state,machineId,hash),view=privacy(machineId,everyone),internal=runtimeContext(context);
 let auditId=null,accessAudit=null;
 if(state.legacy&&everyone) {
  accessAudit=await auditLegacyAccess(context,state,{machineId,grantId:grant.grantId,credentialHash:hash,operation:input.operation,requestHash:await digest(JSON.stringify(input)),scope:{everyone:true,operation:input.operation}});auditId=accessAudit.id;
 }
 if(state.legacy)view.sql=`(f.owner_principal_id=?${everyone?' OR 1=1':" OR (f.shared=1 AND f.type NOT IN ('user','feedback'))"})`;
 const read=async(sql,params=[])=>{
  if(state.legacy) {
   const quarantine=auditId?` UNION ALL SELECT ${fields},NULL legacy_claim_id FROM facts f JOIN memory_legacy_quarantine q ON q.kind='fact' AND q.original_id=cast(f.id AS TEXT) JOIN memory_legacy_exposure e ON e.attempt_id=q.attempt_id WHERE EXISTS(SELECT 1 FROM memory_legacy_access_audit access WHERE access.id='${auditId}' AND access.machine_id='${machineId}')`:'';
   const factRelation=`(SELECT * FROM memory_legacy_effective_facts${quarantine})`;
   const sessionFields='s.id,s.agent,s.author,s.machine,s.branch,s.cwd,s.started_at,s.ended_at,s.status,s.reason,s.read_through,s.raw_key,s.raw_bytes,s.updated_at,s.owner_principal_id';
   const sessionQuarantine=auditId?` UNION ALL SELECT ${sessionFields},NULL legacy_claim_id FROM sessions s JOIN memory_legacy_quarantine q ON q.kind='session' AND q.original_id=s.id JOIN memory_legacy_exposure e ON e.attempt_id=q.attempt_id WHERE EXISTS(SELECT 1 FROM memory_legacy_access_audit access WHERE access.id='${auditId}' AND access.machine_id='${machineId}')`:'';
   const sessionRelation=`(SELECT * FROM memory_legacy_effective_sessions${sessionQuarantine})`;
   sql=sql.replaceAll('FROM facts f','FROM '+factRelation+' f').replaceAll('JOIN facts f','JOIN '+factRelation+' f').replaceAll('FROM facts related','FROM '+factRelation+' related').replaceAll('FROM sessions s','FROM '+sessionRelation+' s').replaceAll('FROM sessions WHERE','FROM '+sessionRelation+' WHERE').replaceAll('JOIN memory_data_session_owners owner ON owner.session_id=s.id','');
  }
  return internal.read(sql,params);
 };
 const factRead=async(extra='',params=[],order='f.created_at DESC,f.id DESC',limit=100)=>read(`SELECT ${fields},
 (SELECT json_group_array(tag) FROM fact_tags WHERE fact_id=f.id) tags FROM facts f WHERE ${view.sql} AND ${guard.sql}${extra} ORDER BY ${order} LIMIT ?`,[...view.params,...guard.params,...params,limit]);
 let result;
 if(input.operation==='digest') {
  requireValue(Object.keys(p).every(k=>['slug','everyone'].includes(k))&&(p.slug==null||boundedText(p.slug,1000)),'invalid-input');
  const factObject="json_object('id',f.id,'slug',f.slug,'type',f.type,'body',f.body,'author',f.author,'created_at',f.created_at,'session_id',f.session_id,'superseded_by',f.superseded_by,'tags',json((SELECT json_group_array(tag) FROM fact_tags WHERE fact_id=f.id)))";
  const rows=await read(`WITH visible AS (SELECT ${fields} FROM facts f WHERE ${view.sql} AND ${guard.sql} AND f.superseded_by IS NULL),
  last AS (SELECT max(r.finished_at) at FROM runs r JOIN memory_data_runs receipt ON receipt.run_id=r.id JOIN memory_data_completions c ON c.attempt_id=receipt.attempt_id JOIN memory_data_attempts a ON a.id=c.attempt_id WHERE json_extract(a.payload_json,'$.machineId')=? AND json_extract(a.payload_json,'$.source')='consolidation')
  SELECT json_object('live',(SELECT count(*) FROM visible),
  'facts',json((SELECT json_group_array(json(${factObject})) FROM (SELECT * FROM visible WHERE type!='thread' ORDER BY CASE type WHEN 'feedback' THEN 0 WHEN 'user' THEN 1 WHEN 'project' THEN 2 ELSE 3 END,created_at DESC,id DESC LIMIT 100) f)),
  'threads',json((SELECT json_group_array(json(${factObject})) FROM (SELECT * FROM visible WHERE type='thread' AND slug=? ORDER BY created_at DESC,id DESC LIMIT 100) f)),
  'steps',json((SELECT json_group_array(json_object('tag',tag,'n',n)) FROM (SELECT (SELECT min(tag) FROM fact_tags WHERE fact_id=f.id AND tag IN ('explore','plan','apply','save','ship','continue','verify','routine','sync','setup','close','improve')) tag,count(*) n FROM visible f WHERE f.type='thread' AND (f.slug!=? OR f.slug IS NULL) GROUP BY tag))),
  'runs',json((SELECT json_group_array(json_object('id',id,'host',host,'started_at',started_at,'finished_at',finished_at,'status',status,'reason',reason,'counts',counts,'kind',kind)) FROM (SELECT r.id,r.host,r.started_at,r.finished_at,r.status,r.reason,${completedRunCounts} counts,CASE json_extract(a.payload_json,'$.source') WHEN 'consolidation' THEN 'consolidation' ELSE 'capture' END kind FROM runs r JOIN memory_data_runs receipt ON receipt.run_id=r.id JOIN memory_data_completions c ON c.attempt_id=receipt.attempt_id JOIN memory_data_attempts a ON a.id=c.attempt_id WHERE json_extract(a.payload_json,'$.machineId')=? ORDER BY r.id DESC LIMIT 1))),
  'consolidation',json_object('last_consolidation',(SELECT at FROM last),'first_fact',(SELECT min(created_at) FROM visible),'captured_since',(SELECT count(*) FROM sessions WHERE owner_principal_id=? AND status='captured' AND updated_at>coalesce((SELECT at FROM last),'')))) value`,[...view.params,...guard.params,machineId,p.slug||'',p.slug||'',machineId,machineId]);
  result=JSON.parse(rows[0].value);
 } else if(['facts','fact'].includes(input.operation)) {
  const allowed=['everyone','all','ids','slug','excludeSlug','type','tags','terms','since','until','author','branch','change','limit','threadsFirst','ownOnly','oldestFirst'];
  requireValue(Object.keys(p).every(k=>allowed.includes(k)));
  const limit=p.limit??100;requireValue(integer(limit)&&limit<=200,'invalid-input');let extra=p.all?'':' AND f.superseded_by IS NULL',params=[];for(const key of ['ownOnly','oldestFirst'])requireValue(p[key]===undefined||typeof p[key]==='boolean');if(p.ownOnly){extra+=' AND f.owner_principal_id=?';params.push(machineId);}
  for(const k of ['slug','excludeSlug','type','since','until','author','branch','change','terms'])if(p[k]!==undefined)requireValue(boundedText(p[k],1000));
  if(p.author!==undefined)throw Object.assign(new Error('author-filter-retired-use-own-machine-or-explicit-admin'),{code:'author-filter-retired'});
  if(p.type){requireValue(['user','feedback','project','reference','thread'].includes(p.type));extra+=' AND f.type=?';params.push(p.type);}
  for(const [key,op,col] of [['slug','=','slug'],['excludeSlug','!=','slug'],['since','>=','created_at'],['until','<=','created_at']])if(p[key]){extra+=` AND f.${col}${op}?`;params.push(p[key]);}
  if(p.ids){requireValue(Array.isArray(p.ids)&&p.ids.length<=100&&p.ids.every(integer));extra+=' AND f.id IN (SELECT value FROM json_each(?))';params.push(JSON.stringify(p.ids));}
  if(p.tags){requireValue(Array.isArray(p.tags)&&p.tags.length<=30&&p.tags.every(t=>boundedText(t,100)));extra+=` AND f.id IN (SELECT ft.fact_id FROM fact_tags ft JOIN tags t ON t.name=ft.tag WHERE coalesce(t.alias_of,t.name) IN (SELECT coalesce(alias_of,name) FROM tags WHERE name IN (SELECT value FROM json_each(?))))`;params.push(JSON.stringify(p.tags));}
  let order=(p.threadsFirst?"CASE f.type WHEN 'thread' THEN 0 ELSE 1 END,":'')+(p.oldestFirst?'f.created_at ASC,f.id ASC':'f.created_at DESC,f.id DESC');
  let rankParams=[];if(p.terms){extra+=' AND f.id IN (SELECT rowid FROM facts_fts WHERE facts_fts MATCH ?)';params.push(p.terms);order=`(SELECT rank FROM facts_fts WHERE facts_fts MATCH ? AND rowid=f.id),`+order;rankParams.push(p.terms);}
  if(p.branch||p.change){extra+=` AND EXISTS(SELECT 1 FROM sessions s WHERE s.id=f.session_id AND (s.branch=? OR EXISTS(SELECT 1 FROM facts related WHERE related.session_id=s.id AND related.slug=? AND related.owner_principal_id=f.owner_principal_id AND ${view.sql.replaceAll('f.','related.')})))`;params.push(p.branch||'',p.change||'',...view.params);}
  result=await factRead(extra,[...params,...rankParams],order,limit);result=result.map(r=>({...r,tags:JSON.parse(r.tags||'[]')}));
 } else if(['sessions','session'].includes(input.operation)) {
  requireValue(Object.keys(p).every(k=>['ids','limit','everyone'].includes(k)));
  if(p.ids)requireValue(Array.isArray(p.ids)&&p.ids.length<=100&&p.ids.every(id=>boundedText(id,200)));
  result=await read(`SELECT s.id,s.agent,s.status,s.reason,s.read_through,s.branch,s.cwd,s.started_at,s.ended_at,s.updated_at,s.owner_principal_id FROM sessions s
 JOIN memory_data_session_owners owner ON owner.session_id=s.id WHERE (s.owner_principal_id=?${everyone?' OR 1=1':''}) AND ${guard.sql}
 ${p.ids?'AND s.id IN (SELECT value FROM json_each(?))':''} ORDER BY s.updated_at DESC LIMIT 100`,[machineId,...guard.params,...(p.ids?[JSON.stringify(p.ids)]:[])]);
 } else if(input.operation==='tags') {
  requireValue(Object.keys(p).every(k=>k==='everyone'));
  result=await read(`SELECT t.name,t.definition,t.alias_of,count(f.id) uses FROM tags t LEFT JOIN fact_tags ft ON ft.tag=t.name LEFT JOIN facts f ON f.id=ft.fact_id AND ${view.sql}
 WHERE ${guard.sql} GROUP BY t.name HAVING count(f.id)>0 OR t.created_by=? ORDER BY t.name LIMIT 200`,[...view.params,...guard.params,machineId]);
 } else if(input.operation==='transcript-info') {
  exactKeys(p,['sessionId']);requireValue(boundedText(p.sessionId,200));const sessionHash=await digest(p.sessionId);
  const imported=state.legacy?.claims.find(claim=>claim.kind==='raw'&&state.legacy.review.selected.some(selected=>selected.kind==='raw'&&String(selected.id)===claim.original_id&&selected.sessionId===p.sessionId)&&(claim.visibility==='admin-only'?grant.policy.administerData:claim.machine_id===machineId));
  if(imported) {
   if(imported.visibility==='admin-only')accessAudit=await auditLegacyAccess(context,state,{machineId,grantId:grant.grantId,credentialHash:hash,operation:'raw',requestHash:await digest(JSON.stringify(input)),scope:{claimId:imported.id,visibility:'admin-only'}});
   result=[{object_hash:await digest(imported.original_id)}];
  }
  else result=await read(`SELECT x.object_hash FROM memory_runtime_transcripts x JOIN memory_runtime_completions c ON c.attempt_id=x.attempt_id WHERE x.session_hash=? AND x.event='published' AND (x.machine_id=?${grant.policy.administerData?' OR 1=1':''}) AND ${guard.sql} ORDER BY x.credential_generation DESC,c.runtime_revision DESC LIMIT 1`,[sessionHash,machineId,...guard.params]);
 } else if(input.operation==='runs') {
  requireValue(Object.keys(p).every(k=>['everyone','limit'].includes(k)));
  result=await read(`SELECT r.id,r.host,r.started_at,r.finished_at,r.status,r.reason,${completedRunCounts} counts,CASE json_extract(a.payload_json,'$.source') WHEN 'consolidation' THEN 'consolidation' ELSE 'capture' END kind
 FROM runs r JOIN memory_data_runs receipt ON receipt.run_id=r.id JOIN memory_data_completions c ON c.attempt_id=receipt.attempt_id JOIN memory_data_attempts a ON a.id=c.attempt_id
 WHERE (json_extract(a.payload_json,'$.machineId')=?${everyone?' OR 1=1':''}) AND ${guard.sql} ORDER BY r.id DESC LIMIT 20`,[machineId,...guard.params]);
 } else if(input.operation==='consolidation') {
  requireValue(Object.keys(p).every(k=>k==='everyone'));
  result=await read(`WITH last AS (SELECT max(r.finished_at) at FROM runs r JOIN memory_data_runs receipt ON receipt.run_id=r.id JOIN memory_data_completions c ON c.attempt_id=receipt.attempt_id
 JOIN memory_data_attempts a ON a.id=c.attempt_id WHERE json_extract(a.payload_json,'$.machineId')=? AND json_extract(a.payload_json,'$.source')='consolidation') SELECT (SELECT at FROM last) last_consolidation,
 (SELECT count(*) FROM sessions WHERE owner_principal_id=? AND status='captured' AND updated_at>coalesce((SELECT at FROM last),'')) captured_since,
 (SELECT min(f.created_at) FROM facts f WHERE ${view.sql}) first_fact WHERE ${guard.sql}`,[machineId,machineId,...view.params,...guard.params]);
 } else {
  requireValue(Object.keys(p).every(k=>k==='everyone'));
  result=await read(`SELECT f.type,count(*) n,sum(f.superseded_by IS NULL) live FROM facts f WHERE ${view.sql} AND ${guard.sql} GROUP BY f.type`,[...view.params,...guard.params]);
 }
 // The SQL guard cannot stand in for fresh protection/version checks after network awaits.
 const snapshot=await dataSnapshot(state);await finalCoreGuard(context,machineId,hash,null,false,accessAudit);
 return {result,scope:grant.scope,snapshot:state.snapshot,dataSnapshot:snapshot};
}
export async function handleMachineCore(request,env) {
 try {
  const url=new URL(request.url),route=routePattern.exec(url.pathname);
  requireValue(route&&!url.search&&!url.hash&&!url.pathname.includes('%')&&url.protocol==='https:','memory-route-denied');
  const [,repositoryId,machineId,operation]=route;requireValue(env.WONG_ENVIRONMENT==='production','memory-route-denied');requireValue(request.method===CORE_ROUTES[operation],'memory-method-denied');
  requireValue(env.MEMORY_DB&&typeof env.MEMORY_INSTALLATION==='string'&&env.MEMORY_INSTALLATION,'memory-pending-setup');
  const installation=JSON.parse(env.MEMORY_INSTALLATION);resourceTarget(installation,true);
  requireValue(repositoryId===installation.repositoryId&&url.origin===installation.memoryOrigin&&(!request.headers.get('Origin')||request.headers.get('Origin')===installation.memoryOrigin),'target-mismatch');
  const execution={schemaVersion:env.MEMORY_SCHEMA_VERSION==='15'?15:14,environment:env.WONG_ENVIRONMENT,origin:url.origin,versionId:env.CF_VERSION_METADATA?.id,workerName:env.MEMORY_WORKER_NAME,databaseId:env.MEMORY_DATABASE_ID,bucketName:env.MEMORY_BUCKET_NAME||null};
  requireValue(typeof execution.versionId==='string'&&execution.versionId.length>0,'unreviewed-deployment');
  const context=publicMachineContext(env.MEMORY_DB,installation,execution);
  if(['upload','transcript'].includes(operation))return await handleCoreTranscript(context,request,env.MEMORY_BUCKET,machineId,operation);
  requireValue(request.headers.get('Content-Type')==='application/json','invalid-input');
  const declared=request.headers.get('Content-Length');requireValue(declared===null||(/^\d+$/.test(declared)&&Number.isSafeInteger(Number(declared))&&Number(declared)<=70000),'invalid-input');
  requireValue(request.body,'invalid-input');const reader=request.body.getReader(),chunks=[];let length=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;requireValue(length<=70000,'invalid-input');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  await coreState(context);
  if(operation==='query')return json(200,{success:true,...await finiteQuery(context,request,machineId,input)});
  requireValue(input?.payload?.machineId===machineId&&input.payload.grantId&&opaqueId(input.payload.grantId),'machine-proof-denied');
  if(operation==='capture')requireValue(input.payload.credentialHash===await bearerHash(request),'machine-proof-denied');
  const handlers={enroll:enrollRuntimeMachine,renew:renewRuntimeMachine,'self-status':readSignedMachineSnapshot,'enrollment-status':readSignedEnrollmentSnapshot,capture:captureMachineData,'capture-status':readSignedMachineDataStatus};
  if(['stage','publish'].includes(operation))return await handleCoreTranscript(context,request,env.MEMORY_BUCKET,machineId,operation,input);
  const result=await handlers[operation](context,input);const state=await coreState(context);
  const extra=(operation==='self-status'||operation==='enrollment-status')?{dataSnapshot:await dataSnapshot(state)}:{};
  if(['self-status','enrollment-status'].includes(operation)&&request.headers.has('Wong-Memory-Attempt')) {
   const attemptId=request.headers.get('Wong-Memory-Attempt'),candidateHash=request.headers.get('Wong-Memory-Candidate');requireValue(opaqueId(attemptId)&&/^[0-9a-f]{64}$/.test(candidateHash||''),'invalid-input');
   const rows=await runtimeContext(context).read(`SELECT a.id,a.action,a.payload_json,a.request_hash,c.attempt_id completed FROM memory_runtime_attempts a LEFT JOIN memory_runtime_completions c ON c.attempt_id=a.id AND c.request_hash=a.request_hash AND c.audit_id=a.audit_id WHERE a.id=?`,[attemptId]);
   if(rows.length){const a=rows[0],p=JSON.parse(a.payload_json);requireValue(['enroll','renew','stage','publish'].includes(a.action)&&p.machineId===machineId&&p.grantId===input.payload.grantId&&p.machineCommitment===input.payload.machineCommitment&&(p.credentialHash||p.objectHash)===candidateHash,'machine-proof-denied');
    if(['stage','publish'].includes(a.action)){const intent=JSON.parse(request.headers.get('Wong-Memory-Intent')||'null');exactKeys(intent,['action','objectHash','sessionHash','contentHash','credentialGeneration','visibility','stageAttemptId']);requireValue(intent.action===a.action&&['objectHash','sessionHash','contentHash','credentialGeneration','visibility'].every(k=>p[k]===intent[k])&&(p.stageAttemptId||null)===intent.stageAttemptId,'machine-proof-denied');extra.intent=intent;}requireValue(a.completed,'machine-operation-incomplete');const wanted=request.headers.get('Wong-Memory-Request');requireValue(wanted===null||wanted===a.request_hash,'machine-proof-denied');extra.candidate={attemptId,candidateHash,completed:true,absent:false,action:a.action,requestHash:a.request_hash};}
   else {
    extra.candidate={attemptId,candidateHash,completed:false,absent:true};
    const encoded=request.headers.get('Wong-Memory-Original-Candidate');
    if(encoded) {
     requireValue(encoded.length<=12000,'invalid-input');const original=JSON.parse(encoded);exactKeys(original,['attemptId','expected','payload','proof']);
     const intent=JSON.parse(request.headers.get('Wong-Memory-Intent')||'null'),p=original.payload;
     requireValue(['stage','publish'].includes(intent?.action)&&original.attemptId===attemptId&&p.machineId===machineId&&p.grantId===input.payload.grantId&&p.machineCommitment===input.payload.machineCommitment&&p.objectHash===candidateHash,'machine-proof-denied');
     const originalProof=await verifyMachineProof({installation:state.installation,purpose:intent.action,attemptId:original.attemptId,expected:original.expected,payload:p},original.proof,original.proof.issuedAt);
     requireValue(originalProof.commitment===p.machineCommitment,'machine-proof-denied');
     const payload={...p,...originalProof};delete payload.commitment;
     const requestHash=await machineHash({version:13,installation:state.installation,action:intent.action,attemptId:original.attemptId,expected:original.expected,payload});
     requireValue(request.headers.get('Wong-Memory-Request')===requestHash&&['objectHash','sessionHash','contentHash','credentialGeneration','visibility'].every(key=>p[key]===intent[key])&&(p.stageAttemptId||null)===intent.stageAttemptId,'machine-proof-denied');
     extra.intent=intent;extra.candidate={...extra.candidate,action:intent.action,requestHash};
     if(originalProof.deadline<Math.floor(Date.now()/1000)) {
      const evidence=await runtimeContext(context).read(`SELECT count(*) n FROM memory_runtime_attempts WHERE id=? UNION ALL SELECT count(*) n FROM memory_runtime_transcripts WHERE attempt_id=? UNION ALL SELECT count(*) n FROM memory_runtime_proofs WHERE attempt_id=? UNION ALL SELECT count(*) n FROM memory_runtime_audit WHERE attempt_id=? UNION ALL SELECT count(*) n FROM memory_runtime_completions WHERE attempt_id=?`,Array(5).fill(attemptId));
      requireValue(evidence.length===5&&evidence.every(row=>row.n===0),'machine-operation-incomplete');
      const frame={version:1,nonExecution:true,action:intent.action,attemptId,requestHash,candidateHash,installation:state.installation,machineId,grantId:p.grantId,keyCommitment:p.machineCommitment,intent,predecessorProofHash:originalProof.proofHash,predecessorDeadline:originalProof.deadline,snapshot:state.snapshot};
      extra.candidate.nonExecution={...frame,evidenceHash:await digest(JSON.stringify(frame))};
     }
    }
   }
  }
  if(operation==='enrollment-status') {
   // Pending capability reads use the retained proof/expiry query as their final
   // guard, rather than pretending the candidate is an enrolled principal.
   await finalCoreGuard(context,machineId,null,{...input.payload,proofDeadline:input.proof.deadline},true);
   return json(200,{success:true,result,...extra});
  }
  await finalCoreGuard(context,machineId,['enroll','renew','capture'].includes(operation)?input.payload.credentialHash:null,{...input.payload,proofDeadline:input.proof.deadline});
  return json(200,{success:true,result,...extra});
 } catch(error) {
  const code=typeof error.code==='string'?error.code:'memory-request-denied';
  return json(code==='memory-pending-setup'?503:code==='memory-method-denied'?405:code==='memory-route-denied'?404:403,{success:false,code});
 }
}
