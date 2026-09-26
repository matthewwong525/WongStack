import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

const script = new URL('../../.agents/skills/save/scripts/mini-app-push.sh', import.meta.url).pathname;
const PASS = "import test from 'node:test';\ntest('passes', () => {});\n";
const FAIL = "import test from 'node:test';\ntest('fails', () => { throw new Error('broken'); });\n";

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}
function write(root, path, text) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
}
function clone(t, origin, name) {
  const dir = join(dirname(origin), name);
  git(dirname(origin), 'clone', '-q', origin, name);
  git(dir, 'config', 'user.email', `${name}@example.test`);
  git(dir, 'config', 'user.name', name);
  return dir;
}

// A bare origin with one app, the saver's clone with one unpushed commit to that
// app, and a second clone that can move main underneath it.
function repos(t) {
  const root = mkdtempSync(join(tmpdir(), 'mini-push-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const origin = join(root, 'origin.git');
  git(root, 'init', '-q', '--bare', '-b', 'main', origin);
  const seed = clone(t, origin, 'seed');
  write(seed, 'README.md', 'repo\n');
  write(seed, 'mini-apps/apps/tips/index.html', 'v1\n');
  write(seed, 'mini-apps/apps/tips/tip.test.mjs', PASS);
  git(seed, 'add', '.');
  git(seed, 'commit', '-q', '-m', 'seed');
  git(seed, 'push', '-q', 'origin', 'HEAD:main');
  const saver = clone(t, origin, 'saver');
  const other = clone(t, origin, 'other');
  write(saver, 'mini-apps/apps/tips/index.html', 'v2 from the saver\n');
  git(saver, 'commit', '-q', '-am', 'feat(mini): tips — v2');
  return { origin, saver, other };
}
function move(dir, path, text, message = 'someone else lands on main') {
  write(dir, path, text);
  git(dir, 'add', '.');
  git(dir, 'commit', '-q', '-m', message);
  git(dir, 'push', '-q', 'origin', 'HEAD:main');
}
function push(saver) {
  const r = spawnSync('bash', [script, 'tips'], { cwd: saver, encoding: 'utf8' });
  const out = Object.fromEntries(r.stdout.trim().split('\n').filter(l => l.includes('=')).map(l => l.split(/=(.*)/s).slice(0, 2)));
  return { status: r.status, out, stderr: r.stderr };
}
const originMain = origin => git(origin, 'rev-parse', 'main');

test('a clean save pushes straight to main', t => {
  const { origin, saver } = repos(t);
  const r = push(saver);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.out.rebased, 'no');
  assert.equal(originMain(origin), git(saver, 'rev-parse', 'HEAD'));
});

test('a main that moved on another file gets one rebase and a push', t => {
  const { origin, saver, other } = repos(t);
  move(other, 'README.md', 'repo, edited elsewhere\n');
  const r = push(saver);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.out.rebased, 'yes');
  assert.equal(originMain(origin), git(saver, 'rev-parse', 'HEAD'));
  assert.equal(git(origin, 'show', 'main:README.md'), 'repo, edited elsewhere');
  assert.equal(git(origin, 'show', 'main:mini-apps/apps/tips/index.html'), 'v2 from the saver');
});

test('a conflicting change to the same app aborts the rebase and falls back', t => {
  const { origin, saver, other } = repos(t);
  move(other, 'mini-apps/apps/tips/index.html', 'v2 from someone else\n');
  const before = originMain(origin);
  const r = push(saver);
  assert.equal(r.status, 3);
  assert.equal(r.out.reason, 'rebase-conflict');
  assert.equal(originMain(origin), before);
  assert.ok(!existsSync(join(saver, '.git/rebase-merge')) && !existsSync(join(saver, '.git/rebase-apply')), 'no rebase left in progress');
});

test('a failing test pushes nothing', t => {
  const { origin, saver } = repos(t);
  write(saver, 'mini-apps/apps/tips/tip.test.mjs', FAIL);
  git(saver, 'commit', '-q', '-am', 'break the test');
  const before = originMain(origin);
  const r = push(saver);
  assert.equal(r.status, 1);
  assert.equal(r.out.reason, 'tests');
  assert.equal(originMain(origin), before);
});

test('a commit outside the app folder never takes the direct route', t => {
  const { origin, saver } = repos(t);
  write(saver, 'schema/migrations/0001_tips.sql', 'create table tips (id integer);\n');
  git(saver, 'add', '.');
  git(saver, 'commit', '-q', '-m', 'a migration');
  const before = originMain(origin);
  const r = push(saver);
  assert.equal(r.status, 3);
  assert.equal(r.out.reason, 'outside');
  assert.equal(originMain(origin), before);
});

test('a push refused by a rule is not retried', t => {
  const { origin, saver } = repos(t);
  const hook = join(origin, 'hooks/pre-receive');
  writeFileSync(hook, '#!/bin/sh\necho "denied by a branch rule" >&2\nexit 1\n');
  chmodSync(hook, 0o755);
  const r = push(saver);
  assert.equal(r.status, 3);
  assert.equal(r.out.reason, 'refused');
  assert.equal(r.out.rebased, 'no');
});

test('a test that fails on top of the moved main falls back', t => {
  const { origin, saver, other } = repos(t);
  move(other, 'mini-apps/apps/tips/extra.test.mjs', FAIL);
  const before = originMain(origin);
  const r = push(saver);
  assert.equal(r.status, 3);
  assert.equal(r.out.reason, 'tests-after-rebase');
  assert.equal(r.out.rebased, 'yes');
  assert.equal(originMain(origin), before);
});
