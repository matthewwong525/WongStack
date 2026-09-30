// Private host delivery. Journals hold only recipient/receipt and observed outcome,
// never a broad setup token, restricted credential, or installer output.
import { randomUUID } from 'node:crypto';
import { constants, closeSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { CLOUDFLARE_CALL } from '../install-wongstack.mjs';
const ID=/^[A-Za-z0-9_-]{1,128}$/;
const REPO=/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}\/[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/;
const fail=()=>{throw Error('access');};
function noLinks(path) {
 let current=sep;
 for(const part of resolve(path).split(sep).filter(Boolean)) {
  current=join(current,part);
  try { if(lstatSync(current).isSymbolicLink()) fail(); } catch(error) { if(error.code==='ENOENT')return;throw error; }
 }
}
function readPrivate(path,uid,limit) {
 noLinks(path);
 let info;
 try {info=lstatSync(path);}catch(error){if(error.code==='ENOENT')return null;throw error;}
 if(!info.isFile()||info.uid!==uid||(info.mode&0o777)!==0o600||info.size>limit||info.nlink!==1)fail();
 const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try {
  const actual=fstatSync(fd);if(!actual.isFile()||actual.uid!==uid||(actual.mode&0o777)!==0o600||actual.size>limit||actual.nlink!==1)fail();
  const buffer=Buffer.alloc(limit+1);const bytes=readSync(fd,buffer,0,buffer.length,0);if(bytes>limit)fail();
  return JSON.parse(buffer.subarray(0,bytes).toString('utf8'));
 }finally{closeSync(fd);}
}
const safeOutcome=outcome=>({status:['done','failed','rejected'].includes(outcome?.status)?outcome.status:'failed',
 ...(outcome?.reason&&{reason:['token','repo','cloudflare','push','access'].includes(outcome.reason)?outcome.reason:'access'}),
 ...(typeof outcome?.rolled==='boolean'&&{rolled:outcome.rolled}),...(typeof outcome?.detail==='string'&&CLOUDFLARE_CALL.test(outcome.detail)&&{detail:outcome.detail})});
export function createManagementStore({home='/home/wong',uid=1000,directory='/var/lib/wongstack/access-jobs'}={}) {
 const busy=new Set();const journalUid=process.getuid();
 const journal=id=>join(directory,`${id}.json`);
 function save(entry) {
  noLinks(directory);mkdirSync(directory,{recursive:true,mode:0o700});
  const info=lstatSync(directory);if(info.uid!==journalUid||(info.mode&0o777)!==0o700)fail();
  const temporary=join(directory,`${entry.recipient.jobId}.${randomUUID()}.tmp`);const fd=openSync(temporary,'wx',0o600);
  try{writeFileSync(fd,JSON.stringify(entry));fsyncSync(fd);}finally{closeSync(fd);}
  renameSync(temporary,journal(entry.recipient.jobId));const folder=openSync(directory,constants.O_RDONLY);try{fsyncSync(folder);}finally{closeSync(folder);}
 }
 function expectation(job) {
  const payload=job.payload;const target=payload?.managementResult;const recipient=target?.recipient;
  const keys=['ownerId','vmId','jobId','connectionId'];
  if(target?.version!==1||!recipient||Object.keys(recipient).length!==5||!keys.every(k=>typeof recipient[k]==='string'&&ID.test(recipient[k]))||recipient.jobId!==job.id||!Number.isSafeInteger(recipient.generation)||recipient.generation<1)fail();
  if(!['repo','sourceRepo'].every(k=>typeof payload[k]==='string'&&REPO.test(payload[k]))||typeof payload.ownerEmail!=='string'||payload.ownerEmail.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.ownerEmail)||typeof payload.sourceCommit!=='string'||!/^[a-f0-9]{40}$/.test(payload.sourceCommit))fail();
  const path=join(home,'.local/state/wongstack/access-results',`${job.id}.json`);if(target.path!==path)fail();
  return {recipient:{ownerId:recipient.ownerId,vmId:recipient.vmId,jobId:recipient.jobId,connectionId:recipient.connectionId,generation:recipient.generation},repo:payload.repo,ownerEmail:payload.ownerEmail,sourceRepo:payload.sourceRepo,sourceCommit:payload.sourceCommit,path,outcome:null,ack:false,reported:false};
 }
 function entryFor(id){if(!ID.test(id))fail();return readPrivate(journal(id),journalUid,8192);}
 async function deliver(entry,post) {
  if(entry.ack){if(readPrivate(entry.path,uid,16*1024))unlinkSync(entry.path);return entry.outcome;}
  const value=readPrivate(entry.path,uid,16*1024);
  if(!value)return entry.outcome?.status==='done'?null:entry.outcome;
  const parent=lstatSync(dirname(entry.path));if(parent.uid!==uid||(parent.mode&0o777)!==0o700)fail();
  if(value.version!==1||JSON.stringify(value.recipient)!==JSON.stringify(entry.recipient)||value.repo!==entry.repo||value.ownerEmail!==entry.ownerEmail||value.source?.repo?.toLowerCase()!==entry.sourceRepo.toLowerCase()||value.source?.commit!==entry.sourceCommit)fail();
  const response=await post(`/api/agent/jobs/${entry.recipient.jobId}/access`,value);
  if(!response.ok)fail();const receipt=await response.json();
  if(receipt.ok!==true||receipt.connectionId!==entry.recipient.connectionId||receipt.generation!==entry.recipient.generation||receipt.state!=='pending')fail();
  entry.ack=true;save(entry);unlinkSync(entry.path);return entry.outcome;
 }
 async function report(job,outcome,post) {
  const entry=entryFor(job.id);
  const response=await post(`/api/agent/jobs/${job.id}`,safeOutcome(outcome));
  if(!response.ok||(await response.json()).ok!==true)fail();
  if(entry){entry.reported=true;save(entry);}
 }
 async function execute(job,install,post) {
  if(busy.has(job.id))return null;busy.add(job.id);
  let recorded=false;
  try {
   const expected=expectation(job);let entry=entryFor(job.id);
   if(entry) {
    recorded=true;
    for(const key of ['recipient','repo','ownerEmail','sourceRepo','sourceCommit','path'])if(JSON.stringify(entry[key])!==JSON.stringify(expected[key]))fail();
    // An interrupted source run has an unknown outcome even if it made a file.
    if(!entry.outcome){entry.outcome={status:'failed',reason:'access'};save(entry);}
   }else {
    entry=expected;save(entry);recorded=true;entry.outcome=safeOutcome(await install());save(entry);
   }
   return await deliver(entry,post);
  }catch{return recorded?null:{status:'failed',reason:'access'};}finally{busy.delete(job.id);}
 }
 async function resume(post) {
  let files;try{noLinks(directory);files=readdirSync(directory);}catch{return;}
  let attempted=0;
  for(const file of files.filter(f=>f.endsWith('.json')).sort()) {
   const id=file.slice(0,-5);if(busy.has(id))continue;
   let entry;try{entry=entryFor(id);}catch{continue;}
   if(!entry||entry.reported)continue;if(++attempted>100)break;busy.add(id);
   try {
    if(!entry.outcome){entry.outcome={status:'failed',reason:'access'};save(entry);}
    const outcome=await deliver(entry,post);if(outcome)await report({id},outcome,post);
   }catch{/* Safe pending journal, retried by the next background sweep. */}finally{busy.delete(id);}
  }
 }
 return {execute,report,resume};
}
