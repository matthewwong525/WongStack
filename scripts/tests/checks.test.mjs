import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.github/scripts/checks.mjs');
const scopeScript = join(repo, '.github/scripts/app-untouched.sh');
const pkg = testCommand => JSON.stringify({ scripts: testCommand ? { test: testCommand } : {} });
const wiki = '# Wiki\n\nThe project wiki explains this fixture.\n';

function fixture(t, files = { 'app/package.json': pkg('fixture-test') }) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-shared-checks-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const work = join(root, "work ' $ (commands)");
  const bin = join(root, 'bin');
  mkdirSync(work);
  mkdirSync(bin);
  const log = join(root, 'npm.log');
  const env = {
    PATH: `${bin}:${process.env.PATH}`, HOME: root, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.test',
    GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.test',
    CHECK_NPM_LOG: log,
    // A platform repository's ambient event must not select this project's diff.
    GITHUB_EVENT_NAME: 'push', GITHUB_REF_NAME: 'platform', DEFAULT_BRANCH: 'foreign', BEFORE_SHA: '0'.repeat(40),
  };
  writeFileSync(join(bin, 'npm'), '#!/bin/sh\nprintf "%s|%s\\n" "$PWD" "$*" >> "$CHECK_NPM_LOG"\nif [ "$1" = ci ]; then exit "${CHECK_INSTALL_STATUS:-0}"; fi\nexit "${CHECK_TEST_STATUS:-0}"\n');
  chmodSync(join(bin, 'npm'), 0o755);
  const git = (...args) => execFileSync('git', args, { cwd: work, env, encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'main');
  const commit = changes => {
    for (const [path, text] of Object.entries(changes)) {
      mkdirSync(dirname(join(work, path)), { recursive: true });
      writeFileSync(join(work, path), text);
    }
    git('add', '-A');
    git('commit', '-q', '--allow-empty', '-m', 'fixture');
    return git('rev-parse', 'HEAD');
  };
  const base = commit({ 'wiki/README.md': wiki, 'app/index.js': 'export const x = 1;\n', ...files });
  const summary = join(root, 'summary.md');
  const run = (args = [], vars = {}) => spawnSync(process.execPath, [script, '--repo', work, '--base', base,
    '--head', git('rev-parse', 'HEAD'), '--default-branch', 'main', ...args], { cwd: root, env: { ...env, ...vars }, encoding: 'utf8' });
  const calls = () => { try { return readFileSync(log, 'utf8').trim().split('\n'); } catch { return []; } };
  return { work, env, git, base, commit, run, calls, summary };
}

function passes(result) { assert.equal(result.status, 0, `${result.stdout}${result.stderr}`); }

function ranOnce(f, dir = 'app') {
  assert.deepEqual(f.calls(), [`${join(f.work, dir)}|ci --no-audit --no-fund`, `${join(f.work, dir)}|test`]);
}

test('ordinary code uses the actual shared command, with no GitHub or remote dependency', t => {
  const f = fixture(t);
  f.commit({ 'app/index.js': 'export const x = 2;\n' });
  const result = f.run(['--summary', f.summary]);
  passes(result);
  ranOnce(f);
  assert.match(result.stdout, /suite ran: success/);
  assert.match(result.stdout, /wiki check skipped/);
  assert.match(readFileSync(f.summary, 'utf8'), /Loosened checks[\s\S]*suite ran: success/);
});

test('a docs commit above earlier code still runs the suite for the whole change', t => {
  const f = fixture(t);
  f.commit({ 'app/index.js': 'export const x = 2;\n' });
  f.commit({ 'wiki/README.md': `${wiki}\nMore guidance.\n` });
  passes(f.run());
  ranOnce(f);
});

test('the hosted trusted source command discovers the complete ordinary Git-prepared candidate', t => {
  const f = fixture(t);
  const code = f.commit({ 'app/index.js': 'export const x = 2;\n' });
  const head = f.commit({ 'wiki/README.md': `${wiki}\nLatest documentation.\n` });
  // The command comes from reviewed Source, outside the customer checkout.
  // These are ordinary Git refs, not a provider stub or a copied check list.
  assert.notEqual(code, head);
  f.git('checkout', '--detach', head);
  const result = f.run(['--discover'], { GITHUB_EVENT_NAME: '', GITHUB_REF_NAME: '', DEFAULT_BRANCH: '' });
  passes(result);
  const found = JSON.parse(result.stdout);
  assert.equal(found.repo, f.work);
  assert.equal(found.defaultBranch, 'main');
  assert.equal(found.scope.base, f.base);
  assert.equal(found.scope.untouched, 'false');
  assert.equal(found.scope.wiki_affected, 'true');
  assert.equal(found.dir, join(f.work, 'app'));
  assert.deepEqual(f.calls(), [], 'discovery performs no customer install/test/build');
});

