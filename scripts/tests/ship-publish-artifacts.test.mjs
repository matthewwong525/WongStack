import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const script = new URL('../../.agents/skills/ship/scripts/publish-artifacts.sh', import.meta.url).pathname;
const merge = new URL('../../.agents/skills/ship/scripts/merge.sh', import.meta.url).pathname;
const HEAD = 'c'.repeat(40);
const TREE = 'f'.repeat(40);
const COMMIT = 'e'.repeat(40);
const LIVE = 'https://demo.example.workers.dev';

// Fake git, node and gh answer from env and log every call, so a test can check both the outcome
// and the order of the calls. Fake node stands in for delivery-route.mjs (always `artifacts`) and
// for artifacts-run.mjs: RUN_RESULT is the word `result` prints for the branch's own run, RUN_LIVE
// what `live` prints for main's run. No env name here is one the scripts set themselves.
const FAKE_GIT = `#!/usr/bin/env bash
echo "git $*" >> "$FAKE_DIR/calls"
case "$*" in
  "rev-parse --abbrev-ref HEAD") echo "\${BRANCH_NAME:-feature}" ;;
  "rev-parse HEAD") echo "${HEAD}" ;;
  "fetch origin main "*) exit "\${FETCH_RC:-0}" ;;
  "fetch origin main") : > "$FAKE_DIR/refetched"; exit "\${REFETCH_RC:-0}" ;;
  "rev-parse origin/main") if [ -e "$FAKE_DIR/refetched" ] && [ -n "\${MAIN_MOVED:-}" ]; then echo "${'f'.repeat(40)}"; else echo "${HEAD}"; fi ;;
  "rev-parse origin/"*) [ -n "\${SAVED_RC:-}" ] && exit "$SAVED_RC"; echo "\${SAVED_SHA:-${HEAD}}" ;;
  "merge-base --is-ancestor origin/main HEAD") exit "\${ANCESTOR_RC:-0}" ;;
  "log -1 --format=%s HEAD") echo "Archive the plan" ;;
  "log --reverse --format=%s origin/main..HEAD") printf '%s\\n' "\${FIRST_SUBJECT-feat: add recipes}" "Archive the plan" ;;
  "show HEAD:VERSION") [ -n "\${HEAD_VERSION:-}" ] && echo "$HEAD_VERSION" || exit 1 ;;
  "show origin/main:VERSION") [ -n "\${MAIN_VERSION:-}" ] && echo "$MAIN_VERSION" || exit 1 ;;
  "rev-parse HEAD^{tree}") echo "${TREE}" ;;
  "commit-tree "*) echo "${COMMIT}" ;;
  "push origin --delete "*) exit "\${DELETE_RC:-0}" ;;
  "push origin "*) exit "\${PUSH_RC:-0}" ;;
  "fetch origin --prune") exit 0 ;;
  "worktree list --porcelain") printf '%b' "\${WORKTREES:-}" ;;
  "-C "*" status --porcelain") printf '%b' "\${DIRTY:-}" ;;
  "-C "*" merge --ff-only "*) exit "\${FF_RC:-0}" ;;
  "fetch origin main:main") exit "\${FETCHMAIN_RC:-0}" ;;
  *) exit 1 ;;
esac
`;
const FAKE_NODE = `#!/usr/bin/env bash
echo "node $*" >> "$FAKE_DIR/calls"
case "$1" in
  */delivery-route.mjs) [ -n "\${ROUTE_RC:-}" ] && exit "$ROUTE_RC"; echo artifacts; exit 0 ;;
esac
case "\${2:-}" in
  result) [ -n "\${RESULT_RC:-}" ] && exit "$RESULT_RC"; echo "\${RUN_RESULT-SUCCESS}" ;;
  live)
    echo "wait=\${LIVE_LOOK_WAIT_SECONDS:-}" >> "$FAKE_DIR/calls"
    [ -n "\${LIVE_RC:-}" ] && exit "$LIVE_RC"
    echo "\${RUN_LIVE-${LIVE}}" ;;
  *) exit 1 ;;
esac
`;
const FAKE_GH = `#!/usr/bin/env bash
echo "gh $*" >> "$FAKE_DIR/calls"
exit 1
`;
const MAIN_OUT = 'worktree /work/primary\\nHEAD abc\\nbranch refs/heads/main\\n\\nworktree /work/feature\\nHEAD def\\nbranch refs/heads/feature\\n';

