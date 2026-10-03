import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, statSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { credential, command, request, safeContext, validateContext, loadContext, writeSecrets, initialBranch } from '../../.agents/skills/save/scripts/hosted.mjs';
import { verifyRefs } from '../../server/prepare-hosted.mjs';
const context={serviceUrl:'https://hosted.example.com',projectId:'11111111-1111-1111-1111-111111111111',token:'private-machine-token',gitUrl:'https://git.example.com/account/namespace/repo.git',sourceRepo:'owner/WongStack',sourceCommit:'a'.repeat(40),ownerEmail:'owner@example.com',subject:'owner-1',subjectEmail:'owner@example.com',role:'owner'};
const response=value=>({ok:true,status:200,json:async()=>value});
test('context rejects unsafe destinations and leaves credentials out of reports',()=>{
  for(const url of ['http://hosted.example.com','https://user:secret@hosted.example.com','https://hosted.example.com/?secret']) assert.throws(()=>validateContext({...context,serviceUrl:url}));
  assert.throws(()=>validateContext({...context,sourceCommit:'main'}));
  assert.equal(JSON.stringify(safeContext(context)).includes(context.token),false);
});
test('Git credential protocol never sends access to another project or host',async()=>{
  const seen=[];const options={fetchFn:async(url,init)=>{seen.push({url:String(url),init});return response({token:'ephemeral',username:'x-token-auth',gitUrl:context.gitUrl});}};
  for(const input of ['protocol=https\nhost=other.example.com\npath=account/namespace/repo.git\n','protocol=https\nhost=git.example.com\npath=account/namespace/other.git\n','protocol=http\nhost=git.example.com\npath=account/namespace/repo.git\n']) assert.equal(await credential(context,input,options),'');
  assert.equal(seen.length,0);
  assert.equal(await credential(context,'protocol=https\nhost=git.example.com\npath=account/namespace/repo.git\n',options),'username=x-token-auth\npassword=ephemeral\n\n');
  assert.equal(seen[0].init.redirect,'manual');
  assert.equal(seen[0].init.headers.Authorization,`Bearer ${context.token}`);
});
test('redirects and provider errors cannot disclose credential values',async()=>{
  await assert.rejects(request(context,'/v1/status',undefined,{fetchFn:async()=>({ok:false,status:302,json:async()=>({token:context.token})})}),error=>error.message==='hosted operation refused: HTTP 302');
});
test('setup writes private settings but returns no machine or memory key',async()=>{
  const primary=mkdtempSync(join(tmpdir(),'hosted-client-'));const common=join(primary,'.git');mkdirSync(common);
  const local={...context,primary,common};writeFileSync(join(primary,'.env'),'OTHER_KEY=kept\n');
  try {
    const result=await command('setup',[],local,{fetchFn:async()=>response({wrangler:{name:'project'},installRecordMemory:{url:'https://memory.example.com'},env:{CLOUDFLARE_MEMORY_URL:'https://memory.example.com',CLOUDFLARE_MEMORY_KEY:'private-memory-key'},memoryKey:'private-memory-key'})});
    assert.equal(JSON.stringify(result).includes('private-'),false);
    assert.match(readFileSync(join(primary,'.env'),'utf8'),/OTHER_KEY=kept/);
    assert.equal(statSync(join(primary,'.env')).mode&0o777,0o600);
    const state=JSON.parse(readFileSync(join(common,'wongstack-hosted.json'),'utf8'));assert.equal(state.token,undefined);
    const cwd=join(primary,'linked');mkdirSync(cwd);
    const exec=async(_file,args)=>({stdout:args.includes('--git-common-dir') ? `${cwd}\n${common}/worktrees/linked\n${common}` : primary});
    const restored=await loadContext({cwd,exec,env:{}});assert.equal(restored.token,context.token);assert.equal(restored.primary,primary);
  } finally {rmSync(primary,{recursive:true,force:true});}
});
test('wait rejects mismatched commit evidence and keeps queued timeout unknown',async()=>{
  await assert.rejects(command('wait',['a'.repeat(40),'refs/heads/main'],context,{fetchFn:async()=>response({sha:'b'.repeat(40),ref:'refs/heads/main',status:'passed'})}),/identity mismatch/);
  let calls=0;await assert.rejects(command('wait',['a'.repeat(40),'refs/heads/main'],context,{sleep:async()=>{},fetchFn:async()=>{calls++;return response({sha:'a'.repeat(40),ref:'refs/heads/main',status:'queued'});}}),/timed out/);assert.equal(calls,90);
});
test('full-ref verification detects missing tags and changed identities',()=>{
  const refs=`${'a'.repeat(40)}\trefs/heads/main\n${'b'.repeat(40)}\trefs/tags/v1\n`;
  assert.equal(verifyRefs(refs,refs.split('\n').filter(Boolean).reverse().join('\n')),true);
  assert.throws(()=>verifyRefs(refs,`${'a'.repeat(40)}\trefs/heads/main\n`),/differ/);
  assert.throws(()=>verifyRefs(refs,refs.replace('b'.repeat(40),'c'.repeat(40))),/differ/);
});

