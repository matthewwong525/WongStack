import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { cacheFile, credential, CredentialError, helperConfig, install, parseRequest, repositoryOf } from '../../.agents/skills/save/scripts/artifacts-credential.mjs';

const script = new URL('../../.agents/skills/save/scripts/artifacts-credential.mjs', import.meta.url).pathname;
const ACCOUNT = '0123456789abcdef'.repeat(2);
const HOST = `${ACCOUNT}.artifacts.cloudflare.net`;
const REMOTE = `https://${HOST}/git/wongstack/recipe-box.git`;
const REPOSITORY = { account: ACCOUNT, namespace: 'wongstack', repo: 'recipe-box' };
// What Git sends the helper for this install's remote, and what it sends with no path.
const REQUEST = `protocol=https\nhost=${HOST}\npath=git/wongstack/recipe-box.git\n`;
const PATHLESS = `protocol=https\nhost=${HOST}\n`;
const CLOUDFLARE_TOKEN = 'cf-user-token-made-up-for-tests';
const NOW = 1_800_000_000;
const DAY = 24 * 60 * 60;

// A made-up Artifacts token as Cloudflare returns it: the secret, then when it expires.
const secret = (pair) => `art_v1_${pair.repeat(20)}`;
const minted = (pair, expires) => `${secret(pair)}?expires=${expires}`;
const answer = (pair, expires) => `username=x\npassword=${secret(pair)}\npassword_expiry_utc=${expires}\n`;

// A stand-in for Cloudflare: records each request and answers with `reply()`.
function cloudflare(reply) {
  const calls = [];
  return { calls, fetch: async (url, init) => { calls.push({ url, init }); return reply(); } };
}
const mints = (token) => cloudflare(() => Response.json({ success: true, errors: [], result: { plaintext: token } }));
const refuses = () => cloudflare(() => Response.json({ success: false, errors: [{ code: 10000, message: `Authentication error for ${CLOUDFLARE_TOKEN}` }], result: null }, { status: 403 }));
const offline = () => cloudflare(() => { throw new Error(`could not connect with ${CLOUDFLARE_TOKEN}`); });

const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.test', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' }).trim();

// A temp folder with a made-up home and a folder to work in, so nothing touches the real
// ~/.local/state. `file` is where this repository's token is cached under that home.
function place(t) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wong-test-artifacts-credential-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const [home, cwd] = [join(dir, 'home'), join(dir, 'work')];
  mkdirSync(home);
  mkdirSync(cwd);
  return { dir, home, cwd, file: cacheFile(home, REPOSITORY) };
}

// Makes the work folder a checkout: an Artifacts install with its record, or a GitHub one.
function checkout(p, origin = REMOTE) {
  git(p.cwd, 'init', '-q', '-b', 'main');
  git(p.cwd, 'remote', 'add', 'origin', origin);
  if (origin !== REMOTE) return;
  mkdirSync(join(p.cwd, '.claude'));
  writeFileSync(join(p.cwd, '.claude', '.wong-stack.json'), JSON.stringify({ components: { delivery: { route: 'artifacts', accountId: ACCOUNT, namespace: 'wongstack', repo: 'recipe-box', remote: REMOTE } } }));
}

const ask = (p, api, { operation = 'get', input = REQUEST, now = NOW, env = { CLOUDFLARE_API_TOKEN: CLOUDFLARE_TOKEN }, cwd = p.cwd } = {}) =>
  credential(operation, input, { cwd, env, home: p.home, now, fetch: api.fetch });
const mode = (file) => statSync(file).mode & 0o777;

test('a request is read line by line, and names its repository from the host and path', () => {
  const request = parseRequest(`${REQUEST}wwwauth[]=Basic realm="a=b"\n\n`);
  assert.equal(request['wwwauth[]'], 'Basic realm="a=b"');
  assert.deepEqual(repositoryOf(request), REPOSITORY);
  assert.deepEqual(repositoryOf({ ...request, path: 'git/wongstack/recipe-box' }), REPOSITORY);
  assert.equal(repositoryOf({ ...request, host: 'github.com' }), null);
});

