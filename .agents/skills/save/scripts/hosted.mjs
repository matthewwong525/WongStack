#!/usr/bin/env node
// Project access only: platform credentials never reach this client.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, readFileSync, lstatSync, openSync, closeSync, fchmodSync, fstatSync, writeFileSync, constants } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const execute = promisify(execFile);
const SHA = /^[a-f0-9]{40}$/;
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const REPO = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/;
export function https(value) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password || u.hash || u.search) throw new Error('invalid hosted address');
  return u;
}
export function validateContext(value) {
  if (https(value.serviceUrl).pathname!=='/') throw new Error('invalid hosted service root');
  const git = https(value.gitUrl);
  if (!UUID.test(value.projectId) || !SHA.test(value.sourceCommit) || !REPO.test(value.sourceRepo) || !['owner','member'].includes(value.role) || !value.subject || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.subjectEmail || '') || !value.ownerEmail || !git.pathname.endsWith('.git')) throw new Error('invalid hosted context');
  return value;
}
export async function primary(cwd = process.cwd(), exec = execute) {
  const run = async args => (await exec('git', ['-C', cwd, ...args])).stdout.trim();
  const [root,gitDir,common]= (await run(['rev-parse','--path-format=absolute','--show-toplevel','--git-dir','--git-common-dir'])).split('\n');
  const primary=gitDir===common ? root : dirname(common);
  if ((await exec('git',['-C',primary,'rev-parse','--show-toplevel'])).stdout.trim()!==primary) throw new Error('primary workspace is unknown');
  return {root,common,primary};
}
export function privatePath(file) {
  let parent=dirname(file);
  for (;;) {
    if (existsSync(parent)) {
      const stat=lstatSync(parent);
      if (stat.isSymbolicLink() || !stat.isDirectory() || (process.getuid && ![0,process.getuid()].includes(stat.uid))) throw new Error('unsafe credential directory');
    }
    const next=dirname(parent); if (next===parent) break; parent=next;
  }
  try {
    const stat=lstatSync(file);
    if (stat.isSymbolicLink() || !stat.isFile() || (process.getuid && stat.uid!==process.getuid())) throw new Error('unsafe credential file');
  } catch(error) { if(error.code!=='ENOENT') throw error; }
}
export function privateWrite(file,text) {
  privatePath(file);
  const fd=openSync(file,constants.O_WRONLY|constants.O_CREAT|constants.O_TRUNC|constants.O_NOFOLLOW,0o600);
  try {
    if (process.getuid && fstatSync(fd).uid!==process.getuid()) throw new Error('unsafe credential owner');
    fchmodSync(fd,0o600);writeFileSync(fd,text);
  } finally {closeSync(fd);}
}
function envValues(file) {
  privatePath(file);
  if (!existsSync(file)) return {};
  return Object.fromEntries(readFileSync(file,'utf8').split('\n').map(line=>/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line)).filter(Boolean).map(match=>[match[1],match[2]]));
}
function confirmedOutsideGit(error,cwd) {
  const stderr=String(error.stderr || '');
  const plain=/^fatal: not a git repository \(or any of the parent directories\): \.git\s*$/.test(stderr);
  const boundary=/^fatal: not a git repository \(or any parent up to mount point [^\r\n)]+\)\r?\nStopping at filesystem boundary \(GIT_DISCOVERY_ACROSS_FILESYSTEM not set\)\.\s*$/.test(stderr);
  if(error.code!==128 || !(plain || boundary)) return false;
  let directory=resolve(cwd || process.cwd());
  // Git can report the same discovery failure for an unreadable/broken marker.
  // Confirm absence independently, never classify that uncertainty as personal.
  if(!lstatSync(directory).isDirectory()) return false;
  for (;;) {
    try {lstatSync(join(directory,'.git'));return false;}
    catch(failure) {if(failure.code!=='ENOENT') throw failure;}
    const parent=dirname(directory);if(parent===directory) return true;directory=parent;
  }
}
async function missingHostedContext(paths,exec) {
  const git=async args=>(await exec('git',['-C',paths.primary,...args])).stdout.trim();
  const remotes=await git(['remote']);
  if(remotes.split('\n').includes('origin')) {
    const origin=await git(['remote','get-url','origin']);
    let hostname;
    try {hostname=new URL(origin).hostname;}
    catch {hostname=/^(?:[^@]+@)?([^:/]+):[^/]/.exec(origin)?.[1];}
    if(!origin || /[\r\n\0]/.test(origin)) throw new Error('repository origin is unreadable');
    if((hostname || '').toLowerCase().endsWith('.artifacts.cloudflare.net')) throw Object.assign(new Error('hosted access missing; reconnect through the cloud or obtain an operator private handoff'),{code:'HOSTED_ACCESS_MISSING'});
  }
  let committed=false;
  try {const head=await git(['rev-parse','--quiet','--verify','HEAD']);if(!SHA.test(head)) throw new Error('local commit identity unreadable');committed=true;}
  catch(error) {if(error.code!==1) throw error;}
  if(committed) {
    const records=await git(['ls-tree','-r','--name-only','HEAD','--','.agents/.wong-stack.json','.claude/.wong-stack.json']);
    for(const path of records.split('\n').filter(Boolean)) {
      if(!['.agents/.wong-stack.json','.claude/.wong-stack.json'].includes(path)) throw new Error('installation record inspection is unreadable');
      const record=JSON.parse(await git(['show',`HEAD:${path}`]));
      if(record.hosted!==undefined && record.hosted!==null) throw Object.assign(new Error('hosted access missing; reconnect through the cloud or obtain an operator private handoff'),{code:'HOSTED_ACCESS_MISSING'});
    }
  }
  return null;
}
export async function loadContext({cwd, exec=execute, env=process.env}={}) {
  let paths;
  try {paths=await primary(cwd,exec);}
  catch(error) {if(confirmedOutsideGit(error,cwd)) return null;throw error;}
  const file = join(paths.common,'wongstack-hosted.json');
  privatePath(file);
  if (!existsSync(file)) return missingHostedContext(paths,exec);
  const saved = validateContext(JSON.parse(readFileSync(file,'utf8')));
  const token = env.WONGSTACK_HOSTED_TOKEN || envValues(join(paths.primary,'.env')).WONGSTACK_HOSTED_TOKEN || saved.token;
  if (!token) throw Object.assign(new Error('hosted access missing; reconnect this workspace'),{code:'HOSTED_ACCESS_MISSING'});
  return { ...saved, token, ...paths };
}
export function safeContext(context) {
  const {serviceUrl,projectId,gitUrl,sourceRepo,sourceCommit,ownerEmail,subject,subjectEmail,role}=context;
  return {serviceUrl,projectId,gitUrl,sourceRepo,sourceCommit,ownerEmail,subject,subjectEmail,role};
}
export async function request(context,path,body,{fetchFn=fetch}={}) {
  if (!/^\/v1\/[a-z0-9/?=&%._-]+$/i.test(path)) throw new Error('invalid hosted operation');
  const response = await fetchFn(new URL(path,https(context.serviceUrl)), {method:body===undefined?'GET':'POST', redirect:'manual', headers:{Authorization:`Bearer ${context.token}`,'Content-Type':'application/json'}, ...(body!==undefined && {body:JSON.stringify(body)}),signal:AbortSignal.timeout(120_000)});
  if (!response.ok) throw new Error(`hosted operation refused: HTTP ${response.status}`);
  return response.json();
}
export function writeSecrets(context, values) {
  const file=join(context.primary,'.env');privatePath(file);
  let lines=existsSync(file) ? readFileSync(file,'utf8').split('\n') : [];
  for (const [key,value] of Object.entries(values)) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(key) || typeof value !== 'string' || /[\r\n\0]/.test(value)) throw new Error('invalid hosted secret setting');
    const matches=new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`);
    const index=lines.findIndex(line=>matches.test(line));
    if(index<0) lines.push(`${key}=${value}`);
    else {lines[index]=`${key}=${value}`;lines=lines.filter((line,at)=>at===index || !matches.test(line));}
  }
  privateWrite(file,`${lines.join('\n').replace(/\n+$/,'')}\n`);
}
export async function credential(context,input,options) {
  const fields=Object.fromEntries(input.split('\n').filter(line=>line.includes('=')).map(line=>{ const at=line.indexOf('=');return [line.slice(0,at),line.slice(at+1)]; }));
  const git=https(context.gitUrl);
  if (fields.protocol!=='https' || fields.host!==git.host || fields.path!==git.pathname.slice(1)) return '';
  const value=await request(context,'/v1/git-token',{},options);
  if (value.gitUrl!==context.gitUrl) throw new Error('git grant repository mismatch');
  if (typeof value.token!=='string' || /[\r\n\0]/.test(value.token) || !value.token) throw new Error('invalid git grant');
  const username=value.username || 'x-token-auth';
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(username)) throw new Error('invalid git username');
  return `username=${username}\npassword=${value.token}\n\n`;
}
export async function initialBranch(context,{exec=execute}={}) {
  const git=async args=>(await exec('git',['-C',context.root,...args])).stdout.trim();
  try {
    const head=await git(['rev-parse','--quiet','--verify','HEAD']);
    if(!SHA.test(head)) throw new Error('local commit identity unreadable');
    return {initial:false};
  } catch(error) {if(error.code!==1) throw error;}
  const remote=await git(['ls-remote','--refs','origin']);
  if(remote) return {initial:false};
  const branch=await git(['symbolic-ref','--quiet','HEAD']);
  return branch==='refs/heads/main' ? {initial:true,branch:'main'} : {initial:false,reason:'preserve-selected-branch'};
}
export function memoryResult(value) {
  if(value.protocolVersion!==1 || !['pending-owner','pending-device','ready'].includes(value.status)) throw new Error('invalid memory enrollment result');
  const app=https(value.appUrl), origin=https(value.memoryOrigin);
  if(app.pathname!=='/' || origin.pathname!=='/') throw new Error('memory addresses must be exact origins');
  const reasons=['owner-unconfirmed','no-current-device','login-required','access-unverified','maintenance','device-expired','device-revoked','membership-removed'];
  if(value.reason!==null && !reasons.includes(value.reason)) throw new Error('invalid memory enrollment reason');
  if(value.status==='ready' && (value.reason!==null || value.action!==null)) throw new Error('invalid ready memory result');
  if(!value.installationId || !value.repositoryId) throw new Error('missing memory enrollment identity');
  const memory={protocolVersion:1,installationId:value.installationId,repositoryId:value.repositoryId,appUrl:app.origin,memoryOrigin:origin.origin,status:value.status,reason:value.reason??null,action:null};
  if(value.action) {
    const url=https(value.action.url);
    if(url.origin!==app.origin || url.pathname!=='/apps/devices/' || !['confirm-owner','connect-device'].includes(value.action.kind) || (value.action.kind==='confirm-owner')!==value.action.operatorConfirmationRequired) throw new Error('invalid memory enrollment action');
    memory.action={kind:value.action.kind,url:url.href,operatorConfirmationRequired:value.action.operatorConfirmationRequired===true};
  }
  return memory;
}
export async function command(action,args,context,options={}) {
  if (action==='initial-branch') return initialBranch(context,options);
  if (action==='context') return safeContext(context);
  if (action==='status') return request(context,'/v1/status',undefined,options);
  if (action==='setup') {
    const result=await request(context,'/v1/setup',{},options);
    if (!result.wrangler || !result.installRecordMemory || !result.env) throw new Error('incomplete hosted setup');
    writeSecrets(context,{WONGSTACK_HOSTED_TOKEN:context.token,...result.env});
    privateWrite(join(context.common,'wongstack-hosted.json'),`${JSON.stringify(safeContext(context),null,2)}\n`);
    const memory=result.memory ? memoryResult(result.memory) : null;
    return {wrangler:result.wrangler,installRecordMemory:result.installRecordMemory,...(memory && {memory})};
  }
  if (action==='candidate' || action==='approve' || action==='wait') {
    const [sha,ref]=args;
    if (!SHA.test(sha || '') || !/^refs\/heads\/[A-Za-z0-9._/-]+$/.test(ref || '') || ref.includes('..')) throw new Error('exact commit and branch required');
    if (action!=='wait') return request(context,`/v1/${action==='approve'?'approvals':'candidates'}`,{sha,ref},options);
    for (let attempt=0;attempt<90;attempt++) {
      const result=await request(context,`/v1/candidates/${sha}?ref=${encodeURIComponent(ref)}`,undefined,options);
      if (result.sha!==sha || result.ref!==ref) throw new Error('candidate identity mismatch');
      if (['passed','failed','error','cancelled'].includes(result.status)) return result;
      await (options.sleep || (ms=>new Promise(done=>setTimeout(done,ms))))(10_000);
    }
    throw new Error('hosted checks timed out; candidate remains queued');
  }
  if (action==='publish') {
    if (!args[0]) throw new Error('approval required');
    if(!SHA.test(args[1] || '')) throw new Error('approved commit required');
    const receipt=await request(context,'/v1/publications',{approvalId:args[0]},options);
    if(receipt.status!=='published' || receipt.sha!==args[1] || receipt.defaultRef!=='refs/heads/main' || receipt.defaultSha!==args[1] || typeof receipt.version!=='string' || !receipt.version) throw new Error('publication acknowledgment is incomplete');
    return receipt;
  }
  throw new Error('unsupported hosted operation');
}
async function main() {
  const [action,...args]=process.argv.slice(2);
  const context=await loadContext();
  if (action==='context' && !context) { console.log(JSON.stringify({hosted:false})); return; }
  if (!context) throw new Error('this repository has no hosted context');
  if (action==='credential') {
    if (args[0]!=='get') return;
    let input=''; for await (const chunk of process.stdin) input+=chunk;
    process.stdout.write(await credential(context,input)); return;
  }
  console.log(JSON.stringify(await command(action,args,context)));
}
if (process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) main().catch(error=>{console.error(error.code==='HOSTED_ACCESS_MISSING' ? 'Hosted access is missing. Reconnect through WongStack Cloud or obtain an operator private handoff.' : 'Hosted operation failed; check access and service status.');process.exitCode=1;});