function run(t, env = {}, { entry = script, args = [] } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'wong-test-ship-publish-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(path.join(dir, 'bin'));
  for (const [name, body] of [['git', FAKE_GIT], ['node', FAKE_NODE], ['gh', FAKE_GH]]) {
    writeFileSync(path.join(dir, 'bin', name), body);
    chmodSync(path.join(dir, 'bin', name), 0o755);
  }
  writeFileSync(path.join(dir, 'calls'), '');
  const vars = { ...process.env, PATH: `${path.join(dir, 'bin')}:${process.env.PATH}`, FAKE_DIR: dir, WORKTREES: MAIN_OUT, ...env };
  for (const key of ['PUBLISH_WAIT_SECONDS', 'LIVE_LOOK_WAIT_SECONDS']) if (!(key in env)) delete vars[key];
  const result = spawnSync('bash', [entry, ...args], { encoding: 'utf8', env: vars });
  const calls = readFileSync(path.join(dir, 'calls'), 'utf8');
  return { ...result, calls, pushes: calls.split('\n').filter(line => line.startsWith('git push ')) };
}

const TO_MAIN = `git push origin ${COMMIT}:refs/heads/main`;

test('a clean publish moves main forward by one commit, without force, and reports what went live', t => {
  const r = run(t);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^merged=yes$/m);
  assert.match(r.stdout, new RegExp(`^commit=${COMMIT}$`, 'm'));
  assert.match(r.stdout, /^main=SUCCESS$/m);
  assert.match(r.stdout, new RegExp(`^live=${LIVE.replaceAll('.', '\\.')}$`, 'm'));
  assert.match(r.stdout, /^branch=deleted$/m);
  assert.match(r.stdout, /^synced=\/work\/primary$/m);
  assert.match(r.calls, new RegExp(`^git commit-tree ${TREE} -p origin/main -m feat: add recipes$`, 'm'));
  assert.deepEqual(r.pushes, [TO_MAIN, 'git push origin --delete feature']);
  assert.doesNotMatch(r.calls, /--force|\s-f\s|\s\+\S/, 'nothing may be forced');
  assert.match(r.calls, /^git -C \/work\/primary merge --ff-only origin\/main$/m);
  assert.match(r.calls, new RegExp(`^node .+/save/scripts/artifacts-run\\.mjs result ${HEAD} refs/heads/feature$`, 'm'));
  assert.match(r.calls, new RegExp(`^node .+/save/scripts/artifacts-run\\.mjs live ${COMMIT}$`, 'm'), 'main\'s run is read for the new commit');
  const at = text => r.calls.indexOf(text);
  assert.ok(at('git fetch origin main feature') > -1 && at('git fetch origin main feature') < at(' result '), 'main is fetched before the gate is read');
  assert.ok(at(' result ') < at(TO_MAIN) && at(TO_MAIN) < at(' live ') && at(' live ') < at('git push origin --delete'), 'gate, push, main\'s run, then the delete');
  assert.ok(Number(/^wait=(\d+)$/m.exec(r.calls)?.[1]) >= 30 * 60, 'the wait for main\'s run must cover a whole run');
});

test('a given subject names the publish commit', t => {
  const r = run(t, {}, { args: ['Add recipes (v1.2.0)'] });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.calls, new RegExp(`^git commit-tree ${TREE} -p origin/main -m Add recipes \\(v1\\.2\\.0\\)$`, 'm'));
  assert.doesNotMatch(r.calls, /git log/);
});

test("with no subject, main's commit is named for the change's first commit, and for the version it ships", t => {
  const named = env => new RegExp(`^git commit-tree ${TREE} -p origin/main -m (.*)$`, 'm').exec(run(t, env).calls)?.[1];
  assert.equal(named({}), 'feat: add recipes', 'the last commit on the branch, often the archive, named the publish');
  assert.equal(named({ HEAD_VERSION: '1.3.0', MAIN_VERSION: '1.2.0' }), 'feat: add recipes (v1.3.0)');
  assert.equal(named({ HEAD_VERSION: '1.2.0', MAIN_VERSION: '1.2.0' }), 'feat: add recipes', 'an unchanged version is not a release');
  assert.equal(named({ FIRST_SUBJECT: 'feat: add recipes (v1.2.9)', HEAD_VERSION: '1.3.0', MAIN_VERSION: '1.2.0' }), 'feat: add recipes (v1.3.0)', 'a stale version in the subject is replaced');
  assert.equal(named({ FIRST_SUBJECT: '' }), 'Archive the plan', 'with no first subject the last commit names it');
});

