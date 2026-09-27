import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const script = new URL('../tag-releases.mjs', import.meta.url).pathname;

// A fake gh: `release list` prints $RELEASES (comma-separated); `release create` logs its
// arguments, then its notes from stdin, to $FAKE_DIR/created.
const FAKE_GH = `#!/usr/bin/env bash
case "$1 $2" in
  "release list") tr , '\\n' <<< "\${RELEASES:-}" | sed '/^$/d' ;;
  "release create") { echo "ARGS $*"; cat; echo; } >> "$FAKE_DIR/created" ;;
  *) exit 9 ;;
esac
`;

// A repo whose first-parent history sets VERSION to each of `versions` in turn,
// with commit titles from `titles` when given, and CHANGELOG.md as `changelog`.
function repo(t, { versions, titles = {}, changelog, tags = [] }) {
  const dir = mkdtempSync(join(tmpdir(), 'tag-releases-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const root = join(dir, 'repo');
  mkdirSync(root);
  const git = (...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'main');
  const shas = {};
  for (const version of versions) {
    writeFileSync(join(root, 'VERSION'), `${version}\n`);
    git('add', 'VERSION');
    git('commit', '-q', '-m', titles[version] ?? `release (v${version})`);
    shas[version] = git('rev-parse', 'HEAD');
  }
  for (const tag of tags) git('tag', tag, shas[tag.slice(1)]);
  writeFileSync(join(root, 'CHANGELOG.md'), changelog);
  mkdirSync(join(dir, 'bin'));
  writeFileSync(join(dir, 'bin', 'gh'), FAKE_GH);
  chmodSync(join(dir, 'bin', 'gh'), 0o755);
  const run = (args = [], env = {}) => {
    const result = spawnSync(process.execPath, [script, ...args], {
      cwd: root, encoding: 'utf8',
      env: { ...process.env, PATH: `${join(dir, 'bin')}:${process.env.PATH}`, FAKE_DIR: dir, GITHUB_REPOSITORY: '', ...env },
    });
    const file = join(dir, 'created');
    return { ...result, created: existsSync(file) ? readFileSync(file, 'utf8') : '' };
  };
  return { shas, run };
}

const entry = (version, title, body = `- Notes for ${version}.`) => `## ${version} — ${title}\n\n${body}\n\n`;
const CHANGELOG = `# Changelog\n\nIntro.\n\n${entry('1.2.0', 'Third')}${entry('1.1.0', 'Second')}${entry('1.0.0', 'First')}## Before 1.0.0\n\nIn git history.\n`;
const creates = created => created.split('\n').filter(line => line.startsWith('ARGS ')).map(line => line.split(' ')[3]);

test('every version without a Release gets one on the commit that set VERSION, oldest first', t => {
  const { shas, run } = repo(t, { versions: ['1.0.0', '1.1.0', '1.2.0'], changelog: CHANGELOG });
  const result = run([], { RELEASES: 'v1.1.0' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(creates(result.created), ['v1.0.0', 'v1.2.0']);
  assert.match(result.created, new RegExp(`ARGS release create v1.0.0 --target ${shas['1.0.0']} --title 1.0.0 — First --notes-file - --latest=false\\n- Notes for 1.0.0.`));
  assert.match(result.created, new RegExp(`ARGS release create v1.2.0 --target ${shas['1.2.0']} --title 1.2.0 — Third --notes-file - --latest=true\\n- Notes for 1.2.0.`));
  assert.doesNotMatch(result.created, /Before 1.0.0|In git history/);
});

test('the tag follows VERSION, not a commit title that names another version', t => {
  const { shas, run } = repo(t, {
    versions: ['1.0.0', '1.1.0', '1.2.0'], titles: { '1.2.0': 'feat: something (v1.0.5)' }, changelog: CHANGELOG,
  });
  const result = run([], { RELEASES: 'v1.0.0,v1.1.0' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.created, new RegExp(`create v1.2.0 --target ${shas['1.2.0']} `));
  assert.doesNotMatch(result.created, /v1\.0\.5/);
});

test('an existing tag is reused, not moved', t => {
  const { run } = repo(t, { versions: ['1.0.0', '1.1.0', '1.2.0'], changelog: CHANGELOG, tags: ['v1.1.0'] });
  const result = run([], { RELEASES: 'v1.0.0,v1.2.0' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.created, /ARGS release create v1\.1\.0 --verify-tag --title/);
  assert.doesNotMatch(result.created, /--target/);
});

test('a changelog version that VERSION never held fails the run after the rest are created', t => {
  const { run } = repo(t, { versions: ['1.0.0', '1.2.0'], changelog: CHANGELOG });
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no commit set VERSION to 1\.1\.0/);
  assert.deepEqual(creates(result.created), ['v1.0.0', 'v1.2.0']);
});

test('--dry-run prints the plan and creates nothing', t => {
  const { shas, run } = repo(t, { versions: ['1.0.0', '1.1.0', '1.2.0'], changelog: CHANGELOG });
  const result = run(['--dry-run'], { RELEASES: 'v1.0.0,v1.1.0' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `would create v1.2.0 at ${shas['1.2.0'].slice(0, 7)}\n`);
  assert.equal(result.created, '');
});

test('relative links in the notes point at the repo at that tag', t => {
  const body = '- See [the page](wiki/a.md#x), [a site](https://example.com), and [below](#y).';
  const { run } = repo(t, { versions: ['1.0.0'], changelog: entry('1.0.0', 'Only', body) });
  const result = run([], { GITHUB_REPOSITORY: 'owner/name' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.created, /\[the page\]\(https:\/\/github\.com\/owner\/name\/blob\/v1\.0\.0\/wiki\/a\.md#x\), \[a site\]\(https:\/\/example\.com\), and \[below\]\(#y\)/);
});
