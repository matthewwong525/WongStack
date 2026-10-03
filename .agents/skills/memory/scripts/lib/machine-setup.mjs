// Trusted ordinary setup orchestration. Provider transport is never machine admission.
import { randomUUID,randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { initializeMachineMemory,inspectMachinePins,sameMachineValue } from './machine-operator.mjs';
import { trustedMachineRuntimeContext,prepareMachineRuntime,readMachineRuntimeStatus,activateMachineRuntime,issueRuntimeMachineGrant,revokeRuntimeMachine } from './machine-runtime-operator.mjs';
import { trustedMachineDataContext,prepareMachineData,inspectMachineDeployment,readMachineDataStatus } from './machine-data-operator.mjs';
import { inspectResources,inspectProtection } from './installation-resources.mjs';
import { resourceTarget,requireValue,rows } from './installation-validation.mjs';
import { compiledCoreHashes } from '../../worker/machine-core-contract.mjs';
import { persistSetup } from './machine-setup-state.mjs';
import { machineStateDirectory } from './machine-client-state.mjs';
import { prepareClientKey,enrollClient,refreshMachine,clientHash,runtimeSnapshot } from './machine-client.mjs';
import { memoryResult,observeMachineMemory } from './memory-result.mjs';

export function setupOperator(cloudflare) {
 requireValue(typeof cloudflare==='function','operator-denied');
 return {cloudflare,readMigration:name=>{requireValue(/^\d{4}_[a-z_]+\.sql$/.test(name));return readFile(new URL('../../migrations/'+name,import.meta.url),'utf8');}};
}
export async function verifySetupPublication(operator,target,publication,access) {
 resourceTarget(target);const core=await compiledCoreHashes();
 requireValue(publication?.verified===true&&publication.proof&&['github-actions','trusted-private-adapter'].includes(publication.proof.kind)&&/^[a-f0-9]{64}$/.test(publication.sourceHash??'')&&/^[a-f0-9]{40,64}$/.test(publication.sourceRevision??'')
 &&publication.proof.sourceHash===publication.sourceHash&&publication.proof.sourceRevision===publication.sourceRevision&&publication.proof.receiptId&&sameMachineValue(publication.target,target)
 &&publication.protocolHash===core.protocolHash&&publication.routeContractHash===core.routeContractHash,'unreviewed-deployment');
 const resources=await inspectResources(operator,target);
 for(const worker of resources.workers) {
  requireValue(publication.workerVersions?.[worker.name]===worker.activeVersionId,'unreviewed-deployment');
  const settings=await operator.cloudflare('GET',`/accounts/${target.accountId}/workers/scripts/${worker.name}/settings`);
  for(const bindings of [worker.settings.bindings,settings.bindings])requireValue(Array.isArray(bindings)&&bindings.filter(b=>b.name==='CF_VERSION_METADATA').length===1&&bindings.find(b=>b.name==='CF_VERSION_METADATA').type==='version_metadata','version-metadata-unverified');
 }
 requireValue(await inspectProtection(operator,target,access,resources)===null,'access-unverified');return core;
}
async function exactStep(store,state,name,make,execute) {
 if(!state.steps[name]) {state.steps[name]={input:await make()};await persistSetup(store,state);}
 const candidate=state.steps[name],result=await execute(candidate.input);
 requireValue(result?.operation?.completed===true||['bootstrap','runtime','data'].includes(name),'machine-operation-incomplete');
 candidate.receipt=name==='bootstrap'?{installation:result.installation,snapshot:result.snapshot}:name==='runtime'||name==='data'?{snapshot:result.snapshot}:result.operation;
 await persistSetup(store,state);return result;
}
export async function trustedMachineSetup({operator,store,target,access,publication,scope='memory:read memory:write'}) {
 resourceTarget(target);requireValue(['memory:read','memory:read memory:write','memory:read memory:write memory:admin'].includes(scope));
 return store.lock(async()=>{
  let state=await store.read();
  requireValue(state?.database?.method==='POST'&&state.database.id===target.databaseId&&state.target?.account===target.accountId&&state.database.name===state.target.name&&state.database.path===`/accounts/${target.accountId}/d1/database`,'memory-ownership-unproven');
  requireValue(!state.memoryTarget||sameMachineValue(state.memoryTarget,target),'target-mismatch');
  requireValue(state.phase!=='removed','machine-proof-denied');
  state={...state,memoryTarget:target,steps:state.steps??{},phase:state.phase??'publication-a'};await persistSetup(store,state);
  if(state.installation&&state.phase==='ready') {
   const ctx={stateDir:machineStateDirectory(state.installation)};
   await refreshMachine(ctx,state.installation);
   return observeMachineMemory(ctx,state.installation);
  }
  if(!state.steps.bootstrap?.receipt) {
   const first=await publication.wait('a');await verifySetupPublication(operator,target,first,access);
   state={...await store.read(),steps:state.steps};
   requireValue(!state.publicationA||sameMachineValue(state.publicationA,first),'unreviewed-deployment');state.publicationA=first;await persistSetup(store,state);
   await exactStep(store,state,'bootstrap',async()=>({target,operationId:randomUUID(),expectedInstallation:null,pinHash:await inspectMachinePins(operator,target)}),input=>initializeMachineMemory(operator,input));
  }
  state.installation=state.steps.bootstrap.receipt.installation;await persistSetup(store,state);
  const runtime=await trustedMachineRuntimeContext(operator,state.installation);
  if(!state.steps.runtime?.receipt)await exactStep(store,state,'runtime',async()=>({operationId:randomUUID(),expected:state.steps.bootstrap.receipt.snapshot,pinHash:state.steps.bootstrap.input.pinHash}),input=>prepareMachineRuntime(runtime,input));
  if(!state.steps.activate?.receipt)await exactStep(store,state,'activate',async()=>({attemptId:randomUUID(),expected:(await readMachineRuntimeStatus(runtime)).snapshot,payload:await compiledCoreHashes()}),input=>activateMachineRuntime(runtime,input));
  let context=await trustedMachineDataContext(operator,state.installation);
  if(!state.steps.data?.receipt)await exactStep(store,state,'data',async()=>{const evidence=await inspectMachineDeployment(operator,target);return {operationId:randomUUID(),expected:(await readMachineRuntimeStatus(context)).snapshot,genesis:{pinHash:evidence.pinHash,targetJson:evidence.targetJson,evidence}};},input=>prepareMachineData(context,input));
  if(!state.publicationB) {
   state.phase='publication-b';await persistSetup(store,state);
   // The delivery adapter owns this config-only publication and its exact14 receipt.
   const receipt=await publication.configure(state.installation,state.steps.data.input);state={...await store.read(),publicationB:receipt};await persistSetup(store,state);
  }
  const second=await publication.wait('b');await verifySetupPublication(operator,target,second,access);
  state.publicationBProof=second;await persistSetup(store,state);
  requireValue(second.deploymentReceipt?.completed===true&&second.deploymentReceipt.action==='deployment','machine-operation-incomplete');
  context=await trustedMachineDataContext(operator,state.installation);
  const status=await readMachineDataStatus(context);requireValue(status.snapshot.deploymentHead===second.deploymentReceipt.attemptId,'unreviewed-deployment');
  const ctx={stateDir:machineStateDirectory(state.installation)};
  const key=await prepareClientKey(ctx,state.installation);
  if(!state.steps.issue?.receipt) {
   await exactStep(store,state,'issue',async()=>{
    const capability=randomBytes(32).toString('base64url');state.capability=capability;
    return {attemptId:randomUUID(),expected:runtimeSnapshot((await readMachineDataStatus(context)).snapshot),payload:{grantId:randomUUID(),machineCommitment:key.machineCommitment,capabilityHash:await clientHash(capability),scope,expiresAt:Math.floor(Date.now()/1000)+550}};
   },input=>issueRuntimeMachineGrant(context,input));
  }
  state.machine={installationId:state.installation.installationId,repositoryId:state.installation.repositoryId,machineId:key.machineId,grantId:state.steps.issue.input.payload.grantId,machineRevision:1,grantRevision:2};
  await persistSetup(store,state);
  const current=await readMachineDataStatus(context);
  await enrollClient(ctx,state.installation,{grantId:state.machine.grantId,capability:state.capability,scope,expected:current.snapshot,dataSnapshot:current.snapshot});
  const ready=await observeMachineMemory(ctx,state.installation);
  state.phase='ready';delete state.capability;await persistSetup(store,state);return ready;
 });
}
export async function enrollAdditionalMachine({ctx,installation,grant}) {
 resourceTarget(installation,true);const key=await prepareClientKey(ctx,installation);
 requireValue(grant?.machineCommitment===key.machineCommitment&&sameMachineValue(grant.installation,installation),'machine-proof-denied');
 await enrollClient(ctx,installation,grant);return observeMachineMemory(ctx,installation);
}
export async function removeSetupMachine({operator,store,tuple}) {
 return store.lock(async()=>{
  const state=await store.read();requireValue(state?.installation&&state.machine&&sameMachineValue(tuple,state.machine),'machine-proof-denied');
  const context=await trustedMachineDataContext(operator,state.installation);
  const result=await exactStep(store,state,'revoke',async()=>({attemptId:randomUUID(),expected:runtimeSnapshot((await readMachineDataStatus(context)).snapshot),payload:Object.fromEntries(['machineId','grantId','machineRevision','grantRevision'].map(k=>[k,tuple[k]]))}),input=>revokeRuntimeMachine(context,input));
  const gone=await rows(operator,resourceTarget(state.installation,true),'SELECT state FROM memory_machine_grants WHERE id=?',[tuple.grantId]);
  requireValue(gone.length===1&&gone[0].state==='revoked'&&result.operation.completed,'machine-operation-incomplete');state.phase='removed';await persistSetup(store,state);return memoryResult(state.installation,'blocked','machine-revoked');
 });
}

// Maintenance admission uses the explicitly supplied trusted context and retains the exact
// signed candidate privately. Public connectivity is proved only after final15 exposure.
import { readMachineState,writeMachineState,withMachineLock } from './machine-client-state.mjs';
import { signClient,clientRuntimeRequestHash,exactRuntimeReceipt,machineCall } from './machine-client.mjs';
import { enrollRuntimeMachine,validateRuntimeBearer } from './machine-runtime-operator.mjs';
import { readLegacyState } from './machine-legacy-state.mjs';
import { runtimeContext } from '../../worker/machine-context.mjs';
export async function prepareLegacySetupEnrollment({ctx,context,installation,destination,capability,snapshot}) {
 runtimeContext(context,true);resourceTarget(installation,true);
 requireValue(sameMachineValue(destination.installation,installation),'target-mismatch');
 return withMachineLock(ctx.stateDir,async()=>{
  let state=readMachineState(ctx);
  requireValue(state&&!state.quarantined&&sameMachineValue(state.installation,installation)&&state.machineId===destination.machineId&&state.commitment===destination.machineCommitment
   &&(!state.grantId||state.grantId===destination.grantId),'machine-proof-denied');
  state={...state,grantId:destination.grantId,scope:destination.scope,machineRevision:destination.machineRevision,grantRevision:destination.grantRevision,snapshot:runtimeSnapshot(snapshot),phase:'legacy-maintenance'};
  requireValue(!state.credential,'credential-candidate-conflict');
  if(!state.candidate) {
   const token=randomBytes(32).toString('base64url'),now=Math.floor(Date.now()/1000),hash=await clientHash(token);
   const payload={grantId:state.grantId,machineId:state.machineId,machineCommitment:state.commitment,capabilityHash:await clientHash(capability),scope:state.scope,credentialHash:hash,credentialExpiresAt:now+2591900,overlapUntil:now+110};
   const input=await signClient(state,'enroll',{attemptId:randomUUID(),expected:runtimeSnapshot(snapshot),payload,capability});
   state.candidate={token,hash,generation:1,expiresAt:payload.credentialExpiresAt,input,requestHash:await clientRuntimeRequestHash(state,'enroll',input)};writeMachineState(ctx,state);
  }
  const retained=state.candidate;
  return {input:retained.input,confirm:async result=>withMachineLock(ctx.stateDir,async()=>{
   const latest=readMachineState(ctx);requireValue(latest?.candidate&&sameMachineValue(latest.candidate,retained),'credential-candidate-conflict');
   exactRuntimeReceipt(result,'enroll',retained);
   await validateRuntimeBearer(context,{machineId:state.machineId,credentialHash:retained.hash});
   writeMachineState(ctx,{...latest,credential:{token:retained.token,hash:retained.hash,generation:1,expiresAt:retained.expiresAt},snapshot:result.snapshot,phase:'legacy-final-pending',candidate:null});
  })};
 });
}
export async function completeLegacyMachineSetup({ctx,context,installation,cutover}) {
 runtimeContext(context,true);const source=await readLegacyState(context);
 requireValue(source.configuration.state==='exposed'&&cutover?.operation?.completed===true&&cutover.operation.action==='legacy-cutover'
  &&cutover.operation.attemptId===source.attempt.id&&cutover.operation.requestHash===source.attempt.request_hash,'machine-operation-incomplete');
 await refreshMachine(ctx,installation);const state=readMachineState(ctx);
 requireValue(state?.credential&&!state.candidate&&!state.quarantined,'credential-unconfirmed');
 // This exact initiating machine must complete an allowed public query under final15.
 await machineCall(state,'query',{operation:'sessions',params:{ids:[]}});
 const ready=await observeMachineMemory(ctx,installation);
 requireValue(ready?.status==='ready','machine-operation-incomplete');
 await withMachineLock(ctx.stateDir,async()=>{const current=readMachineState(ctx);requireValue(current?.credential?.hash===state.credential.hash,'credential-unconfirmed');writeMachineState(ctx,{...current,phase:'ready'});});
 return ready;
}
