import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEST_FILE } from '../../.github/scripts/test-file.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.github/scripts/loosened-checks.mjs');

// Built at run time, so this file never holds a marker the check would flag.
const STRYKER_SKIP = ['// Stryker', 'disable next-line all'].join(' ');
const SKIPPED_TEST = ['test', 'skip'].join('.');
const SKIP_OPTION = ['{ skip', 'true }'].join(': ');

// A clean git: no user or system config, a fixed identity, no signing.
function gitEnv(home) {
  return {
    PATH: process.env.PATH,
    HOME: home,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_AUTHOR_NAME: 'Fixture',
    GIT_AUTHOR_EMAIL: 'fixture@example.test',
    GIT_COMMITTER_NAME: 'Fixture',
    GIT_COMMITTER_EMAIL: 'fixture@example.test',
  };
}

const PACKAGE = JSON.stringify({ scripts: { lint: 'oxlint', test: 'npm run lint && vitest run', dev: 'vite' } }, null, 2);

// A bare "origin" and a clone whose `main` holds a small app with a mini app in
// it, pushed. Work happens on the branch `feature`.
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-loosened-checks-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = gitEnv(root);
  const origin = join(root, 'origin.git');
  const work = join(root, 'work');
  const git = (...args) => execFileSync('git', args, { cwd: work, env, encoding: 'utf8' }).trim();
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', origin], { env });
  mkdirSync(work);
  git('init', '-q', '-b', 'main');
  git('remote', 'add', 'origin', origin);

  const write = files => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(work, path)), { recursive: true });
      writeFileSync(join(work, path), text);
    }
  };
  const commit = (files = {}, message = 'work') => {
    write(files);
    git('add', '-A');
    git('commit', '-q', '--allow-empty', '-m', message);
  };

  commit({
    'app/src/sum.ts': 'export const sum = (a: number, b: number) => a + b;\n',
    'app/src/sum.test.ts': "import { sum } from './sum';\ntest('adds', () => expect(sum(1, 2)).toBe(3));\n",
    'app/vitest.config.ts': 'export default { test: { coverage: { thresholds: { lines: 100 } } } };\n',
    'app/package.json': `${PACKAGE}\n`,
    'app/src/apps/tips/tip.test.ts': "test('tips', () => {});\n",
    'wiki/README.md': '# Wiki\n',
  }, 'base');
  git('push', '-q', '-u', 'origin', 'main');
  const base = git('rev-parse', 'HEAD');
  git('checkout', '-q', '-b', 'feature');

  // The check as CI runs it, against the base.
  const check = (args = ['--base', base]) => spawnSync(process.execPath, [script, ...args], {
    cwd: work, encoding: 'utf8', env: { ...env, DEFAULT_BRANCH: 'main' },
  });
  return { work, git, write, commit, check };
}

const proposal = (...bullets) => `# A change\n\n## Why\n\nBecause.\n\n## Decision log\n\n${bullets.map(b => `- **2026-09-27** — ${b}`).join('\n')}\n`;

function assertFails(result, path) {
  assert.equal(result.status, 1, `${result.stdout}${result.stderr}`);
  assert.match(result.stdout, new RegExp(`\`${path.replaceAll('.', '\\.')}\`[^\\n]*needs a reason`));
  assert.match(result.stdout, new RegExp(`Check: \`${path.replaceAll('.', '\\.')}\``), 'the fix names the file');
}

function assertPasses(result) {
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  assert.doesNotMatch(result.stdout, /needs a reason/);
}

test('a skip comment with no reason fails and says how to pass', t => {
  const f = fixture(t);
  f.commit({ 'app/src/sum.ts': `${STRYKER_SKIP}\nexport const sum = (a: number, b: number) => a + b;\n` });
  assertFails(f.check(), 'app/src/sum.ts');
});

test('a Check: bullet naming the file explains it', t => {
  const f = fixture(t);
  f.commit({
    'app/src/sum.ts': `${STRYKER_SKIP}\nexport const sum = (a: number, b: number) => a + b;\n`,
    'openspec/changes/x/proposal.md': proposal('Assumed: something.', 'Check: `app/src/sum.ts` skips one mutant, because it changes nothing.'),
  });
  const result = f.check();
  assertPasses(result);
  assert.match(result.stdout, /`app\/src\/sum\.ts` turns a check off on a line: explained/);
});

