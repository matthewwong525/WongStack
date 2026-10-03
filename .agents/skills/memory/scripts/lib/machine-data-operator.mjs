// Inactive source entrypoints; no routes, CLI, hooks, setup integration or resource creation.
import { runtimeContext,providerMachineContext,dataInspectionContext } from '../../worker/machine-context.mjs';
import { inspectMachinePins,sameMachineValue,machineDigest } from './machine-operator.mjs';
import { inspectResources } from './installation-resources.mjs';
import { exactKeys,opaqueId,requireValue,resourceTarget,query,rows,digest,MemoryOperatorError } from './installation-validation.mjs';
import { machineHash } from './machine-state.mjs';
import { readRuntimeState,activeRuntimeMachine } from './machine-runtime-state.mjs';
import { dataManifestHash,dataSchemaHash,dataSnapshot,dataPending } from './machine-data-state.mjs';
import { machineDataMigrations } from './machine-data-migrations.mjs';
import { compiledDataHashes } from '../../worker/machine-data-contract.mjs';
import { verifyMachineDataProof } from '../../worker/machine-data-proof.mjs';
import { planDataAttempt,planDataCapture,planDataDeployment,planDataCompletion } from './machine-data-planners.mjs';

export async function inspectMachineDeployment(operator,target) {
 const resources=await inspectResources(operator,target);
 // This projection deliberately matches the original pin algorithm exactly.
 const projection={version:2,target,subdomain:resources.subdomain,workers:resources.workers.map(worker=>({name:worker.name,id:worker.id,versionId:worker.activeVersionId,
 domains:(worker.references?.domains??[]).map(row=>({hostname:row.hostname})),routes:(worker.routes??[]).map(row=>({pattern:row.pattern})),
 bindings:worker.settings.bindings.filter(row=>/^(MEMORY_|CF_ACCESS_|WONG_ENVIRONMENT$|WORKSPACE_LOGIN$|SKIP_AUTH$)/.test(row.name)).map(row=>({name:row.name,type:row.type,text:row.type==='plain_text'?row.text:null,databaseId:row.database_id??row.id??null,bucketName:row.bucket_name??null}))}))};
 return {targetJson:JSON.stringify(target),pinHash:await machineHash(projection),projection,
 identity:{target,subdomain:resources.subdomain,workers:resources.workers.map(w=>({name:w.name,id:w.id})).sort((a,b)=>a.name.localeCompare(b.name))}};
}
export async function trustedMachineDataContext(operator,installation) {
 const target=resourceTarget(installation,true);
 requireValue(typeof operator?.readMigration==='function'&&typeof operator?.cloudflare==='function','machine-context-denied');
 await inspectResources(operator,target);
 return providerMachineContext(installation,(sql,params=[])=>rows(operator,target,sql,params),statements=>query(operator,target,statements),
 ()=>inspectMachinePins(operator,target),filename=>operator.readMigration(filename),()=>inspectMachineDeployment(operator,target));
}
export async function prepareMachineData(context,input) {
 const internal=runtimeContext(context,true);exactKeys(input,['operationId','expected','genesis']);requireValue(opaqueId(input.operationId));exactKeys(input.genesis,['pinHash','targetJson','evidence']);
 const versions=await internal.read('SELECT version FROM schema_migrations ORDER BY version');requireValue([13,14].includes(versions.length),'schema-unsupported');
 if(versions.length===13) {
  const state=await readRuntimeState(context);
  requireValue(state.runtime.state==='pending'&&state.configuration.state==='pending'&&sameMachineValue(state.snapshot,input.expected),'machine-authority-stale');
  requireValue(internal.inspectDeployment&&sameMachineValue(await internal.inspectDeployment(),input.genesis.evidence)&&input.genesis.pinHash===input.genesis.evidence.pinHash&&input.genesis.targetJson===JSON.stringify(internal.target),'target-mismatch');
  let sql;try {sql=await internal.readMigration(machineDataMigrations.at(-1).filename);}catch {throw new MemoryOperatorError('migration-bundle-invalid');}
  requireValue(typeof sql==='string'&&await digest(sql)===machineDataMigrations.at(-1).sha256,'migration-bundle-invalid');
  const requestHash=await machineHash({version:14,installation:state.installation,operationId:input.operationId,expected:input.expected,
   baselineHash:state.baselineHash,originalPinHash:state.runtime.pin_hash,genesis:input.genesis});
  try {
   await internal.write([{sql,params:[]}]);
   const schemaHash=await dataSchemaHash(internal.read);
   await internal.write([{sql:`INSERT INTO memory_data_configuration(installation_id,repository_id,operation_id,request_hash,manifest_hash,schema_hash,baseline_hash,original_pin_hash,expected_json)
    SELECT ?,?,?,?,?,?,?,?,? FROM memory_runtime_configuration r JOIN memory_machine_configuration c USING(installation_id)
    WHERE r.installation_id=? AND r.state='pending' AND c.state='pending' AND r.runtime_revision=? AND c.auth_revision=? AND c.pin_revision=?`,
   params:[state.installation.installationId,state.installation.repositoryId,input.operationId,requestHash,await dataManifestHash(),schemaHash,state.baselineHash,state.runtime.pin_hash,JSON.stringify(input.expected),state.installation.installationId,input.expected.runtimeRevision,input.expected.authRevision,input.expected.pinRevision]},
   {sql:`INSERT INTO memory_data_bootstrap(installation_id,operation_id,request_hash,genesis_json) SELECT installation_id,operation_id,request_hash,?
    FROM memory_data_configuration WHERE operation_id=? AND request_hash=?`,params:[JSON.stringify(input.genesis),input.operationId,requestHash]}]);
  } catch { /* SQL-only or incomplete bootstrap stays closed; do not rerun/adopt it. */ }
 }
 const state=await readRuntimeState(context,{inspectDataMaintenance:true});requireValue(state.data,'machine-operation-incomplete');const d=state.data.configuration;
 requireValue(d.operation_id===input.operationId&&d.expected_json===JSON.stringify(input.expected)&&state.data.bootstrap.genesis_json===JSON.stringify(input.genesis)
 &&d.state==='pending','machine-operation-incomplete');return dataPending(state);
}
export const readMachineDataStatus=async context=>{runtimeContext(context,true);return dataPending(await readRuntimeState(context,{inspectDataMaintenance:true}));};
const integer=n=>Number.isSafeInteger(n)&&n>=1;
const text=(s,max)=>typeof s==='string'&&s.length>0&&s.length<=max&&!s.includes('\0');
function inputShape(input,proof) {
 exactKeys(input,['attemptId','expected','payload',...(proof?['proof']:[])]);requireValue(opaqueId(input.attemptId));
 exactKeys(input.expected,['authRevision','pinRevision','runtimeRevision','snapshotHash','dataRevision','deploymentHead']);
 requireValue(['authRevision','pinRevision','runtimeRevision','dataRevision'].every(k=>integer(input.expected[k]))&&machineDigest(input.expected.snapshotHash)&&opaqueId(input.expected.deploymentHead));
}
function captureShape(p) {
 exactKeys(p,['machineId','repositoryId','grantId','machineCommitment','machineRevision','grantRevision','credentialGeneration','credentialHash','visibility','source','newTags','session','facts','run']);
 requireValue(['machineId','repositoryId','grantId'].every(k=>opaqueId(p[k]))&&['machineCommitment','credentialHash'].every(k=>machineDigest(p[k]))
 &&['machineRevision','grantRevision','credentialGeneration'].every(k=>integer(p[k]))&&['private','shared'].includes(p.visibility)&&['save','backfill','consolidation'].includes(p.source));
 requireValue(Array.isArray(p.newTags)&&p.newTags.length<=30&&new Set(p.newTags.map(t=>t?.name)).size===p.newTags.length);
 for(const tag of p.newTags){exactKeys(tag,['name','definition','aliasOf']);requireValue(text(tag.name,100)&&text(tag.definition,1000)&&(tag.aliasOf===null||text(tag.aliasOf,100))&&tag.aliasOf!==tag.name);}
 requireValue(Array.isArray(p.facts)&&p.facts.length<=100&&(p.session!==null||p.facts.length===0)&&(p.session!==null||p.run!==null));
 if(p.session!==null) {
  exactKeys(p.session,['id','agent','status','reason','previousCursor','nextCursor','updatedAt','branch','cwd','startedAt','endedAt']);
  requireValue(text(p.session.id,200)&&['claude','codex'].includes(p.session.agent)&&['captured','skipped','private'].includes(p.session.status)
  &&(p.session.reason===null||text(p.session.reason,200))&&[p.session.previousCursor,p.session.nextCursor].every(c=>c===null||text(c,200))&&text(p.session.updatedAt,40)&&[p.session.branch,p.session.cwd,p.session.startedAt,p.session.endedAt].every(v=>v===null||text(v,1000)));
 }
 requireValue(p.session?.status!=='private'||(p.facts.length===0&&p.newTags.length===0));
 const supersedes=[];
 for(const f of p.facts) {
  exactKeys(f,['slug','type','body','tags','supersedes']);requireValue(text(f.slug,200)&&['user','feedback','project','reference','thread'].includes(f.type)&&text(f.body,400)
  &&Array.isArray(f.tags)&&f.tags.length<=30&&f.tags.every(t=>text(t,100))&&new Set(f.tags).size===f.tags.length
  &&Array.isArray(f.supersedes)&&f.supersedes.length<=100&&f.supersedes.every(integer));supersedes.push(...f.supersedes);
 }
 requireValue(new Set(supersedes).size===supersedes.length);
 const statementCount=4+(p.session?4:0)+(p.run?2:0)+2*p.newTags.length+p.facts.reduce((n,f)=>n+2+2*f.tags.length+2*f.supersedes.length,0);
 requireValue(statementCount<=200&&new TextEncoder().encode(JSON.stringify(p)).length<=65536,'capture-payload-too-large');
 if(p.run!==null) {
  exactKeys(p.run,['startedAt','finishedAt','counts']);exactKeys(p.run.counts,['added','superseded','captured']);
  requireValue(text(p.run.startedAt,40)&&text(p.run.finishedAt,40)&&p.run.counts.added===p.facts.length&&p.run.counts.superseded===supersedes.length&&p.run.counts.captured===(p.session?1:0));
 }
}
async function completion(context,state,input,action,payload,requestHash) {
 const {read}=runtimeContext(context),attempts=await read('SELECT * FROM memory_data_attempts WHERE id=?',[input.attemptId]);
 if(!attempts.length)return null;const a=attempts[0];
 requireValue(a.installation_id===state.installation.installationId&&a.action===action&&a.request_hash===requestHash&&a.payload_json===JSON.stringify(payload)&&a.expected_json===JSON.stringify(input.expected),'machine-attempt-conflict');
 const receipts=await read(`SELECT c.* FROM memory_data_completions c JOIN memory_data_audit audit ON audit.id=c.audit_id AND audit.attempt_id=c.attempt_id
 JOIN memory_data_outcomes o ON o.attempt_id=c.attempt_id WHERE c.attempt_id=? AND c.request_hash=? AND audit.request_hash=c.request_hash AND c.audit_id=? AND c.revision=? AND c.outcome_json=o.outcome_json`,[a.id,requestHash,a.audit_id,a.revision+1]);
 requireValue(receipts.length===1,'machine-operation-incomplete');
 return {...await dataPending(state),operation:{action,attemptId:a.id,completed:true,requestHash,historical:true,outcome:JSON.parse(receipts[0].outcome_json)}};
}
async function captureAuthority(context,state,payload) {
 requireValue((await runtimeContext(context).read(`SELECT x.attempt_id FROM memory_runtime_activations x JOIN memory_runtime_completions done ON done.attempt_id=x.attempt_id
 WHERE x.installation_id=? AND x.baseline_hash=? AND x.pin_hash=?`,[state.installation.installationId,state.baselineHash,state.runtime.pin_hash])).length===1,'machine-runtime-inactive');
 const machine=await activeRuntimeMachine(context,state,payload.machineId,payload.grantId),{read}=runtimeContext(context);
 requireValue(machine.revision===payload.machineRevision&&machine.grant_revision===payload.grantRevision&&machine.commitment===payload.machineCommitment
 &&payload.repositoryId===state.installation.repositoryId&&(payload.visibility==='private'||['memory:read memory:write','memory:read memory:write memory:admin'].includes(machine.scope)),'machine-capture-quarantined');
 const latest=await read(`SELECT k.* FROM memory_runtime_rotations k JOIN memory_runtime_completions c ON c.attempt_id=k.attempt_id
 JOIN memory_runtime_attempts a ON a.id=c.attempt_id AND a.audit_id=c.audit_id AND a.request_hash=c.request_hash
 JOIN memory_runtime_audit audit ON audit.id=c.audit_id AND audit.attempt_id=a.id AND audit.request_hash=a.request_hash
 WHERE k.machine_id=? ORDER BY k.generation DESC LIMIT 1`,[payload.machineId]);
 const keys=await read('SELECT * FROM memory_runtime_keys WHERE machine_id=?',[payload.machineId]);
 requireValue(latest.length===1&&latest[0].generation===payload.credentialGeneration&&latest[0].hash===payload.credentialHash&&latest[0].expires_at>Math.floor(Date.now()/1000)
 &&latest[0].grant_id===payload.grantId&&latest[0].grant_revision===payload.grantRevision&&latest[0].machine_revision===payload.machineRevision
 &&keys.length===1&&keys[0].public_key_json===payload.publicKeyJson,'machine-capture-quarantined');
}
async function captureEvidence(context,state,payload) {
 const {read}=runtimeContext(context);
 const machine=await activeRuntimeMachine(context,state,payload.machineId,payload.grantId);
 if(payload.session) {
  const rows=await read('SELECT * FROM sessions WHERE id=?',[payload.session.id]);
  if(rows.length) {
   const owners=await read('SELECT * FROM memory_data_session_owners WHERE session_id=?',[payload.session.id]);
   requireValue(rows.length===1&&owners.length===1&&owners[0].installation_id===state.installation.installationId&&owners[0].repository_id===state.installation.repositoryId
   &&owners[0].machine_id===payload.machineId&&rows[0].owner_principal_id===payload.machineId&&rows[0].agent===payload.session.agent&&rows[0].read_through===payload.session.previousCursor,'machine-proof-denied');
  } else requireValue(payload.session.previousCursor===null,'machine-proof-denied');
 }
 const definitions=await read(`SELECT name,definition,alias_of FROM tags WHERE name IN (SELECT json_extract(value,'$.name') FROM json_each(?))`,[JSON.stringify(payload.newTags)]);
 for(const tag of payload.newTags) {
  const row=definitions.find(r=>r.name===tag.name);requireValue(!row||(row.definition===tag.definition&&row.alias_of===tag.aliasOf),'tag-meaning-immutable-use-new-name');
 }
 const ids=payload.facts.flatMap(f=>f.supersedes);
 const rows=await read(`SELECT f.id,f.owner_principal_id,f.superseded_by,owner.installation_id,owner.repository_id FROM facts f
 JOIN memory_data_fact_links l ON l.fact_id=f.id JOIN memory_data_attempts a ON a.id=l.attempt_id
 JOIN memory_data_completions c ON c.attempt_id=a.id JOIN memory_machine_principals owner ON owner.id=f.owner_principal_id
 WHERE f.id IN (SELECT value FROM json_each(?)) AND a.installation_id=?`,[JSON.stringify(ids),state.installation.installationId]);
 requireValue(rows.length===ids.length&&rows.every(r=>r.superseded_by===null&&r.installation_id===state.installation.installationId&&r.repository_id===state.installation.repositoryId
 &&(r.owner_principal_id===payload.machineId||machine.scope==='memory:read memory:write memory:admin')),'machine-proof-denied');
}
async function captureOutcome(context,input,payload) {
 const {read}=runtimeContext(context),id=input.attemptId;
 const links=await read('SELECT ordinal,fact_id FROM memory_data_fact_links WHERE attempt_id=? ORDER BY ordinal',[id]);
 const sessions=await read('SELECT * FROM memory_data_session_events WHERE attempt_id=?',[id]),runs=await read('SELECT * FROM memory_data_runs WHERE attempt_id=?',[id]);
 requireValue(links.length===payload.facts.length&&links.every((l,i)=>l.ordinal===i)&&sessions.length===(payload.session?1:0)&&runs.length===(payload.run?1:0),'machine-operation-incomplete');
 return {action:'capture',attemptId:id,tags:payload.newTags,facts:links.map(l=>({ordinal:l.ordinal,factId:l.fact_id})),session:payload.session?{id:payload.session.id,previousCursor:payload.session.previousCursor,nextCursor:payload.session.nextCursor}:null,
 supersedes:payload.facts.flatMap((f,ordinal)=>f.supersedes.map(factId=>({factId,ordinal,newFactId:links[ordinal].fact_id}))),run:payload.run?{id:runs[0].run_id,counts:payload.run.counts}:null};
}
function compactCapturePlan(plans) {
 const result=[];
 for(let i=0;i<plans.length;) {
  const first=plans[i],insert=/^(INSERT INTO (?:fact_tags|memory_data_tag_links|memory_data_supersedes)[\s\S]*?) SELECT /.exec(first.sql);
  if(!insert){result.push(first);i++;continue;}
  const target=insert[1].split('(')[0],alternating=target==='INSERT INTO fact_tags';
  const group=[],partners=[];
  while(i<plans.length&&plans[i].sql.startsWith(insert[1]+' SELECT ')) {
   group.push(plans[i++]);if(alternating&&plans[i]?.sql.startsWith('INSERT INTO memory_data_tag_links'))partners.push(plans[i++]);
  }
  const merge=rows=>({sql:rows[0].sql.slice(0,rows[0].sql.indexOf(' SELECT '))+ ' '+rows.map(r=>r.sql.slice(r.sql.indexOf(' SELECT ')+1)).join(' UNION ALL '),params:rows.flatMap(r=>r.params)});
  result.push(merge(group));if(partners.length)result.push(merge(partners));
 }
 return result;
}
export async function captureMachineData(context,input) {
 runtimeContext(context);context=dataInspectionContext(context);inputShape(input,true);captureShape(input.payload);let state=await readRuntimeState(context,{inspectDataMaintenance:true});
 requireValue(state.data,'schema-unsupported');
 const verified=await verifyMachineDataProof({installation:state.installation,attemptId:input.attemptId,expected:input.expected,payload:input.payload},input.proof);
 requireValue(verified.commitment===input.payload.machineCommitment,'machine-proof-denied');
 // Proof nonce is attempt-bound but fresh proof lifetime is independent of historical exact outcomes.
 const payload={...input.payload,publicKeyJson:verified.publicKeyJson};
 const requestHash=await digest(JSON.stringify({version:14,installation:state.installation,action:'capture',attemptId:input.attemptId,expected:input.expected,payload}));
 await captureAuthority(context,state,payload);
 const old=await completion(context,state,input,'capture',payload,requestHash);if(old)return old;
 requireValue(sameMachineValue(await dataSnapshot(state),input.expected),'machine-authority-stale');
 await captureEvidence(context,state,payload);
 const auditId=crypto.randomUUID(),internal=runtimeContext(context);
 const writes=[planDataAttempt(state,input,'capture',payload,requestHash,auditId,verified),...compactCapturePlan(planDataCapture(input,payload,auditId))];
 // Reserve all remaining write, receipt and post-await validation statements before closing a barrier.
 internal.reserve?.(writes.length+3+20);
 try {await internal.write(writes);
  await captureAuthority(context,await readRuntimeState(context,{inspectDataMaintenance:true}),payload);
  const outcome=await captureOutcome(context,input,payload);
  await internal.write(planDataCompletion(input,auditId,requestHash,outcome));
 } catch { /* Exact final receipt is the sole saved outcome. */ }
 state=await readRuntimeState(context,{inspectDataMaintenance:true});await captureAuthority(context,state,payload);
 const result=await completion(context,state,input,'capture',payload,requestHash);requireValue(result,'machine-operation-incomplete');return result;
}
export async function recordMachineDeployment(context,input) {
 const internal=runtimeContext(context,true);inputShape(input,false);const p=input.payload;
 exactKeys(p,['predecessorId','previousPinHash','pinHash','evidence','reviewHash','protocolHash','routeContractHash','rollback']);
 requireValue(opaqueId(p.predecessorId)&&['previousPinHash','pinHash','reviewHash','protocolHash','routeContractHash'].every(k=>machineDigest(p[k]))&&typeof p.rollback==='boolean');
 requireValue(internal.inspectDeployment,'machine-context-denied');
 let state=await readRuntimeState(context,{inspectDeployment:false,inspectDataMaintenance:true});requireValue(state.data,'schema-unsupported');
 const compiled=await compiledDataHashes(),actual=await internal.inspectDeployment();
 requireValue(sameMachineValue(actual,p.evidence)&&p.reviewHash===await machineHash(p.evidence)&&p.pinHash===actual.pinHash
 &&p.protocolHash===compiled.protocolHash&&p.routeContractHash===compiled.routeContractHash,'unreviewed-deployment');
 const payload={...p},requestHash=await machineHash({version:14,installation:state.installation,action:'deployment',attemptId:input.attemptId,expected:input.expected,payload});
 const old=await completion(context,state,input,'deployment',payload,requestHash);if(old)return old;
 requireValue(p.predecessorId===state.data.head.id&&p.previousPinHash===state.data.head.pinHash&&p.pinHash!==p.previousPinHash
 &&sameMachineValue(actual.identity,state.data.head.evidence.identity),'unreviewed-deployment');
 requireValue(sameMachineValue(await dataSnapshot(state),input.expected),'machine-authority-stale');
 const auditId=crypto.randomUUID(),outcome={action:'deployment',attemptId:input.attemptId,predecessorId:p.predecessorId,pinHash:p.pinHash,reviewHash:p.reviewHash};
 try {await internal.write([planDataAttempt(state,input,'deployment',payload,requestHash,auditId),...planDataDeployment(input,payload,auditId)]);
  requireValue(sameMachineValue(await internal.inspectDeployment(),p.evidence),'target-mismatch');
  await internal.write(planDataCompletion(input,auditId,requestHash,outcome));
 } catch { /* Partial successor never becomes the active pin. */ }
 state=await readRuntimeState(context,{inspectDataMaintenance:true});
 const result=await completion(context,state,input,'deployment',payload,requestHash);requireValue(result,'machine-operation-incomplete');return result;
}

