// Synthetic finite trusted adapter and real historical SQL. Used only by the remote suite.
import { legacyFixture,closureFor,id,hash } from './legacy-cutover.mjs';
import { coreFixture,MACHINE,GRANT,TOKEN,CAPABILITY,signed,signedData,now } from './core.mjs';
import { signingKey,d1Fixture } from './runtime.mjs';
import { migrationSql } from './identity.mjs';
import { inspectLegacyMemory,legacyHash } from '../../../../.agents/skills/memory/scripts/lib/machine-legacy-inventory.mjs';
import { reviewLegacyMemory } from '../../../../.agents/skills/memory/scripts/lib/machine-legacy-review.mjs';
import { trustedLegacyAdapter } from '../../../../.agents/skills/memory/scripts/lib/machine-legacy-adapter.mjs';
import { originalLegacyUniverse,prepareLegacyCutover,applyLegacyCutover,trustedLegacyRuntimeContext } from '../../../../.agents/skills/memory/scripts/lib/machine-legacy-operator.mjs';
import { inspectMachineDeployment } from '../../../../.agents/skills/memory/scripts/lib/machine-data-operator.mjs';
import { readRuntimeState } from '../../../../.agents/skills/memory/scripts/lib/machine-runtime-state.mjs';
import { readMachineDataStatus } from '../../../../.agents/skills/memory/scripts/lib/machine-data-operator.mjs';
import { digest } from '../../../../.agents/skills/memory/scripts/lib/installation-validation.mjs';
import { handleMemory } from '../../../../.agents/skills/memory/worker/memory-worker.mjs';
export { id,hash,MACHINE,GRANT,TOKEN,CAPABILITY,signed,signedData,now };
const clone=value=>structuredClone(value);
export async function importFixture(t,version=6,options={}) {
 let f;
 if(version===14) {
  f=await coreFixture(t,{scope:options.scope});const old=await legacyFixture(t);
  f.ownership=old.ownership;f.source=old.source;f.source.credentials=f.source.credentials.filter(row=>row.kind!=='memory-key');
  f.source.targetHash=await legacyHash(f.target);f.source.resourceOwnershipHash=await legacyHash(f.ownership);
  f.db.exec("INSERT INTO sessions(id,agent,author,machine,status,raw_key,raw_bytes,updated_at,branch) VALUES('codex:legacy','codex','old@example.com','old-label','captured','old@example.com/raw/session',4,'2025-01-01','main'); INSERT INTO facts(slug,type,body,session_id,source,created_at,author,shared) VALUES('business','project','Original authored decision.','codex:legacy','save','2025-01-01','old@example.com',1); INSERT INTO facts(slug,type,body,session_id,source,created_at,author,shared) VALUES('business','user','Original private preference.','codex:legacy','save','2025-01-01','old@example.com',1); INSERT INTO tags(name,definition,created_at) VALUES('legacy','Original tag.','2025-01-01'); INSERT INTO fact_tags(fact_id,tag) VALUES(1,'legacy')");
 } else {f=await legacyFixture(t,version);f.signing=await signingKey();f.scope=options.scope??'memory:read memory:write';}
 f.scope??='memory:read memory:write';f.installation??={...f.target,installationId:id('new-installation'),repositoryId:id('new-repository')};
 f.destination={installation:f.installation,machineId:MACHINE,grantId:GRANT,machineCommitment:f.signing.commitment,machineRevision:1,grantRevision:2,credentialGeneration:1,scope:f.scope,grantEvidenceHash:hash('5')};
 f.selection=options.selection??{factIds:[1,2],sessionIds:['codex:legacy'],rawKeys:['old@example.com/raw/session']};
 if(options.privateRaw)f.db.exec("UPDATE sessions SET status='private' WHERE id='codex:legacy'");
 f.db.exec("INSERT INTO sessions(id,agent,author,status,raw_key,raw_bytes,updated_at) VALUES('codex:unselected','codex','other@example.com','captured','unselected/raw/key',4,'2025-01-02'); INSERT INTO facts(slug,type,body,session_id,source,created_at,author) VALUES('quarantine','project','Unclaimed sentinel.','codex:unselected','save','2025-01-02','other@example.com')");
 if(options.removedHistory&&version>=10) {const principal=id('original-removed-principal');f.db.prepare("INSERT INTO memory_principals(id,installation_id,status,created_at) VALUES(?,?,'removed',1)").run(principal,f.installation.installationId);f.db.prepare("INSERT INTO memory_memberships(installation_id,repository_id,principal_id,role,status,created_at,updated_at) VALUES(?,?,?,'member','removed',1,1)").run(f.installation.installationId,f.installation.repositoryId,principal);}
 f.rawReads=[];f.callbackCounts={closeServing:0,disableBucket:0,retireCredential:0,probe:0,write:0};f.journal=[];f.mutations=new Map();f.closed=new Set();f.retired=new Set();f.bucketClosed=false;f.drop=null;f.afterStatement=null;f.beforeRead=null;f.afterRead=null;f.totalStatements=0;f.objects=new Map([['old@example.com/raw/session',Buffer.from('raw!')],['unselected/raw/key',Buffer.from('nope')]]);
 f.db.function('unixepoch',()=>now());
 const read=async(sql,params=[])=>{await f.beforeRead?.(sql,params);const result=f.db.prepare(sql).all(...params).map(row=>({...row}));await f.afterRead?.(sql,params);return result;};
 const sourceRead=async()=>({...clone(f.source),observedAt:now()});
 const raw=async(_target,key)=>{f.rawReads.push(key);const value=f.objects.get(key);if(!value)throw new Error('missing synthetic raw');return {key,contentHash:await digest(value),bytes:value.length,evidenceHash:hash('7')};};
 f.inventory=await inspectLegacyMemory({read,readMigration:async name=>migrationSql(name),inspectSource:sourceRead,inspectRaw:raw,...(version===14?{machineContext:f.context}:{})},{target:f.target,selection:f.selection});
 f.originalTables=new Map();
 for(const row of f.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'facts_fts_%'").all())f.originalTables.set(row.name,clone(await read(`SELECT * FROM ${row.name}`)));
 f.original={installation:(f.originalTables.get('memory_installation')??[]),installationConfiguration:(f.originalTables.get('memory_installation_configuration')??[]),machineConfiguration:(f.originalTables.get('memory_machine_configuration')??[]),historyHash:f.inventory.history.historyHash,sourceVersion:version};
 f.authorization={targetHash:await legacyHash(f.target),managementAuthorityHash:hash('1'),closureAuthorityHash:hash('2'),retirementAuthorityHash:hash('3'),backupAuthorityHash:hash('4'),permissionHash:hash('5')};
 const pinEvidence=()=>inspectMachineDeployment(f.operator,f.target);
 const callbacks={read,readMigration:async name=>migrationSql(name),inspectSource:sourceRead,inspectRaw:raw,
  write:async statements=>{f.callbackCounts.write++;for(const [index,statement] of statements.entries()) {if(f.drop?.(statement,index))continue;if(statement.params.length)f.db.prepare(statement.sql).run(...statement.params);else f.db.exec(statement.sql);await f.afterStatement?.(statement,index);}if(f.loseWrite){f.loseWrite=false;throw new Error('Synthetic lost response');}},
  verifyManagement:async()=>clone(f.authorization),inspectDestination:async()=>{if(f.destinationUnavailable)throw new Error('synthetic unavailable');const p=f.db.prepare("SELECT name FROM sqlite_master WHERE name='memory_machine_principals'").get()?f.db.prepare('SELECT * FROM memory_machine_principals WHERE id=?').get(MACHINE):null;if(p&&(p.status!=='active'||p.grant_id!==GRANT||p.commitment!==f.destination.machineCommitment||p.scope!==f.destination.scope))throw new Error('synthetic changed destination');return clone(f.destination);},
  verifyBackup:async({retirements})=>{for(const [name,rows] of f.originalTables){if(name==='schema_migrations'||name==='memory_keys'||name==='memory_devices')continue;const originalColumns=rows[0]?Object.keys(rows[0]):[];if(!originalColumns.length)continue;const current=f.db.prepare(`SELECT ${originalColumns.join(',')} FROM ${name}`).all().map(row=>({...row}));if(['facts','sessions','tags','fact_tags'].includes(name)) {for(const row of rows)if(!current.some(other=>JSON.stringify(row)===JSON.stringify(other)))throw new Error('synthetic source drift');}else if(name==='memory_principals') {for(const row of rows)if(!current.some(other=>JSON.stringify(row)===JSON.stringify(other)))throw new Error('synthetic removed history drift');if(current.some(row=>!rows.some(old=>old.id===row.id)&&row.id!==f.destination.machineId))throw new Error('synthetic unrelated authority drift');}else if(JSON.stringify(current)!==JSON.stringify(rows))throw new Error('synthetic history drift');}return {backupHash:f.inventory.source.backupHash,resourceOwnershipHash:f.inventory.source.resourceOwnershipHash,historyHash:f.inventory.history.historyHash,schemaHash:f.inventory.schemaHash,universeHash:await legacyHash((await originalLegacyUniverse(f.trusted,f.inventory)).map(row=>({kind:row.kind,id:String(row.id),snapshotHash:row.snapshotHash}))),retirementsHash:await legacyHash(retirements),verified:true,original:clone(f.original)};},
  enumerate:async({kind})=>{const ids={accounts:[f.target.accountId],zones:[],workers:[...new Set(f.source.serving.map(row=>row.workerId))],versions:[...new Set(f.source.serving.map(row=>row.workerId+':'+row.versionId))],domains:[],routes:f.source.serving.map(row=>row.id),previews:[],bindings:[],credentials:f.source.credentials.map(row=>row.id),bucketOrigins:f.source.bucket?.publicOrigins??[]}[kind];return {items:ids.map(value=>({id:value})),nextPage:null,revisionHash:hash('9'),readbackHash:hash('b')};},
  resolveCredential:async({credentialId})=>({credentialId,private:true,secret:'synthetic-secret-never-public'}),
  closeServing:async({serving,attemptId,requestHash})=>{f.callbackCounts.closeServing++;f.closed.add(serving.id);f.mutations.set(await legacyHash({action:'close-serving',attemptId,requestHash,serving}),hash('a'));if(f.loseMutation)throw new Error('synthetic response lost');},
  disableBucket:async({bucket,attemptId,requestHash})=>{f.callbackCounts.disableBucket++;f.bucketClosed=true;f.mutations.set(await legacyHash({action:'disable-bucket',attemptId,requestHash,bucket}),hash('a'));},
  retireCredential:async({credential,attemptId,requestHash})=>{f.callbackCounts.retireCredential++;f.retired.add(credential.id);if(credential.kind==='memory-key')f.db.prepare('DELETE FROM memory_keys WHERE hash=?').run(credential.id);f.mutations.set(await legacyHash({action:'retire-credential',attemptId,requestHash,credential}),hash('a'));},
  inspectMutation:async({candidateHash})=>({candidateHash,targetHash:f.authorization.targetHash,outcome:f.ambiguous?'ambiguous':f.mutations.has(candidateHash)?'complete':'not-executed',receiptHash:f.mutations.get(candidateHash)??null,absenceEvidenceHash:f.mutations.has(candidateHash)||f.ambiguous?null:hash('b')}),
  readClosure:async()=>{const result=closureFor(f);result.observationId=crypto.randomUUID();for(const row of result.serving)row.legacyServing=!f.closed.has(row.id);for(const row of result.credentials)row.state=f.retired.has(row.id)?'retired':'active';result.bucket.publicAccessEnabled=!f.bucketClosed;return result;},
  probe:async({candidate:_candidate,revisionHash})=>{f.callbackCounts.probe++;return {status:f.allowProbe?200:403,redirected:false,memoryReturned:!!f.allowProbe,requestHash:hash('3'),responseHash:hash('4'),revisionHash};},
  inspectPins:async()=>(await pinEvidence()).pinHash,inspectDeployment:pinEvidence,verifySource:async()=>clone(f.reviewedSource),
  inspectSafety:async()=>({sourceHash:f.reviewedSource.digest,targetHash:f.authorization.targetHash,retirementAuthorityHash:f.authorization.retirementAuthorityHash,closed:f.closed.size===f.source.serving.length&&f.retired.size===f.source.credentials.length&&f.bucketClosed}),
  inspectCorrection:async({input})=>clone(input),inspectRawPolicy:async({input})=>clone(input)
 };
 f.callbacks=callbacks;f.trusted=trustedLegacyAdapter({target:f.target,authorization:f.authorization,callbacks,journal:{append:async frame=>{if(frame.predecessorHash!==(f.journal.at(-1)?.hash??null))throw new Error('Synthetic exclusive private journal conflict');f.journal.push(clone(frame));},read:async()=>clone(f.journal.at(-1)??null),find:async key=>clone(f.journal.find(row=>row.candidate.action===key||row.candidate.candidateHash===key)??null)}});
 f.review=await reviewLegacyMemory({inspectDestination:callbacks.inspectDestination},f.inventory,{decisionId:id('operator-decision'),inventoryHash:f.inventory.inventoryHash,ownership:f.ownership,destination:f.destination,mappings:f.inventory.selected.map(row=>({kind:row.kind,id:row.id,snapshotHash:row.snapshotHash,evidenceType:'operator-provenance',evidenceRef:'private-exact-operator-evidence',evidenceHash:hash('8')})),unmapped:'admin-only',closure:'pending'});
 f.reviewedSource={digest:hash('a'),revision:'b'.repeat(40)};
 const oldEvidence=await pinEvidence();
 f.setBinding(f.target.memoryWorkerName,'MEMORY_SCHEMA_VERSION',{type:'plain_text',text:'15'});
 const evidence=await pinEvidence(),predecessor=version===14?f.dataUpgrade.operationId:id('retained-source-history');
 f.input={attemptId:crypto.randomUUID(),pinHash:evidence.pinHash,predecessorId:predecessor,previousPinHash:oldEvidence.pinHash,source:f.reviewedSource,witness:version===14?null:{grantId:GRANT,machineCommitment:f.signing.commitment,capabilityHash:await digest(CAPABILITY),scope:f.scope,expiresAt:now()+550}};
 f.intent=await prepareLegacyCutover(f.trusted,f.inventory,f.review,f.input);f.context=trustedLegacyRuntimeContext(f.trusted,f.installation);
 f.enrollment=async({snapshot})=>({input:await signed(f,'enroll',{attemptId:crypto.randomUUID(),expected:snapshot,capability:CAPABILITY,payload:{grantId:GRANT,machineId:MACHINE,machineCommitment:f.signing.commitment,capabilityHash:await digest(CAPABILITY),scope:f.scope,credentialHash:await digest(TOKEN),credentialExpiresAt:now()+2591900,overlapUntil:now()+110}})});
 f.apply=()=>applyLegacyCutover(f.trusted,f.intent,{enrollment:f.enrollment});
 f.expected=async()=>(await readMachineDataStatus(f.context)).snapshot;f.runtimeExpected=async()=>(await readRuntimeState(f.context)).snapshot;
 const base=d1Fixture(f);f.statementBatches=[];f.batches=0;f.atomic=false;
 const db={prepare:sql=>({bind:(...params)=>({sql,params,all:async()=>{f.totalStatements++;await f.beforeRead?.(sql,params);const rows=await base.prepare(sql).bind(...params).all();await f.afterRead?.(sql,params);return rows;}})}),batch:async statements=>{f.totalStatements+=statements.length;return base.batch(statements);}};
 const worker=evidence.projection.workers.find(row=>row.name===f.target.memoryWorkerName);f.rawGets=0;
 const bucket={get:async key=>{f.rawGets++;const bytes=f.objects.get(key);return bytes?{body:new Response(bytes).body}:null;},put:async(key,body)=>{if(!f.objects.has(key))f.objects.set(key,Buffer.from(body));return {key};}};
 f.env={WONG_ENVIRONMENT:'production',MEMORY_SCHEMA_VERSION:'15',MEMORY_DB:db,MEMORY_BUCKET:bucket,MEMORY_INSTALLATION:JSON.stringify(f.installation),MEMORY_WORKER_NAME:f.target.memoryWorkerName,MEMORY_DATABASE_ID:f.target.databaseId,MEMORY_BUCKET_NAME:f.target.bucketName,CF_VERSION_METADATA:{id:worker.versionId}};
 f.request=(operation,input,{method='POST',token=TOKEN,headers={},path=null}={})=>new Request(f.installation.memoryOrigin+(path??`/_memory/v2/repositories/${f.installation.repositoryId}/machines/${MACHINE}/${operation}`),{method,headers:{Authorization:`Bearer ${token}`,...(method==='POST'?{'Content-Type':'application/json'}:{}),...headers},...(input?{body:JSON.stringify(input)}:{})});
 f.call=async(operation,input,options)=>{f.totalStatements=0;return handleMemory(f.request(operation,input,options),f.env);};
 f.captureInput=async(changes={})=>signedData(f,{attemptId:crypto.randomUUID(),expected:await f.expected(),payload:{machineId:MACHINE,repositoryId:f.installation.repositoryId,grantId:GRANT,machineCommitment:f.signing.commitment,machineRevision:1,grantRevision:2,credentialGeneration:1,credentialHash:await digest(TOKEN),visibility:'shared',source:'save',newTags:[],session:{id:'codex:modern-'+crypto.randomUUID(),agent:'codex',status:'captured',reason:null,previousCursor:null,nextCursor:'4',updatedAt:new Date().toISOString(),branch:'main',cwd:null,startedAt:null,endedAt:null},facts:[{slug:'business',type:'project',body:'A completed modern15 correction.',tags:[],supersedes:[]}],run:null,...changes}});
 return f;
}
export async function completedImportFixture(t,version=6,options={}) {const f=await importFixture(t,version,options);f.receipt=await f.apply();return f;}
export async function additionalImportMachine(f,{scope='memory:read',token='synthetic-other-bearer'.padEnd(48,'0')}={}) {
 const {issueRuntimeMachineGrant,enrollRuntimeMachine}=await import('../../../../.agents/skills/memory/scripts/lib/machine-runtime-operator.mjs');
 const signing=await signingKey(),machineId=crypto.randomUUID(),grantId=crypto.randomUUID(),capability='synthetic-extra-capability'.padEnd(48,'0');
 await issueRuntimeMachineGrant(f.context,{attemptId:crypto.randomUUID(),expected:await f.runtimeExpected(),payload:{grantId,machineCommitment:signing.commitment,capabilityHash:await digest(capability),scope,expiresAt:now()+550}});
 const input=await signed({...f,signing},'enroll',{attemptId:crypto.randomUUID(),expected:await f.runtimeExpected(),capability,payload:{grantId,machineId,machineCommitment:signing.commitment,capabilityHash:await digest(capability),scope,credentialHash:await digest(token),credentialExpiresAt:now()+2591900,overlapUntil:now()+110}});
 await enrollRuntimeMachine(f.context,input);return {signing,machineId,grantId,token,scope,path:`/_memory/v2/repositories/${f.installation.repositoryId}/machines/${machineId}/query`};
}
// Inspection of actual generated SQL, enforcing the provider's function argument bound.
export function sqlFunctionArguments(sql) {
 const frames=[],calls=[];let quote=null;
 for(let index=0;index<sql.length;index++) {
  const char=sql[index];if(quote){if(char===quote){if(sql[index+1]===quote)index++;else quote=null;}continue;}
  if(char==="'"||char==='"'||char==='`'){quote=char;continue;}
  if(char==='('){const name=/([A-Za-z_][A-Za-z0-9_]*)\s*$/.exec(sql.slice(0,index))?.[1]?.toLowerCase()??null;frames.push({name,commas:0,start:index});}
  else if(char===','){if(frames.length)frames.at(-1).commas++;}
  else if(char===')'){const frame=frames.pop();if(frame?.name&&/^(json_object|json_set|json_insert|json_group_array|json_extract|json_array_length|json_type|json_valid|json|coalesce|count|sum|max|min|unixepoch|cast)$/.test(frame.name))calls.push({name:frame.name,args:sql.slice(frame.start+1,index).trim()?frame.commas+1:0});}
 }
 return calls;
}
