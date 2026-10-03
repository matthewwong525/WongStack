// Project-owned package scripts run here as the workspace account, with a
// clean environment. Only bounded step states and required names leave it.
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { run } from './install-wongstack.mjs';
import { inspectCheckout, ownedPath } from './project-github.mjs';
import { noLinks } from './agent/workspace.mjs';
export const PROJECT_REASONS=['repo','path_conflict','identity_conflict','dependencies','configuration','paseo','unsupported'];
const setting=/^[A-Z][A-Z0-9_]{0,63}$/;
function regular(path,uid,limit=1024*1024) {
  noLinks(path);const info=lstatSync(path);
  if(!info.isFile()||info.uid!==uid||info.nlink!==1||info.size>limit)throw Error('path_conflict');
  return readFileSync(path,'utf8');
}
function stateFile(home,uid,repo) {
  const dir=join(home,'.local/state/wongstack/projects');noLinks(dir);
  mkdirSync(dir,{recursive:true,mode:0o700});ownedPath(dir,uid);
  if((lstatSync(dir).mode&0o777)!==0o700)throw Error('path_conflict');
  return join(dir,`${createHash('sha256').update(repo.toLowerCase()).digest('hex')}.json`);
}
export async function prepareProject(job,{home=process.env.HOME,user=process.env.USER,uid=process.getuid(),exec=run}={}) {
  const report={generation:job?.generation,clone:'failed',dependencies:'needs_input',configuration:'needs_input',paseo:'failed',missingSettings:[]};
  if(uid===0||!Number.isSafeInteger(job?.generation)||job.generation<0)return {...report,reason:'unsupported'};
  const env={HOME:home,USER:user,PATH:`${home}/.local/bin:/usr/local/bin:/usr/bin:/bin`};
  let step='repo';
  try {
    const target=await inspectCheckout(job.repo,{home,uid,exec,env});if(!target.exists)throw Error('repo');
    const {dir}=target;report.clone='done';
    const command=(file,args)=>exec(file,args,{cwd:dir,env,timeout:20*60_000});
    step='dependencies';
    // Never replace a locally edited dependency contract with a frozen install.
    const changed=(await command('git',['diff','HEAD','--','package.json','package-lock.json'])).stdout.trim();
    if(changed)return {...report,reason:'dependencies'};
    const manifest=join(dir,'package.json'),lock=join(dir,'package-lock.json');
    if(!existsSync(manifest)||!existsSync(lock))return {...report,reason:'unsupported'};
    try{await command('git',['ls-files','--error-unmatch','package.json','package-lock.json']);}catch{return {...report,reason:'dependencies'};}
    const packageText=regular(manifest,uid),lockText=regular(lock,uid,16*1024*1024);
    const packageJson=JSON.parse(packageText),lockJson=JSON.parse(lockText);
    if(![2,3].includes(lockJson.lockfileVersion)||(packageJson.packageManager&&!/^npm@/.test(packageJson.packageManager))||['yarn.lock','pnpm-lock.yaml','pyproject.toml','requirements.txt'].some(file=>existsSync(join(dir,file))))return {...report,reason:'unsupported'};
    const file=stateFile(home,uid,job.repo);noLinks(file);
    let state={};if(existsSync(file))state=JSON.parse(regular(file,uid,8192));
    const version=(await command('node',['--version'])).stdout+(await command('npm',['--version'])).stdout;
    const fingerprint=createHash('sha256').update(packageText).update(lockText).update(version).digest('hex');
    if(state.dependencies!==fingerprint||!existsSync(join(dir,'node_modules'))) {
      try {await command('npm',['ci','--no-audit','--no-fund']);}catch{return {...report,dependencies:'failed',reason:'dependencies'};}
      state.dependencies=fingerprint;
      const temporary=`${file}.${randomUUID()}.tmp`;noLinks(temporary);writeFileSync(temporary,JSON.stringify(state),{mode:0o600,flag:'wx'});renameSync(temporary,file);
    }
    report.dependencies='done';step='configuration';
    const configPath=join(dir,'.wongstack/project.json');noLinks(configPath);
    if(existsSync(configPath)) {
      const contract=JSON.parse(regular(configPath,uid,8192));
      if(contract.version!==1||!Array.isArray(contract.requiredSettings)||contract.requiredSettings.length>64||!contract.requiredSettings.every(name=>typeof name==='string'&&setting.test(name))||Object.keys(contract).some(key=>!['version','requiredSettings','browser'].includes(key))||('browser' in contract&&typeof contract.browser!=='boolean'))throw Error('configuration');
      if(contract.browser===true) {
        step='dependencies';
        try{await command('agent-browser',['install']);}catch{return {...report,dependencies:'failed',reason:'dependencies'};}
        step='configuration';
      }
      // Read only this repo's declared config, never host or AI credential paths.
      let content='';const envFile=join(dir,'.env');noLinks(envFile);if(existsSync(envFile))content=regular(envFile,uid,1024*1024);
      const values=new Map([...content.matchAll(/^(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/gm)].map(match=>[match[1],match[2].trim()]));
      report.missingSettings=[...new Set(contract.requiredSettings)].filter(name=>!values.has(name)||/^(?:["']{2})?$/.test(values.get(name)));
      report.configuration=report.missingSettings.length?'needs_input':'done';
    }
    step='paseo';
    const paseo=async args=>JSON.parse((await command('paseo',[...args,'--home',join(home,'.paseo'),'--json'])).stdout);
    const projects=await paseo(['project','ls']);if(!projects.some(project=>project.path===dir))await paseo(['project','create',dir]);
    const workspaces=await paseo(['workspace','ls']);
    if(!workspaces.some(workspace=>(workspace.cwd===dir||workspace.path===dir)&&(workspace.title??workspace.name)==='Start here (after you sign in)'))await paseo(['workspace','create','--path',dir,'--isolation','local','--title','Start here (after you sign in)']);
    report.paseo='done';
    return {...report,...(report.configuration!=='done'&&{reason:'configuration'})};
  }catch(error){return {...report,...(step==='dependencies'&&{dependencies:'failed'}),reason:PROJECT_REASONS.includes(error.message)?error.message:step};}
}
/* c8 ignore start -- process entry, fixed bounded JSON channel */
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>2048)process.exit(1);}
  try {console.log(JSON.stringify(await prepareProject(JSON.parse(input))));}catch{process.exitCode=1;}
}
/* c8 ignore stop */
