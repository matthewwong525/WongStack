import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { ARTIFACTS_HOST, delivery, originHost, routeOf, RouteError } from '../../.agents/skills/save/scripts/delivery-route.mjs';

const script = new URL('../../.agents/skills/save/scripts/delivery-route.mjs', import.meta.url).pathname;
const ACCOUNT = '0123456789abcdef'.repeat(2);
const HOST = `${ACCOUNT}.artifacts.cloudflare.net`;
const ARTIFACTS = `https://${HOST}/git/wongstack/recipe-box.git`;
const GITHUB = 'https://github.com/someone/recipe-box.git';
const DELIVERY = { route: 'artifacts', accountId: ACCOUNT, namespace: 'wongstack', repo: 'recipe-box', remote: ARTIFACTS, runner: 'recipe-box-checks', workflow: 'recipe-box-checks', bucket: 'recipe-box-checks' };
const RECORDED = { components: { delivery: DELIVERY } };
const NO_ROUTE = { components: { memory: { database: 'recipe-box-memory' } } };

// A throwaway checkout with an origin and an install record, each only when given. A record given
// as text is written as it is, so a test can leave a broken one.
function checkout(t, { origin, record } = {}) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wong-test-delivery-route-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q', '-b', 'main', dir]);
  if (origin) execFileSync('git', ['remote', 'add', 'origin', origin], { cwd: dir });
  if (record) {
    mkdirSync(join(dir, '.claude'));
    writeFileSync(join(dir, '.claude', '.wong-stack.json'), typeof record === 'string' ? record : JSON.stringify(record));
  }
  return dir;
}

const cli = (dir) => spawnSync(process.execPath, [script, dir], { encoding: 'utf8' });

// The route is refused in the library and by the process: exit 1, the reason on stderr, and no
// route on stdout for a verb to act on.
function refused(dir, reason) {
  assert.throws(() => delivery(dir), (error) => error instanceof RouteError && reason.test(error.message));
  const result = cli(dir);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /^delivery-route: /);
  assert.match(result.stderr, reason);
}

test('originHost reads https and scp-style addresses, and nothing from an empty or junk one', () => {
  assert.equal(originHost(GITHUB), 'github.com');
  assert.equal(originHost('git@github.com:someone/recipe-box.git'), 'github.com');
  assert.equal(originHost('ssh://git@github.com/someone/recipe-box.git'), 'github.com');
  assert.equal(originHost(`  ${ARTIFACTS}\n`), HOST);
  assert.equal(originHost('https://GitHub.com/someone/recipe-box.git'), 'github.com');
  for (const none of ['', '   ', null, undefined, 'not an address', '/srv/git/recipe-box.git', '../recipe-box']) {
    assert.equal(originHost(none), null, String(none));
  }
});

test('only an account id on the Cloudflare Git domain is an Artifacts host', () => {
  assert.equal(ARTIFACTS_HOST.exec(HOST)[1], ACCOUNT);
  for (const host of ['artifacts.cloudflare.net', 'short.artifacts.cloudflare.net',`${HOST}.example.com`, `x${HOST}`, 'github.com']) {
    assert.equal(ARTIFACTS_HOST.test(host), false, host);
  }
  // A lookalike origin is not Artifacts: github with no record, and refused under an artifacts record.
  const lookalike = `https://${HOST}.example.com/git/wongstack/recipe-box.git`;
  assert.equal(routeOf({ origin: lookalike, record: null }), 'github');
  assert.throws(() => routeOf({ origin: lookalike, record: RECORDED }), RouteError);
});

test('a GitHub origin with no install record is the github route', (t) => {
  const dir = checkout(t, { origin: GITHUB });
  assert.deepEqual(delivery(dir), { route: 'github', root: dir, delivery: null });
  assert.equal(routeOf({ origin: 'git@github.com:someone/recipe-box.git', record: NO_ROUTE }), 'github');
  const result = cli(dir);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'github\n');
});

test('an Artifacts origin with an artifacts record is the artifacts route, with its recorded details', (t) => {
  const dir = checkout(t, { origin: ARTIFACTS, record: RECORDED });
  assert.deepEqual(delivery(dir), { route: 'artifacts', root: dir, delivery: DELIVERY });
  // Asked from a folder inside the checkout, the answer is the same checkout's.
  mkdirSync(join(dir, 'app'));
  assert.deepEqual(delivery(join(dir, 'app')), { route: 'artifacts', root: dir, delivery: DELIVERY });
  const result = cli(dir);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'artifacts\n');
});

test('a checkout with no origin is github when its record names no route', (t) => {
  assert.equal(delivery(checkout(t)).route, 'github');
  assert.equal(delivery(checkout(t, { record: NO_ROUTE })).route, 'github');
  assert.equal(delivery(checkout(t, { record: '{ not json' })).route, 'github');
  // A folder that is no checkout at all has no origin either.
  const bare = realpathSync(mkdtempSync(join(tmpdir(), 'wong-test-delivery-route-none-')));
  t.after(() => rmSync(bare, { recursive: true, force: true }));
  assert.deepEqual(delivery(bare), { route: 'github', root: bare, delivery: null });
});

test('a checkout with no origin whose record says artifacts is refused', (t) => {
  refused(checkout(t, { record: RECORDED }), /no origin/);
});

test('an Artifacts origin whose record names no route is refused, not guessed', (t) => {
  refused(checkout(t, { origin: ARTIFACTS, record: NO_ROUTE }), /names no artifacts route/);
  refused(checkout(t, { origin: ARTIFACTS }), /names no artifacts route/);
  // A record that can not be read names no route either.
  refused(checkout(t, { origin: ARTIFACTS, record: '{ not json' }), /names no artifacts route/);
});

test('a GitHub origin whose record says artifacts is refused, and the reason names the origin host', (t) => {
  refused(checkout(t, { origin: GITHUB, record: RECORDED }), /says artifacts, but origin is on github\.com/);
});

test('an origin that is not the repository the record names is refused', (t) => {
  const other = `https://${HOST}/git/wongstack/another-project.git`;
  refused(checkout(t, { origin: other, record: RECORDED }), /not the repository the install record names/);
  // A record with no address of its own still takes the route from the origin's host.
  assert.equal(routeOf({ origin: other, record: { components: { delivery: { ...DELIVERY, remote: undefined } } } }), 'artifacts');
});
