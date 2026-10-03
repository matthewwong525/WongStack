import test from 'node:test';
import assert from 'node:assert/strict';
import { enrolledRuntimeFixture,runtimeFixture,renewalInput,revokeInput,transcriptInput,corruptRuntime,signed,
  attempt,MACHINE,GRANT,rejected,now } from './fixtures/memory/runtime.mjs';
import { renewRuntimeMachine,revokeRuntimeMachine,validateRuntimeBearer,stageRuntimeTranscript,publishRuntimeTranscript,
  readRuntimeTranscriptOwner,readSignedMachineSnapshot,readMachineRuntimeStatus } from '../../.agents/skills/memory/scripts/lib/machine-runtime-operator.mjs';

test('fresh private signing proof renews after bearer expiry under the same consumed grant without human approval',async t=>{
  const f=await enrolledRuntimeFixture(t);
  corruptRuntime(f,'memory_runtime_rotations','UPDATE memory_runtime_rotations SET issued_at=unixepoch()-1000,overlap_until=unixepoch()-1000,expires_at=unixepoch()-1');
  await assert.rejects(validateRuntimeBearer(f.public,{machineId:MACHINE,credentialHash:f.enroll.payload.credentialHash}),rejected('machine-proof-denied'));
  const request=await renewalInput(f),result=await renewRuntimeMachine(f.public,request);
  assert.equal(result.operation.completed,true);assert.equal(result.memory.status,'pending-setup');
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_runtime_rotations').get().n,2);
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_machine_principals').get().n,1);
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_memberships').get().n,0);
  assert.equal((await validateRuntimeBearer(f.public,{machineId:MACHINE,credentialHash:request.payload.credentialHash})).machineId,MACHINE);
});
test('a genuine already-consumed12 signing commitment establishes its first13 key/generation without reenrollment',async t=>{
  const f=await runtimeFixture(t,{completed12Machine:true});
  const before=f.db.prepare('SELECT * FROM memory_machine_grants').all();
  const request=await renewalInput(f);await renewRuntimeMachine(f.public,request);
  assert.deepEqual(f.db.prepare('SELECT * FROM memory_machine_grants').all(),before);
  assert.equal(f.db.prepare('SELECT machine_id FROM memory_runtime_keys').get().machine_id,MACHINE);
  assert.equal(f.db.prepare('SELECT generation FROM memory_runtime_rotations').get().generation,1);
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_machine_credentials').get().n,1);
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_machine_principals').get().n,1);
  const invalid=await runtimeFixture(t,{completed12Machine:true});
  corruptRuntime(invalid,'memory_machine_principals','UPDATE memory_machine_principals SET commitment=?',['c'.repeat(64)]);
  await assert.rejects(renewRuntimeMachine(invalid.public,await renewalInput(invalid)),rejected('machine-proof-denied'));
  const removed=await runtimeFixture(t,{completed12Machine:true});await revokeRuntimeMachine(removed.context,await revokeInput(removed));
  await assert.rejects(renewRuntimeMachine(removed.public,await renewalInput(removed)),rejected('machine-proof-denied'));
});
test('a continuing nontransactional batch with a zero-row first-key write cannot publish first renewal',async t=>{
  const f=await runtimeFixture(t,{completed12Machine:true}),input=await renewalInput(f);f.atomic=false;
  const before=f.db.prepare('SELECT count(*) n FROM memory_runtime_completions').get().n;
  f.beforeStatement=async(index,statement)=>{if(statement.sql.includes('INSERT INTO memory_runtime_keys(')){statement.sql='SELECT 1';statement.params=[];}};
  await assert.rejects(renewRuntimeMachine(f.public,input),rejected('machine-operation-incomplete'));
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_runtime_keys').get().n,0);
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_runtime_completions').get().n,before);
  assert.equal((await readMachineRuntimeStatus(f.context)).memory.status,'blocked');
  f.beforeStatement=null;const partial=f.snapshot(),writes=f.batches;await assert.rejects(renewRuntimeMachine(f.public,input),rejected('machine-operation-incomplete'));
  assert.deepEqual(f.snapshot(),partial);assert.equal(f.batches,writes);
});
test('renewal keeps append-only hashes and bounds immediate previous generation overlap without scope widening',async t=>{
  const f=await enrolledRuntimeFixture(t),old=f.enroll.payload.credentialHash;
  const request=await renewalInput(f);await renewRuntimeMachine(f.public,request);
  assert.equal((await validateRuntimeBearer(f.public,{machineId:MACHINE,credentialHash:old})).machineId,MACHINE);
  assert.equal((await validateRuntimeBearer(f.public,{machineId:MACHINE,credentialHash:request.payload.credentialHash})).machineId,MACHINE);
  assert.throws(()=>f.db.exec("UPDATE memory_runtime_rotations SET hash='bad'"),/immutable/);
  assert.throws(()=>f.db.exec('DELETE FROM memory_runtime_rotations'),/retained/);
  corruptRuntime(f,'memory_runtime_rotations','UPDATE memory_runtime_rotations SET overlap_until=issued_at WHERE generation=2');
  await assert.rejects(validateRuntimeBearer(f.public,{machineId:MACHINE,credentialHash:old}),rejected('machine-proof-denied'));
  const next=await renewalInput(f,{credentialHash:'8'.repeat(64)});next.attemptId=attempt('renew-next');
  const signedNext=await signed(f,'renew',next);await renewRuntimeMachine(f.public,signedNext);
  await assert.rejects(validateRuntimeBearer(f.public,{machineId:MACHINE,credentialHash:old}),rejected('machine-proof-denied'));
  const badChanges=[{scope:'memory:read memory:write memory:admin'},{scope:'memory:read'},{generation:9},
    {previousHash:'9'.repeat(64)},{overlapUntil:now()+121},{credentialExpiresAt:now()+2592001},
    {grantRevision:3},{machineRevision:2},{credentialHash:old}];
  for(const [index,changes]of badChanges.entries()) {
    let input=await renewalInput(f,changes);input={...input,attemptId:attempt('bad-renew-'+index)};
    await assert.rejects(renewRuntimeMachine(f.public,await signed(f,'renew',input)),rejected('machine-proof-denied'));
  }
});
for(const atomic of [true,false])test(`renewal interruption at every authority/proof/key boundary atomic=${atomic}`,async t=>{
  const probe=await enrolledRuntimeFixture(t);await renewRuntimeMachine(probe.public,await renewalInput(probe));
  const count=probe.statementBatches.at(-1).length;
  for(let failAt=0;failAt<count;failAt++) {
    const f=await enrolledRuntimeFixture(t),input=await renewalInput(f),before=f.snapshot();f.atomic=atomic;f.failAt=failAt;
    await assert.rejects(renewRuntimeMachine(f.public,input));
    if(atomic||failAt===0)assert.deepEqual(f.snapshot(),before);
    else {const partial=f.snapshot(),writes=f.batches;f.failAt=null;await assert.rejects(renewRuntimeMachine(f.public,input),rejected('machine-operation-incomplete'));
      assert.deepEqual(f.snapshot(),partial);assert.equal(f.batches,writes);
      await assert.rejects(validateRuntimeBearer(f.public,{machineId:MACHINE,credentialHash:f.enroll.payload.credentialHash}),rejected('machine-proof-denied'));}
  }
});
test('valid competing renewals use one exact generation; no loser continues an identical partial attempt',async t=>{
  const f=await enrolledRuntimeFixture(t),one=await renewalInput(f);
  const two=await signed(f,'renew',{...one,attemptId:attempt('renew-competing'),payload:{...one.payload,credentialHash:'8'.repeat(64)}});
  const race=await Promise.allSettled([renewRuntimeMachine(f.public,one),renewRuntimeMachine(f.public,two)]);
  assert.equal(race.filter(row=>row.status==='fulfilled').length,1);
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_runtime_rotations WHERE generation=2').get().n,1);
  const g=await enrolledRuntimeFixture(t),partial=await renewalInput(g);g.atomic=false;g.failAt=2;
  await assert.rejects(renewRuntimeMachine(g.public,partial));g.failAt=null;const before=g.snapshot(),writes=g.batches;
  const blocked=await readMachineRuntimeStatus(g.context);assert.equal(blocked.memory.status,'blocked');assert.equal(blocked.memory.reason,'incomplete-machine-operation');
  const retries=await Promise.allSettled([renewRuntimeMachine(g.public,partial),renewRuntimeMachine(g.public,partial)]);
  assert.equal(retries.every(row=>row.status==='rejected'&&row.reason.code==='machine-operation-incomplete'),true);
  assert.deepEqual(g.snapshot(),before);assert.equal(g.batches,writes);
});
test('lost renewal response cannot recover removed authority; every credential generation stops immediately',async t=>{
  const f=await enrolledRuntimeFixture(t),input=await renewalInput(f);f.loseResponse=true;await renewRuntimeMachine(f.public,input);
  f.loseResponse=true;const revocation=await revokeRuntimeMachine(f.context,await revokeInput(f));assert.equal(revocation.operation.completed,true);
  const before=f.snapshot(),writes=f.batches;
  await assert.rejects(renewRuntimeMachine(f.public,input),rejected('machine-operation-incomplete'));
  const fresh=await renewalInput(f);
  const freshRevoked=await signed(f,'renew',{...fresh,attemptId:attempt('fresh-revoked-renew')});
  await assert.rejects(renewRuntimeMachine(f.public,freshRevoked),rejected('machine-proof-denied'));
  for(const credentialHash of [f.enroll.payload.credentialHash,input.payload.credentialHash])await assert.rejects(validateRuntimeBearer(f.public,{machineId:MACHINE,credentialHash}),rejected('machine-proof-denied'));
  assert.deepEqual(f.snapshot(),before);assert.equal(f.batches,writes);
});
test('own generation rotation and revocation quarantine staged capture while completed raw privacy survives proof expiry',async t=>{
  const f=await enrolledRuntimeFixture(t);await stageRuntimeTranscript(f.public,await transcriptInput(f));
  await renewRuntimeMachine(f.public,await renewalInput(f));
  await assert.rejects(publishRuntimeTranscript(f.public,await transcriptInput(f,'publish')),rejected('machine-proof-denied'));
  const removed=await enrolledRuntimeFixture(t);await stageRuntimeTranscript(removed.public,await transcriptInput(removed));
  await revokeRuntimeMachine(removed.context,await revokeInput(removed));await assert.rejects(publishRuntimeTranscript(removed.public,await transcriptInput(removed,'publish')),rejected('machine-proof-denied'));
  const g=await enrolledRuntimeFixture(t);await stageRuntimeTranscript(g.public,await transcriptInput(g));await publishRuntimeTranscript(g.public,await transcriptInput(g,'publish'));
  t.mock.timers.enable({apis:['Date'],now:Date.now()+125000});
  assert.equal((await readRuntimeTranscriptOwner(g.public,{machineId:MACHINE,grantId:GRANT,credentialHash:g.enroll.payload.credentialHash,objectHash:'c'.repeat(64)})).machineId,MACHINE);
  const status=await signed(g,'self-status',{attemptId:attempt('self13'),expected:g.enroll.expected,payload:{machineId:MACHINE,grantId:GRANT,machineCommitment:g.signing.commitment}});
  assert.equal((await readSignedMachineSnapshot(g.public,status)).credential.generation,1);
});
test('authority/revision/pin changes between each renewal statement prevent later receipt and response recovery',async t=>{
  const probe=await enrolledRuntimeFixture(t);await renewRuntimeMachine(probe.public,await renewalInput(probe));const count=probe.statementBatches.at(-1).length;
  for(let boundary=0;boundary<count-1;boundary++) {
    const f=await enrolledRuntimeFixture(t),input=await renewalInput(f);f.atomic=false;
    f.afterStatement=async index=>{if(index===boundary)corruptRuntime(f,'memory_machine_configuration','UPDATE memory_machine_configuration SET auth_revision=auth_revision+1');};
    await assert.rejects(renewRuntimeMachine(f.public,input),rejected('machine-operation-incomplete'));
    f.afterStatement=null;const before=f.snapshot(),writes=f.batches;await assert.rejects(renewRuntimeMachine(f.public,input),rejected('machine-operation-incomplete'));
    assert.deepEqual(f.snapshot(),before);assert.equal(f.batches,writes);
  }
});
