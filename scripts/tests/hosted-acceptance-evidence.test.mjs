import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicationEvidence,inventoryEvidence,absenceEvidence,trialBounds,digest } from '../acceptance/cloudflare-hosted/evidence.mjs';
import { acknowledgmentFault } from '../acceptance/cloudflare-hosted/acknowledgment-fault.mjs';
import { probePrivateOutput } from '../acceptance/cloudflare-hosted/probe.mjs';

const now=Date.now(),head='a'.repeat(40),base='b'.repeat(40),remote=`https://${'a'.repeat(32)}.artifacts.cloudflare.net/git/trial/site.git`,url='https://exact.fixture.workers.dev';
const manifest=[{path:'index.html',size:5,sha256:digest('hello')}];
const expected={projectId:'project',headSha:head,baseSha:base,remote,workerId:'worker',operationId:'publication',workflowId:'workflow',url,assetsDigest:digest(JSON.stringify(manifest))};
const bundle={operationId:'publication',provider:{headSha:head,workerId:'worker',versionId:'version',deploymentId:'deployment',runId:'workflow'},live:{projectId:'project',headSha:head,url,assetsDigest:expected.assetsDigest},repository:{remote,baseSha:base,headSha:head}};
const authority={runId:'run',authorityDigest:'f'.repeat(64),issuedAt:now,admissionEndsAt:now+90*60_000,expiresAt:now+120*60_000};
const ledger={authorityDigest:authority.authorityDigest,spentUsd:1,reservedUsd:1,checks:1,publications:1,runners:4,runnerSeconds:1200,grants:5};
test('publication requires all three exact independent facts; partial deploy/live is pending acknowledgment',()=>{
  assert.equal(publicationEvidence(expected,bundle).complete,true);
  const {repository,...pending}=bundle;void repository;
  assert.throws(()=>publicationEvidence(expected,pending));assert.equal(publicationEvidence(expected,pending,{allowPendingAcknowledgment:true}).complete,false);
  for(const kind of ['provider','live','repository']) {
    const value=structuredClone(bundle);value[kind].headSha='c'.repeat(40);assert.throws(()=>publicationEvidence(expected,value));
  }
  for(const [kind,key] of [['provider','workerId'],['provider','runId'],['live','projectId'],['live','assetsDigest'],['live','url'],['repository','remote'],['repository','baseSha']]) {
    const value=structuredClone(bundle);value[kind][key]='foreign';assert.throws(()=>publicationEvidence(expected,value));
  }
  assert.throws(()=>publicationEvidence(expected,{...bundle,operationId:'replacement'}));
  assert.throws(()=>publicationEvidence(expected,{...bundle,repository:null}));
  assert.throws(()=>publicationEvidence({...expected,baseSha:head},bundle));
  assert.throws(()=>publicationEvidence(expected,{...bundle,secret:'must-not-appear'}));
  assert.throws(()=>publicationEvidence(expected,{...bundle,provider:{...bundle.provider,token:'secret'}}));
  assert.throws(()=>publicationEvidence({...expected,headSha:'bad'},bundle));
  for(const badUrl of ['https://foreign.example','https://u:p@exact.fixture.workers.dev','https://exact.fixture.workers.dev:444','not-a-url'])
    assert.throws(()=>publicationEvidence({...expected,url:badUrl},bundle));
});
test('inventory requires full cursor/offset pagination with canonical unique IDs',()=>{
  const pages=[{status:200,requested:null,next:'page2',items:[{id:'a'}]},{status:200,requested:'page2',next:null,items:[{id:'b'}]}];
  assert.deepEqual(inventoryEvidence(pages),{complete:true,ids:['a','b']});
  const offsets=pages.map((p,i)=>({...p,requested:i,next:i===0?1:null}));assert.equal(inventoryEvidence(offsets,{pagination:'offset'}).complete,true);
  for(const bad of [[],pages.slice(0,1),[{...pages[0],status:401}],pages.map(p=>({...p,requested:null})),[pages[0],{...pages[1],items:[{id:'a'}]}],[{...pages[0],items:[{}]}]])assert.throws(()=>inventoryEvidence(bad));
  assert.throws(()=>inventoryEvidence([{...offsets[0],next:0},offsets[1]],{pagination:'offset'}));
  for(const maxPages of [1,0,101,Infinity,NaN])assert.throws(()=>inventoryEvidence(pages,{maxPages}));
  assert.deepEqual(absenceEvidence('missing',404,inventoryEvidence(pages)),{resourceId:'missing',absent:true});
  for(const status of [200,202,401,403,500])assert.throws(()=>absenceEvidence('missing',status,{complete:true,ids:[]}));
  assert.throws(()=>absenceEvidence('a',404,inventoryEvidence(pages)));assert.throws(()=>absenceEvidence('missing',404,{complete:false,ids:[]}));
});
test('bounds refuse oversized/time-expired/stale ledgers and close new work before cleanup',()=>{
  assert.equal(trialBounds(authority,ledger,now).admissionOpen,true);
  assert.equal(trialBounds(authority,ledger,authority.admissionEndsAt).admissionOpen,false);
  assert.equal(trialBounds(authority,{...ledger,spentUsd:7},now).admissionOpen,false);
  for(const patch of [{spentUsd:11},{spentUsd:-1},{reservedUsd:Infinity},{checks:9},{checks:1.5},{publications:3},{runners:41},{runnerSeconds:5401},{grants:51},{authorityDigest:'wrong'}])assert.throws(()=>trialBounds(authority,{...ledger,...patch},now));
  assert.throws(()=>trialBounds(authority,ledger,authority.expiresAt));assert.throws(()=>trialBounds({...authority,issuedAt:now+1},ledger,now));
  assert.throws(()=>trialBounds({...authority,expiresAt:now+121*60_000},ledger,now));
});
test('fault injection never replaces or retries an acknowledged operation',async()=>{
  const {repository,...pending}=bundle;void repository;let calls=0;
  const input={expected,bundle:pending,authority,ledger};
  const ack=async actual=>{calls++;assert.deepEqual(actual,{projectId:'project',operationId:'publication',baseSha:base,headSha:head,remote});};
  await assert.rejects(acknowledgmentFault({...input,fault:'before-ack'},ack),/before/);assert.equal(calls,0);
  await assert.rejects(acknowledgmentFault({...input,fault:'lost-after-ack'},ack),/read back/);assert.equal(calls,1);
  await assert.rejects(acknowledgmentFault({...input,fault:'other'},ack));await assert.rejects(acknowledgmentFault({...input,bundle,fault:'lost-after-ack'},ack));assert.equal(calls,1);
  await assert.rejects(acknowledgmentFault({...input,bundle:{...pending,operationId:'foreign'},fault:'lost-after-ack'},ack));assert.equal(calls,1);
});
const identity={projectId:'project',headSha:head};
function privateFetch(patch={}) {
  return async(target,options)=>{
    assert.equal(options.redirect,'manual');
    if(!options.headers)return new Response(null,{status:patch.anonymousStatus??302});
    assert.equal(options.headers['CF-Access-Client-Secret'],'private-test-secret');
    if(patch.authenticatedStatus)return new Response(null,{status:patch.authenticatedStatus});
    if(target.endsWith('/_hosted/identity'))return Response.json({projectId:'project',sourceCommit:patch.sha??head});
    if(target.endsWith('/__hosted/identity.json'))return Response.json({projectId:'project',headSha:head,assetsDigest:expected.assetsDigest,manifest});
    return new Response(patch.bytes??'hello');
  };
}
test('probes compiled API, identity manifest and every private asset without disclosing credentials',async()=>{
  const headers={'CF-Access-Client-ID':'private-test-id','CF-Access-Client-Secret':'private-test-secret'};
  const result=await probePrivateOutput(url,identity,manifest,headers,privateFetch());assert.equal(result.surfaces.length,3);assert.doesNotMatch(JSON.stringify(result),/secret/);
  for(const patch of [{anonymousStatus:200},{anonymousStatus:500},{authenticatedStatus:401},{sha:'c'.repeat(40)},{bytes:'wrong'}])await assert.rejects(probePrivateOutput(url,identity,manifest,headers,privateFetch(patch)));
  await assert.rejects(probePrivateOutput('https://foreign.example',identity,manifest,headers,privateFetch()));
  await assert.rejects(probePrivateOutput(url,identity,[{...manifest[0],path:'../outside'}],headers,privateFetch()));
  for(const bad of ['https://u:p@exact.fixture.workers.dev','https://exact.fixture.workers.dev:444'])
    await assert.rejects(probePrivateOutput(bad,identity,manifest,headers,privateFetch()));
  await assert.rejects(probePrivateOutput(url,identity,manifest,{Authorization:'Bearer secret'},privateFetch()));
  await assert.rejects(probePrivateOutput(url,identity,[...manifest,...manifest],headers,privateFetch()));
  await assert.rejects(probePrivateOutput(url,identity,manifest,headers,privateFetch({bytes:'oversized'})),/bound/);
});
