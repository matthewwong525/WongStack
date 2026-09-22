import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { checkpointEvidence } from '../../.agents/skills/save/scripts/checkpoint-evidence.mjs';
import { renderPrBody, writePrBody } from '../../.agents/skills/save/scripts/render-pr-body.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
function run(cwd, command, ...args) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}
function file(root, path, text) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'wong-checkpoint-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  run(root, 'git', 'init', '-b', 'main');
  run(root, 'git', 'config', 'user.email', 'fixture@example.test');
  run(root, 'git', 'config', 'user.name', 'Fixture');
  file(root, 'README.md', 'base\n');
  file(root, 'openspec/changes/existing/proposal.md', '# Existing\n**Branch:** editor-work\n');
  run(root, 'git', 'add', '.');
  run(root, 'git', 'commit', '-m', 'base');
  run(root, 'git', 'checkout', '-b', 'editor-work');
  return root;
}

test('evidence preserves sources, rename paths, ambiguity, and remote isolation without mutations', t => {
  const root = fixture(t);
  file(root, 'openspec/changes/committed/proposal.md', '# Committed\n**Branch:** editor-work\n');
  run(root, 'git', 'add', '.');
  run(root, 'git', 'commit', '-m', 'change');
  run(root, 'git', 'update-ref', 'refs/remotes/origin/editor-work', 'HEAD');
  file(root, 'openspec/changes/staged/proposal.md', '# Staged\n');
  run(root, 'git', 'add', '.');
  file(root, 'openspec/changes/existing/proposal.md', '# Existing updated\n**Branch:** editor-work\n');
  file(root, 'openspec/changes/untracked/proposal.md', '# Untracked\n');
  run(root, 'git', 'mv', 'README.md', 'file with spaces.md');
  const before = run(root, 'git', 'status', '--porcelain=v1');
  const index = readFileSync(join(root, '.git/index'));
  const local = checkpointEvidence({ repo: root });
  assert.deepEqual(local.active, ['committed', 'existing', 'staged', 'untracked']);
  assert.deepEqual(local.recorded, ['committed', 'existing']);
  assert.deepEqual(local.sources.committed, ['branch']);
  assert.deepEqual(local.sources.untracked, ['untracked']);
  assert.equal(local.dirtyPaths.find(p => p.path === 'file with spaces.md').from, 'README.md');
  assert(local.dirtyPaths.some(p => p.status === ' M'));
  assert(local.dirtyPaths.some(p => p.status === 'A '));
  const remote = checkpointEvidence({ repo: root, ref: 'origin/editor-work' });
  assert.deepEqual(remote.active, ['committed']);
  assert.deepEqual(remote.dirtyPaths, []);
  assert.equal(remote.branch, 'editor-work');
  assert.deepEqual(remote.recorded, ['committed', 'existing']);
  assert.equal(run(root, 'git', 'status', '--porcelain=v1'), before);
  assert.deepEqual(readFileSync(join(root, '.git/index')), index);
  for (const alias of ['.agents', '.claude']) {
    const output = run(root, 'bash', join(project, alias, 'skills/save/scripts/change-candidates.sh'), '--json');
    assert.deepEqual(JSON.parse(output), local);
    const direct = run(root, 'node', join(project, alias, 'skills/save/scripts/checkpoint-evidence.mjs'), '--json');
    assert.deepEqual(JSON.parse(direct), local);
  }
});

