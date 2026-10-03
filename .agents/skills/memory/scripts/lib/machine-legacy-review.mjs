// Explicit nonsecret operator decisions. A review intent grants no data access.
import { exactKeys, opaqueId, requireValue, resourceTarget } from './installation-validation.mjs';
import { legacyHash, legacyDigest, legacyText, freezeLegacy, retainedLegacyInventory } from './machine-legacy-inventory.mjs';
import { boundLegacyProjection, inspectLegacyClosure, legacyReadback } from './machine-legacy-closure.mjs';

async function ownership(inventory, proof) {
 requireValue(proof && typeof proof === 'object', 'legacy-ownership-unproven');
 if (proof.kind === 'original-creation') {
  exactKeys(proof, ['kind', 'accountId', 'databaseId', 'method', 'path', 'receiptHash']);
  requireValue(proof.accountId === inventory.target.accountId && proof.databaseId === inventory.target.databaseId && proof.method === 'POST'
   && proof.path === `/accounts/${proof.accountId}/d1/database` && legacyDigest(proof.receiptHash), 'legacy-ownership-unproven');
 } else {
  exactKeys(proof, ['kind', 'accountId', 'databaseId', 'decisionId', 'operatorAuthorityHash', 'resourceReadbackHash', 'backupHash', 'evidenceRef']);
  requireValue(proof.kind === 'reviewed-adoption' && proof.accountId === inventory.target.accountId && proof.databaseId === inventory.target.databaseId
   && opaqueId(proof.decisionId) && legacyDigest(proof.operatorAuthorityHash) && legacyDigest(proof.resourceReadbackHash)
   && proof.backupHash === inventory.source.backupHash && legacyText(proof.evidenceRef), 'legacy-ownership-unproven');
 }
 requireValue(await legacyHash(proof) === inventory.source.resourceOwnershipHash, 'legacy-ownership-unproven');
}
function destination(value, inventory) {
 exactKeys(value, ['installation', 'machineId', 'grantId', 'machineCommitment', 'machineRevision', 'grantRevision', 'credentialGeneration', 'scope', 'grantEvidenceHash']);
 const target = resourceTarget(value.installation, true);
 requireValue(JSON.stringify(target) === JSON.stringify(inventory.target) && opaqueId(value.machineId) && opaqueId(value.grantId)
  && legacyDigest(value.machineCommitment) && legacyDigest(value.grantEvidenceHash)
  && ['machineRevision', 'grantRevision', 'credentialGeneration'].every(key => Number.isSafeInteger(value[key]) && value[key] >= 1)
  && ['memory:read', 'memory:read memory:write', 'memory:read memory:write memory:admin'].includes(value.scope), 'legacy-destination-unproven');
 if (inventory.history.installationId !== null) requireValue(value.installation.installationId === inventory.history.installationId
  && value.installation.repositoryId === inventory.history.repositoryId, 'legacy-destination-unproven');
}
export async function reviewLegacyMemory(adapter, inventory, input) {
 retainedLegacyInventory(inventory); boundLegacyProjection(input);
 exactKeys(input, ['decisionId', 'inventoryHash', 'ownership', 'destination', 'mappings', 'unmapped', 'closure']);
 requireValue(opaqueId(input.decisionId) && input.inventoryHash === inventory.inventoryHash && input.unmapped === 'admin-only'
  && ['pending', 'require-readbacks'].includes(input.closure), 'legacy-review-invalid');
 await ownership(inventory, input.ownership); destination(input.destination, inventory);
 requireValue(typeof adapter?.inspectDestination === 'function', 'legacy-destination-unproven');
 const actual = await legacyReadback(() => adapter.inspectDestination(input.destination), 'legacy-destination-unavailable');
 boundLegacyProjection(actual); exactKeys(actual, Object.keys(input.destination));
 requireValue(await legacyHash(actual) === await legacyHash(input.destination), 'legacy-destination-unproven');
 requireValue(Array.isArray(input.mappings) && input.mappings.length === inventory.selected.length, 'legacy-review-invalid');
 const seen = new Set();
 for (const mapping of input.mappings) {
  exactKeys(mapping, ['kind', 'id', 'snapshotHash', 'evidenceType', 'evidenceRef', 'evidenceHash']);
  const record = inventory.selected.find(row => row.kind === mapping.kind && row.id === mapping.id), key = JSON.stringify([mapping.kind, mapping.id]);
  requireValue(record && !seen.has(key) && mapping.snapshotHash === record.snapshotHash
   && ['operator-provenance', 'legacy-challenge'].includes(mapping.evidenceType) && legacyText(mapping.evidenceRef)
   && legacyDigest(mapping.evidenceHash), 'legacy-mapping-unproven'); seen.add(key);
 }
 requireValue(input.destination.scope !== 'memory:read' || inventory.selected.every(row => row.kind !== 'fact' || row.visibility !== 'shared'), 'legacy-reader-shared-refused');
 const closure = input.closure === 'require-readbacks' ? await inspectLegacyClosure(adapter, inventory) : null;
 const value = { version: 1, status: 'review-only', decisionId: input.decisionId, inventoryHash: inventory.inventoryHash,
  sourceVersion: inventory.sourceVersion, schemaHash: inventory.schemaHash, history: inventory.history,
  ownershipKind: input.ownership.kind, resourceOwnershipHash: inventory.source.resourceOwnershipHash, backupHash: inventory.source.backupHash,
  destination: input.destination, selected: inventory.selected, mappings: input.mappings, counts: inventory.counts, unmapped: 'admin-only', closure,
  requires: ['forward15-import-completion', 'fresh-closure-readbacks-before-authority', 'reviewed-protocol-transition'] };
 boundLegacyProjection(value);
 return freezeLegacy({ ...value, reviewHash: await legacyHash(value) });
}
