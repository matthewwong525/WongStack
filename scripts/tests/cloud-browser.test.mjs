// The cloud browser script, .agents/skills/browser/scripts/cloud-browser.mjs, against a fake Cloudflare that
// answers both the token API and the Browser Run WebSocket upgrade, and a fake agent-browser on PATH.
// Children run asynchronously, so the fake keeps answering.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { hostname, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { CHALLENGE_COOKIES, GROUP, acquire, classify, closeFrame, keepFor } from '../../.agents/skills/browser/scripts/cloud-browser.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.agents/skills/browser/scripts/cloud-browser.mjs');
const fixtures = join(repo, 'scripts/tests/fixtures');
const TOKEN = 'cf-user-secret-value';
const ACCOUNT = '0123456789abcdef0123456789abcdef';
const SESSION_ID = 'f9624b80-503f-4a5f-94a3-6132a6dbff36';
const BROWSER_RUN = { id: 'adddda876faa4a0590f1b23a038976e4', name: GROUP, scopes: ['com.cloudflare.api.account'] };
const GROUPS = [
  { id: '686d18d5ac6c441c867cbf6771e58a0a', name: 'API Tokens Write', scopes: ['com.cloudflare.api.user'] },
  { id: '5bc3f8b21c554832afc660159ab75fa4', name: 'Account API Tokens Write', scopes: ['com.cloudflare.api.account'] },
  { id: 'zone-browser-run', name: GROUP, scopes: ['com.cloudflare.api.account.zone'] },
  BROWSER_RUN,
];
const startingPolicies = () => [
  { id: 'p1', effect: 'allow', resources: { 'com.cloudflare.api.user.u1': '*' }, permission_groups: [{ id: GROUPS[0].id }] },
  { id: 'p2', effect: 'allow', resources: { [`com.cloudflare.api.account.${ACCOUNT}`]: '*' }, permission_groups: [{ id: GROUPS[1].id }] },
];
const sleep = ms => new Promise(done => setTimeout(done, ms));
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };

/** The masked client frames in `buffer`, each under 126 bytes: `{opcode, text}`. */
function frames(buffer) {
  const out = [];
  for (let at = 0; at + 6 <= buffer.length;) {
    const length = buffer[at + 1] & 0x7f;
    const mask = buffer.subarray(at + 2, at + 6);
    out.push({ opcode: buffer[at] & 0x0f, text: Buffer.from(buffer.subarray(at + 6, at + 6 + length).map((byte, i) => byte ^ mask[i % 4])).toString('utf8') });
    at += 6 + length;
  }
  return out;
}

/**
 * The fake Cloudflare. `upgradeStatus` answers every upgrade; `refusals` refuses that many with 403 first.
 * An accepted upgrade echoes each client frame back and records it in `received`.
 */
