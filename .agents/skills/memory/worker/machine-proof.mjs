// Inactive WebCrypto proof primitives. No token generation, logging, HTTP or key storage.
import { exactKeys, requireValue, digest, opaqueId } from '../scripts/lib/installation-validation.mjs';
import { machineHash } from '../scripts/lib/machine-state.mjs';

export const proofLifetime = 120;
export const proofPurposes = Object.freeze(['enroll', 'renew', 'stage', 'publish', 'self-status', 'enrollment-status']);
export const runtimePath = (repositoryId, machineId, purpose) => `/_memory/v2/repositories/${repositoryId}/machines/${machineId}/${purpose}`;
export function canonicalMachineKey(value) {
  exactKeys(value, ['kty', 'crv', 'x', 'y']);
  requireValue(value.kty === 'EC' && value.crv === 'P-256' && [value.x, value.y].every(v => typeof v === 'string' && /^[A-Za-z0-9_-]{43}$/.test(v)), 'machine-proof-denied');
  for (const coordinate of [value.x, value.y]) {
    let decoded;
    try { decoded = atob(coordinate.replace(/-/g, '+').replace(/_/g, '/') + '='); }
    catch { requireValue(false, 'machine-proof-denied'); }
    requireValue(decoded.length === 32 && btoa(decoded).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') === coordinate, 'machine-proof-denied');
  }
  return { kty: 'EC', crv: 'P-256', x: value.x, y: value.y };
}
export const machineKeyCommitment = key => machineHash(canonicalMachineKey(key));
function bytes(value) {
  requireValue(typeof value === 'string' && /^[A-Za-z0-9_-]{86}$/.test(value), 'machine-proof-denied');
  let result;
  try { result = Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/') + '=='), c => c.charCodeAt(0)); }
  catch { requireValue(false, 'machine-proof-denied'); }
  requireValue(result.length === 64 && btoa(String.fromCharCode(...result)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') === value, 'machine-proof-denied');
  return result;
}
export async function machineProofMessage(binding, proof) {
  return JSON.stringify({ version: 2, algorithm: 'P-256/SHA-256', purpose: binding.purpose,
    origin: binding.installation.memoryOrigin, path: runtimePath(binding.installation.repositoryId, binding.payload.machineId, binding.purpose), method: 'POST',
    installationId: binding.installation.installationId, repositoryId: binding.installation.repositoryId,
    machineId: binding.payload.machineId, grantId: binding.payload.grantId, attemptId: binding.attemptId,
    targetHash: await machineHash(binding.installation), payloadHash: await machineHash(binding.payload),
    expectedHash: await machineHash(binding.expected), issuedAt: proof.issuedAt, deadline: proof.deadline, nonce: proof.nonce });
}
export async function verifyMachineProof(binding, proof, now = Math.floor(Date.now() / 1000)) {
  exactKeys(proof, ['publicKey', 'issuedAt', 'deadline', 'nonce', 'signature']);
  requireValue(proofPurposes.includes(binding.purpose) && opaqueId(binding.attemptId) && opaqueId(binding.payload.machineId)
    && opaqueId(binding.payload.grantId) && opaqueId(proof.nonce) && Number.isSafeInteger(proof.issuedAt) && Number.isSafeInteger(proof.deadline)
    && proof.issuedAt <= now && proof.issuedAt >= now - proofLifetime && proof.deadline > now
    && proof.deadline > proof.issuedAt && proof.deadline <= proof.issuedAt + proofLifetime, 'machine-proof-denied');
  const publicKey = canonicalMachineKey(proof.publicKey), signature = bytes(proof.signature);
  const message = await machineProofMessage(binding, proof);
  let verified = false;
  try {
    const key = await crypto.subtle.importKey('jwk', publicKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    verified = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, signature, new TextEncoder().encode(message));
  } catch { /* All crypto failures have the same public projection. */ }
  requireValue(verified, 'machine-proof-denied');
  return { commitment: await machineKeyCommitment(publicKey), publicKeyJson: JSON.stringify(publicKey),
    nonceHash: await digest(proof.nonce), proofHash: await digest(message), deadline: proof.deadline };
}
export async function rawCapabilityHash(value) {
  requireValue(typeof value === 'string' && /^[A-Za-z0-9_-]{43,128}$/.test(value), 'machine-proof-denied');
  return digest(value);
}
