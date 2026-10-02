#!/usr/bin/env node
// Runs from reviewed pinned source, as the workspace user; stdin is the only handoff.
import { existsSync, mkdirSync, writeFileSync, symlinkSync, lstatSync, readlinkSync, unlinkSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateContext, safeContext, loadContext, command, writeSecrets, privateWrite, privatePath, request, memoryResult, https } from '../.agents/skills/save/scripts/hosted.mjs';
import { copyPayload, installRecord, run, SOURCE } from './install-wongstack.mjs';

function refs(text) {
  const result=new Map();
  for (const line of text.trim().split('\n').filter(Boolean)) {
    const fields=line.split(/\s+/), [sha,ref]=fields;
    if (fields.length!==2 || !/^[a-f0-9]{40}$/.test(sha) || !ref?.startsWith('refs/') || /[\\\x00-\x20\x7f~^:?*\[]/.test(ref) || ref.includes('..') || ref.includes('@{') || ref.includes('//') || ref.endsWith('.') || ref.split('/').some(part=>!part || part.startsWith('.') || part.endsWith('.lock')) || result.has(ref)) throw new Error('invalid advertised refs');
    result.set(ref,sha);
  }
  return result;
}
export function verifyRefs(expected,actual) {
  const a=refs(expected), b=refs(actual);
  if (a.size!==b.size || [...a].some(([ref,sha])=>b.get(ref)!==sha)) throw new Error('migration refs differ');
  return true;
}
async function advertisedHead(url,inventory,git) {
  const text=(await git(['ls-remote','--symref',url,'HEAD'])).stdout;
  const name=/^ref: (refs\/heads\/[^\s]+)\s+HEAD$/m.exec(text)?.[1];
  const object=/^([a-f0-9]{40})\s+HEAD$/m.exec(text)?.[1];
  if(name && object && inventory.get(name)===object) return name;
  return inventory.has('refs/heads/main') ? 'refs/heads/main' : [...inventory.keys()].find(ref=>ref.startsWith('refs/heads/'));
}
async function fetchBatches(dir,specs,git) {
  for(let offset=0;offset<specs.length;offset+=32) await git(['-C',dir,'fetch','--no-tags','origin',...specs.slice(offset,offset+32)]);
}
// Dedicated verification cache only. Never prune or overwrite a working clone.
export async function restoreArtifacts(url,dir,exec,{expected}={}) {
  const git=args=>exec('git',args);
  privatePath(join(dir,'HEAD'));
  const advertised=(await git(['ls-remote','--refs',url])).stdout, inventory=refs(advertised);
  if(expected!==undefined) verifyRefs(expected,advertised);
  if(!inventory.size) throw new Error('full-ref restore requires a populated repository');
  if(existsSync(join(dir,'HEAD'))) {
    if((await git(['-C',dir,'rev-parse','--is-bare-repository'])).stdout.trim()!=='true' || (await git(['-C',dir,'remote','get-url','origin'])).stdout.trim()!==url) throw new Error('restore cache belongs to another repository');
  } else {
    if(existsSync(dir)) throw new Error('restore cache needs reconciliation');
    const head=await advertisedHead(url,inventory,git);
    mkdirSync(dirname(dir),{recursive:true});
    if(head) await git(['clone','--bare','--single-branch','--no-tags','--branch',head.slice('refs/heads/'.length),url,dir]);
    else {
      // Tag-only or other ref namespaces still require complete export support.
      await git(['init','--bare',dir]);
      await git(['-C',dir,'remote','add','origin',url]);
      const first=inventory.keys().next().value;
      await fetchBatches(dir,[`+${first}:${first}`],git);
    }
  }
  await fetchBatches(dir,[...inventory.keys()].map(ref=>`+${ref}:${ref}`),git);
  const local=refs((await git(['-C',dir,'show-ref'])).stdout);
  // Preserve --prune semantics only inside this origin-verified bare cache.
  for(const [ref,sha]of local) if(!inventory.has(ref)) await git(['-C',dir,'update-ref','-d',ref,sha]);
  verifyRefs(advertised,(await git(['ls-remote','--refs',url])).stdout);
  verifyRefs(advertised,(await git(['-C',dir,'show-ref'])).stdout);
  await git(['-C',dir,'fsck','--full']);
  return advertised;
}
async function cloneArtifacts(url,dir,restored,exec) {
  const git=args=>exec('git',args), advertised=(await git(['ls-remote','--refs',url])).stdout, inventory=refs(advertised);
  if(!inventory.size) {await git(['clone',url,dir]);return;}
  await restoreArtifacts(url,restored,exec,{expected:advertised});
  const head=await advertisedHead(url,inventory,git);
  if(!head) throw new Error('working clone requires an advertised branch');
  await git(['clone','--single-branch','--no-tags','--branch',head.slice('refs/heads/'.length),url,dir]);
  const specs=[...inventory.keys()].flatMap(ref=>ref.startsWith('refs/heads/') ? [`+${ref}:refs/remotes/origin/${ref.slice('refs/heads/'.length)}`] : ref.startsWith('refs/tags/') ? [`+${ref}:${ref}`] : []);
  await fetchBatches(dir,specs,git);
  verifyRefs(advertised,(await git(['ls-remote','--refs',url])).stdout);
  // Match a normal clone's visible branches/tags and default remote HEAD.
  // This local setting does not make later wildcard fetches bounded.
  await git(['-C',dir,'config','remote.origin.fetch','+refs/heads/*:refs/remotes/origin/*']);
  await git(['-C',dir,'symbolic-ref','refs/remotes/origin/HEAD',`refs/remotes/origin/${head.slice('refs/heads/'.length)}`]);
  if((await git(['-C',dir,'symbolic-ref','HEAD'])).stdout.trim()!==head || (await git(['-C',dir,'rev-parse','HEAD'])).stdout.trim()!==inventory.get(head) || (await git(['-C',dir,'config','--get','remote.origin.fetch'])).stdout.trim()!=='+refs/heads/*:refs/remotes/origin/*' || (await git(['-C',dir,'symbolic-ref','refs/remotes/origin/HEAD'])).stdout.trim()!==`refs/remotes/origin/${head.slice('refs/heads/'.length)}`) throw new Error('working clone branch tracking differs');
  const visible=refs((await git(['-C',dir,'for-each-ref','--format=%(objectname) %(refname)','refs/remotes/origin/','refs/tags/'])).stdout);
  visible.delete('refs/remotes/origin/HEAD');
  const wanted=[...inventory].flatMap(([ref,sha])=>ref.startsWith('refs/heads/') ? [[`refs/remotes/origin/${ref.slice('refs/heads/'.length)}`,sha]] : ref.startsWith('refs/tags/') ? [[ref,sha]] : []);
  const lines=map=>[...map].map(([ref,sha])=>`${sha}\t${ref}`).join('\n');
  verifyRefs(lines(wanted),lines(visible));
  await git(['-C',dir,'fsck','--full']);
}
function privateJson(file,value) {
  privatePath(file);mkdirSync(dirname(file),{recursive:true,mode:0o700});privateWrite(file,`${JSON.stringify(value,null,2)}\n`);
}
async function verifyWorkspace(context,fetchFn) {
  const verified=await request(context,'/v1/workspace',undefined,{fetchFn});
  for (const key of ['projectId','gitUrl','sourceRepo','sourceCommit','ownerEmail','role','subject','subjectEmail']) if(verified[key]!==context[key]) throw new Error('workspace grant differs');
  return verified;
}
export async function prepare(job,{home=process.env.HOME,exec=run,fetchFn}={}) {
  validateContext(job);
  if ((await exec('git',['-C',SOURCE,'rev-parse','HEAD'])).stdout.trim()!==job.sourceCommit) throw new Error('source pin differs');
  if (typeof job.token!=='string' || !job.token || /[\r\n\0]/.test(job.token)) throw new Error('invalid access grant');
  if (job.githubRepo && (!/^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/.test(job.githubRepo) || job.role!=='owner')) throw new Error('invalid migration');
  if(job.legacyRepo && !/^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/.test(job.legacyRepo)) throw new Error('invalid legacy repository');
  const verified=await verifyWorkspace(job,fetchFn);
  const previousRepo=job.githubRepo || job.legacyRepo;
  const legacy=previousRepo && join(home,previousRepo.split('/')[1]);
  const existingLegacy=legacy && existsSync(join(legacy,'.git'));
  const dir=existingLegacy ? legacy : join(home,'wongstack');
  const existingWorkspace=existsSync(join(dir,'.git'));
  privatePath(join(dir,'.git','wongstack-hosted.json'));
  // Preflight the two global entry points before any origin switch.
  for (const agent of ['.claude','.codex']) {
    const skill=join(home,agent,'skills','wong-setup');
    privatePath(join(home,agent,'skills','setup-preflight'));
    if(existsSync(skill) && (!lstatSync(skill).isSymbolicLink() || !readlinkSync(skill).endsWith('/.agents/skills/wong-setup'))) throw new Error('global setup skill already exists');
  }
  const state=join(home,'.config','wongstack','hosted',`${job.projectId}.json`);
  privateJson(state,{...safeContext(job),token:job.token});
  const helper=join(SOURCE,'.agents','skills','save','scripts','hosted.mjs');
  // Per URL, including path: a grant for this repo is never supplied to another repo.
  const helperScript=join(home,'.config','wongstack','hosted',`${job.projectId}-credential.mjs`);
  privateWrite(helperScript,`import {readFileSync} from 'node:fs';
import {credential,privatePath} from ${JSON.stringify(pathToFileURL(helper).href)};
if(process.argv[2]==='get') {try {
  privatePath(${JSON.stringify(state)});
  let input='';for await(const chunk of process.stdin)input+=chunk;
  process.stdout.write(await credential(JSON.parse(readFileSync(${JSON.stringify(state)},'utf8')),input));
} catch {console.error('Hosted Git access failed.');process.exitCode=1;}}
`);
  await exec('git',['config','--global',`credential.${job.gitUrl}.useHttpPath`,'true']);
  await exec('git',['config','--global',`credential.${job.gitUrl}.helper`,`!node '${helperScript.replace(/'/g, "'\\''")}'`]);
  const git=args=>exec('git',args);
  if (job.githubRepo) {
    const source=`https://github.com/${job.githubRepo}.git`;
    const mirror=join(home,'.cache','wong-stack',`migration-${job.projectId}`);
    if (existsSync(join(mirror,'HEAD'))) await git(['-C',mirror,'fetch','--prune','origin']);
    else { mkdirSync(dirname(mirror),{recursive:true});await git(['clone','--mirror',source,mirror]); }
    const expected=(await git(['ls-remote','--refs',source])).stdout;
    verifyRefs(expected,(await git(['-C',mirror,'show-ref'])).stdout);
    await git(['-C',mirror,'fsck','--full']);
    const destination=(await git(['ls-remote','--refs',job.gitUrl])).stdout;
    // Interrupted imports may resume only where every existing ref matches the source.
    const wanted=refs(expected);
    if ([...refs(destination)].some(([ref,sha])=>wanted.get(ref)!==sha)) throw new Error('destination holds other history');
    await git(['-C',mirror,'push','--mirror',job.gitUrl]);
    verifyRefs(expected,(await git(['ls-remote','--refs',job.gitUrl])).stdout);
    const restored=join(home,'.cache','wong-stack',`restored-${job.projectId}`);
    await restoreArtifacts(job.gitUrl,restored,exec,{expected});
    verifyRefs(expected,(await git(['ls-remote','--refs',source])).stdout);
  }
  if (job.legacyRepo && !job.githubRepo && existsSync(join(dir,'.git'))) {
    // Owner migration is already acknowledged by the cloud. This machine only
    // verifies the backup's advertised objects; it cannot push or rewrite them.
    const restored=join(home,'.cache','wong-stack',`member-restore-${job.projectId}`);
    await restoreArtifacts(job.gitUrl,restored,exec);
    const sourceRefs=refs((await git(['ls-remote','--refs',`https://github.com/${job.legacyRepo}.git`])).stdout);
    for(const sha of new Set(sourceRefs.values())) await git(['-C',restored,'cat-file','-e',sha]);
    // The cache proves backup-object preservation without changing user refs/files.
  }
  if (!existsSync(join(dir,'.git'))) await cloneArtifacts(job.gitUrl,dir,join(home,'.cache','wong-stack',`workspace-restore-${job.projectId}`),exec);
  else {
    const origin=(await git(['-C',dir,'remote','get-url','origin'])).stdout.trim();
    if (origin!==job.gitUrl) {
      if (!previousRepo || ![ `https://github.com/${previousRepo}`,`https://github.com/${previousRepo}.git`,`git@github.com:${previousRepo}.git` ].includes(origin)) throw new Error('workspace belongs to another repository');
      await git(['-C',dir,'remote','add','github-backup',origin]).catch(async()=>{
        if ((await git(['-C',dir,'remote','get-url','github-backup'])).stdout.trim()!==origin) throw new Error('backup remote differs');
      });
      await git(['-C',dir,'remote','set-url','origin',job.gitUrl]);
    }
  }
  const common=resolve(dir,(await git(['-C',dir,'rev-parse','--git-common-dir'])).stdout.trim());
  privateJson(join(common,'wongstack-hosted.json'),{...safeContext(job),token:job.token});
  for (const agent of ['.claude','.codex']) {
    const skill=join(home,agent,'skills','wong-setup'); mkdirSync(dirname(skill),{recursive:true});
    if (existsSync(skill)) {
      if (!lstatSync(skill).isSymbolicLink() || !readlinkSync(skill).endsWith('/.agents/skills/wong-setup')) throw new Error('global setup skill already exists');
      unlinkSync(skill);
    }
    symlinkSync(join(SOURCE,'.agents','skills','wong-setup'),skill);
  }
  if (existsSync(join(dir,'.agents','.wong-stack.json'))) writeSecrets({primary:dirname(common)}, {WONGSTACK_HOSTED_TOKEN:job.token});
  if (!existingWorkspace) {
    await git(['-C',dir,'config','user.email',verified.subjectEmail]);
    await git(['-C',dir,'config','user.name',verified.subjectEmail.split('@')[0]]);
  }
  return {projectId:job.projectId,sourceCommit:job.sourceCommit,verified:true,dir};
}
export async function installHosted({cwd=process.cwd(),exec=run,today=new Date().toISOString().slice(0,10),fetchFn}={}) {
  const adapted=async(file,args)=>(await exec(file,args));
  const context=await loadContext({cwd,exec:adapted});
  if (!context) throw new Error('prepared workspace missing');
  const recordPath=join(context.root,'.agents','.wong-stack.json');
  if (existsSync(recordPath)) throw new Error('already installed; resume hosted setup');
  if(context.role!=='owner') {
    await verifyWorkspace(context,fetchFn);
    throw new Error('owner must install and publish the hosted project before member setup');
  }
  const pendingPath=join(context.common,'wongstack-installing.json');
  privatePath(pendingPath);
  const pending=existsSync(pendingPath) ? JSON.parse(readFileSync(pendingPath,'utf8')) : null;
  if (pending && pending.sourceCommit!==context.sourceCommit) throw new Error('pending install has a different source');
  if (!pending) {
    for (const name of readdirSync(context.root)) {
      if (['.git','.env'].includes(name)) continue;
      if (!['openspec','.scratch'].includes(name)) throw new Error('workspace has files; preserve them and plan migration');
      const stat=lstatSync(join(context.root,name));
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('unsafe setup planning directory');
    }
  }
  // The source is fixed by trusted preparation, never a candidate-selected repository.
  const actual=(await exec('git',['-C',SOURCE,'rev-parse','HEAD'])).stdout.trim();
  if (actual!==context.sourceCommit) throw new Error('setup source differs from prepared source');
  const exclude=join(context.common,'info','exclude');
  privatePath(exclude);
  mkdirSync(dirname(exclude),{recursive:true});
  const existing=existsSync(exclude) ? readFileSync(exclude,'utf8') : '';
  if (!existing.includes('.env*')) writeFileSync(exclude,`${existing}\n.env*\n!.env.example\n.dev.vars*\n!.dev.vars.example\n`);
  privateJson(pendingPath,{sourceCommit:context.sourceCommit,payloadCopied:pending?.payloadCopied===true});
  const manifest = pending?.payloadCopied ? JSON.parse(readFileSync(join(SOURCE,'.agents','skills','wong-sync','references','payload-files.json'),'utf8')) : await copyPayload(context.root,exec);
  privateJson(pendingPath,{sourceCommit:context.sourceCommit,payloadCopied:true});
  const result=await command('setup',[],context,{fetchFn});
  const record=await installRecord(manifest,exec,today);
  record.components.memory=result.installRecordMemory;
  record.hosted=safeContext(context);
  privateJson(join(context.root,'app','wrangler.jsonc'),result.wrangler);
  // This record is the completion marker: config must be durable first.
  privateJson(recordPath,record);
  unlinkSync(pendingPath);
  return {installed:true,projectId:context.projectId,...(result.memory && {memory:result.memory})};
}
export async function configureHosted({cwd=process.cwd(),exec=run,fetchFn}={}) {
  const context=await loadContext({cwd,exec:async(file,args)=>exec(file,args)});
  if(!context) throw new Error('installed prepared workspace required');
  const recordPath=join(context.root,'.agents','.wong-stack.json');
  privatePath(recordPath);
  if(!existsSync(recordPath)) throw new Error('installed prepared workspace required');
  const record=JSON.parse(readFileSync(recordPath,'utf8'));
  await verifyWorkspace(context,fetchFn);
  if(record.hosted!==undefined && record.hosted!==null) {
    // Committed metadata only distinguishes a resume from migration. All authority
    // and app pins come from the verified private grant and service responses.
    if(record.hosted.projectId!==context.projectId || record.hosted.serviceUrl!==context.serviceUrl || record.hosted.gitUrl!==context.gitUrl) throw new Error('installed hosted project differs');
    const status=await request(context,'/v1/status',undefined,{fetchFn});
    for(const key of ['projectId','gitUrl','sourceRepo','sourceCommit','ownerEmail']) if(status[key]!==context[key]) throw new Error('hosted status project differs');
    let memory=status.memory?.protocolVersion===1 ? memoryResult(status.memory) : null;
    if(status.setup==='ready' && !memory) throw new Error('hosted memory pins are missing');
    let production=null;
    if(status.production!==null && status.production!==undefined) {
      const value=status.production, url=https(value.url);
      if(!/^[a-f0-9]{40}$/.test(value.sha || '') || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value.version || '') || url.pathname!=='/' || !memory || url.origin!==memory.appUrl || status.productionUrl!==memory.appUrl) throw new Error('hosted production pins differ');
      production={sha:value.sha,version:value.version,url:url.origin};
    }
    if(memory) {
      // Project-global status is not introspection of this requesting computer.
      if(memory.status==='ready') memory={...memory,status:'pending-device',reason:'no-current-device',action:{kind:'connect-device',url:`${memory.appUrl}/apps/devices/`,operatorConfirmationRequired:false}};
      if(status.setup!=='ready' || status.stopped===true || !production) memory={...memory,reason:'maintenance',action:null};
      else if(status.accessVerified!==true) memory={...memory,reason:'access-unverified',action:null};
    }
    return {existingProject:true,hosted:safeContext(context),production,memory,enrollmentPending:true};
  }
  if(context.role!=='owner') throw new Error('owner must configure the hosted migration before member setup');
  const result=await command('setup',[],context,{fetchFn});
  // A plan adapts installed config and records, preserving local code and the former memory store.
  return {configurationOnly:true,hosted:safeContext(context),...result};
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if(process.argv[2]==='configure') console.log(JSON.stringify(await configureHosted()));
    else if(process.argv[2]==='install') console.log(JSON.stringify(await installHosted()));
    else {let stdin='';for await(const chunk of process.stdin)stdin+=chunk;console.log(JSON.stringify(await prepare(JSON.parse(stdin))));}
  } catch {console.error('Hosted preparation failed; workspace work was preserved.');process.exitCode=1;}
}
