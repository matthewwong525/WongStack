import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {test} from 'node:test';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {prepare,configureHosted,installHosted} from '../../server/prepare-hosted.mjs';
import {SOURCE} from '../../server/install-wongstack.mjs';
const job={serviceUrl:'https://hosted.example.com',projectId:'11111111-1111-1111-1111-111111111111',token:'private-grant',gitUrl:'https://git.example.com/account/project.git',sourceRepo:'owner/WongStack',sourceCommit:'a'.repeat(40),ownerEmail:'owner@example.com',subject:'owner-1',subjectEmail:'owner@example.com',role:'owner'};
const refs=`${'a'.repeat(40)}\trefs/heads/main\n${'b'.repeat(40)}\trefs/tags/v1\n`;
function commands(_home,{legacy=false,missingTag=false}={}) {
 const calls=[];let pushed=false,origin=legacy?'https://github.com/owner/Existing.git':job.gitUrl;
 const exec=async(file,args)=>{
  assert.equal(file,'git');calls.push(args);
  let stdout='';
  if(args[0]==='-C' && args[1]===SOURCE && args.includes('rev-parse')) stdout=job.sourceCommit;
  else if(args[0]==='clone') {const dir=args.at(-1);mkdirSync(args.includes('--mirror')?dir:join(dir,'.git'),{recursive:true});if(args.includes('--mirror'))writeFileSync(join(dir,'HEAD'),'ref: refs/heads/main');}
  else if(args[0]==='ls-remote') stdout=args.at(-1)===job.gitUrl ? (pushed?(missingTag?refs.split('\n')[0]:refs):'') : refs;
  else if(args.includes('show-ref')) stdout=refs;
  else if(args.includes('push')) pushed=true;
  else if(args.includes('--git-common-dir')) stdout='.git';
  else if(args.includes('get-url')) stdout=origin;
  else if(args.includes('set-url')) origin=args.at(-1);
  return {stdout,stderr:''};
 };
 return {exec,calls,origin:()=>origin};
}
const fetchFn=async()=>({ok:true,status:200,json:async()=>job});
test('preparation leaves an empty repo, globally registers setup and preserves reconnect work',async()=>{
 const home=mkdtempSync(join(tmpdir(),'hosted-prepare-'));const fake=commands(home);
 try {
  const result=await prepare(job,{home,exec:fake.exec,fetchFn});
  assert.equal(result.verified,true);assert.equal(result.dir,join(home,'wongstack'));
  assert.equal(existsSync(join(result.dir,'app')),false);assert.equal(existsSync(join(result.dir,'.agents')),false);
  assert.equal(existsSync(join(home,'.claude','skills','wong-setup','SKILL.md')),true);
  assert.equal(existsSync(join(home,'.codex','skills','wong-setup','SKILL.md')),true);
  const before=fake.calls.filter(a=>a[0]==='clone').length;
  writeFileSync(join(result.dir,'unfinished.txt'),'keep');
  await prepare({...job,token:'rotated-grant'},{home,exec:fake.exec,fetchFn});
  assert.equal(fake.calls.filter(a=>a[0]==='clone').length,before);
  assert.equal(readFileSync(join(result.dir,'unfinished.txt'),'utf8'),'keep');
  assert.match(readFileSync(join(result.dir,'.git','wongstack-hosted.json'),'utf8'),/rotated-grant/);
 }finally{rmSync(home,{recursive:true,force:true});}
});
test('migration verifies full refs before switching the existing legacy clone and keeps local work',async()=>{
 const home=mkdtempSync(join(tmpdir(),'hosted-migrate-'));mkdirSync(join(home,'Existing','.git'),{recursive:true});writeFileSync(join(home,'Existing','local.txt'),'unfinished');
 const fake=commands(home,{legacy:true});
 try {
  const result=await prepare({...job,githubRepo:'owner/Existing'},{home,exec:fake.exec,fetchFn});
  assert.equal(result.dir,join(home,'Existing'));assert.equal(fake.origin(),job.gitUrl);
  assert.equal(readFileSync(join(result.dir,'local.txt'),'utf8'),'unfinished');
  assert.ok(fake.calls.some(a=>a.includes('github-backup')));
  const lastVerify=fake.calls.findLastIndex(a=>a.includes('show-ref'));
  const switchIndex=fake.calls.findIndex(a=>a.includes('set-url'));
  assert.ok(lastVerify<switchIndex);assert.equal(fake.calls.filter(a=>a.includes('fsck')).length,2);
 }finally{rmSync(home,{recursive:true,force:true});}
});
test('a missing destination tag refuses migration before the working origin changes',async()=>{
 const home=mkdtempSync(join(tmpdir(),'hosted-migrate-fail-'));mkdirSync(join(home,'Existing','.git'),{recursive:true});
 const fake=commands(home,{legacy:true,missingTag:true});
 try {
  await assert.rejects(prepare({...job,githubRepo:'owner/Existing'},{home,exec:fake.exec,fetchFn}),/migration refs differ/);
  assert.equal(fake.origin(),'https://github.com/owner/Existing.git');assert.equal(fake.calls.some(a=>a.includes('set-url')),false);
 }finally{rmSync(home,{recursive:true,force:true});}
});
test('a mismatched project grant stops before clone or credential configuration',async()=>{
 const home=mkdtempSync(join(tmpdir(),'hosted-grant-'));const fake=commands(home);
 try {
  await assert.rejects(prepare(job,{home,exec:fake.exec,fetchFn:async()=>({ok:true,json:async()=>({...job,projectId:'22222222-2222-2222-2222-222222222222'})})}),/grant differs/);
  assert.equal(fake.calls.length,1);assert.equal(existsSync(join(home,'.config')),false);
 }finally{rmSync(home,{recursive:true,force:true});}
});
test('Git helper uses shell-safe quoting for arbitrary home directory names',async()=>{
 const base=mkdtempSync(join(tmpdir(),'hosted-home-'));const home=join(base,"home with '$() `backticks`");mkdirSync(home);const fake=commands(home);
 try {
  await prepare(job,{home,exec:fake.exec,fetchFn});
  const helper=fake.calls.find(a=>a[0]==='config' && a[2].endsWith('.helper')).at(-1);
  assert.ok(helper.startsWith("!node '"));assert.ok(helper.includes("'\\''"));assert.ok(helper.endsWith("'"));
 }finally{rmSync(base,{recursive:true,force:true});}
});

