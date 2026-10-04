import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
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

test('the trusted source command discovers the complete ordinary Git-prepared candidate', t => {
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

test('the default-branch deploy records its outcome and live address, and a failed record never fails the job', () => {
  const deploy = readFileSync(join(repo, '.github/workflows/deploy.yml'), 'utf8');
  const step = deploy.slice(deploy.indexOf('- name: Record the production release'));
  assert.match(step, /if: \$\{\{ always\(\) && .*github\.ref_name == github\.event\.repository\.default_branch \}\}/);
  assert.match(step, /continue-on-error: true/);
  assert.match(step, /LIVE_URL: \$\{\{ steps\.deploy\.outputs\.production-url \}\}/);
  assert.match(step, /STATE: \$\{\{ steps\.deploy\.outcome == 'success' && 'success' \|\| 'failure' \}\}/);
  assert.match(step, /-f ref="\$GITHUB_SHA"[\s\S]*-f environment=production[\s\S]*-f state="\$STATE"[\s\S]*environment_url="\$LIVE_URL"/);
  // The address comes from the deploy's own output, never from a naming pattern.
  assert.match(readFileSync(join(repo, 'scripts/cf-deploy.sh'), 'utf8'), /LIVE_URL=\$\(wong_production_url "\$DEPLOY_LOG"\)[\s\S]*production-url=\$LIVE_URL/);
});

// ── The pre-check on this computer: `--worktree` ───────────────────────────────

// The same fixture, with origin/main at the base commit and a lock file of its own, so a
// run under test never waits on a real one.
function localFixture(t, files) {
  const f = fixture(t, files);
  f.git('update-ref', 'refs/remotes/origin/main', f.base);
  const root = dirname(f.work);
  const lock = join(root, 'turn.lock');
  const edit = (path, text) => {
    mkdirSync(dirname(join(f.work, path)), { recursive: true });
    writeFileSync(join(f.work, path), text);
  };
  // The coverage folder is passed on, so these runs count toward the suite's coverage.
  const coverage = process.env.NODE_V8_COVERAGE ? { NODE_V8_COVERAGE: process.env.NODE_V8_COVERAGE } : {};
  const local = (args = [], vars = {}) => spawnSync(process.execPath, [script, '--worktree', '--repo', f.work, ...args],
    { cwd: root, env: { ...f.env, ...coverage, WONG_CHECKS_LOCK: lock, ...vars }, encoding: 'utf8' });
  return { ...f, root, lock, edit, local };
}

const verdict = result => result.stdout.match(/^LOCAL_CHECKS=.*$/m)?.[0];

test('the pre-check runs the suite and quality checks on uncommitted work, and gives its turn back', t => {
  const f = localFixture(t);
  f.edit('app/index.js', 'export const x = 2;\n');
  const result = f.local();
  passes(result);
  ranOnce(f);
  assert.match(result.stdout, /No check was loosened/);
  assert.doesNotMatch(result.stdout, /Wiki: /, 'no page changed, so the wiki check skipped');
  assert.equal(result.stdout.trimEnd().split('\n').at(-1), 'LOCAL_CHECKS=pass');
  assert.equal(existsSync(f.lock), false);
});

test('the pre-check installs only when node_modules is missing or older than the lockfile', t => {
  const f = localFixture(t, { 'app/package.json': pkg('fixture-test'), '.gitignore': 'node_modules/\n' });
  f.edit('app/index.js', 'export const x = 2;\n');
  f.edit('app/node_modules/.package-lock.json', '{}\n');
  passes(f.local());
  assert.deepEqual(f.calls(), [`${join(f.work, 'app')}|test`]);
  // A lockfile newer than the installed tree makes it stale.
  utimesSync(join(f.work, 'app/node_modules/.package-lock.json'), new Date(1_000_000_000_000), new Date(1_000_000_000_000));
  f.edit('app/package-lock.json', '{}\n');
  passes(f.local());
  assert.deepEqual(f.calls().slice(1), [`${join(f.work, 'app')}|ci --no-audit --no-fund`, `${join(f.work, 'app')}|test`]);
});

test('a failing suite is a local failure that names the part to rerun', t => {
  const f = localFixture(t);
  f.edit('app/index.js', 'export const x = 2;\n');
  const result = f.local([], { CHECK_TEST_STATUS: '7' });
  assert.equal(result.status, 1, result.stderr);
  assert.equal(verdict(result), 'LOCAL_CHECKS=fail (suite)');
  assert.match(result.stdout, /^Repair, then rerun only what failed: node \.github\/scripts\/checks\.mjs --worktree --only suite$/m);
  // Only the named parts run again.
  const quality = f.local(['--only', 'loosened,wiki'], { CHECK_TEST_STATUS: '7' });
  passes(quality);
  assert.equal(verdict(quality), 'LOCAL_CHECKS=pass');
  assert.equal(f.calls().length, 2, 'the suite did not run again');
  assert.equal(f.local(['--only', 'suite'], { CHECK_TEST_STATUS: '7' }).status, 1);
});

// Every command on PATH except the named ones, so a missing tool is truly missing.
function pathWithout(root, missing) {
  const tools = join(root, 'tools');
  mkdirSync(tools);
  for (const dir of process.env.PATH.split(':')) {
    let names = [];
    try { names = readdirSync(dir); } catch { continue; }
    for (const name of names) {
      if (missing.includes(name)) continue;
      try { symlinkSync(join(dir, name), join(tools, name)); } catch { /* an earlier PATH entry already has it */ }
    }
  }
  return tools;
}

test('a computer with no npm says nothing ran, in one line, and exits 7', t => {
  const f = localFixture(t);
  f.edit('app/index.js', 'export const x = 2;\n');
  const result = f.local([], { PATH: pathWithout(f.root, ['npm', 'npx']) });
  assert.equal(result.status, 7, `${result.stdout}${result.stderr}`);
  assert.equal(verdict(result), 'LOCAL_CHECKS=not run (npm is not installed)');
  assert.match(result.stdout, /No check was loosened/, 'the checks that need no tools still ran');
  assert.deepEqual(f.calls(), []);
});

test('a failed install is "not run", and a failing quality check beside it still fails', t => {
  const f = localFixture(t);
  f.edit('app/index.js', 'export const x = 2;\n');
  const result = f.local([], { CHECK_INSTALL_STATUS: '3' });
  assert.equal(result.status, 7, result.stderr);
  assert.equal(verdict(result), 'LOCAL_CHECKS=not run (the install failed)');
  assert.deepEqual(f.calls(), [`${join(f.work, 'app')}|ci --no-audit --no-fund`]);
  f.edit('wiki/README.md', `${wiki}\n[Missing](missing.md)\n`);
  const both = f.local([], { CHECK_INSTALL_STATUS: '3' });
  assert.equal(both.status, 1);
  assert.equal(verdict(both), 'LOCAL_CHECKS=fail (wiki); not run (the install failed)');
  assert.match(both.stdout, /Wiki checks[\s\S]*missing\.md/);
});

test('a turn another chat holds times out as "not run"; a dead run\'s turn is taken over', t => {
  const f = localFixture(t);
  f.edit('app/index.js', 'export const x = 2;\n');
  writeFileSync(f.lock, `${process.pid}\n`);
  const held = f.local(['--lock-wait', '1']);
  assert.equal(held.status, 7, held.stderr);
  assert.equal(verdict(held), "LOCAL_CHECKS=not run (another chat's checks held the turn for over 1 seconds)");
  assert.deepEqual(f.calls(), []);
  assert.equal(readFileSync(f.lock, 'utf8'), `${process.pid}\n`, 'the holder keeps its turn');
  writeFileSync(f.lock, '999999999\n');
  passes(f.local());
  ranOnce(f);
  assert.equal(existsSync(f.lock), false);
});

test('a docs-only change skips the suite locally and still checks the wiki', t => {
  const f = localFixture(t);
  f.edit('wiki/README.md', `${wiki}\nMore guidance.\n`);
  const result = f.local([], { PATH: pathWithout(f.root, ['npm', 'npx']) });
  passes(result);
  assert.deepEqual(f.calls(), []);
  assert.match(result.stdout, /No check was loosened/);
  assert.match(result.stdout, /Wiki: 1 pages/);
  assert.equal(verdict(result), 'LOCAL_CHECKS=pass');
});

// A stand-in for the source repo's own list: it records its arguments and answers as told.
const PAYLOAD_STUB = `import { appendFileSync } from 'node:fs';
appendFileSync(process.env.PAYLOAD_LOG, process.argv.slice(2).join(' ') + '\\n');
if (process.env.PAYLOAD_RESULT !== 'silent') console.log('PAYLOAD_CHECKS=' + (process.env.PAYLOAD_RESULT ?? 'pass'));
process.exit(Number(process.env.PAYLOAD_RC ?? 0));
`;

test('the source repo\'s own checks run in the same turn, and their failures are named', t => {
  const f = localFixture(t, { 'app/package.json': pkg('fixture-test'), 'scripts/payload-checks.mjs': PAYLOAD_STUB });
  const log = join(f.root, 'payload.log');
  const local = (args, vars = {}) => f.local(args, { PAYLOAD_LOG: log, ...vars });
  const asked = () => readFileSync(log, 'utf8').split('\n').slice(0, -1);
  f.edit('wiki/README.md', `${wiki}\nMore guidance.\n`);
  passes(local([]));
  assert.deepEqual(asked(), ['--docs-only']);
  f.edit('app/index.js', 'export const x = 2;\n');
  const failing = local([], { PAYLOAD_RESULT: 'fail (lint, script-tests)', PAYLOAD_RC: '1' });
  assert.equal(failing.status, 1);
  assert.equal(verdict(failing), 'LOCAL_CHECKS=fail (payload:lint, payload:script-tests)');
  assert.match(failing.stdout, /--worktree --only payload:lint,payload:script-tests$/m);
  assert.equal(asked().at(-1), '');
  // One named step reruns alone, with no suite beside it.
  const before = f.calls().length;
  passes(local(['--only', 'payload:lint']));
  assert.equal(asked().at(-1), '--only lint');
  assert.equal(f.calls().length, before);
  const noTools = local([], { PAYLOAD_RESULT: 'not run (the test tools did not install)', PAYLOAD_RC: '7' });
  assert.equal(noTools.status, 7);
  assert.equal(verdict(noTools), 'LOCAL_CHECKS=not run (the test tools did not install)');
  const crashed = local(['--only', 'payload'], { PAYLOAD_RESULT: 'silent', PAYLOAD_RC: '1' });
  assert.equal(crashed.status, 1);
  assert.equal(verdict(crashed), 'LOCAL_CHECKS=fail (payload)');
});

test('the pre-check refuses commit arguments, and its options need --worktree', t => {
  const f = localFixture(t);
  for (const args of [['--base', f.base], ['--head', f.base], ['--discover'], ['--summary', f.summary], ['--only', 'nope'], ['--only', ','], ['--lock-wait', 'soon']]) {
    assert.equal(f.local(args).status, 2, args.join(' '));
  }
  for (const args of [['--only', 'suite'], ['--lock-wait', '5']]) assert.equal(f.run(args).status, 2, args.join(' '));
  const outside = spawnSync(process.execPath, [script, '--worktree', '--repo', f.root], { env: { ...f.env, WONG_CHECKS_LOCK: f.lock }, encoding: 'utf8' });
  assert.equal(outside.status, 1);
  assert.match(outside.stderr, /Checks unavailable/);
  assert.deepEqual(f.calls(), []);
  assert.equal(existsSync(f.lock), false);
});
