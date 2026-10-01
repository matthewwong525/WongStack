import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

// A bare "origin" and a clone whose `main` holds the main app, one mini app in
// it, and a wiki page, pushed. Returns helpers bound to the clone.
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-app-untouched-'));
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
    'app/src/apps/hello/App.tsx': 'export function App() {}\n',
    'app/src/apps/hello/app.json': '{}\n',
  }, 'base');
  git('push', '-q', '-u', 'origin', 'main');

  // Runs the check in the clone as a workflow would, and parses its key=value lines.
  const outputs = (vars, args = []) => {
    const result = spawnSync('bash', [script, ...args], {
      cwd: work,
      encoding: 'utf8',
      env: { ...env, DEFAULT_BRANCH: 'main', ...vars },
    });
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    const lines = result.stdout.split('\n').filter(Boolean);
    assert.deepEqual(lines.map(line => line.split('=')[0]), ['untouched', 'base', 'docs_only', 'wiki_affected'],
      `stdout must hold only the four output lines:\n${result.stdout}`);
    return Object.fromEntries(lines.map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
  };
  // Whether the main app is untouched; `base`, `docs_only`, and `wiki_affected` have their own tests.
  const check = (vars, args) => outputs(vars, args).untouched;
  const docsOnly = (vars, args) => outputs(vars, args).docs_only;
  const wikiAffected = (vars, args) => outputs(vars, args).wiki_affected;
  const branch = name => git('checkout', '-q', '-b', name);
  const push = () => git('push', '-q', '-u', 'origin', 'HEAD');
  const onBranch = name => ({ GITHUB_EVENT_NAME: 'push', GITHUB_REF_NAME: name });

  return { work, git, commit, outputs, check, docsOnly, wikiAffected, branch, push, onBranch };
}

test('a docs-only branch leaves the main app untouched', t => {
  const f = fixture(t);
  f.branch('docs');
  f.commit({ 'wiki/new.md': '# New\n', 'README.md': '# Readme\n', 'openspec/changes/x/tasks.md': '- [ ] 1\n' }, 'docs');
  f.commit({ 'app/README.md': '# App readme\n' }, 'an app readme is still docs');
  f.push();
  assert.equal(f.check(f.onBranch('docs')), 'true');
});

test('a pull request compares with its base branch', t => {
  const f = fixture(t);
  f.branch('docs');
  f.commit({ 'wiki/new.md': '# New\n' }, 'docs');
  assert.equal(f.check({ GITHUB_EVENT_NAME: 'pull_request', GITHUB_BASE_REF: 'main', GITHUB_REF_NAME: '7/merge' }),
    'true');
  f.commit({ 'app/src/index.ts': 'export const x = 2;\n' }, 'code');
  assert.equal(f.check({ GITHUB_EVENT_NAME: 'pull_request', GITHUB_BASE_REF: 'main' }), 'false');
});

test('a change to a mini app is a change to the main app', t => {
  const f = fixture(t);
  f.branch('tips');
  f.commit({ 'app/src/apps/tips/App.tsx': 'export function App() {}\n', 'app/worker/apps/tips/api.ts': 'export {};\n' }, 'tips');
  f.push();
  assert.equal(f.check(f.onBranch('tips')), 'false');
  // A folder from before mini apps moved into the main app is no longer a skip path.
  f.commit({ 'mini-apps/apps/old/index.html': '<p>old</p>\n' }, 'old');
  assert.equal(f.check({ GITHUB_EVENT_NAME: 'pull_request', GITHUB_BASE_REF: 'main' }), 'false');
});

test('a docs commit on top of a code commit runs the suite', t => {
  const f = fixture(t);
  f.branch('feature');
  f.commit({ 'app/src/index.ts': 'export const x = 2;\n' }, 'code');
  f.commit({ 'wiki/after.md': '# After\n' }, 'docs on top');
  f.push();
  assert.equal(f.check(f.onBranch('feature')), 'false');
});

test('a file moved out of the main app into the wiki is a change to the main app', t => {
  const f = fixture(t);
  f.branch('move');
  mkdirSync(join(f.work, 'wiki/moved'), { recursive: true });
  renameSync(join(f.work, 'app/src/index.ts'), join(f.work, 'wiki/moved/index.ts.md'));
  f.git('add', '-A');
  f.git('commit', '-q', '-m', 'move');
  assert.equal(f.check(f.onBranch('move')), 'false');
});

test('a push to the default branch compares with the before SHA', t => {
  const f = fixture(t);
  const before = f.git('rev-parse', 'HEAD');
  f.commit({ 'wiki/tips.md': '# Tips\n' }, 'docs');
  f.push();
  assert.equal(f.check({ ...f.onBranch('main'), BEFORE_SHA: before }), 'true');

  // Two commits in one push: code, then docs. The whole push counts.
  const before2 = f.git('rev-parse', 'HEAD');
  f.commit({ 'app/src/index.ts': 'export const x = 3;\n' }, 'code');
  f.commit({ 'wiki/after.md': '# After\n' }, 'docs');
  f.push();
  assert.equal(f.check({ ...f.onBranch('main'), BEFORE_SHA: before2 }),
    'false');
});

