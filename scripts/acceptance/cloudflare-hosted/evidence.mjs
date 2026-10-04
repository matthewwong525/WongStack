import { createHash } from 'node:crypto';

const sha=(value,size)=>typeof value==='string'&&new RegExp(`^[a-f0-9]{${size}}$`).test(value);
const id=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value);
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));
const fail=()=>{throw Error('Incomplete or mismatched trial evidence');};
function workerOrigin(value) {
  try {
    const url=new URL(value);
    return typeof value==='string'&&/^https:\/\/[^/?#]+\.workers\.dev\/?$/.test(value)
      &&!url.username&&!url.password&&!url.port&&url.pathname==='/'&&!url.search&&!url.hash;
  } catch {return false;}
}
export const digest=value=>createHash('sha256').update(value).digest('hex');
/** Whitelisted nonsecret facts; provider, compiled identity and Git acknowledgment are independent. */
export function publicationEvidence(expected,bundle,{allowPendingAcknowledgment=false}={}) {
  if(!exact(expected,['projectId','headSha','baseSha','remote','workerId','operationId','workflowId','url','assetsDigest'])
    ||!id(expected.projectId)||!sha(expected.headSha,40)||!sha(expected.baseSha,40)||!id(expected.workerId)||!id(expected.operationId)||!id(expected.workflowId)
    ||expected.headSha===expected.baseSha||!sha(expected.assetsDigest,64)||!workerOrigin(expected.url)
    ||!/^https:\/\/[a-f0-9]{32}\.artifacts\.cloudflare\.net\/git\/[\w.-]+\/[\w.-]+\.git$/.test(expected.remote))fail();
  const required=['operationId','provider','live'];if(!allowPendingAcknowledgment||bundle?.repository!==undefined)required.push('repository');
  if(!exact(bundle,required)||bundle.operationId!==expected.operationId)fail();
  const {provider,live,repository}=bundle;
  if(!exact(provider,['headSha','workerId','versionId','deploymentId','runId'])||provider.headSha!==expected.headSha
    ||provider.workerId!==expected.workerId||provider.runId!==expected.workflowId||!id(provider.versionId)||!id(provider.deploymentId)
    ||!exact(live,['projectId','headSha','url','assetsDigest'])||live.projectId!==expected.projectId||live.headSha!==expected.headSha
    ||live.url!==expected.url||live.assetsDigest!==expected.assetsDigest)fail();
  if(repository!==undefined&&(!exact(repository,['remote','baseSha','headSha'])||repository.remote!==expected.remote||repository.baseSha!==expected.baseSha||repository.headSha!==expected.headSha))fail();
  return {operationId:bundle.operationId,provider,live,...(repository&&{repository}),complete:!!repository};
}
/** Full canonical readback. A 401, missing page, repeated cursor or duplicate ID is unknown, never absence. */
export function inventoryEvidence(pages,{pagination='cursor',maxPages=100}={}) {
  if(!Number.isSafeInteger(maxPages)||maxPages<1||maxPages>100||!['cursor','offset'].includes(pagination)||!Array.isArray(pages)||!pages.length||pages.length>maxPages)fail();
  const ids=new Set(),cursors=new Set();let requested=pagination==='cursor'?null:0;
  for(let i=0;i<pages.length;i++) {
    const p=pages[i];
    if(!exact(p,['status','requested','next','items'])||p.status!==200||p.requested!==requested||!Array.isArray(p.items)||p.items.length>1000)fail();
    for(const item of p.items) {if(!exact(item,['id'])||!id(item.id)||ids.has(item.id))fail();ids.add(item.id);}
    if(i===pages.length-1) {if(p.next!==null)fail();}
    else {if(pagination==='cursor'?typeof p.next!=='string'||!p.next||cursors.has(p.next):!Number.isSafeInteger(p.next)||p.next!==requested+p.items.length||p.next<=requested)fail();cursors.add(p.next);}
    requested=p.next;
  }
  return {complete:true,ids:[...ids].sort()};
}
export function absenceEvidence(resourceId,canonicalStatus,inventory) {
  if(!id(resourceId)||canonicalStatus!==404||inventory?.complete!==true||!Array.isArray(inventory.ids)||inventory.ids.includes(resourceId))fail();
  return {resourceId,absent:true};
}
/** Conservative limits; no operation, resource, grant or money is allocated by this helper. */
export function trialBounds(authority,ledger,now=Date.now()) {
  if(!exact(authority,['runId','authorityDigest','issuedAt','admissionEndsAt','expiresAt'])||!id(authority.runId)||!sha(authority.authorityDigest,64)
    ||![authority.issuedAt,authority.admissionEndsAt,authority.expiresAt,now].every(Number.isSafeInteger)||authority.issuedAt>now
    ||authority.expiresAt<=now||authority.expiresAt-authority.issuedAt>120*60_000||authority.admissionEndsAt>authority.expiresAt-30*60_000
    ||authority.admissionEndsAt<=authority.issuedAt||!exact(ledger,['authorityDigest','spentUsd','reservedUsd','checks','publications','runners','runnerSeconds','grants'])
    ||ledger.authorityDigest!==authority.authorityDigest)fail();
  for(const field of ['spentUsd','reservedUsd','checks','publications','runners','runnerSeconds','grants'])if(!Number.isFinite(ledger[field])||ledger[field]<0)fail();
  for(const field of ['checks','publications','runners','runnerSeconds','grants'])if(!Number.isSafeInteger(ledger[field]))fail();
  if(ledger.spentUsd+ledger.reservedUsd>10||ledger.checks>8||ledger.publications>2||ledger.runners>40||ledger.runnerSeconds>5400||ledger.grants>50)fail();
  return {admissionOpen:now<authority.admissionEndsAt&&ledger.spentUsd+ledger.reservedUsd<8,cleanupBy:authority.expiresAt};
}