test('first use mints a one-day write token for the one repository and caches it privately', async (t) => {
  const p = place(t);
  const api = mints(minted('ab', NOW + DAY));
  const out = await ask(p, api);
  assert.equal(out, answer('ab', NOW + DAY));
  assert.ok(!out.includes('?expires='), 'the password still carries its expiry');
  assert.equal(api.calls.length, 1);
  const [{ url, init }] = api.calls;
  assert.equal(url, `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/artifacts/namespaces/wongstack/tokens`);
  assert.equal(init.method, 'POST');
  assert.equal(init.headers.Authorization, `Bearer ${CLOUDFLARE_TOKEN}`);
  assert.deepEqual(JSON.parse(init.body), { repo: 'recipe-box', scope: 'write', ttl: DAY });
  assert.equal(dirname(p.file), join(p.home, '.local', 'state', 'wongstack'));
  assert.equal(mode(p.file), 0o600);
  assert.equal(mode(dirname(p.file)), 0o700);
  // The Cloudflare token goes to Cloudflare as a header, and nowhere else.
  for (const text of [out, url, init.body, readFileSync(p.file, 'utf8')]) assert.ok(!text.includes(CLOUDFLARE_TOKEN));
});

test('a cached token answers the next call with no request to Cloudflare', async (t) => {
  const p = place(t);
  await ask(p, mints(minted('ab', NOW + DAY)));
  const api = offline();
  assert.equal(await ask(p, api, { now: NOW + 3600, env: {} }), answer('ab', NOW + DAY));
  assert.equal(api.calls.length, 0);
});

test('a cached token near or past its expiry is minted again and the cache replaced', async (t) => {
  for (const [name, later] of [['five minutes left', DAY - 300], ['already expired', DAY + 60]]) {
    const p = place(t);
    await ask(p, mints(minted('cd', NOW + DAY)));
    const api = mints(minted('ab', NOW + later + DAY));
    assert.equal(await ask(p, api, { now: NOW + later }), answer('ab', NOW + later + DAY), name);
    assert.equal(api.calls.length, 1, name);
    // The new token is the cached one from here on, still private.
    const next = offline();
    assert.equal(await ask(p, next, { now: NOW + later + 60 }), answer('ab', NOW + later + DAY), name);
    assert.equal(next.calls.length, 0, name);
    assert.equal(mode(p.file), 0o600, name);
  }
});

test('the Cloudflare token comes from the primary worktree .env when the environment has none', async (t) => {
  const p = place(t);
  git(p.cwd, 'init', '-q', '-b', 'main');
  git(p.cwd, 'commit', '-q', '--allow-empty', '-m', 'first');
  const linked = join(p.dir, 'linked');
  git(p.cwd, 'worktree', 'add', '-q', linked, '-b', 'recipes');
  writeFileSync(join(p.cwd, '.env'), `OTHER=1\nCLOUDFLARE_API_TOKEN=${CLOUDFLARE_TOKEN}\n`);
  const api = mints(minted('ab', NOW + DAY));
  assert.equal(await ask(p, api, { cwd: linked, env: {} }), answer('ab', NOW + DAY));
  assert.equal(api.calls[0].init.headers.Authorization, `Bearer ${CLOUDFLARE_TOKEN}`);
});

