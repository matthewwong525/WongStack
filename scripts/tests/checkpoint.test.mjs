import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { failingChecks } from '../../.agents/skills/save/scripts/checkpoint.mjs';

const script = new URL('../../.agents/skills/save/scripts/checkpoint.mjs', import.meta.url).pathname;
const REAL_GIT = execFileSync('bash', ['-c', 'command -v git'], { encoding: 'utf8' }).trim();
const PR = { number: 7, state: 'OPEN', url: 'https://github.com/team/repo/pull/7' };
const run = (id, job) => `https://github.com/team/repo/actions/runs/${id}/job/${job}`;
const PASS = [`pass\tunit\t${run(10, 1)}`];
// An Artifacts install: origin is on Cloudflare's Git domain, and the install record names the route.
const ARTIFACTS_REMOTE = `https://${'0123456789abcdef'.repeat(2)}.artifacts.cloudflare.net/git/wongstack/repo.git`;
const ARTIFACTS_RECORD = { components: { delivery: { route: 'artifacts', accountId: '0123456789abcdef'.repeat(2), remote: ARTIFACTS_REMOTE, workflow: 'repo-checks' } } };
const PREVIEW = 'https://work.example.workers.dev';

// The real git, against a bare origin in the fixture. Every call is logged, and the origin
// address reads as a GitHub one so the receipt helper can name the repository.
const FAKE_GIT = `#!/usr/bin/env bash
echo "git $*" >> "$FAKE_DIR/calls"
case "$*" in
  *"remote get-url origin") echo "\${FAKE_REMOTE:-https://github.com/team/repo.git}"; exit 0 ;;
esac
exec "$REAL_GIT" "$@"
`;

// A fake gh that answers from $FAKE_DIR/gh.json and logs every call. It reads HEAD and the
// branch from the real repository, so the waiter and the receipt see the commit just pushed.
const FAKE_GH = `#!/usr/bin/env node
const { appendFileSync, copyFileSync, existsSync, readFileSync, writeFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');
const dir = process.env.FAKE_DIR;
const args = process.argv.slice(2);
const line = args.join(' ');
appendFileSync(join(dir, 'calls'), 'gh ' + line + '\\n');
const s = JSON.parse(readFileSync(join(dir, 'gh.json'), 'utf8'));
const git = (...a) => execFileSync(process.env.REAL_GIT, a, { encoding: 'utf8' }).trim();
const out = text => { process.stdout.write(text + '\\n'); process.exit(0); };
const fail = (text, code = 1) => { process.stderr.write(text + '\\n'); process.exit(code); };
const open = { number: 7, state: 'OPEN', url: 'https://github.com/team/repo/pull/7' };
const pr = s.pr ?? (existsSync(join(dir, 'created')) ? open : null);
const run = { id: 10, run_attempt: 1, workflow_id: 2, event: 'push', status: 'completed', conclusion: 'success', repository: { full_name: 'team/repo' } };
const check = { __typename: 'CheckRun', name: 'unit', detailsUrl: 'https://github.com/team/repo/actions/runs/10/job/1', status: 'COMPLETED', conclusion: 'SUCCESS' };
if (line.startsWith('pr view --json number,state,url')) {
  if (s.viewError) fail(s.viewError);
  if (!pr) fail('no pull requests found for branch "work"');
  out(JSON.stringify(pr));
}
if (line.startsWith('pr view --json headRefOid')) { if (s.headError) fail(s.headError, 4); out(git('rev-parse', 'HEAD')); }
if (line.startsWith('pr view --json number,headRefOid')) out(JSON.stringify({ number: 7, headRefOid: git('rev-parse', 'HEAD'), headRefName: git('branch', '--show-current'), statusCheckRollup: [check] }));
if (line.startsWith('pr view --json comments')) out('');
if (line === 'pr checks --help') out('  --json fields');
if (line.startsWith('pr checks --json')) { if (!s.checks) fail('no checks reported on the branch'); out(s.checks.join('\\n')); }
if (line.startsWith('pr create')) {
  writeFileSync(join(dir, 'created'), '1');
  copyFileSync(args[args.indexOf('--body-file') + 1], join(dir, 'body.md'));
  out('https://github.com/team/repo/pull/7');
}
if (line.startsWith('repo view --json url')) out('https://github.com/team/repo');
if (line.startsWith('repo view --json nameWithOwner')) out(args.includes('--jq') ? 'team/repo' : JSON.stringify({ nameWithOwner: 'team/repo' }));
if (line.startsWith('api -X PATCH')) {
  if (s.patchError) fail(s.patchError);
  copyFileSync(args.find(a => a.startsWith('body=@')).slice(6), join(dir, 'body.md'));
  out('');
}
if (line === 'api repos/team/repo/pulls/7') out(JSON.stringify({ state: 'open', head: { sha: git('rev-parse', 'HEAD'), ref: git('branch', '--show-current'), repo: { full_name: 'team/repo' } } }));
if (line.startsWith('api repos/team/repo/actions/runs?')) out(JSON.stringify({ total_count: 1, workflow_runs: [{ ...run, head_sha: git('rev-parse', 'HEAD') }] }));
if (line.startsWith('api repos/team/repo/deployments?')) out(s.preview ? '55' : '');
if (line.startsWith('api repos/team/repo/deployments/55/statuses')) out(s.preview);
if (line.startsWith('api repos/team/repo/commits/')) out('');
if (line.startsWith('run view')) {
  const log = (s.logs ?? {})[args[2] === '--job' ? args[3] : args[2]];
  if (!log) fail('log not found');
  out(log);
}
fail('unexpected gh call: ' + line, 97);
`;

