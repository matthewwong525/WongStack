// Trusted-process capability only. This module has no HTTP handler or credential transport.
import { exactKeys, requireValue, resourceTarget, accessConfiguration, ownerEmail, opaqueId, digest, query, MemoryOperatorError } from './installation-validation.mjs';
import { inspectResources, inspectProtection } from './installation-resources.mjs';
import { readInstallation, trustedMigrations, bootstrapStatements, setupResult, memorySchemaVersion } from './installation-state.mjs';
import { memoryMigrations } from './installation-migrations.mjs';

export { MemoryOperatorError };

function expectedIds(value) {
  if (value === null) return;
  exactKeys(value, ['installationId', 'repositoryId']);
  requireValue(opaqueId(value.installationId) && opaqueId(value.repositoryId));
}
function sameIds(state, expected) {
  requireValue(state.installation_id === expected.installationId && state.repository_id === expected.repositoryId, 'installation-conflict');
}
function matchingRetry(state, input, requestHash) {
  requireValue(state.request_hash === requestHash && state.owner_email === input.ownerEmail &&
    state.access_json === (input.access === null ? null : JSON.stringify(input.access)), 'installation-conflict');
  if (input.expectedInstallation === null) requireValue(state.operation_id === input.operationId, 'installation-conflict');
  else sameIds(state, input.expectedInstallation);
}
function storedAccess(state) {
  try { return accessConfiguration(state.access_json === null ? null : JSON.parse(state.access_json)); }
  catch { throw new MemoryOperatorError('installation-conflict'); }
}

export async function initializeMemoryInstallation(operator, input) {
  exactKeys(input, ['target', 'operationId', 'expectedInstallation', 'access', 'ownerIntent']);
  const target = resourceTarget(input.target);
  const access = accessConfiguration(input.access);
  requireValue(opaqueId(input.operationId));
  expectedIds(input.expectedInstallation);
  exactKeys(input.ownerIntent, ['email']);
  const normalized = { ...input, access, ownerEmail: ownerEmail(input.ownerIntent.email) };
  const requestHash = await digest(JSON.stringify({ target, access, ownerEmail: normalized.ownerEmail }));
  const resources = await inspectResources(operator, target);
  const blocked = await inspectProtection(operator, target, access, resources);
  let state = await readInstallation(operator, target);
  let appliedMigrations = [];
  if (state === null) {
    requireValue(input.expectedInstallation === null, 'installation-conflict');
    const statements = await trustedMigrations(operator);
    statements.push(...await bootstrapStatements(target, normalized, requestHash, crypto.randomUUID(), crypto.randomUUID()));
    try {
      // Submit one batch; the live REST rollback/concurrency gate is required before
      // integration. Worker-binding guarantees are not assumed for this transport.
      await query(operator, target, statements);
      appliedMigrations = memoryMigrations.map(row => row.version);
    } catch (error) {
      // A lost response or concurrent identical initializer may already have committed.
      // Reread its immutable receipt; never retry an ambiguous write with new IDs.
      state = await readInstallation(operator, target);
      if (state === null) throw error;
    }
    state ??= await readInstallation(operator, target);
    requireValue(state !== null, 'provider-unavailable');
  }
  matchingRetry(state, normalized, requestHash);
  return {
    ...await setupResult(operator, target, state, blocked, access),
    installation: { ...target, installationId: state.installation_id, repositoryId: state.repository_id },
    schemaVersion: memorySchemaVersion, appliedMigrations,
  };
}

export async function readMemorySetupStatus(operator, input) {
  exactKeys(input, ['installation']);
  const target = resourceTarget(input.installation, true);
  const state = await readInstallation(operator, target);
  requireValue(state !== null, 'installation-conflict');
  sameIds(state, input.installation);
  const resources = await inspectResources(operator, target);
  const access = storedAccess(state);
  const blocked = await inspectProtection(operator, target, access, resources);
  // Deliberately no device proof parameter: a different machine's grant is irrelevant.
  return setupResult(operator, target, state, blocked, access);
}
