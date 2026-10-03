// Synthetic schema14 adapters. No provider, private state, token or production target.
import { enrolledRuntimeFixture,signingKey,now,attempt,MACHINE,GRANT,corruptRuntime } from './runtime.mjs';
import { readMachineRuntimeStatus } from '../../../../.agents/skills/memory/scripts/lib/machine-runtime-operator.mjs';
import { machineDataProofMessage } from '../../../../.agents/skills/memory/worker/machine-data-proof.mjs';
import { trustedMachineDataContext,prepareMachineData,readMachineDataStatus,inspectMachineDeployment } from '../../../../.agents/skills/memory/scripts/lib/machine-data-operator.mjs';
import { compiledDataHashes } from '../../../../.agents/skills/memory/worker/machine-data-contract.mjs';
export { attempt,MACHINE,GRANT,now,corruptRuntime,signingKey };
export async function dataFixture(t,options={}) {
 const f=await enrolledRuntimeFixture(t,options);f.context=await trustedMachineDataContext(f.operator,f.installation);
 const evidence=await inspectMachineDeployment(f.operator,f.target);
 f.dataUpgrade={operationId:attempt('data-bootstrap'),expected:await f.expected(),genesis:{pinHash:evidence.pinHash,targetJson:evidence.targetJson,evidence}};
 f.before14=f.snapshot();await prepareMachineData(f.context,f.dataUpgrade);
 f.expected=async()=>(await readMachineDataStatus(f.context)).snapshot;f.runtimeExpected=async()=>(await readMachineRuntimeStatus(f.context)).snapshot;return f;
}
export async function signedData(f,input,purpose='capture',changes={}) {
 const proof={publicKey:f.signing.publicKey,issuedAt:now(),deadline:now()+90,nonce:crypto.randomUUID(),signature:'',...changes};
 const message=await machineDataProofMessage({installation:f.installation,purpose,attemptId:input.attemptId,expected:input.expected,payload:input.payload},proof);
 const signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},f.signing.privateKey,new TextEncoder().encode(message));
 proof.signature=btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 return {...input,proof};
}
export async function captureInput(f,changes={}) {
 const latest=f.db.prepare('SELECT * FROM memory_runtime_rotations WHERE machine_id=? ORDER BY generation DESC LIMIT 1').get(MACHINE);
 const payload={machineId:MACHINE,repositoryId:f.installation.repositoryId,grantId:GRANT,machineCommitment:f.signing.commitment,machineRevision:1,grantRevision:2,
 credentialGeneration:latest.generation,credentialHash:latest.hash,visibility:'private',source:'save',newTags:[],session:{id:'codex:fixture-data-session',agent:'codex',status:'captured',reason:null,previousCursor:null,nextCursor:'message1',updatedAt:'2026-10-03T00:00:00Z',branch:null,cwd:null,startedAt:null,endedAt:null},
 facts:[{slug:'work',type:'project',body:'Synthetic fixture fact.',tags:[],supersedes:[]}],run:{startedAt:'2026-10-03T00:00:00Z',finishedAt:'2026-10-03T00:01:00Z',counts:{added:1,superseded:0,captured:1}},...changes};
 return signedData(f,{attemptId:attempt('capture14'),expected:await f.expected(),payload});
}
export async function receiptInput(f,result,changes={}) {
 return signedData(f,{attemptId:attempt('capture-status14'),expected:await f.expected(),payload:{machineId:MACHINE,grantId:GRANT,machineCommitment:f.signing.commitment,
 targetAttemptId:result.operation.attemptId,requestHash:result.operation.requestHash,...changes}},'capture-status');
}
export async function successorInput(f,evidence,changes={}) {
 const compiled=await compiledDataHashes(),head=f.db.prepare('SELECT attempt_id id,pin_hash FROM memory_data_deployments ORDER BY rowid DESC LIMIT 1').get()
 ?? {id:f.dataUpgrade.operationId,pin_hash:f.dataUpgrade.genesis.pinHash};
 return {attemptId:attempt('deployment14'),expected:f.beforeDeploymentSnapshot??await f.expected(),payload:{predecessorId:head.id,previousPinHash:head.pin_hash,pinHash:evidence.pinHash,evidence,
 reviewHash:await import('../../../../.agents/skills/memory/scripts/lib/machine-state.mjs').then(m=>m.machineHash(evidence)),...compiled,rollback:false,...changes}};
}
export async function deployFixtureVersion(f,version='22222222-2222-4222-8222-222222222222') {
 f.beforeDeploymentSnapshot=await f.expected();
 for(const [name,w] of f.workers) {
  w.active.id=version;w.deployment.deployments[0].versions[0].version_id=version;
  f.receipts.set(`/accounts/${f.target.accountId}/workers/scripts/${name}/versions/${version}`,w.active);
 }
 return inspectMachineDeployment(f.operator,f.target);
}
