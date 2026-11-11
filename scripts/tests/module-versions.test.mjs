// The module version check, scripts/check-module-versions.mjs, on a throwaway repo with one module.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { moduleProblems } from '../check-module-versions.mjs';

const git = (root, ...args) => execFileSync('git', ['-C', root, '-c', 'user.name=A', '-c', 'user.email=a@example.com', ...args]);
const manifest = (root, dir, version) => {
  mkdirSync(join(root, '.agents/plugins/memory', dir), { recursive: true });
  writeFileSync(join(root, '.agents/plugins/memory', dir, 'plugin.json'), JSON.stringify({ name: 'memory', version }));
};

test('a module that differs from main needs a higher version, the same in both plugin.json files', t => {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-module-versions-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  manifest(root, '.claude-plugin', '1.0.0');
  manifest(root, '.codex-plugin', '1.0.0');
  writeFileSync(join(root, '.agents/plugins/memory/SKILL.md'), 'memory\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'memory 1.0.0');
  assert.deepEqual(moduleProblems(root, 'main'), []);

  writeFileSync(join(root, '.agents/plugins/memory/SKILL.md'), 'memory, changed\n');
  assert.deepEqual(moduleProblems(root, 'main'), ['.agents/plugins/memory differs from main, but its version is still 1.0.0; raise it in both plugin.json files']);
  manifest(root, '.claude-plugin', '1.1.0');
  assert.deepEqual(moduleProblems(root, 'main'), ['.agents/plugins/memory: its two plugin.json versions differ (1.1.0, 1.0.0); give both the same version']);
  manifest(root, '.codex-plugin', '1.1.0');
  assert.deepEqual(moduleProblems(root, 'main'), []);
});
