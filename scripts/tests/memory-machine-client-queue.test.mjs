import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync,readdirSync,writeFileSync,rmSync,mkdirSync,symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { memory,setup,rows,writeJsonFile,clientScript } from './fixtures/memory/harness.mjs';
import { captureChunks } from '../../.agents/skills/memory/scripts/lib/machine-client-queue.mjs';
const put=(e,facts)=>memory(e.repo,e.fake,['put-facts','--file',writeJsonFile(e.repo.home,crypto.randomUUID()+'.json',{source:'save',slug:'business',facts})]);
const queues=e=>readdirSync(join(e.repo.stateDir,'queues')).map(n=>JSON.parse(readFileSync(join(e.repo.stateDir,'queues',n),'utf8')));
test('capture splitting keeps one fact per finite invocation and advances the cursor only in the final piece',()=>{
 const pieces=captureChunks({newTags:[{name:'x',definition:'X',aliasOf:null}],facts:[{tags:[],supersedes:[]},{tags:[],supersedes:[]}],session:{previousCursor:'2',nextCursor:'8'},run:{counts:{}}});assert.equal(pieces.length,3);assert.deepEqual(pieces.map(p=>p.session.nextCursor),['2','2','8']);assert.equal(pieces.filter(p=>p.run).length,1);
});
test('ordinary multi-fact CLI capture persists exact receipts for every bounded piece before completion',async t=>{
 const e=await setup(t),result=await put(e,Array.from({length:8},(_,i)=>({action:'add',type:'project',body:`Confirmed business decision number ${i}.`})));assert.equal(result.code,0,result.stderr);assert.match(result.stdout,/stored: added 8/);assert.equal(rows(e,'SELECT count(*) n FROM facts')[0].n,8);
 const q=queues(e)[0];assert.equal(q.completed,true);assert.ok(q.chunks.every(c=>c.receipt?.completed&&c.receipt.requestHash===c.candidate.requestHash));assert.equal(q.chunks.reduce((n,c)=>n+c.receipt.outcome.facts.length,0),8);
});
test('lost capture response remains queued and exact signed receipt recovery stores no duplicate fact',async t=>{
 const e=await setup(t);e.fake.dropNext('capture');const first=await put(e,[{action:'add',type:'project',body:'A lost response has an exact durable receipt.'}]);assert.match(first.stdout,/queued: capture/);assert.equal(rows(e,'SELECT count(*) n FROM facts')[0].n,1);const q=queues(e)[0];assert.equal(q.completed,false);
 const second=await put(e,[{action:'add',type:'project',body:'A later write recovers this same machine queue.'}]);assert.equal(second.code,0,second.stderr);assert.equal(rows(e,'SELECT count(*) n FROM facts')[0].n,2);assert.equal(queues(e).find(x=>x.id===q.id).completed,true);assert.ok(e.fake.calls.some(x=>x.endsWith('/capture-status')));
});

test('restart drains a manual lost-response queue without a new capture and retained completed prefix cannot starve it',async t=>{
 const e=await setup(t);e.fake.dropNext('capture');await put(e,[{action:'add',type:'project',body:'A queued manual fact survives restart.'}]);const q=queues(e)[0];
 for(let i=0;i<110;i++){const id=i.toString(16).padStart(32,'0');writeFileSync(join(e.repo.stateDir,'queues',id+'.json'),JSON.stringify({...q,id,completed:true}),{mode:0o600});}
 const result=await memory(e.repo,e.fake,['drain']);assert.equal(result.code,0,result.stderr);assert.equal(queues(e).find(x=>x.id===q.id).completed,true);assert.equal(rows(e,'SELECT count(*) n FROM facts')[0].n,1);assert.deepEqual(JSON.parse(readFileSync(join(e.repo.stateDir,'pending-capture.json'))),[]);
});
test('index intent precedes journal write, unsafe adoption denies, and exact retry repairs a missing index',async t=>{
 if(process.platform==='win32')return;const e=await setup(t),id=crypto.randomUUID(),dir=join(e.repo.stateDir,'queues'),path=join(dir,id+'.json');mkdirSync(dir,{recursive:true,mode:0o700});symlinkSync(join(e.repo.home,'missing'),path);
 const url=new URL('../../.agents/skills/memory/scripts/lib/machine-client-queue.mjs',import.meta.url).href,notes={visibility:'private',source:'save',newTags:[],session:null,facts:[],run:null};
 const enqueue=()=>clientScript(e.repo,e.fake,`import {enqueueCapture} from ${JSON.stringify(url)};await enqueueCapture({stateDir:${JSON.stringify(e.repo.stateDir)}},${JSON.stringify(e.fake.installation)},${JSON.stringify(notes)},{queueId:${JSON.stringify(id)}});`);
 // The unsafe target is rejected before any adoption or HTTP. A fresh missing
 // target then exercises index-before-journal via the source ordering below.
 assert.notEqual((await enqueue()).code,0);rmSync(path);assert.equal((await enqueue()).code,0);writeFileSync(join(e.repo.stateDir,'pending-capture.json'),'[]',{mode:0o600});assert.equal((await enqueue()).code,0);assert.deepEqual(JSON.parse(readFileSync(join(e.repo.stateDir,'pending-capture.json'))),[id]);
 const source=readFileSync(new URL('../../.agents/skills/memory/scripts/lib/machine-client-queue.mjs',import.meta.url),'utf8');assert.match(source,/setPending\(ctx,'capture',queueId,true\);privateWrite\(path,queue\)/);assert.equal(e.fake.calls.length,0);
});

