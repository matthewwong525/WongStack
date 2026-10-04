#!/usr/bin/env node
// Real QMD acceptance over frozen public originals; synthetic lifecycle probes are labelled separately.
import { execFile, execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { cpus, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { hashText } from '../.agents/skills/memory/scripts/lib/documents/corpus.mjs';
import { isMain } from '../.agents/skills/memory/scripts/lib/cli.mjs';
import { redact } from '../.agents/skills/memory/scripts/lib/scan.mjs';

const fixtureDir = fileURLToPath(new URL('./tests/fixtures/document-retrieval/', import.meta.url));
const cli = fileURLToPath(new URL('../.agents/skills/memory/scripts/memory.mjs', import.meta.url));
export const loadRetrievalFixture = () => JSON.parse(readFileSync(join(fixtureDir, 'questions.json'), 'utf8'));

export function gradeRetrievalCase(item, packet, { mode = 'auto' } = {}) {
  const documents = packet.documents || [], expected = item.expected || [];
  const hit = expected.some(path => documents.some(doc => doc.path === path && (!item.expectedRole || doc.role === item.expectedRole)
    && (!item.passageTerms || item.passageTerms.some(term => doc.text.toLowerCase().includes(term.toLowerCase())))));
  const forbidden = documents.some(doc => (item.forbiddenRoles || (item.scope === 'current' ? ['archive', 'active'] : [])).includes(doc.role));
  const verified = documents.every(doc => doc.freshness === 'verified' && /^[a-f0-9]{64}$/.test(doc.hash)
    && doc.reference === `${doc.path}:${doc.startLine}` && doc.endLine >= doc.startLine);
  const bounded = Buffer.byteLength(`${JSON.stringify(packet)}\n`) <= 6144 && documents.length <= 5 && (packet.facts || []).length <= 8;
  const absent = !documents.length;
  const completeMode = mode === 'keyword' || packet.backend === 'qmd' && packet.requestedModeState === 'ok' && packet.coverage === 'complete';
  const passes = bounded && verified && !forbidden && completeMode && (item.absent ? mode === 'keyword' ? absent : true : hit || !item.required);
  return { hit, forbidden, verified, bounded, completeMode, absent, passes,
    absenceDiagnostic: Boolean(item.absent && mode !== 'keyword' && !absent) };
}

export function summarizeRetrieval(cases) {
  const semanticRecovery = cases.filter(result => result.item.paraphrase && result.auto.grade.hit && !result.keyword.grade.hit && result.auto.grade.completeMode).map(result => result.item.id);
  const regressions = cases.filter(result => result.item.required && !result.item.paraphrase
    && (!result.keyword.grade.passes || !result.auto.grade.passes)).map(result => result.item.id);
  const structuralFailures = cases.filter(result => ['keyword', 'auto'].some(mode => !result[mode].grade.bounded || !result[mode].grade.verified || result[mode].grade.forbidden)).map(result => result.item.id);
  return { pass: semanticRecovery.length > 0 && !regressions.length && !structuralFailures.length, semanticRecovery, regressions, structuralFailures };
}

function invoke(cwd, args, env, timeout = 22000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [cli, ...args], { cwd, env, encoding: 'utf8', timeout, maxBuffer: 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
      if (error) { reject(new Error(`Shipped document CLI failed (${error.code || 'unknown'}), command ${args[0]}: ${redact(String(stderr || '').slice(-2000), [])}`)); return; }
      try { resolve({ packet: JSON.parse(stdout), bytes: Buffer.byteLength(stdout), ms: Date.now() - started }); }
      catch { reject(new Error('Shipped document CLI returned invalid JSON')); }
    });
  });
}
function validateOriginals(cwd, packet) {
  for (const doc of packet.documents) {
    const original = readFileSync(join(cwd, doc.path), 'utf8'), lines = original.split(/\r?\n/);
    if (hashText(original) !== doc.hash || lines.slice(doc.startLine - 1, doc.endLine).join('\n') !== doc.text)
      throw new Error(`Returned source failed independent original validation: ${doc.path}`);
  }
}

