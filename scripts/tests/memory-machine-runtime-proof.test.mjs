import test from 'node:test';
import assert from 'node:assert/strict';
import { runtimeGrantFixture,enrolledRuntimeFixture,runtimeEnrollInput,renewalInput,revokeInput,
  signed,signingKey,attempt,MACHINE,GRANT,CAPABILITY,rejected,corruptRuntime,now } from './fixtures/memory/runtime.mjs';
import { enrollRuntimeMachine,renewRuntimeMachine,revokeRuntimeMachine,readMachineRuntimeStatus,
  readSignedMachineSnapshot,readSignedEnrollmentSnapshot,issueRuntimeMachineGrant } from '../../.agents/skills/memory/scripts/lib/machine-runtime-operator.mjs';
import { machineKeyCommitment,canonicalMachineKey,verifyMachineProof,runtimePath } from '../../.agents/skills/memory/worker/machine-proof.mjs';

test('enrollment requires the raw one-use capability and a real persistent P-256 signing proof',async t=>{
  const f=await runtimeGrantFixture(t),valid=await runtimeEnrollInput(f),before=f.snapshot(),writes=f.batches;
  for(const bad of [{...valid,capability:valid.payload.capabilityHash},{...valid,capability:'wrong-capability'.padEnd(48,'0')},
    {...valid,proof:{...valid.proof,signature:'a'.repeat(86)}},{...valid,proof:{...valid.proof,publicKey:await signingKey().then(k=>k.publicKey)}},
    {...valid,proof:valid.proof.publicKey},{...valid,serviceJWT:'synthetic-service-jwt'},
    {...valid,payload:{...valid.payload,cloudRole:'owner'}},{...valid,proof:{...valid.proof,deadline:now()-1}}]) {
    await assert.rejects(enrollRuntimeMachine(f.public,bad));assert.deepEqual(f.snapshot(),before);assert.equal(f.batches,writes);
  }
  const result=await enrollRuntimeMachine(f.public,valid);assert.equal(result.operation.completed,true);
  await assert.rejects(readMachineRuntimeStatus(f.public),rejected('machine-context-denied'));
});
test('key commitments require canonical public-only coordinates; no alias padding/private/unknown fields',async()=>{
  const key=await signingKey();assert.equal(await machineKeyCommitment({...key.publicKey}),key.commitment);
  for(const changes of [{d:'private'},{alg:'ES256'},{key_ops:['verify']},{ext:true},{kty:'RSA'},{crv:'P-384'},
    {x:key.publicKey.x+'='},{x:'a'.repeat(42)+'B'},{y:'A'.repeat(42)+'D'}])assert.throws(()=>canonicalMachineKey({...key.publicKey,...changes}));
});
for(const frame of [{method:'GET'},{method:'post'},{purpose:'renew'},{purpose:'self-status'},
  {origin:'https://foreign.example'},{path:'/_memory/v2/unknown'},
  {installationId:attempt('foreign-install')},{repositoryId:attempt('foreign-repository')},
  {machineId:attempt('foreign-machine')},{grantId:attempt('foreign-grant')},{attemptId:attempt('foreign-attempt')},
  {payloadHash:'a'.repeat(64)},{expectedHash:'a'.repeat(64)},{targetHash:'a'.repeat(64)}])
  test(`signed enrollment frame rejects foreign binding ${JSON.stringify(frame)}`,async t=>{
    const f=await runtimeGrantFixture(t),input=await runtimeEnrollInput(f);
    const wrong=await signed(f,'enroll',input,{frame});const before=f.snapshot(),writes=f.batches;
    await assert.rejects(enrollRuntimeMachine(f.public,wrong),rejected('machine-proof-denied'));
    assert.deepEqual(f.snapshot(),before);assert.equal(f.batches,writes);
  });
