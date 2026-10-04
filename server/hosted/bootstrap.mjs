// This fixed workspace helper clones only the host's existing protected project.
// It cannot provision a repo, Worker, memory store or GitHub credentials.
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { checkedContext, privateContextPath, verifyHostedContext, ID, HOSTED_ORIGIN } from '../../.agents/skills/wong-sync/scripts/hosted-context.mjs';
import { run } from '../install-wongstack.mjs';
import { noLinks } from '../agent/workspace.mjs';
import { ownedPath } from '../project-github.mjs';
import { preparePaseo } from '../prepare-project.mjs';
import { ownerIdentity } from '../../.agents/skills/wong-setup/scripts/private-access.mjs';
export function checkedBootstrap(job) {
  const context=checkedContext(job);
  if(typeof job.folder!=='string'||typeof job.gitToken!=='string'||!ID.test(job.folder)||job.folder==='.'||job.folder==='..'||!/^art_v1_[a-f0-9]{40}\?expires=[0-9]{1,16}$/.test(job.gitToken)||typeof job.ownerName!=='string'||!job.ownerName.trim()||job.ownerName.length>100||/[\r\n\0]/.test(job.ownerName))throw Error('reconnect');
  const ownerEmail=ownerIdentity(job.ownerEmail);
  return {...context,folder:job.folder,gitToken:job.gitToken,ownerName:job.ownerName,ownerEmail};
}
function writePrivate(file,value,uid) {
  noLinks(dirname(file));mkdirSync(dirname(file),{recursive:true,mode:0o700});ownedPath(dirname(file),uid);
  if((lstatSync(dirname(file)).mode&0o777)!==0o700)throw Error('path_conflict');
  noLinks(file);
  if(existsSync(file)) {const info=lstatSync(file);if(!info.isFile()||info.nlink!==1||info.uid!==uid||(info.mode&0o777)!==0o600)throw Error('path_conflict');}
  const temporary=`${file}.${randomUUID()}.tmp`;
  writeFileSync(temporary,value,{flag:'wx',mode:0o600});renameSync(temporary,file);
}
export async function bootstrapHosted(input,{home=process.env.HOME,user=process.env.USER,uid=process.getuid(),exec=run,fetch=globalThis.fetch,origin}={}) {
  let job;
  try {job=checkedBootstrap(input);if(uid===0)throw Error('reconnect');}catch{return {status:'rejected'};}
  const context=checkedContext(job),dir=join(home,job.folder),file=privateContextPath(home,dir);
  const env={HOME:home,USER:user,PATH:`${home}/.local/bin:/usr/local/bin:/usr/bin:/bin`,GIT_TERMINAL_PROMPT:'0'};
  const command=(name,args,options={})=>exec(name,args,{cwd:dir,env,timeout:20*60_000,...options});
  try {
    ownedPath(home,uid);noLinks(dir);noLinks(file);
    // Existing binding must match before any replacement or clone attempt.
    if(existsSync(file)) {
      const info=lstatSync(file);if(!info.isFile()||info.nlink!==1||info.uid!==uid||(info.mode&0o777)!==0o600||info.size>8192)throw Error('path_conflict');
      const previous=checkedContext(JSON.parse(readFileSync(file,'utf8')));
      for(const key of ['projectId','remote','sourceCommit','starterCommit'])if(previous[key]!==context[key])throw Error('reconnect');
      if(previous.generation>context.generation)throw Error('reconnect');
    }
    // Readback authenticates the exact project, template and generation before writes.
    const response=await fetch(`${origin??HOSTED_ORIGIN}/api/hosted/projects/${job.projectId}/context`,{method:'POST',headers:{Authorization:`Bearer ${job.token}`,'Content-Type':'application/json'},body:JSON.stringify({...context,token:undefined}),redirect:'error',signal:AbortSignal.timeout(30_000)});
    if(!response.ok)throw Error('reconnect');
    const verified=await response.json();
    for(const key of ['projectId','remote','generation','sourceCommit','starterCommit'])if(verified[key]!==context[key])throw Error('reconnect');
    if(verified.ok!==true)throw Error('reconnect');
    const git=(args)=>command('git',['-C',dir,...args]);
    const exists=existsSync(dir);
    if(exists) {
      ownedPath(dir,uid);ownedPath(join(dir,'.git'),uid);
      if(resolve((await git(['rev-parse','--show-toplevel'])).stdout.trim())!==dir||(await git(['remote','get-url','origin'])).stdout.trim()!==job.remote)throw Error('path_conflict');
    }
    // Scoped Git credentials stay outside history; no management/deploy authority.
    const credential=`${file}.gitconfig`;
    writePrivate(credential,`[http "${job.remote}"]\n\textraHeader = Authorization: Bearer ${job.gitToken}\n`,uid);
    if(!exists)await exec('git',['-c',`include.path=${credential}`,'clone','--',job.remote,dir],{env,timeout:20*60_000});
    ownedPath(dir,uid);ownedPath(join(dir,'.git'),uid);
    if((await git(['remote','get-url','origin'])).stdout.trim()!==job.remote)throw Error('path_conflict');
    // Initial seed must be the immutable starter; retries retain later customer work.
    const record=join(dir,'.agents/.wong-stack.json');noLinks(record);
    const info=lstatSync(record);if(!info.isFile()||info.nlink!==1||info.uid!==uid||info.size>16384)throw Error('path_conflict');
    const installed=JSON.parse(readFileSync(record,'utf8'));
    if(installed.commit!==job.sourceCommit||(!exists&&(await git(['rev-parse','HEAD'])).stdout.trim()!==job.starterCommit))throw Error('reconnect');
    await git(['merge-base','--is-ancestor',job.starterCommit,'HEAD']);
    await git(['config','--local','include.path',credential]);
    for(const [key,value] of [['user.name',job.ownerName],['user.email',job.ownerEmail]]) {
      const current=exists?await git(['config','--local','--get',key]).then(result=>result.stdout.trim(),()=>null):null;
      if(!current)await git(['config','--local',key,value]);
    }
    writePrivate(file,JSON.stringify(context),uid);
    await verifyHostedContext({dir,remote:job.remote,home,uid,fetch,origin});
    const stateFile=`${file}.paseo`;
    let state={};if(existsSync(stateFile)){noLinks(stateFile);const info=lstatSync(stateFile);if(info.uid!==uid||!info.isFile()||info.nlink!==1||info.size>8192||(info.mode&0o777)!==0o600)throw Error('path_conflict');state=JSON.parse(readFileSync(stateFile,'utf8'));}
    await preparePaseo(dir,{home,command,state,saveState:()=>writePrivate(stateFile,JSON.stringify(state),uid)});
    return {status:'done',hosted:{projectId:job.projectId,generation:job.generation,sourceCommit:job.sourceCommit,starterCommit:job.starterCommit,repository:'ready',workspace:'ready'}};
  }catch(error){return {status:'failed',reason:error.message==='path_conflict'?'path_conflict':'reconnect'};}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>16384)process.exit(1);}
  try{console.log(JSON.stringify(await bootstrapHosted(JSON.parse(input))));}catch{console.log(JSON.stringify({status:'rejected'}));}
}
