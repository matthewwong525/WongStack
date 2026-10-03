import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync,writeFileSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { memory,setup,rows,clientScript } from './fixtures/memory/harness.mjs';
import {clientRuntimeRequestHash} from '../../.agents/skills/memory/scripts/lib/machine-client.mjs';
import { revokeRuntimeMachine } from '../../.agents/skills/memory/scripts/lib/machine-runtime-operator.mjs';
import { signed,MACHINE,GRANT,now } from './fixtures/memory/core.mjs';
import { digest } from '../../.agents/skills/memory/scripts/lib/installation-validation.mjs';
const read=e=>JSON.parse(readFileSync(join(e.repo.stateDir,'machine.json'),'utf8'));
const write=(e,s)=>writeFileSync(join(e.repo.stateDir,'machine.json'),JSON.stringify(s),{mode:0o600});
async function candidate(e,{expired=false}={}){
 const state=read(e),token='precommitted-private-candidate'.padEnd(48,'x'),hash=await digest(token);
 const input=await signed(e.fake,'renew',{attemptId:crypto.randomUUID(),expected:await e.fake.runtimeExpected(),payload:{machineId:MACHINE,grantId:GRANT,machineCommitment:state.commitment,scope:state.scope,machineRevision:1,grantRevision:2,previousHash:state.credential.hash,generation:2,credentialHash:hash,credentialExpiresAt:now()+2591900,overlapUntil:now()+110}});
 if(expired)input.proof.deadline=now()-1;
 state.candidate={input,hash,token,requestHash:await clientRuntimeRequestHash(state,'renew',input),generation:2,expiresAt:input.payload.credentialExpiresAt};write(e,state);return state.candidate;
}
test('same-grant renewal precommits and stores only an exact completed candidate, never an env token',async t=>{
 const e=await setup(t),state=read(e);state.credential.expiresAt=0;write(e,state);
 const result=await memory(e.repo,e.fake,['join']);assert.equal(result.code,0,result.stderr);const saved=read(e);assert.equal(saved.grantId,GRANT);assert.equal(saved.credential.generation,2);assert.equal(saved.candidate,undefined);
 assert.equal(rows(e,'SELECT hash FROM memory_runtime_rotations WHERE generation=2')[0].hash,await digest(saved.credential.token));assert.doesNotMatch(result.stdout+result.stderr,new RegExp(saved.credential.token));assert.match(readFileSync(join(e.repo.root,'.env'),'utf8'),/retired-no-authority/);
});
test('expired unsent candidate is replaced only after owned signed absence, on the same grant',async t=>{
 const e=await setup(t),old=await candidate(e,{expired:true}),result=await memory(e.repo,e.fake,['join']);assert.equal(result.code,0,result.stderr);const saved=read(e);
 assert.equal(saved.grantId,GRANT);assert.notEqual(saved.credential.hash,old.hash);assert.equal(saved.candidate,undefined);assert.equal(rows(e,'SELECT count(*) n FROM memory_runtime_attempts WHERE id=?',old.input.attemptId)[0].n,0);assert.equal(rows(e,'SELECT hash FROM memory_runtime_rotations WHERE generation=2')[0].hash,saved.credential.hash);
});
test('committed candidate with lost response recovers its exact private token after proof expiry',async t=>{
 const e=await setup(t),old=await candidate(e);assert.equal((await e.fake.call('renew',old.input)).status,200);const state=read(e);state.candidate.input.proof.deadline=now()-1;write(e,state);
 const result=await memory(e.repo,e.fake,['join']);assert.equal(result.code,0,result.stderr);assert.equal(read(e).credential.token,old.token);assert.equal(read(e).credential.hash,old.hash);assert.equal(rows(e,'SELECT count(*) n FROM memory_runtime_rotations WHERE generation=2')[0].n,1);
});
test('clone/config/email and legacy env credentials cannot silently enroll a missing private machine',async t=>{
 const e=await setup(t);rmSync(join(e.repo.stateDir,'machine.json'));const before=rows(e,'SELECT count(*) n FROM memory_machine_grants')[0].n;
 for(const command of [['join'],['member','admin'],['migrate'],['live']]){const result=await memory(e.repo,e.fake,command);assert.notEqual(result.code,0);assert.doesNotMatch(result.stdout+result.stderr,/retired-no-authority/);}
 assert.equal(rows(e,'SELECT count(*) n FROM memory_machine_grants')[0].n,before);
});

test('a successful but wrong action/attempt/request hash envelope never clears a precommitted renewal',async t=>{
 for(const field of ['action','attemptId','requestHash']){const e=await setup(t),state=read(e);state.credential.expiresAt=0;write(e,state);e.fake.setReply((body,path)=>{if(path.endsWith('/renew'))body.result.operation[field]='wrong-completed-envelope';return body;});const result=await memory(e.repo,e.fake,['join']);assert.notEqual(result.code,0);const pending=read(e);assert.ok(pending.candidate);assert.equal(pending.credential.hash,state.credential.hash);assert.doesNotMatch(result.stdout,/refreshed|connected/);e.fake.setReply(null);const recovered=await memory(e.repo,e.fake,['join']);assert.equal(recovered.code,0,recovered.stderr);assert.equal(read(e).credential.token,pending.candidate.token);}
});

test('trusted enrollment retry proves the existing same grant and refuses a revoked local credential',async t=>{
 const e=await setup(t),url=new URL('../../.agents/skills/memory/scripts/lib/machine-client.mjs',import.meta.url).href;
 const retry=async()=>clientScript(e.repo,e.fake,`import {enrollClient} from ${JSON.stringify(url)};console.log(JSON.stringify(await enrollClient({stateDir:${JSON.stringify(e.repo.stateDir)}},${JSON.stringify(e.fake.installation)},${JSON.stringify({grantId:GRANT,scope:e.fake.scope,capability:'not-used-by-existing-credential',expected:await e.fake.runtimeExpected(),dataSnapshot:await e.fake.expected()})})));`);
 const initial=await retry();assert.equal(initial.code,0,initial.stderr);assert.match(initial.stdout,/connected/);
 await revokeRuntimeMachine(e.fake.context,{attemptId:crypto.randomUUID(),expected:await e.fake.runtimeExpected(),payload:{machineId:MACHINE,grantId:GRANT,machineRevision:1,grantRevision:2}});
 const denied=await retry();assert.notEqual(denied.code,0);assert.doesNotMatch(denied.stdout,/connected/);
});
