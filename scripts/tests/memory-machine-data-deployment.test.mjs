import test from 'node:test';
import assert from 'node:assert/strict';
import { dataFixture,deployFixtureVersion,successorInput,attempt,captureInput } from './fixtures/memory/data.mjs';
import { recordMachineDeployment,readMachineDataStatus,captureMachineData,inspectPendingMachineDeployment } from '../../.agents/skills/memory/scripts/lib/machine-data-operator.mjs';
import { readRuntimeState } from '../../.agents/skills/memory/scripts/lib/machine-runtime-state.mjs';
import { runtimeContext } from '../../.agents/skills/memory/worker/machine-context.mjs';
import { readMachineRuntimeStatus,renewRuntimeMachine } from '../../.agents/skills/memory/scripts/lib/machine-runtime-operator.mjs';
import { renewalInput } from './fixtures/memory/runtime.mjs';
const denied=e=>['target-mismatch','unreviewed-deployment','machine-operation-incomplete','machine-attempt-conflict','machine-authority-stale'].includes(e.code);

test('pending deployment inspection is trusted and read-only even after an unacknowledged actual version',async t=>{
 const f=await dataFixture(t),evidence=await deployFixtureVersion(f),before=f.snapshot();
 const result=await inspectPendingMachineDeployment(f.context);assert.equal(result.evidence.pinHash,evidence.pinHash);assert.equal(result.head.pinHash,f.dataUpgrade.genesis.pinHash);assert.deepEqual(f.snapshot(),before);
 await assert.rejects(inspectPendingMachineDeployment(f.public),e=>e.code==='machine-context-denied');assert.deepEqual(f.snapshot(),before);
});

