import test from 'node:test';
import assert from 'node:assert/strict';
import { setupFixture,retainedStore } from './fixtures/memory/setup.mjs';
import { createOwnedMemoryDatabase,persistSetup } from '../../.agents/skills/memory/scripts/lib/machine-setup-state.mjs';
import { trustedMachineSetup,verifySetupPublication,removeSetupMachine,setupOperator,enrollAdditionalMachine } from '../../.agents/skills/memory/scripts/lib/machine-setup.mjs';
import { consumeMemoryResult } from '../../.agents/skills/memory/scripts/lib/memory-result.mjs';
const run=f=>trustedMachineSetup({operator:f.operator,store:f.store,target:f.target,access:f.access,publication:f.publication});

test('ordinary setup publishes pinned A/B, enrolls this machine, reuses exact receipts and explicitly revokes',async t=>{
 const f=await setupFixture(t),result=await run(f);assert.equal(result.status,'ready');
 assert.equal(consumeMemoryResult(result).status,'pending-setup');
 const state=await f.store.read();assert.equal(state.phase,'ready');assert.equal(state.capability,undefined);assert.equal(f.db.prepare('SELECT count(*) n FROM memory_machine_principals').get().n,1);
 const before=f.snapshot();assert.equal((await run(f)).status,'ready');assert.deepEqual(f.snapshot(),before);
 const other={...state.machine,machineId:'other-machine'.padEnd(32,'0')};await assert.rejects(removeSetupMachine({operator:f.operator,store:f.store,tuple:other}),e=>e.code==='machine-proof-denied');
 const removed=await removeSetupMachine({operator:f.operator,store:f.store,tuple:state.machine});assert.equal(removed.status,'blocked');assert.equal(removed.reason,'machine-revoked');
 await assert.rejects(run(f),e=>e.code==='machine-proof-denied');assert.equal(f.db.prepare('SELECT count(*) n FROM memory_machine_principals').get().n,1);
});
test('allowed operation denial never reports ready, including a retained enrollment',async t=>{
 const f=await setupFixture(t);f.denyRead=true;await assert.rejects(run(f),e=>e.code==='machine-proof-denied');
 assert.notEqual((await f.store.read()).phase,'ready');assert.equal(f.db.prepare('SELECT count(*) n FROM memory_machine_principals').get().n,1);
 f.denyRead=false;assert.equal((await run(f)).status,'ready');assert.equal(f.db.prepare('SELECT count(*) n FROM memory_machine_principals').get().n,1);
});
test('infrastructure success, wrong source, wrong binding and foreign owned receipt cannot admit a machine',async t=>{
 const f=await setupFixture(t),good=await f.observation();
 for(const bad of [{...good,proof:null},{...good,sourceHash:'provider-success'},{...good,workerVersions:{}},{...good,target:{...f.target,databaseId:'99999999-2222-3333-4444-555555555555'}}])await assert.rejects(verifySetupPublication(f.operator,f.target,bad,f.access));
 f.setBinding(f.target.memoryWorkerName,'CF_VERSION_METADATA',{type:'plain_text',text:'fake'});await assert.rejects(verifySetupPublication(f.operator,f.target,good,f.access),e=>e.code==='version-metadata-unverified');
 await f.store.write({target:{account:f.target.accountId},database:{method:'GET',id:f.target.databaseId}});await assert.rejects(run(f),e=>e.code==='memory-ownership-unproven');
 assert.equal(f.db.prepare("SELECT count(*) n FROM sqlite_master WHERE name='memory_machine_principals'").get().n,0);
});
test('original POST receipt is durable before publication; ambiguous lost responses cannot GET-adopt',async()=>{
 const account='a'.repeat(32),name='fixture-memory',id='11111111-2222-3333-4444-555555555555',store=retainedStore(),calls=[];let created=false;
 const cf=async(method,path)=>{calls.push({method,path,state:await store.read()});if(method==='GET')return created?[{uuid:id,name}]:[];created=true;return {uuid:id,name};};
 assert.equal(await createOwnedMemoryDatabase(cf,{account,name,store}),id);assert.equal(calls.find(c=>c.method==='POST').state.databaseIntent.method,'POST');assert.equal((await store.read()).database.method,'POST');
 assert.equal(await createOwnedMemoryDatabase(cf,{account,name,store}),id);assert.equal(calls.filter(c=>c.method==='POST').length,1);
 await assert.rejects(createOwnedMemoryDatabase(cf,{account,name:'foreign',store}),e=>e.code==='target-mismatch');
 const lost=retainedStore();await assert.rejects(createOwnedMemoryDatabase(async method=>{if(method==='GET')return [];throw new Error('lost response');},{account,name,store:lost}));
 await assert.rejects(createOwnedMemoryDatabase(cf,{account,name,store:lost}),e=>e.code==='memory-ownership-ambiguous');
 await assert.rejects(createOwnedMemoryDatabase(cf,{account,name,store:retainedStore()}),e=>e.code==='memory-ownership-unproven');
 await assert.rejects(persistSetup({write:async()=>{},read:async()=>null},{candidate:'synthetic'}),e=>e.code==='setup-journal-unconfirmed');
 assert.throws(()=>setupOperator(null));
});

