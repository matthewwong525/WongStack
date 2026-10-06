import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { DESCRIPTIONS, countText, measureContext, rebaseline, skillDescription } from '../measure-context.mjs';

test('counts words and UTF-8 bytes without estimating tokens', () => {
  assert.deepEqual(countText('  café\n now  '), { words: 2, bytes: 14 });
  assert.deepEqual(countText(' \n'), { words: 0, bytes: 2 });
});

test('inventory includes extracted references and rejects missing route inputs and duplicate aliases', t => {
  const root = mkdtempSync(join(tmpdir(), 'wong-context-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const files = {};
  for (const verb of ['explore', 'plan', 'apply', 'save', 'continue', 'ship', 'verify']) {
    const path = `.agents/skills/${verb}/SKILL.md`;
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), 'short');
    files[path] = countText('three old words');
  }
  const main = '.agents/skills/save/SKILL.md';
  const baseline = { revision: 'fixture', owners: [], files, routes: { save: { before: [main], after: [main], requireReduction: true } } };
  assert.deepEqual(measureContext(root, baseline).issues, []);
  const extracted = '.agents/skills/save/references/extracted.md';
  mkdirSync(dirname(join(root, extracted)), { recursive: true });
  writeFileSync(join(root, extracted), 'many '.repeat(30));
  const report = measureContext(root, baseline);
  assert(report.inventory.some(row => row.path === extracted && row.before.words === 0 && row.after.words === 30));
  assert(report.issues.includes('instruction words did not decrease'));
  baseline.routes.save.after.push('missing.md');
  assert.throws(() => measureContext(root, baseline), /missing required input/);
  baseline.routes.save.after.pop();
  baseline.files['.claude/skills/save/SKILL.md'] = files[main];
  assert.throws(() => measureContext(root, baseline), /duplicate canonical/);
  delete baseline.files['.claude/skills/save/SKILL.md'];
  rmSync(join(root, main));
  assert.throws(() => measureContext(root, baseline), /ENOENT/);
});

