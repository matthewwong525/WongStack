import { fileURLToPath } from 'node:url';
import { asWorkspace } from './workspace.mjs';
import { checkedBootstrap } from '../hosted/bootstrap.mjs';
const helper=fileURLToPath(new URL('../hosted/bootstrap.mjs',import.meta.url));
export async function hostedBootstrapJob(payload,exec) {
  let job;try{job=checkedBootstrap(payload);}catch{return {status:'rejected'};}
  try {
    const {stdout}=await asWorkspace(exec,['node',helper],{input:JSON.stringify(job),timeout:25*60_000});
    if(stdout.length>8192)throw Error('reconnect');
    const result=JSON.parse(stdout);
    if(result.status==='rejected')return {status:'rejected'};
    if(result.status!=='done')return {status:'failed',reason:result.reason==='path_conflict'?'path_conflict':'reconnect'};
    const value=result.hosted;
    if(!value||value.projectId!==job.projectId||value.generation!==job.generation||value.sourceCommit!==job.sourceCommit||value.starterCommit!==job.starterCommit||value.repository!=='ready'||value.workspace!=='ready')throw Error('reconnect');
    return {status:'done',hosted:{projectId:value.projectId,generation:value.generation,sourceCommit:value.sourceCommit,starterCommit:value.starterCommit,repository:'ready',workspace:'ready'}};
  }catch{return {status:'failed',reason:'reconnect'};}
}
