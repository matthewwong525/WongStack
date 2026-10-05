import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const script = new URL('../../.agents/skills/ship/scripts/live-look.sh', import.meta.url).pathname;
const SHA = 'c'.repeat(40);
const LIVE = 'https://demo.example.workers.dev';

// Fake gh answers from env what the real one prints after its --jq filter, and fake curl answers
// "<status><TAB><redirect>". Both log their calls.
const FAKE_GH = `#!/usr/bin/env bash
echo "gh $*" >> "$FAKE_DIR/calls"
case "$1 $2" in
  "repo view") echo o/r ;;
  "api repos/o/r/deployments?"*) printf '%b' "\${DEPLOYMENTS:-}" ;;
  "api repos/o/r/deployments/"*) printf '%b' "\${STATUSES:-}" ;;
  "run list") printf '%b' "\${RUN:-}" ;;
  "run view") printf '%b' "\${DEPLOY_STEP:-}" ;;
esac
`;
const FAKE_CURL = `#!/usr/bin/env bash
echo "curl $*" >> "$FAKE_DIR/calls"
[ -n "\${CURL_RC:-}" ] && exit "$CURL_RC"
printf '%b' "\${CURL_ANSWER:-200\\t}"
`;

function look(t, env = {}, { workflow = true } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'wong-test-live-look-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(path.join(dir, 'bin'));
  for (const [name, body] of [['gh', FAKE_GH], ['curl', FAKE_CURL]]) {
    writeFileSync(path.join(dir, 'bin', name), body);
    chmodSync(path.join(dir, 'bin', name), 0o755);
  }
  const work = path.join(dir, 'work');
  mkdirSync(path.join(work, '.github/workflows'), { recursive: true });
  if (workflow) writeFileSync(path.join(work, '.github/workflows/deploy.yml'), 'name: Deploy\n');
  execFileSync('git', ['init', '-q'], { cwd: work });
  const vars = { ...process.env, PATH: `${path.join(dir, 'bin')}:${process.env.PATH}`, FAKE_DIR: dir, LIVE_LOOK_WAIT_SECONDS: '0', LIVE_LOOK_POLL_SECONDS: '0', ...env };
  for (const key of ['CF_ACCESS_CLIENT_ID', 'CF_ACCESS_CLIENT_SECRET']) if (!(key in env)) delete vars[key];
  const result = spawnSync('bash', [script, SHA], { cwd: work, env: vars, encoding: 'utf8' });
  const calls = existsSync(path.join(dir, 'calls')) ? readFileSync(path.join(dir, 'calls'), 'utf8').split('\n').filter(Boolean) : [];
  assert.equal(result.status, 0, 'a look is never a failed ship');
  return { out: result.stdout, calls, gets: calls.filter(call => call.startsWith('curl ')) };
}

const RELEASED = { DEPLOYMENTS: '11\n', STATUSES: `success\\t${LIVE}\n` };

test('a landed release whose app opens is ok, after one look-only request', t => {
  const { out, gets } = look(t, RELEASED);
  assert.equal(out, `LIVE_LOOK=ok\nREASON=the release landed and the live app opens\nURL=${LIVE}\n`);
  assert.equal(gets.length, 1);
  assert.ok(gets[0].endsWith(` ${LIVE}`));
  assert.doesNotMatch(gets[0], /-X|--data|-d |-L|CF-Access/, 'the look wrote, followed a redirect, or sent a token it does not have');
});

test('a failed release is failed, from its record or from its deploy run, and nothing is opened', t => {
  const recorded = look(t, { DEPLOYMENTS: '11\n', STATUSES: 'failure\\t\n' });
  assert.match(recorded.out, /^LIVE_LOOK=failed\nREASON=the release did not finish: its deploy failed\n$/);
  const run = look(t, { RUN: '7\\tcompleted\\tfailure\n' });
  assert.match(run.out, /^LIVE_LOOK=failed\nREASON=the release did not finish: its deploy run failed\n$/);
  assert.deepEqual([...recorded.gets, ...run.gets], []);
});

test('an error answer from the live app is failed', t => {
  assert.match(look(t, { ...RELEASED, CURL_ANSWER: '500\\t' }).out, /^LIVE_LOOK=failed\nREASON=the live app answered with an error \(HTTP 500\)\nURL=/);
  assert.match(look(t, { ...RELEASED, CURL_RC: '28' }).out, /^LIVE_LOOK=failed\nREASON=the live app did not answer\n/);
});

test('a login redirect with no token is unknown; with a token, the token goes to the live address', t => {
  const login = '302\\thttps://team.cloudflareaccess.com/cdn-cgi/access/login/demo\n';
  assert.match(look(t, { ...RELEASED, CURL_ANSWER: login }).out, /^LIVE_LOOK=unknown\nREASON=.*behind a login and this machine has no access token\n/);
  assert.match(look(t, { ...RELEASED, CURL_ANSWER: '403\\t' }).out, /^LIVE_LOOK=unknown\n/);
  const signedIn = look(t, { ...RELEASED, CF_ACCESS_CLIENT_ID: 'id.access', CF_ACCESS_CLIENT_SECRET: 'shh-secret' });
  assert.match(signedIn.out, /^LIVE_LOOK=ok\n/);
  assert.match(signedIn.gets[0], /CF-Access-Client-Id: id\.access/);
  assert.doesNotMatch(signedIn.out, /shh-secret/);
});