async function fakeCloudflare(t) {
  const state = { policies: startingPolicies(), condition: { request_ip: { in: ['192.0.2.1/32'] } }, puts: [], upgrades: [], received: [], sockets: new Set(), refusals: 0, refuseUntilPut: false, upgradeStatus: 101 };
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : undefined;
    const { pathname } = new URL(request.url, 'http://fake');
    const ok = result => response.end(JSON.stringify({ success: true, errors: [], result }));
    if (request.headers.authorization !== `Bearer ${TOKEN}`) return response.writeHead(401).end('{"success":false}');
    if (pathname === '/user/tokens/verify') return ok({ id: 'tok1', status: 'active' });
    if (pathname === '/user/tokens/permission_groups') return ok(GROUPS);
    if (pathname === '/user/tokens/tok1' && request.method === 'GET') return ok({ id: 'tok1', name: 'WongStack', status: 'active', policies: structuredClone(state.policies), condition: state.condition });
    if (pathname === '/user/tokens/tok1' && request.method === 'PUT') {
      state.puts.push(body);
      state.policies = body.policies;
      return ok({ id: 'tok1' });
    }
    response.writeHead(404).end('{"success":false}');
  });
  server.on('upgrade', (request, socket) => {
    state.sockets.add(socket);
    socket.on('close', () => state.sockets.delete(socket)).on('error', () => {});
    state.upgrades.push({ url: request.url, headers: request.headers });
    const held = state.policies.some(policy => policy.permission_groups.some(group => group.id === BROWSER_RUN.id));
    const refused = state.refusals > 0 || (state.refuseUntilPut && !held);
    if (state.refusals > 0) state.refusals--;
    const status = refused ? 403 : state.upgradeStatus;
    if (status !== 101) return socket.end(`HTTP/1.1 ${status} Refused\r\nContent-Length: 0\r\n\r\n`);
    const accept = createHash('sha1').update(`${request.headers['sec-websocket-key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\ncf-browser-session-id: ${SESSION_ID}\r\n\r\n`);
    socket.on('data', chunk => {
      for (const { opcode, text } of frames(chunk)) {
        if (opcode === 8) return socket.end(Buffer.from([0x88, 0]));
        state.received.push({ url: request.url, text });
        socket.write(Buffer.concat([Buffer.from([0x81, Buffer.byteLength(text)]), Buffer.from(text)]));
      }
    });
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => { for (const socket of state.sockets) socket.destroy(); server.close(); });
  return { state, api: `http://127.0.0.1:${server.address().port}` };
}

// A HOME of its own, a fake agent-browser first on PATH that logs each call, and a runner for the script.
function fixture(t, fake) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-cloud-browser-'));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const file = name => join(root, name);
  writeFileSync(join(bin, 'agent-browser'), `#!${process.execPath}
const fs = require('node:fs');
const file = name => ${JSON.stringify(root)} + '/' + name;
const args = process.argv.slice(2);
fs.appendFileSync(file('calls.log'), JSON.stringify(args) + '\\n');
const rest = args.filter((arg, i) => !['--session', '--cdp'].includes(arg) && !['--session', '--cdp'].includes(args[i - 1]));
const read = name => fs.readFileSync(file(name), 'utf8');
if (rest[0] === 'session') console.log(JSON.stringify({ success: true, data: { sessions: JSON.parse(read('sessions')) } }));
else if (rest[0] === 'get' && rest[1] === 'title') { const n = Number(fs.existsSync(file('reads')) ? read('reads') : 0); fs.writeFileSync(file('reads'), String(n + 1)); console.log(n >= Number(read('clears-after')) ? 'Menu' : read('title')); }
else if (rest[0] === 'get' && rest[1] === 'text') console.log(read('text'));
else if (rest[0] === 'state' && rest[1] === 'save') fs.copyFileSync(${JSON.stringify(join(fixtures, 'browser-state.json'))}, rest[2]);
else if (rest[0] === 'state' && rest[1] === 'load') { if (fs.existsSync(file('fail-load'))) { console.error('✗ load failed'); process.exit(1); } fs.copyFileSync(rest[2], file('loaded.json')); }
`);
  chmodSync(join(bin, 'agent-browser'), 0o755);
  writeFileSync(file('sessions'), '["default"]');
  writeFileSync(file('clears-after'), '99');
  const env = { ...process.env, HOME: root, PATH: `${bin}:${process.env.PATH}`, CLOUDFLARE_API_TOKEN: TOKEN, CLOUDFLARE_ACCOUNT_ID: ACCOUNT, WONG_CLOUDFLARE_API: fake?.api ?? 'http://127.0.0.1:9', CLOUD_BROWSER_GRACE_MS: '100', CLOUD_BROWSER_HOLD_MS: '300' };
  const run = (...args) => new Promise(done => execFile(process.execPath, [script, ...args], { cwd: root, env, encoding: 'utf8', timeout: 30_000 }, (error, stdout, stderr) => done({ status: error ? error.code : 0, stdout, stderr })));
  const sessions = join(root, '.wong-stack/cloud-browser');
  t.after(async () => {
    await run('close');
    rmSync(root, { recursive: true, force: true });
  });
  return {
    root, file, run, sessions,
    set: (name, value) => writeFileSync(file(name), value),
    calls: () => (existsSync(file('calls.log')) ? readFileSync(file('calls.log'), 'utf8').trim().split('\n').map(line => JSON.parse(line)) : []),
    session: name => JSON.parse(readFileSync(join(sessions, `${name}.json`), 'utf8')),
  };
}