test('a main that moved past the branch is never overwritten: nothing is published or deleted', t => {
  const behind = run(t, { ANCESTOR_RC: '1' });
  assert.equal(behind.status, 1);
  assert.equal(behind.stdout, 'merged=no\nmoved=yes\n');
  assert.deepEqual(behind.pushes, []);
  assert.doesNotMatch(behind.calls, /commit-tree/);
  const refused = run(t, { PUSH_RC: '1', MAIN_MOVED: '1' });
  assert.equal(refused.status, 1);
  assert.equal(refused.stdout, 'merged=no\nmoved=yes\n');
  assert.match(refused.stderr, /push to main was refused/);
  assert.deepEqual(refused.pushes, [TO_MAIN], 'a refused push is not tried again, and the branch is kept');
  assert.doesNotMatch(refused.calls, / live /);
});

test('a push that fails while main stood still is not reported as a moved main', t => {
  for (const [env, why] of [[{ PUSH_RC: '1' }, /main did not move/], [{ PUSH_RC: '1', REFETCH_RC: '1' }, /main could not be read/]]) {
    const r = run(t, env);
    assert.equal(r.status, 1);
    assert.equal(r.stdout, 'merged=no\n');
    assert.match(r.stderr, why);
    assert.deepEqual(r.pushes, [TO_MAIN], 'a failed push is not tried again');
    assert.doesNotMatch(r.calls, / live /);
  }
});

test('a red main run is reported, and nothing is pushed again to make it pass', t => {
  const r = run(t, { RUN_LIVE: 'failed' });
  assert.equal(r.status, 3);
  assert.match(r.stdout, /^merged=yes$/m);
  assert.match(r.stdout, /^main=FAILURE$/m);
  assert.doesNotMatch(r.stdout, /^live=/m);
  assert.match(r.stderr, /production keeps the last passing commit/);
  assert.deepEqual(r.pushes.filter(push => push.includes('refs/heads/main')), [TO_MAIN]);
});

test('a main run that was cut off is reported as interrupted with the restart, never as failed, and nothing is pushed again', t => {
  const r = run(t, { RUN_LIVE: 'interrupted' });
  assert.equal(r.status, 3);
  assert.match(r.stdout, /^merged=yes$/m);
  assert.match(r.stdout, /^main=INTERRUPTED$/m);
  assert.doesNotMatch(r.stdout, /^main=FAILURE$|^live=/m);
  assert.match(r.stderr, new RegExp(`^error=main's check run was cut off, not failed; start it again: node \\.claude/skills/save/scripts/artifacts-run\\.mjs restart ${COMMIT} refs/heads/main$`, 'm'));
  assert.deepEqual(r.pushes.filter(push => push.includes('refs/heads/main')), [TO_MAIN]);
  assert.match(r.stdout, /^branch=deleted$/m, 'the change is on main, so its branch is done');
});

