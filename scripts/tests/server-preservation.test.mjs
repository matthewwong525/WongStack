import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
const source=readFileSync(new URL('../../server/preserve.sh',import.meta.url),'utf8');
function fixture(options={}) {
 const root=mkdtempSync(join(tmpdir(),'preserve-'));
 const os=join(root,'os');writeFileSync(os,`ID=${options.os??'ubuntu'}\nVERSION_ID=${options.release??'24.04'}\n`);
 // Fixture replaces the read-only OS source and mutation boundary, never runs apt/install.
 const helpers=`
id() { echo ${options.root===false?1000:0}; }
uname() { echo ${options.arch??'x86_64'}; }
getent() { ${options.newUser?'return 1':"echo 'fixture:x:1001:1001::/home/fixture:/bin/bash'"}; }
stat() { echo ${options.owner??1001}; }
check_path() { :; }
runuser() {
 case "$*" in
   *'command -v'*) ${options.absent?'return 1':'echo /usr/bin/tool'} ;;
   *'node --version'*) echo ${options.node??'v22.19.0'} ;;
   *'openspec --version'*) echo 1.13.2 ;;
   *) echo 1.0.0 ;;
 esac
}
systemctl() {
 case "$*" in
   'cat paseo.service') ${options.service===false?'return 1':'return 0'} ;;
   *'User --value') echo ${options.serviceUser??'fixture'} ;;
   *'Environment --value') echo HOME=/home/fixture ;;
   *'ExecStart --value') echo '/usr/bin/paseo daemon run --home /home/fixture/.paseo' ;;
   *) return 0 ;;
 esac
}
ss() { ${options.service===false?'return 0':"echo 'LISTEN 0 128 127.0.0.1:6767 0.0.0.0:*'"}; }
`;
 let script=source.replace('. /etc/os-release',`. '${os}'`).replace('[ -d "$WORKSPACE_HOME" ] &&','true &&').replace('check_path "$WORKSPACE_HOME"','check_path() { :; }\ncheck_path "$WORKSPACE_HOME"');
 script=script.replaceAll('/etc/systemd/system/paseo.service',join(root,'paseo.service'));
 script=script.replace('fail() {',helpers+'\nfail() {');
 script=script.replace('# Mutation begins here, after the complete preflight.','echo fixture-mutation; exit 0\n# Mutation begins here, after the complete preflight.');
 const path=join(root,'script');writeFileSync(path,script);chmodSync(path,0o700);
 const run=spawnSync('bash',[path,...(options.preflight?['--preflight']:[])],{encoding:'utf8',env:{...process.env,WORKSPACE_USER:options.user??'fixture',WORKSPACE_HOME:options.home??'/home/fixture'}});
 rmSync(root,{recursive:true,force:true});return run;
}
test('preservation manifest and explicit dispatch stay source-only',()=>{
 assert.deepEqual(JSON.parse(readFileSync(new URL('../../server/preservation.json',import.meta.url),'utf8')),{version:1});
 const setup=readFileSync(new URL('../../server/setup.sh',import.meta.url),'utf8');assert.match(setup,/--preserve/);assert.match(setup,/--preflight/);
 assert.doesNotMatch(source,/reboot|dist-upgrade|ufw|iptables|\/etc\/wongstack|\/opt\/wongstack|rm -rf/);
 assert.match(source,/--no-upgrade/);assert.match(source,/env -i/);
});
test('compatible tools, absent tools and both architectures preflight without mutations',()=>{
 for(const options of [{},{absent:true,service:false},{newUser:true,service:false},{arch:'aarch64'}]) {
  const result=fixture({...options,preflight:true});assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/compatible/);assert.doesNotMatch(result.stdout,/fixture-mutation/);
 }
 const build=fixture();assert.equal(build.status,0,build.stderr);assert.match(build.stdout,/fixture-mutation/);
});
test('root, OS, architecture, identity, home and existing service conflicts refuse before mutation',()=>{
 for(const [options,reason] of [[{root:false},'root'],[{os:'debian'},'os'],[{release:'22.04'},'os'],[{arch:'riscv64'},'architecture'],[{user:'root'},'user'],[{user:'a;id'},'user'],[{home:'/wrong'},'home'],[{owner:1002},'home'],[{node:'v18.0.0'},'tool_node'],[{serviceUser:'another'},'service']]) {
  const result=fixture(options);assert.notEqual(result.status,0);assert.match(result.stderr,new RegExp(`preserve: ${reason}`));assert.doesNotMatch(result.stdout,/fixture-mutation/);
 }
});
