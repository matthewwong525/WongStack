import assert from 'node:assert/strict';
import { execFile, execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { handleWalkPictures } from '../../.agents/skills/verify/worker/walk-pictures.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.agents/skills/verify/scripts/verify-staging.sh');
const SECRET = 'sec"ret\\x=y';

// A throwaway repo whose .env uses quotes, `export`, a comment, and CRLF line ends, with the
// memory skill's parser where an installed repo keeps it.
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-verify-env-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const work = join(root, 'work');
  mkdirSync(join(work, '.claude/skills/memory/scripts/lib'), { recursive: true });
  for (const lib of ['store.mjs', 'primary-root.mjs', 'cli.mjs']) symlinkSync(join(repo, '.agents/skills/memory/scripts/lib', lib), join(work, '.claude/skills/memory/scripts/lib', lib));
  execFileSync('git', ['init', '-q'], { cwd: work });
  writeFileSync(join(work, '.env'), ['# Access', 'export CF_ACCESS_CLIENT_ID="client-id.access"', `CF_ACCESS_CLIENT_SECRET='${SECRET}'`, 'CLOUDFLARE_API_TOKEN=tok=en== # api', ''].join('\r\n'));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'agent-browser'), `#!/usr/bin/env bash
[ "$1" = "--version" ] && echo "agent-browser 0.0.0"
[ "$3" = "set" ] && printf '%s' "$5" > "${root}/headers.json" && printf '%s' "$CLOUDFLARE_API_TOKEN" > "${root}/token"
[ "$3" = "get" ] && echo "http://127.0.0.1/"
[ "$3" = "open" ] && printf '%s' "$AGENT_BROWSER_PROFILE" > "${root}/profile"
[ "$3" = "batch" ] && [ -n "$LIST_REQUESTS" ] && printf '{"requests":[{"headers":%s}]}' "$(cat "${root}/headers.json")"
exit 0
`);
  chmodSync(join(bin, 'agent-browser'), 0o755);
  const run = join(root, 'wong-verify-run');
  mkdirSync(join(run, 'journeys'), { recursive: true });
  writeFileSync(join(run, 'journeys/page.batch.json'), '[]');
  writeFileSync(join(run, 'journeys/api.requests.txt'), 'GET\t/probe\n');
  return { root, work, bin, run };
}

test('the walk reads .env through the memory parser and escapes the Access header JSON', async t => {
  const { root, work, bin, run } = fixture(t);
  const seen = [];
  const server = createServer((req, res) => { seen.push(req.headers); res.end('ok'); });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => server.close());
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  for (const key of ['CF_ACCESS_CLIENT_ID', 'CF_ACCESS_CLIENT_SECRET', 'CLOUDFLARE_API_TOKEN']) delete env[key];
  const stdout = await new Promise((done, fail) => execFile('bash', [script, 'run', run, `http://127.0.0.1:${server.address().port}`], { cwd: work, env, encoding: 'utf8' },
    (error, out, err) => (error ? fail(new Error(err || out)) : done(out))));
  assert.match(stdout, /RESULT: WALKED/);
  assert.equal(seen[0]['cf-access-client-id'], 'client-id.access');
  assert.equal(seen[0]['cf-access-client-secret'], SECRET);
  assert.deepEqual(JSON.parse(readFileSync(join(root, 'headers.json'), 'utf8')), { 'CF-Access-Client-Id': 'client-id.access', 'CF-Access-Client-Secret': SECRET });
  assert.equal(readFileSync(join(root, 'token'), 'utf8'), 'tok=en==');
  assert.match(stdout, /^REDACTED=0$/m, 'a walk whose evidence holds no credential changes no file');
});

// ── The scrub ─────────────────────────────────────────────────────────────────

const GITHUB_TOKEN = 'ghp_abcdefghijklmnopqrstuvwxyz0123';
const asJson = value => JSON.stringify(value).slice(1, -1);
const CREDENTIALS = [SECRET, asJson(SECRET), 'client-id.access', GITHUB_TOKEN];
const holdsCredential = text => CREDENTIALS.some(value => text.includes(value));

// Every regular file under the run folder; a link is left out, as the scrub leaves it.
const filesUnder = dir => readdirSync(dir, { recursive: true }).map(name => join(dir, name)).filter(file => lstatSync(file).isFile());

function assertScrubbed(run, { stdout, stderr }) {
  for (const file of filesUnder(run)) assert.equal(holdsCredential(readFileSync(file, 'latin1')), false, `${file} still holds a credential`);
  assert.equal(holdsCredential(stdout + stderr), false, 'the script printed a credential');
}

const walk = (args, options) => new Promise((done, fail) => execFile('bash', [script, ...args], { encoding: 'utf8', ...options },
  (error, stdout, stderr) => (error ? fail(new Error(`exit ${error.code}`)) : done({ stdout, stderr }))));

