import test from 'node:test';
import assert from 'node:assert/strict';
import { completedImportFixture,importFixture,additionalImportMachine,GRANT,hash } from './fixtures/memory/legacy-import.mjs';
import { originalLegacyUniverse,correctLegacyOwnership } from '../../.agents/skills/memory/scripts/lib/machine-legacy-operator.mjs';
import { readLegacyState } from '../../.agents/skills/memory/scripts/lib/machine-legacy-state.mjs';
import { digest } from '../../.agents/skills/memory/scripts/lib/installation-validation.mjs';
const query=(f,operation,params={},options)=>f.call('query',{operation,params},options);
const successful=async response=>{assert.equal(response.status,200,await response.clone().text());return response.json();};
test('actual public15 finite routes serve claimed and modern14 data with ≤50 fresh statements',async t=>{
 const f=await completedImportFixture(t,14);
 const capture=await successful(await f.call('capture',await f.captureInput({newTags:[{name:'modern',definition:'Modern tag.',aliasOf:null}],facts:[{slug:'business',type:'project',body:'Modern source14 completed capture remains visible.',tags:['modern'],supersedes:[]}]})));assert.equal(capture.result.operation.completed,true);
 for(const [operation,params] of [['facts',{}],['facts',{terms:'"Original"'}],['digest',{}],['tags',{}],['stats',{}],['facts',{branch:'main'}],['facts',{change:'business'}],['sessions',{}],['facts',{ids:[1]}],['transcript-info',{sessionId:'codex:legacy'}]]) {const response=await query(f,operation,params);assert.equal(response.status,200,`${operation} ${await response.clone().text()}`);assert.ok(f.totalStatements<=50,`${operation}: ${f.totalStatements}`);}
 const body=JSON.stringify(await successful(await query(f,'facts')));assert.match(body,/Original authored decision/);assert.match(body,/Original private preference/);assert.match(body,/Modern source14 completed capture/);assert.doesNotMatch(body,/Unclaimed sentinel/);
 const objectHash=await digest('old@example.com/raw/session'),raw=await f.call('transcript',null,{method:'GET',headers:{'Wong-Memory-Object':objectHash,'Wong-Memory-Grant':GRANT}});assert.equal(raw.status,200,await raw.clone().text());assert.equal(await raw.text(),'raw!');assert.ok(f.totalStatements<=50);
 for(const key of ['unselected/raw/key','arbitrary/raw/key']){const before=f.rawGets,response=await f.call('transcript',null,{method:'GET',headers:{'Wong-Memory-Object':await digest(key),'Wong-Memory-Grant':GRANT}});assert.equal(response.ok,false);assert.equal(f.rawGets,before);}
});
test('source read-only universe never opens unselected or private raw bytes',async t=>{
 const selection={factIds:[1,2],sessionIds:['codex:legacy'],rawKeys:[]},f=await importFixture(t,6,{selection,privateRaw:true});
 assert.deepEqual(f.rawReads,[]);const universe=await originalLegacyUniverse(f.trusted,f.inventory);assert.deepEqual(f.rawReads,[]);assert.equal(universe.filter(row=>row.kind==='raw').length,2);assert.ok(universe.filter(row=>row.kind==='raw').every(row=>row.record.restriction==='unclaimed-metadata-only'));
 await f.apply();assert.deepEqual(f.rawReads,[]);const response=await query(f,'transcript-info',{sessionId:'codex:legacy'});assert.equal(response.status,200);assert.deepEqual((await response.json()).result,[]);
});
test('shared readers see shared claims while private types/raw and every shared write remain closed',async t=>{
 const f=await completedImportFixture(t),other=await additionalImportMachine(f),options={path:other.path,token:other.token};
 const data=JSON.stringify(await successful(await query(f,'facts',{},options)));assert.match(data,/Original authored decision/);assert.doesNotMatch(data,/Original private|Unclaimed sentinel/);assert.ok(f.totalStatements<=50);
 const {signedData}=await import('./fixtures/memory/data.mjs');const input=await signedData({...f,signing:other.signing},{attemptId:crypto.randomUUID(),expected:await f.expected(),payload:{machineId:other.machineId,repositoryId:f.installation.repositoryId,grantId:other.grantId,machineCommitment:other.signing.commitment,machineRevision:1,grantRevision:2,credentialGeneration:1,credentialHash:await digest(other.token),visibility:'shared',source:'save',newTags:[],session:{id:'codex:reader-'+crypto.randomUUID(),agent:'codex',status:'captured',reason:null,previousCursor:null,nextCursor:'4',updatedAt:new Date().toISOString(),branch:null,cwd:null,startedAt:null,endedAt:null},facts:[{slug:'business',type:'project',body:'Reader shared write forbidden.',tags:[],supersedes:[]}],run:null}});
 const before=f.db.prepare('SELECT count(*) n FROM facts').get().n,response=await f.call('capture',input,{path:other.path.replace(/query$/,'capture'),token:other.token});assert.equal(response.ok,false);assert.equal(f.db.prepare('SELECT count(*) n FROM facts').get().n,before);
 const privateInput=await signedData({...f,signing:other.signing},{attemptId:crypto.randomUUID(),expected:await f.expected(),payload:{...input.payload,visibility:'private'}});
 const privateResponse=await f.call('capture',privateInput,{path:other.path.replace(/query$/,'capture'),token:other.token});assert.equal(privateResponse.status,200,await privateResponse.clone().text());assert.equal(f.db.prepare('SELECT count(*) n FROM facts').get().n,before+1);
});
test('ordinary correction overlays a completed successor without updating imported source bytes',async t=>{
 const f=await completedImportFixture(t),before=f.db.prepare('SELECT * FROM facts WHERE id=1').get();
 const result=await successful(await f.call('capture',await f.captureInput({facts:[{slug:'business',type:'project',body:'Explicit modern correction.',tags:[],supersedes:[1]}]})));assert.equal(result.result.operation.completed,true);
 assert.deepEqual(f.db.prepare('SELECT * FROM facts WHERE id=1').get(),before);assert.equal(f.db.prepare('SELECT count(*) n FROM memory_legacy_corrections').get().n,1);
 const body=JSON.stringify(await successful(await query(f,'facts')));assert.doesNotMatch(body,/Original authored decision/);assert.match(body,/Explicit modern correction/);
});
test('audited admin quarantine access needs an actual durable sanitized access row',async t=>{
 const f=await completedImportFixture(t,6,{scope:'memory:read memory:write memory:admin'}),data=await successful(await query(f,'facts',{everyone:true}));assert.match(JSON.stringify(data),/Unclaimed sentinel/);
 assert.ok(f.totalStatements<=50);const rows=f.db.prepare('SELECT * FROM memory_legacy_access_audit').all();assert.equal(rows.length,1);assert.equal(rows[0].scope_json,JSON.stringify({everyone:true,operation:'facts'}));assert.doesNotMatch(JSON.stringify(rows),/Original authored|old@example|Bearer|synthetic/);
 const original=f.env.MEMORY_DB.batch;f.env.MEMORY_DB.batch=async statements=>original(statements.filter(row=>!row.sql.startsWith('INSERT INTO memory_legacy_access_audit')));
 const response=await query(f,'facts',{everyone:true});assert.equal(response.ok,false);assert.doesNotMatch(await response.text(),/Unclaimed sentinel/);
});
async function adminRaw(f) {const state=await readLegacyState(f.context),claim=state.originalClaims.find(row=>row.kind==='raw');const input={correctionId:crypto.randomUUID(),predecessorId:claim.id,claimId:claim.id,recordHash:claim.snapshot_hash,evidence:{decisionId:crypto.randomUUID(),kind:'reviewed-admin-only-raw',evidenceRef:'private-reviewed-exact-raw',evidenceHash:hash('8'),backupHash:state.attempt.backup_hash,ownershipHash:state.attempt.ownership_hash},destination:f.destination,visibility:'admin-only'};await correctLegacyOwnership(f.context,input);return input;}
test('reviewed admin-only raw denies its non-admin owner before any bucket read',async t=>{
 const f=await completedImportFixture(t);await adminRaw(f);const before=f.rawGets,response=await f.call('transcript',null,{method:'GET',headers:{'Wong-Memory-Object':await digest('old@example.com/raw/session'),'Wong-Memory-Grant':GRANT}});assert.equal(response.ok,false);assert.equal(f.rawGets,before);
 const info=await query(f,'transcript-info',{sessionId:'codex:legacy'});assert.equal(info.status,200);assert.deepEqual((await info.json()).result,[]);
});
for(const failure of ['dropped','revoked','tampered'])test(`admin raw ${failure} audit prevents object access`,async t=>{
 const f=await completedImportFixture(t,6,{scope:'memory:read memory:write memory:admin'});await adminRaw(f);const original=f.env.MEMORY_DB.batch;
 f.env.MEMORY_DB.batch=async statements=>{if(failure==='dropped')return original(statements.filter(row=>!row.sql.startsWith('INSERT INTO memory_legacy_access_audit')));const out=await original(statements);if(statements.some(row=>row.sql.startsWith('INSERT INTO memory_legacy_access_audit'))){if(failure==='revoked')f.db.exec("UPDATE memory_principals SET status='removed'");else{const ddl=f.db.prepare("SELECT sql FROM sqlite_master WHERE name='memory_legacy_access_audit_immutable'").get().sql;f.db.exec('DROP TRIGGER memory_legacy_access_audit_immutable');f.db.exec("UPDATE memory_legacy_access_audit SET scope_json='{}'");f.db.exec(ddl);}}return out;};
 const before=f.rawGets,response=await f.call('transcript',null,{method:'GET',headers:{'Wong-Memory-Object':await digest('old@example.com/raw/session'),'Wong-Memory-Grant':GRANT}});assert.equal(response.ok,false);assert.equal(f.rawGets,before);
});
for(const failure of ['correction','completion'])test(`dropped ownership ${failure} remains ineffective and cannot recover another attempt`,async t=>{
 const f=await completedImportFixture(t);f.drop=statement=>statement.sql.startsWith(failure==='correction'?'INSERT INTO memory_legacy_ownership_corrections':'INSERT INTO memory_legacy_ownership_completions');await assert.rejects(adminRaw(f));
 assert.equal(f.db.prepare("SELECT visibility FROM memory_legacy_effective_claims WHERE kind='raw'").get().visibility,'private');
});