/** Runs `open`, asserts it worked, and returns its CDP address, session name, and bridge pid. */
async function opened(f, ...args) {
  const out = await f.run('open', ...args);
  assert.equal(out.status, 0, out.stderr);
  const cdp = /^CLOUD_BROWSER_CDP=(ws:\/\/127\.0\.0\.1:\d+\/[0-9a-f]{48})$/m.exec(out.stdout)?.[1];
  const name = /^CLOUD_BROWSER_SESSION=(cloud-\d+)$/m.exec(out.stdout)?.[1];
  assert.ok(cdp && name, out.stdout);
  return { out, cdp, name, pid: f.session(name).pid };
}

/** Connects a WebSocket client to the bridge and resolves once it is open. */
function client(url) {
  const socket = new WebSocket(url);
  return new Promise((resolve, reject) => {
    socket.onopen = () => resolve(socket);
    socket.onerror = () => reject(new Error('refused'));
  });
}

const until = async (check, ms = 5000) => {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(25)) if (check()) return true;
  return check();
};

// ── open and the bridge ─────────────────────────────────────────────────────

test('open bridges agent-browser to Browser Run with the token added, and the token appears nowhere else', async t => {
  const fake = await fakeCloudflare(t);
  const f = fixture(t, fake);
  const { out, cdp, name, pid } = await opened(f);
  assert.equal(name, 'cloud-1');
  const socket = await client(cdp);
  const echoed = new Promise(done => { socket.onmessage = event => done(event.data); });
  socket.send('{"id":7,"method":"Target.getTargets"}');
  assert.equal(await echoed, '{"id":7,"method":"Target.getTargets"}');
  const [acquired, bridged] = fake.state.upgrades;
  assert.equal(acquired.url, `/accounts/${ACCOUNT}/browser-run/devtools/browser?keep_alive=600000`);
  assert.equal(bridged.url, `/accounts/${ACCOUNT}/browser-run/devtools/browser/${SESSION_ID}?keep_alive=600000`);
  assert.equal(bridged.headers.authorization, `Bearer ${TOKEN}`);
  for (const text of [out.stdout, out.stderr, readFileSync(join(f.sessions, `${name}.json`), 'utf8'), cdp]) assert.ok(!text.includes(TOKEN));
  if (existsSync(`/proc/${pid}/cmdline`)) assert.ok(!readFileSync(`/proc/${pid}/cmdline`, 'utf8').includes(TOKEN));
  socket.close();
});

test('the bridge refuses a wrong secret path and answers no plain request', async t => {
  const fake = await fakeCloudflare(t);
  const f = fixture(t, fake);
  const { cdp } = await opened(f);
  const port = Number(new URL(cdp).port);
  await assert.rejects(client(`ws://127.0.0.1:${port}/${'0'.repeat(48)}`), /refused/);
  await assert.rejects(client(`ws://127.0.0.1:${port}/`), /refused/);
  assert.equal((await fetch(new URL(cdp).href.replace('ws:', 'http:'))).status, 404);
  assert.equal(fake.state.upgrades.length, 1, 'only the acquire reached Cloudflare');
});

test('close ends the bridge and closes the browser upstream', async t => {
  const fake = await fakeCloudflare(t);
  const f = fixture(t, fake);
  const { cdp, name, pid } = await opened(f);
  const socket = await client(cdp);
  const out = await f.run('close');
  assert.match(out.stdout, /^CLOUD_BROWSER_CLOSED=cloud-1$/m);
  assert.ok(await until(() => !alive(pid)));
  assert.ok(!existsSync(join(f.sessions, `${name}.json`)));
  assert.ok(fake.state.received.some(frame => frame.url.includes(SESSION_ID) && JSON.parse(frame.text).method === 'Browser.close'));
  assert.ok(await until(() => socket.readyState === WebSocket.CLOSED), 'the client socket closed');
});

