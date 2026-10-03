import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { coreFixture } from './fixtures/memory/core.mjs';
import { deployFixtureVersion } from './fixtures/memory/data.mjs';
import { retainedStore,publicationArchive } from './fixtures/memory/setup.mjs';
import { preparePublication,preparePublicationAcknowledgment,acknowledgePublication,durablePublication } from '../lib-memory-publication.mjs';
import { validatePublicationJournal,verifyArtifactReceipt,readPublicationArchive,verifyArtifactBytes } from '../memory-deploy-journal.mjs';
import { publicationConfiguration,artifactName,pipelineContext,runPublicationPhase,bindArtifact,restorePublication,publishedObservation,verifyActualPublication } from '../memory-deploy-pipeline.mjs';
const source={revision:'1'.repeat(40),digest:'2'.repeat(64)};
function journal() {const store=retainedStore();return {read:store.read,persist:async value=>store.write(validatePublicationJournal(value))};}
const params=(f,j)=>({context:f.context,journal:j,installation:f.installation,source,verify:async evidence=>assert.equal(evidence.targetJson,JSON.stringify(f.target))});

test('production retains exact intent before publication, refreshes before attempt, and recovers one lost receipt',async t=>{
 const f=await coreFixture(t),j=journal(),p=params(f,j),before=f.snapshot();
 const intent=await preparePublication(p);assert.equal(intent.phase,'intent');assert.deepEqual(f.snapshot(),before);assert.deepEqual(await preparePublication(p),intent);
 await deployFixtureVersion(f);const candidate=await preparePublicationAcknowledgment(p);assert.equal(candidate.phase,'candidate');assert.equal(f.db.prepare('SELECT count(*) n FROM memory_data_attempts').get().n,0);
 const receipt=await acknowledgePublication(p);assert.equal(receipt.completed,true);const saved=f.snapshot();assert.equal((await acknowledgePublication(p)).requestHash,receipt.requestHash);assert.deepEqual(f.snapshot(),saved);
 assert.equal((await j.read()).phase,'complete');assert.equal(f.db.prepare('SELECT count(*) n FROM memory_data_deployments').get().n,1);
});
test('source, target, missing durable input and unreviewed callback cannot trigger an acknowledgement',async t=>{
 const f=await coreFixture(t),j=journal(),p=params(f,j);
 await assert.rejects(preparePublicationAcknowledgment(p),e=>e.code==='publication-journal-required');
 await preparePublication(p);
 await assert.rejects(preparePublication({...p,source:{...source,digest:'3'.repeat(64)}}),e=>e.code==='publication-journal-conflict');
 await assert.rejects(preparePublicationAcknowledgment(p),e=>e.code==='unreviewed-deployment');
 await deployFixtureVersion(f);
 await assert.rejects(preparePublicationAcknowledgment({...p,verify:null}),e=>e.code==='publication-source-unverified');
 await assert.rejects(durablePublication({persist:async()=>{},read:async()=>null},await j.read()),e=>e.code==='publication-journal-unconfirmed');
 await assert.rejects(acknowledgePublication(p),e=>e.code==='publication-journal-required');
 assert.equal(f.db.prepare('SELECT count(*) n FROM memory_data_deployments').get().n,0);
});
test('partial publication acknowledgement remains closed and cannot manufacture a new attempt',async t=>{
 const f=await coreFixture(t),j=journal(),p=params(f,j);await preparePublication(p);await deployFixtureVersion(f);await preparePublicationAcknowledgment(p);
 f.atomic=false;f.beforeStatement=async(_i,s)=>{if(s.sql.startsWith('INSERT INTO memory_data_completions'))throw new Error('synthetic receipt loss before commit');};
 await assert.rejects(acknowledgePublication(p));f.beforeStatement=null;
 await assert.rejects(acknowledgePublication(p),e=>e.code==='machine-operation-incomplete');
 assert.equal(f.db.prepare('SELECT count(*) n FROM memory_data_completions').get().n,0);assert.equal((await j.read()).phase,'candidate');
});
test('artifact provenance binds exact ID/digest/run/revision/name/repository and never accepts secrets',async()=>{
 const receipt={id:42,digest:'sha256:'+'a'.repeat(64)},expected={repository:'example/repo',runId:7,revision:source.revision,artifactName:'owned-intent'};
 const artifact={...receipt,name:expected.artifactName,expired:false,workflow_run:{id:7,head_sha:source.revision}},run={id:7,head_sha:source.revision,event:'push',path:'.github/workflows/deploy.yml',repository:{full_name:'example/repo'}};
 const get=async path=>path.includes('/artifacts/')?artifact:run;assert.deepEqual(await verifyArtifactReceipt(receipt,expected,get),receipt);
 for(const bad of [{...receipt,id:0},{...receipt,digest:'wrong'}])await assert.rejects(verifyArtifactReceipt(bad,expected,get));
 for(const field of ['artifactName','revision','repository','runId'])await assert.rejects(verifyArtifactReceipt(receipt,{...expected,[field]:'foreign'},get));
 assert.throws(()=>validatePublicationJournal({token:'synthetic-bearer'}));assert.equal(artifactName({GITHUB_RUN_ID:'7',GITHUB_RUN_ATTEMPT:'2'},'intent'),'memory-publication-7-2-intent');
});
test('delivery consumes a strict source target and refuses foreign memory or staging bindings',()=>{
 const installation={accountId:'a'.repeat(32),databaseId:'11111111-2222-3333-4444-555555555555',bucketName:null,appWorkerName:'fixture',memoryWorkerName:'fixture',appUrl:'https://fixture.example.com',memoryOrigin:'https://fixture.example.com',installationId:'i'.repeat(32),repositoryId:'r'.repeat(32)};
 const config={account_id:installation.accountId,name:'fixture',vars:{MEMORY_INSTALLATION:JSON.stringify(installation)},d1_databases:[{binding:'MEMORY_DB',database_id:installation.databaseId}]};
 assert.deepEqual(publicationConfiguration(config),installation);assert.equal(publicationConfiguration({vars:{MEMORY_INSTALLATION:''}}),null);
 assert.throws(()=>publicationConfiguration({...config,name:'foreign'}));assert.throws(()=>publicationConfiguration({...config,env:{staging:{d1_databases:config.d1_databases}}}));
 const shell=readFileSync(new URL('../cf-deploy.sh',import.meta.url),'utf8');assert.ok(shell.indexOf('memory-deploy.mjs')<shell.indexOf('npx wrangler deploy)'));
 const sourceText=readFileSync(new URL('../memory-deploy-pipeline.mjs',import.meta.url),'utf8');assert.match(sourceText,/publication-journal-required/);assert.match(sourceText,/WONG_MEMORY_JOURNAL_ADAPTER/);
});

