import test from 'node:test';
import assert from 'node:assert/strict';
import { importFixture,completedImportFixture,hash } from './fixtures/memory/legacy-import.mjs';
import { prepareLegacyCutover } from '../../.agents/skills/memory/scripts/lib/machine-legacy-operator.mjs';
import { readLegacyState } from '../../.agents/skills/memory/scripts/lib/machine-legacy-state.mjs';
import { readMachineRuntimeStatus } from '../../.agents/skills/memory/scripts/lib/machine-runtime-operator.mjs';
test('exact completed source retry independently proves closure/current source/pins and never reports ready',async t=>{
 const f=await completedImportFixture(t),mutations={...f.callbackCounts};const again=await f.apply();assert.deepEqual(again,f.receipt);for(const key of ['closeServing','disableBucket','retireCredential','write'])assert.equal(f.callbackCounts[key],mutations[key]);
 f.reviewedSource={...f.reviewedSource,digest:hash('f')};await assert.rejects(f.apply(),e=>e.code==='publication-source-unverified');
});
test('conflicting private cutover identity refuses before mutation',async t=>{const f=await importFixture(t);await assert.rejects(prepareLegacyCutover(f.trusted,f.inventory,f.review,{...f.input,attemptId:crypto.randomUUID()}),e=>e.code==='machine-attempt-conflict');assert.equal(f.callbackCounts.write,0);});
for(const boundary of ['memory_legacy_protocol_transitions','memory_legacy_deployments','memory_legacy_audit','memory_legacy_completions','exposure'])test(`dropped nontransactional ${boundary} never exposes or claims readiness`,async t=>{
 const f=await importFixture(t);f.drop=statement=>boundary==='exposure'?statement.sql.startsWith('UPDATE memory_legacy_configuration'):statement.sql.startsWith('INSERT INTO '+boundary+'(');
 await assert.rejects(f.apply());const c=f.db.prepare('SELECT state FROM memory_legacy_configuration').get();assert.equal(c?.state,'maintenance');
 await assert.rejects(f.call('query',{operation:'facts',params:{}}).then(async response=>{assert.equal(response.ok,false);throw new Error('public closed');}));
 await assert.rejects(f.apply());assert.equal(f.db.prepare('SELECT state FROM memory_legacy_configuration').get().state,'maintenance');
});
test('maintenance permits trusted admission while public requests and ready observations remain closed',async t=>{
 const f=await importFixture(t);f.drop=statement=>statement.sql.startsWith('UPDATE memory_legacy_configuration');await assert.rejects(f.apply());
 const status=await readMachineRuntimeStatus(f.context);assert.equal(status.memory.status,'blocked');assert.equal(status.schemaVersion,15);const response=await f.call('query',{operation:'sessions',params:{ids:[]}});assert.equal(response.ok,false);
});
test('revocation between exact final receipt and exposure denies the last boundary',async t=>{
 const f=await importFixture(t);f.afterStatement=statement=>{if(statement.sql.startsWith('INSERT INTO memory_legacy_completions('))f.db.exec("UPDATE memory_principals SET status='removed' WHERE id=(SELECT machine_id FROM memory_legacy_completions)");};
 await assert.rejects(f.apply());assert.equal(f.db.prepare('SELECT state FROM memory_legacy_configuration').get().state,'maintenance');
});
test('partial and malformed15 remains closed and cannot be adopted',async t=>{const f=await completedImportFixture(t);f.db.exec('DROP TRIGGER memory_legacy_completion_guard');await assert.rejects(readLegacyState(f.context),e=>e.code==='legacy-schema-conflict');const response=await f.call('query',{operation:'facts',params:{}});assert.equal(response.ok,false);});

test('lost response after actual final SQL recovers one exact receipt and retry performs no source/provider mutation',async t=>{
 const f=await importFixture(t);f.afterStatement=statement=>{if(statement.sql.startsWith('INSERT INTO memory_legacy_completions('))f.loseWrite=true;};
 const receipt=await f.apply();assert.equal(receipt.operation.completed,true);assert.equal(f.db.prepare('SELECT state FROM memory_legacy_configuration').get().state,'exposed');
 const counts={...f.callbackCounts};assert.deepEqual(await f.apply(),receipt);for(const key of ['write','closeServing','disableBucket','retireCredential'])assert.equal(f.callbackCounts[key],counts[key]);assert.equal(f.db.prepare('SELECT count(*) n FROM memory_legacy_completions').get().n,1);
});
test('ambiguous retained identical provider candidate remains closed before source mutation',async t=>{const f=await importFixture(t);f.ambiguous=true;const outcomes=await Promise.allSettled([f.apply(),f.apply()]);assert.ok(outcomes.every(row=>row.status==='rejected'));assert.equal(f.callbackCounts.write,0);assert.equal(f.callbackCounts.closeServing,0);assert.equal(f.db.prepare('SELECT max(version) n FROM schema_migrations').get().n,6);});

