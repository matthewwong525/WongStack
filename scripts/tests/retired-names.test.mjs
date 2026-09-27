import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scripts = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const LIST = [
  { name: 'old-command', replacement: '`new-command`', allow: ['specs/stays-gone.md'], why: 'a spec says it must stay gone' },
];

// Runs the check in a throwaway git repo holding `files`.
function check(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-retired-names-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const all = { 'scripts/retired-names.json': JSON.stringify(LIST), ...files };
  for (const [path, text] of Object.entries(all)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  spawnSync('git', ['init', '-q'], { cwd: root });
  spawnSync('git', ['add', '-A'], { cwd: root });
  const result = spawnSync(process.execPath, [join(scripts, 'check-retired-names.mjs')], { cwd: root, encoding: 'utf8' });
  return { status: result.status, out: `${result.stdout}${result.stderr}` };
}

test('a live file naming a retired thing fails with file, line, and replacement', t => {
  const result = check(t, { 'wiki/page.md': '# Page\n\nRun old-command first.\n' });
  assert.equal(result.status, 1, result.out);
  assert.match(result.out, /wiki\/page\.md:3: old-command — retired; use `new-command`/);
});

test('an allowed file keeps its mention', t => {
  const result = check(t, { 'specs/stays-gone.md': 'old-command SHALL NOT exist.\n' });
  assert.equal(result.status, 0, result.out);
});

test('history is exempt', t => {
  const result = check(t, {
    'CHANGELOG.md': '## 1.0.0\n\n- Removed old-command.\n',
    'openspec/changes/archive/2020-01-01-x/proposal.md': 'Removes old-command.\n',
  });
  assert.equal(result.status, 0, result.out);
});
