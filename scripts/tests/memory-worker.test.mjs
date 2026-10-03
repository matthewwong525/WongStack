// Current Worker uses full compiled activation and schema14; retained device
// schema tests below explicitly exercise immutable historical SQL fixtures.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {Worker} from 'node:worker_threads';
import {join} from 'node:path';
import {identityFixture,approvedRequest,activateSql,activationParams,REQUEST,DEVICE,HASH} from './fixtures/memory/identity.mjs';
import {tempDir} from './fixtures/memory/harness.mjs';
import {coreFixture,signed,MACHINE,GRANT,TOKEN,attempt} from './fixtures/memory/core.mjs';
import {digest} from '../../.agents/skills/memory/scripts/lib/installation-validation.mjs';
import {handleMemory} from '../../.agents/skills/memory/worker/memory-worker.mjs';
import {transcriptKey,MAX_TRANSCRIPT_BYTES} from '../../.agents/skills/memory/worker/machine-core-transcripts.mjs';
import {revokeRuntimeMachine} from '../../.agents/skills/memory/scripts/lib/machine-runtime-operator.mjs';
async function raw(f,bytes=Buffer.from('Private original business conversation.')){
 const capture=await f.captureInput();assert.equal((await f.call('capture',capture)).status,200);
 const sessionId=capture.payload.session.id,sessionHash=await digest(sessionId),contentHash=await digest(bytes),key=transcriptKey(f.installation,MACHINE,sessionHash,contentHash,1),objectHash=await digest(key);
 const payload={machineId:MACHINE,grantId:GRANT,machineCommitment:f.signing.commitment,scope:f.scope,machineRevision:1,grantRevision:2,credentialGeneration:1,objectHash,sessionHash,contentHash,visibility:'private'};
 const stage=await signed(f,'stage',{attemptId:crypto.randomUUID(),expected:await f.runtimeExpected(),payload});assert.equal((await f.call('stage',stage,{headers:{'Wong-Memory-Session':sessionId}})).status,200);assert.ok(f.totalStatements<=50);
 f.totalStatements=0;const uploaded=await handleMemory(new Request(f.request('upload',null,{method:'PUT'}).url,{method:'PUT',headers:{Authorization:`Bearer ${TOKEN}`,'Wong-Memory-Object':objectHash},body:bytes}),f.env);assert.equal(uploaded.status,200,JSON.stringify(await uploaded.clone().json()));assert.ok(f.totalStatements<=50);
 const publish=await signed(f,'publish',{attemptId:crypto.randomUUID(),expected:await f.runtimeExpected(),payload:{...payload,stageAttemptId:stage.attemptId}});assert.equal((await f.call('publish',publish,{headers:{'Wong-Memory-Session':sessionId}})).status,200);assert.ok(f.totalStatements<=50);return {bytes,key,objectHash,sessionId,payload,stage,publish};
}
test('owned transcript is bounded, hash verified, immutable and published only with exact stage/publish receipts',async t=>{
 const f=await coreFixture(t),r=await raw(f);assert.match(r.key,/\/g1\//);assert.deepEqual(f.objects.get(r.key),r.bytes);const result=await f.call('transcript',null,{method:'GET',headers:{'Wong-Memory-Object':r.objectHash,'Wong-Memory-Grant':GRANT}});assert.equal(result.status,200);assert.deepEqual(Buffer.from(await result.arrayBuffer()),r.bytes);assert.ok(f.totalStatements<=50);
 const before=f.snapshot();const corrupt=await handleMemory(new Request(f.request('upload',null,{method:'PUT'}).url,{method:'PUT',headers:{Authorization:`Bearer ${TOKEN}`,'Wong-Memory-Object':r.objectHash},body:'changed'}),f.env);assert.equal(corrupt.status,403);assert.deepEqual(await corrupt.json(),{success:false,code:'transcript-hash-mismatch'});assert.deepEqual(f.objects.get(r.key),r.bytes);assert.deepEqual(f.snapshot(),before);
});
test('R2 GET buffers the complete stream before its final authority guard and releases no private bytes on late revoke',async t=>{
 const f=await coreFixture(t),r=await raw(f);let streamed=false,revokedState;
 f.env.MEMORY_BUCKET.get=async()=>({body:new ReadableStream({async pull(c){if(!streamed){streamed=true;c.enqueue(r.bytes);await revokeRuntimeMachine(f.context,{attemptId:attempt('raw-stream-revoke'),expected:await f.runtimeExpected(),payload:{machineId:MACHINE,grantId:GRANT,machineRevision:1,grantRevision:2}});revokedState=f.snapshot();}c.close();}})});
 const result=await f.call('transcript',null,{method:'GET',headers:{'Wong-Memory-Object':r.objectHash,'Wong-Memory-Grant':GRANT}});assert.equal(streamed,true);assert.equal(result.status,403);const denied=await result.text();assert.doesNotMatch(denied,/Private original/);assert.deepEqual(JSON.parse(denied),{success:false,code:'machine-proof-denied'});assert.deepEqual(f.snapshot(),revokedState);assert.equal(f.db.prepare('SELECT status FROM memory_machine_principals WHERE id=?').get(MACHINE).status,'revoked');assert.deepEqual(f.objects.get(r.key),r.bytes);
});
test('R2 hash mismatches and oversized streamed raw bodies never publish or replace an owned object',async t=>{
 const f=await coreFixture(t),r=await raw(f),storage=f.snapshot();f.objects.set(r.key,Buffer.from('provider corrupted content'));const result=await f.call('transcript',null,{method:'GET',headers:{'Wong-Memory-Object':r.objectHash,'Wong-Memory-Grant':GRANT}});assert.equal(result.status,403);assert.deepEqual(await result.json(),{success:false,code:'transcript-hash-mismatch'});assert.deepEqual(f.snapshot(),storage);
 const before=f.objects.get(r.key),body=new ReadableStream({start(c){c.enqueue(new Uint8Array(MAX_TRANSCRIPT_BYTES+1));c.close();}});const oversized=await handleMemory(new Request(f.request('upload',null,{method:'PUT'}).url,{method:'PUT',duplex:'half',headers:{Authorization:`Bearer ${TOKEN}`,'Wong-Memory-Object':r.objectHash},body}),f.env);assert.equal(oversized.status,403);assert.deepEqual(await oversized.json(),{success:false,code:'transcript-too-large'});assert.deepEqual(f.objects.get(r.key),before);assert.deepEqual(f.snapshot(),storage);
});
test('raw and signed transcript dispatches return exact missing-bucket denial without storage changes',async t=>{
 const f=await coreFixture(t),r=await raw(f);
 const stage=await signed(f,'stage',{attemptId:crypto.randomUUID(),expected:await f.runtimeExpected(),payload:r.payload}),publish=await signed(f,'publish',{attemptId:crypto.randomUUID(),expected:await f.runtimeExpected(),payload:{...r.payload,stageAttemptId:r.stage.attemptId}});
 f.env.MEMORY_BUCKET=undefined;const before=f.snapshot(),objects=[...f.objects];
 for(const [operation,input,options] of [['upload',null,{method:'PUT',headers:{'Wong-Memory-Object':r.objectHash}}],['transcript',null,{method:'GET',headers:{'Wong-Memory-Object':r.objectHash,'Wong-Memory-Grant':GRANT}}],['stage',stage,{headers:{'Wong-Memory-Session':r.sessionId}}],['publish',publish,{headers:{'Wong-Memory-Session':r.sessionId}}]]){
  const result=await f.call(operation,input,options);assert.equal(result.status,403);assert.deepEqual(await result.json(),{success:false,code:'transcripts-not-configured'});assert.deepEqual(f.snapshot(),before);assert.deepEqual([...f.objects],objects);
 }
});
test('machine keys receive neither custom SQL nor trusted operator capability through raw or query operations',async t=>{
 const f=await coreFixture(t,{scope:'memory:read memory:write memory:admin'}),before=f.snapshot();for(const operation of ['sql','grant','activate','deployment','revoke'])assert.equal((await f.call('query',{operation,params:{}})).status,403);assert.deepEqual(f.snapshot(),before);
});
test('device schema atomically consumes approval and rejects a changed credential commitment', t => {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec('PRAGMA foreign_keys = ON');
  const now = identityFixture(db);
  approvedRequest(db, now);
  db.exec('BEGIN');
  db.prepare(activateSql).run(...activationParams(now));
  assert.throws(() => db.prepare('INSERT INTO memory_credentials (hash, device_id, generation, issued_at, expires_at) VALUES (?, ?, 1, ?, ?)')
    .run('c'.repeat(64), DEVICE, now, now + 2592000), /initiating machine commitment/);
  db.exec('ROLLBACK');
  assert.equal(db.prepare('SELECT state FROM memory_device_requests WHERE id = ?').get(REQUEST).state, 'approved');
  db.exec('BEGIN');
  db.prepare(activateSql).run(...activationParams(now));
  db.prepare('INSERT INTO memory_credentials (hash, device_id, generation, issued_at, expires_at) VALUES (?, ?, 1, ?, ?)')
    .run(HASH, DEVICE, now, now + 2592000);
  db.exec('COMMIT');
  assert.equal(db.prepare('SELECT state FROM memory_device_requests WHERE id = ?').get(REQUEST).state, 'claimed');
  assert.throws(() => db.prepare(activateSql).run(...activationParams(now, 'e'.repeat(32))), /stale|UNIQUE/);
  assert.throws(() => db.exec("UPDATE memory_device_requests SET state = 'pending'"), /invalid device request transition/);
  db.exec('DELETE FROM memory_device_requests');
  assert.equal(db.prepare('SELECT count(*) AS n FROM memory_devices').get().n, 1, 'request cleanup preserves the durable device receipt');
  assert.equal(db.prepare('SELECT count(*) AS n FROM memory_credentials').get().n, 1);
});

test('two database connections racing device activation have exactly one winner', async t => {
  const file = join(tempDir(t, 'activation-race'), 'memory.sqlite');
  const db = new DatabaseSync(file);
  const now = identityFixture(db);
  approvedRequest(db, now);
  db.close();
  const script = `
    const { parentPort, workerData } = require('node:worker_threads');
    const { DatabaseSync } = require('node:sqlite');
    const database = new DatabaseSync(workerData.file);
    database.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000');
    parentPort.once('message', () => {
      try { database.prepare(workerData.sql).run(...workerData.params); parentPort.postMessage({ won: true }); }
      catch (error) { parentPort.postMessage({ won: false, message: error.message }); }
      finally { database.close(); }
    });
    parentPort.postMessage({ ready: true });
  `;
  const workers = ['d', 'e'].map(letter => new Worker(script, { eval: true,
    workerData: { file, sql: activateSql, params: activationParams(now, letter.repeat(32)) } }));
  t.after(() => Promise.all(workers.map(worker => worker.terminate())));
  await Promise.all(workers.map(worker => new Promise((resolve, reject) => {
    worker.once('error', reject);
    worker.once('message', message => { assert.equal(message.ready, true); resolve(); });
  })));
  const results = workers.map(worker => new Promise((resolve, reject) => {
    worker.once('error', reject);
    worker.once('message', resolve);
  }));
  for (const worker of workers) worker.postMessage('activate');
  const outcomes = await Promise.all(results);
  assert.equal(outcomes.filter(outcome => outcome.won).length, 1);
  assert.match(outcomes.find(outcome => !outcome.won).message, /stale|UNIQUE/);
  const check = new DatabaseSync(file);
  try {
    assert.equal(check.prepare('SELECT count(*) AS n FROM memory_devices').get().n, 1);
    assert.equal(check.prepare('SELECT state FROM memory_device_requests').get().state, 'claimed');
  } finally { check.close(); }
});
