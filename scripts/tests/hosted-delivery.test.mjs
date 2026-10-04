import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { candidateBranch, checkedCandidate, checkedDelivery, checkedPreview, checkedRequest, checkedSelection,
  assertSavedCandidate, gateResult, hostedDelivery, localCandidate } from '../../.agents/skills/save/scripts/hosted-delivery.mjs';
import { privateContextPath, verifyHostedAuthority } from '../../.agents/skills/wong-sync/scripts/hosted-context.mjs';
import { execFileSync, spawnSync } from 'node:child_process';
import { guardMainPush, validateMainUpdate } from '../../.agents/skills/save/scripts/hosted-main-pre-push.mjs';

const BASE='a'.repeat(40),HEAD='b'.repeat(40),SOURCE='c'.repeat(40),STARTER='d'.repeat(40);
const remote='https://account.artifacts.cloudflare.net/git/customer/project.git';
const identity={version:1,provider:'artifacts',projectId:'project',generation:1,remote,sourceCommit:SOURCE,starterCommit:STARTER};
const selection={changeName:'add-tools',branch:'work/separate-name',baseSha:BASE,headSha:HEAD};
const preview={kind:'native-preview',url:'https://immutable.customer.workers.dev/',workerId:'worker',deploymentId:'native-deployment',runId:'candidate-run'};
const candidate={id:'candidate',...selection,checks:{status:'passed',runId:preview.runId},preview};
const provider={headSha:HEAD,workerId:'worker',versionId:'production-version',deploymentId:'production-deployment',runId:'release-run'};
const live={projectId:'project',headSha:HEAD,url:'https://customer.workers.dev/',assetsDigest:'e'.repeat(64)};
const repository={remote,baseSha:BASE,headSha:HEAD};
const publication={id:'publication',status:'published',headSha:HEAD,baseSha:BASE,provider,live,repository};
const envelope=(patch={})=>({ok:true,...identity,candidate,...patch});
const request={action:'status',selection};
const local={dirty:false,branch:selection.branch,headSha:HEAD,recordedBranch:selection.branch};

function box(t, options={}) {
  const home=mkdtempSync(join(tmpdir(),'hosted-delivery-')),dir=join(home,'repo');
  mkdirSync(dir);const file=privateContextPath(home,dir);mkdirSync(dirname(file),{recursive:true,mode:0o700});
  writeFileSync(file,JSON.stringify({...identity,token:'private-context-secret'}),{mode:0o600});
  const calls=[];
  const fetch=async(url,init)=>{
    calls.push({url,init});assert.equal(init.redirect,'error');assert.equal(init.headers.Authorization,'Bearer private-context-secret');
    assert.ok(!init.body.includes('private-context-secret'));
    if(url.endsWith('/context'))return {ok:options.authorized!==false,json:async()=>envelope(options.context)};
    assert.match(url,/\/projects\/project\/delivery$/);
    const body=JSON.parse(init.body);assert.deepEqual(body.identity,identity);
    if(options.throw)throw Error('private-context-secret untrusted provider text');
    return {ok:options.ok!==false,json:async()=>options.reply ? options.reply(body) : envelope(body.action==='approve'||body.action==='recover'?{publication}:{} )};
  };
  t.after(()=>rmSync(home,{recursive:true,force:true}));
  return {home,dir,remote,uid:process.getuid(),local,fetch,calls};
}

