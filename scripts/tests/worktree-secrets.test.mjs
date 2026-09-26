import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.agents/skills/ship/scripts/worktree-secrets.mjs');
const SECRET = 'value-that-must-not-print';

const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', ...args], { cwd, stdio: 'ignore' });

// A primary checkout with `.env` and `app/.dev.vars`, plus one linked worktree.
function fixture(t, { env = `# tools\nA=1\nB=${SECRET}\n`, devVars = 'S=1\nOLD=1\n', ignore = '.env*\n!.env.example\n.dev.vars*\n!.dev.vars.example\n' } = {}) {
  const dir = mkdtempSync('/tmp/worktree-secrets-');
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const primary = join(dir, 'primary');
  mkdirSync(join(primary, 'app'), { recursive: true });
  git(primary, 'init', '-q', '-b', 'main');
  writeFileSync(join(primary, '.gitignore'), ignore);
  writeFileSync(join(primary, 'app/.gitkeep'), '');
  git(primary, 'add', '.');
  git(primary, 'commit', '-qm', 'init');
  writeFileSync(join(primary, '.env'), env);
  writeFileSync(join(primary, 'app/.dev.vars'), devVars);
  const worktree = join(dir, 'wt');
  git(primary, 'worktree', 'add', '-q', '-b', 'feature', worktree);
  return { primary, worktree };
}

function run(cwd, command) {
  const result = spawnSync(process.execPath, [script, command], { cwd, encoding: 'utf8' });
  const output = `${result.stdout}${result.stderr}`;
  assert.equal(result.status, 0, output);
  assert.ok(!output.includes(SECRET), 'no value in output');
  return JSON.parse(result.stdout);
}

const read = (root, rel) => readFileSync(join(root, rel), 'utf8');
const write = (root, rel, text) => writeFileSync(join(root, rel), text);

test('seed copies each live file and keeps the baseline out of the working tree', t => {
  const { primary, worktree } = fixture(t);
  const result = run(worktree, 'seed');
  assert.deepEqual(result.seeded.sort(), ['.env', 'app/.dev.vars']);
  assert.equal(read(worktree, 'app/.dev.vars'), read(primary, 'app/.dev.vars'));
  const gitDir = execFileSync('git', ['rev-parse', '--absolute-git-dir'], { cwd: worktree, encoding: 'utf8' }).trim();
  assert.ok(existsSync(join(gitDir, 'wongstack-secrets-base.json')));
  assert.ok(!readFileSync(join(gitDir, 'wongstack-secrets-base.json'), 'utf8').includes(SECRET));
  assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: worktree, encoding: 'utf8' }), '');
});

test('seed never overwrites a file the worktree already has', t => {
  const { worktree } = fixture(t);
  write(worktree, '.env', 'A=mine\n');
  const result = run(worktree, 'seed');
  assert.deepEqual(result.unseeded, ['.env']);
  assert.equal(read(worktree, '.env'), 'A=mine\n');
});

test('seed skips a file the worktree does not ignore', t => {
  const { worktree } = fixture(t, { ignore: '.env*\n' });
  const result = run(worktree, 'seed');
  assert.deepEqual(result.skipped.map(s => s.path), ['app/.dev.vars']);
  assert.ok(!existsSync(join(worktree, 'app/.dev.vars')));
});

test('a deletion waits for promote, then leaves the primary', t => {
  const { primary, worktree } = fixture(t);
  run(worktree, 'seed');
  write(worktree, 'app/.dev.vars', 'S=1\n');
  assert.match(read(primary, 'app/.dev.vars'), /OLD=1/);
  assert.deepEqual(run(worktree, 'status').files, [{ path: 'app/.dev.vars', add: [], remove: ['OLD'], change: [], conflict: [], unresolved: [] }]);
  const result = run(worktree, 'promote');
  assert.deepEqual(result.promoted, [{ path: 'app/.dev.vars', keys: ['OLD'] }]);
  assert.equal(read(primary, 'app/.dev.vars'), 'S=1\n');
});

