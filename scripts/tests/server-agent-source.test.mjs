import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sourceInstaller, sourceOrigin } from '../../server/agent/source.mjs';
const job={sourceRepo:'matthewwong525/WongStack',sourceCommit:'efc5845ab16b12dc4ceab60e7c500663c2bf6b19'};
function box({origin='git@github.com:Matthewwong525/WongStack.git',head=job.sourceCommit,missing=false}={}) {
 const calls=[];const exec=async args=>{calls.push(args);if(args.includes('get-url'))return{stdout:origin};if(args.includes('rev-parse'))return{stdout:head};if(missing&&args[0]==='test')throw Error('missing');return{stdout:''};};return{calls,exec};
}
test('the host checks actual source origin and HEAD, uses the reviewed commit and reruns without duplicate clone',async()=>{
 const b=box(); const path=await sourceInstaller(job,b.exec);assert.equal(path,`/home/wong/.cache/wong-stack/source-${job.sourceCommit}/server/install-wongstack.mjs`);
 await sourceInstaller(job,b.exec);assert.ok(!b.calls.some(c=>c.includes('clone')));assert.ok(b.calls.some(c=>c.includes(job.sourceCommit)&&c.includes('checkout')));
 assert.equal(sourceOrigin('https://github.com/Matthewwong525/WongStack.git'),'matthewwong525/wongstack');assert.equal(sourceOrigin('https://evil.test/owner/repo'),undefined);
});
test('a missing clone is fetched but mismatched origin, HEAD, or contract stops before provisioning',async()=>{
 const b=box({missing:true});await assert.rejects(sourceInstaller(job,b.exec));assert.ok(b.calls.some(c=>c.includes('clone')));
 for(const opts of [{origin:'https://github.com/other/repo.git'},{head:'b'.repeat(40)}])await assert.rejects(sourceInstaller(job,box(opts).exec));
 await assert.rejects(sourceInstaller({...job,sourceCommit:'HEAD'},box().exec));
 await assert.rejects(sourceInstaller({...job,sourceRepo:'bad/../repo'},box().exec));
});
test('a configured workspace home keeps every source-cache operation outside the legacy home',async()=>{
 const b=box(),home='/srv/workspaces/ada';
 assert.equal(await sourceInstaller(job,b.exec,home),`${home}/.cache/wong-stack/source-${job.sourceCommit}/server/install-wongstack.mjs`);
 assert.ok(b.calls.some(args=>args.includes(`${home}/.cache/wong-stack`)));
 assert.ok(b.calls.filter(args=>args.includes('-C')).every(args=>args[args.indexOf('-C')+1]===`${home}/.cache/wong-stack/source-${job.sourceCommit}`));
 assert.ok(!JSON.stringify(b.calls).includes('/home/wong'));
});

test('real fresh no-checkout clone establishes the reviewed tree; subsequent dirty cache is refused',async()=>{
 const {mkdtempSync,mkdirSync,writeFileSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {spawnSync}=await import('node:child_process');
 const root=mkdtempSync(join(tmpdir(),'source-real-'));const original=join(root,'original');const cache=join(root,'cache');mkdirSync(join(original,'server'),{recursive:true});
 const git=(args)=>{const result=spawnSync('git',args,{encoding:'utf8'});assert.equal(result.status,0,result.stderr);return result.stdout;};
 try{
  writeFileSync(join(original,'server/access-result.mjs'),'export function managementDestination() {}\n');writeFileSync(join(original,'server/install-wongstack.mjs'),'// fixture\n');
  git(['init','-q',original]);git(['-C',original,'add','.']);git(['-C',original,'-c','user.name=Fixture','-c','user.email=fixture@example.com','commit','-qm','fixture']);
  const actual={sourceRepo:'owner/source',sourceCommit:git(['-C',original,'rev-parse','HEAD']).trim()};let freshStatus='';
  const exec=async(args)=>{
   const mapped=args.map(arg=>arg.startsWith('/home/wong/.cache/wong-stack/source-')?arg.replace(`/home/wong/.cache/wong-stack/source-${actual.sourceCommit}`,cache):arg);
   if(args[0]==='mkdir')return{stdout:''};
   if(args.includes('clone')){git(['clone','--no-checkout',original,cache]);freshStatus=git(['-C',cache,'status','--porcelain']);git(['-C',cache,'remote','set-url','origin','https://github.com/owner/source.git']);return{stdout:''};}
   if(args.includes('fetch'))mapped[mapped.indexOf('origin')]=original;
   const result=spawnSync(mapped[0],mapped.slice(1),{encoding:'utf8'});if(result.status!==0)throw Error('fixture command refused');return{stdout:result.stdout};
  };
  await sourceInstaller(actual,exec);assert.match(freshStatus,/D\s+server\//);assert.equal(git(['-C',cache,'status','--porcelain']),'');
  await sourceInstaller(actual,exec);
  writeFileSync(join(cache,'server/install-wongstack.mjs'),'modified cache');await assert.rejects(sourceInstaller(actual,exec));
 }finally{rmSync(root,{recursive:true,force:true});}
});