test('a docs-only change skips install and tests, but reports both quality checks', t => {
  const f = fixture(t);
  f.commit({ 'README.md': '# Project\n\nProject guidance.\n' });
  const result = f.run(['--summary', f.summary]);
  passes(result);
  assert.deepEqual(f.calls(), []);
  assert.match(result.stdout, /No check was loosened/);
  assert.match(result.stdout, /Wiki: 1 pages/);
  assert.match(result.stdout, /only docs changed/);
  assert.match(readFileSync(f.summary, 'utf8'), /Wiki: 1 pages/);
});

test('root suite wins over every immediate child', t => {
  const f = fixture(t, { 'package.json': pkg('root'), 'app/package.json': pkg('child') });
  f.commit({ 'app/index.js': 'export const x = 2;\n' });
  passes(f.run());
  ranOnce(f, '');
});

test('first immediate suite is found without a stack config; hidden and nested suites are ignored', t => {
  const name = "a ' $ (suite)";
  const f = fixture(t, {
    'package.json': '{broken', 'app/package.json': pkg('later'),
    [`${name}/package.json`]: pkg('first'), '.hidden/package.json': pkg('hidden'),
    'node_modules/package.json': pkg('modules'), '0-nested/child/package.json': pkg('nested'),
  });
  f.commit({ 'app/index.js': 'export const x = 2;\n' });
  const discovery = f.run(['--discover']);
  passes(discovery);
  assert.equal(JSON.parse(discovery.stdout).dir, join(f.work, name));
  assert.deepEqual(f.calls(), []);
  passes(f.run());
  ranOnce(f, name);
});

test('no suite passes with an explanation and no root manifest is created', t => {
  const f = fixture(t, { 'app/package.json': pkg(null) });
  f.commit({ 'app/index.js': 'export const x = 2;\n' });
  const result = f.run();
  passes(result);
  assert.deepEqual(f.calls(), []);
  assert.match(result.stdout, /No test suite yet[\s\S]*no test suite is declared/);
  assert.throws(() => readFileSync(join(f.work, 'package.json')));
});

test('suite discovery preserves immediate directory links and ignores broken links', t => {
  const f = fixture(t, { 'app/package.json': pkg(null), 'zz-suite/package.json': pkg('suite') });
  symlinkSync('zz-suite', join(f.work, 'a-suite'));
  symlinkSync('missing', join(f.work, '0-broken'));
  f.commit({ 'app/index.js': 'export const x = 2;\n' });
  const result = f.run(['--discover']);
  passes(result);
  assert.equal(JSON.parse(result.stdout).dir, join(f.work, 'a-suite'));
});

test('an empty diff and an unavailable/empty base conservatively run the suite', t => {
  for (const base of [null, '', 'a'.repeat(40)]) {
    const f = fixture(t);
    passes(f.run(base === null ? [] : ['--base', base]));
    ranOnce(f);
  }
});

test('a red suite still reports loosened and wiki failures and fails the shared gate', t => {
  const f = fixture(t);
  f.commit({ 'app/vitest.config.ts': 'export default {};\n', 'wiki/README.md': `${wiki}\n[Missing](missing.md)\n` });
  const result = f.run(['--summary', f.summary], { CHECK_TEST_STATUS: '7' });
  assert.equal(result.status, 1, result.stderr);
  ranOnce(f);
  assert.match(result.stdout, /app\/vitest.config.ts[^\n]*needs a reason/);
  assert.match(result.stdout, /Wiki checks[\s\S]*missing.md/);
  assert.match(result.stdout, /suite ran: failure/);
  assert.match(readFileSync(f.summary, 'utf8'), /Loosened checks[\s\S]*Wiki checks[\s\S]*suite ran: failure/);
});

