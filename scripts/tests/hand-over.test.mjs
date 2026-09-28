import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { connect, createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { autofillToken, FIELD_SCAN, fieldBox, finished, globToRegExp, keyMatches, tidyTabs, tunnelOrigin } from '../../.agents/skills/verify/scripts/hand-over.mjs';
import { sendPlan, toPage, typedKeys } from '../../.agents/skills/verify/scripts/hand-over-page.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.agents/skills/verify/scripts/hand-over.mjs');
const ORIGIN = 'https://quiet-fox-lamp.trycloudflare.com';
const KEY = /#key=([0-9a-f]{64})$/m;
const REAL = { active: false, label: null, tabId: 't1', title: 'Pay', type: 'page', url: 'https://pay.example.com/card' };
const BLANK = { active: true, label: null, tabId: 't2', title: 'about:blank', type: 'page', url: 'about:blank' };

// A HOME of its own, and fake cloudflared and agent-browser first on PATH that log each call to one
// file in order. The fakes print the real shapes recorded from cloudflared 2026.9.3 and
// agent-browser 0.38.1. The test sets the tabs, the live-feed port, the page address, the
// element count, and the scanned fields through files; a `fail` file fails each field command.
function fixture(t, { cloudflared = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-hand-over-'));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const calls = join(root, 'calls.log');
  const file = name => join(root, name);
  writeFileSync(join(bin, 'agent-browser'), `#!/bin/sh
echo "agent-browser $*" >> "${calls}"
case "$1 $2" in
  "tab list") printf '{"success":true,"data":{"tabs":%s},"error":null}\\n' "$(cat "${file('tabs')}")" ;;
  "stream status")
    if [ -e "${file('stream-off')}" ]; then echo '{"success":true,"data":{"connected":true,"enabled":false,"port":null},"error":null}'
    else printf '{"success":true,"data":{"connected":true,"enabled":true,"port":%s},"error":null}\\n' "$(cat "${file('stream-port')}")"; fi ;;
  "stream enable") rm -f "${file('stream-off')}"; echo "✓ Streaming enabled" ;;
  "get url") cat "${file('url')}" ;;
  "get count") cat "${file('count')}" ;;
  "eval -b") printf '{"success":true,"data":{"origin":"https://pay.example.com/card","result":%s},"error":null}\n' "$(cat "${file('fields')}")" ;;
  "fill "*|"focus "*|"select "*|"check "*|"uncheck "*) [ -e "${file('fail')}" ] && exit 1; echo '✓ Done' ;;
esac
`);
  if (cloudflared) {
    writeFileSync(join(bin, 'cloudflared'), `#!/bin/sh
echo "cloudflared $*" >> "${calls}"
[ "$1" = "--version" ] && exit 0
echo $$ > "${file('tunnel.pid')}"
echo "2026-09-28T04:50:20Z INF Requesting new quick Tunnel on trycloudflare.com..." >&2
echo "2026-09-28T04:50:25Z INF |  ${ORIGIN}                             |" >&2
echo "2026-09-28T04:50:26Z INF Registered tunnel connection connIndex=0 location=hel02 protocol=quic" >&2
exec sleep 600
`);
  }
  for (const name of ['agent-browser', 'cloudflared']) if (existsSync(join(bin, name))) chmodSync(join(bin, name), 0o755);
  writeFileSync(file('url'), 'https://accounts.example.com/login\n');
  writeFileSync(file('count'), '1\n');
  writeFileSync(file('tabs'), JSON.stringify([{ ...REAL, active: true }]));
  writeFileSync(file('stream-port'), '9\n');
  writeFileSync(file('fields'), '[]\n');
  // Without cloudflared, PATH is the fake bin alone, so it carries the two tools the fake uses.
  if (!cloudflared) for (const tool of ['cat', 'rm']) symlinkSync(spawnSync('sh', ['-c', `command -v ${tool}`], { encoding: 'utf8' }).stdout.trim(), join(bin, tool));
  const env = { ...process.env, HOME: root, PATH: cloudflared ? `${bin}:/usr/bin:/bin` : bin, HANDOVER_POLL_MS: '50' };
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { env, encoding: 'utf8', timeout: 30_000 });
  const state = join(root, '.wong-stack/hand-over');
  t.after(() => {
    run('close');
    const pid = Number(existsSync(file('tunnel.pid')) && readFileSync(file('tunnel.pid'), 'utf8'));
    if (pid) try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ }
    rmSync(root, { recursive: true, force: true });
  });
  return {
    run,
    state,
    set: (name, value) => writeFileSync(file(name), `${value}\n`),
    calls: () => (existsSync(calls) ? readFileSync(calls, 'utf8').trim().split('\n') : []),
    tunnelPid: () => Number(readFileSync(file('tunnel.pid'), 'utf8')),
    result: () => JSON.parse(readFileSync(join(state, 'result.json'), 'utf8')),
  };
}

