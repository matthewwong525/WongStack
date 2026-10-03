// Same-grant unattended renewal and exact candidate recovery. No cloud token fallback.
import { randomBytes, randomUUID, webcrypto } from 'node:crypto';
import { readMachineState, writeMachineState, withMachineLock } from './machine-client-state.mjs';
import { machineProofMessage, machineKeyCommitment, canonicalMachineKey } from '../../worker/machine-proof.mjs';
import { machineDataProofMessage } from '../../worker/machine-data-proof.mjs';
import { machineHash } from './machine-state.mjs';
import { resourceTarget } from './installation-validation.mjs';
const crypto=webcrypto;
export const clientHash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',typeof value==='string'?new TextEncoder().encode(value):value)),b=>b.toString(16).padStart(2,'0')).join('');
export const runtimeSnapshot=s=>Object.fromEntries(['authRevision','pinRevision','runtimeRevision','snapshotHash'].map(k=>[k,s[k]]));
export function clientError(code) {return Object.assign(new Error(code),{code,reason:code,kind:/unreachable|timeout|offline|state-busy/.test(code)?'network':code==='memory-pending-setup'?'unconfigured':'auth'});}
export function boundMachine(ctx,installation) {
 resourceTarget(installation,true);const state=readMachineState(ctx);
 if(!state)throw clientError('memory-pending-setup');
 if(JSON.stringify(state.installation)!==JSON.stringify(installation)||!state.machineId||!state.grantId||!state.privateKey?.d||state.quarantined)throw clientError(state?.quarantined?'machine-quarantined':'machine-target-mismatch');
 return state;
}
export async function signClient(state,purpose,input) {
 const issuedAt=Math.floor(Date.now()/1000),proof={publicKey:state.publicKey,issuedAt,deadline:issuedAt+90,nonce:randomUUID(),signature:''};
 const binding={installation:state.installation,purpose,attemptId:input.attemptId,expected:input.expected,payload:input.payload};
 const message=await (['capture','capture-status'].includes(purpose)?machineDataProofMessage:machineProofMessage)(binding,proof);
 const key=await crypto.subtle.importKey('jwk',state.privateKey,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
 proof.signature=Buffer.from(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,new TextEncoder().encode(message))).toString('base64url');
 return {...input,proof};
}
export async function clientRuntimeRequestHash(state,action,input) {
 const binding={installation:state.installation,purpose:action,attemptId:input.attemptId,expected:input.expected,payload:input.payload};
 const message=await machineProofMessage(binding,input.proof);
 const payload={...input.payload,...(action==='enroll'?{generation:1,previousHash:null,machineRevision:1,grantRevision:2}:{}),publicKeyJson:JSON.stringify(canonicalMachineKey(input.proof.publicKey)),nonceHash:await clientHash(input.proof.nonce),proofHash:await clientHash(message),deadline:input.proof.deadline};
 return machineHash({version:13,installation:state.installation,action,attemptId:input.attemptId,expected:input.expected,payload});
}
export function exactRuntimeReceipt(result,action,candidate) {
 const op=result?.operation;if(!op?.completed||op.action!==action||op.attemptId!==candidate.input.attemptId||op.requestHash!==candidate.requestHash)throw clientError('credential-candidate-unconfirmed');
}
export async function machineCall(state,operation,input,options={}) {
 const path=`/_memory/v2/repositories/${state.installation.repositoryId}/machines/${state.machineId}/${operation}`;
 const url=new URL(path,state.installation.memoryOrigin);if(url.origin!==state.installation.memoryOrigin)throw clientError('machine-target-mismatch');
 const remaining=options.deadline===undefined?(options.timeoutMs??15000):Math.min(options.timeoutMs??15000,options.deadline-Date.now());if(remaining<=0)throw clientError('machine-timeout');
 let response;try{response=await fetch(url,{method:options.method||'POST',headers:{...(options.method?'':{'Content-Type':'application/json'}),...(state.credential?{Authorization:`Bearer ${state.credential.token}`} : {}),...options.headers},body:options.body??(input?JSON.stringify(input):undefined),signal:AbortSignal.timeout(remaining),redirect:'error'});}
 catch{throw clientError('machine-unreachable');}
 if(options.raw&&response.ok)return Buffer.from(await response.arrayBuffer());
 const data=await response.json().catch(()=>null);
 if(!response.ok||data?.success!==true)throw clientError(data?.code||'machine-request-denied');return data;
}
export async function refreshMachine(ctx,installation,{timeoutMs=15000,deadline}={}) {
 return withMachineLock(ctx.stateDir,async()=>{
  let state=boundMachine(ctx,installation);
  const input=await signClient(state,'self-status',{attemptId:randomUUID(),expected:runtimeSnapshot(state.snapshot),payload:{machineId:state.machineId,grantId:state.grantId,machineCommitment:state.commitment}});
  let data;
  try{data=await machineCall(state,'self-status',input,{timeoutMs,deadline,headers:state.candidate?{'Wong-Memory-Attempt':state.candidate.input.attemptId,'Wong-Memory-Candidate':state.candidate.hash}:{}});}
  catch(error){if(['machine-proof-denied','machine-core-unsupported','machine-capture-quarantined'].includes(error.code)){writeMachineState(ctx,{...state,quarantined:true,reason:error.code});}throw error;}
  let own=data.result;state={...state,snapshot:own.snapshot,dataSnapshot:data.dataSnapshot};
  if(state.candidate) {
   if(own.credential?.attemptId===state.candidate.input.attemptId&&own.credential.hash===state.candidate.hash&&data.candidate?.completed===true&&data.candidate.action==='renew'&&data.candidate.attemptId===state.candidate.input.attemptId&&data.candidate.candidateHash===state.candidate.hash&&data.candidate.requestHash===state.candidate.requestHash) {
    state.credential={token:state.candidate.token,hash:state.candidate.hash,generation:own.credential.generation,expiresAt:own.credential.expiresAt};delete state.candidate;
   } else if(own.credential?.hash!==state.credential?.hash) {state.quarantined=true;state.reason='credential-candidate-conflict';writeMachineState(ctx,state);throw clientError(state.reason);}
   else {
    // A fresh proof changes the schema13 mutation request hash. Recover the exact
    // precommitted proof only while valid; an unconfirmed candidate stays closed.
    if(data.candidate?.absent===true&&data.candidate.attemptId===state.candidate.input.attemptId&&data.candidate.candidateHash===state.candidate.hash) {
     // Owned durable absence permits a new attempt and fresh proof on the same
     // grant. No partial attempt is resumed and no replacement grant is used.
     delete state.candidate;state.credential={...state.credential,expiresAt:0};
    } else {
     if(state.candidate.input.proof.deadline<=Math.floor(Date.now()/1000)){writeMachineState(ctx,state);throw clientError('credential-candidate-unconfirmed');}
    const recovered=await machineCall(state,state.candidate.input.capability?'enroll':'renew',state.candidate.input,{timeoutMs,deadline});
    exactRuntimeReceipt(recovered.result,state.candidate.input.capability?'enroll':'renew',state.candidate);
    state.credential={token:state.candidate.token,hash:state.candidate.hash,generation:state.candidate.generation,expiresAt:state.candidate.expiresAt};state.snapshot=recovered.result.snapshot;own={...own,credential:{hash:state.credential.hash}};delete state.candidate;
    }
   }
  }
  if(!state.credential||own.credential?.hash!==state.credential.hash) {writeMachineState(ctx,state);throw clientError('credential-unconfirmed');}
  if(state.credential.expiresAt-Math.floor(Date.now()/1000)<7*86400) {
   const token=randomBytes(32).toString('base64url'),hash=await clientHash(token),now=Math.floor(Date.now()/1000),generation=state.credential.generation+1;
   const payload={grantId:state.grantId,machineId:state.machineId,machineCommitment:state.commitment,scope:state.scope,credentialHash:hash,credentialExpiresAt:now+2591900,
    overlapUntil:now+110,previousHash:state.credential.hash,generation,machineRevision:state.machineRevision,grantRevision:state.grantRevision};
   const signed=await signClient(state,'renew',{attemptId:randomUUID(),expected:runtimeSnapshot(state.snapshot),payload});
   state.candidate={token,hash,generation,expiresAt:payload.credentialExpiresAt,input:signed,requestHash:await clientRuntimeRequestHash(state,'renew',signed)};writeMachineState(ctx,state);
   const renewed=await machineCall(state,'renew',signed,{timeoutMs,deadline});exactRuntimeReceipt(renewed.result,'renew',state.candidate);
   state.credential={token,hash,generation,expiresAt:payload.credentialExpiresAt};state.snapshot=renewed.result.snapshot;delete state.candidate;
  }
  writeMachineState(ctx,state);return state;
 });
}
// Trusted setup supplies the installation and one-use key-bound capability. These
// exports do not create operator authority or enroll a clone on its own.
export async function prepareClientKey(ctx,installation) {
 return withMachineLock(ctx.stateDir,async()=>{
  const old=readMachineState(ctx);if(old){if(JSON.stringify(old.installation)!==JSON.stringify(installation)||old.quarantined)throw clientError('machine-target-mismatch');return {machineId:old.machineId,machineCommitment:old.commitment,publicKey:old.publicKey};}
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']),privateKey=await crypto.subtle.exportKey('jwk',pair.privateKey),jwk=await crypto.subtle.exportKey('jwk',pair.publicKey),publicKey={kty:jwk.kty,crv:jwk.crv,x:jwk.x,y:jwk.y};
  const state={installation,machineId:randomUUID(),grantId:null,privateKey,publicKey,commitment:await machineKeyCommitment(publicKey),quarantined:false};writeMachineState(ctx,state);return {machineId:state.machineId,machineCommitment:state.commitment,publicKey};
 });
}

