import test from 'node:test';
import assert from 'node:assert/strict';
import { runtimeFixture,runtimeGrantFixture,enrolledRuntimeFixture,runtimeEnrollInput,transcriptInput,revokeInput,
  attempt,MACHINE,GRANT,rejected,corruptRuntime,enrollOtherRuntimeMachine,d1Fixture,signed } from './fixtures/memory/runtime.mjs';
import { handleMemory } from '../../.agents/skills/memory/worker/memory-worker.mjs';
import { preparedMachineFixture,machineFixture,machineInput } from './fixtures/memory/machines.mjs';
import { applyMigrations } from './fixtures/memory/identity.mjs';
import { trustedMachineRuntimeContext,prepareMachineRuntime,prepareFreshMachineRuntime,readMachineRuntimeStatus,
  activateMachineRuntime,issueRuntimeMachineGrant,enrollRuntimeMachine,revokeRuntimeMachine,stageRuntimeTranscript,
  publishRuntimeTranscript,readRuntimeTranscriptOwner,validateRuntimeBearer } from '../../.agents/skills/memory/scripts/lib/machine-runtime-operator.mjs';
import { planMachineRuntime } from '../../.agents/skills/memory/scripts/lib/machine-runtime-planners.mjs';
import { readRuntimeState } from '../../.agents/skills/memory/scripts/lib/machine-runtime-state.mjs';

