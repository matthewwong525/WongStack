// Fresh actual full-core fixture: activation13 BEFORE grants, then schema14.
import { runtimeFixture,d1Fixture,signed,now,attempt,MACHINE,GRANT,CAPABILITY,TOKEN } from './runtime.mjs';
import { compiledCoreHashes } from '../../../../.agents/skills/memory/worker/machine-core-contract.mjs';
import { activateMachineRuntime,issueRuntimeMachineGrant,enrollRuntimeMachine,readMachineRuntimeStatus } from '../../../../.agents/skills/memory/scripts/lib/machine-runtime-operator.mjs';
import { trustedMachineDataContext,inspectMachineDeployment,prepareMachineData,readMachineDataStatus } from '../../../../.agents/skills/memory/scripts/lib/machine-data-operator.mjs';
import { handleMemory } from '../../../../.agents/skills/memory/worker/memory-worker.mjs';
import { digest } from '../../../../.agents/skills/memory/scripts/lib/installation-validation.mjs';
import { signedData } from './data.mjs';
export { MACHINE,GRANT,TOKEN,CAPABILITY,signed,signedData,attempt,now };
export async function coreFixture(t,options={}) {
 const f=await runtimeFixture(t,{...options,activate:false});
 await activateMachineRuntime(f.context,{attemptId:attempt('full-core-activation'),expected:await f.expected(),payload:await compiledCoreHashes()});
 f.context=await trustedMachineDataContext(f.operator,f.installation);const evidence=await inspectMachineDeployment(f.operator,f.target);
 f.dataUpgrade={operationId:attempt('full-core-data-bootstrap'),expected:(await readMachineRuntimeStatus(f.context)).snapshot,genesis:{pinHash:evidence.pinHash,targetJson:evidence.targetJson,evidence}};
 await prepareMachineData(f.context,f.dataUpgrade);
 f.runtimeExpected=async()=>(await readMachineRuntimeStatus(f.context)).snapshot;f.expected=async()=>(await readMachineDataStatus(f.context)).snapshot;f.originalDataExpected=f.expected;
 f.issue={attemptId:attempt('full-core-issue'),expected:await f.runtimeExpected(),payload:{grantId:GRANT,machineCommitment:f.signing.commitment,capabilityHash:await digest(CAPABILITY),scope:f.scope,expiresAt:now()+550}};
 await issueRuntimeMachineGrant(f.context,f.issue);
 f.enroll=await signed(f,'enroll',{attemptId:attempt('full-core-enroll'),expected:await f.runtimeExpected(),capability:CAPABILITY,payload:{grantId:GRANT,machineId:MACHINE,machineCommitment:f.signing.commitment,capabilityHash:await digest(CAPABILITY),scope:f.scope,credentialHash:await digest(TOKEN),credentialExpiresAt:now()+2591900,overlapUntil:now()+110}});
 if(options.enrolled!==false)await enrollRuntimeMachine(f.public,f.enroll);
 const base=d1Fixture(f);f.readCount=0;f.totalStatements=0;f.beforeRead=null;f.afterRead=null;
 const db={prepare:sql=>({bind:(...params)=>({sql,params,all:async()=>{f.readCount++;f.totalStatements++;await f.beforeRead?.(sql,params);const rows=await base.prepare(sql).bind(...params).all();await f.afterRead?.(sql,params);return rows;}})}),batch:async statements=>{f.totalStatements+=statements.length;return base.batch(statements);}};
 f.objects=new Map();const bucket={get:async key=>{const bytes=f.objects.get(key);return bytes?{body:new Response(bytes).body}:null;},put:async(key,body)=>{if(!f.objects.has(key))f.objects.set(key,Buffer.from(body));return {key};}};
 const worker=evidence.projection.workers.find(w=>w.name===f.target.memoryWorkerName);
 f.env={WONG_ENVIRONMENT:'production',MEMORY_DB:db,MEMORY_BUCKET:options.bucket===false?undefined:bucket,MEMORY_INSTALLATION:JSON.stringify(f.installation),MEMORY_WORKER_NAME:f.target.memoryWorkerName,MEMORY_DATABASE_ID:f.target.databaseId,MEMORY_BUCKET_NAME:f.target.bucketName,CF_VERSION_METADATA:{id:worker.versionId}};
 f.request=(operation,input,{method='POST',token=TOKEN,headers={},origin=f.installation.memoryOrigin,path=null}={})=>new Request(origin+(path||`/_memory/v2/repositories/${f.installation.repositoryId}/machines/${MACHINE}/${operation}`),{method,headers:{Authorization:`Bearer ${token}`,...(method==='POST'?{'Content-Type':'application/json'}:{}),...headers},...(input?{body:JSON.stringify(input)}:{})});
 f.call=async(operation,input,options)=>{f.totalStatements=0;return handleMemory(f.request(operation,input,options),f.env);};
 f.captureInput=async(changes={})=>signedData(f,{attemptId:crypto.randomUUID(),expected:await f.expected(),payload:{machineId:MACHINE,repositoryId:f.installation.repositoryId,grantId:GRANT,machineCommitment:f.signing.commitment,machineRevision:1,grantRevision:2,credentialGeneration:1,credentialHash:await digest(TOKEN),visibility:'shared',source:'save',newTags:[],session:{id:'codex:core-session',agent:'codex',status:'captured',reason:null,previousCursor:null,nextCursor:'4',updatedAt:new Date().toISOString(),branch:'main',cwd:null,startedAt:null,endedAt:null},facts:[{slug:'business',type:'project',body:'The team checks every preview route.',tags:[],supersedes:[]}],run:null,...changes}});
 return f;
}