const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
const answers = port => fetch(`http://127.0.0.1:${port}/`).then(response => response.ok, () => false);

/** Runs `open`, asserts it worked, and returns its link, the page's port, and the key. */
function opened(f, ...args) {
  const out = f.run('open', ...args);
  assert.equal(out.status, 0, out.stderr);
  const link = /^HANDOVER_LINK=(.+)$/m.exec(out.stdout)?.[1];
  assert.ok(link, out.stdout);
  return { link, key: KEY.exec(link)?.[1], port: JSON.parse(readFileSync(join(f.state, 'state.json'), 'utf8')).port };
}

/** Sends one raw HTTP request to the page and resolves to everything it answers before closing or 300 ms. */
function raw(port, request) {
  return new Promise(done => {
    const socket = connect(port, '127.0.0.1', () => socket.write(request));
    let text = '';
    const end = () => { socket.destroy(); done(text); };
    socket.on('data', chunk => { text += chunk; }).on('close', end).on('error', end);
    setTimeout(end, 300);
  });
}

const upgrade = (path, extra = '') => `GET ${path} HTTP/1.1\r\nHost: quiet-fox-lamp.trycloudflare.com\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nOrigin: ${ORIGIN}\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n${extra}\r\n`;

test('open sizes the page and tidies tabs, then tunnels to its own page and prints a keyed link', async t => {
  const f = fixture(t);
  f.set('tabs', JSON.stringify([REAL, BLANK]));
  const { link, port } = opened(f, '--until', '**mail.example.com/mail/**');
  assert.match(link, new RegExp(`^${ORIGIN}/#key=[0-9a-f]{64}$`));
  const calls = f.calls().filter(line => !line.endsWith('--version'));
  const tunnel = calls.findIndex(line => line.startsWith('cloudflared tunnel'));
  assert.deepEqual(calls.slice(0, 5), ['agent-browser set viewport 1280 720', 'agent-browser tab list --json', 'agent-browser tab close t2', 'agent-browser tab t1', 'agent-browser stream status --json']);
  assert.ok(tunnel > 4, calls.join('\n'));
  assert.match(calls[tunnel], new RegExp(`--no-autoupdate --config \\S+cloudflared\\.yml --url http://127\\.0\\.0\\.1:${port}$`));
  assert.ok(await answers(port), 'the tunnel points at the page');
  assert.ok(!calls.some(line => / dashboard /.test(`${line} `)), 'no dashboard call');
});

test('a switched-off live feed is switched on', t => {
  const f = fixture(t, { cloudflared: false });
  f.set('stream-off', '');
  opened(f, '--local');
  assert.ok(f.calls().includes('agent-browser stream enable'));
});

