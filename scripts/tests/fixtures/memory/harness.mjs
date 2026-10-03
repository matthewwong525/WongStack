// Actual full13/schema14 HTTPS-origin core behind an explicit TEST ONLY transport.
import { execFile,execFileSync } from 'node:child_process';
import { mkdirSync,mkdtempSync,rmSync,writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { coreFixture,MACHINE,GRANT,TOKEN } from './core.mjs';
import { handleMemory } from '../../../../.agents/skills/memory/worker/memory-worker.mjs';
const REPO=resolve(fileURLToPath(new URL('../../../..',import.meta.url))),SCRIPTS=join(REPO,'.agents/skills/memory/scripts');
// NODE_OPTIONS reaches detached startup/run/drain descendants as well as this child.
const transportOptions=options=>`${options||''} --import ${JSON.stringify(join(REPO,'scripts/tests/fixtures/memory/transport.mjs'))}`;
export const SECRET='super-secret-value-123';
export function tempDir(t,prefix){const dir=mkdtempSync(join(tmpdir(),'wong-test-'+prefix));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;}
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
export function writeJsonFile(dir,name,value){const file=join(dir,name);writeFileSync(file,JSON.stringify(value));return file;}
export async function setup(t,{bucket=true,scope}={}) {
 const f=await coreFixture(t,{bucket,scope}),root=tempDir(t,'memory-repo-'),home=tempDir(t,'memory-home-');
 git(root,'init','-q','-b','main');git(root,'config','user.email','dev@example.com');git(root,'config','user.name','Dev');
 mkdirSync(join(root,'.claude'),{recursive:true});writeFileSync(join(root,'.claude','.wong-stack.json'),JSON.stringify({components:{memory:{installation:f.installation}}}));
 writeFileSync(join(root,'.env'),`CLOUDFLARE_MEMORY_TOKEN=retired-no-authority\nSERVICE_TOKEN=${SECRET}\n`);writeFileSync(join(root,'README.md'),'fixture\n');git(root,'add','README.md');git(root,'commit','-q','-m','fixture');
 const stateKey=createHash('sha256').update(JSON.stringify([f.installation.installationId,f.installation.repositoryId,f.installation.accountId,f.installation.databaseId,f.installation.memoryOrigin])).digest('hex');
 const stateDir=join(home,'.local','state','wongstack','memory',stateKey);mkdirSync(stateDir,{recursive:true,mode:0o700});
 const state={installation:f.installation,machineId:MACHINE,grantId:GRANT,privateKey:await crypto.subtle.exportKey('jwk',f.signing.privateKey),publicKey:f.signing.publicKey,commitment:f.signing.commitment,
  scope:f.scope,machineRevision:1,grantRevision:2,credential:{token:TOKEN,hash:f.enroll.payload.credentialHash,generation:1,expiresAt:f.enroll.payload.credentialExpiresAt},snapshot:await f.runtimeExpected(),dataSnapshot:await f.expected(),quarantined:false};
 writeFileSync(join(stateDir,'machine.json'),JSON.stringify(state),{mode:0o600});
 let offline=false,dropAfter=null,delay=0,reply=null;const calls=[],unexpected=[];
 const server=createServer(async(req,res)=>{
  try {
   // Consume the body before an artificial delay so a timeout does not leave an
   // unobserved aborted IncomingMessage rejection in the fixture callback.
   const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);
   if(delay)await new Promise(done=>setTimeout(done,delay));if(req.aborted||res.destroyed)return;if(offline==='hang')return;if(offline){res.socket.destroy();return;}
   calls.push(`${req.method} ${req.url}`);
   let response=await handleMemory(new Request(f.installation.memoryOrigin+req.url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body})}),f.env);
   if(reply&&response.headers.get('Content-Type')?.includes('json'))response=Response.json(reply(await response.json(),req.url),{status:response.status});
   if(dropAfter&&req.url.endsWith('/'+dropAfter)){dropAfter=null;res.socket.destroy();return;}
   res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  } catch(error) {
   if(req.aborted&&(error.code==='ECONNRESET'||error.message==='aborted'))return;
   unexpected.push(error);res.destroy();
  }
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));t.after(async()=>{await new Promise(done=>{server.closeAllConnections();server.close(done);});if(unexpected.length)throw new AggregateError(unexpected,'unexpected actual-core fixture HTTP error');});
 const repo={root,home,claudeHome:join(home,'claude'),codexHome:join(home,'codex'),stateDir};
 const fake={...f,api:`http://127.0.0.1:${server.address().port}`,calls,setOffline:value=>{offline=value;},dropNext:value=>{dropAfter=value;},setDelay:value=>{delay=value;},setReply:value=>{reply=value;},close:()=>{}};return {repo,fake};
}
export function node(repo,fake,script,args=[],{input,env={}}={}) {
 const childEnv={...process.env,HOME:repo.home,USERPROFILE:repo.home,WONG_TEST_MEMORY_TRANSPORT:fake.api,NODE_NO_WARNINGS:'1',WONG_TIDY:'0',WONG_MEMORY_CLAUDE_HOME:repo.claudeHome,WONG_MEMORY_CODEX_HOME:repo.codexHome,...env,NODE_OPTIONS:transportOptions(env.NODE_OPTIONS??process.env.NODE_OPTIONS)};
 return new Promise(done=>{const child=execFile(process.execPath,['--import',join(REPO,'scripts/tests/fixtures/memory/transport.mjs'),join(SCRIPTS,script),...args],{cwd:repo.root,env:childEnv,encoding:'utf8'},(error,stdout,stderr)=>done({code:error?error.code??1:0,stdout,stderr}));child.stdin.end(input);});
}
export const memory=(repo,fake,args,options)=>node(repo,fake,'memory.mjs',args,options);
export const rows=(env,sql,...params)=>env.fake.db.prepare(sql).all(...params).map(row=>({...row}));

export function register(repo,entry){
 const url=new URL('../../../../.agents/skills/memory/scripts/lib/transcripts.mjs',import.meta.url).href;
 execFileSync(process.execPath,['--input-type=module','-e',`import {registerSession} from ${JSON.stringify(url)};await registerSession({stateDir:${JSON.stringify(repo.stateDir)}},${JSON.stringify(entry)});`],{env:{...process.env,HOME:repo.home,USERPROFILE:repo.home},stdio:'pipe'});
}

// Test-only child module entry preserves the same private HOME and HTTPS fixture transport.
export function clientScript(repo,fake,body){
 return new Promise(done=>execFile(process.execPath,['--import',join(REPO,'scripts/tests/fixtures/memory/transport.mjs'),'--input-type=module','-e',body],{cwd:repo.root,env:{...process.env,HOME:repo.home,USERPROFILE:repo.home,WONG_TEST_MEMORY_TRANSPORT:fake.api,NODE_NO_WARNINGS:'1',NODE_OPTIONS:transportOptions(process.env.NODE_OPTIONS)},timeout:15000,encoding:'utf8'},(error,stdout,stderr)=>done({code:error?error.code??1:0,stdout,stderr})));
}