test('the bridge ends when its last client leaves, and not before one connected', async t => {
  const fake = await fakeCloudflare(t);
  const f = fixture(t, fake);
  const { cdp, pid } = await opened(f);
  await sleep(300);
  assert.ok(alive(pid), 'no client yet, so the bridge waits');
  const first = await client(cdp);
  const second = await client(cdp);
  first.close();
  await sleep(300);
  assert.ok(alive(pid), 'one client is still connected');
  second.close();
  assert.ok(await until(() => !alive(pid)));
  assert.ok(fake.state.received.some(frame => JSON.parse(frame.text).method === 'Browser.close'));
});

test('the bridge ends at its deadline with no client', async t => {
  const fake = await fakeCloudflare(t);
  const f = fixture(t, fake);
  const { name, pid } = await opened(f, '--minutes', '0.005');
  assert.ok(await until(() => !alive(pid)));
  assert.ok(!existsSync(join(f.sessions, `${name}.json`)));
  assert.ok(fake.state.received.some(frame => JSON.parse(frame.text).method === 'Browser.close'));
});

test('a second open gets the next session name', async t => {
  const fake = await fakeCloudflare(t);
  const f = fixture(t, fake);
  await opened(f);
  assert.equal((await opened(f)).name, 'cloud-2');
  assert.match((await f.run('close')).stdout, /^CLOUD_BROWSER_CLOSED=cloud-1,cloud-2$/m);
});

test('closeFrame is one masked Browser.close text frame', () => {
  assert.deepEqual(frames(closeFrame()).map(frame => ({ ...frame, text: JSON.parse(frame.text) })), [{ opcode: 1, text: { id: 1, method: 'Browser.close' } }]);
});

// ── the one-group widen ─────────────────────────────────────────────────────

test('a first 403 widens the token by Browser Run Write alone, keeping every policy, and waits out propagation', async t => {
  const fake = await fakeCloudflare(t);
  fake.state.refuseUntilPut = true;
  fake.state.refusals = 3;
  const sleeps = [];
  const result = await acquire({ api: fake.api, token: TOKEN, account: ACCOUNT, wait: async ms => { sleeps.push(ms); } });
  assert.deepEqual(result, { sessionId: SESSION_ID, granted: true });
  assert.deepEqual(sleeps, [2000, 4000, 8000]);
  const [put] = fake.state.puts;
  assert.equal(fake.state.puts.length, 1);
  const expected = startingPolicies();
  expected[1].permission_groups.push({ id: BROWSER_RUN.id });
  assert.deepEqual(put.policies, expected);
  assert.deepEqual(put.condition, fake.state.condition);
});

test('a token that already holds the group is not widened again, and a final refusal names the permission', async t => {
  const fake = await fakeCloudflare(t);
  fake.state.policies[1].permission_groups.push({ id: BROWSER_RUN.id });
  fake.state.refusals = 99;
  const sleeps = [];
  await assert.rejects(acquire({ api: fake.api, token: TOKEN, account: ACCOUNT, wait: async ms => { sleeps.push(ms); } }), error => error.kind === 'refused' && error.message.includes('Browser Run Write (Account)'));
  assert.deepEqual(fake.state.puts, []);
  assert.deepEqual(sleeps, [2000, 4000, 8000, 15000, 30000]);
});

test('a widen Cloudflare refuses stops at once and names the permission', async t => {
  const fake = await fakeCloudflare(t);
  fake.state.refusals = 99;
  await assert.rejects(acquire({ api: fake.api, token: 'another-token', account: ACCOUNT, wait: async () => assert.fail('no wait') }), error => error.kind === 'refused' && /Browser Run Write/.test(error.message));
});