test('unreviewed actual version blocks reads; exact reviewed successor accepts without old version current',async t=>{
 const f=await dataFixture(t),oldMachine=f.db.prepare('SELECT * FROM memory_machine_configuration').get(),oldRuntime=f.db.prepare('SELECT * FROM memory_runtime_configuration').get();
 const evidence=await deployFixtureVersion(f),input=await successorInput(f,evidence);
 await assert.rejects(readRuntimeState(f.context),denied);await assert.rejects(readMachineDataStatus(f.context),denied);
 assert.equal((await readRuntimeState(f.public)).data.head.pinHash,f.dataUpgrade.genesis.pinHash); // D1 alone cannot observe provider versions.
 const result=await recordMachineDeployment(f.context,input);assert.equal(result.operation.completed,true);
 assert.equal((await readRuntimeState(f.public)).data.head.pinHash,evidence.pinHash);
 assert.deepEqual(f.db.prepare('SELECT * FROM memory_machine_configuration').get(),oldMachine);
 assert.deepEqual(f.db.prepare('SELECT * FROM memory_runtime_configuration').get(),oldRuntime);
 const before=f.snapshot();await recordMachineDeployment(f.context,input);assert.deepEqual(f.snapshot(),before);
 const renewal=await renewalInput({...f,expected:async()=>(await readMachineRuntimeStatus(f.context)).snapshot});
 await renewRuntimeMachine(f.public,renewal);
 assert.equal((await captureMachineData(f.public,await captureInput(f))).operation.completed,true);
});
test('successor rollback is another retained reviewed link and cannot reset pins or revocations',async t=>{
 const f=await dataFixture(t),original=f.dataUpgrade.genesis.evidence;
 await recordMachineDeployment(f.context,await successorInput(f,await deployFixtureVersion(f)));
 const rollback=await successorInput(f,await deployFixtureVersion(f,original.projection.workers[0].versionId),{rollback:true});rollback.attemptId=attempt('rollback14');
 await recordMachineDeployment(f.context,rollback);
 assert.equal(f.db.prepare('SELECT count(*) n FROM memory_data_deployments').get().n,2);
 assert.equal((await readRuntimeState(f.public)).data.head.pinHash,original.pinHash);
 assert.throws(()=>f.db.exec('DELETE FROM memory_data_deployments'),/retained/);
 assert.throws(()=>f.db.exec("UPDATE memory_data_deployments SET pin_hash='forged'"),/immutable/);
});
for(const field of ['predecessorId','previousPinHash','reviewHash','protocolHash','routeContractHash','pinHash'])test(`successor rejects unreviewed ${field}`,async t=>{
 const f=await dataFixture(t),input=await successorInput(f,await deployFixtureVersion(f));
 input.payload[field]=field==='predecessorId'?attempt('unknown-head'):'0'.repeat(64);
 const before=f.snapshot();await assert.rejects(recordMachineDeployment(f.context,input),denied);assert.deepEqual(f.snapshot(),before);
});
test('successor rejects changed Worker identity and public context cannot record or inspect maintenance',async t=>{
 const f=await dataFixture(t),evidence=await deployFixtureVersion(f);
 f.workers.get(f.target.memoryWorkerName).info.id='9'.repeat(32);
 const input=await successorInput(f,evidence);await assert.rejects(recordMachineDeployment(f.context,input),denied);
 await assert.rejects(recordMachineDeployment(f.public,input),e=>e.code==='machine-context-denied');
 await assert.rejects(readRuntimeState(f.public,{inspectDeployment:false}),e=>e.code==='machine-context-denied');
 await assert.rejects(readRuntimeState(f.public,{inspectDataMaintenance:true}),e=>e.code==='machine-context-denied');
 assert.throws(()=>runtimeContext({kind:'trusted-machine-operator'},true),e=>e.code==='machine-context-denied');
});
for(const phase of ['deployment','outcome','audit','completion'])test(`partial nontransactional ${phase} successor stays closed and is never repinned`,async t=>{
 const f=await dataFixture(t),input=await successorInput(f,await deployFixtureVersion(f));f.atomic=false;
 const prefix={deployment:'INSERT INTO memory_data_deployments',outcome:'INSERT INTO memory_data_outcomes',audit:'INSERT INTO memory_data_audit',completion:'INSERT INTO memory_data_completions'}[phase];
 f.beforeStatement=async(_i,s)=>{if(s.sql.startsWith(prefix))throw new Error('Synthetic partial successor');};
 await assert.rejects(recordMachineDeployment(f.context,input),denied);f.beforeStatement=null;
 assert.equal(f.db.prepare('SELECT count(*) n FROM memory_data_completions').get().n,0);
 await assert.rejects(readRuntimeState(f.public),denied);await assert.rejects(recordMachineDeployment(f.context,input),denied);
 assert.equal(f.db.prepare('SELECT pin_hash FROM memory_runtime_configuration').get().pin_hash,f.input.pinHash);
});
test('successful successor with lost completion response recovers one exact receipt',async t=>{
 const f=await dataFixture(t),input=await successorInput(f,await deployFixtureVersion(f));
 f.afterStatement=async(_i,s)=>{if(s.sql.startsWith('INSERT INTO memory_data_completions'))f.loseResponse=true;};
 const result=await recordMachineDeployment(f.context,input),before=f.snapshot();
 assert.equal((await recordMachineDeployment(f.context,input)).operation.requestHash,result.operation.requestHash);assert.deepEqual(f.snapshot(),before);
});
test('competing successors cannot create a fork or silently continue winner partial batch',async t=>{
 const f=await dataFixture(t),input=await successorInput(f,await deployFixtureVersion(f)),other={...input,attemptId:attempt('competing-deployment')};
 const outcomes=await Promise.allSettled([recordMachineDeployment(f.context,input),recordMachineDeployment(f.context,other)]);
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(f.db.prepare('SELECT count(*) n FROM memory_data_deployments').get().n,1);
 assert.equal(f.db.prepare('SELECT count(*) n FROM memory_data_completions').get().n,1);
});
test('fabricated outcome cannot complete a skipped deployment row',async t=>{
 const f=await dataFixture(t),input=await successorInput(f,await deployFixtureVersion(f));f.atomic=false;
 f.beforeStatement=async(_i,s)=>{if(s.sql.startsWith('INSERT INTO memory_data_deployments')){s.sql='SELECT 1';s.params=[];}};
 await assert.rejects(recordMachineDeployment(f.context,input),denied);
 assert.equal(f.db.prepare('SELECT count(*) n FROM memory_data_outcomes').get().n,0);
 assert.equal(f.db.prepare('SELECT count(*) n FROM memory_data_completions').get().n,0);
});
