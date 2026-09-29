import assert from 'node:assert/strict';
import { execFile, execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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
