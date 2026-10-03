// Finite machine API with private OS-user state and pinned production routing.
import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, openSync, readFileSync, readSync, readdirSync } from 'node:fs';
import { hostname } from 'node:os';
import { dirname, join } from 'node:path';
import { machineStateDirectory, privateDirectory, privateRead, privateWrite, privateRemove, readMachineState, writeMachineState, withMachineLock, pendingIds, setPending } from './machine-client-state.mjs';
import { boundMachine, refreshMachine, machineCall, clientHash, signClient, runtimeSnapshot, clientRuntimeRequestHash, exactRuntimeReceipt } from './machine-client.mjs';
import { enqueueCapture, flushCapture } from './machine-client-queue.mjs';
import { transcriptKey } from '../../worker/machine-core-transcripts.mjs';
import { randomUUID } from 'node:crypto';
import {findCredential,redact,secretValues} from './scan.mjs';
import { primaryRoot } from './primary-root.mjs';

export { isMain } from './cli.mjs';

export const SCRIPT = 'node .claude/skills/memory/scripts/memory.mjs';
const SPOOLABLE = new Set(['unconfigured', 'network', 'server']);
// kind: unconfigured | auth | network | server | query. `reason` is the short form for one-line reports.
export class StoreError extends Error {
  constructor(reason, { kind = 'query', help } = {}) {
    super(help ? `${reason}. See ${help}.` : reason);
    this.kind = kind;
    this.reason = reason;
  }
  get spoolable() { return SPOOLABLE.has(this.kind); }
  // A memory key past its expiry: `memory.mjs join` renews it.
  get expired() { return false; }
}

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const tryGit = (cwd, ...args) => { try { return git(cwd, ...args); } catch { return ''; } };

// primaryRoot is null when Git cannot confirm the primary worktree: reads fall back to this checkout, and a write stops.
export function repoContext(cwd = process.cwd()) {
  const [root, commonDir] = git(cwd, 'rev-parse', '--show-toplevel', '--path-format=absolute', '--git-common-dir').split('\n');
  let author, primary = null;
  try { primary = primaryRoot(cwd).primary; } catch { /* reported by the write that needs it */ }
  return {
    root,
    commonDir,
    primaryRoot: primary,
    branch: tryGit(cwd, 'rev-parse', '--abbrev-ref', 'HEAD'),
    get author() { author ??= tryGit(cwd, 'config', 'user.email'); return author; },
    machine: hostname(),
    get stateDir() {
      const memory=readJson(configFile({root:primary||root}),null)?.components?.memory;
      return machineStateDirectory(memory?.installation||{installationId:'pending',repositoryId:root,accountId:'',databaseId:'',memoryOrigin:''});
    },
  };
}

// Every checkout of this clone: the primary one plus each linked worktree that still exists.
export function checkouts(ctx) {
  const dir = join(ctx.commonDir, 'worktrees');
  const linked = existsSync(dir) ? readdirSync(dir).map(name => {
    try { return dirname(readFileSync(join(dir, name, 'gitdir'), 'utf8').trim()); } catch { return null; }
  }) : [];
  return [ctx.primaryRoot, ...linked].filter(path => path && existsSync(path));
}

