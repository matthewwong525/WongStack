// Separate D1 and trusted-provider capabilities. Neither context is a public result.
import { normalizeCoreDdl, coreProtectionDdl, coreTableColumns, CORE_D1_LIMIT } from './machine-core-contract.mjs';
import { resourceTarget, requireValue, MemoryOperatorError } from '../scripts/lib/installation-validation.mjs';
import { legacyDdl,legacyRetainedDdl,legacyTableColumns } from './machine-legacy-contract.mjs';
const contexts = new WeakMap();
export function publicMachineContext(db, installation, execution = null) {
  const target = resourceTarget(installation, true);
  requireValue(typeof db?.prepare === 'function' && typeof db?.batch === 'function', 'machine-context-denied');
  const context = Object.freeze({ kind: 'machine-d1' });
  const budget = { used: 0 };
  const spend = n => { requireValue(execution===null||budget.used+n<=CORE_D1_LIMIT, 'machine-query-budget'); budget.used+=n; };
  contexts.set(context, { target, budget, execution, reserve: n => requireValue(execution===null||budget.used+n<=CORE_D1_LIMIT, 'capture-payload-too-large'), installation: Object.freeze({ ...installation }),
    read: async (sql, params = []) => {
      try {
        spend(1);
        const result = await db.prepare(sql).bind(...params).all();
        requireValue(result?.success === true && Array.isArray(result.results), 'machine-store-unavailable');
        return result.results;
      } catch (error) { if(error instanceof MemoryOperatorError) throw error; throw new MemoryOperatorError('machine-store-unavailable'); }
    },
    write: async statements => {
      try {
        spend(statements.length);
        const result = await db.batch(statements.map(row => db.prepare(row.sql).bind(...row.params)));
        requireValue(Array.isArray(result) && result.length === statements.length && result.every(row => row?.success === true), 'machine-store-unavailable');
      } catch (error) { if(error instanceof MemoryOperatorError) throw error; throw new MemoryOperatorError('machine-store-unavailable'); }
    } });
  return context;
}
// Only the trusted operator module supplies this separately verified in-process capability.
export function providerMachineContext(installation, read, write, inspectPins, readMigration, inspectDeployment = null,inspectLegacySafety=null,inspectLegacyCorrection=null) {
  const target = resourceTarget(installation, true);
  requireValue([read, write, inspectPins, readMigration].every(value => typeof value === 'function'), 'machine-context-denied');
  requireValue(inspectLegacyCorrection===null||typeof inspectLegacyCorrection==='function','machine-context-denied');
  requireValue(inspectLegacySafety===null||typeof inspectLegacySafety==='function','machine-context-denied');
  requireValue(inspectDeployment === null || typeof inspectDeployment === 'function', 'machine-context-denied');
  const context = Object.freeze({ kind: 'trusted-machine-operator' });
  contexts.set(context, { target, installation: Object.freeze({ ...installation }), read, write, inspectPins, readMigration, inspectDeployment,inspectLegacySafety,inspectLegacyCorrection });
  return context;
}
export function runtimeContext(context, privileged = false) {
  const value = contexts.get(context);
  requireValue(value && (!privileged || context.kind === 'trusted-machine-operator'), 'machine-context-denied');
  return value;
}

// A separate internal data-inspection brand; it grants no trusted-provider capability.
export function dataInspectionContext(context) {
 const value=runtimeContext(context);
 const result=Object.freeze({kind:context.kind});
 contexts.set(result,{...value,dataInspection:true});
 return result;
}