// Genuine private journals and signatures against the HTTPS-origin core. The
// isolated child clock changes only while creating the original proof.
async function prepareQueuedFact(e,{expired=false,attempted=false,visibility='private'}={}) {
 const id=crypto.randomUUID(),url=name=>new URL(`../../.agents/skills/memory/scripts/lib/${name}.mjs`,import.meta.url).href;
 const notes={visibility,source:'save',newTags:[],session:null,facts:[{slug:'business',type:'project',body:'The original queued decision remains bound to its machine.',tags:[],supersedes:[]}],run:null};
 const code=`import {enqueueCapture} from ${JSON.stringify(url('machine-client-queue'))};
 import {privateRead,privateWrite} from ${JSON.stringify(url('machine-client-state'))};
 import {signClient,clientHash} from ${JSON.stringify(url('machine-client'))};
 const ctx={stateDir:${JSON.stringify(e.repo.stateDir)}},installation=${JSON.stringify(e.fake.installation)},id=${JSON.stringify(id)};
 const queue=await enqueueCapture(ctx,installation,${JSON.stringify(notes)},{queueId:id});
 if(${attempted}){const state=privateRead(ctx.stateDir+'/machine.json'),chunk=queue.chunks[0];
 const payload={machineId:state.machineId,repositoryId:installation.repositoryId,grantId:state.grantId,machineCommitment:state.commitment,machineRevision:state.machineRevision,grantRevision:state.grantRevision,credentialGeneration:state.credential.generation,credentialHash:state.credential.hash,...chunk.notes};
 const clock=Date.now;let input;try{if(${expired})Date.now=()=>clock()-180000;input=await signClient(state,'capture',{attemptId:crypto.randomUUID(),expected:state.dataSnapshot,payload});}finally{Date.now=clock;}
 chunk.candidate={input,requestHash:await clientHash(JSON.stringify({version:14,installation,action:'capture',attemptId:input.attemptId,expected:input.expected,payload:{...payload,publicKeyJson:JSON.stringify(state.publicKey)}}))};
 privateWrite(ctx.stateDir+'/queues/'+id+'.json',queue);}`;
 const result=await clientScript(e.repo,e.fake,code);assert.equal(result.code,0,result.stderr);return queues(e).find(q=>q.id===id);
}
const retainedQueue=(e,id)=>JSON.parse(readFileSync(join(e.repo.stateDir,'queues',id+'.json'),'utf8'));
const captureCalls=e=>e.fake.calls.filter(call=>call.endsWith('/capture'));

test('an untouched private queue survives same-grant renewal while retaining its original key and generation',async t=>{
 const e=await setup(t),queue=await prepareQueuedFact(e),file=join(e.repo.stateDir,'machine.json'),before=JSON.parse(readFileSync(file));
 assert.deepEqual(queue.provenance,{version:2,installation:before.installation,machineId:before.machineId,grantId:before.grantId,keyCommitment:before.commitment,publicKey:before.publicKey,scope:before.scope,machineRevision:before.machineRevision,grantRevision:before.grantRevision,credentialGeneration:1});
 assert.ok(!JSON.stringify(queue).includes(before.privateKey.d)&&!JSON.stringify(queue).includes(before.credential.token));
 assert.equal(e.fake.calls.length,0);before.credential.expiresAt=0;writeFileSync(file,JSON.stringify(before),{mode:0o600});
 assert.equal((await memory(e.repo,e.fake,['join'])).code,0);const renewed=JSON.parse(readFileSync(file));assert.equal(renewed.credential.generation,2);assert.equal(renewed.commitment,before.commitment);assert.equal(renewed.grantId,before.grantId);
 const result=await memory(e.repo,e.fake,['drain']);assert.equal(result.code,0,result.stderr);const done=retainedQueue(e,queue.id);
 assert.equal(done.completed,true);assert.deepEqual(done.provenance,queue.provenance);assert.equal(done.chunks[0].candidate.input.payload.credentialGeneration,2);assert.equal(captureCalls(e).length,1);assert.equal(rows(e,'SELECT count(*) n FROM facts')[0].n,1);
});