test('an all-zero before SHA is not a base', t => {
  const f = fixture(t);
  f.commit({ 'wiki/only.md': '# Docs\n' }, 'docs');
  f.push();
  assert.equal(f.check({ ...f.onBranch('main'), BEFORE_SHA: '0'.repeat(40) }),
    'false');
});

test('no reachable base runs the suite', t => {
  const f = fixture(t);
  f.branch('docs');
  f.commit({ 'wiki/new.md': '# New\n' }, 'docs');
  const unknown = 'false';
  // The default branch is not on origin.
  assert.equal(f.check({ ...f.onBranch('docs'), DEFAULT_BRANCH: 'trunk' }), unknown);
  // The pull request's base is not on origin.
  assert.equal(f.check({ GITHUB_EVENT_NAME: 'pull_request', GITHUB_BASE_REF: 'gone' }), unknown);
  // The before SHA is on neither the clone nor origin.
  f.git('checkout', '-q', 'main');
  assert.equal(f.check({ ...f.onBranch('main'), BEFORE_SHA: '1234567890abcdef1234567890abcdef12345678' }), unknown);
  // An event the workflows do not use.
  assert.equal(f.check({ GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF_NAME: 'main' }), unknown);
});

test('a missing remote-tracking ref is fetched from origin', t => {
  const f = fixture(t);
  f.branch('docs');
  f.commit({ 'wiki/new.md': '# New\n' }, 'docs');
  f.git('update-ref', '-d', 'refs/remotes/origin/main');
  assert.equal(f.check(f.onBranch('docs')), 'true');
});

test('an empty diff is not proof', t => {
  const f = fixture(t);
  f.branch('same-as-main');
  assert.equal(f.check(f.onBranch('same-as-main')), 'false');
});

// Writes files into the clone without committing them.
function write(f, files) {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(f.work, path)), { recursive: true });
    writeFileSync(join(f.work, path), text);
  }
}
const worktree = f => f.check({}, ['--worktree']);

test('--worktree: uncommitted prose leaves the main app untouched', t => {
  const f = fixture(t);
  write(f, { 'wiki/README.md': '# Wiki, edited\n', 'openspec/changes/x/tasks.md': '- [ ] 1\n' });
  f.git('add', 'openspec');
  assert.equal(worktree(f), 'true');
});

test('--worktree: an uncommitted app edit touches the main app', t => {
  const f = fixture(t);
  write(f, { 'app/src/index.ts': 'export const x = 2;\n' });
  assert.equal(worktree(f), 'false');
});

test('--worktree: an untracked mini-app file touches the main app', t => {
  const f = fixture(t);
  write(f, { 'app/src/apps/tips/App.tsx': 'export function App() {}\n' });
  assert.equal(worktree(f), 'false');
});

test('--worktree: committed branch work counts with the uncommitted work', t => {
  const f = fixture(t);
  f.branch('feature');
  f.commit({ 'app/src/index.ts': 'export const x = 2;\n' }, 'code');
  write(f, { 'wiki/after.md': '# After\n' });
  assert.equal(worktree(f), 'false');
});

test('--worktree: no base fails safe to touched', t => {
  const f = fixture(t);
  write(f, { 'wiki/new.md': '# New\n' });
  assert.equal(f.check({ DEFAULT_BRANCH: 'trunk' }, ['--worktree']),
    'false');
});

test('--worktree: a clean tree is not proof', t => {
  const f = fixture(t);
  assert.equal(worktree(f), 'false');
});

test('base names the commit the change is compared with, or is empty', t => {
  const f = fixture(t);
  const main = f.git('rev-parse', 'HEAD');
  f.branch('feature');
  f.commit({ 'app/src/index.ts': 'export const x = 2;\n' }, 'code');
  assert.equal(f.outputs(f.onBranch('feature')).base, main);
  assert.equal(f.outputs({}, ['--worktree']).base, main);
  f.git('checkout', '-q', 'main');
  const before = f.git('rev-parse', 'HEAD');
  f.commit({ 'wiki/new.md': '# New\n' }, 'docs');
  assert.equal(f.outputs({ ...f.onBranch('main'), BEFORE_SHA: before }).base, before);
  assert.equal(f.outputs({ ...f.onBranch('main'), BEFORE_SHA: '0'.repeat(40) }).base, '');
  assert.equal(f.outputs({ GITHUB_EVENT_NAME: 'workflow_dispatch' }).base, '');
});

