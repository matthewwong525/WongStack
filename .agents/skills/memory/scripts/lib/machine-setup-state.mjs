// Trusted setup receipts live beside machine state, outside every checkout.
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { privateRead,privateWrite,privateDirectory,withMachineLock } from './machine-client-state.mjs';
import { requireValue } from './installation-validation.mjs';
export function setupDirectory(account,repository) {
 requireValue(/^[a-f0-9]{32}$/.test(account)&&typeof repository==='string'&&repository.length>0,'target-mismatch');
 return privateDirectory(join(homedir(),'.local','state','wongstack','setup',createHash('sha256').update(JSON.stringify([account,repository])).digest('hex')));
}
export function setupStore(account,repository) {
 const dir=setupDirectory(account,repository),path=join(dir,'setup.json');
 return {dir,read:()=>privateRead(path),write:value=>privateWrite(path,value),lock:work=>withMachineLock(dir,work,'setup.lock')};
}
export async function persistSetup(store,value) { await store.write(value);const saved=await store.read();requireValue(JSON.stringify(saved)===JSON.stringify(value),'setup-journal-unconfirmed');return saved; }
export async function createOwnedMemoryDatabase(cf,{account,name,store}) {
 return store.lock(async()=>{
  let state=await store.read()??{};
  requireValue(!state.target||(state.target.account===account&&state.target.name===name),'target-mismatch');
  if(state.database?.method==='POST') {
   requireValue(state.target?.account===account&&state.target.name===name&&state.database.name===name&&state.database.path===`/accounts/${account}/d1/database`,'memory-ownership-unproven');
   const found=await cf('GET',`/accounts/${account}/d1/database?name=${encodeURIComponent(name)}`);
   requireValue(Array.isArray(found)&&found.filter(db=>db.uuid===state.database.id&&db.name===name).length===1,'target-mismatch');return state.database.id;
  }
  // A retained pending POST means the response was lost. Names and GET cannot adopt it.
  requireValue(!state.databaseIntent,'memory-ownership-ambiguous');
  state={...state,target:{account,name}};await persistSetup(store,state);
  const found=await cf('GET',`/accounts/${account}/d1/database?name=${encodeURIComponent(name)}`);
  requireValue(Array.isArray(found)&&found.length===0,'memory-ownership-unproven');
  state={...state,target:{account,name},databaseIntent:{method:'POST',path:`/accounts/${account}/d1/database`,name}};
  await persistSetup(store,state);
  const db=await cf('POST',state.databaseIntent.path,{name});
  requireValue(typeof db?.uuid==='string'&&db.name===name,'memory-ownership-ambiguous');
  state={...state,database:{method:'POST',id:db.uuid,name,path:state.databaseIntent.path}};
  await persistSetup(store,state);return db.uuid;
 });
}
