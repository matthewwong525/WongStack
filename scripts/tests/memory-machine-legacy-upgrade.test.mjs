import test from 'node:test';
import assert from 'node:assert/strict';
import { completedImportFixture } from './fixtures/memory/legacy-import.mjs';
import { readLegacyState } from '../../.agents/skills/memory/scripts/lib/machine-legacy-state.mjs';
for(const version of [1,2,3,4,5,6,10,11,14])test(`genuine${version} forward15 retains original history and uses separately labelled lineage`,async t=>{
 const f=await completedImportFixture(t,version),state=await readLegacyState(f.context);
 assert.equal(f.receipt.status,'source-receipt-only');assert.equal(f.receipt.schemaVersion,15);
 assert.equal(state.configuration.state,'exposed');assert.equal(state.baseline.source_version,version);
 assert.equal(state.baseline.lineage,version===14?'retained14':version===10?'retained10':version===11?'retained11':'reviewed-adoption');
 assert.equal(state.attempt.history_hash,f.inventory.history.historyHash);assert.equal(state.attempt.source_schema_hash,f.inventory.schemaHash);
 for(const name of ['memory_installation_configuration','memory_bootstrap_completion','memory_schema_receipts','memory_owner_reviews','memory_owner_attempts','memory_owner_completions','memory_runtime_activations'])if(f.originalTables.has(name))assert.deepEqual(f.db.prepare(`SELECT * FROM ${name}`).all().map(row=>({...row})),f.originalTables.get(name),name);
 if(version!==14){assert.equal(f.db.prepare('SELECT count(*) n FROM memory_machine_manifest_receipts').get().n,0);assert.equal(f.db.prepare('SELECT count(*) n FROM memory_machine_bootstrap_completions').get().n,0);const audit=f.db.prepare('SELECT * FROM memory_machine_audit WHERE id=?').get(state.baseline.compatibility_audit_id);assert.equal(audit.action,'issue');assert.equal(audit.attempt_id,state.baseline.compatibility_attempt_id);assert.equal(f.db.prepare('SELECT baseline_audit_id FROM memory_runtime_configuration').get().baseline_audit_id,audit.id);}
 if(version===10)assert.equal(f.db.prepare('SELECT count(*) n FROM memory_owner_completions').get().n,0);
 assert.deepEqual(f.db.prepare('PRAGMA foreign_key_check').all(),[]);
 const old=f.db.prepare('SELECT body,author,owner_principal_id,capture_attempt_id FROM facts WHERE id=1').get();assert.equal(old.body,'Original authored decision.');assert.equal(old.author,'old@example.com');assert.equal(old.owner_principal_id,null);assert.equal(old.capture_attempt_id,null);
 assert.equal(f.db.prepare('SELECT count(*) n FROM memory_keys').get().n,0);
 assert.equal(state.review.destination.installation.installationId,f.installation.installationId);assert.equal(state.review.destination.installation.repositoryId,f.installation.repositoryId);
});

for(const version of [10,11])test(`genuine${version} removed authority remains removed while15 appends only reviewed machine`,async t=>{
 const f=await completedImportFixture(t,version,{removedHistory:true}),original=f.originalTables.get('memory_principals').find(row=>row.status==='removed');
 assert.deepEqual(f.db.prepare('SELECT * FROM memory_principals WHERE id=?').get(original.id),original);assert.equal(f.db.prepare('SELECT status FROM memory_memberships WHERE principal_id=?').get(original.id).status,'removed');
 assert.equal(f.db.prepare('SELECT count(*) n FROM memory_machine_principals').get().n,1);assert.equal(f.db.prepare('SELECT count(*) n FROM memory_owner_completions').get().n,0);
});