test('review refuses an oversized original universe before closure or any source mutation',async t=>{
 const f=await importFixture(t);for(let i=0;i<1001;i++)f.db.prepare("INSERT INTO facts(slug,type,body,source,created_at,author) VALUES('large','project','Original unselected row.','save','fixture','old@example.com')").run();
 const before=f.db.prepare('SELECT count(*) n FROM facts').get().n;await assert.rejects(prepareLegacyCutover(f.trusted,f.inventory,f.review,f.input));assert.equal(f.db.prepare('SELECT count(*) n FROM facts').get().n,before);assert.equal(f.callbackCounts.closeServing,0);assert.equal(f.callbackCounts.write,0);
});

for(const [phase,prefix] of [['DDL','CREATE TABLE memory_legacy_configuration'],['attempt','INSERT INTO memory_legacy_attempts('],['closure','INSERT INTO memory_legacy_closures('],['witness','INSERT INTO memory_machine_audit('],['baseline','INSERT INTO memory_legacy_baselines('],['runtime','INSERT INTO memory_runtime_configuration('],['data','INSERT INTO memory_data_configuration('],['activation','INSERT INTO memory_runtime_activations'],['piece','INSERT INTO memory_legacy_pieces('],['quarantine','INSERT INTO memory_legacy_quarantine(']])test(`dropped nontransactional ${phase} boundary leaves the15 public core closed`,async t=>{
 const f=await importFixture(t);f.drop=statement=>phase==='DDL'?statement.sql.includes(prefix):statement.sql.startsWith(prefix);await assert.rejects(f.apply());
 const exists=f.db.prepare("SELECT count(*) n FROM sqlite_master WHERE name='memory_legacy_configuration'").get().n;if(exists)assert.notEqual(f.db.prepare('SELECT state FROM memory_legacy_configuration').get()?.state,'exposed');
 const response=await f.call('query',{operation:'facts',params:{}});assert.equal(response.ok,false);assert.doesNotMatch(await response.text(),/Original authored|Unclaimed sentinel/);
});
for(const drift of ['schema','rows','source','pins','destination'])test(`fresh ${drift} drift refuses before source writes`,async t=>{
 const f=await importFixture(t);if(drift==='schema')f.db.exec('DROP TRIGGER facts_never_edited');if(drift==='rows')f.db.exec("INSERT INTO fact_tags(fact_id,tag) VALUES(2,'legacy')");if(drift==='source')f.reviewedSource={...f.reviewedSource,digest:hash('f')};if(drift==='pins')f.callbacks.inspectPins=async()=>hash('f');if(drift==='destination')f.destinationUnavailable=true;
 await assert.rejects(f.apply());assert.equal(f.callbackCounts.write,0);assert.equal(f.db.prepare('SELECT max(version) n FROM schema_migrations').get().n,6);
});