export async function enrollClient(ctx,installation,{grantId,capability,scope,expected,dataSnapshot}) {
 return withMachineLock(ctx.stateDir,async()=>{
  let state=readMachineState(ctx);if(!state||state.quarantined||JSON.stringify(state.installation)!==JSON.stringify(installation)||(state.grantId&&state.grantId!==grantId))throw clientError('machine-target-mismatch');
  state={...state,grantId,scope,machineRevision:1,grantRevision:2,snapshot:runtimeSnapshot(expected),dataSnapshot};
  if(state.credential){
   const proof=await signClient(state,'self-status',{attemptId:randomUUID(),expected:runtimeSnapshot(state.snapshot),payload:{machineId:state.machineId,grantId,machineCommitment:state.commitment}});
   const own=await machineCall(state,'self-status',proof);if(own.result?.credential?.hash!==state.credential.hash||own.result.credential.generation!==state.credential.generation||own.result.credential.expiresAt<=Math.floor(Date.now()/1000)||state.candidate)throw clientError('credential-unconfirmed');
   await machineCall(state,'query',{operation:'sessions',params:{ids:[]}});state.snapshot=own.result.snapshot;state.dataSnapshot=own.dataSnapshot;writeMachineState(ctx,state);return {status:'connected',machineId:state.machineId};
  }
  if(state.candidate) {
   const headers={'Wong-Memory-Attempt':state.candidate.input.attemptId,'Wong-Memory-Candidate':state.candidate.hash};
   const self=await signClient(state,'self-status',{attemptId:randomUUID(),expected:runtimeSnapshot(state.snapshot),payload:{machineId:state.machineId,grantId,machineCommitment:state.commitment}});
   try {
    const own=await machineCall(state,'self-status',self,{headers});
    if(own.result?.credential?.attemptId===state.candidate.input.attemptId&&own.result.credential.hash===state.candidate.hash&&own.candidate?.completed===true&&own.candidate.action==='enroll'&&own.candidate.attemptId===state.candidate.input.attemptId&&own.candidate.candidateHash===state.candidate.hash&&own.candidate.requestHash===state.candidate.requestHash) {
     state.credential={token:state.candidate.token,hash:state.candidate.hash,generation:own.result.credential.generation,expiresAt:own.result.credential.expiresAt};state.snapshot=own.result.snapshot;state.dataSnapshot=own.dataSnapshot;delete state.candidate;writeMachineState(ctx,state);return {status:'connected',machineId:state.machineId};
    }
   } catch(error){if(error.code!=='machine-proof-denied')throw error;}
   const pending=await signClient(state,'enrollment-status',{attemptId:randomUUID(),expected:runtimeSnapshot(state.snapshot),payload:{machineId:state.machineId,grantId,machineCommitment:state.commitment,capabilityHash:await clientHash(capability)},capability});
   const status=await machineCall(state,'enrollment-status',pending,{headers});
   if(status.candidate?.absent!==true||status.candidate.attemptId!==state.candidate.input.attemptId||status.candidate.candidateHash!==state.candidate.hash)throw clientError('credential-candidate-unconfirmed');
   state.snapshot=status.result.snapshot;state.dataSnapshot=status.dataSnapshot;delete state.candidate;writeMachineState(ctx,state);
  }
  if(!state.candidate) {
   const token=randomBytes(32).toString('base64url'),hash=await clientHash(token),now=Math.floor(Date.now()/1000);
   const payload={grantId,machineId:state.machineId,machineCommitment:state.commitment,capabilityHash:await clientHash(capability),scope,
    credentialHash:hash,credentialExpiresAt:now+2591900,overlapUntil:now+110};
   const input=await signClient(state,'enroll',{attemptId:randomUUID(),expected:runtimeSnapshot(state.snapshot),payload,capability});
   state.candidate={token,hash,generation:1,expiresAt:payload.credentialExpiresAt,input,requestHash:await clientRuntimeRequestHash(state,'enroll',input)};writeMachineState(ctx,state);
  }
  const result=(await machineCall(state,'enroll',state.candidate.input)).result;
  exactRuntimeReceipt(result,'enroll',state.candidate);
  state.credential={token:state.candidate.token,hash:state.candidate.hash,generation:1,expiresAt:state.candidate.expiresAt};state.snapshot=result.snapshot;delete state.candidate;writeMachineState(ctx,state);
  return {status:'connected',machineId:state.machineId};
 });
}
