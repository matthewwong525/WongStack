import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { connect } from 'node:net';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CAMOFOX, leftPage, serverEnv, sessionName, targetOf, valueIn } from '../../.agents/skills/browser/scripts/browse.mjs';
import { hostOf, readLogins, writeLogins } from '../../.agents/skills/browser/scripts/logins.mjs';
import { localProxyEnv } from '../../.agents/skills/browser/scripts/server.mjs';
import { BROWSE_ENV, fakeCamofox } from './fixtures/fake-camofox.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.agents/skills/browser/scripts/browse.mjs');
const SHOP = 'https://shop.example.com/login';
const ACCOUNT = 'https://shop.example.com/account';
// Stored values no key, port, tab id, or path can hold, so a search for one never matches by chance.
const USERNAME = 'zq-person@mail.example';
const PASSWORD = 'Xk9-hunter2-QWZP!';
const LOGINS = [
  { name: 'shop-example-com', url: SHOP, username: USERNAME, password: PASSWORD },
  { name: 'bank-example-com', url: 'https://www.bank.example.com/', username: 'other-zq@mail.example', password: 'Vault-7781-JKLM' },
];

// A HOME of its own holding a fake camofox install, and a fake npm first on PATH that logs its argv and
// TMPDIR and, unless `fail-npm` is set, writes the install's server file as the real install would.
function fixture(t, options = {}) {
  const home = mkdtempSync(join(tmpdir(), 'wong-test-browse-'));
  const camofox = fakeCamofox(home, options);
  const bin = join(home, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'npm'), `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
fs.writeFileSync(${JSON.stringify(join(home, 'npm.json'))}, JSON.stringify({ args, tmp: process.env.TMPDIR }));
if (fs.existsSync(${JSON.stringify(join(home, 'fail-npm'))})) { console.error('npm error ENOSPC'); process.exit(1); }
const dir = path.join(args[args.indexOf('--prefix') + 1], 'node_modules/@askjo/camofox-browser');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'server.js'), '');
`);
  chmodSync(join(bin, 'npm'), 0o755);
  const env = { ...process.env, ...BROWSE_ENV, HOME: home, PATH: `${bin}:${process.env.PATH}`, SENTRY_DSN: 'https://key@sentry.example/1', CAMOFOX_CRASH_REPORT_URL: 'https://reports.example/report', PROXY_HOST: 'external.example', PROXY_PORTS: '8080,8081', PROXY_PASSWORD: 'unused-password', PROXY_STRATEGY: 'backconnect' };
  const runWith = (extra, ...args) => spawnSync(process.execPath, [script, ...args], { cwd: home, env: { ...env, ...extra }, encoding: 'utf8', timeout: 30_000 });
  const run = (...args) => runWith({}, ...args);
  /** Runs a command beside the test, so two can run at once; resolves to its status and output. */
  const start = (...args) => {
    const child = spawn(process.execPath, [script, ...args], { cwd: home, env, stdio: ['ignore', 'pipe', 'pipe'] });
    const out = { stdout: '', stderr: '' };
    for (const name of ['stdout', 'stderr']) child[name].on('data', chunk => { out[name] += chunk; });
    return new Promise(done => child.on('close', status => done({ ...out, status })));
  };
  t.after(() => {
    camofox.stop();
    rmSync(home, { recursive: true, force: true });
  });
  const loginsFile = join(home, '.wong-stack/logins.json');
  return { home, env, camofox, run, runWith, start, loginsFile, saveLogins: logins => writeLogins(logins, loginsFile), npm: () => JSON.parse(readFileSync(join(home, 'npm.json'), 'utf8')) };
}

/** Runs a command and asserts it worked; returns its stdout. */
function ok(f, ...args) {
  const out = f.run(...args);
  assert.equal(out.status, 0, `${args.join(' ')}: ${out.stdout}${out.stderr}`);
  return out.stdout;
}

const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
/** Every file under `dir`, read as text. */
const filesUnder = dir => readdirSync(dir, { recursive: true, withFileTypes: true }).filter(entry => entry.isFile()).map(entry => readFileSync(join(entry.parentPath, entry.name), 'utf8')).join('\n');

// ---------------------------------------------------------------------------
// Install and start

test('with no install, a command prints BROWSE_NEEDS=install with the sizes and exits 3, starting nothing', t => {
  const f = fixture(t, { installed: false });
  for (const args of [['open', SHOP], ['snapshot'], ['save']]) {
    const out = f.run(...args);
    assert.equal(out.status, 3, args.join(' '));
    assert.equal(out.stdout, 'BROWSE_NEEDS=install\n');
    assert.match(out.stderr, /1\.4 GB of disk/);
    assert.match(out.stderr, /700 MB of memory/);
  }
  assert.equal(ok(f, 'status'), 'BROWSE_INSTALLED=no\nBROWSE_SERVER=stopped\n');
  assert.equal(ok(f, 'close', '--session', 'a'), 'BROWSE_CLOSED=a\n', 'closing with no browser running starts none');
  assert.equal(f.camofox.starts(), 0);
});

