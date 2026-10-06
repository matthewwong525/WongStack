import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { finished, globToRegExp, keyMatches, servePage, tunnelOrigin } from '../../.agents/skills/hand-over/scripts/hand-over.mjs';
import { fakeTunnel, ORIGIN, TUNNEL_ENV } from './fixtures/fake-tunnel.mjs';

const legacyOutput = text => text.replace(/^HANDOVER_(COMPLETION|NOTIFICATION)=.*\n/gm, '');
const legacyResult = ({ completionId: _completionId, notification: _notification, ready: _ready, ...result }) => result;
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.agents/skills/hand-over/scripts/hand-over.mjs');
const KEY = /#key=([0-9a-f]{64})$/m;
const PAGE = 'https://pay.example.com/card';
const RECEIPT = 'https://pay.example.com/receipt/81';

// A card form as the agent writes it from its snapshot. The typed values hold letters no key, port, or
// completion id can, so a search for one never matches by chance.
const CARD = {
  title: 'Pay City of Markham',
  note: '$45.00 · ticket P0178390',
  fields: [
    { label: 'Card number', kind: 'cc-number', target: '@e12' },
    { label: 'Expiry month', kind: 'cc-exp-month', target: '@e13', options: [{ value: '03', text: '03 - March' }, { value: '04' }] },
    { label: 'Expiry year', kind: 'cc-exp-year', target: '@e14', options: [{ value: '2028' }] },
    { label: 'Security code', kind: 'cc-csc', target: '#cvv' },
  ],
  submit: { label: 'Pay $45.00', target: '@e31' },
};
const NUMBER = '4242 XKCD 4242 QWZP';
const CODE = 'ZQ7';
const VALUES = [NUMBER, '03', '2028', CODE];
const FILL = ['fill @e12', 'focus @e12', 'get value @e13', 'select @e13 03', 'get value @e14', 'select @e14 2028', 'fill #cvv', 'focus #cvv'].map(line => `agent-browser ${line}`);
const CLEAR = ['fill @e12', 'select @e13', 'select @e14', 'fill #cvv'].map(line => `agent-browser ${line}`);

// A HOME of its own, and a fake cloudflared and agent-browser first on PATH that log each call to one
// file in order. The fakes print the real shapes recorded from cloudflared 2026.9.3 and agent-browser
// 0.38.1. The test sets the live-feed port, the page address, and the element count through files;
// `click-url` and `click-count` are what a click moves them to, as a site that accepts a payment does.
// A `fail-select` file fails each dropdown pick, `fail-click` the click, and `hold-fill` and `hold-click`
// hold those commands until removed. With `checkout`, commands run in a Git checkout of their own that
// declares MAPS_API_KEY, for a key link.
function fixture(t, { cloudflared = true, silent = false, paseo = null, agentId, checkout = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-hand-over-'));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const cwd = checkout ? join(root, 'repo') : undefined;
  if (cwd) {
    mkdirSync(cwd);
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd, stdio: 'ignore' });
    writeFileSync(join(cwd, '.gitignore'), '.env*\n!.env.example\n');
    writeFileSync(join(cwd, '.env.example'), '# The Maps key.\nMAPS_API_KEY=\n');
  }
  const calls = join(root, 'calls.log');
  const file = name => join(root, name);
  writeFileSync(join(bin, 'agent-browser'), `#!/bin/sh
echo "agent-browser $*" >> "${calls}"
case "$1 $2" in
  "stream status")
    if [ -e "${file('stream-off')}" ]; then echo '{"success":true,"data":{"connected":true,"enabled":false,"port":null},"error":null}'
    else printf '{"success":true,"data":{"connected":true,"enabled":true,"port":%s},"error":null}\\n' "$(cat "${file('stream-port')}")"; fi ;;
  "stream enable") rm -f "${file('stream-off')}"; echo "✓ Streaming enabled" ;;
  "get url") cat "${file('url')}" ;;
  "get count") cat "${file('count')}" ;;
  "get value") echo '' ;;
  "fill "*) while [ -e "${file('hold-fill')}" ]; do sleep 0.01; done; echo '✓ Done' ;;
  "focus "*) echo '✓ Done' ;;
  "select "*) [ -e "${file('fail-select')}" ] && exit 1; echo '✓ Done' ;;
  "click "*)
    while [ -e "${file('hold-click')}" ]; do sleep 0.01; done
    [ -e "${file('fail-click')}" ] && exit 1
    [ -e "${file('click-url')}" ] && cat "${file('click-url')}" > "${file('url')}"
    [ -e "${file('click-count')}" ] && cat "${file('click-count')}" > "${file('count')}"
    echo '✓ Done' ;;
esac
`);
  chmodSync(join(bin, 'agent-browser'), 0o755);
  if (cloudflared) fakeTunnel(bin, calls, { pidFile: file('tunnel.pid'), silent });
  writeFileSync(file('url'), `${PAGE}\n`);
  writeFileSync(file('count'), '1\n');
  writeFileSync(file('stream-port'), '9\n');
  writeFileSync(file('form.json'), JSON.stringify(CARD));
  // Without cloudflared, PATH is the fake bin alone, so it carries the tools the fake uses.
  if (!cloudflared) for (const tool of ['cat', 'rm', 'sleep']) symlinkSync(spawnSync('sh', ['-c', `command -v ${tool}`], { encoding: 'utf8' }).stdout.trim(), join(bin, tool));
  if (paseo) {
    writeFileSync(join(bin, 'paseo'), `#!${process.execPath}
const fs = require('node:fs');
fs.appendFileSync(${JSON.stringify(file('sent.jsonl'))}, JSON.stringify(process.argv.slice(2)) + '\\n');
${paseo === 'fail' ? 'process.exit(1);' : paseo === 'timeout' ? 'setTimeout(() => {}, 10000);' : paseo === 'invalid' ? "console.log('{}');" : "console.log(JSON.stringify({agentId: process.argv[3], status: 'sent'}));"}
`);
    chmodSync(join(bin, 'paseo'), 0o755);
  }
  const env = { ...process.env, ...TUNNEL_ENV, PASEO_AGENT_ID: agentId ?? (paseo ? 'a-full-workspace-id' : ''), PASEO_HOME: '', PASEO_HOST: '', HOME: root, PATH: cloudflared ? `${bin}:/usr/bin:/bin` : bin, HANDOVER_POLL_MS: '50', HANDOVER_SEND_WAIT_MS: '400' };
  const run = (...args) => { const out = spawnSync(process.execPath, [script, ...args], { cwd, env, encoding: 'utf8', timeout: 30_000 }); return { ...out, rawStdout: out.stdout, stdout: legacyOutput(out.stdout) }; };
  /** Runs a command beside the test, so the test's own servers keep answering; resolves to its status and output. */
  const start = (...args) => {
    const child = spawn(process.execPath, [script, ...args], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    const out = { stdout: '', stderr: '' };
    for (const name of ['stdout', 'stderr']) child[name].on('data', chunk => { out[name] += chunk; });
    return new Promise(done => child.on('close', status => done({ ...out, status, rawStdout: out.stdout, stdout: legacyOutput(out.stdout) })));
  };
  const state = join(root, '.wong-stack/hand-over');
  t.after(() => {
    for (const name of ['hold-fill', 'hold-click']) rmSync(file(name), { force: true });
    run('close');
    const pid = Number(existsSync(file('tunnel.pid')) && readFileSync(file('tunnel.pid'), 'utf8'));
    if (pid) try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ }
    rmSync(root, { recursive: true, force: true });
  });
  const logged = () => (existsSync(calls) ? readFileSync(calls, 'utf8').trim().split('\n').map(line => line.trimEnd()).filter(line => line && !line.endsWith('--version')) : []);
  return {
    run,
    start,
    env,
    cwd,
    state,
    form: file('form.json'),
    sent: () => existsSync(file('sent.jsonl')) ? readFileSync(file('sent.jsonl'), 'utf8').trim().split('\n').map(JSON.parse) : [],
    set: (name, value) => writeFileSync(file(name), `${value}\n`),
    unset: name => rmSync(file(name), { force: true }),
    calls: logged,
    browserCalls: () => logged().filter(line => line.startsWith('agent-browser')),
    stateFiles: () => (existsSync(state) ? readdirSync(state).map(name => readFileSync(join(state, name), 'utf8')).join('\n') : ''),
    tunnelPid: () => Number(readFileSync(file('tunnel.pid'), 'utf8')),
    result: () => legacyResult(JSON.parse(readFileSync(join(state, 'result.json'), 'utf8'))),
  };
}

