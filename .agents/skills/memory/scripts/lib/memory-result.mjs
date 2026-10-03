// Public observations contain routing and this machine's observed readiness only.
import { opaqueId, requireValue,canonicalOrigin } from './installation-validation.mjs';
import { boundMachine,machineCall } from './machine-client.mjs';
const observations=new WeakSet();
const fields = ['protocolVersion','installationId','repositoryId','appUrl','memoryOrigin','status','reason','instruction'];
export const setupReasons = Object.freeze({
 'trusted-machine-setup-required':'Finish trusted setup on this machine.',
 'publication-required':'Wait for the reviewed production publication.',
 'machine-operation-proof-required':'Reconnect this machine through trusted setup.',
 'incomplete-machine-operation':'Recover the retained exact setup attempt.',
 'machine-revoked':'This machine was removed; contact the installation operator.',
 'exact-machine-revocation-required':'Supply the private exact machine removal record.',
 'unsupported-memory-result':'Update the setup consumer before reconnecting.',
});
function origin(value) { if(value===null)return true;try{canonicalOrigin(value);return true;}catch{return false;} }
export function memoryResult(installation=null,status='pending-setup',reason='trusted-machine-setup-required',proof=null) {
 requireValue(status!=='ready'||observations.has(proof),'machine-operation-proof-required');
 const value={protocolVersion:2,installationId:installation?.installationId??null,repositoryId:installation?.repositoryId??null,
 appUrl:installation?.appUrl??null,memoryOrigin:installation?.memoryOrigin??null,status,reason:status==='ready'?null:reason,instruction:status==='ready'?null:setupReasons[reason]};
 return validateMemoryResult(value);
}
export async function observeMachineMemory(ctx,installation) {
 const state=boundMachine(ctx,installation);requireValue(state.credential&&state.grantId&&state.commitment,'machine-operation-proof-required');
 await machineCall(state,'query',{operation:'sessions',params:{ids:[]}});
 const current=boundMachine(ctx,installation);requireValue(current.machineId===state.machineId&&current.grantId===state.grantId&&current.commitment===state.commitment&&current.credential.hash===state.credential.hash,'machine-operation-proof-required');
 const proof=Object.freeze({});observations.add(proof);return memoryResult(installation,'ready',null,proof);
}
// A remote installer's ready observation never proves the receiving machine.
export function consumeMemoryResult(value) {validateMemoryResult(value);return value.status==='ready'?memoryResult(value,'pending-setup','machine-operation-proof-required'):value;}
export function validateMemoryResult(value) {
 requireValue(value&&Object.keys(value).length===fields.length&&fields.every(k=>Object.hasOwn(value,k))&&value.protocolVersion===2,'unsupported-memory-result');
 requireValue(['pending-setup','ready','blocked'].includes(value.status)&&['installationId','repositoryId'].every(k=>value[k]===null||opaqueId(value[k]))&&origin(value.appUrl)&&origin(value.memoryOrigin),'unsupported-memory-result');
 requireValue(value.status==='ready'?value.reason===null&&value.instruction===null&&['installationId','repositoryId','appUrl','memoryOrigin'].every(k=>value[k]!==null):Object.hasOwn(setupReasons,value.reason)&&value.instruction===setupReasons[value.reason],'unsupported-memory-result');
 return Object.freeze(Object.fromEntries(fields.map(k=>[k,value[k]])));
}
