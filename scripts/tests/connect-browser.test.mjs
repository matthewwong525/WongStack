import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile, execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { signInFinish, whereIs } from '../../.agents/skills/connect/scripts/browser.mjs';
import { finished } from '../../.agents/skills/hand-over/scripts/hand-over.mjs';
import { BROWSE_ENV, fakeCamofox } from './fixtures/fake-camofox.mjs';

const CHROME = fileURLToPath(new URL('../../.agents/skills/connect/scripts/browser.mjs', import.meta.url));
// Made up for the test: no service ever issued it.
const KEY = 'rk_' + 'live_MADEUPkey0000aaaaBBBB4f2a';
const KEY_PAGE = '- heading "API keys" [level=1, ref=e1]\n- button "Create restricted key" [ref=e2]\n' +
  `- textbox [ref=e3]: ${KEY}\n  - StaticText "${KEY}"\n- textbox "Password" [ref=e4]`;

// A stand-in agent-browser: one JSON state of tabs, each page's snapshot and each ref's value, and a log of argv.
// Its first call in a session adds the blank tab a real attach adds; NO_CHROME answers as no browser found.
const STAND_IN = `#!${process.execPath}
const fs = require('node:fs');
const argv = process.argv.slice(2);
fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify(argv) + '\\n');
const out = (data, text) => { console.log(argv.includes('--json') ? JSON.stringify({ success: true, data, error: null }) : text); };
if (process.env.NO_CHROME) { console.log(JSON.stringify({ success: false, error: 'No running Chrome instance found.' })); process.exit(1); }
const s = JSON.parse(fs.readFileSync(process.env.AB_STATE, 'utf8'));
const save = () => fs.writeFileSync(process.env.AB_STATE, JSON.stringify(s));
const activate = id => s.tabs.forEach(tab => { tab.active = tab.tabId === id; });
const add = url => { const tabId = 't' + (++s.next); s.tabs.push({ tabId, targetId: 'T' + s.next, url, title: '' }); activate(tabId); return s.tabs.at(-1); };
if (!s.attached) { add('about:blank'); s.attached = true; }
const args = argv.filter((a, i) => !['--auto-connect', '--json', '--session'].includes(a) && argv[i - 1] !== '--session');
const active = s.tabs.find(tab => tab.active);
const [command, a, b] = args;
if (command === 'tab' && a === 'list') out({ tabs: s.tabs });
else if (command === 'tab' && a === 'new') { const tab = add(b); out({ tabId: tab.tabId, targetId: tab.targetId, url: b }); }
else if (command === 'tab' && a === 'close') { s.tabs = s.tabs.filter(tab => tab.tabId !== b); out({ closed: true }, 'closed'); }
else if (command === 'get' && a === 'title') out({ title: active.title }, active.title);
else if (command === 'get' && a === 'value') out({ value: (s.values[active.url] ?? {})[b] ?? '' });
else if (command === 'get' && a === 'text') out({ text: '' });
else if (command === 'snapshot') out({}, s.pages[active.url] ?? '');
else if (command === 'close') { s.attached = false; out({}, 'Browser closed'); }
else out({}, 'Done');
save();
`;

// A stand-in scripts/cf-secrets.mjs: it logs its argv and a digest of its stdin, never the stdin itself.
const CF_SECRETS = `import { appendFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const input = readFileSync(0, 'utf8');
appendFileSync(process.env.CF_LOG, JSON.stringify({ argv: process.argv.slice(2), digest: createHash('sha256').update(input).digest('hex') }) + '\\n');
if (process.env.CF_FAIL) { console.error('cf-secrets: ERROR — could not save it'); process.exit(1); }
if (process.env.CF_LATER) { console.log('cf-secrets: TOOL_STRIPE is on a new version, not on the live app yet: it reaches the live app at the next publish.'); process.exit(0); }
console.log('cf-secrets: saved on the live app');
`;

/** A logged call's words after the session, --json left out. */
const words = argv => argv.slice(argv.indexOf('--session') + 2).filter(word => word !== '--json');

/** A primary checkout and its worktree, a stand-in agent-browser and cf-secrets; with `camoufox`, a fake Camoufox
 * install whose stand-in server a test starts, `{ installed: false }` leaving the install out. */
