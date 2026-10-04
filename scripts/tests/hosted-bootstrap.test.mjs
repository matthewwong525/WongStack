import assert from 'node:assert/strict';
import { chownSync, chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { artifactsRemote, checkedContext, privateContextPath, verifyHostedContext } from '../../.agents/skills/wong-sync/scripts/hosted-context.mjs';
import { bootstrapHosted, checkedBootstrap } from '../../server/hosted/bootstrap.mjs';
import { hostedBootstrapJob } from '../../server/agent/hosted.mjs';
import { runJob, CONTRACT } from '../../server/agent/agent.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const SHA='a'.repeat(40),SOURCE='b'.repeat(40),REMOTE='https://account.artifacts.cloudflare.net/git/customer/project.git';
const JOB={version:1,provider:'artifacts',projectId:'project',generation:1,remote:REMOTE,sourceCommit:SOURCE,starterCommit:SHA,token:'delivery-scoped-secret',folder:'project',gitToken:`art_v1_${'f'.repeat(40)}?expires=9999999999`,ownerName:'Owner',ownerEmail:'owner@example.com'};
function fixture(t,options={}) {
 const scratch=mkdtempSync(join(tmpdir(),'bootstrap-')),home=join(scratch,'home'),dir=join(home,'project');
 const original=process.geteuid(),uid=original||1000;
 chmodSync(scratch,0o755);
 mkdirSync(home);if(original===0){chownSync(home,uid,uid);process.seteuid(uid);}
 const calls=[],projects=[],workspaces=[],terminals=[];
 const put=(file,value)=>{mkdirSync(dirname(file),{recursive:true});writeFileSync(file,value);};
 const seed=()=>{mkdirSync(join(dir,'.git'),{recursive:true});put(join(dir,'.agents/.wong-stack.json'),JSON.stringify({commit:options.source??SOURCE,components:{memory:null}}));};
 if(options.existing)seed();
 let failed=false;
 const exec=async(name,args,config)=>{
  calls.push({name,args,config});
  assert.ok(!JSON.stringify(args).includes(JOB.token));assert.ok(!JSON.stringify(args).includes(JOB.gitToken));assert.ok(!('AGENT_TOKEN' in (config.env??{})));assert.ok(!('CLOUDFLARE_API_TOKEN' in (config.env??{})));
  if(options.fail&&!failed&&args.includes(options.fail)){failed=true;throw Error('output with secret');}
  const answer=value=>({stdout:typeof value==='string'?value:JSON.stringify(value)});
  if(args.includes('clone')){seed();return answer('');}
  if(args.includes('get-url'))return answer(options.remote??REMOTE);
  if(args.includes('--show-toplevel'))return answer(dir);
  if(args.includes('rev-parse'))return answer(options.head??SHA);
  if(name==='paseo') {
   if(args[0]==='project'&&args[1]==='ls')return answer(projects);
   if(args[0]==='project'&&args[1]==='create'){projects.push({path:dir});return answer({});}
   if(args[0]==='workspace'&&args[1]==='ls')return answer(workspaces);
   if(args[0]==='workspace'&&args[1]==='create'){const item={workspaceId:`w${workspaces.length}`,path:dir,title:args[args.indexOf('--title')+1]};workspaces.push(item);return answer(item);}
   if(args[0]==='terminal'&&args[1]==='ls')return answer(terminals.filter(item=>item.workspaceId===args[args.indexOf('--workspace')+1]));
   if(args[0]==='terminal'&&args[1]==='create'){const item={id:`t${terminals.length}`,workspaceId:args[args.indexOf('--workspace')+1],name:args[args.indexOf('--name')+1]};terminals.push(item);return answer(item);}
   return answer({});
  }
  return answer('');
 };
 const fetch=async(url,config)=>{assert.match(url,/\/api\/hosted\/projects\/project\/context$/);assert.equal(config.headers.Authorization,`Bearer ${JOB.token}`);assert.ok(!config.body.includes(JOB.token));return{ok:options.authorized!==false,json:async()=>({ok:true,projectId:'project',generation:1,remote:REMOTE,sourceCommit:SOURCE,starterCommit:SHA,...options.receipt})};};
 t.after(()=>{if(original===0)process.seteuid(original);rmSync(scratch,{recursive:true,force:true});});
 return {home,dir,uid,user:'fixture',exec,fetch,calls,projects,workspaces,terminals,put,seed};
}
test('the official Artifacts HTTPS remote and explicit required fields are enforced',()=>{
 assert.equal(artifactsRemote(REMOTE),REMOTE);assert.equal(checkedBootstrap(JOB).ownerEmail,'owner@example.com');
 for(const value of ['https://account.artifacts.cloudflare.com/git/ns/repo.git','https://evil.test/repo','https://x@account.artifacts.cloudflare.net/git/ns/repo.git',`${REMOTE}?token=x`,REMOTE.replace('/git/','/other/'),'file:///repo'])assert.throws(()=>artifactsRemote(value));
 for(const field of ['projectId','sourceCommit','starterCommit','folder','gitToken','ownerEmail','ownerName','token'])assert.throws(()=>checkedBootstrap({...JOB,[field]:undefined}),field);
 for(const patch of [{generation:-1},{gitToken:'bad"config\\escape'},{token:'contains\x00controlchars'},{projectId:'x/../../y'},{folder:'..'},{ownerName:'x\n'},{ownerEmail:'1+name@users.noreply.github.com'}])assert.throws(()=>checkedBootstrap({...JOB,...patch}));
 assert.throws(()=>checkedContext(null));
});
test('bootstrap verifies authority, clones once, preserves later work and reuses Paseo without provisioning',async t=>{
 const box=fixture(t);const result=await bootstrapHosted(JOB,box);assert.equal(result.status,'done');assert.equal('memory' in result.hosted,false);
 box.put(join(box.dir,'customer-work.txt'),'keep me');
 assert.equal((await bootstrapHosted(JOB,box)).status,'done');
 assert.equal(box.calls.filter(call=>call.args.includes('clone')).length,1);assert.equal(box.projects.length,1);assert.equal(box.workspaces.length,3);assert.equal(box.terminals.length,2);
 assert.ok(!box.calls.some(call=>['npm','gh','wrangler'].includes(call.name)||call.args.includes('checkout')||call.args.includes('reset')||call.args.includes('push')));
 assert.equal(readFileSync(join(box.dir,'customer-work.txt'),'utf8'),'keep me');
 const context=await verifyHostedContext({...box,remote:REMOTE});assert.equal(context.token,undefined);
 assert.ok(!JSON.stringify(result).includes('secret'));assert.ok(!JSON.stringify(result).includes(JOB.ownerEmail));
});
test('reconnect after a failed fixed Paseo action completes the same project',async t=>{
 const box=fixture(t,{fail:'send-keys'});assert.equal((await bootstrapHosted(JOB,box)).status,'failed');
 assert.equal((await bootstrapHosted(JOB,box)).status,'done');assert.equal(box.projects.length,1);assert.equal(box.workspaces.length,3);assert.equal(box.terminals.length,2);
});
for(const options of [{authorized:false},{receipt:{generation:2}},{receipt:{remote:REMOTE.replace('project.git','foreign.git')}},{existing:true,remote:REMOTE.replace('project.git','foreign.git')},{source:'c'.repeat(40)},{head:'c'.repeat(40)}])test(`foreign or unverifiable context fails closed: ${JSON.stringify(options)}`,async t=>{
 const box=fixture(t,options);const result=await bootstrapHosted(JOB,box);assert.equal(result.status,'failed');assert.equal(box.projects.length,0);
 if(options.authorized===false||options.receipt||options.existing)assert.ok(!box.calls.some(call=>call.args.includes('clone')));
});
test('missing context, weak permissions, stale binding and symlink targets never grant authority',async t=>{
 const box=fixture(t);await assert.rejects(verifyHostedContext({...box,remote:REMOTE}));
 assert.equal((await bootstrapHosted(JOB,box)).status,'done');const file=privateContextPath(box.home,box.dir);
 chmodSync(file,0o644);await assert.rejects(verifyHostedContext({...box,remote:REMOTE}));assert.equal((await bootstrapHosted(JOB,box)).reason,'path_conflict');chmodSync(file,0o600);
 const value=JSON.parse(readFileSync(file));value.generation=2;writeFileSync(file,JSON.stringify(value));assert.equal((await bootstrapHosted(JOB,box)).reason,'reconnect');
 writeFileSync(file,JSON.stringify(checkedContext(JOB)));rmSync(join(box.dir,'.git'),{recursive:true});symlinkSync(box.home,join(box.dir,'.git'));assert.equal((await bootstrapHosted(JOB,box)).reason,'path_conflict');
});
test('agent strips arbitrary helper output and negotiates contract 5 while keeping legacy jobs',async()=>{
 assert.equal(CONTRACT,5);
 const hosted={projectId:JOB.projectId,generation:1,sourceCommit:SOURCE,starterCommit:SHA,repository:'ready',workspace:'ready'};
 const calls=[];
 const exec=async(name,args,config)=>{calls.push({name,args,config});return{stdout:JSON.stringify({status:'done',hosted:{...hosted,token:'must not escape'}})};};
 assert.deepEqual(await runJob({type:'hosted-bootstrap',payload:JOB},exec),{status:'done',hosted});assert.equal(calls[0].name,'runuser');assert.ok(!JSON.stringify(calls[0].args).includes(JOB.token));assert.ok(calls[0].config.input.includes(JOB.token));
 assert.deepEqual(await hostedBootstrapJob({...JOB,generation:-1},exec),{status:'rejected'});
 assert.equal((await hostedBootstrapJob(JOB,async()=>({stdout:JSON.stringify({status:'done',hosted:{...hosted,projectId:'foreign'}})}))).status,'failed');
 assert.equal((await hostedBootstrapJob(JOB,async()=>({stdout:'secret output'}))).status,'failed');
 assert.deepEqual(await runJob({type:'unknown'},exec),{status:'rejected'});
 assert.deepEqual(await runJob({type:'resume'},exec),{status:'done'});
});
test('actual fixed bootstrap CLI rejects invalid input without leaking it',()=>{
 const result=spawnSync(process.execPath,[join(root,'server/hosted/bootstrap.mjs')],{input:'{"token":"private-invalid"}',encoding:'utf8'});assert.equal(result.status,0);assert.deepEqual(JSON.parse(result.stdout),{status:'rejected'});assert.ok(!result.stdout.includes('private-invalid'));
});
