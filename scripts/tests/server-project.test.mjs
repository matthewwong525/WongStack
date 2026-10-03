import assert from 'node:assert/strict';
import { chownSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { connectPreserved, inspectCheckout } from '../../server/project-github.mjs';
import { prepareProject } from '../../server/prepare-project.mjs';
import { checkedProject, createProjectStore, prepareProjectJob } from '../../server/agent/project.mjs';
import { preserveGitHub } from '../../server/agent/github.mjs';
import { runJob } from '../../server/agent/agent.mjs';
import { asWorkspace, validateWorkspace, workspaceConfig, workspaceExec } from '../../server/agent/workspace.mjs';
function box(options={}) {
 const root=mkdtempSync(join(tmpdir(),'project-')),home=join(root,'home'),dir=join(home,'repo'),uid=process.getuid()||1000;
 const own=path=>{if(process.getuid()===0)chownSync(path,uid,uid);};
 const folder=path=>{mkdirSync(path,{recursive:true});own(path);};
 const put=(file,text)=>{folder(dirname(file));writeFileSync(file,text);own(file);};
 folder(home);if(!options.absent){folder(dir);folder(join(dir,'.git'));}
 if(!options.absent){put(join(dir,'package.json'),JSON.stringify({name:'fixture',version:'1.0.0'}));put(join(dir,'package-lock.json'),JSON.stringify({lockfileVersion:3}));}
 const calls=[];let failedOnce=false;const projects=[],workspaces=[],terminals=[];
 if(options.seed){projects.push({path:dir});for(const [index,name] of ['Sign in to Claude','Sign in to Codex','Start here (after you sign in)'].entries())workspaces.push({workspaceId:`seed-w${index}`,cwd:dir,name});for(let index=0;index<2;index++)terminals.push({id:`seed-t${index}`,workspaceId:`seed-w${index}`,cwd:dir,name:'Existing terminal'});}
 const exec=async(file,args,opts={})=>{
  calls.push({file,args,options:opts});assert.ok(!('AGENT_TOKEN' in (opts.env??{})));assert.ok(!Object.values(opts.env??{}).includes('host-secret'));
  if(options.failOnce&&!failedOnce&&[file,...args].join(' ').includes(options.failOnce)){failedOnce=true;throw Error('private output host-secret');}
  if(options.fail&&args.includes(options.fail))throw Error('private output host-secret');
  const answer=value=>({stdout:typeof value==='string'?value:JSON.stringify(value)});
  if(file==='gh'&&args.includes('user'))return answer({login:opts.env.GH_TOKEN?options.tokenLogin??'owner':options.storedLogin??'owner'});
  if(args.includes('--show-toplevel'))return answer(dir);
  if(args.includes('--absolute-git-dir'))return answer(options.gitDir??join(dir,'.git'));
  if(args.includes('get-url'))return answer(options.origin??'git@github.com:Owner/repo.git');
  if(args.includes('diff'))return answer(options.changed??'');
  if(options.untrackedNvmrc&&args.includes('ls-files')&&args.includes('.nvmrc'))throw Error('untracked runtime');
  if(args.includes('clone')){folder(dir);folder(join(dir,'.git'));return answer('');}
  if(file==='npm'&&args.includes('ci')){folder(join(dir,'node_modules'));return answer('');}
  if(args.includes('--version'))return answer(file==='node'?options.nodeVersion??'v22.19.0':'10.9.0');
  if(file==='paseo') {
   if(args[0]==='project'&&args[1]==='ls')return answer(projects);
   if(args[0]==='project'&&args[1]==='create'){projects.push({path:dir});return answer({projectId:'p1',path:dir});}
   if(args[0]==='workspace'&&args[1]==='ls')return answer(workspaces);
   if(args[0]==='workspace'&&args[1]==='create'){const value={workspaceId:`w${workspaces.length+1}`,cwd:dir,name:args[args.indexOf('--title')+1]};workspaces.push(value);return answer(value);}
   if(args[0]==='terminal'&&args[1]==='ls')return answer(terminals.filter(value=>value.workspaceId===args[args.indexOf('--workspace')+1]));
   if(args[0]==='terminal'&&args[1]==='create'){const value={id:`t${terminals.length+1}`,workspaceId:args[args.indexOf('--workspace')+1],cwd:dir,name:args[args.indexOf('--name')+1]};terminals.push(value);return answer(value);}
   return answer({});
  }
  return answer('');
 };
 const contract=value=>{folder(join(dir,'.wongstack'));put(join(dir,'.wongstack/project.json'),JSON.stringify(value));};
 return {root,home,dir,uid,user:'fixture',exec,calls,put,contract,workspaces,terminals,close:()=>rmSync(root,{recursive:true,force:true})};
}
const github={repo:'owner/repo',token:'private-token',login:'owner'};
const job={repo:'owner/repo',generation:7};
test('workspace identity validates names, passwd home, owner and symlinks; nondefault commands keep a clean environment',async()=>{
 assert.deepEqual(workspaceConfig(),{user:'wong',home:'/home/wong'});
 for(const env of [{WORKSPACE_USER:'root'},{WORKSPACE_USER:'bad;id'},{WORKSPACE_HOME:'/a/../b'},{WORKSPACE_HOME:'/'},{WORKSPACE_HOME:'/a b'}])assert.throws(()=>workspaceConfig(env));
 const b=box();try {
  const env={WORKSPACE_USER:'fixture',WORKSPACE_HOME:b.home};
  const identity=await validateWorkspace(env,async()=>({stdout:`fixture:x:${b.uid}:1001::${b.home}:/bin/bash`}));assert.equal(identity.uid,b.uid);
  await assert.rejects(validateWorkspace(env,async()=>({stdout:`fixture:x:0:0::${b.home}:/bin/bash`})));
  await assert.rejects(validateWorkspace(env,async()=>({stdout:`fixture:x:${b.uid}:1001::/other:/bin/bash`})));
  const calls=[];const exec=workspaceExec(async(file,args,options)=>{calls.push({file,args,options});return{stdout:JSON.stringify({url:'pair'})};},identity);
  await asWorkspace(exec,['node','tool']);assert.deepEqual(calls[0].args.slice(0,8),['-u','fixture','--','env','-i',`HOME=${b.home}`,'USER=fixture',`PATH=${b.home}/.local/bin:/usr/local/bin:/usr/bin:/bin`]);
  await runJob({type:'pair'},exec);assert.ok(calls.at(-1).args.includes(join(b.home,'.paseo')));assert.ok(!JSON.stringify(calls).includes('/home/wong'));
  const link=join(b.root,'link');symlinkSync(b.home,link);await assert.rejects(validateWorkspace({...env,WORKSPACE_HOME:link},async()=>({stdout:`fixture:x:${b.uid}:1001::${link}:/bin/bash`})));
 }finally{b.close();}
});
test('preserved GitHub scopes private auth, refuses foreign stored identity and reuses matching dirty checkout without git config or resets',async()=>{
 for(const options of [{},{storedLogin:'owner'},{absent:true}]) {
  const b=box(options);try{
   assert.deepEqual(await connectPreserved(github,b),{status:'done'});await connectPreserved(github,b);
   assert.equal(b.calls.filter(call=>call.args.includes('clone')).length,options.absent?1:0);
   assert.ok(!b.calls.some(call=>call.args.some(arg=>['login','setup-git','reset','clean','checkout','pull','config'].includes(arg))));
   assert.ok(!JSON.stringify(b.calls.map(call=>call.args)).includes(github.token));
   assert.equal(b.calls[0].options.env.GH_TOKEN,github.token);
  }finally{b.close();}
 }
});
test('foreign origins, folders, symlinks, backing worktree owner and token identity refuse without mutation',async()=>{
 for(const options of [{origin:'https://github.com/another/repo.git'},{tokenLogin:'other'},{storedLogin:'foreign'},{gitDir:'/definitely-missing'}]) {
  const b=box(options);try{const result=await connectPreserved(github,b);assert.equal(result.status,'failed');assert.ok(!b.calls.some(call=>call.args.includes('clone')));}finally{b.close();}
 }
 const b=box();try{rmSync(join(b.dir,'.git'),{recursive:true});symlinkSync(b.home,join(b.dir,'.git'));await assert.rejects(inspectCheckout(job.repo,b));}finally{b.close();}
 assert.deepEqual(await connectPreserved(github,{uid:0}),{status:'rejected'});
 assert.deepEqual(await connectPreserved({...github,login:'bad/login'},{uid:1000}),{status:'rejected'});
});
test('frozen dependencies, explicit configuration and Paseo retry without duplicate work or secret output',async()=>{
 const b=box();try{
  b.contract({version:1,requiredSettings:['APP_NAME','APP_NAME']});b.put(join(b.dir,'.env'),'APP_NAME=private-name\nOPTIONAL_SECRET=private-value\n');
  const result=await prepareProject(job,b);assert.deepEqual(result,{generation:7,clone:'done',dependencies:'done',configuration:'done',paseo:'done',missingSettings:[]});
  await prepareProject(job,b);assert.equal(b.calls.filter(c=>c.file==='npm'&&c.args.includes('ci')).length,1);assert.equal(b.calls.filter(c=>c.file==='paseo'&&c.args.includes('create')).length,6);
  b.put(join(b.dir,'package-lock.json'),JSON.stringify({lockfileVersion:3,changed:true}));await prepareProject(job,b);assert.equal(b.calls.filter(c=>c.args.includes('ci')).length,2);
  assert.ok(!JSON.stringify(result).includes('private-'));assert.ok(!JSON.stringify(b.calls).includes('AGENT_TOKEN'));
  assert.equal(readFileSync(join(b.dir,'.env'),'utf8'),'APP_NAME=private-name\nOPTIONAL_SECRET=private-value\n');
 }finally{b.close();}
});
test('unknown or incomplete configuration stays needs_input and reports names only; examples do not imply required keys',async()=>{
 const b=box();try{
  b.put(join(b.dir,'.env.example'),'OPS_KEY=\n');let result=await prepareProject(job,b);assert.equal(result.configuration,'needs_input');assert.deepEqual(result.missingSettings,[]);
  b.contract({version:1,requiredSettings:['REQUIRED']});b.put(join(b.dir,'.env'),"REQUIRED=''\nOPTIONAL=private\n");result=await prepareProject(job,b);assert.deepEqual(result.missingSettings,['REQUIRED']);assert.equal(result.reason,'configuration');
  b.contract({version:1,requiredSettings:[]});assert.equal((await prepareProject(job,b)).configuration,'done');
  b.contract({version:1,requiredSettings:['secret=value']});assert.equal((await prepareProject(job,b)).reason,'configuration');
 }finally{b.close();}
});
test('changed local manifests, unsupported locks, failed dependencies and failed Paseo retain bounded partial states and retry',async()=>{
 for(const options of [{changed:'local manifest'},{fail:'ci'},{fail:'ls'}]) {
  const b=box(options);try{b.contract({version:1,requiredSettings:[]});const result=await prepareProject(job,b);assert.equal(result.clone,'done');assert.equal(result.reason,options.changed?'dependencies':options.fail==='ci'?'dependencies':'paseo');assert.ok(!JSON.stringify(result).includes('host-secret'));}finally{b.close();}
 }
 const b=box();try{
  b.put(join(b.dir,'package-lock.json'),'{"lockfileVersion":1}');assert.equal((await prepareProject(job,b)).reason,'unsupported');
  rmSync(join(b.dir,'package.json'));assert.equal((await prepareProject(job,b)).reason,'unsupported');
 }finally{b.close();}
 assert.equal((await prepareProject(job,{uid:0})).reason,'unsupported');
});
test('fixed unprivileged helpers accept only bounded reports; no arbitrary helper stdout leaves the agent',async()=>{
 const report={generation:7,clone:'done',dependencies:'done',configuration:'done',paseo:'done',missingSettings:[]};
 const calls=[];const exec=workspaceExec(async(file,args,options)=>{calls.push({file,args,options});return{stdout:JSON.stringify(report)};},{user:'fixture',home:'/home/fixture',uid:1001});
 assert.equal((await prepareProjectJob(job,exec)).status,'done');assert.ok(calls[0].args.includes('-i'));assert.deepEqual(JSON.parse(calls[0].options.input),job);
 assert.equal((await prepareProjectJob({},exec)).status,'rejected');
 for(const stdout of ['private-secret','x'.repeat(9000),JSON.stringify({...report,missingSettings:['secret=value']})]) {
  const result=await prepareProjectJob(job,async()=>({stdout}));assert.equal(result.status,'failed');assert.ok(!JSON.stringify(result).includes('private-secret'));
 }
 assert.throws(()=>checkedProject({...report,generation:8},7));assert.throws(()=>checkedProject({...report,missingSettings:['KEY']},7));
 assert.deepEqual(await preserveGitHub(github,async()=>({stdout:'private-token'})),{status:'failed',reason:'repo'});
 assert.deepEqual(await preserveGitHub(github,async()=>({stdout:'{"status":"done","token":"private-token"}'})),{status:'done'});
});
test('generation-bound authenticated receipts recover a lost report without repeating project scripts and reject replaced jobs',async()=>{
 const root=mkdtempSync(join(tmpdir(),'project-journal-'));try{
  const options={directory:join(root,'journal')};const job={id:'job',payload:{repo:'owner/repo',generation:7}};let prepares=0;const calls=[];
  const project={generation:7,clone:'done',dependencies:'done',configuration:'done',paseo:'done',missingSettings:[]};
  const prepare=async()=>{prepares++;return{status:'done',project};};
  const post=async(path,body)=>{calls.push({path,body});return Response.json(path.endsWith('/project')?{ok:true,generation:7}:{ok:true});};
  const store=createProjectStore(options);assert.equal(await store.execute(job,prepare,async()=>{throw Error('offline');}),null);
  await createProjectStore(options).resume(post);assert.equal(prepares,1);assert.equal(calls[0].path,'/api/agent/jobs/job/project');assert.deepEqual(calls[0].body,project);assert.deepEqual(calls[1].body,{status:'done'});
  assert.deepEqual(await store.execute({...job,payload:{...job.payload,generation:8}},prepare,post),{status:'rejected'});assert.equal(prepares,1);
  await store.resume(post);assert.equal(calls.length,2);
  assert.ok(existsSync(join(options.directory,'job.json')));assert.ok(!readFileSync(join(options.directory,'job.json'),'utf8').includes('token'));
 }finally{rmSync(root,{recursive:true,force:true});}
});


test('preserved preparation creates canonical sign-in terminals, reuses existing ones and retries partial setup without duplicates or output reads',async()=>{
 for(const options of [{},{seed:true},{failOnce:'terminal create'},{failOnce:'terminal send-keys'},{failOnce:'--title Sign in to Codex'}]) {
  const b=box(options);try {
   b.contract({version:1,requiredSettings:[]});const first=await prepareProject(job,b);
   if(options.failOnce){assert.equal(first.paseo,'failed');assert.equal(first.dependencies,'done');assert.equal(first.configuration,'done');}
   else assert.equal(first.paseo,'done');
   const retried=await prepareProject(job,b);assert.equal(retried.paseo,'done');await prepareProject(job,b);
   assert.deepEqual(b.workspaces.map(value=>value.name),['Sign in to Claude','Sign in to Codex','Start here (after you sign in)']);
   assert.equal(b.terminals.length,2);assert.equal(new Set(b.terminals.map(value=>value.id)).size,2);
   const sends=b.calls.filter(value=>value.args.includes('send-keys'));
   if(options.seed){assert.equal(sends.length,0);assert.ok(!b.calls.some(value=>value.file==='paseo'&&value.args.includes('create')));}
   else {assert.ok(sends.some(value=>value.args.includes('claude auth login')));assert.ok(sends.some(value=>value.args.includes('codex login --device-auth')));}
   assert.ok(!b.calls.some(value=>value.args.includes('capture')));assert.equal(b.calls.filter(value=>value.file==='npm'&&value.args.includes('ci')).length,1);
  }finally{b.close();}
 }
});


test('tracked owned .nvmrc matches the effective supported Node major before frozen install without replacing runtime',async()=>{
 for(const [declaration,nodeVersion,ready] of [['22','v22.19.0',true],['v22.1.0','v22.19.0',true],['24','v24.0.0',true],['22','v24.0.0',false],['18','v18.20.0',false],['lts/*','v22.19.0',false],['','v22.19.0',false]]) {
  const b=box({nodeVersion});try {
   b.put(join(b.dir,'.nvmrc'),declaration);b.contract({version:1,requiredSettings:[]});const result=await prepareProject(job,b);
   assert.equal(result.dependencies,ready?'done':'needs_input');if(!ready)assert.equal(result.reason,'unsupported');
   assert.equal(b.calls.filter(value=>value.file==='npm'&&value.args.includes('ci')).length,ready?1:0);
   assert.ok(b.calls.some(value=>value.args.includes('diff')&&value.args.includes('.nvmrc')));assert.ok(b.calls.some(value=>value.args.includes('ls-files')&&value.args.includes('.nvmrc')));
   assert.ok(!b.calls.some(value=>value.file==='apt-get'||value.args.includes('install')||value.file==='nvm'));
  }finally{b.close();}
 }
});
test('dirty, untracked, symlinked or nonregular runtime declarations refuse and a reviewed declaration change refreshes fingerprint',async()=>{
 for(const options of [{changed:' .nvmrc'},{untrackedNvmrc:true},{symlink:true},{directory:true}]) {
  const b=box(options);try {
   if(options.symlink){const target=join(b.root,'nvmrc');b.put(target,'22');symlinkSync(target,join(b.dir,'.nvmrc'));}
   else if(options.directory)mkdirSync(join(b.dir,'.nvmrc'));else b.put(join(b.dir,'.nvmrc'),'22');
   const result=await prepareProject(job,b);assert.equal(result.clone,'done');assert.notEqual(result.dependencies,'done');assert.equal(b.calls.filter(value=>value.file==='npm'&&value.args.includes('ci')).length,0);
  }finally{b.close();}
 }
 const b=box();try {
  b.put(join(b.dir,'.nvmrc'),'22');b.contract({version:1,requiredSettings:[]});await prepareProject(job,b);await prepareProject(job,b);assert.equal(b.calls.filter(value=>value.args.includes('ci')).length,1);
  b.put(join(b.dir,'.nvmrc'),'v22');await prepareProject(job,b);assert.equal(b.calls.filter(value=>value.args.includes('ci')).length,2);
 }finally{b.close();}
});