// On an Artifacts install the scripts call `node` by name for two things. delivery-route.mjs runs
// for real, over the fake git's origin and the committed install record. artifacts-run.mjs is
// stood in for: `wait` prints $FAKE_DIR/run.txt, as the check run's reader would, and `preview`
// prints $FAKE_DIR/preview.txt. Every other script, the fake gh included, runs on the real node.
const FAKE_NODE = `#!/usr/bin/env bash
case "\${1:-}" in
  */artifacts-run.mjs)
    echo "node artifacts-run.mjs \${*:2}" >> "$FAKE_DIR/calls"
    case "\${2:-}" in
      wait) cat "$FAKE_DIR/run.txt" ;;
      preview) cat "$FAKE_DIR/preview.txt" 2>/dev/null ;;
    esac
    exit 0 ;;
esac
exec "$REAL_NODE" "$@"
`;

function fixture(t, { pushed = true, workflows = true, gh = { pr: PR, checks: PASS }, artifacts = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-checkpoint-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const work = join(dir, 'work');
  const origin = join(dir, 'origin.git');
  for (const name of ['bin', 'work', 'notes', 'state']) mkdirSync(join(dir, name));
  for (const [name, body] of [['git', FAKE_GIT], ['gh', FAKE_GH], ...(artifacts ? [['node', FAKE_NODE]] : [])]) {
    writeFileSync(join(dir, 'bin', name), body);
    chmodSync(join(dir, 'bin', name), 0o755);
  }
  writeFileSync(join(dir, 'calls'), '');
  const env = {
    ...process.env, PATH: `${join(dir, 'bin')}:${process.env.PATH}`, HOME: dir, FAKE_DIR: dir, REAL_GIT,
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.test', GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.test',
    WONG_SAVE_STATE_DIR: join(dir, 'state'), WAIT_FOR_CHECKS_GRACE: '1', WAIT_FOR_CHECKS_INTERVAL: '0.2',
    ...(artifacts ? { FAKE_REMOTE: ARTIFACTS_REMOTE, REAL_NODE: process.execPath } : {}),
  };
  const git = (...args) => execFileSync(REAL_GIT, args, { cwd: work, env, encoding: 'utf8' }).trim();
  const write = (path, text) => {
    mkdirSync(dirname(join(work, path)), { recursive: true });
    writeFileSync(join(work, path), text);
  };
  const stage = (path, text) => { write(path, text); git('add', '--', path); };
  const set = scenario => writeFileSync(join(dir, 'gh.json'), JSON.stringify(scenario));
  execFileSync(REAL_GIT, ['init', '-q', '--bare', '-b', 'main', origin], { env });
  git('init', '-q', '-b', 'main');
  git('remote', 'add', 'origin', origin);
  write('.gitignore', '.env*\n');
  write('app.txt', 'one\n');
  if (workflows) write('.github/workflows/test.yml', 'on: push\n');
  if (artifacts) write('.claude/.wong-stack.json', `${JSON.stringify(ARTIFACTS_RECORD)}\n`);
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  git('push', '-q', '-u', 'origin', 'main');
  git('checkout', '-q', '-b', 'work');
  if (pushed) git('push', '-q', '-u', 'origin', 'work');
  set(gh);
  const message = join(dir, 'notes', 'message.txt');
  const summary = join(dir, 'notes', 'summary.md');
  // Each run writes the two files the agent would, then calls the one command.
  const save = (args = [], vars = {}) => {
    writeFileSync(message, 'feat: a thing\n\nCo-Authored-By: Claude <noreply@anthropic.com>\n');
    writeFileSync(summary, 'What changed, in plain words.\n');
    return call(['--message-file', message, '--summary-file', summary, ...args], vars);
  };
  const call = (args, vars = {}) => {
    const result = spawnSync(process.execPath, [script, ...args], { cwd: work, env: { ...env, ...vars }, encoding: 'utf8' });
    return { ...result, value: key => result.stdout.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1] };
  };
  const calls = () => readFileSync(join(dir, 'calls'), 'utf8');
  // What the Artifacts check run's reader prints for HEAD, and the preview its deploy reported.
  const checkRun = (text, preview = '') => {
    writeFileSync(join(dir, 'run.txt'), `${text}\n`);
    writeFileSync(join(dir, 'preview.txt'), preview ? `${preview}\n` : '');
  };
  return { dir, work, git, write, stage, set, save, call, calls, checkRun, message, summary, body: () => readFileSync(join(dir, 'body.md'), 'utf8') };
}