test('install asks npm for the two pinned versions and no others, into the home folder, with its temp folder on disk', t => {
  const f = fixture(t, { installed: false });
  assert.deepEqual(CAMOFOX, { '@askjo/camofox-browser': '1.18.1', 'playwright-core': '1.58.2' });
  assert.equal(ok(f, 'install'), 'BROWSE_INSTALLED=yes\n');
  const { args, tmp } = f.npm();
  assert.deepEqual(args, ['install', '--prefix', f.camofox.install, '--no-audit', '--no-fund', '@askjo/camofox-browser@1.18.1', 'playwright-core@1.58.2']);
  assert.equal(tmp, join(f.camofox.install, 'tmp'));
  assert.ok(statSync(tmp).isDirectory(), 'the temp folder exists before the download');
  assert.equal(statSync(f.camofox.install).mode & 0o777, 0o700);

  writeFileSync(join(f.home, 'fail-npm'), '');
  const failed = f.run('install');
  assert.equal(failed.status, 1);
  assert.equal(failed.stdout, 'BROWSE_ERROR=the install failed; see npm\'s lines above\n');
  assert.match(failed.stderr, /ENOSPC/, 'npm\'s own lines reach the person');
});

test('the server starts with its own loopback proxy, reporting off, private files, and stops the listener with it', async t => {
  const f = fixture(t);
  assert.equal(ok(f, 'open', SHOP, '--session', 'a'), `BROWSE_URL=${SHOP}\n`);
  const env = f.camofox.env();
  const key = readFileSync(join(f.camofox.install, 'api-key'), 'utf8').trim();
  assert.match(key, /^[0-9a-f]{64}$/);
  assert.equal(statSync(join(f.camofox.install, 'api-key')).mode & 0o777, 0o600);
  assert.equal(statSync(join(f.camofox.install, 'server.json')).mode & 0o777, 0o600);
  assert.deepEqual({ ...env, pid: undefined, argv: undefined, CAMOFOX_PORT: undefined, PROXY_PORT: undefined }, {
    CAMOFOX_BIND_HOST: '127.0.0.1',
    CAMOFOX_CRASH_REPORT_ENABLED: 'false',
    CAMOFOX_CRASH_REPORT_URL: '',
    SENTRY_DSN: '',
    CAMOFOX_PROFILE_DIR: join(f.camofox.install, 'profiles'),
    CAMOFOX_API_KEY: key,
    TMPDIR: join(f.camofox.install, 'tmp'),
    cwd: f.camofox.install,
    pid: undefined,
    argv: undefined,
    CAMOFOX_PORT: undefined,
    PROXY_HOST: '127.0.0.1',
    PROXY_PORT: undefined,
    PROXY_PROTOCOL: 'http',
    PROXY_STRATEGY: 'round_robin',
  });
  assert.deepEqual(env.argv, [join(repo, '.agents/skills/browser/scripts/server.mjs'), join(f.camofox.install, 'node_modules/@askjo/camofox-browser/server.js')], 'the key is not on the command line');
  const info = JSON.parse(readFileSync(join(f.camofox.install, 'server.json'), 'utf8'));
  assert.equal(info.port, Number(env.CAMOFOX_PORT));
  assert.equal(info.proxy, 'local');
  assert.notEqual(env.PROXY_PORT, env.CAMOFOX_PORT);
  const listening = () => new Promise(resolve => {
    const socket = connect(Number(env.PROXY_PORT), '127.0.0.1');
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
  });
  assert.equal(await listening(), true);
  assert.ok(f.camofox.requests().every(request => request.auth === `Bearer ${key}`), 'every request carries the key');
  assert.ok(!existsSync(join(f.camofox.install, 'server.log')), 'the server keeps no log');

  assert.match(ok(f, 'status'), /^BROWSE_INSTALLED=yes camofox 1\.18\.1 driver 1\.58\.2\nBROWSE_SERVER=running\n$/);
  ok(f, 'snapshot', '--session', 'a');
  assert.equal(f.camofox.starts(), 1, 'a later command uses the running server');

  assert.equal(ok(f, 'stop'), 'BROWSE_SERVER=stopped\n');
  assert.ok(f.camofox.has('stopped'), 'the server was asked to stop, so it can save first');
  assert.ok(!alive(env.pid));
  assert.equal(await listening(), false, 'the one-process listener stopped too');
  assert.match(ok(f, 'status'), /BROWSE_SERVER=stopped/);
  assert.equal(ok(f, 'stop'), 'BROWSE_SERVER=stopped\n', 'stopping twice is fine');
});

test('native inherited proxy routes and credentials are removed, leaving one local HTTP endpoint', () => {
  assert.deepEqual(localProxyEnv(1234, { PATH: '/bin', PROXY_HOST: 'external', PROXY_PORTS: '8080,8081', PROXY_BACKCONNECT_HOST: 'other', PROXY_USERNAME: 'user', PROXY_PASSWORD: 'secret', PROXY_COUNTRY: 'us', PROXY_STRATEGY: 'backconnect', PROXY_PROTOCOL: 'socks5' }), {
    PATH: '/bin', PROXY_HOST: '127.0.0.1', PROXY_PORT: '1234', PROXY_PROTOCOL: 'http', PROXY_STRATEGY: 'round_robin',
  });
});

