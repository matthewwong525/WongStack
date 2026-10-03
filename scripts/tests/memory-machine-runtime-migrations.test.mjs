import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { migrationFiles,migrationSql,applyMigrations } from './fixtures/memory/identity.mjs';
import { machineMigrations } from '../../.agents/skills/memory/scripts/lib/machine-migrations.mjs';
import { machineRuntimeMigrations } from '../../.agents/skills/memory/scripts/lib/machine-runtime-migrations.mjs';
import { runtimeTables,runtimeTriggers } from '../../.agents/skills/memory/scripts/lib/machine-runtime-state.mjs';
import { digest } from '../../.agents/skills/memory/scripts/lib/installation-validation.mjs';
import { runtimeFixture } from './fixtures/memory/runtime.mjs';

test('schema13 pins every bundled SQL byte while schema12 remains its original twelve-file manifest',async()=>{
  assert.equal(machineMigrations.length,12);
  assert.deepEqual(machineRuntimeMigrations.slice(0,12),machineMigrations);
  assert.deepEqual(machineRuntimeMigrations.map(row=>row.filename),migrationFiles());
  for(const [index,row] of machineRuntimeMigrations.entries()) {
    assert.equal(row.version,index+1);assert.equal(await digest(migrationSql(row.filename)),row.sha256);
  }
});
test('SQL13 alone is inactive and preserves original authority/data/schema12 DDL',t=>{
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());db.exec('PRAGMA foreign_keys=ON');applyMigrations(db,12);
  db.prepare("INSERT INTO memory_keys(hash,email,role,created_at) VALUES(?,'legacy@example.com','admin','fixture')").run('f'.repeat(64));
  const before=db.prepare('SELECT * FROM memory_keys').all();
  const ddl=db.prepare("SELECT name,sql FROM sqlite_master WHERE name LIKE 'memory_machine_%' ORDER BY name").all();
  db.exec(migrationSql('0013_machine_runtime.sql'));
  assert.deepEqual(db.prepare('SELECT * FROM memory_keys').all(),before);
  assert.deepEqual(db.prepare("SELECT name,sql FROM sqlite_master WHERE name LIKE 'memory_machine_%' ORDER BY name").all(),ddl);
  for(const table of runtimeTables)assert.equal(db.prepare(`SELECT count(*) n FROM ${table}`).get().n,0);
  for(const name of runtimeTriggers)assert.ok(db.prepare('SELECT name FROM sqlite_master WHERE name=?').get(name));
  assert.equal(db.prepare("SELECT count(*) n FROM memory_runtime_activations").get().n,0);
});
test('exact completed12 upgrade keeps IDs/bootstrap/audit/manifest/grants/credentials and append-only13 receipts',async t=>{
  const f=await runtimeFixture(t,{completed12Machine:true,activate:false});
  for(const [table,values]of f.baselineSnapshot) {
    if(table==='schema_migrations')continue;
    assert.deepEqual(f.db.prepare(`SELECT * FROM "${table}"`).all().map(row=>({...row})),values,table);
  }
  assert.equal(f.db.prepare('SELECT schema_version FROM memory_machine_manifest_receipts').get().schema_version,12);
  assert.equal(f.db.prepare('SELECT schema_version FROM memory_runtime_manifests').get().schema_version,13);
  assert.equal(f.db.prepare('SELECT count(*) n FROM memory_runtime_keys').get().n,0);
  for(const table of ['manifests','bootstrap','audit']) {
    assert.throws(()=>f.db.exec(`DELETE FROM memory_runtime_${table}`),/retained/); // Populated receipts below independently check immutability.
  }
  assert.throws(()=>f.db.exec("UPDATE memory_runtime_manifests SET manifest_hash='bad'"),/immutable/);
  assert.throws(()=>f.db.exec("UPDATE memory_runtime_configuration SET runtime_revision=runtime_revision+1"),/barrier/);
  assert.deepEqual(f.db.prepare('PRAGMA foreign_key_check').all(),[]);
});
