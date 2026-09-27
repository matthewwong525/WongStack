import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const script = new URL('../../.agents/skills/ship/scripts/merge.sh', import.meta.url).pathname;

// Fake gh and git answer from env and log every call, so a test can check both
// the outcome and the order of the calls.
const FAKE_GH = `#!/usr/bin/env bash
echo "gh $*" >> "$FAKE_DIR/calls"
case "$1 $2" in
  "repo view") echo "\${DEFAULT_BRANCH-main}" ;;
  "pr merge") exit "\${MERGE_RC:-0}" ;;
  "pr view")
    case "$*" in
      *state*) echo "\${STATE:-MERGED}" ;;
      *) echo "pr=7 url=https://github.com/o/r/pull/7" ;;
    esac ;;
  "pr list") [ -n "\${LIST_RC:-}" ] && exit "$LIST_RC"; printf '%b' "\${STACKED:-}" ;;
  "api -X") exit "\${PATCH_RC:-0}" ;;
esac
`;
const FAKE_GIT = `#!/usr/bin/env bash
echo "git $*" >> "$FAKE_DIR/calls"
case "$*" in
  "rev-parse --abbrev-ref HEAD") echo "\${BRANCH_NAME:-feature}" ;;
  "rev-parse HEAD") echo "${'c'.repeat(40)}" ;;
  "ls-remote --exit-code --heads origin "*)
    n=$(grep -c '^git ls-remote' "$FAKE_DIR/calls")
    IFS=, read -ra rcs <<< "\${LSREMOTE_RC:-0}"
    exit "\${rcs[$(( n <= \${#rcs[@]} ? n - 1 : \${#rcs[@]} - 1 ))]}" ;;
  "push origin --delete "*) exit "\${PUSH_RC:-0}" ;;
  "fetch origin --prune") exit 0 ;;
  "worktree list --porcelain") printf '%b' "\${WORKTREES:-}" ;;
  "-C "*" status --porcelain") printf '%b' "\${DIRTY:-}" ;;
  "-C "*" merge --ff-only "*) exit "\${FF_RC:-0}" ;;
  "fetch origin main:main") exit "\${FETCHMAIN_RC:-0}" ;;
  *) exit 1 ;;
esac
`;
const MAIN_OUT = 'worktree /work/primary\\nHEAD abc\\nbranch refs/heads/main\\n\\nworktree /work/feature\\nHEAD def\\nbranch refs/heads/feature\\n';

function run(t, env = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'ship-merge-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(path.join(dir, 'bin'));
  for (const [name, body] of [['gh', FAKE_GH], ['git', FAKE_GIT]]) {
    writeFileSync(path.join(dir, 'bin', name), body);
    chmodSync(path.join(dir, 'bin', name), 0o755);
  }
  writeFileSync(path.join(dir, 'calls'), '');
  const result = spawnSync('bash', [script], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${path.join(dir, 'bin')}:${process.env.PATH}`, FAKE_DIR: dir, WORKTREES: MAIN_OUT, ...env },
  });
  return { ...result, calls: readFileSync(path.join(dir, 'calls'), 'utf8') };
}

test('a clean merge deletes the branch and fast-forwards the main checkout', t => {
  const r = run(t);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^merged=yes$/m);
  assert.match(r.stdout, /^pr=7 url=/m);
  assert.match(r.stdout, /^branch=deleted$/m);
  assert.match(r.stdout, /^synced=\/work\/primary$/m);
  assert.match(r.calls, /gh pr merge --squash --match-head-commit c{40}/);
  assert.doesNotMatch(r.calls, /--delete-branch/);
});

test('a refused merge deletes nothing', t => {
  const r = run(t, { MERGE_RC: '1' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^merged=no$/m);
  assert.doesNotMatch(r.calls, /push origin --delete|pr list/);
});

test('on the default branch it refuses before any merge call', t => {
  const r = run(t, { BRANCH_NAME: 'main' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^merged=no$/m);
  assert.match(r.stderr, /on the default branch/);
  assert.doesNotMatch(r.calls, /pr merge|push origin --delete/);
});

test('a PR that is not MERGED stops before any cleanup', t => {
  const r = run(t, { STATE: 'OPEN' });
  assert.equal(r.status, 1);
  assert.doesNotMatch(r.calls, /push origin --delete/);
});

test('stacked PRs are retargeted before the branch is deleted', t => {
  const r = run(t, { STACKED: '12\\n15\\n' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^retargeted=12 15$/m);
  const patch = r.calls.lastIndexOf('gh api -X PATCH');
  const del = r.calls.indexOf('git push origin --delete');
  assert.ok(patch > -1 && del > patch, 'retarget must come before the delete');
});

test('a failed retarget keeps the branch', t => {
  const r = run(t, { STACKED: '12\\n', PATCH_RC: '1' });
  assert.equal(r.status, 2);
  assert.match(r.stdout, /^merged=yes$/m);
  assert.match(r.stdout, /^branch=kept$/m);
  assert.doesNotMatch(r.calls, /push origin --delete/);
});

test('a branch GitHub deleted at merge is not an error', t => {
  const r = run(t, { LSREMOTE_RC: '2' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^branch=deleted-at-merge$/m);
  assert.doesNotMatch(r.calls, /push origin --delete/);
});

test('a failed ls-remote keeps the branch and says so', t => {
  const r = run(t, { LSREMOTE_RC: '128' });
  assert.equal(r.status, 2);
  assert.match(r.stdout, /^branch=kept$/m);
});

test('a dirty main checkout is skipped, not failed', t => {
  const r = run(t, { DIRTY: ' M notes.txt\\n' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^synced=skipped \(\/work\/primary has uncommitted changes\)$/m);
  assert.doesNotMatch(r.calls, /merge --ff-only/);
});

test('with no checkout on main, the main ref advances in place', t => {
  const r = run(t, { WORKTREES: 'worktree /work/feature\\nHEAD def\\nbranch refs/heads/feature\\n' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^synced=ref$/m);
  assert.match(r.calls, /git fetch origin main:main/);
});

test('a diverged local main is skipped in one line', t => {
  const r = run(t, { WORKTREES: 'worktree /work/feature\\nbranch refs/heads/feature\\n', FETCHMAIN_RC: '1' });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^synced=skipped \(local main could not fast-forward\)$/m);
});

test('a failed list of stacked PRs keeps the branch', t => {
  const r = run(t, { LIST_RC: '1' });
  assert.equal(r.status, 2);
  assert.match(r.stdout, /^branch=kept$/m);
  assert.match(r.stderr, /could not list the PRs/);
  assert.doesNotMatch(r.calls, /push origin --delete/);
});

test('a delete that loses the race to GitHub counts as deleted at merge', t => {
  const r = run(t, { LSREMOTE_RC: '0,2', PUSH_RC: '1' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^branch=deleted-at-merge$/m);
  assert.match(r.stdout, /^synced=\/work\/primary$/m);
});

test('a delete that fails while the branch still exists keeps it', t => {
  const r = run(t, { PUSH_RC: '1' });
  assert.equal(r.status, 2);
  assert.match(r.stdout, /^branch=kept$/m);
});
