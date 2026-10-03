import test from 'node:test';
import assert from 'node:assert/strict';
import { dataFixture,captureInput,receiptInput,signedData,attempt,MACHINE,now,corruptRuntime } from './fixtures/memory/data.mjs';
import { captureMachineData,readSignedMachineDataStatus,readMachineDataStatus } from '../../.agents/skills/memory/scripts/lib/machine-data-operator.mjs';
import { renewRuntimeMachine,revokeRuntimeMachine,validateRuntimeBearer,readSignedMachineSnapshot } from '../../.agents/skills/memory/scripts/lib/machine-runtime-operator.mjs';
import { renewalInput,revokeInput,signed } from './fixtures/memory/runtime.mjs';
const closed=e=>['machine-operation-incomplete','machine-capture-quarantined','machine-proof-denied','machine-authority-stale'].includes(e.code);

test('capture produces exact ordinal IDs, owned session cursor, run tallies and durable retry',async t=>{
 const f=await dataFixture(t),input=await captureInput(f),result=await captureMachineData(f.public,input);
 assert.equal(result.operation.completed,true);const outcome=result.operation.outcome;
 assert.deepEqual(outcome.facts,[{ordinal:0,factId:f.db.prepare('SELECT id FROM facts').get().id}]);
 assert.equal(f.db.prepare('SELECT owner_principal_id FROM facts').get().owner_principal_id,MACHINE);
 assert.deepEqual(outcome.session,{id:input.payload.session.id,previousCursor:null,nextCursor:'message1'});
 assert.deepEqual(outcome.run.counts,input.payload.run.counts);
 const before=f.snapshot();const again=await captureMachineData(f.public,input);
 assert.deepEqual(again.operation.outcome,outcome);assert.deepEqual(f.snapshot(),before);
 const changed=await signedData(f,{...input,payload:{...input.payload,facts:[{...input.payload.facts[0],body:'Changed.'}]}});
 await assert.rejects(captureMachineData(f.public,changed),e=>e.code==='machine-attempt-conflict');
});
test('mixed user/feedback and shared work facts derive privacy while tags and supersedes link exact IDs',async t=>{
 const f=await dataFixture(t);f.db.exec("INSERT INTO tags(name,definition,created_at) VALUES('fixture-tag','Synthetic tag','fixture')");
 const first=await captureMachineData(f.public,await captureInput(f));
 const facts=[{slug:'personal',type:'user',body:'Private preference.',tags:[],supersedes:[]},{slug:'feedback',type:'feedback',body:'Private feedback.',tags:[],supersedes:[]},{slug:'work',type:'project',body:'Updated work.',tags:['fixture-tag'],supersedes:[first.operation.outcome.facts[0].factId]}];
 const input=await captureInput(f,{visibility:'shared',facts,session:{id:'codex:fixture-data-session',agent:'codex',status:'captured',reason:null,previousCursor:'message1',nextCursor:'message2',updatedAt:'2026-10-03T00:02:00Z',branch:null,cwd:null,startedAt:null,endedAt:null},run:{startedAt:'2026-10-03T00:02:00Z',finishedAt:'2026-10-03T00:03:00Z',counts:{added:3,superseded:1,captured:1}}});
 input.attemptId=attempt('capture-next');const next=await signedData(f,input);const result=await captureMachineData(f.public,next);
 assert.deepEqual(f.db.prepare('SELECT shared FROM facts WHERE capture_attempt_id=? ORDER BY capture_ordinal').all(next.attemptId).map(r=>r.shared),[0,0,1]);
 assert.equal(result.operation.outcome.supersedes[0].newFactId,result.operation.outcome.facts[2].factId);
 assert.equal(f.db.prepare('SELECT fact_id FROM fact_tags').get().fact_id,result.operation.outcome.facts[2].factId);
});
for(const kind of ['session-only','run-only'])test(`legitimate ${kind} capture has exact empty fact outcome`,async t=>{
 const f=await dataFixture(t),changes={facts:[],run:kind==='session-only'?null:{startedAt:'fixture',finishedAt:'fixture',counts:{added:0,superseded:0,captured:0}}};
 if(kind==='run-only')changes.session=null;
 const result=await captureMachineData(f.public,await captureInput(f,changes));assert.deepEqual(result.operation.outcome.facts,[]);
 assert.equal(result.operation.outcome.session===null,kind==='run-only');
});
test('reader private capture succeeds and shared override refuses',async t=>{
 const f=await dataFixture(t,{scope:'memory:read'});
 await assert.rejects(captureMachineData(f.public,await captureInput(f,{visibility:'shared'})),closed);
 assert.equal((await captureMachineData(f.public,await captureInput(f))).operation.completed,true);
});
for(const field of ['credentialHash','credentialGeneration','machineRevision','grantRevision','repositoryId'])test(`capture rejects stale or forged ${field}`,async t=>{
 const f=await dataFixture(t),changes={[field]:field==='repositoryId'?'forged-repository'.padEnd(32,'0'):field==='credentialHash'?'0'.repeat(64):99};
 const before=f.snapshot();await assert.rejects(captureMachineData(f.public,await captureInput(f,changes)),closed);assert.deepEqual(f.snapshot(),before);
});
test('a stale session compare or foreign supersede produces no saved outcome',async t=>{
 const f=await dataFixture(t),first=await captureMachineData(f.public,await captureInput(f));
 const input=await captureInput(f,{session:{id:'codex:fixture-data-session',agent:'codex',status:'captured',reason:null,previousCursor:'wrong',nextCursor:'next',updatedAt:'fixture',branch:null,cwd:null,startedAt:null,endedAt:null}});
 input.attemptId=attempt('bad-cursor');await assert.rejects(captureMachineData(f.public,await signedData(f,input)),closed);
 assert.equal(f.db.prepare('SELECT count(*) n FROM memory_data_completions').get().n,1);
 assert.equal(f.db.prepare('SELECT read_through FROM sessions').get().read_through,first.operation.outcome.session.nextCursor);
});
for(const omit of ['INSERT INTO sessions','UPDATE sessions','INSERT INTO facts','INSERT INTO memory_data_fact_links','INSERT INTO runs','INSERT INTO memory_data_runs','INSERT INTO memory_data_outcomes','INSERT INTO memory_data_audit','INSERT INTO memory_data_completions'])test(`zero-row ${omit} cannot report saved`,async t=>{
 const f=await dataFixture(t),input=await captureInput(f);
 if(omit==='UPDATE sessions') {
  await captureMachineData(f.public,input);input.attemptId=attempt('zero-update');input.expected=await f.expected();input.payload.session.previousCursor='message1';input.payload.session.nextCursor='message2';input.proof=(await signedData(f,input)).proof;
 }
 f.beforeStatement=async(_i,s)=>{if(s.sql.startsWith(omit)){s.sql='SELECT 1';s.params=[];}};
 await assert.rejects(captureMachineData(f.public,input),closed);
 assert.equal(f.db.prepare('SELECT count(*) n FROM memory_data_completions WHERE attempt_id=?').get(input.attemptId).n,0);
});
for(const failAt of [0,1,2,3,4,5,6,7])test(`nontransactional capture fail at statement ${failAt} remains closed`,async t=>{
 const f=await dataFixture(t);f.atomic=false;f.failAt=failAt;const input=await captureInput(f);
 await assert.rejects(captureMachineData(f.public,input),closed);
 assert.equal(f.db.prepare('SELECT count(*) n FROM memory_data_completions').get().n,0);
 f.failAt=null;if(failAt===0)assert.equal((await captureMachineData(f.public,input)).operation.completed,true);else await assert.rejects(captureMachineData(f.public,input),closed);
});
test('partial capture prevents old13 reads, renewal and revocation; bare public bypass refuses',async t=>{
 const f=await dataFixture(t),input=await captureInput(f),renew=await renewalInput({...f,expected:f.runtimeExpected}),revoke=await revokeInput({...f,expected:f.runtimeExpected});
 const status=await signed(f,'self-status',{attemptId:attempt('old-self-status'),expected:renew.expected,payload:{machineId:MACHINE,grantId:input.payload.grantId,machineCommitment:f.signing.commitment}});
 f.atomic=false;f.failAt=2;await assert.rejects(captureMachineData(f.public,input),closed);f.failAt=null;
 await assert.rejects(validateRuntimeBearer(f.public,{machineId:MACHINE,credentialHash:input.payload.credentialHash}),closed);
 await assert.rejects(readSignedMachineSnapshot(f.public,status),closed);
 await assert.rejects(renewRuntimeMachine(f.public,renew),closed);await assert.rejects(revokeRuntimeMachine(f.context,revoke),closed);
 assert.equal((await readMachineDataStatus(f.context)).memory.status,'blocked');
});
test('capture during incomplete13 renewal is blocked and data status reports blocked',async t=>{
 const f=await dataFixture(t),renew=await renewalInput({...f,expected:f.runtimeExpected}),input=await captureInput(f);f.atomic=false;f.failAt=2;
 await assert.rejects(renewRuntimeMachine(f.public,renew),closed);f.failAt=null;
 await assert.rejects(captureMachineData(f.public,input),closed);assert.equal((await readMachineDataStatus(f.context)).memory.status,'blocked');
});
test('completed lost-response capture recovers exact receipt without writes',async t=>{
 const f=await dataFixture(t);let batches=0;
 f.afterStatement=async(_i,s)=>{if(s.sql.startsWith('INSERT INTO memory_data_completions'))f.loseResponse=true;};
 const input=await captureInput(f),result=await captureMachineData(f.public,input);batches=f.batches;
 assert.equal((await captureMachineData(f.public,input)).operation.requestHash,result.operation.requestHash);assert.equal(f.batches,batches);
});
test('concurrent attempts leave at most one write and exact retry recovers winner',async t=>{
 const f=await dataFixture(t),input=await captureInput(f);
 const results=await Promise.allSettled([captureMachineData(f.public,input),captureMachineData(f.public,input)]);
 assert.ok(results.some(r=>r.status==='fulfilled'));assert.equal(f.db.prepare('SELECT count(*) n FROM facts').get().n,1);
 assert.equal((await captureMachineData(f.public,input)).operation.completed,true);
});
test('signed own receipt survives rotation, expired old proof and stale expected without reviving bearer',async t=>{
 const f=await dataFixture(t),input=await captureInput(f),result=await captureMachineData(f.public,input);
 const renewal=await renewalInput({...f,expected:f.runtimeExpected});await renewRuntimeMachine(f.public,renewal);
 const status=await receiptInput(f,result);status.expected=input.expected;const fresh=await signedData(f,status,'capture-status');
 const before=f.snapshot();assert.deepEqual((await readSignedMachineDataStatus(f.public,fresh)).operation.outcome,result.operation.outcome);assert.deepEqual(f.snapshot(),before);
 await assert.rejects(captureMachineData(f.public,input),closed);
 const expired=await signedData(f,status,'capture-status',{issuedAt:now()-200,deadline:now()-100});await assert.rejects(readSignedMachineDataStatus(f.public,expired),closed);
});
test('capture status denies wrong purpose, machine, grant, hash and revoked authority',async t=>{
 const f=await dataFixture(t),result=await captureMachineData(f.public,await captureInput(f)),input=await receiptInput(f,result);
 await assert.rejects(readSignedMachineDataStatus(f.public,await signedData(f,input,'capture')),closed);
 for(const field of ['machineId','grantId','requestHash']){
  const payload={...input.payload,[field]:field==='requestHash'?'0'.repeat(64):attempt('wrong-'+field)};
  await assert.rejects(readSignedMachineDataStatus(f.public,await signedData(f,{...input,payload},'capture-status')),closed);
 }
 await revokeRuntimeMachine(f.context,await revokeInput({...f,expected:f.runtimeExpected}));await assert.rejects(readSignedMachineDataStatus(f.public,input),closed);
});
test('revoked pending capture is quarantined and never resumes partial writes',async t=>{
 const f=await dataFixture(t),input=await captureInput(f);f.atomic=false;f.failAt=2;await assert.rejects(captureMachineData(f.public,input),closed);f.failAt=null;
 corruptRuntime(f,'memory_machine_principals',"UPDATE memory_machine_principals SET status='revoked',revision=revision+1 WHERE id=?",[MACHINE]);
 const before=f.snapshot();await assert.rejects(captureMachineData(f.public,input),closed);assert.deepEqual(f.snapshot(),before);
});
test('finite new tag definitions, aliases, source and session metadata are exact outcomes',async t=>{
 const f=await dataFixture(t),input=await captureInput(f,{source:'backfill',newTags:[{name:'primary',definition:'Fixture definition.',aliasOf:null},{name:'alias',definition:'Fixture alias.',aliasOf:'primary'}],
 facts:[{slug:'work',type:'project',body:'Backfilled note.',tags:['alias'],supersedes:[]}],session:{id:'codex:metadata',agent:'codex',status:'captured',reason:null,previousCursor:null,nextCursor:'cursor',updatedAt:'fixture',branch:'feature',cwd:'/synthetic',startedAt:'start',endedAt:'end'}});
 const result=await captureMachineData(f.public,input);
 assert.deepEqual(result.operation.outcome.tags,input.payload.newTags);
 assert.equal(f.db.prepare('SELECT source FROM facts').get().source,'backfill');
 assert.deepEqual({...f.db.prepare('SELECT branch,cwd,started_at,ended_at FROM sessions').get()},{branch:'feature',cwd:'/synthetic',started_at:'start',ended_at:'end'});
 const migration=await captureInput(f,{source:'migration'});await assert.rejects(captureMachineData(f.public,migration));
});
test('private excluded session rejects extracted facts and accepts zero-fact cursor',async t=>{
 const f=await dataFixture(t),input=await captureInput(f);input.payload.session.status='private';
 await assert.rejects(captureMachineData(f.public,await signedData(f,input)));
 input.payload.facts=[];input.payload.run.counts.added=0;
 assert.deepEqual((await captureMachineData(f.public,await signedData(f,input))).operation.outcome.facts,[]);
});
for(const admin of [false,true])test(`${admin?'data admin':'member'} correcting another captured owner keeps ownership intact`,async t=>{
 const f=await dataFixture(t,{scope:admin?'memory:read memory:write memory:admin':'memory:read memory:write'});
 const {enrollOtherRuntimeMachine}=await import('./fixtures/memory/runtime.mjs');
 const other=await enrollOtherRuntimeMachine({...f,scope:'memory:read memory:write',expected:f.runtimeExpected});
 const base=await captureInput(f,{machineId:other.machineId,grantId:other.grantId,machineCommitment:other.signing.commitment,credentialHash:other.credentialHash,
 session:{id:'codex:other-session',agent:'codex',status:'captured',reason:null,previousCursor:null,nextCursor:'other-cursor',updatedAt:'fixture',branch:null,cwd:null,startedAt:null,endedAt:null}});
 base.attemptId=attempt('other-capture');const saved=await captureMachineData(f.public,await signedData({...f,signing:other.signing},base));
 const oldId=saved.operation.outcome.facts[0].factId;
 const correction=await captureInput(f,{facts:[{slug:'correction',type:'project',body:'Correction from actor.',tags:[],supersedes:[oldId]}],run:{startedAt:'fixture',finishedAt:'fixture',counts:{added:1,superseded:1,captured:1}}});
 if(admin){const result=await captureMachineData(f.public,correction);assert.equal(f.db.prepare('SELECT superseded_by FROM facts WHERE id=?').get(oldId).superseded_by,result.operation.outcome.facts[0].factId);}
 else{const before=f.snapshot();await assert.rejects(captureMachineData(f.public,correction),closed);assert.deepEqual(f.snapshot(),before);}
 assert.equal(f.db.prepare('SELECT owner_principal_id FROM facts WHERE id=?').get(oldId).owner_principal_id,other.machineId);
});
test('bounded capture rejects excess planned statements before any barrier or writes',async t=>{
 const f=await dataFixture(t),facts=Array.from({length:100},(_,i)=>({slug:`fact-${i}`,type:'project',body:'Synthetic bounded fact.',tags:[],supersedes:[]}));
 const input=await captureInput(f,{facts,run:null}),before=f.snapshot(),batches=f.batches;
 await assert.rejects(captureMachineData(f.public,input),e=>e.code==='capture-payload-too-large');assert.deepEqual(f.snapshot(),before);assert.equal(f.batches,batches);
});
for(const omit of ['INSERT INTO tags','INSERT INTO memory_data_tag_definitions','INSERT INTO fact_tags','INSERT INTO memory_data_tag_links','UPDATE facts SET superseded_by','INSERT INTO memory_data_supersedes'])test(`zero-row ${omit} cannot fabricate linked outcomes`,async t=>{
 const f=await dataFixture(t),first=await captureMachineData(f.public,await captureInput(f));
 const input=await captureInput(f,{newTags:[{name:'next-tag',definition:'Synthetic new definition.',aliasOf:null}],facts:[{slug:'next',type:'project',body:'Exact replacement.',tags:['next-tag'],supersedes:[first.operation.outcome.facts[0].factId]}],
 session:{id:'codex:fixture-data-session',agent:'codex',status:'captured',reason:null,previousCursor:'message1',nextCursor:'message2',updatedAt:'fixture',branch:null,cwd:null,startedAt:null,endedAt:null},
 run:{startedAt:'fixture',finishedAt:'fixture',counts:{added:1,superseded:1,captured:1}}});
 input.attemptId=attempt('linked-zero');input.proof=(await signedData(f,input)).proof;
 f.atomic=false;f.beforeStatement=async(_i,s)=>{if(s.sql.startsWith(omit)){s.sql='SELECT 1';s.params=[];}};
 await assert.rejects(captureMachineData(f.public,input),closed);
 assert.equal(f.db.prepare('SELECT count(*) n FROM memory_data_completions').get().n,1);
});
test('completed receipt remains readable after bearer expiry and an unrelated completed capture',async t=>{
 const f=await dataFixture(t),input=await captureInput(f),first=await captureMachineData(f.public,input);
 const unrelated=await captureInput(f,{session:{id:'codex:unrelated',agent:'codex',status:'captured',reason:null,previousCursor:null,nextCursor:'other',updatedAt:'fixture',branch:null,cwd:null,startedAt:null,endedAt:null}});
 unrelated.attemptId=attempt('unrelated-capture');await captureMachineData(f.public,await signedData(f,unrelated));
 t.mock.timers.enable({apis:['Date'],now:Date.now()});t.mock.timers.tick(2592000000);
 const status=await receiptInput(f,first);status.expected=input.expected;
 const result=await readSignedMachineDataStatus(f.public,await signedData(f,status,'capture-status'));
 assert.deepEqual(result.operation.outcome,first.operation.outcome);assert.equal(result.access,'receipt-only');
 const freshCapture=await captureInput(f,{session:null,facts:[],run:{startedAt:'fixture',finishedAt:'fixture',counts:{added:0,superseded:0,captured:0}}});
 freshCapture.attemptId=attempt('expired-new-capture');await assert.rejects(captureMachineData(f.public,await signedData(f,freshCapture)),closed);
});
test('independently rotated pending capture is quarantined without resuming writes',async t=>{
 const f=await dataFixture(t),input=await captureInput(f);f.atomic=false;f.failAt=2;await assert.rejects(captureMachineData(f.public,input),closed);f.failAt=null;
 corruptRuntime(f,'memory_runtime_rotations','UPDATE memory_runtime_rotations SET generation=2 WHERE machine_id=?',[MACHINE]);
 const before=f.snapshot();await assert.rejects(captureMachineData(f.public,input),closed);assert.deepEqual(f.snapshot(),before);
});
test('distinct concurrent capture IDs cannot both advance one reviewed session cursor',async t=>{
 const f=await dataFixture(t),one=await captureInput(f),two=await signedData(f,{...one,attemptId:attempt('other-capture-racer')});
 const outcomes=await Promise.allSettled([captureMachineData(f.public,one),captureMachineData(f.public,two)]);
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(f.db.prepare('SELECT count(*) n FROM facts').get().n,1);
});
test('fresh same-grant status proves genuine absence without writes or readiness',async t=>{
 const f=await dataFixture(t),target={operation:{attemptId:attempt('never-written-attempt'),requestHash:'a'.repeat(64)}};
 const input=await receiptInput(f,target),before=f.snapshot(),batches=f.batches;
 const result=await readSignedMachineDataStatus(f.public,input);
 assert.equal(result.operation.absent,true);assert.equal(result.operation.completed,false);assert.equal(result.memory.status,'pending-setup');
 assert.deepEqual(f.snapshot(),before);assert.equal(f.batches,batches);
 await revokeRuntimeMachine(f.context,await revokeInput({...f,expected:f.runtimeExpected}));
 await assert.rejects(readSignedMachineDataStatus(f.public,input),closed);
});
test('status never reports existing wrong-hash, foreign-machine or partial attempt as absent',async t=>{
 const f=await dataFixture(t),input=await captureInput(f),saved=await captureMachineData(f.public,input);
 const wrong=await receiptInput(f,saved,{requestHash:'0'.repeat(64)});await assert.rejects(readSignedMachineDataStatus(f.public,wrong),closed);
 const {enrollOtherRuntimeMachine}=await import('./fixtures/memory/runtime.mjs');const other=await enrollOtherRuntimeMachine({...f,expected:f.runtimeExpected});
 const foreign=await receiptInput(f,saved,{machineId:other.machineId,grantId:other.grantId,machineCommitment:other.signing.commitment});
 await assert.rejects(readSignedMachineDataStatus(f.public,await signedData({...f,signing:other.signing},foreign,'capture-status')),closed);
 const next=await captureInput(f,{session:{id:'codex:partial-status',agent:'codex',status:'captured',reason:null,previousCursor:null,nextCursor:'partial',updatedAt:'fixture',branch:null,cwd:null,startedAt:null,endedAt:null}});
 next.attemptId=attempt('partial-status-target');next.proof=(await signedData(f,next)).proof;f.atomic=false;f.failAt=2;await assert.rejects(captureMachineData(f.public,next),closed);f.failAt=null;
 const pending=f.db.prepare('SELECT request_hash FROM memory_data_attempts WHERE id=?').get(next.attemptId);
 const status=await receiptInput(f,{operation:{attemptId:next.attemptId,requestHash:pending.request_hash}});
 await assert.rejects(readSignedMachineDataStatus(f.public,status),closed);
});