function skillTree(t, skills) {
  const root = mkdtempSync(join(tmpdir(), 'wong-context-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [path, text] of Object.entries(skills)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

test('reads a folded or quoted description and ignores the rest of the frontmatter', () => {
  assert.equal(skillDescription('---\nname: a\ndescription: Do one thing.\nuser-invocable: true\n---\nbody words'), 'Do one thing.');
  assert.equal(skillDescription('---\ndescription: >\n  Folded over\n  two lines.\nname: a\n---\n'), 'Folded over two lines.');
  assert.equal(skillDescription('---\ndescription: "Quoted: text"\n---\n'), 'Quoted: text');
  assert.equal(skillDescription('no frontmatter'), '');
  assert.equal(skillDescription('---\nname: a\n---\n'), '');
});

test('inventory covers every authored skill folder, skips the vendored browser skill, and counts every description', t => {
  const root = skillTree(t, {
    '.agents/skills/memory/SKILL.md': '---\ndescription: Search facts.\n---\nmemory body',
    '.agents/skills/memory/references/writing-facts.md': 'fact rules',
    '.agents/skills/routine/SKILL.md': '---\ndescription: Schedule a prompt.\n---\nroutine body',
    '.agents/skills/agent-browser/SKILL.md': '---\ndescription: Drive a browser.\n---\nvendored body',
  });
  const report = measureContext(root, { revision: 'fixture', owners: [], files: {}, routes: {} });
  const paths = report.inventory.map(row => row.path);
  assert(paths.includes('.agents/skills/memory/SKILL.md'));
  assert(paths.includes('.agents/skills/memory/references/writing-facts.md'));
  assert(paths.includes('.agents/skills/routine/SKILL.md'));
  assert(!paths.some(path => path.includes('agent-browser')));
  const descriptions = report.inventory.find(row => row.path === DESCRIPTIONS);
  assert.equal(descriptions.kind, 'descriptions');
  assert.deepEqual(descriptions.after, countText('Search facts.\nSchedule a prompt.\nDrive a browser.'));
  assert.deepEqual(report.categories.descriptions.after, descriptions.after);
});

test('a call-only skill is counted as on-call: out of the instruction total and the session descriptions', t => {
  const root = skillTree(t, {
    '.agents/skills/memory/SKILL.md': '---\ndescription: Search facts.\n---\nmemory body',
    '.agents/skills/dream-memory/SKILL.md': '---\ndescription: Tidy memory.\ndisable-model-invocation: true\n---\ndream body',
    '.agents/skills/dream-memory/references/steps.md': 'dream steps',
  });
  const report = measureContext(root, { revision: 'fixture', owners: [], files: { '.agents/skills/dream-memory/SKILL.md': { words: 9, bytes: 90 } }, routes: {} });
  const row = path => report.inventory.find(entry => entry.path === path);
  assert.equal(row('.agents/skills/dream-memory/SKILL.md').kind, 'on-call');
  assert.equal(row('.agents/skills/dream-memory/references/steps.md').kind, 'on-call');
  assert.equal(row('.agents/skills/memory/SKILL.md').kind, 'instructions');
  // Its recorded size leaves the instruction total on both sides, so marking a skill frees no room by itself.
  assert.deepEqual(report.categories.instructions.before, { words: 0, bytes: 0 });
  assert.deepEqual(report.categories['on-call'].before, { words: 9, bytes: 90 });
  assert.deepEqual(row(DESCRIPTIONS).after, countText('Search facts.'));
});

test('the startup ceiling names the load and the ceiling when exceeded, and is silent under it', t => {
  const root = skillTree(t, {
    'AGENTS.md': 'one two three four five',
    '.agents/skills/save/SKILL.md': '---\ndescription: Save work.\n---\nbody',
  });
  const startup = ['AGENTS.md', DESCRIPTIONS];
  const baseline = { revision: 'fixture', owners: ['AGENTS.md'], files: { 'AGENTS.md': countText('one two three four five'), [DESCRIPTIONS]: countText('Save work.') }, routes: { startup: { before: startup, after: startup } }, startupCeiling: 7 };
  assert.equal(measureContext(root, baseline).routes.startup.after.words, 7);
  assert(!measureContext(root, baseline).issues.some(issue => issue.startsWith('startup')));
  baseline.startupCeiling = 6;
  assert(measureContext(root, baseline).issues.includes('startup: 7 words is over the ceiling of 6'));
  delete baseline.routes.startup;
  assert.throws(() => measureContext(root, baseline), /needs a startup route/);
});

test('rebaseline records today\'s counts at the given revision and resets each route to its own after list', t => {
  const root = skillTree(t, {
    'AGENTS.md': 'new owner text',
    '.agents/skills/save/SKILL.md': '---\ndescription: Save work.\n---\nsave body',
  });
  const old = {
    revision: 'old', owners: ['AGENTS.md'], startupCeiling: 50, notes: 'kept',
    files: { 'AGENTS.md': countText('older and longer owner text'), 'gone.md': countText('removed file') },
    routes: { startup: { before: ['AGENTS.md', 'gone.md'], after: ['AGENTS.md', DESCRIPTIONS], requireReduction: true, increaseReason: 'old reason' } },
  };
  const next = rebaseline(root, old, 'abc123');
  assert.equal(next.revision, 'abc123');
  assert.equal(next.startupCeiling, 50);
  assert.equal(next.notes, 'kept');
  assert.deepEqual(next.files['AGENTS.md'], countText('new owner text'));
  assert.deepEqual(next.files[DESCRIPTIONS], countText('Save work.'));
  assert.equal(next.files['gone.md'], undefined);
  assert.deepEqual(next.routes.startup, { before: ['AGENTS.md', DESCRIPTIONS], after: ['AGENTS.md', DESCRIPTIONS], requireReduction: true });
  const report = measureContext(root, next);
  assert.equal(report.routes.startup.before.words, report.routes.startup.after.words);
  assert(report.issues.includes('startup: required reduction absent'));
});
