import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { countText, measureContext } from '../measure-context.mjs';

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