function preflightFixture(t, sourceScript = script) {
  const setup = fixture(t);
  const { root, work, bin } = setup;
  const temp = join(root, 'tmp');
  mkdirSync(temp);
  const preview = join(work, '.claude/skills/save/scripts');
  mkdirSync(preview, { recursive: true });
  writeFileSync(join(preview, 'preview-url.sh'), '#!/usr/bin/env bash\nprintf "lookup\\n" >> "$VERIFY_TEST_CALLS"\nprintf "%s\\n" "$VERIFY_TEST_PREVIEW"\n');
  for (const command of ['agent-browser', 'npm']) {
    writeFileSync(join(bin, command), `#!/usr/bin/env bash\nprintf '${command} %s\\n' "$*" >> "$VERIFY_TEST_CALLS"\n[ "$1" = "--version" ] && echo 'agent-browser 0.0.0'\nexit 0\n`);
    chmodSync(join(bin, command), 0o755);
  }
  const git = (...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: work, encoding: 'utf8' });
  git('add', '.claude');
  git('commit', '-q', '-m', 'init');
  const sha = git('rev-parse', 'HEAD').trim();
  const calls = join(root, 'calls.txt');
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, TMPDIR: temp, VERIFY_TEST_CALLS: calls, VERIFY_TEST_PREVIEW: 'https://preview.example/saved-head' };
  const preflight = (flags = [], changes = {}) => spawnSync('bash', [sourceScript, 'preflight', ...flags], { cwd: work, env: { ...env, ...changes }, encoding: 'utf8' });
  return { ...setup, temp, sha, calls, env, preflight };
}

test('CI-only preflight binds an owned folder to the saved head without preview or browser calls', t => {
  const { work, temp, sha, calls, env, preflight } = preflightFixture(t);
  for (const flags of [['--no-preview', '--no-browser'], ['--no-browser', '--no-preview']]) {
    const result = preflight(flags);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /^RESULT: READY\nURL=\nRUN_DIR=.+\nSHA=[a-f0-9]{40}\nBROWSER=none \(not needed\)\n$/);
    assert.match(result.stdout, new RegExp(`^SHA=${sha}$`, 'm'));
    assert.equal(existsSync(calls), false, 'CI-only preparation called preview lookup or browser tooling');
    const runDir = result.stdout.match(/^RUN_DIR=(.+)$/m)[1];
    assert.equal(dirname(runDir), temp);
    assert.ok(existsSync(runDir));
    const cleaned = spawnSync('bash', [script, 'cleanup', runDir], { cwd: work, env, encoding: 'utf8' });
    assert.equal(cleaned.status, 0);
    assert.equal(existsSync(runDir), false, 'the prepared folder was not accepted by owned cleanup');
  }
});

test('default preflight still discovers the preview and checks its browser', t => {
  // The diagnostic CI capture runs this same retained assertion against the
  // selected earlier script; ordinary suite execution checks the current one.
  const { sha, calls, preflight } = preflightFixture(t, process.env.VERIFY_PREFLIGHT_SOURCE_SCRIPT || script);
  const result = preflight();
  t.diagnostic(`preflight exit=${result.status}; stdout=${JSON.stringify(result.stdout)}`);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^RESULT: READY\nURL=https:\/\/preview.example\/saved-head\nRUN_DIR=.+\nSHA=[a-f0-9]{40}\nBROWSER=local \(agent-browser 0.0.0\)\nSEEDED=no this repo has no staging database of its own to rebuild\nPLAYGROUND=no\n$/);
  assert.match(result.stdout, new RegExp(`^SHA=${sha}$`, 'm'));
  assert.equal(readFileSync(calls, 'utf8'), 'agent-browser doctor --json\nlookup\nagent-browser --version\n');
});

test('request-only preflight still needs the preview while skipping browser tools', t => {
  const { calls, preflight } = preflightFixture(t);
  const result = preflight(['--no-browser']);
  assert.match(result.stdout, /RESULT: READY\nURL=https:\/\/preview.example\/saved-head\n/);
  assert.match(result.stdout, /^BROWSER=none \(not needed\)$/m);
  assert.equal(readFileSync(calls, 'utf8'), 'lookup\n');
});

test('invalid preflight flags cannot allocate a folder or call surface tooling', t => {
  const { temp, calls, preflight } = preflightFixture(t);
  for (const flags of [['--no-preview'], ['--unknown'], ['--no-preview', '--no-browser', 'unexpected']]) {
    const result = preflight(flags);
    assert.match(result.stdout, /^RESULT: UNKNOWN\n/);
    assert.doesNotMatch(result.stdout, /^RUN_DIR=/m);
    assert.deepEqual(readdirSync(temp), []);
    assert.equal(existsSync(calls), false);
  }
});

test('a missing preview blocks only deployed preparation and preserves independent CI evidence', t => {
  const { temp, sha, calls, preflight } = preflightFixture(t);
  const ci = preflight(['--no-preview', '--no-browser']);
  const runDir = ci.stdout.match(/^RUN_DIR=(.+)$/m)[1];
  writeFileSync(join(runDir, 'receipt.txt'), `observed ${sha}\n`);
  const sibling = join(temp, 'another-task');
  mkdirSync(sibling);
  writeFileSync(join(sibling, 'keep.txt'), 'keep');
  const deployed = preflight(['--no-browser'], { VERIFY_TEST_PREVIEW: '' });
  assert.match(deployed.stdout, /^RESULT: UNKNOWN\n {2}no preview URL for /);
  assert.doesNotMatch(deployed.stdout, /^RUN_DIR=/m);
  assert.deepEqual(readdirSync(temp).sort(), ['another-task', runDir.split('/').at(-1)].sort());
  assert.equal(readFileSync(join(runDir, 'receipt.txt'), 'utf8'), `observed ${sha}\n`);
  assert.equal(readFileSync(join(sibling, 'keep.txt'), 'utf8'), 'keep');
  assert.equal(readFileSync(calls, 'utf8'), 'lookup\n');
});