function fixture(t, { camoufox = null } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-connect-browser-'));
  const camofox = camoufox ? fakeCamofox(dir, camoufox) : null;
  t.after(() => { camofox?.stop(); rmSync(dir, { recursive: true, force: true }); });
  const primary = join(dir, 'primary'), bin = join(dir, 'bin'), temp = join(dir, 'tmp');
  for (const folder of [join(primary, 'scripts'), join(primary, 'app'), bin, temp]) mkdirSync(folder, { recursive: true });
  writeFileSync(join(primary, 'scripts', 'cf-secrets.mjs'), CF_SECRETS);
  writeFileSync(join(primary, '.gitignore'), '.dev.vars\n');
  const git = (...args) => execFileSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', ...args], { cwd: primary, stdio: 'ignore' });
  git('init', '-q', '-b', 'main'); git('add', '.'); git('commit', '-qm', 'init');
  const worktree = join(dir, 'wt');
  git('worktree', 'add', '-q', '-b', 'connect', worktree);
  writeFileSync(join(primary, 'app', '.dev.vars'), 'OTHER_KEY=kept\nTOOL_STRIPE=old\n');
  writeFileSync(join(bin, 'agent-browser'), STAND_IN, { mode: 0o755 });
  chmodSync(join(bin, 'agent-browser'), 0o755);
  const state = join(dir, 'ab.json'), log = join(dir, 'ab.log'), cfLog = join(dir, 'cf.log');
  writeFileSync(state, JSON.stringify({ next: 1, attached: false, tabs: [{ tabId: 't1', targetId: 'MAIL', url: 'https://mail.example.com/', title: 'Inbox', active: true }],
    pages: { 'https://mail.example.com/': '- heading "Inbox"', 'https://dashboard.stripe.com/apikeys': KEY_PAGE },
    values: { 'https://dashboard.stripe.com/apikeys': { '@e3': KEY } } }));
  const options = env => ({ cwd: worktree, encoding: 'utf8',
    env: { PATH: `${bin}:${process.env.PATH}`, HOME: dir, TMPDIR: temp, FAKE_LOG: log, AB_STATE: state, CF_LOG: cfLog, ...(camofox && BROWSE_ENV), ...env } });
  const run = (args, env = {}) => {
    const result = spawnSync(process.execPath, [CHROME, ...args], options(env));
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
  };
  /** As `run`, with this process free meanwhile, so a child of the test that ends is reaped and seen gone. */
  const runFree = (args, env = {}) => new Promise((resolve, reject) => execFile(process.execPath, [CHROME, ...args], options(env),
    (error, stdout, stderr) => (error && typeof error.code !== 'number' ? reject(error) : resolve({ status: error?.code ?? 0, stdout, stderr }))));
  const browserState = () => JSON.parse(readFileSync(state, 'utf8'));
  const calls = () => existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : [];
  const setActive = id => { const s = browserState(); s.tabs.forEach(tab => { tab.active = tab.tabId === id; }); writeFileSync(state, JSON.stringify(s)); };
  return { dir, primary, worktree, temp, run, runFree, browserState, calls, setActive, cfLog, log, camofox };
}

