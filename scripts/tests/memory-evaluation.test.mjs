import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { evaluateMemorySearch, formatEvaluation, permissionForbidden } from '../evaluate-memory-search.mjs';
import { tempDir } from './fixtures/memory/harness.mjs';

const RUNNER = fileURLToPath(new URL('../evaluate-memory-search.mjs', import.meta.url));
const fixture = questions => ({ facts: [
  { key: 'allowed', slug: 'test', type: 'project', body: 'Deploy uses a checklist.' },
  { key: 'hidden', slug: 'test', type: 'feedback', body: 'Deploy personal preference.', author: 'other@example.com', owner: 'other' },
], questions });
const regression = { query: 'deploy', classification: 'regression', category: 'literal/word-form', expected: ['allowed'], forbidden: ['hidden'] };
const reply = ids => async () => ({ code: 0, stdout: JSON.stringify({ version: 1, facts: ids.map(id => ({ id })) }), stderr: '' });
const gone = env => {
  for (const dir of [env.repo.root, env.repo.home]) assert.equal(existsSync(dir), false, `${dir} cleaned`);
  assert.throws(() => env.fake.db.prepare('SELECT 1'), /closed|not open/);
};

test('evaluation permission scoring uses machine ownership even when author labels disagree', () => {
  const evidence = { facts: [
    { key: 'own', type: 'feedback', author: 'other@example.com', owner: 'self' },
    { key: 'other', type: 'feedback', author: 'dev@example.com', owner: 'other' },
    { key: 'reader', type: 'project', author: 'dev@example.com', owner: 'other', shared: 0 },
    { key: 'historic', type: 'user', author: 'dev@example.com', owner: 'unassigned' },
    { key: 'team', type: 'project', author: 'other@example.com', owner: 'other' },
  ] };
  assert.deepEqual(permissionForbidden(evidence, {}), ['other', 'reader', 'historic']);
  assert.deepEqual(permissionForbidden(evidence, { filters: { everyone: true } }), []);
});

test('synthetic baseline retains every old required case and visibly reports diagnostic misses', async t => {
  let env;
  const report = await evaluateMemorySearch({ onSetup: value => { env = value; } });
  assert.equal(report.failed, false);
  assert.equal(report.synthetic, true);
  const old = JSON.parse(readFileSync(new URL('./fixtures/memory-search-questions.json', import.meta.url), 'utf8'));
  assert.equal(report.cases.filter(entry => entry.classification === 'regression').length, old.questions.length);
  assert.ok(report.cases.filter(entry => entry.classification === 'regression').every(entry => entry.hit));
  const synonym = report.cases.find(entry => entry.id === 'synonym-only');
  assert.equal(synonym.hit, false, 'a genuine synonym-only question remains a measured keyword miss');
  assert.equal(synonym.targets[0].rank, null);
  assert.ok(synonym.unexpected.includes('staging-distractor'));
  assert.ok(report.categories['diagnostic: paraphrase'].misses > 0);
  const text = formatEvaluation(report);
  assert.match(text, /diagnostic \/ paraphrase \/ synonym-only: MISS/);
  assert.match(text, /do not establish semantic retrieval/);
  t.diagnostic(`BEGIN SYNTHETIC MEMORY EVALUATION\n${JSON.stringify(report)}\n${text}\nEND SYNTHETIC MEMORY EVALUATION`);
  gone(env);
  await assert.rejects(fetch(`${env.fake.api}/accounts/acct/d1/database/db1/query`), /fetch failed/);
});