for(const field of ['missing','keyCommitment','publicKey','machineRevision','grantRevision'])test(`unproven capture queue ${field} quarantines before a data-write callback`,async t=>{
 const e=await setup(t),queue=await prepareQueuedFact(e),changed=structuredClone(queue);
 if(field==='missing')delete changed.provenance;
 else if(field==='publicKey')changed.provenance.publicKey={...changed.provenance.publicKey,x:'not-the-original-key'};
 else changed.provenance[field]=field==='keyCommitment'?'f'.repeat(64):changed.provenance[field]+1;
 writeFileSync(join(e.repo.stateDir,'queues',queue.id+'.json'),JSON.stringify(changed),{mode:0o600});
 await memory(e.repo,e.fake,['drain']);const retained=retainedQueue(e,queue.id);
 assert.equal(retained.quarantined,true);assert.equal(retained.completed,false);assert.deepEqual(retained.notes,queue.notes);assert.equal(captureCalls(e).length,0);assert.equal(rows(e,'SELECT count(*) n FROM facts')[0].n,0);assert.deepEqual(JSON.parse(readFileSync(join(e.repo.stateDir,'pending-capture.json'))),[]);
});

test('an exact expired unexecuted capture appends a successor and keeps the original attempted proof',async t=>{
 const e=await setup(t),queue=await prepareQueuedFact(e,{attempted:true,expired:true}),original=structuredClone(queue.chunks[0].candidate);
 assert.ok(original.input.proof.deadline<Math.floor(Date.now()/1000));assert.equal(e.fake.calls.length,0);
 const result=await memory(e.repo,e.fake,['drain']);assert.equal(result.code,0,result.stderr);const done=retainedQueue(e,queue.id),successor=done.chunks[0].successors?.[0];
 assert.equal(done.completed,true);assert.deepEqual(done.provenance,queue.provenance);assert.deepEqual(done.chunks[0].candidate,original);assert.equal(done.chunks[0].successors.length,1);
 assert.equal(successor.predecessorAttemptId,original.input.attemptId);assert.equal(successor.predecessorRequestHash,original.requestHash);assert.equal(successor.absenceEvidence.requestHash,original.requestHash);assert.equal(successor.absenceEvidence.nonExecution,true);assert.equal(successor.absenceEvidence.predecessorDeadline,original.input.proof.deadline);
 assert.notEqual(successor.candidate.input.attemptId,original.input.attemptId);assert.equal(successor.candidate.requestHash,done.chunks[0].receipt.requestHash);assert.equal(captureCalls(e).length,1);assert.equal(rows(e,'SELECT count(*) n FROM facts')[0].n,1);
 assert.equal((await memory(e.repo,e.fake,['drain'])).code,0);assert.equal(captureCalls(e).length,1);assert.equal(rows(e,'SELECT count(*) n FROM facts')[0].n,1);
});

test('bare absence of an unexpired capture never discards its original frame or sends a replacement',async t=>{
 const e=await setup(t),queue=await prepareQueuedFact(e,{attempted:true});await memory(e.repo,e.fake,['drain']);const retained=retainedQueue(e,queue.id);
 assert.equal(retained.quarantined,true);assert.deepEqual(retained.chunks[0].candidate,queue.chunks[0].candidate);assert.equal(retained.chunks[0].successors,undefined);assert.equal(captureCalls(e).length,0);assert.equal(rows(e,'SELECT count(*) n FROM facts')[0].n,0);assert.ok(e.fake.calls.some(call=>call.endsWith('/capture-status')));
});

test('a tampered exact-absence identity never creates a capture successor',async t=>{
 const e=await setup(t),queue=await prepareQueuedFact(e,{attempted:true,expired:true});
 e.fake.setReply((body,url)=>{if(url.endsWith('/capture-status')&&body.result?.operation?.nonExecution)body.result.operation.nonExecution.requestHash='a'.repeat(64);return body;});
 await memory(e.repo,e.fake,['drain']);const retained=retainedQueue(e,queue.id);
 assert.equal(retained.quarantined,true);assert.deepEqual(retained.chunks[0].candidate,queue.chunks[0].candidate);assert.equal(retained.chunks[0].successors,undefined);assert.equal(captureCalls(e).length,0);assert.equal(rows(e,'SELECT count(*) n FROM facts')[0].n,0);
});
