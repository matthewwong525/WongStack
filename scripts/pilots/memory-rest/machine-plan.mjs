// Pure separately versioned schema12 planning. No old runner, credential or provider dispatch.
import { machineMigrations } from '../../../.agents/skills/memory/scripts/lib/machine-migrations.mjs';
import { machineManifestHash, machineHash } from '../../../.agents/skills/memory/scripts/lib/machine-state.mjs';
import { resourceTarget } from '../../../.agents/skills/memory/scripts/lib/installation-validation.mjs';
import { sameMachineValue, machineDigest } from '../../../.agents/skills/memory/scripts/lib/machine-operator.mjs';

export class MachineProbePlanError extends Error {
  constructor(code) { super(code); this.name = 'MachineProbePlanError'; this.code = code; }
}
const need = (condition, code) => { if (!condition) throw new MachineProbePlanError(code); };
export const machineProbeAssets = Object.freeze([
  ...machineMigrations.map(row => `.agents/skills/memory/migrations/${row.filename}`),
  ...['machine-migrations','machine-state','machine-operator','machine-enrollment','installation-migrations',
    'installation-validation','installation-resources'].map(name => `.agents/skills/memory/scripts/lib/${name}.mjs`),
  'scripts/lib-access-config.mjs', 'scripts/pilots/memory-rest/machine-plan.mjs',
]);

function exact(value, fields, code = 'invalid-machine-probe-input') {
  need(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === fields.length
    && fields.every(key => Object.hasOwn(value, key)), code);
}
function phaseEvidence(evidence, phase, snapshot, input) {
  exact(evidence, ['protocolVersion','phase','status','sourceRevision','snapshot','target','pinHash','planDigest','evidenceDigest'], 'machine-phase-evidence-required');
  need(evidence.protocolVersion === 3 && evidence.phase === phase && evidence.status === 'observed-pass'
    && evidence.sourceRevision === input.sourceRevision && sameMachineValue(evidence.snapshot, snapshot)
    && sameMachineValue(evidence.target, input.target) && evidence.pinHash === input.pinHash
    && machineDigest(evidence.planDigest) && machineDigest(evidence.evidenceDigest), 'machine-phase-evidence-required');
}

