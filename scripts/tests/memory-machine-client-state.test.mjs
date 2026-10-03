import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { chmodSync,mkdirSync,readFileSync,symlinkSync,writeFileSync,linkSync,rmSync } from 'node:fs';
import { join } from 'node:path';
import { connect } from 'node:net';
import { createHash } from 'node:crypto';
import { tempDir } from './fixtures/memory/harness.mjs';
const moduleUrl=new URL('../../.agents/skills/memory/scripts/lib/machine-client-state.mjs',import.meta.url).href;
function child(home,body){return spawn(process.execPath,['--input-type=module','-e',`import {withMachineLock,privateWrite,privateRead,privateRemove} from ${JSON.stringify(moduleUrl)};${body}`],{env:{...process.env,HOME:home,USERPROFILE:home},stdio:['ignore','pipe','pipe']});}
const finish=c=>new Promise(resolve=>{let out='',err='';c.stdout.on('data',x=>out+=x);c.stderr.on('data',x=>err+=x);c.once('exit',code=>resolve({code,out,err}));});
const ready=c=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{c.kill();reject(Error('mutex child did not become ready'));},10000);const fail=code=>{clearTimeout(timer);reject(Error('mutex child exited before readiness: '+code));};c.once('exit',fail);c.stdout.once('data',value=>{clearTimeout(timer);c.off('exit',fail);resolve(value);});c.once('error',error=>{clearTimeout(timer);reject(error);});});
test('kernel mutex contends across processes, transports no data, and crash frees ownership',async t=>{
 const home=tempDir(t,'mutex-home-'),dir=join(home,'.local/state/wongstack/memory/test'),one=child(home,`await withMachineLock(${JSON.stringify(dir)},async()=>{console.log('owned');await new Promise(()=>{});});`);t.after(()=>one.kill());await ready(one);
 const two=await finish(child(home,`await withMachineLock(${JSON.stringify(dir)},async()=>console.log('admitted')).catch(e=>{console.log(e.code);process.exitCode=2;});`));assert.equal(two.code,2);assert.equal(two.out.trim(),'machine-state-busy');
 const port=1024+createHash('sha256').update(dir+'\0machine.lock').digest().readUInt32BE(0)%64512;
 const received=await new Promise(resolve=>{const socket=connect({host:'127.0.0.1',port});let data='';socket.on('data',x=>data+=x);socket.on('close',()=>resolve(data));socket.on('error',()=>resolve(data));});assert.equal(received,'');
 const dead=new Promise(resolve=>one.once('exit',resolve));one.kill('SIGKILL');await dead;assert.equal((await finish(child(home,`await withMachineLock(${JSON.stringify(dir)},async()=>console.log('admitted'));`))).out.trim(),'admitted');
});
test('run mutex allows a child machine write while still excluding another run',async t=>{
 const home=tempDir(t,'run-lock-home-'),dir=join(home,'.local/state/wongstack/memory/test'),one=child(home,`await withMachineLock(${JSON.stringify(dir)},async()=>{console.log('owned');await new Promise(()=>{});},'run.lock');`);t.after(()=>one.kill());await ready(one);
 const writer=await finish(child(home,`await withMachineLock(${JSON.stringify(dir)},async()=>privateWrite(${JSON.stringify(join(dir,'seen.json'))},{child:true}));`));assert.equal(writer.code,0,writer.err);assert.equal(JSON.parse(readFileSync(join(dir,'seen.json'))).child,true);
 const other=await finish(child(home,`await withMachineLock(${JSON.stringify(dir)},()=>{},'run.lock').catch(e=>{console.log(e.code);process.exitCode=2;});`));assert.equal(other.code,2);
});
test('state refuses writable parents, symlinks and non-private files without repairing them',async t=>{
 if(process.platform==='win32')return;const home=tempDir(t,'unsafe-state-'),dir=join(home,'.local/state/wongstack/memory/test');mkdirSync(dir,{recursive:true,mode:0o700});chmodSync(join(home,'.local'),0o777);
 assert.notEqual((await finish(child(home,`privateWrite(${JSON.stringify(join(dir,'state.json'))},{x:1});`))).code,0);chmodSync(join(home,'.local'),0o700);symlinkSync(join(home,'foreign'),join(dir,'state.json'));assert.notEqual((await finish(child(home,`privateWrite(${JSON.stringify(join(dir,'state.json'))},{x:1});`))).code,0);
});
test('Windows adapter source preserves fixed command, literal path and closed subprocess result boundary; native ACL evidence remains separate',()=>{
 const source=readFileSync(new URL('../../.agents/skills/memory/scripts/lib/machine-client-state.mjs',import.meta.url),'utf8');assert.match(source,/WONG_PRIVATE_PATH:path/);assert.match(source,/-EncodedCommand/);assert.match(source,/LiteralPath/);assert.match(source,/ReparsePoint/);assert.match(source,/AreAccessRulesProtected/);assert.match(source,/result.status!==0/);assert.match(source,/timeout:5000/);assert.doesNotMatch(source,/spawnSync\([^\n]+(?:token|privateKey|capability)/);
});

test('actual serialized read-modify-write retains concurrent seen entries',async t=>{
 const home=tempDir(t,'seen-home-'),dir=join(home,'.local/state/wongstack/memory/test'),file=join(dir,'seen.json');const writer=key=>child(home,`await withMachineLock(${JSON.stringify(dir)},async()=>{const old=privateRead(${JSON.stringify(file)},{});await new Promise(done=>setTimeout(done,80));privateWrite(${JSON.stringify(file)},{...old,[${JSON.stringify(key)}]:{size:1}});});`);
 const results=await Promise.all([finish(writer('first')),finish(writer('second'))]);for(const result of results)assert.equal(result.code,0,result.err);assert.deepEqual(Object.keys(JSON.parse(readFileSync(file))).sort(),['first','second']);
});

test('valid and broken symlinks, hardlinks and existing public files deny every private operation',async t=>{
 if(process.platform==='win32')return;const home=tempDir(t,'private-files-'),dir=join(home,'.local/state/wongstack/memory/test');mkdirSync(dir,{recursive:true,mode:0o700});const target=join(dir,'state.json'),foreign=join(home,'foreign');writeFileSync(foreign,'{}',{mode:0o600});
 for(const kind of ['broken','valid','hardlink','public']){if(kind==='broken')symlinkSync(join(home,'missing'),target);if(kind==='valid')symlinkSync(foreign,target);if(kind==='hardlink')linkSync(foreign,target);if(kind==='public')writeFileSync(target,'{}',{mode:0o644});
 for(const operation of [`privateRead(${JSON.stringify(target)})`,`privateWrite(${JSON.stringify(target)},{x:1})`,`privateRemove(${JSON.stringify(target)})`])assert.notEqual((await finish(child(home,operation))).code,0,kind+' '+operation);rmSync(target);}
});
test('actual concurrent registry registrations retain both sessions',async t=>{
 const home=tempDir(t,'registry-rmw-'),dir=join(home,'.local/state/wongstack/memory/test'),url=new URL('../../.agents/skills/memory/scripts/lib/transcripts.mjs',import.meta.url).href;
 const writer=id=>child(home,`import {registerSession} from ${JSON.stringify(url)};await registerSession({stateDir:${JSON.stringify(dir)}},{id:${JSON.stringify(id)},agent:'claude',cwd:${JSON.stringify(home)}});`);
 const results=await Promise.all([finish(writer('claude:first')),finish(writer('claude:second'))]);for(const result of results)assert.equal(result.code,0,result.err);assert.deepEqual(JSON.parse(readFileSync(join(dir,'registry.jsonl'))).map(x=>x.id).sort(),['claude:first','claude:second']);
});

test('a writable HOME is refused before trusting private descendants and is not repaired',async t=>{
 if(process.platform==='win32')return;const home=tempDir(t,'unsafe-home-'),dir=join(home,'.local/state/wongstack/memory/test');mkdirSync(dir,{recursive:true,mode:0o700});chmodSync(home,0o777);const result=await finish(child(home,`privateWrite(${JSON.stringify(join(dir,'state.json'))},{x:1});`));assert.notEqual(result.code,0);assert.match(result.err,/private-machine-state-denied/);
});
