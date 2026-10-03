import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { applyMigrations,migrationSql,migrationFiles } from './fixtures/memory/identity.mjs';
import { machineDataMigrations } from '../../.agents/skills/memory/scripts/lib/machine-data-migrations.mjs';
import { machineRuntimeMigrations } from '../../.agents/skills/memory/scripts/lib/machine-runtime-migrations.mjs';
import { dataTables,dataTriggers } from '../../.agents/skills/memory/worker/machine-data-contract.mjs';
import { digest } from '../../.agents/skills/memory/scripts/lib/installation-validation.mjs';
import { dataFixture } from './fixtures/memory/data.mjs';
import { runtimeFixture } from './fixtures/memory/runtime.mjs';
import { readRuntimeState } from '../../.agents/skills/memory/scripts/lib/machine-runtime-state.mjs';
import { prepareMachineData } from '../../.agents/skills/memory/scripts/lib/machine-data-operator.mjs';

test('separate schema14 manifest retains all13 original SQL receipts and pins complete inventory',async()=>{
 assert.deepEqual(machineDataMigrations.slice(0,13),machineRuntimeMigrations);
 assert.deepEqual(machineDataMigrations.map(r=>r.filename),migrationFiles().filter(name=>Number(name.slice(0,4))<=14));
 for(const [i,row] of machineDataMigrations.entries()){assert.equal(row.version,i+1);assert.equal(await digest(migrationSql(row.filename)),row.sha256);}
});
test('SQL14 alone has no activation, author adoption or deployment and keeps populated original rows',t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());applyMigrations(db,13);
 db.prepare("INSERT INTO sessions(id,agent,author,status,read_through,updated_at) VALUES('legacy','migration','old@example.com','captured','old-cursor','fixture')").run();
 db.prepare("INSERT INTO facts(slug,type,body,session_id,source,created_at,author) VALUES('old','project','Original bytes.','legacy','migration','fixture','old@example.com')").run();
 const oldFact=db.prepare('SELECT id,slug,type,body,author,owner_principal_id FROM facts').get();
 db.exec(migrationSql('0014_machine_data_lifecycle.sql'));
 assert.deepEqual(db.prepare('SELECT id,slug,type,body,author,owner_principal_id FROM facts').get(),oldFact);
 assert.equal(db.prepare('SELECT read_through FROM sessions').get().read_through,'old-cursor');
 for(const table of dataTables)assert.equal(db.prepare(`SELECT count(*) n FROM ${table}`).get().n,0);
 for(const trigger of dataTriggers)assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name=?").get(trigger));
});
test('completed13 upgrade preserves bootstrap pins and genuine completed12/13 receipts',async t=>{
 const f=await dataFixture(t);const before=new Map(f.before14);
 for(const table of ['memory_machine_configuration','memory_machine_manifest_receipts','memory_machine_bootstrap_completions','memory_runtime_configuration','memory_runtime_manifests','memory_runtime_bootstrap']) {
  assert.deepEqual(f.db.prepare(`SELECT * FROM ${table}`).all().map(r=>({...r})),before.get(table),table);
 }
 assert.equal((await readRuntimeState(f.public)).snapshot.dataRevision,undefined);
 assert.equal(f.db.prepare('SELECT original_pin_hash FROM memory_data_configuration').get().original_pin_hash,f.input.pinHash);
 for(const table of ['configuration','bootstrap'])assert.throws(()=>f.db.exec(`DELETE FROM memory_data_${table}`),/retained/);
 assert.throws(()=>f.db.exec("UPDATE memory_data_bootstrap SET request_hash='forged'"),/immutable/);
 await prepareMachineData(f.context,f.dataUpgrade);
 assert.deepEqual(f.db.prepare('PRAGMA foreign_key_check').all(),[]);
});
for(const corruption of ['missing','weakened','future','extra'])test(`schema14 rejects ${corruption} structure`,async t=>{
 const f=await dataFixture(t);
 if(corruption==='missing')f.db.exec('DROP TRIGGER memory_data_outcome_guard');
 if(corruption==='weakened'){f.db.exec('DROP TRIGGER memory_data_outcome_guard');f.db.exec("CREATE TRIGGER memory_data_outcome_guard BEFORE INSERT ON memory_data_outcomes BEGIN SELECT 1; END;");}
 if(corruption==='future')f.db.exec("INSERT INTO schema_migrations VALUES(15,'forged')");
 if(corruption==='extra')f.db.exec('CREATE TABLE unknown_table(id TEXT)');
 await assert.rejects(readRuntimeState(f.public));
});
test('schema14 SQL-only preparation is refused instead of adopted',async t=>{
 const f=await runtimeFixture(t);f.db.exec(migrationSql('0014_machine_data_lifecycle.sql'));
 await assert.rejects(readRuntimeState(f.public),e=>e.code==='machine-operation-incomplete');
});