test('an already-running older server keeps its pages until explicitly stopped, then starts with the proxy', async t => {
  const f = fixture(t);
  // Start the old entrypoint directly, with an OS-assigned port recorded by the fixture.
  const original = join(f.camofox.install, 'node_modules/@askjo/camofox-browser/server.js');
  writeFileSync(join(f.camofox.install, 'api-key'), 'legacy-key\n', { mode: 0o600 });
  const { createServer } = await import('node:net');
  const apiPort = await new Promise(resolvePort => {
    const probe = createServer();
    probe.listen(0, '127.0.0.1', () => { const value = probe.address().port; probe.close(() => resolvePort(value)); });
  });
  const detached = spawnSync(process.execPath, ['--input-type=module', '-e', `import {spawn} from 'node:child_process'; const child = spawn(process.execPath, [${JSON.stringify(original)}], {detached:true, stdio:'ignore'}); child.unref(); console.log(child.pid);`], {
    env: { ...process.env, HOME: f.home, CAMOFOX_PORT: String(apiPort), CAMOFOX_BIND_HOST: '127.0.0.1', CAMOFOX_API_KEY: 'legacy-key', PROXY_HOST: '', PROXY_PORT: '', PROXY_PORTS: '' }, encoding: 'utf8',
  });
  const oldPid = Number(detached.stdout.trim());
  t.after(() => { try { process.kill(oldPid, 'SIGKILL'); } catch { /* gone */ } });
  writeFileSync(join(f.camofox.install, 'server.json'), JSON.stringify({ pid: oldPid, port: apiPort }));
  for (let i = 0; i < 100; i++) {
    try { await fetch(`http://127.0.0.1:${apiPort}/health`); break; } catch { await new Promise(done => setTimeout(done, 10)); }
  }
  ok(f, 'open', SHOP, '--session', 'a');
  ok(f, 'open', ACCOUNT, '--session', 'b');
  assert.equal(f.camofox.starts(), 1);
  assert.equal(f.camofox.tabs().length, 2);
  assert.equal(JSON.parse(readFileSync(join(f.camofox.install, 'server.json'), 'utf8')).proxy, undefined);
  ok(f, 'stop');
  ok(f, 'open', SHOP, '--session', 'a');
  assert.equal(f.camofox.starts(), 2);
  assert.equal(f.camofox.env().PROXY_HOST, '127.0.0.1');
});

test('serverEnv overrides whatever the shell set for reporting', () => {
  const env = serverEnv(4321, 'k', { PATH: '/bin', SENTRY_DSN: 'https://x', CAMOFOX_CRASH_REPORT_ENABLED: 'true', CAMOFOX_BIND_HOST: '0.0.0.0' });
  assert.deepEqual({ ...env, CAMOFOX_PROFILE_DIR: undefined, TMPDIR: undefined }, { PATH: '/bin', CAMOFOX_PORT: '4321', CAMOFOX_BIND_HOST: '127.0.0.1', CAMOFOX_CRASH_REPORT_ENABLED: 'false', CAMOFOX_CRASH_REPORT_URL: '', SENTRY_DSN: '', CAMOFOX_API_KEY: 'k', CAMOFOX_PROFILE_DIR: undefined, TMPDIR: undefined });
});

test('a driver that is not 1.58.x is refused before anything starts', t => {
  for (const driver of ['1.64.0', '1.57.9']) {
    const f = fixture(t, { driver });
    const out = f.run('open', SHOP);
    assert.equal(out.status, 1);
    assert.equal(out.stdout, `BROWSE_ERROR=the browser driver is ${driver}, not 1.58.x, and a login does not save on any other; run \`browse.mjs install\`\n`);
    assert.equal(f.camofox.starts(), 0);
    assert.ok(!existsSync(join(f.camofox.install, 'server.json')));
  }
});

test('a server that never answers is reported, not waited on forever', t => {
  const f = fixture(t);
  writeFileSync(join(f.camofox.install, 'node_modules/@askjo/camofox-browser/server.js'), 'process.exit(1);\n');
  const out = f.run('open', SHOP);
  assert.equal(out.status, 1);
  assert.equal(out.stdout, 'BROWSE_ERROR=the browser did not start\n');
  assert.ok(!existsSync(join(f.camofox.install, 'start.lock')), 'the start lock is released');
});

// ---------------------------------------------------------------------------
// The commands

test('open reads the page only once it settles, and a second open moves the same tab', t => {
  const f = fixture(t);
  f.camofox.set('snapshots.json', ['loading', 'half', 'done', 'done']);
  assert.equal(ok(f, 'open', SHOP, '--session', 'a'), `BROWSE_URL=${SHOP}\n`);
  assert.deepEqual(f.camofox.calls(), ['POST /tabs', ...Array(4).fill('GET /tabs/:tab/snapshot')], 'it read until two reads matched');
  assert.deepEqual(f.camofox.requests()[0].body, { userId: 'me', sessionKey: 'a', url: SHOP });
  assert.equal(ok(f, 'snapshot', '--session', 'a'), `BROWSE_URL=${SHOP}\ndone\n`);

  f.camofox.unset('snapshots.json');
  const before = f.camofox.calls().length;
  assert.equal(ok(f, 'open', ACCOUNT, '--session', 'a'), `BROWSE_URL=${ACCOUNT}\n`);
  assert.deepEqual(f.camofox.calls().slice(before), ['POST /tabs/:tab/navigate', 'GET /tabs/:tab/snapshot', 'GET /tabs/:tab/snapshot']);
  assert.equal(f.camofox.tabs().length, 1);
});

