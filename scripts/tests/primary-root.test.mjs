import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { primaryRoot, PrimaryRootError } from '../../.agents/skills/memory/scripts/lib/primary-root.mjs';

const cli = new URL('../../.agents/skills/memory/scripts/lib/primary-root.mjs', import.meta.url).pathname;
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, stdio: 'ignore' });

// A temp dir holding a repo `main` with one commit, removed when the test ends.
function repo(t) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wong-test-primary-root-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  git(dir, 'init', '-q', '-b', 'main', 'main');
  git(join(dir, 'main'), 'commit', '-q', '--allow-empty', '-m', 'init');
  return dir;
}

test('a normal checkout is its own primary', t => {
  const main = join(repo(t), 'main');
  const found = primaryRoot(main);
  assert.equal(found.primary, main);
  assert.equal(found.root, main);
  assert.equal(found.linked, false);
});

test('a linked worktree resolves to the primary checkout', t => {
  const dir = repo(t);
  git(join(dir, 'main'), 'worktree', 'add', '-q', join(dir, 'linked'), '-b', 'x');
  const found = primaryRoot(join(dir, 'linked'));
  assert.equal(found.primary, join(dir, 'main'));
  assert.equal(found.root, join(dir, 'linked'));
  assert.equal(found.linked, true);
});

test('a worktree of a bare repository has no primary checkout', t => {
  const dir = repo(t);
  git(dir, 'clone', '-q', '--bare', 'main', 'bare.git');
  git(join(dir, 'bare.git'), 'worktree', 'add', '-q', join(dir, 'wt'), 'main');
  assert.throws(() => primaryRoot(join(dir, 'wt')), PrimaryRootError);
  assert.throws(() => primaryRoot(join(dir, 'wt')), /is not a checkout/);
});

test('outside a repository the lookup fails', t => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wong-test-primary-root-none-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  assert.throws(() => primaryRoot(dir), /not inside a Git checkout/);
});

test('the CLI prints the primary checkout, or exits 1 with the reason', t => {
  const dir = repo(t);
  git(join(dir, 'main'), 'worktree', 'add', '-q', join(dir, 'linked'), '-b', 'x');
  const ok = spawnSync(process.execPath, [cli, join(dir, 'linked')], { encoding: 'utf8' });
  assert.equal(ok.status, 0);
  assert.equal(ok.stdout, `${join(dir, 'main')}\n`);
  const bad = spawnSync(process.execPath, [cli, dir], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /^primary-root: not inside a Git checkout/);
});