// Fresh private-key proof can inspect an own retained outcome after rotation/expiry.
// It never authorizes data reads/writes, reenrollment or credential issuance.
export async function readSignedMachineDataStatus(context,input) {
 runtimeContext(context);context=dataInspectionContext(context);inputShape(input,true);
 const p=input.payload;exactKeys(p,['machineId','grantId','machineCommitment','targetAttemptId','requestHash']);
 requireValue(['machineId','grantId','targetAttemptId'].every(k=>opaqueId(p[k]))&&machineDigest(p.machineCommitment)&&machineDigest(p.requestHash));
 const state=await readRuntimeState(context,{inspectDataMaintenance:true});requireValue(state.data,'schema-unsupported');
 const verified=await verifyMachineDataProof({installation:state.installation,purpose:'capture-status',attemptId:input.attemptId,expected:input.expected,payload:p},input.proof);
 const machine=await activeRuntimeMachine(context,state,p.machineId,p.grantId),{read}=runtimeContext(context);
 const keys=await read('SELECT * FROM memory_runtime_keys WHERE machine_id=?',[p.machineId]);
 requireValue(machine.commitment===p.machineCommitment&&verified.commitment===machine.commitment&&keys.length===1&&keys[0].public_key_json===verified.publicKeyJson,'machine-proof-denied');
 const attempts=await read('SELECT * FROM memory_data_attempts WHERE id=?',[p.targetAttemptId]);
 if(attempts.length===0)return {...await dataPending(state),access:'receipt-only',operation:{action:'capture',attemptId:p.targetAttemptId,requestHash:p.requestHash,completed:false,absent:true}};
 requireValue(attempts.length===1,'machine-proof-denied');const a=attempts[0],payload=JSON.parse(a.payload_json);
 requireValue(a.action==='capture'&&a.installation_id===state.installation.installationId&&a.request_hash===p.requestHash,'machine-proof-denied');
 requireValue(payload.machineId===p.machineId&&payload.grantId===p.grantId&&payload.machineCommitment===p.machineCommitment&&payload.publicKeyJson===verified.publicKeyJson,'machine-proof-denied');
 const receipt=await completion(context,state,{attemptId:a.id,expected:JSON.parse(a.expected_json)},'capture',payload,a.request_hash);
 requireValue(receipt,'machine-operation-incomplete');
 return {...receipt,operation:{...receipt.operation,historical:true},access:'receipt-only'};
}
