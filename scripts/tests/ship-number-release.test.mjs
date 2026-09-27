import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const script = new URL('../../.agents/skills/ship/scripts/number-release.mjs', import.meta.url).pathname;

const entry = (heading, notes = '- Notes.') => `## ${heading}\n\n${notes}\n\n`;
const intro = '# Changelog\n\nIntro.\n\n';
const BASE = `${intro}${entry('26.1.0 — Current')}${entry('26.0.0 — Older').trimEnd()}\n`;

// A repo whose `main` is pushed to a local bare `origin`, with `feature` checked out from it.
// `files` are written on main's first commit; a null value leaves the file out.
function repo(t, files = { VERSION: '26.1.0\n', 'CHANGELOG.md': BASE }) {
  const dir = mkdtempSync(join(tmpdir(), 'number-release-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const work = join(dir, 'work');
  mkdirSync(work);
  const git = (...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: work, encoding: 'utf8' }).trim();
  const write = changes => {
    for (const [name, text] of Object.entries(changes)) if (text !== null) writeFileSync(join(work, name), text);
  };
  const commit = (changes, message = 'change') => {
    write(changes);
    writeFileSync(join(work, 'other.txt'), `${message}\n`);
    git('add', '-A');
    git('commit', '-q', '-m', message);
  };
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', join(dir, 'origin.git')]);
  git('init', '-q', '-b', 'main');
  commit(files, 'main');
  git('remote', 'add', 'origin', join(dir, 'origin.git'));
  git('push', '-q', '-u', 'origin', 'main');
  git('checkout', '-q', '-b', 'feature');
  // Another release lands on main while the branch waits.
  const land = changes => {
    git('checkout', '-q', 'main');
    commit(changes, 'landed');
    git('push', '-q', 'origin', 'main');
    git('checkout', '-q', 'feature');
  };
  // Merge main in, keeping `resolved` as the conflict resolution.
  const mergeMain = resolved => {
    git('merge', '-q', '-s', 'ours', '--no-edit', 'origin/main');
    write(resolved);
  };
  const read = name => (existsSync(join(work, name)) ? readFileSync(join(work, name), 'utf8') : null);
  const run = () => spawnSync(process.execPath, [script], { cwd: work, encoding: 'utf8' });
  return { commit, land, mergeMain, read, run, write };
}

test('no CHANGELOG.md numbers nothing', t => {
  const r = repo(t, { VERSION: '1.0.0\n' });
  const result = r.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'release=none\n');
  assert.equal(r.read('VERSION'), '1.0.0\n');
  assert.equal(r.read('CHANGELOG.md'), null);
});

test('no entry of its own numbers nothing and changes no file', t => {
  const r = repo(t);
  r.commit({ 'notes.md': 'unrelated\n' });
  const result = r.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'release=none\n');
  assert.equal(r.read('VERSION'), '26.1.0\n');
  assert.equal(r.read('CHANGELOG.md'), BASE);
});

test('a ## Next (minor) entry over 26.1.0 becomes 26.2.0', t => {
  const r = repo(t);
  r.write({ 'CHANGELOG.md': BASE.replace(intro, `${intro}${entry('Next (minor) — New thing', '- New.')}`) });
  const result = r.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'release=26.2.0 from=26.1.0\n');
  assert.equal(r.read('VERSION'), '26.2.0\n');
  assert.equal(r.read('CHANGELOG.md'), BASE.replace(intro, `${intro}${entry('26.2.0 — New thing', '- New.')}`));
});

test('patch and major levels bump their own part', t => {
  for (const [level, release] of [['patch', '26.1.1'], ['major', '27.0.0']]) {
    const r = repo(t);
    r.write({ 'CHANGELOG.md': BASE.replace(intro, `${intro}${entry(`Next (${level}) — Thing`)}`) });
    assert.equal(r.run().stdout, `release=${release} from=26.1.0\n`);
  }
});

test('a numbered entry is renumbered after another release took its number, and moves on top', t => {
  const r = repo(t);
  const mine = entry('26.2.0 — Mine', '- Mine.');
  r.commit({ VERSION: '26.2.0\n', 'CHANGELOG.md': BASE.replace(intro, `${intro}${mine}`) });
  const theirs = entry('26.2.0 — Theirs', '- Theirs.');
  r.land({ VERSION: '26.2.0\n', 'CHANGELOG.md': BASE.replace(intro, `${intro}${theirs}`) });
  r.mergeMain({ VERSION: '26.2.0\n', 'CHANGELOG.md': BASE.replace(intro, `${intro}${theirs}${mine}`) });
  const result = r.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'release=26.3.0 from=26.2.0\n');
  assert.equal(r.read('VERSION'), '26.3.0\n');
  assert.equal(r.read('CHANGELOG.md'), BASE.replace(intro, `${intro}${entry('26.3.0 — Mine', '- Mine.')}${theirs}`));
});