export async function planMachineMemoryProbe(manifest, input) {
  exact(input, ['protocolVersion','runId','sourceRevision','snapshot','target','pinHash','phase','phaseInput','priorEvidence']);
  need(input.protocolVersion === 3 && /^[a-f0-9]{32}$/.test(input.runId) && /^[a-f0-9]{40}$/.test(input.sourceRevision)
    && ['transport','initialization','grant'].includes(input.phase) && machineDigest(input.pinHash), 'invalid-machine-probe-input');
  need(manifest?.version === 2 && manifest.sourceGate?.sourceCommit === input.sourceRevision
    && manifest.sourceGate.requiredChecks === 'SUCCESS', 'machine-source-gate-required');
  exact(input.snapshot, ['sourceRevision','schemaVersion','manifestHash','assetDigest'], 'machine-snapshot-mismatch');
  const snapshot = input.snapshot, assets = manifest.sourceGate.assets;
  need(snapshot.sourceRevision === input.sourceRevision && snapshot.schemaVersion === 12 && snapshot.manifestHash === await machineManifestHash()
    && machineDigest(snapshot.assetDigest) && sameMachineValue(snapshot, manifest.sourceGate.snapshot), 'machine-snapshot-mismatch');
  need(Array.isArray(assets) && assets.length === machineProbeAssets.length
    && new Set(assets.map(row => row?.path)).size === assets.length
    && machineProbeAssets.every(path => assets.some(row => row?.path === path && machineDigest(row.sha256)))
    && assets.every(row => Object.keys(row).length === 2), 'machine-asset-inventory-mismatch');
  need(await machineHash(assets) === snapshot.assetDigest, 'machine-snapshot-mismatch');
  for (const migration of machineMigrations) need(assets.find(row => row.path === `.agents/skills/memory/migrations/${migration.filename}`).sha256 === migration.sha256,
    'machine-asset-inventory-mismatch');
  const target = input.target;
  exact(target, ['accountId','databaseId','databaseName']);
  need(typeof manifest.account === 'string' && /^[a-f0-9]{32}$/.test(manifest.account) && target.accountId === manifest.account
    && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(target.databaseId)
    && typeof manifest.prefix === 'string' && /^[a-z0-9-]{1,40}$/.test(manifest.prefix)
    && typeof target.databaseName === 'string' && /^[a-z0-9-]{1,100}$/.test(target.databaseName), 'invalid-machine-probe-target');
  need(Array.isArray(manifest.resources), 'machine-ownership-receipt-required');
  const matches = manifest.resources.filter(row => row?.kind === 'd1' && (row.id === target.databaseId || row.name === target.databaseName));
  need(matches.length === 1, 'machine-ownership-receipt-required');
  const owned = matches[0];
  need(owned.environment === 'memory' && owned.status === 'created' && owned.id === target.databaseId && owned.name === target.databaseName
    && owned.name.startsWith(`${manifest.prefix}-`) && owned.name.endsWith('-memory')
    && owned.receipt?.source === 'create-response' && owned.receipt.accountId === target.accountId
    && owned.receipt.uuid === target.databaseId && owned.receipt.name === target.databaseName, 'machine-ownership-receipt-required');
  need(Array.isArray(input.priorEvidence), 'machine-phase-evidence-required');
  if (input.phase === 'transport') need(input.phaseInput === null && input.priorEvidence.length === 0, 'machine-phase-input-mismatch');
  else {
    need(input.priorEvidence.length === (input.phase === 'grant' ? 2 : 1), 'machine-phase-evidence-required');
    phaseEvidence(input.priorEvidence[0], 'transport', snapshot, input);
    if (input.phase === 'grant') phaseEvidence(input.priorEvidence[1], 'initialization', snapshot, input);
    need(input.phaseInput && typeof input.phaseInput === 'object' && !Array.isArray(input.phaseInput), 'machine-phase-input-mismatch');
    const initialization = input.phase === 'initialization' ? input.phaseInput.target : input.phaseInput.installation;
    let pinned;
    try { pinned = resourceTarget(initialization, input.phase === 'grant'); } catch { throw new MachineProbePlanError('machine-phase-input-mismatch'); }
    need(pinned.accountId === target.accountId && pinned.databaseId === target.databaseId, 'machine-phase-input-mismatch');
    if (input.phase === 'initialization') {
      exact(input.phaseInput, ['target','operationId','expectedInstallation','pinHash'], 'machine-phase-input-mismatch');
      need(input.phaseInput.expectedInstallation === null && /^[a-zA-Z0-9_-]{32,128}$/.test(input.phaseInput.operationId)
        && input.phaseInput.pinHash === input.pinHash, 'machine-phase-input-mismatch');
    } else {
      // Future grant runner is absent. A phase plan binds only a reviewed private input digest.
      exact(input.phaseInput, ['installation','operationInputDigest','pinHash'], 'machine-phase-input-mismatch');
      need(machineDigest(input.phaseInput.operationInputDigest) && input.phaseInput.pinHash === input.pinHash, 'machine-phase-input-mismatch');
    }
  }
  const base = { protocolVersion: 3, phase: input.phase, runId: input.runId, sourceRevision: input.sourceRevision,
    snapshot, target, pinHash: input.pinHash,
    ownershipDigest: await machineHash({ account: manifest.account, prefix: manifest.prefix, id: owned.id, name: owned.name,
      environment: owned.environment, receipt: { uuid: owned.receipt.uuid, name: owned.receipt.name, accountId: owned.receipt.accountId, source: owned.receipt.source } }),
    phaseInputDigest: input.phaseInput === null ? null : await machineHash(input.phaseInput),
    priorEvidenceDigest: await machineHash(input.priorEvidence), executionAuthorized: false, createsResources: false,
    officialGuarantee: false, integrationReleased: false, ready: false };
  return { ...base, planDigest: await machineHash(base) };
}
