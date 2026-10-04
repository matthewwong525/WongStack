import { publicationEvidence,trialBounds } from './evidence.mjs';

/** Wrap only the existing exact guarded Git acknowledgment. Never retry it here. */
export async function acknowledgmentFault({expected,bundle,authority,ledger,fault},acknowledge) {
  trialBounds(authority,ledger);
  const facts=publicationEvidence(expected,bundle,{allowPendingAcknowledgment:true});
  if(facts.complete||!['before-ack','lost-after-ack'].includes(fault)||typeof acknowledge!=='function')throw Error('Exact pending acknowledgment unavailable');
  if(fault==='before-ack')throw Error('Injected loss before exact acknowledgment');
  await acknowledge({projectId:expected.projectId,operationId:expected.operationId,baseSha:expected.baseSha,headSha:expected.headSha,remote:expected.remote});
  throw Error('Injected response loss after exact acknowledgment; read back the same operation');
}
