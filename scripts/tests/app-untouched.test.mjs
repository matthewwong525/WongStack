import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.github/scripts/app-untouched.sh');

const bash = spawnSync('bash', ['--version']);
if (bash.error || bash.status !== 0) throw new Error('app-untouched tests need bash on PATH');

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

// A bare "origin" and a clone whose `main` holds the main app, a wiki page, and
// one mini app, pushed. Returns helpers bound to the clone.
function fixture(t) {
  const root = mkdtempSync('/tmp/app-untouched-');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = gitEnv(root);
  const origin = join(root, 'origin.git');
  const work = join(root, 'work');
  const git = (...args) => execFileSync('git', args, { cwd: work, env, encoding: 'utf8' }).trim();
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', origin], { env });
  mkdirSync(work);
  git('init', '-q', '-b', 'main');
  git('remote', 'add', 'origin', origin);

  const commit = (files, message) => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(work, path)), { recursive: true });
      writeFileSync(join(work, path), text);
    }
    git('add', '-A');
    git('commit', '-q', '-m', message);
    return git('rev-parse', 'HEAD');
  };

  commit({
    'app/src/index.ts': 'export const x = 1;\n',
    'app/package.json': '{}\n',
    'wiki/README.md': '# Wiki\n',
    'mini-apps/apps/hello/index.html': '<p>hi</p>\n',
    'mini-apps/apps/hello/app.json': '{}\n',
  }, 'base');
  git('push', '-q', '-u', 'origin', 'main');

  // Runs the check in the clone as a workflow would, and parses its key=value lines.
  const check = vars => {
    const result = spawnSync('bash', [script], {
      cwd: work,
      encoding: 'utf8',
      env: { ...env, DEFAULT_BRANCH: 'main', ...vars },
    });
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    const lines = result.stdout.split('\n').filter(Boolean);
    assert.deepEqual(lines.map(line => line.split('=')[0]), ['untouched', 'mini_apps', 'mini_changed'],
      `stdout must hold only the three output lines:\n${result.stdout}`);
    return Object.fromEntries(lines.map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
  };
  const branch = name => git('checkout', '-q', '-b', name);
  const push = () => git('push', '-q', '-u', 'origin', 'HEAD');
  const onBranch = name => ({ GITHUB_EVENT_NAME: 'push', GITHUB_REF_NAME: name });

  return { work, git, commit, check, branch, push, onBranch };
}

test('a docs-only branch leaves the main app untouched', t => {
  const f = fixture(t);
  f.branch('docs');
  f.commit({ 'wiki/new.md': '# New\n', 'README.md': '# Readme\n', 'openspec/changes/x/tasks.md': '- [ ] 1\n' }, 'docs');
  f.commit({ 'app/README.md': '# App readme\n' }, 'an app readme is still docs');
  f.push();
  assert.deepEqual(f.check(f.onBranch('docs')), { untouched: 'true', mini_apps: '', mini_changed: 'false' });
});

test('a pull request compares with its base branch', t => {
  const f = fixture(t);
  f.branch('docs');
  f.commit({ 'wiki/new.md': '# New\n' }, 'docs');
  assert.deepEqual(f.check({ GITHUB_EVENT_NAME: 'pull_request', GITHUB_BASE_REF: 'main', GITHUB_REF_NAME: '7/merge' }),
    { untouched: 'true', mini_apps: '', mini_changed: 'false' });
  f.commit({ 'app/src/index.ts': 'export const x = 2;\n' }, 'code');
  assert.equal(f.check({ GITHUB_EVENT_NAME: 'pull_request', GITHUB_BASE_REF: 'main' }).untouched, 'false');
});

test('a mini-apps-only branch is untouched and names each changed app once', t => {
  const f = fixture(t);
  f.branch('mini/tips');
  f.commit({
    'mini-apps/apps/tips/index.html': '<p>tips</p>\n',
    'mini-apps/apps/tips/api.ts': 'export default {};\n',
    'mini-apps/apps/hello/app.json': '{"title":"Hello"}\n',
    'mini-apps/apps/.assetsignore': '*.ts\n',
    'mini-apps/worker.ts': 'export default {};\n',
  }, 'tips');
  f.push();
  assert.deepEqual(f.check(f.onBranch('mini/tips')), { untouched: 'true', mini_apps: 'hello tips', mini_changed: 'true' });
});