test('secret updates preserve unrelated syntax and refuse symlink targets',()=>{
  const primary=mkdtempSync(join(tmpdir(),'hosted-secrets-'));
  try {
    const file=join(primary,'.env');writeFileSync(file,'# keep comment\nexport OTHER_KEY="kept value"\ncustom=value\nexport WONGSTACK_HOSTED_TOKEN=old\nWONGSTACK_HOSTED_TOKEN=duplicate\n');
    writeSecrets({primary},{WONGSTACK_HOSTED_TOKEN:'new'});
    assert.equal(readFileSync(file,'utf8'),'# keep comment\nexport OTHER_KEY="kept value"\ncustom=value\nWONGSTACK_HOSTED_TOKEN=new\n');
    const target=join(primary,'target');writeFileSync(target,'keep');rmSync(file);symlinkSync(target,file);
    assert.throws(()=>writeSecrets({primary},{WONGSTACK_HOSTED_TOKEN:'replace'}),/unsafe credential file/);
    assert.equal(readFileSync(target,'utf8'),'keep');
    assert.throws(()=>writeSecrets({primary},{WONGSTACK_HOSTED_TOKEN:'line\nbreak'}));
  } finally {rmSync(primary,{recursive:true,force:true});}
});

test('pending installation memory returns its owner action without claiming device readiness',async()=>{
  const primary=mkdtempSync(join(tmpdir(),'hosted-enrollment-'));const common=join(primary,'.git');mkdirSync(common);
  const memory={protocolVersion:1,installationId:'installation-1',repositoryId:'repository-1',appUrl:'https://project.example.com',memoryOrigin:'https://memory.example.com',status:'pending-owner',reason:'owner-unconfirmed',action:{kind:'confirm-owner',url:'https://project.example.com/apps/devices/',operatorConfirmationRequired:true}};
  try {
    const result=await command('setup',[],{...context,primary,common},{fetchFn:async()=>response({wrangler:{name:'project'},installRecordMemory:{installationId:'installation-1'},env:{},memory})});
    assert.equal(result.memory.status,'pending-owner');assert.equal(result.memory.action.operatorConfirmationRequired,true);
    assert.equal(JSON.stringify(result).includes(context.token),false);
    assert.equal(readFileSync(join(primary,'.env'),'utf8').includes('CLOUDFLARE_MEMORY_TOKEN'),false);
    await assert.rejects(command('setup',[],{...context,primary,common},{fetchFn:async()=>response({wrangler:{name:'project'},installRecordMemory:{},env:{},memory:{...memory,action:{...memory.action,url:'https://other.example.com/apps/devices/'}}})}),/invalid memory enrollment action/);
  }finally{rmSync(primary,{recursive:true,force:true});}
});

test('publication requires exact approved SHA and verified default-ref advancement',async()=>{
  const sha='a'.repeat(40);const receipt={sha,status:'published',version:'version-1',defaultRef:'refs/heads/main',defaultSha:sha};
  assert.deepEqual(await command('publish',['approval-1',sha],context,{fetchFn:async()=>response(receipt)}),receipt);
  for(const bad of [{...receipt,defaultSha:'b'.repeat(40)},{...receipt,sha:'b'.repeat(40)},{...receipt,status:'deployed-awaiting-main'},{...receipt,defaultRef:'refs/heads/other'},{sha,status:'published',version:'version-1'}]) await assert.rejects(command('publish',['approval-1',sha],context,{fetchFn:async()=>response(bad)}),/acknowledgment is incomplete/);
  await assert.rejects(command('publish',['approval-1'],context),/approved commit required/);
});

test('only an unborn local main with no remote refs selects initial main save',async()=>{
 const run=({head=null,remote='',branch='refs/heads/main',headError=1,remoteError=false}={})=>async(_file,args)=>{
  if(args.includes('--verify')) {if(head===null) throw Object.assign(new Error('no HEAD'),{code:headError});return {stdout:head};}
  if(args.includes('ls-remote')) {if(remoteError) throw new Error('repository inaccessible');return {stdout:remote};}
  if(args.includes('symbolic-ref')) return {stdout:branch};
  throw new Error('unexpected Git operation');
 };
 const local={...context,root:'/prepared/project'};
 assert.deepEqual(await initialBranch(local,{exec:run()}),{initial:true,branch:'main'});
 assert.deepEqual(await initialBranch(local,{exec:run({head:'a'.repeat(40)})}),{initial:false});
 assert.deepEqual(await initialBranch(local,{exec:run({remote:`${'a'.repeat(40)}\trefs/heads/main`})}),{initial:false});
 assert.deepEqual(await initialBranch(local,{exec:run({branch:'refs/heads/user-work'})}),{initial:false,reason:'preserve-selected-branch'});
 await assert.rejects(initialBranch(local,{exec:run({headError:128})}),/no HEAD/);
 await assert.rejects(initialBranch(local,{exec:run({remoteError:true})}),/inaccessible/);
});

