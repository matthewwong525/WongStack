import assert from 'node:assert/strict';
import { test } from 'node:test';
import { coreFixture,MACHINE,GRANT,TOKEN,signed,attempt } from './fixtures/memory/core.mjs';
import { enrollOtherRuntimeMachine,corruptRuntime } from './fixtures/memory/runtime.mjs';
import { revokeRuntimeMachine } from '../../.agents/skills/memory/scripts/lib/machine-runtime-operator.mjs';
import { handleMemory } from '../../.agents/skills/memory/worker/memory-worker.mjs';
import { CORE_D1_LIMIT, coreTableColumns } from '../../.agents/skills/memory/worker/machine-core-contract.mjs';
const query=(f,params={})=>f.call('query',{operation:'facts',params});
async function captured(f,changes={}){const input=await f.captureInput(changes),response=await f.call('capture',input);assert.equal(response.status,200,JSON.stringify(await response.clone().json()));assert.ok(f.totalStatements<=CORE_D1_LIMIT);return (await response.json()).result;}
test('fresh full activation before grants serves bounded finite capture/search/digest/tag/session/run data',async t=>{
 const f=await coreFixture(t);const result=await captured(f,{newTags:[{name:'memory',definition:'Memory work.',aliasOf:null}],facts:[{slug:'business',type:'project',body:'Every preview route is checked.',tags:['memory'],supersedes:[]}]});
 assert.equal(result.operation.completed,true);assert.equal(result.operation.outcome.facts.length,1);
 for(const operation of ['facts','digest','sessions','tags','stats','runs','consolidation']){const response=await f.call('query',{operation,params:{}});assert.equal(response.status,200,operation);assert.ok(f.totalStatements<=50,`${operation}: ${f.totalStatements}`);}
 const response=await f.call('query',{operation:'facts',params:{terms:'"preview"',tags:['memory']}});assert.match(JSON.stringify(await response.json()),/preview route/);
});
test('canonical routes deny legacy REST/join, unknown/method/encoding/ID/origin/anonymous and service identity without fallback',async t=>{
 const f=await coreFixture(t),before=f.snapshot();
 const paths=['/_memory','/_memory/join','/_memory/accounts/a/d1/database/d/query','/_memory/v2/repositories/x/machines/y/query','/_memory/v2/repositories/'+f.installation.repositoryId+'/machines/'+MACHINE+'/query%2f','/_memory/v2/repositories/'+f.installation.repositoryId+'/machines/'+MACHINE+'/query/'];
 for(const path of paths)assert.notEqual((await f.call('query',{operation:'facts',params:{}},{path})).status,200);
 for(const method of ['GET','PUT','DELETE','OPTIONS'])assert.notEqual((await f.call('query',null,{method})).status,200);
 for(const token of ['', 'wongm_fake.email','service-JWT','cloudflare-account-token'])assert.notEqual((await f.call('query',{operation:'facts',params:{}},{token,headers:{Cookie:'CF_Authorization=anything','Cf-Access-Jwt-Assertion':'anything','Cf-Access-Authenticated-User-Email':'owner@example.com'}})).status,200);
 for(const origin of ['https://preview.example.workers.dev','http://fixture-memory.example.workers.dev'])assert.notEqual((await f.call('query',{operation:'facts',params:{}},{origin})).status,200);
 assert.deepEqual(f.snapshot(),before);
});
test('actual executing version, closed pins and unsupported compiled activation pairs refuse unchanged',async t=>{
 const f=await coreFixture(t),before=f.snapshot();
 for(const field of ['MEMORY_INSTALLATION','MEMORY_WORKER_NAME','MEMORY_DATABASE_ID','MEMORY_BUCKET_NAME']){const value=f.env[field];f.env[field]='';assert.notEqual((await query(f)).status,200);f.env[field]=value;}
 const version=f.env.CF_VERSION_METADATA;f.env.CF_VERSION_METADATA={id:'wrong-version'};assert.notEqual((await query(f)).status,200);f.env.CF_VERSION_METADATA=version;
 corruptRuntime(f,'memory_runtime_activations','UPDATE memory_runtime_activations SET protocol_hash=?',['a'.repeat(64)]);assert.notEqual((await query(f)).status,200);
 assert.equal(f.db.prepare('SELECT count(*) n FROM facts').get().n,0);assert.equal(before.find(([n])=>n==='facts')[1].length,0);
});
test('two machines see shared work but never foreign user/feedback/private/raw data, including last-machine privacy',async t=>{
 const f=await coreFixture(t),other=await enrollOtherRuntimeMachine({...f,expected:f.runtimeExpected});
 await captured(f,{facts:[{slug:'business',type:'project',body:'Shared project decision.',tags:[],supersedes:[]},{slug:'business',type:'feedback',body:'Private preference.',tags:[],supersedes:[]}]});
 const path=`/_memory/v2/repositories/${f.installation.repositoryId}/machines/${other.machineId}/query`;
 const response=await f.call('query',{operation:'facts',params:{}},{path,token:'synthetic-other-bearer'.padEnd(48,'0')});assert.equal(response.status,200);const text=JSON.stringify(await response.json());assert.match(text,/Shared project decision/);assert.doesNotMatch(text,/Private preference/);
 assert.equal((await f.call('query',{operation:'facts',params:{everyone:true}},{path,token:'synthetic-other-bearer'.padEnd(48,'0')})).status,403);
 await revokeRuntimeMachine(f.context,{attemptId:attempt('revoke-other-core'),expected:await f.runtimeExpected(),payload:{machineId:other.machineId,grantId:other.grantId,machineRevision:1,grantRevision:2}});
 const own=await query(f);assert.equal(own.status,200);assert.match(JSON.stringify(await own.json()),/Private preference/);
});
test('reader private capture succeeds, shared override and foreign attribution/supersede/session takeover deny before barrier',async t=>{
 const f=await coreFixture(t,{scope:'memory:read'});await captured(f,{visibility:'private'});
 const before=f.snapshot();for(const change of [{visibility:'shared'},{machineId:attempt('forged-machine')},{grantId:attempt('wrong-grant')}])assert.equal((await f.call('capture',await f.captureInput(change))).status,403);
 assert.deepEqual(f.snapshot(),before);
});
test('all custom/authority SQL operations are retired even for data-admin',async t=>{
 const f=await coreFixture(t,{scope:'memory:read memory:write memory:admin'}),before=f.snapshot();
 for(const operation of ['sql','query','memory_keys','grant','migrate','writable_schema'])assert.equal((await f.call('query',{operation,params:{sql:'SELECT * FROM memory_machine_grants'}})).status,403);
 assert.deepEqual(f.snapshot(),before);
});
test('late activation await revocation and final-guard maintenance deny every returned fact',async t=>{
 for(const stage of ['activation','final']) {
  const f=await coreFixture(t);await captured(f);let fired=false,readFacts=false,hooks=0;
  f.beforeRead=async sql=>{if(sql.startsWith('SELECT f.id'))readFacts=true;if(fired||!readFacts)return;if(stage==='activation'?sql.startsWith('SELECT x.* FROM memory_runtime_activations'):sql.startsWith('SELECT name,type,sql FROM sqlite_master WHERE EXISTS')){fired=true;hooks++;await revokeRuntimeMachine(f.context,{attemptId:attempt('late-revoke-'+stage),expected:await f.runtimeExpected(),payload:{machineId:MACHINE,grantId:GRANT,machineRevision:1,grantRevision:2}});}};
  const response=await query(f);assert.equal(response.status,403);assert.doesNotMatch(JSON.stringify(await response.json()),/Every preview route/);assert.equal(fired,true);assert.equal(readFacts,true);assert.equal(hooks,1);
 }
});
test('tampered protection body with retained trigger name is refused',async t=>{
 const f=await coreFixture(t);f.db.exec('DROP TRIGGER memory_runtime_rotations_immutable');f.db.exec('CREATE TRIGGER memory_runtime_rotations_immutable BEFORE UPDATE ON memory_runtime_rotations BEGIN SELECT 1; END');assert.equal((await query(f)).status,403);
});
test('oversized chunked JSON and forged Content-Length deny without a mutation',async t=>{
 const f=await coreFixture(t),path=f.request('capture').url,before=f.snapshot();
 for(const length of [null,'1','-1','Infinity','70001']) {
  const body=new ReadableStream({start(c){c.enqueue(new Uint8Array(70001));c.close();}}),headers={'Content-Type':'application/json',Authorization:`Bearer ${TOKEN}`};if(length!==null)headers['Content-Length']=length;
  const response=await handleMemory(new Request(path,{method:'POST',body,duplex:'half',headers}),f.env);assert.equal(response.status,403);
 }
 assert.deepEqual(f.snapshot(),before);
});
test('self/enrollment status frame stays four fields and dataSnapshot is separate; owned candidate absence never grants access',async t=>{
 const f=await coreFixture(t),input=await signed(f,'self-status',{attemptId:crypto.randomUUID(),expected:await f.runtimeExpected(),payload:{machineId:MACHINE,grantId:GRANT,machineCommitment:f.signing.commitment}});
 const response=await f.call('self-status',input,{headers:{'Wong-Memory-Attempt':crypto.randomUUID(),'Wong-Memory-Candidate':'f'.repeat(64)}});assert.equal(response.status,200);const body=await response.json();assert.equal(Object.keys(body.result.snapshot).length,4);assert.equal(Object.keys(body.dataSnapshot).length,6);assert.equal(body.candidate.absent,true);assert.equal(body.result.status,'pending-setup');
});

