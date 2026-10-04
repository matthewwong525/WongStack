import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { evaluateMemoryContext, helperAcceptance, scoreContext, timingSummary } from '../evaluate-memory-context.mjs';
import { bytes } from '../../.agents/skills/memory/scripts/lib/extract-ledger.mjs';
import { EXTRACT_SYSTEM } from '../../.agents/skills/memory/scripts/lib/extract-host.mjs';

test('context scoring needs complete and critical sets, rejects forbidden facts and reports real sample counts', () => {
  const incomplete = scoreContext({ expected: ['a', 'b'], critical: ['b'], forbidden: ['x'], classification: 'regression' }, ['a', 'x']);
  assert.equal(incomplete.complete, false); assert.equal(incomplete.criticalRecall, 0); assert.equal(incomplete.regressionPreserved, false); assert.deepEqual(incomplete.forbidden, ['x']);
  assert.equal(scoreContext({ expected: [] }, []).complete, true);
  assert.equal(scoreContext({ expected: [] }, ['x']).complete, false);
  assert.deepEqual(timingSummary([1, 2, 3, 4]), { samples: 4, p50Ms: 2, p95Ms: 4, meanMs: 2.5, varianceMsSquared: 1.25 });
  assert.equal(helperAcceptance([], false).passed, false);
});

test('live acceptance requires twenty executions of every comparison mode', () => {
  const cases = ['direct-eight', 'direct-twenty', 'helper'].flatMap(mode => Array.from({ length: 20 }, (_, index) => ({
    mode, id: index % 2 ? 'synonym-only' : 'synonym-brief', repeat: index, forbidden: [], regressionPreserved: true, complete: true, criticalMatched: ['evidence'], status: 'selected',
  })));
  assert.equal(helperAcceptance(cases, true).passed, true);
  for (const mode of ['direct-eight', 'direct-twenty', 'helper']) {
    const absent = helperAcceptance(cases.filter(entry => entry.mode !== mode), true);
    assert.equal(absent.passed, false);
    assert.ok(absent.reasons.includes('fewer than twenty executions per mode'));
    const short = helperAcceptance(cases.filter((entry, index) => entry.mode !== mode || index % 20 !== 19), true);
    assert.equal(short.passed, false);
    assert.ok(short.reasons.includes('fewer than twenty executions per mode'));
  }
});

test('comparative evaluation isolates synthetic data, shares packet caps, and labels recorded evidence', async t => {
  let root;
  const report = await evaluateMemoryContext({ repeats: 1, onSetup: env => { root = env.repo.root; }, hostFactory: () => ({
    supported: true, inputBytes: text => bytes(EXTRACT_SYSTEM) + bytes(text),
    async call(text) { const prompt = JSON.parse(text); return { text: JSON.stringify({ version: 1, select: prompt.candidates.map(fact => fact.id).slice(0, 20), queries: [], gaps: [] }), usage: null, model: 'recorded-fixture' }; }, close() {},
  }) });
  assert.equal(report.evidence, 'recorded protocol'); assert.equal(report.acceptance.passed, false); assert.equal(report.acceptance.guidanceEnabled, false);
  assert.equal(existsSync(root), false);
  assert.ok(Object.values(report.modes).every(mode => mode.samples >= 20));
  assert.ok(report.cases.every(entry => entry.outputBytes <= 3072 && entry.forbidden.length === 0));
  assert.ok(report.cases.filter(entry => entry.mode === 'helper').every(entry => entry.tokenUsage === 'unknown' && entry.storeRequests >= 1));
  assert.ok(report.cases.filter(entry => entry.mode !== 'helper').every(entry => entry.modelCalls === 0 && entry.inputBytes === 0));
  assert.equal(report.failed, false);
  assert.ok(report.cases.every(entry => entry.returned.every(key => typeof key === 'string')), 'all modes report comparable semantic fixture keys');
  assert.ok(report.cases.some(entry => entry.id === 'combined-recall' && entry.critical.length === 2));
  const shipping = report.cases.filter(entry => entry.id === 'broad-shipping-review');
  const eight = shipping.find(entry => entry.mode === 'direct-eight');
  const twenty = shipping.find(entry => entry.mode === 'direct-twenty');
  assert.deepEqual(eight.critical, ['shipping-approval']);
  assert.equal(eight.returned.length, 8); assert.deepEqual(eight.criticalMatched, []); assert.equal(eight.complete, false);
  assert.equal(twenty.returned.length, 12); assert.deepEqual(twenty.criticalMatched, ['shipping-approval']); assert.equal(twenty.complete, true);
  assert.ok(twenty.outputBytes <= 3072, 'twenty keeps the critical fact without a larger packet allowance');
  // A scripted selection supplies protocol evidence only, regardless of this fixture's coverage.
  assert.equal(report.evidence, 'recorded protocol'); assert.equal(report.acceptance.passed, false);
  t.diagnostic(`BEGIN SYNTHETIC HELPER PROTOCOL EVALUATION\n${JSON.stringify({ evidence: report.evidence, packetBytes: report.packetBytes, repeats: report.repeats, modes: report.modes, acceptance: report.acceptance, failed: report.failed, cases: report.cases.map(({ id, mode, repeat, complete, criticalMatched, returned, forbidden, regressionPreserved, status, outputBytes, modelCalls, storeRequests, tokenUsage }) => ({ id, mode, repeat, complete, criticalMatched, returned, forbidden, regressionPreserved, status, outputBytes, modelCalls, storeRequests, tokenUsage })) })}\nEND SYNTHETIC HELPER PROTOCOL EVALUATION`);
});

test('live evaluation requires explicit supported host and cannot accept deterministic fallback', async () => {
  await assert.rejects(evaluateMemoryContext({ live: true, agent: 'codex' }), /explicit --agent claude/);
  await assert.rejects(evaluateMemoryContext({ repeats: 0 }), /repeats/);
  const report = await evaluateMemoryContext();
  assert.match(report.evidence, /no model quality/); assert.equal(report.acceptance.passed, false);
  assert.ok(report.acceptance.reasons.includes('helper fallback or unavailable'));
});