test('promote sets a changed value and keeps comments and line order', t => {
  const { primary, worktree } = fixture(t);
  run(worktree, 'seed');
  write(worktree, '.env', `# tools\nA=2\nB=${SECRET}\n`);
  run(worktree, 'promote');
  assert.equal(read(primary, '.env'), `# tools\nA=2\nB=${SECRET}\n`);
});

test('promote keeps a key the primary gained after the seed', t => {
  const { primary, worktree } = fixture(t);
  run(worktree, 'seed');
  write(primary, 'app/.dev.vars', 'S=1\nOLD=1\nNEW=1\n');
  const result = run(worktree, 'promote');
  assert.deepEqual(result.promoted, []);
  assert.match(read(primary, 'app/.dev.vars'), /NEW=1/);
});

test('promote keeps a rotation made in the primary', t => {
  const { primary, worktree } = fixture(t);
  run(worktree, 'seed');
  write(primary, 'app/.dev.vars', 'S=rotated\nOLD=1\n');
  run(worktree, 'promote');
  assert.match(read(primary, 'app/.dev.vars'), /S=rotated/);
});

test('promote skips and names a key both sides changed', t => {
  const { primary, worktree } = fixture(t);
  run(worktree, 'seed');
  write(primary, 'app/.dev.vars', 'S=theirs\nOLD=1\n');
  write(worktree, 'app/.dev.vars', 'S=mine\nOLD=1\n');
  const result = run(worktree, 'promote');
  assert.deepEqual(result.skipped, [{ path: 'app/.dev.vars', keys: ['S'], reason: 'both sides changed' }]);
  assert.match(read(primary, 'app/.dev.vars'), /S=theirs/);
});

test('with no baseline, promote applies adds only and names the rest', t => {
  const { primary, worktree } = fixture(t);
  write(worktree, 'app/.dev.vars', 'S=2\nADDED=1\n');
  const result = run(worktree, 'promote');
  assert.deepEqual(result.promoted, [{ path: 'app/.dev.vars', keys: ['ADDED'] }]);
  assert.deepEqual(result.unresolved.find(u => u.path === 'app/.dev.vars').keys, ['OLD', 'S']);
  assert.equal(read(primary, 'app/.dev.vars'), 'S=1\nOLD=1\nADDED=1\n');
});

test('an unseeded file in a seeded worktree is report-only', t => {
  const { primary, worktree } = fixture(t);
  write(worktree, 'app/.dev.vars', 'S=2\n');
  const seeded = run(worktree, 'seed');
  assert.deepEqual(seeded.unseeded, ['app/.dev.vars']);
  assert.deepEqual(run(worktree, 'status').seeded, ['.env']);
  const result = run(worktree, 'promote');
  assert.deepEqual(result.promoted, []);
  assert.deepEqual(result.unresolved, [{ path: 'app/.dev.vars', keys: ['OLD', 'S'] }]);
  assert.equal(read(primary, 'app/.dev.vars'), 'S=1\nOLD=1\n');
});

test('promote skips a file the primary does not ignore', t => {
  const { primary, worktree } = fixture(t);
  run(worktree, 'seed');
  write(worktree, 'app/.dev.vars', 'S=1\n');
  write(primary, '.gitignore', '.env*\n');
  const result = run(worktree, 'promote');
  assert.equal(result.skipped[0].reason, 'not git-ignored in the primary checkout');
  assert.match(read(primary, 'app/.dev.vars'), /OLD=1/);
});

test('a second promote changes nothing', t => {
  const { primary, worktree } = fixture(t);
  run(worktree, 'seed');
  write(worktree, 'app/.dev.vars', 'S=2\nADDED=1\n');
  run(worktree, 'promote');
  const after = read(primary, 'app/.dev.vars');
  const again = run(worktree, 'promote');
  assert.deepEqual(again.promoted, []);
  assert.equal(read(primary, 'app/.dev.vars'), after);
});

test('the primary checkout has nothing to do', t => {
  const { primary } = fixture(t);
  assert.equal(run(primary, 'promote').primary, true);
});
