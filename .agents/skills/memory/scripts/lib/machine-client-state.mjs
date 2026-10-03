// Private OS-user state. Routing pins locate a namespace; possession grants access.
import { constants, closeSync, existsSync, fsyncSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { createHash, randomUUID } from 'node:crypto';
const denied=()=>{throw Object.assign(new Error('private-machine-state-denied'),{code:'private-machine-state-denied'});};
const present=path=>{try{lstatSync(path);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}};
const uid=()=>process.getuid?.();
const windowsAclScript=`$ErrorActionPreference='Stop';$path=$env:WONG_PRIVATE_PATH;$item=Get-Item -LiteralPath $path -Force;if(($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint)-ne 0){exit 2};$sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User;$acl=Get-Acl -LiteralPath $path;if($acl.GetOwner([System.Security.Principal.SecurityIdentifier]).Value-ne $sid.Value){exit 3};if($env:WONG_PRIVATE_CREATE-eq '1'){$acl.SetAccessRuleProtection($true,$false);foreach($rule in @($acl.Access)){$acl.RemoveAccessRuleSpecific($rule)};if($item.PSIsContainer){$rule=New-Object System.Security.AccessControl.FileSystemAccessRule($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow')}else{$rule=New-Object System.Security.AccessControl.FileSystemAccessRule($sid,'FullControl','Allow')};$acl.AddAccessRule($rule);Set-Acl -LiteralPath $path -AclObject $acl;$acl=Get-Acl -LiteralPath $path};if($env:WONG_PRIVATE_PARENT-ne '1'-and -not $acl.AreAccessRulesProtected){exit 4};foreach($rule in $acl.Access){$id=$rule.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value;if($rule.AccessControlType-eq 'Allow'-and $id-ne $sid.Value-and $id-ne 'S-1-5-18'-and $id-ne 'S-1-5-32-544'){if($env:WONG_PRIVATE_PARENT-ne '1'){exit 5};$write=[System.Security.AccessControl.FileSystemRights]::Write -bor [System.Security.AccessControl.FileSystemRights]::Delete -bor [System.Security.AccessControl.FileSystemRights]::ChangePermissions -bor [System.Security.AccessControl.FileSystemRights]::TakeOwnership -bor [System.Security.AccessControl.FileSystemRights]::DeleteSubdirectoriesAndFiles;if(($rule.FileSystemRights -band $write)-ne 0){exit 5}}};exit 0`;
function windowsAcl(path,create=false,parent=false) {
 const result=spawnSync('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(windowsAclScript,'utf16le').toString('base64')],{env:{SystemRoot:process.env.SystemRoot,WINDIR:process.env.WINDIR,PATH:process.env.PATH,TEMP:process.env.TEMP,WONG_PRIVATE_PATH:path,WONG_PRIVATE_CREATE:create?'1':'0',WONG_PRIVATE_PARENT:parent?'1':'0'},stdio:'ignore',timeout:5000});
 if(result.status!==0)denied();
}
function owned(info,directory,path=null) {
 if(info.isSymbolicLink()||(directory?!info.isDirectory():!info.isFile())||(!directory&&info.nlink!==1))denied();
 if(process.platform==='win32'){if(!path)denied();windowsAcl(path);return;}
 if(info.uid!==uid()||(info.mode&0o777)!==(directory?0o700:0o600))denied();
}
export function privateDirectory(path) {
 const home=resolve(homedir()),absolute=resolve(path);if(absolute===home||!absolute.startsWith(home+sep))denied();
 const base=lstatSync(home);if(base.isSymbolicLink()||!base.isDirectory()||(process.platform!=='win32'&&(base.uid!==uid()||(base.mode&0o022)!==0)))denied();if(process.platform==='win32')windowsAcl(home,false,true);
 let current=home;
 for(const component of absolute.slice(home.length+1).split(sep)) {
  current=join(current,component);
  if(!existsSync(current)){try{mkdirSync(current,{mode:0o700});if(process.platform==='win32')windowsAcl(current,true);}catch(error){if(error.code!=='EEXIST')throw error;}}
  const info=lstatSync(current);if(info.isSymbolicLink()||!info.isDirectory()||(process.platform!=='win32'&&(info.uid!==uid()||(info.mode&0o022)!==0)))denied();
  // Standard existing .local and state parents can be public, but the WongStack
  // subtree is always private. Never chmod a foreign or pre-existing directory.
  if(process.platform==='win32')windowsAcl(current,false,true);
  if(current.includes(sep+'wongstack'+sep)||current.endsWith(sep+'wongstack'))owned(info,true,current);
 }
 return absolute;
}
export function machineStateDirectory(installation) {
 const key=createHash('sha256').update(JSON.stringify([installation.installationId,installation.repositoryId,installation.accountId,installation.databaseId,installation.memoryOrigin])).digest('hex');
 return privateDirectory(join(homedir(),'.local','state','wongstack','memory',key));
}
export function privateRead(path,fallback=null) {
 privateDirectory(dirname(path));let fd;
 try{if(present(path))owned(lstatSync(path),false,path);fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);owned(fstatSync(fd),false,path);return JSON.parse(readFileSync(fd,'utf8'));}
 catch(error){if(error.code==='ENOENT')return fallback;throw error;}finally{if(fd!==undefined)closeSync(fd);}
}
export function privateWrite(path,value) {
 const dir=privateDirectory(dirname(path));
 if(present(path))owned(lstatSync(path),false,path);
 const temp=join(dir,'.'+randomUUID()+'.tmp'),fd=openSync(temp,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
 try{if(process.platform==='win32')windowsAcl(temp,true);writeFileSync(fd,JSON.stringify(value)+'\n');fsyncSync(fd);}finally{closeSync(fd);}
 try{if(present(path))owned(lstatSync(path),false,path);renameSync(temp,path);if(process.platform!=='win32'){const d=openSync(dir,constants.O_RDONLY|constants.O_DIRECTORY|constants.O_NOFOLLOW);try{fsyncSync(d);}finally{closeSync(d);}}}
 finally{if(present(temp))unlinkSync(temp);}
}
export function privateRemove(path) {privateDirectory(dirname(path));if(present(path)){owned(lstatSync(path),false,path);unlinkSync(path);}}
export async function withMachineLock(dir,work,name='machine.lock') {
 privateDirectory(dir);if(!/^[a-z-]+\.lock$/.test(name))denied();
 const port=1024+createHash('sha256').update(resolve(dir)+'\0'+name).digest().readUInt32BE(0)%64512;
 // A live Node handle is the mutex. No messages, credentials, stale PID files or
 // unlink recovery exist. A collision can only report busy; crashes free the handle.
 let mutex;const until=Date.now()+(name==='machine.lock'?500:0);
 for(;;){
  mutex=createServer(socket=>socket.destroy());
  try{await new Promise((resolve,reject)=>{mutex.once('error',reject);mutex.listen({host:'127.0.0.1',port,exclusive:true},resolve);});break;}
  catch(error){if(error.code!=='EADDRINUSE'||Date.now()>=until)throw Object.assign(new Error(error.code==='EADDRINUSE'?'machine-state-busy':'machine-lock-unavailable'),{code:error.code==='EADDRINUSE'?'machine-state-busy':'machine-lock-unavailable'});await new Promise(resolve=>setTimeout(resolve,15));}
 }
 try{return await work();}finally{if(mutex.listening)await new Promise(resolve=>mutex.close(resolve));}
}
export const machineStateFile=ctx=>join(ctx.stateDir,'machine.json');
export const readMachineState=ctx=>privateRead(machineStateFile(ctx));
export const writeMachineState=(ctx,state)=>privateWrite(machineStateFile(ctx),state);

// Pending indexes contain IDs only; completion proofs stay in their immutable
// private queue files. Callers change an index only while holding machine.lock.
export function pendingIds(ctx,kind) {
 if(!['capture','raw'].includes(kind))denied();const value=privateRead(join(ctx.stateDir,'pending-'+kind+'.json'),[]);
 if(!Array.isArray(value)||value.length>10000||!value.every(id=>typeof id==='string'&&/^[a-f0-9-]{32,64}$/.test(id))||new Set(value).size!==value.length)denied();return value;
}
export function setPending(ctx,kind,id,pending) {
 const ids=pendingIds(ctx,kind).filter(x=>x!==id);if(pending)ids.push(id);if(ids.length>10000)denied();privateWrite(join(ctx.stateDir,'pending-'+kind+'.json'),ids);
}