test('CI-only preflight requires a saved head before allocating evidence storage', t => {
  const { root, temp, calls, env } = preflightFixture(t);
  const empty = join(root, 'empty');
  mkdirSync(empty);
  execFileSync('git', ['init', '-q'], { cwd: empty });
  const result = spawnSync('bash', [script, 'preflight', '--no-preview', '--no-browser'], { cwd: empty, env, encoding: 'utf8' });
  assert.match(result.stdout, /^RESULT: UNKNOWN\n {2}no saved revision to verify\n$/);
  assert.deepEqual(readdirSync(temp), []);
  assert.equal(existsSync(calls), false);
});

// ── The staging turn and the reset ────────────────────────────────────────────

// Two checkouts of one bare remote: two walks on two machines. `turn` runs the script's turn command
// in one of them, never waiting unless a test says so.
function turnFixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-verify-turn-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const remote = join(root, 'remote.git');
  execFileSync('git', ['init', '-q', '--bare', remote]);
  const checkout = name => {
    const work = join(root, name);
    mkdirSync(work);
    execFileSync('git', ['init', '-q'], { cwd: work });
    execFileSync('git', ['remote', 'add', 'origin', remote], { cwd: work });
    return work;
  };
  const turn = (work, args, env = {}) => spawnSync('bash', [script, 'turn', ...args],
    { cwd: work, encoding: 'utf8', env: { ...process.env, WONG_TURN_WAIT_SECONDS: '0', WONG_TURN_POLL_SECONDS: '0', ...env } }).stdout;
  const held = () => execFileSync('git', ['ls-remote', remote, 'refs/wong/staging-turn'], { encoding: 'utf8' }).split('\t')[0];
  return { remote, first: checkout('first'), second: checkout('second'), turn, held };
}
const turnSha = stdout => stdout.match(/^TURN_SHA=([a-f0-9]{40})$/m)?.[1];

test('only one of two takers holds the staging turn, and a give frees it for the other', t => {
  const { first, second, turn, held } = turnFixture(t);
  const mine = turn(first, ['take']);
  assert.match(mine, /^TURN=held$/m);
  assert.equal(held(), turnSha(mine));
  const theirs = turn(second, ['take']);
  assert.match(theirs, /^TURN=timeout$/m);
  assert.equal(turnSha(theirs), undefined);
  assert.equal(held(), turnSha(mine), 'a waiting walk moved the held turn');
  assert.match(turn(first, ['give', turnSha(mine)]), /^TURN=given$/m);
  assert.equal(held(), '');
  const next = turn(second, ['take']);
  assert.match(next, /^TURN=held$/m);
  assert.match(turn(first, ['give', turnSha(mine)]), /^TURN=gone$/m, 'a walk gave back a turn it no longer held');
  assert.equal(held(), turnSha(next));
});

test('a turn its holder never gave back is taken over once stale, or at once by the same checkout', t => {
  const { first, second, turn, held } = turnFixture(t);
  const crashed = turnSha(turn(first, ['take']));
  const stale = turn(second, ['take'], { WONG_TURN_EXPIRY_SECONDS: '-1' });
  assert.match(stale, /^TURN=held$/m);
  assert.notEqual(turnSha(stale), crashed);
  assert.equal(held(), turnSha(stale));
  const again = turn(second, ['take']);
  assert.match(again, /^TURN=held$/m, 'a re-walk from the same checkout waited on its own turn');
  assert.equal(held(), turnSha(again));
});

test('a remote that refuses the turn marker, or no remote at all, reports turns unavailable', t => {
  const { remote, first, turn, held } = turnFixture(t);
  writeFileSync(join(remote, 'hooks/pre-receive'), '#!/usr/bin/env bash\nexit 1\n');
  chmodSync(join(remote, 'hooks/pre-receive'), 0o755);
  assert.match(turn(first, ['take']), /^TURN=unavailable the remote refused the turn marker$/m);
  assert.equal(held(), '');
  execFileSync('git', ['remote', 'remove', 'origin'], { cwd: first });
  assert.match(turn(first, ['take']), /^TURN=unavailable this repo has no remote/m);
});

// A preflight fixture whose repo has the stack pack's staging database, a remote for the turn, and a
// fake wrangler that logs each call and answers the reset's one read.
function stagingFixture(t, { npxExit = 0, staging = { d1_databases: [{ binding: 'DB', database_name: 'app-db-staging', database_id: 'b' }] } } = {}) {
  const setup = preflightFixture(t);
  const { root, work, bin, env } = setup;
  mkdirSync(join(work, 'scripts'));
  for (const name of ['reset-staging-d1.mjs', 'lib-wrangler-config.mjs', 'lib-cli.mjs', 'cf-secrets.mjs']) copyFileSync(join(repo, 'scripts', name), join(work, 'scripts', name));
  mkdirSync(join(work, 'app'));
  writeFileSync(join(work, 'app/wrangler.jsonc'), JSON.stringify({ name: 'app', d1_databases: [{ binding: 'DB', database_name: 'app-db', database_id: 'a' }], env: { staging } }));
  writeFileSync(join(bin, 'npx'), `#!/usr/bin/env bash\nprintf 'npx %s\\n' "$*" >> "$VERIFY_TEST_CALLS"\ncase "$*" in *--json*) echo '[{"results":[]}]' ;; esac\nexit ${npxExit}\n`);
  chmodSync(join(bin, 'npx'), 0o755);
  const remote = join(root, 'remote.git');
  execFileSync('git', ['init', '-q', '--bare', remote]);
  execFileSync('git', ['remote', 'add', 'origin', remote], { cwd: work });
  const held = () => execFileSync('git', ['ls-remote', remote, 'refs/wong/staging-turn'], { encoding: 'utf8' }).split('\t')[0];
  const fast = { WONG_TURN_WAIT_SECONDS: '0', WONG_TURN_POLL_SECONDS: '0' };
  const calls = () => (existsSync(setup.calls) ? readFileSync(setup.calls, 'utf8') : '');
  return { ...setup, env: { ...env, ...fast }, held, fast, wranglerCalls: () => calls().split('\n').filter(line => line.startsWith('npx ')) };
}

