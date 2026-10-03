// Inactive receipt validation shared by real provider and D1 contexts; never invent provider authority.
import { machineRuntimeMigrations } from './machine-runtime-migrations.mjs';
import { machineTables, machineTriggers, machineHash, machineManifestHash } from './machine-state.mjs';
import { digest, requireValue } from './installation-validation.mjs';
import { runtimeContext } from '../../worker/machine-context.mjs';

export const runtimeManifestHash = () => digest(JSON.stringify(machineRuntimeMigrations));
export const runtimeTables = Object.freeze(['configuration','manifests','bootstrap','attempts','audit','completions','proofs','keys','rotations','transcripts','activations'].map(name => `memory_runtime_${name}`));
export const runtimeTriggers = Object.freeze(['attempt_guard','attempt_close','configuration_guard','machine_attempt_guard',
  'proofs_guard','keys_guard','rotations_guard','transcripts_guard','audit_guard','completion_guard','completion_release','bootstrap_guard',
  'configuration_retained','activations_guard','legacy_keys_insert_guard','legacy_keys_update_guard','legacy_admins_insert_guard','legacy_admins_update_guard',
  ...['manifests','bootstrap','attempts','audit','completions','proofs','keys','rotations','transcripts','activations']
    .flatMap(name => [`${name}_immutable`,`${name}_retained`])].map(name => `memory_runtime_${name}`));
const baselineTables = ['schema_migrations','sessions','facts','tags','fact_tags','facts_fts','facts_fts_data','facts_fts_idx',
  'facts_fts_docsize','facts_fts_config','runs','memory_keys','memory_admins','memory_installation','memory_principals','memory_providers',
  'memory_identity_bindings','memory_memberships','memory_invitations','memory_owner_intents','memory_login_candidates','memory_device_requests',
  'memory_devices','memory_credentials','memory_csrf_proofs','memory_quotas','memory_audit','memory_ownership_mappings','memory_legacy_evidence',
  'memory_identity_reviews','memory_installation_configuration','memory_bootstrap_completion','memory_schema_receipts','memory_owner_reviews',
  'memory_owner_attempts','memory_owner_completions', ...machineTables];

export async function readRuntimeBaseline(context, version = 13) {
  const { read, target, installation } = runtimeContext(context);
  const names = (await read("SELECT name FROM sqlite_master WHERE type='table'"))
    .map(row => row.name).filter(name => !name.startsWith('sqlite_') && !name.startsWith('_cf_'));
  const expected = version === 12 ? baselineTables : [...baselineTables, ...runtimeTables];
  requireValue(names.length === expected.length && expected.every(name => names.includes(name)), 'installation-conflict');
  const versions = await read('SELECT version FROM schema_migrations ORDER BY version');
  requireValue(versions.length === version && versions.every((row,index) => row.version === index+1), 'schema-unsupported');
  const triggers = await read("SELECT name FROM sqlite_master WHERE type='trigger'");
  requireValue([...machineTriggers, ...(version === 13 ? runtimeTriggers : [])].every(name => triggers.some(row => row.name === name)), 'installation-conflict');
  if (version === 13) requireValue((await read("SELECT name FROM sqlite_master WHERE type='view' AND name='memory_runtime_outcomes'")).length === 1, 'installation-conflict');
  const configurations = await read('SELECT * FROM memory_machine_configuration');
  const installations = await read('SELECT * FROM memory_installation');
  const manifests = await read('SELECT * FROM memory_machine_manifest_receipts');
  const bootstraps = await read('SELECT * FROM memory_machine_bootstrap_completions');
  requireValue([configurations,installations,manifests,bootstraps].every(rows => rows.length === 1), 'installation-conflict');
  const c = configurations[0], i = installations[0], m = manifests[0], b = bootstraps[0];
  const audits = await read('SELECT * FROM memory_machine_audit WHERE id=?', [b.audit_id]);
  requireValue(audits.length === 1, 'installation-conflict');
  const a = audits[0];
  requireValue(c.installation_id === installation.installationId && c.repository_id === installation.repositoryId
    && i.installation_id === c.installation_id && i.repository_id === c.repository_id
    && i.account_id === target.accountId && i.database_id === target.databaseId && i.bucket_name === target.bucketName
    && i.canonical_origin === target.appUrl && i.minimum_protocol === 2 && c.target_json === JSON.stringify(target)
    && b.installation_id === c.installation_id && b.operation_id === c.operation_id && b.request_hash === c.request_hash && b.pin_hash === c.pin_hash
    && m.installation_id === c.installation_id && m.repository_id === c.repository_id && m.schema_version === 12
    && m.manifest_hash === await machineManifestHash() && m.request_hash === c.request_hash && m.audit_id === b.audit_id
    && a.installation_id === c.installation_id && a.attempt_id === c.operation_id && a.action === 'bootstrap'
    && a.target_id === c.installation_id && a.request_hash === c.request_hash, 'installation-conflict');
  requireValue(c.request_hash === await machineHash({version:2,target,operationId:c.operation_id,pinHash:c.pin_hash}), 'installation-conflict');
  const baselineHash = await machineHash({ installation: { installationId: i.installation_id, repositoryId: i.repository_id },
    target, operationId: c.operation_id, requestHash: c.request_hash, pinHash: c.pin_hash, createdAt: c.created_at,
    manifest: m, bootstrap: b, audit: a });
  return { configuration: c, baselineHash, baselineAuditId: b.audit_id };
}