test('installation failure skips the suite while both quality checks still run', t => {
  const f = fixture(t);
  f.commit({ 'app/index.js': 'export const x = 2;\n', 'README.md': '# Project\n' });
  const result = f.run([], { CHECK_INSTALL_STATUS: '3' });
  assert.equal(result.status, 1);
  assert.deepEqual(f.calls(), [`${join(f.work, 'app')}|ci --no-audit --no-fund`]);
  assert.match(result.stdout, /No check was loosened/);
  assert.match(result.stdout, /Wiki: 1 pages/);
  assert.match(result.stdout, /installation failed/);
});

test('a changed proposal can explain a check setting through the shared gate', t => {
  const f = fixture(t);
  f.commit({
    'app/vitest.config.ts': 'export default {};\n',
    'openspec/changes/example/proposal.md': '# Example\n\n## Decision log\n\n- **2026-10-04** — Check: `app/vitest.config.ts` adds the fixture config.\n',
  });
  const result = f.run();
  passes(result);
  assert.match(result.stdout, /app\/vitest.config.ts[^\n]*explained/);
});

test('a wiki failure alone keeps a docs-only candidate red', t => {
  const f = fixture(t);
  f.commit({ 'wiki/README.md': `${wiki}\n[Missing](missing.md)\n` });
  const result = f.run();
  assert.equal(result.status, 1);
  assert.deepEqual(f.calls(), []);
  assert.match(result.stdout, /A wiki page has a broken link/);
});

test('discovery of a docs-only change emits scope with no suite or commands', t => {
  const f = fixture(t);
  f.commit({ 'wiki/README.md': `${wiki}\nMore guidance.\n` });
  const result = f.run(['--discover']);
  passes(result);
  const data = JSON.parse(result.stdout);
  assert.equal(data.scope.base, f.base);
  assert.equal(data.scope.untouched, 'true');
  assert.equal(data.scope.docs_only, 'true');
  assert.equal(data.dir, null);
  assert.deepEqual(f.calls(), []);
});

test('missing context and non-SHA inputs are usage errors before commands', t => {
  const f = fixture(t);
  for (const args of [['--head', 'main'], ['--base', '--injected'], ['--default-branch', '']]) {
    assert.equal(f.run(args).status, 2);
  }
  const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /missing --repo/);
  assert.deepEqual(f.calls(), []);
});

test('a mismatched checked-out head, nested root or missing root makes checks unavailable', t => {
  const f = fixture(t);
  f.commit({ 'app/index.js': 'export const x = 2;\n' });
  for (const args of [['--head', f.base], ['--repo', join(f.work, 'app')], ['--repo', join(f.work, 'missing')]]) {
    const result = f.run(args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Checks unavailable/);
  }
  assert.deepEqual(f.calls(), []);
});

test('the explicit scope uses its named head rather than HEAD or ambient event values', t => {
  const f = fixture(t);
  const docsHead = f.commit({ 'wiki/README.md': `${wiki}\nMore guidance.\n` });
  f.commit({ 'app/index.js': 'export const x = 2;\n' });
  const result = spawnSync('bash', [scopeScript, '--base', f.base, '--head', docsHead], { cwd: f.work, env: f.env, encoding: 'utf8' });
  passes(result);
  assert.match(result.stdout, /untouched=true/);
  assert.match(result.stdout, /docs_only=true/);
  const invalid = spawnSync('bash', [scopeScript, '--base'], { encoding: 'utf8' });
  assert.equal(invalid.status, 2);
  const incompatible = spawnSync('bash', [scopeScript, '--worktree', '--base', f.base], { encoding: 'utf8' });
  assert.equal(incompatible.status, 2);
});

test('GitHub invokes the shared script once, and staging has no dependency on the test job', () => {
  const workflow = readFileSync(join(repo, '.github/workflows/test.yml'), 'utf8');
  assert.equal((workflow.match(/node \.github\/scripts\/checks\.mjs/g) ?? []).length, 1);
  assert.match(workflow, /--base "\$CHECK_BASE" --head "\$CHECK_HEAD"/);
  assert.match(workflow, /--default-branch "\$CHECK_DEFAULT"/);
  assert.match(workflow, /github\.event_name == 'push' \|\| github\.event\.pull_request\.head\.repo\.full_name != github\.repository/);
  assert.doesNotMatch(workflow, /run: npm test/);
  const deploy = readFileSync(join(repo, '.github/workflows/deploy.yml'), 'utf8');
  assert.doesNotMatch(deploy, /\bneeds:|workflow_run:|workflows:\s*\[?\s*['"]?Test/);
  assert.match(deploy, /bash scripts\/cf-deploy\.sh/);
});