// The reference .env parser: quotes, `export`, comments, and CRLF. verify-staging.sh reads values through it.
// A quoted value keeps everything inside its quotes; a comment is cut only after it or from an unquoted value.
export function parseEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (!match) continue;
    const value = match[2].trim();
    const quoted = value.match(/^(['"])(.*)\1(?:\s+#.*)?$/);
    env[match[1]] = quoted ? quoted[2] : value.replace(/\s+#.*$/, '');
  }
  return env;
}

// The primary worktree's .env wins; a linked worktree's own copy fills gaps (secrets convention).
export function loadEnv(ctx) {
  const env = {};
  for (const file of [join(ctx.root, '.env'), ctx.primaryRoot && join(ctx.primaryRoot, '.env')]) {
    if (!file) continue;
    if (existsSync(file)) Object.assign(env, parseEnv(readFileSync(file, 'utf8')));
  }
  return env;
}

// Exact private credentials join env values only inside hygiene checks; never
// return these values through a public command, URL or error message.
function credentialEnv(ctx) {
 const state=readMachineState(ctx);
 return {...loadEnv(ctx),MEMORY_PRIVATE_D:state?.privateKey?.d,MEMORY_BEARER:state?.credential?.token,MEMORY_CANDIDATE:state?.candidate?.token,MEMORY_CAPABILITY:state?.candidate?.input?.capability};
}

export function credentialHygiene(ctx) {
 return {check:text=>findCredential(text,secretValues(credentialEnv(ctx))),redact:text=>redact(text,secretValues(credentialEnv(ctx)))};
}

export const configFile = ctx => join(ctx.root, '.claude', '.wong-stack.json');

export function loadConfig(ctx) {
 const memory=readJson(configFile({root:ctx.primaryRoot||ctx.root}),null)?.components?.memory;
 if(!memory?.installation)throw new StoreError('memory awaits trusted machine setup',{kind:'unconfigured'});
 const installation=memory.installation;
 return {installation,accountId:installation.accountId,databaseId:installation.databaseId,bucket:installation.bucketName,worker:installation.memoryOrigin,branchWorker:null,team:true,role:null};
}

export function openStore(ctx,{timeoutMs=15000,admin=false,deadline}={}) {
 if(admin)throw new StoreError('direct memory SQL and provider-token access are retired; use the reviewed trusted setup or migration process',{kind:'forbidden'});
 const config=loadConfig(ctx);let state;
 const callOptions=()=>({timeoutMs,deadline});
 const ready=async()=>{try{
  state=boundMachine(ctx,config.installation);
  // A current credential can read directly: the Worker freshly checks authority.
  // Status is needed for expiry and precommitted candidates, never as a read cache.
  if(state.candidate||!state.credential||state.credential.expiresAt<=Math.floor(Date.now()/1000)+5)state=await refreshMachine(ctx,config.installation,callOptions());
  return state;
 }catch(error){throw new StoreError(error.code||error.message,{kind:error.kind||'auth'});}};
 const operation=async(name,params={})=>{
  const current=await ready();try{const data=await machineCall(current,'query',{operation:name,params},callOptions());return data.result;}
  catch(error){throw new StoreError(error.code||error.message,{kind:error.kind||'query'});}
 };
 const capture=async(notes,options={})=>{
  await ready();try{let selected=0;for(const id of pendingIds(ctx,'capture')){const old=privateRead(join(ctx.stateDir,'queues',id+'.json'));if(old&&!old.quarantined&&!old.completed){if(selected++>=5)break;await flushCapture(ctx,config.installation,id,callOptions());}}const queue=await enqueueCapture(ctx,config.installation,notes,options);return await flushCapture(ctx,config.installation,queue.id,callOptions());}
  catch(error){const result=new StoreError(error.code||error.message,{kind:error.kind||'query'});result.machineQueueId=error.machineQueueId;throw result;}
 };
 const putTranscript=async(sessionId,body)=>{
  await refreshMachine(ctx,config.installation,callOptions());
  return withMachineLock(ctx.stateDir,async()=>{
   let current=boundMachine(ctx,config.installation);const bytes=Buffer.from(body),sessionHash=await clientHash(sessionId),contentHash=await clientHash(bytes),generation=current.credential.generation,key=transcriptKey(config.installation,current.machineId,sessionHash,contentHash,generation);
   let objectHash=await clientHash(key),path=join(ctx.stateDir,'raw-queues',objectHash+'.json');const headPath=join(ctx.stateDir,'raw-heads',sessionHash+'-'+contentHash+'.json'),head=privateRead(headPath);
   let journal=privateRead(path);
   if(head){if(head.machineId!==current.machineId||head.grantId!==current.grantId||head.sessionHash!==sessionHash||head.contentHash!==contentHash||!/^[0-9a-f]{64}$/.test(head.objectHash))throw new StoreError('transcript head target changed',{kind:'auth'});path=join(ctx.stateDir,'raw-queues',head.objectHash+'.json');journal=privateRead(path);if(!journal)throw new StoreError('transcript head is incomplete',{kind:'auth'});}
   const recover=async(action)=>{
    const candidate=journal[action];if(!candidate||candidate.receipt)return;
    const p=candidate.input.payload,intent={action,objectHash:p.objectHash,sessionHash:p.sessionHash,contentHash:p.contentHash,credentialGeneration:p.credentialGeneration,visibility:p.visibility,stageAttemptId:p.stageAttemptId||null};
    const proof=await signClient(current,'self-status',{attemptId:randomUUID(),expected:runtimeSnapshot(current.snapshot),payload:{machineId:current.machineId,grantId:current.grantId,machineCommitment:current.commitment}});
    const status=await machineCall(current,'self-status',proof,{...callOptions(),headers:{'Wong-Memory-Attempt':candidate.input.attemptId,'Wong-Memory-Candidate':p.objectHash,'Wong-Memory-Request':candidate.requestHash,'Wong-Memory-Intent':JSON.stringify(intent)}});
    current={...current,snapshot:status.result.snapshot,dataSnapshot:status.dataSnapshot};
    if(status.candidate?.completed){if(status.candidate.action!==action||status.candidate.attemptId!==candidate.input.attemptId||status.candidate.requestHash!==candidate.requestHash||JSON.stringify(status.intent)!==JSON.stringify(intent))throw new StoreError('transcript receipt is unconfirmed',{kind:'auth'});candidate.receipt=status.candidate;}
    else if(status.candidate?.absent===true&&status.candidate.attemptId===candidate.input.attemptId&&status.candidate.candidateHash===p.objectHash)journal[action]=null;
    else throw new StoreError('transcript candidate is unconfirmed',{kind:'auth'});
    privateWrite(path,journal);writeMachineState(ctx,current);
   };
   if(journal){
    if(journal.machineId!==current.machineId||journal.grantId!==current.grantId||JSON.stringify(journal.installation)!==JSON.stringify(config.installation)||journal.sessionHash!==sessionHash||journal.contentHash!==contentHash||journal.quarantined)throw new StoreError('transcript queue target changed',{kind:'auth'});
    if(journal.completed)return journal.objectHash;setPending(ctx,'raw',journal.objectHash,true);
    await recover('stage');await recover('publish');
    if(journal.publish?.receipt){journal.completed=true;delete journal.body;privateWrite(path,journal);setPending(ctx,'raw',journal.objectHash,false);return journal.objectHash;}
    if(journal.generation!==generation){journal.quarantined=true;journal.reason='generation-changed-owned-stage-or-absence-confirmed';journal.orphaned=Boolean(journal.stage?.receipt);privateWrite(path,journal);setPending(ctx,'raw',journal.objectHash,false);journal=null;path=join(ctx.stateDir,'raw-queues',objectHash+'.json');}
    else objectHash=journal.objectHash;
   }
   if(!journal){journal={installation:config.installation,machineId:current.machineId,grantId:current.grantId,sessionId,sessionHash,contentHash,generation,objectHash,body:bytes.toString('base64'),stage:null,publish:null,completed:false};setPending(ctx,'raw',objectHash,true);privateWrite(headPath,{machineId:current.machineId,grantId:current.grantId,sessionHash,contentHash,generation,objectHash});privateWrite(path,journal);}
   const base={grantId:current.grantId,machineId:current.machineId,machineCommitment:current.commitment,scope:current.scope,machineRevision:current.machineRevision,grantRevision:current.grantRevision,credentialGeneration:generation,objectHash,sessionHash,contentHash,visibility:'private'};
   const event=async action=>{
    let candidate=journal[action];
    await recover(action);candidate=journal[action];
    if(candidate?.receipt)return candidate;
    const input=await signClient(current,action,{attemptId:randomUUID(),expected:runtimeSnapshot(current.snapshot),payload:{...base,...(action==='publish'?{stageAttemptId:journal.stage.input.attemptId}:{})}});
    candidate={input,requestHash:await clientRuntimeRequestHash(current,action,input),receipt:null};journal[action]=candidate;privateWrite(path,journal);
    const result=(await machineCall(current,action,input,{...callOptions(),headers:{'Wong-Memory-Session':sessionId}})).result;exactRuntimeReceipt(result,action,candidate);candidate.receipt=result.operation;current={...current,snapshot:result.snapshot};privateWrite(path,journal);writeMachineState(ctx,current);return candidate;
   };
   await event('stage');await machineCall(current,'upload',null,{method:'PUT',body:bytes,headers:{'Wong-Memory-Object':objectHash},...callOptions()});await event('publish');journal.completed=true;delete journal.body;privateWrite(path,journal);setPending(ctx,'raw',objectHash,false);writeMachineState(ctx,current);return objectHash;
  }).catch(error=>{if(error instanceof StoreError)throw error;throw new StoreError(error.code||'transcript-queue-pending',{kind:error.kind||'auth'});});
 };
 const drain=async()=>{await ready();for(const kind of ['capture','raw']){let done=0;for(const id of pendingIds(ctx,kind)){const queued=privateRead(join(ctx.stateDir,kind==='capture'?'queues':'raw-queues',id+'.json'));if(!queued||queued.completed||queued.quarantined)continue;if(done++>=5)break;if(kind==='capture')await flushCapture(ctx,config.installation,id,callOptions());else await putTranscript(queued.sessionId,Buffer.from(queued.body,'base64'));}}};
 const getTranscript=async objectHash=>{const current=await ready();return machineCall(current,'transcript',null,{method:'GET',raw:true,headers:{'Wong-Memory-Object':objectHash,'Wong-Memory-Grant':current.grantId},...callOptions()});};
 const saved=boundMachine(ctx,config.installation);
 return {config,get env(){return loadEnv(ctx);},credentialProblem:text=>credentialHygiene(ctx).check(text),redact:text=>credentialHygiene(ctx).redact(text),author:saved.machineId,email:null,machineId:saved.machineId,get role(){return (state||saved).scope.endsWith('memory:admin')?'admin':(state||saved).scope==='memory:read'?'reader':'member';},ready,operation,capture,drain,putTranscript,getTranscript,
  query:async()=>{throw new StoreError('arbitrary SQL is retired; use facts, sessions, tags, stats or search',{kind:'forbidden'});},
  batch:async()=>{throw new StoreError('arbitrary SQL batches are retired; use finite memory operations',{kind:'forbidden'});}};
}

// ---------- local state, shared by every worktree of one clone ----------

// The background run's tally of what it stored, in the state folder while run.mjs holds its lock.
export const RUN_TALLY = 'run-tally.json';

export function statePath(ctx, ...parts) {
  const path = join(ctx.stateDir, ...parts);
  privateDirectory(dirname(path));
  return path;
}

export const readJson = (path,fallback) => { if(path.replaceAll('\\','/').includes('/wongstack/memory/'))return privateRead(path,fallback);try{return JSON.parse(readFileSync(path,'utf8'));}catch{return fallback;} };
// Write a temp file, then rename it: a concurrent reader sees the old file or the new one, never a torn one.
export const writeJson = privateWrite;

// The first `bytes` of a file, without reading the rest.
export function readHead(file, bytes) {
  const buffer = Buffer.alloc(bytes);
  const fd = openSync(file, 'r');
  try { return buffer.subarray(0, readSync(fd, buffer, 0, bytes, 0)).toString('utf8'); } finally { closeSync(fd); }
}

export const spoolWrite = (ctx,payload) => {
 const config=loadConfig(ctx),state=boundMachine(ctx,config.installation),file=statePath(ctx,'spool',`${randomUUID()}.json`);
 privateWrite(file,{installation:config.installation,machineId:state.machineId,grantId:state.grantId,payload});return file;
};
export function spoolList(ctx) {
 const dir=join(ctx.stateDir,'spool');if(!existsSync(dir))return [];privateDirectory(dir);return readdirSync(dir).filter(name=>/^[a-f0-9-]+\.json$/.test(name)).sort().map(name=>join(dir,name));
}
export const spoolRemove = privateRemove;

export function pendingQueues(ctx) {
 try{boundMachine(ctx,loadConfig(ctx).installation);return pendingIds(ctx,'capture').length+pendingIds(ctx,'raw').length;}catch{return 0;}
}
