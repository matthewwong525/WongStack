import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const script = new URL('../../.agents/skills/save/scripts/wait-for-checks.sh', import.meta.url).pathname;
const NEW = 'b'.repeat(40);
const OLD = 'a'.repeat(40);

// A fake gh answers from env: PR heads in order (the last repeats), the checks
// output, and stderr for each call. NO_JSON makes it an older gh without
// --json. A fake git gives HEAD and the repo root.
const FAKE_GH = `#!/usr/bin/env bash
echo "$*" >> "$FAKE_DIR/calls"
case "$1 $2" in
  "pr view")
    [ -n "\${VIEW_ERR:-}" ] && { echo "$VIEW_ERR" >&2; exit 4; }
    n=$(grep -c '^pr view' "$FAKE_DIR/calls")
    IFS=, read -ra heads <<< "$HEADS"
    i=$(( n <= \${#heads[@]} ? n - 1 : \${#heads[@]} - 1 ))
    echo "\${heads[$i]}" ;;
  "pr checks")
    [ "$3" = "--help" ] && { [ -n "\${NO_JSON:-}" ] || echo "  --json fields"; exit 0; }
    [ -n "\${NO_JSON:-}" ] && [ "$3" = "--json" ] && { echo "unknown flag: --json" >&2; exit 1; }
    [ -n "\${CHECKS_ERR:-}" ] && echo "$CHECKS_ERR" >&2
    if [ -n "\${CHECKS_SEQ:-}" ]; then
      n=$(grep -c '^pr checks --json' "$FAKE_DIR/calls")
      IFS='|' read -ra seq <<< "$CHECKS_SEQ"
      i=$(( n <= \${#seq[@]} ? n - 1 : \${#seq[@]} - 1 ))
      printf '%b\\n' "\${seq[$i]}"
    fi
    [ -n "\${CHECKS:-}" ] && printf '%b\\n' "$CHECKS"
    exit 0 ;;
esac
`;
const FAKE_GIT = `#!/usr/bin/env bash
case "$*" in
  "rev-parse HEAD") echo "$LOCAL" ;;
  "rev-parse --show-toplevel") echo "$FAKE_DIR/repo" ;;
  *) exit 1 ;;
esac
`;

function run(t, { env = {}, workflows = true, minutes = '1' } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'wong-test-wait-checks-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(path.join(dir, 'bin'));
  mkdirSync(path.join(dir, 'repo/.github/workflows'), { recursive: true });
  if (workflows) writeFileSync(path.join(dir, 'repo/.github/workflows/test.yml'), 'on: push\n');
  for (const [name, body] of [['gh', FAKE_GH], ['git', FAKE_GIT]]) {
    writeFileSync(path.join(dir, 'bin', name), body);
    chmodSync(path.join(dir, 'bin', name), 0o755);
  }
  writeFileSync(path.join(dir, 'calls'), '');
  const result = spawnSync('bash', [script, minutes], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${path.join(dir, 'bin')}:${process.env.PATH}`,
      FAKE_DIR: dir,
      LOCAL: NEW,
      HEADS: NEW,
      WAIT_FOR_CHECKS_GRACE: '1',
      WAIT_FOR_CHECKS_INTERVAL: '0.2',
      ...env,
    },
  });
  assert.equal(result.status, 0, result.stderr);
  return { out: result.stdout, calls: readFileSync(path.join(dir, 'calls'), 'utf8') };
}

const PASS = 'pass\\tunit\\thttps://ci/1';

test('a stale PR head never reports the old commit green', t => {
  const { out, calls } = run(t, { env: { HEADS: OLD, CHECKS: PASS } });
  assert.match(out, /RESULT: UNKNOWN/);
  assert.match(out, /not local HEAD/);
  assert.doesNotMatch(calls, /pr checks --json/);
});

test('the wait resumes once the PR head reaches local HEAD', t => {
  const { out } = run(t, { env: { HEADS: `${OLD},${NEW}`, CHECKS: PASS } });
  assert.match(out, /RESULT: SUCCESS/);
});

test('no checks with workflow files is UNKNOWN after the grace period', t => {
  // The deadline counts whole seconds, so a grace of 1 can leave under a second: time for one poll under load.
  const { out, calls } = run(t, { env: { CHECKS_ERR: 'no checks reported on the branch', WAIT_FOR_CHECKS_GRACE: '3' } });
  assert.match(out, /RESULT: UNKNOWN/);
  assert.match(out, /workflow files/);
  assert.ok(calls.split('\n').filter(line => line.startsWith('pr checks --json')).length > 1, 'polls during the grace period');
});

test('no checks and no workflow files is NONE at once', t => {
  const { out } = run(t, { workflows: false, env: { CHECKS_ERR: 'no checks reported on the branch' } });
  assert.match(out, /RESULT: NONE/);
});

test('an auth failure is UNKNOWN with gh\'s message', t => {
  const { out } = run(t, { env: { VIEW_ERR: 'To get started with GitHub CLI, please run:  gh auth login' } });
  assert.match(out, /RESULT: UNKNOWN/);
  assert.match(out, /gh auth login/);
});

test('passing checks on local HEAD are SUCCESS', t => {
  const { out } = run(t, { env: { CHECKS: `${PASS}\\nskipping\\tlint\\thttps://ci/2` } });
  assert.match(out, /RESULT: SUCCESS/);
});

