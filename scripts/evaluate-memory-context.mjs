// Meta-only. Current host auth is used only with --live; all fact data is synthetic.
import { readFacts } from '../.agents/skills/memory/scripts/lib/read-facts.mjs';
import { extractMemory } from '../.agents/skills/memory/scripts/lib/extract.mjs';
import { bytes, issueTask, scopeOf } from '../.agents/skills/memory/scripts/lib/extract-ledger.mjs';
import { renderExtractPacket } from '../.agents/skills/memory/scripts/lib/extract-packet.mjs';
import { setup } from './tests/fixtures/memory/harness.mjs';
import { loadFixture, permissionForbidden, seed } from './evaluate-memory-search.mjs';
export function scoreContext(question, returned) {
  const expected = question.expected || (question.finds ? [question.finds] : []), critical = question.critical || expected;
  const forbidden = returned.filter(key => (question.forbidden || []).includes(key));
  const matched = expected.filter(key => returned.includes(key)), criticalMatched = critical.filter(key => returned.includes(key));
  const complete = expected.length ? matched.length === expected.length : returned.length === 0;
  const regressionPreserved = question.classification !== 'regression' || (expected.length ? expected.every(key => returned.slice(0, 3).includes(key)) : returned.length === 0);
  return { expected, critical, matched, criticalMatched, complete, criticalRecall: critical.length ? criticalMatched.length / critical.length : Number(returned.length === 0), returned, unexpected: returned.filter(key => !expected.includes(key)), forbidden, regressionPreserved };
}
export function timingSummary(values) {
  const sorted = [...values].sort((a, b) => a - b), mean = values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
  return { samples: values.length, p50Ms: sorted[Math.max(0, Math.ceil(sorted.length * .5) - 1)] ?? null, p95Ms: sorted[Math.max(0, Math.ceil(sorted.length * .95) - 1)] ?? null, meanMs: mean, varianceMsSquared: values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length || 1) };
}
export function helperAcceptance(cases, live) {
  const reasons = [];
  if (!live) reasons.push('live evidence missing');
  const helpers = cases.filter(entry => entry.mode === 'helper');
  if (['direct-eight', 'direct-twenty', 'helper'].some(mode => cases.filter(entry => entry.mode === mode).length < 20)) reasons.push('fewer than twenty executions per mode');
  if (cases.some(entry => entry.forbidden.length)) reasons.push('forbidden evidence');
  if (helpers.some(entry => !entry.regressionPreserved)) reasons.push('regression loss');
  if (helpers.some(entry => !['selected', 'partial', 'empty'].includes(entry.status))) reasons.push('helper fallback or unavailable');
  for (const helper of helpers) {
    const direct = cases.find(entry => entry.mode === 'direct-twenty' && entry.id === helper.id && entry.repeat === helper.repeat);
    if (!direct || direct.criticalMatched.some(key => !helper.criticalMatched.includes(key))) { reasons.push('critical-fact loss against direct-twenty'); break; }
  }
  for (const id of ['synonym-only', 'synonym-brief']) if (!helpers.some(entry => entry.id === id) || helpers.filter(entry => entry.id === id).some(entry => !entry.complete)) reasons.push(`${id} not recovered`);
  return { passed: !reasons.length, reasons: [...new Set(reasons)], guidanceEnabled: false };
}
export async function evaluateMemoryContext({ fixture = loadFixture(), live = false, agent, model, repeats = 1, hostFactory, onSetup = () => {} } = {}) {
  if (!Number.isSafeInteger(repeats) || repeats < 1 || repeats > 20) throw new Error('repeats must be 1–20');
  if (live && agent !== 'claude') throw new Error('live evaluation requires explicit --agent claude; Codex has no verified tool-free adapter');
  const cleanup = []; let env;
  try {
    env = await setup({ after: callback => cleanup.push(callback) }); onSetup(env);
    const keys = seed(env, fixture);
    const ctx = { root: env.repo.root, commonDir: env.repo.root, stateDir: env.repo.stateDir, machineId: env.repo.machineId, author: 'dev@example.com' };
    const cases = [];
    for (let repeat = 0; repeat < repeats; repeat += 1) {
      for (const [index, question] of [...fixture.questions, ...(fixture.diagnosticQuestions || []), ...(fixture.contextQuestions || [])].entries()) {
        const scoped = { ...question, forbidden: permissionForbidden(fixture, question) }, scope = scopeOf(question.filters);
        for (const mode of ['direct-eight', 'direct-twenty', 'helper']) {
          let requests = 0;
          const store = { config: { team: true }, role: 'admin', ownerMachineId: env.repo.machineId, async query(sql, params = []) { requests += 1; return env.fake.db.prepare(sql).all(...params).map(row => ({ ...row })); } };
          const started = Date.now(); let packet, report;
          if (mode === 'helper') {
            const task = issueTask(ctx, 'synthetic-evaluation');
            const host = hostFactory ? hostFactory({ question, keys, repeat }) : live ? undefined : { supported: false, reason: 'unsupported_host' };
            packet = await extractMemory(ctx, { task, identity: 'synthetic-evaluation', scope, question: question.query, agent, model }, { store, ...(host ? { host } : {}) });
            report = packet.report;
          } else {
            const data = await readFacts(ctx, { values: { ...scope, limit: mode === 'direct-eight' ? 8 : 20 }, positionals: [question.query] }, store);
            packet = renderExtractPacket(data.facts, { status: data.facts.length ? 'selected' : 'empty' });
            report = { inputBytes: 0, outputBytes: bytes(packet.text), modelCalls: 0, storeRequests: requests, tokenUsage: 'not applicable', usage: [], model: null, status: 'direct', elapsedMs: Date.now() - started };
          }
          const returned = packet.ids.map(id => { if (!keys.has(id)) throw new Error('fabricated fixture ID'); return keys.get(id); });
          cases.push({ id: question.id || `regression-${index + 1}`, mode, repeat, classification: question.classification || 'regression', ...scoreContext(scoped, returned), ...report });
        }
      }
    }
    const modes = {};
    for (const mode of ['direct-eight', 'direct-twenty', 'helper']) {
      const entries = cases.filter(entry => entry.mode === mode);
      modes[mode] = { ...timingSummary(entries.map(entry => entry.elapsedMs)), completeSets: entries.filter(entry => entry.complete).length, failures: entries.filter(entry => ['denied', 'unavailable', 'fallback'].includes(entry.status)).length, inputBytes: entries.reduce((sum, entry) => sum + entry.inputBytes, 0), outputBytes: entries.reduce((sum, entry) => sum + entry.outputBytes, 0), modelCalls: entries.reduce((sum, entry) => sum + entry.modelCalls, 0), storeRequests: entries.reduce((sum, entry) => sum + entry.storeRequests, 0), tokenUsage: entries.every(entry => entry.tokenUsage !== 'unknown') ? 'reported or not applicable' : 'unknown', perCaseTiming: Object.fromEntries([...new Set(entries.map(entry => entry.id))].map(id => [id, timingSummary(entries.filter(entry => entry.id === id).map(entry => entry.elapsedMs))])) };
      modes[mode].providerTokens = Object.fromEntries(['input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens'].map(key => {
        const usage = entries.flatMap(entry => entry.usage);
        return [key, mode !== 'helper' ? 0 : !usage.length || usage.some(value => !Number.isFinite(value?.[key])) ? null : usage.reduce((sum, value) => sum + value[key], 0)];
      }));
    }
    const acceptance = helperAcceptance(cases, live && !hostFactory);
    return { version: 1, synthetic: true, evidence: hostFactory ? 'recorded protocol' : live ? 'live host; synthetic facts' : 'deterministic fallback; no model quality evidence', packetBytes: 3072, repeats, modes, cases, acceptance, failed: (live && !acceptance.passed) || cases.some(entry => entry.forbidden.length || (entry.mode !== 'helper' && !entry.regressionPreserved)), caveat: 'Packet bytes do not measure total tokens or production latency. Timing samples mix question types; per-case repeated variance is reported separately.' };
  } finally { for (const callback of cleanup.reverse()) await callback(); env?.fake.db.close(); }
}
