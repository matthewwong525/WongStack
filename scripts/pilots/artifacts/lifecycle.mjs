import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const assertAccount = (manifest, account) => {
  if (!/^[a-f0-9]{32}$/i.test(account || '') || manifest.account !== account) throw new Error('Explicit account differs from run manifest');
};
export function createManifest(account, run, backend = 'custom') {
  if (!/^[a-f0-9]{32}$/i.test(account || '') || !/^[a-z0-9-]{6,14}$/.test(run || '')) throw new Error('Explicit account and unique 6–14 character run ID required');
  const prefix = `wong-artifacts-pilot-${run}`;
  if (!['custom', 'workers-builds'].includes(backend)) throw new Error('Unknown pilot backend');
  return { version: 1, account, run, prefix, namespace: prefix, backend, createdAt: new Date().toISOString(), resources: [], credentials: [], bounds: { builds: 10, concurrentRunners: 1, buildTimeoutMinutes: 30, ...(backend === 'workers-builds' ? { managedBuilds: 10, managedBuildTimeoutMinutes: 20 } : {}) }, cleanup: 'pending' };
}
export function writePrivate(file, value) {
  const full = resolve(file);
  if (!full.includes('/.scratch/')) throw new Error('Private run output must be inside .scratch');
  mkdirSync(dirname(full), { recursive: true, mode: 0o700 });
  const next = `${full}.next`;
  writeFileSync(next, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  chmodSync(next, 0o600); renameSync(next, full);
}
export const readManifest = file => JSON.parse(readFileSync(file, 'utf8'));
export function inventory(manifest) {
  const p = manifest.prefix;
  return [
    { kind: 'namespace', name: p },
    { kind: 'repo', name: `${p}-project` }, { kind: 'repo', name: `${p}-isolation` },
    ...['production', 'staging', 'memory'].map(env => ({ kind: 'd1', name: `${p}-${env}` })),
    { kind: 'r2', name: `${p}-cache` }, { kind: 'r2', name: `${p}-memory` },
    ...['production', 'staging', 'controller'].map(env => ({ kind: 'worker', name: `${p}-${env}` })),
    { kind: 'workflow', name: `${p}-pipeline` }, { kind: 'container', name: `${p}-runner` },
    { kind: 'durable-object', name: `${p}-controller-PilotState`, script: `${p}-controller`, class: 'PilotState' }, { kind: 'durable-object', name: `${p}-controller-CiSandbox`, script: `${p}-controller`, class: 'CiSandbox' },
    ...(manifest.backend === 'workers-builds' ? [{ kind: 'build-connection', name: `${p}-connection` }, { kind: 'build-trigger', name: `${p}-managed` }] : []),
  ];
}

export async function ensureResource(manifest, account, spec, provider, save) {
  assertAccount(manifest, account);
  if (!inventory(manifest).some(row => row.kind === spec.kind && row.name === spec.name)) throw new Error('Resource not in exact pilot inventory');
  let row = manifest.resources.find(each => each.kind === spec.kind && each.name === spec.name);
  if (row?.status === 'created') return row;
  if (row) throw new Error(`Interrupted create of ${spec.name}: reconcile provider receipt before resuming`);
  if (await provider.find(spec)) throw new Error(`Pre-existing resource rejected: ${spec.name}`);
  row = { ...spec, status: 'creating', createdBy: manifest.run };
  manifest.resources.push(row); await save(manifest);
  const result = await provider.create(spec);
  if (!result?.id) throw new Error('Provider creation returned no resource ID');
  Object.assign(row, { id: result.id, ...(result.remote ? { remote: result.remote } : {}), status: 'created', acknowledgedAt: new Date().toISOString() });
  for (const id of result.initialTokenIDs || []) manifest.credentials.push({ kind: 'git', id, repo: spec.name, initial: true, revoked: false });
  await save(manifest); return row;
}

export async function cleanup(manifest, account, provider, save) {
  assertAccount(manifest, account);
  // Disabling triggers and cancelling workflows are mandatory before revocation/deletion.
  await provider.quiesce(manifest);
  const errors = [];
  for (const credential of manifest.credentials.filter(row => !row.revoked && row.kind !== 'management')) {
    try { await provider.revoke(credential); credential.revoked = true; await save(manifest); }
    catch (error) { errors.push({ kind: 'credential', id: credential.id, error: error.message }); }
  }
  // Keep management token until all resources have been deleted.
  const order = { 'build-trigger': -2, 'build-connection': -1, workflow: 0, container: 1, worker: 2, 'durable-object': 3, repo: 4, r2: 5, d1: 6, namespace: 7 };
  for (const row of [...manifest.resources].sort((a, b) => order[a.kind] - order[b.kind])) {
    if (row.status === 'deleted') continue;
    try {
      if (row.createdBy !== manifest.run || !row.id || row.status === 'creating') throw new Error('Ownership not acknowledged; manual reconciliation required');
      if (!inventory(manifest).some(spec => spec.kind === row.kind && spec.name === row.name)) throw new Error('Resource outside manifest inventory');
      await provider.delete(row);
      if (await provider.find(row)) throw new Error('Deletion readback still finds resource');
      row.status = 'deleted'; row.deletedAt = new Date().toISOString(); await save(manifest);
    } catch (error) { errors.push({ kind: row.kind, id: row.id || row.name, error: error.message }); }
  }
  if (!errors.length) for (const credential of manifest.credentials.filter(row => !row.revoked && row.kind === 'management')) {
    try { await provider.revoke(credential); credential.revoked = true; await save(manifest); }
    catch (error) { errors.push({ kind: 'management', id: credential.id, error: error.message }); }
  }
  manifest.cleanup = errors.length ? 'incomplete' : 'verified'; manifest.leftovers = errors;
  await save(manifest); return { outcome: errors.length ? 'FAIL' : 'PASS', leftovers: errors };
}