function detectorFixture({remote='https://github.com/owner/project.git',record=null,failure=null,committed=true}={}) {
 const root=mkdtempSync(join(tmpdir(),'hosted-detect-')),common=join(root,'.git');mkdirSync(common);
 const exec=async(_file,args)=>{
  if(args.includes('--git-common-dir')) return {stdout:`${root}\n${common}\n${common}`};
  if(args.includes('--show-toplevel')) return {stdout:root};
  if(args.includes('remote') && !args.includes('get-url')) return {stdout:remote===null?'':'origin'};
  if(args.includes('get-url')) {if(failure==='origin') throw new Error('origin inspection failed');return {stdout:remote};}
  if(args.includes('--verify')) {if(!committed)throw Object.assign(new Error('unborn HEAD'),{code:1});return {stdout:'a'.repeat(40)};}
  if(args.includes('ls-tree')) {if(failure==='record') throw new Error('record inspection failed');return {stdout:record===null?'':'.agents/.wong-stack.json'};}
  if(args.includes('show')) return {stdout:JSON.stringify(record)};
  throw new Error('unexpected inspection');
 };
 return {root,exec,clean:()=>rmSync(root,{recursive:true,force:true})};
}
test('a confirmed plain folder outside Git selects personal setup, while corrupt/inaccessible Git fails closed',async()=>{
 const root=mkdtempSync(join(tmpdir(),'outside-git-'));
 const absent=()=>Promise.reject(Object.assign(new Error('Git discovery failed'),{code:128,stderr:'fatal: not a git repository (or any of the parent directories): .git\n'}));
 try {
  assert.equal(await loadContext({cwd:root,exec:absent}),null);
  const boundary=()=>Promise.reject(Object.assign(new Error('Git discovery boundary'),{code:128,stderr:`fatal: not a git repository (or any parent up to mount point ${root})\nStopping at filesystem boundary (GIT_DISCOVERY_ACROSS_FILESYSTEM not set).\n`}));
  assert.equal(await loadContext({cwd:root,exec:boundary}),null);
  mkdirSync(join(root,'.git'));
  await assert.rejects(loadContext({cwd:root,exec:absent}),/Git discovery failed/);
  rmSync(join(root,'.git'),{recursive:true,force:true});
  const corrupt=()=>Promise.reject(Object.assign(new Error('corrupt Git marker'),{code:128,stderr:'fatal: invalid gitfile format\n'}));
  await assert.rejects(loadContext({cwd:root,exec:corrupt}),/corrupt Git marker/);
  const inaccessible=()=>Promise.reject(Object.assign(new Error('permission denied'),{code:128,stderr:'fatal: unable to access .git: Permission denied\n'}));
  await assert.rejects(loadContext({cwd:root,exec:inaccessible}),/permission denied/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('personal Git and unborn repositories remain personal after authoritative negative inspections',async()=>{
 for(const options of [{},{remote:null,committed:false},{remote:'/tmp/personal-backup.git',committed:false},{record:{components:{memory:{}}}}]) {
  const s=detectorFixture(options);
  try {assert.equal(await loadContext({cwd:s.root,exec:s.exec,env:{}}),null);}finally{s.clean();}
 }
});
test('missing hosted context refuses Artifacts origins or committed hosted hints without making API calls',async()=>{
 const oldFetch=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('must not authorize from hints');};
 try {
  for(const options of [
   {remote:'https://account.artifacts.cloudflare.net/git/namespace/project.git'},
   {remote:'git@account.artifacts.cloudflare.net:git/namespace/project.git'},
   {remote:'ssh://git@account.artifacts.cloudflare.net/git/namespace/project.git'},
   {record:{hosted:{...context,serviceUrl:'https://attacker.example.com',token:'untrusted-committed-token'}}}
  ]) {
   const s=detectorFixture(options);
   try {await assert.rejects(loadContext({cwd:s.root,exec:s.exec,env:{WONGSTACK_HOSTED_TOKEN:'not-authority-from-hints'}}),/hosted access missing; reconnect/);}finally{s.clean();}
  }
  assert.equal(calls,0);
 }finally{globalThis.fetch=oldFetch;}
});
test('failed origin or committed-record inspection never becomes a personal fallback',async()=>{
 for(const failure of ['origin','record']) {
  const s=detectorFixture({failure});
  try {await assert.rejects(loadContext({cwd:s.root,exec:s.exec,env:{}}),/inspection failed/);}finally{s.clean();}
 }
});

test('a broken private context symlink is an error, even with an otherwise personal origin',async()=>{
 const s=detectorFixture();symlinkSync(join(s.root,'missing-private-file'),join(s.root,'.git','wongstack-hosted.json'));
 try {await assert.rejects(loadContext({cwd:s.root,exec:s.exec,env:{}}),/unsafe credential file/);}finally{s.clean();}
});
