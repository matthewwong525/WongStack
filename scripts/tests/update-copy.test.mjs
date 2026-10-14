import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { updateCopy } from '../../.agents/skills/save/scripts/update-copy.mjs';

const APP = 'https://business.example.com/api/access/code/git/';
const env = { ...process.env, GIT_AUTHOR_NAME: 'Ada', GIT_AUTHOR_EMAIL: 'ada@example.com', GIT_COMMITTER_NAME: 'Ada', GIT_COMMITTER_EMAIL: 'ada@example.com', GIT_CONFIG_GLOBAL: '/dev/null' };
const git = (cwd, ...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim();

// A copy cloned from a published project, then pointed at `origin` as setup leaves it; `change` makes it differ.
function copy(t, { origin = APP, change } = {}) {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'wong-test-update-copy-')));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const served = join(base, 'served'), dir = join(base, 'copy');
  git(base, 'init', '-q', '-b', 'main', served);
  writeFileSync(join(served, 'README.md'), 'first\n');
  git(served, 'add', '-A');
  git(served, 'commit', '-qm', 'first');
  git(base, 'clone', '-q', served, dir);
  git(dir, 'remote', 'set-url', 'origin', origin);
  change?.(dir);
  return dir;
}
const started = dir => {
  const pulls = [];
  return [updateCopy(dir, root => pulls.push(root)), pulls];
};

test('a clean teammate copy on the published branch starts one pull in the background', t => {
  const dir = copy(t);
  assert.deepEqual(started(dir), [true, [dir]]);
  // An untracked file is the person's own, and stops nothing; the pull never overwrites it.
  writeFileSync(join(dir, 'scratch.txt'), 'mine\n');
  assert.deepEqual(started(dir), [true, [dir]]);
});

test('an edited copy, one with a commit ahead, another branch, or the owner\'s GitHub copy is left alone', t => {
  const cases = {
    edited: { change: dir => writeFileSync(join(dir, 'README.md'), 'edited\n') },
    ahead: { change: dir => { writeFileSync(join(dir, 'mine.txt'), 'mine\n'); git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'mine'); } },
    'other branch': { change: dir => git(dir, 'switch', '-q', '-c', 'ada/fix') },
    'owner on GitHub': { origin: 'https://github.com/owner/project.git' },
  };
  for (const [name, options] of Object.entries(cases)) assert.deepEqual(started(copy(t, options)), [false, []], name);
  // Not a checkout at all.
  const none = realpathSync(mkdtempSync(join(tmpdir(), 'wong-test-update-none-')));
  t.after(() => rmSync(none, { recursive: true, force: true }));
  assert.deepEqual(started(none), [false, []]);
});