export async function evaluateDocumentRetrieval({ fixture = loadRetrievalFixture(), run = invoke, keep = false } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'wong-document-acceptance-'));
  const dataDir = join(cwd, 'host-data'), env = { ...process.env, XDG_DATA_HOME: dataDir, LOCALAPPDATA: dataDir,
    CLOUDFLARE_MEMORY_TOKEN: '', CLOUDFLARE_API_TOKEN: '' };
  const report = { version: 1, kind: 'real-QMD-public-document-subset', reviewedOn: fixture.reviewedOn,
    platform: process.platform, architecture: process.arch, cpuCount: cpus().length, node: process.versions.node,
    sourceCount: fixture.sources.length, limitations: ['Frozen public source subset, not whole archive throughput.',
      'Separate CLI processes include native cold startup; no facts or transcripts reach QMD.',
      'Semantic neighbors for absent answers are diagnostic, not proof that an answer exists.'], cases: [] };
  let stage = 'frozen public corpus preparation';
  try {
    execFileSync('git', ['init', '-q'], { cwd });
    for (const source of fixture.sources) {
      const original = join(fixtureDir, 'corpus', source.path);
      if (hashText(readFileSync(original, 'utf8')) !== source.hash) throw new Error('Frozen reviewed source hash changed');
      mkdirSync(join(cwd, source.path, '..'), { recursive: true }); cpSync(original, join(cwd, source.path));
    }
    mkdirSync(join(cwd, 'wiki/people'), { recursive: true });
    writeFileSync(join(cwd, 'wiki/people/private.md'), '# Private synthetic canary\nprivatecanary-992238\n');
    stage = 'real pinned runtime and model setup';
    const setup = await run(cwd, ['documents-setup', '--cpu'], env, 900000); report.setupMs = setup.ms;
    const status = (await run(cwd, ['documents-status'], env)).packet;
    report.readiness = { version: status.runtimeVersion, semantic: status.semanticReady, deep: status.deepReady };
    if (!status.semanticReady) throw new Error('Real setup did not establish semantic readiness');
    for (const item of fixture.cases) {
      stage = `source acceptance ${item.id}`;
      const result = { item };
      for (const mode of ['keyword', 'auto']) {
        const args = ['documents', item.question, '--scope', item.scope, '--mode', mode, '--json', ...(item.change ? ['--change', item.change] : [])];
        const measured = await run(cwd, args, env); validateOriginals(cwd, measured.packet);
        result[mode] = { ...measured, grade: gradeRetrievalCase(item, measured.packet, { mode }) };
      }
      report.cases.push(result);
    }
    report.coldQueryMs = report.cases[0]?.auto.ms;
    report.warmQueryMs = (await run(cwd, ['documents', fixture.cases[0].question, '--mode', 'auto', '--json'], env)).ms;
    const canary = await run(cwd, ['documents', 'privatecanary-992238', '--mode', 'keyword', '--scope', 'all', '--json'], env);
    report.privateSourceExcluded = canary.packet.documents.length === 0;
    // Synthetic source mutation is separate from real source retrieval quality.
    stage = 'synthetic changed-source refresh';
    const path = 'wiki/refresh-probe.md';
    writeFileSync(join(cwd, path), '# Synthetic freshness probe\nrefreshcanary-88319 changed-file evidence.\n');
    const before = await run(cwd, ['documents', 'refreshcanary-88319', '--mode', 'auto', '--json'], env);
    validateOriginals(cwd, before.packet);
    const refreshed = await run(cwd, ['documents-refresh'], env, 330000);
    if (refreshed.packet.state !== 'ok') throw new Error('Explicit source refresh did not finish');
    const after = await run(cwd, ['documents', 'refreshcanary-88319 changed-file evidence', '--mode', 'semantic', '--json'], env);
    validateOriginals(cwd, after.packet);
    report.lifecycle = { kind: 'synthetic-file-mutation', refreshMs: refreshed.ms,
      beforeFresh: before.packet.documents.some(doc => doc.path === path && doc.freshness === 'verified'),
      afterFresh: after.packet.documents.some(doc => doc.path === path && doc.freshness === 'verified'),
      afterSemantic: after.packet.backend === 'qmd' && after.packet.coverage === 'complete' };
    const portable = await run(cwd, ['recall', 'private memory installation', '--mode', 'keyword', '--json'], env);
    report.independentFacts = { state: portable.packet.sources.facts.state, documentsUsable: portable.packet.documents.length > 0 };
    report.summary = summarizeRetrieval(report.cases);
    report.pass = report.summary.pass && report.privateSourceExcluded && report.lifecycle.beforeFresh && report.lifecycle.afterFresh
      && report.lifecycle.afterSemantic && report.independentFacts.state === 'unavailable' && report.independentFacts.documentsUsable
      && report.cases.every(result => ['keyword', 'auto'].every(mode => result[mode].ms <= 20000 && result[mode].bytes <= 6144));
    return report;
  } catch (error) {
    report.pass = false; report.failure = { stage, message: redact(String(error.message).slice(0, 2400), []) };
    return report;
  } finally { if (!keep) rmSync(cwd, { recursive: true, force: true }); }
}

if (isMain(import.meta.url)) {
  const usage = 'usage: evaluate-document-retrieval.mjs [--output report.json] [--keep]  real CPU QMD acceptance on frozen public sources';
  let values;
  try { ({ values } = parseArgs({ options: { help: { type: 'boolean' }, output: { type: 'string' }, keep: { type: 'boolean' } } })); }
  catch (error) { console.error(`${error.message}\n${usage}`); process.exit(2); }
  if (values.help) { console.log(usage); process.exit(0); }
  try {
    const report = await evaluateDocumentRetrieval({ keep: values.keep });
    if (values.output) { mkdirSync(join(values.output, '..'), { recursive: true }); writeFileSync(values.output, `${JSON.stringify(report, null, 2)}\n`); }
    console.log(JSON.stringify({ pass: report.pass, summary: report.summary, failure: report.failure, setupMs: report.setupMs, coldQueryMs: report.coldQueryMs, warmQueryMs: report.warmQueryMs }));
    process.exitCode = report.pass ? 0 : 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
