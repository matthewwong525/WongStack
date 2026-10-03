// The reviewed default-branch delivery process supplies source authority.
import { readFileSync,lstatSync,readdirSync } from 'node:fs';
import { dirname,join,resolve } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { findWranglerConfig,parseConfig } from './lib-wrangler-config.mjs';
import { privateWrite,privateRead,privateDirectory } from '../.agents/skills/memory/scripts/lib/machine-client-state.mjs';
import { setupOperator } from '../.agents/skills/memory/scripts/lib/machine-setup.mjs';
import { trustedMachineDataContext } from '../.agents/skills/memory/scripts/lib/machine-data-operator.mjs';
import { machineHash } from '../.agents/skills/memory/scripts/lib/machine-state.mjs';
import { checkPrivateAccess } from './check-private-access.mjs';
import { resourceTarget,requireValue } from '../.agents/skills/memory/scripts/lib/installation-validation.mjs';
import { compiledCoreHashes,compiledCore15Hashes } from '../.agents/skills/memory/worker/machine-core-contract.mjs';
import { privatePublicationJournal,validatePublicationJournal,verifyArtifactReceipt,verifyArtifactBytes,readPublicationArchive } from './memory-deploy-journal.mjs';
import { preparePublication,preparePublicationAcknowledgment,acknowledgePublication,publicationSource } from './lib-memory-publication.mjs';

