import test from 'node:test';
import assert from 'node:assert/strict';
import { importFixture,hash } from './fixtures/memory/legacy-import.mjs';
import { trustedLegacyAdapter,legacyCapability,closeLegacyAuthority,readLegacyDenial,enumerateLegacyAuthority,mutateLegacyAuthority } from '../../.agents/skills/memory/scripts/lib/machine-legacy-adapter.mjs';
const binding=f=>({attemptId:f.intent.attemptId,requestHash:f.intent.requestHash,universeHash:f.intent.universeHash});
test('adapter has no default transport and management is independent of former ordinary credentials',async t=>{
 const f=await importFixture(t);assert.throws(()=>trustedLegacyAdapter({target:f.target,authorization:f.authorization,callbacks:{},journal:{}}));
 assert.equal(await legacyCapability(f.trusted).then(value=>value.authorization.managementAuthorityHash),f.authorization.managementAuthorityHash);
 f.callbacks.verifyManagement=async()=>({...f.authorization,managementAuthorityHash:hash('a')});await assert.rejects(closeLegacyAuthority(f.trusted,f.inventory,binding(f)));assert.equal(f.callbackCounts.closeServing,0);
});
test('closure exhaustively denies old credential × endpoint × method and direct D1/R2/public bucket',async t=>{
 const f=await importFixture(t),result=await closeLegacyAuthority(f.trusted,f.inventory,binding(f));
 const expected=f.source.serving.reduce((sum,row)=>sum+row.methods.length*(f.source.credentials.length+1),0)+f.source.bucket.publicOrigins.length;
 assert.equal(result.evidence.probes.length,expected);assert.equal(result.directProbes.length,2);assert.deepEqual(result.directProbes.map(row=>row.endpointId).sort(),['direct-d1','direct-r2']);
 assert.equal(f.callbackCounts.probe,expected+2);assert.equal(f.callbackCounts.retireCredential,f.source.credentials.length);assert.equal(f.db.prepare('SELECT count(*) n FROM memory_keys').get().n,0);
 assert.ok(f.journal.every(row=>JSON.stringify(row).includes('synthetic-secret-never-public')===false));
 const counts={...f.callbackCounts};await closeLegacyAuthority(f.trusted,f.inventory,binding(f));for(const key of ['closeServing','disableBucket','retireCredential'])assert.equal(f.callbackCounts[key],counts[key]);
});
test('lost provider response recovers from exact readback before replay; ambiguous upload does not replay',async t=>{
 const f=await importFixture(t);f.loseMutation=true;await closeLegacyAuthority(f.trusted,f.inventory,binding(f));assert.equal(f.callbackCounts.closeServing,f.source.serving.length);
 const candidate={action:'upload-reviewed-worker',attemptId:f.intent.attemptId,requestHash:f.intent.requestHash,sourceHash:hash('a')};f.ambiguous=true;let calls=0;
 await assert.rejects(mutateLegacyAuthority(f.trusted,candidate,async()=>{calls++;}));assert.equal(calls,0);
});
for(const wrong of ['missing','extra','duplicate','pagination','revision'])test(`finite enumeration rejects ${wrong} evidence before provider mutation`,async t=>{
 const f=await importFixture(t),original=f.callbacks.enumerate;
 f.callbacks.enumerate=async input=>{const row=await original(input);if(input.kind==='credentials'){if(wrong==='missing')row.items.pop();if(wrong==='extra')row.items.push({id:'unreviewed-business-token'});if(wrong==='duplicate')row.items.push(row.items[0]);if(wrong==='pagination')row.nextPage=3;if(wrong==='revision')row.revisionHash=hash('a');}return row;};
 await assert.rejects(enumerateLegacyAuthority(f.trusted,f.inventory));assert.equal(f.callbackCounts.retireCredential,0);
});
for(const bad of [{status:200},{redirected:true},{memoryReturned:true},{revisionHash:hash('a')}])test(`closure refuses bad probe ${JSON.stringify(bad)}`,async t=>{const f=await importFixture(t);await closeLegacyAuthority(f.trusted,f.inventory,binding(f));const original=f.callbacks.probe;f.callbacks.probe=async input=>({...await original(input),...bad});await assert.rejects(readLegacyDenial(f.trusted,f.inventory,binding(f)));});
test('independent backup failure and missing old client identity never certify closure',async t=>{const f=await importFixture(t);f.callbacks.verifyBackup=async()=>{throw new Error('sentinel-private-backup');};await assert.rejects(closeLegacyAuthority(f.trusted,f.inventory,binding(f)),error=>!error.message.includes('sentinel'));assert.equal(f.callbackCounts.closeServing,0);});