test('member migration verifies existing backup objects without mirror-push and preserves the legacy clone',async()=>{
 const home=mkdtempSync(join(tmpdir(),'hosted-member-'));mkdirSync(join(home,'Existing','.git'),{recursive:true});writeFileSync(join(home,'Existing','local.txt'),'member work');
 const fake=commands(home,{legacy:true});
 try {
  const member={...job,role:'member',legacyRepo:'owner/Existing'};
  const result=await prepare(member,{home,exec:fake.exec,fetchFn:async()=>({ok:true,json:async()=>member})});
  assert.equal(result.dir,join(home,'Existing'));assert.equal(readFileSync(join(result.dir,'local.txt'),'utf8'),'member work');
  assert.equal(fake.calls.some(a=>a.includes('push')),false);assert.equal(fake.calls.filter(a=>a.includes('cat-file')).length,2);
  assert.equal(fake.calls.some(a=>a.includes('set-url')),true);
 }finally{rmSync(home,{recursive:true,force:true});}
});

test('an installed migration obtains hosted config without overwriting app code or its old install record',async()=>{
 const home=mkdtempSync(join(tmpdir(),'hosted-configure-'));const root=join(home,'Existing'),common=join(root,'.git');mkdirSync(common,{recursive:true});mkdirSync(join(root,'.agents'));mkdirSync(join(root,'app'));
 const record={upstream:{repo:'https://github.com/owner/WongStack'},components:{memory:{worker:'https://old-memory.example.com/_memory'}},custom:'keep'};
 writeFileSync(join(common,'wongstack-hosted.json'),JSON.stringify(job));writeFileSync(join(root,'.agents','.wong-stack.json'),JSON.stringify(record));writeFileSync(join(root,'app','local.ts'),'keep local app');
 const exec=async(_file,args)=>({stdout:args.includes('--git-common-dir')?`${root}\n${common}\n${common}`:root});
 try {
  const result=await configureHosted({cwd:root,exec,fetchFn:async url=>({ok:true,json:async()=>new URL(url).pathname==='/v1/workspace' ? job : {wrangler:{name:'hosted'},installRecordMemory:{worker:'https://new-memory.example.com/_memory'},env:{}}})});
  assert.equal(result.configurationOnly,true);assert.equal(result.wrangler.name,'hosted');
  assert.equal(readFileSync(join(root,'app','local.ts'),'utf8'),'keep local app');
  assert.deepEqual(JSON.parse(readFileSync(join(root,'.agents','.wong-stack.json'),'utf8')),record);
 }finally{rmSync(home,{recursive:true,force:true});}
});