test('a page that never settles is read after the settle wait, not forever', t => {
  const f = fixture(t);
  f.camofox.set('snapshots.json', Array.from({ length: 400 }, (_, index) => `tick ${index}`));
  assert.equal(ok(f, 'open', SHOP), `BROWSE_URL=${SHOP}\n`);
});

test('each command reaches its own route with the session\'s tab, as the person', t => {
  const f = fixture(t);
  const on = (...args) => ok(f, ...args, '--session', 'a');
  on('open', SHOP);
  const before = f.camofox.requests().length;
  assert.equal(on('click', 'e2'), 'BROWSE_DONE=click\n');
  assert.equal(on('click', '@e2'), 'BROWSE_DONE=click\n');
  assert.equal(on('click', '#go'), 'BROWSE_DONE=click\n');
  assert.equal(on('type', 'e1', 'Jo Smith'), 'BROWSE_DONE=type\n');
  assert.equal(on('type', '#name', 'Jo'), 'BROWSE_DONE=type\n');
  assert.equal(on('press', 'Enter'), 'BROWSE_DONE=press\n');
  assert.equal(on('select', 'e3', 'Large'), 'BROWSE_DONE=select\n');
  assert.equal(on('get', 'url'), `${SHOP}\n`);
  assert.equal(on('get', 'count', '#cart li'), '1\n');
  assert.equal(on('get', 'value', '#name'), 'Jo\n');
  const sent = f.camofox.requests().slice(before);
  assert.deepEqual(sent.map(({ method, path, body }) => [`${method} ${path.replace(/^\/tabs\/[^/]+/, '')}`, body]), [
    ['POST /click', { userId: 'me', ref: 'e2' }],
    ['POST /click', { userId: 'me', ref: 'e2' }],
    ['POST /click', { userId: 'me', selector: '#go' }],
    ['POST /type', { userId: 'me', ref: 'e1', text: 'Jo Smith' }],
    ['POST /type', { userId: 'me', selector: '#name', text: 'Jo' }],
    ['POST /press', { userId: 'me', key: 'Enter' }],
    ['POST /select', { userId: 'me', ref: 'e3', option: 'Large' }],
    ['POST /evaluate', { userId: 'me', expression: 'location.href' }],
    ['POST /evaluate', { userId: 'me', expression: 'document.querySelectorAll("#cart li").length' }],
    ['POST /evaluate', { userId: 'me', expression: 'document.querySelector("#name")?.value ?? null' }],
  ]);

  f.camofox.set('snapshot', '- textbox "Card number" [e12]: 4111\n- combobox "Expiry month" [e13]:\n  - option "02 - February"\n  - option "03 - March" [selected]');
  assert.equal(on('get', 'value', 'e12'), '4111\n');
  assert.equal(on('get', 'value', '@e13'), '03 - March\n', 'a dropdown\'s picked choice');
  const missing = f.run('get', 'value', 'e99', '--session', 'a');
  assert.equal(missing.status, 1);
  assert.equal(missing.stdout, 'BROWSE_ERROR=no field e99 on the page\n');
  f.camofox.set('no-field');
  assert.equal(f.run('get', 'value', '#gone', '--session', 'a').stdout, 'BROWSE_ERROR=no field #gone on the page\n');
});

test('snapshot prints the address and the whole page, every chunk of a long one', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP);
  f.camofox.set('snapshot', '- heading "Part one"');
  f.camofox.set('snapshot-more', '- heading "Part two"');
  assert.equal(ok(f, 'snapshot'), `BROWSE_URL=${SHOP}\n- heading "Part one"- heading "Part two"\n`);
});

test('screenshot prints a private temp path, and none when --if-changed finds the same picture', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP, '--session', 'a');
  const first = /^BROWSE_SHOT=(.+)\n$/.exec(ok(f, 'screenshot', '--session', 'a'))?.[1];
  t.after(() => rmSync(first, { force: true }));
  assert.equal(dirname(first), tmpdir(), 'never in a repo');
  assert.equal(readFileSync(first, 'utf8'), 'png-1');
  assert.equal(statSync(first).mode & 0o777, 0o600);
  assert.equal(ok(f, 'screenshot', '--if-changed', '--session', 'a'), 'BROWSE_SHOT=none\n');
  assert.equal(ok(f, 'screenshot', '--session', 'a'), `BROWSE_SHOT=${first}\n`, 'without the flag it always prints');
  f.camofox.set('shot', 'png-2');
  const second = /^BROWSE_SHOT=(.+)\n$/.exec(ok(f, 'screenshot', '--if-changed', '--session', 'a'))?.[1];
  t.after(() => rmSync(second, { force: true }));
  assert.notEqual(second, first);
  assert.equal(readFileSync(second, 'utf8'), 'png-2');
});