test('preflight takes the turn, rebuilds staging from the seed, and cleanup gives the turn back', t => {
  const { work, env, held, fast, preflight, wranglerCalls } = stagingFixture(t);
  const result = preflight(['--no-browser'], fast);
  assert.match(result.stdout, /^RESULT: READY\n/);
  assert.match(result.stdout, /\nTURN=held\nSEEDED=yes\nPLAYGROUND=yes\n$/);
  assert.match(held(), /^[a-f0-9]{40}$/);
  const calls = wranglerCalls();
  assert.equal(calls.length, 3, calls.join('\n'));
  assert.match(calls[1], /^npx wrangler d1 migrations apply app-db-staging --remote --env staging$/);
  assert.match(calls[2], /^npx wrangler d1 execute app-db-staging --remote --env staging --file=.*schema\/seed\.sql$/);
  const runDir = result.stdout.match(/^RUN_DIR=(.+)$/m)[1];
  const cleaned = spawnSync('bash', [script, 'cleanup', runDir], { cwd: work, env, encoding: 'utf8' });
  assert.equal(cleaned.status, 0);
  assert.equal(held(), '', 'cleanup kept the staging turn');
});

test('a CI-only preflight takes no turn and rebuilds nothing', t => {
  const { held, fast, preflight, wranglerCalls } = stagingFixture(t);
  const result = preflight(['--no-preview', '--no-browser'], fast);
  assert.match(result.stdout, /^RESULT: READY\n/);
  assert.doesNotMatch(result.stdout, /TURN=|SEEDED=|PLAYGROUND=/);
  assert.equal(held(), '');
  assert.deepEqual(wranglerCalls(), []);
});

test('a held turn leaves staging alone, and a failed rebuild is named; neither stops the walk', t => {
  const waiting = stagingFixture(t);
  const other = join(waiting.root, 'other');
  mkdirSync(other);
  execFileSync('git', ['init', '-q'], { cwd: other });
  execFileSync('git', ['remote', 'add', 'origin', join(waiting.root, 'remote.git')], { cwd: other });
  const theirs = turnSha(spawnSync('bash', [script, 'turn', 'take'], { cwd: other, env: waiting.env, encoding: 'utf8' }).stdout);
  const blocked = waiting.preflight(['--no-browser'], waiting.fast);
  assert.match(blocked.stdout, /^RESULT: READY\n/);
  assert.match(blocked.stdout, /\nTURN=timeout\nSEEDED=no another check held staging for the whole wait\nPLAYGROUND=yes\n$/);
  assert.deepEqual(waiting.wranglerCalls(), []);
  assert.equal(waiting.held(), theirs);

  const failing = stagingFixture(t, { npxExit: 1 });
  const failed = failing.preflight(['--no-browser'], failing.fast);
  assert.match(failed.stdout, /^RESULT: READY\n/);
  assert.match(failed.stdout, /\nTURN=held\nSEEDED=no the staging rebuild failed .*\nPLAYGROUND=yes\n$/);
});

test('staging bound to production\'s database, or missing a twin, is no playground', t => {
  const same = stagingFixture(t, { staging: { d1_databases: [{ binding: 'DB', database_name: 'app-db', database_id: 'a' }] } });
  const pointed = same.preflight(['--no-browser'], same.fast);
  assert.match(pointed.stdout, /\nSEEDED=no this repo has no staging database of its own to rebuild\nPLAYGROUND=no\n$/);
  assert.doesNotMatch(pointed.stdout, /TURN=/);
  assert.deepEqual(same.wranglerCalls(), []);
  assert.equal(same.held(), '');

  const untwinned = stagingFixture(t);
  const config = JSON.parse(readFileSync(join(untwinned.work, 'app/wrangler.jsonc'), 'utf8'));
  config.kv_namespaces = [{ binding: 'CACHE', id: 'k' }];
  writeFileSync(join(untwinned.work, 'app/wrangler.jsonc'), JSON.stringify(config));
  assert.match(untwinned.preflight(['--no-browser'], untwinned.fast).stdout, /\nSEEDED=yes\nPLAYGROUND=no\n$/);
});