test('with no Chrome to attach to, attach says CHROME=none and the one step, and keeps nothing', t => {
  const f = fixture(t);
  const result = f.run(['attach'], { NO_CHROME: '1' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^CHROME=none\nIn Chrome, open chrome:\/\/inspect\/#remote-debugging/);
  assert.deepEqual(readdirSync(f.temp, { recursive: true }).filter(name => name.endsWith('.json')), []);
});

test('it works in a tab it opened, every call on the running Chrome, and a reading hides the key', t => {
  const f = fixture(t);
  assert.equal(f.run(['attach']).stdout.trim(), 'CHROME=attached');
  assert.equal(f.run(['open', 'https://dashboard.stripe.com/apikeys']).stdout.trim(), 'opened t3');
  const read = f.run(['read']);
  assert.equal(read.status, 0, read.stderr);
  assert.match(read.stdout, /textbox \[ref=e3\]: \[key …4f2a\]/);
  assert.ok(!read.stdout.includes(KEY));
  assert.equal(f.run(['click', 'e2']).status, 0);
  assert.equal(f.run(['wait', '500']).status, 0);
  assert.equal(f.run(['select', '@e2', 'read']).status, 0);
  // Every call attaches to the person's Chrome, in one session, and none loads an address into an existing tab.
  const sessions = new Set(f.calls().map(argv => argv[argv.indexOf('--session') + 1]));
  assert.ok(f.calls().every(argv => argv[0] === '--auto-connect'));
  assert.equal(sessions.size, 1);
  assert.ok(!f.calls().some(argv => words(argv)[0] === 'open'));
  assert.equal(f.run(['open', 'http://dashboard.stripe.com/']).status, 1);
});

test('a tab it did not open is refused, read or acted on', t => {
  const f = fixture(t);
  f.run(['attach']); f.run(['open', 'https://dashboard.stripe.com/apikeys']);
  f.setActive('t1');
  const before = f.calls().length;
  for (const args of [['read'], ['click', '@e1'], ['fill', '@e1', 'hello'], ['picture', join(f.dir, 'p.png')], ['take-key', '--tool', 'stripe']]) {
    const result = f.run(args);
    assert.equal(result.status, 1, args.join(' '));
    assert.match(result.stderr, /not one this helper opened/);
  }
  assert.ok(f.calls().slice(before).every(argv => words(argv).join(' ') === 'tab list'));
});

test('no picture while a key shows, and no typing into a password box', t => {
  const f = fixture(t);
  f.run(['attach']); f.run(['open', 'https://dashboard.stripe.com/apikeys']);
  const refused = f.run(['picture', join(f.dir, 'p.png')]);
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /A key shows on this page/);
  assert.match(f.run(['fill', '@e4', 'hunter2']).stderr, /password or a sign-in code/);
  assert.ok(!f.calls().some(argv => ['screenshot', 'fill'].includes(words(argv)[0])));
  const s = f.browserState(); s.pages['https://dashboard.stripe.com/apikeys'] = '- heading "API keys"\n- textbox "Key name" [ref=e5]'; writeFileSync(join(f.dir, 'ab.json'), JSON.stringify(s));
  assert.equal(f.run(['picture', join(f.dir, 'p.png')]).status, 0);
  assert.equal(f.run(['fill', '@e5', 'assistant read-only']).status, 0);
});

test('done closes only its own tabs and lets go of Chrome, leaving the person\'s tabs', t => {
  const f = fixture(t);
  f.run(['attach']); f.run(['open', 'https://dashboard.stripe.com/apikeys']);
  const result = f.run(['done']);
  assert.equal(result.stdout.trim(), 'closed 2 tab(s); Chrome stays open');
  assert.deepEqual(f.browserState().tabs.map(tab => tab.targetId), ['MAIL']);
  assert.deepEqual(f.calls().slice(-3).map(words), [['tab', 'close', 't3'], ['tab', 'close', 't2'], ['close']]);
  assert.equal(f.run(['read']).status, 1, 'nothing is ours after done');
});

test('take-key saves the key in the primary checkout and sends it on stdin, printing only its last four', t => {
  const f = fixture(t);
  f.run(['attach']); f.run(['open', 'https://dashboard.stripe.com/apikeys']);
  for (const args of [['take-key', '--tool', 'stripe'], ['take-key', '@e3', '--tool', 'stripe']]) {
    const result = f.run(args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'TOOL_STRIPE saved, ends in …4f2a\n');
    assert.ok(!`${result.stdout}${result.stderr}`.includes(KEY));
  }
  const file = join(f.primary, 'app', '.dev.vars');
  assert.equal(readFileSync(file, 'utf8'), `OTHER_KEY=kept\nTOOL_STRIPE=${KEY}\n`);
  assert.equal(statSync(file).mode & 0o777, 0o600);
  const sent = readFileSync(f.cfLog, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual(sent.map(entry => entry.argv), [['put-tool', 'TOOL_STRIPE'], ['put-tool', 'TOOL_STRIPE']]);
  assert.ok(sent.every(entry => entry.digest === createHash('sha256').update(KEY).digest('hex')));
  for (const log of [f.log, f.cfLog]) assert.ok(!readFileSync(log, 'utf8').includes(KEY), log);
});

test('take-key that can not reach the live app keeps the key here and says so, still showing only four', t => {
  const f = fixture(t);
  f.run(['attach']); f.run(['open', 'https://dashboard.stripe.com/apikeys']);
  const failed = f.run(['take-key', '--tool', 'stripe'], { CF_FAIL: '1' });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /TOOL_STRIPE is saved on this computer, ends in …4f2a, but not on the live app: cf-secrets: ERROR/);
  assert.ok(!`${failed.stdout}${failed.stderr}`.includes(KEY));
  // Put on a version not yet live, it says when the live app gets it, never that it has it.
  const later = f.run(['take-key', '--tool', 'stripe'], { CF_LATER: '1' });
  assert.equal(later.status, 0, later.stderr);
  assert.equal(later.stdout, 'TOOL_STRIPE saved on this computer, ends in …4f2a; it reaches the live app at the next publish\n');
  assert.equal(f.run(['take-key', '--tool', 'Stripe']).status, 1);
  const s = f.browserState(); s.pages['https://dashboard.stripe.com/apikeys'] = '- heading "API keys"'; writeFileSync(join(f.dir, 'ab.json'), JSON.stringify(s));
  assert.match(f.run(['take-key', '--tool', 'stripe']).stderr, /No key shows on this page/);
  assert.match(f.run(['take-key', '@e9', '--tool', 'stripe']).stderr, /No key shows at @e9/);
});

test('a command it does not know, or the wrong number of words, is a usage error', t => {
  const f = fixture(t);
  for (const args of [['look'], ['open'], ['take-key', '@e1', '@e2', '--tool', 'x'], ['click', 'button']]) {
    assert.notEqual(f.run(args).status, 0, args.join(' '));
  }
  assert.equal(f.run(['look']).status, 2);
});

// The assistant's browser on a server: a fake Camoufox under the test's HOME and its stand-in browse server.
// Made up for the test: no service ever issued it.
const NOTION_KEY = 'ntn_' + 'MADEUPkey0000aaaaBBBBcccc91c0';
const INTEGRATIONS = 'https://www.notion.so/profile/integrations';
const SECRET_PAGE = `- heading "Internal integration secret"\n- textbox "Secret key" [e1]: ${NOTION_KEY}\n- button "Show ${NOTION_KEY}" [e2]\n- textbox "Password" [e3]`;
const SIGN_IN_PAGE = '- heading "Log in to Notion"\n- textbox "Email" [e1]\n- textbox "Password" [e2]\n- button "Continue" [e3]';
const BROWSE = fileURLToPath(new URL('../../.agents/skills/browser/scripts/browse.mjs', import.meta.url));

/** A fixture attached to the assistant's browser, with its page open at the integrations page. */
function onServer(t, page = SECRET_PAGE) {
  const f = fixture(t, { camoufox: {} });
  f.camofox.set('snapshot', page);
  assert.equal(f.run(['attach', '--server']).stdout, 'BROWSER=camoufox\n');
  const opened = f.run(['open', INTEGRATIONS]);
  assert.equal(opened.stdout, 'opened www.notion.so\n', `${opened.stderr}${f.camofox.errors()}`);
  return f;
}

/** A stand-in for this chat's open watch link, held by `control`; a live child running `script` stands in for its
 * watcher, given the link's folder. */
function fakeWatch(t, f, control, turn = null, script = 'setTimeout(() => {}, 60000)') {
  const dir = join(f.dir, '.wong-stack', 'hand-over', 'links', 'wt');
  mkdirSync(dir, { recursive: true });
  const watcher = spawn(process.execPath, ['-e', script, dir], { stdio: 'ignore' });
  t.after(() => watcher.kill());
  writeFileSync(join(dir, 'state.json'), JSON.stringify({ completionId: 'c1', view: { watch: true } }));
  writeFileSync(join(dir, 'watcher.pid'), `${watcher.pid}\n`);
  writeFileSync(join(dir, 'control.json'), JSON.stringify(control));
  if (turn) writeFileSync(join(dir, 'turn.json'), JSON.stringify(turn));
  return { dir, line: () => JSON.parse(readFileSync(join(dir, 'line.json'), 'utf8')).text, turn: () => JSON.parse(readFileSync(join(dir, 'turn.json'), 'utf8')) };
}

test('where names the place from the platform and its screen, and connects to nothing', () => {
  const view = (answer) => () => answer;
  const cases = [
    [{ platform: 'darwin', env: {} }, 'chrome'],
    [{ platform: 'win32', env: {} }, 'chrome'],
    [{ platform: 'linux', env: { DISPLAY: ':0' } }, 'chrome'],
    [{ platform: 'linux', env: { WAYLAND_DISPLAY: 'wayland-0' } }, 'chrome'],
    [{ platform: 'linux', env: {}, view: view({ missing: ['novnc'] }) }, 'server'],
    [{ platform: 'linux', env: {}, view: view({ unsupported: 'no screen', missing: [] }) }, 'link'],
    [{ platform: 'freebsd', env: {} }, 'link'],
  ];
  for (const [given, want] of cases) assert.equal(whereIs(given), want, JSON.stringify(given));
});

test('where and a Chrome-less attach say what to do next, and attach --server asks for an install it lacks', t => {
  const f = fixture(t, { camoufox: { installed: false } });
  assert.match(f.run(['where']).stdout, /^WHERE=(chrome|server|link)\n$/);
  assert.deepEqual(f.calls(), []);
  const none = f.run(['attach'], { NO_CHROME: '1' });
  if (process.platform === 'linux') assert.match(none.stdout, /\nSERVER=possible\n$/);
  const missing = f.run(['attach', '--server']);
  assert.equal(missing.status, 3);
  assert.equal(missing.stdout, 'BROWSE_NEEDS=install\n');
  assert.match(missing.stderr, /browse\.mjs install/);
  assert.equal(f.run(['open', 'https://x.example.com/', '--server']).status, 2);
});

test('in the assistant\'s browser, read hides a key, no picture while one shows, and no typing into a password box', t => {
  const f = onServer(t);
  const read = f.run(['read']);
  assert.equal(read.status, 0, read.stderr);
  assert.match(read.stdout, /textbox "Secret key" \[e1\]: \[key …91c0\]/);
  assert.ok(!read.stdout.includes(NOTION_KEY));
  assert.match(f.run(['picture', join(f.dir, 'p.png')]).stderr, /A key shows on this page/);
  assert.match(f.run(['fill', '@e3', 'hunter2']).stderr, /password or a sign-in code/);
  assert.ok(!f.camofox.calls().some(call => /\/(type|screenshot)\b/.test(call)));
  f.camofox.set('snapshot', '- heading "New integration"\n- textbox "Name" [e1]\n- button "Save" [e2]');
  assert.equal(f.run(['picture', join(f.dir, 'p.png')]).status, 0);
  assert.equal(readFileSync(join(f.dir, 'p.png'), 'utf8'), 'png-1');
  assert.equal(f.run(['fill', '@e1', 'assistant read-only']).stdout, 'Done\n');
  assert.equal(f.run(['click', 'e2']).stdout, 'Done\n');
  assert.equal(f.run(['wait', 'e2']).status, 0);
  assert.equal(f.run(['wait', 'e9']).status, 1, 'a ref that never shows');
});

test('in the assistant\'s browser, take-key reads the key unseen and prints only its last four', t => {
  const f = onServer(t);
  for (const args of [['take-key', '--tool', 'notion'], ['take-key', '@e1', '--tool', 'notion']]) {
    const result = f.run(args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'TOOL_NOTION saved, ends in …91c0\n');
    // A key in a box the page marks secret reads [hidden] in every snapshot, and still moves by its ref.
    f.camofox.set('secrets.json', [NOTION_KEY]);
  }
  assert.match(readFileSync(join(f.primary, 'app', '.dev.vars'), 'utf8'), new RegExp(`\nTOOL_NOTION=${NOTION_KEY}\n$`));
  const sent = readFileSync(f.cfLog, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  assert.ok(sent.every(entry => entry.digest === createHash('sha256').update(NOTION_KEY).digest('hex')));
  assert.match(f.run(['take-key', '@e9', '--tool', 'notion']).stderr, /No key shows at @e9/);
});

test('in the assistant\'s browser, done closes only its own page and leaves another chat\'s', t => {
  const f = onServer(t);
  const errand = spawnSync(process.execPath, [BROWSE, 'open', 'https://mail.example.com/', '--session', 'errand'],
    { cwd: f.dir, encoding: 'utf8', env: { ...process.env, ...BROWSE_ENV, HOME: f.dir } });
  assert.equal(errand.status, 0, errand.stderr);
  assert.equal(f.camofox.tabs().length, 2);
  const done = f.run(['done']);
  assert.equal(done.stdout, 'closed the page; the browser stays open\n', done.stderr);
  assert.deepEqual(f.camofox.tabs().map(tab => tab.session), ['errand']);
  assert.match(f.run(['read']).stderr, /one this helper opened/, 'nothing is ours after done');
});

test('while the person holds the watch link\'s browser, or stopped it, every command but done is refused', t => {
  for (const [control, turn, marker] of [[{ control: 'person' }, null, 'CONNECT_PAUSED=taken-over'], [{ control: 'stopped' }, null, 'CONNECT_STOPPED'],
    [{ control: 'assistant', turnDone: 0 }, { n: 1, until: `${INTEGRATIONS}**` }, 'CONNECT_PAUSED=your-turn']]) {
    const f = onServer(t);
    fakeWatch(t, f, control, turn);
    const before = f.camofox.calls().length;
    for (const args of [['read'], ['click', '@e2'], ['open', INTEGRATIONS], ['take-key', '--tool', 'notion'], ['sign-in', '--tool', 'Notion']]) {
      const result = f.run(args);
      assert.equal(result.status, 1, args.join(' '));
      assert.equal(result.stdout, `${marker}\n`, args.join(' '));
    }
    assert.equal(f.camofox.calls().length, before, 'the browser got nothing');
    assert.equal(f.run(['where']).status, 0);
  }
});

test('sign-in and watch work only in the assistant\'s browser, on its own page, and a turn waits for the key page', t => {
  const desk = fixture(t);
  desk.run(['attach']); desk.run(['open', 'https://dashboard.stripe.com/apikeys']);
  for (const args of [['sign-in', '--tool', 'Stripe'], ['watch']]) assert.match(desk.run(args).stderr, /only in the assistant's browser/, args.join(' '));
  const fresh = fixture(t, { camoufox: {} });
  fresh.run(['attach', '--server']);
  for (const args of [['sign-in', '--tool', 'Notion'], ['watch']]) assert.match(fresh.run(args).stderr, /No page is one this helper opened/, args.join(' '));

  const f = onServer(t, SIGN_IN_PAGE);
  assert.match(f.run(['sign-in', '--tool', 'Notion']).stderr, /No watch link is open/);
  const watch = fakeWatch(t, f, { control: 'assistant', turnDone: 0 });
  const turn = f.run(['sign-in', '--tool', 'Notion']);
  assert.equal(turn.stdout, 'CONNECT_PAUSED=your-turn\n', turn.stderr);
  assert.deepEqual(watch.turn(), { n: 1, ...signInFinish(INTEGRATIONS), note: 'Sign in to Notion. I go on once you\'re in.' });
  assert.equal(f.run(['read']).stdout, 'CONNECT_PAUSED=your-turn\n');
  const g = onServer(t, '- heading "Integrations"\n- button "New integration" [e1]');
  fakeWatch(t, g, { control: 'assistant', turnDone: 0 });
  assert.match(g.run(['sign-in', '--tool', 'Notion']).stderr, /shows no sign-in/);
});

test('each command sets the watch link\'s line, and no line holds a key', t => {
  const f = onServer(t);
  const watch = fakeWatch(t, f, { control: 'assistant', turnDone: 0 });
  f.run(['open', INTEGRATIONS]);
  assert.equal(watch.line(), 'Opening www.notion.so…');
  assert.equal(f.run(['click', '@e2']).status, 0);
  assert.equal(watch.line(), 'Clicking Show [key …91c0]…');
  assert.equal(f.run(['take-key', '@e1', '--tool', 'notion']).status, 0);
  assert.equal(watch.line(), 'Key saved, ends in …91c0');
  assert.ok(!readdirSync(join(f.dir, '.wong-stack', 'hand-over'), { recursive: true }).some(name => {
    const file = join(f.dir, '.wong-stack', 'hand-over', name);
    return statSync(file).isFile() && readFileSync(file, 'utf8').includes(NOTION_KEY);
  }));
});

test('a sign-in turn ends only at the key page\'s own path with no sign-in box, and one already met is refused', t => {
  const key = signInFinish(INTEGRATIONS);
  for (const box of ['input[type=password]', 'input[type=email]', 'one-time-code']) assert.ok(key.untilGone.includes(box), box);
  const at = (finish, url, count = 0) => finished(finish, { url, count });
  assert.equal(at(key, INTEGRATIONS), true);
  assert.equal(at(key, `${INTEGRATIONS}?from=login`), true, 'the same path with a query');
  assert.equal(at(key, INTEGRATIONS, 1), false, 'an email-first step at the key page\'s own address');
  assert.equal(at(key, `${INTEGRATIONS}/new`), false, 'never a wider path');
  const root = signInFinish('https://www.notion.so/');
  assert.equal(at(root, 'https://www.notion.so/login'), false, 'a key page at a site\'s root');
  assert.equal(at(root, 'https://www.notion.so/?target=x'), true);

  const f = onServer(t, SIGN_IN_PAGE);
  const watch = fakeWatch(t, f, { control: 'assistant', turnDone: 0 });
  f.camofox.set('count', '0');
  const met = f.run(['sign-in', '--tool', 'Notion']);
  assert.equal(met.status, 1);
  assert.match(met.stderr, /already meets the sign-in finish/);
  assert.equal(existsSync(join(watch.dir, 'turn.json')), false, 'no turn starts');
});

test('an attach starts afresh: a page an earlier attach opened is not the helper\'s, and Chrome is Chrome again', t => {
  const f = onServer(t);
  assert.equal(f.run(['attach', '--server']).stdout, 'BROWSER=camoufox\n');
  assert.match(f.run(['read']).stderr, /No page is one this helper opened/);
  assert.equal(f.run(['attach']).stdout, 'CHROME=attached\n');
  f.setActive('t1');
  assert.equal(f.run(['attach', '--server']).stdout, 'BROWSER=camoufox\n');
  // An attach that adds no blank tab still leaves the assistant's browser behind.
  assert.equal(f.run(['attach']).stdout, 'CHROME=attached\n');
  assert.match(f.run(['open', 'https://dashboard.stripe.com/apikeys']).stdout, /^opened t\d+\n$/);
  assert.ok(f.calls().some(argv => words(argv).join(' ') === 'tab new https://dashboard.stripe.com/apikeys'));
});

// A stand-in watcher that ends as the real one does on close: its result from the closing mark, then its pid gone.
const CLOSING_WATCHER = `const fs = require('node:fs'), path = require('node:path'), dir = process.argv[1];
process.on('SIGTERM', () => {
  const stopped = fs.readFileSync(path.join(dir, 'closing'), 'utf8').trim() === 'stopped';
  fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify({ result: stopped ? 'stopped' : 'done', completionId: 'c1' }));
  fs.rmSync(path.join(dir, 'watcher.pid'));
  process.exit(0);
});
fs.writeFileSync(path.join(dir, 'ready'), '');
setInterval(() => {}, 1000);`;

test('done closes an open watch link, and passes --stopped on', async t => {
  for (const [args, want] of [[['done'], 'done'], [['done', '--stopped'], 'stopped']]) {
    const f = onServer(t);
    const watch = fakeWatch(t, f, { control: 'assistant', turnDone: 0 }, null, CLOSING_WATCHER);
    for (const end = Date.now() + 5000; !existsSync(join(watch.dir, 'ready')) && Date.now() < end;) await new Promise(done => setTimeout(done, 20));
    const result = await f.runFree(args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(readFileSync(join(watch.dir, 'result.json'), 'utf8')).result, want, args.join(' '));
    assert.equal(existsSync(join(watch.dir, 'watcher.pid')), false, 'the watch link is closed');
    assert.deepEqual(f.camofox.tabs(), [], 'and the helper\'s page');
  }
});