test('a bullet that is not a Check: bullet explains nothing', t => {
  const f = fixture(t);
  f.commit({
    'app/src/sum.ts': `${STRYKER_SKIP}\n`,
    'openspec/changes/x/proposal.md': proposal('Assumed: `app/src/sum.ts` is fine.'),
  });
  assertFails(f.check(), 'app/src/sum.ts');
});

test('a lowered limit fails', t => {
  const f = fixture(t);
  f.commit({ 'app/vitest.config.ts': 'export default { test: { coverage: { thresholds: { lines: 90 } } } };\n' });
  assertFails(f.check(), 'app/vitest.config.ts');
});

test('a deleted test fails, a test moved to another test does not', t => {
  const f = fixture(t);
  renameSync(join(f.work, 'app/src/sum.test.ts'), join(f.work, 'app/src/add.test.ts'));
  f.commit();
  assertPasses(f.check());
  unlinkSync(join(f.work, 'app/src/add.test.ts'));
  f.commit();
  assertFails(f.check(), 'app/src/sum.test.ts');
});

test('a skipped test in a mini app fails', t => {
  const f = fixture(t);
  f.commit({ 'app/src/apps/tips/tip.test.ts': `${SKIPPED_TEST}('tips', () => {});\n` });
  assertFails(f.check(), 'app/src/apps/tips/tip.test.ts');
});

// Node runs `foo_test.mjs`, so a skip there must not slip past.
test('a skipped test in an underscore-named test fails', t => {
  const f = fixture(t);
  f.commit({ 'scripts/tests/foo_test.mjs': `import test from 'node:test';\n${SKIPPED_TEST}('tips', () => {});\n` });
  assertFails(f.check(), 'scripts/tests/foo_test.mjs');
});

test('the test-file rule names every file Node runs by default, plus spec and test_ names', () => {
  for (const path of ['a.test.mjs', 'a-test.js', 'a_test.mjs', 'test-a.mjs', 'test.mjs', 'test_a.py', 'a.spec.ts', 'App.test.tsx', 'test/x.mjs', 'lib/test/x.json']) {
    assert.equal(TEST_FILE.test(path), true, path);
  }
  for (const path of ['app.js', 'api.ts', 'latest.mjs', 'attest.mjs', 'testing.mjs', 'tests/x.mjs', 'index.html']) {
    assert.equal(TEST_FILE.test(path), false, path);
  }
});

test('a test-skip word outside a test file is not a marker', t => {
  const f = fixture(t);
  f.commit({ 'app/src/list.ts': `export const page = ${SKIP_OPTION};\n` });
  assertPasses(f.check());
});

test('the reason survives the archive', t => {
  const f = fixture(t);
  f.commit({
    'app/vitest.config.ts': 'export default {};\n',
    'openspec/changes/x/proposal.md': proposal('Check: `app/vitest.config.ts` drops the limit, because reasons.'),
  });
  f.git('push', '-q', '-u', 'origin', 'feature');
  mkdirSync(join(f.work, 'openspec/changes/archive'), { recursive: true });
  renameSync(join(f.work, 'openspec/changes/x'), join(f.work, 'openspec/changes/archive/2026-09-27-x'));
  f.commit();
  assertPasses(f.check());
});

test('an old proposal the change does not edit excuses nothing', t => {
  const f = fixture(t);
  f.git('checkout', '-q', 'main');
  f.commit({ 'openspec/changes/archive/old/proposal.md': proposal('Check: `app/vitest.config.ts` old reason.') });
  const base = f.git('rev-parse', 'HEAD');
  f.git('checkout', '-q', '-b', 'later');
  f.commit({ 'app/vitest.config.ts': 'export default {};\n' });
  assertFails(f.check(['--base', base]), 'app/vitest.config.ts');
});

