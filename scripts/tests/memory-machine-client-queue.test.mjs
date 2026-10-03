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