// The failure the scrub exists for: the driver adds the Access token to every request, a journey lists
// the requests the browser made, an endpoint echoes its headers, and the token lands in evidence.
test('run scrubs the Access token it sent out of the evidence, and prints no value', async t => {
  const { root, work, bin, run } = fixture(t);
  const server = createServer((req, res) => res.end(JSON.stringify(req.headers)));
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => server.close());
  mkdirSync(join(run, 'evidence/page'), { recursive: true });
  writeFileSync(join(run, 'evidence/page/network.txt'), `CF-Access-Client-Secret: ${SECRET}\nAuthorization: token ${GITHUB_TOKEN}\n`);
  const picture = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00, 0x0d, 0xff, 0xfe]);
  writeFileSync(join(run, 'evidence/page/01.png'), picture);
  writeFileSync(join(root, 'outside.txt'), SECRET);
  symlinkSync(join(root, 'outside.txt'), join(run, 'evidence/page/linked.txt'));
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, LIST_REQUESTS: '1' };
  for (const key of ['CF_ACCESS_CLIENT_ID', 'CF_ACCESS_CLIENT_SECRET', 'CLOUDFLARE_API_TOKEN']) delete env[key];

  const output = await walk(['run', run, `http://127.0.0.1:${server.address().port}`], { cwd: work, env });

  assert.match(output.stdout, /RESULT: WALKED/);
  // The echoed response, the listed requests, and the planted file. The picture and the link are not text files.
  assert.match(output.stdout, /^REDACTED=3$/m);
  assertScrubbed(run, output);
  const listed = JSON.parse(readFileSync(join(run, 'evidence/page.result.json'), 'utf8'));
  assert.deepEqual(listed.requests[0].headers, { 'CF-Access-Client-Id': '[redacted:.env]', 'CF-Access-Client-Secret': '[redacted:.env]' });
  assert.match(readFileSync(join(run, 'evidence/api/01-response.txt'), 'utf8'), /"cf-access-client-secret":"\[redacted:\.env\]"/);
  assert.equal(readFileSync(join(run, 'evidence/page/network.txt'), 'utf8'), 'CF-Access-Client-Secret: [redacted:.env]\nAuthorization: token [redacted:token]\n');
  assert.deepEqual(readFileSync(join(run, 'evidence/page/01.png')), picture);
  assert.equal(readFileSync(join(root, 'outside.txt'), 'utf8'), SECRET, 'a file outside the run folder was rewritten');
});

// State-probe evidence and the comment are written after `run`, so `publish` scrubs again, bucket or not.
test('publish scrubs the comment, a result file, and later evidence before its bucket check', t => {
  const { work, run } = fixture(t);
  mkdirSync(join(run, 'evidence/state'), { recursive: true });
  writeFileSync(join(run, 'comment.md'), `## Staging walkthrough\n\nSent \`CF-Access-Client-Secret: ${SECRET}\`.\n`);
  writeFileSync(join(run, 'evidence/state.result.json'), JSON.stringify({ headers: { 'CF-Access-Client-Secret': SECRET } }));
  writeFileSync(join(run, 'evidence/state/01-query.txt'), `secret=${SECRET} id=client-id.access\n`);
  const env = { ...process.env };
  for (const key of ['CF_ACCESS_CLIENT_ID', 'CF_ACCESS_CLIENT_SECRET', 'CLOUDFLARE_API_TOKEN', 'WALK_MEDIA_BUCKET', 'WALK_MEDIA_BASE_URL']) delete env[key];
  const publish = () => spawnSync('bash', [script, 'publish', run], { cwd: work, env, encoding: 'utf8' });

  const first = publish();
  assert.match(first.stdout, /RESULT: NONE\n {2}no screenshot to keep\nMEDIA=none\nREDACTED=3\n$/);
  assertScrubbed(run, first);
  assert.equal(readFileSync(join(run, 'comment.md'), 'utf8'), '## Staging walkthrough\n\nSent `CF-Access-Client-Secret: [redacted:.env]`.\n');
  assert.deepEqual(JSON.parse(readFileSync(join(run, 'evidence/state.result.json'), 'utf8')), { headers: { 'CF-Access-Client-Secret': '[redacted:.env]' } });
  assert.match(publish().stdout, /^REDACTED=0$/m, 'a second pass finds nothing left');
});

test('outside a checkout, publish still scrubs an exported Access token and token shapes', t => {
  const { root, run } = fixture(t);
  const exported = 'exported-access-secret-0123456789';
  writeFileSync(join(run, 'comment.md'), `secret ${exported} and ${GITHUB_TOKEN}\n`);
  const env = { ...process.env, CF_ACCESS_CLIENT_SECRET: exported, WALK_MEDIA_BUCKET: 'walks' };
  for (const key of ['CF_ACCESS_CLIENT_ID', 'CLOUDFLARE_API_TOKEN', 'WALK_MEDIA_BASE_URL']) delete env[key];

  const noBase = spawnSync('bash', [script, 'publish', run], { cwd: root, env, encoding: 'utf8' });
  assert.match(noBase.stdout, /RESULT: UNKNOWN\n[\s\S]+\nREDACTED=1\n$/);
  assert.equal(readFileSync(join(run, 'comment.md'), 'utf8'), 'secret [redacted:.env] and [redacted:token]\n');
  assert.equal((noBase.stdout + noBase.stderr).includes(exported), false);

  const uploaded = spawnSync('bash', [script, 'publish', run], { cwd: root, env: { ...env, WALK_MEDIA_BASE_URL: 'https://media.example' }, encoding: 'utf8' });
  assert.match(uploaded.stdout, /RESULT: WALKED\nMEDIA=public\nREDACTED=0\n$/);
});

// A scrub that could not run must never read as a clean one.
test('a scrub that cannot run reports unknown, not a count', t => {
  const { root, work } = fixture(t);
  const result = spawnSync('bash', [script, 'publish', join(root, 'no-such-run')], { cwd: work, encoding: 'utf8' });
  assert.match(result.stdout, /^REDACTED=unknown$/m);
});

