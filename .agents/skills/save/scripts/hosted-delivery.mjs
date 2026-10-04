// Transport only: delivery verbs retain git, planning and archive responsibilities.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { artifactsRemote, HOSTED_ORIGIN, ID, SHA, verifyHostedAuthority } from '../../wong-sync/scripts/hosted-context.mjs';

const actions = { checkpoint:'candidate', gate:'status', preview:'status', approve:'approve', publication:'status', continue:'status', recover:'recover' };
const fail = () => { throw Error('Hosted delivery is unverified. Reconnect or refresh this exact saved change.'); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const id = value => typeof value === 'string' && ID.test(value);
const sha = value => typeof value === 'string' && SHA.test(value);
const slug = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 100;
export function candidateBranch(value) {
  return typeof value === 'string' && value.length <= 200 && value !== 'main' && !/^release(?:[/-]|$)/.test(value)
    && !value.startsWith('-') && !/[\s~^:?*\\]/.test(value) && !value.includes('[')
    && ![...value].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
    && !value.includes('..') && !value.includes('@{') && value !== '@'
    && value.split('/').every(part => part && !part.startsWith('.') && !part.endsWith('.') && !part.endsWith('.lock'));
}
function site(value) {
  if(typeof value !== 'string' || value.length > 2048) fail();
  const url = new URL(value);
  if(url.protocol !== 'https:' || !url.hostname.endsWith('.workers.dev') || url.username || url.password || url.port || url.search || url.hash) fail();
  return value;
}
export function checkedPreview(value, runId) {
  if(!object(value) || value.kind !== 'native-preview' || !id(value.workerId) || !id(value.deploymentId) || !id(value.runId) || value.runId !== runId) fail();
  return {kind:'native-preview',url:site(value.url),workerId:value.workerId,deploymentId:value.deploymentId,runId:value.runId};
}
export function checkedSelection(value, partial = false) {
  if(!object(value) || !slug(value.changeName) || !candidateBranch(value.branch)) fail();
  const selection = {changeName:value.changeName,branch:value.branch};
  if(partial && value.baseSha === undefined && value.headSha === undefined) return selection;
  if(!sha(value.baseSha) || !sha(value.headSha) || value.baseSha === value.headSha) fail();
  return {...selection,baseSha:value.baseSha,headSha:value.headSha};
}
export function checkedRequest(command, value) {
  if(!Object.hasOwn(actions,command) || !object(value)) fail();
  const selection = checkedSelection(value.selection, ['continue','publication','recover'].includes(command));
  const request = {action:actions[command],selection};
  if(command === 'approve') {
    if(!id(value.candidateId) || !id(value.publicationId)) fail();
    return {...request,candidateId:value.candidateId,publicationId:value.publicationId,preview:checkedPreview(value.preview,value.preview?.runId)};
  }
  if(command === 'recover' || value.publicationId !== undefined) {
    if(!id(value.publicationId)) fail();
    request.publicationId = value.publicationId;
  }
  return request;
}
export function checkedCandidate(value, selection) {
  if(!object(value) || !id(value.id)) fail();
  const actual = checkedSelection(value);
  for(const [key,expected] of Object.entries(selection)) if(actual[key] !== expected) fail();
  if(!object(value.checks) || !['pending','passed','failed','timed-out','unavailable'].includes(value.checks.status)) fail();
  const {status,runId} = value.checks;
  if(runId !== null && !id(runId)) fail();
  if(['passed','failed','timed-out'].includes(status) && !id(runId)) fail();
  const candidate = {id:value.id,...actual,checks:{status,runId}};
  if(value.preview !== undefined) {
    if(status !== 'passed') fail();
    candidate.preview = checkedPreview(value.preview,runId);
  }
  return candidate;
}
function checkedPublication(value, candidate, context, operationId) {
  if(!object(value) || !id(value.id) || (operationId && operationId !== value.id)
    || value.headSha !== candidate.headSha || value.baseSha !== candidate.baseSha
    || !['approved','deploying','deployed-awaiting-confirmation','published','cancelled'].includes(value.status)) fail();
  const result = {id:value.id,status:value.status,headSha:value.headSha,baseSha:value.baseSha};
  if(value.provider !== undefined) {
    const p = value.provider;
    if(!object(p) || p.headSha !== candidate.headSha || ![p.workerId,p.versionId,p.deploymentId,p.runId].every(id)
      || (candidate.preview && p.workerId !== candidate.preview.workerId)) fail();
    result.provider = {headSha:p.headSha,workerId:p.workerId,versionId:p.versionId,deploymentId:p.deploymentId,runId:p.runId};
  }
  if(value.live !== undefined) {
    const l = value.live;
    if(!result.provider || !object(l) || l.projectId !== context.projectId || l.headSha !== candidate.headSha
      || typeof l.assetsDigest !== 'string' || !/^[a-f0-9]{64}$/.test(l.assetsDigest)) fail();
    result.live = {projectId:l.projectId,headSha:l.headSha,url:site(l.url),assetsDigest:l.assetsDigest};
  }
  if(value.repository !== undefined) {
    const r = value.repository;
    if(!result.live || !object(r) || r.remote !== context.remote || r.baseSha !== candidate.baseSha || r.headSha !== candidate.headSha) fail();
    result.repository = {remote:r.remote,baseSha:r.baseSha,headSha:r.headSha};
  }
  if(value.status === 'published' && (!result.provider || !result.live || !result.repository)) fail();
  return result;
}
export function checkedDelivery(value, context, request) {
  if(!object(value) || value.ok !== true) fail();
  for(const key of ['projectId','generation','remote','sourceCommit','starterCommit']) if(value[key] !== context[key]) fail();
  const candidate = checkedCandidate(value.candidate,request.selection);
  const result = {ok:true,projectId:context.projectId,generation:context.generation,candidate};
  if(value.publication !== undefined) result.publication = checkedPublication(value.publication,candidate,context,request.publicationId);
  if((['approve','recover'].includes(request.action) || request.publicationId) && !result.publication) fail();
  result.repositoryAckNeeded = Boolean(result.publication?.status === 'deployed-awaiting-confirmation'
    && result.publication.provider && result.publication.live && !result.publication.repository
    && candidate.checks.status === 'passed' && candidate.preview);
  return result;
}
export function gateResult(candidate) {
  const status=candidate?.checks?.status;
  return status === 'passed' ? 'SUCCESS' : status === 'failed' ? 'FAILURE' : status === 'timed-out' ? 'TIMEOUT' : 'UNKNOWN';
}
// The skill supplies this from the final checkout after all archive/spec edits.
export function assertSavedCandidate(selection, local) {
  if(!local || local.dirty !== false || local.branch !== selection.branch || local.headSha !== selection.headSha || local.recordedBranch !== selection.branch) fail();
}
async function verifiedDelivery(command, value, options) {
  const request = checkedRequest(command,value);
  if(['checkpoint','preview','approve'].includes(command)) assertSavedCandidate(request.selection,options.local);
  const fetch = options.fetch ?? globalThis.fetch;
  const context = await verifyHostedAuthority({...options,fetch});
  const {token,...identity} = context;
  const send = async body => {
    const response = await fetch(`${options.origin ?? HOSTED_ORIGIN}/api/hosted/projects/${context.projectId}/delivery`, {
      method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({identity,...body}),
      redirect:'error',signal:AbortSignal.timeout(30_000)
    });
    if(!response.ok) fail();
    return checkedDelivery(await response.json(),identity,body);
  };
  if(command === 'approve') {
    const current = await send({action:'status',selection:request.selection});
    if(gateResult(current.candidate) !== 'SUCCESS' || current.candidate.id !== request.candidateId
      || JSON.stringify(current.candidate.preview) !== JSON.stringify(request.preview)) fail();
  }
  const result = await send(request);
  if(command === 'preview' && !result.candidate.preview) fail();
  if(command === 'approve' && (result.candidate.id !== request.candidateId
    || JSON.stringify(result.candidate.preview) !== JSON.stringify(request.preview))) fail();
  return {...result,gateResult:gateResult(result.candidate)};
}
export async function hostedDelivery(command, value, options) {
  try { return await verifiedDelivery(command,value,options); } catch { fail(); }
}
export function localCandidate(dir, changeRoot) {
  const git = args => execFileSync('git',['-C',dir,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  // Both active and archived proposals are selected by the owning verb.
  const proposal = readFileSync(resolve(dir,changeRoot,'proposal.md'),'utf8');
  return {branch:git(['branch','--show-current']),headSha:git(['rev-parse','HEAD']),
    dirty:git(['status','--porcelain']).length > 0,recordedBranch:proposal.match(/^\*\*Branch:\*\*\s*(.+)$/m)?.[1]?.trim()};
}
if(isMain(import.meta.url)) {
  const usage='usage: hosted-delivery.mjs <checkpoint|gate|preview|approve|publication|continue|recover> --input <json-file> [--repo <path>] [--change-root <path>]';
  const {values,positionals} = parseCli({usage,allowPositionals:true,options:{repo:{type:'string'},input:{type:'string'},'change-root':{type:'string'}}});
  if(positionals.length !== 1 || !Object.hasOwn(actions,positionals[0]) || !values.input) usageError(usage);
  try {
    const command = positionals[0],dir = resolve(values.repo ?? '.');
    const remote = artifactsRemote(execFileSync('git',['-C',dir,'remote','get-url','origin'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim());
    const value = JSON.parse(readFileSync(values.input,'utf8'));
    const request = checkedRequest(command,value);
    const local = ['checkpoint','preview','approve'].includes(command) ? localCandidate(dir,values['change-root'] ?? `openspec/changes/${request.selection.changeName}`) : undefined;
    console.log(JSON.stringify(await hostedDelivery(command,value,{dir,remote,local})));
  } catch {
    console.error('Hosted delivery is unverified. Reconnect or refresh this exact saved change.');
    process.exitCode = 1;
  }
}