test('a package.json edit flags only a change to the test scripts', t => {
  const f = fixture(t);
  f.commit({ 'app/package.json': PACKAGE.replace('"vite"', '"vite --host"') });
  assertPasses(f.check());
  f.commit({ 'app/package.json': PACKAGE.replace('"oxlint"', '"true"') });
  assertFails(f.check(), 'app/package.json');
});

test('the check workflow and its scripts are settings', t => {
  const f = fixture(t);
  f.commit({ '.github/workflows/test.yml': 'name: Test\n', '.github/scripts/app-untouched.sh': 'exit 0\n' });
  const result = f.check();
  assertFails(result, '.github/workflows/test.yml');
  assertFails(result, '.github/scripts/app-untouched.sh');
});

test('a lint step removed from the payload workflow fails, naming the file', t => {
  const f = fixture(t);
  const workflow = 'name: Payload\njobs:\n  checks:\n    steps:\n      - run: oxlint --deny-warnings scripts\n      - run: node --test\n';
  f.commit({ '.github/workflows/payload.yml': workflow });
  f.git('push', '-q', 'origin', 'HEAD:main');
  const base = f.git('rev-parse', 'HEAD');
  f.commit({ '.github/workflows/payload.yml': workflow.replace('      - run: oxlint --deny-warnings scripts\n', '') });
  assertFails(f.check(['--base', base]), '.github/workflows/payload.yml');
});

test('an unexplained deploy workflow edit fails, naming the file', t => {
  const f = fixture(t);
  f.commit({ '.github/workflows/deploy.yml': 'name: Deploy\n' });
  assertFails(f.check(), '.github/workflows/deploy.yml');
});