test('the page serves itself without a key and passes the feed through only with it', async t => {
  const f = fixture(t, { cloudflared: false });
  let head = '';
  const stream = createServer(socket => {
    socket.once('data', chunk => {
      head = String(chunk);
      socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');
      socket.on('data', bytes => socket.write(`echo:${bytes}`));
    });
  });
  await new Promise(done => stream.listen(0, '127.0.0.1', done));
  t.after(() => stream.close());
  f.set('stream-port', stream.address().port);
  const { port, key } = opened(f, '--local');

  const page = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Type here/);
  assert.match((await fetch(`http://127.0.0.1:${port}/page.mjs`)).headers.get('content-type'), /javascript/);
  assert.equal((await fetch(`http://127.0.0.1:${port}/state.json`)).status, 404);

  assert.match(await raw(port, upgrade('/stream?key=0123')), /^HTTP\/1\.1 403/);
  assert.match(await raw(port, upgrade('/stream')), /^HTTP\/1\.1 403/);
  assert.match(await raw(port, upgrade(`/other?key=${key}`)), /^HTTP\/1\.1 404/);
  assert.equal(head, '', 'nothing reached the feed without the key');

  const reply = await new Promise(done => {
    const socket = connect(port, '127.0.0.1', () => socket.write(upgrade(`/stream?key=${key}`)));
    let text = '';
    socket.on('data', chunk => {
      text += chunk;
      if (text.endsWith('\r\n\r\n')) socket.write('hello');
      if (text.includes('echo:hello')) { socket.destroy(); done(text); }
    });
  });
  assert.match(reply, /^HTTP\/1\.1 101/);
  assert.match(head, /^GET \/ HTTP\/1\.1\r\n/);
  assert.match(head, new RegExp(`\\r\\nHost: 127\\.0\\.0\\.1:${stream.address().port}\\r\\n`));
  assert.match(head, /sec-websocket-key: dGhlIHNhbXBsZSBub25jZQ==/i);
  assert.doesNotMatch(head, /origin|key=/i, 'no Origin and no key reach the feed');

  assert.equal(f.run('close').stdout.trim(), 'HANDOVER_RESULT=closed');
  assert.ok(!(await answers(port)), 'the page stops answering after close');
});

test('reaching the named address gives done and tears down, the watcher having read only the address', async t => {
  const f = fixture(t);
  const { port, key } = opened(f, '--until', '**mail.example.com/mail/**');
  const before = f.calls().length;
  const tunnel = f.tunnelPid();
  f.set('url', 'https://mail.example.com/mail/u/0/#inbox?code=secret');
  const out = f.run('wait');
  assert.equal(out.stdout.trim(), 'HANDOVER_RESULT=done');
  assert.ok(!alive(tunnel), 'the tunnel was killed');
  assert.ok(!(await answers(port)), 'the page was closed');
  assert.deepEqual(f.result(), { result: 'done' });
  assert.doesNotMatch(readFileSync(join(f.state, 'result.json'), 'utf8'), new RegExp(`http|mail|secret|${key}`));
  const watcherCalls = f.calls().slice(before).filter(line => line.startsWith('agent-browser'));
  for (const line of watcherCalls) assert.match(line, /^agent-browser (get url|get count .+)$/);
  assert.ok(watcherCalls.includes('agent-browser get url'));
});

test('a named element reaching count 0 gives done', t => {
  const f = fixture(t);
  opened(f, '--until-gone', 'iframe[src*=recaptcha]');
  f.set('count', '0');
  assert.equal(f.run('wait').stdout.trim(), 'HANDOVER_RESULT=done');
  assert.ok(f.calls().includes('agent-browser get count iframe[src*=recaptcha]'));
  assert.ok(!f.calls().includes('agent-browser get url'), 'no address read without --until');
});

test('with both finishes named, both must hold', async t => {
  const f = fixture(t);
  opened(f, '--until', 'https://app.example.com/**', '--until-gone', '#captcha');
  f.set('url', 'https://app.example.com/home');
  await new Promise(done => setTimeout(done, 400));
  assert.ok(!existsSync(join(f.state, 'result.json')), 'the address alone does not finish');
  f.set('count', '0');
  assert.equal(f.run('wait').stdout.trim(), 'HANDOVER_RESULT=done');
});

test('a takeover with no finish ends only on close, and close gives closed', async t => {
  const f = fixture(t);
  opened(f);
  const tunnel = f.tunnelPid();
  await new Promise(done => setTimeout(done, 400));
  assert.ok(!existsSync(join(f.state, 'result.json')), 'nothing finishes a takeover by itself');
  assert.ok(!f.calls().some(line => line.startsWith('agent-browser get')), 'a takeover reads nothing');
  assert.equal(f.run('close').stdout.trim(), 'HANDOVER_RESULT=closed');
  assert.ok(!alive(tunnel));
});

