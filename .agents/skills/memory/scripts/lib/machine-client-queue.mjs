// Durable queues acknowledge exact outcomes, never HTTP success alone.
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { privateRead, privateWrite, writeMachineState, withMachineLock, setPending } from './machine-client-state.mjs';
import { clientHash, boundMachine, refreshMachine, signClient, machineCall, clientError } from './machine-client.mjs';
const file=(ctx,id)=>join(ctx.stateDir,'queues',id+'.json');
const writeCost=p=>4+(p.session?4:0)+(p.run?2:0)+2*p.newTags.length+p.facts.reduce((n,f)=>n+2+2*f.tags.length+2*f.supersedes.length,0);
export function captureChunks(payload) {
 const pieces=[];let tags=[...payload.newTags],facts=[...payload.facts];
 // One definition can travel independently; aliases follow their earlier definitions.
 while(tags.length)pieces.push({...payload,newTags:tags.splice(0,1),facts:[],run:null});
 while(facts.length) {
  const fact=facts.shift();pieces.push({...payload,newTags:[],facts:[fact],run:null});
 }
 if(!pieces.length)pieces.push({...payload,newTags:[],facts:[],run:null});
 return pieces.map((p,i)=>({...p,session:p.session?{...p.session,nextCursor:i===pieces.length-1?p.session.nextCursor:p.session.previousCursor}:null,
 run:i===pieces.length-1&&payload.run?{...payload.run,counts:{added:p.facts.length,superseded:p.facts.reduce((n,f)=>n+f.supersedes.length,0),captured:p.session?1:0}}:null}));
}
function validateReceipt(result,input,requestHash) {
 const op=result?.operation,out=op?.outcome,p=input.payload;
 if(!op?.completed||op.action!=='capture'||op.attemptId!==input.attemptId||op.requestHash!==requestHash||out?.attemptId!==input.attemptId||out.action!=='capture'
 ||JSON.stringify(out.tags)!==JSON.stringify(p.newTags)||out.facts?.length!==p.facts.length||!out.facts.every((x,i)=>x.ordinal===i&&Number.isSafeInteger(x.factId)&&x.factId>=1)
 ||JSON.stringify(out.session)!==JSON.stringify(p.session?{id:p.session.id,previousCursor:p.session.previousCursor,nextCursor:p.session.nextCursor}:null)
 ||out.supersedes?.length!==p.facts.reduce((n,f)=>n+f.supersedes.length,0)
 ||(p.run?(out.run?.counts?.added!==p.run.counts.added||out.run?.counts?.superseded!==p.run.counts.superseded||out.run?.counts?.captured!==p.run.counts.captured):out.run!==null))throw clientError('capture-receipt-invalid');
 for(const [ordinal,f] of p.facts.entries())for(const factId of f.supersedes)if(!out.supersedes.some(s=>s.factId===factId&&s.ordinal===ordinal&&s.newFactId===out.facts[ordinal].factId))throw clientError('capture-receipt-invalid');
 return op;
}
export async function enqueueCapture(ctx,installation,payload,{queueId=randomUUID(),localOutcome=null}={}) {
 return withMachineLock(ctx.stateDir,async()=>{const state=boundMachine(ctx,installation),path=file(ctx,queueId),old=privateRead(path);
 const notes={visibility:payload.visibility,source:payload.source,newTags:payload.newTags,session:payload.session,facts:payload.facts,run:payload.run};
 const intentHash=await clientHash(JSON.stringify(notes));
 if(old){if(old.intentHash!==intentHash||old.machineId!==state.machineId||old.grantId!==state.grantId||JSON.stringify(old.installation)!==JSON.stringify(installation))throw clientError('capture-queue-conflict');if(!old.completed&&!old.quarantined)setPending(ctx,'capture',queueId,true);return old;}
 const queue={id:queueId,installation,machineId:state.machineId,grantId:state.grantId,intentHash,notes,localOutcome,chunks:captureChunks(notes).map(notes=>({notes,receipt:null,candidate:null})),completed:false,quarantined:false};
 setPending(ctx,'capture',queueId,true);privateWrite(path,queue);return queue;});
}
export async function flushCapture(ctx,installation,queueId,{timeoutMs=15000,deadline}={}) {
 let state;try{state=await refreshMachine(ctx,installation,{timeoutMs,deadline});}catch(error){error.machineQueueId=queueId;throw error;}
 return withMachineLock(ctx.stateDir,async()=>{
  const latest=boundMachine(ctx,installation);if(latest.machineId!==state.machineId||latest.grantId!==state.grantId)throw clientError('capture-queue-quarantined');state=latest;
  const path=file(ctx,queueId),queue=privateRead(path);if(!queue||queue.quarantined||queue.machineId!==state.machineId||queue.grantId!==state.grantId||JSON.stringify(queue.installation)!==JSON.stringify(installation))throw clientError('capture-queue-quarantined');
  const completed=[];
  try {
   for(const chunk of queue.chunks) {
    if(chunk.receipt){completed.push(chunk.receipt);continue;}
    if(chunk.candidate) {
     const candidate=chunk.candidate,status=await signClient(state,'capture-status',{attemptId:randomUUID(),expected:state.dataSnapshot,payload:{machineId:state.machineId,grantId:state.grantId,machineCommitment:state.commitment,targetAttemptId:candidate.input.attemptId,requestHash:candidate.requestHash}});
     const recovered=(await machineCall(state,'capture-status',status,{timeoutMs,deadline})).result;
     if(recovered.access!=='receipt-only')throw clientError('capture-receipt-invalid');
     state.dataSnapshot=recovered.snapshot;state.snapshot={authRevision:recovered.snapshot.authRevision,pinRevision:recovered.snapshot.pinRevision,runtimeRevision:recovered.snapshot.runtimeRevision,snapshotHash:recovered.snapshot.snapshotHash};
     if(recovered.operation?.completed){chunk.receipt=validateReceipt(recovered,candidate.input,candidate.requestHash);privateWrite(path,queue);completed.push(chunk.receipt);continue;}
     if(recovered.operation?.absent!==true)throw clientError('capture-incomplete');
     // Absence allows a refreshed attempt only on this exact still-active grant.
     chunk.candidate=null;privateWrite(path,queue);
    }
    const payload={machineId:state.machineId,repositoryId:installation.repositoryId,grantId:state.grantId,machineCommitment:state.commitment,
     machineRevision:state.machineRevision,grantRevision:state.grantRevision,credentialGeneration:state.credential.generation,credentialHash:state.credential.hash,...chunk.notes};
    const input=await signClient(state,'capture',{attemptId:randomUUID(),expected:state.dataSnapshot,payload});
    const requestHash=await clientHash(JSON.stringify({version:14,installation,action:'capture',attemptId:input.attemptId,expected:input.expected,payload:{...payload,publicKeyJson:JSON.stringify(state.publicKey)}}));
    chunk.candidate={input,requestHash};privateWrite(path,queue);
    const result=(await machineCall(state,'capture',input,{timeoutMs,deadline})).result;chunk.receipt=validateReceipt(result,input,requestHash);
    state.dataSnapshot=result.snapshot;state.snapshot={authRevision:result.snapshot.authRevision,pinRevision:result.snapshot.pinRevision,runtimeRevision:result.snapshot.runtimeRevision,snapshotHash:result.snapshot.snapshotHash};
    privateWrite(path,queue);completed.push(chunk.receipt);
   }
   writeMachineState(ctx,state);queue.completed=true;
   if(queue.localOutcome?.sessionId&&queue.localOutcome.size!=null){const seen=join(ctx.stateDir,'seen.json');privateWrite(seen,{...privateRead(seen,{}),[queue.localOutcome.sessionId]:{size:queue.localOutcome.size,line:queue.localOutcome.line}});}
   privateWrite(path,queue);setPending(ctx,'capture',queueId,false);
   return {queueId,completed:true,receipts:completed,kept:queue.notes.facts.length,superseded:queue.notes.facts.reduce((n,f)=>n+f.supersedes.length,0)};
  } catch(error) {
   if(['machine-operation-incomplete','machine-attempt-conflict','machine-proof-denied','machine-capture-quarantined','capture-receipt-invalid'].includes(error.code)){queue.quarantined=true;queue.reason=error.code;privateWrite(path,queue);setPending(ctx,'capture',queueId,false);}
   error.machineQueueId=queueId;throw error;
  }
 });
}
export const queuedCaptureCost=writeCost;
