// Disposable source transports and retained journals; never a live provider.
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { machineFixture } from './machines.mjs';
import { d1Fixture } from './runtime.mjs';
import { successorInput } from './data.mjs';
import { machineStateDirectory } from '../../../../.agents/skills/memory/scripts/lib/machine-client-state.mjs';
import { trustedMachineDataContext,readMachineDataStatus,inspectMachineDeployment,recordMachineDeployment } from '../../../../.agents/skills/memory/scripts/lib/machine-data-operator.mjs';
import { compiledCoreHashes } from '../../../../.agents/skills/memory/worker/machine-core-contract.mjs';
import { handleMemory } from '../../../../.agents/skills/memory/worker/memory-worker.mjs';
export function retainedStore(value=null,dir=null) {
 let state=value,chain=Promise.resolve();const history=[];
 return {dir,history,read:async()=>state&&structuredClone(state),write:async next=>{state=structuredClone(next);history.push(structuredClone(next));},lock:async work=>{const old=chain;let unlock;chain=new Promise(r=>{unlock=r;});await old;try{return await work();}finally{unlock();}}};
}
const fixtureTransports=new WeakMap();
export async function setupFixture(t) {
 const f=machineFixture(t,{standalone:true});f.scope='memory:read memory:write';
 const dir=mkdtempSync(join(tmpdir(),'wong-setup-fixture-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 f.store=retainedStore({target:{account:f.target.accountId,name:'fixture-memory'},database:{method:'POST',id:f.target.databaseId,name:'fixture-memory',path:`/accounts/${f.target.accountId}/d1/database`}},dir);
 for(const name of f.workers.keys())f.setBinding(name,'CF_VERSION_METADATA',{type:'version_metadata'});
 f.observation=async()=>{const evidence=await inspectMachineDeployment(f.operator,f.target);return {verified:true,sourceHash:'a'.repeat(64),sourceRevision:'1'.repeat(40),proof:{kind:'trusted-private-adapter',receiptId:'fixture-publication'.padEnd(32,'0'),sourceHash:'a'.repeat(64),sourceRevision:'1'.repeat(40)},target:f.target,...await compiledCoreHashes(),workerVersions:Object.fromEntries(evidence.projection.workers.map(w=>[w.name,w.versionId])),deploymentReceipt:f.deploymentReceipt??null};};
 f.publication={wait:async()=>f.observation(),configure:async installation=>{
  if(f.deploymentReceipt)return {revision:'1'.repeat(40)};
  f.installation=installation;f.context=await trustedMachineDataContext(f.operator,installation);f.beforeDeploymentSnapshot=(await readMachineDataStatus(f.context)).snapshot;
  f.dataUpgrade=(await f.store.read()).steps.data.input;
  const version='22222222-2222-4222-8222-222222222222';
  for(const [name,worker] of f.workers){f.setBinding(name,'MEMORY_INSTALLATION',{type:'plain_text',text:JSON.stringify(installation)});worker.active.id=version;worker.deployment.deployments[0].versions[0].version_id=version;f.receipts.set(`/accounts/${f.target.accountId}/workers/scripts/${name}/versions/${version}`,worker.active);}
  f.deploymentReceipt=(await recordMachineDeployment(f.context,await successorInput(f,await inspectMachineDeployment(f.operator,f.target)))).operation;
  f.env={WONG_ENVIRONMENT:'production',MEMORY_DB:d1Fixture(f),MEMORY_INSTALLATION:JSON.stringify(installation),MEMORY_DATABASE_ID:f.target.databaseId,MEMORY_BUCKET_NAME:f.target.bucketName,MEMORY_WORKER_NAME:f.target.memoryWorkerName,CF_VERSION_METADATA:{id:version}};
  const objects=new Map();f.env.MEMORY_BUCKET={get:async key=>objects.get(key),put:async(key,bytes)=>{objects.set(key,{body:bytes});}};
  return {revision:'1'.repeat(40)};
 }};
 if(!fixtureTransports.has(t))fixtureTransports.set(t,globalThis.fetch);
 const original=fixtureTransports.get(t);
 globalThis.fetch=async(url,options)=>{if(f.denyRead&&String(url).endsWith('/query'))return Response.json({success:false,code:'machine-proof-denied'},{status:403});return handleMemory(new Request(url,options),f.env);};
 t.after(()=>{globalThis.fetch=original;if(f.installation)rmSync(machineStateDirectory(f.installation),{recursive:true,force:true});});
 return f;
}

import { deflateRawSync } from 'node:zlib';
/** A real single-member ZIP using the documented local/central/end records. */
export function publicationArchive(value,member='publication.json',{deflated=false}={}) {
 const content=Buffer.from(JSON.stringify(value)),name=Buffer.from(member),data=deflated?deflateRawSync(content):content;
 let crc=0xffffffff;for(const byte of content){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}crc=(crc^0xffffffff)>>>0;
 const local=Buffer.alloc(30),central=Buffer.alloc(46),end=Buffer.alloc(22),method=deflated?8:0;
 local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(method,8);local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(content.length,22);local.writeUInt16LE(name.length,26);
 central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(method,10);central.writeUInt32LE(crc,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(content.length,24);central.writeUInt16LE(name.length,28);
 end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+name.length,12);end.writeUInt32LE(local.length+name.length+data.length,16);
 return Buffer.concat([local,name,data,central,name,end]);
}