test('the deadline gives timeout and tears down', async t => {
  const f = fixture(t);
  const { port } = opened(f, '--minutes', '0.01');
  const tunnel = f.tunnelPid();
  assert.equal(f.run('wait').stdout.trim(), 'HANDOVER_RESULT=timeout');
  assert.ok(!(await answers(port)));
  assert.ok(!alive(tunnel));
  assert.ok(!existsSync(join(f.state, 'watcher.pid')));
});

test('--local never calls cloudflared and prints the loopback link', async t => {
  const f = fixture(t, { cloudflared: false });
  const { link, port } = opened(f, '--local');
  assert.match(link, new RegExp(`^http://127\\.0\\.0\\.1:${port}/#key=[0-9a-f]{64}$`));
  assert.ok(await answers(port));
  assert.ok(!f.calls().some(line => line.startsWith('cloudflared')));
  assert.equal(f.run('close').stdout.trim(), 'HANDOVER_RESULT=closed');
});

test('each link gets its own key', t => {
  const f = fixture(t, { cloudflared: false });
  const first = opened(f, '--local').key;
  f.run('close');
  assert.notEqual(opened(f, '--local').key, first);
});

test('missing cloudflared exits 3 having started nothing', t => {
  const f = fixture(t, { cloudflared: false });
  const out = f.run('open', '--until', '**/inbox');
  assert.equal(out.status, 3);
  assert.match(out.stdout, /^HANDOVER_NEEDS=cloudflared$/m);
  assert.deepEqual(f.calls(), []);
  assert.ok(!existsSync(join(f.state, 'watcher.pid')));
});

test('a second open is refused while a link is open', t => {
  const f = fixture(t);
  opened(f);
  const again = f.run('open', '--local');
  assert.equal(again.status, 1);
  assert.match(again.stderr, /already open/);
  assert.equal(f.calls().filter(line => line.startsWith('agent-browser set viewport')).length, 1);
});

test('wait and close with nothing open say so', t => {
  const f = fixture(t);
  assert.equal(f.run('wait').status, 1);
  const close = f.run('close');
  assert.equal(close.status, 0);
  assert.match(close.stderr, /No hand-over link is open/);
});

test('a bad --minutes or command is a usage error', t => {
  const f = fixture(t);
  assert.equal(f.run('open', '--minutes', '0').status, 2);
  assert.equal(f.run('launch').status, 2);
  assert.equal(f.run().status, 2);
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
});

test('tidyTabs closes blank tabs beside a real one and fronts the last real tab', () => {
  const tab = (tabId, url, active = false) => ({ tabId, url, active });
  assert.deepEqual(tidyTabs([tab('t1', 'https://pay.example.com'), tab('t2', 'about:blank', true)]), { close: ['t2'], front: 't1' });
  assert.deepEqual(tidyTabs([tab('t1', 'about:blank', true), tab('t2', 'chrome://newtab/'), tab('t3', '')]), { close: [], front: null });
  assert.deepEqual(tidyTabs([tab('t1', 'https://a.example.com'), tab('t2', 'https://b.example.com', true), tab('t3', 'https://c.example.com')]), { close: [], front: null });
  assert.deepEqual(tidyTabs([tab('t1', 'https://a.example.com'), tab('t2', 'https://b.example.com'), tab('t3', 'chrome://new-tab-page/', true), tab('t4', null)]), { close: ['t3', 't4'], front: 't2' });
  assert.deepEqual(tidyTabs([tab('t1', 'https://a.example.com', true)]), { close: [], front: null });
});

test('keyMatches accepts only the exact key', () => {
  const key = 'ab'.repeat(32);
  assert.equal(keyMatches(key, key), true);
  assert.equal(keyMatches(key.slice(1), key), false);
  assert.equal(keyMatches(`${key.slice(0, -1)}c`, key), false);
  assert.equal(keyMatches(null, key), false);
});