test('a request that never answers times out, and HEAD probes return headers', async t => {
  const { work, bin, run } = fixture(t);
  writeFileSync(join(run, 'journeys/api.requests.txt'), 'GET\t/hang\nHEAD\t/ok\n');
  const server = createServer((req, res) => { if (req.url !== '/hang') res.end('ok'); });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => server.closeAllConnections() || server.close());
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, VERIFY_REQUEST_TIMEOUT: '1' };
  const started = Date.now();
  const stdout = await new Promise((done, fail) => execFile('bash', [script, 'run', run, `http://127.0.0.1:${server.address().port}`], { cwd: work, env, encoding: 'utf8', timeout: 20000 },
    (error, out, err) => (error ? fail(new Error(err || out)) : done(out))));
  assert.match(stdout, /RESULT: WALKED/);
  assert.ok(Date.now() - started < 15000, 'the hung request did not hold the walk');
  assert.match(readFileSync(join(run, 'evidence/api/02-response.txt'), 'utf8'), /HTTP\/1\.1 200/);
});

test('a linked worktree reads the primary checkout\'s .env', async t => {
  const { root, work, bin, run } = fixture(t);
  const git = (...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: work });
  git('add', '.claude');
  git('commit', '-q', '-m', 'init');
  const linked = join(root, 'linked');
  git('worktree', 'add', '-q', linked, '-b', 'walk');
  const seen = [];
  const server = createServer((req, res) => { seen.push(req.headers); res.end('ok'); });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => server.close());
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  for (const key of ['CF_ACCESS_CLIENT_ID', 'CF_ACCESS_CLIENT_SECRET', 'CLOUDFLARE_API_TOKEN']) delete env[key];
  const stdout = await new Promise((done, fail) => execFile('bash', [script, 'run', run, `http://127.0.0.1:${server.address().port}`], { cwd: linked, env, encoding: 'utf8' },
    (error, out, err) => (error ? fail(new Error(err || out)) : done(out))));
  assert.match(stdout, /RESULT: WALKED/);
  assert.equal(seen[0]['cf-access-client-id'], 'client-id.access');
});

test('each browser journey runs in a throwaway profile, removed when the walk ends', async t => {
  const { root, work, bin, run } = fixture(t);
  const server = createServer((req, res) => res.end('ok'));
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => server.close());
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, AGENT_BROWSER_PROFILE: join(root, 'personal-profile') };
  await new Promise((done, fail) => execFile('bash', [script, 'run', run, `http://127.0.0.1:${server.address().port}`], { cwd: work, env, encoding: 'utf8' },
    (error, out, err) => (error ? fail(new Error(err || out)) : done(out))));
  const used = readFileSync(join(root, 'profile'), 'utf8');
  assert.match(used, /wong-verify-profile\.[^/]+\/page$/, 'not the personal profile');
  assert.equal(existsSync(dirname(used)), false, 'the profile folder is removed');
});

// Cleanup runs with TMPDIR set to a folder inside this test's own temp dir, so
// a wrong answer could only ever remove something the test made.
function cleanupFixture(t) {
  const base = mkdtempSync(join(tmpdir(), 'wong-test-verify-cleanup-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  for (const dir of ['tmp', 'home/wong-verify-x', 'outside']) mkdirSync(join(base, dir), { recursive: true });
  writeFileSync(join(base, 'outside/keep'), '');
  const cleanup = runDir => spawnSync('bash', [script, 'cleanup', runDir], { encoding: 'utf8', env: { ...process.env, TMPDIR: join(base, 'tmp'), HOME: join(base, 'home') } });
  return { base, tmp: join(base, 'tmp'), cleanup };
}

test('cleanup refuses a path it could not have made and removes nothing', t => {
  const { base, tmp, cleanup } = cleanupFixture(t);
  mkdirSync(join(tmp, 'wong-verify-a'));
  symlinkSync(join(base, 'outside'), join(tmp, 'wong-verify-link'));
  for (const runDir of [join(base, 'home/wong-verify-x'), join(tmp, 'wong-verify-a/../..'), join(tmp, 'wong-verify-link')]) {
    const result = cleanup(runDir);
    assert.equal(result.status, 1, `${runDir}: ${result.stdout}`);
    assert.match(result.stderr, /refusing to remove/);
  }
  for (const kept of ['home/wong-verify-x', 'tmp/wong-verify-a', 'tmp/wong-verify-link', 'outside/keep']) {
    assert.ok(existsSync(join(base, kept)), `${kept} was removed`);
  }
});

test('cleanup removes a real run directory from the temp dir', t => {
  const { tmp, cleanup } = cleanupFixture(t);
  const runDir = execFileSync('mktemp', ['-d', join(tmp, 'wong-verify-XXXXXX')], { encoding: 'utf8' }).trim();
  writeFileSync(join(runDir, 'shot.png'), '');
  const result = cleanup(runDir);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(runDir), false);
});

// ── Kept pictures ─────────────────────────────────────────────────────────────
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const KEPT = 'abc1234/20261003T140000Z/empty-title/01-landing.png';

// Production's stand-in: the real picture route on a fake bucket, behind a check for the Access
// token. `site` picks what the walk meets: 'private' (a login and a bucket), 'no-bucket', 'open'
// (no login), 'old' (a site from before the route), or 'refuses' (the token is turned away).
async function production(t, site = 'private') {
  const objects = new Map();
  const bucket = {
    get: async key => (objects.has(key) ? { body: objects.get(key) } : null),
    put: async (key, value, options) => (options?.onlyIf && objects.has(key) ? null : objects.set(key, Buffer.from(value))),
  };
  const seen = [];
  const route = (req, body) => handleWalkPictures(
    new Request(`http://${req.headers.host}${req.url}`, { method: req.method, ...(req.method === 'PUT' ? { body } : {}) }),
    site === 'no-bucket' ? undefined : bucket, site === 'open' ? null : { kind: 'service' });
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    seen.push({ method: req.method, url: req.url, headers: req.headers });
    const token = req.headers['cf-access-client-id'] === 'client-id.access' && req.headers['cf-access-client-secret'] === SECRET;
    let response;
    if (site === 'refuses' || (site !== 'open' && !token)) response = new Response('Unauthorized', { status: 401 });
    else if (site === 'old') response = new Response('Not found', { status: 404 });
    else response = await route(req, Buffer.concat(chunks));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => server.close());
  return { origin: `http://127.0.0.1:${server.address().port}`, objects, seen };
}

