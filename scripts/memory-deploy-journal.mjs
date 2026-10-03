// Only nonsecret allowlisted publication records can cross a job-artifact boundary.
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { privateRead,privateWrite } from '../.agents/skills/memory/scripts/lib/machine-client-state.mjs';
import { resourceTarget,requireValue,opaqueId } from '../.agents/skills/memory/scripts/lib/installation-validation.mjs';
const exact=(value,keys)=>requireValue(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===keys.split(',').sort().join(','),'publication-journal-invalid');
const keys=['version','installation','source','rollback','attemptId','predecessorId','previousPinHash','phase','candidate','receipt'];
export function validatePublicationJournal(record) {
 requireValue(record&&Object.keys(record).length===keys.length&&keys.every(k=>Object.hasOwn(record,k))&&record.version===1,'publication-journal-invalid');
 resourceTarget(record.installation,true);
 requireValue(Object.keys(record.source).length===2&&/^[a-f0-9]{40,64}$/.test(record.source.revision)&&/^[a-f0-9]{64}$/.test(record.source.digest)&&typeof record.rollback==='boolean'&&opaqueId(record.attemptId)&&opaqueId(record.predecessorId)&&/^[a-f0-9]{64}$/.test(record.previousPinHash)&&['intent','candidate','complete'].includes(record.phase),'publication-journal-invalid');
 requireValue(record.phase==='intent'?record.candidate===null&&record.receipt===null:record.candidate?.attemptId===record.attemptId&&record.candidate.payload?.predecessorId===record.predecessorId&&record.candidate.payload.previousPinHash===record.previousPinHash,'publication-journal-invalid');
 // Nested candidates are finite source14 projections; no arbitrary provider envelope.
 if(record.candidate){requireValue(Object.keys(record.candidate).sort().join(',')==='attemptId,expected,payload','publication-journal-invalid');const p=record.candidate.payload;requireValue(Object.keys(p).sort().join(',')==='evidence,pinHash,predecessorId,previousPinHash,protocolHash,reviewHash,rollback,routeContractHash','publication-journal-invalid');
  requireValue(Object.keys(p.evidence).sort().join(',')==='identity,pinHash,projection,targetJson','publication-journal-invalid');
  exact(record.candidate.expected,'authRevision,pinRevision,runtimeRevision,snapshotHash,dataRevision,deploymentHead');
  const expected=record.candidate.expected;requireValue(['authRevision','pinRevision','runtimeRevision','dataRevision'].every(k=>Number.isSafeInteger(expected[k])&&expected[k]>0)&&/^[a-f0-9]{64}$/.test(expected.snapshotHash)&&opaqueId(expected.deploymentHead),'publication-journal-invalid');
  requireValue(['pinHash','previousPinHash','reviewHash','protocolHash','routeContractHash'].every(k=>/^[a-f0-9]{64}$/.test(p[k])),'publication-journal-invalid');
  exact(p.evidence.projection,'version,target,subdomain,workers');resourceTarget(p.evidence.projection.target);
  exact(p.evidence.identity,'target,subdomain,workers');resourceTarget(p.evidence.identity.target);
  for(const worker of p.evidence.identity.workers)exact(worker,'name,id');
  requireValue(p.evidence.targetJson===JSON.stringify(resourceTarget(record.installation,true))&&p.pinHash===p.evidence.pinHash&&p.rollback===record.rollback,'publication-journal-invalid');
  for(const worker of p.evidence.projection.workers){exact(worker,'name,id,versionId,domains,routes,bindings');for(const domain of worker.domains)exact(domain,'hostname');for(const route of worker.routes)exact(route,'pattern');}
  for(const worker of p.evidence.projection.workers)for(const binding of worker.bindings)requireValue(Object.keys(binding).sort().join(',')==='bucketName,databaseId,name,text,type'&&['d1','r2_bucket','plain_text'].includes(binding.type)&&!/TOKEN|SECRET|CAPABILITY|PRIVATE_KEY/.test(binding.name),'publication-journal-invalid');
 }
 if(record.receipt){exact(record.receipt,'action,attemptId,completed,requestHash,historical,outcome');exact(record.receipt.outcome,'action,attemptId,predecessorId,pinHash,reviewHash');requireValue(record.phase==='complete'&&record.receipt.completed===true&&record.receipt.action==='deployment'&&record.receipt.attemptId===record.attemptId&&record.receipt.outcome.predecessorId===record.predecessorId&&/^[a-f0-9]{64}$/.test(record.receipt.requestHash)&&record.receipt.outcome.action==='deployment'&&record.receipt.outcome.attemptId===record.attemptId&&record.receipt.outcome.pinHash===record.candidate.payload.pinHash&&record.receipt.outcome.reviewHash===record.candidate.payload.reviewHash,'publication-journal-invalid');}
 requireValue(record.phase!=='complete'||record.receipt,'publication-journal-invalid');
 requireValue(!/(?:"(?:capability|privateKey|token|client_secret|Authorization)"\s*:|Bearer\s)/i.test(JSON.stringify(record)),'publication-journal-secret');return record;
}
export function privatePublicationJournal(dir) {
 const path=join(dir,'publication.json');return {read:()=>{const r=privateRead(path);return r&&validatePublicationJournal(r);},persist:r=>privateWrite(path,validatePublicationJournal(r))};
}
export async function verifyArtifactReceipt(receipt,{repository,runId,revision,artifactName},get) {
 requireValue(receipt&&Number.isSafeInteger(receipt.id)&&receipt.id>0&&/^sha256:[a-f0-9]{64}$/.test(receipt.digest??''),'publication-artifact-unverified');
 const artifact=await get(`/repos/${repository}/actions/artifacts/${receipt.id}`);
 requireValue(artifact.id===receipt.id&&artifact.name===artifactName&&artifact.digest===receipt.digest&&!artifact.expired&&String(artifact.workflow_run?.id)===String(runId)&&artifact.workflow_run?.head_sha===revision,'publication-artifact-unverified');
 const run=await get(`/repos/${repository}/actions/runs/${runId}`);
 requireValue(run.id===Number(runId)&&run.head_sha===revision&&run.event==='push'&&run.path==='.github/workflows/deploy.yml'&&run.repository?.full_name===repository,'publication-artifact-unverified');return {id:receipt.id,digest:receipt.digest};
}
export function verifyArtifactBytes(bytes,receipt) {
 requireValue(bytes instanceof Uint8Array&&bytes.byteLength<=2*1024*1024&&receipt.digest==='sha256:'+createHash('sha256').update(bytes).digest('hex'),'publication-artifact-unverified');return bytes;
}