test('a command with no page open says so, and bad words are a usage error', t => {
  const f = fixture(t);
  const lost = f.run('click', 'e1', '--session', 'nobody');
  assert.equal(lost.status, 1);
  assert.equal(lost.stdout, 'BROWSE_ERROR=no page is open in this session; run `browse.mjs open <url>` first\n');
  for (const args of [[], ['fly'], ['open'], ['open', 'ftp://files.example.com'], ['click'], ['type', 'e1'], ['snapshot', 'extra'], ['get'], ['get', 'title'], ['get', 'url', 'extra'], ['get', 'count'], ['login', 'shop'], ['login', '--password', 'e2'], ['forget']]) {
    const out = f.run(...args);
    assert.equal(out.status, 2, args.join(' '));
    assert.match(out.stderr, /usage: browse\.mjs/);
  }
  assert.equal(f.camofox.starts(), 0, 'none of them started the browser');
});

test('the default session is the folder a command runs in', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP);
  assert.equal(f.camofox.requests()[0].body.sessionKey, basename(f.home));
  assert.equal(sessionName('/work/My Errand'), 'My-Errand', 'a path gives its last folder');
  assert.equal(sessionName('a b'), 'a-b');
  assert.equal(sessionName('x'.repeat(80)).length, 64);
});

// ---------------------------------------------------------------------------
// Retries and deadlines

test('a tab the browser lost is reopened at its last address and the step tried once more', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP, '--session', 'a');
  ok(f, 'click', 'e2', '--session', 'a');
  f.camofox.set('click-url', ACCOUNT);
  ok(f, 'click', 'e2', '--session', 'a');
  assert.equal(ok(f, 'get', 'url', '--session', 'a'), `${ACCOUNT}\n`);
  const before = f.camofox.calls().length;
  f.camofox.set('gone-once');
  assert.equal(ok(f, 'click', 'e2', '--session', 'a'), 'BROWSE_DONE=click\n');
  const calls = f.camofox.calls().slice(before);
  assert.deepEqual([calls[0], calls[1], calls.at(-1)], ['POST /tabs/:tab/click', 'POST /tabs', 'POST /tabs/:tab/click']);
  assert.ok(calls.slice(2, -1).every(call => call === 'GET /tabs/:tab/snapshot'), 'the reopened page settles first');
  assert.equal(f.camofox.requests()[before + 1].body.url, ACCOUNT, 'its last address, not the first');
});

test('a tab from before a restart of the server is opened again', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP, '--session', 'a');
  ok(f, 'stop');
  const before = f.camofox.calls().length;
  assert.equal(ok(f, 'open', ACCOUNT, '--session', 'a'), `BROWSE_URL=${ACCOUNT}\n`);
  assert.deepEqual(f.camofox.calls().slice(before, before + 2), ['POST /tabs/:tab/navigate', 'POST /tabs']);
  assert.equal(f.camofox.starts(), 2);
});

test('a click that times out is retried once; a second failure is reported in one line', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP);
  const before = f.camofox.calls().length;
  f.camofox.set('timeout-click-once');
  assert.equal(ok(f, 'click', 'e2'), 'BROWSE_DONE=click\n');
  assert.equal(f.camofox.calls().slice(before).filter(call => call === 'POST /tabs/:tab/click').length, 2);

  f.camofox.set('gone');
  const again = f.camofox.calls().length;
  const out = f.run('click', 'e2');
  assert.equal(out.status, 1);
  assert.equal(out.stdout, 'BROWSE_ERROR=Tab no longer exists (browser was restarted). Create a new tab.\n');
  assert.equal(f.camofox.calls().slice(again).filter(call => call === 'POST /tabs/:tab/click').length, 1, 'the reopened page was lost before the second try');
  f.camofox.unset('gone');
  ok(f, 'open', SHOP);

  f.camofox.set('fail-click');
  const refused = f.camofox.calls().length;
  assert.equal(f.run('click', 'e2').stdout, 'BROWSE_ERROR=click failed\n');
  assert.deepEqual(f.camofox.calls().slice(refused), ['POST /tabs/:tab/click'], 'a plain refusal is not retried');
});

test('every call has a deadline', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP);
  f.camofox.set('hold-type');
  const typed = f.runWith({ BROWSE_COMMAND_MS: '200' }, 'type', 'e1', 'Jo');
  assert.equal(typed.status, 1);
  assert.equal(typed.stdout, 'BROWSE_ERROR=the browser took too long\n');
  f.camofox.unset('hold-type');
});

test('a browser that stops answering is reported', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP);
  const running = f.camofox.serverPid();
  t.after(() => { try { process.kill(running, 'SIGKILL'); } catch { /* gone */ } });
  writeFileSync(join(f.camofox.install, 'server.json'), JSON.stringify({ pid: process.pid, port: 9 }));
  writeFileSync(join(f.camofox.install, 'node_modules/@askjo/camofox-browser/server.js'), 'process.exit(1);\n');
  assert.equal(f.run('click', 'e1').stdout, 'BROWSE_ERROR=the browser did not start\n');
});

// ---------------------------------------------------------------------------
// Tasks share the browser

