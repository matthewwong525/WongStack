// Finite, separately authorized trusted process. No default provider or network transport.
import { exactKeys,requireValue,resourceTarget,opaqueId } from './installation-validation.mjs';
import { legacyHash,legacyDigest,freezeLegacy } from './machine-legacy-inventory.mjs';
import { boundLegacyProjection,legacyReadback,inspectLegacyClosure } from './machine-legacy-closure.mjs';
const adapters=new WeakMap();
const kinds=Object.freeze(['accounts','zones','workers','versions','domains','routes','previews','bindings','credentials','bucketOrigins']);
const denied=result=>result&&[401,403,404].includes(result.status)&&result.redirected===false&&result.memoryReturned===false&&legacyDigest(result.requestHash)&&legacyDigest(result.responseHash);
export function trustedLegacyAdapter({target,authorization,callbacks,journal}) {
 resourceTarget(target);
 exactKeys(authorization,['targetHash','managementAuthorityHash','closureAuthorityHash','retirementAuthorityHash','backupAuthorityHash','permissionHash']);
 requireValue(Object.values(authorization).every(legacyDigest),'legacy-operator-required');
 requireValue(callbacks&&['read','write','readMigration','inspectSource','inspectRaw','inspectDestination','verifyBackup','enumerate','resolveCredential','closeServing','retireCredential','disableBucket','readClosure','probe','verifyManagement','inspectPins','inspectDeployment','inspectMutation','verifySource','inspectSafety','inspectCorrection','inspectRawPolicy'].every(name=>typeof callbacks[name]==='function'),'legacy-operator-required');
 requireValue(journal&&['append','read','find'].every(name=>typeof journal[name]==='function'),'legacy-operator-required');
 const adapter=Object.freeze({kind:'trusted-legacy-cutover'});
 adapters.set(adapter,{target:freezeLegacy({...target}),authorization:freezeLegacy({...authorization}),callbacks,journal});return adapter;
}
export function legacyAdapter(adapter) {const value=adapters.get(adapter);requireValue(value,'legacy-operator-required');return value;}
export async function legacyCapability(adapter) {
 const value=legacyAdapter(adapter),actual=await legacyReadback(()=>value.callbacks.verifyManagement(value.target),'legacy-source-unavailable');
 requireValue(value.authorization.targetHash===await legacyHash(value.target)&&await legacyHash(actual)===await legacyHash(value.authorization),'legacy-operator-required');return value;
}
export async function legacyIntent(adapter,candidate) {
 const value=await legacyCapability(adapter);boundLegacyProjection(candidate);
 const prior=await legacyReadback(()=>value.journal.read(),'legacy-readback-unavailable');
 const frame={version:15,target:value.target,authorization:value.authorization,candidate,predecessorHash:prior?.hash??null};
 const receipt=freezeLegacy({...frame,hash:await legacyHash(frame)});
 await legacyReadback(()=>value.journal.append(receipt),'legacy-readback-unavailable');
 requireValue(await legacyHash(await value.journal.read())===await legacyHash(receipt),'legacy-readback-unavailable');return receipt;
}
export async function enumerateLegacyAuthority(adapter,inventory) {
 const value=await legacyCapability(adapter);requireValue(inventory.targetHash===value.authorization.targetHash,'target-mismatch');
 const coverage={};let revision=null;
 for(const kind of kinds) {
  const items=[],pages=[];let cursor=null;
  for(let page=1;page<=100;page++) {
   await legacyIntent(adapter,{action:'enumerate',inventoryHash:inventory.inventoryHash,kind,page,cursor});
   const result=await legacyReadback(()=>value.callbacks.enumerate({target:value.target,kind,page,cursor}),'legacy-source-unavailable');
   boundLegacyProjection(result);exactKeys(result,['items','nextPage','revisionHash','readbackHash']);
   requireValue(Array.isArray(result.items)&&result.items.length<=1000&&result.items.every(row=>typeof row?.id==='string'&&row.id.length>0)
    &&legacyDigest(result.revisionHash)&&legacyDigest(result.readbackHash)&&(result.nextPage===null||result.nextPage===page+1),'legacy-closure-incomplete');
   revision??=result.revisionHash;requireValue(revision===result.revisionHash,'legacy-closure-stale');
   items.push(...result.items);pages.push({page,count:result.items.length,readbackHash:result.readbackHash,nextPage:result.nextPage});
   requireValue(items.length<=1000&&new Set(items.map(row=>row.id)).size===items.length,'legacy-closure-incomplete');
   if(result.nextPage===null){coverage[kind]={items,pages};break;}
   cursor=result.nextPage;requireValue(page<100,'legacy-closure-incomplete');
  }
 }
 // Every serving and credential identity must still be visible in the exhaustive enumeration.
 requireValue(coverage.accounts.items.some(row=>row.id===inventory.target.accountId),'legacy-closure-incomplete');
 const matches=(name,ids)=>{const actual=coverage[name].items.map(row=>row.id);requireValue(actual.length===ids.length&&ids.every(id=>actual.includes(id)),'legacy-closure-incomplete');};
 matches('workers',[...new Set(inventory.source.serving.map(row=>row.workerId))]);
 matches('versions',[...new Set(inventory.source.serving.map(row=>row.workerId+':'+row.versionId))]);
 matches('routes',inventory.source.serving.map(row=>row.id));matches('credentials',inventory.source.credentials.map(row=>row.id));
 matches('bucketOrigins',inventory.source.bucket?.publicOrigins??[]);
 // Additional domain/preview/binding rows must identify a reviewed serving path; missing aliases refuse.
 for(const kind of ['domains','previews','bindings'])requireValue(coverage[kind].items.every(row=>inventory.source.serving.some(path=>path.id===row.endpointId)),'legacy-closure-incomplete');
 return {revisionHash:revision,coverage};
}
export async function verifyLegacyBackup(adapter,inventory,universeHash,retirements=[]) {
 const value=await legacyCapability(adapter),actual=await legacyReadback(()=>value.callbacks.verifyBackup({target:value.target,inventoryHash:inventory.inventoryHash,retirements}),'legacy-history-unavailable');
 boundLegacyProjection(actual);exactKeys(actual,['backupHash','resourceOwnershipHash','historyHash','schemaHash','universeHash','retirementsHash','verified','original']);
 requireValue(actual.verified===true&&actual.backupHash===inventory.source.backupHash&&actual.resourceOwnershipHash===inventory.source.resourceOwnershipHash
 &&actual.historyHash===inventory.history.historyHash&&actual.schemaHash===inventory.schemaHash&&actual.universeHash===universeHash
 &&actual.retirementsHash===await legacyHash(retirements)&&actual.original&&typeof actual.original==='object','legacy-history-incomplete');return actual;
}
export async function reserveLegacyCutover(adapter,candidate) {
 const value=await legacyCapability(adapter),retained=await value.journal.find('cutover');
 const identity={action:'cutover',...candidate};
 if(retained) {requireValue(await legacyHash(retained.candidate)===await legacyHash(identity),'machine-attempt-conflict');return retained;}
 return legacyIntent(adapter,identity);
}
export async function mutateLegacyAuthority(adapter,candidate,execute) {
 const value=await legacyCapability(adapter),candidateHash=await legacyHash(candidate);
 const retained=await value.journal.find(candidateHash);
 if(retained)requireValue(await legacyHash(retained.candidate.candidate)===candidateHash,'machine-attempt-conflict');
 const inspect=async()=>{
  const actual=await legacyReadback(()=>value.callbacks.inspectMutation({target:value.target,candidate,candidateHash}),'legacy-readback-unavailable');
  boundLegacyProjection(actual);exactKeys(actual,['candidateHash','targetHash','outcome','receiptHash','absenceEvidenceHash']);
  requireValue(actual.candidateHash===candidateHash&&actual.targetHash===value.authorization.targetHash&&['complete','not-executed','ambiguous'].includes(actual.outcome),'legacy-closure-incomplete');
  return actual;
 };
 let actual=await inspect();
 if(actual.outcome==='complete') {
  requireValue(legacyDigest(actual.receiptHash)&&actual.absenceEvidenceHash===null,'legacy-closure-incomplete');
  await legacyIntent(adapter,{action:'mutation-complete',candidateHash,candidate,readback:actual});return actual;
 }
 requireValue(actual.outcome==='not-executed'&&legacyDigest(actual.absenceEvidenceHash)&&actual.receiptHash===null,'machine-operation-incomplete');
 await legacyIntent(adapter,{action:'mutation-candidate',candidateHash,candidate,absenceEvidenceHash:actual.absenceEvidenceHash});
 try {await execute();}catch { /* Independent exact readback alone may recover response loss. */ }
 actual=await inspect();requireValue(actual.outcome==='complete'&&legacyDigest(actual.receiptHash)&&actual.absenceEvidenceHash===null,'machine-operation-incomplete');
 await legacyIntent(adapter,{action:'mutation-complete',candidateHash,candidate,readback:actual});return actual;
}
export async function closeLegacyAuthority(adapter,inventory,{attemptId,requestHash,universeHash}) {
 requireValue(opaqueId(attemptId)&&legacyDigest(requestHash),'invalid-input');
 const value=await legacyCapability(adapter);
 await reserveLegacyCutover(adapter,{attemptId,requestHash,inventoryHash:inventory.inventoryHash,source:inventory.source,universeHash});
 await verifyLegacyBackup(adapter,inventory,universeHash);await enumerateLegacyAuthority(adapter,inventory);
 for(const serving of inventory.source.serving) {
  await mutateLegacyAuthority(adapter,{action:'close-serving',attemptId,requestHash,serving},()=>value.callbacks.closeServing({target:value.target,serving,attemptId,requestHash}));
 }
 if(inventory.source.bucket) {
  await mutateLegacyAuthority(adapter,{action:'disable-bucket',attemptId,requestHash,bucket:inventory.source.bucket},()=>value.callbacks.disableBucket({target:value.target,bucket:inventory.source.bucket,attemptId,requestHash}));
 }
 for(const credential of inventory.source.credentials) {
  await legacyIntent(adapter,{action:'retire-credential',attemptId,requestHash,credential});
  const secret=await legacyReadback(()=>value.callbacks.resolveCredential({target:value.target,credentialId:credential.id}),'legacy-source-unavailable');
  requireValue(secret&&secret.credentialId===credential.id&&secret.private===true&&typeof secret.secret==='string'&&secret.secret.length>0&&secret.secret.length<=8192,'legacy-closure-incomplete');
  await mutateLegacyAuthority(adapter,{action:'retire-credential',attemptId,requestHash,credential},()=>value.callbacks.retireCredential({target:value.target,credential,secret,attemptId,requestHash}));
 }
 return readLegacyDenial(adapter,inventory,{attemptId,requestHash,universeHash});
}
export async function readLegacyDenial(adapter,inventory,{attemptId,requestHash,universeHash}) {
 const value=await legacyCapability(adapter),enumeration=await enumerateLegacyAuthority(adapter,inventory);
 await legacyIntent(adapter,{action:'read-closure',attemptId,requestHash,inventoryHash:inventory.inventoryHash,enumerationHash:await legacyHash(enumeration)});
 const readback=await legacyReadback(()=>value.callbacks.readClosure({target:value.target,inventory,enumeration}),'legacy-closure-unavailable');
 boundLegacyProjection(readback);requireValue(readback.revisionHash===enumeration.revisionHash,'legacy-closure-stale');
 // Independently execute each probe, including old provider credentials against both direct resources.
 const probes=[];
 const requests=[...inventory.source.serving.flatMap(endpoint=>endpoint.methods.flatMap(method=>['anonymous',...inventory.source.credentials.map(row=>row.id)].map(credentialId=>({endpointId:endpoint.id,url:endpoint.url,method,credentialId,resource:null})))),
 ...(inventory.source.bucket?.publicOrigins??[]).map(url=>({endpointId:url,url,method:'GET',credentialId:'anonymous',resource:null}))];
 for(const credential of inventory.source.credentials.filter(row=>['direct-provider','service-token'].includes(row.kind))) {
  requests.push({endpointId:'direct-d1',url:null,method:'POST',credentialId:credential.id,resource:{kind:'d1',id:inventory.target.databaseId}});
  if(inventory.target.bucketName!==null)requests.push({endpointId:'direct-r2',url:null,method:'GET',credentialId:credential.id,resource:{kind:'r2',id:inventory.target.bucketName}});
 }
 requireValue(requests.length<=1000,'legacy-closure-incomplete');
 for(const candidate of requests) {
  await legacyIntent(adapter,{action:'denial-probe',attemptId,requestHash,inventoryHash:inventory.inventoryHash,candidate});
  const secret=candidate.credentialId==='anonymous'?null:await legacyReadback(()=>value.callbacks.resolveCredential({target:value.target,credentialId:candidate.credentialId}),'legacy-source-unavailable');
  requireValue(secret===null||(secret.private===true&&secret.credentialId===candidate.credentialId&&typeof secret.secret==='string'&&secret.secret.length>0&&secret.secret.length<=8192),'legacy-closure-incomplete');
  const result=await legacyReadback(()=>value.callbacks.probe({target:value.target,candidate,secret,revisionHash:enumeration.revisionHash}),'legacy-closure-unavailable');
  exactKeys(result,['status','redirected','memoryReturned','requestHash','responseHash','revisionHash']);
  requireValue(denied(result)&&result.revisionHash===enumeration.revisionHash,'legacy-closure-incomplete');
  probes.push({endpointId:candidate.endpointId,method:candidate.method,credentialId:candidate.credentialId,...result});
 }
 readback.probes=probes.filter(probe=>!probe.endpointId.startsWith('direct-'));
 const projection=await inspectLegacyClosure({inspectClosure:async()=>readback},inventory);
 const retirements=readback.credentials;
 const backup=await verifyLegacyBackup(adapter,inventory,universeHash,retirements);
 const source=await legacyReadback(()=>value.callbacks.inspectSource(value.target),'legacy-source-unavailable');
 exactKeys(source,Object.keys(inventory.source));
 requireValue(source.targetHash===inventory.targetHash&&Number.isSafeInteger(source.observedAt)&&source.observedAt<=Math.floor(Date.now()/1000)&&source.observedAt>Math.floor(Date.now()/1000)-120&&opaqueId(source.observationId),'legacy-source-unproven');
 const identity=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!['observationId','observedAt'].includes(key)));
 requireValue(await legacyHash(identity(source))===await legacyHash(identity(inventory.source)),'legacy-source-unproven');
 return freezeLegacy({...projection,evidence:readback,directProbes:probes.filter(probe=>probe.endpointId.startsWith('direct-')),enumeration,backup,retirements});
}
