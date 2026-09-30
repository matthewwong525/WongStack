import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { createManagementStore } from '../../server/agent/management.mjs';
import { tick } from '../../server/agent/agent.mjs';
let root, options, job, value, path, journal, calls;
const store=()=>createManagementStore(options);
const receipt=()=>Response.json({ok:true,connectionId:'connection',generation:1,state:'pending'});
const post=async(route,body)=>{calls.push({route,body});return route.endsWith('/access')?receipt():Response.json({ok:true});};
function put(result=value,mode=0o600){mkdirSync(dirname(path),{recursive:true,mode:0o700});writeFileSync(path,JSON.stringify(result),{mode});}
const entry=()=>JSON.parse(readFileSync(journal,'utf8'));
beforeEach(()=>{
 root=mkdtempSync(join(tmpdir(),'private-host-'));options={home:join(root,'home'),uid:process.getuid(),directory:join(root,'journal')};
 path=join(options.home,'.local/state/wongstack/access-results/job.json');journal=join(options.directory,'job.json');calls=[];
 const recipient={ownerId:'owner',vmId:'vm',jobId:'job',connectionId:'connection',generation:1};
 job={id:'job',type:'cloudflare',payload:{token:'broad-setup-secret',repo:'owner/site',ownerEmail:'owner@example.com',sourceRepo:'owner/source',sourceCommit:'a'.repeat(40),managementResult:{version:1,recipient,path,cleanupTokenIds:[]}}};
 value={version:1,recipient,repo:job.payload.repo,ownerEmail:job.payload.ownerEmail,source:{repo:'owner/source',commit:'a'.repeat(40)},token:'restricted-secret',tokenId:'b'.repeat(32)};
});
afterEach(()=>rmSync(root,{recursive:true,force:true}));
test('private mode/ownership, recipient and independently observed outcome are saved before Access delivery; no token enters journal',async()=>{
 const s=store();const outcome=await s.execute(job,async()=>{put();return{status:'done',rolled:true,extra:'broad-setup-secret'};},async(route,body)=>{
  assert.deepEqual(entry().outcome,{status:'done',rolled:true});return post(route,body);
 });
 assert.deepEqual(outcome,{status:'done',rolled:true});assert.equal(existsSync(path),false);assert.equal(entry().ack,true);assert.equal(entry().reported,false);
 assert.equal(statSync(journal).mode&0o777,0o600);assert.equal(statSync(options.directory).mode&0o777,0o700);
 for(const token of ['broad-setup-secret','restricted-secret'])assert.ok(!readFileSync(journal,'utf8').includes(token));
 assert.equal(calls[0].body.token,'restricted-secret');await s.report(job,outcome,post);assert.equal(entry().reported,true);
});
test('an open result, with no credential, is delivered unchanged through the same checks',async()=>{
 const open={version:1,mode:'open',recipient:value.recipient,source:value.source,accountId:'c'.repeat(32),repo:value.repo,ownerEmail:value.ownerEmail,anchorHostname:'site.owner.workers.dev'};
 const outcome=await store().execute(job,async()=>{put(open);return{status:'done',rolled:true};},post);
 assert.deepEqual(outcome,{status:'done',rolled:true});assert.deepEqual(calls[0].body,open);assert.equal(existsSync(path),false);assert.equal(entry().ack,true);
});
test('lost Access receipt retains the same file/outcome and restart retries identical delivery without source export or rolling',async()=>{
 let installs=0;const s=store();const first=await s.execute(job,async()=>{installs++;put();return{status:'done',rolled:true};},async(route,body)=>{calls.push({route,body});throw Error('lost acknowledgement');});
 assert.equal(first,null);assert.equal(existsSync(path),true);assert.equal(entry().ack,false);
 await store().resume(post);assert.equal(installs,1);assert.deepEqual(calls[0].body,calls[1].body);assert.equal(entry().reported,true);assert.equal(existsSync(path),false);
});
for(const committed of [false,true])test(`restart after Access acknowledgement retries final status only (already committed: ${committed})`,async()=>{
 let installs=0;const s=store();const outcome=await s.execute(job,async()=>{installs++;put();return{status:'done',rolled:false};},post);
 if(committed)await assert.rejects(s.report(job,outcome,async(route,body)=>{calls.push({route,body});throw Error('final response lost after commit');}));
 calls=[];await store().resume(post);assert.equal(calls.length,1);assert.equal(calls[0].route,'/api/agent/jobs/job');assert.deepEqual(calls[0].body,{status:'done',rolled:false});
 assert.equal(entry().reported,true);await store().execute(job,async()=>{installs++;throw Error('must never export again');},post);assert.equal(installs,1);
});
test('a valid private result produced before a later push failure never becomes a successful installer outcome',async()=>{
 const outcome=await store().execute(job,async()=>{put();return{status:'failed',reason:'push',detail:'token=secret'};},post);
 assert.deepEqual(outcome,{status:'failed',reason:'push'});assert.equal(entry().ack,true);assert.equal(calls.length,1);
 await store().report(job,outcome,post);assert.deepEqual(calls[1].body,{status:'failed',reason:'push'});
});
test('file presence after interrupted installer does not imply success, and recovery never journals broad credentials',async()=>{
 assert.equal(await store().execute(job,async()=>{put();throw Error('crashed before independent outcome');},post),null);
 assert.equal(entry().outcome,null);await store().resume(post);assert.deepEqual(calls.at(-1).body,{status:'failed',reason:'access'});assert.equal(entry().reported,true);
});
for(const mistake of ['mode','owner','oversize','symlink','directory','recipient','source','repo','parent'])test(`rejects ${mistake} private result safely and keeps pending without final-success claim`,async()=>{
 if(mistake==='owner')options.uid+=1;
 const s=store();const outcome=await s.execute(job,async()=>{
  put();if(mistake==='mode')chmodSync(path,0o644);
  if(mistake==='oversize')writeFileSync(path,'x'.repeat(16*1024+1));
  if(mistake==='symlink'){rmSync(path);const other=join(root,'elsewhere');writeFileSync(other,JSON.stringify(value),{mode:0o600});symlinkSync(other,path);}
  if(mistake==='directory'){rmSync(path);mkdirSync(path);}
  if(mistake==='recipient')put({...value,recipient:{...value.recipient,generation:2}});
  if(mistake==='source')put({...value,source:{repo:'other/source',commit:'a'.repeat(40)}});
  if(mistake==='repo')put({...value,repo:'other/site'});
  if(mistake==='parent')chmodSync(dirname(path),0o755);
  return{status:'done',rolled:true};
 },post);
 assert.equal(outcome,null);assert.equal(calls.length,0);assert.equal(entry().ack,false);
});
test('rejects wrong path and legacy job contract before running source',async()=>{
 let ran=false;job.payload.managementResult.path=join(root,'arbitrary.json');assert.deepEqual(await store().execute(job,async()=>{ran=true;},post),{status:'failed',reason:'access'});assert.equal(ran,false);
 delete job.payload.managementResult;assert.deepEqual(await store().execute(job,async()=>{ran=true;},post),{status:'failed',reason:'access'});assert.equal(ran,false);
});
test('a successful installer without a private file remains pending rather than reporting done',async()=>{
 assert.equal(await store().execute(job,async()=>({status:'done',rolled:true}),post),null);await store().resume(post);assert.equal(calls.length,0);assert.equal(entry().ack,false);
});
test('a failed installer without a result may report its known failure safely',async()=>{
 assert.deepEqual(await store().execute(job,async()=>({status:'failed',reason:'access'}),post),{status:'failed',reason:'access'});await store().resume(post);assert.deepEqual(calls[0].body,{status:'failed',reason:'access'});
});
test('private recovery can wait on an Access receipt while a health poll and pairing report continue',async()=>{
 const s=store();await s.execute(job,async()=>{put();return{status:'done',rolled:true};},async()=>{throw Error('offline');});
 let release;const routes=[];const fetch=async(url)=>{
  routes.push(new URL(url).pathname);if(url.endsWith('/access'))return new Promise(resolve=>{release=resolve;});
  return Response.json(url.endsWith('/poll')?{jobs:[{id:'pair',type:'pair'}],interval:10}:{ok:true});
 };
 await tick({appUrl:'https://control.test',token:'agent-secret',fetch,exec:async()=>({stdout:JSON.stringify({url:'https://app.paseo.sh/pair'})}),log:()=>{},management:s});
 assert.ok(routes.includes('/api/agent/poll'));assert.ok(routes.includes('/api/agent/jobs/pair'));assert.ok(release);
 release(receipt());for(let n=0;n<50&&!entry().reported;n++)await new Promise(r=>setTimeout(r,5));assert.equal(entry().reported,true);
});
for(const key of ['repo','ownerEmail','sourceRepo','sourceCommit'])test(`refuses credential-bearing ${key} metadata before journaling`,async()=>{
 job.payload[key]={token:'broad-setup-secret'};let installs=0;
 assert.deepEqual(await store().execute(job,async()=>{installs++;},post),{status:'failed',reason:'access'});
 assert.equal(installs,0);assert.equal(existsSync(journal),false);
});
test('recipient extra fields cannot enter a safe journal',async()=>{
 job.payload.managementResult.recipient.token='broad-setup-secret';
 assert.deepEqual(await store().execute(job,async()=>{throw Error('must not run');},post),{status:'failed',reason:'access'});assert.equal(existsSync(journal),false);
});
test('bounded authenticated delivery timeout releases busy work and permits the next background retry',async()=>{
 const s=store();await s.execute(job,async()=>{put();return{status:'done',rolled:true};},async()=>{throw Error('offline');});
 const original=AbortSignal.timeout;AbortSignal.timeout=()=>original(5);let aborted=false;
 try {await tick({appUrl:'https://control.test',token:'agent-secret',management:s,exec:async()=>({stdout:''}),log:()=>{},fetch:async(url,init)=>{
  if(url.endsWith('/access'))return new Promise((resolve,reject)=>init.signal.addEventListener('abort',()=>{aborted=true;reject(Error('timeout'));}));
  return Response.json({jobs:[],interval:10});
 }});for(let n=0;n<30&&!aborted;n++)await new Promise(r=>setTimeout(r,5));}finally{AbortSignal.timeout=original;}
 assert.equal(aborted,true);await s.resume(post);assert.equal(entry().reported,true);
});
test('installer rejection without a private file records unknown failure on recovery rather than rerunning export',async()=>{
 let installs=0;assert.equal(await store().execute(job,async()=>{installs++;throw Error('setup token must never be journaled');},post),null);
 await store().resume(post);assert.equal(installs,1);assert.deepEqual(entry().outcome,{status:'failed',reason:'access'});assert.equal(entry().reported,true);
});