function plannedInstall() {
 const home=mkdtempSync(join(tmpdir(),'hosted-planned-install-'));const root=join(home,'wongstack'),common=join(root,'.git');
 mkdirSync(common,{recursive:true});mkdirSync(join(root,'openspec','changes','setup'),{recursive:true});mkdirSync(join(root,'.scratch'));
 writeFileSync(join(common,'wongstack-hosted.json'),JSON.stringify(job));
 writeFileSync(join(root,'openspec','config.yaml'),'schema: spec-driven\n');
 writeFileSync(join(root,'openspec','changes','setup','proposal.md'),'# My approved setup plan\n');
 writeFileSync(join(root,'.scratch','review-note'),'keep temporary work');
 const files=execFileSync('git',['-C',SOURCE,'ls-files','-z','--cached','--others','--exclude-standard'],{encoding:'utf8'});
 const exec=async(_file,args)=>({stdout:args.includes('--git-common-dir')?`${root}\n${common}\n${common}`:args.includes('ls-files')?files:args.includes('HEAD')?job.sourceCommit:args.includes('get-url')?'https://github.com/owner/WongStack.git':root});
 const result={wrangler:{name:'hosted-project',main:'worker/index.ts'},installRecordMemory:{worker:'https://memory.example.com/_memory'},env:{},memory:{protocolVersion:1,installationId:'installation-1',repositoryId:'repository-1',appUrl:'https://project.example.com',memoryOrigin:'https://memory.example.com',status:'pending-owner',reason:'owner-unconfirmed',action:{kind:'confirm-owner',url:'https://project.example.com/apps/devices/',operatorConfirmationRequired:true}}};
 return {home,root,common,exec,result};
}
test('first setup accepts its existing OpenSpec plan and preserves plan/scratch contents',async()=>{
 const s=plannedInstall();
 try {
  const result=await installHosted({cwd:s.root,exec:s.exec,fetchFn:async()=>({ok:true,json:async()=>s.result})});
  assert.equal(result.installed,true);assert.equal(result.memory.status,'pending-owner');
  assert.equal(readFileSync(join(s.root,'openspec','changes','setup','proposal.md'),'utf8'),'# My approved setup plan\n');
  assert.equal(readFileSync(join(s.root,'.scratch','review-note'),'utf8'),'keep temporary work');
  assert.equal(JSON.parse(readFileSync(join(s.root,'app','wrangler.jsonc'),'utf8')).name,'hosted-project');
  assert.equal(existsSync(join(s.common,'wongstack-installing.json')),false);
 }finally{rmSync(s.home,{recursive:true,force:true});}
});
test('an interrupted config write leaves setup resumable without replacing local app work',async()=>{
 const s=plannedInstall();const target=join(s.home,'untouched-target');writeFileSync(target,'keep');
 try {
  await assert.rejects(installHosted({cwd:s.root,exec:s.exec,fetchFn:async()=>{symlinkSync(target,join(s.root,'app','wrangler.jsonc'));return {ok:true,json:async()=>s.result};}}),/unsafe credential file/);
  assert.equal(existsSync(join(s.root,'.agents','.wong-stack.json')),false);
  assert.equal(existsSync(join(s.common,'wongstack-installing.json')),true);
  assert.equal(readFileSync(target,'utf8'),'keep');
  rmSync(join(s.root,'app','wrangler.jsonc'));writeFileSync(join(s.root,'app','local-notes'),'keep work after interrupted setup');
  assert.equal((await installHosted({cwd:s.root,exec:s.exec,fetchFn:async()=>({ok:true,json:async()=>s.result})})).installed,true);
  assert.equal(readFileSync(join(s.root,'app','local-notes'),'utf8'),'keep work after interrupted setup');
 }finally{rmSync(s.home,{recursive:true,force:true});}
});
test('first setup refuses a symlinked planning folder without overwriting its target',async()=>{
 const s=plannedInstall();const external=join(s.home,'external');mkdirSync(external);writeFileSync(join(external,'work'),'keep');rmSync(join(s.root,'openspec'),{recursive:true,force:true});symlinkSync(external,join(s.root,'openspec'));
 try {
  await assert.rejects(installHosted({cwd:s.root,exec:s.exec,fetchFn:async()=>{throw new Error('must not provision');}}),/unsafe setup planning directory/);
  assert.equal(readFileSync(join(external,'work'),'utf8'),'keep');assert.equal(existsSync(join(s.root,'app')),false);
 }finally{rmSync(s.home,{recursive:true,force:true});}
});

