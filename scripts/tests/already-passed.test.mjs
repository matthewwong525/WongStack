import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.github/scripts/already-passed.sh');

const bash = spawnSync('bash', ['--version']);
if (bash.error || bash.status !== 0) throw new Error('already-passed tests need bash on PATH');

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

// A stub `gh` answers from STUB_PULLS and STUB_CHECKS, fails on STUB_FAIL, and
// logs every call to STUB_LOG.
const stubGh = `#!/usr/bin/env bash
echo "$*" >> "$STUB_LOG"
[ -n "\${STUB_FAIL:-}" ] && { echo "HTTP 502" >&2; exit 1; }
case "$2" in
  */pulls) printf '%s' "$STUB_PULLS" ;;
  */check-runs*) printf '%s' "$STUB_CHECKS" ;;
  *) echo "unexpected: $*" >&2; exit 1 ;;
esac
`;

// Squash merges of one head: `same` on its tested base, `moved` after another change. The head is
// only under refs/pull/7/head, and a --no-local clone copies branches only, so the script must fetch it.
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-already-passed-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = gitEnv(root);
  const origin = join(root, 'origin.git');
  const work = join(root, 'work');
  const ci = join(root, 'ci');
  const git = (cwd, ...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim();
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', origin], { env });
  mkdirSync(work);
  git(work, 'init', '-q', '-b', 'main');
  git(work, 'remote', 'add', 'origin', origin);
  const commit = (files, message) => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(work, path)), { recursive: true });
      writeFileSync(join(work, path), text);
    }
    git(work, 'add', '-A');
    git(work, 'commit', '-q', '-m', message);
    return git(work, 'rev-parse', 'HEAD');
  };

  const base = commit({ 'app/src/index.ts': 'export const x = 1;\n' }, 'base');
  git(work, 'checkout', '-q', '-b', 'feature');
  const head = commit({ 'app/src/index.ts': 'export const x = 2;\n' }, 'feature');
  git(work, 'push', '-q', 'origin', 'HEAD:refs/pull/7/head');

  const squash = (branch, from) => {
    git(work, 'checkout', '-q', '-b', branch, from);
    git(work, 'merge', '-q', '--squash', 'feature');
    git(work, 'commit', '-q', '-m', `squash into ${branch}`);
    git(work, 'push', '-q', 'origin', `HEAD:refs/heads/${branch}`);
    return git(work, 'rev-parse', 'HEAD');
  };
  const same = squash('same', base);
  git(work, 'checkout', '-q', '-b', 'other', base);
  const other = commit({ 'wiki/README.md': '# Wiki\n' }, 'other change');
  const moved = squash('moved', other);
  execFileSync('git', ['clone', '-q', '--no-local', origin, ci], { env });
  const ciHasHead = () => spawnSync('git', ['cat-file', '-e', `${head}^{commit}`], { cwd: ci, env }).status === 0;

  const bin = join(root, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'gh'), stubGh);
  chmodSync(join(bin, 'gh'), 0o755);
  const log = join(root, 'gh.log');

  // Runs the script in the CI clone and parses its three output lines.
  const run = ({ sha, pulls = [], checks = { check_runs: [] }, vars = {} }) => {
    writeFileSync(log, '');
    const result = spawnSync('bash', [script], {
      cwd: ci,
      encoding: 'utf8',
      env: {
        ...env,
        PATH: `${bin}:${process.env.PATH}`,
        GITHUB_REPOSITORY: 'owner/repo',
        GITHUB_SHA: sha,
        STUB_LOG: log,
        STUB_PULLS: JSON.stringify(pulls),
        STUB_CHECKS: JSON.stringify(checks),
        ...vars,
      },
    });
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    const lines = result.stdout.split('\n').filter(Boolean);
    assert.deepEqual(lines.map(line => line.split('=')[0]), ['passed', 'pr', 'sha'],
      `stdout must hold only the three output lines:\n${result.stdout}`);
    const out = Object.fromEntries(lines.map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
    return { ...out, stderr: result.stderr, calls: readFileSync(log, 'utf8') };
  };
  const pull = merge => [{ number: 7, merged_at: '2026-10-20T10:00:00Z', merge_commit_sha: merge, head: { sha: head } }];
  return { head, same, moved, run, pull, ciHasHead };
}