// A repo with one commit, a memory store recorded at `origin`, two screenshots and a text capture in
// the run folder, and stand-ins for `gh` (prints comments.txt) and `npx` (records its arguments).
function pictureFixture(t, origin) {
  const made = fixture(t);
  const { root, work, bin, run } = made;
  if (origin) writeFileSync(join(work, '.claude/.wong-stack.json'), JSON.stringify({ components: { memory: { accountId: 'a', databaseId: 'd', bucket: 'b', worker: origin } } }));
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'init'], { cwd: work });
  mkdirSync(join(run, 'evidence/empty-title'), { recursive: true });
  for (const shot of ['01-landing.png', '02-after.png']) writeFileSync(join(run, 'evidence/empty-title', shot), PNG);
  writeFileSync(join(run, 'evidence/empty-title/03-response.txt'), 'HTTP/1.1 200');
  writeFileSync(join(bin, 'gh'), `#!/usr/bin/env bash\ncat "${root}/comments.txt"\n`);
  writeFileSync(join(bin, 'npx'), `#!/usr/bin/env bash\necho "$*" >> "${root}/npx.log"\n`);
  for (const tool of ['gh', 'npx']) chmodSync(join(bin, tool), 0o755);
  mkdirSync(join(root, 'tmp'));
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, TMPDIR: join(root, 'tmp') };
  for (const key of ['CF_ACCESS_CLIENT_ID', 'CF_ACCESS_CLIENT_SECRET', 'CLOUDFLARE_API_TOKEN', 'WALK_MEDIA_BUCKET', 'WALK_MEDIA_BASE_URL']) delete env[key];
  // Async, so the stand-in server in this process can answer while the script runs.
  const walk = (args, extra = {}) => new Promise(done => execFile('bash', [script, ...args], { cwd: work, env: { ...env, ...extra }, encoding: 'utf8' },
    (error, stdout, stderr) => done({ stdout, stderr, said: stdout + stderr })));
  return { ...made, walk };
}

const pictureLines = stdout => stdout.split('\n').filter(line => line.includes('\t')).map(line => line.split('\t'));

test('publish keeps each screenshot on the production site and prints its link, never the secret', async t => {
  const live = await production(t);
  const { run, walk } = pictureFixture(t, live.origin);
  const { stdout, said } = await walk(['publish', run]);
  assert.match(stdout, /RESULT: WALKED\nMEDIA=private\nREDACTED=(?:\d+|unknown)\n$/);
  const lines = pictureLines(stdout);
  assert.deepEqual(lines.map(([file]) => file), ['01-landing.png', '02-after.png'].map(shot => join(run, 'evidence/empty-title', shot)));
  for (const [, link] of lines) assert.match(link, new RegExp(`^${live.origin}/_walk/[0-9a-f]{7,40}/\\d{8}T\\d{6}Z/empty-title/0\\d-[a-z]+\\.png$`));
  assert.deepEqual(live.seen.map(request => request.method), ['PUT', 'PUT'], 'only the PNGs are sent');
  for (const { headers } of live.seen) {
    assert.equal(headers['cf-access-client-id'], 'client-id.access');
    assert.equal(headers['cf-access-client-secret'], SECRET);
  }
  assert.deepEqual([...live.objects.keys()], lines.map(([, link]) => `walks/${link.split('/_walk/')[1]}`));
  assert.ok([...live.objects.values()].every(kept => kept.equals(PNG)));
  assert.ok(!said.includes(SECRET) && !said.includes('client-id.access'), 'no credential is printed');
});

test('two publish runs on one commit use different run folders', async t => {
  const live = await production(t);
  const { run, walk } = pictureFixture(t, live.origin);
  const folder = async () => pictureLines((await walk(['publish', run])).stdout)[0][1].split('/').slice(4, 6);
  const first = await folder();
  await new Promise(done => setTimeout(done, 1100));   // the run stamp counts seconds
  const second = await folder();
  assert.equal(second[0], first[0], 'the same commit');
  assert.notEqual(second[1], first[1]);
  assert.equal(live.objects.size, 4, 'the repeat replaced nothing');
});