test('open reports the group it granted, and a used-up allowance in plain words', async t => {
  const fake = await fakeCloudflare(t);
  fake.state.refuseUntilPut = true;
  const f = fixture(t, fake);
  const { out } = await opened(f);
  assert.match(out.stdout, /^CLOUD_BROWSER_GRANTED=Browser Run Write$/m);
  fake.state.upgradeStatus = 429;
  const quota = await f.run('open');
  assert.equal(quota.status, 3);
  assert.match(quota.stdout, /^CLOUD_BROWSER_QUOTA=used-up$/m);
  assert.match(quota.stderr, /10 minutes a day/);
});

test('open stops with a plain reason when Cloudflare is unreachable', async t => {
  const f = fixture(t, null);
  const out = await f.run('open');
  assert.equal(out.status, 1);
  assert.match(out.stderr, /Could not reach Cloudflare/);
});

// ── block detection ─────────────────────────────────────────────────────────

test('classify tells Cloudflare\'s check, its block page, and error 1020 from an ordinary page', () => {
  const { pages } = JSON.parse(readFileSync(join(fixtures, 'browser-pages.json'), 'utf8'));
  for (const page of pages) assert.equal(classify(page), page.expect, page.name);
  assert.equal(classify({}), 'none');
});

test('check counts a check only once it holds, and reads only the title and text', async t => {
  const f = fixture(t, null);
  const [challenge, , , ordinary] = JSON.parse(readFileSync(join(fixtures, 'browser-pages.json'), 'utf8')).pages;
  f.set('title', challenge.title);
  f.set('text', challenge.text);
  assert.match((await f.run('check')).stdout, /^BROWSER_BLOCKED=check$/m);
  f.set('reads', '0');
  f.set('clears-after', '1');
  f.set('text', ordinary.text);
  assert.match((await f.run('check', '--session', 'task')).stdout, /^BROWSER_BLOCKED=none$/m);
  const reads = f.calls().map(args => args.filter(arg => arg !== '--session' && arg !== 'task').slice(0, 2).join(' '));
  assert.deepEqual([...new Set(reads)], ['get title', 'get text']);
});

// ── login carry-over ────────────────────────────────────────────────────────

test('keepFor keeps the named sites and their subdomains, never another site or a check cookie', () => {
  const state = JSON.parse(readFileSync(join(fixtures, 'browser-state.json'), 'utf8'));
  const kept = keepFor(state, ['www.ubereats.com', 'uber.com']);
  assert.deepEqual(kept.cookies.map(cookie => `${cookie.domain} ${cookie.name}`), ['.ubereats.com sid', 'www.ubereats.com uev2.loc', 'auth.uber.com sid', '.uber.com jwt-session']);
  assert.deepEqual(kept.origins.map(origin => origin.origin), ['https://www.ubereats.com']);
  for (const name of ['cf_clearance', '__cf_bm', 'cf_chl_rc_m', '_abck', 'bm_sz', 'datadome', '_px3', '_pxvid', 'incap_ses_1234_567', 'visid_incap_567']) {
    assert.ok(CHALLENGE_COOKIES.some(pattern => pattern.test(name)), name);
  }
});

/** Writes an open cloud session's record, as `open` does, without a bridge. */
const cloudSession = f => {
  mkdirSync(f.sessions, { recursive: true });
  writeFileSync(join(f.sessions, 'cloud-1.json'), JSON.stringify({ cdp: 'ws://127.0.0.1:9/secret', port: 9, deadline: Date.now() + 60_000, pid: 999_999_999 }));
};

test('carry-in moves only the named sites into the cloud session and deletes its private copy', async t => {
  const f = fixture(t, null);
  cloudSession(f);
  const out = await f.run('carry-in', '--site', 'ubereats.com', '--site', 'uber.com');
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /^CARRY=done$/m);
  const loaded = JSON.parse(readFileSync(f.file('loaded.json'), 'utf8'));
  assert.deepEqual(loaded, keepFor(JSON.parse(readFileSync(join(fixtures, 'browser-state.json'), 'utf8')), ['ubereats.com', 'uber.com']));
  const [save, load] = f.calls().filter(args => args.includes('state'));
  assert.deepEqual(save.slice(0, 4), ['--session', 'default', 'state', 'save']);
  assert.deepEqual(load.slice(0, 6), ['--session', 'cloud-1', '--cdp', 'ws://127.0.0.1:9/secret', 'state', 'load']);
  assert.ok(!existsSync(dirname(save[4])) && !existsSync(dirname(load[6])));
});

