import { randomUUID } from 'node:crypto';
import { lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoFolder } from '../install-wongstack.mjs';
import { PROJECT_REASONS } from '../prepare-project.mjs';
import { asWorkspace, noLinks } from './workspace.mjs';
const helper=fileURLToPath(new URL('../prepare-project.mjs',import.meta.url));
const ID=/^[A-Za-z0-9_-]{1,128}$/;
export function checkedProject(value,generation) {
  if(!value||value.generation!==generation||!Number.isSafeInteger(generation)||generation<0||!['done','failed'].includes(value.clone)||!['done','failed','needs_input'].includes(value.dependencies)||!['done','needs_input'].includes(value.configuration)||!['done','failed'].includes(value.paseo)||!Array.isArray(value.missingSettings)||value.missingSettings.length>64||!value.missingSettings.every(name=>typeof name==='string'&&/^[A-Z][A-Z0-9_]{0,63}$/.test(name))||(value.reason!==undefined&&!PROJECT_REASONS.includes(value.reason)))throw Error('unsupported');
  if(value.configuration==='done'&&value.missingSettings.length)throw Error('configuration');
  return {generation,clone:value.clone,dependencies:value.dependencies,configuration:value.configuration,paseo:value.paseo,missingSettings:[...new Set(value.missingSettings)],...(value.reason&&{reason:value.reason})};
}
const outcomeOf=report=>({status:report.clone==='done'&&report.dependencies==='done'&&report.configuration==='done'&&report.paseo==='done'?'done':'failed',...(report.reason&&{reason:report.reason})});
export async function prepareProjectJob(payload,exec) {
  if(!repoFolder(payload?.repo)||!Number.isSafeInteger(payload?.generation)||payload.generation<0)return {status:'rejected'};
  try {
    const result=await asWorkspace(exec,['node',helper],{input:JSON.stringify({repo:payload.repo,generation:payload.generation}),timeout:25*60_000});
    if(result.stdout.length>8192)throw Error('unsupported');
    const project=checkedProject(JSON.parse(result.stdout),payload.generation);
    return {...outcomeOf(project),project};
  }catch{return {status:'failed',project:{generation:payload.generation,clone:'failed',dependencies:'needs_input',configuration:'needs_input',paseo:'failed',missingSettings:[],reason:'unsupported'}};}
}
// Host-owned journal contains only bounded reports, never repo output or tokens.
export function createProjectStore({directory='/var/lib/wongstack/project-jobs'}={}) {
  const busy=new Set(),uid=process.getuid();
  const file=id=>{if(!ID.test(id))throw Error('unsupported');return join(directory,`${id}.json`);};
  function save(entry) {
    noLinks(directory);mkdirSync(directory,{recursive:true,mode:0o700});
    const info=lstatSync(directory);if(info.uid!==uid||(info.mode&0o777)!==0o700)throw Error('unsupported');
    const path=file(entry.id);noLinks(path);
    const temporary=join(directory,`${entry.id}.${randomUUID()}.tmp`);
    writeFileSync(temporary,JSON.stringify(entry),{flag:'wx',mode:0o600});renameSync(temporary,path);
  }
  function read(id) {
    const path=file(id);noLinks(path);
    let info;try{info=lstatSync(path);}catch(error){if(error.code==='ENOENT')return null;throw error;}
    if(!info.isFile()||info.uid!==uid||(info.mode&0o777)!==0o600||info.size>16*1024||info.nlink!==1)throw Error('unsupported');
    const entry=JSON.parse(readFileSync(path,'utf8'));
    if(entry.id!==id||!repoFolder(entry.repo)||!Number.isSafeInteger(entry.generation)||entry.generation<0)throw Error('unsupported');
    if(entry.project)entry.project=checkedProject(entry.project,entry.generation);
    return entry;
  }
  async function deliver(entry,post) {
    if(!entry.project)return null;
    if(!entry.ack) {
      const response=await post(`/api/agent/jobs/${entry.id}/project`,entry.project);
      if(!response.ok)throw Error('unsupported');
      const receipt=await response.json();if(receipt.ok!==true||receipt.generation!==entry.generation)throw Error('unsupported');
      entry.ack=true;save(entry);
    }
    return outcomeOf(entry.project);
  }
  async function execute(job,prepare,post) {
    if(busy.has(job.id))return null;busy.add(job.id);
    try {
      if(!repoFolder(job.payload?.repo)||!Number.isSafeInteger(job.payload?.generation)||job.payload.generation<0)return {status:'rejected'};
      let entry=read(job.id);
      if(entry&&(entry.repo!==job.payload.repo||entry.generation!==job.payload.generation))return {status:'rejected'};
      if(!entry){entry={id:job.id,repo:job.payload.repo,generation:job.payload.generation,project:null,ack:false,reported:false};save(entry);}
      if(!entry.project){const result=await prepare();if(!result.project)return {status:'rejected'};entry.project=checkedProject(result.project,entry.generation);save(entry);}
      return await deliver(entry,post);
    }catch{return null;}finally{busy.delete(job.id);}
  }
  async function report(job,outcome,post) {
    const entry=read(job.id);
    const value=entry?.project?outcomeOf(entry.project):{status:outcome.status==='rejected'?'rejected':'failed'};
    const response=await post(`/api/agent/jobs/${job.id}`,value);
    if(!response.ok||(await response.json()).ok!==true)throw Error('unsupported');
    if(entry){entry.reported=true;save(entry);}
  }
  async function resume(post) {
    let files;try{noLinks(directory);files=readdirSync(directory);}catch{return;}
    for(const name of files.filter(name=>name.endsWith('.json')).sort().slice(0,100)) {
      const id=name.slice(0,-5);if(busy.has(id))continue;busy.add(id);
      try{const entry=read(id);if(!entry||entry.reported)continue;const outcome=await deliver(entry,post);if(outcome)await report({id},outcome,post);}catch{/* Retry only the same bounded report. */}finally{busy.delete(id);}
    }
  }
  return {execute,report,resume};
}
