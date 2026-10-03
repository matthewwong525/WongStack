import { lstatSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
export const DEFAULT_WORKSPACE = Object.freeze({user:'wong',home:'/home/wong',uid:1000});
export function workspaceConfig(env = {}) {
  const user=env.WORKSPACE_USER ?? 'wong';
  const home=env.WORKSPACE_HOME ?? `/home/${user}`;
  if(typeof user!=='string'||!/^[a-z_][a-z0-9_-]{0,31}$/.test(user)||user==='root'||typeof home!=='string'||!/^\/[A-Za-z0-9_./-]+$/.test(home)||home==='/'||resolve(home)!==home)throw Error('workspace');
  return {user,home};
}
export function noLinks(path) {
  let current=sep;
  for(const part of resolve(path).split(sep).filter(Boolean)) {
    current=join(current,part);
    try {if(lstatSync(current).isSymbolicLink())throw Error('path_conflict');}
    catch(error){if(error.code==='ENOENT')return;throw error;}
  }
}
export async function validateWorkspace(env,exec) {
  const identity=workspaceConfig(env);
  const fields=(await exec('getent',['passwd',identity.user])).stdout.trim().split(':');
  const uid=Number(fields[2]);
  if(fields.length!==7||fields[0]!==identity.user||!Number.isInteger(uid)||uid<1||fields[5]!==identity.home)throw Error('workspace');
  noLinks(identity.home);
  const info=lstatSync(identity.home);
  if(!info.isDirectory()||info.uid!==uid)throw Error('workspace');
  return {...identity,uid};
}
export const workspaceOf = exec => exec.workspace ?? DEFAULT_WORKSPACE;
export function workspaceExec(exec,identity) {
  const bound=(...args)=>exec(...args);
  bound.workspace=identity;
  return bound;
}
export function asWorkspace(exec,args,options) {
  const {user,home}=workspaceOf(exec);
  return exec('runuser',['-u',user,'--','env','-i',`HOME=${home}`,`USER=${user}`,`PATH=${home}/.local/bin:/usr/local/bin:/usr/bin:/bin`,...args],options);
}