test('carry-back moves the refreshed login the other way, and a site with nothing to carry loads nothing', async t => {
  const f = fixture(t, null);
  cloudSession(f);
  assert.match((await f.run('carry-back', '--site', 'ubereats.com', '--from', 'personal')).stdout, /^CARRY=done$/m);
  const [save, load] = f.calls().filter(args => args.includes('state'));
  assert.deepEqual(save.slice(0, 2), ['--session', 'cloud-1']);
  assert.deepEqual(load.slice(0, 2), ['--session', 'personal']);
  assert.match((await f.run('carry-in', '--site', 'nothing.example')).stdout, /^CARRY=none$/m);
  assert.equal(f.calls().filter(args => args.includes('load')).length, 1);
});

test('a load that fails still deletes the private copy', async t => {
  const f = fixture(t, null);
  cloudSession(f);
  f.set('fail-load', '');
  const out = await f.run('carry-in', '--site', 'ubereats.com');
  assert.equal(out.status, 1);
  assert.match(out.stderr, /load failed/);
  const load = f.calls().find(args => args.includes('load'));
  assert.ok(!existsSync(dirname(load.at(-1))));
});

test('a personal profile another browser holds gives busy, and its lock is left alone', async t => {
  const f = fixture(t, null);
  cloudSession(f);
  const profile = join(f.root, 'profile');
  mkdirSync(profile);
  mkdirSync(join(f.root, '.agent-browser'));
  writeFileSync(join(f.root, '.agent-browser/config.json'), JSON.stringify({ profile }));
  symlinkSync(`${hostname()}-${process.pid}`, join(profile, 'SingletonLock'));
  f.set('sessions', '["walk-1"]');
  assert.match((await f.run('carry-in', '--site', 'ubereats.com')).stdout, /^CARRY=busy$/m);
  assert.ok(f.calls().every(args => !args.includes('state')));
  assert.equal(readFileSync(join(f.root, '.agent-browser/config.json'), 'utf8'), JSON.stringify({ profile }));
  assert.ok(lstatSync(join(profile, 'SingletonLock')).isSymbolicLink());
  f.set('sessions', '["default"]');
  assert.match((await f.run('carry-in', '--site', 'ubereats.com')).stdout, /^CARRY=done$/m, 'the personal session holds its own lock');
});

test('carry needs a site and one open cloud session', async t => {
  const f = fixture(t, null);
  assert.equal((await f.run('carry-in')).status, 2);
  const none = await f.run('carry-in', '--site', 'ubereats.com');
  assert.equal(none.status, 1);
  assert.match(none.stderr, /No cloud session is open/);
});

// ── the setting ─────────────────────────────────────────────────────────────

test('first reads local by default, and sets either value keeping other keys', async t => {
  const f = fixture(t, null);
  assert.match((await f.run('first')).stdout, /^BROWSER_FIRST=local$/m);
  mkdirSync(join(f.root, '.wong-stack'));
  writeFileSync(join(f.root, '.wong-stack/browser.json'), JSON.stringify({ other: 1 }));
  assert.match((await f.run('first', 'cloud')).stdout, /^BROWSER_FIRST=cloud$/m);
  assert.deepEqual(JSON.parse(readFileSync(join(f.root, '.wong-stack/browser.json'), 'utf8')), { other: 1, first: 'cloud' });
  assert.match((await f.run('first', 'local')).stdout, /^BROWSER_FIRST=local$/m);
  assert.equal((await f.run('first', 'sideways')).status, 2);
});
