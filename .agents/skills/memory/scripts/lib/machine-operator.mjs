// Trusted in-process provisioning only. No route, CLI, provider dispatch or credential loading.
import { inspectResources, canonicalMemoryValue } from './installation-resources.mjs';
import { resourceTarget, exactKeys, opaqueId, requireValue, query } from './installation-validation.mjs';
import { machineHash, readMachineState, trustedMachineMigrations, machineBootstrapStatements, machineSnapshot,
  machineSetupResult } from './machine-state.mjs';
export { MemoryOperatorError } from './installation-validation.mjs';
export const machineDigest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

export async function inspectMachinePins(operator, target) {
  // Access admission/email is deliberately irrelevant; deployment bindings and origins are exact.
  const resources = await inspectResources(operator, target);
  return machineHash({ version: 2, target, subdomain: resources.subdomain, workers: resources.workers.map(worker => ({
    name: worker.name, id: worker.id, versionId: worker.activeVersionId,
    domains: (worker.references?.domains ?? []).map(row => ({ hostname: row.hostname })),
    routes: (worker.routes ?? []).map(row => ({ pattern: row.pattern })),
    bindings: worker.settings.bindings.filter(row => /^(MEMORY_|CF_ACCESS_|WONG_ENVIRONMENT$|WORKSPACE_LOGIN$|SKIP_AUTH$)/.test(row.name))
      .map(row => ({ name: row.name, type: row.type, text: row.type === 'plain_text' ? row.text : null,
        databaseId: row.database_id ?? row.id ?? null, bucketName: row.bucket_name ?? null }))
  })) });
}

function expectedIds(value) {
  if (value === null) return;
  exactKeys(value, ['installationId', 'repositoryId']);
  requireValue(opaqueId(value.installationId) && opaqueId(value.repositoryId));
}
export async function initializeMachineMemory(operator, input) {
  exactKeys(input, ['target', 'operationId', 'expectedInstallation', 'pinHash']);
  const target = resourceTarget(input.target); expectedIds(input.expectedInstallation);
  requireValue(opaqueId(input.operationId) && machineDigest(input.pinHash));
  requireValue(await inspectMachinePins(operator, target) === input.pinHash, 'target-mismatch');
  const requestHash = await machineHash({ version: 2, target, operationId: input.operationId, pinHash: input.pinHash });
  let state = await readMachineState(operator, target);
  let appliedMigrations = [];
  if (state === null) {
    requireValue(input.expectedInstallation === null, 'installation-conflict');
    const statements = await trustedMachineMigrations(operator);
    statements.push(...await machineBootstrapStatements(target, input, requestHash, input.pinHash));
    let failure;
    try { await query(operator, target, statements); appliedMigrations = Array.from({ length: 12 }, (_, index) => index + 1); }
    catch (error) { failure = error; }
    state = await readMachineState(operator, target);
    requireValue(state !== null, failure?.code ?? 'installation-conflict');
  }
  requireValue(state.request_hash === requestHash && state.operation_id === input.operationId && state.pin_hash === input.pinHash, 'installation-conflict');
  if (input.expectedInstallation !== null) requireValue(state.installation_id === input.expectedInstallation.installationId
    && state.repository_id === input.expectedInstallation.repositoryId, 'installation-conflict');
  requireValue(state.state === 'pending' && state.barrier_attempt_id === null, 'machine-operation-incomplete');
  return { ...machineSetupResult(target, state), installation: { ...target, installationId: state.installation_id, repositoryId: state.repository_id },
    snapshot: await machineSnapshot(state), schemaVersion: 12, appliedMigrations };
}

export async function machineEnvironment(operator, installation) {
  const target = resourceTarget(installation, true);
  const state = await readMachineState(operator, target);
  requireValue(state !== null && state.installation_id === installation.installationId && state.repository_id === installation.repositoryId, 'installation-conflict');
  requireValue(await inspectMachinePins(operator, target) === state.pin_hash, 'target-mismatch');
  return { operator, target, state, snapshot: await machineSnapshot(state) };
}
export async function readMachineSetupStatus(operator, input) {
  exactKeys(input, ['installation']);
  const { target, state, snapshot } = await machineEnvironment(operator, input.installation);
  return { ...machineSetupResult(target, state), snapshot };
}
export function sameMachineValue(left, right) {
  return JSON.stringify(canonicalMemoryValue(left)) === JSON.stringify(canonicalMemoryValue(right));
}
