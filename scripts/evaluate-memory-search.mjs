#!/usr/bin/env node
// Meta-only: migrate and query a throwaway synthetic store, never the checkout's memory.
import { mkdirSync, readFileSync } from 'node:fs';
import { memory, setup, writeJsonFile } from './tests/fixtures/memory/harness.mjs';
import { isMain, parseCli } from './lib-cli.mjs';

const FIXTURE = new URL('./tests/fixtures/memory-search-questions.json', import.meta.url);
export const loadFixture = () => JSON.parse(readFileSync(FIXTURE, 'utf8'));
const OTHER_MACHINE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
// Fixture ownership is explicit and independent of its attribution label.
export function fixtureOwner(fact, ownMachine) {
  switch (fact.owner || 'self') {
    case 'self': return ownMachine;
    case 'other': return OTHER_MACHINE;
    case 'unassigned': return null;
    default: throw new Error(`invalid synthetic owner for ${fact.key}`);
  }
}

export function seed(env, fixture, { includeContext = false } = {}) {
  mkdirSync(env.repo.stateDir, { recursive: true });
  writeJsonFile(env.repo.stateDir, 'team.json', { team: true });
  const insert = env.fake.db.prepare('INSERT INTO facts (slug, type, body, source, created_at, author, shared, owner_machine_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id');
  const ids = new Map();
  for (const fact of [...fixture.facts, ...(fixture.diagnosticFacts || []), ...(includeContext ? fixture.contextFacts || [] : [])]) {
    const { id } = insert.get(fact.slug, fact.type, fact.body, 'migration', fact.createdAt || '2026-10-01T00:00:00Z', fact.author || 'dev@example.com', fact.shared ?? 1, fixtureOwner(fact, env.repo.machineId));
    ids.set(fact.key, id);
  }
  for (const fact of fixture.diagnosticFacts || []) {
    for (const old of fact.supersedes || []) env.fake.db.prepare('UPDATE facts SET superseded_by = ? WHERE id = ?').run(ids.get(fact.key), ids.get(old));
  }
  return new Map([...ids].map(([key, id]) => [id, key]));
}

function argsFor(question) {
  const filters = Object.entries(question.filters || {}).flatMap(([key, value]) => value === true ? [`--${key}`] : value === false ? [] : [`--${key}`, String(value)]);
  return ['search', question.query, ...filters, '--json'];
}

function score(question, keys, index) {
  const expected = question.expected || (question.finds ? [question.finds] : []);
  const targets = expected.map(key => ({ key, rank: keys.includes(key) ? keys.indexOf(key) + 1 : null, topThree: keys.slice(0, 3).includes(key) }));
  const forbidden = keys.filter(key => (question.forbidden || []).includes(key));
  const unexpected = keys.filter(key => !expected.includes(key));
  const hit = expected.length ? targets.every(target => target.topThree) : keys.length === 0;
  const classification = question.classification || 'regression';
  return { id: question.id || `regression-${index + 1}`, query: question.query, classification, category: question.category || 'literal/word-form', expected, targets, returned: keys, topThree: keys.slice(0, 3), unexpected, forbidden, hit, failed: forbidden.length > 0 || (classification === 'regression' && !hit) };
}

export function permissionForbidden(fixture, question) {
  const facts = [...fixture.facts, ...(fixture.diagnosticFacts || [])];
  const superseded = question.filters?.all ? [] : facts.flatMap(fact => fact.supersedes || []);
  const personal = question.filters?.everyone ? [] : facts.filter(fact => fixtureOwner(fact, 'self') !== 'self' && (fact.shared === 0 || ['user', 'feedback'].includes(fact.type))).map(fact => fact.key);
  return [...new Set([...(question.forbidden || []), ...superseded, ...personal])];
}