test('staging and previews never read bindings on any core route',async t=>{
 const f=await coreFixture(t);for(const environment of ['staging','preview','local',undefined])for(const [route,method] of Object.entries((await import('../../.agents/skills/memory/worker/machine-core-contract.mjs')).CORE_ROUTES)){
 let touched=0;const spy={prepare(){touched++;throw Error('must not read');},batch(){touched++;throw Error('must not write');}};
 const response=await handleMemory(f.request(route,method==='POST'?{operation:'facts',params:{}}:null,{method}),{...f.env,WONG_ENVIRONMENT:environment,MEMORY_DB:spy,MEMORY_BUCKET:{get(){touched++;},put(){touched++;}}});assert.equal(response.status,404);assert.equal(touched,0);
 }
});

test('explicit invalid supersedes and ignored pagination options are denied before any write',async t=>{
 const f=await coreFixture(t),input=await f.captureInput({facts:[{slug:'business',type:'project',body:'An invalid explicit correction.',tags:[],supersedes:[999]}]}),before=f.snapshot();assert.equal((await f.call('capture',input)).status,403);assert.deepEqual(f.snapshot(),before);assert.equal((await f.call('query',{operation:'facts',params:{offset:1}})).status,403);
});
test('combined FTS/tag/branch/change bindings preserve the exact finite search filter ordering',async t=>{
 const f=await coreFixture(t);await captured(f,{newTags:[{name:'route',definition:'Route review.',aliasOf:null}],facts:[{slug:'business',type:'project',body:'Preview routes require a probe.',tags:['route'],supersedes:[]}]});const response=await f.call('query',{operation:'facts',params:{terms:'"preview"',tags:['route'],branch:'main',change:'renamed'}});assert.equal(response.status,200);assert.match(JSON.stringify(await response.json()),/require a probe/);
});

