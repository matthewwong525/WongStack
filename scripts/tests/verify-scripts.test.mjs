import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
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
  const root = mkdtempSync(join(tmpdir(), 'verify-env-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const work = join(root, 'work');
  mkdirSync(join(work, '.claude/skills/memory/scripts/lib'), { recursive: true });
  symlinkSync(join(repo, '.agents/skills/memory/scripts/lib/store.mjs'), join(work, '.claude/skills/memory/scripts/lib/store.mjs'));
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
