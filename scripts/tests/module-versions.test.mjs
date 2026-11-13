// The module version check, scripts/check-module-versions.mjs, on a throwaway repo with one module.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { moduleProblems } from '../check-module-versions.mjs';

const git = (root, ...args) => execFileSync('git', ['-C', root, '-c', 'user.name=A', '-c', 'user.email=a@example.com', ...args]);

function repo(t, name) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-module-versions-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  git(root, 'init', '-q', '-b', 'main');
  const folder = join(root, '.agents/plugins', name);
  mkdirSync(folder, { recursive: true });
  const write = (path, text) => { mkdirSync(join(folder, path, '..'), { recursive: true }); writeFileSync(join(folder, path), text); };
  const commit = message => { git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', message); };
  return { root, write, commit };
}

test('a module that differs from main needs a higher version in its VERSION file', t => {
  const { root, write, commit } = repo(t, 'memory');
  write('VERSION', '1.0.0\n');
  write('SKILL.md', 'memory\n');
  commit('memory 1.0.0');
  assert.deepEqual(moduleProblems(root, 'main'), []);

  write('SKILL.md', 'memory, changed\n');
  assert.deepEqual(moduleProblems(root, 'main'), ['.agents/plugins/memory differs from main, but its version is still 1.0.0; raise it in its VERSION file']);
  write('VERSION', '1.1.0\n');
  assert.deepEqual(moduleProblems(root, 'main'), []);
});

test('a change to a nested command in skills/ raises the module\'s one version', t => {
  const { root, write, commit } = repo(t, 'browser');
  write('VERSION', '2.0.0\n');
  write('skills/shop/SKILL.md', 'shop\n');
  commit('browser 2.0.0');
  write('skills/shop/SKILL.md', 'shop, changed\n');
  assert.deepEqual(moduleProblems(root, 'main'), ['.agents/plugins/browser differs from main, but its version is still 2.0.0; raise it in its VERSION file']);
  write('VERSION', '2.0.1\n');
  assert.deepEqual(moduleProblems(root, 'main'), []);
});

test('a base from before the VERSION file reads its version from the old plugin manifest', t => {
  const { root, write, commit } = repo(t, 'daily');
  write('.claude-plugin/plugin.json', JSON.stringify({ name: 'daily', version: '3.0.1' }));
  write('SKILL.md', 'daily\n');
  commit('daily 3.0.1');
  rmSync(join(root, '.agents/plugins/daily/.claude-plugin'), { recursive: true });
  assert.deepEqual(moduleProblems(root, 'main'), ['.agents/plugins/daily has no VERSION file; add one with its version']);
  write('VERSION', '3.0.1\n');
  assert.deepEqual(moduleProblems(root, 'main'), ['.agents/plugins/daily differs from main, but its version is still 3.0.1; raise it in its VERSION file']);
  write('VERSION', '4.0.0\n');
  assert.deepEqual(moduleProblems(root, 'main'), []);
});