const lastLine = result => result.stdout.trimEnd().split('\n').at(-1);

test('an open pull request: one command returns the gate result, the preview, and the saved revision', t => {
  const f = fixture(t, { gh: { pr: PR, checks: PASS, preview: 'https://work.example.workers.dev' } });
  f.stage('openspec/changes/demo/proposal.md', '# Demo\n\n**Status:** in-progress\n**Branch:** work\n\n## Why\n\nIt is faster.\n\n## What Changes\n\n- One thing.\n');
  f.stage('openspec/changes/demo/tasks.md', '- [x] 1.1 Done\n');
  f.stage('app.txt', 'two\n');
  // An older review page is on disk, not staged: the command rebuilds and stages it.
  f.write('openspec/changes/demo/review.html', '<!-- wong-review:3 -->\nold page\n');
  const r = f.save(['--change-root', 'openspec/changes/demo', '--mode', 'active']);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  const head = f.git('rev-parse', 'HEAD');
  assert.match(f.git('show', 'HEAD:openspec/changes/demo/review.html'), /It is faster\./);
  assert.doesNotMatch(r.stdout, /REVIEW=stale/);
  assert.equal(r.value('SAVE_HEAD'), head);
  assert.equal(r.value('PR_URL'), PR.url);
  assert.equal(r.value('PREVIEW_URL'), 'https://work.example.workers.dev');
  assert.equal(r.value('ATTEMPT'), '0');
  assert.match(r.stdout, /^RESULT: SUCCESS$/m);
  assert.match(r.stdout, /^NEXT: checks passed/m);
  assert.equal(lastLine(r), 'SAVE_GATE_RESULT=SUCCESS');
  const receipt = JSON.parse(readFileSync(r.value('RECEIPT'), 'utf8'));
  assert.deepEqual({ ...receipt, gateIdentity: typeof receipt.gateIdentity }, { repository: 'team/repo', branch: 'work', headSha: head, gateIdentity: 'string', gateResult: 'SUCCESS' });
  // The commit reached the remote, under the message the agent wrote.
  assert.match(f.git('ls-remote', '--heads', 'origin', 'work'), new RegExp(`^${head}`));
  assert.equal(f.git('log', '-1', '--format=%s'), 'feat: a thing');
  const calls = f.calls();
  assert.ok(calls.indexOf('git commit -F') < calls.indexOf('git push\n'), 'commit before push');
  assert.match(calls, /gh api -X PATCH repos\/\{owner\}\/\{repo\}\/pulls\/7 -F body=@/);
  assert.doesNotMatch(calls, /gh pr create|--no-verify|--force/);
  // The body mirrors the change, and gains the preview once it is found.
  assert.match(f.body(), /## Summary[\s\S]*What changed, in plain words\.[\s\S]*## Tasks[\s\S]*## Preview[\s\S]*work\.example\.workers\.dev[\s\S]*\/continue demo/);
  assert.equal(existsSync(f.message) || existsSync(f.summary), false, 'the temporary files are deleted');
});

test('no pull request yet: the branch is pushed with its upstream and a pull request is created', t => {
  const f = fixture(t, { pushed: false, workflows: false, gh: { pr: null } });
  f.stage('README.md', '# Project\n');
  const r = f.save();
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.equal(r.value('PR_URL'), PR.url);
  assert.equal(r.value('PREVIEW_URL'), 'none');
  assert.equal(lastLine(r), 'SAVE_GATE_RESULT=NONE');
  assert.match(r.stdout, /^NEXT: no checks are configured/m);
  assert.equal(JSON.parse(readFileSync(r.value('RECEIPT'), 'utf8')).gateResult, 'NONE');
  assert.match(f.calls(), /git push -u origin HEAD\n[\s\S]*gh pr create --title feat: a thing --body-file /);
  // With no change, the body is the summary and a footer naming /ship.
  assert.match(f.body(), /^What changed, in plain words\.\n\n---\n_No change record was needed[^\n]*`\/ship` publishes it\._\n$/);
});

test('a merged pull request skips the push and the wait', t => {
  const f = fixture(t, { gh: { pr: { ...PR, state: 'MERGED' }, checks: PASS } });
  f.stage('app.txt', 'two\n');
  const r = f.save();
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.match(r.stdout, /^NEXT: this branch already shipped[^\n]*no live preview/m);
  assert.equal(r.value('RECEIPT'), 'none (the pull request already merged)');
  assert.equal(lastLine(r), 'SAVE_GATE_RESULT=UNKNOWN');
  assert.doesNotMatch(f.calls(), /git push|pr checks/);
});

test('a closed pull request stops with exit 3, so the skill asks', t => {
  const f = fixture(t, { gh: { pr: { ...PR, state: 'CLOSED' }, checks: PASS } });
  f.stage('app.txt', 'two\n');
  const r = f.save();
  assert.equal(r.status, 3);
  assert.match(r.stdout, /^REFUSED=the pull request is closed and not merged/m);
  assert.match(r.stdout, /^NEXT: ask the person: reopen it[^\n]*fresh branch/m);
  assert.doesNotMatch(r.stdout, /SAVE_GATE_RESULT/);
  assert.doesNotMatch(f.calls(), /git push|pr checks/);
});

test('two failing checks are listed with the causes their logs show, and the next action', t => {
  const f = fixture(t, { gh: {
    pr: PR,
    checks: [...PASS, `fail\tlint\t${run(10, 2)}`, `fail\te2e\t${run(11, 3)}`],
    logs: { 2: 'lint\tRun oxlint\terror: unused variable `old`', 3: 'e2e\tRun tests\tfirst line\ne2e\tRun tests\tExpected 2, received 3' },
  } });
  f.stage('app.txt', 'two\n');
  const r = f.save();
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.equal(lastLine(r), 'SAVE_GATE_RESULT=FAILURE');
  assert.match(r.stdout, new RegExp(`FAILED_CHECK=lint\\nLINK=${run(10, 2)}\\nRERUN=gh run rerun 10 --failed\\nCAUSE: last 1 lines of the failed log\\n {2}\\| lint\\tRun oxlint\\terror: unused variable`));
  assert.match(r.stdout, /FAILED_CHECK=e2e\n[\s\S]*RERUN=gh run rerun 11 --failed\nCAUSE: last 2 lines[^\n]*\n {2}\| [^\n]*first line\n {2}\| [^\n]*Expected 2, received 3/);
  assert.doesNotMatch(r.stdout, /FAILED_CHECK=unit/);
  assert.match(r.stdout, /^NEXT: fix every cause above in one push\.[^\n]*fix attempt 1 of 3[^\n]*--wait/m);
  assert.equal(JSON.parse(readFileSync(r.value('RECEIPT'), 'utf8')).gateResult, 'FAILURE');
  // No separate lookup is needed: the one command asked for both logs.
  assert.match(f.calls(), /gh run view --job 2 --log-failed\n[\s\S]*gh run view --job 3 --log-failed\n/);
  assert.equal(r.value('SUMMARY_FILE'), `${f.summary} (kept for the rerun)`);
  assert.equal(existsSync(f.summary), true);
  assert.equal(existsSync(f.message), false);
});

test('a failing check with no Actions log, or an unreadable one, still names its link', t => {
  const f = fixture(t, { gh: { pr: PR, checks: ['fail\tdeploy\thttps://ci.example.test/build/9', `fail\tlint\t${run(10, 2)}`] } });
  f.stage('app.txt', 'two\n');
  const r = f.save();
  assert.equal(lastLine(r), 'SAVE_GATE_RESULT=FAILURE');
  assert.match(r.stdout, /FAILED_CHECK=deploy\nLINK=https:\/\/ci\.example\.test\/build\/9\nCAUSE=no GitHub Actions log/);
  assert.match(r.stdout, /FAILED_CHECK=lint\n[^\n]*\n[^\n]*\nCAUSE=the log could not be read \(log not found\)/);
  assert.deepEqual(failingChecks('RESULT: FAILURE\n  - a b  https://x/1\nnoise'), [{ name: 'a b', link: 'https://x/1' }]);
});

test('checks that never finish are TIMEOUT, and --wait reads the gate again without a commit', t => {
  const f = fixture(t, { gh: { pr: PR, checks: [`pending\tunit\t${run(10, 1)}`] } });
  f.stage('app.txt', 'two\n');
  const r = f.save(['--max-minutes', '0']);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.equal(lastLine(r), 'SAVE_GATE_RESULT=TIMEOUT');
  assert.match(r.stdout, /^NEXT: checks are still running\.[^\n]*checkpoint\.mjs --wait$/m);
  const head = f.git('rev-parse', 'HEAD');
  f.set({ pr: PR, checks: PASS });
  const again = f.call(['--wait']);
  assert.equal(again.status, 0, `${again.stdout}${again.stderr}`);
  assert.equal(lastLine(again), 'SAVE_GATE_RESULT=SUCCESS');
  assert.equal(f.git('rev-parse', 'HEAD'), head);
  assert.equal(f.calls().match(/git commit/g).length, 1);
  assert.equal(f.calls().match(/git push/g).length, 1, 'the one save push; --wait pushes nothing');
});

test('a gate gh cannot answer is UNKNOWN, with no receipt', t => {
  const f = fixture(t, { gh: { pr: PR, checks: PASS, headError: 'To get started with GitHub CLI, please run:  gh auth login' } });
  f.stage('app.txt', 'two\n');
  const r = f.save();
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.equal(lastLine(r), 'SAVE_GATE_RESULT=UNKNOWN');
  assert.match(r.stdout, /gh auth login/);
  assert.equal(r.value('RECEIPT'), 'none (the gate is unverified)');
  assert.match(r.stdout, /^NEXT: the gate is unverified, which is never "no checks"/m);
});

test('a handled credential in a staged file stops before the commit, and prints paths only', t => {
  const f = fixture(t);
  const secret = 'sk-live-0123456789abcdef';
  f.write('.env', `API_KEY=${secret}\nOTHER=\n`);
  f.stage('config.txt', `token: ${secret}\n`);
  const before = f.git('rev-parse', 'HEAD');
  const r = f.save(['--scan-keys', 'API_KEY,OTHER']);
  assert.equal(r.status, 5);
  assert.match(r.stdout, /^SCAN_NO_VALUE=OTHER$/m);
  assert.match(r.stdout, /^CREDENTIAL_MATCH=config\.txt$/m);
  assert.match(r.stdout, /^NEXT: a handled credential is in the paths above/m);
  assert.doesNotMatch(`${r.stdout}${r.stderr}`, new RegExp(secret));
  assert.equal(f.git('rev-parse', 'HEAD'), before);
  assert.doesNotMatch(f.calls(), /git commit|git push|gh /);
});

test('a handled credential in the summary stops too, and a clean scan goes on', t => {
  const f = fixture(t);
  f.write('.env', 'API_KEY=sk-live-0123456789abcdef\n');
  f.stage('app.txt', 'two\n');
  writeFileSync(f.message, 'feat: a thing\n');
  writeFileSync(f.summary, 'The key is sk-live-0123456789abcdef.\n');
  const leaked = f.call(['--message-file', f.message, '--summary-file', f.summary, '--scan-keys', 'API_KEY']);
  assert.equal(leaked.status, 5);
  assert.match(leaked.stdout, /^CREDENTIAL_MATCH=the summary$/m);
  const clean = f.save(['--scan-keys', 'API_KEY']);
  assert.equal(clean.status, 0, `${clean.stdout}${clean.stderr}`);
  assert.equal(lastLine(clean), 'SAVE_GATE_RESULT=SUCCESS');
});

test('nothing staged and nothing to push is refused, and so is the default branch', t => {
  const f = fixture(t);
  const empty = f.save();
  assert.equal(empty.status, 4);
  assert.match(empty.stdout, /^REFUSED=nothing is staged and nothing waits to be pushed$/m);
  assert.doesNotMatch(f.calls(), /git commit|git push\n|gh /);
  f.git('checkout', '-q', 'main');
  f.stage('app.txt', 'two\n');
  const onMain = f.save();
  assert.equal(onMain.status, 4);
  assert.match(onMain.stdout, /^REFUSED=HEAD is the default branch \(main\)$/m);
  assert.doesNotMatch(f.calls(), /git commit/);
});

test('a commit made earlier is pushed with nothing staged', t => {
  const f = fixture(t);
  f.stage('app.txt', 'two\n');
  f.git('commit', '-q', '-m', 'feat: made earlier');
  const r = f.save();
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.equal(lastLine(r), 'SAVE_GATE_RESULT=SUCCESS');
  assert.doesNotMatch(f.calls(), /git commit -F/);
  assert.match(f.git('ls-remote', '--heads', 'origin', 'work'), new RegExp(`^${f.git('rev-parse', 'HEAD')}`));
});

test('the script counts fix attempts: the fourth is refused before any commit', t => {
  const failing = { pr: PR, checks: [`fail\tunit\t${run(10, 1)}`], logs: { 1: 'unit\tRun tests\tnot ok' } };
  const f = fixture(t, { gh: failing });
  for (const attempt of [0, 1, 2, 3]) {
    f.stage('app.txt', `attempt ${attempt}\n`);
    const r = f.save();
    assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
    assert.equal(r.value('ATTEMPT'), String(attempt));
    assert.equal(lastLine(r), 'SAVE_GATE_RESULT=FAILURE');
    assert.match(r.stdout, attempt < 3 ? new RegExp(`fix attempt ${attempt + 1} of 3`) : /^NEXT: the 3 fix attempts are spent\. Stop/m);
  }
  assert.equal(existsSync(f.summary), false, 'no rerun is left, so the summary is deleted');
  f.stage('app.txt', 'attempt 4\n');
  const before = f.git('rev-parse', 'HEAD');
  const refused = f.save();
  assert.equal(refused.status, 6);
  assert.match(refused.stdout, /^REFUSED=the 3 fix attempts of this \/save run are spent$/m);
  assert.equal(f.git('rev-parse', 'HEAD'), before);
  // A new /save run starts the count again, and a pass ends the run.
  f.set({ pr: PR, checks: PASS });
  const fresh = f.save(['--new-run']);
  assert.equal(fresh.status, 0, `${fresh.stdout}${fresh.stderr}`);
  assert.equal(fresh.value('ATTEMPT'), '0');
  assert.equal(lastLine(fresh), 'SAVE_GATE_RESULT=SUCCESS');
});

test('a failed push stops with its exact error, before any wait', t => {
  const f = fixture(t);
  f.git('remote', 'set-url', 'origin', join(f.dir, 'missing.git'));
  f.stage('app.txt', 'two\n');
  const r = f.save();
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^error=git push: [\s\S]*missing\.git/);
  assert.doesNotMatch(r.stdout, /SAVE_GATE_RESULT/);
  assert.doesNotMatch(f.calls(), /pr checks/);
  assert.equal(existsSync(f.summary), true, 'the files stay for the rerun');
});

