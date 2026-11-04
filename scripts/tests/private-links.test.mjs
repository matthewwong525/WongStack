// Several private links: one per chat, one live view on the computer, and only its own chat reaches an older link.
// Each test has its own HOME, a fake cloudflared, and fake watchers: it never opens a real tunnel or a real link.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { refNames } from '../../.agents/skills/browser/scripts/browse.mjs';
import { finished, pageFault, seen, signInBoxes } from '../../.agents/skills/hand-over/scripts/hand-over.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '../../.agents/skills/hand-over/scripts/hand-over.mjs');
const KEY = 'MAPS_API_KEY';

const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
const pause = ms => new Promise(done => setTimeout(done, ms));

/** A HOME of its own with a fake cloudflared first on PATH; `chat(name)` makes a checkout that chat runs in. */
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-links-'));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'cloudflared'), `#!/bin/sh
[ "$1" = "--version" ] && exit 0
echo "INF |  https://quiet-fox-lamp.trycloudflare.com  |" >&2
echo "INF Registered tunnel connection connIndex=0" >&2
exec sleep 600
`);
  chmodSync(join(bin, 'cloudflared'), 0o755);
  const env = { ...process.env, HOME: root, PATH: `${bin}:/usr/bin:/bin`, HANDOVER_PROBE_ORIGIN: 'http://127.0.0.1:{port}', HANDOVER_POLL_MS: '50', PASEO_AGENT_ID: '', PASEO_HOME: '', PASEO_HOST: '' };
  const home = join(root, '.wong-stack/hand-over');
  const fakes = [];
  const chats = new Set();
  const chat = (name, extra = {}) => {
    const cwd = join(root, name);
    if (!existsSync(cwd)) {
      mkdirSync(cwd);
      execFileSync('git', ['init', '-q', '-b', 'main'], { cwd, stdio: 'ignore' });
      writeFileSync(join(cwd, '.gitignore'), '.env*\n!.env.example\n');
      writeFileSync(join(cwd, '.env.example'), `# The Maps key.\n${KEY}=\n`);
    }
    chats.add(name);
    return {
      run: (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd, env: { ...env, ...extra }, encoding: 'utf8', timeout: 30_000 }),
      /** Runs a command beside the test, as `wait` blocks; resolves to its status and output. */
      start: (...args) => new Promise(done => {
        const child = spawn(process.execPath, [SCRIPT, ...args], { cwd, env: { ...env, ...extra }, stdio: ['ignore', 'pipe', 'pipe'] });
        const out = { stdout: '', stderr: '' };
        for (const stream of ['stdout', 'stderr']) child[stream].on('data', chunk => { out[stream] += chunk; });
        child.on('close', status => done({ ...out, status }));
      }),
      dir: join(home, 'links', name),
    };
  };
  /** A watcher that only stays alive, for a link this test writes by hand. The shell leaves it to init, so a
   * killed one is gone at once, never a zombie that still answers as alive. */
  const fakeWatcher = () => {
    const pid = Number(execFileSync('sh', ['-c', `"${process.execPath}" -e 'setInterval(() => {}, 1e6)' >/dev/null 2>&1 & echo $!`], { encoding: 'utf8' }));
    fakes.push(pid);
    return pid;
  };
  /** Writes a link's files in `dir` with a live fake watcher; resolves to the watcher's pid. */
  const place = (dir, state) => {
    mkdirSync(dir, { recursive: true });
    const pid = fakeWatcher();
    writeFileSync(join(dir, 'state.json'), `${JSON.stringify({ completionId: 'c0ffee', ...state })}\n`);
    writeFileSync(join(dir, 'watcher.pid'), `${pid}\n`);
    return pid;
  };
  /** Fake live-view tools, so a view's open passes the tool check and stops at the page: no browser runs here. */
  const viewTools = () => {
    for (const name of ['x11vnc', 'xdotool']) {
      writeFileSync(join(bin, name), '#!/bin/sh\nexit 0\n');
      chmodSync(join(bin, name), 0o755);
    }
    const core = join(root, '.wong-stack/live-view/novnc-1.6.0/core');
    mkdirSync(core, { recursive: true });
    writeFileSync(join(core, 'rfb.js'), '');
  };
  t.after(() => {
    for (const name of chats) chat(name).run('close');
    for (const pid of fakes) try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ }
    rmSync(root, { recursive: true, force: true });
  });
  return { root, bin, home, chat, place, fakeWatcher, viewTools };
}

