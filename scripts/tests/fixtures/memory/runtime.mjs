// Source-only SQLite/D1 adapters; no actual provider, resources or private state.
import { preparedMachineFixture, issueInput, enrollInput, attempt, MACHINE, GRANT } from './machines.mjs';
import { issueMachineGrant, enrollMemoryMachine } from '../../../../.agents/skills/memory/scripts/lib/machine-enrollment.mjs';
import { trustedMachineRuntimeContext, prepareMachineRuntime, readMachineRuntimeStatus, activateMachineRuntime,
  issueRuntimeMachineGrant, enrollRuntimeMachine } from '../../../../.agents/skills/memory/scripts/lib/machine-runtime-operator.mjs';
import { publicMachineContext } from '../../../../.agents/skills/memory/worker/machine-context.mjs';
import { machineKeyCommitment, machineProofMessage } from '../../../../.agents/skills/memory/worker/machine-proof.mjs';
import { digest } from '../../../../.agents/skills/memory/scripts/lib/installation-validation.mjs';
export { attempt, MACHINE, GRANT };
export const CAPABILITY = 'synthetic-capability-not-a-real-token'.padEnd(48,'0');
export const TOKEN = 'synthetic-bearer-not-a-real-token'.padEnd(48,'0');
export const now = () => Math.floor(Date.now()/1000);
export const rejected = code => error => error.code === code && error.message === code;
export async function signingKey() {
  const pair = await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const jwk = await crypto.subtle.exportKey('jwk',pair.publicKey);
  const publicKey = {kty:jwk.kty,crv:jwk.crv,x:jwk.x,y:jwk.y};
  return {privateKey:pair.privateKey,publicKey,commitment:await machineKeyCommitment(publicKey)};
}
export async function signed(f,purpose,input,options = {}) {
  const proof = {publicKey:f.signing.publicKey,issuedAt:now(),deadline:now()+90,
    nonce:options.nonce ?? crypto.randomUUID(),signature:''};
  const binding = {installation:f.installation,purpose,attemptId:input.attemptId,expected:input.expected,payload:input.payload};
  let message = await machineProofMessage(binding,proof);
  if (options.frame) message = JSON.stringify({...JSON.parse(message),...options.frame});
  const signature = await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},f.signing.privateKey,new TextEncoder().encode(message));
  proof.signature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  return {...input,proof};
}
export function d1Fixture(f) {
  return {prepare:sql => ({bind:(...params) => ({sql,params,all:async () => ({success:true,results:f.db.prepare(sql).all(...params).map(row=>({...row}))}),
    first:async()=>f.db.prepare(sql).get(...params)??null})}),
    batch:async statements => {
      f.batches++;f.statementBatches.push(structuredClone(statements.map(({sql,params})=>({sql,params}))));
      if (f.atomic) f.db.exec('BEGIN');
      try {
        for (const [index,statement] of statements.entries()) {
          if (f.beforeStatement) await f.beforeStatement(index,statement);
          if (index === f.failAt) throw new Error('Synthetic D1 partial mutation');
          if (statement.params.length) f.db.prepare(statement.sql).run(...statement.params); else f.db.exec(statement.sql);
          if (f.afterStatement) await f.afterStatement(index,statement);
        }
        if (f.atomic) f.db.exec('COMMIT');
      } catch(error) {if(f.atomic) f.db.exec('ROLLBACK');throw error;}
      if(f.loseResponse){f.loseResponse=false;throw new Error('Synthetic private D1 response loss');}
      return statements.map(()=>({success:true,results:[]}));
    }};
}
export async function runtimeFixture(t,options={}) {
  const f = await preparedMachineFixture(t,options);
  f.db.function('unixepoch',()=>Math.floor(Date.now()/1000));
  f.signing = await signingKey();f.scope=options.scope ?? 'memory:read memory:write';
  if(options.completed12Machine) {
    const issue = await issueInput(f,{machineCommitment:f.signing.commitment,capabilityHash:await digest(CAPABILITY),scope:f.scope});
    await issueMachineGrant(f.operator,issue);
    const enroll = await enrollInput(f,{machineCommitment:f.signing.commitment,capabilityHash:await digest(CAPABILITY),scope:f.scope,credentialHash:await digest(TOKEN)});
    await enrollMemoryMachine(f.operator,enroll);
  }
  f.upgrade = {operationId:attempt('runtime-bootstrap'),expected:await f.expected(),pinHash:f.input.pinHash};
  f.context = await trustedMachineRuntimeContext(f.operator,f.installation);
  f.baselineSnapshot = f.snapshot();
  await prepareMachineRuntime(f.context,f.upgrade);
  f.public = publicMachineContext(d1Fixture(f),f.installation);
  f.expected = async () => (await readMachineRuntimeStatus(f.context)).snapshot;
  if(options.activate !== false) {
    f.activation = {attemptId:attempt('activate'),expected:await f.expected(),payload:{protocolHash:'a'.repeat(64),routeContractHash:'b'.repeat(64)}};
    await activateMachineRuntime(f.context,f.activation);
  }
  return f;
}
export async function runtimeGrantFixture(t,options) {
  const f = await runtimeFixture(t,options);
  f.issue = {attemptId:attempt('issue13'),expected:await f.expected(),payload:{grantId:GRANT,machineCommitment:f.signing.commitment,
    capabilityHash:await digest(CAPABILITY),scope:f.scope,expiresAt:now()+550}};
  await issueRuntimeMachineGrant(f.context,f.issue);return f;
}
export async function runtimeEnrollInput(f,changes={}) {
  return signed(f,'enroll',{attemptId:attempt('enroll13'),expected:await f.expected(),payload:{grantId:GRANT,machineId:MACHINE,
    machineCommitment:f.signing.commitment,capabilityHash:await digest(CAPABILITY),scope:f.scope,credentialHash:await digest(TOKEN),
    credentialExpiresAt:now()+2591900,overlapUntil:now()+110,...changes},capability:CAPABILITY});
}
export async function enrolledRuntimeFixture(t,options) {
  const f = await runtimeGrantFixture(t,options);f.enroll=await runtimeEnrollInput(f);await enrollRuntimeMachine(f.public,f.enroll);return f;
}
export async function enrollOtherRuntimeMachine(f) {
  const other={...f,signing:await signingKey()},machineId=attempt('other-real-machine'),grantId=attempt('other-real-grant');
  const capability='synthetic-other-capability'.padEnd(48,'0'),credentialHash=await digest('synthetic-other-bearer'.padEnd(48,'0'));
  const payload={grantId,machineCommitment:other.signing.commitment,capabilityHash:await digest(capability),scope:f.scope,expiresAt:now()+550};
  await issueRuntimeMachineGrant(f.context,{attemptId:attempt('other-real-issue'),expected:await f.expected(),payload});
  const enroll=await signed(other,'enroll',{attemptId:attempt('other-real-enroll'),expected:await f.expected(),capability,
    payload:{grantId,machineId,machineCommitment:other.signing.commitment,capabilityHash:await digest(capability),scope:f.scope,
      credentialHash,credentialExpiresAt:now()+2591900,overlapUntil:now()+110}});
  await enrollRuntimeMachine(f.public,enroll);
  return {machineId,grantId,credentialHash,signing:other.signing,enroll};
}
export async function renewalInput(f,changes={}) {
  const latest=f.db.prepare('SELECT * FROM memory_runtime_rotations WHERE machine_id=? ORDER BY generation DESC LIMIT 1').get(MACHINE);
  return signed(f,'renew',{attemptId:attempt('renew13'),expected:await f.expected(),payload:{machineId:MACHINE,grantId:GRANT,
    machineCommitment:f.signing.commitment,scope:f.scope,grantRevision:2,machineRevision:1,
    credentialHash:await digest('synthetic-new-bearer-not-a-real-token'.padEnd(48,'0')),credentialExpiresAt:now()+2591900,
    previousHash:latest?.hash ?? await digest(TOKEN),generation:latest ? latest.generation+1 : 1,overlapUntil:now()+110,...changes}});
}
export async function revokeInput(f) {
  return {attemptId:attempt('revoke13'),expected:await f.expected(),payload:{machineId:MACHINE,grantId:GRANT,machineRevision:1,grantRevision:2}};
}
export async function transcriptInput(f,purpose='stage',changes={}) {
  const latest=f.db.prepare('SELECT generation FROM memory_runtime_rotations WHERE machine_id=? ORDER BY generation DESC LIMIT 1').get(MACHINE);
  return signed(f,purpose,{attemptId:attempt(purpose+'13'),expected:await f.expected(),payload:{machineId:MACHINE,grantId:GRANT,
    machineCommitment:f.signing.commitment,scope:f.scope,grantRevision:2,machineRevision:1,credentialGeneration:latest.generation,objectHash:'c'.repeat(64),
    sessionHash:'d'.repeat(64),contentHash:'e'.repeat(64),visibility:'private',...(purpose==='publish'?{stageAttemptId:attempt('stage13')} : {}),...changes}});
}
export function corruptRuntime(f,table,sql,params=[]) {
  const triggers=f.db.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger' AND tbl_name=?").all(table);
  for(const row of triggers)f.db.exec(`DROP TRIGGER ${row.name}`);
  f.db.prepare(sql).run(...params);
  for(const row of triggers)f.db.exec(row.sql);
}