const checkRun = (id, conclusion, startedAt, extra = {}) => ({
  id,
  status: 'completed',
  conclusion,
  started_at: startedAt,
  app: { slug: 'github-actions' },
  details_url: `https://github.com/owner/repo/actions/runs/${id}/job/${id}`,
  ...extra,
});
// The push's real run, and the same-repo pull_request event's job-level skip after it.
const passedHead = { check_runs: [checkRun(2, 'skipped', '2026-10-20T09:01:00Z'), checkRun(1, 'success', '2026-10-20T09:00:00Z')] };

test('a merge of exactly the tested code fetches the head and passes, naming its pull request', t => {
  const f = fixture(t);
  assert.equal(f.ciHasHead(), false, 'the CI clone must start without the head');
  const result = f.run({ sha: f.same, pulls: f.pull(f.same), checks: passedHead });
  assert.equal(result.passed, 'true', result.stderr);
  assert.equal(result.pr, '7');
  assert.equal(result.sha, '', 'the default mode names no reused commit');
  assert.match(result.calls, new RegExp(`api repos/owner/repo/commits/${f.same}/pulls`));
  assert.match(result.calls, new RegExp(`api repos/owner/repo/commits/${f.head}/check-runs\\?check_name=test`));
  assert.equal(f.ciHasHead(), true, 'the script must fetch the head by refs/pull/7/head');
});

test('a merge whose code differs from the tested head runs the suite', t => {
  const f = fixture(t);
  const result = f.run({ sha: f.moved, pulls: f.pull(f.moved), checks: passedHead });
  assert.equal(result.passed, 'false');
  assert.equal(result.pr, '7');
  assert.match(result.stderr, /code differs/);
});

test('a head whose newest test run failed runs the suite, even after an older pass', t => {
  const f = fixture(t);
  const checks = { check_runs: [checkRun(1, 'success', '2026-10-20T09:00:00Z'), checkRun(3, 'failure', '2026-10-20T09:30:00Z')] };
  assert.equal(f.run({ sha: f.same, pulls: f.pull(f.same), checks }).passed, 'false');
});

test('a head with no test run, only a skipped one, or one still running runs the suite', t => {
  const f = fixture(t);
  for (const checks of [
    { check_runs: [] },
    { check_runs: [checkRun(2, 'skipped', '2026-10-20T09:01:00Z')] },
    { check_runs: [checkRun(1, 'success', '2026-10-20T09:00:00Z', { app: { slug: 'some-other-app' } })] },
    { check_runs: [checkRun(4, null, '2026-10-20T09:40:00Z', { status: 'in_progress' }), checkRun(1, 'success', '2026-10-20T09:00:00Z')] },
  ]) {
    assert.equal(f.run({ sha: f.same, pulls: f.pull(f.same), checks }).passed, 'false', JSON.stringify(checks));
  }
});

test('a push with no merged pull request behind it runs the suite', t => {
  const f = fixture(t);
  const unmerged = [{ ...f.pull(f.same)[0], merged_at: null }];
  for (const pulls of [[], unmerged, f.pull(f.moved)]) {
    const result = f.run({ sha: f.same, pulls, checks: passedHead });
    assert.equal(result.passed, 'false');
    assert.equal(result.pr, '');
  }
});

test('a gh error, unreadable JSON, or missing input runs the suite', t => {
  const f = fixture(t);
  assert.equal(f.run({ sha: f.same, pulls: f.pull(f.same), checks: passedHead, vars: { STUB_FAIL: '1' } }).passed, 'false');
  assert.equal(f.run({ sha: f.same, checks: passedHead, vars: { STUB_PULLS: 'not json' } }).passed, 'false');
  assert.equal(f.run({ sha: f.same, pulls: f.pull(f.same), vars: { STUB_CHECKS: '<html>' } }).passed, 'false');
  assert.equal(f.run({ sha: 'not-a-sha', pulls: f.pull(f.same), checks: passedHead }).passed, 'false');
  assert.equal(f.run({ sha: f.same, pulls: f.pull(f.same), checks: passedHead, vars: { GITHUB_REPOSITORY: '' } }).passed, 'false');
});

test('a head no fetch can find runs the suite', t => {
  const f = fixture(t);
  const pulls = [{ ...f.pull(f.same)[0], number: 8, head: { sha: 'f'.repeat(40) } }];
  const result = f.run({ sha: f.same, pulls, checks: passedHead });
  assert.equal(result.passed, 'false');
  assert.equal(result.pr, '8');
});