// D1 accepts at most32 arguments per SQL function. json_set retains explicit NULLs.
const jsonObject=entries=>{
 const first=entries.slice(0,16);let sql=`json_object(${first.flat().join(',')})`;
 for(let offset=16;offset<entries.length;offset+=15) {
  const chunk=entries.slice(offset,offset+15).flatMap(([key,value])=>["'$."+key.slice(1,-1)+"'",value]);
  sql=`json_set(${sql},${chunk.join(',')})`;
 }
 return sql;
};
// One statement obtains a coherent fresh validation image. The image is never kept
// across requests or used for ordinary data queries or live grant/credential checks.
export async function runtimeSnapshotContext(context) {
 const value=runtimeContext(context);
 if(context.kind!=='machine-d1'||!value.execution||value.snapshotImage)return context;
 const legacy=value.execution.schemaVersion===15;
 const columnsFor={...coreTableColumns,...(legacy?legacyTableColumns:{})};
 const tables=['memory_machine_configuration','memory_installation','memory_machine_manifest_receipts','memory_machine_bootstrap_completions','memory_machine_audit',
 'memory_runtime_configuration','memory_runtime_manifests','memory_runtime_bootstrap','memory_runtime_audit',
 'memory_data_configuration','memory_data_bootstrap',...(legacy?[...Object.keys(legacyTableColumns),'memory_machine_attempts','memory_machine_grants','memory_machine_completions','memory_runtime_activations','memory_runtime_attempts','memory_runtime_completions']:[])];
 const pack=(query,columns)=>`(SELECT json_group_array(${jsonObject(columns.map(c=>["'"+c+"'",'"'+c+'"']))}) FROM (${query}))`;
 const entries=[['schema',pack('SELECT name,type,sql FROM sqlite_master',['name','type','sql'])],
 ['versions',pack('SELECT version FROM schema_migrations ORDER BY version',['version'])],
 ...tables.map(t=>[t,pack('SELECT * FROM '+t+(t==='memory_machine_audit'&&!legacy?' WHERE id=(SELECT audit_id FROM memory_machine_bootstrap_completions)':t==='memory_runtime_audit'&&!legacy?' WHERE id=(SELECT audit_id FROM memory_runtime_bootstrap)':''),columnsFor[t])]),
 ...['facts','sessions','runs'].map(t=>[t,pack(`SELECT * FROM pragma_table_info('${t}')`,['cid','name','type','notnull','dflt_value','pk'])]),
 ['deployments',pack(`SELECT x.*,a.payload_json,a.request_hash,a.expected_json,a.revision,a.installation_id,c.request_hash completed_hash,c.outcome_json,c.revision completed_revision,
 audit.request_hash audit_hash FROM memory_data_deployments x JOIN memory_data_attempts a ON a.id=x.attempt_id
 JOIN memory_data_completions c ON c.attempt_id=a.id AND c.audit_id=a.audit_id JOIN memory_data_audit audit ON audit.id=c.audit_id AND audit.attempt_id=a.id`,
 [...coreTableColumns.memory_data_deployments,'payload_json','request_hash','expected_json','revision','installation_id','completed_hash','outcome_json','completed_revision','audit_hash'])]];
 const scalarEntries=entries.filter(([name])=>name!=='deployments');
 const deploymentColumns=[...coreTableColumns.memory_data_deployments,'payload_json','request_hash','expected_json','revision','installation_id','completed_hash','outcome_json','completed_revision','audit_hash'];
 const deployQuery=`SELECT x.*,a.payload_json,a.request_hash,a.expected_json,a.revision,a.installation_id,c.request_hash completed_hash,c.outcome_json,c.revision completed_revision,
 audit.request_hash audit_hash FROM memory_data_deployments x JOIN memory_data_attempts a ON a.id=x.attempt_id
 JOIN memory_data_completions c ON c.attempt_id=a.id AND c.audit_id=a.audit_id JOIN memory_data_audit audit ON audit.id=c.audit_id AND audit.attempt_id=a.id`;
 const object=columns=>jsonObject(columns.map(c=>["'"+c+"'",'"'+c+'"']));
 const sql=`SELECT 'image' kind,${jsonObject(scalarEntries.map(([name,query])=>["'"+name+"'",'json('+query+')']))} value
 UNION ALL SELECT 'deployment' kind,${object(deploymentColumns)} value FROM (${deployQuery})
 UNION ALL SELECT 'deployment-raw' kind,${object(coreTableColumns.memory_data_deployments)} value FROM memory_data_deployments`;
 const rows=await value.read(sql),base=rows.filter(r=>r.kind==='image');requireValue(base.length===1,'installation-conflict');
 const image={...JSON.parse(base[0].value),deployments:rows.filter(r=>r.kind==='deployment').map(r=>JSON.parse(r.value)),memory_data_deployments:rows.filter(r=>r.kind==='deployment-raw').map(r=>JSON.parse(r.value))};
 requireValue(image.versions.length===(legacy?15:14)&&image.versions.every((row,index)=>row.version===index+1),'schema-unsupported');
 // DDL bodies, not merely protection names. This check is fresh after every await.
 for(const [name,expected] of Object.entries({...coreProtectionDdl,...(legacy?{...legacyRetainedDdl,...legacyDdl}:{})})) {
  const actual=image.schema.find(row=>row.name===name);
  requireValue(actual&&actual.type===expected.type&&normalizeCoreDdl(actual.sql)===expected.sql,'installation-conflict');
 }
 const snapshot=Object.freeze({kind:context.kind});
 contexts.set(snapshot,{...value,snapshotImage:true,read:async(sql,params=[])=>{
  if(sql==='SELECT version FROM schema_migrations ORDER BY version')return image.versions;
  if(sql==='SELECT name,type,sql FROM sqlite_master WHERE name=? AND type=?')return image.schema.filter(row=>row.name===params[0]&&row.type===params[1]);
  if(sql.startsWith('SELECT name')&&sql.includes('FROM sqlite_master')) {
   const type=sql.match(/type='(\w+)'/)?.[1],name=sql.match(/AND name='([^']+)'/)?.[1];
   const selected=sql.match(/^SELECT (name(?:,type(?:,sql)?)?) FROM sqlite_master/)?.[1].split(',');requireValue(selected,'machine-context-denied');
   return image.schema.filter(r=>(!type||r.type===type)&&(!name||r.name===name)&&(!sql.includes("LIKE 'memory_data_%'")||r.name.startsWith('memory_data_'))).sort((a,b)=>a.name.localeCompare(b.name)).map(row=>Object.fromEntries(selected.map(column=>[column,row[column]])));
  }
  const pragma=sql.match(/^PRAGMA table_info\((\w+)\)$/);if(pragma)return image[pragma[1]];
  if(sql.startsWith('SELECT x.*,a.payload_json'))return image.deployments;
  const table=sql.match(/^SELECT \* FROM (\w+)(?: WHERE id=\?)?$/)?.[1];
  requireValue(table&&image[table],'machine-context-denied');
  return params.length?image[table].filter(r=>r.id===params[0]):image[table];
 }});
 return snapshot;
}