test('selected root and base, legacy matches, and invalid refs remain explicit', t => {
  const root = fixture(t);
  file(root, 'planning/changes/editor-work/proposal.md', '# Other root\n');
  file(root, 'planning/changes/archive/2026-09-22-editor-work/proposal.md', '# Archived\n');
  const result = checkpointEvidence({ repo: root, changesDir: 'planning/changes', base: 'main' });
  assert.deepEqual(result.active, ['editor-work']);
  assert.deepEqual(result.archive, ['2026-09-22-editor-work']);
  assert.deepEqual(result.legacy.active, ['editor-work']);
  assert.deepEqual(result.legacy.archive, ['2026-09-22-editor-work']);
  assert.throws(() => checkpointEvidence({ repo: root, ref: 'missing' }));
  assert.throws(() => checkpointEvidence({ repo: root, base: 'missing' }));
  assert.throws(() => checkpointEvidence({ repo: root, changesDir: '../outside' }));
  assert.throws(() => checkpointEvidence({ repo: join(root, 'absent') }));
  run(root, 'git', 'branch', '-m', 'main', 'trunk');
  assert.throws(() => checkpointEvidence({ repo: root }), /comparison base unavailable/);
  assert.equal(checkpointEvidence({ repo: root, base: 'trunk' }).base, 'trunk');
  const bad = spawnSync('bash', [join(project, '.agents/skills/save/scripts/change-candidates.sh'), '--json', '--base', 'missing'], { cwd: root, encoding: 'utf8' });
  assert.notEqual(bad.status, 0);
  assert.equal(bad.stdout, '');
});

function bodyFixture(t, archived = false) {
  const root = fixture(t);
  const changeRoot = archived ? 'openspec/changes/archive/2026-09-22-review work' : 'openspec/changes/review work';
  file(root, `${changeRoot}/proposal.md`, '# Review\n**Status:** ready-to-ship\n');
  const tasks = '## 1. Work\n\n- [x] 1.1 Keep `literal` and $(not-a-command)\n- [ ] 1.2 Next\n';
  file(root, `${changeRoot}/tasks.md`, tasks);
  file(root, 'summary.txt', 'Concrete problem and behavior.\n\nSecond paragraph.\n');
  return { root, tasks, options: { repoRoot: root, changeRoot, mode: archived ? 'archive' : 'active', repoUrl: 'https://github.com/example/repo', branch: 'feature/review#one', summaryFile: join(root, 'summary.txt') } };
}

test('PR renderer preserves tasks and text and encodes active links', t => {
  const { root, tasks, options } = bodyFixture(t);
  file(root, `${options.changeRoot}/review.html`, '<!doctype html>');
  const body = renderPrBody({ ...options, previewUrl: 'https://preview.example.test' });
  assert(body.includes(`## Tasks\n\n${tasks}\n## Review`));
  assert(body.includes('feature%2Freview%23one/openspec/changes/review%20work/review.html'));
  assert(body.includes('/continue review work'));
  assert(body.includes('## Preview'));
  assert(body.includes('Concrete problem and behavior.\n\nSecond paragraph.'));
  const output = join(root, 'body.md');
  assert.equal(writePrBody(options, output), true);
  const mtime = statSync(output).mtimeMs;
  assert.equal(writePrBody(options, output), false);
  assert.equal(statSync(output).mtimeMs, mtime);
  for (const alias of ['.agents', '.claude']) {
    const result = run(root, 'node', join(project, alias, 'skills/save/scripts/render-pr-body.mjs'), '--change-root', options.changeRoot, '--mode', 'active', '--repo-url', options.repoUrl, '--branch', options.branch, '--summary-file', options.summaryFile, '--output', output);
    assert.equal(result, 'PR body: unchanged');
  }
});

test('archive bodies omit unavailable links and rendering errors preserve output', t => {
  const { root, options } = bodyFixture(t, true);
  const body = renderPrBody(options);
  assert(!body.includes('/continue'));
  assert(!body.includes('## Review'));
  assert(!body.includes('## Preview'));
  assert(body.includes('/archive/2026-09-22-review%20work'));
  const output = join(root, 'body.md');
  writeFileSync(output, 'keep me');
  for (const bad of [{ summaryFile: join(root, 'absent') }, { branch: '' }, { mode: 'invalid' }, { repoUrl: 'javascript:alert(1)' }, { previewUrl: 'https://user:secret@example.test' }, { changeRoot: '../outside' }]) {
    assert.throws(() => writePrBody({ ...options, ...bad }, output));
    assert.equal(readFileSync(output, 'utf8'), 'keep me');
  }
  assert.throws(() => writePrBody(options, join(root, options.changeRoot, 'tasks.md')), /input artifact/);
  file(root, `${options.changeRoot}/proposal.md`, '# No status\n');
  assert.throws(() => writePrBody(options, output), /Status/);
  assert.equal(readFileSync(output, 'utf8'), 'keep me');
});