test('a migration on a new VM configures Git identity when the old legacy clone is absent',async()=>{
 const home=mkdtempSync(join(tmpdir(),'hosted-new-migration-'));const fake=commands(home);
 try {
  const result=await prepare({...job,githubRepo:'owner/Existing'},{home,exec:fake.exec,fetchFn});
  assert.equal(result.dir,join(home,'wongstack'));
  assert.ok(fake.calls.some(args=>args.includes('user.email') && args.at(-1)===job.ownerEmail));
 }finally{rmSync(home,{recursive:true,force:true});}
});

test('fresh teammate authorship uses verified membership email and rejects a forged handoff email',async()=>{
 const home=mkdtempSync(join(tmpdir(),'hosted-member-email-'));const fake=commands(home);const member={...job,subject:'member-2',subjectEmail:'member@example.com',role:'member'};
 const fetchFn=async()=>({ok:true,json:async()=>member});
 try {
  await assert.rejects(prepare({...member,subjectEmail:job.ownerEmail},{home,exec:fake.exec,fetchFn}),/workspace grant differs/);
  assert.equal(fake.calls.some(args=>args.includes('user.email')),false);
  await prepare(member,{home,exec:fake.exec,fetchFn});
  assert.ok(fake.calls.some(args=>args.includes('user.email') && args.at(-1)==='member@example.com'));
  assert.equal(fake.calls.some(args=>args.includes('user.email') && args.at(-1)===job.ownerEmail),false);
  const count=fake.calls.filter(args=>args.includes('user.email')).length;
  await prepare(member,{home,exec:fake.exec,fetchFn});
  assert.equal(fake.calls.filter(args=>args.includes('user.email')).length,count,'reconnect preserves locally configured authorship');
 }finally{rmSync(home,{recursive:true,force:true});}
});