test('a branch whose own run was cut off is not published: only a checked commit is', t => {
  const r = run(t, { RUN_RESULT: 'INTERRUPTED' });
  assert.equal(r.status, 1);
  assert.equal(r.stdout, 'merged=no\n');
  assert.match(r.stderr, /this commit's checks are INTERRUPTED; only a checked commit is published/);
  assert.deepEqual(r.pushes, []);
});

test('an unreadable main run stops the publish as unverified, never as passed', t => {
  for (const env of [{ RUN_LIVE: 'unknown' }, { LIVE_RC: '1' }, { RUN_LIVE: '' }, { RUN_LIVE: 'http://demo.example.workers.dev' }]) {
    const r = run(t, env);
    assert.equal(r.status, 3, JSON.stringify(env));
    assert.match(r.stdout, /^merged=yes$/m);
    assert.match(r.stdout, /^main=UNKNOWN$/m);
    assert.doesNotMatch(r.stdout, /^live=/m);
    assert.match(r.stderr, /unverified/);
  }
});

test('a main run that deployed nothing is a pass with no live address', t => {
  const r = run(t, { RUN_LIVE: 'none' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^main=SUCCESS$/m);
  assert.doesNotMatch(r.stdout, /^live=/m);
});

test('the gate is read strictly: only SUCCESS or NONE for the exact head is published', t => {
  for (const env of [{ RUN_RESULT: 'FAILURE' }, { RUN_RESULT: 'UNKNOWN' }, { RUN_RESULT: 'TIMEOUT' }, { RUN_RESULT: 'PENDING' }, { RUN_RESULT: 'success' }, { RUN_RESULT: '' }, { RESULT_RC: '1' }]) {
    const r = run(t, env);
    assert.equal(r.status, 1, JSON.stringify(env));
    assert.equal(r.stdout, 'merged=no\n', JSON.stringify(env));
    assert.match(r.stderr, /only a checked commit is published/);
    assert.deepEqual(r.pushes, []);
    assert.doesNotMatch(r.calls, /commit-tree/);
  }
  for (const word of ['SUCCESS', 'NONE']) {
    const r = run(t, { RUN_RESULT: word });
    assert.equal(r.status, 0, `${word}: ${r.stderr}`);
    assert.match(r.stdout, /^merged=yes$/m);
  }
});

test('a HEAD that is not the saved commit is refused before its checks are read', t => {
  const ahead = run(t, { SAVED_SHA: 'd'.repeat(40) });
  assert.equal(ahead.status, 1);
  assert.equal(ahead.stdout, 'merged=no\n');
  assert.match(ahead.stderr, /not the commit that was saved/);
  assert.deepEqual(ahead.pushes, []);
  assert.doesNotMatch(ahead.calls, /^node /m);
  const unsaved = run(t, { SAVED_RC: '128' });
  assert.equal(unsaved.status, 1);
  assert.match(unsaved.stderr, /never saved/);
  assert.deepEqual(unsaved.pushes, []);
});

test('on main, or on no branch, there is nothing to publish', t => {
  for (const name of ['main', 'HEAD']) {
    const r = run(t, { BRANCH_NAME: name });
    assert.equal(r.status, 1, name);
    assert.equal(r.stdout, 'merged=no\n');
    assert.doesNotMatch(r.calls, /^(git fetch|git push|node) /m);
  }
});

test('a failed fetch stops before anything is compared or pushed', t => {
  const r = run(t, { FETCH_RC: '1' });
  assert.equal(r.status, 1);
  assert.equal(r.stdout, 'merged=no\n');
  assert.match(r.stderr, /git fetch failed/);
  assert.deepEqual(r.pushes, []);
});

test('a failed branch delete after a good publish keeps the branch and exits 2', t => {
  const r = run(t, { DELETE_RC: '1' });
  assert.equal(r.status, 2);
  assert.match(r.stdout, /^merged=yes$/m);
  assert.match(r.stdout, /^main=SUCCESS$/m);
  assert.match(r.stdout, /^branch=kept$/m);
  assert.match(r.stdout, /^synced=\/work\/primary$/m);
  const red = run(t, { DELETE_RC: '1', RUN_LIVE: 'failed' });
  assert.equal(red.status, 3, 'a red main outranks a kept branch');
  assert.match(red.stdout, /^branch=kept$/m);
});

test('the sync never fails a publish: a dirty main checkout is skipped, and with none the main ref advances', t => {
  const dirty = run(t, { DIRTY: ' M notes.txt\\n' });
  assert.equal(dirty.status, 0, dirty.stderr);
  assert.match(dirty.stdout, /^synced=skipped \(\/work\/primary has uncommitted changes\)$/m);
  assert.doesNotMatch(dirty.calls, /merge --ff-only/);
  const none = run(t, { WORKTREES: 'worktree /work/feature\\nHEAD def\\nbranch refs/heads/feature\\n' });
  assert.equal(none.status, 0, none.stderr);
  assert.match(none.stdout, /^synced=ref$/m);
  assert.match(none.calls, /^git fetch origin main:main$/m);
});

// ---------------------------------------------------------------------------
// The hand-over from merge.sh

test('merge.sh tells the route and hands an Artifacts install over before its first gh call', () => {
  const code = readFileSync(merge, 'utf8').split('\n').filter(line => !line.trimStart().startsWith('#'));
  const first = pattern => code.findIndex(line => pattern.test(line));
  const route = first(/delivery-route\.mjs/);
  const check = first(/"\$ROUTE" = artifacts/);
  const handOver = first(/exec bash "\$HERE\/publish-artifacts\.sh"/);
  const gh = first(/(^|[\s(])gh\s/);
  assert.ok(route > -1 && check >= route && handOver >= check, 'the route is told, checked, and then handed over');
  assert.ok(gh > handOver, 'gh is asked something before the hand-over');
});

test('through merge.sh, an Artifacts install publishes without gh, and an untold route stops', t => {
  const r = run(t, {}, { entry: merge, args: ['Add recipes'] });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^merged=yes$/m);
  assert.match(r.stdout, new RegExp(`^commit=${COMMIT}$`, 'm'));
  assert.match(r.calls, /^git commit-tree .* -m Add recipes$/m, 'the subject is handed over too');
  assert.doesNotMatch(r.calls, /^gh /m);
  const untold = run(t, { ROUTE_RC: '1' }, { entry: merge });
  assert.equal(untold.status, 1);
  assert.equal(untold.stdout, 'merged=no\n');
  assert.match(untold.stderr, /delivery route could not be told/);
  assert.doesNotMatch(untold.calls, /^(gh|git) /m);
});