test('ordinary branches and differing change names are retained; hostile and reserved branches fail',()=>{
  assert.deepEqual(checkedSelection(selection),selection);
  assert.equal(candidateBranch('feature/phone'),true);
  for(const branch of ['main','release','release-edit','release/operation','-x','a..b','a@{b','a.lock','a/.hidden','a//b','a\\b','a?b','a*','a\nb','a/','@','a.'])assert.equal(candidateBranch(branch),false,branch);
  for(const patch of [{changeName:'../x'},{headSha:BASE},{baseSha:'bad'},{headSha:undefined},{branch:'main'}])assert.throws(()=>checkedSelection({...selection,...patch}));
  assert.deepEqual(checkedSelection({changeName:selection.changeName,branch:selection.branch},true),{changeName:selection.changeName,branch:selection.branch});
  assert.throws(()=>checkedSelection({...selection,headSha:undefined},true));
});
test('commands have one narrow service transport and never include deployment authority',()=>{
  for(const [command,action] of Object.entries({checkpoint:'candidate',gate:'status',preview:'status',publication:'status',continue:'status',recover:'recover'})) {
    const result=checkedRequest(command,{selection,publicationId:'publication',token:'untrusted',workerId:'foreign'});
    assert.equal(result.action,action);assert.equal('token' in result,false);assert.equal('workerId' in result,false);
  }
  assert.throws(()=>checkedRequest('deploy',{selection}));assert.throws(()=>checkedRequest('checkpoint',null));
  assert.throws(()=>checkedRequest('recover',{selection}));
  assert.throws(()=>checkedRequest('approve',{selection,candidateId:'candidate',publicationId:'publication'}));
  const approved=checkedRequest('approve',{selection,candidateId:'candidate',publicationId:'publication',preview});
  assert.equal(approved.preview.deploymentId,'native-deployment');assert.equal('versionId' in approved.preview,false);
});
test('checks are mandatory and bound to the exact candidate/base/change/branch',()=>{
  assert.equal(gateResult(checkedCandidate(candidate,selection)),'SUCCESS');
  for(const [status,expected] of Object.entries({pending:'UNKNOWN',unavailable:'UNKNOWN',failed:'FAILURE','timed-out':'TIMEOUT'})) {
    assert.equal(gateResult(checkedCandidate({...candidate,preview:undefined,checks:{status,runId:status==='pending'?null:'run'}},selection)),expected);
  }
  assert.equal(gateResult(null),'UNKNOWN');
  assert.equal(gateResult({checks:{status:'constructor'}}),'UNKNOWN');
  for(const patch of [{id:null},{headSha:STARTER},{baseSha:SOURCE},{changeName:'foreign'},{branch:'work/foreign'},
    {checks:{status:'passed',runId:null}},{checks:{status:'NONE',runId:'run'}},{checks:{status:'failed',runId:'run'}}])assert.throws(()=>checkedCandidate({...candidate,...patch},selection));
  for(const key of ['projectId','generation','remote','sourceCommit','starterCommit'])assert.throws(()=>checkedDelivery(envelope({[key]:'foreign'}),identity,request),key);
  assert.throws(()=>checkedDelivery(null,identity,request));assert.throws(()=>checkedDelivery(envelope({ok:false}),identity,request));
});
test('only exact native preview receipts are returned; separate version IDs are never invented',()=>{
  assert.deepEqual(checkedPreview({...preview,token:'discard',versionId:'cannot-invent'},preview.runId),preview);
  for(const patch of [{kind:'alias'},{runId:'old-run'},{workerId:null},{deploymentId:null},{url:'http://customer.workers.dev'},
    {url:'https://customer.example.com'},{url:'https://u:p@customer.workers.dev'},{url:'https://customer.workers.dev/?token=secret'},
    {url:'https://customer.workers.dev/#moving'}])assert.throws(()=>checkedPreview({...preview,...patch},preview.runId));
});
test('published requires independent deployment, authenticated identity/assets and exact main receipts',()=>{
  const result=checkedDelivery(envelope({publication}),identity,{...request,publicationId:'publication'});
  assert.deepEqual(result.publication,publication);
  for(const missing of ['provider','live','repository'])assert.throws(()=>checkedDelivery(envelope({publication:{...publication,[missing]:undefined}}),identity,request),missing);
  for(const patch of [{id:'foreign'},{headSha:SOURCE},{baseSha:SOURCE},{status:'made-up'},
    {provider:{...provider,versionId:undefined}},{provider:{...provider,workerId:'foreign'}},{provider:{...provider,headSha:SOURCE}},
    {live:{...live,projectId:'foreign'}},{live:{...live,headSha:SOURCE}},{live:{...live,assetsDigest:'missing'}},
    {repository:{...repository,remote:remote.replace('project.git','foreign.git')}},{repository:{...repository,baseSha:SOURCE}},
    {repository:{...repository,headSha:SOURCE}}])assert.throws(()=>checkedDelivery(envelope({publication:{...publication,...patch}}),identity,{...request,publicationId:'publication'}));
  const pending={id:'publication',status:'deployed-awaiting-confirmation',headSha:HEAD,baseSha:BASE,provider};
  assert.deepEqual(checkedDelivery(envelope({publication:pending}),identity,request).publication,pending);
  assert.equal(checkedDelivery(envelope({publication:pending}),identity,request).repositoryAckNeeded,false);
  const awaiting={...publication,status:'deployed-awaiting-confirmation',repository:undefined};
  const partial=checkedDelivery(envelope({publication:awaiting}),identity,request);
  assert.equal(partial.repositoryAckNeeded,true);assert.deepEqual(partial.publication.live,live);
  assert.equal(result.repositoryAckNeeded,false);
});
test('the acknowledgment guard accepts exactly the approved fast-forward against Git advertised old main',()=>{
  const awaiting={...publication,status:'deployed-awaiting-confirmation',repository:undefined};
  const result=checkedDelivery(envelope({publication:awaiting}),identity,request);
  const updates=`${selection.branch} ${HEAD} refs/heads/main ${BASE}\n`;
  const ancestry=[];
  assert.deepEqual(validateMainUpdate(result,updates,(base,head)=>{ancestry.push([base,head]);return true;}),{expectedMainSha:BASE,approvedSha:HEAD});
  assert.deepEqual(ancestry,[[BASE,HEAD]]);
  for(const wrong of ['',`${updates}${updates}`,updates.replace('refs/heads/main','refs/heads/foreign'),
    updates.replace(BASE,SOURCE),updates.replace(BASE,HEAD),updates.replace(HEAD,'0'.repeat(40)),updates.trim()+' extra']) {
    assert.throws(()=>validateMainUpdate(result,wrong,()=>true));
  }
  assert.throws(()=>validateMainUpdate(result,updates,()=>false));
  for(const status of ['approved','deploying','published','cancelled'])assert.throws(()=>validateMainUpdate({...result,publication:{...awaiting,status}},updates,()=>true));
  assert.throws(()=>validateMainUpdate({...result,repositoryAckNeeded:false},updates,()=>true));
});
test('acknowledgment rereads current private context and provider/live facts without performing a Git mutation',async t=>{
  const awaiting={...publication,status:'deployed-awaiting-confirmation',repository:undefined};
  const fixture=box(t,{reply:()=>envelope({publication:awaiting})});
  const result=await guardMainPush({...fixture,input:{selection,publicationId:'publication'},updates:`HEAD ${HEAD} refs/heads/main ${BASE}\n`,ancestor:()=>true});
  assert.equal(result.approvedSha,HEAD);
  assert.deepEqual(fixture.calls.map(call=>call.url.endsWith('/context')?'context':JSON.parse(call.init.body).action),['context','status']);
  for(const options of [{authorized:false},{ok:false},{reply:()=>envelope({publication:{...awaiting,live:undefined}})},
    {reply:()=>envelope({publication:{...awaiting,status:'published',repository}})}]) {
    const wrong=box(t,options);
    await assert.rejects(guardMainPush({...wrong,input:{selection,publicationId:'publication'},updates:`HEAD ${HEAD} refs/heads/main ${BASE}\n`,ancestor:()=>true}));
  }
  await assert.rejects(guardMainPush({...fixture,remote:remote.replace('project.git','foreign.git'),input:{selection,publicationId:'publication'},updates:`HEAD ${HEAD} refs/heads/main ${BASE}\n`,ancestor:()=>true}));
});
test('an exact approved operation retains its immutable passing preview for late acknowledgment only',async t=>{
  const awaiting={...publication,status:'deployed-awaiting-confirmation',repository:undefined};
  const expired={...candidate,deadlineAt:1};
  const fixture=box(t,{reply:body=>body.action==='approve'?envelope({ok:false}):envelope({candidate:expired,publication:awaiting})});
  const result=await guardMainPush({...fixture,input:{selection,publicationId:'publication'},updates:`HEAD ${HEAD} refs/heads/main ${BASE}\n`,ancestor:()=>true});
  assert.equal(result.approvedSha,HEAD);
  await assert.rejects(hostedDelivery('approve',{selection,candidateId:'candidate',publicationId:'new-publication',preview},fixture));
  const unavailable=box(t,{reply:()=>envelope({candidate:{...expired,preview:undefined,checks:{status:'unavailable',runId:null}}})});
  assert.equal((await hostedDelivery('gate',{selection},unavailable)).gateResult,'UNKNOWN');
  assert.deepEqual(fixture.calls.filter(call=>call.url.endsWith('/delivery')).map(call=>JSON.parse(call.init.body).action),['status','status','approve']);
});
test('final saved head, clean checkout and recorded branch prevent approval after archive/spec edits',()=>{
  assertSavedCandidate(selection,local);
  for(const patch of [{dirty:true},{headSha:SOURCE},{recordedBranch:'add-tools'},{branch:'add-tools'}])assert.throws(()=>assertSavedCandidate(selection,{...local,...patch}));
  assert.throws(()=>assertSavedCandidate(selection,null));
});
test('unsaved preview edits cannot return an earlier passing deployment as the current work',async t=>{
  const fixture=box(t);fixture.local={...local,dirty:true};
  await assert.rejects(hostedDelivery('preview',{selection},fixture));assert.equal(fixture.calls.length,0);
  fixture.local={...local,headSha:SOURCE};
  await assert.rejects(hostedDelivery('preview',{selection},fixture));assert.equal(fixture.calls.length,0);
});
test('checkpoint registration precedes the skill push, sends verified authority and sanitizes service extras',async t=>{
  const fixture=box(t,{reply:()=>envelope({token:'must-not-print',candidate:{...candidate,gitToken:'must-not-print'}})});
  const result=await hostedDelivery('checkpoint',{selection},fixture);
  assert.equal(fixture.calls.length,2);assert.equal(JSON.parse(fixture.calls[1].init.body).action,'candidate');
  assert.equal(result.gateResult,'SUCCESS');assert.ok(!JSON.stringify(result).includes('must-not-print'));
  assert.equal((await verifyHostedAuthority(fixture)).token,'private-context-secret');
});
test('a committed marker, invalid authority, context rotation or weak private files stops before delivery',async t=>{
  for(const options of [{authorized:false},{context:{generation:2}},{context:{remote:remote.replace('project.git','foreign.git')}}]) {
    const fixture=box(t,options);await assert.rejects(hostedDelivery('gate',{selection},fixture));assert.equal(fixture.calls.length,1);
  }
  const fixture=box(t);chmodSync(privateContextPath(fixture.home,fixture.dir),0o644);
  await assert.rejects(hostedDelivery('gate',{selection},fixture));assert.equal(fixture.calls.length,0);
});
test('approval rereads exact passing preview before recording its exact operation',async t=>{
  const fixture=box(t);
  const result=await hostedDelivery('approve',{selection,candidateId:'candidate',publicationId:'publication',preview},fixture);
  assert.deepEqual(fixture.calls.slice(1).map(call=>JSON.parse(call.init.body).action),['status','approve']);
  assert.equal(result.publication.id,'publication');
  for(const changed of [{...candidate,id:'other'},{...candidate,preview:{...preview,deploymentId:'earlier'}},
    {...candidate,preview:undefined,checks:{status:'pending',runId:null}}]) {
    const wrong=box(t,{reply:()=>envelope({candidate:changed})});
    await assert.rejects(hostedDelivery('approve',{selection,candidateId:'candidate',publicationId:'publication',preview},wrong));
    assert.equal(wrong.calls.length,2);
  }
});
test('continuation uses the recorded branch and pending publication recovers the same operation without deployment',async t=>{
  const partial={changeName:selection.changeName,branch:selection.branch};
  const fixture=box(t,{reply:body=>envelope(body.action==='recover'?{publication:{...publication,status:'deployed-awaiting-confirmation',live:undefined,repository:undefined}}:{})});
  assert.equal((await hostedDelivery('continue',{selection:partial},fixture)).candidate.branch,'work/separate-name');
  const result=await hostedDelivery('recover',{selection,publicationId:'publication'},fixture);
  assert.equal(result.publication.status,'deployed-awaiting-confirmation');assert.equal(result.publication.repository,undefined);
  assert.deepEqual(fixture.calls.filter(call=>call.url.endsWith('/delivery')).map(call=>JSON.parse(call.init.body).action),['status','recover']);
  await assert.rejects(hostedDelivery('preview',{selection},box(t,{reply:()=>envelope({candidate:{...candidate,preview:undefined}})})));
});
test('unavailable transport, missing approval receipts and foreign results cannot become success',async t=>{
  for(const options of [{ok:false},{throw:true},{reply:()=>envelope({candidate:{...candidate,headSha:SOURCE}})}])await assert.rejects(hostedDelivery('gate',{selection},box(t,options)));
  await assert.rejects(hostedDelivery('recover',{selection,publicationId:'publication'},box(t,{reply:()=>envelope()})));
});
test('the actual CLI rejects malformed input without showing credentials or provider text',t=>{
  const fixture=box(t),file=join(fixture.home,'request.json');writeFileSync(file,'{"token":"secret-never-print"}');
  const cli=new URL('../../.agents/skills/save/scripts/hosted-delivery.mjs',import.meta.url);
  const result=spawnSync(process.execPath,[cli.pathname,'checkpoint','--repo',fixture.dir,'--input',file],{encoding:'utf8'});
  assert.equal(result.status,1);assert.ok(!result.stdout.includes('secret-never-print'));assert.match(result.stderr,/unverified/);
});
test('the hosted adapter uses the existing help, usage and strict flag convention',()=>{
  const cli=new URL('../../.agents/skills/save/scripts/hosted-delivery.mjs',import.meta.url);
  const help=spawnSync(process.execPath,[cli.pathname,'--help'],{encoding:'utf8'});
  assert.equal(help.status,0);assert.match(help.stdout,/usage:/);
  for(const args of [['--unknown'],['gate'],['unsupported','--input','missing']]) {
    const wrong=spawnSync(process.execPath,[cli.pathname,...args],{encoding:'utf8'});
    assert.equal(wrong.status,2);assert.match(wrong.stderr,/usage:/);
  }
});
test('the trusted pre-push CLI fails closed without printing private input',t=>{
  const fixture=box(t),file=join(fixture.home,'ack.json');writeFileSync(file,'{"token":"private-do-not-print"}');
  const cli=new URL('../../.agents/skills/save/scripts/hosted-main-pre-push.mjs',import.meta.url);
  const result=spawnSync(process.execPath,[cli.pathname,'origin',remote],{input:`HEAD ${HEAD} refs/heads/main ${BASE}\n`,encoding:'utf8',env:{...process.env,WONG_HOSTED_ACK_REPO:fixture.dir,WONG_HOSTED_ACK_REQUEST:file,HOME:fixture.home}});
  assert.equal(result.status,1);assert.equal(result.stdout,'');assert.match(result.stderr,/incomplete/);assert.ok(!result.stderr.includes('private-do-not-print'));
  const help=spawnSync(process.execPath,[cli.pathname,'--help'],{encoding:'utf8'});assert.equal(help.status,0);assert.match(help.stdout,/usage:/);
});
test('local inspection accepts the archived proposal on the same branch and detects subsequent spec changes',t=>{
  const fixture=box(t),git=args=>execFileSync('git',['-C',fixture.dir,...args],{encoding:'utf8'}).trim();
  git(['init','-b',selection.branch]);git(['config','user.name','Fixture']);git(['config','user.email','fixture@example.com']);
  const changeRoot='openspec/changes/archive/2026-10-04-add-tools';mkdirSync(join(fixture.dir,changeRoot),{recursive:true});
  writeFileSync(join(fixture.dir,changeRoot,'proposal.md'),`# Tools\n\n**Branch:** ${selection.branch}\n`);
  git(['add','openspec']);git(['commit','-m','Final archive']);const headSha=git(['rev-parse','HEAD']);
  assertSavedCandidate({...selection,headSha},localCandidate(fixture.dir,changeRoot));
  writeFileSync(join(fixture.dir,'spec.md'),'tracked metadata edit');
  assert.throws(()=>assertSavedCandidate({...selection,headSha},localCandidate(fixture.dir,changeRoot)));
  assert.match(readFileSync(join(fixture.dir,changeRoot,'proposal.md'),'utf8'),/work\/separate-name/);
});
