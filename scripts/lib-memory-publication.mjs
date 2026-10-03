// Publication observes and appends deployment receipts; it cannot issue machine grants.
import { randomUUID,createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync,lstatSync,readlinkSync } from 'node:fs';
import { join } from 'node:path';
import { resourceTarget,requireValue } from '../.agents/skills/memory/scripts/lib/installation-validation.mjs';
import { compiledCoreHashes } from '../.agents/skills/memory/worker/machine-core-contract.mjs';
import { compiledDataHashes } from '../.agents/skills/memory/worker/machine-data-contract.mjs';
import { inspectPendingMachineDeployment,recordMachineDeployment } from '../.agents/skills/memory/scripts/lib/machine-data-operator.mjs';
import { machineHash } from '../.agents/skills/memory/scripts/lib/machine-state.mjs';
import { sameMachineValue } from '../.agents/skills/memory/scripts/lib/machine-operator.mjs';
import { runtimeContext } from '../.agents/skills/memory/worker/machine-context.mjs';

export function publicationSource(root,revision) {
 requireValue(/^[a-f0-9]{40,64}$/.test(revision??''),'publication-source-unverified');
 const actual=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();requireValue(actual===revision,'publication-source-unverified');
 const names=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean).sort(),hash=createHash('sha256');
 for(const name of names){const path=join(root,name),info=lstatSync(path);requireValue(info.isFile()||info.isSymbolicLink(),'publication-source-unverified');hash.update(name+'\0').update(info.isSymbolicLink()?readlinkSync(path):readFileSync(path)).update('\0');}
 return {revision,digest:hash.digest('hex')};
}
export async function durablePublication(journal,value) {
 requireValue(journal&&typeof journal.persist==='function'&&typeof journal.read==='function','publication-journal-required');
 await journal.persist(value);requireValue(sameMachineValue(await journal.read(),value),'publication-journal-unconfirmed');return value;
}
export async function preparePublication({context,journal,source,installation,rollback=false}) {
 resourceTarget(installation,true);const core=await compiledCoreHashes(),internal=runtimeContext(context,true);
 requireValue(typeof source?.revision==='string'&&/^[a-f0-9]{64}$/.test(source.digest??''),'publication-source-unverified');
 const activation=await internal.read('SELECT protocol_hash,route_contract_hash FROM memory_runtime_activations');
 requireValue(activation.length===1&&activation[0].protocol_hash===core.protocolHash&&activation[0].route_contract_hash===core.routeContractHash,'machine-core-unsupported');
 const prior=await journal.read();
 if(prior) {requireValue(sameMachineValue(prior.installation,installation)&&sameMachineValue(prior.source,source)&&prior.rollback===rollback,'publication-journal-conflict');return prior;}
 const current=await inspectPendingMachineDeployment(context);
 requireValue(current.head.pinHash===current.evidence.pinHash,'unreviewed-deployment');
 return durablePublication(journal,{version:1,installation,source,rollback,attemptId:randomUUID(),predecessorId:current.head.id,previousPinHash:current.head.pinHash,phase:'intent',candidate:null,receipt:null});
}
export async function preparePublicationAcknowledgment({context,journal,source,verify}) {
 const intent=await journal.read();requireValue(intent&&sameMachineValue(intent.source,source),'publication-journal-required');
 if(intent.candidate)return intent;
 const actual=await inspectPendingMachineDeployment(context);
 requireValue(sameMachineValue(actual.installation,intent.installation)&&actual.head.id===intent.predecessorId&&actual.head.pinHash===intent.previousPinHash&&actual.evidence.pinHash!==actual.head.pinHash,'unreviewed-deployment');
 requireValue(typeof verify==='function','publication-source-unverified');await verify(actual.evidence,intent);
 const {read}=runtimeContext(context,true);
 requireValue((await read('SELECT id FROM memory_data_attempts WHERE id=?',[intent.attemptId])).length===0,'machine-operation-incomplete');
 // No own authority write exists. Choose fresh revisions while retaining all
 // tombstones and the exact reviewed source, target and predecessor.
 const payload={predecessorId:intent.predecessorId,previousPinHash:intent.previousPinHash,pinHash:actual.evidence.pinHash,evidence:actual.evidence,
 reviewHash:await machineHash(actual.evidence),...await compiledDataHashes(),rollback:intent.rollback};
 const candidate={attemptId:intent.attemptId,expected:actual.snapshot,payload};
 return durablePublication(journal,{...intent,phase:'candidate',candidate,receipt:null});
}
export async function acknowledgePublication({context,journal,source,verify}) {
 const intent=await journal.read();requireValue(intent?.candidate&&sameMachineValue(intent.source,source),'publication-journal-required');
 requireValue(typeof verify==='function','publication-source-unverified');await verify(intent.candidate.payload.evidence,intent);
 const result=await recordMachineDeployment(context,intent.candidate),receipt=result.operation;
 requireValue(receipt?.completed===true&&receipt.attemptId===intent.attemptId&&receipt.action==='deployment','machine-operation-incomplete');
 await durablePublication(journal,{...intent,phase:'complete',receipt});return receipt;
}
