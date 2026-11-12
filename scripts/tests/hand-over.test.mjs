import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { FRAMES_SCRIPT, SECRETS_SCRIPT, sessionName } from '../../.agents/skills/browser/scripts/browse.mjs';
import { keyMatches, servePage, tunnelOrigin } from '../../.agents/skills/browser/skills/hand-over/scripts/hand-over.mjs';
import { appendTiming, KEEP, linkOf } from '../../.agents/skills/browser/skills/hand-over/scripts/lib/timings.mjs';
import { VIEWER } from '../../.agents/skills/browser/skills/hand-over/scripts/view.mjs';
import { BROWSE_ENV, fakeCamofox } from './fixtures/fake-camofox.mjs';
import { inboxCalls, inboxEnv } from './fixtures/fake-inbox.mjs';
import { fakeTunnel, ORIGIN, TUNNEL_ENV } from './fixtures/fake-tunnel.mjs';
import { fakeViewer, fakeViewTools, GREETING, SCREEN, upgrade } from './fixtures/fake-view-tools.mjs';

const legacyOutput = text => text.replace(/^HANDOVER_(COMPLETION|NOTIFICATION)=.*\n/gm, '');
const legacyResult = ({ completionId: _completionId, notification: _notification, ready: _ready, ...result }) => result;
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.agents/skills/browser/skills/hand-over/scripts/hand-over.mjs');
const browse = join(repo, '.agents/skills/browser/scripts/browse.mjs');
const KEY = /#key=([0-9a-f]{64})$/m;
const PAGE = 'https://pay.example.com/card';
const RECEIPT = 'https://pay.example.com/receipt/81';

// The card page as the browser reads it. camofox numbers a page's boxes in order, so the links hold e1–e11 and e16–e30.
const links = (from, to) => Array.from({ length: to - from + 1 }, (_, at) => `- link "Help ${from + at}" [e${from + at}]`).join('\n');
const CARD_PAGE = `${links(1, 11)}
- textbox "Card number" [e12]
- combobox "Expiry month" [e13]:
  - option "01 - January" [selected]
  - option "03 - March"
- combobox "Expiry year" [e14]:
  - option "2027" [selected]
  - option "2028"
- textbox "Security code" [e15]
${links(16, 30)}
- button "Pay $45.00" [e31]`;
const SESSION = 'card';
// The X display the fake browser says it runs on, for a live view.
const DISPLAY = ':97';
// What an expression the watcher or a reading evaluates is called as a step.
const READS = { 'location.href': 'url', '[innerWidth, innerHeight]': 'size', 1: 'keep-alive', [`[${SECRETS_SCRIPT}, ${FRAMES_SCRIPT}]`]: 'secrets' };

/** An evaluated read as a step: a count by its selector. */
function readOf(expression) {
  return `count ${JSON.parse(/\((".*")\)/.exec(expression)[1])}`;
}

/** One browser request as a step: its route and target, with a pick's choice or a page's size, never a typed value. */
function stepOf({ method, path, body }) {
  const route = path.split('/').at(-1);
  const target = body?.ref ?? body?.selector;
  if (route === 'evaluate') return READS[body.expression] ?? readOf(body.expression);
  if (route === 'viewport') return `viewport ${body.width}x${body.height}`;
  if (route === 'select') return `select ${target} ${body.option}`;
  if (route === 'front') return ['front', { true: 'turn', false: 'end' }[body.turn], body.raise === false && 'kept', body.reselect && 'again'].filter(Boolean).join(' ');
  return method === 'POST' && target ? `${route} ${target}` : route;
}

