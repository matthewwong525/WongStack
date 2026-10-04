import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { checkStarter, emptyBinding } from '../check-hosted-starter.mjs';
import { hostedConfig, pinPackage, prepareStarter, replaceRequired, validateHostedConfig } from '../../server/hosted/starter.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const read=file=>readFileSync(join(root,file),'utf8');
const json=file=>JSON.parse(read(file));
const SHA='a'.repeat(40);
function sourceFiles() {
 const files=[];
 const walk=path=>{for(const item of readdirSync(join(root,path),{withFileTypes:true})){const file=join(path,item.name);if(item.isDirectory()&&!['node_modules','.scratch','coverage','.git'].includes(item.name))walk(file);else if(item.isFile()||item.isSymbolicLink())files.push(file);}};
 for(const path of ['.agents','.github','wiki','app','scripts','schema'])walk(path);
 return [...files,'.nvmrc','.gitignore','paseo.json','AGENTS.md'];
}
test('hosted config is HTTP/static with native Preview vars; resource and auth bypass additions fail closed',()=>{
 const config=hostedConfig();assert.equal(validateHostedConfig(config,config.name),config);
 for(const key of ['d1_databases','r2_buckets','queues','triggers','durable_objects','workflows','containers','env','services','build'])assert.throws(()=>validateHostedConfig({...config,[key]:[]},config.name));
 assert.throws(()=>validateHostedConfig({...config,previews:{...config.previews,services:[]}},config.name));
 assert.throws(()=>validateHostedConfig({...config,vars:{...config.vars,WORKSPACE_LOGIN:'off'}},config.name));
 assert.throws(()=>validateHostedConfig(config,'foreign'));
 for(const section of ['vars','previews']) {
  const invalid=structuredClone(config);const vars=section==='vars'?invalid.vars:invalid.previews.vars;delete vars.CF_ACCESS_AUD;
  assert.throws(()=>validateHostedConfig(invalid,config.name));
 }
 for(const value of [null,42,{}]) {
  assert.throws(()=>hostedConfig({worker:value}));assert.throws(()=>hostedConfig({audience:value}));assert.throws(()=>hostedConfig({teamDomain:value}));
 }
 assert.throws(()=>validateHostedConfig({...config,name:undefined},undefined));
 assert.throws(()=>validateHostedConfig({...config,name:'worker;id'},'worker;id'));
 const missingAudiences=structuredClone(config);delete missingAudiences.vars.CF_ACCESS_AUD;delete missingAudiences.previews.vars.CF_ACCESS_AUD;
 assert.throws(()=>validateHostedConfig(missingAudiences,config.name));
 assert.throws(()=>validateHostedConfig({...config,previews:{vars:{...config.previews.vars,CF_ACCESS_AUD:'foreign'}}},config.name));
 assert.throws(()=>hostedConfig({worker:'x;id'}));assert.throws(()=>hostedConfig({teamDomain:'evil'}));assert.throws(()=>hostedConfig({audience:''}));
 const existing=read('app/wrangler.jsonc');assert.match(existing,/"staging"/);assert.doesNotMatch(existing,/"previews"/);
});
test('exact dependency pins preserve complete app tests and ordinary build without migrations',()=>{
 const original=json('app/package.json');const result=pinPackage(structuredClone(original),json('app/package-lock.json'));
 assert.deepEqual(result.manifest.overrides,original.overrides);assert.equal(result.manifest.scripts.test,original.scripts.test);assert.equal(result.manifest.scripts['build:app'],original.scripts['build:app']);assert.equal(result.manifest.scripts.build,'npm run build:app');
 for(const group of ['dependencies','devDependencies'])for(const [name,version]of Object.entries(result.manifest[group])){assert.match(version,/^\d+\.\d+\.\d+$/);assert.equal(result.lock.packages[''][group][name],version);}
 assert.equal(result.manifest.devDependencies.wrangler,'4.144.0');
 assert.throws(()=>pinPackage(structuredClone(original),{packages:{}}));
});
test('offline starter copies the actual source record and compatible payload, with signed compiled identity coverage',async t=>{
 const scratch=mkdtempSync(join(tmpdir(),'starter-'));t.after(()=>rmSync(scratch,{recursive:true,force:true}));
 const target=join(scratch,'release'),calls=[];
 const exec=async(name,args)=>{calls.push({name,args});if(args.includes('ls-files'))return{stdout:sourceFiles().join('\0')};if(args.includes('rev-parse'))return{stdout:SHA};if(args.includes('get-url'))return{stdout:'https://github.com/reviewed/fork.git'};return{stdout:''};};
 const record=await prepareStarter(target,{exec,today:'2026-10-04'});
 assert.equal(record.commit,SHA);assert.equal(record.upstream.repo,'https://github.com/reviewed/fork');assert.equal(record.components.memory,null);
 for(const name of ['AGENTS.md','.claude','.codex','wiki/README.md','wiki/development/README.md','.agents/skills/wong-sync/scripts/hosted-context.mjs'])assert.ok(existsSync(join(target,name)),name);
 assert.match(readFileSync(join(target,'app/worker/index.ts'),'utf8'),/getAccessIdentity[\s\S]*Unauthorized[\s\S]*Response.json\(hostedIdentity/);
 assert.match(readFileSync(join(target,'app/worker/index.test.ts'),'utf8'),/reports compiled identity only to signed requests/);
 assert.match(readFileSync(join(target,'app/vite.config.ts'),'utf8'),/Hosted build identity is required/);
 assert.equal(JSON.parse(readFileSync(join(target,'.agents/.wong-stack.json'))).components.memory,null);
 assert.equal(JSON.parse(readFileSync(join(target,'.wongstack/hosted.json'))).sourceCommit,SHA);
 assert.ok(!calls.some(call=>['npm','gh','wrangler'].includes(call.name)));
 await assert.rejects(prepareStarter(target,{exec,today:'2026-10-04'}),/path_conflict/);
 await assert.rejects(prepareStarter(join(scratch,'dirty'),{exec:async()=>({stdout:' M app/package.json'}),today:'2026-10-04'}),/source_not_reviewed/);
});
test('generated starter maintenance command refuses local builds',()=>{
 const result=spawnSync(process.execPath,[join(root,'scripts/check-hosted-starter.mjs')],{env:{...process.env,GITHUB_ACTIONS:''},encoding:'utf8'});
 assert.equal(result.status,2);assert.match(result.stderr,/only in Source maintenance CI/);
 assert.match(read('.github/workflows/payload.yml'),/Generated hosted starter checks[\s\S]*node scripts\/check-hosted-starter.mjs/);
});
test('normalized provider defaults contain no resources; configured bindings and schedules stay rejected',()=>{
 for(const value of [undefined,[],{}, {bindings:[]},{producers:[],consumers:[]},{crons:[]}])assert.equal(emptyBinding(value),true);
 for(const value of [[{}],{bindings:[{name:'DB'}]},{producers:[{queue:'customer'}]},{consumers:[{queue:'customer'}]},{crons:['* * * * *']},null,'unexpected'])assert.equal(emptyBinding(value),false);
});

test('maintenance check invokes ordinary app commands with source identity and inspects compiled handoff',async()=>{
 const calls=[];
 const exec=async(name,args,options={})=>{
  calls.push({name,args,options});
  if(args.includes('ls-files'))return{stdout:sourceFiles().join('\0')};
  if(args.includes('rev-parse'))return{stdout:SHA};
  if(args.includes('get-url'))return{stdout:'https://github.com/reviewed/fork.git'};
  if(name==='npm'&&args.join(' ')==='run build') {
   const app=options.cwd,generated=join(app,'dist/worker');
   mkdirSync(generated,{recursive:true});mkdirSync(join(app,'dist/client'),{recursive:true});mkdirSync(join(app,'.wrangler/deploy'),{recursive:true});
   writeFileSync(join(app,'.wrangler/deploy/config.json'),JSON.stringify({configPath:'../../dist/worker/wrangler.json'}));
   writeFileSync(join(generated,'wrangler.json'),JSON.stringify({...hostedConfig(),main:'index.js',assets:{directory:'../client'},durable_objects:{bindings:[]},queues:{producers:[],consumers:[]},triggers:{}}));
   writeFileSync(join(generated,'index.js'),`export const identity = ${JSON.stringify({projectId:options.env.WONG_HOSTED_PROJECT,sourceCommit:options.env.WONG_HOSTED_SHA})};`);
   writeFileSync(join(app,'dist/client/index.html'),'fixture');
  }
  return{stdout:''};
 };
 assert.deepEqual(await checkStarter({exec,env:{}}),{ok:true,sourceCommit:SHA});
 const npm=calls.filter(call=>call.name==='npm');assert.deepEqual(npm.map(call=>call.args),[['ci','--no-audit','--no-fund'],['run','cf-typegen'],['test'],['run','build']]);
 assert.ok(npm.every(call=>call.options.env.WONG_HOSTED_SHA===SHA&&call.options.env.WONG_HOSTED_PROJECT==='maintenance-starter'));
 assert.ok(!existsSync(dirname(npm[0].options.cwd)),'temporary release is removed');
 assert.ok(!calls.some(call=>call.args.includes('deploy')||call.args.includes('preview')));
});

test('required starter transformations reject missing or duplicate source anchors',async t=>{
 const scratch=mkdtempSync(join(tmpdir(),'starter-anchors-'));t.after(()=>rmSync(scratch,{recursive:true,force:true}));
 const sourceWorker=read('app/worker/index.ts');
 const start=sourceWorker.indexOf('    if (!identity && !open) {');
 const end=sourceWorker.indexOf('    // A preview check')+'    // A preview check'.length;
 const anchors=[['app/worker/index.ts',sourceWorker.slice(start,end)],['app/worker/index.test.ts','  it("dispatches APIs only after a verified assertion",'],['app/vitest.config.ts','export default defineConfig({'],['app/vite.config.ts','export default defineConfig({']];
 for(const [index,[file,anchor]]of anchors.entries()) {
  const text=read(file);assert.ok(anchor);assert.equal(replaceRequired(text,anchor,'replacement').includes('replacement'),true);
  for(const duplicate of [false,true]) {
   const exec=async(name,args,options={})=>{
    if(args.includes('ls-files'))return{stdout:sourceFiles().join('\0')};
    if(args.includes('rev-parse'))return{stdout:SHA};
    if(args.includes('get-url'))return{stdout:'https://github.com/reviewed/fork.git'};
    if(name==='openspec') {
     const target=join(options.cwd,file),copied=readFileSync(target,'utf8');
     writeFileSync(target,duplicate?`${copied}\n${anchor}`:copied.replace(anchor,''));
    }
    return{stdout:''};
   };
   await assert.rejects(prepareStarter(join(scratch,`${index}-${duplicate}`),{exec,today:'2026-10-04'}),/starter_anchor/,`${file}: ${duplicate?'duplicate':'missing'}`);
  }
 }
});