test('two sessions started at once share one server, and close in one leaves the other\'s tab open', async t => {
  const f = fixture(t);
  const [a, b] = await Promise.all([f.start('open', SHOP, '--session', 'a'), f.start('open', ACCOUNT, '--session', 'b')]);
  assert.equal(a.status, 0, a.stdout + a.stderr);
  assert.equal(b.status, 0, b.stdout + b.stderr);
  assert.equal(f.camofox.starts(), 1, 'the second waited for the first\'s server');
  assert.deepEqual(f.camofox.tabs().map(tab => [tab.user, tab.session, tab.url]).sort(), [['me', 'a', SHOP], ['me', 'b', ACCOUNT]]);

  const before = f.camofox.calls().length;
  assert.equal(ok(f, 'close', '--session', 'a'), 'BROWSE_CLOSED=a\n');
  assert.deepEqual(f.camofox.calls().slice(before), ['DELETE /tabs/:tab', 'GET /tabs'], 'the shared session stays open');
  assert.deepEqual(f.camofox.tabs().map(tab => tab.session), ['b']);
  assert.equal(ok(f, 'get', 'url', '--session', 'b'), `${ACCOUNT}\n`);
  assert.equal(f.run('get', 'url', '--session', 'a').status, 1, 'a\'s page is closed');

  const last = f.camofox.calls().length;
  ok(f, 'close', '--session', 'b');
  assert.deepEqual(f.camofox.calls().slice(last), ['DELETE /tabs/:tab', 'GET /tabs', 'DELETE /sessions/me'], 'the last tab closes the session, which saves');
});

test('a start lock left by a dead start is cleared, and a live one is waited on', t => {
  const f = fixture(t);
  mkdirSync(join(f.camofox.install, 'start.lock'), { recursive: true });
  const waited = f.runWith({ BROWSE_START_MS: '400' }, 'open', SHOP);
  assert.equal(waited.stdout, 'BROWSE_ERROR=the browser did not start\n', 'another task holds the start and no server came');
  const old = new Date(Date.now() - 3_600_000);
  utimesSync(join(f.camofox.install, 'start.lock'), old, old);
  assert.equal(ok(f, 'open', SHOP), `BROWSE_URL=${SHOP}\n`);
});

// ---------------------------------------------------------------------------
// Saved logins

/** Asserts no stored username or password is in `text`. */
function assertNoSecret(text, where) {
  for (const { username, password } of LOGINS) for (const secret of [username, password]) assert.ok(!text.includes(secret), `${where} holds a stored value`);
}

test('logins prints names, hosts, and usernames, never a password, and forget deletes one', t => {
  const f = fixture(t);
  assert.equal(ok(f, 'logins'), 'BROWSE_LOGINS=0\n');
  f.saveLogins(LOGINS);
  const listed = f.run('logins');
  assert.equal(listed.stdout, `BROWSE_LOGINS=2\nshop-example-com\tshop.example.com\t${USERNAME}\nbank-example-com\tbank.example.com\tother-zq@mail.example\n`);
  for (const { password } of LOGINS) assert.ok(!(listed.stdout + listed.stderr).includes(password));

  assert.equal(ok(f, 'forget', 'bank-example-com'), 'BROWSE_FORGOT=bank-example-com\n');
  assert.deepEqual(readLogins(f.loginsFile), [LOGINS[0]]);
  assert.equal(statSync(f.loginsFile).mode & 0o777, 0o600);
  assert.equal(statSync(dirname(f.loginsFile)).mode & 0o777, 0o700);
  assert.equal(ok(f, 'forget', 'bank-example-com'), 'BROWSE_LOGIN=missing\n');
  assert.equal(f.camofox.starts(), 0, 'neither needs the browser');

  writeFileSync(f.loginsFile, `{"name": "broken", "password": "${PASSWORD}"`);
  for (const args of [['logins'], ['forget', 'x'], ['login', 'x', '--password', 'e2']]) {
    const out = f.run(...args);
    assert.equal(out.status, 1);
    assert.equal(out.stdout, 'BROWSE_ERROR=the saved logins file can not be read\n');
    assertNoSecret(out.stdout + out.stderr, 'the error');
  }
});

test('logins.mjs reads nothing as no logins, refuses what is not a list, and names a host', t => {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-logins-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'inner', 'logins.json');
  assert.deepEqual(readLogins(file), []);
  writeLogins(LOGINS, file);
  assert.deepEqual(readLogins(file), LOGINS);
  assert.deepEqual(readdirSync(dirname(file)), ['logins.json'], 'no half-written file is left');
  writeFileSync(file, '{"a": 1}');
  assert.throws(() => readLogins(file), /can not be read/);
  assert.equal(hostOf('https://WWW.Shop.example.com/login'), 'shop.example.com');
  assert.equal(hostOf('android://x@com.app/'), '');
  assert.equal(hostOf('not a url'), '');
});