test('fresh trusted12 then13 remains pending and no source primitive announces ready',async t=>{
  const f=machineFixture(t),bootstrap=await machineInput(f);
  const result=await prepareFreshMachineRuntime(f.operator,{bootstrap,operationId:attempt('fresh13')});
  assert.equal(result.schemaVersion,13);assert.equal(result.memory.status,'pending-setup');
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_runtime_activations').get().n,0);
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_machine_grants').get().n,0);
  assert.deepEqual(await prepareFreshMachineRuntime(f.operator,{bootstrap,operationId:attempt('fresh13')}),result);
});
test('completed12 exact13 retries use original baseline and refuse receipt/table/trigger/future corruption unchanged',async t=>{
  const f=await runtimeFixture(t,{activate:false}),batches=f.batches;
  const first=await prepareMachineRuntime(f.context,f.upgrade);
  assert.deepEqual(await prepareMachineRuntime(f.context,f.upgrade),first);assert.equal(f.batches,batches);
  await assert.rejects(prepareMachineRuntime(f.context,{...f.upgrade,operationId:attempt('foreign')}));
  for(const mutate of [g=>g.db.exec("INSERT INTO schema_migrations VALUES(999,'fixture')"),
    g=>g.db.exec('DROP TRIGGER memory_runtime_attempt_guard'),g=>g.db.exec('DROP VIEW memory_runtime_outcomes'),
    g=>g.db.exec('CREATE TABLE foreign_table(id TEXT)'),g=>corruptRuntime(g,'memory_machine_manifest_receipts','UPDATE memory_machine_manifest_receipts SET manifest_hash=?',['0'.repeat(64)]),
    g=>corruptRuntime(g,'memory_machine_audit',"UPDATE memory_machine_audit SET target_id='wrong' WHERE action='bootstrap'"),
    g=>corruptRuntime(g,'memory_runtime_bootstrap',"UPDATE memory_runtime_bootstrap SET baseline_hash='wrong'"),
    g=>corruptRuntime(g,'memory_runtime_manifests','UPDATE memory_runtime_manifests SET manifest_hash=?',['0'.repeat(64)])]) {
    const g=await runtimeFixture(t,{activate:false});mutate(g);const before=g.snapshot(),writes=g.batches;
    await assert.rejects(readMachineRuntimeStatus(g.context));await assert.rejects(prepareMachineRuntime(g.context,g.upgrade));
    assert.deepEqual(g.snapshot(),before);assert.equal(g.batches,writes);
  }
});
test('upgrade identical/competing attempts and provider response loss recover only exact original12 ownership',async t=>{
  for(const competing of [false,true]) {
    const f=await preparedMachineFixture(t),context=await trustedMachineRuntimeContext(f.operator,f.installation);
    const input={operationId:attempt('upgrade'),expected:await f.expected(),pinHash:f.input.pinHash};
    const results=await Promise.allSettled([prepareMachineRuntime(context,input),prepareMachineRuntime(context,competing?{...input,operationId:attempt('competing-upgrade')}:input)]);
    assert.equal(results.filter(row=>row.status==='fulfilled').length,competing?1:2);
    assert.equal(f.db.prepare('SELECT count(*) n FROM memory_runtime_bootstrap').get().n,1);
    assert.equal(f.db.prepare('SELECT installation_id FROM memory_runtime_configuration').get().installation_id,f.installation.installationId);
  }
  const f=await preparedMachineFixture(t),context=await trustedMachineRuntimeContext(f.operator,f.installation);
  const input={operationId:attempt('upgrade-lost'),expected:await f.expected(),pinHash:f.input.pinHash};f.loseResponse=true;
  const result=await prepareMachineRuntime(context,input);assert.equal(result.memory.status,'pending-setup');assert.deepEqual(await prepareMachineRuntime(context,input),result);
});
test('partial/uncompleted12 and historical/foreign schemas refuse13 without writes',async t=>{
  for(const through of [10,11,12]) {
    const f=machineFixture(t);applyMigrations(f.db,through);
    const installation={...f.target,installationId:'i'.repeat(32),repositoryId:'r'.repeat(32)};
    const context=await trustedMachineRuntimeContext(f.operator,installation),before=f.snapshot(),writes=f.batches;
    await assert.rejects(prepareMachineRuntime(context,{operationId:attempt('upgrade'),expected:{},pinHash:(await machineInput(f)).pinHash}));
    assert.deepEqual(f.snapshot(),before);assert.equal(f.batches,writes);
  }
});
test('changed trusted deployment pins refuse status and mutation without repinning or writes',async t=>{
  const f=await runtimeFixture(t),before=f.snapshot(),writes=f.batches;
  await assert.rejects(prepareMachineRuntime(f.context,{...f.upgrade,pinHash:'0'.repeat(64)}),rejected('target-mismatch'));
  f.setBinding(f.target.memoryWorkerName,'WONG_ENVIRONMENT',{type:'plain_text',text:'staging'});
  await assert.rejects(readMachineRuntimeStatus(f.context));
  await assert.rejects(issueRuntimeMachineGrant(f.context,{attemptId:attempt('stale-pins'),expected:f.activation.expected,
    payload:{grantId:GRANT,machineCommitment:'0'.repeat(64),capabilityHash:'1'.repeat(64),scope:'memory:read',expiresAt:Math.floor(Date.now()/1000)+550}}));
  assert.deepEqual(f.snapshot(),before);assert.equal(f.batches,writes);
});
test('trusted fresh activation has exact receipts; ordinary D1/admin-data cannot activate, issue or revoke',async t=>{
  const f=await runtimeGrantFixture(t),state=await readRuntimeState(f.context);
  for(const call of [()=>activateMachineRuntime(f.public,f.activation),()=>issueRuntimeMachineGrant(f.public,f.issue),
    ()=>revokeRuntimeMachine(f.public,{attemptId:attempt('revoke'),expected:state.snapshot,payload:{machineId:MACHINE,grantId:GRANT,machineRevision:1,grantRevision:2}}),
    ()=>planMachineRuntime(f.public,state,f.activation,'activate',f.activation.payload,'0'.repeat(64))])
    await assert.rejects(async()=>call(),rejected('machine-context-denied'));
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_runtime_activations').get().n,1);
  assert.equal((await readMachineRuntimeStatus(f.context)).memory.status,'pending-setup');
  const inactive=await runtimeGrantFixture(t,{activate:false});const input=await runtimeEnrollInput(inactive);
  await assert.rejects(enrollRuntimeMachine(inactive.public,input),rejected('machine-runtime-inactive'));
});
test('activation refuses retained legacy authority and provider success cannot fabricate13 completion',async t=>{
  const f=await runtimeFixture(t,{activate:false});
  f.db.prepare("INSERT INTO memory_keys(hash,email,role,created_at) VALUES(?,'old@example.com','admin','fixture')").run('0'.repeat(64));
  const before=f.snapshot();await assert.rejects(activateMachineRuntime(f.context,{attemptId:attempt('activate'),expected:await f.expected(),payload:{protocolHash:'a'.repeat(64),routeContractHash:'b'.repeat(64)}}),rejected('legacy-cutover-required'));
  assert.deepEqual(f.snapshot(),before);
  const g=await preparedMachineFixture(t),context=await trustedMachineRuntimeContext(g.operator,g.installation);
  g.intercept=async(method,path,body)=>body?.batch?[{success:true,results:[]}]:undefined;
  await assert.rejects(prepareMachineRuntime(context,{operationId:attempt('upgrade'),expected:await g.expected(),pinHash:g.input.pinHash}));
  assert.equal(g.db.prepare("SELECT count(*) n FROM sqlite_master WHERE name='memory_runtime_bootstrap'").get().n,0);
});
test('inactive13 preserves legacy fixtures but durable activation blocks legacy key/admin reinsertion and update',async t=>{
  const inactive=await runtimeFixture(t,{activate:false});
  inactive.db.prepare("INSERT INTO memory_keys(hash,email,role,created_at) VALUES(?,'legacy@example.com','member','fixture')").run('0'.repeat(64));
  inactive.db.exec("UPDATE memory_keys SET email='kept@example.com'");
  inactive.db.exec("INSERT INTO memory_admins VALUES('123','legacy','legacy@example.com','fixture')");
  inactive.db.exec("UPDATE memory_admins SET login='kept'");
  const f=await runtimeFixture(t);
  assert.throws(()=>f.db.prepare("INSERT INTO memory_keys(hash,email,role,created_at) VALUES(?,'legacy@example.com','admin','fixture')").run('0'.repeat(64)),/retired/);
  assert.throws(()=>f.db.exec("INSERT INTO memory_admins VALUES('123','legacy','legacy@example.com','fixture')"),/retired/);
  // Source corruption supplies rows solely to independently exercise retained-version UPDATE guards.
  const keyGuard=f.db.prepare("SELECT sql FROM sqlite_master WHERE name='memory_runtime_legacy_keys_insert_guard'").get().sql;
  f.db.exec('DROP TRIGGER memory_runtime_legacy_keys_insert_guard');
  f.db.prepare("INSERT INTO memory_keys(hash,email,role,created_at) VALUES(?,'legacy@example.com','member','fixture')").run('0'.repeat(64));f.db.exec(keyGuard);
  assert.throws(()=>f.db.exec("UPDATE memory_keys SET role='admin'"),/retired/);
  const adminGuard=f.db.prepare("SELECT sql FROM sqlite_master WHERE name='memory_runtime_legacy_admins_insert_guard'").get().sql;
  f.db.exec('DROP TRIGGER memory_runtime_legacy_admins_insert_guard');f.db.exec("INSERT INTO memory_admins VALUES('123','legacy','legacy@example.com','fixture')");f.db.exec(adminGuard);
  assert.throws(()=>f.db.exec("UPDATE memory_admins SET login='changed'"),/retired/);
});
test('a retained legacy Worker join cannot issue a usable key after13 activation',async t=>{
  const f=await runtimeFixture(t);
  t.mock.method(globalThis,'fetch',async url=>{
    const path=new URL(url).pathname;
    return Response.json(path==='/user/emails'?[{email:'legacy@example.com',verified:true,primary:true}]:path==='/user'?{id:123}:{permissions:{push:true}});
  });
  await assert.rejects(handleMemory(new Request(f.installation.memoryOrigin+'/_memory/join',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({token:'synthetic-token',machine:'synthetic-legacy-machine',email:'legacy@example.com'})}),
  {MEMORY_DB:d1Fixture(f),GITHUB_REPOSITORY:'fixture/repository'}),/retired/);
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_keys').get().n,0);
});
for(const atomic of [true,false])test(`upgrade failure at every source authority boundary atomic=${atomic}`,async t=>{
  for(let failAt=0;failAt<5;failAt++) {
    const f=await preparedMachineFixture(t),context=await trustedMachineRuntimeContext(f.operator,f.installation),input={operationId:attempt('upgrade'),expected:await f.expected(),pinHash:f.input.pinHash};
    const before=f.snapshot();f.atomic=atomic;f.failAt=failAt;await assert.rejects(prepareMachineRuntime(context,input));
    if(atomic||failAt===0)assert.deepEqual(f.snapshot(),before);
    else {const partial=f.snapshot(),writes=f.batches;f.failAt=null;await assert.rejects(prepareMachineRuntime(context,input));assert.deepEqual(f.snapshot(),partial);assert.equal(f.batches,writes);}
  }
});
const operations={
  activate:async t=>{const f=await runtimeFixture(t,{activate:false});return [f,activateMachineRuntime,f.context,{attemptId:attempt('activate'),expected:await f.expected(),payload:{protocolHash:'a'.repeat(64),routeContractHash:'b'.repeat(64)}}];},
  issue:async t=>{const f=await runtimeGrantFixture(t);const input={...f.issue,attemptId:attempt('issue-other'),expected:await f.expected(),payload:{...f.issue.payload,grantId:attempt('other-grant'),capabilityHash:'9'.repeat(64)}};return[f,issueRuntimeMachineGrant,f.context,input];},
  enroll:async t=>{const f=await runtimeGrantFixture(t);return[f,enrollRuntimeMachine,f.public,await runtimeEnrollInput(f)];},
  revoke:async t=>{const f=await enrolledRuntimeFixture(t);return[f,revokeRuntimeMachine,f.context,await revokeInput(f)];},
  stage:async t=>{const f=await enrolledRuntimeFixture(t);return[f,stageRuntimeTranscript,f.public,await transcriptInput(f)];},
  publish:async t=>{const f=await enrolledRuntimeFixture(t);await stageRuntimeTranscript(f.public,await transcriptInput(f));return[f,publishRuntimeTranscript,f.public,await transcriptInput(f,'publish')];},
};
for(const [action,fixture]of Object.entries(operations)) {
  test(`${action} all atomic/nontransactional mutation boundaries remain closed with no automatic repair`,async t=>{
    const [probe,call,context,input]=await fixture(t);await call(context,input);const count=probe.statementBatches.at(-1).length;
    for(const atomic of [true,false])for(let failAt=0;failAt<count;failAt++) {
      const [f,run,ctx,request]=await fixture(t);const before=f.snapshot();f.atomic=atomic;f.failAt=failAt;
      await assert.rejects(run(ctx,request));
      if(atomic||failAt===0)assert.deepEqual(f.snapshot(),before);
      else {const partial=f.snapshot(),writes=f.batches;f.failAt=null;await assert.rejects(run(ctx,request),rejected('machine-operation-incomplete'));assert.deepEqual(f.snapshot(),partial);assert.equal(f.batches,writes);}
    }
  });
  test(`${action} identical concurrent/lost-response completion and competing requests use exact receipts`,async t=>{
    const [f,call,ctx,input]=await fixture(t);f.loseResponse=true;const recovered=await call(ctx,input);
    assert.deepEqual(await call(ctx,input),recovered);
    const [g,run,context,request]=await fixture(t);
    const same=await Promise.allSettled([run(context,request),run(context,request)]);
    assert.ok(same.some(row=>row.status==='fulfilled'));
    assert.equal(g.db.prepare('SELECT count(*) n FROM memory_runtime_completions WHERE attempt_id=?').get(request.attemptId).n,1);
    const [,other,otherCtx,one]=await fixture(t);const two={...one,attemptId:attempt('competing-'+action)};
    // A competing signed operation needs its own frame; altering the attempt without resigning must deny.
    const race=await Promise.allSettled([other(otherCtx,one),other(otherCtx,two)]);
    assert.equal(race.filter(row=>row.status==='fulfilled').length,1);
    const [validF,validCall,validCtx,validOne]=await fixture(t);
    let validTwo={...validOne,attemptId:attempt('valid-competing-'+action)};
    if(validOne.proof)validTwo=await signed(validF,action,validTwo);
    const validRace=await Promise.allSettled([validCall(validCtx,validOne),validCall(validCtx,validTwo)]);
    assert.equal(validRace.filter(row=>row.status==='fulfilled').length,1);
  });
}
test('lost enrollment response then revoke never restores removed authority or returns secrets',async t=>{
  const f=await runtimeGrantFixture(t),input=await runtimeEnrollInput(f);f.loseResponse=true;
  const result=await enrollRuntimeMachine(f.public,input);await revokeRuntimeMachine(f.context,await revokeInput(f));
  const before=f.snapshot();await assert.rejects(enrollRuntimeMachine(f.public,input),rejected('machine-operation-incomplete'));
  await assert.rejects(validateRuntimeBearer(f.public,{machineId:MACHINE,credentialHash:input.payload.credentialHash}),rejected('machine-proof-denied'));
  assert.deepEqual(f.snapshot(),before);
  const serialized=JSON.stringify(result);assert.equal(serialized.includes(input.capability),false);assert.equal(serialized.includes('publicKeyJson'),false);
  assert.equal(serialized.includes('signature'),false);assert.equal(result.memory.status,'pending-setup');
});
test('continuing nontransactional enrollment cannot publish a missing canonical signing key',async t=>{
  const f=await runtimeGrantFixture(t),input=await runtimeEnrollInput(f);f.atomic=false;
  const before=f.db.prepare('SELECT count(*) n FROM memory_runtime_completions').get().n;
  f.beforeStatement=async(index,statement)=>{if(statement.sql.includes('INSERT INTO memory_runtime_keys(')){statement.sql='SELECT 1';statement.params=[];}};
  await assert.rejects(enrollRuntimeMachine(f.public,input),rejected('machine-operation-incomplete'));
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_runtime_keys').get().n,0);
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_runtime_completions').get().n,before);
  assert.equal((await readMachineRuntimeStatus(f.context)).memory.reason,'incomplete-machine-operation');
  f.beforeStatement=null;const partial=f.snapshot(),writes=f.batches;await assert.rejects(enrollRuntimeMachine(f.public,input),rejected('machine-operation-incomplete'));
  assert.deepEqual(f.snapshot(),partial);assert.equal(f.batches,writes);
});
test('reader private staged capture, shared refusal, publication ownership and stale-capture quarantine',async t=>{
  const reader=await enrolledRuntimeFixture(t,{scope:'memory:read'});
  await stageRuntimeTranscript(reader.public,await transcriptInput(reader));
  await publishRuntimeTranscript(reader.public,await transcriptInput(reader,'publish'));
  const shared=await transcriptInput(reader,'stage',{objectHash:'8'.repeat(64),visibility:'shared'});
  const freshShared=await signed(reader,'stage',{...shared,attemptId:attempt('reader-shared-stage')});
  await assert.rejects(stageRuntimeTranscript(reader.public,freshShared),rejected('machine-proof-denied'));
  const f=await enrolledRuntimeFixture(t);await stageRuntimeTranscript(f.public,await transcriptInput(f,'stage',{visibility:'shared'}));
  await publishRuntimeTranscript(f.public,await transcriptInput(f,'publish',{visibility:'shared'}));
  assert.equal((await readRuntimeTranscriptOwner(f.public,{machineId:MACHINE,grantId:GRANT,credentialHash:f.enroll.payload.credentialHash,objectHash:'c'.repeat(64)})).machineId,MACHINE);
  await assert.rejects(readRuntimeTranscriptOwner(f.public,{machineId:attempt('foreign-machine'),grantId:GRANT,credentialHash:f.enroll.payload.credentialHash,objectHash:'c'.repeat(64)}));
  const g=await enrolledRuntimeFixture(t);await stageRuntimeTranscript(g.public,await transcriptInput(g));
  // Another authorization mutation leaves this owner's grant/generation valid.
  await issueRuntimeMachineGrant(g.context,{attemptId:attempt('another-issue'),expected:await g.expected(),payload:{...g.issue.payload,grantId:attempt('other-grant'),capabilityHash:'7'.repeat(64)}});
  await publishRuntimeTranscript(g.public,await transcriptInput(g,'publish'));
  assert.equal(g.db.prepare("SELECT count(*) n FROM memory_runtime_transcripts WHERE event='published'").get().n,1);
  const h=await enrolledRuntimeFixture(t);await stageRuntimeTranscript(h.public,await transcriptInput(h,'stage',{visibility:'shared'}));
  const other=await enrollOtherRuntimeMachine(h);
  await publishRuntimeTranscript(h.public,await transcriptInput(h,'publish',{visibility:'shared'}));
  await assert.rejects(readRuntimeTranscriptOwner(h.public,{machineId:other.machineId,grantId:other.grantId,credentialHash:other.credentialHash,objectHash:'c'.repeat(64)}),rejected('machine-proof-denied'));
  const own=await readRuntimeTranscriptOwner(h.public,{machineId:MACHINE,grantId:GRANT,credentialHash:h.enroll.payload.credentialHash,objectHash:'c'.repeat(64)});
  assert.equal(own.machineId,MACHINE);
});