const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
const answers = port => fetch(`http://127.0.0.1:${port}/`).then(response => response.ok, () => false);
const pause = ms => new Promise(done => setTimeout(done, ms));

/** Runs `open`, asserts it worked, and returns its link, the key, and the page's recorded loopback port. */
function opened(f, ...args) {
  const out = f.run('open', ...args);
  assert.equal(out.status, 0, out.stderr);
  const link = /^HANDOVER_LINK=(.+)$/m.exec(out.stdout)?.[1];
  assert.ok(link, out.stdout);
  return { link, key: KEY.exec(link)?.[1], port: JSON.parse(readFileSync(join(f.state, 'state.json'), 'utf8')).port };
}

/** Opens a private form on the fixture's card page, finishing at the receipt. */
const openedForm = (f, ...args) => opened(f, '--form', f.form, ...(args.length ? args : ['--until', '**/receipt/*']));

/** Calls a route with the key header unless `key` is null; resolves to the status and JSON. */
async function route(port, key, path, body) {
  const response = await fetch(`http://127.0.0.1:${port}/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: key === null ? {} : { 'x-hand-over-key': key },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, json: text ? JSON.parse(text) : null };
}

async function eventually(job) {
  const end = Date.now() + 5000;
  while (Date.now() < end) { const value = await job(); if (value) return value; await pause(25); }
  assert.fail('condition did not complete');
}

/**
 * A stand-in for agent-browser's live feed: a WebSocket server that records each JSON message a client
 * sends and the request that opened it. `typed()` is every pressed key's text, in order.
 */
async function fakeFeed(t, f) {
  const messages = [];
  const requests = [];
  const sockets = new Set();
  const server = createServer();
  server.on('upgrade', (request, socket) => {
    requests.push({ url: request.url, headers: request.headers });
    sockets.add(socket);
    const accept = createHash('sha1').update(`${request.headers['sec-websocket-key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    let pending = Buffer.alloc(0);
    socket.on('error', () => {}).on('data', chunk => {
      pending = Buffer.concat([pending, chunk]);
      // Client frames are masked; every message here is under 64 KB, so a 7-bit or 16-bit length.
      for (;;) {
        if (pending.length < 2) return;
        const long = (pending[1] & 0x7f) === 126;
        if (long && pending.length < 4) return;
        const length = long ? pending.readUInt16BE(2) : pending[1] & 0x7f;
        const start = (long ? 4 : 2) + 4;
        if (pending.length < start + length) return;
        const mask = pending.subarray(start - 4, start);
        const payload = Buffer.from(pending.subarray(start, start + length).map((byte, index) => byte ^ mask[index % 4]));
        const opcode = pending[0] & 0x0f;
        pending = pending.subarray(start + length);
        if (opcode === 1) messages.push(JSON.parse(payload.toString('utf8')));
        if (opcode === 8) socket.end();
      }
    });
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => { for (const socket of sockets) socket.destroy(); server.close(); });
  f.set('stream-port', server.address().port);
  return { messages, requests, typed: () => messages.filter(message => message.eventType === 'keyDown').map(message => message.text).join('') };
}

/** Sends the card form's values; `moves` is whether the site goes to its receipt on the click. */
function send(f, { port, key }, { moves = true } = {}) {
  if (moves) f.set('click-url', RECEIPT);
  return route(port, key, 'send', { values: VALUES });
}

// ---------------------------------------------------------------------------
// Opening a link

test('open tunnels to its own page and prints a keyed Cloudflare link, touching no browser page for a password link', async t => {
  const f = fixture(t);
  const { link, port, key } = opened(f, '--passwords');
  assert.match(link, new RegExp(`^${ORIGIN}/#key=[0-9a-f]{64}$`));
  const calls = f.calls();
  assert.equal(calls.length, 1, calls.join('\n'));
  assert.match(calls[0], new RegExp(`^cloudflared tunnel --no-autoupdate --config \\S+cloudflared\\.yml --url http://127\\.0\\.0\\.1:${port}$`));
  assert.ok(await answers(port), 'the tunnel points at the page');
  const statePath = join(f.state, 'state.json');
  assert.equal(statSync(statePath).mode & 0o777, 0o600);
  assert.equal(JSON.parse(readFileSync(statePath, 'utf8')).key, key);
});

test('the link prints only once its public address answers', async t => {
  const f = fixture(t);
  let asked = 0;
  const outside = createServer((request, response) => { asked++; response.writeHead(asked < 3 ? 530 : 200).end(); });
  await new Promise(done => outside.listen(0, '127.0.0.1', done));
  t.after(() => outside.close());
  f.env.HANDOVER_PROBE_ORIGIN = `http://127.0.0.1:${outside.address().port}`;
  const out = await f.start('open', '--passwords');
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, new RegExp(`^HANDOVER_LINK=${ORIGIN}/#key=[0-9a-f]{64}$`, 'm'));
  assert.equal(asked, 3, 'two Cloudflare error pages, then the page');
});

test('an address that never answers fails as a tunnel that never registers does, and tears down', async t => {
  for (const silent of [false, true]) {
    const f = fixture(t, { silent });
    const outside = createServer((request, response) => response.writeHead(530).end());
    await new Promise(done => outside.listen(0, '127.0.0.1', done));
    t.after(() => outside.close());
    Object.assign(f.env, { HANDOVER_PROBE_ORIGIN: `http://127.0.0.1:${outside.address().port}`, HANDOVER_TUNNEL_WAIT_MS: '700' });
    const out = await f.start('open', '--passwords');
    assert.equal(out.status, 1, `silent ${silent}`);
    assert.match(out.stderr, /The Cloudflare tunnel did not come up within 30 seconds/);
    assert.doesNotMatch(out.stdout, /HANDOVER_LINK/);
    assert.ok(!alive(f.tunnelPid()), 'the tunnel was killed');
    assert.ok(!existsSync(join(f.state, 'watcher.pid')));
    assert.deepEqual(f.result(), { result: 'error' });
  }
});

test('missing cloudflared exits 3 for every link, having started nothing', t => {
  const f = fixture(t, { cloudflared: false });
  for (const args of [['--form', f.form, '--until', '**/receipt/*'], ['--passwords']]) {
    const out = f.run('open', ...args);
    assert.equal(out.status, 3, args[0]);
    assert.match(out.stdout, /^HANDOVER_NEEDS=cloudflared$/m);
  }
  assert.deepEqual(f.calls(), []);
  assert.ok(!existsSync(join(f.state, 'watcher.pid')));
});

test('each link gets its own key', t => {
  const f = fixture(t);
  const first = opened(f, '--passwords').key;
  f.run('close');
  assert.notEqual(opened(f, '--passwords').key, first);
});

test('a second open is refused while a link is open', t => {
  const f = fixture(t);
  openedForm(f);
  const before = f.calls().length;
  for (const args of [['--passwords'], ['--form', f.form, '--until', '**/receipt/*']]) {
    const again = f.run('open', ...args);
    assert.equal(again.status, 1);
    assert.match(again.stderr, /already open/);
  }
  assert.equal(f.calls().length, before, 'the refused opens touched nothing');
});

test('wait and close with nothing open say so', t => {
  const f = fixture(t);
  assert.equal(f.run('wait').status, 1);
  const close = f.run('close');
  assert.equal(close.status, 0);
  assert.match(close.stderr, /No private link is open/);
});

test('a bad --minutes or command, no mode, two modes, or a removed flag is a usage error', t => {
  const f = fixture(t);
  assert.equal(f.run('open', '--passwords', '--minutes', '0').status, 2);
  assert.equal(f.run('launch').status, 2);
  assert.equal(f.run().status, 2);
  const bare = f.run('open');
  assert.equal(bare.status, 2);
  assert.match(bare.stderr, /open takes one of --form, --passwords, or --keys/);
  assert.equal(f.run('open', '--until', '**/inbox').status, 2, 'a finish alone is no mode');
  assert.equal(f.run('open', '--passwords', '--form', f.form, '--until', '**').status, 2);
  assert.equal(f.run('open', '--passwords', '--local').status, 2, 'the loopback link is gone');
  assert.match(f.run('--help').stdout, /open --form <file>/);
  assert.deepEqual(f.calls(), []);
});

test('--form needs a finish, and a finish goes with --form only', t => {
  const f = fixture(t);
  const none = f.run('open', '--form', f.form);
  assert.equal(none.status, 2);
  assert.match(none.stderr, /--form needs --until or --until-gone/);
  for (const args of [['--passwords', '--until', '**'], ['--passwords', '--until-gone', '#x'], ['--keys', 'MAPS_API_KEY', '--until', '**']]) {
    const out = f.run('open', ...args);
    assert.equal(out.status, 2, args.join(' '));
    assert.match(out.stderr, /--until and --until-gone go with --form only/);
  }
  assert.deepEqual(f.calls(), []);
});

test('--site and --username go only with --passwords, and only as a website and one line', t => {
  const f = fixture(t);
  for (const args of [['--site', 'netflix.com'], ['--username', 'me'], ['--keys', 'MAPS_API_KEY', '--site', 'netflix.com'], ['--passwords', '--site', 'not a site'], ['--passwords', '--site', 'ftp://netflix.com'], ['--passwords', '--username', ' '], ['--passwords', '--username', 'me\nyou']]) {
    const out = f.run('open', ...args);
    assert.equal(out.status, 2, args.join(' '));
    assert.match(out.stderr, /usage:/);
  }
  assert.deepEqual(f.calls(), []);
  assert.ok(!existsSync(join(f.state, 'watcher.pid')));
});

test('--site and --username ride URL-encoded in the link\'s fragment beside the key, and nowhere else', async t => {
  const f = fixture(t);
  const out = f.run('open', '--passwords', '--site', 'https://www.netflix.com/login', '--username', 'me+1@x.com');
  assert.equal(out.status, 0, out.stderr);
  const link = new URL(/^HANDOVER_LINK=(.+)$/m.exec(out.stdout)[1]);
  assert.equal(link.origin, ORIGIN);
  assert.match(link.hash, /^#key=[0-9a-f]{64}&site=https%3A%2F%2Fwww\.netflix\.com%2Flogin&user=me%2B1%40x\.com$/);
  const fragment = new URLSearchParams(link.hash.slice(1));
  assert.equal(fragment.get('site'), 'https://www.netflix.com/login');
  assert.equal(fragment.get('user'), 'me+1@x.com');
  assert.ok(!/netflix|me\+1/.test(f.stateFiles()), 'the watcher\'s files hold neither');
  assert.equal(f.run('close').status, 0);
  assert.match(opened(f, '--passwords').link, /#key=[0-9a-f]{64}$/, 'no flags, no extra fragment');
});

test('the pure helpers follow agent-browser\'s glob and the recorded output shapes', () => {
  assert.ok(globToRegExp('**mail.google.com/mail/**').test('https://mail.google.com/mail/u/0/#inbox'));
  assert.ok(globToRegExp('https://x.com/*').test('https://x.com/home'));
  assert.ok(!globToRegExp('https://x.com/*').test('https://x.com/a/b'));
  assert.ok(!globToRegExp('**/inbox').test('https://x.com/inbox?next=1'));
  assert.equal(tunnelOrigin('INF Visit https://www.cloudflare.com/website-terms/\nINF |  https://a-b-c.trycloudflare.com   |'), 'https://a-b-c.trycloudflare.com');
  assert.equal(tunnelOrigin('INF Requesting new quick Tunnel on trycloudflare.com...'), null);
  assert.equal(finished({}, { url: 'x', count: 0 }), false);
  assert.equal(finished({ until: '**' }, { url: null }), false);
  assert.equal(finished({ until: '**/receipt/*', untilGone: '#card' }, { url: RECEIPT, count: 1 }), false, 'both named, both must hold');
  assert.equal(finished({ until: '**/receipt/*', untilGone: '#card' }, { url: RECEIPT, count: 0 }), true);
});

test('keyMatches accepts only the exact key', () => {
  const key = 'ab'.repeat(32);
  assert.equal(keyMatches(key, key), true);
  assert.equal(keyMatches(key.slice(1), key), false);
  assert.equal(keyMatches(`${key.slice(0, -1)}c`, key), false);
  assert.equal(keyMatches(null, key), false);
});

// ---------------------------------------------------------------------------
// The private form

test('open --form reads only the feed and the finish, then sends the browser nothing until the send', async t => {
  const f = fixture(t);
  f.set('stream-off', '');
  const { port, key } = openedForm(f);
  const calls = f.calls();
  assert.deepEqual(calls.slice(0, 4), ['agent-browser stream status --json', 'agent-browser stream enable', 'agent-browser stream status --json', 'agent-browser get url'], 'a switched-off live feed is switched on');
  assert.match(calls[4], /^cloudflared tunnel /);
  const state = JSON.parse(readFileSync(join(f.state, 'state.json'), 'utf8'));
  assert.deepEqual(state.form, CARD);
  assert.equal(state.until, '**/receipt/*');
  await pause(300);
  assert.equal(f.calls().length, 5, 'no polling before a send');

  assert.match(await (await fetch(`http://127.0.0.1:${port}/`)).text(), /Close without sending/);
  assert.match(await (await fetch(`http://127.0.0.1:${port}/page.mjs`)).text(), /export function rowsOf/);
  assert.equal((await fetch(`http://127.0.0.1:${port}/state.json`)).status, 404);
  assert.equal((await route(port, null, 'form')).status, 403);
  assert.equal((await route(port, '0'.repeat(64), 'send', { values: VALUES })).status, 403);
  const { status, json } = await route(port, key, 'form');
  assert.equal(status, 200);
  assert.equal(json.closesAt, state.deadline);
  assert.equal(json.submit, 'Pay $45.00');
  assert.doesNotMatch(JSON.stringify(json), /@e\d|#cvv|target/, 'the page never gets a target');
  for (const gone of ['fields', 'focus', 'select', 'check', 'action', 'navigate', 'viewport']) assert.equal((await route(port, key, gone, {})).status, 404, gone);
  const upgrade = await new Promise(done => {
    const socket = connect(port, '127.0.0.1', () => socket.write(`GET /stream?key=${key} HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n`));
    let text = '';
    socket.on('data', chunk => { text += chunk; socket.destroy(); }).on('close', () => done(text));
  });
  assert.match(upgrade, /^HTTP\/1\.1 404/, 'no live view of the browser');
  assert.equal(f.calls().length, 5, 'no refused request reached agent-browser');
});

test('a bad form file exits 2 with FORM_FILE= before any link', t => {
  const f = fixture(t);
  writeFileSync(f.form, JSON.stringify({ ...CARD, submit: undefined }));
  const out = f.run('open', '--form', f.form, '--until', '**/receipt/*');
  assert.equal(out.status, 2);
  assert.equal(out.stdout, 'FORM_FILE=form: submit takes a label of 1 to 60 characters and a target\n');
  assert.match(out.stderr, /Fix the form file first/);
  assert.equal(f.run('open', '--form', join(f.state, 'missing.json'), '--until', '**').status, 2);
  assert.deepEqual(f.calls(), []);
  assert.ok(!existsSync(f.state), 'no link state');
});

test('a form does not open without a live feed, or on a finish the page already meets', t => {
  const f = fixture(t);
  f.set('stream-port', 'null');
  const feedless = f.run('open', '--form', f.form, '--until', '**/receipt/*');
  assert.equal(feedless.status, 1);
  assert.match(feedless.stderr, /no live feed/);
  f.set('stream-port', '9');
  for (const finish of [['--until', '**/card'], ['--until-gone', '#gone']]) {
    if (finish[0] === '--until-gone') f.set('count', '0');
    const met = f.run('open', '--form', f.form, ...finish);
    assert.equal(met.status, 1, finish.join(' '));
    assert.match(met.stderr, /already meets the finish/);
  }
  assert.ok(!f.calls().some(line => line.startsWith('cloudflared tunnel')), 'no tunnel started');
  assert.ok(!existsSync(join(f.state, 'watcher.pid')));
});

test('a send types each text value over the live feed, presses once, and gives done when the site moves on', async t => {
  const f = fixture(t, { paseo: 'ok' });
  const feed = await fakeFeed(t, f);
  const link = openedForm(f);
  const tunnel = f.tunnelPid();
  const before = f.browserCalls().length;
  f.set('hold-click', '');
  const sending = send(f, link);
  await eventually(() => f.browserCalls().includes('agent-browser click @e31'));
  assert.equal(feed.typed(), NUMBER + CODE, 'the text values, in field order, as key presses');
  assert.doesNotMatch(f.stateFiles(), /XKCD|QWZP|ZQ7/, 'no typed value in the watcher\'s files or the tunnel log');
  assert.equal((await route(link.port, link.key, 'send', { values: VALUES })).status, 409, 'a second send is refused');
  f.unset('hold-click');
  const { status, json } = await sending;
  assert.equal(status, 200);
  assert.equal(json.receipt.result, 'done');
  assert.equal(json.receipt.notification, 'notified');

  const calls = f.browserCalls().slice(before);
  assert.deepEqual(calls.slice(0, 9), [...FILL, 'agent-browser click @e31']);
  for (const line of calls.slice(9)) assert.equal(line, 'agent-browser get url', 'after the press, only the address is read');
  assert.ok(!f.calls().some(line => /XKCD|QWZP|ZQ7/.test(line)), 'no typed value in any command');
  assert.equal(feed.requests.length, 1);
  assert.equal(feed.requests[0].url, '/?pacing=ack&maxFps=1', 'one unacknowledged picture at most');
  assert.equal(feed.requests[0].headers.origin, undefined);
  assert.ok(feed.messages.every(message => message.type === 'input_keyboard'));

  const out = f.run('wait');
  assert.equal(out.stdout.trim(), 'HANDOVER_RESULT=done');
  assert.match(out.rawStdout, /HANDOVER_NOTIFICATION=notified/);
  assert.deepEqual(f.result(), { result: 'done' });
  assert.doesNotMatch(readFileSync(join(f.state, 'result.json'), 'utf8'), new RegExp(`http|receipt|XKCD|ZQ7|${link.key}`));
  assert.ok(!alive(tunnel), 'the tunnel was killed');
  assert.ok(!(await answers(link.port)), 'the page was closed');
  const [message] = f.sent();
  assert.match(message[2], /"mode":"form"/);
  assert.doesNotMatch(message[2], /https?:|receipt|XKCD|ZQ7|trycloudflare/);
  assert.equal(f.sent().length, 1);
});

test('a site that keeps its page gives not-accepted: the typed boxes are emptied and nobody is woken', async t => {
  const f = fixture(t, { paseo: 'ok' });
  const feed = await fakeFeed(t, f);
  const link = openedForm(f);
  const before = f.browserCalls().length;
  const { json } = await send(f, link, { moves: false });
  assert.equal((await route(link.port, link.key, 'send', { values: VALUES })).status, 410, 'the link is over');
  assert.equal(json.receipt.result, 'not-accepted');
  assert.equal(json.receipt.ready, false);
  assert.equal(json.receipt.notification, 'not-requested');
  const calls = f.browserCalls().slice(before);
  assert.deepEqual(calls.slice(0, 9), [...FILL, 'agent-browser click @e31']);
  assert.deepEqual(calls.slice(-4), CLEAR, 'each text box it typed into is emptied and each dropdown put back, last');
  assert.equal(calls.filter(line => line === 'agent-browser click @e31').length, 1, 'pressed once, never again');
  assert.ok(calls.slice(9, -4).length > 1 && calls.slice(9, -4).every(line => line === 'agent-browser get url'));
  assert.equal(feed.typed(), NUMBER + CODE);
  const out = f.run('wait');
  assert.equal(out.stdout.trim(), 'HANDOVER_RESULT=not-accepted');
  assert.match(out.rawStdout, /HANDOVER_NOTIFICATION=not-requested/);
  assert.deepEqual(f.sent(), [], 'not accepted never announces readiness');
});

test('a field that can not be filled presses nothing and empties what was typed', async t => {
  const f = fixture(t);
  const feed = await fakeFeed(t, f);
  const link = openedForm(f);
  const before = f.browserCalls().length;
  f.set('fail-select', '');
  const { json } = await send(f, link);
  assert.equal(json.receipt.result, 'not-accepted');
  assert.deepEqual(f.browserCalls().slice(before), [...FILL.slice(0, 4), 'agent-browser fill @e12']);
  assert.equal(feed.typed(), NUMBER, 'nothing past the failed field was typed');
});

test('a press whose command fails still waits for the site, which may have taken it', async t => {
  const f = fixture(t);
  await fakeFeed(t, f);
  const link = openedForm(f, '--until-gone', '#card-form');
  f.set('fail-click', '');
  const sending = send(f, link, { moves: false });
  await eventually(() => f.browserCalls().includes('agent-browser click @e31'));
  f.set('count', '0');
  assert.equal((await sending).json.receipt.result, 'done');
  assert.ok(!f.browserCalls().includes('agent-browser get url'), 'only the named finish is read');
});

test('a form with no live feed at the send types nothing and presses nothing', async t => {
  const f = fixture(t);
  const link = openedForm(f);
  const before = f.browserCalls().length;
  const { json } = await send(f, link);
  assert.equal(json.receipt.result, 'not-accepted');
  assert.deepEqual(f.browserCalls().slice(before), []);
});

test('a bad send is refused without using the one send, and Close without sending gives closed', async t => {
  const f = fixture(t);
  const { port, key } = openedForm(f);
  const before = f.calls().length;
  for (const body of ['{', {}, { values: VALUES.slice(1) }, { values: [NUMBER, '13', '2028', CODE] }, { values: [NUMBER, '03', '2028', ''] }, { values: [NUMBER, '03', '2028', 'two\nlines'] }]) assert.equal((await route(port, key, 'send', body)).status, 400, JSON.stringify(body));
  assert.equal((await route(port, key, 'send')).status, 405);
  assert.equal(f.calls().length, before, 'no refused send reached agent-browser');
  assert.deepEqual(await route(port, key, 'done', {}), { status: 200, json: { ok: true } });
  const out = f.run('wait');
  assert.equal(out.stdout.trim(), 'HANDOVER_RESULT=closed');
  assert.match(out.rawStdout, /HANDOVER_NOTIFICATION=not-requested/);
});

test('the deadline gives timeout and tears down', async t => {
  const f = fixture(t);
  const { port } = openedForm(f, '--until', '**/receipt/*', '--minutes', '0.05');
  const tunnel = f.tunnelPid();
  assert.equal(f.run('wait').stdout.trim(), 'HANDOVER_RESULT=timeout');
  assert.ok(!(await answers(port)));
  assert.ok(!alive(tunnel));
  assert.ok(!existsSync(join(f.state, 'watcher.pid')));
});

test('a send under way outlasts close and the deadline, and ends with its own result', async t => {
  const f = fixture(t);
  await fakeFeed(t, f);
  const link = openedForm(f, '--until', '**/receipt/*', '--minutes', '0.05');
  f.set('hold-fill', '');
  const sending = send(f, link);
  await eventually(() => f.browserCalls().includes('agent-browser fill @e12'));
  const closing = f.start('close');
  await pause(3300);
  assert.ok(!existsSync(join(f.state, 'result.json')), 'neither close nor the deadline cut the send short');
  f.unset('hold-fill');
  assert.equal((await sending).json.receipt.result, 'done');
  assert.equal((await closing).stdout.trim(), 'HANDOVER_RESULT=done');
});

test('close gives closed for a form nobody sent', async t => {
  const f = fixture(t);
  const { port } = openedForm(f);
  const tunnel = f.tunnelPid();
  assert.equal(f.run('close').stdout.trim(), 'HANDOVER_RESULT=closed');
  assert.ok(!alive(tunnel));
  assert.ok(!(await answers(port)), 'the page stops answering after close');
});

test('a closed link refuses every route before invoking the browser', async t => {
  const reserved = createServer();
  await new Promise(done => reserved.listen(0, '127.0.0.1', done));
  const port = reserved.address().port;
  await new Promise(done => reserved.close(done));
  let sends = 0;
  const close = await servePage({ port, key: 'closed-key', form: CARD }, { onSend: async () => { sends++; } });
  t.after(close);
  await close.stopInput();
  for (const [path, body] of [['form'], ['send', { values: VALUES }], ['done', {}]]) assert.equal((await route(port, 'closed-key', path, body)).status, 410, path);
  assert.deepEqual(await route(port, 'closed-key', 'receipt'), { status: 202, json: { finishing: true } });
  assert.equal(sends, 0);
});

// ---------------------------------------------------------------------------
// Waking the chat

test('a finished send notifies the full originating workspace without wait; the receipt dispatches once', async t => {
  const f = fixture(t, { paseo: 'ok' });
  await fakeFeed(t, f);
  const link = openedForm(f);
  const state = JSON.parse(readFileSync(join(f.state, 'state.json'), 'utf8'));
  assert.equal(state.agentId, 'a-full-workspace-id');
  assert.match(state.completionId, /^[a-f0-9]{32}$/);
  await send(f, link);
  const receipt = await eventually(async () => {
    const response = await fetch(`http://127.0.0.1:${link.port}/receipt`, { headers: { 'x-hand-over-key': link.key } }).catch(() => null);
    return response?.status === 200 && await response.json();
  });
  assert.equal(receipt.notification, 'notified');
  assert.equal(receipt.ready, true);
  assert.equal((await fetch(`http://127.0.0.1:${link.port}/receipt`)).status, 403);
  const [sent] = f.sent();
  assert.equal(sent[0], 'send'); assert.equal(sent[1], state.agentId);
  assert.ok(sent.includes('--no-wait')); assert.ok(sent.includes('--json'));
  assert.ok(sent[2].includes(state.completionId));
  f.run('close'); // a duplicate finish while the receipt window is open
  const output = f.run('wait');
  assert.match(output.rawStdout, new RegExp(`HANDOVER_COMPLETION=${state.completionId}`));
  assert.match(output.rawStdout, /HANDOVER_NOTIFICATION=notified/);
  f.run('close');
  assert.equal(f.sent().length, 1);
});

for (const [paseo, notification] of [['fail', 'unconfirmed'], ['timeout', 'unconfirmed'], ['invalid', 'unconfirmed'], [null, 'unavailable']]) {
  test(`completion keeps its result when notification is ${paseo ?? 'missing'}`, async t => {
    const f = fixture(t, { paseo });
    await fakeFeed(t, f);
    await send(f, openedForm(f));
    f.run('wait');
    const result = JSON.parse(readFileSync(join(f.state, 'result.json'), 'utf8'));
    assert.equal(result.result, 'done'); assert.equal(result.notification, notification);
    assert.equal(f.sent().length, paseo ? 1 : 0);
  });
}

test('a CLI without originating identity never infers a target or opens another workspace', async t => {
  const f = fixture(t, { paseo: 'ok', agentId: '' });
  await fakeFeed(t, f);
  await send(f, openedForm(f));
  f.run('wait');
  assert.equal(f.sent().length, 0);
  assert.equal(JSON.parse(readFileSync(join(f.state, 'result.json'), 'utf8')).notification, 'unavailable');
});

// ---------------------------------------------------------------------------
// The key link's guide flag, its 30 minutes, and giving way

const deadlineOf = f => JSON.parse(readFileSync(join(f.state, 'state.json'), 'utf8')).deadline;
const FORM_ARGS = f => ['--form', f.form, '--until', '**/receipt/*'];

test('--guide goes with --keys only, and a bad guide exits 2 with KEYS_GUIDE= before any link', t => {
  const f = fixture(t, { checkout: true });
  const usage = f.run('open', '--guide', 'guide.json');
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /--guide goes with --keys only/);
  assert.equal(f.run('open', '--passwords', '--guide', 'guide.json').status, 2);
  const help = f.run('--help').stdout;
  assert.match(help, /--guide <file>/);
  assert.match(help, /HANDOVER_OPENED=yes\|no/);
  assert.match(help, /HANDOVER_REPLACED_BY=<folder>/);

  const guide = join(f.cwd, 'guide.json');
  writeFileSync(guide, JSON.stringify({ MAPS_API_KEY: { url: 'http://maps.example.com/keys' } }));
  const bad = f.run('open', '--keys', 'MAPS_API_KEY', '--guide', guide);
  assert.equal(bad.status, 2);
  assert.equal(bad.stdout, 'KEYS_GUIDE=MAPS_API_KEY: url takes an https address with a host name\n');
  assert.ok(!existsSync(f.state), 'no link state');
  assert.deepEqual(f.calls(), []);

  const entry = { title: 'Maps key', url: 'https://maps.example.com/keys', steps: ['Copy the key'] };
  writeFileSync(guide, JSON.stringify({ MAPS_API_KEY: entry }));
  opened(f, '--keys', 'MAPS_API_KEY', '--guide', guide);
  assert.deepEqual(JSON.parse(readFileSync(join(f.state, 'state.json'), 'utf8')).keys.keys[0].guide, entry);
});

test('a key link defaults to 30 minutes; a private form and a password link default to 10', t => {
  const f = fixture(t, { checkout: true });
  const minutes = (...args) => {
    const before = Date.now();
    opened(f, ...args);
    const deadline = deadlineOf(f);
    assert.equal(f.run('close').status, 0);
    return [(deadline - Date.now()) / 60_000, (deadline - before) / 60_000];
  };
  for (const [args, want] of [[['--keys', 'MAPS_API_KEY'], 30], [FORM_ARGS(f), 10], [['--passwords'], 10], [['--keys', 'MAPS_API_KEY', '--minutes', '10'], 10]]) {
    const [low, high] = minutes(...args);
    assert.ok(low <= want && high >= want, `${args[0]}: ${low}–${high} minutes, not ${want}`);
  }
});

test('an unopened key link gives way to a new open, and its wait prints closed, unopened, and whose link took its place', async t => {
  for (const next of [['--passwords'], null, ['--keys', 'MAPS_API_KEY']]) {
    const f = fixture(t, { checkout: true });
    const first = opened(f, '--keys', 'MAPS_API_KEY');
    const completion = JSON.parse(readFileSync(join(f.state, 'state.json'), 'utf8')).completionId;
    const waited = f.start('wait');
    await pause(300);
    const second = opened(f, ...(next ?? FORM_ARGS(f)));
    assert.notEqual(second.key, first.key, 'a new link, with its own key');
    assert.ok(!(await answers(first.port)), 'the first link\'s page is gone');
    assert.ok(await answers(second.port));
    const lines = (await waited).rawStdout.trim().split('\n');
    assert.deepEqual(lines, ['HANDOVER_RESULT=closed', 'HANDOVER_SAVED=', 'HANDOVER_APP_KEYS=', 'HANDOVER_OPENED=no', `HANDOVER_REPLACED_BY=${basename(f.cwd)}`, `HANDOVER_COMPLETION=${completion}`, 'HANDOVER_NOTIFICATION=not-requested'], next?.join(' ') ?? 'form');
    assert.ok(existsSync(join(f.state, 'watcher.pid')), 'the second link is still open');
    assert.ok(!existsSync(join(f.state, 'opened')));
    assert.deepEqual(JSON.parse(readFileSync(join(f.state, 'replaced.json'), 'utf8')), { completionId: completion, by: basename(f.cwd) }, 'the record outlives the first link, and holds only its identity and a folder name');
    const own = f.run('close').rawStdout;
    assert.match(own, /^HANDOVER_RESULT=closed$/m);
    assert.doesNotMatch(own, /HANDOVER_REPLACED_BY/, 'the second link took a place; nothing took its own');
  }
});

test('a key link that runs out or is closed says whether anyone opened it, and names no other link', async t => {
  const unopened = fixture(t, { checkout: true });
  opened(unopened, '--keys', 'MAPS_API_KEY', '--minutes', '0.05');
  assert.equal(unopened.run('wait').stdout, 'HANDOVER_RESULT=timeout\nHANDOVER_SAVED=\nHANDOVER_APP_KEYS=\nHANDOVER_OPENED=no\n');

  const f = fixture(t, { checkout: true });
  const { port, key } = opened(f, '--keys', 'MAPS_API_KEY');
  assert.equal((await route(port, key, 'keys')).status, 200);
  assert.equal(f.run('close').stdout, 'HANDOVER_RESULT=closed\nHANDOVER_SAVED=\nHANDOVER_APP_KEYS=\nHANDOVER_OPENED=yes\n');
  assert.equal(f.result().opened, true);
  assert.ok(!existsSync(join(f.state, 'replaced.json')), 'no link gave way');
});

test('a private form and a password link print no HANDOVER_OPENED line, opened or not', async t => {
  const f = fixture(t);
  const form = openedForm(f);
  assert.equal((await route(form.port, form.key, 'form')).status, 200);
  assert.equal(f.run('close').stdout, 'HANDOVER_RESULT=closed\n');
  const passwords = opened(f, '--passwords');
  assert.ok(await answers(passwords.port));
  assert.equal(f.run('close').stdout, 'HANDOVER_RESULT=closed\nHANDOVER_SAVED=\n');
  assert.equal(f.result().opened, undefined);
});

test('an opened key link, a private form, and a password link each refuse a second open', async t => {
  for (const first of [['--keys', 'MAPS_API_KEY'], null, ['--passwords']]) {
    const f = fixture(t, { checkout: true });
    const { port, key } = opened(f, ...(first ?? FORM_ARGS(f)));
    if (first?.[0] === '--keys') assert.equal((await route(port, key, 'keys')).status, 200);
    for (const next of [['--keys', 'MAPS_API_KEY'], ['--passwords'], FORM_ARGS(f)]) {
      const again = f.run('open', ...next);
      assert.equal(again.status, 1, `${first?.[0] ?? '--form'} then ${next[0]}`);
      assert.match(again.stderr, /already open/);
    }
    assert.ok(await answers(port), 'the first link is untouched');
  }
});
