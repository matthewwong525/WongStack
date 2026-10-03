import assert from 'node:assert/strict';
import { execFile, execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

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
  assert.match(first.stdout, /RESULT: NONE\n {2}no WALK_MEDIA_BUCKET.*\nREDACTED=3\n$/);
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
  assert.match(uploaded.stdout, /RESULT: WALKED\nREDACTED=0\n$/);
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
