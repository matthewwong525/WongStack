import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHROME = fileURLToPath(new URL('../../.agents/skills/connect/scripts/chrome.mjs', import.meta.url));
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

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-connect-chrome-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
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
  const run = (args, env = {}) => {
    const result = spawnSync(process.execPath, [CHROME, ...args], { cwd: worktree, encoding: 'utf8',
      env: { PATH: `${bin}:${process.env.PATH}`, HOME: dir, TMPDIR: temp, FAKE_LOG: log, AB_STATE: state, CF_LOG: cfLog, ...env } });
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
  };
  const browserState = () => JSON.parse(readFileSync(state, 'utf8'));
  const calls = () => existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : [];
  const setActive = id => { const s = browserState(); s.tabs.forEach(tab => { tab.active = tab.tabId === id; }); writeFileSync(state, JSON.stringify(s)); };
  return { dir, primary, temp, run, browserState, calls, setActive, cfLog, log };
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