import { randomUUID,randomBytes } from 'node:crypto';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { machineStateDirectory,readMachineState } from '../../.agents/skills/memory/scripts/lib/machine-client-state.mjs';
import { prepareClientKey,clientHash,runtimeSnapshot } from '../../.agents/skills/memory/scripts/lib/machine-client.mjs';
import { readMachineDataStatus } from '../../.agents/skills/memory/scripts/lib/machine-data-operator.mjs';
import { issueRuntimeMachineGrant } from '../../.agents/skills/memory/scripts/lib/machine-runtime-operator.mjs';

test('a second machine enrolls only its own generated private key and one-use grant; wrong commitment or grant is denied',async t=>{
 const f=await setupFixture(t);await run(f);
 const ctx={stateDir:join(machineStateDirectory(f.installation),'second-machine')};t.after(()=>rmSync(ctx.stateDir,{recursive:true,force:true}));
 const key=await prepareClientKey(ctx,f.installation),capability='private-fixture-one-use-'+randomUUID(),grantId=randomUUID(),before=(await readMachineDataStatus(f.context)).snapshot;
 await issueRuntimeMachineGrant(f.context,{attemptId:randomUUID(),expected:runtimeSnapshot(before),payload:{grantId,machineCommitment:key.machineCommitment,capabilityHash:await clientHash(capability),scope:'memory:read',expiresAt:Math.floor(Date.now()/1000)+500}});
 const snapshot=(await readMachineDataStatus(f.context)).snapshot,grant={installation:f.installation,machineCommitment:key.machineCommitment,grantId,capability,scope:'memory:read',expected:snapshot,dataSnapshot:snapshot};
 await assert.rejects(enrollAdditionalMachine({ctx,installation:f.installation,grant:{...grant,machineCommitment:'f'.repeat(64)}}),e=>e.code==='machine-proof-denied');
 await assert.rejects(enrollAdditionalMachine({ctx,installation:f.installation,grant:{...grant,grantId:randomUUID()}}));
 // The wrong retained grant is intentionally not adopted. A fresh private namespace uses the same key-bound grant only after its exact input is restored.
 const pending=readMachineState(ctx);assert.equal(pending.credential,undefined);
 rmSync(ctx.stateDir,{recursive:true,force:true});
 const fresh=await prepareClientKey(ctx,f.installation);assert.notEqual(fresh.machineCommitment,key.machineCommitment);
 await assert.rejects(enrollAdditionalMachine({ctx,installation:f.installation,grant}),e=>e.code==='machine-proof-denied');
 const goodCtx={stateDir:join(machineStateDirectory(f.installation),'third-machine')},goodKey=await prepareClientKey(goodCtx,f.installation),goodId=randomUUID(),goodCapability=randomBytes(32).toString('base64url');t.after(()=>rmSync(goodCtx.stateDir,{recursive:true,force:true}));
 await issueRuntimeMachineGrant(f.context,{attemptId:randomUUID(),expected:runtimeSnapshot((await readMachineDataStatus(f.context)).snapshot),payload:{grantId:goodId,machineCommitment:goodKey.machineCommitment,capabilityHash:await clientHash(goodCapability),scope:'memory:read',expiresAt:Math.floor(Date.now()/1000)+500}});
 const current=(await readMachineDataStatus(f.context)).snapshot;
 assert.equal((await enrollAdditionalMachine({ctx:goodCtx,installation:f.installation,grant:{installation:f.installation,machineCommitment:goodKey.machineCommitment,grantId:goodId,capability:goodCapability,scope:'memory:read',expected:current,dataSnapshot:current}})).status,'ready');
 assert.equal(f.db.prepare('SELECT count(*) n FROM memory_machine_principals').get().n,2);
});
test('durable bootstrap and grant receipt loss resumes exact attempts without a premature ready observation',async t=>{
 for(const phase of ['bootstrap','issue']){
  const f=await setupFixture(t),write=f.store.write;let lost=false;
  f.store.write=async state=>{await write(state);if(!lost&&state.steps?.[phase]?.receipt){lost=true;throw new Error('synthetic persisted receipt response loss');}};
  await assert.rejects(run(f),/response loss/);const retained=await f.store.read();assert.notEqual(retained.phase,'ready');const attempt=retained.steps[phase].input;
  assert.equal((await run(f)).status,'ready');assert.deepEqual((await f.store.read()).steps[phase].input,attempt);
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_machine_principals').get().n,1);
 }
});
test('lost config publication and enrollment responses recover the retained exact candidates before ready',async t=>{
 for(const phase of ['configure','enroll','query']){
  const f=await setupFixture(t);let lost=false;
  if(phase==='configure'){const configure=f.publication.configure;f.publication.configure=async(...args)=>{const result=await configure(...args);if(!lost){lost=true;throw new Error('synthetic configure loss');}return result;};}
  else {const transport=globalThis.fetch;globalThis.fetch=async(...args)=>{const response=await transport(...args);if(!lost&&String(args[0]).endsWith('/'+phase)&&response.ok){lost=true;throw new Error('synthetic transport loss');}return response;};}
  await assert.rejects(run(f));const retained=await f.store.read();assert.notEqual(retained.phase,'ready');
  const input=retained.steps.issue?.input;
  assert.equal((await run(f)).status,'ready');if(input)assert.deepEqual((await f.store.read()).steps.issue.input,input);
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_machine_principals').get().n,1);
 }
});