test('late completed provider read followed by changed head, protection or maintenance denies payload release',async t=>{
 for(const change of ['head','ddl','barrier']){const f=await coreFixture(t);await captured(f);let readFacts=false,fired=false;
 f.afterRead=async sql=>{if(sql.startsWith('SELECT f.id'))readFacts=true;if(!fired&&readFacts&&sql.startsWith('SELECT x.* FROM memory_runtime_activations')){fired=true;if(change==='ddl')f.db.exec('DROP TRIGGER memory_runtime_rotations_immutable');else if(change==='head'){const ddl=f.db.prepare("SELECT sql FROM sqlite_master WHERE name='memory_data_configuration_guard'").get().sql;f.db.exec('DROP TRIGGER memory_data_configuration_guard');f.db.prepare('UPDATE memory_data_configuration SET operation_id=?').run('different-deployment-head');f.db.exec(ddl);}else{const ddl=f.db.prepare("SELECT sql FROM sqlite_master WHERE name='memory_machine_configuration_guard'").get().sql;f.db.exec('DROP TRIGGER memory_machine_configuration_guard');f.db.prepare("UPDATE memory_machine_configuration SET state='maintenance',barrier_attempt_id=?").run('late-maintenance-barrier');f.db.exec(ddl);}}};
 const response=await query(f);assert.equal(readFacts,true);assert.equal(fired,true);assert.equal(response.status,403);assert.doesNotMatch(await response.text(),/Every preview route/);}
});

test('every compiled packed-state column map matches the exact ordered actual schema columns',async t=>{
 const f=await coreFixture(t);for(const [table,columns] of Object.entries(coreTableColumns)){assert.match(table,/^[A-Za-z_][A-Za-z0-9_]*$/);assert.ok(columns.every(column=>/^[A-Za-z_][A-Za-z0-9_]*$/.test(column)),table);assert.deepEqual(f.db.prepare('PRAGMA table_info('+table+')').all().map(row=>row.name),columns,table);}
 const response=await f.call('query',{operation:'facts',params:{}});assert.equal(response.status,200,await response.clone().text());assert.ok(f.totalStatements<=CORE_D1_LIMIT);
});