test('a missing Cloudflare token is an error that names it, with no answer and nothing cached', async (t) => {
  for (const dotenv of [null, 'OTHER=1\n', 'CLOUDFLARE_API_TOKEN=\n']) {
    const p = place(t);
    git(p.cwd, 'init', '-q', '-b', 'main');
    if (dotenv !== null) writeFileSync(join(p.cwd, '.env'), dotenv);
    const api = mints(minted('ab', NOW + DAY));
    await assert.rejects(ask(p, api, { env: {} }), (error) => error instanceof CredentialError && /CLOUDFLARE_API_TOKEN/.test(error.message));
    assert.equal(api.calls.length, 0);
    assert.equal(existsSync(p.file), false);
  }
  // Outside any checkout there is no .env to read either.
  const outside = place(t);
  await assert.rejects(ask(outside, offline(), { env: {} }), CredentialError);
  assert.equal(existsSync(outside.file), false);
});

test('a symlinked cache is refused, and the file it points at is left alone', async (t) => {
  const p = place(t);
  const target = join(p.dir, 'elsewhere.json');
  const before = `${JSON.stringify({ token: minted('cd', NOW + DAY) })}\n`;
  writeFileSync(target, before, { mode: 0o600 });
  mkdirSync(dirname(p.file), { recursive: true });
  symlinkSync(target, p.file);
  const api = mints(minted('ab', NOW + DAY));
  await assert.rejects(ask(p, api), CredentialError);
  assert.equal(api.calls.length, 0);
  assert.equal(await ask(p, api, { operation: 'erase' }), '');
  assert.equal(readFileSync(target, 'utf8'), before);
  assert.equal(lstatSync(p.file).isSymbolicLink(), true);
});

test('a cache other people can read is thrown away, minted again and written private', async (t) => {
  const p = place(t);
  await ask(p, mints(minted('cd', NOW + DAY)));
  chmodSync(p.file, 0o644);
  await assert.rejects(ask(p, refuses()), CredentialError);
  assert.equal(existsSync(p.file), false, 'the exposed cache was kept');

  await ask(p, mints(minted('cd', NOW + DAY)));
  chmodSync(p.file, 0o644);
  const api = mints(minted('ab', NOW + DAY));
  assert.equal(await ask(p, api), answer('ab', NOW + DAY));
  assert.equal(api.calls.length, 1);
  assert.equal(mode(p.file), 0o600);
});

test('a foreign remote, a protocol that is not https and a lookalike host get no answer', async (t) => {
  const p = place(t);
  const api = mints(minted('ab', NOW + DAY));
  const others = [
    'protocol=https\nhost=github.com\npath=someone/recipe-box.git\n',
    REQUEST.replace('protocol=https', 'protocol=http'),
    REQUEST.replace('protocol=https', 'protocol=ssh'),
    REQUEST.replace(HOST, `${HOST}.example.com`),
    REQUEST.replace('git/wongstack/', 'git/../'),
    PATHLESS,
    '',
  ];
  for (const input of others) {
    for (const operation of ['get', 'erase']) assert.equal(await ask(p, api, { operation, input }), '', `${operation} ${input}`);
  }
  assert.equal(api.calls.length, 0);
  assert.equal(existsSync(join(p.home, '.local')), false);
});

test('a request with no path uses the repository the install record names', async (t) => {
  const p = place(t);
  checkout(p);
  const api = mints(minted('ab', NOW + DAY));
  assert.equal(await ask(p, api, { input: PATHLESS }), answer('ab', NOW + DAY));
  assert.match(api.calls[0].url, new RegExp(`/accounts/${ACCOUNT}/artifacts/namespaces/wongstack/tokens$`));
  assert.equal(JSON.parse(api.calls[0].init.body).repo, 'recipe-box');
  assert.equal(existsSync(p.file), true);
});

test('erase forgets the cached token, and store does nothing', async (t) => {
  const p = place(t);
  await ask(p, mints(minted('ab', NOW + DAY)));
  const api = offline();
  assert.equal(await ask(p, api, { operation: 'store', input: `${REQUEST}username=x\npassword=${secret('ab')}\n` }), '');
  assert.equal(existsSync(p.file), true);
  assert.equal(await ask(p, api, { operation: 'erase' }), '');
  assert.equal(existsSync(p.file), false);
  assert.equal(await ask(p, api, { operation: 'erase' }), '', 'erasing twice');
  assert.equal(api.calls.length, 0);
});