/** Opens a key link in `c` and returns the live watcher's pid. */
function openKeys(c) {
  const out = c.run('open', '--keys', KEY, '--minutes', '5');
  assert.equal(out.status, 0, out.stdout + out.stderr);
  assert.match(out.stdout, /^HANDOVER_LINK=https:\/\/quiet-fox-lamp\.trycloudflare\.com\/#key=[^\n]*\nHANDOVER_SEND=[^\n]+$/m);
  const send = out.stdout.match(/^HANDOVER_SEND=(.*)$/m)[1];
  assert.doesNotMatch(send, /https?:|key=|trycloudflare/, 'the reminder holds no link or key');
  const pid = Number(readFileSync(join(c.dir, 'watcher.pid'), 'utf8'));
  assert.ok(alive(pid));
  return pid;
}

/** Every file in `dir` and its text, to show nothing there changed. */
const snapshot = dir => Object.fromEntries(readdirSync(dir).filter(name => name !== 'links' && name !== 'timings.jsonl').map(name => [name, readFileSync(join(dir, name), 'utf8')]));

test('two chats each open a link, and close in one leaves the other open', t => {
  const f = fixture(t);
  const [a, b] = [f.chat('chat-a'), f.chat('chat-b')];
  const first = openKeys(a);
  const second = openKeys(b);
  assert.notEqual(first, second);
  const closed = b.run('close');
  assert.match(closed.stdout, /^HANDOVER_RESULT=closed$/m);
  assert.ok(!existsSync(join(b.dir, 'watcher.pid')));
  assert.ok(alive(first), 'chat A keeps its link');
  assert.ok(existsSync(join(a.dir, 'state.json')));
  assert.match(a.run('close').stdout, /^HANDOVER_RESULT=closed$/m);
});

test('an unopened key link gives way to a new one from the same chat only', async t => {
  const f = fixture(t);
  const [a, b] = [f.chat('chat-a'), f.chat('chat-b')];
  const other = openKeys(b);
  const old = openKeys(a);
  const waited = a.start('wait');
  await pause(300);
  const fresh = openKeys(a);
  const out = await waited;
  assert.match(out.stdout, /^HANDOVER_RESULT=closed$/m);
  assert.match(out.stdout, /^HANDOVER_REPLACED_BY=chat-a$/m);
  assert.ok(!alive(old));
  assert.ok(alive(fresh));
  assert.ok(alive(other), 'the other chat\'s unopened key link stays open');
});

test('a busy link in the same chat blocks a new one and names the chat', t => {
  const f = fixture(t);
  const a = f.chat('chat-a');
  const pid = openKeys(a);
  writeFileSync(join(a.dir, 'opened'), '');
  const out = a.run('open', '--keys', KEY);
  assert.equal(out.status, 1);
  assert.match(out.stderr, /A private link is already open in chat-a\./);
  assert.doesNotMatch(out.stdout, /^HANDOVER_(LINK|SEND)=/m);
  assert.ok(alive(pid));
});

test('a second live view is refused from any chat and names the holder', t => {
  const f = fixture(t);
  const b = f.chat('chat-b');
  const view = f.place(join(f.home, 'links', 'chat-a'), { view: { display: ':97' }, cwd: join(f.root, 'chat-a') });
  const before = snapshot(join(f.home, 'links', 'chat-a'));
  const out = b.run('open', '--view', '--until', '**/done');
  assert.equal(out.status, 1);
  assert.match(out.stderr, /^A live view is already open in chat-a\.$/m);
  assert.doesNotMatch(out.stdout, /^HANDOVER_(LINK|SEND)=/m);
  assert.ok(alive(view));
  assert.deepEqual(snapshot(join(f.home, 'links', 'chat-a')), before);
  assert.ok(!existsSync(b.dir), 'a refused view writes nothing');
});

test('an older link\'s live view still counts; a dead one or another chat\'s form does not', t => {
  const f = fixture(t);
  const b = f.chat('chat-b');
  const old = f.place(f.home, { view: { display: ':97' }, cwd: '/root/.paseo/worktrees/x/modest-toad' });
  assert.match(b.run('open', '--view', '--until', '**/done').stderr, /A live view is already open in modest-toad\./);
  process.kill(old, 'SIGKILL');
  f.place(join(f.home, 'links', 'chat-a'), { form: { title: 'Pay' } });
  // Past the check, a HOME without the viewer stops at the missing tools: no browser is asked.
  const out = b.run('open', '--view', '--until', '**/done');
  assert.equal(out.status, 3, out.stderr);
  assert.match(out.stdout, /^HANDOVER_NEEDS=live-view$/m);
});

test('an older link in the shared place stays untouched while a chat opens and closes its own', t => {
  const f = fixture(t);
  const a = f.chat('chat-a');
  const old = f.place(f.home, { form: { title: 'Bank details' }, cwd: '/root/.paseo/worktrees/x/modest-toad' });
  writeFileSync(join(f.home, 'result.json'), '{"result":"done"}\n');
  writeFileSync(join(f.home, 'opened'), '');
  const before = snapshot(f.home);
  openKeys(a);
  assert.deepEqual(snapshot(f.home), before);
  assert.match(a.run('close').stdout, /^HANDOVER_RESULT=closed$/m);
  assert.deepEqual(snapshot(f.home), before);
  assert.ok(alive(old));
});

test('a view another chat is still starting counts; its mark goes away on every exit', t => {
  const f = fixture(t);
  const [a, b] = [f.chat('chat-a'), f.chat('chat-b')];
  mkdirSync(a.dir, { recursive: true });
  const opener = f.fakeWatcher();
  writeFileSync(join(a.dir, `view-opener.${opener}`), `${opener}\n`);
  assert.match(b.run('open', '--view', '--until', '**/done').stderr, /^A live view is already open in chat-a\.$/m);
  process.kill(opener, 'SIGKILL');
  f.viewTools();
  // Past both checks the open fails at the page, since this HOME has no browser; the opener's mark is gone.
  const out = b.run('open', '--view', '--until', '**/done');
  assert.equal(out.status, 1, out.stderr);
  assert.match(out.stderr, /No page is open in this browser session/);
  assert.deepEqual(readdirSync(b.dir).filter(name => name.startsWith('view-opener.')), []);
});

test('wait and close reach this chat\'s own older link in the shared place, never another chat\'s', async t => {
  const f = fixture(t);
  const [a, b] = [f.chat('chat-a'), f.chat('chat-b')];
  const own = f.place(f.home, { keys: { keys: [] }, cwd: join(f.root, 'chat-a') });
  const before = snapshot(f.home);
  assert.match(b.run('close').stderr, /No private link is open\./);
  assert.equal(b.run('wait').status, 1);
  assert.deepEqual(snapshot(f.home), before);
  const waited = a.start('wait');
  // A loaded machine can take a second to start node; the wait must find the older state first.
  await pause(1500);
  writeFileSync(join(f.home, 'result.json'), '{"result":"done","completionId":"c0ffee","notification":"not-requested"}\n');
  rmSync(join(f.home, 'state.json'));
  rmSync(join(f.home, 'watcher.pid'));
  process.kill(own, 'SIGKILL');
  const out = await waited;
  assert.match(out.stdout, /^HANDOVER_RESULT=done$/m);
  rmSync(join(f.home, 'result.json'));
  const again = f.place(f.home, { form: { title: 'Pay' }, session: 'chat-a', cwd: join(f.root, 'chat-a', 'app') });
  assert.match(a.run('close').stdout, /^HANDOVER_RESULT=closed$/m);
  assert.ok(!alive(again));
  assert.ok(!existsSync(join(f.home, 'watcher.pid')));
});

test('a chat with its own link and an older one closes its own at once and leaves the older one', t => {
  const f = fixture(t);
  const a = f.chat('chat-a');
  const old = f.place(f.home, { form: { title: 'Pay' }, cwd: join(f.root, 'chat-a') });
  const before = snapshot(f.home);
  openKeys(a);
  const closed = a.run('close');
  assert.match(closed.stdout, /^HANDOVER_RESULT=closed$/m);
  assert.match(a.run('wait').stdout, /^HANDOVER_RESULT=closed$/m);
  assert.deepEqual(snapshot(f.home), before);
  assert.ok(alive(old));
});

test('a finished link wakes only the chat that opened it', async t => {
  const f = fixture(t);
  const log = join(f.root, 'woken.log');
  writeFileSync(join(f.bin, 'paseo'), `#!/bin/sh
echo "$2" >> "${log}"
printf '{"status":"sent","agentId":"%s"}' "$2"
`);
  chmodSync(join(f.bin, 'paseo'), 0o755);
  const [a, b] = [f.chat('chat-a', { PASEO_AGENT_ID: 'agent-a' }), f.chat('chat-b', { PASEO_AGENT_ID: 'agent-b' })];
  openKeys(a);
  openKeys(b);
  const { port, key } = JSON.parse(readFileSync(join(b.dir, 'state.json'), 'utf8'));
  const saved = await fetch(`http://127.0.0.1:${port}/save`, { method: 'POST', headers: { 'x-hand-over-key': key, 'content-type': 'application/json' }, body: JSON.stringify({ keys: { [KEY]: 'abc123' } }) });
  assert.equal(saved.status, 200);
  const out = await b.start('wait');
  assert.match(out.stdout, /^HANDOVER_RESULT=done$/m);
  assert.match(out.stdout, /^HANDOVER_NOTIFICATION=notified$/m);
  assert.equal(readFileSync(log, 'utf8'), 'agent-b\n');
  assert.ok(existsSync(join(a.dir, 'watcher.pid')), 'chat A\'s link stays open');
});

test('a hidden frame meets --until-gone, and --until-text holds only when the words show', async () => {
  const page = { countShown: async () => 0, count: async () => 1, hasText: async words => words === 'Card saved', url: async () => 'https://shop.test/pay' };
  assert.equal(finished({ untilGone: '#card-frame' }, await seen(page, { untilGone: '#card-frame' })), true);
  assert.equal(finished({ untilText: 'Card saved' }, await seen(page, { untilText: 'Card saved' })), true);
  assert.equal(finished({ untilText: 'Order placed' }, await seen(page, { untilText: 'Order placed' })), false);
  assert.equal(finished({ untilText: 'Card saved' }, { text: null }), false, 'words that can not be read are not met');
  assert.equal(finished({ until: 'https://shop.test/*', untilText: 'Order placed' }, { url: 'https://shop.test/pay', text: false }), false);
});

test('a finish met at open still refuses, and a page that can not be read is no page', async () => {
  const page = { countShown: async () => 0, hasText: async () => true, url: async () => 'https://shop.test/pay' };
  assert.equal(await pageFault(page, { untilText: 'Card saved' }, 'met'), 'met');
  assert.equal(await pageFault({ ...page, hasText: async () => false }, { untilText: 'Card saved' }, 'met'), null);
  const gone = { countShown: async () => { throw new Error('no tab'); } };
  assert.match(await pageFault(gone, { untilGone: '#card-frame' }, 'met'), /No page is open/);
});

test('--sign-in takes up to three boxes, with a username or a password box', () => {
  assert.deepEqual(signInBoxes('e1,e2,e3'), ['e1', 'e2', 'e3']);
  assert.deepEqual(signInBoxes('e1,,e3'), ['e1', null, 'e3']);
  assert.deepEqual(signInBoxes(',e2'), [null, 'e2', null]);
  assert.equal(signInBoxes(',,e3'), null);
  assert.equal(signInBoxes('e1,e2,e3,e4'), null);
  assert.equal(signInBoxes('--until,e2'), null);
});

test('the sign-in flags go with a one-site password link only, and a finish comes with --sign-in', t => {
  const c = fixture(t).chat('chat-a');
  const refused = [
    ['--keys', KEY, '--sign-in', 'e1,e2'],
    ['--passwords', '--sign-in', 'e1,e2'],
    ['--passwords', '--site', 'shop.test', '--until', 'https://shop.test/account*'],
    ['--passwords', '--site', 'shop.test', '--sign-in', 'e1,e2'],
    ['--passwords', '--site', 'shop.test', '--until-text', 'Hi', '--sign-in', ',,e3'],
    ['--passwords', '--site', 'shop.test', '--until-text', 'one\ntwo', '--sign-in', 'e1,e2'],
  ];
  for (const args of refused) assert.equal(c.run('open', ...args).status, 2, args.join(' '));
});

const FORM = { title: 'Pay', site: 'Shop', fields: [{ label: 'Card', kind: 'cc-number', target: 'e1' }], submit: { label: 'Pay', target: 'e2' } };

/** What the fake page answers to a read: its address, the shown count, whether its words show, or its size. */
const evaluated = (b, expression) => (expression === 'location.href' ? b.url : expression.includes('function shownCount') ? b.shown
  : expression.includes('function hasWords') ? b.text : expression === '[innerWidth, innerHeight]' ? [1280, 720] : expression.startsWith('[') ? [[], []] : 1);

/** A fake browser server in the test's HOME, for session `pay`: a page at `url` with `lines`, `shown` matches of the
 * finish, and `onClick`. It records every step but a read in `calls`; no real browser or site is reached. */
async function fakeBrowser(t, f, page = {}) {
  const b = { url: 'https://shop.test/pay', shown: 1, text: false, lines: ['- textbox "Card" [e1]', '- button "Pay" [e2]'], calls: [], onClick: () => {}, ...page };
  const server = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    const data = body ? JSON.parse(body) : {};
    const route = new URL(request.url, 'http://browser').pathname.split('/').at(-1);
    const answer = value => response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(value));
    if (!['evaluate', 'snapshot', 'health'].includes(route)) b.calls.push({ route, ...data });
    if (route === 'evaluate') return answer({ result: evaluated(b, data.expression) });
    if (route === 'snapshot') return answer({ snapshot: b.lines.join('\n'), url: b.url, refsCount: b.lines.length, hasMore: false });
    if (route === 'screenshot') return response.writeHead(200, { 'content-type': 'image/png' }).end(Buffer.from('png'));
    if (route === 'click') b.onClick(data);
    answer({ ok: true });
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const dir = join(f.root, '.wong-stack/camoufox');
  mkdirSync(join(dir, 'tabs'), { recursive: true });
  writeFileSync(join(dir, 'server.json'), JSON.stringify({ pid: process.pid, port: server.address().port, display: ':99' }));
  writeFileSync(join(dir, 'api-key'), 'test-key\n');
  writeFileSync(join(dir, 'tabs', 'pay.json'), JSON.stringify({ tabId: 't1', url: b.url, names: refNames(b.lines.join('\n')) }));
  return b;
}

