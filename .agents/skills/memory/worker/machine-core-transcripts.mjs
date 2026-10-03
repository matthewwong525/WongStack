// Raw objects remain owner-private independently of a shared summary's provenance.
import {createHash} from 'node:crypto';
import { runtimeContext } from './machine-context.mjs';
import { coreState, finalCoreGuard, bearerHash, liveGuard, json } from './machine-core.mjs';
import { stageRuntimeTranscript, publishRuntimeTranscript, validateRuntimeBearer, readRuntimeTranscriptOwner } from '../scripts/lib/machine-runtime-operator.mjs';
import { requireValue, digest } from '../scripts/lib/installation-validation.mjs';
export const MAX_TRANSCRIPT_BYTES=50*1024*1024;
const hash=value=>typeof value==='string'&&/^[0-9a-f]{64}$/.test(value);
const bytesHash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const transcriptKey=(installation,machineId,sessionHash,contentHash,generation)=>`machines/${installation.installationId}/${installation.repositoryId}/${machineId}/${sessionHash}/g${generation}/${contentHash}`;
async function boundedBody(body,sizeHint=null) {
 requireValue(body,'transcript-not-found');const reader=body.getReader();let bytes=new Uint8Array(Number.isSafeInteger(sizeHint)&&sizeHint>=0&&sizeHint<=MAX_TRANSCRIPT_BYTES?sizeHint:65536),size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;requireValue(size+value.byteLength<=MAX_TRANSCRIPT_BYTES,'transcript-too-large');if(size+value.byteLength>bytes.byteLength){const grown=new Uint8Array(Math.min(MAX_TRANSCRIPT_BYTES,Math.max(bytes.byteLength*2,size+value.byteLength)));grown.set(bytes);bytes=grown;}bytes.set(value,size);size+=value.byteLength;}}
 finally{await reader.cancel().catch(()=>{});}
 // One owned buffer, no retained part list or full-size crypto copy. Response
 // streams this already buffered and authorized view without cloning its bytes.
 return bytes.subarray(0,size);
}
export async function handleCoreTranscript(context,request,bucket,machineId,operation,input=null) {
 requireValue(bucket,'transcripts-not-configured');
 const credentialHash=await bearerHash(request),grant=await validateRuntimeBearer(context,{machineId,credentialHash}),state=await coreState(context),{read}=runtimeContext(context);
 const authorize=async()=>{await validateRuntimeBearer(context,{machineId,credentialHash});return coreState(context);};
 if(operation==='stage'||operation==='publish') {
  const p=input.payload;requireValue(p.machineId===machineId,'machine-proof-denied');
  const sessionId=request.headers.get('Wong-Memory-Session');requireValue(typeof sessionId==='string'&&sessionId.length<=200,'invalid-input');
  const guard=liveGuard(state,machineId,credentialHash);
  const sessions=await read(`SELECT s.id FROM sessions s JOIN memory_data_session_owners owner ON owner.session_id=s.id WHERE s.id=? AND s.owner_principal_id=? AND s.status!='private' AND ${guard.sql}`,[sessionId,machineId,...guard.params]);
  requireValue(sessions.length===1&&p.sessionHash===await digest(sessionId)&&p.objectHash===await digest(transcriptKey(state.installation,machineId,p.sessionHash,p.contentHash,p.credentialGeneration)),'machine-proof-denied');
  await authorize();
  if(operation==='publish') {
   const object=await bucket.get(transcriptKey(state.installation,machineId,p.sessionHash,p.contentHash,p.credentialGeneration));
   requireValue(object,'transcript-not-found');const bytes=await boundedBody(object.body,object.size);
   requireValue(bytesHash(bytes)===p.contentHash,'transcript-hash-mismatch');await authorize();
  }
  const result=await (operation==='stage'?stageRuntimeTranscript:publishRuntimeTranscript)(context,input);await finalCoreGuard(context,machineId,credentialHash);return json(200,{success:true,result});
 }
 const objectHash=request.headers.get('Wong-Memory-Object');requireValue(hash(objectHash),'invalid-input');
 if(operation==='upload') {
  const declared=request.headers.get('Content-Length');requireValue(declared===null||(/^\d+$/.test(declared)&&Number.isSafeInteger(Number(declared))&&Number(declared)<=MAX_TRANSCRIPT_BYTES),'transcript-too-large');
  const rows=await read(`SELECT x.* FROM memory_runtime_transcripts x JOIN memory_runtime_completions c ON c.attempt_id=x.attempt_id
  WHERE x.machine_id=? AND x.object_hash=? AND x.event='staged' AND x.credential_generation=(SELECT max(generation) FROM memory_runtime_rotations WHERE machine_id=x.machine_id)`,[machineId,objectHash]);
  requireValue(rows.length===1,'machine-proof-denied');const row=rows[0],key=transcriptKey(state.installation,machineId,row.session_hash,row.content_hash,row.credential_generation);
  requireValue(objectHash===await digest(key),'machine-proof-denied');const bytes=await boundedBody(request.body,declared===null?null:Math.min(Number(declared),65536));
  requireValue(bytesHash(bytes)===row.content_hash,'transcript-hash-mismatch');await authorize();
  // Same address can only contain the same verified bytes. A conditional creation also
  // prevents replacing the object's metadata or an already published object.
  await bucket.put(key,bytes,{onlyIf:{etagDoesNotMatch:'*'}});await finalCoreGuard(context,machineId,credentialHash);
  return json(200,{success:true,result:{objectHash,uploaded:true,published:false}});
 }
 const owner=await readRuntimeTranscriptOwner(context,{machineId,grantId:request.headers.get('Wong-Memory-Grant'),credentialHash,objectHash});
 const rows=await read(`SELECT x.session_hash,x.credential_generation FROM memory_runtime_transcripts x JOIN memory_runtime_completions c ON c.attempt_id=x.attempt_id WHERE x.object_hash=? AND x.event='published'`,[objectHash]);
 requireValue(rows.length===1,'machine-proof-denied');const key=transcriptKey(state.installation,owner.machineId,rows[0].session_hash,owner.contentHash,rows[0].credential_generation);
 requireValue(objectHash===await digest(key),'machine-proof-denied');const object=await bucket.get(key);requireValue(object,'transcript-not-found');
 const bytes=await boundedBody(object.body,object.size);requireValue(bytesHash(bytes)===owner.contentHash,'transcript-hash-mismatch');await finalCoreGuard(context,machineId,credentialHash);
 return new Response(new ReadableStream({start(controller){controller.enqueue(bytes);controller.close();}}),{headers:{'Content-Type':'application/octet-stream','Cache-Control':'no-store','Wong-Memory-Scope':grant.scope}});
}