test('required misses and forbidden results fail, while diagnostic misses stay counted', async () => {
  const required = await evaluateMemorySearch({ fixture: fixture([regression]), runSearch: reply([]) });
  assert.equal(required.failed, true);
  assert.equal(required.categories['regression: literal/word-form'].failures, 1);
  const diagnosticQuestion = { ...regression, classification: 'diagnostic', category: 'paraphrase' };
  const missed = await evaluateMemorySearch({ fixture: fixture([diagnosticQuestion]), runSearch: reply([]) });
  assert.equal(missed.failed, false);
  assert.equal(missed.categories['diagnostic: paraphrase'].misses, 1);
  const leaked = await evaluateMemorySearch({ fixture: fixture([diagnosticQuestion]), runSearch: reply([2]) });
  assert.equal(leaked.failed, true);
  assert.deepEqual(leaked.cases[0].forbidden, ['hidden']);
  assert.match(formatEvaluation(leaked), /FORBIDDEN \[hidden\]/);
  // Private identifiers are forbidden even when a diagnostic forgot to name them itself.
  const implicit = await evaluateMemorySearch({ fixture: fixture([{ ...diagnosticQuestion, forbidden: [] }]), runSearch: reply([2]) });
  assert.equal(implicit.failed, true);
  const ranked = await evaluateMemorySearch({ fixture: fixture([regression]), runSearch: reply([1]) });
  assert.equal(ranked.cases[0].targets[0].rank, 1);
  assert.equal(ranked.cases[0].targets[0].topThree, true);
  const rankFixture = { facts: [...fixture([]).facts.filter(fact => fact.key === 'allowed'), ...['other-a', 'other-b', 'other-c'].map(key => ({ key, slug: 'test', type: 'project', body: 'Another checklist.' }))], questions: [regression] };
  const fourth = await evaluateMemorySearch({ fixture: rankFixture, runSearch: reply([2, 3, 4, 1]) });
  assert.equal(fourth.cases[0].targets[0].rank, 4);
  assert.equal(fourth.cases[0].targets[0].topThree, false);
  assert.equal(fourth.failed, true);
});

test('CLI, JSON and infrastructure errors reject and clean every temporary fixture resource', async () => {
  for (const runSearch of [async () => ({ code: 2, stdout: '', stderr: 'synthetic CLI failure' }), async () => ({ code: 0, stdout: 'invalid json', stderr: '' }), reply([999])]) {
    let env;
    await assert.rejects(evaluateMemorySearch({ fixture: fixture([regression]), runSearch, onSetup: value => { env = value; } }), /search failed|invalid JSON|invalid structured result/);
    gone(env);
  }
  let env;
  await assert.rejects(evaluateMemorySearch({ onSetup: value => { env = value; throw new Error('synthetic infrastructure failure'); } }), /synthetic infrastructure failure/);
  gone(env);
});

const run = (args, options) => new Promise(resolve => execFile(process.execPath, [RUNNER, ...args], options, (error, stdout, stderr) => resolve({ code: error?.code || 0, stdout, stderr })));

test('runner uses synthetic configuration despite production-shaped cwd/env and supports text, JSON and CLI failures', async t => {
  const cwd = tempDir(t, 'evaluation-cwd-');
  writeFileSync(join(cwd, '.env'), 'CLOUDFLARE_MEMORY_TOKEN=production-shaped-secret\nCLOUDFLARE_API_TOKEN=production-shaped-admin\n');
  const options = { cwd, encoding: 'utf8', env: { ...process.env, CLOUDFLARE_MEMORY_TOKEN: 'production-env-secret', WONG_MEMORY_API: 'http://127.0.0.1:1/production', WONG_CLOUDFLARE_API: 'http://127.0.0.1:1/production', NODE_NO_WARNINGS: '1' } };
  const json = await run(['--json'], options);
  assert.equal(json.code, 0, json.stderr);
  assert.equal(JSON.parse(json.stdout).synthetic, true);
  assert.doesNotMatch(json.stdout + json.stderr, /production-shaped|production-env-secret/);
  const text = await run([], options);
  assert.equal(text.code, 0, text.stderr);
  assert.match(text.stdout, /Synthetic memory search evaluation/);
  assert.equal((await run(['--help'], options)).code, 0);
  assert.equal((await run(['--unknown'], options)).code, 2);
  const failed = await run(['--json'], { ...options, env: { ...options.env, PATH: cwd } });
  assert.equal(failed.code, 1);
  assert.equal(JSON.parse(failed.stderr).failed, true);
  assert.match(JSON.parse(failed.stderr).error, /git/);
});