export async function evaluateMemorySearch({ fixture = loadFixture(), runSearch = memory, onSetup = () => {} } = {}) {
  const cleanup = [];
  let env;
  try {
    env = await setup({ after: callback => cleanup.push(callback) });
    onSetup(env);
    const keyForId = seed(env, fixture);
    const cases = [];
    for (const [index, question] of [...fixture.questions, ...(fixture.diagnosticQuestions || [])].entries()) {
      const result = await runSearch(env.repo, env.fake, argsFor(question));
      if (result.code !== 0) throw new Error(`search failed for ${question.id || question.query}: ${result.stderr.trim() || `exit ${result.code}`}`);
      let data;
      try { data = JSON.parse(result.stdout); } catch { throw new Error(`search returned invalid JSON for ${question.query}`); }
      if (data.version !== 1 || !Array.isArray(data.facts) || data.facts.some(fact => !keyForId.has(fact.id))) throw new Error(`search returned an invalid structured result for ${question.query}`);
      cases.push(score({ ...question, forbidden: permissionForbidden(fixture, question) }, data.facts.map(fact => keyForId.get(fact.id)), index));
    }
    const categories = {};
    for (const entry of cases) {
      const name = `${entry.classification}: ${entry.category}`;
      const total = categories[name] ||= { questions: 0, hits: 0, misses: 0, failures: 0, unexpected: 0 };
      total.questions += 1;
      total.hits += Number(entry.hit);
      total.misses += Number(!entry.hit);
      total.failures += Number(entry.failed);
      total.unexpected += entry.unexpected.length;
    }
    return { version: 1, synthetic: true, selection: 'keyword FTS5; top three', visibilityScope: 'admin-default client scope and explicit --everyone; member/reader enforcement is tested in Worker tests', failed: cases.some(entry => entry.failed), cases, categories };
  } finally {
    for (const callback of cleanup.reverse()) await callback();
    env?.fake.db.close();
  }
}

export function formatEvaluation(report) {
  const lines = ['Synthetic memory search evaluation (keyword FTS5, top three)', report.visibilityScope, 'Regression misses and forbidden results fail; diagnostic misses are measured.'];
  for (const entry of report.cases) {
    const ranks = entry.targets.map(target => `${target.key}=${target.rank ?? 'missing'}`).join(', ') || 'no answer expected';
    lines.push(`${entry.classification} / ${entry.category} / ${entry.id}: ${entry.hit ? 'hit' : 'MISS'}; ranks ${ranks}; top three [${entry.topThree.join(', ')}]; unexpected [${entry.unexpected.join(', ')}]${entry.forbidden.length ? `; FORBIDDEN [${entry.forbidden.join(', ')}]` : ''}`);
  }
  for (const [category, total] of Object.entries(report.categories)) lines.push(`${category}: ${total.hits}/${total.questions} hits, ${total.misses} misses, ${total.failures} failures, ${total.unexpected} unexpected results`);
  lines.push(`Gate: ${report.failed ? 'failed' : 'passed'}; diagnostic misses remain visible and do not establish semantic retrieval.`);
  return lines.join('\n');
}

if (isMain(import.meta.url)) {
  const { values } = parseCli({ usage: 'usage: evaluate-memory-search.mjs [--json] [--context [--live --agent claude] [--repeats n]]', options: { json: { type: 'boolean' }, context: { type: 'boolean' }, live: { type: 'boolean' }, agent: { type: 'string' }, model: { type: 'string' }, repeats: { type: 'string' } } });
  try {
    const report = values.context ? await (await import('./evaluate-memory-context.mjs')).evaluateMemoryContext({ live: values.live, agent: values.agent, model: values.model, repeats: Number(values.repeats || (values.live ? 2 : 1)) }) : await evaluateMemorySearch();
    console.log(values.json ? JSON.stringify(report) : values.context ? JSON.stringify(report, null, 2) : formatEvaluation(report));
    process.exitCode = Number(report.failed);
  } catch (error) {
    console.error(values.json ? JSON.stringify({ version: 1, synthetic: true, failed: true, error: error.message }) : `Evaluation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
