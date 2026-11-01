// The plan's throwaway prototype: a copy of the checkout for real After pictures, kept as a diff for the build.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const script = resolve(import.meta.dirname, '../../.claude/skills/plan/scripts/prototype.mjs');
const git = (cwd, ...args) => spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8' });

// A one-commit checkout with an app screen, its packages, and a stand-in preview script that records its arguments.
function checkout(fn) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wong-prototype-')));
  try {
    git(dir, 'init', '-q');
    mkdirSync(join(dir, 'app', 'node_modules', 'pkg'), { recursive: true });
    mkdirSync(join(dir, 'scripts'));
    mkdirSync(join(dir, 'schema', 'migrations'), { recursive: true });
    writeFileSync(join(dir, '.gitignore'), 'node_modules/\n.scratch/\n');
    writeFileSync(join(dir, 'app', 'Screen.tsx'), 'export const Screen = () => null;\n');
    writeFileSync(join(dir, 'schema', 'migrations', '0001_start.sql'), 'select 1;\n');
    writeFileSync(join(dir, 'scripts', 'cf-preview.sh'), 'echo "preview $*" > uploaded.txt\n');
    chmodSync(join(dir, 'scripts', 'cf-preview.sh'), 0o755);
    git(dir, 'add', '-A');
    git(dir, '-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-qm', 'start');
    return fn(dir);
  } finally {
    git(dir, 'worktree', 'prune');
    rmSync(dir, { recursive: true, force: true });
  }
}
const run = (cwd, ...args) => spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' });

test('start makes the copy with the checkout\'s packages; finish keeps its changes as a diff and removes it', () => checkout(dir => {
  const started = run(dir, 'start', 'demo');
  assert.equal(started.status, 0, started.stderr);
  const copy = join(dir, '.scratch', 'demo-prototype');
  assert.equal(started.stdout, `${copy}\n`);
  assert.ok(existsSync(join(copy, 'app', 'node_modules', 'pkg')), 'the packages are linked in');
  assert.equal(run(dir, 'start', 'demo').stdout, `${copy}\n`, 'a second start reuses the copy');
  writeFileSync(join(copy, 'app', 'Screen.tsx'), 'export const Screen = () => "After";\n');
  writeFileSync(join(copy, 'app', 'New.tsx'), 'export const New = 1;\n');
  const uploaded = run(dir, 'upload', 'demo');
  assert.equal(uploaded.status, 0, uploaded.stderr);
  assert.equal(readFileSync(join(copy, 'uploaded.txt'), 'utf8'), 'preview --alias demo\n');
  rmSync(join(copy, 'uploaded.txt'));
  const finished = run(dir, 'finish', 'demo');
  assert.equal(finished.status, 0, finished.stderr);
  const diff = join(dir, '.scratch', 'demo-prototype.diff');
  assert.equal(finished.stdout, `${diff}\n`);
  const kept = readFileSync(diff, 'utf8');
  assert.match(kept, /\+export const Screen = \(\) => "After";/);
  assert.match(kept, /app\/New\.tsx/);
  assert.doesNotMatch(kept, /node_modules/);
  assert.equal(existsSync(copy), false, 'the copy is gone');
  assert.equal(git(dir, 'worktree', 'list').stdout.split('\n').filter(Boolean).length, 1);
  assert.equal(git(dir, 'apply', '--check', diff).status, 0, 'the build can apply the diff');
}));

test('start after finish brings back the earlier edits; a diff that no longer applies stops it with no copy left', () => checkout(dir => {
  const copy = join(dir, '.scratch', 'demo-prototype');
  run(dir, 'start', 'demo');
  writeFileSync(join(copy, 'app', 'Screen.tsx'), 'export const Screen = () => "After";\n');
  writeFileSync(join(copy, 'app', 'New.tsx'), 'export const New = 1;\n');
  run(dir, 'finish', 'demo');
  const again = run(dir, 'start', 'demo');
  assert.equal(again.status, 0, again.stderr);
  assert.equal(readFileSync(join(copy, 'app', 'Screen.tsx'), 'utf8'), 'export const Screen = () => "After";\n');
  assert.equal(readFileSync(join(copy, 'app', 'New.tsx'), 'utf8'), 'export const New = 1;\n');
  writeFileSync(join(copy, 'app', 'Screen.tsx'), 'export const Screen = () => "Later";\n');
  const diff = join(dir, '.scratch', 'demo-prototype.diff');
  run(dir, 'finish', 'demo');
  assert.match(readFileSync(diff, 'utf8'), /app\/New\.tsx/, 'the next diff keeps the earlier edit');
  assert.match(readFileSync(diff, 'utf8'), /\+export const Screen = \(\) => "Later";/);
  writeFileSync(diff, readFileSync(diff, 'utf8').replace('-export const Screen = () => null;', '-export const Screen = () => 0;'));
  const stopped = run(dir, 'start', 'demo');
  assert.equal(stopped.status, 1);
  assert.equal(stopped.stderr, `prototype: ${diff} does not apply to this commit: fix or remove it, then start again\n`);
  assert.equal(existsSync(copy), false, 'no half-made copy stays');
  assert.equal(git(dir, 'worktree', 'list').stdout.split('\n').filter(Boolean).length, 1);
}));

test('upload refuses a copy with a new migration; upload and finish need a copy; a bad name or verb stops', () => checkout(dir => {
  assert.match(run(dir, 'upload', 'demo').stderr, /^prototype: no prototype at .*: run start first\n$/);
  assert.equal(run(dir, 'finish', 'demo').status, 1);
  run(dir, 'start', 'demo');
  const copy = join(dir, '.scratch', 'demo-prototype');
  writeFileSync(join(copy, 'schema', 'migrations', '0002_more.sql'), 'select 2;\n');
  const refused = run(dir, 'upload', 'demo');
  assert.equal(refused.status, 1);
  assert.equal(refused.stderr, 'prototype: the prototype changes schema/migrations: write sample data into the screen instead\n');
  assert.equal(existsSync(join(copy, 'uploaded.txt')), false, 'nothing was uploaded');
  assert.equal(run(dir, 'start', 'de mo').stderr, 'prototype: a change name is letters, digits, - and _, up to 92: de mo\n');
  assert.equal(run(dir, 'make', 'demo').status, 2);
  assert.equal(run(dir, 'start').status, 2);
}));