export async function validateCompleted12(context) {
  const result = await readRuntimeBaseline(context, 12), { read } = runtimeContext(context), c = result.configuration;
  requireValue(c.state === 'pending' && c.barrier_attempt_id === null, 'machine-operation-incomplete');
  const attempts = await read('SELECT * FROM memory_machine_attempts');
  const receipts = await read(`SELECT a.* FROM memory_machine_attempts a JOIN memory_machine_completions d ON d.attempt_id=a.id
    JOIN memory_machine_audit audit ON audit.id=d.audit_id AND audit.attempt_id=a.id
    WHERE d.installation_id=a.installation_id AND d.request_hash=a.request_hash AND d.audit_id=a.audit_id
    AND d.auth_revision=a.auth_revision+1 AND audit.installation_id=a.installation_id AND audit.action=a.action
    AND audit.target_id=a.target_id AND audit.request_hash=a.request_hash`);
  requireValue(attempts.length === receipts.length && c.auth_revision === 1 + attempts.length
    && attempts.every(row => row.installation_id === c.installation_id && row.pin_hash === c.pin_hash && row.pin_revision === c.pin_revision)
    && (await read('SELECT * FROM memory_machine_completions')).length === attempts.length
    && (await read('SELECT * FROM memory_machine_audit')).length === attempts.length + 1, 'machine-operation-incomplete');
  for(const a of attempts) requireValue(a.request_hash === await machineHash({version:2,installation:runtimeContext(context).installation,
    action:a.action,attemptId:a.id,expected:{authRevision:a.auth_revision,pinRevision:a.pin_revision,snapshotHash:a.snapshot_hash},payload:JSON.parse(a.payload_json)}), 'machine-operation-incomplete');
  return result;
}

export async function readRuntimeState(context) {
  const baseline = await readRuntimeBaseline(context), { read, installation, inspectPins, target } = runtimeContext(context);
  const configurations = await read('SELECT * FROM memory_runtime_configuration');
  const manifests = await read('SELECT * FROM memory_runtime_manifests');
  const bootstraps = await read('SELECT * FROM memory_runtime_bootstrap');
  requireValue([configurations,manifests,bootstraps].every(rows => rows.length === 1), 'installation-conflict');
  const r = configurations[0], m = manifests[0], b = bootstraps[0], c = baseline.configuration;
  const audits = await read('SELECT * FROM memory_runtime_audit WHERE id=?', [b.audit_id]);
  requireValue(audits.length === 1, 'installation-conflict');
  const a = audits[0];
  requireValue(r.installation_id === installation.installationId && r.repository_id === installation.repositoryId
    && r.target_json === c.target_json && r.pin_hash === c.pin_hash && r.baseline_hash === baseline.baselineHash
    && r.baseline_request_hash === c.request_hash && r.baseline_audit_id === baseline.baselineAuditId
    && m.installation_id === r.installation_id && m.repository_id === r.repository_id && m.schema_version === 13
    && m.manifest_hash === await runtimeManifestHash() && m.baseline_hash === r.baseline_hash && m.request_hash === r.request_hash
    && m.audit_id === b.audit_id && b.installation_id === r.installation_id && b.operation_id === r.operation_id
    && b.request_hash === r.request_hash && b.baseline_hash === r.baseline_hash
    && a.installation_id === r.installation_id && a.attempt_id === r.operation_id && a.action === 'upgrade'
    && a.target_id === r.installation_id && a.request_hash === r.request_hash, 'installation-conflict');
  requireValue(r.request_hash === await machineHash({version:13,installation,operationId:r.operation_id,
    expected:JSON.parse(r.upgrade_expected_json),pinHash:r.pin_hash,baselineHash:r.baseline_hash}), 'installation-conflict');
  if (inspectPins) requireValue(await inspectPins() === r.pin_hash, 'target-mismatch');
  const snapshot = { authRevision: c.auth_revision, pinRevision: c.pin_revision, runtimeRevision: r.runtime_revision,
    snapshotHash: await machineHash({ installation, baselineHash: baseline.baselineHash, pinHash: r.pin_hash,
      authRevision: c.auth_revision, pinRevision: c.pin_revision, runtimeRevision: r.runtime_revision,
      machineState: c.state, machineBarrier: c.barrier_attempt_id, runtimeState: r.state, runtimeBarrier: r.barrier_attempt_id }) };
  return { ...baseline, runtime: r, snapshot, installation, target };
}
export function runtimePending(state) {
  return { memory: { protocolVersion: 2, installationId: state.installation.installationId, repositoryId: state.installation.repositoryId,
    appUrl:state.target.appUrl,memoryOrigin:state.target.memoryOrigin,
    status: state.runtime.state === 'maintenance' || state.configuration.state === 'maintenance' ? 'blocked' : 'pending-setup',
    reason: state.runtime.state === 'maintenance' || state.configuration.state === 'maintenance'
      ? 'incomplete-machine-operation' : 'machine-operation-proof-required' }, snapshot: state.snapshot, schemaVersion: 13 };
}
export async function activeRuntimeMachine(context, state, machineId, grantId) {
  const { read } = runtimeContext(context);
  const values = await read(`SELECT p.*,g.revision grant_revision,g.state grant_state FROM memory_machine_principals p
    JOIN memory_machine_grants g ON g.id=p.grant_id AND g.machine_id=p.id AND g.installation_id=p.installation_id AND g.repository_id=p.repository_id
    JOIN memory_principals generic ON generic.id=p.id AND generic.installation_id=p.installation_id AND generic.status='active'
    WHERE p.id=? AND g.id=? AND p.installation_id=? AND p.repository_id=? AND p.status='active' AND g.state='consumed'`,
  [machineId,grantId,state.installation.installationId,state.installation.repositoryId]);
  requireValue(values.length === 1, 'machine-proof-denied');
  return values[0];
}