/** Fake screen tools: an x11vnc that only opens its socket, and an xdotool that gives a 1280 by 720 screen. */
function screenTools(f) {
  f.viewTools();
  writeFileSync(join(f.bin, 'xdotool'), '#!/bin/sh\n[ "$1" = getdisplaygeometry ] && echo "1280 720"\nexit 0\n');
  writeFileSync(join(f.bin, 'x11vnc'), `#!${process.execPath}\nconst at = process.argv.indexOf('-unixsock');\nrequire('node:net').createServer(socket => socket.end()).listen(process.argv[at + 1]);\n`);
  for (const name of ['xdotool', 'x11vnc']) chmodSync(join(f.bin, name), 0o755);
}

/** Opens `args` in `c` beside the test, which serves the fake browser; resolves to a keyed call on the link's page
 * and the state it wrote. */
async function openLink(c, ...args) {
  const out = await c.start('open', ...args, '--session', 'pay', '--minutes', '5');
  assert.equal(out.status, 0, out.stdout + out.stderr);
  const state = JSON.parse(readFileSync(join(c.dir, 'state.json'), 'utf8'));
  const call = async (path, body) => {
    const response = await fetch(`http://127.0.0.1:${state.port}/${path}`, { method: body ? 'POST' : 'GET', headers: { 'x-hand-over-key': state.key, 'content-type': 'application/json' }, ...(body && { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json().catch(() => null) };
  };
  return { call, state };
}

const QUICK = { HANDOVER_SEND_WAIT_MS: '300', HANDOVER_SEND_POLL_MS: '50', HANDOVER_WATCH_MS: '300', BROWSE_LOGIN_WAIT_MS: '0' };
const stepsOf = (b, route) => b.calls.filter(call => call.route === route);

/** A card form open in `chat-a` with a live view free, its finish waited for `waitMs` after the press. */
async function payLink(t, waitMs = QUICK.HANDOVER_SEND_WAIT_MS) {
  const f = fixture(t);
  screenTools(f);
  const b = await fakeBrowser(t, f);
  const c = f.chat('chat-a', { ...QUICK, HANDOVER_SEND_WAIT_MS: waitMs });
  const form = join(f.root, 'form.json');
  writeFileSync(form, JSON.stringify(FORM));
  return { b, c, ...(await openLink(c, '--form', form, '--until-gone', '#card-frame')) };
}

test('a press shows the site live at its own size, and a finish met while viewing ends done', async t => {
  const { b, c, call, state } = await payLink(t);
  assert.equal(state.viewAfter, true);
  const sent = await call('send', { values: ['test-value'] });
  assert.deepEqual(sent.body.receipt, { result: 'unconfirmed', viewing: true });
  const step = (await call('receipt')).body;
  assert.equal(step.step, 'viewing');
  assert.ok(step.since <= step.now);
  const live = (await call('live/view')).body;
  assert.deepEqual(live.live, { site: 'Shop', kind: 'pay', since: step.since, waitMs: 300 });
  assert.deepEqual(live.fit, { kind: 'wide', width: 1280, screen: [1280, 720] });
  const { view } = JSON.parse(readFileSync(join(c.dir, 'state.json'), 'utf8'));
  assert.ok(existsSync(join(view.dir, 'screen.sock')), 'the screen source is up');
  const first = await c.start('wait');
  assert.match(first.stdout, /^HANDOVER_RESULT=unconfirmed$/m);
  assert.match(first.stdout, /^HANDOVER_VIEWING=yes$/m);
  b.shown = 0;
  const final = await c.start('wait');
  assert.match(final.stdout, /^HANDOVER_RESULT=done$/m);
  assert.match(final.stdout, /^HANDOVER_COMPLETION=[0-9a-f]+:late$/m);
  assert.deepEqual(stepsOf(b, 'viewport'), [], 'the page is never resized');
  assert.ok(stepsOf(b, 'front').length >= 1, 'the page\'s own window is raised');
  assert.deepEqual(stepsOf(b, 'type').map(each => each.text), ['test-value'], 'nothing is put back after a view');
  assert.equal(stepsOf(b, 'click').length, 1);
  assert.ok(!existsSync(view.dir), 'the screen source stopped');
});

for (const [way, end] of [['Done', ({ call }) => call('live/done', {})], ['close', ({ c }) => c.start('close')]]) {
  test(`${way} on a payment's view before the finish ends it unconfirmed, as viewed`, async t => {
    const link = await payLink(t);
    assert.equal((await link.call('send', { values: ['test-value'] })).body.receipt.viewing, true);
    assert.match((await link.c.start('wait')).stdout, /^HANDOVER_VIEWING=yes$/m);
    await end(link);
    const final = await link.c.start('wait');
    assert.match(final.stdout, /^HANDOVER_RESULT=unconfirmed$/m);
    assert.match(final.stdout, /^HANDOVER_REASON=viewed$/m);
    assert.match(final.stdout, /^HANDOVER_COMPLETION=[0-9a-f]+:late$/m);
    assert.deepEqual(stepsOf(link.b, 'type').map(each => each.text), ['test-value'], 'nothing is put back');
  });
}

test('Done before the send\'s wait ends gives only the late result, as viewed', async t => {
  const { b, c, call } = await payLink(t, '20000');
  const sent = call('send', { values: ['test-value'] });
  for (let i = 0; i < 100 && !stepsOf(b, 'click').length; i++) await pause(50);
  assert.equal(stepsOf(b, 'click').length, 1, 'the card was pressed');
  assert.equal((await call('live/done', {})).status, 200);
  assert.deepEqual((await sent).body.receipt, { result: 'unconfirmed', viewing: true });
  const only = await c.start('wait');
  assert.match(only.stdout, /^HANDOVER_RESULT=unconfirmed$/m);
  assert.match(only.stdout, /^HANDOVER_REASON=viewed$/m);
  assert.match(only.stdout, /^HANDOVER_COMPLETION=[0-9a-f]+:late$/m);
  assert.doesNotMatch(only.stdout, /^HANDOVER_VIEWING=yes$/m, 'no first result told the chat it was viewing');
});

test('a view held by another chat leaves the press to the status line and the watch, which empties nothing', async t => {
  const f = fixture(t);
  screenTools(f);
  const b = await fakeBrowser(t, f);
  f.place(join(f.home, 'links', 'chat-b'), { view: { display: ':99' }, cwd: join(f.root, 'chat-b') });
  const c = f.chat('chat-a', QUICK);
  const form = join(f.root, 'form.json');
  writeFileSync(form, JSON.stringify(FORM));
  const { call } = await openLink(c, '--form', form, '--until-gone', '#card-frame');
  const sent = await call('send', { values: ['test-value'] });
  assert.equal(sent.body.receipt.result, 'unconfirmed');
  assert.equal(sent.body.receipt.watching, true);
  assert.equal((await call('live/view')).status, 410, 'no view is served');
  const first = await c.start('wait');
  assert.match(first.stdout, /^HANDOVER_WATCHING=\d+$/m);
  const final = await c.start('wait');
  assert.match(final.stdout, /^HANDOVER_RESULT=unconfirmed$/m, 'a pressed send is never not-accepted');
  assert.match(final.stdout, /^HANDOVER_REASON=no-answer$/m);
  assert.deepEqual(stepsOf(b, 'type').map(each => each.text), ['test-value'], 'a still page keeps what was typed');
  assert.deepEqual(readdirSync(f.home).filter(name => name.startsWith('screen-')), []);
});

test('a page that changed since open ends the form with page-changed, typing and pressing nothing', async t => {
  const f = fixture(t);
  const b = await fakeBrowser(t, f);
  const c = f.chat('chat-a', QUICK);
  const form = join(f.root, 'form.json');
  writeFileSync(form, JSON.stringify(FORM));
  const { call } = await openLink(c, '--form', form, '--until-gone', '#card-frame');
  b.lines = ['- button "Pay" [e2]'];
  assert.equal((await call('form')).body.changed, true);
  const out = await c.start('wait');
  assert.match(out.stdout, /^HANDOVER_RESULT=not-accepted$/m);
  assert.match(out.stdout, /^HANDOVER_REASON=page-changed$/m);
  assert.deepEqual([...stepsOf(b, 'type'), ...stepsOf(b, 'click')], []);
});

test('a view kept open stays through two address changes and ends done on I\'m finished', async t => {
  const f = fixture(t);
  screenTools(f);
  const b = await fakeBrowser(t, f);
  const c = f.chat('chat-a', QUICK);
  const { call, state } = await openLink(c, '--view', '--keep-open', '--note', 'Tap Continue on DigiKey.');
  assert.equal(state.view.keepOpen, true);
  const shown = (await call('view')).body;
  assert.equal(shown.keepOpen, true);
  assert.equal(shown.note, 'Tap Continue on DigiKey.');
  const pid = Number(readFileSync(join(c.dir, 'watcher.pid'), 'utf8'));
  for (const url of ['https://shop.test/review', 'https://shop.test/receipt']) {
    b.url = url;
    await pause(200);
    assert.ok(alive(pid), `still open at ${url}`);
  }
  assert.equal((await call('done', {})).status, 200);
  const out = await c.start('wait');
  assert.match(out.stdout, /^HANDOVER_RESULT=done$/m);
  assert.ok(!existsSync(state.view.dir), 'the screen source stopped');
});

test('--keep-open goes with --view alone, and takes no finish', t => {
  const c = fixture(t).chat('chat-a');
  for (const args of [
    ['--view', '--keep-open', '--until', 'https://shop.test/done*'],
    ['--view', '--keep-open', '--until-gone', '#card'],
    ['--view', '--keep-open', '--until-text', 'Thanks'],
    ['--passwords', '--keep-open'],
  ]) {
    const out = c.run('open', ...args);
    assert.equal(out.status, 2, args.join(' '));
    assert.match(out.stderr, /--keep-open/);
  }
});

const LOGIN_PAGE = ['- textbox "Email" [e1]', '- textbox "Password" [e2]', '- button "Sign in" [e3]'];
const LOGIN = { url: 'https://shop.test/login', username: 'test@example.com', password: 'test-pass' };

test('a one-site password link with no finish only saves, as before', async t => {
  const f = fixture(t);
  const b = await fakeBrowser(t, f, { url: LOGIN.url, lines: LOGIN_PAGE });
  const c = f.chat('chat-a', QUICK);
  const { call } = await openLink(c, '--passwords', '--site', 'shop.test');
  const saved = await call('continue', { logins: [LOGIN] });
  assert.equal(saved.body.ready, true);
  assert.equal(saved.body.receipt?.signing, undefined);
  const out = await c.start('wait');
  assert.match(out.stdout, /^HANDOVER_RESULT=done$/m);
  assert.match(out.stdout, /^HANDOVER_SAVED=shop-test$/m);
  assert.deepEqual(stepsOf(b, 'type'), []);
});

test('a save with --sign-in signs in live from the save and ends done on the finish', async t => {
  const f = fixture(t);
  screenTools(f);
  const b = await fakeBrowser(t, f, { url: LOGIN.url, lines: LOGIN_PAGE });
  const c = f.chat('chat-a', QUICK);
  const { call, state } = await openLink(c, '--passwords', '--site', 'shop.test', '--until', 'https://shop.test/account*', '--sign-in', 'e1,e2,e3');
  assert.equal(state.viewAfter, true);
  const saved = await call('continue', { logins: [LOGIN] });
  assert.deepEqual(saved.body.receipt, { signing: true, site: 'shop.test' });
  const first = await c.start('wait');
  assert.match(first.stdout, /^HANDOVER_VIEWING=yes$/m);
  const step = (await call('live/receipt')).body;
  assert.equal(step.step, 'viewing');
  assert.equal((await call('live/view')).body.live.kind, 'sign-in');
  for (let i = 0; i < 100 && stepsOf(b, 'click').length < 1; i++) await pause(100);
  assert.deepEqual(stepsOf(b, 'type').map(each => each.ref), ['e1', 'e2'], 'browse.mjs login typed the saved login');
  b.url = 'https://shop.test/account';
  const final = await c.start('wait');
  assert.match(final.stdout, /^HANDOVER_RESULT=done$/m);
  assert.deepEqual(stepsOf(b, 'viewport'), []);
});
