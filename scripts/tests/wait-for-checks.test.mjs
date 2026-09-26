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
// output, and stderr for each call. A fake git gives HEAD and the repo root.
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
    [ "$3" = "--help" ] && { echo "  --json fields"; exit 0; }
    [ -n "\${CHECKS_ERR:-}" ] && echo "$CHECKS_ERR" >&2
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

function run(t, { env = {}, workflows = true } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'wait-checks-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(path.join(dir, 'bin'));
  mkdirSync(path.join(dir, 'repo/.github/workflows'), { recursive: true });
  if (workflows) writeFileSync(path.join(dir, 'repo/.github/workflows/test.yml'), 'on: push\n');
  for (const [name, body] of [['gh', FAKE_GH], ['git', FAKE_GIT]]) {
    writeFileSync(path.join(dir, 'bin', name), body);
    chmodSync(path.join(dir, 'bin', name), 0o755);
  }
  writeFileSync(path.join(dir, 'calls'), '');
  const result = spawnSync('bash', [script, '1'], {
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
  const { out, calls } = run(t, { env: { CHECKS_ERR: 'no checks reported on the branch' } });
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