function installedHosted(role='member') {
 const home=mkdtempSync(join(tmpdir(),'hosted-resume-')),root=join(home,'wongstack'),common=join(root,'.git');
 mkdirSync(common,{recursive:true});mkdirSync(join(root,'.agents'));mkdirSync(join(root,'app'));
 const context=role==='owner' ? job : {...job,role,subject:'member-2',subjectEmail:'member@example.com'};
 const {token:_token,...metadata}=job;
 const record={hosted:metadata,custom:'keep',components:{memory:{installationId:'installation-1'}}};
 writeFileSync(join(common,'wongstack-hosted.json'),JSON.stringify(context));
 writeFileSync(join(root,'.agents','.wong-stack.json'),JSON.stringify(record));writeFileSync(join(root,'app','local.ts'),'unpublished local work');
 writeFileSync(join(root,'.env'),'# preserve local settings\nCUSTOM_SETTING=keep\n');
 const memory={protocolVersion:1,installationId:'installation-1',repositoryId:'repository-1',appUrl:'https://project.example.com',memoryOrigin:'https://memory.example.com',status:'pending-owner',reason:'owner-unconfirmed',action:{kind:'confirm-owner',url:'https://project.example.com/apps/devices/',operatorConfirmationRequired:true}};
 const status={...job,setup:'ready',accessVerified:true,stopped:false,memory,production:{sha:'b'.repeat(40),version:'22222222-2222-2222-2222-222222222222',url:memory.appUrl},productionUrl:memory.appUrl};
 const exec=async(_file,args)=>({stdout:args.includes('--git-common-dir')?`${root}\n${common}\n${common}`:root});
 const calls=[];
 const fetchFn=async(url,options)=>{
  const path=new URL(url).pathname;calls.push({path,method:options.method});
  assert.equal(options.method,'GET','resume must never provision infrastructure or issue writes');
  assert.ok(['/v1/workspace','/v1/status'].includes(path));
  return {ok:true,json:async()=>path==='/v1/workspace' ? context : status};
 };
 return {home,root,common,context,record,memory,status,exec,calls,fetchFn};
}
test('same-project teammate and owner setup resume published pins without provisioning or changing local work',async()=>{
 for(const role of ['member','owner']) {
  const s=installedHosted(role);
  try {
   const result=await configureHosted({cwd:s.root,exec:s.exec,fetchFn:s.fetchFn});
   assert.equal(result.existingProject,true);assert.equal(result.hosted.role,role);
   assert.equal(result.production.sha,s.status.production.sha);assert.equal(result.memory.status,'pending-owner');
   assert.equal(result.memory.action.url,'https://project.example.com/apps/devices/');assert.equal(result.enrollmentPending,true);
   assert.deepEqual(s.calls.map(row=>row.path),['/v1/workspace','/v1/status']);
   assert.deepEqual(JSON.parse(readFileSync(join(s.root,'.agents','.wong-stack.json'),'utf8')),s.record);
   assert.equal(readFileSync(join(s.root,'app','local.ts'),'utf8'),'unpublished local work');
   assert.equal(readFileSync(join(s.root,'.env'),'utf8'),'# preserve local settings\nCUSTOM_SETTING=keep\n');
   assert.equal(JSON.parse(readFileSync(join(s.common,'wongstack-hosted.json'),'utf8')).token,job.token);
  }finally{rmSync(s.home,{recursive:true,force:true});}
 }
});
test('a project-global ready result never claims this teammate computer is enrolled',async()=>{
 const s=installedHosted();s.status.memory={...s.memory,status:'ready',reason:null,action:null};
 try {
  const result=await configureHosted({cwd:s.root,exec:s.exec,fetchFn:s.fetchFn});
  assert.equal(result.memory.status,'pending-device');assert.equal(result.memory.reason,'no-current-device');
  assert.deepEqual(result.memory.action,{kind:'connect-device',url:'https://project.example.com/apps/devices/',operatorConfirmationRequired:false});
 }finally{rmSync(s.home,{recursive:true,force:true});}
});
test('unpublished, stopped or unprotected hosted sites keep enrollment pending without offering Devices',async()=>{
 for(const patch of [{production:null},{accessVerified:false},{stopped:true},{setup:'pending',production:null,memory:{status:'pending-owner'}}]) {
  const s=installedHosted();Object.assign(s.status,patch);
  try {
   const result=await configureHosted({cwd:s.root,exec:s.exec,fetchFn:s.fetchFn});
   assert.equal(result.enrollmentPending,true);assert.equal(result.memory?.action??null,null);
   if(patch.accessVerified===false) assert.equal(result.memory.reason,'access-unverified');
   if(patch.production===null) assert.equal(result.production,null);
  }finally{rmSync(s.home,{recursive:true,force:true});}
 }
});
test('resume rejects a different committed project and unverified service identities or production pins',async()=>{
 for(const scenario of ['record-project','record-service','record-git','grant-subject','status-project','production-sha','production-version','production-origin','production-url','missing-memory']) {
  const s=installedHosted();
  if(scenario==='record-project') s.record.hosted.projectId='33333333-3333-3333-3333-333333333333';
  if(scenario==='record-service') s.record.hosted.serviceUrl='https://other.example.com';
  if(scenario==='record-git') s.record.hosted.gitUrl='https://git.example.com/other.git';
  if(scenario==='grant-subject') s.context.subject='forged-subject';
  if(scenario==='status-project') s.status.projectId='33333333-3333-3333-3333-333333333333';
  if(scenario==='production-sha') s.status.production.sha='not-a-commit';
  if(scenario==='production-version') s.status.production.version='not-a-version';
  if(scenario==='production-origin') s.status.production.url='https://other.example.com';
  if(scenario==='production-url') s.status.productionUrl='https://other.example.com';
  if(scenario==='missing-memory') delete s.status.memory;
  writeFileSync(join(s.root,'.agents','.wong-stack.json'),JSON.stringify(s.record));
  try {
   const message=scenario.startsWith('record-') ? 'installed hosted project differs' : scenario==='grant-subject' ? 'workspace grant differs' : scenario==='status-project' ? 'hosted status project differs' : scenario==='missing-memory' ? 'hosted memory pins are missing' : 'hosted production pins differ';
   await assert.rejects(configureHosted({cwd:s.root,exec:s.exec,fetchFn:s.fetchFn}),{message});
   assert.equal(s.calls.some(row=>row.method!=='GET'),false);
  }finally{rmSync(s.home,{recursive:true,force:true});}
 }
});
test('a member cannot provision a legacy migration or copy a fresh payload before owner setup',async()=>{
 for(const installed of [true,false]) {
  const s=installedHosted();
  if(installed) {delete s.record.hosted;writeFileSync(join(s.root,'.agents','.wong-stack.json'),JSON.stringify(s.record));}
  else rmSync(join(s.root,'.agents'),{recursive:true});
  try {
   await assert.rejects((installed?configureHosted:installHosted)({cwd:s.root,exec:s.exec,fetchFn:s.fetchFn}),/owner must/);
   assert.deepEqual(s.calls.map(row=>row.path),['/v1/workspace']);
   assert.equal(existsSync(join(s.common,'wongstack-installing.json')),false);
   assert.equal(existsSync(join(s.root,'app','wrangler.jsonc')),false);
   assert.equal(readFileSync(join(s.root,'app','local.ts'),'utf8'),'unpublished local work');
  }finally{rmSync(s.home,{recursive:true,force:true});}
 }
});
test('installed resume rejects a symlinked record before calling the service',async()=>{
 const s=installedHosted(),file=join(s.root,'.agents','.wong-stack.json'),external=join(s.home,'other-record');
 writeFileSync(external,JSON.stringify(s.record));rmSync(file);symlinkSync(external,file);
 try {
  await assert.rejects(configureHosted({cwd:s.root,exec:s.exec,fetchFn:s.fetchFn}),/unsafe credential file/);
  assert.deepEqual(s.calls,[]);assert.deepEqual(JSON.parse(readFileSync(external,'utf8')),s.record);
 }finally{rmSync(s.home,{recursive:true,force:true});}
});