test('toPage maps by the picture\'s own size, on a scaled and a letterboxed view', () => {
  // The reported bug: a 1280×577 picture must map a click at y 288 to 288, not 360.
  assert.deepEqual(toPage({ x: 100, y: 288 }, { left: 0, top: 0, width: 1280, height: 577 }, { width: 1280, height: 577 }), { x: 100, y: 288 });
  assert.deepEqual(toPage({ x: 330, y: 190 }, { left: 10, top: 10, width: 640, height: 360 }, { width: 1280, height: 720 }), { x: 640, y: 360 });
  const box = { left: 10, top: 20, width: 400, height: 400 };
  assert.deepEqual(toPage({ x: 210, y: 220 }, box, { width: 1280, height: 720 }), { x: 640, y: 360 });
  assert.deepEqual(toPage({ x: 10, y: 107.5 }, box, { width: 1280, height: 720 }), { x: 0, y: 0 });
  assert.equal(toPage({ x: 210, y: 50 }, box, { width: 1280, height: 720 }), null, 'a tap on the bar maps nowhere');
});

test('typedKeys turns each change of the box into key presses at the caret', () => {
  const back = { key: 'Backspace' };
  assert.deepEqual(typedKeys('', '42'), [{ text: '4' }, { text: '2' }]);
  assert.deepEqual(typedKeys('4242', '424'), [back]);
  assert.deepEqual(typedKeys('teh', 'the '), [back, back, { text: 'h' }, { text: 'e' }, { text: ' ' }]);
  assert.deepEqual(typedKeys('41', '4111 1111'), Array.from('11 1111', text => ({ text })));
  assert.deepEqual(typedKeys('a', 'a😀'), [{ text: '😀' }]);
  assert.deepEqual(typedKeys('same', 'same'), []);
});

// A card form as FIELD_SCAN returns it from agent-browser 0.38.1 (the live check's fixture page).
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const CARD_FORM = [
  { kind: 'text', type: 'text', label: 'Card number', autocomplete: 'off', name: 'ekashu_card_number', id: 'ekashu_card_number', placeholder: '', required: true, options: [], selector: '#ekashu_card_number' },
  { kind: 'select', type: 'select', label: 'Expires End', autocomplete: '', name: 'ekashu_expires_end_month', id: 'ekashu_expires_end_month', placeholder: '', required: true, options: [{ value: '', text: 'MM' }, ...MONTHS.map(m => ({ value: m, text: m }))], selector: '#ekashu_expires_end_month' },
  { kind: 'checkbox', type: 'checkbox', label: 'I agree', autocomplete: '', name: 'agree', id: '', placeholder: '', required: false, options: [], selector: 'body > form:nth-of-type(1) > p:nth-of-type(4) > label:nth-of-type(1) > input:nth-of-type(1)' },
];

