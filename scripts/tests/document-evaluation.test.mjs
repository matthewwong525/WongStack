import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hashText } from '../../.agents/skills/memory/scripts/lib/documents/corpus.mjs';
import { evaluateDocumentRetrieval, gradeRetrievalCase, loadRetrievalFixture, summarizeRetrieval } from '../evaluate-document-retrieval.mjs';

const packet = () => ({ version: 1, scope: 'current', backend: 'qmd', coverage: 'complete', requestedModeState: 'ok',
  facts: [], documents: [{ path: 'wiki/guide.md', role: 'wiki', freshness: 'verified', hash: 'a'.repeat(64), reference: 'wiki/guide.md:1', startLine: 1, endLine: 2, text: 'Original evidence.' }] });
test('source-reviewed fixture contains exact, paraphrase, history, obsolete, active and absent cases', () => {
  const fixture = loadRetrievalFixture(); assert.equal(fixture.version, 1);
  assert.ok(fixture.sources.every(source => /^[a-f0-9]{64}$/.test(source.hash) && !source.path.startsWith('wiki/people/')));
  for (const id of ['exact-gate', 'paraphrase-persistence', 'historical-reason', 'obsolete-current-conflict', 'active-proposal', 'absent-answer'])
    assert.ok(fixture.cases.some(item => item.id === id));
});
test('grading detects planted evidence, stale hashes, wrong authority and fallback masquerading as semantics', () => {
  const item = { id: 'sample', scope: 'current', expected: ['wiki/guide.md'], required: true };
  assert.equal(gradeRetrievalCase(item, packet()).passes, true);
  assert.equal(gradeRetrievalCase({ ...item, passageTerms: ['supporting rationale'] }, packet()).passes, false, 'correct path with unrelated passage is not success');
  for (const bad of [{ ...packet(), backend: 'lexical-fallback' }, { ...packet(), coverage: 'partial' },
    { ...packet(), documents: [{ ...packet().documents[0], freshness: 'stale' }] },
    { ...packet(), documents: [{ ...packet().documents[0], role: 'archive' }] },
    { ...packet(), documents: [{ ...packet().documents[0], hash: 'invented' }] }]) assert.equal(gradeRetrievalCase(item, bad).passes, false);
  const absent = { id: 'absent', absent: true, required: true, scope: 'current' };
  assert.equal(gradeRetrievalCase(absent, packet(), { mode: 'keyword' }).passes, false);
  assert.equal(gradeRetrievalCase(absent, packet()).absenceDiagnostic, true);
});
test('summary requires measured semantic recovery and preserved exact/current gates', () => {
  const item = { id: 'paraphrase', scope: 'current', expected: ['wiki/guide.md'], paraphrase: true, required: true };
  const result = { item, keyword: { grade: gradeRetrievalCase(item, { ...packet(), documents: [] }, { mode: 'keyword' }) }, auto: { grade: gradeRetrievalCase(item, packet()) } };
  assert.deepEqual(summarizeRetrieval([result]).semanticRecovery, ['paraphrase']); assert.equal(summarizeRetrieval([result]).pass, true);
  const exact = { ...item, id: 'exact', paraphrase: false };
  assert.equal(summarizeRetrieval([result, { ...result, item: exact }]).pass, false);
  assert.equal(summarizeRetrieval([{ ...result, keyword: result.auto }]).pass, false);
});

test('runner protocol checks original passages and lifecycle separately using explicitly synthetic CLI results', async () => {
  const fixture = loadRetrievalFixture();
  const run = async (cwd, args) => {
    const result = { ms: 5, bytes: 500, packet: {} };
    if (args[0] === 'documents-setup') return result;
    if (args[0] === 'documents-status') return { ...result, packet: { runtimeVersion: '2.8.3', semanticReady: true, deepReady: false } };
    if (args[0] === 'documents-refresh') return { ...result, packet: { state: 'ok' } };
    const question = args[1], mode = args[args.indexOf('--mode') + 1], item = fixture.cases.find(item => item.question === question);
    const synthetic = { ...packet(), sources: { facts: { state: 'unavailable' }, documents: { state: 'ok' } }, documents: [] };
    let path;
    if (question.includes('refreshcanary')) path = 'wiki/refresh-probe.md';
    else if (args[0] === 'recall') path = 'wiki/development/memory.md';
    else if (item && !item.absent && !(item.paraphrase && mode === 'keyword')) path = item.expected?.[0];
    if (path) {
      const original = readFileSync(join(cwd, path), 'utf8'), lines = original.split(/\r?\n/);
      const index = item?.passageTerms ? lines.findIndex(line => item.passageTerms.some(term => line.toLowerCase().includes(term.toLowerCase()))) : 1;
      const startLine = Math.max(1, index + 1), endLine = startLine;
      synthetic.documents.push({ path, role: path.includes('/archive/') ? 'archive' : path.startsWith('openspec/changes/') ? 'active' : path.startsWith('openspec/specs/') ? 'specs' : 'wiki',
        heading: 'Synthetic protocol result', hash: hashText(original), freshness: 'verified', startLine, endLine,
        reference: `${path}:${startLine}`, text: lines[startLine - 1], truncated: true });
    }
    result.packet = synthetic; result.bytes = Buffer.byteLength(JSON.stringify(synthetic));
    return result;
  };
  const report = await evaluateDocumentRetrieval({ fixture, run });
  assert.equal(report.pass, true, JSON.stringify(report.failure || report.summary));
  assert.equal(report.lifecycle.kind, 'synthetic-file-mutation'); assert.ok(report.summary.semanticRecovery.length);
});

test('runner retains bounded failure stage instead of losing acceptance evidence', async () => {
  const report = await evaluateDocumentRetrieval({ run: async () => { throw new Error('synthetic native unavailable'); } });
  assert.equal(report.pass, false); assert.match(report.failure.stage, /runtime and model setup/);
  assert.match(report.failure.message, /synthetic native unavailable/); assert.equal(report.cases.length, 0);
});
