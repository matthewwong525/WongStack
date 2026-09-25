import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync, readlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' });

// Reads the link target from the git index when the path is tracked, and from
// the working tree when it is not tracked yet.
function linkTarget(path) {
  const entries = git('ls-files', '-s', '--', path).split('\n').filter(Boolean);
  if (entries.length) {
    const [meta, name] = entries[0].split('\t');
    const [mode, sha] = meta.split(' ');
    assert.ok(entries.length === 1 && name === path && mode === '120000',
      `${path} is tracked, but not as one link (found ${entries.length} entries, first ${entries[0]})`);
    return git('cat-file', '-p', sha);
  }
  assert.ok(lstatSync(join(repo, path)).isSymbolicLink(), `${path} must be a link to .agents`);
  return readlinkSync(join(repo, path));
}

test('.agents is the one real folder', () => {
  const stat = lstatSync(join(repo, '.agents'));
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink(), '.agents must be a real directory');
});

for (const path of ['.claude', '.codex']) {
  test(`${path} is a link to .agents`, () => {
    assert.equal(linkTarget(path), '.agents');
  });
}

test('git tracks no file under .claude/ or .codex/', () => {
  const inside = git('ls-files').split('\n').filter(path => /^\.(claude|codex)\//.test(path));
  assert.deepEqual(inside, [], 'payload files must live under .agents/, not behind a link');
});

test('the Codex settings and hook live in .agents', () => {
  assert.ok(existsSync(join(repo, '.agents/config.toml')), '.agents/config.toml is missing');
  const hooks = JSON.parse(readFileSync(join(repo, '.agents/hooks.json'), 'utf8'));
  assert.ok(Array.isArray(hooks.hooks?.SessionStart), '.agents/hooks.json needs a hooks.SessionStart array');
});
