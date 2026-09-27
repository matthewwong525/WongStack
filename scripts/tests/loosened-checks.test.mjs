import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

// A bare "origin" and a clone whose `main` holds a small app, a mini app, and
// the check scripts, pushed. Work happens on the branch `feature`.
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
    'mini-apps/apps/tips/api.test.mjs': "import test from 'node:test';\ntest('tips', () => {});\n",
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
  f.commit({ 'mini-apps/apps/tips/api.test.mjs': `import test from 'node:test';\n${SKIPPED_TEST}('tips', () => {});\n` });
  assertFails(f.check(), 'mini-apps/apps/tips/api.test.mjs');
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