/** Calls a field route with the key header unless `key` is null; resolves to the status and JSON. */
async function route(port, key, path, body) {
  const response = await fetch(`http://127.0.0.1:${port}/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: key === null ? {} : { 'x-hand-over-key': key },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, json: text ? JSON.parse(text) : null };
}

test('GET /fields needs the key and lists the scanned fields by ref, without a selector', async t => {
  const f = fixture(t, { cloudflared: false });
  f.set('fields', JSON.stringify(CARD_FORM));
  const { port, key } = opened(f, '--local');
  const before = f.calls().length;
  assert.equal((await route(port, null, 'fields')).status, 403);
  assert.equal((await route(port, '0'.repeat(64), 'fields')).status, 403);
  assert.equal(f.calls().length, before, 'nothing ran without the key');
  const { status, json } = await route(port, key, 'fields');
  assert.equal(status, 200);
  assert.match(json.signature, /^[0-9a-f]{64}$/);
  assert.deepEqual(json.fields.map(({ ref, kind, label, autocomplete, type, inputmode }) => ({ ref, kind, label, autocomplete, type, inputmode })), [
    { ref: 0, kind: 'text', label: 'Card number', autocomplete: 'cc-number', type: 'text', inputmode: 'numeric' },
    { ref: 1, kind: 'select', label: 'Expires End', autocomplete: 'cc-exp-month', type: 'text', inputmode: '' },
    { ref: 2, kind: 'checkbox', label: 'I agree', autocomplete: '', type: 'text', inputmode: '' },
  ]);
  assert.deepEqual(json.fields[1].options[3], { value: '03', text: '03' });
  assert.doesNotMatch(JSON.stringify(json), /selector|#ekashu|nth-of-type/);
  assert.deepEqual(f.calls().slice(before), [`agent-browser eval -b ${Buffer.from(FIELD_SCAN).toString('base64')} --json`]);
  assert.equal((await route(port, key, 'fields')).json.signature, json.signature, 'the same page, the same signature');
});

test('the field routes set a field only by a current ref, with the calls each route records', async t => {
  const f = fixture(t, { cloudflared: false });
  f.set('fields', JSON.stringify(CARD_FORM));
  const { port, key } = opened(f, '--local');
  assert.equal((await route(port, key, 'focus', { ref: 0 })).status, 409, 'no scan yet, so no ref is current');
  await route(port, key, 'fields');
  const before = f.calls().length;

  assert.equal((await route(port, null, 'focus', { ref: 0 })).status, 403);
  for (const bad of ['{', '[0]', '{}', { ref: -1 }, { ref: '0' }, { ref: 0, pad: 'x'.repeat(5000) }]) assert.equal((await route(port, key, 'focus', bad)).status, 400, JSON.stringify(bad));
  assert.equal((await route(port, key, 'select', { ref: 1, value: '13' })).status, 400, 'a choice the page does not offer');
  assert.equal((await route(port, key, 'select', { ref: 0, value: '03' })).status, 400, 'a text box is not a dropdown');
  assert.equal((await route(port, key, 'check', { ref: 2, checked: 'yes' })).status, 400);
  assert.equal((await route(port, key, 'focus', { ref: 7 })).status, 409, 'a ref past the scan is stale');
  assert.equal((await route(port, key, 'focus')).status, 405);
  assert.equal(f.calls().length, before, 'no refused request reached agent-browser');

  const ok = { status: 200, json: { ok: true } };
  assert.deepEqual(await route(port, key, 'focus', { ref: 0 }), ok);
  assert.deepEqual(await route(port, key, 'select', { ref: 1, value: '03' }), ok);
  assert.deepEqual(await route(port, key, 'check', { ref: 2, checked: true }), ok);
  assert.deepEqual(await route(port, key, 'check', { ref: 2, checked: false }), ok);
  const box = CARD_FORM[2].selector;
  assert.deepEqual(f.calls().slice(before), ['agent-browser fill #ekashu_card_number ', 'agent-browser focus #ekashu_card_number', 'agent-browser select #ekashu_expires_end_month 03', `agent-browser check ${box}`, `agent-browser uncheck ${box}`]);

  f.set('fail', '');
  assert.equal((await route(port, key, 'focus', { ref: 0 })).status, 409, 'a field that is gone answers 409');
});

test('FIELD_SCAN reads no value, tick state, or choice', () => {
  for (const read of ['.value', '.checked', '.selectedIndex', '.selected', '.defaultValue']) assert.ok(!FIELD_SCAN.includes(read), read);
  assert.doesNotThrow(() => new Function(`return ${FIELD_SCAN}`));
});

test('autofillToken takes the page\'s own mark, then the field\'s words, then its type', () => {
  const token = (label, extra = {}) => autofillToken({ name: '', id: '', label, placeholder: '', type: 'text', options: [], ...extra });
  const table = {
    'cc-number': ['Card number', 'cardnum', 'CCNum', 'PAN'],
    'cc-csc': ['CVV', 'cvc2', 'Security code', 'Card verification number'],
    'cc-exp-month': ['Expiry month', 'MM', 'expMonth'],
    'cc-exp-year': ['Expiry year', 'YY', 'exp_year'],
    'cc-exp': ['Expiry date', 'Expiration', 'MM/YY'],
    'cc-name': ['Name on card', 'Cardholder'],
    'one-time-code': ['OTP', 'One-time code', 'Verification code', '2FA code'],
    'new-password': ['New password', 'Confirm password'],
    'current-password': ['Password'],
    email: ['Email address', 'e-mail'],
    username: ['Username', 'Login'],
    tel: ['Phone', 'Mobile number'],
    'postal-code': ['Postal code', 'ZIP'],
    'address-line1': ['Street address'],
    'address-level2': ['City'],
    country: ['Country'],
    'given-name': ['First name'],
    'family-name': ['Last name', 'Surname'],
    name: ['Full name'],
  };
  for (const [want, labels] of Object.entries(table)) for (const label of labels) assert.equal(token(label), want, label);

  assert.equal(token('Card', { autocomplete: 'section-pay billing cc-number' }), 'cc-number');
  assert.equal(token('Card', { autocomplete: 'shipping tel' }), 'tel');
  assert.equal(token('Card number', { autocomplete: 'off' }), 'cc-number', 'off is ignored');
  assert.equal(token('Card number', { autocomplete: 'on' }), 'cc-number', 'on is ignored');
  assert.equal(token('Anything', { type: 'email' }), 'email');
  assert.equal(token('Anything', { type: 'tel' }), 'tel');
  assert.equal(token('Secret', { type: 'password' }), 'current-password');
  assert.equal(token('Notes'), '');

  // ekashu's card page: names only, and one label for both expiry dropdowns.
  assert.equal(token('', { name: 'ekashu_card_number' }), 'cc-number');
  assert.equal(token('', { name: 'ekashu_card_security_code' }), 'cc-csc');
  const choices = texts => [{ value: '', text: 'Select' }, ...texts.map(text => ({ value: text, text }))];
  const years = ['2026', '2027', '2028', '2029', '2030'];
  assert.equal(token('Expires End', { name: 'ekashu_expires_end_month', type: 'select', options: choices(MONTHS) }), 'cc-exp-month');
  assert.equal(token('Expires End', { name: 'ekashu_expires_end_year', type: 'select', options: choices(years) }), 'cc-exp-year');
  assert.equal(token('Expires End', { type: 'select', options: choices(MONTHS) }), 'cc-exp-month', 'a month list with no month in the words');
  assert.equal(token('Expires End', { type: 'select', options: choices(['26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37']) }), 'cc-exp-year', 'twelve two-digit years are not months');
});

test('fieldBox gives the box the type and keyboard its token implies', () => {
  const box = label => fieldBox({ name: '', id: '', label, placeholder: '', type: 'text', options: [] });
  assert.deepEqual(box('Card number'), { autocomplete: 'cc-number', type: 'text', inputmode: 'numeric' });
  assert.deepEqual(box('CVV'), { autocomplete: 'cc-csc', type: 'text', inputmode: 'numeric' });
  assert.deepEqual(box('One-time code'), { autocomplete: 'one-time-code', type: 'text', inputmode: 'numeric' });
  assert.deepEqual(box('Password'), { autocomplete: 'current-password', type: 'password', inputmode: '' });
  assert.deepEqual(box('New password'), { autocomplete: 'new-password', type: 'password', inputmode: '' });
  assert.deepEqual(box('Email'), { autocomplete: 'email', type: 'email', inputmode: '' });
  assert.deepEqual(box('Phone'), { autocomplete: 'tel', type: 'tel', inputmode: '' });
  assert.deepEqual(box('Postal code'), { autocomplete: 'postal-code', type: 'text', inputmode: '' }, 'a Canadian postal code has letters');
  assert.deepEqual(box('Notes'), { autocomplete: '', type: 'text', inputmode: '' });
});

test('sendPlan presses only new letters at the end of a focused field, else refocuses and retypes', () => {
  const keys = text => Array.from(text);
  assert.deepEqual(sendPlan('4111', '41111', true), { focus: false, keys: ['1'] }, 'append');
  assert.deepEqual(sendPlan('', '4', true), { focus: false, keys: ['4'] });
  assert.deepEqual(sendPlan('41111', '4111', true), { focus: true, keys: keys('4111') }, 'deletion');
  assert.deepEqual(sendPlan('', '4111 1111 1111 1111', false), { focus: true, keys: keys('4111 1111 1111 1111') }, 'a whole value filled into an unfocused field');
  assert.deepEqual(sendPlan('41', '4111', false), { focus: true, keys: keys('4111') }, 'another field was focused since');
  assert.deepEqual(sendPlan('abc', 'xbc', true), { focus: true, keys: keys('xbc') }, 'a change before the end');
  assert.deepEqual(sendPlan('abc', '', true), { focus: true, keys: [] }, 'emptied: cleared, nothing pressed');
});
