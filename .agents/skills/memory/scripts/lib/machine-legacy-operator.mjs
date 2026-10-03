// Reviewed15 source entrypoint. Only the separately branded trusted adapter can execute it.
import { exactKeys,requireValue,opaqueId,digest,MemoryOperatorError } from './installation-validation.mjs';
import { retainedLegacyInventory,legacyHash,legacyDigest,legacySchemaContract,freezeLegacy } from './machine-legacy-inventory.mjs';
import { legacyReadback,boundLegacyProjection } from './machine-legacy-closure.mjs';
import { machineHash } from './machine-state.mjs';
import { machineLegacyMigrations } from './machine-legacy-migrations.mjs';
import { legacyAdapter,legacyCapability,legacyIntent,reserveLegacyCutover,closeLegacyAuthority,readLegacyDenial,verifyLegacyBackup } from './machine-legacy-adapter.mjs';
import { providerMachineContext,runtimeContext } from '../../worker/machine-context.mjs';
import { compiledCoreHashes,normalizeCoreDdl } from '../../worker/machine-core-contract.mjs';
import { dataDdl } from '../../worker/machine-data-contract.mjs';
import { readLegacyState,validateLegacySchema } from './machine-legacy-state.mjs';
import { readRuntimeState } from './machine-runtime-state.mjs';
import { activateMachineRuntime,enrollRuntimeMachine } from './machine-runtime-operator.mjs';
import { planLegacyBarrier,planLegacyClosure,planLegacyIssueWitness,planLegacyBaseline,planLegacyEra,planLegacyPiece,planLegacyQuarantine,planLegacyFinal,legacyInsert } from './machine-legacy-planners.mjs';
const read=async(value,sql,params=[])=>{
 const result=await legacyReadback(()=>value.callbacks.read(sql,params),'legacy-read-unavailable');boundLegacyProjection(result);
 requireValue(Array.isArray(result)&&result.length<=1000,'legacy-inventory-incomplete');return result;
};
export async function originalLegacyUniverse(adapter,inventory) {
 const value=await legacyCapability(adapter),ddl=await legacySchemaContract(value.callbacks.readMigration,inventory.sourceVersion),records=[];
 const versions=await read(value,'SELECT version FROM schema_migrations ORDER BY version');
 const extended=versions.length>=14;
 const columns=name=>[...ddl[name].sql.matchAll(/(?:\(|,)\s*(\w+)\s+(?:TEXT|INTEGER)\b/gi)].map(row=>row[1]);
 const sessions=await read(value,`SELECT ${columns('sessions').join(',')} FROM sessions${extended?' WHERE capture_attempt_id IS NULL':''} ORDER BY id`);
 const facts=await read(value,`SELECT ${columns('facts').join(',')} FROM facts${extended?' WHERE capture_attempt_id IS NULL':''} ORDER BY id`);
 for(const session of sessions)records.push({kind:'session',id:session.id,record:session,snapshotHash:await legacyHash(session)});
 for(const fact of facts) {
  const tags=await read(value,'SELECT t.* FROM tags t JOIN fact_tags ft ON ft.tag=t.name WHERE ft.fact_id=? ORDER BY t.name',[fact.id]);
  const record={fact,tags};records.push({kind:'fact',id:fact.id,record,snapshotHash:await legacyHash(record)});
 }
 const seen=new Set();
 for(const session of sessions.filter(row=>row.raw_key!==null)) {
  requireValue(!seen.has(session.raw_key),'legacy-raw-session-required');seen.add(session.raw_key);
  const selected=inventory.selected.some(row=>row.kind==='raw'&&row.id===session.raw_key);
  if(!selected||session.status==='private') {
   requireValue(!selected,'legacy-raw-session-required');
   const metadata={key:session.raw_key,sessionId:session.id,bytes:session.raw_bytes,status:session.status,sessionSnapshotHash:await legacyHash(session),restriction:'unclaimed-metadata-only'};
   records.push({kind:'raw',id:session.raw_key,record:metadata,snapshotHash:await legacyHash(metadata)});continue;
  }
  const raw=await legacyReadback(()=>value.callbacks.inspectRaw(inventory.target,session.raw_key),'legacy-raw-unavailable');
  exactKeys(raw,['key','contentHash','bytes','evidenceHash']);requireValue(raw.key===session.raw_key&&raw.bytes===session.raw_bytes&&legacyDigest(raw.contentHash)&&legacyDigest(raw.evidenceHash),'legacy-raw-unproven');
  records.push({kind:'raw',id:raw.key,record:raw,snapshotHash:await legacyHash(raw)});
 }
 requireValue(records.length<=1000,'legacy-inventory-incomplete');
 if(extended) {
  for(const [table,extra] of [['facts',['owner_principal_id','capture_attempt_id','capture_ordinal']],['sessions',['owner_principal_id','capture_attempt_id']]]) {
   const originally=columns(table),names=extra.filter(name=>!originally.includes(name));
   if(names.length)requireValue((await read(value,`SELECT count(*) n FROM ${table} WHERE capture_attempt_id IS NULL AND (${names.map(name=>name+' IS NOT NULL').join(' OR ')})`))[0].n===0,'legacy-mapping-unproven');
  }
 }
 return records;
}
export async function prepareLegacyCutover(adapter,inventory,review,input) {
 retainedLegacyInventory(inventory);const value=await legacyCapability(adapter);
 exactKeys(input,['attemptId','pinHash','predecessorId','previousPinHash','source','witness']);
 requireValue(opaqueId(input.attemptId)&&legacyDigest(input.pinHash)&&opaqueId(input.predecessorId)&&legacyDigest(input.previousPinHash)
 &&legacyDigest(input.source?.digest)&&/^[a-f0-9]{40,64}$/.test(input.source?.revision??''),'invalid-input');
 requireValue(review.inventoryHash===inventory.inventoryHash&&review.status==='review-only'&&review.sourceVersion===inventory.sourceVersion,'legacy-review-invalid');
 const retained={...review};delete retained.reviewHash;requireValue(await legacyHash(retained)===review.reviewHash,'legacy-review-invalid');
 requireValue(await legacyHash(await value.callbacks.inspectDestination(review.destination))===await legacyHash(review.destination),'legacy-destination-unproven');
 requireValue(await value.callbacks.inspectPins()===input.pinHash,'target-mismatch');
 requireValue(await legacyHash(await value.callbacks.verifySource())===await legacyHash(input.source),'publication-source-unverified');
 const records=await originalLegacyUniverse(adapter,inventory),universe=records.map(row=>({kind:row.kind,id:String(row.id),snapshotHash:row.snapshotHash}));
 requireValue(review.selected.every(selected=>records.some(row=>row.kind===selected.kind&&row.id===selected.id&&row.snapshotHash===selected.snapshotHash)),'legacy-mapping-unproven');
 const universeHash=await legacyHash(universe),backup=await verifyLegacyBackup(adapter,inventory,universeHash),installation=review.destination.installation;
 const requestHash=await machineHash({version:15,installation,attemptId:input.attemptId,reviewHash:review.reviewHash,inventoryHash:inventory.inventoryHash,universeHash,pinHash:input.pinHash,predecessorId:input.predecessorId});
 const baselineHash=await machineHash({version:15,installation,sourceVersion:inventory.sourceVersion,sourceSchemaHash:inventory.schemaHash,historyHash:inventory.history.historyHash,
 backupHash:inventory.source.backupHash,ownershipHash:inventory.source.resourceOwnershipHash,requestHash,original:backup.original});
 const candidate={installation,inventoryHash:inventory.inventoryHash,reviewHash:review.reviewHash,attemptId:input.attemptId,requestHash,universeHash,pinHash:input.pinHash,predecessorId:input.predecessorId,source:input.source};
 const retainedIntent=await value.journal.find('prepared-cutover');
 if(retainedIntent){requireValue(await legacyHash(retainedIntent.candidate.identity)===await legacyHash(candidate),'machine-attempt-conflict');return freezeLegacy({...retainedIntent.candidate.intent,inventory});}
 const ids=Object.fromEntries(['witnessAttemptId','witnessAuditId','runtimeOperationId','dataOperationId','runtimeAuditId','activationId','transitionId','deploymentId','finalAuditId'].map(name=>[name,crypto.randomUUID()]));
 const intent={...candidate,...ids,inventory,review,universe,baselineHash,original:backup.original,previousPinHash:input.previousPinHash,source:input.source,witness:input.witness,createdAt:Math.floor(Date.now()/1000)};
 if(inventory.sourceVersion!==14) {
  exactKeys(input.witness,['grantId','machineCommitment','capabilityHash','scope','expiresAt']);
  requireValue(input.witness.grantId===review.destination.grantId&&input.witness.machineCommitment===review.destination.machineCommitment&&input.witness.scope===review.destination.scope&&legacyDigest(input.witness.capabilityHash)
   &&input.witness.expiresAt>Math.floor(Date.now()/1000)&&input.witness.expiresAt<=Math.floor(Date.now()/1000)+600,'legacy-destination-unproven');
 } else requireValue(input.witness===null,'invalid-input');
 await legacyIntent(adapter,{action:'prepared-cutover',identity:candidate,intent});return freezeLegacy(intent);
}
export function trustedLegacyRuntimeContext(adapter,installation) {
 const value=legacyAdapter(adapter);
 return providerMachineContext(installation,value.callbacks.read,value.callbacks.write,value.callbacks.inspectPins,value.callbacks.readMigration,value.callbacks.inspectDeployment,
  async()=>{await legacyCapability(adapter);const result=await value.callbacks.inspectSafety({target:value.target,installation});requireValue(legacyDigest(result?.sourceHash)&&result.targetHash===await legacyHash(value.target)&&result.retirementAuthorityHash===value.authorization.retirementAuthorityHash&&result.closed===true,'legacy-closure-incomplete');return result;},
  async input=>{await legacyCapability(adapter);if(input.visibility==='admin-only') {const raw=await legacyReadback(()=>value.callbacks.inspectRawPolicy({target:value.target,installation,input}),'legacy-review-invalid');requireValue(await legacyHash(raw)===await legacyHash(input),'legacy-review-invalid');}return legacyReadback(()=>value.callbacks.inspectCorrection({target:value.target,installation,input}),'legacy-review-invalid');});
}
async function revalidateSchema(adapter,intent) {
 const value=legacyAdapter(adapter),versions=await read(value,'SELECT version FROM schema_migrations ORDER BY version');
 requireValue(versions.every((row,index)=>row.version===index+1),'schema-unsupported');
 if(versions.length===15)return validateLegacySchema(value.callbacks.read);
 requireValue(versions.length===intent.inventory.sourceVersion,'schema-unsupported');
 const expected=await legacySchemaContract(value.callbacks.readMigration,versions.length),metadata=await read(value,'SELECT name,type FROM sqlite_master ORDER BY name'),shadows=['facts_fts_data','facts_fts_idx','facts_fts_docsize','facts_fts_config'];
 const ordinary=metadata.filter(row=>!row.name.startsWith('sqlite_')&&!row.name.startsWith('_cf_')&&!shadows.includes(row.name));
 requireValue(ordinary.length===Object.keys(expected).length&&new Set(metadata.map(row=>row.name)).size===metadata.length&&shadows.every(name=>metadata.some(row=>row.name===name&&row.type==='table')),'legacy-schema-conflict');
 for(const [name,row] of Object.entries(expected)) {const actual=await read(value,'SELECT name,type,sql FROM sqlite_master WHERE name=? AND type=?',[name,row.type]);requireValue(actual.length===1&&actual[0].name===name&&actual[0].type===row.type&&typeof actual[0].sql==='string'&&normalizeCoreDdl(actual[0].sql)===row.sql,'legacy-schema-conflict');}
}
async function revalidate(adapter,intent) {
 await revalidateSchema(adapter,intent);
 const closure=await readLegacyDenial(adapter,intent.inventory,{attemptId:intent.attemptId,requestHash:intent.requestHash,universeHash:intent.universeHash});
 const records=await originalLegacyUniverse(adapter,intent.inventory);
 requireValue(await legacyHash(records.map(row=>({kind:row.kind,id:String(row.id),snapshotHash:row.snapshotHash})))===intent.universeHash,'legacy-mapping-unproven');
 const value=legacyAdapter(adapter),destination=await value.callbacks.inspectDestination(intent.review.destination);
 requireValue(await legacyHash(destination)===await legacyHash(intent.review.destination)&&await value.callbacks.inspectPins()===intent.pinHash,'legacy-destination-unproven');
 requireValue(await legacyHash(await value.callbacks.verifySource())===await legacyHash(intent.source),'publication-source-unverified');
 return {closure,records};
}
async function writeExact(adapter,intent,phase,statements) {
 const value=await legacyCapability(adapter);await revalidate(adapter,intent);
 const before=await read(value,'SELECT version FROM schema_migrations ORDER BY version');
 await legacyIntent(adapter,{action:'source-mutation',phase,attemptId:intent.attemptId,requestHash:intent.requestHash,source:intent.source,statementsHash:await machineHash(statements),versions:before});
 try{await value.callbacks.write(statements);}catch { /* Only independently verified exact receipts may recover. */ }
}
export async function applyLegacyCutover(adapter,intent,{enrollment=null}={}) {
 const value=await legacyCapability(adapter);
 const retained=await value.journal.find('prepared-cutover');requireValue(retained&&await legacyHash(retained.candidate.intent)===await legacyHash(intent),'machine-attempt-conflict');
 await reserveLegacyCutover(adapter,{attemptId:intent.attemptId,requestHash:intent.requestHash,inventoryHash:intent.inventory.inventoryHash,source:intent.inventory.source,universeHash:intent.universeHash});
 const context=trustedLegacyRuntimeContext(adapter,intent.installation);
 const versions=await read(value,'SELECT version FROM schema_migrations ORDER BY version');
 if(versions.length===15) {
  const state=await readLegacyState(context,{maintenance:true});
  requireValue(state.attempt.id===intent.attemptId&&state.attempt.request_hash===intent.requestHash,'machine-attempt-conflict');
  if(state.configuration.state==='exposed') {await revalidate(adapter,intent);requireValue(await legacyHash(await value.callbacks.verifySource())===await legacyHash(intent.source),'publication-source-unverified');return {schemaVersion:15,status:'source-receipt-only',installation:intent.installation,operation:{action:'legacy-cutover',attemptId:intent.attemptId,requestHash:intent.requestHash,completed:true}};}
  throw new MemoryOperatorError('machine-operation-incomplete');
 }
 requireValue(versions.length===intent.inventory.sourceVersion,'schema-unsupported');
 await revalidateSchema(adapter,intent);
 const closure=await closeLegacyAuthority(adapter,intent.inventory,{attemptId:intent.attemptId,requestHash:intent.requestHash,universeHash:intent.universeHash});
 // Structural extension records SQL versions only, never historical bootstrap receipts.
 const migrations=[];
 for(const migration of machineLegacyMigrations.slice(intent.inventory.sourceVersion)) {
  const sql=await legacyReadback(()=>value.callbacks.readMigration(migration.filename),'migration-bundle-invalid');
  requireValue(await digest(sql)===migration.sha256,'migration-bundle-invalid');
  migrations.push({sql,params:[]},{sql:"INSERT OR IGNORE INTO schema_migrations(version,applied_at) VALUES(?,'legacy15-structural-extension')",params:[migration.version]});
 }
 await writeExact(adapter,intent,'ddl',migrations);
 const {validateLegacySchema}=await import('./machine-legacy-state.mjs');await validateLegacySchema(value.callbacks.read);
 await writeExact(adapter,intent,'barrier',await planLegacyBarrier(intent));
 await writeExact(adapter,intent,'closure',planLegacyClosure(intent,closure));
 if(intent.inventory.sourceVersion!==14) {
  const machine=[];
  if(intent.inventory.sourceVersion<=6)machine.push(legacyInsert('memory_installation',{singleton:1,installation_id:intent.installation.installationId,repository_id:intent.installation.repositoryId,
   account_id:intent.inventory.target.accountId,database_id:intent.inventory.target.databaseId,bucket_name:intent.inventory.target.bucketName,canonical_origin:intent.inventory.target.appUrl,minimum_protocol:2,created_at:intent.createdAt}));
  machine.push(legacyInsert('memory_machine_configuration',{installation_id:intent.installation.installationId,repository_id:intent.installation.repositoryId,target_json:JSON.stringify(intent.inventory.target),pin_hash:intent.pinHash,operation_id:intent.attemptId,request_hash:intent.requestHash,created_at:intent.createdAt}));
  await writeExact(adapter,intent,'machine-era',machine);
  await writeExact(adapter,intent,'witness',await planLegacyIssueWitness(intent,intent.witness));
 }
 await writeExact(adapter,intent,'baseline',[await planLegacyBaseline(intent,intent.original)]);
 if(intent.inventory.sourceVersion!==14) {
  const evidence=await value.callbacks.inspectDeployment();requireValue(evidence.pinHash===intent.pinHash,'unreviewed-deployment');
  const genesis={pinHash:intent.pinHash,targetJson:JSON.stringify(intent.inventory.target),evidence,schemaHash:await digest(JSON.stringify(dataDdl))};
  await writeExact(adapter,intent,'runtime-data-era',await planLegacyEra(intent,genesis));
  const state=await readRuntimeState(context);
  await activateMachineRuntime(context,{attemptId:intent.activationId,expected:state.snapshot,payload:await compiledCoreHashes()});
  const enrolled=typeof enrollment==='function'?await enrollment({context,installation:intent.installation,destination:intent.review.destination,snapshot:(await readRuntimeState(context)).snapshot}):enrollment;
  requireValue(enrolled&&enrolled.input&&enrolled.input.payload.machineId===intent.review.destination.machineId&&enrolled.input.payload.grantId===intent.review.destination.grantId,'legacy-destination-unproven');
  await legacyIntent(adapter,{action:'trusted-enrollment',attemptId:intent.attemptId,requestHash:intent.requestHash,candidate:enrolled.input});
  const admitted=await enrollRuntimeMachine(context,enrolled.input);
  if(enrolled.confirm)await enrolled.confirm(admitted);
 }
 const {records}=await revalidate(adapter,intent);
 for(const [ordinal,selected] of intent.review.selected.entries()) {
  const original=records.find(row=>row.kind===selected.kind&&row.id===selected.id),mapping=intent.review.mappings.find(row=>row.kind===selected.kind&&row.id===selected.id),d=intent.review.destination;
  const claim={id:crypto.randomUUID(),kind:selected.kind,originalId:String(selected.id),snapshotHash:selected.snapshotHash,evidenceHash:mapping.evidenceHash,recordJson:JSON.stringify(original.record),machineId:d.machineId,grantId:d.grantId,keyCommitment:d.machineCommitment,scope:d.scope,machineRevision:d.machineRevision,grantRevision:d.grantRevision,credentialGeneration:d.credentialGeneration,visibility:selected.kind==='fact'?selected.visibility:'private'};
  await writeExact(adapter,intent,'piece:'+ordinal,await planLegacyPiece(intent,ordinal,[claim]));
 }
 await writeExact(adapter,intent,'quarantine',planLegacyQuarantine(intent));
 const final=await revalidate(adapter,intent);
 await writeExact(adapter,intent,'final-closure',planLegacyClosure(intent,final.closure));
 const claims=await read(value,'SELECT * FROM memory_legacy_claims'),activation=await read(value,'SELECT * FROM memory_runtime_activations');requireValue(activation.length===1,'machine-runtime-inactive');
 const evidence=await value.callbacks.inspectDeployment();requireValue(evidence.pinHash===intent.pinHash,'unreviewed-deployment');
 await writeExact(adapter,intent,'final',await planLegacyFinal(intent,final.closure,claims,intent.source,activation[0],evidence));
 const completed=await readLegacyState(context);requireValue(completed.configuration.state==='exposed'&&completed.attempt.id===intent.attemptId,'machine-operation-incomplete');
 return {schemaVersion:15,status:'source-receipt-only',installation:intent.installation,operation:{action:'legacy-cutover',attemptId:intent.attemptId,requestHash:intent.requestHash,completed:true}};
}

// Explicit ownership review appends a successor; source authored rows and private queues stay retained.
export async function correctLegacyOwnership(context,input) {
 const internal=runtimeContext(context,true);requireValue(typeof internal.inspectLegacyCorrection==='function','legacy-operator-required');
 exactKeys(input,['correctionId','predecessorId','claimId','recordHash','evidence','destination','visibility']);
 requireValue(['correctionId','predecessorId','claimId'].every(key=>opaqueId(input[key]))&&legacyDigest(input.recordHash)&&['private','shared','admin-only'].includes(input.visibility),'invalid-input');
 const state=await readLegacyState(context),claim=state.originalClaims.find(row=>row.id===input.claimId);
 requireValue(claim&&claim.snapshot_hash===input.recordHash,'legacy-mapping-unproven');
 requireValue(claim.kind!=='fact'||!['user','feedback'].includes(JSON.parse(claim.record_json).fact.type)||input.visibility!=='shared','legacy-mapping-unproven');
 requireValue(claim.kind!=='raw'||['private','admin-only'].includes(input.visibility),'legacy-raw-unproven');
 exactKeys(input.evidence,['decisionId','kind','evidenceRef','evidenceHash','backupHash','ownershipHash']);
 requireValue(opaqueId(input.evidence.decisionId)&&['ownership-correction','reviewed-admin-only-raw'].includes(input.evidence.kind)&&legacyDigest(input.evidence.evidenceHash)&&typeof input.evidence.evidenceRef==='string'&&input.evidence.evidenceRef.length>0&&input.evidence.evidenceRef.length<=200
  &&input.evidence.backupHash===state.attempt.backup_hash&&input.evidence.ownershipHash===state.attempt.ownership_hash&&(claim.kind!=='raw'||input.visibility!=='admin-only'||input.evidence.kind==='reviewed-admin-only-raw')
  &&(input.visibility!=='shared'||input.destination.scope!=='memory:read'),'legacy-review-invalid');
 const reviewed=await internal.inspectLegacyCorrection(input);
 requireValue(await legacyHash(reviewed)===await legacyHash(input)&&JSON.stringify(input.destination.installation)===JSON.stringify(state.review.destination.installation),'legacy-review-invalid');
 const installation=internal.installation,requestHash=await machineHash({version:15,installation,action:'ownership-correction',input});
 const before=await internal.read('SELECT * FROM memory_legacy_ownership_corrections'),old=before.find(row=>row.id===input.correctionId);
 if(old) {requireValue(old.request_hash===requestHash,'machine-attempt-conflict');const done=await internal.read('SELECT * FROM memory_legacy_ownership_completions');requireValue(done.some(row=>row.correction_id===old.id&&row.request_hash===requestHash),'machine-operation-incomplete');return {completed:true,correctionId:old.id,requestHash};}
 const auditHash=await legacyHash({action:'ownership-correction',requestHash,input});
 await internal.write([legacyInsert('memory_legacy_ownership_corrections',{id:input.correctionId,predecessor_id:input.predecessorId,claim_id:input.claimId,request_hash:requestHash,evidence_json:JSON.stringify(input.evidence),destination_json:JSON.stringify(input.destination),visibility:input.visibility,record_hash:input.recordHash,created_at:Math.floor(Date.now()/1000)})]);
 requireValue(await legacyHash(await internal.inspectLegacyCorrection(input))===await legacyHash(input),'legacy-review-invalid');
 await internal.write([legacyInsert('memory_legacy_ownership_completions',{correction_id:input.correctionId,request_hash:requestHash,audit_hash:auditHash,created_at:Math.floor(Date.now()/1000)})]);
 await readLegacyState(context);return {completed:true,correctionId:input.correctionId,requestHash};
}
