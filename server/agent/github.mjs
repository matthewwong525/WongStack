import { fileURLToPath } from 'node:url';
import { asWorkspace } from './workspace.mjs';
const helper=fileURLToPath(new URL('../project-github.mjs',import.meta.url));
export async function preserveGitHub(payload,exec) {
  try {
    const result=await asWorkspace(exec,['node',helper],{input:JSON.stringify({repo:payload.repo,token:payload.token,login:payload.login}),timeout:10*60_000});
    if(result.stdout.length>1024)throw Error('repo');
    const value=JSON.parse(result.stdout);
    if(!['done','failed','rejected'].includes(value.status))throw Error('repo');
    return {status:value.status,...(['repo','identity_conflict','path_conflict'].includes(value.reason)&&{reason:value.reason})};
  }catch{return {status:'failed',reason:'repo'};}
}