test('login types a saved login where the agent pointed, and says accepted once the address leaves the page', t => {
  const f = fixture(t);
  f.saveLogins(LOGINS);
  ok(f, 'open', SHOP, '--session', 'a');
  f.camofox.set('press-url', ACCOUNT);
  const before = f.camofox.requests().length;
  const out = f.run('login', 'shop-example-com', '--username', 'e1', '--password', 'e2', '--session', 'a');
  assert.equal(out.status, 0, out.stderr);
  assert.equal(out.stdout, 'BROWSE_LOGIN=accepted\nBROWSE_SAVED=yes\n');
  const sent = f.camofox.requests().slice(before);
  assert.deepEqual(sent.map(({ method, path, body }) => [`${method} ${path.replace(/^\/tabs\/[^/]+/, '')}`, body]), [
    ['POST /evaluate', { userId: 'me', expression: 'location.href' }],
    ['POST /type', { userId: 'me', ref: 'e1', text: USERNAME }],
    ['POST /type', { userId: 'me', ref: 'e2', text: PASSWORD }],
    ['POST /press', { userId: 'me', key: 'Enter' }],
    ['POST /evaluate', { userId: 'me', expression: 'location.href' }],
    ['POST /sessions/me/cookies', { cookies: [] }],
  ], 'the login is saved as soon as it is accepted, with the tab still open');
  assert.equal(f.camofox.tabs().length, 1);

  assertNoSecret(out.stdout + out.stderr, 'the output');
  assertNoSecret(JSON.stringify(f.camofox.env()), 'the server\'s command line or environment');
  assertNoSecret(JSON.stringify(f.camofox.requests().filter(request => !request.path.endsWith('/type'))), 'a request other than /type');
  assertNoSecret(filesUnder(f.camofox.install), 'a file the browser keeps');
});

test('login says rejected when the page stays, typed for a step with no password box, and missing for an unknown name', t => {
  const f = fixture(t);
  f.saveLogins(LOGINS);
  const missing = f.run('login', 'nobody', '--password', 'e2', '--session', 'a');
  assert.equal(missing.stdout, 'BROWSE_LOGIN=missing\n');
  assert.equal(missing.status, 0);
  assert.equal(f.camofox.starts(), 0, 'an unknown name starts nothing');

  ok(f, 'open', SHOP, '--session', 'a');
  const before = f.camofox.calls().length;
  assert.equal(ok(f, 'login', 'shop-example-com', '--username', 'e1', '--submit', 'e3', '--session', 'a'), 'BROWSE_LOGIN=typed\n');
  assert.deepEqual(f.camofox.calls().slice(before), ['POST /tabs/:tab/evaluate', 'POST /tabs/:tab/type', 'POST /tabs/:tab/click'], 'an email then Continue: no wait, no save');

  f.camofox.set('click-url', `${SHOP}?error=wrong-password`);
  const rejected = f.run('login', 'shop-example-com', '--password', 'e2', '--submit', 'e3', '--session', 'a');
  assert.equal(rejected.stdout, 'BROWSE_LOGIN=rejected\n', 'the same page with a message is not accepted');
  assert.equal(rejected.status, 0);
  assert.ok(!f.camofox.calls().includes('POST /sessions/me/cookies'), 'a rejected login saves nothing');
  assertNoSecret(rejected.stdout + rejected.stderr, 'the output');
});

test('a login step the browser refuses is reported without what was typed, and never retried', t => {
  const f = fixture(t);
  f.saveLogins(LOGINS);
  ok(f, 'open', SHOP);
  f.camofox.set('fail-type');
  const out = f.run('login', 'shop-example-com', '--password', 'e2');
  assert.equal(out.status, 1);
  assert.equal(out.stdout, 'BROWSE_ERROR=the browser refused the step (HTTP 422)\n');
  assertNoSecret(out.stdout + out.stderr, 'the error');
  const typed = f.run('type', 'e1', 'a-plain-answer');
  assert.equal(typed.stdout, 'BROWSE_ERROR=the browser refused the step (HTTP 422)\n', 'no typing step quotes the browser\'s reason');
  f.camofox.unset('fail-type');

  f.camofox.set('gone-once');
  const before = f.camofox.calls().length;
  const lost = f.run('login', 'shop-example-com', '--password', 'e2');
  assert.equal(lost.status, 1);
  assert.deepEqual(f.camofox.calls().slice(before), ['POST /tabs/:tab/evaluate'], 'a lost page is not reopened to type a password into');
});

test('an accepted login whose save fails says so', t => {
  const f = fixture(t);
  f.saveLogins(LOGINS);
  ok(f, 'open', SHOP);
  f.camofox.set('click-url', ACCOUNT);
  f.camofox.set('fail-save');
  assert.equal(ok(f, 'login', 'shop-example-com', '--password', 'e2', '--submit', 'e3'), 'BROWSE_LOGIN=accepted\nBROWSE_SAVED=no\n');
  const out = f.run('save');
  assert.equal(out.status, 1);
  assert.equal(out.stdout, 'BROWSE_ERROR=cookie import failed\n');
});

test('save keeps the logins with every tab open', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP, '--session', 'a');
  const before = f.camofox.requests().length;
  assert.equal(ok(f, 'save', '--session', 'a'), 'BROWSE_SAVED=yes\n');
  assert.deepEqual(f.camofox.requests().slice(before).map(({ method, path, body }) => [method, path, body]), [['POST', '/sessions/me/cookies', { cookies: [] }]]);
  assert.equal(f.camofox.tabs().length, 1, 'the tab is still open');
});

// ---------------------------------------------------------------------------
// The calls a private link makes

/**
 * Runs `body` on session a's client in a process of its own, as hand-over.mjs holds one, under the
 * fixture's HOME. Resolves to `{value}`, what the body returns, or to `{error, status}`.
 */
