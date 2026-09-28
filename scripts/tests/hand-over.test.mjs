import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { accessUrl, finished, globToRegExp, tunnelOrigin } from '../../.agents/skills/verify/scripts/hand-over.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.agents/skills/verify/scripts/hand-over.mjs');
const ORIGIN = 'https://quiet-fox-lamp.trycloudflare.com';
const TOKEN = 'dashboard-access-token=0123abcd';

// A HOME of its own, and fake cloudflared and agent-browser first on PATH that log each call to one
// file in order. The fakes print the real shapes recorded from cloudflared 2026.9.3 and
// agent-browser 0.38.1. The test sets the page address and element count through files.
function fixture(t, { cloudflared = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-hand-over-'));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const calls = join(root, 'calls.log');
  const file = name => join(root, name);
  writeFileSync(join(bin, 'agent-browser'), `#!/bin/sh
echo "agent-browser $*" >> "${calls}"
case "$1 $2" in
  "dashboard start")
    case "$*" in
      *--allowed-origins*) shift 5; echo "Dashboard started; open one of the private access URLs below"
        echo "⚠ Keep these reverse-proxy dashboard URLs private: they contain access tokens."
        echo "$1/#${TOKEN}" ;;
      *) echo "Dashboard started at http://localhost:4848" ;;
    esac ;;
  "dashboard stop") echo "✓ Dashboard stopped"; touch "${file('stopped')}" ;;
  "get url") cat "${file('url')}" ;;
  "get count") cat "${file('count')}" ;;
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
    stopped: () => existsSync(file('stopped')),
    tunnelPid: () => Number(readFileSync(file('tunnel.pid'), 'utf8')),
    result: () => JSON.parse(readFileSync(join(state, 'result.json'), 'utf8')),
  };
}

const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };

function opened(f, ...args) {
  const out = f.run('open', ...args);
  assert.equal(out.status, 0, out.stderr);
  return out.stdout;
}

test('the tunnel starts first, and the dashboard gets its exact origin and prints the tokenized link', t => {
  const f = fixture(t);
  const stdout = opened(f, '--until', '**mail.example.com/mail/**');
  assert.match(stdout, new RegExp(`^HANDOVER_LINK=${ORIGIN}/#${TOKEN}$`, 'm'));
  const calls = f.calls().filter(line => !line.endsWith('--version'));
  const tunnel = calls.findIndex(line => line.startsWith('cloudflared tunnel'));
  const start = calls.findIndex(line => line.startsWith('agent-browser dashboard start'));
  assert.ok(tunnel >= 0 && tunnel < start, calls.join('\n'));
  assert.match(calls[tunnel], /--no-autoupdate --config \S+cloudflared\.yml --url http:\/\/127\.0\.0\.1:4848/);
  assert.equal(calls[start], `agent-browser dashboard start --port 4848 --allowed-origins ${ORIGIN}`);
  assert.ok(calls.slice(0, start).includes('agent-browser dashboard stop'), 'a running dashboard is stopped first');
});

test('reaching the named address gives done and tears down, having read only the address', t => {
  const f = fixture(t);
  opened(f, '--until', '**mail.example.com/mail/**');
  const tunnel = f.tunnelPid();
  f.set('url', 'https://mail.example.com/mail/u/0/#inbox?code=secret');
  const out = f.run('wait');
  assert.equal(out.stdout.trim(), 'HANDOVER_RESULT=done');
  assert.ok(f.stopped());
  assert.ok(!alive(tunnel), 'the tunnel was killed');
  assert.deepEqual(f.result(), { result: 'done' });
  assert.doesNotMatch(readFileSync(join(f.state, 'result.json'), 'utf8'), /http|mail|secret/);
  const browserCalls = f.calls().filter(line => line.startsWith('agent-browser'));
  for (const line of browserCalls) assert.match(line, /^agent-browser (get url|get count .+|dashboard (start|stop).*)$/);
  assert.ok(browserCalls.includes('agent-browser get url'));
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
  assert.ok(f.stopped());
  assert.ok(!alive(tunnel));
});

test('the deadline gives timeout and tears down', t => {
  const f = fixture(t);
  opened(f, '--minutes', '0.01');
  const tunnel = f.tunnelPid();
  assert.equal(f.run('wait').stdout.trim(), 'HANDOVER_RESULT=timeout');
  assert.ok(f.stopped());
  assert.ok(!alive(tunnel));
  assert.ok(!existsSync(join(f.state, 'watcher.pid')));
});

test('--local never calls cloudflared and prints the loopback link', t => {
  const f = fixture(t, { cloudflared: false });
  assert.match(opened(f, '--local'), /^HANDOVER_LINK=http:\/\/localhost:4848$/m);
  assert.ok(!f.calls().some(line => line.startsWith('cloudflared')));
  assert.ok(f.calls().includes('agent-browser dashboard start --port 4848'));
  assert.equal(f.run('close').stdout.trim(), 'HANDOVER_RESULT=closed');
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
  assert.equal(f.calls().filter(line => line.startsWith('agent-browser dashboard start')).length, 1);
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
  assert.equal(accessUrl('Dashboard started\nhttps://a.trycloudflare.com/#t=1\n', 'https://a.trycloudflare.com'), 'https://a.trycloudflare.com/#t=1');
  assert.equal(accessUrl('Dashboard started at http://localhost:4848', 'https://a.trycloudflare.com'), null);
  assert.equal(finished({}, { url: 'x', count: 0 }), false);
  assert.equal(finished({ until: '**' }, { url: null }), false);
});