// A HOME of its own, a fake cloudflared first on PATH, and fake camofox and view tools. `openPage` opens session card;
// `checkout` and `view` add a checkout and a screen; `window` records the browser in its own window, as off Linux.
function fixture(t, { cloudflared = true, silent = false, paseo = null, agentId, checkout = false, view = false, window = false } = {}) {
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
  const camofox = fakeCamofox(root);
  camofox.set('snapshot', CARD_PAGE);
  const tools = fakeViewTools(root, camofox.control);
  if (view) {
    camofox.set('display', DISPLAY);
    fakeViewer(root, VIEWER.version);
  }
  if (cloudflared) fakeTunnel(bin, calls, { pidFile: file('tunnel.pid'), silent });
  if (paseo) {
    writeFileSync(join(bin, 'paseo'), `#!${process.execPath}
const fs = require('node:fs');
fs.appendFileSync(${JSON.stringify(file('sent.jsonl'))}, JSON.stringify(process.argv.slice(2)) + '\\n');
${paseo === 'fail' ? 'process.exit(1);' : paseo === 'timeout' ? 'setTimeout(() => {}, 10000);' : paseo === 'invalid' ? "console.log('{}');" : "console.log(JSON.stringify({agentId: process.argv[3], status: 'sent'}));"}
`);
    chmodSync(join(bin, 'paseo'), 0o755);
  }
  // Without cloudflared, PATH is the fake bin alone, with git for a key link's checkout.
  if (!cloudflared) symlinkSync(execFileSync('sh', ['-c', 'command -v git'], { encoding: 'utf8' }).trim(), join(bin, 'git'));
  const env = { ...process.env, ...TUNNEL_ENV, ...BROWSE_ENV, ...tools.env(), PASEO_AGENT_ID: agentId ?? (paseo ? 'a-full-workspace-id' : ''), PASEO_HOME: '', PASEO_HOST: '', HOME: root, PATH: cloudflared ? `${bin}:/usr/bin:/bin` : bin, HANDOVER_POLL_MS: '50', HANDOVER_SEND_POLL_MS: '50', HANDOVER_SEND_WAIT_MS: '400', HANDOVER_WATCH_MS: '600' };
  const run = (...args) => { const out = spawnSync(process.execPath, [script, ...args], { cwd, env, encoding: 'utf8', timeout: 30_000 }); return { ...out, rawStdout: out.stdout, stdout: legacyOutput(out.stdout) }; };
  /** Runs a command beside the test, so the test's own servers keep answering; resolves to its status and output. */
  const start = (...args) => {
    const child = spawn(process.execPath, [script, ...args], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    const out = { stdout: '', stderr: '' };
    for (const name of ['stdout', 'stderr']) child[name].on('data', chunk => { out[name] += chunk; });
    return new Promise(done => child.on('close', status => done({ ...out, status, rawStdout: out.stdout, stdout: legacyOutput(out.stdout) })));
  };
  // The computer's place keeps the timing record; each chat's link lives in its own folder under it.
  const hub = join(root, '.wong-stack/hand-over');
  const state = join(hub, 'links', sessionName(cwd));
  const others = [];
  t.after(() => {
    camofox.stop();
    for (const other of others) other.run('close');
    run('close');
    const pid = Number(existsSync(file('tunnel.pid')) && readFileSync(file('tunnel.pid'), 'utf8'));
    if (pid) try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ }
    rmSync(root, { recursive: true, force: true });
  });
  const logged = () => (existsSync(calls) ? readFileSync(calls, 'utf8').trim().split('\n').map(line => line.trimEnd()).filter(line => line && !line.endsWith('--version')) : []);
  let pageOpen = false;
  let opening = 0;
  return {
    run,
    start,
    env,
    cwd,
    root,
    state,
    hub,
    camofox,
    tools,
    /** Opens the card page once, in `session` or the folder's own, and reads it, as the agent does before it writes
     * the form; the steps counted start after it. */
    openPage(session = SESSION) {
      if (pageOpen) return;
      for (const command of ['open', 'snapshot']) {
        const out = spawnSync(process.execPath, [browse, command, ...(command === 'open' ? [PAGE] : []), ...(session ? ['--session', session] : [])], { cwd, env, encoding: 'utf8', timeout: 30_000 });
        assert.equal(out.status, 0, out.stdout + out.stderr);
      }
      pageOpen = true;
      opening = camofox.requests().length;
      if (window) {
        const record = join(camofox.install, 'server.json');
        writeFileSync(record, JSON.stringify({ ...JSON.parse(readFileSync(record, 'utf8')), window: true }));
      }
    },
    sent: () => existsSync(file('sent.jsonl')) ? readFileSync(file('sent.jsonl'), 'utf8').trim().split('\n').map(JSON.parse) : [],
    set: (name, value = '') => camofox.set(name, String(value)),
    unset: name => camofox.unset(name),
    calls: logged,
    /** Each request the browser got since the page opened, as a step, the tab's turn aside. */
    steps: () => camofox.requests().slice(opening).map(stepOf).filter(step => !step.startsWith('front')),
    /** Each call since the page opened that showed the tab or held, renewed or ended the person's turn on it. */
    fronts: () => camofox.requests().slice(opening).map(stepOf).filter(step => step.startsWith('front')),
    /** The card page's tab as the fake browser holds it: its address and size. */
    page: () => camofox.tabs()[0],
    stateFiles: () => (existsSync(state) ? readdirSync(state).map(name => readFileSync(join(state, name), 'utf8')).join('\n') : ''),
    tunnelPid: () => Number(readFileSync(file('tunnel.pid'), 'utf8')),
    /** Another chat on this computer: a folder of its own, so a name of its own, and its own id to wake. */
    chat(name, id = `${name}-workspace-id`) {
      const dir = join(root, name);
      mkdirSync(dir, { recursive: true });
      const spawnIn = (file, args) => spawnSync(process.execPath, [file, ...args], { cwd: dir, env: { ...env, PASEO_AGENT_ID: id }, encoding: 'utf8', timeout: 30_000 });
      const other = {
        name,
        run: (...args) => { const out = spawnIn(script, args); return { ...out, rawStdout: out.stdout, stdout: legacyOutput(out.stdout) }; },
        browse: (...args) => spawnIn(browse, args),
        state: join(hub, 'links', name),
      };
      others.push(other);
      return other;
    },
    result: () => legacyResult(JSON.parse(readFileSync(join(state, 'result.json'), 'utf8'))),
    /** The timing record's lines, oldest first. */
    timings: () => (existsSync(join(hub, 'timings.jsonl')) ? readFileSync(join(hub, 'timings.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line)) : []),
  };
}

const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
const answers = port => fetch(`http://127.0.0.1:${port}/`).then(response => response.ok, () => false);
const pause = ms => new Promise(done => setTimeout(done, ms));

/** Runs `open`, asserts it worked, and returns its link, the key, and the page's recorded loopback port. */
function opened(f, ...args) {
  if (['--view', '--watch'].some(mode => args.includes(mode))) f.openPage();
  const out = f.run('open', ...args);
  assert.equal(out.status, 0, out.stderr);
  const link = /^HANDOVER_LINK=(.+)$/m.exec(out.stdout)?.[1];
  assert.ok(link, out.stdout);
  const send = /^HANDOVER_LINK=[^\n]*\nHANDOVER_SEND=([^\n]+)$/m.exec(out.stdout)?.[1];
  assert.ok(send, `the send reminder sits right under the link:\n${out.stdout}`);
  assert.doesNotMatch(send, /https?:|key=|trycloudflare/, 'the reminder holds no link or key');
  return { link, key: KEY.exec(link)?.[1], port: stateOf(f).port };
}

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

const KEYS = ['--keys', 'MAPS_API_KEY'];

test('open tunnels to its own page and prints a keyed Cloudflare link, touching no browser page for a key link', async t => {
  const f = fixture(t, { checkout: true });
  const { link, port, key } = opened(f, ...KEYS);
  assert.match(link, new RegExp(`^${ORIGIN}/#key=[0-9a-f]{64}$`));
  const calls = f.calls();
  assert.equal(calls.length, 1, calls.join('\n'));
  assert.match(calls[0], new RegExp(`^cloudflared tunnel --no-autoupdate --config \\S+cloudflared\\.yml --url http://127\\.0\\.0\\.1:${port}$`));
  assert.ok(await answers(port), 'the tunnel points at the page');
  const statePath = join(f.state, 'state.json');
  assert.equal(statSync(statePath).mode & 0o777, 0o600);
  assert.equal(JSON.parse(readFileSync(statePath, 'utf8')).key, key);
  assert.equal(f.camofox.starts(), 0);
});

test('the link prints only once its public address answers', async t => {
  const f = fixture(t, { checkout: true });
  let asked = 0;
  const outside = createServer((request, response) => { asked++; response.writeHead(asked < 3 ? 530 : 200).end(); });
  await new Promise(done => outside.listen(0, '127.0.0.1', done));
  t.after(() => outside.close());
  f.env.HANDOVER_PROBE_ORIGIN = `http://127.0.0.1:${outside.address().port}`;
  const out = await f.start('open', ...KEYS);
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, new RegExp(`^HANDOVER_LINK=${ORIGIN}/#key=[0-9a-f]{64}$`, 'm'));
  assert.equal(asked, 3, 'two Cloudflare error pages, then the page');
});

test('an address that never answers fails as a tunnel that never registers does, and tears down', async t => {
  for (const silent of [false, true]) {
    const f = fixture(t, { silent, checkout: true });
    const outside = createServer((request, response) => response.writeHead(530).end());
    await new Promise(done => outside.listen(0, '127.0.0.1', done));
    t.after(() => outside.close());
    Object.assign(f.env, { HANDOVER_PROBE_ORIGIN: `http://127.0.0.1:${outside.address().port}`, HANDOVER_TUNNEL_WAIT_MS: '700' });
    const out = await f.start('open', ...KEYS);
    assert.equal(out.status, 1, `silent ${silent}`);
    assert.match(out.stderr, /The Cloudflare tunnel did not come up within 30 seconds/);
    assert.doesNotMatch(out.stdout, /^HANDOVER_(LINK|SEND)=/m);
    assert.ok(!alive(f.tunnelPid()), 'the tunnel was killed');
    assert.ok(!existsSync(join(f.state, 'watcher.pid')));
    assert.deepEqual(f.result(), { result: 'error' });
  }
});

test('missing cloudflared exits 3 for a link, having started nothing', t => {
  const f = fixture(t, { cloudflared: false, checkout: true });
  const out = f.run('open', ...KEYS);
  assert.equal(out.status, 3, out.stderr);
  assert.match(out.stdout, /^HANDOVER_NEEDS=cloudflared$/m);
  assert.deepEqual(f.calls(), []);
  assert.equal(f.camofox.starts(), 0, 'no browser either');
  assert.ok(!existsSync(join(f.state, 'watcher.pid')));
});

test('each link gets its own key', t => {
  const f = fixture(t, { checkout: true });
  const first = opened(f, ...KEYS).key;
  f.run('close');
  assert.notEqual(opened(f, ...KEYS).key, first);
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
  assert.equal(f.run('open', ...KEYS, '--minutes', '0').status, 2);
  assert.equal(f.run('launch').status, 2);
  assert.equal(f.run().status, 2);
  const bare = f.run('open');
  assert.equal(bare.status, 2);
  assert.match(bare.stderr, /open takes one of --keys, --view, or --watch/);
  assert.equal(f.run('open', ...KEYS, '--view', '--note', 'x').status, 2);
  for (const removed of [['--form', 'form.json'], ['--passwords'], ['--passwords', '--site', 'netflix.com'], [...KEYS, '--local'], ['--view', '--until', '**/browse**', '--note', 'x'], ['--view', '--until-gone', '#check', '--note', 'x'], ['--view', '--until-text', 'Thanks', '--note', 'x'], ['--view', '--keep-open', '--note', 'x']]) {
    const out = f.run('open', ...removed);
    assert.equal(out.status, 2, removed.join(' '));
    assert.match(out.stderr, /usage:/);
  }
  assert.doesNotMatch(f.run('--help').stdout, /--form|--passwords|--sign-in|--site|--until|--keep-open|<finish>/, 'the private form, the password link, and the finish are gone');
  assert.deepEqual(f.calls(), []);
});

test('the tunnel\'s address is read from its log', () => {
  assert.equal(tunnelOrigin('INF Visit https://www.cloudflare.com/website-terms/\nINF |  https://a-b-c.trycloudflare.com   |'), 'https://a-b-c.trycloudflare.com');
  assert.equal(tunnelOrigin('INF Requesting new quick Tunnel on trycloudflare.com...'), null);
});

test('keyMatches accepts only the exact key', () => {
  const key = 'ab'.repeat(32);
  assert.equal(keyMatches(key, key), true);
  assert.equal(keyMatches(key.slice(1), key), false);
  assert.equal(keyMatches(`${key.slice(0, -1)}c`, key), false);
  assert.equal(keyMatches(null, key), false);
});

test('each private page gets the app\'s look and the switch from its own site, unkeyed, and nothing else', async t => {
  const f = fixture(t, { checkout: true });
  const { port, key } = opened(f, ...KEYS);
  const css = await fetch(`http://127.0.0.1:${port}/page.css`);
  assert.deepEqual(['content-type', 'cache-control', 'referrer-policy', 'x-frame-options', 'content-security-policy'].map(name => css.headers.get(name)), ['text/css; charset=utf-8', 'no-store', 'no-referrer', 'DENY', "frame-ancestors 'none'"]);
  const sheet = await css.text();
  assert.match(sheet, /^[\s\S]*:root \{[^}]*--primary:[\s\S]*color-scheme: light;/, 'the app\'s colours, unkeyed like the page');
  assert.doesNotMatch(sheet, /prefers-color-scheme/, 'light to start on every device');
  assert.match(sheet, /\n\.dark \{[^}]*--background:[^}]*\}/, 'the app\'s dark set, under .dark');
  assert.match(sheet, /\.theme-toggle \{/, 'the switch\'s look');
  assert.ok(sheet.indexOf(':where(.card)') < sheet.indexOf('.steps > li::before'), 'the shared parts, then the page rules');
  assert.doesNotMatch(sheet, /--blue|#[0-9a-f]{6}\b/i, 'no colour of its own');
  const theme = await fetch(`http://127.0.0.1:${port}/theme.js`);
  assert.equal(theme.headers.get('content-type'), 'text/javascript; charset=utf-8');
  assert.match(await theme.text(), /wongstack-theme/, 'the switch, from the same site');
  assert.match(await (await fetch(`http://127.0.0.1:${port}/page.mjs`)).text(), /export function readableName/);
  assert.equal((await fetch(`http://127.0.0.1:${port}/state.json`)).status, 404);
  for (const gone of ['form', 'send', 'picture', 'view', 'give']) assert.equal((await route(port, key, gone, {})).status, 404, gone);
});

test('the key page loads the switch in its head, from its own site, and the live view and closed page get none', () => {
  const html = readFileSync(join(repo, '.agents/skills/browser/skills/hand-over/scripts/keys-page.html'), 'utf8');
  const head = html.slice(0, html.indexOf('</head>'));
  assert.ok(head.indexOf('<script src="theme.js"></script>') > head.indexOf('href="page.css"'), 'keys-page: theme.js after page.css, in <head>');
  assert.doesNotMatch(html, /color-scheme:\s*light/, 'keys-page: no fixed light');
  assert.doesNotMatch(readFileSync(join(repo, '.agents/skills/browser/skills/hand-over/scripts/view-page.html'), 'utf8'), /theme\.js|data-theme-toggle/, 'the live view has no switch');
  assert.doesNotMatch(readFileSync(join(repo, '.agents/skills/reply-link/scripts/reply-link.mjs'), 'utf8'), /theme\.js|theme-toggle/, 'the closed page has no switch');
});

test('the timing record names what ended each link and how long it was open, with no key or value, readable by its owner alone', async t => {
  const f = fixture(t, { checkout: true });
  const first = opened(f, ...KEYS);
  f.run('close');
  opened(f, ...KEYS, '--minutes', '0.02');
  f.run('wait');
  const lines = f.timings();
  assert.deepEqual(lines.map(({ ended, cause }) => [ended, cause]), [['closed', 'close-command'], ['timeout', 'deadline']]);
  for (const line of lines) {
    assert.deepEqual(Object.keys(line).sort(), ['at', 'cause', 'ended', 'link', 'ms']);
    assert.match(line.link, /^[0-9a-f]{8}$/);
    assert.ok(Number.isInteger(line.ms) && line.ms >= 0);
  }
  const file = join(f.hub, 'timings.jsonl');
  assert.equal(statSync(file).mode & 0o777, 0o600);
  assert.doesNotMatch(readFileSync(file, 'utf8'), new RegExp(`${first.key}|http|MAPS`));
});

test('appendTiming keeps only the named fields and the last lines', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-timings-'));
  try {
    const file = join(dir, 'timings.jsonl');
    for (let i = 0; i < KEEP + 20; i++) appendTiming(file, { link: 'ab12cd34', ended: 'done', cause: 'finish', ms: i, step: 'fill', value: '4242', error: 'fill("4242")' }, { now: 0 });
    const lines = readFileSync(file, 'utf8').trim().split('\n');
    assert.equal(lines.length, KEEP);
    assert.deepEqual(JSON.parse(lines[0]), { at: '1970-01-01T00:00:00.000Z', link: 'ab12cd34', ended: 'done', cause: 'finish', ms: 20 });
    assert.doesNotMatch(readFileSync(file, 'utf8'), /4242|fill/);
    assert.equal(statSync(file).mode & 0o777, 0o600);
    appendTiming(file, { link: 'x', ended: 'closed', cause: 'SIGTERM' }, { keep: 2 });
    assert.equal(readFileSync(file, 'utf8').trim().split('\n').length, 2);
    assert.equal(linkOf('0123456789abcdef'), '01234567');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The checks that read the real /proc run where a live view does.
const linux = { skip: process.platform !== 'linux' && 'a live view runs on Linux only' };
const NOTE = 'Messenger wants to know you\'re a person';
const WIDE = { kind: 'wide', width: 1280, screen: SCREEN };
const PHONE = { kind: 'phone', width: 480, screen: SCREEN };
// The page's size before a view, which every end puts back, and the view's flags when a test names none.
const FIRST = [2560, 1328];
const VIEW_ARGS = ['--view', '--session', SESSION, '--note', NOTE];
const SOURCE_ARGS = dir => ['-display', DISPLAY, '-unixsock', join(dir, 'screen.sock'), '-rfbport', '0', '-rfbportv6', '0', '-nopw', '-forever', '-shared', '-noxdamage', '-quiet'];

/** Opens a live view on the fixture's page, with NOTE unless `args` names a note. */
const openedView = (f, ...args) => opened(f, '--view', '--session', SESSION, ...args, ...(args.includes('--note') ? [] : ['--note', NOTE]));
/** Presses the view's Hand back. */
const handBack = link => route(link.port, link.key, 'give', {});
/** The link's recorded state, or null while the watcher is writing it. A live view by link keeps its state in the
 * computer's one view, and this chat's note, page, size, and limit in its turn there. */
function stateOf(f) {
  const shared = join(f.hub, 'view');
  try {
    if (!existsSync(join(shared, 'state.json'))) return JSON.parse(readFileSync(join(f.state, 'state.json'), 'utf8'));
    const state = JSON.parse(readFileSync(join(shared, 'state.json'), 'utf8'));
    const { note, size, ...turn } = JSON.parse(readFileSync(join(shared, 'turns', `${basename(f.state)}.json`), 'utf8'));
    return { ...state, ...turn, view: { note, size, ...state.view } };
  } catch { return null; }
}
/** What a view's end must undo, read while it is open. */
const kept = (f, link) => ({ view: stateOf(f).view, port: link.port, tunnel: f.tunnelPid() });
const screenFolders = f => (existsSync(f.hub) ? readdirSync(f.hub).filter(name => name.startsWith('screen-')) : []);

/** Asserts a view's end put everything back: the page's size, and no screen source, folder, tunnel, or page left. */
async function assertPutBack(f, { view, port, tunnel }) {
  assert.deepEqual(f.page().size, FIRST, 'the page has its first size back');
  assert.equal(f.steps().at(-1), `viewport ${FIRST.join('x')}`, 'and that was the last thing the browser was sent');
  assert.ok(!alive(view.sourcePid), 'the screen source is stopped');
  assert.deepEqual(screenFolders(f), [], 'and its folder removed');
  assert.ok(!alive(tunnel), 'the tunnel was killed');
  assert.ok(!(await answers(port)), 'the page was closed');
  assert.ok(!existsSync(join(f.state, 'watcher.pid')));
}

/** The first line of the answer to a GET sent as written: fetch would tidy a climbing path first. */
function rawGet(port, path) {
  return new Promise(done => {
    const socket = connect(port, '127.0.0.1', () => socket.write(`GET ${path} HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n`));
    let text = '';
    socket.on('data', chunk => { text += chunk; }).on('close', () => done(text.split('\r\n')[0]));
  });
}

test('--view needs a note and takes no finish; its flags go with --view only', t => {
  const f = fixture(t, { view: true });
  for (const note of [[], ['--note', 'two\nlines'], ['--note', ' '], ['--note', 'x'.repeat(141)]]) {
    const out = f.run('open', '--view', ...note);
    assert.equal(out.status, 2, note.join(' '));
    assert.match(out.stderr, /--view needs --note, the one line the person sees: what to do now, up to 140 characters/);
  }
  for (const finish of [['--until', '**/browse**'], ['--until-gone', '#check'], ['--until-text', 'Thanks'], ['--keep-open']]) {
    const out = f.run('open', '--view', ...finish, '--note', NOTE);
    assert.equal(out.status, 2, finish.join(' '));
    assert.match(out.stderr, new RegExp(`Unknown option '${finish[0]}'[\\s\\S]*usage:`));
  }
  for (const args of [['--note', 'x'], ['--session', 'card']]) {
    const out = f.run('open', ...KEYS, ...args);
    assert.equal(out.status, 2, args.join(' '));
    assert.match(out.stderr, /go with --view only/);
  }
  assert.equal(f.run('install-view', 'now').status, 2);
  const help = f.run('--help').stdout;
  assert.match(help, /open --view --note <line> \[--session <name>\] \[--minutes N\]/);
  assert.match(help, /never on a page\s+change/);
  assert.match(help, /joins it as a tab and prints the same link/);
  assert.match(help, /wait \| close \[--stopped\] \| install-view/);
  assert.match(help, /HANDOVER_NEEDS=live-view/);
  assert.match(help, /HANDOVER_VIEW=window/);
  assert.match(help, /HANDOVER_RESULT=done\|handed-back\|closed\|timeout\|error/);
  assert.deepEqual(f.calls(), []);
  assert.deepEqual(f.tools.calls('x11vnc'), []);
});

test('open --view on a computer without its tools exits 3, naming each one, having started nothing', linux, t => {
  const f = fixture(t, { view: true });
  f.openPage();
  Object.assign(f.env, f.tools.env('x11vnc'));
  const one = f.run('open', ...VIEW_ARGS);
  assert.equal(one.status, 3);
  assert.equal(one.stdout, 'HANDOVER_NEEDS=live-view\n');
  assert.match(one.stderr, /^x11vnc shows the browser's screen\. It is a system package, so it needs admin rights\.$/m);
  assert.doesNotMatch(one.stderr, /xdotool keeps|noVNC/, 'only what is missing');
  assert.match(one.stderr, /ask the person, run `hand-over\.mjs install-view`, and retry/);

  Object.assign(f.env, f.tools.env('x11vnc', 'xdotool'));
  rmSync(join(dirname(f.hub), 'live-view'), { recursive: true });
  const all = f.run('open', ...VIEW_ARGS);
  assert.equal(all.status, 3);
  assert.equal(all.stdout, 'HANDOVER_NEEDS=live-view\n');
  for (const line of [/^x11vnc shows/m, /^xdotool keeps the page's window in front\..*admin rights\.$/m, new RegExp(`^noVNC ${VIEWER.version.replaceAll('.', '\\.')} draws that screen on the link's page\\. It goes in your home folder\\.$`, 'm')]) assert.match(all.stderr, line);

  assert.deepEqual(f.calls(), [], 'no tunnel');
  assert.deepEqual(f.steps(), [], 'no browser call');
  assert.deepEqual(f.tools.calls('x11vnc'), []);
  assert.ok(!existsSync(f.state), 'no link state');
});

test('a view does not open with no page, or beside another link', linux, t => {
  const f = fixture(t, { view: true, checkout: true });
  const pageless = f.run('open', ...VIEW_ARGS);
  assert.equal(pageless.status, 1);
  assert.match(pageless.stderr, /No page is open in this browser session/);
  assert.equal(f.camofox.starts(), 0, 'opening a view starts no browser');
  assert.deepEqual(f.tools.calls('x11vnc'), [], 'no screen source was started');
  assert.ok(!f.calls().some(line => line.startsWith('cloudflared tunnel')), 'no tunnel started');
  f.openPage();

  openedView(f);
  const before = [f.calls().length, f.tools.calls('x11vnc').length];
  for (const args of [VIEW_ARGS, KEYS]) {
    const again = f.run('open', ...args);
    assert.equal(again.status, 1, args[0]);
    assert.match(again.stderr, /already open/);
  }
  assert.deepEqual([f.calls().length, f.tools.calls('x11vnc').length], before, 'the refused opens started nothing');
});

test('where the browser has no screen to show, open --view says unsupported and opens nothing', linux, t => {
  const f = fixture(t, { view: true });
  f.unset('display');
  f.openPage();
  const out = f.run('open', ...VIEW_ARGS);
  assert.equal(out.status, 1);
  assert.equal(out.stdout, 'HANDOVER_VIEW=unsupported\n');
  assert.match(out.stderr, /^The browser has no screen to show\. Give the person steps for their own device instead\.$/m);
  assert.deepEqual(f.tools.calls('x11vnc'), []);
  assert.ok(!f.calls().some(line => line.startsWith('cloudflared tunnel')));
  assert.deepEqual(f.steps(), ['url'], 'only the page\'s address was read, and the page not resized');
  assert.ok(!existsSync(join(f.state, 'watcher.pid')));
});

test('a screen source that opens a network port fails the open, and is not left running', linux, t => {
  const f = fixture(t, { view: true });
  f.openPage();
  f.set('x11vnc-listens');
  const out = f.run('open', ...VIEW_ARGS);
  assert.equal(out.status, 1);
  assert.match(out.stderr, /x11vnc, opened a network port, so it was stopped and no link was opened/);
  assert.doesNotMatch(out.stdout, /HANDOVER_LINK/);
  assert.equal(f.tools.calls('x11vnc').length, 1);
  assert.ok(!alive(f.tools.sourcePid()), 'it was stopped');
  assert.deepEqual(screenFolders(f), [], 'its folder is removed');
  assert.ok(!f.calls().some(line => line.startsWith('cloudflared tunnel')), 'before any tunnel');
  assert.deepEqual(f.steps(), ['url', 'size'], 'the page was never resized');
  assert.deepEqual(f.result(), { result: 'error' });
});

test('open --view starts the screen source on a private socket, fits the page, and serves its page behind the key', linux, async t => {
  const f = fixture(t, { view: true });
  const before = Date.now();
  const { link, port, key } = openedView(f);
  assert.match(link, new RegExp(`^${ORIGIN}/#key=[0-9a-f]{64}$`));
  const state = stateOf(f);
  const { view } = state;
  assert.deepEqual({ ...view, dir: null, sourcePid: null }, { note: NOTE, size: FIRST, display: DISPLAY, dir: null, sourcePid: null });
  assert.equal(state.session, SESSION);
  assert.ok(!['until', 'untilGone', 'untilText'].some(name => name in state) && !('keepOpen' in view), 'the state holds no finish');
  assert.equal(dirname(view.dir), f.hub);
  assert.equal(statSync(view.dir).mode & 0o777, 0o700, 'only this user can reach the screen');
  assert.ok(alive(view.sourcePid));
  assert.deepEqual(f.tools.calls('x11vnc'), [SOURCE_ARGS(view.dir)], 'both network ports switched off');
  assert.ok((state.deadline - Date.now()) / 60_000 <= 480 && (state.deadline - before) / 60_000 >= 480, 'open for eight hours');
  assert.deepEqual(f.steps().slice(0, 4), ['url', 'size', 'viewport 1280x720', 'viewport 1280x663'], 'the address and the size are read; then the bar is measured and the page fitted wide');
  assert.equal(f.calls().length, 1);

  assert.match(await (await fetch(`http://127.0.0.1:${port}/`)).text(), /Tap a box above, then type here/);
  assert.match(await (await fetch(`http://127.0.0.1:${port}/page.mjs`)).text(), /export function shapeOf/);
  assert.equal((await route(port, null, 'view')).status, 403);
  assert.equal((await route(port, '0'.repeat(64), 'fit', { fit: 'phone' })).status, 403);
  assert.equal((await route(port, null, 'give', {})).status, 403);
  const shown = await route(port, key, 'view');
  assert.equal(shown.status, 200);
  const me = basename(f.state);
  assert.deepEqual({ ...shown.json, now: 0 }, { note: NOTE, control: 'turn', fit: WIDE, closesAt: state.deadline, shown: me, tabs: [{ chat: me, id: state.joined, note: NOTE, fresh: false, closesAt: state.deadline }], now: 0 });
  assert.doesNotMatch(JSON.stringify(shown.json), /pay\.example|\.sock|hand-over/, 'no address of the page, and no path');
  assert.equal((await route(port, key, 'fit', { fit: 'tall' })).status, 400);
  assert.deepEqual(f.page().size, [1280, 663], 'a refused fit changes nothing');
  assert.deepEqual(await route(port, key, 'fit', { fit: 'phone' }), { status: 200, json: { fit: PHONE } });
  assert.deepEqual(f.page().size, [480, 663]);
  assert.deepEqual((await route(port, key, 'view')).json.fit, PHONE);
  assert.equal((await route(port, key, 'fit')).status, 405);
  assert.equal((await route(port, key, 'give')).status, 405, 'a press is a POST');
  for (const gone of ['form', 'send', 'save', 'keys', 'screen', 'done', 'take', 'watch', 'picture']) assert.equal((await route(port, key, gone, {})).status, 404, gone);
  assert.equal((await route(port, key, 'show', { chat: 'another' })).status, 409, 'a chat with no tab');
});

const WATCH_NOTE = 'The assistant is connecting your tools.';
const openedWatch = f => opened(f, '--watch', '--session', SESSION, '--note', WATCH_NOTE);
/** A route call, tried once more when the link's server dropped an idle connection as it was reused: a CLI step
 * between two calls can take longer than the server keeps one open. */
const ask = (...args) => route(...args).catch(() => route(...args));
/** The watch event `wait` prints next. */
const nextEvent = f => f.run('wait').stdout.trim();

test('a watch and a turn take no finish, and line and turn need an open watch the agent holds', linux, t => {
  const f = fixture(t, { view: true });
  for (const args of [['open', '--watch', '--until', '**'], ['open', '--watch', '--keep-open'], ['turn', '--until', '**', '--note', 'Sign in.'], ['turn', '--until-gone', '#x', '--note', 'Sign in.']]) {
    assert.equal(f.run(...args).status, 2, args.join(' '));
  }
  assert.equal(f.run('open', '--watch', '--view').status, 2);
  assert.equal(f.run('line').status, 2);
  assert.equal(f.run('turn').status, 2, 'a turn needs its note');
  assert.match(f.run('turn', '--note', 'Sign in.', '--session', 'x').stderr, /turn takes --note only/);
  assert.equal(f.run('wait', '--stopped').status, 2);
  assert.match(f.run('line', 'Clicking Save…').stderr, /No watch link is open/);
  assert.match(f.run('turn', '--note', 'Sign in.').stderr, /No watch link is open/);
});

test('a watch link gives the browser to the person on Take over or a turn, back only on Hand back, and the chat stops it', linux, async t => {
  const f = fixture(t, { view: true, paseo: 'ok' });
  const { port, key } = openedWatch(f);
  assert.equal(stateOf(f).view.watch, true);
  assert.ok(!f.steps().some(step => /^count\b/.test(step)), 'a watch reads no finish');
  assert.deepEqual(f.fronts(), ['front'], 'the agent drives, so its tab comes to the front with no turn held');
  assert.equal((await ask(port, null, 'watch')).status, 403);
  for (const name of ['take', 'give']) assert.equal((await ask(port, null, name, {})).status, 403, name);
  assert.equal((await ask(port, key, 'watch')).json.control, 'assistant', 'a request without the key changes nothing');
  assert.equal((await ask(port, key, 'view')).json.watch, true);
  assert.equal(nextEvent(f), 'HANDOVER_RESULT=opened');
  const shown = (await ask(port, key, 'watch')).json;
  assert.deepEqual([shown.control, shown.line], ['assistant', WATCH_NOTE]);
  assert.equal(f.run('line', 'Clicking New integration…').status, 0);
  assert.equal((await ask(port, key, 'watch')).json.line, 'Clicking New integration…');

  const taken = await ask(port, key, 'take', {});
  assert.deepEqual([taken.status, taken.json.control], [200, 'person']);
  await eventually(() => f.fronts().includes('front turn again'));
  assert.equal((await ask(port, key, 'take', {})).status, 409);
  assert.equal(nextEvent(f), 'HANDOVER_RESULT=taken-over');
  assert.match(f.run('turn', '--note', 'Sign in to Test.').stderr, /not the assistant's now: person/);
  assert.equal((await ask(port, key, 'give', {})).json.control, 'assistant');
  assert.equal((await ask(port, key, 'give', {})).status, 409);
  assert.equal(nextEvent(f), 'HANDOVER_RESULT=handed-back');
  await eventually(() => f.fronts().at(-1) === 'front end');

  assert.equal(f.run('turn', '--note', 'Sign in to Test.').status, 0);
  const turn = (await ask(port, key, 'watch')).json;
  assert.deepEqual([turn.control, turn.line], ['turn', 'Sign in to Test.'], 'a turn shows its own note');
  const moved = spawnSync(process.execPath, [browse, 'open', RECEIPT, '--session', SESSION], { cwd: f.cwd, env: f.env, encoding: 'utf8', timeout: 30_000 });
  assert.equal(moved.status, 0, moved.stderr);
  await pause(300);
  assert.equal((await ask(port, key, 'watch')).json.control, 'turn', 'a page change, as a signed-in page, ends no turn');
  assert.equal((await ask(port, key, 'give', {})).json.control, 'assistant', 'Hand back ends the turn');
  assert.equal(nextEvent(f), 'HANDOVER_RESULT=handed-back');

  assert.equal((await ask(port, key, 'stop', {})).status, 404, 'no Stop: to give up, the person says so in the chat');
  const woken = f.sent().map(message => message[2]);
  assert.equal(woken.length, 1, 'Take over wakes the chat');
  assert.match(woken[0], /"mode":"watch","result":"taken-over"/);
  for (const text of woken) assert.doesNotMatch(text, new RegExp(`https?:|trycloudflare|pay\\.example|${key}`));
  assert.equal(f.run('close', '--stopped').stdout.trim(), 'HANDOVER_RESULT=stopped');
});

test('a watch closed by the chat ends done, and a second view is refused while it is open', linux, async t => {
  const f = fixture(t, { view: true });
  openedWatch(f);
  const second = f.run('open', ...VIEW_ARGS);
  assert.equal(second.status, 1);
  assert.match(second.stderr, /A live view is already open in/);
  assert.equal(f.run('close').stdout.trim(), 'HANDOVER_RESULT=done');
});

test('the viewer\'s scripts are served without the key, and nothing beside or above them', linux, async t => {
  const f = fixture(t, { view: true });
  const { port } = openedView(f);
  const get = (path, init) => fetch(`http://127.0.0.1:${port}${path}`, init);
  for (const inside of ['/novnc/core/rfb.js', '/novnc/core/util/int.js', '/novnc/vendor/pako/lib/zlib/inflate.js']) {
    const response = await get(inside);
    assert.equal(response.status, 200, inside);
    assert.match(response.headers.get('content-type'), /^text\/javascript/);
    assert.match(await response.text(), /^export /);
  }
  for (const refused of ['/novnc/app/ui.js', '/novnc/package.js', '/novnc/LICENSE.txt', '/novnc/core/notes.txt', '/novnc/core/absent.js', '/novnc/', '/novnc/core/..%2fapp%2fui.js']) assert.equal((await get(refused)).status, 404, refused);
  assert.equal((await get('/novnc/core/rfb.js', { method: 'POST' })).status, 404);
  for (const climbing of ['/novnc/core/../app/ui.js', '/novnc/core/../../package.js', '/novnc/core/%2e%2e/app/ui.js', '/novnc/vendor/../../../hand-over/state.json', '/novnc/core/../../../../../../../../etc/hostname']) assert.equal(await rawGet(port, climbing), 'HTTP/1.1 404 Not Found', climbing);
});

test('the screen answers only the link\'s key, sent as the subprotocol, and carries the person\'s input to the screen alone', linux, async t => {
  const f = fixture(t, { view: true });
  const { port, key } = openedView(f);
  assert.equal((await upgrade(port, '/screen')).status, 401, 'no key');
  assert.equal((await upgrade(port, '/screen', { protocol: '0'.repeat(64) })).status, 401, 'a wrong key');
  assert.equal((await upgrade(port, `/screen?key=${key}`)).status, 401, 'a key in the address is not taken');
  assert.equal((await upgrade(port, '/stream', { protocol: key })).status, 404, 'another path');
  const ws = await upgrade(port, '/screen', { protocol: key });
  assert.equal(ws.status, 101);
  assert.equal((await ws.bytes(GREETING.length)).toString(), GREETING, 'the screen source\'s own greeting');
  ws.send(2, Buffer.from('a tap'));
  await eventually(() => f.tools.input().toString() === 'a tap');
  assert.ok(f.steps().every(step => /^(url|size|viewport \d+x\d+)$/.test(step)), 'the tap went through the screen, not through a command to the browser');
  ws.end();
});

/** Adds a stand-in password manager and opens its page in the card page's tab, as `browse.mjs addon open` does. */
function openAddonPage(f) {
  f.openPage();
  const install = f.camofox.install;
  writeFileSync(join(install, 'addons.json'), JSON.stringify({ added: [{ guid: 'pm@maker.example', name: 'PM', page: 'popup/index.html', tags: ['password manager'] }] }));
  mkdirSync(join(install, 'profile'), { recursive: true });
  writeFileSync(join(install, 'profile', 'prefs.js'), `user_pref("extensions.webextensions.uuids", ${JSON.stringify(JSON.stringify({ 'pm@maker.example': 'pm-uuid' }))});\n`);
  const shown = spawnSync(process.execPath, [browse, 'addon', 'open', '--session', SESSION], { cwd: f.cwd, env: f.env, encoding: 'utf8', timeout: 30_000 });
  assert.equal(shown.stdout, 'BROWSE_ADDON_PAGE=opened\n', shown.stderr);
  assert.equal(f.page().addon, 'moz-extension://pm-uuid/popup/index.html');
}

test('a view opens over the password manager\'s page that addon open showed, fits under the bar once the person is back on the site, and sets the page\'s own size back', linux, async t => {
  const f = fixture(t, { view: true });
  openAddonPage(f);
  f.env.HANDOVER_KEEPALIVE_MS = '100';

  openedView(f, '--note', 'Sign in to your password manager, then to the shop');
  assert.deepEqual(stateOf(f).view.size, [2560, 1328], 'a size read on that page gives the page\'s own size, for the view\'s end');
  assert.deepEqual(f.page().size, [1280, 663], 'the password manager\'s page takes the wide fit\'s width and keeps its height under the bar');
  await pause(400);
  assert.deepEqual(f.page().size, [1280, 663], 'a few keep-alives on that page change no size');

  f.set('addon-back');
  await eventually(() => {
    const steps = f.steps();
    const at = steps.lastIndexOf('viewport 1280x720');
    return at >= 0 && steps[at + 1] === 'viewport 1280x663';
  });
  assert.deepEqual(f.page().size, [1280, 663], 'back on the site, the bar is read, so the page\'s bottom stays on the screen');
  assert.equal(f.run('close').status, 0);
  assert.deepEqual(f.page().size, [2560, 1328], 'the view\'s end sets the page\'s own size back');
});

test('a view that ends on the password manager\'s page leaves the page\'s own size for the site, which gets it once the person is back there', linux, async t => {
  const f = fixture(t, { view: true });
  openAddonPage(f);
  openedView(f);
  await eventually(() => f.steps().includes('viewport 1280x720'));
  assert.equal(f.run('close').status, 0);
  assert.deepEqual(f.page().size, [2560, 663], 'the view\'s end reaches the password manager\'s page as a width only');
  f.set('addon-back');
  const url = spawnSync(process.execPath, [browse, 'get', 'url', '--session', SESSION], { cwd: f.cwd, env: f.env, encoding: 'utf8', timeout: 30_000 });
  assert.equal(url.status, 0, url.stdout + url.stderr);
  assert.deepEqual(f.page().size, [2560, 1328]);
});

test('while a view is open the watcher reads nothing from the page and keeps the page\'s window in front', linux, async t => {
  const f = fixture(t, { view: true });
  openedView(f);
  await eventually(() => f.fronts().length > 3);
  assert.deepEqual(f.steps(), ['url', 'size', 'viewport 1280x720', 'viewport 1280x663'], 'only the open\'s own reads and fit: no poll reads the page');
  const tool = f.tools.calls('xdotool');
  assert.ok(tool.some(args => args.join(' ') === 'search --classname Navigator'));
  assert.ok(!tool.some(args => args.includes('--class')), '--class finds no browser window');
  const raised = tool.filter(args => args[0] === 'windowraise');
  assert.ok(raised.length > 1, 'raised again at each poll');
  assert.ok(raised.every(args => args[1] === '100'), 'always the page\'s own window');
  assert.ok(f.tools.calls('xdotool', { display: true }).every(display => display === DISPLAY));
  assert.equal(f.fronts()[0], 'front turn', 'the turn\'s tab comes to the front at open');
  assert.ok(f.fronts().length > 2 && f.fronts().slice(1).every(step => step === 'front turn again'), 'and is held and selected again at each poll, unless the person opened a tab of their own');
  f.run('close');
  assert.equal(f.fronts().at(-1), 'front end', 'and let go at the end');
});

test('while a browser pop-up shows, a view\'s polls and keep-alive leave it in front; the page comes back once it closes', linux, async t => {
  const f = fixture(t, { view: true });
  f.env.HANDOVER_KEEPALIVE_MS = '100';
  openedView(f);
  await eventually(() => f.steps().includes('viewport 1280x663') && f.fronts().includes('front turn again'));
  const raises = () => f.tools.calls('xdotool').filter(args => args[0] === 'windowraise').length;
  f.set('popup');
  await eventually(() => f.fronts().includes('front turn kept'));
  const [fronts, steps, raised] = [f.fronts().length, f.steps().length, raises()];
  await eventually(() => f.fronts().length > fronts + 3 && f.steps().slice(steps).includes('keep-alive'));
  assert.ok(f.fronts().slice(fronts).every(step => step === 'front turn kept'), 'each poll renews the turn and selects no tab');
  assert.equal(raises(), raised, 'and raises no window over the pop-up');
  assert.ok(!f.steps().slice(steps).some(step => step.startsWith('viewport')), 'the keep-alive fits nothing, since a fit brings the tab up');
  f.unset('popup');
  await eventually(() => f.fronts().at(-1) === 'front turn again' && raises() > raised);
  f.run('close');
});

test('a view stays open on a page an old finish would have met, until Hand back, then wakes the chat with no address, key, or page content', linux, async t => {
  const f = fixture(t, { view: true, paseo: 'ok' });
  const link = openedView(f);
  const was = kept(f, link);
  const completion = stateOf(f).completionId;
  const ws = await upgrade(link.port, '/screen', { protocol: link.key });
  f.set('count', '0');
  const moved = spawnSync(process.execPath, [browse, 'open', RECEIPT, '--session', SESSION], { cwd: f.cwd, env: f.env, encoding: 'utf8', timeout: 30_000 });
  assert.equal(moved.status, 0, moved.stderr);
  await pause(300);
  assert.ok(existsSync(join(f.state, 'watcher.pid')), 'the receipt\'s address and a gone box end nothing');
  assert.equal((await route(link.port, link.key, 'view')).status, 200, 'the view still answers');
  assert.deepEqual(await route(link.port, link.key, 'give', {}), { status: 200, json: { control: 'assistant' } });
  assert.equal(await ws.closed, true, 'the screen connection ends with the link');
  const receipt = await eventually(async () => {
    const answer = await route(link.port, link.key, 'receipt').catch(() => null);
    return answer?.status === 200 && answer.json;
  });
  assert.deepEqual([receipt.result, receipt.ready, receipt.notification], ['handed-back', true, 'notified']);
  assert.equal((await route(link.port, link.key, 'view')).status, 410, 'a link that is ending answers 410');
  assert.equal((await upgrade(link.port, '/screen', { protocol: link.key })).status, 410);

  const out = f.run('wait');
  assert.equal(out.stdout.trim(), 'HANDOVER_RESULT=handed-back');
  assert.equal(out.rawStdout, `HANDOVER_RESULT=handed-back\nHANDOVER_COMPLETION=${completion}\nHANDOVER_NOTIFICATION=notified\n`, 'no address, key, or page content');
  await assertPutBack(f, was);
  assert.deepEqual(f.result(), { result: 'handed-back' });
  const [message] = f.sent();
  assert.match(message[2], /"mode":"view","result":"handed-back"/);
  const leaks = new RegExp(`https?:|trycloudflare|pay\\.example|Messenger|#check|${link.key}`);
  for (const text of [message[2], readFileSync(join(f.state, 'result.json'), 'utf8')]) assert.doesNotMatch(text, leaks);
  assert.equal(f.sent().length, 1);
});

test('a press of Hand back ends the turn handed-back, once, puts the page back, and wakes the chat', linux, async t => {
  const f = fixture(t, { view: true, paseo: 'ok' });
  const link = openedView(f);
  const was = kept(f, link);
  assert.deepEqual(await route(link.port, link.key, 'give', {}), { status: 200, json: { control: 'assistant' } });
  const again = await route(link.port, link.key, 'give', {});
  assert.ok([409, 410].includes(again.status), 'the turn ends once');
  const out = f.run('wait');
  assert.equal(out.stdout.trim(), 'HANDOVER_RESULT=handed-back');
  assert.match(out.rawStdout, /HANDOVER_NOTIFICATION=notified/);
  await assertPutBack(f, was);
  assert.equal(f.sent().length, 1);
  assert.match(f.sent()[0][2], /"mode":"view","result":"handed-back"/);
  assert.deepEqual(f.timings().map(({ ended, cause: why }) => [ended, why]), [['handed-back', 'hand-back']]);
});

for (const [how, end] of Object.entries({
  'close, the signal the watcher is sent': f => f.run('close'),
  'a watcher that died': async f => {
    process.kill(Number(readFileSync(join(f.state, 'watcher.pid'), 'utf8')), 'SIGKILL');
    await pause(100);
    return f.run('close');
  },
})) {
  test(`a view ended by ${how} is closed, puts the page back, and wakes nobody`, linux, async t => {
    const f = fixture(t, { view: true, paseo: 'ok' });
    const link = openedView(f);
    assert.deepEqual((await route(link.port, link.key, 'fit', { fit: 'phone' })).json.fit, PHONE);
    const was = kept(f, link);
    const out = await end(f, link);
    assert.equal(out.stdout.trim(), 'HANDOVER_RESULT=closed', out.stderr);
    await assertPutBack(f, was);
    assert.deepEqual(f.sent(), [], 'only the person\'s own end announces readiness');
  });
}

test('a view nobody finishes ends as timeout at its limit and puts the page back', linux, async t => {
  const f = fixture(t, { view: true, paseo: 'ok' });
  const link = openedView(f, '--minutes', '0.05');
  const was = kept(f, link);
  const out = f.run('wait');
  assert.equal(out.stdout.trim(), 'HANDOVER_RESULT=timeout');
  assert.match(out.rawStdout, /HANDOVER_NOTIFICATION=not-requested/);
  await assertPutBack(f, was);
  assert.deepEqual(f.sent(), []);
});

test('a live view keeps its page open by setting its fit again, and sends nothing else', linux, async t => {
  const f = fixture(t, { view: true });
  f.env.HANDOVER_KEEPALIVE_MS = '100';
  openedView(f);
  await eventually(() => f.steps().filter(step => step === 'viewport 1280x663').length >= 3);
  assert.deepEqual([...new Set(f.steps())].sort(), ['size', 'url', 'viewport 1280x663', 'viewport 1280x720']);
  assert.equal(f.steps().filter(step => step === 'viewport 1280x720').length, 1, 'the bar is read once');
  assert.equal(f.steps().filter(step => step === 'size').length, 1, 'and the size to put back');
});

test('where the browser shows in its own window, a view opens no link, stays open through a page change, and close is a hand back', async t => {
  const f = fixture(t, { window: true, paseo: 'ok' });
  f.openPage();
  const out = f.run('open', ...VIEW_ARGS);
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /^HANDOVER_VIEW=window\nHANDOVER_SEND=Run wait in the background, then end this turn telling the person what to do in the browser window/);
  assert.doesNotMatch(out.stdout, /HANDOVER_LINK|https?:|key=/);
  assert.deepEqual(f.calls(), [], 'no tunnel');
  assert.equal(f.fronts()[0], 'front turn', 'the task\'s tab comes to the front, held as the person\'s turn');
  await eventually(() => f.fronts().includes('front turn kept'));
  assert.ok(f.fronts().slice(1).every(step => step === 'front turn kept'), 'each poll renews the turn without taking the screen: the window is the person\'s');
  const state = stateOf(f);
  assert.deepEqual(state.view, { note: NOTE, window: true });
  assert.equal(state.key, undefined, 'no key, and no page served');
  f.set('count', '0');
  const moved = spawnSync(process.execPath, [browse, 'open', RECEIPT, '--session', SESSION], { cwd: f.cwd, env: f.env, encoding: 'utf8', timeout: 30_000 });
  assert.equal(moved.status, 0, moved.stderr);
  await pause(300);
  assert.ok(existsSync(join(f.state, 'watcher.pid')), 'a page change ends no window turn');
  assert.equal(f.run('close').stdout.trim(), 'HANDOVER_RESULT=handed-back');
  assert.equal(f.fronts().at(-1), 'front end', 'the close lets go of the turn');
  assert.deepEqual(f.sent(), [], 'the agent\'s own close wakes nobody');
  assert.deepEqual(f.timings().map(({ ended, cause }) => [ended, cause]), [['handed-back', 'close-command']]);
});

test('a view opens nothing while the person\'s turn is open in another chat\'s tab', async t => {
  const f = fixture(t, { window: true });
  f.openPage();
  f.set('front-refused');
  const out = f.run('open', ...VIEW_ARGS);
  assert.equal(out.status, 1);
  assert.match(out.stderr, /The person is using the browser in another chat's tab/);
  assert.doesNotMatch(out.stdout, /HANDOVER_VIEW/);
  assert.ok(!existsSync(join(f.state, 'watcher.pid')), 'no watcher starts');
});

test('the browser on request: a window view needs only a note, holds the chat\'s tab as the person\'s turn, reads no page, and ends on close', async t => {
  const f = fixture(t, { window: true });
  f.openPage(null);
  const out = f.run('open', '--view', '--note', "Here is the browser. Tap Hand back when you're done.");
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /^HANDOVER_VIEW=window\nHANDOVER_SEND=.*say done there in the chat; on done, run close\./);
  assert.doesNotMatch(out.stdout, /HANDOVER_LINK/);
  assert.deepEqual(stateOf(f).view, { note: "Here is the browser. Tap Hand back when you're done.", window: true });
  assert.notEqual(stateOf(f).session, SESSION, 'the chat\'s own tab, with no --session');
  f.set('count', '0');
  await eventually(() => f.fronts().includes('front turn kept'));
  assert.ok(existsSync(join(f.state, 'watcher.pid')), 'still open');
  assert.deepEqual(f.steps(), ['url'], 'only the address, once at open, to know a page is there');
  assert.equal(f.run('close').stdout.trim(), 'HANDOVER_RESULT=handed-back');
  assert.deepEqual([f.fronts()[0], f.fronts().at(-1)], ['front turn', 'front end']);
});

test('every end of a window turn lets go of the turn: a timeout, and a close after the watcher died', async t => {
  const f = fixture(t, { window: true });
  f.openPage();
  const ends = () => f.fronts().filter(step => step === 'front end').length;
  assert.equal(f.run('open', ...VIEW_ARGS, '--minutes', '0.02').status, 0);
  assert.equal(f.run('wait').stdout.trim(), 'HANDOVER_RESULT=timeout');
  assert.deepEqual([f.fronts()[0], f.fronts().at(-1), ends()], ['front turn', 'front end', 1]);
  assert.equal(f.run('open', ...VIEW_ARGS).status, 0);
  process.kill(Number(readFileSync(join(f.state, 'watcher.pid'), 'utf8')), 'SIGKILL');
  await pause(100);
  assert.equal(f.run('close').stdout.trim(), 'HANDOVER_RESULT=closed');
  assert.equal(ends(), 2, 'the close ends the turn the dead watcher held');
});

test('where the browser shows in its own window, a watch opens no link, and a turn there ends only on close', async t => {
  const f = fixture(t, { window: true });
  f.openPage();
  const out = f.run('open', '--watch', '--session', SESSION, '--note', WATCH_NOTE);
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /^HANDOVER_VIEW=window\nHANDOVER_SEND=Run wait in the background/);
  assert.doesNotMatch(out.stdout, /HANDOVER_LINK|https?:|key=/);
  assert.deepEqual(f.calls(), [], 'no tunnel');
  assert.deepEqual(stateOf(f).view, { note: WATCH_NOTE, watch: true, window: true });
  assert.equal(f.run('line', 'Clicking Save…').status, 0, 'the watch is open');
  assert.equal(f.run('turn', '--note', 'Sign in to Test in the browser window, then say done.').status, 0);
  const moved = spawnSync(process.execPath, [browse, 'open', RECEIPT, '--session', SESSION], { cwd: f.cwd, env: f.env, encoding: 'utf8', timeout: 30_000 });
  assert.equal(moved.status, 0, moved.stderr);
  await pause(300);
  assert.match(f.run('turn', '--note', 'Sign in to Test.').stderr, /not the assistant's now: turn/, 'a page change ends no turn');
  assert.equal(f.run('close').stdout.trim(), 'HANDOVER_RESULT=done', 'the person said done: close ends the turn and the watch');
});


const FLIGHTS = { session: 'flights', note: 'Pay for the seat' };
/** Opens a second chat's turn in the open view, on its own page; returns the chat and its open's output. */
function joined(f, name = 'flights', ...args) {
  const other = f.chat(name);
  const page = other.browse('open', RECEIPT, '--session', FLIGHTS.session);
  assert.equal(page.status, 0, page.stdout + page.stderr);
  return { other, out: other.run('open', '--view', '--session', FLIGHTS.session, '--note', FLIGHTS.note, ...args) };
}
/** The view's answer to the page's poll. */
const tabsOf = async link => (await route(link.port, link.key, 'view')).json;

test('a second chat\'s turn joins the open view as a tab behind the one shown: the same link, one tunnel, one screen', linux, async t => {
  const f = fixture(t, { view: true, paseo: 'ok' });
  const link = openedView(f);
  const was = kept(f, link);
  const me = basename(f.state);
  const { other, out } = joined(f);
  assert.equal(out.status, 0, out.stderr);
  assert.equal(/^HANDOVER_LINK=(.+)$/m.exec(out.stdout)?.[1], link.link, 'the same link');
  assert.match(out.stdout, /^HANDOVER_LINK=[^\n]*\nHANDOVER_SEND=[^\n]+$/m);
  assert.equal(f.calls().filter(line => line.startsWith('cloudflared tunnel')).length, 1, 'one tunnel');
  assert.equal(f.tools.calls('x11vnc').length, 1, 'one screen source');
  assert.ok(existsSync(join(other.state, 'watcher.pid')), 'the second chat waits on the same watcher');
  const view = await tabsOf(link);
  assert.deepEqual([view.shown, view.note], [me, NOTE], 'a new tab does not take the screen from the person');
  assert.deepEqual(view.tabs.map(tab => [tab.chat, tab.note, tab.fresh]), [[me, NOTE, false], ['flights', FLIGHTS.note, true]]);
  assert.equal(view.closesAt, Math.max(...view.tabs.map(tab => tab.closesAt)), 'the link stays until its last limit');

  const shown = await route(link.port, link.key, 'show', { chat: 'flights' });
  assert.deepEqual([shown.status, shown.json.shown, shown.json.note], [200, 'flights', FLIGHTS.note]);
  assert.deepEqual(shown.json.tabs.map(tab => tab.fresh), [false, false], 'a tab seen is no longer new');
  assert.deepEqual(f.page().size, FIRST, 'the page shown before gets its size back');
  assert.equal(f.fronts().filter(step => step === 'front end').length, 1, 'and lets go of the turn');
  assert.equal((await route(link.port, link.key, 'show', { chat: me })).json.shown, me, 'and back');
  assert.equal((await route(link.port, link.key, 'show', { chat: 'garage' })).status, 409, 'a chat with no tab');
  assert.deepEqual(f.sent(), [], 'a tap wakes nobody');
  assert.equal(other.run('close').stdout.trim(), 'HANDOVER_RESULT=closed');
  assert.equal(f.run('close').stdout.trim(), 'HANDOVER_RESULT=closed');
  await assertPutBack(f, was);
});

test('Hand back ends the shown chat\'s turn alone, wakes only that chat, and shows the oldest tab left; the last closes the link', linux, async t => {
  const f = fixture(t, { view: true, paseo: 'ok' });
  const link = openedView(f);
  const was = kept(f, link);
  const me = basename(f.state);
  const { other } = joined(f);
  assert.deepEqual(await route(link.port, link.key, 'give', { chat: 'flights' }), { status: 409, json: null }, 'only the shown tab hands back');
  assert.deepEqual(await route(link.port, link.key, 'give', { chat: me }), { status: 200, json: { control: 'assistant' } });
  const out = f.run('wait');
  assert.equal(out.stdout.trim(), 'HANDOVER_RESULT=handed-back');
  assert.match(out.rawStdout, /HANDOVER_NOTIFICATION=notified/);
  assert.deepEqual(f.sent().map(message => message[1]), ['a-full-workspace-id'], 'only the first chat is woken');
  const view = await eventually(async () => {
    const now = await tabsOf(link);
    return now.shown === 'flights' && now;
  });
  assert.deepEqual([view.note, view.tabs.map(tab => tab.chat)], [FLIGHTS.note, ['flights']]);
  assert.ok(existsSync(join(other.state, 'watcher.pid')), 'the other turn is still open');
  assert.ok(await answers(link.port), 'and so is the link');

  assert.equal((await route(link.port, link.key, 'give', { chat: 'flights' })).status, 200);
  const last = other.run('wait');
  assert.equal(last.stdout.trim(), 'HANDOVER_RESULT=handed-back');
  assert.deepEqual(f.sent().map(message => message[1]), ['a-full-workspace-id', 'flights-workspace-id'], 'then only the second');
  assert.match(f.sent()[1][2], /"mode":"view","result":"handed-back"/);
  await assertPutBack(f, was);
  assert.ok(!existsSync(join(f.hub, 'view', 'state.json')), 'the view\'s own files are gone');
  assert.deepEqual(f.timings().map(({ ended, cause }) => [ended, cause]), [['handed-back', 'hand-back'], ['handed-back', 'hand-back']]);
});

test('a chat\'s close and a turn\'s limit each end that turn alone, and wake nobody', linux, async t => {
  const f = fixture(t, { view: true, paseo: 'ok' });
  const link = openedView(f);
  const was = kept(f, link);
  const me = basename(f.state);
  const { other, out } = joined(f, 'flights', '--minutes', '0.05');
  assert.equal(out.status, 0, out.stderr);
  assert.equal(other.run('wait').stdout.trim(), 'HANDOVER_RESULT=timeout', 'the joined turn runs out first');
  const view = await tabsOf(link);
  assert.deepEqual([view.shown, view.tabs.map(tab => tab.chat)], [me, [me]], 'the first chat\'s tab stays shown');
  assert.ok(await answers(link.port), 'and the link open');
  assert.ok(existsSync(join(f.state, 'watcher.pid')) && !existsSync(join(f.state, 'result.json')), 'the first chat has no result');

  const { other: next, out: again } = joined(f, 'garage');
  assert.equal(again.status, 0, again.stderr);
  assert.equal(f.run('close').stdout.trim(), 'HANDOVER_RESULT=closed');
  assert.equal((await tabsOf(link)).shown, 'garage', 'a close ends only its own tab; the one left shows');
  assert.ok(await answers(link.port), 'and the link stays open');
  assert.ok(existsSync(join(next.state, 'watcher.pid')) && !existsSync(join(next.state, 'result.json')), 'that chat has no result');
  assert.equal(next.run('close').stdout.trim(), 'HANDOVER_RESULT=closed');
  await assertPutBack(f, was);
  assert.deepEqual(f.sent(), []);
  assert.deepEqual(f.timings().map(({ ended, cause }) => [ended, cause]), [['timeout', 'deadline'], ['closed', 'close-command'], ['closed', 'close-command']]);
});

test('a watch link and a turn by link keep each other out', linux, async t => {
  const f = fixture(t, { view: true });
  const me = basename(f.state);
  openedWatch(f);
  const { out: refused } = joined(f);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, new RegExp(`A live view is already open in ${me}\\.`));
  assert.equal(f.run('close').status, 0);

  openedView(f);
  const watch = f.chat('tools').run('open', '--watch', '--session', FLIGHTS.session, '--note', WATCH_NOTE);
  assert.equal(watch.status, 1);
  assert.match(watch.stderr, new RegExp(`A live view is already open in ${me}\\.`));
  assert.equal(f.tools.calls('x11vnc').length, 2, 'one source for the watch, one for the view');
});

test('a screen source that exits is started again on the same socket, and one that can not be ends the view as an error', linux, async t => {
  const f = fixture(t, { view: true });
  const link = openedView(f);
  const was = kept(f, link);
  const ws = await upgrade(link.port, '/screen', { protocol: link.key });
  await ws.bytes(GREETING.length);
  process.kill(was.view.sourcePid, 'SIGKILL');
  assert.equal(await ws.closed, true, 'the page\'s connection drops with it');
  const second = await eventually(() => {
    const pid = stateOf(f)?.view.sourcePid;
    return pid !== was.view.sourcePid && alive(pid) && pid;
  });
  assert.deepEqual(f.tools.calls('x11vnc'), [SOURCE_ARGS(was.view.dir), SOURCE_ARGS(was.view.dir)]);
  const again = await eventually(async () => {
    const socket = await upgrade(link.port, '/screen', { protocol: link.key });
    return socket.status === 101 && socket;
  });
  assert.equal((await again.bytes(GREETING.length)).toString(), GREETING);
  again.end();

  f.set('x11vnc-fails');
  process.kill(second, 'SIGKILL');
  const out = f.run('wait');
  assert.equal(out.stdout.trim(), 'HANDOVER_RESULT=error');
  await assertPutBack(f, { ...was, view: { ...was.view, sourcePid: second } });
});

test('install-view adds what is missing, or prints the one command for the person and installs nothing', linux, t => {
  const f = fixture(t, { view: true });
  const ready = f.run('install-view');
  assert.equal(ready.status, 0, ready.stderr);
  assert.equal(ready.stdout, 'HANDOVER_INSTALLED=live-view\n');
  assert.deepEqual(f.tools.calls('apt-get'), [], 'with everything there, nothing runs');

  const made = ['x11vnc', 'xdotool'].map(name => join(f.root, `installed-${name}`));
  f.set('apt-creates.json', JSON.stringify(made));
  Object.assign(f.env, { HANDOVER_X11VNC_BIN: made[0], HANDOVER_XDOTOOL_BIN: made[1] });
  f.set('apt-fails');
  const failed = f.run('install-view');
  assert.equal(failed.status, 1);
  assert.equal(failed.stdout, '');
  assert.match(failed.stderr, /The live view's tools are not installed: apt-get did not install x11vnc and xdotool; see its lines above\./);
  f.unset('apt-fails');
  const added = f.run('install-view');
  assert.equal(added.status, 0, added.stderr);
  assert.equal(added.stdout, 'HANDOVER_INSTALLED=live-view\n');
  assert.deepEqual(f.tools.calls('apt-get'), Array(2).fill(['install', '-y', '--no-install-recommends', 'x11vnc', 'xdotool']));

  Object.assign(f.env, f.tools.env('apt-get', 'sudo', 'x11vnc'));
  rmSync(join(dirname(f.hub), 'live-view'), { recursive: true });
  const manual = f.run('install-view');
  assert.equal(manual.status, 1);
  assert.equal(manual.stdout, 'HANDOVER_INSTALL=manual\nsudo apt-get install -y --no-install-recommends x11vnc xdotool\n');
  assert.match(manual.stderr, /Nothing was installed/);
  assert.ok(!existsSync(join(dirname(f.hub), 'live-view')), 'not the viewer either, which needs no admin rights');
  assert.equal(f.tools.calls('apt-get').length, 2);
});

test('a closed view refuses every route and the screen', async t => {
  const reserved = createServer();
  await new Promise(done => reserved.listen(0, '127.0.0.1', done));
  const port = reserved.address().port;
  await new Promise(done => reserved.close(done));
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-hand-over-screen-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  let fits = 0;
  const close = await servePage({ port, key: 'closed-key', view: { note: NOTE, dir } }, { onFit: async () => { fits++; } });
  t.after(close);
  assert.equal((await route(port, 'closed-key', 'view')).status, 200);
  assert.equal((await upgrade(port, '/screen', { protocol: 'closed-key' })).status, 503, 'a link with no screen source running');
  await close.stopInput();
  for (const [path, body] of [['view'], ['fit', { fit: 'phone' }], ['give', {}]]) assert.equal((await route(port, 'closed-key', path, body)).status, 410, path);
  assert.equal((await upgrade(port, '/screen', { protocol: 'closed-key' })).status, 410);
  assert.equal((await upgrade(port, '/screen')).status, 401);
  const receipt = await route(port, 'closed-key', 'receipt');
  assert.deepEqual([receipt.status, receipt.json.finishing], [202, true]);
  assert.equal(fits, 0);
});

test('a view handed back notifies the full originating workspace without wait; the receipt dispatches once', linux, async t => {
  const f = fixture(t, { view: true, paseo: 'ok' });
  const link = openedView(f);
  const state = stateOf(f);
  assert.equal(JSON.parse(readFileSync(join(f.hub, 'view', 'state.json'), 'utf8')).agentId, undefined, 'the view names no chat to wake');
  assert.equal(state.target.agentId, 'a-full-workspace-id', 'each turn names its own, since a view serves several chats');
  assert.match(state.completionId, /^[a-f0-9]{32}$/);
  await handBack(link);
  const receipt = await eventually(async () => {
    const response = await fetch(`http://127.0.0.1:${link.port}/receipt`, { headers: { 'x-hand-over-key': link.key } }).catch(() => null);
    return response?.status === 200 && await response.json();
  });
  assert.equal(receipt.notification, 'notified');
  assert.equal(receipt.ready, true);
  assert.equal((await fetch(`http://127.0.0.1:${link.port}/receipt`)).status, 403);
  const [sent] = f.sent();
  assert.equal(sent[0], 'send'); assert.equal(sent[1], 'a-full-workspace-id');
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
  test(`completion keeps its result when notification is ${paseo ?? 'missing'}`, linux, async t => {
    const f = fixture(t, { view: true, paseo });
    await handBack(openedView(f));
    f.run('wait');
    const result = JSON.parse(readFileSync(join(f.state, 'result.json'), 'utf8'));
    assert.equal(result.result, 'handed-back'); assert.equal(result.notification, notification);
    assert.equal(f.sent().length, paseo ? 1 : 0);
  });
}

test('a CLI without originating identity never infers a target or opens another workspace', linux, async t => {
  const f = fixture(t, { view: true, paseo: 'ok', agentId: '' });
  await handBack(openedView(f));
  f.run('wait');
  assert.equal(f.sent().length, 0);
  assert.equal(JSON.parse(readFileSync(join(f.state, 'result.json'), 'utf8')).notification, 'unavailable');
});

const deadlineOf = f => JSON.parse(readFileSync(join(f.state, 'state.json'), 'utf8')).deadline;

test('--guide goes with --keys only, and a bad guide exits 2 with KEYS_GUIDE= before any link', t => {
  const f = fixture(t, { checkout: true });
  const usage = f.run('open', '--guide', 'guide.json');
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /--guide goes with --keys only/);
  assert.match(f.run('open', '--view', '--note', NOTE, '--guide', 'guide.json').stderr, /--guide goes with --keys only/);
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
  assert.equal(f.camofox.starts(), 0);

  const entry = { title: 'Maps key', url: 'https://maps.example.com/keys', steps: ['Copy the key'] };
  writeFileSync(guide, JSON.stringify({ MAPS_API_KEY: entry }));
  opened(f, '--keys', 'MAPS_API_KEY', '--guide', guide);
  assert.deepEqual(JSON.parse(readFileSync(join(f.state, 'state.json'), 'utf8')).keys.keys[0].guide, entry);
});

test('every key link defaults to 24 hours and honors an explicit time limit', t => {
  const f = fixture(t, { checkout: true });
  const minutes = (...args) => {
    const before = Date.now();
    opened(f, ...args);
    const deadline = deadlineOf(f);
    assert.equal(f.run('close').status, 0);
    return [(deadline - Date.now()) / 60_000, (deadline - before) / 60_000];
  };
  for (const [args, want] of [[KEYS, 1440], [[...KEYS, '--minutes', '30'], 30]]) {
    const [low, high] = minutes(...args);
    assert.ok(low <= want && high >= want, `${args.join(' ')}: ${low}–${high} minutes, not ${want}`);
  }
});

test('an unopened key link gives way to a new open, and its wait prints closed, unopened, and whose link took its place', async t => {
  {
    const f = fixture(t, { checkout: true });
    const first = opened(f, '--keys', 'MAPS_API_KEY');
    const completion = JSON.parse(readFileSync(join(f.state, 'state.json'), 'utf8')).completionId;
    const waited = f.start('wait');
    await pause(300);
    const second = opened(f, ...KEYS);
    assert.notEqual(second.key, first.key, 'a new link, with its own key');
    assert.ok(!(await answers(first.port)), 'the first link\'s page is gone');
    assert.ok(await answers(second.port));
    const lines = (await waited).rawStdout.trim().split('\n');
    assert.deepEqual(lines, ['HANDOVER_RESULT=closed', 'HANDOVER_SAVED=', 'HANDOVER_APP_KEYS=', 'HANDOVER_OPENED=no', `HANDOVER_REPLACED_BY=${basename(f.cwd)}`, `HANDOVER_COMPLETION=${completion}`, 'HANDOVER_NOTIFICATION=not-requested']);
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

/** Fakes the app's inbox for the fixture's commands; returns a reader of each call they made, oldest first. */
function fakeInbox(f) {
  const log = join(f.root, 'inbox.jsonl');
  Object.assign(f.env, inboxEnv(log));
  return () => inboxCalls(log);
}

/** The inbox listing of the link `state` describes, once it came, checked to hold only its six fields. */
async function listing(calls, state) {
  const put = await eventually(() => calls().find(call => call.route === 'item' && call.body.id === state.completionId));
  assert.deepEqual(Object.keys(put.body).sort(), ['actions', 'body', 'closesAt', 'id', 'kind', 'title', 'version', 'workspace']);
  const { body, kind, actions, version, closesAt, ...named } = put.body;
  assert.deepEqual({ kind, actions, version, closesAt }, { kind: 'link', actions: [], version: 'link', closesAt: state.deadline });
  assert.deepEqual(Object.keys(JSON.parse(body)).sort(), ['url', 'what']);
  return { ...named, ...JSON.parse(body) };
}

const closedIn = calls => calls().filter(call => call.route === 'item-close').map(call => call.body.id);

test('each key link is listed in the inbox by its address alone, and leaves it once given way, closed, or run out', async t => {
  const f = fixture(t, { checkout: true });
  const calls = fakeInbox(f);
  const ids = [];
  for (const args of [KEYS, KEYS, [...KEYS, '--minutes', '0.05']]) {
    const link = opened(f, ...args);
    const state = stateOf(f);
    ids.push(state.completionId);
    assert.deepEqual(await listing(calls, state), { id: state.completionId, title: 'Maps API key', workspace: basename(f.cwd), what: 'key', url: link.link });
    if (ids.length === 2) {
      assert.deepEqual(closedIn(calls), ids.slice(0, 1), 'the unopened key link gave way');
      f.run('close');
    }
  }
  assert.equal(f.run('wait').stdout, 'HANDOVER_RESULT=timeout\nHANDOVER_SAVED=\nHANDOVER_APP_KEYS=\nHANDOVER_OPENED=no\n');
  assert.deepEqual(closedIn(calls), ids);
});

test('an app that never answers holds back no link\'s end: a new key link takes an unopened one\'s place, and close returns, in time', async t => {
  const f = fixture(t, { checkout: true });
  Object.assign(f.env, inboxEnv(join(f.root, 'inbox.jsonl'), { hang: true }));
  opened(f, '--keys', 'MAPS_API_KEY');
  // The listing and its close share one 3 s limit, run beside the 1.2 s pause: well inside close's 5 s check.
  for (const step of [() => opened(f, '--keys', 'MAPS_API_KEY'), () => assert.match(f.run('close').stdout, /^HANDOVER_RESULT=closed$/m)]) {
    const began = Date.now();
    step();
    assert.ok(Date.now() - began < 5000, `${Date.now() - began} ms`);
  }
});

test('a live view is listed by what it asks, never its note, and leaves the inbox once done', linux, async t => {
  const f = fixture(t, { view: true });
  const calls = fakeInbox(f);
  const link = openedView(f, '--note', 'Tap the box that says you are human');
  const state = stateOf(f);
  assert.deepEqual(await listing(calls, state), { id: state.completionId, title: 'Your turn in the browser', workspace: basename(process.cwd()), what: 'view', url: link.link });
  await handBack(link);
  assert.equal(f.run('wait').stdout, 'HANDOVER_RESULT=handed-back\n');
  assert.deepEqual(closedIn(calls), [state.completionId]);
  assert.doesNotMatch(JSON.stringify(calls()), /human/);
});

// The repo's own parts come through the profile's slots: WONG_BROWSER_PROFILE names a stand-in, or none when empty.
const SLOT_KEY = 'sk_live_Slot123';
test('a profile fills the look, the inbox, and the chat wake, and each gets the link', async t => {
  const f = fixture(t, { checkout: true });
  const log = join(f.root, 'slots.jsonl');
  f.env.WONG_BROWSER_PROFILE = join(f.root, 'profile.mjs');
  writeFileSync(f.env.WONG_BROWSER_PROFILE, `import { appendFileSync } from 'node:fs';
const note = (...call) => appendFileSync(${JSON.stringify(log)}, JSON.stringify(call) + '\\n');
export default {
  look: () => ({ css: ':root { --stub-look: 1; }', themeJs: 'stubTheme();' }),
  wakeChat: (state, message) => { note('wakeChat', state.completionId, message); return 'notified'; },
  inbox: {
    companyFor: async () => 'client',
    listLink: async (client, listing) => note('listLink', client, listing.id),
    closeItem: async (client, id) => note('closeItem', client, id),
    inTime: job => job,
  },
};
`);
  const { port, key } = opened(f, ...KEYS);
  const { completionId } = stateOf(f);
  const sheet = await (await fetch(`http://127.0.0.1:${port}/page.css`)).text();
  assert.ok(sheet.startsWith(':root { --stub-look: 1; }\n'), 'the profile\'s look first');
  assert.match(sheet, /\.steps > li::before/, 'then the private page\'s own rules');
  assert.equal(await (await fetch(`http://127.0.0.1:${port}/theme.js`)).text(), 'stubTheme();');
  await route(port, key, 'save', { keys: { MAPS_API_KEY: SLOT_KEY } });
  assert.match(f.run('wait').rawStdout, /^HANDOVER_NOTIFICATION=notified$/m);
  const calls = () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : []);
  await eventually(() => calls().length === 3);
  assert.deepEqual(calls().filter(([slot]) => slot !== 'wakeChat'), [['listLink', 'client', completionId], ['closeItem', 'client', completionId]]);
  const [, id, message] = calls().find(([slot]) => slot === 'wakeChat');
  assert.equal(id, completionId);
  assert.ok(message.includes(completionId) && !message.includes(SLOT_KEY), 'the wake names the link, never the key');
});

test('with no profile, a private page has the plain look and no switch, and nothing is listed or woken', async t => {
  const f = fixture(t, { checkout: true, paseo: 'ok' });
  const calls = fakeInbox(f);
  f.env.WONG_BROWSER_PROFILE = '';
  const { port, key } = opened(f, ...KEYS);
  const sheet = await (await fetch(`http://127.0.0.1:${port}/page.css`)).text();
  assert.ok(sheet.startsWith(readFileSync(join(repo, '.agents/skills/browser/skills/hand-over/scripts/plain-look.css'), 'utf8')), 'the plain look');
  assert.match(sheet, /--primary: #171717;[\s\S]*\.steps > li::before/, 'its tokens, then the page\'s rules');
  assert.equal(await (await fetch(`http://127.0.0.1:${port}/theme.js`)).text(), '');
  await route(port, key, 'save', { keys: { MAPS_API_KEY: SLOT_KEY } });
  assert.match(f.run('wait').rawStdout, /^HANDOVER_NOTIFICATION=unavailable$/m);
  assert.deepEqual([calls(), f.sent()], [[], []], 'no inbox call and no chat woken');
  assert.match(readFileSync(join(f.cwd, '.env'), 'utf8'), /^MAPS_API_KEY=/m, 'the key went to the top .env');
});