test('a change to the mini-app Worker alone names no app', t => {
  const f = fixture(t);
  f.branch('mini-worker');
  f.commit({ 'mini-apps/worker.ts': 'export default {};\n', 'mini-apps/NOTES.md': '# Notes\n' }, 'worker');
  assert.deepEqual(f.check(f.onBranch('mini-worker')), { untouched: 'true', mini_apps: '', mini_changed: 'true' });
});

test('a docs commit on top of a code commit runs the suite', t => {
  const f = fixture(t);
  f.branch('feature');
  f.commit({ 'app/src/index.ts': 'export const x = 2;\n' }, 'code');
  f.commit({ 'wiki/after.md': '# After\n' }, 'docs on top');
  f.push();
  assert.equal(f.check(f.onBranch('feature')).untouched, 'false');
});

test('a file moved out of the main app into the wiki is a change to the main app', t => {
  const f = fixture(t);
  f.branch('move');
  mkdirSync(join(f.work, 'wiki/moved'), { recursive: true });
  renameSync(join(f.work, 'app/src/index.ts'), join(f.work, 'wiki/moved/index.ts.md'));
  f.git('add', '-A');
  f.git('commit', '-q', '-m', 'move');
  assert.equal(f.check(f.onBranch('move')).untouched, 'false');
});

test('a push to the default branch compares with the before SHA', t => {
  const f = fixture(t);
  const before = f.git('rev-parse', 'HEAD');
  f.commit({ 'mini-apps/apps/tips/index.html': '<p>tips</p>\n' }, 'keep tips');
  f.push();
  assert.deepEqual(f.check({ ...f.onBranch('main'), BEFORE_SHA: before }),
    { untouched: 'true', mini_apps: 'tips', mini_changed: 'true' });

  // Two commits in one push: code, then docs. The whole push counts.
  const before2 = f.git('rev-parse', 'HEAD');
  f.commit({ 'app/src/index.ts': 'export const x = 3;\n' }, 'code');
  f.commit({ 'wiki/after.md': '# After\n' }, 'docs');
  f.push();
  assert.deepEqual(f.check({ ...f.onBranch('main'), BEFORE_SHA: before2 }),
    { untouched: 'false', mini_apps: '', mini_changed: 'false' });
});

test('an all-zero before SHA is not a base', t => {
  const f = fixture(t);
  f.commit({ 'wiki/only.md': '# Docs\n' }, 'docs');
  f.push();
  assert.deepEqual(f.check({ ...f.onBranch('main'), BEFORE_SHA: '0'.repeat(40) }),
    { untouched: 'false', mini_apps: 'hello', mini_changed: 'true' });
});

test('no reachable base runs the suite and lists every mini app', t => {
  const f = fixture(t);
  f.branch('docs');
  f.commit({ 'wiki/new.md': '# New\n' }, 'docs');
  const unknown = { untouched: 'false', mini_apps: 'hello', mini_changed: 'true' };
  // The default branch is not on origin.
  assert.deepEqual(f.check({ ...f.onBranch('docs'), DEFAULT_BRANCH: 'trunk' }), unknown);
  // The pull request's base is not on origin.
  assert.deepEqual(f.check({ GITHUB_EVENT_NAME: 'pull_request', GITHUB_BASE_REF: 'gone' }), unknown);
  // The before SHA is on neither the clone nor origin.
  f.git('checkout', '-q', 'main');
  assert.deepEqual(f.check({ ...f.onBranch('main'), BEFORE_SHA: '1234567890abcdef1234567890abcdef12345678' }), unknown);
  // An event the workflows do not use.
  assert.deepEqual(f.check({ GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF_NAME: 'main' }), unknown);
});

test('a missing remote-tracking ref is fetched from origin', t => {
  const f = fixture(t);
  f.branch('docs');
  f.commit({ 'wiki/new.md': '# New\n' }, 'docs');
  f.git('update-ref', '-d', 'refs/remotes/origin/main');
  assert.equal(f.check(f.onBranch('docs')).untouched, 'true');
});

test('an empty diff is not proof', t => {
  const f = fixture(t);
  f.branch('same-as-main');
  assert.deepEqual(f.check(f.onBranch('same-as-main')), { untouched: 'false', mini_apps: '', mini_changed: 'false' });
});
