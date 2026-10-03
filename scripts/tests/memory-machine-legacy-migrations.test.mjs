import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { migrationSql,migrationFiles,applyMigrations } from './fixtures/memory/identity.mjs';
import { machineLegacyMigrations } from '../../.agents/skills/memory/scripts/lib/machine-legacy-migrations.mjs';
import { machineDataMigrations } from '../../.agents/skills/memory/scripts/lib/machine-data-migrations.mjs';
import { legacyDdl,legacyRetainedDdl,legacyReplacementNames,compiledLegacyHashes } from '../../.agents/skills/memory/worker/machine-legacy-contract.mjs';
import { compiledCoreHashes,coreProtectionDdl,normalizeCoreDdl,CORE_D1_LIMIT } from '../../.agents/skills/memory/worker/machine-core-contract.mjs';
import { digest } from '../../.agents/skills/memory/scripts/lib/installation-validation.mjs';
import { validateLegacySchema } from '../../.agents/skills/memory/scripts/lib/machine-legacy-state.mjs';
test('distinct15 release preserves every original1–14 source hash and the50 statement ceiling',async()=>{
 assert.equal(CORE_D1_LIMIT,50);assert.deepEqual(machineLegacyMigrations.slice(0,14),machineDataMigrations);
 assert.deepEqual(machineLegacyMigrations.map(row=>row.filename),migrationFiles());
 for(const row of machineLegacyMigrations)assert.equal(await digest(migrationSql(row.filename)),row.sha256);
 assert.notDeepEqual(await compiledLegacyHashes(),await compiledCoreHashes());
 assert.deepEqual([...legacyReplacementNames].sort(),['memory_data_machine_barrier','memory_data_verified_captures','memory_runtime_activations_guard','memory_runtime_bootstrap_guard','memory_runtime_outcomes'].sort());
});
test('SQL15 changes only the declared dependent guards and creates no compatibility receipts',async t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());applyMigrations(db,14);
 const before=new Map(db.prepare('SELECT name,type,sql FROM sqlite_master ORDER BY name').all().map(row=>[row.name,row]));
 db.exec(migrationSql('0015_legacy_cutover.sql'));assert.equal(db.prepare('SELECT version FROM schema_migrations WHERE version=15').get().version,15);db.exec("INSERT OR IGNORE INTO schema_migrations VALUES(15,'fixture')");
 await validateLegacySchema(async(sql,params=[])=>db.prepare(sql).all(...params).map(row=>({...row})));
 for(const [name,row] of before)if(!legacyReplacementNames.includes(name))assert.deepEqual(db.prepare('SELECT name,type,sql FROM sqlite_master WHERE name=?').get(name),row,name);
 for(const [name,row] of Object.entries(legacyDdl)){const actual=db.prepare('SELECT type,sql FROM sqlite_master WHERE name=?').get(name);assert.equal(actual.type,row.type,name);assert.equal(normalizeCoreDdl(actual.sql),row.sql,name);}
 for(const table of ['memory_machine_manifest_receipts','memory_machine_bootstrap_completions','memory_runtime_manifests','memory_runtime_bootstrap','memory_data_bootstrap','memory_legacy_configuration','memory_legacy_completions'])assert.equal(db.prepare(`SELECT count(*) n FROM ${table}`).get().n,0);
 assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 assert.ok(Object.keys(coreProtectionDdl).every(name=>db.prepare('SELECT name FROM sqlite_master WHERE name=?').get(name)));
});

import { sqlFunctionArguments } from './fixtures/memory/legacy-import.mjs';
test('every SQL15 function call stays within the actual D1 argument limit',()=>{const calls=sqlFunctionArguments(migrationSql('0015_legacy_cutover.sql'));assert.ok(calls.length>0);for(const call of calls)assert.ok(call.args<=32,`${call.name}: ${call.args}`);});

for(const name of ['memory_current_binding','memory_pending_invitation','memory_first_fact_mapping','memory_first_session_mapping','memory_first_object_mapping','memory_data_run_attempt','memory_data_fact_ordinal'])test(`complete15 schema validates retained UNIQUE index ${name} exactly`,async t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());applyMigrations(db,14);db.exec(migrationSql('0015_legacy_cutover.sql'));
 const read=async(sql,params=[])=>db.prepare(sql).all(...params).map(row=>({...row}));
 assert.equal(normalizeCoreDdl(db.prepare('SELECT sql FROM sqlite_master WHERE name=?').get(name).sql),legacyRetainedDdl[name].sql);
 await validateLegacySchema(read);db.exec(`DROP INDEX ${name}`);await assert.rejects(validateLegacySchema(read),/legacy-schema-conflict/);
 db.exec(`CREATE UNIQUE INDEX ${name} ON schema_migrations(version)`);await assert.rejects(validateLegacySchema(read),/legacy-schema-conflict/);
 db.exec(`DROP INDEX ${name}`);db.exec(legacyRetainedDdl[name].sql);await validateLegacySchema(read);
});
test('complete15 schema rejects an unrelated additional authority object',async t=>{
 const db=new DatabaseSync(':memory:');t.after(()=>db.close());applyMigrations(db,14);db.exec(migrationSql('0015_legacy_cutover.sql'));
 const read=async(sql,params=[])=>db.prepare(sql).all(...params).map(row=>({...row}));await validateLegacySchema(read);
 db.exec('CREATE TABLE unrelated_authority(id TEXT PRIMARY KEY,capability TEXT)');await assert.rejects(validateLegacySchema(read),/legacy-schema-conflict/);
});

test('SQL15 witness exception retains the entire original14 machine barrier predicate',()=>{
 const original=migrationSql('0014_machine_data_lifecycle.sql').match(/CREATE TRIGGER memory_data_machine_barrier[\s\S]*?END;/)[0];
 const predicate=original.split('WHEN ')[1].split('BEGIN ')[0].trim();
 assert.ok(legacyDdl.memory_data_machine_barrier.sql.includes(normalizeCoreDdl('WHEN ('+predicate+') AND NOT(')));
});
