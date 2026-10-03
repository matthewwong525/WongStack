import assert from 'node:assert/strict';
import { execFile, execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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
  assert.match(stdout, /RESULT: WALKED\nMEDIA=private\n$/);
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
    assert.equal(stdout, `RESULT: NONE\nMEDIA=none\nREASON=${reason}\n`, reason);
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
  assert.match(stdout, /\nMEDIA=none\n$/);
  assert.doesNotMatch(stdout, /REASON=/);
  assert.equal(live.seen.length, 0);
});

test('WALK_MEDIA_BUCKET still publishes to the public bucket', async t => {
  const live = await production(t);
  const { root, run, walk } = pictureFixture(t, live.origin);
  const { stdout } = await walk(['publish', run], { WALK_MEDIA_BUCKET: 'media', WALK_MEDIA_BASE_URL: 'https://pictures.example.com/' });
  assert.match(stdout, /RESULT: WALKED\nMEDIA=public\n$/);
  const lines = pictureLines(stdout);
  assert.equal(lines.length, 2);
  for (const [file, link] of lines) assert.match(link, new RegExp(`^https://pictures\\.example\\.com/walkthrough/[0-9a-f]{7,40}/${file.slice(run.length + 1)}$`));
  const uploads = readFileSync(join(root, 'npx.log'), 'utf8').trim().split('\n');
  assert.equal(uploads.length, 2);
  for (const upload of uploads) assert.match(upload, /^wrangler r2 object put media\/walkthrough\/[0-9a-f]+\/evidence\/empty-title\/0\d-[a-z]+\.png --file=.* --remote$/);
  assert.equal(live.seen.length, 0, 'the production site is not asked');

  const unlinked = await walk(['publish', run], { WALK_MEDIA_BUCKET: 'media' });
  assert.match(unlinked.stdout, /^RESULT: UNKNOWN\n/);
  assert.match(unlinked.stdout, /\nMEDIA=none\nREASON=the public picture folder has no web address set \(WALK_MEDIA_BASE_URL\)\n$/);
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