async function pipelineFixture(t,{github=true,configured=true}={}) {
 const f=await coreFixture(t),j=journal(),files=new Map(),archives=new Map(),artifacts=new Map();
 const dir=mkdtempSync(join(tmpdir(),'wong-publication-pipeline-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 for(const name of f.workers.keys()){f.setBinding(name,'CF_VERSION_METADATA',{type:'version_metadata'});}
 const env={CF_BRANCH:'main',CF_PRODUCTION_BRANCH:'main',GITHUB_SHA:source.revision,GITHUB_RUN_ID:'7',GITHUB_RUN_ATTEMPT:'1',GITHUB_REPOSITORY:'example/repo',...(github?{GITHUB_ACTIONS:'true'}:{})};
 const config={account_id:f.target.accountId,name:f.target.memoryWorkerName,vars:{MEMORY_INSTALLATION:configured?JSON.stringify(f.installation):''},d1_databases:[{binding:'MEMORY_DB',database_id:f.target.databaseId}],r2_buckets:[{binding:'MEMORY_BUCKET',bucket_name:f.target.bucketName}]};
 const run={id:7,head_sha:source.revision,event:'push',path:'.github/workflows/deploy.yml',repository:{full_name:env.GITHUB_REPOSITORY}};
 const get=async path=>path.includes('/artifacts?')?{artifacts:[...artifacts.values()]}:path.includes('/artifacts/')?artifacts.get(Number(path.split('/').at(-1))):run;
 const cf=async(method,path,body)=>path.endsWith('/workers/subdomain')?{subdomain:'fixture'}:f.operator.cloudflare(method,path,body);
 if(!github)j.confirm=async()=>true;
 const dependencies={path:join(dir,'app/wrangler.jsonc'),config,source,dir,readPrivate:path=>files.get(path),writePrivate:(path,value)=>files.set(path,structuredClone(value)),cf,get,archive:async id=>archives.get(id),journal:j,context:f.context,protection:async()=>({protection:'configured'})};
 const p=await pipelineContext(env,dependencies);
 const bind=async phase=>{const bytes=publicationArchive(await j.read(),'publication.json',{deflated:true}),id=artifacts.size+1,digest='sha256:'+createHash('sha256').update(bytes).digest('hex'),name=artifactName(env,phase);artifacts.set(id,{id,digest,name,expired:false,workflow_run:{id:7,head_sha:source.revision}});archives.set(id,bytes);await bindArtifact(p,phase,id,digest);return {id,digest,name,bytes};};
 return {f,j,p,bind,dir,files,artifacts,archives,env,dependencies};
}
test('Actions phase driver durably binds intent and candidate before ack and skips a retained upload',async t=>{
 const {f,j,p,bind,files}=await pipelineFixture(t);
 assert.equal((await runPublicationPhase(p,'prepare')).configured,true);
 await assert.rejects(runPublicationPhase(p,'before'),e=>e.code==='publication-journal-unconfirmed');
 await bind('intent');assert.equal((await runPublicationPhase(p,'before')).skipDeploy,false);
 for(const name of f.workers.keys())f.setBinding(name,'MEMORY_INSTALLATION',{type:'plain_text',text:JSON.stringify(f.installation)});await deployFixtureVersion(f);await runPublicationPhase(p,'candidate');
 await assert.rejects(runPublicationPhase(p,'ack'),e=>e.code==='publication-journal-unconfirmed');
 await bind('candidate');assert.equal((await runPublicationPhase(p,'before')).skipDeploy,true);
 await runPublicationPhase(p,'ack');assert.equal((await j.read()).phase,'complete');await bind('receipt');
 const before=f.snapshot();await runPublicationPhase(p,'ack');assert.deepEqual(f.snapshot(),before);
 const output=await publishedObservation(p),observation=files.get(output.artifact);assert.equal(observation.deploymentReceipt.completed,true);assert.equal(observation.sourceHash,source.digest);
});
test('artifact restore authenticates archive bytes, foreign content, missing and conflicting retained requests fail closed',async t=>{
 const x=await pipelineFixture(t);await runPublicationPhase(x.p,'prepare');const artifact=await x.bind('intent');
 const folder=join(x.dir,'downloads'),own=join(folder,artifact.name);mkdirSync(own,{recursive:true});writeFileSync(join(own,'publication.json'),JSON.stringify(await x.j.read()));
 await restorePublication(x.p,folder);assert.equal((await x.j.read()).phase,'intent');
 x.archives.set(artifact.id,Buffer.from('tampered'));await assert.rejects(restorePublication(x.p,folder),e=>e.code==='publication-artifact-unverified');x.archives.set(artifact.id,artifact.bytes);
 const original=x.artifacts.get(artifact.id);x.artifacts.set(artifact.id,{...original,workflow_run:{id:8,head_sha:source.revision}});await assert.rejects(restorePublication(x.p,folder));x.artifacts.set(artifact.id,original);
 const empty=join(x.dir,'empty');mkdirSync(empty);await assert.rejects(restorePublication(x.p,empty),e=>e.code==='publication-journal-required');
 const changed={...source,digest:'9'.repeat(64)};await assert.rejects(pipelineContext(x.env,{...x.dependencies,source:changed}),e=>e.code==='publication-journal-conflict');
 assert.deepEqual(x.files.get(join(x.dir,'request.json')).source,source);
 const bad=structuredClone(await x.j.read());bad.source.digest='9'.repeat(64);writeFileSync(join(own,'publication.json'),JSON.stringify(bad));await assert.rejects(restorePublication(x.p,folder));
});
test('private delivery requires a configured durable adapter; staging and missing version metadata have no ack',async t=>{
 const x=await pipelineFixture(t,{github:false});await runPublicationPhase(x.p,'prepare');assert.equal((await runPublicationPhase(x.p,'before')).skipDeploy,false);
 await assert.rejects(pipelineContext(x.env,{...x.dependencies,journal:undefined}),e=>e.code==='publication-journal-required');
 await assert.rejects(pipelineContext({...x.env,CF_BRANCH:'staging'},x.dependencies),e=>e.code==='publication-source-unverified');
 for(const name of x.f.workers.keys())x.f.setBinding(name,'MEMORY_INSTALLATION',{type:'plain_text',text:JSON.stringify(x.f.installation)});await deployFixtureVersion(x.f);x.f.setBinding(x.f.target.memoryWorkerName,'CF_VERSION_METADATA',{type:'plain_text',text:'foreign'});
 await assert.rejects(runPublicationPhase(x.p,'candidate'),e=>e.code==='version-metadata-unverified');assert.equal(x.f.db.prepare('SELECT count(*) n FROM memory_data_deployments').get().n,0);
 const u=await pipelineFixture(t,{configured:false});for(const phase of ['prepare','before','candidate','ack'])assert.deepEqual(await runPublicationPhase(u.p,phase),{configured:false});
 assert.equal(u.f.db.prepare('SELECT count(*) n FROM memory_data_deployments').get().n,0);
});

test('bounded archive reader accepts stored and deflated JSON and refuses malformed, duplicate, foreign path, corruption and oversize archives',()=>{
 const value={source,phase:'intent'};
 for(const deflated of [false,true])assert.deepEqual(JSON.parse(readPublicationArchive(publicationArchive(value,'publication.json',{deflated}))),value);
 assert.deepEqual(JSON.parse(readPublicationArchive(publicationArchive(value,'published.json'),'published.json')),value);
 for(const member of ['../publication.json','nested/publication.json','foreign.json'])assert.throws(()=>readPublicationArchive(publicationArchive(value,member)));
 const valid=publicationArchive(value),crc=Buffer.from(valid),duplicate=Buffer.from(valid),oversize=Buffer.from(valid),encrypted=Buffer.from(valid);
 crc[30+'publication.json'.length]^=1;duplicate.writeUInt16LE(2,duplicate.length-12);oversize.writeUInt32LE(600000,oversize.readUInt32LE(oversize.length-6)+24);encrypted.writeUInt16LE(1,6);
 for(const bad of [Buffer.from('not zip'),valid.subarray(0,valid.length-1),crc,duplicate,oversize,encrypted])assert.throws(()=>readPublicationArchive(bad));
 const receipt={digest:'sha256:'+createHash('sha256').update(valid).digest('hex')};assert.deepEqual(verifyArtifactBytes(valid,receipt),valid);assert.throws(()=>verifyArtifactBytes(crc,receipt));
});