test('publish says why when the pictures were not kept, and names no file', async t => {
  const noToken = ({ work }) => writeFileSync(join(work, '.env'), 'CLOUDFLARE_API_TOKEN=tok\n');
  const rows = [
    { reason: 'no memory store is set up for this repo', recorded: false },
    { reason: 'this machine has no access token for the site', arrange: noToken },
    { reason: 'the Cloudflare account has no storage (it needs a payment method)', site: 'no-bucket' },
    { reason: 'the site has no login yet, so pictures would be open to anyone', site: 'open' },
    { reason: 'the live site does not serve pictures yet (it does after the next publish)', site: 'old' },
    { reason: 'the live site refused the access token', site: 'refuses' },
  ];
  for (const { reason, site, recorded = true, arrange } of rows) {
    const live = await production(t, site);
    const made = pictureFixture(t, recorded ? live.origin : null);
    arrange?.(made);
    const { stdout } = await made.walk(['publish', made.run]);
    assert.equal(stdout.replace(/REDACTED=(?:\d+|unknown)\n$/, ''), `RESULT: NONE\nMEDIA=none\nREASON=${reason}\n`, reason);
    assert.equal(live.objects.size, 0, reason);
    // The first refusal stops the loop; with no store or no token, nothing is sent at all.
    assert.equal(live.seen.length, site ? 1 : 0, reason);
  }
});

test('publish with nothing to keep gives no reason', async t => {
  const live = await production(t);
  const { run, walk } = pictureFixture(t, live.origin);
  rmSync(join(run, 'evidence/empty-title/01-landing.png'));
  rmSync(join(run, 'evidence/empty-title/02-after.png'));
  const { stdout } = await walk(['publish', run]);
  assert.match(stdout, /^RESULT: NONE\n/);
  assert.match(stdout, /\nMEDIA=none\nREDACTED=(?:\d+|unknown)\n$/);
  assert.doesNotMatch(stdout, /REASON=/);
  assert.equal(live.seen.length, 0);
});

test('WALK_MEDIA_BUCKET still publishes to the public bucket', async t => {
  const live = await production(t);
  const { root, run, walk } = pictureFixture(t, live.origin);
  const { stdout } = await walk(['publish', run], { WALK_MEDIA_BUCKET: 'media', WALK_MEDIA_BASE_URL: 'https://pictures.example.com/' });
  assert.match(stdout, /RESULT: WALKED\nMEDIA=public\nREDACTED=(?:\d+|unknown)\n$/);
  const lines = pictureLines(stdout);
  assert.equal(lines.length, 2);
  for (const [file, link] of lines) assert.match(link, new RegExp(`^https://pictures\\.example\\.com/walkthrough/[0-9a-f]{7,40}/${file.slice(run.length + 1)}$`));
  const uploads = readFileSync(join(root, 'npx.log'), 'utf8').trim().split('\n');
  assert.equal(uploads.length, 2);
  for (const upload of uploads) assert.match(upload, /^wrangler r2 object put media\/walkthrough\/[0-9a-f]+\/evidence\/empty-title\/0\d-[a-z]+\.png --file=.* --remote$/);
  assert.equal(live.seen.length, 0, 'the production site is not asked');

  const unlinked = await walk(['publish', run], { WALK_MEDIA_BUCKET: 'media' });
  assert.match(unlinked.stdout, /^RESULT: UNKNOWN\n/);
  assert.match(unlinked.stdout, /\nMEDIA=none\nREASON=the public picture folder has no web address set \(WALK_MEDIA_BASE_URL\)\nREDACTED=(?:\d+|unknown)\n$/);
});

test('pictures downloads a past walk\'s links from the production site only, and cleanup removes them', async t => {
  const live = await production(t);
  const elsewhere = await production(t);
  const { root, walk } = pictureFixture(t, live.origin);
  for (const site of [live, elsewhere]) site.objects.set(`walks/${KEPT}`, PNG);
  writeFileSync(join(root, 'comments.txt'), `## Staging walkthrough — SUCCESS\nPictures (log in to open): [landing](${live.origin}/_walk/${KEPT}) · [a trap](${elsewhere.origin}/_walk/${KEPT}) · [a climb](${live.origin}/_walk/../_memory/x.png)\n`);
  const { stdout, said } = await walk(['pictures', '7']);
  const runDir = stdout.match(/^RUN_DIR=(.+)$/m)[1];
  assert.match(stdout, /RESULT: WALKED\n/);
  assert.deepEqual(pictureLines(stdout), [[join(runDir, 'evidence', KEPT), 'landing']]);
  assert.ok(readFileSync(join(runDir, 'evidence', KEPT)).equals(PNG));
  assert.deepEqual(live.seen.map(request => `${request.method} ${request.url}`), [`GET /_walk/${KEPT}`]);
  assert.equal(live.seen[0].headers['cf-access-client-secret'], SECRET);
  assert.equal(elsewhere.seen.length, 0, 'the token never goes to another host');
  assert.ok(!said.includes(SECRET), 'no credential is printed');

  await walk(['cleanup', runDir]);
  assert.deepEqual(readdirSync(join(root, 'tmp')), []);
});

test('pictures reports NONE for a comment with no picture, and UNKNOWN when the site refuses', async t => {
  const live = await production(t, 'refuses');
  const { root, walk } = pictureFixture(t, live.origin);
  writeFileSync(join(root, 'comments.txt'), '## Staging walkthrough — SUCCESS\nPictures were not kept: the site has no login yet.\n');
  const none = await walk(['pictures', '7']);
  assert.match(none.stdout, /^RESULT: NONE\n/);
  assert.deepEqual(readdirSync(join(root, 'tmp')), [], 'nothing is left on the machine');
  assert.equal(live.seen.length, 0);

  writeFileSync(join(root, 'comments.txt'), `[landing](${live.origin}/_walk/${KEPT})\n`);
  const refused = await walk(['pictures', '7']);
  assert.match(refused.stdout, /^RESULT: UNKNOWN\n {2}the live site did not return the pictures \(HTTP 401\)\nRUN_DIR=/);
  assert.doesNotMatch(refused.stdout, /\t/);
});