import { planLegacyIssueWitness } from '../../.agents/skills/memory/scripts/lib/machine-legacy-planners.mjs';
for(const table of ['memory_machine_attempts','memory_machine_grants','memory_machine_audit','memory_machine_completions','memory_legacy_baselines'])test(`dropped exact ${table} witness/baseline readback stops before runtime era`,async t=>{
 const f=await importFixture(t);f.drop=statement=>statement.sql.startsWith('INSERT INTO '+table+'(');await assert.rejects(f.apply(),e=>e.code==='machine-operation-incomplete');
 assert.equal(f.db.prepare('SELECT state FROM memory_legacy_configuration').get().state,'maintenance');
 for(const name of ['memory_runtime_configuration','memory_data_configuration','memory_runtime_activations','memory_legacy_completions'])assert.equal(f.db.prepare('SELECT count(*) n FROM '+name).get().n,0,name);
 assert.ok(!f.journal.some(frame=>frame.candidate.phase==='runtime-data-era'));
 assert.equal((await f.call('query',{operation:'facts',params:{}})).ok,false);
});
test('pre-runtime15 permits one exact real issue witness and rejects ordinary foreign changed-scope late competing and incomplete staging',async t=>{
 const f=await importFixture(t);const tables=['memory_machine_attempts','memory_machine_grants','memory_machine_audit','memory_machine_completions'];
 f.drop=statement=>tables.some(table=>statement.sql.startsWith('INSERT INTO '+table+'('));await assert.rejects(f.apply(),e=>e.code==='machine-operation-incomplete');
 const witness=await planLegacyIssueWitness(f.intent,f.intent.witness),first=witness[0],run=statement=>f.db.prepare(statement.sql).run(...statement.params);
 for(const change of ['ordinary','foreign','scope','late']) {
  const candidate={sql:first.sql,params:structuredClone(first.params)};
  if(change==='ordinary')candidate.params[2]='enroll';
  if(change==='foreign')candidate.params[1]=crypto.randomUUID();
  if(change==='scope'){const payload=JSON.parse(candidate.params[5]);payload.scope='memory:read';candidate.params[5]=JSON.stringify(payload);}
  if(change==='late')candidate.params[candidate.params.length-1]-=121;
  assert.throws(()=>run(candidate),/data lifecycle incomplete|machine authority is stale or incomplete|FOREIGN KEY/);
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_machine_attempts').get().n,0);
 }
 f.db.exec('BEGIN');try {
  run(first);const competing={sql:first.sql,params:structuredClone(first.params)};competing.params[0]=crypto.randomUUID();competing.params[10]=crypto.randomUUID();assert.throws(()=>run(competing));
  for(const statement of witness.slice(1))run(statement);
  const done=f.db.prepare('SELECT * FROM memory_machine_completions').get(),audit=f.db.prepare('SELECT * FROM memory_machine_audit').get();
  assert.equal(done.attempt_id,f.intent.witnessAttemptId);assert.equal(done.audit_id,audit.id);assert.equal(audit.action,'issue');assert.equal(audit.target_id,f.destination.grantId);
  assert.equal(f.db.prepare('SELECT state FROM memory_machine_configuration').get().state,'pending');assert.equal(f.db.prepare('SELECT count(*) n FROM memory_machine_bootstrap_completions').get().n,0);
 }finally{f.db.exec('ROLLBACK');}
 for(const omitted of ['memory_legacy_manifests','memory_legacy_closures']) {
  const partial=await importFixture(t);partial.drop=statement=>statement.sql.startsWith('INSERT INTO '+omitted+'(');await assert.rejects(partial.apply());
  assert.equal(partial.db.prepare('SELECT count(*) n FROM memory_machine_attempts').get().n,0);assert.equal(partial.db.prepare('SELECT count(*) n FROM memory_legacy_baselines').get().n,0);
 }
});
test('public15 coherent image metadata uses exact projected keys and retains the128KiB boundary',async t=>{
 const f=await completedImportFixture(t,14);
 const { publicMachineContext,runtimeSnapshotContext,runtimeContext }=await import('../../.agents/skills/memory/worker/machine-context.mjs');
 const { boundLegacyProjection }=await import('../../.agents/skills/memory/scripts/lib/machine-legacy-closure.mjs');
 const context=publicMachineContext(f.env.MEMORY_DB,f.installation,{schemaVersion:15}),snapshot=await runtimeSnapshotContext(context),read=runtimeContext(snapshot).read;
 const metadata=await read('SELECT name,type FROM sqlite_master ORDER BY name');assert.ok(metadata.length>247);assert.ok(metadata.every(row=>JSON.stringify(Object.keys(row))===JSON.stringify(['name','type'])));assert.doesNotThrow(()=>boundLegacyProjection(metadata));
 const ddl=await read('SELECT name,type,sql FROM sqlite_master WHERE name=? AND type=?',['memory_data_machine_barrier','trigger']);assert.ok(ddl[0].sql.includes('memory_legacy_configuration'));assert.deepEqual(Object.keys(ddl[0]),['name','type','sql']);
 assert.throws(()=>boundLegacyProjection({body:'x'.repeat(128*1024)}),e=>e.code==='legacy-projection-too-large');
 const response=await f.call('query',{operation:'facts',params:{}});assert.equal(response.status,200,JSON.stringify(await response.clone().json()));assert.ok(f.totalStatements<=50);
});

test('dropped runtime manifest stops before activation while exact era fields include repository identity',async t=>{
 const f=await importFixture(t);f.drop=statement=>statement.sql.startsWith('INSERT INTO memory_runtime_manifests(');await assert.rejects(f.apply(),e=>e.code==='machine-operation-incomplete');
 assert.equal(f.db.prepare('SELECT state FROM memory_legacy_configuration').get().state,'maintenance');assert.equal(f.db.prepare('SELECT count(*) n FROM memory_runtime_manifests').get().n,0);
 for(const table of ['memory_runtime_activations','memory_runtime_keys','memory_legacy_completions'])assert.equal(f.db.prepare('SELECT count(*) n FROM '+table).get().n,0,table);
 const successful=await completedImportFixture(t);const row=successful.db.prepare('SELECT * FROM memory_runtime_manifests').get();assert.equal(row.repository_id,successful.installation.repositoryId);assert.equal(row.schema_version,13);assert.equal(row.baseline_hash,successful.intent.baselineHash);
});
