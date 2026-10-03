// A distinct capture purpose; schema13 proof bytes and accepted purposes stay unchanged.
import { canonicalMachineKey,machineKeyCommitment,proofLifetime } from './machine-proof.mjs';
import { exactKeys,opaqueId,requireValue,digest } from '../scripts/lib/installation-validation.mjs';
import { machineHash } from '../scripts/lib/machine-state.mjs';
import { dataRouteContract } from './machine-data-contract.mjs';
export async function machineDataProofMessage(binding,proof) {
 return JSON.stringify({version:2,algorithm:'P-256/SHA-256',purpose:binding.purpose??'capture',origin:binding.installation.memoryOrigin,
 path:dataRouteContract.capture.replace('{repositoryId}',binding.installation.repositoryId).replace('{machineId}',binding.payload.machineId).replace(/capture$/,binding.purpose??'capture'),method:'POST',
 installationId:binding.installation.installationId,repositoryId:binding.installation.repositoryId,machineId:binding.payload.machineId,
 grantId:binding.payload.grantId,attemptId:binding.attemptId,targetHash:await machineHash(binding.installation),
 payloadHash:await digest(JSON.stringify(binding.payload)),expectedHash:await machineHash(binding.expected),issuedAt:proof.issuedAt,deadline:proof.deadline,nonce:proof.nonce});
}
export async function verifyMachineDataProof(binding,proof,now=Math.floor(Date.now()/1000)) {
 requireValue(['capture','capture-status'].includes(binding.purpose??'capture'),'machine-proof-denied');
 exactKeys(proof,['publicKey','issuedAt','deadline','nonce','signature']);
 requireValue(opaqueId(binding.attemptId)&&opaqueId(binding.payload.machineId)&&opaqueId(binding.payload.grantId)&&opaqueId(proof.nonce)
 &&Number.isSafeInteger(proof.issuedAt)&&Number.isSafeInteger(proof.deadline)&&proof.issuedAt<=now&&proof.issuedAt>=now-proofLifetime
 &&proof.deadline>now&&proof.deadline>proof.issuedAt&&proof.deadline<=proof.issuedAt+proofLifetime,'machine-proof-denied');
 const key=canonicalMachineKey(proof.publicKey);
 requireValue(typeof proof.signature==='string'&&/^[A-Za-z0-9_-]{86}$/.test(proof.signature),'machine-proof-denied');
 let valid=false;
 const message=await machineDataProofMessage(binding,proof);
 try {
  const bytes=Uint8Array.from(atob(proof.signature.replace(/-/g,'+').replace(/_/g,'/')+'=='),c=>c.charCodeAt(0));
  requireValue(bytes.length===64&&btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')===proof.signature,'machine-proof-denied');
  const imported=await crypto.subtle.importKey('jwk',key,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  valid=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},imported,bytes,new TextEncoder().encode(message));
 } catch { /* Stable public refusal. */ }
 requireValue(valid,'machine-proof-denied');
 return {publicKeyJson:JSON.stringify(key),commitment:await machineKeyCommitment(key),nonceHash:await digest(proof.nonce),proofHash:await digest(message),deadline:proof.deadline};
}