// --branch: a branch off main, its commits' test checks answered by GH_DIR/<sha>.json.
function branch(t) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-already-passed-branch-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = gitEnv(root);
  const work = join(root, 'work');
  mkdirSync(work);
  const git = (...args) => execFileSync('git', args, { cwd: work, env, encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'main');
  const commit = (path, text) => {
    mkdirSync(dirname(join(work, path)), { recursive: true });
    writeFileSync(join(work, path), text);
    git('add', '-A');
    git('commit', '-q', '-m', path);
    return git('rev-parse', 'HEAD');
  };
  commit('app/package.json', '{"scripts":{"test":"vitest run"}}\n');
  git('update-ref', 'refs/remotes/origin/main', commit('app/src/a.ts', 'export const a = 1;\n'));
  const answers = join(root, 'gh-answers');
  const bin = join(root, 'bin');
  mkdirSync(answers);
  mkdirSync(bin);
  writeFileSync(join(bin, 'gh'), `#!/bin/sh
[ -e "$GH_DIR/fail" ] && exit 1
sha=$(printf '%s' "$2" | sed -n 's#.*/commits/\\([0-9a-f]*\\)/check-runs.*#\\1#p')
if [ -n "$sha" ] && [ -f "$GH_DIR/$sha.json" ]; then cat "$GH_DIR/$sha.json"; else echo '{"check_runs":[]}'; fi
`);
  chmodSync(join(bin, 'gh'), 0o755);
  const check = (sha, conclusion, status = 'completed') => writeFileSync(join(answers, `${sha}.json`), JSON.stringify({
    check_runs: [{ id: 1, status, conclusion, started_at: '2026-11-01T10:00:00Z', app: { slug: 'github-actions' } }],
  }));
  const answer = head => {
    const result = spawnSync('bash', [script, '--branch'], {
      cwd: work, encoding: 'utf8',
      env: { ...env, PATH: `${bin}:${process.env.PATH}`, GH_DIR: answers, GITHUB_REPOSITORY: 'owner/repo', GITHUB_SHA: head, DEFAULT_BRANCH: 'main' },
    });
    assert.equal(result.status, 0, result.stderr);
    return Object.fromEntries(result.stdout.trim().split('\n').map(line => line.split('=')));
  };
  return { commit, check, answer, ghFails: () => writeFileSync(join(answers, 'fail'), '') };
}

// A branch: a code commit, then a docs-only head.
function docsAfterCode(t) {
  const b = branch(t);
  const code = b.commit('app/src/a.ts', 'export const a = 2;\n');
  const head = b.commit('openspec/changes/x/proposal.md', '# X\n');
  return { ...b, code, head };
}

test('--branch reuses the newest earlier commit that passed when only docs changed since', t => {
  const b = docsAfterCode(t);
  b.check(b.code, 'success');
  assert.deepEqual(b.answer(b.head), { passed: 'true', pr: '', sha: b.code });
});

test('--branch looks past a newer failed commit to an older pass', t => {
  const b = branch(t);
  const code = b.commit('app/src/a.ts', 'export const a = 2;\n');
  const docs = b.commit('wiki/a.md', '# A\n');
  const head = b.commit('wiki/a.md', '# A, fixed\n');
  b.check(docs, 'failure');
  b.check(code, 'success');
  assert.equal(b.answer(head).sha, code);
});

test('--branch refuses a failed, unfinished or job-skipped check', t => {
  for (const [conclusion, status] of [['failure', 'completed'], [null, 'in_progress'], ['skipped', 'completed']]) {
    const b = docsAfterCode(t);
    b.check(b.code, conclusion, status);
    assert.deepEqual(b.answer(b.head), { passed: 'false', pr: '', sha: '' }, `${status} ${conclusion}`);
  }
});

test('--branch refuses when code changed since the pass', t => {
  const b = branch(t);
  const code = b.commit('app/src/a.ts', 'export const a = 2;\n');
  const head = b.commit('app/src/a.ts', 'export const a = 3;\n');
  b.check(code, 'success');
  assert.deepEqual(b.answer(head), { passed: 'false', pr: '', sha: '' });
});

test('--branch answers false on a gh error and on a branch with no earlier commit', t => {
  const b = docsAfterCode(t);
  b.check(b.code, 'success');
  b.ghFails();
  assert.equal(b.answer(b.head).passed, 'false');
  const fresh = branch(t);
  assert.equal(fresh.answer(fresh.commit('wiki/a.md', '# A\n')).passed, 'false');
});
