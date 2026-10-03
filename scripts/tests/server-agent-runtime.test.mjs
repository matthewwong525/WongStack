import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
const source=readFileSync(new URL('../../server/agent-runtime.sh',import.meta.url),'utf8');
function fixture(options={}) {
 const root=mkdtempSync(join(tmpdir(),'agent-runtime-')),target=join(root,'runtime/bin/node'),candidate=join(root,'system-node');
 const binary=(path,version='v22.19.0')=>{mkdirSync(dirname(path),{recursive:true});writeFileSync(path,`#!/bin/sh\necho ${version}\n`);chmodSync(path,0o755);};
 if(options.existing)binary(target,options.version??'v22.19.0');
 if(options.candidate)binary(candidate,options.candidateVersion??'v22.19.0');
 if(options.symlink){mkdirSync(dirname(target),{recursive:true});symlinkSync(candidate,target);}
 if(options.directory){mkdirSync(target,{recursive:true});}
 const functions=`
id() { echo ${options.nonroot?1001:0}; }
stat() {
 case "$2" in
  %u) if [[ "$3" = *download.*\/bin\/node ]] && [ -f "${'$'}{3%/bin/node}/archive-owner" ]; then cat "${'$'}{3%/bin/node}/archive-owner"; else echo ${options.foreign?1001:0}; fi ;;
  %a) echo ${options.writable?'777':'755'} ;;
  %h) echo ${options.hardlink?2:1} ;;
 esac
}
od() { echo ${options.notElf?'23212f62':'7f 45 4c 46'}; }
install() {
 if [ "$1" = -d ]; then mkdir -p "$4"; return; fi
 cp "$7" "$8"; chmod 0755 "$8"
}
curl() {
 if [ '${options.download?'yes':'no'}' != yes ]; then echo 'unexpected network' >&2; return 1; fi
 if [[ "$2" = *SHASUMS256.txt ]]; then echo '${'a'.repeat(64)}  node-v22.19.0-linux-x64.tar.xz' >"$4"; else echo fixture-archive >"$4"; fi
}
sha256sum() { ${options.badChecksum?'return 1':"echo checksum-checked; return 0"}; }
tar() { mkdir -p "$5/bin"; if [[ "$*" = *--no-same-owner* ]] && [ '${options.restoreArchiveOwner?'yes':'no'}' != yes ]; then echo 0 >"$5/archive-owner"; else echo 1000 >"$5/archive-owner"; fi; printf '#!/bin/sh\\necho v22.19.0\\n' >"$5/bin/node"; chmod 0755 "$5/bin/node"; }

`;
 let script=source.replace('runtime=/usr/local/lib/wongstack-agent-runtime/bin/node',`runtime='${target}'`).replace('fail() {',functions+'\nfail() {');
 script=script.replace('scratch="$(mktemp -d /usr/local/lib/.wongstack-agent-runtime.XXXXXX)"',`scratch="$(mktemp -d '${root}/download.XXXXXX')"`);
 script=script.replace('for candidate in /usr/bin/node /usr/local/bin/node;',`for candidate in '${candidate}';`).replace('install -d -m 0755 /usr/local/lib/wongstack-agent-runtime/bin',`install -d -m 0755 '${dirname(target)}'`);
 const path=join(root,'helper');writeFileSync(path,script);
 const run=mode=>spawnSync('bash',[path,mode],{encoding:'utf8'});
 return {root,target,run,close:()=>rmSync(root,{recursive:true,force:true})};
}
test('trusted runtime interface has a fixed root path, clean system PATH, no workspace discovery and installs in both setup modes',()=>{
 assert.match(source,/runtime=\/usr\/local\/lib\/wongstack-agent-runtime\/bin\/node/);
 assert.doesNotMatch(source,/WORKSPACE_HOME|WORKSPACE_USER|command -v node/);assert.match(source,/env -i PATH=\/usr\/bin:\/bin/);
 for(const file of ['setup.sh','preserve.sh'])assert.match(readFileSync(new URL(`../../server/${file}`,import.meta.url),'utf8'),/agent-runtime\.sh" --ensure/);
 assert.match(readFileSync(new URL('../../server/preserve.sh',import.meta.url),'utf8'),/agent-runtime\.sh" --preflight/);
});
test('missing safe runtime preflight writes nothing, existing compatible runtime is reused',()=>{
 for(const options of [{},{existing:true},{existing:true,version:'v24.0.0'}]) {
  const b=fixture(options);try{const result=b.run('--preflight');assert.equal(result.status,0,result.stderr);assert.equal(existsSync(b.target),!!options.existing);const path=b.run('--path');assert.equal(path.stdout.trim(),b.target);}finally{b.close();}
 }
});
test('root authorization, owned nonwritable ancestors, regular binary, version, no links and ELF are required before mutation',()=>{
 for(const options of [{nonroot:true},{foreign:true},{writable:true},{symlink:true},{existing:true,hardlink:true},{existing:true,version:'v18.0.0'},{existing:true,notElf:true},{directory:true}]) {
  const b=fixture(options);try{const result=b.run('--preflight');assert.notEqual(result.status,0,JSON.stringify(options));assert.match(result.stderr,/agent-runtime: (root|path|node)/);}finally{b.close();}
 }
});
test('ensure copies only a verified system runtime once and preserves that binary on retry',()=>{
 const b=fixture({candidate:true});try {
  const result=b.run('--ensure');assert.equal(result.status,0,result.stderr);assert.ok(existsSync(b.target));const initial=readFileSync(b.target,'utf8');
  assert.equal(b.run('--ensure').status,0);assert.equal(readFileSync(b.target,'utf8'),initial);
 }finally{b.close();}
});


test('missing or incompatible system Node downloads a checksum-verified runtime in guarded private staging; failed checksum installs nothing',()=>{
 assert.match(source,/mktemp -d \/usr\/local\/lib\/.wongstack-agent-runtime/);
 for(const options of [{download:true},{download:true,candidate:true,candidateVersion:'v18.0.0'},{download:true,badChecksum:true},{download:true,restoreArchiveOwner:true}]) {
  const b=fixture(options);try {
   const result=b.run('--ensure');assert.equal(result.status,options.badChecksum||options.restoreArchiveOwner?1:0,result.stderr);
   assert.equal(existsSync(b.target),!options.badChecksum&&!options.restoreArchiveOwner);
   if(!options.badChecksum&&!options.restoreArchiveOwner){assert.match(result.stdout,/checksum-checked/);assert.equal(b.run('--preflight').status,0);}
  }finally{b.close();}
 }
});
