import { canonicalMemoryValue } from '../../../.agents/skills/memory/scripts/lib/installation-resources.mjs';
// Source-only disposable probe. Planning is pure: no transport, credentials or resource creation.
import { migrationManifestHash } from '../../../.agents/skills/memory/scripts/lib/installation-state.mjs';
import { digest } from '../../../.agents/skills/memory/scripts/lib/installation-validation.mjs';

export class ProbeError extends Error {
  constructor(code) { super(code); this.name = 'ProbeError'; this.code = code; }
}
export function need(value, code) { if (!value) throw new ProbeError(code); }
const sha = value => typeof value === 'string' && value.length === 40 && /^[a-f0-9]{40}$/.test(value);
const uuid = value => typeof value === 'string' && value.length === 36 && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);

export async function planMemoryRestProbe(manifest, input) {
  need(input?.protocolVersion === 2 && typeof input.runId === 'string' && input.runId.length === 32 && /^[a-f0-9]{32}$/.test(input.runId) && sha(input.sourceRevision), 'invalid-probe-input');
  need(manifest?.version === 1 && manifest.sourceGate?.sourceCommit === input.sourceRevision &&
    manifest.sourceGate.requiredChecks === 'SUCCESS', 'source-gate-required');
  const snapshot = input.snapshot;
  const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) && value.length === 64;
  need(snapshot && Object.keys(snapshot).length === 4 && snapshot.sourceRevision === input.sourceRevision &&
    snapshot.schemaVersion === 11 && snapshot.manifestHash === await migrationManifestHash() && hash(snapshot.assetDigest) &&
    JSON.stringify(canonicalMemoryValue(snapshot)) === JSON.stringify(canonicalMemoryValue(manifest.sourceGate.snapshot)), 'snapshot-mismatch');
  need(input.initialization == null ? input.protectionDigest === null || hash(input.protectionDigest) : hash(input.protectionDigest), 'protection-pins-required');
  need(typeof manifest.account === 'string' && /^[a-f0-9]{32}$/.test(manifest.account) &&
    typeof manifest.prefix === 'string' && /^[a-z0-9-]{1,40}$/.test(manifest.prefix), 'invalid-manifest');
  const target = input.target;
  need(target && target.accountId === manifest.account && uuid(target.databaseId) &&
    typeof target.databaseName === 'string' && /^[a-z0-9-]{1,100}$/.test(target.databaseName), 'invalid-target');
  need(Array.isArray(manifest.resources), 'ownership-receipt-required');
  const matches = manifest.resources.filter(row => row?.kind === 'd1' && (row.id === target.databaseId || row.name === target.databaseName));
  need(matches.length === 1, 'ownership-receipt-required');
  const owned = matches[0];
  need(owned.environment === 'memory' && owned.status === 'created' && owned.id === target.databaseId &&
    owned.name === target.databaseName && owned.name.startsWith(`${manifest.prefix}-`) && owned.name.endsWith('-memory') &&
    owned.receipt?.uuid === target.databaseId && owned.receipt?.name === target.databaseName &&
    owned.receipt?.accountId === manifest.account && owned.receipt?.source === 'create-response', 'ownership-receipt-required');
  const installation = input.initialization ?? null;
  if (installation !== null) need(installation.target?.accountId === target.accountId && installation.target?.databaseId === target.databaseId &&
    installation.expectedInstallation === null && typeof installation.operationId === 'string' && installation.operationId.length >= 32, 'initialization-target-mismatch');
  const base = {
    protocolVersion: 2, sourceRevision: input.sourceRevision, runId: input.runId,
    snapshot: { sourceRevision: snapshot.sourceRevision, schemaVersion: snapshot.schemaVersion, manifestHash: snapshot.manifestHash, assetDigest: snapshot.assetDigest }, protectionDigest: input.protectionDigest,
    target: { accountId: target.accountId, databaseId: target.databaseId, databaseName: target.databaseName, environment: 'memory' },
    ownershipDigest: await digest(JSON.stringify({ account: manifest.account, prefix: manifest.prefix,
      id: owned.id, name: owned.name, environment: owned.environment,
      receipt: { uuid: owned.receipt.uuid, name: owned.receipt.name, accountId: owned.receipt.accountId, source: owned.receipt.source } })),
    initializationDigest: installation === null ? null : await digest(JSON.stringify(installation)),
    tablePrefix: `wong_memory_probe_${input.runId}`,
    phases: ['transport', ...(installation === null ? [] : ['initialization'])],
    limits: { transportCalls: 30, initializationCalls: 300, parallelInitializers: 3, requestTimeoutMs: 20000, barrierTimeoutMs: 20000 },
    executionAuthorized: false, createsResources: false, officialGuarantee: false, integrationReleased: false,
  };
  return { ...base, planDigest: await digest(JSON.stringify(base)) };
}

export async function checkedPlan(context, input, expected) {
  need(typeof context?.cloudflare === 'function' && typeof context?.record === 'function' && typeof context?.readManifest === 'function', 'private-context-required');
  let manifest;
  try { manifest = await context.readManifest(); } catch { throw new ProbeError('manifest-read-failed'); }
  const fresh = await planMemoryRestProbe(manifest, input);
  need(expected?.protocolVersion === 2 && fresh.planDigest === expected?.planDigest, 'plan-changed');
  need(typeof context.readSnapshotReceipt === 'function', 'snapshot-verification-required');
  let observed;
  try { observed = await context.readSnapshotReceipt(); } catch { throw new ProbeError('snapshot-verification-required'); }
  need(JSON.stringify(canonicalMemoryValue(observed)) === JSON.stringify(canonicalMemoryValue(fresh.snapshot)), 'snapshot-mismatch');
  return fresh;
}

export async function record(context, value) {
  try { await context.record(value); } catch { throw new ProbeError('evidence-write-failed'); }
}

export function phaseRecord(plan, phase, status, details = {}) {
  return { protocolVersion: 2, snapshot: plan.snapshot, protectionDigest: plan.protectionDigest, phase, status, runId: plan.runId, sourceRevision: plan.sourceRevision, planDigest: plan.planDigest,
    target: plan.target, officialGuarantee: false, integrationReleased: false, ...details };
}