test('a body update that fails is reported as stale, and the gate is still read', t => {
  const f = fixture(t, { gh: { pr: PR, checks: PASS, patchError: 'HTTP 502' } });
  f.stage('app.txt', 'two\n');
  const r = f.save();
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.equal(r.value('PR_BODY'), 'stale (HTTP 502)');
  assert.equal(lastLine(r), 'SAVE_GATE_RESULT=SUCCESS');
});

test('a body that cannot be rendered stops before the push', t => {
  const f = fixture(t);
  f.stage('app.txt', 'two\n');
  const r = f.save(['--change-root', 'openspec/changes/missing']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^error=PR body: /);
  assert.match(r.stdout, /^REVIEW=stale \(missing /m);
  assert.doesNotMatch(f.calls(), /git push\n/);
});

test('an unreadable pull request and bad arguments stop early', t => {
  const f = fixture(t, { gh: { viewError: 'HTTP 401: Bad credentials' } });
  f.stage('app.txt', 'two\n');
  const unreadable = f.save();
  assert.equal(unreadable.status, 1);
  assert.match(unreadable.stderr, /^error=gh pr view: HTTP 401: Bad credentials$/m);
  assert.match(unreadable.stdout, /^NEXT: gh could not read the pull request\./m);
  f.write('inside.txt', 'x\n');
  for (const args of [[], ['--message-file', join(f.work, 'inside.txt'), '--summary-file', f.summary], ['--wait', '--mode', 'active'],
    ['--message-file', f.message, '--summary-file', f.summary, '--change-root', 'x', '--mode', 'other'],
    ['--message-file', f.message, '--summary-file', join(f.dir, 'notes', 'absent.md')], ['--wait', '--max-minutes', 'soon']]) {
    assert.equal(f.call(args).status, 2, args.join(' '));
  }
});

// ---------------------------------------------------------------------------
// The Artifacts route: the same command, with no GitHub to ask

const neverGitHub = (f, result) => {
  assert.doesNotMatch(f.calls(), /^gh /m, 'gh is never asked on an Artifacts install');
  assert.doesNotMatch(result.stdout, /^PR_URL=|GitHub|[Pp]ull request/m, 'nothing names a pull request or GitHub');
};

test('an Artifacts install: one command pushes the branch, waits for its check run, and asks gh nothing', t => {
  const f = fixture(t, { artifacts: true, pushed: false });
  f.checkRun('RESULT: SUCCESS', PREVIEW);
  f.stage('openspec/changes/demo/proposal.md', '# Demo\n\n**Status:** in-progress\n**Branch:** work\n\n## Why\n\nIt is faster.\n\n## What Changes\n\n- One thing.\n');
  f.stage('openspec/changes/demo/tasks.md', '- [x] 1.1 Done\n');
  f.stage('app.txt', 'two\n');
  f.write('openspec/changes/demo/review.html', '<!-- wong-review:3 -->\nold page\n');
  const r = f.save(['--change-root', 'openspec/changes/demo', '--mode', 'active']);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  const head = f.git('rev-parse', 'HEAD');
  assert.equal(r.value('SAVE_HEAD'), head);
  assert.equal(r.value('PREVIEW_URL'), PREVIEW);
  assert.match(r.value('RECEIPT'), /^none \(this route keeps no receipt/);
  assert.equal(r.value('ATTEMPT'), '0');
  assert.match(r.stdout, /^RESULT: SUCCESS$/m);
  assert.match(r.stdout, /^NEXT: checks passed\. Report the save\.$/m);
  assert.equal(lastLine(r), 'SAVE_GATE_RESULT=SUCCESS');
  // The review page is still rebuilt and committed, and the branch reaches the remote.
  assert.match(f.git('show', 'HEAD:openspec/changes/demo/review.html'), /It is faster\./);
  assert.match(f.git('ls-remote', '--heads', 'origin', 'work'), new RegExp(`^${head}`));
  assert.equal(f.git('log', '-1', '--format=%s'), 'feat: a thing');
  const calls = f.calls();
  assert.match(calls, /git commit -F [^\n]*\n[\s\S]*git push -u origin HEAD\n[\s\S]*node artifacts-run\.mjs wait 20\n[\s\S]*node artifacts-run\.mjs preview\n/);
  assert.doesNotMatch(calls, /--no-verify|--force/);
  neverGitHub(f, r);
  assert.equal(existsSync(f.message) || existsSync(f.summary), false, 'the temporary files are deleted');
});

test('an Artifacts install: a failed check run passes the failing stage\'s own lines through', t => {
  const f = fixture(t, { artifacts: true });
  // The last line has the shape of GitHub's failing-check list; it is still only passed through.
  f.checkRun(`RESULT: FAILURE\n  checks failed\n  not ok 1 - adds two numbers\n  Expected 2, received 3\n  - lint  ${run(10, 2)}`);
  f.stage('app.txt', 'two\n');
  const r = f.save();
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.equal(lastLine(r), 'SAVE_GATE_RESULT=FAILURE');
  assert.match(r.stdout, /^RESULT: FAILURE\n {2}checks failed\n {2}not ok 1 - adds two numbers\n {2}Expected 2, received 3\n {2}- lint {2}\S+$/m);
  assert.doesNotMatch(r.stdout, /^(FAILED_CHECK|LINK|RERUN|CAUSE)/m);
  assert.equal(r.value('PREVIEW_URL'), 'none');
  assert.match(r.stdout, /^NEXT: fix the cause the lines under RESULT show, in one push\.[^\n]*fix attempt 1 of 3[^\n]*no rerun on this route: stop and report it, with no code edit\.$/m);
  assert.equal(r.value('SUMMARY_FILE'), `${f.summary} (kept for the rerun)`);
  neverGitHub(f, r);
  // The fix is counted as on GitHub, and a pass ends the run.
  f.checkRun('RESULT: SUCCESS', PREVIEW);
  f.stage('app.txt', 'three\n');
  const fixed = f.save();
  assert.equal(fixed.status, 0, `${fixed.stdout}${fixed.stderr}`);
  assert.equal(fixed.value('ATTEMPT'), '1');
  assert.equal(fixed.value('PREVIEW_URL'), PREVIEW);
  assert.equal(lastLine(fixed), 'SAVE_GATE_RESULT=SUCCESS');
  neverGitHub(f, fixed);
});

test('an Artifacts install: the fourth fix is refused, with no pull request to point at', t => {
  const f = fixture(t, { artifacts: true });
  f.checkRun('RESULT: FAILURE\n  checks failed\n  not ok');
  for (const attempt of [0, 1, 2, 3]) {
    f.stage('app.txt', `attempt ${attempt}\n`);
    const r = f.save();
    assert.equal(r.value('ATTEMPT'), String(attempt));
    assert.match(r.stdout, attempt < 3 ? new RegExp(`fix attempt ${attempt + 1} of 3`) : /^NEXT: the 3 fix attempts are spent\. Stop and report the failing output above; change no more code\.$/m);
  }
  f.stage('app.txt', 'attempt 4\n');
  const refused = f.save();
  assert.equal(refused.status, 6);
  assert.match(refused.stdout, /^NEXT: stop and report the failing checks\. A later \/save run starts a new count with --new-run\.$/m);
  neverGitHub(f, refused);
});

test('an Artifacts install: a check run that can not be read is UNKNOWN, and --wait reads it again', t => {
  const f = fixture(t, { artifacts: true });
  f.checkRun('RESULT: UNKNOWN\n  Cloudflare answered HTTP 500', PREVIEW);
  f.stage('app.txt', 'two\n');
  const r = f.save();
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.equal(lastLine(r), 'SAVE_GATE_RESULT=UNKNOWN');
  assert.match(r.stdout, /^RESULT: UNKNOWN\n {2}Cloudflare answered HTTP 500$/m);
  assert.match(r.stdout, /^NEXT: the gate is unverified, which is never "no checks"/m);
  assert.equal(r.value('PREVIEW_URL'), 'none', 'an unverified gate reads no preview');
  assert.doesNotMatch(f.calls(), /artifacts-run\.mjs preview/);
  const head = f.git('rev-parse', 'HEAD');
  f.checkRun('RESULT: TIMEOUT\n  - checks (still running)');
  const waiting = f.call(['--wait', '--max-minutes', '1']);
  assert.equal(lastLine(waiting), 'SAVE_GATE_RESULT=TIMEOUT');
  assert.match(waiting.stdout, /^NEXT: checks are still running\. Report that, or keep waiting with: [^\n]*checkpoint\.mjs --wait$/m);
  assert.match(f.calls(), /node artifacts-run\.mjs wait 1\n/);
  f.checkRun('RESULT: NONE');
  const none = f.call(['--wait']);
  assert.equal(lastLine(none), 'SAVE_GATE_RESULT=NONE');
  assert.match(none.stdout, /^NEXT: no checks are configured\. Report the save\.$/m);
  assert.equal(f.git('rev-parse', 'HEAD'), head);
  assert.equal(f.calls().match(/git commit/g).length, 1);
  assert.equal(f.calls().match(/git push/g).length, 1, 'the one save push; --wait pushes nothing');
  for (const result of [r, waiting, none]) neverGitHub(f, result);
});

test('a route that can not be told stops before any commit, and never falls back to GitHub', t => {
  // The install record names Artifacts, but origin is on GitHub.
  const recorded = fixture(t, { artifacts: true });
  recorded.stage('app.txt', 'two\n');
  const before = recorded.git('rev-parse', 'HEAD');
  const r = recorded.save([], { FAKE_REMOTE: 'https://github.com/team/repo.git' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /^error=the delivery route could not be told: the install record says artifacts, but origin is on github\.com$/m);
  assert.match(r.stdout, /^NEXT: origin and the install record disagree, so nothing ran\./m);
  assert.doesNotMatch(r.stdout, /SAVE_HEAD|SAVE_GATE_RESULT/);
  assert.equal(recorded.git('rev-parse', 'HEAD'), before);
  assert.doesNotMatch(recorded.calls(), /git commit|git push|^gh |artifacts-run/m);
  assert.equal(existsSync(recorded.summary), true, 'the files stay for the rerun');
  // Origin is an Artifacts repository, but no install record names the route.
  const unrecorded = fixture(t);
  unrecorded.stage('app.txt', 'two\n');
  const other = unrecorded.save([], { FAKE_REMOTE: ARTIFACTS_REMOTE });
  assert.equal(other.status, 1);
  assert.match(other.stderr, /^error=the delivery route could not be told: origin is a Cloudflare Artifacts repository, but the install record names no artifacts route$/m);
  assert.doesNotMatch(unrecorded.calls(), /git commit|git push|^gh /m);
});

test('record-only routine checkpoint uses the same remote gate without an OpenSpec change', async t => {
  const { ROUTINE_REFERENCE, routine } = await import('./fixtures/schedule-records.mjs');
  const f = fixture(t, { gh: { pr: PR, checks: PASS } });
  f.stage(ROUTINE_REFERENCE, JSON.stringify(routine()));
  const r = f.save(['--schedule-record', ROUTINE_REFERENCE]);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.equal(lastLine(r), 'SAVE_GATE_RESULT=SUCCESS');
  assert.match(f.body(), /Record-only checkpoint: schedules\/weekly-summary\.json/);
  assert.doesNotMatch(f.body(), /No change record was needed|Interactive review/);
  assert.equal(existsSync(join(f.work, 'openspec', 'changes')), false);
  assert.match(f.calls(), /git push[\s\S]*pr checks/);
});

test('a routine record retains a failing gate and rejects mixed source before commit or push', async t => {
  const { ROUTINE_REFERENCE, routine } = await import('./fixtures/schedule-records.mjs');
  const f = fixture(t, { gh: { pr: PR, checks: [`fail\tunit\t${run(10, 1)}`], logs: { 1: 'failed fixture' } } });
  f.stage(ROUTINE_REFERENCE, JSON.stringify(routine()));
  f.stage('app.txt', 'changed source\n');
  const mixed = f.save(['--schedule-record', ROUTINE_REFERENCE]);
  assert.equal(mixed.status, 1);
  assert.match(mixed.stderr, /mixed source or code plans/);
  assert.doesNotMatch(f.calls(), /git commit -F|git push\n/);
  f.git('restore', '--staged', '--worktree', 'app.txt');
  const result = f.save(['--schedule-record', ROUTINE_REFERENCE]);
  assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
  assert.equal(lastLine(result), 'SAVE_GATE_RESULT=FAILURE');
});

test('ordinary checkpoint cannot disguise a routine definition as a no-change edit', async t => {
  const { ROUTINE_REFERENCE, routine } = await import('./fixtures/schedule-records.mjs');
  const f = fixture(t);
  f.stage(ROUTINE_REFERENCE, JSON.stringify(routine()));
  const result = f.save();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /use --schedule-record/);
  assert.doesNotMatch(f.calls(), /git commit -F|git push\n/);
});