test('docs_only is true only when every path is under wiki/ or openspec/', t => {
  const f = fixture(t);
  f.branch('wiki');
  f.commit({ 'wiki/new.md': '# New\n' }, 'wiki only');
  assert.equal(f.docsOnly(f.onBranch('wiki')), 'true');

  f.git('checkout', '-q', 'main');
  f.branch('plans');
  f.commit({ 'openspec/changes/x/tasks.md': '- [ ] 1\n' }, 'openspec only');
  assert.equal(f.docsOnly(f.onBranch('plans')), 'true');
  assert.equal(f.docsOnly({ GITHUB_EVENT_NAME: 'pull_request', GITHUB_BASE_REF: 'main' }), 'true');

  f.git('checkout', '-q', 'main');
  f.branch('skill-text');
  f.commit({ 'wiki/new.md': '# New\n', '.agents/skills/save/SKILL.md': '# Save\n' }, 'wiki plus skill text');
  assert.equal(f.docsOnly(f.onBranch('skill-text')), 'false');

  f.git('checkout', '-q', 'main');
  f.branch('root-md');
  f.commit({ 'wiki/new.md': '# New\n', 'CHANGELOG.md': '# Changes\n' }, 'wiki plus a root md');
  const root = f.outputs(f.onBranch('root-md'));
  assert.equal(root.docs_only, 'false');
  assert.equal(root.untouched, 'true');
});

test('docs_only fails safe to false', t => {
  const f = fixture(t);
  f.branch('docs');
  f.commit({ 'wiki/new.md': '# New\n' }, 'docs');
  // No base.
  assert.equal(f.docsOnly({ ...f.onBranch('docs'), DEFAULT_BRANCH: 'trunk' }), 'false');
  assert.equal(f.docsOnly({ GITHUB_EVENT_NAME: 'workflow_dispatch' }), 'false');
  // An empty diff.
  f.git('checkout', '-q', 'main');
  f.branch('same-as-main');
  assert.equal(f.docsOnly(f.onBranch('same-as-main')), 'false');
  // The working tree answers too.
  f.git('checkout', '-q', 'docs');
  write(f, { 'wiki/more.md': '# More\n' });
  assert.equal(f.docsOnly({}, ['--worktree']), 'true');
});

test('wiki_affected is false only for a code change that removes or moves nothing', t => {
  const f = fixture(t);
  f.branch('code');
  f.commit({ 'app/src/index.ts': 'export const x = 2;\n', 'app/src/new.ts': 'export {};\n' }, 'code only');
  assert.equal(f.wikiAffected(f.onBranch('code')), 'false');

  f.git('checkout', '-q', 'main');
  f.branch('wiki');
  f.commit({ 'app/src/index.ts': 'export const x = 2;\n', 'wiki/new.md': '# New\n' }, 'code and a wiki page');
  assert.equal(f.wikiAffected(f.onBranch('wiki')), 'true');

  f.git('checkout', '-q', 'main');
  f.branch('skill-text');
  f.commit({ '.agents/skills/save/SKILL.md': '# Save\n' }, 'a .md outside wiki/');
  assert.equal(f.wikiAffected(f.onBranch('skill-text')), 'true');
});

test('wiki_affected is true when a code file is removed or moved', t => {
  const f = fixture(t);
  f.branch('remove');
  f.git('rm', '-q', 'app/package.json');
  f.git('commit', '-q', '-m', 'remove');
  assert.equal(f.wikiAffected(f.onBranch('remove')), 'true');

  f.git('checkout', '-q', 'main');
  f.branch('move');
  renameSync(join(f.work, 'app/src/index.ts'), join(f.work, 'app/src/main.ts'));
  f.git('add', '-A');
  f.git('commit', '-q', '-m', 'move');
  assert.equal(f.wikiAffected(f.onBranch('move')), 'true');

  // The working tree answers too: an uncommitted move of a code file.
  f.git('checkout', '-q', 'main');
  renameSync(join(f.work, 'app/src/index.ts'), join(f.work, 'app/src/index2.ts'));
  assert.equal(f.wikiAffected({}, ['--worktree']), 'true');
});

test('wiki_affected fails safe to true', t => {
  const f = fixture(t);
  f.branch('code');
  f.commit({ 'app/src/index.ts': 'export const x = 2;\n' }, 'code');
  // No base.
  assert.equal(f.wikiAffected({ ...f.onBranch('code'), DEFAULT_BRANCH: 'trunk' }), 'true');
  assert.equal(f.wikiAffected({ GITHUB_EVENT_NAME: 'workflow_dispatch' }), 'true');
  // An empty diff.
  f.git('checkout', '-q', 'main');
  f.branch('same-as-main');
  assert.equal(f.wikiAffected(f.onBranch('same-as-main')), 'true');
  // The working tree: a code-only edit is false.
  write(f, { 'app/src/index.ts': 'export const x = 3;\n' });
  assert.equal(f.wikiAffected({}, ['--worktree']), 'false');
});

test('an unknown argument is a usage error', t => {
  const f = fixture(t);
  const result = spawnSync('bash', [script, '--nope'], { cwd: f.work, encoding: 'utf8' });
  assert.equal(result.status, 2);
});