test('a branch that raised VERSION to 26.1.1 by hand ships as 26.2.1 over a default branch at 26.2.0', t => {
  const r = repo(t);
  const fix = entry('26.1.1 — Fix', '- Fix.');
  r.commit({ VERSION: '26.1.1\n', 'CHANGELOG.md': BASE.replace(intro, `${intro}${fix}`) });
  const theirs = entry('26.2.0 — Theirs');
  r.land({ VERSION: '26.2.0\n', 'CHANGELOG.md': BASE.replace(intro, `${intro}${theirs}`) });
  r.mergeMain({ VERSION: '26.2.0\n', 'CHANGELOG.md': BASE.replace(intro, `${intro}${fix}${theirs}`) });
  const result = r.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'release=26.2.1 from=26.2.0\n');
  assert.equal(r.read('CHANGELOG.md'), BASE.replace(intro, `${intro}${entry('26.2.1 — Fix', '- Fix.')}${theirs}`));
});

test('a branch behind the default branch exits 3 and changes nothing', t => {
  const r = repo(t);
  const changelog = BASE.replace(intro, `${intro}${entry('Next (minor) — New')}`);
  r.commit({ 'CHANGELOG.md': changelog });
  r.land({ 'notes.md': 'moved\n' });
  const result = r.run();
  assert.equal(result.status, 3);
  assert.equal(result.stdout, 'behind=yes\n');
  assert.equal(r.read('VERSION'), '26.1.0\n');
  assert.equal(r.read('CHANGELOG.md'), changelog);
});

test('two entries, an unknown level, or no VERSION on the default branch exit 1', t => {
  const two = repo(t);
  two.write({ 'CHANGELOG.md': BASE.replace(intro, `${intro}${entry('Next (minor) — A')}${entry('Next (patch) — B')}`) });
  const twoResult = two.run();
  assert.equal(twoResult.status, 1);
  assert.match(twoResult.stderr, /one entry per release, found 2: ## Next \(minor\) — A \| ## Next \(patch\) — B/);

  const unknown = repo(t);
  unknown.write({ 'CHANGELOG.md': BASE.replace(intro, `${intro}${entry('Next (huge) — A')}`) });
  const unknownResult = unknown.run();
  assert.equal(unknownResult.status, 1);
  assert.match(unknownResult.stderr, /unknown level in "## Next \(huge\) — A"/);
  assert.equal(unknown.read('VERSION'), '26.1.0\n');

  const noVersion = repo(t, { VERSION: null, 'CHANGELOG.md': BASE });
  noVersion.write({ 'CHANGELOG.md': BASE.replace(intro, `${intro}${entry('Next (minor) — A')}`) });
  const noVersionResult = noVersion.run();
  assert.equal(noVersionResult.status, 1);
  assert.match(noVersionResult.stderr, /origin\/main has no VERSION/);
  assert.equal(noVersion.read('VERSION'), null);
});

test('a numbered entry with no lower version exits 1', t => {
  const r = repo(t, { VERSION: '1.0.0\n', 'CHANGELOG.md': intro });
  r.write({ 'CHANGELOG.md': `${intro}${entry('1.0.0 — First')}` });
  const result = r.run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no version below "## 1\.0\.0 — First"/);
});

test('a missing blank line before a heading is restored', t => {
  const squashed = `${intro}## 26.1.0 — Current\n\n- Current notes.\n## 26.0.0 — Older\n\n- Older notes.\n\n\n`;
  const r = repo(t, { VERSION: '26.1.0\n', 'CHANGELOG.md': squashed });
  r.write({ 'CHANGELOG.md': squashed.replace(intro, `${intro}${entry('Next (patch) — Tidy')}`) });
  const result = r.run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(r.read('CHANGELOG.md'), `${intro}${entry('26.1.1 — Tidy')}${entry('26.1.0 — Current', '- Current notes.')}${entry('26.0.0 — Older', '- Older notes.').trimEnd()}\n`);
});

test('no origin/main fails with a plain message', t => {
  const dir = mkdtempSync(join(tmpdir(), 'number-release-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q', '-b', 'main', dir]);
  writeFileSync(join(dir, 'CHANGELOG.md'), `${intro}${entry('Next (minor) — A')}`);
  const result = spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no origin\/main; fetch the default branch first/);
});
