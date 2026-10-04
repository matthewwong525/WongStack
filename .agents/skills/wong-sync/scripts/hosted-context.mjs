// A marker identifies a route; only the service authenticates project authority.
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export const HOSTED_ORIGIN = 'https://wongstack.com';
export const SHA = /^[a-f0-9]{40}$/;
export const ID = /^[A-Za-z0-9_-]{1,100}$/;
export const privateContextPath = (home, dir) => join(home, '.local/state/wongstack/hosted', `${createHash('sha256').update(resolve(dir)).digest('hex')}.json`);
export function artifactsRemote(value) {
  if(typeof value!=='string'||value.length>1024||!/^https:\/\/[^\s?#]+$/.test(value))throw Error('reconnect');
  const url=new URL(value);
  if(!url.hostname.endsWith('.artifacts.cloudflare.net')||url.username||url.password||url.port||url.pathname.includes('..')||!/^\/git\/[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+\.git$/.test(url.pathname))throw Error('reconnect');
  return value;
}
export function checkedContext(value) {
  if(!value||typeof value.projectId!=='string'||typeof value.starterCommit!=='string'||typeof value.sourceCommit!=='string'||value.version!==1||value.provider!=='artifacts'||!ID.test(value.projectId)||!Number.isSafeInteger(value.generation)||value.generation<0||!SHA.test(value.starterCommit)||!SHA.test(value.sourceCommit)||typeof value.token!=='string'||!/^\S{16,4096}$/.test(value.token)||[...value.token].some(char=>char.charCodeAt(0)<=32||char.charCodeAt(0)===127))throw Error('reconnect');
  artifactsRemote(value.remote);
  return {version:1,provider:'artifacts',projectId:value.projectId,generation:value.generation,remote:value.remote,starterCommit:value.starterCommit,sourceCommit:value.sourceCommit,token:value.token};
}
function safeFile(file,uid) {
  let path='/';
  for(const part of resolve(file).split('/').filter(Boolean)) {
    path=join(path,part);const info=lstatSync(path);if(info.isSymbolicLink())throw Error('reconnect');
  }
  const info=lstatSync(file),parent=lstatSync(resolve(file,'..'));
  if(!info.isFile()||info.nlink!==1||info.uid!==uid||info.size>8192||(info.mode&0o777)!==0o600||parent.uid!==uid||(parent.mode&0o777)!==0o700)throw Error('reconnect');
}
export async function verifyHostedContext({dir,remote,home=process.env.HOME,uid=process.getuid(),fetch=globalThis.fetch,origin=HOSTED_ORIGIN}) {
  const file=privateContextPath(home,dir);safeFile(file,uid);
  const context=checkedContext(JSON.parse(readFileSync(file,'utf8')));
  if(context.remote!==artifactsRemote(remote))throw Error('reconnect');
  const response=await fetch(`${origin}/api/hosted/projects/${context.projectId}/context`,{method:'POST',headers:{Authorization:`Bearer ${context.token}`,'Content-Type':'application/json'},body:JSON.stringify({...context,token:undefined}),redirect:'error',signal:AbortSignal.timeout(30_000)});
  if(!response.ok)throw Error('reconnect');
  const result=await response.json();
  if(result.ok!==true||result.projectId!==context.projectId||result.remote!==context.remote||result.generation!==context.generation||result.sourceCommit!==context.sourceCommit||result.starterCommit!==context.starterCommit)throw Error('reconnect');
  return {...context,token:undefined};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const {execFileSync}=await import('node:child_process');
    const dir=resolve(process.argv[2]??'.');
    const remote=execFileSync('git',['-C',dir,'remote','get-url','origin'],{encoding:'utf8'}).trim();
    console.log(JSON.stringify(await verifyHostedContext({dir,remote})));
  }catch{console.error('Reconnect this hosted workspace before setup or delivery.');process.exitCode=1;}
}