export function publicationConfiguration(config,accountId=process.env.CLOUDFLARE_ACCOUNT_ID) {
 const value=config.vars?.MEMORY_INSTALLATION;if(!value)return null;
 let installation;try{installation=JSON.parse(value);}catch{throw new Error('memory publication configuration is invalid');}
 resourceTarget(installation,true);
 requireValue(config.name===installation.memoryWorkerName&&(config.account_id??accountId)===installation.accountId&&(config.d1_databases??[]).some(b=>b.binding==='MEMORY_DB'&&b.database_id===installation.databaseId),'target-mismatch');
 requireValue(!(config.env?.staging?.d1_databases??[]).some(b=>b.binding?.startsWith('MEMORY_'))&&!(config.env?.staging?.r2_buckets??[]).some(b=>b.binding?.startsWith('MEMORY_')),'target-mismatch');return installation;
}
export async function pipelineContext(env=process.env,dependencies={}) {
 requireValue(env.CF_BRANCH&&env.CF_BRANCH===env.CF_PRODUCTION_BRANCH,'publication-source-unverified');
 const path=dependencies.path??findWranglerConfig(),config=dependencies.config??parseConfig(path),installation=publicationConfiguration(config,env.CLOUDFLARE_ACCOUNT_ID),root=dependencies.root??resolve(dirname(path),'..');
 const revision=env.GITHUB_SHA??env.CF_COMMIT_SHA,source=dependencies.source??publicationSource(root,revision);requireValue(source.revision===revision,'publication-source-unverified');
 const dir=dependencies.dir??privateDirectory(join(homedir(),'.local','state','wongstack','publications',String(env.GITHUB_RUN_ID??revision)));
 const readPrivate=dependencies.readPrivate??privateRead,writePrivate=dependencies.writePrivate??privateWrite;
 // Persist the exact read/publication target before any provider HTTP request.
 const request={source,installation,worker:config.name,account:config.account_id??env.CLOUDFLARE_ACCOUNT_ID},priorRequest=readPrivate(join(dir,'request.json'));
 requireValue(!priorRequest||JSON.stringify(priorRequest)===JSON.stringify(request),'publication-journal-conflict');writePrivate(join(dir,'request.json'),request);
 const cf=dependencies.cf??(async(method,route,body)=>{
  requireValue(env.CLOUDFLARE_API_TOKEN,'operator-denied');const response=await fetch('https://api.cloudflare.com/client/v4'+route,{method,headers:{Authorization:`Bearer ${env.CLOUDFLARE_API_TOKEN}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(15000)});
  const json=await response.json();requireValue(response.ok&&json.success===true,'provider-unavailable');return json.result;
 });
 const get=dependencies.get??(async route=>{requireValue(env.GITHUB_TOKEN,'publication-artifact-unverified');const response=await fetch('https://api.github.com'+route,{headers:{Authorization:`Bearer ${env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json'},redirect:'error',signal:AbortSignal.timeout(15000)});requireValue(response.ok,'publication-artifact-unverified');return response.json();});
 const archive=dependencies.archive??(async id=>{requireValue(env.GITHUB_TOKEN,'publication-artifact-unverified');const first=await fetch(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/actions/artifacts/${id}/zip`,{headers:{Authorization:`Bearer ${env.GITHUB_TOKEN}`},redirect:'manual',signal:AbortSignal.timeout(15000)});let response=first;if(first.status===302){const location=new URL(first.headers.get('location'));requireValue(location.protocol==='https:'&&!location.username&&!location.password,'publication-artifact-unverified');response=await fetch(location,{redirect:'error',signal:AbortSignal.timeout(15000)});}requireValue(response.ok,'publication-artifact-unverified');return Buffer.from(await response.arrayBuffer());});
 const extractArchive=dependencies.extractArchive??readPublicationArchive;
 const local=dependencies.journal??privatePublicationJournal(dir);
 let journal=local;
 if(!env.GITHUB_ACTIONS&&installation) {
  requireValue(dependencies.journal||env.WONG_MEMORY_JOURNAL_ADAPTER,'publication-journal-required');
  if(!dependencies.journal){const adapter=await import(pathToFileURL(resolve(env.WONG_MEMORY_JOURNAL_ADAPTER)).href);requireValue(typeof adapter.createJournal==='function','publication-journal-required');journal=await adapter.createJournal({installation,source,dir});}
  requireValue(typeof journal.confirm==='function','publication-journal-required');
 }
 if(config.vars?.MEMORY_SCHEMA_VERSION==='15')requireValue(dependencies.context,'legacy-operator-required');
 const context=installation?(dependencies.context??await trustedMachineDataContext(setupOperator(cf),installation)):null;
 return {env,config,installation,source,dir,cf,get,archive,extractArchive,journal,context,local,readPrivate,writePrivate,protection:dependencies.protection};
}
export function artifactName(env,phase,attempt=env.GITHUB_RUN_ATTEMPT??'1') {return `memory-publication-${env.GITHUB_RUN_ID}-${attempt}-${phase}`;}
export async function restorePublication(p,folder) {
 if(!p.installation)return;
 requireValue(folder&&lstatSync(folder).isDirectory(),'publication-journal-required');
 const candidates=[];
 for(const entry of readdirSync(folder,{withFileTypes:true})) {
  if(!entry.isDirectory()||!entry.name.startsWith(`memory-publication-${p.env.GITHUB_RUN_ID}-`)||entry.name.endsWith('-published'))continue;
  const file=join(folder,entry.name,'publication.json');requireValue(lstatSync(file).isFile()&&!lstatSync(file).isSymbolicLink(),'publication-artifact-unverified');
  const record=validatePublicationJournal(JSON.parse(readFileSync(file,'utf8')));
  requireValue(record.source.revision===p.source.revision&&record.source.digest===p.source.digest&&JSON.stringify(record.installation)===JSON.stringify(p.installation),'publication-artifact-unverified');
  const list=await p.get(`/repos/${p.env.GITHUB_REPOSITORY}/actions/runs/${p.env.GITHUB_RUN_ID}/artifacts?per_page=100`);
  const exact=list.artifacts?.filter(a=>a.name===entry.name&&!a.expired);requireValue(exact?.length===1,'publication-artifact-unverified');
  const receipt=await verifyArtifactReceipt(exact[0],{repository:p.env.GITHUB_REPOSITORY,runId:p.env.GITHUB_RUN_ID,revision:p.source.revision,artifactName:entry.name},p.get);
  const verified=validatePublicationJournal(JSON.parse(Buffer.from(p.extractArchive(verifyArtifactBytes(await p.archive(receipt.id),receipt))).toString('utf8')));
  requireValue(JSON.stringify(verified)===JSON.stringify(record),'publication-artifact-unverified');
  candidates.push({record,receipt,name:entry.name});
 }
 requireValue(candidates.length>0,'publication-journal-required');
 candidates.sort((a,b)=>['intent','candidate','complete'].indexOf(b.record.phase)-['intent','candidate','complete'].indexOf(a.record.phase));
 const chosen=candidates[0];requireValue(candidates.every(c=>c.record.attemptId===chosen.record.attemptId&&c.record.predecessorId===chosen.record.predecessorId&&(!c.record.candidate||JSON.stringify(c.record.candidate)===JSON.stringify(chosen.record.candidate))),'publication-journal-conflict');
 await p.local.persist(chosen.record);p.writePrivate(join(p.dir,'durability.json'),{...chosen.receipt,name:chosen.name,recordHash:await machineHash(chosen.record)});
}
export async function bindArtifact(p,phase,id,digest) {
 if(!p.installation)return;
 const name=artifactName(p.env,phase),receipt=await verifyArtifactReceipt({id:Number(id),digest:digest.startsWith('sha256:')?digest:'sha256:'+digest},{repository:p.env.GITHUB_REPOSITORY,runId:p.env.GITHUB_RUN_ID,revision:p.source.revision,artifactName:name},p.get);
 const verified=validatePublicationJournal(JSON.parse(Buffer.from(p.extractArchive(verifyArtifactBytes(await p.archive(receipt.id),receipt))).toString('utf8')));
 requireValue(JSON.stringify(verified)===JSON.stringify(await p.journal.read()),'publication-artifact-unverified');
 p.writePrivate(join(p.dir,'durability.json'),{...receipt,name,recordHash:await machineHash(await p.journal.read())});
}
async function confirmed(p) {
 if(!p.installation)return;
 if(!p.env.GITHUB_ACTIONS){requireValue(await p.journal.confirm(await p.journal.read())===true,'publication-journal-unconfirmed');return;}
 const saved=p.readPrivate(join(p.dir,'durability.json'));requireValue(saved,'publication-journal-unconfirmed');
 requireValue(saved.recordHash===await machineHash(await p.journal.read()),'publication-journal-unconfirmed');
 await verifyArtifactReceipt(saved,{repository:p.env.GITHUB_REPOSITORY,runId:p.env.GITHUB_RUN_ID,revision:p.source.revision,artifactName:saved.name},p.get);
}
export async function verifyActualPublication(p,evidence) {
 requireValue((await (p.protection??checkPrivateAccess)(p.config,'production',path=>p.cf('GET',path))).protection==='configured','access-unverified');
 requireValue(evidence.targetJson===JSON.stringify(resourceTarget(p.installation,true)),'target-mismatch');
 for(const worker of evidence.projection.workers) {
  const settings=await p.cf('GET',`/accounts/${p.installation.accountId}/workers/scripts/${worker.name}/settings`),active=await p.cf('GET',`/accounts/${p.installation.accountId}/workers/scripts/${worker.name}/versions/${worker.versionId}`);
  for(const bindings of [settings.bindings,active.resources?.bindings])requireValue(Array.isArray(bindings)&&bindings.filter(b=>b.name==='CF_VERSION_METADATA').length===1&&bindings.find(b=>b.name==='CF_VERSION_METADATA').type==='version_metadata','version-metadata-unverified');
  // The executing candidate must carry the reviewed exact installation pins.
  const vars=active.resources.bindings;
  if(p.config.vars?.MEMORY_SCHEMA_VERSION==='15')requireValue(vars.find(binding=>binding.name==='MEMORY_SCHEMA_VERSION')?.text==='15','unreviewed-deployment');requireValue(vars.find(b=>b.name==='MEMORY_INSTALLATION')?.text===JSON.stringify(p.installation),'target-mismatch');
 }
}
export async function runPublicationPhase(p,phase) {
 if(!p.installation)return {configured:false};
 if(phase==='prepare'){if(Number(p.env.GITHUB_RUN_ATTEMPT??1)>1)requireValue(await p.journal.read(),'publication-journal-required');await preparePublication(p);}
 else if(phase==='before'){await confirmed(p);const intent=await p.journal.read();requireValue(intent&&intent.source.digest===p.source.digest,'publication-journal-required');return {configured:true,skipDeploy:!!intent.candidate};}
 else if(phase==='candidate'){await confirmed(p);await preparePublicationAcknowledgment({...p,verify:e=>verifyActualPublication(p,e)});}
 else if(phase==='ack'){await confirmed(p);await acknowledgePublication({...p,verify:e=>verifyActualPublication(p,e)});}
 else throw new Error('unknown publication phase');
 const record=await p.journal.read();validatePublicationJournal(record);
 const exportDir=join(p.dir,'artifact');p.writePrivate(join(exportDir,'publication.json'),record);
 return {configured:true,artifact:join(exportDir,'publication.json'),name:artifactName(p.env,phase==='prepare'?'intent':phase==='candidate'?'candidate':'receipt')};
}
export async function publishedObservation(p) {
 const core=await (p.config.vars?.MEMORY_SCHEMA_VERSION==='15'?compiledCore15Hashes():compiledCoreHashes()),account=p.config.account_id??p.env.CLOUDFLARE_ACCOUNT_ID,name=p.config.name;
 const deployments=await p.cf('GET',`/accounts/${account}/workers/scripts/${name}/deployments?per_page=1`),current=deployments.deployments?.[0];
 requireValue(current?.versions?.length===1&&current.versions[0].percentage===100,'unreviewed-deployment');
 const observation={verified:true,sourceHash:p.source.digest,sourceRevision:p.source.revision,...core,workerVersions:{[name]:current.versions[0].version_id},deploymentReceipt:p.installation?(await p.journal.read())?.receipt??null:null};
 const subdomain=(await p.cf('GET',`/accounts/${account}/workers/subdomain`)).subdomain;
 observation.target=p.installation?resourceTarget(p.installation,true):{accountId:account,databaseId:p.config.d1_databases.find(b=>b.binding==='MEMORY_DB').database_id,bucketName:p.config.r2_buckets?.find(b=>b.binding==='MEMORY_BUCKET')?.bucket_name??null,appWorkerName:name,memoryWorkerName:name,appUrl:`https://${name}.${subdomain}.workers.dev`,memoryOrigin:`https://${name}.${subdomain}.workers.dev`};
 p.writePrivate(join(p.dir,'published.json'),observation);return {artifact:join(p.dir,'published.json'),name:artifactName(p.env,'published')};
}