// Actions archives contain one owned JSON file. No filesystem extraction or
// external utility is needed on any supported Node platform.
export function readPublicationArchive(input,member='publication.json') {
 const bytes=Buffer.from(input),limit=512*1024,deny=()=>requireValue(false,'publication-artifact-unverified');
 if(!['publication.json','published.json'].includes(member)||bytes.length<22||bytes.length>2*1024*1024)return deny();
 let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(bytes.readUInt32LE(i)===0x06054b50&&i+22+bytes.readUInt16LE(i+20)===bytes.length){end=i;break;}
 if(end<0)return deny();
 const size=bytes.readUInt32LE(end+12),offset=bytes.readUInt32LE(end+16);
 if(bytes.readUInt16LE(end+4)||bytes.readUInt16LE(end+6)||bytes.readUInt16LE(end+8)!==1||bytes.readUInt16LE(end+10)!==1||offset+size!==end||size<46||offset+46>end||bytes.readUInt32LE(offset)!==0x02014b50)return deny();
 const flags=bytes.readUInt16LE(offset+8),method=bytes.readUInt16LE(offset+10),crc=bytes.readUInt32LE(offset+16),compressed=bytes.readUInt32LE(offset+20),length=bytes.readUInt32LE(offset+24),nameLength=bytes.readUInt16LE(offset+28),extraLength=bytes.readUInt16LE(offset+30),commentLength=bytes.readUInt16LE(offset+32),local=bytes.readUInt32LE(offset+42),mode=bytes.readUInt32LE(offset+38)>>>16;
 if((flags&~(8|2048))||![0,8].includes(method)||length>limit||compressed>2*1024*1024||compressed===0||offset+46+nameLength+extraLength+commentLength!==end||bytes.readUInt16LE(offset+34)||mode&&(mode&0o170000)!==0o100000)return deny();
 const name=bytes.subarray(offset+46,offset+46+nameLength);if(name.toString('utf8')!==member||local+30>offset||bytes.readUInt32LE(local)!==0x04034b50||bytes.readUInt16LE(local+6)!==flags||bytes.readUInt16LE(local+8)!==method)return deny();
 const localName=bytes.readUInt16LE(local+26),localExtra=bytes.readUInt16LE(local+28),start=local+30+localName+localExtra;
 if(localName!==nameLength||start>offset||start+compressed>offset||!bytes.subarray(local+30,local+30+localName).equals(name))return deny();
 if(!(flags&8)&&(bytes.readUInt32LE(local+14)!==crc||bytes.readUInt32LE(local+18)!==compressed||bytes.readUInt32LE(local+22)!==length))return deny();
 let output;try{output=method===0?bytes.subarray(start,start+compressed):inflateRawSync(bytes.subarray(start,start+compressed),{maxOutputLength:limit});}catch{return deny();}
 let actual=0xffffffff;for(const byte of output){actual^=byte;for(let bit=0;bit<8;bit++)actual=(actual>>>1)^((actual&1)?0xedb88320:0);}
 if(output.length!==length||((actual^0xffffffff)>>>0)!==crc)return deny();return output;
}