test('expired/future/long proof windows and stale signed claims never reserve authority',async t=>{
  const f=await runtimeGrantFixture(t),input=await runtimeEnrollInput(f),before=f.snapshot(),writes=f.batches;
  for(const changes of [{issuedAt:now()+20,deadline:now()+90},{issuedAt:now()-121,deadline:now()+1},
    {deadline:now()-1},{deadline:now()+121},{nonce:'short'},{signature:'invalid'}])
    await assert.rejects(enrollRuntimeMachine(f.public,{...input,proof:{...input.proof,...changes}}));
  const stale=await signed(f,'enroll',{...input,expected:{...input.expected,runtimeRevision:input.expected.runtimeRevision-1}});
  await assert.rejects(enrollRuntimeMachine(f.public,stale),rejected('machine-authority-stale'));
  assert.deepEqual(f.snapshot(),before);assert.equal(f.batches,writes);
});
test('nonce replay/mixed purpose/wrong key cannot renew, including service/raw-key substitutes',async t=>{
  const f=await enrolledRuntimeFixture(t),request=await renewalInput(f);
  const reused=await signed(f,'renew',request,{nonce:f.enroll.proof.nonce});
  await assert.rejects(renewRuntimeMachine(f.public,reused),rejected('machine-proof-denied'));
  const mixed=await signed(f,'self-status',request);await assert.rejects(renewRuntimeMachine(f.public,mixed),rejected('machine-proof-denied'));
  const other={...f,signing:await signingKey()};await assert.rejects(renewRuntimeMachine(f.public,await signed(other,'renew',request)),rejected('machine-proof-denied'));
  await assert.rejects(renewRuntimeMachine(f.public,{...request,proof:{...request.proof,publicKey:{...request.proof.publicKey,d:'secret'}}}));
  const forged={...f.installation,repositoryId:attempt('foreign-repository')};
  await assert.rejects(verifyMachineProof({installation:forged,purpose:'renew',attemptId:request.attemptId,expected:request.expected,payload:request.payload},request.proof),rejected('machine-proof-denied'));
  assert.equal(runtimePath(f.installation.repositoryId,MACHINE,'renew').includes('%'),false);
});
test('pending capability snapshot refresh is signed/read-only, expires on consumption/revocation and cannot mutate',async t=>{
  const f=await runtimeGrantFixture(t),saved=await f.expected();
  const request=await signed(f,'enrollment-status',{attemptId:attempt('pending-status'),expected:saved,
    payload:{machineId:MACHINE,grantId:GRANT,machineCommitment:f.signing.commitment,capabilityHash:f.issue.payload.capabilityHash},capability:CAPABILITY});
  await issueRuntimeMachineGrant(f.context,{...f.issue,attemptId:attempt('other-issue'),expected:await f.expected(),payload:{...f.issue.payload,grantId:attempt('other-grant'),capabilityHash:'9'.repeat(64)}});
  const before=f.snapshot(),writes=f.batches,refreshed=await readSignedEnrollmentSnapshot(f.public,request);
  assert.notEqual(refreshed.snapshot.runtimeRevision,saved.runtimeRevision);assert.equal(f.batches,writes);assert.deepEqual(f.snapshot(),before);
  assert.deepEqual(await readSignedEnrollmentSnapshot(f.public,request),refreshed);
  await assert.rejects(readSignedEnrollmentSnapshot(f.public,{...request,capability:request.payload.capabilityHash}));
  await assert.rejects(readSignedEnrollmentSnapshot(f.public,await signed(f,'enroll',request)));
  await enrollRuntimeMachine(f.public,await runtimeEnrollInput(f));await assert.rejects(readSignedEnrollmentSnapshot(f.public,request),rejected('machine-proof-denied'));
});
test('fresh self-status after expired/lost response and newer unrelated operation discovers only own completed candidate',async t=>{
  const f=await enrolledRuntimeFixture(t),request=await renewalInput(f);f.loseResponse=true;await renewRuntimeMachine(f.public,request);
  await issueRuntimeMachineGrant(f.context,{...f.issue,attemptId:attempt('other-issue'),expected:await f.expected(),payload:{...f.issue.payload,grantId:attempt('other-grant'),capabilityHash:'9'.repeat(64)}});
  t.mock.timers.enable({apis:['Date'],now:Date.now()+125000});
  await assert.rejects(renewRuntimeMachine(f.public,request),rejected('machine-proof-denied'));
  const status=await signed(f,'self-status',{attemptId:attempt('self-status'),expected:request.expected,payload:{machineId:MACHINE,grantId:GRANT,machineCommitment:f.signing.commitment}});
  const before=f.snapshot(),writes=f.batches,result=await readSignedMachineSnapshot(f.public,status);
  assert.equal(result.credential.hash,request.payload.credentialHash);assert.equal(result.credential.generation,2);assert.equal(result.credential.attemptId,request.attemptId);
  assert.deepEqual(await readSignedMachineSnapshot(f.public,status),result);assert.deepEqual(f.snapshot(),before);assert.equal(f.batches,writes);
  for(const frame of [{purpose:'renew'},{method:'GET'},{path:'/_memory/v2/foreign'},{origin:'https://foreign.example'},{machineId:attempt('foreign-machine')}])
    await assert.rejects(readSignedMachineSnapshot(f.public,await signed(f,'self-status',status,{frame})),rejected('machine-proof-denied'));
  await assert.rejects(readSignedMachineSnapshot(f.public,{...status,serviceJWT:'synthetic'}));
  await revokeRuntimeMachine(f.context,await revokeInput(f));await assert.rejects(readSignedMachineSnapshot(f.public,status),rejected('machine-proof-denied'));
});
test('foreign or expired stored grant and changed active commitment refuse raw proof without writes',async t=>{
  for(const mutate of [f=>corruptRuntime(f,'memory_machine_grants','UPDATE memory_machine_grants SET created_at=unixepoch()-601,expires_at=unixepoch()-1'),
    f=>corruptRuntime(f,'memory_machine_grants',"UPDATE memory_machine_grants SET commitment=?",['0'.repeat(64)]),
    f=>corruptRuntime(f,'memory_machine_grants',"UPDATE memory_machine_grants SET state='revoked',revision=revision+1")]) {
    const f=await runtimeGrantFixture(t),request=await runtimeEnrollInput(f);mutate(f);const before=f.snapshot(),writes=f.batches;
    await assert.rejects(enrollRuntimeMachine(f.public,request),rejected('machine-proof-denied'));assert.deepEqual(f.snapshot(),before);assert.equal(f.batches,writes);
  }
});