function viaClient(f, body, options = '{ retry: false, start: false }') {
  const code = `import { client } from ${JSON.stringify(pathToFileURL(script).href)};
const page = client('a', ${options});
try { console.log(JSON.stringify({ value: await (async () => { ${body} })() })); } catch (error) { console.log(JSON.stringify({ error: error.message, status: error.status })); }`;
  const out = spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd: f.home, env: f.env, encoding: 'utf8', timeout: 30_000 });
  assert.equal(out.status, 0, out.stderr);
  return JSON.parse(out.stdout);
}

test('the client sets a page\'s size, reads it, and keeps the page open, each in one call that reads nothing else', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP, '--session', 'a');
  const before = f.camofox.requests().length;
  assert.deepEqual(viaClient(f, 'const was = await page.size(); await page.resize(480, 663); return [was, await page.size(), await page.keepAlive()];'), { value: [[2560, 1328], [480, 663], 1] });
  assert.deepEqual(f.camofox.requests().slice(before).map(({ method, path, body }) => [`${method} ${path.replace(/^\/tabs\/[^/]+/, '')}`, body]), [
    ['POST /evaluate', { userId: 'me', expression: '[innerWidth, innerHeight]' }],
    ['POST /viewport', { userId: 'me', width: 480, height: 663 }],
    ['POST /evaluate', { userId: 'me', expression: '[innerWidth, innerHeight]' }],
    ['POST /evaluate', { userId: 'me', expression: '1' }],
  ]);
  assert.deepEqual(f.camofox.tabs()[0].size, [480, 663]);
});

test('a private link\'s client does not reopen a lost tab or start a stopped browser for these calls', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP, '--session', 'a');
  for (const call of ['page.resize(480, 663)', 'page.size()', 'page.keepAlive()']) {
    f.camofox.set('gone-once');
    const before = f.camofox.calls().length;
    assert.equal(viaClient(f, `return ${call};`).status, 410, call);
    assert.equal(f.camofox.calls().slice(before).length, 1, `${call}: the one call, and no new tab`);
    ok(f, 'open', SHOP, '--session', 'a');
  }

  f.camofox.set('gone-once');
  const before = f.camofox.calls().length;
  assert.deepEqual(viaClient(f, 'await page.resize(480, 663); return page.size();', '{}'), { value: [480, 663] }, 'a task\'s own client still reopens the tab');
  assert.deepEqual([f.camofox.calls()[before], f.camofox.calls()[before + 1], f.camofox.calls().at(-2)], ['POST /tabs/:tab/viewport', 'POST /tabs', 'POST /tabs/:tab/viewport']);

  ok(f, 'stop');
  for (const call of ['page.resize(480, 663)', 'page.size()', 'page.keepAlive()']) assert.equal(viaClient(f, `return ${call};`).error, 'the browser is not running', call);
  assert.equal(f.camofox.starts(), 1, 'none of them started the browser');
});

test('the new calls add no command: the usage and the refusals are as before', t => {
  const f = fixture(t);
  assert.doesNotMatch(f.run('--help').stdout, /resize|viewport|keep-?alive|size/i);
  for (const args of [['resize', '480', '663'], ['size'], ['keep-alive'], ['get', 'size'], ['viewport', '480', '663']]) {
    const out = f.run(...args);
    assert.equal(out.status, 2, args.join(' '));
    assert.match(out.stderr, /usage: browse\.mjs/);
  }
  assert.equal(f.camofox.starts(), 0);
});

// ---------------------------------------------------------------------------
// Pure helpers

test('targetOf takes a ref in either spelling, else a selector', () => {
  assert.deepEqual(targetOf('e12'), { ref: 'e12' });
  assert.deepEqual(targetOf('@e12'), { ref: 'e12' });
  for (const selector of ['#card', 'iframe#pay >> input[name="cvc"]', 'email', '@card', 'e12x']) assert.deepEqual(targetOf(selector), { selector });
});

test('valueIn reads a text box\'s text and a dropdown\'s picked choice from a snapshot', () => {
  const snapshot = [
    '- textbox "Name" [e1]: "Jo Smith"',
    '- textbox "Email" [e2]',
    '- combobox "Month" [e3] [disabled]:',
    '  - option "February"',
    '  - option "March" [selected]',
    '- combobox "Year" [e4]:',
    '  - option "2028"',
    '- textbox "City" [e5]: Markham',
  ].join('\n');
  assert.equal(valueIn(snapshot, 'e1'), 'Jo Smith');
  assert.equal(valueIn(snapshot, 'e2'), '', 'an empty box');
  assert.equal(valueIn(snapshot, 'e3'), 'March');
  assert.equal(valueIn(snapshot, 'e4'), '', 'nothing marked as picked');
  assert.equal(valueIn(snapshot, 'e5'), 'Markham');
  assert.equal(valueIn(snapshot, 'e9'), null);
});

test('leftPage ignores a changed query, and counts a new path or fragment', () => {
  assert.equal(leftPage(SHOP, `${SHOP}?error=1`), false);
  assert.equal(leftPage(`${SHOP}?next=/cart`, SHOP), false);
  assert.equal(leftPage(SHOP, ACCOUNT), true);
  assert.equal(leftPage(SHOP, `${SHOP}#/home`), true);
});
