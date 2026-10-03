// Runs only as the selected account; credentials arrive on stdin and stay in
// the child environment. No auth login/setup-git or configuration writes.
import { lstatSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { repoFolder, run } from './install-wongstack.mjs';
import { sourceOrigin } from './agent/source.mjs';
import { noLinks } from './agent/workspace.mjs';
const fail=reason=>{throw Error(reason);};
export function ownedPath(path,uid) {
  noLinks(path);
  const info=lstatSync(path);
  if(info.uid!==uid||!info.isDirectory())fail('path_conflict');
}
export async function inspectCheckout(repo,{home=process.env.HOME,uid=process.getuid(),exec=run,env=process.env}={}) {
  const folder=repoFolder(repo);if(!folder)fail('repo');
  ownedPath(home,uid);
  const dir=join(home,folder);noLinks(dir);
  try {lstatSync(dir);}catch(error){if(error.code==='ENOENT')return {dir,exists:false};throw error;}
  ownedPath(dir,uid);noLinks(join(dir,'.git'));
  const git=async args=>(await exec('git',['-C',dir,...args],{env})).stdout.trim();
  try {
    if(realpathSync(await git(['rev-parse','--show-toplevel']))!==realpathSync(dir))fail('path_conflict');
    // Worktrees are allowed only when their backing git directory is also owned and safe.
    ownedPath(resolve(dir,await git(['rev-parse','--absolute-git-dir'])),uid);
    if(sourceOrigin(await git(['remote','get-url','origin']))!==repo.toLowerCase())fail('path_conflict');
  }catch{fail('path_conflict');}
  return {dir,exists:true};
}
export async function connectPreserved(job,{home=process.env.HOME,user=process.env.USER,uid=process.getuid(),exec=run}={}) {
  if(uid===0||!repoFolder(job?.repo)||typeof job.token!=='string'||!job.token||job.token.length>4096||typeof job.login!=='string'||!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(job.login))return {status:'rejected'};
  const base={HOME:home,USER:user,PATH:`${home}/.local/bin:/usr/local/bin:/usr/bin:/bin`};
  try {
    const selected={...base,GH_TOKEN:job.token};
    const actual=JSON.parse((await exec('gh',['api','user'],{env:selected})).stdout);
    if(actual.login?.toLowerCase()!==job.login.toLowerCase())fail('identity_conflict');
    const target=await inspectCheckout(job.repo,{home,uid,exec,env:base});
    // Stored login is reused only if it independently matches; other identities stay intact.
    let stored;
    try {stored=JSON.parse((await exec('gh',['api','user'],{env:base})).stdout).login;}catch{/* Scoped token remains the authority. */}
    if(stored&&stored.toLowerCase()!==job.login.toLowerCase())fail('identity_conflict');
    const env=stored?base:selected;
    await exec('gh',['repo','view',job.repo,'--json','name'],{env});
    if(!target.exists) {
      await exec('git',['-c','credential.helper=','-c','credential.helper=!gh auth git-credential','clone','--',`https://github.com/${job.repo}.git`,target.dir],{env});
      await inspectCheckout(job.repo,{home,uid,exec,env:base});
    }
    return {status:'done'};
  }catch(error){return {status:'failed',reason:['identity_conflict','path_conflict','repo'].includes(error.message)?error.message:'repo'};}
}
/* c8 ignore start -- process entry, fixed JSON-only stdin/stdout */
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>8192)process.exit(1);}
  let outcome;try{outcome=await connectPreserved(JSON.parse(input));}catch{outcome={status:'rejected'};}
  console.log(JSON.stringify(outcome));
}
/* c8 ignore stop */
