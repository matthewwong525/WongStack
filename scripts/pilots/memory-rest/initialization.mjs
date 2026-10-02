import { initializeMemoryInstallation, readMemorySetupStatus } from '../../../.agents/skills/memory/scripts/lib/installation-operator.mjs';
import { inspectResources, inspectProtection } from '../../../.agents/skills/memory/scripts/lib/installation-resources.mjs';
import { resourceTarget, accessConfiguration } from '../../../.agents/skills/memory/scripts/lib/installation-validation.mjs';
import { memorySchemaVersion } from '../../../.agents/skills/memory/scripts/lib/installation-migrations.mjs';
import { checkedPlan, need, phaseRecord, ProbeError, record } from './plan.mjs';
import { boundedTransport, emptyTarget, query } from './transport.mjs';

function barrier(size, timeout) {
  let arrived = 0; let timer; let release; let reject;
  const ready = new Promise((resolve, fail) => { release = resolve; reject = fail; });
  ready.catch(() => {}); // An early validation failure can abort before any caller arrives.
  return {
    async arrive() {
      if (++arrived === 1) timer = setTimeout(() => reject(new ProbeError('initializer-barrier-timeout')), timeout);
      if (arrived === size) { clearTimeout(timer); release(); }
      await ready;
    },
    abort() { clearTimeout(timer); reject(new ProbeError('initializer-barrier-aborted')); },
    close() { clearTimeout(timer); },
  };
}

async function closedProtection(transport, input) {
  const target = resourceTarget(input.target);
  const access = accessConfiguration(input.access);
  need(access !== null, 'protected-bootstrap-required');
  const operator = { cloudflare: transport };
  const resources = await inspectResources(operator, target);
  need(await inspectProtection(operator, target, access, resources) === null, 'protected-bootstrap-required');
  for (const id of new Set([access.appApplicationId, access.memoryApplicationId])) {
    const app = await transport('GET', `/accounts/${target.accountId}/access/apps/${id}`);
    need(Array.isArray(app?.destinations) && app.destinations.every(row => row &&
      (row.overrides === undefined || Array.isArray(row.overrides) && row.overrides.length === 0)), 'closed-access-required');
  }
}

async function transportProof(context, plan) {
  need(typeof context.readTransportEvidence === 'function', 'transport-evidence-required');
  let evidence;
  try { evidence = await context.readTransportEvidence(plan.runId); }
  catch { throw new ProbeError('transport-evidence-required'); }
  need(evidence?.phase === 'transport' && evidence.status === 'PASS' && evidence.planDigest === plan.planDigest &&
    evidence.runId === plan.runId && evidence.sourceRevision === plan.sourceRevision && evidence.target?.accountId === plan.target.accountId &&
    evidence.target.databaseId === plan.target.databaseId && evidence.target.databaseName === plan.target.databaseName && evidence.target.environment === 'memory' &&
    evidence.positiveObserved === true && evidence.rollbackObserved === true && evidence.emptyAfterCleanup === true &&
    evidence.officialGuarantee === false && evidence.integrationReleased === false, 'transport-evidence-required');
}

// Separate mutation entrypoint; a transport PASS does not invoke or authorize this phase.
export async function runMemoryInitializationProbe(context, input, expectedPlan) {
  const plan = await checkedPlan(context, input, expectedPlan);
  need(plan.initializationDigest !== null && typeof context.readMigration === 'function', 'initialization-input-required');
  await transportProof(context, plan);
  const transport = boundedTransport(context, plan, plan.limits.initializationCalls);
  const start = barrier(3, plan.limits.barrierTimeoutMs);
  await record(context, phaseRecord(plan, 'initialization', 'INTENT', { retainsInstallation: true }));
  try {
    await emptyTarget(transport, plan);
    await closedProtection(transport, input.initialization);
    const conflicting = { ...input.initialization, operationId: `probe_conflict_${plan.runId}` };
    need(conflicting.operationId !== input.initialization.operationId, 'conflict-operation-required');
    let arrivals = 0; let lostResponses = 0;
    const operator = {
      readMigration: filename => context.readMigration(filename),
      cloudflare: async (method, path, body) => {
        if (!body?.batch) return transport(method, path, body);
        need(++arrivals <= 3, 'unexpected-initialization-write');
        await start.arrive();
        const value = await transport(method, path, body);
        if (lostResponses === 0 && Array.isArray(value) && value.length > 0 && value.every(row => row?.success === true)) {
          lostResponses++;
          // Deliberately discard one observed successful response, not a real network-loss claim.
          throw new ProbeError('simulated-response-loss');
        }
        return value;
      },
    };
    const attempts = [input.initialization, input.initialization, conflicting];
    const results = await Promise.allSettled(attempts.map(attempt => initializeMemoryInstallation(operator, attempt).catch(error => { start.abort(); throw error; })));
    need(arrivals === 3 && lostResponses === 1, 'concurrency-not-observed');
    const successes = results.map((result, index) => ({ result, index })).filter(row => row.result.status === 'fulfilled');
    need(successes.length > 0 && successes.length < 3, 'initializer-outcome-invalid');
    const winner = successes[0];
    const operationId = attempts[winner.index].operationId;
    const installation = winner.result.value.installation;
    for (const [index, result] of results.entries()) {
      if (attempts[index].operationId === operationId) {
        need(result.status === 'fulfilled' && JSON.stringify(result.value.installation) === JSON.stringify(installation) &&
          result.value.schemaVersion === memorySchemaVersion && result.value.memory.status === 'pending-owner', 'identical-retry-diverged');
      } else need(result.status === 'rejected' && result.reason?.code === 'installation-conflict', 'conflicting-retry-accepted');
    }
    const normalOperator = { cloudflare: transport, readMigration: operator.readMigration };
    const retry = await initializeMemoryInstallation(normalOperator, attempts[winner.index]);
    need(JSON.stringify(retry.installation) === JSON.stringify(installation) && retry.appliedMigrations.length === 0, 'completed-retry-diverged');
    const status = await readMemorySetupStatus(normalOperator, { installation });
    need(status.memory.status === 'pending-owner' && status.memory.reason === 'owner-unconfirmed', 'unexpected-memory-authority');
    const receipts = await query(transport, plan, 'SELECT count(*) n FROM memory_bootstrap_completion');
    need(receipts.length === 1 && receipts[0].n === 1, 'completion-receipt-invalid');
    for (const table of ['memory_principals', 'memory_memberships', 'memory_devices', 'memory_credentials', 'memory_keys', 'memory_admins']) {
      const counts = await query(transport, plan, `SELECT count(*) n FROM ${table}`);
      need(counts.length === 1 && counts[0].n === 0, 'unexpected-memory-authority');
    }
    const result = phaseRecord(plan, 'initialization', 'PASS', { installation, memory: status.memory,
      simultaneousAttempts: 3, conflictingOperationDenied: true, simulatedResponseLoss: true, stableRetry: true, retainsInstallation: true });
    await record(context, result);
    return result;
  } catch (error) {
    const code = error instanceof ProbeError ? error.code : 'initializer-or-provider-failure';
    await record(context, phaseRecord(plan, 'initialization', 'FAIL', { code, retainForInspection: true }));
    throw new ProbeError(code);
  } finally { start.close(); }
}