test('a refusal from Cloudflare names the status and its code, never the token', async (t) => {
  const p = place(t);
  await assert.rejects(ask(p, refuses()), (error) => {
    assert.ok(error instanceof CredentialError);
    assert.match(error.message, /HTTP 403/);
    assert.match(error.message, /10000/);
    assert.ok(!error.message.includes(CLOUDFLARE_TOKEN));
    return true;
  });
  assert.equal(existsSync(p.file), false);
});

test('an unreachable Cloudflare, or an answer that holds no token, is an error with nothing cached', async (t) => {
  const p = place(t);
  const noToken = cloudflare(() => Response.json({ success: true, errors: [], result: { plaintext: 'art_v1_short' } }));
  for (const api of [offline(), noToken, cloudflare(() => new Response('<html>', { status: 502 }))]) {
    await assert.rejects(ask(p, api), (error) => error instanceof CredentialError && !error.message.includes(CLOUDFLARE_TOKEN));
    assert.equal(api.calls.length, 1);
    assert.equal(existsSync(p.file), false);
  }
});

test('helperConfig scopes the helper and the path setting to the one account host', () => {
  const scope = `credential.https://${HOST}`;
  const config = new Map(helperConfig(ACCOUNT));
  assert.deepEqual([...config.keys()], [`${scope}.helper`, `${scope}.useHttpPath`]);
  assert.equal(config.get(`${scope}.useHttpPath`), 'true');
  assert.match(config.get(`${scope}.helper`), /artifacts-credential\.mjs/);
});

test('install points Git at the helper on an Artifacts checkout, and refuses any other', (t) => {
  const p = place(t);
  checkout(p);
  assert.equal(install(p.cwd), `https://${HOST}`);
  for (const [key, value] of helperConfig(ACCOUNT)) assert.equal(git(p.cwd, 'config', '--local', '--get', key), value);

  const other = place(t);
  checkout(other, 'https://github.com/someone/recipe-box.git');
  assert.throws(() => install(other.cwd), CredentialError);
  assert.equal(readFileSync(join(other.cwd, '.git', 'config'), 'utf8').includes('credential'), false);
});

test('the helper process answers Git on stdout, and says why on stderr when it can not', async (t) => {
  const p = place(t);
  checkout(p, 'https://github.com/someone/recipe-box.git');
  // No Cloudflare token and an address nothing listens on: this process can only answer from the cache.
  const env = { ...process.env, HOME: p.home, CLOUDFLARE_API_TOKEN: '', WONG_CLOUDFLARE_API: 'http://127.0.0.1:9' };
  const run = (args, input = '') => spawnSync(process.execPath, [script, ...args], { cwd: p.cwd, env, input, encoding: 'utf8' });

  const missing = run(['get'], REQUEST);
  assert.equal(missing.status, 1);
  assert.equal(missing.stdout, '');
  assert.match(missing.stderr, /^artifacts-credential: CLOUDFLARE_API_TOKEN is not set/);

  const today = Math.floor(Date.now() / 1000);
  await ask(p, mints(minted('ab', today + DAY)), { now: today });
  const cached = run(['get'], REQUEST);
  assert.equal(cached.status, 0, cached.stderr);
  assert.equal(cached.stdout, answer('ab', today + DAY));
  assert.equal(cached.stderr, '');

  const foreign = run(['get'], 'protocol=https\nhost=github.com\npath=someone/recipe-box.git\n');
  assert.equal(foreign.status, 0, foreign.stderr);
  assert.equal(foreign.stdout, '');

  const notArtifacts = run(['install', p.cwd]);
  assert.equal(notArtifacts.status, 1);
  assert.match(notArtifacts.stderr, /^artifacts-credential: this checkout is not an Artifacts install/);
});