test('a merge that released nothing is unknown, and so is a repo with no release to wait for', t => {
  const docs = look(t, { RUN: '7\\tcompleted\\tsuccess\n', DEPLOY_STEP: 'skipped\n' });
  assert.equal(docs.out, 'LIVE_LOOK=unknown\nREASON=nothing was released\n');
  const unaddressed = look(t, { RUN: '7\\tcompleted\\tsuccess\n', DEPLOY_STEP: 'success\n' });
  assert.equal(unaddressed.out, 'LIVE_LOOK=unknown\nREASON=the release landed, but no live address was recorded\n');
  const bare = look(t, {}, { workflow: false });
  assert.equal(bare.out, 'LIVE_LOOK=unknown\nREASON=this repo records no release to wait for\n');
  assert.deepEqual([...docs.gets, ...unaddressed.gets, ...bare.calls], []);
});

test('a release that has not landed when the wait runs out is unknown', t => {
  const { out, gets } = look(t, { RUN: '7\\tin_progress\\t\n' });
  assert.equal(out, 'LIVE_LOOK=unknown\nREASON=the release had not landed after 0 minutes\n');
  assert.deepEqual(gets, []);
});

// ---------------------------------------------------------------------------
// An Artifacts install: main's check run is the release, and gh is never asked

// A fake node answers the two calls that tell the route and read main's run for the commit
// (RUN_LIVE is the word `artifacts-run.mjs live` prints), and hands every other call, which reads
// .env and the memory store, to the real node.
const FAKE_NODE = `#!/usr/bin/env bash
case "$1" in
  */delivery-route.mjs)
    echo "node delivery-route" >> "$FAKE_DIR/calls"
    [ -n "\${ROUTE_RC:-}" ] && exit "$ROUTE_RC"
    echo artifacts ;;
  */artifacts-run.mjs)
    echo "node artifacts-run \${*:2}" >> "$FAKE_DIR/calls"
    [ -n "\${LIVE_RC:-}" ] && exit "$LIVE_RC"
    echo "\${RUN_LIVE-unknown}" ;;
  *) exec "$REAL_NODE" "$@" ;;
esac
`;

// The same look, in a repo with no deploy workflow: an Artifacts install has none.
function lookArtifacts(t, env = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'wong-test-live-look-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(path.join(dir, 'bin'));
  for (const [name, body] of [['gh', FAKE_GH], ['curl', FAKE_CURL], ['node', FAKE_NODE]]) {
    writeFileSync(path.join(dir, 'bin', name), body);
    chmodSync(path.join(dir, 'bin', name), 0o755);
  }
  const work = path.join(dir, 'work');
  mkdirSync(work);
  execFileSync('git', ['init', '-q'], { cwd: work });
  const vars = { ...process.env, PATH: `${path.join(dir, 'bin')}:${process.env.PATH}`, FAKE_DIR: dir, REAL_NODE: process.execPath, LIVE_LOOK_WAIT_SECONDS: '0', LIVE_LOOK_POLL_SECONDS: '0', ...env };
  for (const key of ['CF_ACCESS_CLIENT_ID', 'CF_ACCESS_CLIENT_SECRET']) delete vars[key];
  const result = spawnSync('bash', [script, SHA], { cwd: work, env: vars, encoding: 'utf8' });
  const calls = existsSync(path.join(dir, 'calls')) ? readFileSync(path.join(dir, 'calls'), 'utf8').split('\n').filter(Boolean) : [];
  assert.equal(result.status, 0, 'a look is never a failed ship');
  return { out: result.stdout, calls, asked: calls.filter(call => /^(gh|curl) /.test(call)) };
}

test('on an Artifacts install, a landed release whose app opens is ok, and gh is never asked', t => {
  const { out, calls, asked } = lookArtifacts(t, { RUN_LIVE: LIVE });
  assert.equal(out, `LIVE_LOOK=ok\nREASON=the release landed and the live app opens\nURL=${LIVE}\n`);
  assert.ok(calls.includes(`node artifacts-run live ${SHA}`), 'the look reads main\'s run for the merged commit');
  assert.equal(asked.length, 1, 'one look-only request, and no gh call');
  assert.ok(asked[0].startsWith('curl ') && asked[0].endsWith(` ${LIVE}`));
  assert.doesNotMatch(asked[0], /-X|--data|-d |-L|CF-Access/);
});

test('on an Artifacts install, a failed main run is a failed release, and nothing is opened', t => {
  const red = lookArtifacts(t, { RUN_LIVE: 'failed' });
  assert.equal(red.out, 'LIVE_LOOK=failed\nREASON=the release did not finish: its checks or deploy failed\n');
  assert.deepEqual(red.asked, []);
  const broken = lookArtifacts(t, { RUN_LIVE: LIVE, CURL_ANSWER: '500\\t' });
  assert.equal(broken.out, `LIVE_LOOK=failed\nREASON=the live app answered with an error (HTTP 500)\nURL=${LIVE}\n`);
});

test('on an Artifacts install, a run that released nothing or can not be read is unknown', t => {
  const none = lookArtifacts(t, { RUN_LIVE: 'none' });
  assert.equal(none.out, 'LIVE_LOOK=unknown\nREASON=nothing was released\n');
  assert.deepEqual(none.asked, []);
  for (const env of [{ RUN_LIVE: 'unknown' }, { RUN_LIVE: '' }, { LIVE_RC: '1' }, { RUN_LIVE: 'http://demo.example.workers.dev' }]) {
    const unread = lookArtifacts(t, env);
    assert.equal(unread.out, 'LIVE_LOOK=unknown\nREASON=the release could not be read\n', JSON.stringify(env));
    assert.deepEqual(unread.asked, [], JSON.stringify(env));
  }
});

test('a route that can not be told is unknown, before anything else is asked', t => {
  const { out, calls } = lookArtifacts(t, { ROUTE_RC: '1' });
  assert.equal(out, 'LIVE_LOOK=unknown\nREASON=the delivery route could not be told\n');
  assert.deepEqual(calls, ['node delivery-route']);
});