test('a shared workflow action is settings', t => {
  const f = fixture(t);
  f.commit({ '.github/actions/change-scope/action.yml': 'name: Change scope\n', '.github/actions/change-scope/read.sh': 'exit 0\n' });
  const result = f.check();
  assertFails(result, '.github/actions/change-scope/action.yml');
  assertFails(result, '.github/actions/change-scope/read.sh');
  assert.match(result.stdout, /`\.github\/actions\/change-scope\/action\.yml` changes a check's settings/);
});

// ── Kept checks ───────────────────────────────────────────────────────────────

const KEPT = '.agents/verification/journeys/notes/the-list-counts-its-notes.json';
const NOTES_SPEC = 'openspec/specs/notes/spec.md';
const notesSpec = (then = 'the answer holds the count') => `# Notes

## Requirements

### Requirement: Notes are listed with a count

The list SHALL count its notes.

#### Scenario: The list counts its notes

- **WHEN** the list is asked for
- **THEN** ${then}
`;
const kept = (more = {}) => `${JSON.stringify({
  format: 'verify-journey-1',
  id: 'the-list-counts-its-notes',
  scenario: { capability: 'notes', requirement: 'Notes are listed with a count', scenario: 'The list counts its notes' },
  thenDigest: 'a'.repeat(64),
  probe: 'request',
  writes: false,
  sourcePaths: ['app/src/sum.ts'],
  recordedAt: 'abc1234',
  steps: [['GET', '/api/notes']],
  expect: [{ step: 1, status: 200 }, { step: 1, includes: '"count":6' }],
  ...more,
}, null, 2)}\n`;

// The fixture with one kept check and its written promise already on the default branch.
function keptFixture(t) {
  const f = fixture(t);
  f.git('checkout', '-q', 'main');
  f.commit({ [KEPT]: kept(), [NOTES_SPEC]: notesSpec() }, 'a kept check');
  f.git('push', '-q', 'origin', 'main');
  const base = f.git('rev-parse', 'HEAD');
  f.git('checkout', '-q', '-B', 'feature');
  return { ...f, check: (args = ['--base', base]) => f.check(args) };
}

const assertNotFlagged = result => {
  assertPasses(result);
  assert.doesNotMatch(result.stdout, /kept check/);
};

test('a kept check that loses an expectation fails, naming the file', t => {
  const f = keptFixture(t);
  f.commit({ [KEPT]: kept({ expect: [{ step: 1, status: 200 }] }) });
  const result = f.check();
  assertFails(result, KEPT);
  assert.match(result.stdout, /changes or removes a kept check: \*\*needs a reason\*\*/);
});

test('a kept check with a changed step fails', t => {
  const f = keptFixture(t);
  f.commit({ [KEPT]: kept({ steps: [['GET', '/api/health']] }) });
  assertFails(f.check(), KEPT);
});

test('a deleted kept check fails', t => {
  const f = keptFixture(t);
  unlinkSync(join(f.work, KEPT));
  f.commit();
  assertFails(f.check(), KEPT);
});

test('a kept check moved out of the kept folder counts as removed', t => {
  const f = keptFixture(t);
  mkdirSync(join(f.work, 'attic'));
  renameSync(join(f.work, KEPT), join(f.work, 'attic/old.json'));
  f.commit();
  assertFails(f.check(), KEPT);
});

test('a re-keep that changes only when and from which files it was recorded is not flagged', t => {
  const f = keptFixture(t);
  f.commit({ [KEPT]: kept({ recordedAt: 'def5678', sourcePaths: ['app/src/list.ts'], thenDigest: 'b'.repeat(64) }) });
  assertNotFlagged(f.check());
});

test('an added kept check is not flagged', t => {
  const f = keptFixture(t);
  f.commit({ '.agents/verification/journeys/notes/another.json': kept({ id: 'another', expect: [{ step: 1, status: 200 }] }) });
  assertNotFlagged(f.check());
});

test('a kept check moved unchanged is not flagged; moved with fewer expectations it is', t => {
  const f = keptFixture(t);
  const moved = '.agents/verification/journeys/lists/the-list-counts-its-notes.json';
  mkdirSync(join(f.work, dirname(moved)), { recursive: true });
  renameSync(join(f.work, KEPT), join(f.work, moved));
  f.commit();
  assertNotFlagged(f.check());
  f.commit({ [moved]: kept({ expect: [{ step: 1, status: 200 }] }) });
  assertFails(f.check(), moved);
});

test('a rewritten THEN in the main spec exempts its re-recorded kept check', t => {
  const f = keptFixture(t);
  f.commit({ [KEPT]: kept({ expect: [{ step: 1, includes: '"total":6' }] }), [NOTES_SPEC]: notesSpec('the answer holds the total') });
  assertNotFlagged(f.check());
});

test('a promise the branch removes takes its kept check with it', t => {
  const f = keptFixture(t);
  unlinkSync(join(f.work, KEPT));
  f.commit({ [NOTES_SPEC]: '# Notes\n\n## Requirements\n' });
  assertNotFlagged(f.check());
});

test('a spec edit that leaves the promise alone exempts nothing', t => {
  const f = keptFixture(t);
  f.commit({ [KEPT]: kept({ expect: [{ step: 1, status: 200 }] }), [NOTES_SPEC]: notesSpec().replace('SHALL count its notes', 'SHALL count every note') });
  assertFails(f.check(), KEPT);
});

test('a MODIFIED delta spec in the change exempts the kept check; an ADDED one does not', t => {
  const delta = section => `## ${section} Requirements\n\n### Requirement: Notes are listed with a count\n\nThe list SHALL count its notes.\n\n#### Scenario: The list counts its notes\n\n- **WHEN** the list is asked for\n- **THEN** the answer holds the total\n`;
  const f = keptFixture(t);
  f.commit({ [KEPT]: kept({ expect: [{ step: 1, includes: '"total":6' }] }), 'openspec/changes/x/specs/notes/spec.md': delta('ADDED') });
  assertFails(f.check(), KEPT);
  f.commit({ 'openspec/changes/x/specs/notes/spec.md': delta('MODIFIED') });
  assertNotFlagged(f.check());
});

test('a delta spec for another capability exempts nothing', t => {
  const f = keptFixture(t);
  f.commit({
    [KEPT]: kept({ expect: [{ step: 1, status: 200 }] }),
    'openspec/changes/x/specs/lists/spec.md': '## REMOVED Requirements\n\n### Requirement: Notes are listed with a count\n',
  });
  assertFails(f.check(), KEPT);
});

test('a kept check that can no longer be read fails', t => {
  const f = keptFixture(t);
  f.commit({ [KEPT]: '{ "steps": [' });
  assertFails(f.check(), KEPT);
});

test('a kept check that points at a rewritten promise only in its new copy is still flagged', t => {
  const f = keptFixture(t);
  const other = notesSpec().replace('Scenario: The list counts its notes', 'Scenario: Another promise');
  f.git('checkout', '-q', 'main');
  f.commit({ 'openspec/specs/lists/spec.md': other }, 'another promise');
  const base = f.git('rev-parse', 'HEAD');
  f.git('checkout', '-q', '-B', 'feature');
  f.commit({
    [KEPT]: kept({ scenario: { capability: 'lists', requirement: 'Notes are listed with a count', scenario: 'Another promise' }, expect: [{ step: 1, status: 200 }] }),
    'openspec/specs/lists/spec.md': other.replace('holds the count', 'holds nothing'),
  });
  assertFails(f.check(['--base', base]), KEPT);
});

test('a Check: bullet naming the kept check explains it', t => {
  const f = keptFixture(t);
  f.commit({
    [KEPT]: kept({ expect: [{ step: 1, status: 200 }] }),
    'openspec/changes/archive/2026-10-13-x/proposal.md': proposal(`Check: \`${KEPT}\` no longer expects the count, because the page shows it as a picture.`),
  });
  const result = f.check();
  assertPasses(result);
  assert.match(result.stdout, /the-list-counts-its-notes\.json` changes or removes a kept check: explained/);
});

test('--worktree reads a kept check edited but not yet saved', t => {
  const f = keptFixture(t);
  f.write({ [KEPT]: kept({ expect: [{ step: 1, status: 200 }] }) });
  assertFails(f.check(['--worktree']), KEPT);
  f.write({ [KEPT]: kept({ recordedAt: 'def5678' }) });
  assertNotFlagged(f.check(['--worktree']));
});

test('prose is never read for markers', t => {
  const f = fixture(t);
  f.commit({ 'wiki/README.md': `# Wiki\n\n${STRYKER_SKIP}\n`, 'notes.md': `${SKIPPED_TEST}\n` });
  const result = f.check();
  assertPasses(result);
  assert.match(result.stdout, /No check was loosened/);
});

test('an empty base passes and says why', t => {
  const f = fixture(t);
  f.commit({ 'app/vitest.config.ts': 'export default {};\n' });
  const result = f.check(['--base', '']);
  assertPasses(result);
  assert.match(result.stdout, /nothing to compare with/);
});

test("settings added onto an empty first commit pass: there was nothing to loosen", t => {
  const f = fixture(t);
  f.git('checkout', '-q', '--orphan', 'first');
  f.git('rm', '-rqf', '.');
  f.commit({}, 'Start the project');
  const empty = f.git('rev-parse', 'HEAD');
  f.commit({ 'app/vitest.config.ts': 'export default {};\n', '.github/workflows/test.yml': 'on: push\n' });
  const result = f.check(['--base', empty]);
  assertPasses(result);
  assert.match(result.stdout, /There was nothing to loosen: this is the project's first change\./);
});

test('--worktree reads past an untracked folder link and prints no Git error', t => {
  const f = fixture(t);
  f.write({ '.agents/settings.json': '{}\n', 'package.json': `${PACKAGE}\n` });
  symlinkSync('.agents', join(f.work, '.claude'), 'dir');
  const result = f.check(['--worktree']);
  assertFails(result, 'package.json');
  assert.doesNotMatch(result.stderr, /fatal:/);
});

test('--worktree reads uncommitted and untracked work', t => {
  const f = fixture(t);
  f.write({ 'app/src/new.test.ts': `${SKIPPED_TEST}('later', () => {});\n` });
  assertFails(f.check(['--worktree']), 'app/src/new.test.ts');
  f.write({ 'openspec/changes/x/proposal.md': proposal('Check: `app/src/new.test.ts` waits for the API, because it is not live.') });
  assertPasses(f.check(['--worktree']));
});

test('a usage error exits 2', t => {
  const f = fixture(t);
  assert.equal(f.check([]).status, 2);
  assert.equal(f.check(['--base', 'x', '--worktree']).status, 2);
});