test('a failed check is FAILURE and names it', t => {
  const { out } = run(t, { env: { CHECKS: `${PASS}\\nfail\\te2e\\thttps://ci/2` } });
  assert.match(out, /RESULT: FAILURE/);
  assert.match(out, /- e2e {2}https:\/\/ci\/2/);
  assert.doesNotMatch(out, /- unit/);
});

test('a cancelled check is FAILURE', t => {
  const { out } = run(t, { env: { CHECKS: `${PASS}\\ncancel\\te2e\\thttps://ci/2` } });
  assert.match(out, /RESULT: FAILURE/);
  assert.match(out, /- e2e/);
});

test('checks that never finish are TIMEOUT with the pending names', t => {
  const { out } = run(t, { minutes: '0', env: { CHECKS: `${PASS}\\npending\\te2e\\thttps://ci/2` } });
  assert.match(out, /RESULT: TIMEOUT/);
  assert.match(out, /- e2e \(still running\)/);
});

test('a gh without --json falls back to plain text', t => {
  const { out, calls } = run(t, { env: { NO_JSON: '1', CHECKS: 'unit\\tpass\\t1m\\thttps://ci/1\\ne2e\\tfail\\t2m\\thttps://ci/2' } });
  assert.match(out, /RESULT: FAILURE/);
  assert.match(out, /- e2e {2}https:\/\/ci\/2/);
  assert.doesNotMatch(calls, /pr checks --json/);
});

const SKIPPED = 'skipping\\tunit (pull_request)\\thttps://ci/0';
const polls = calls => calls.split('\n').filter(line => line.startsWith('pr checks --json')).length;

test('a pass is reported only when two polls agree', t => {
  const { out, calls } = run(t, { env: { CHECKS: PASS } });
  assert.match(out, /RESULT: SUCCESS/);
  assert.equal(polls(calls), 2);
});

test('only skipped checks are not a pass while the real run may still register', t => {
  const { out, calls } = run(t, { env: { WAIT_FOR_CHECKS_GRACE: '30', CHECKS_SEQ: [SKIPPED, SKIPPED, `${SKIPPED}\\npending\\tunit\\thttps://ci/1`, `${SKIPPED}\\nfail\\tunit\\thttps://ci/1`].join('|') } });
  assert.match(out, /RESULT: FAILURE/);
  assert.match(out, /unit {2}https:\/\/ci\/1/);
  assert.equal(polls(calls), 4);
});

test('a check that appears after the others finished is waited for', t => {
  const { out, calls } = run(t, { env: { CHECKS_SEQ: [PASS, `${PASS}\\npending\\tdeploy\\thttps://ci/2`, `${PASS}\\npass\\tdeploy\\thttps://ci/2`].join('|') } });
  assert.match(out, /RESULT: SUCCESS/);
  assert.equal(polls(calls), 4);
});

test('a repo whose checks all skip passes once the grace period ends', t => {
  const { out } = run(t, { env: { CHECKS: SKIPPED } });
  assert.match(out, /RESULT: SUCCESS/);
});
