import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { boxAt, boxChanged, boxesIn, CAMOUFOX, countScript, FRAMES_SCRIPT, frameSites, hostOf, installedLine, labelFrames, NO_REF_NOTE, refNames, relabel, SECRETS_SCRIPT, fieldScript, hideSecrets, joinPieces, selectorError, sessionName, targetOf, valueIn } from '../../.agents/skills/browser/scripts/browse.mjs';
import { windowLaunch } from '../../.agents/skills/browser/scripts/browser-server.mjs';
import { BROWSE_ENV, fakeCamofox, fakePython } from './fixtures/fake-camofox.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.agents/skills/browser/scripts/browse.mjs');
const SHOP = 'https://shop.example.com/login';
const ACCOUNT = 'https://shop.example.com/account';

// A HOME of its own holding a fake Camoufox install, and a fake python3 first on PATH that logs each run and makes
// a venv as the real install would; `fail-pip` in the control folder fails the library step.
function fixture(t, options = {}) {
  const home = mkdtempSync(join(tmpdir(), 'wong-test-browse-'));
  const camofox = fakeCamofox(home, options);
  const bin = join(home, 'bin');
  mkdirSync(bin);
  fakePython(join(bin, 'python3'), camofox.control);
  const env = { ...process.env, ...BROWSE_ENV, HOME: home, PATH: `${bin}:${process.env.PATH}` };
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
  return { home, env, camofox, run, runWith, start };
}

/** Runs a command and asserts it worked; returns its stdout. */
function ok(f, ...args) {
  const out = f.run(...args);
  assert.equal(out.status, 0, `${args.join(' ')}: ${out.stdout}${out.stderr}${f.camofox.errors()}`);
  return out.stdout;
}

/** The expression a click sends to read a selector's tick box. */
/** The one script a page reading evaluates: the secret values, and the main page's iframes. */
const PAGE_READ = `[${SECRETS_SCRIPT}, ${FRAMES_SCRIPT}]`;
const boxRead = selector => `(${boxAt})(document, ${JSON.stringify(selector)}, ["checkbox","radio","switch","menuitemcheckbox"])`;
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };

test('with no install, a command prints BROWSE_NEEDS=install with the sizes and exits 3, starting nothing', t => {
  const f = fixture(t, { installed: false });
  for (const args of [['open', SHOP], ['snapshot'], ['save']]) {
    const out = f.run(...args);
    assert.equal(out.status, 3, args.join(' '));
    assert.equal(out.stdout, 'BROWSE_NEEDS=install\n');
    assert.match(out.stderr, /Python 3\.10 or newer/);
    assert.match(out.stderr, /3 GB of disk/);
    assert.match(out.stderr, /700 MB of memory/);
  }
  assert.equal(ok(f, 'status'), 'BROWSE_INSTALLED=no\nBROWSE_SERVER=stopped\n');
  assert.equal(ok(f, 'close', '--session', 'a'), 'BROWSE_CLOSED=a\n', 'closing with no browser running starts none');
  assert.equal(f.camofox.starts(), 0);
});

test('install makes a venv, installs the pinned library and its build there, and checks both, its temp and cache on disk', t => {
  const f = fixture(t, { installed: false });
  assert.deepEqual(CAMOUFOX, { python: '0.5.9', build: 'v158.0.1-beta.41' });
  assert.equal(ok(f, 'install'), 'BROWSE_INSTALLED=yes camoufox 158.0.1-beta.41 library 0.5.9\n', 'and asks nothing about a password manager');
  const venv = join(f.camofox.install, 'venv', '0.5.9', 'bin', 'python');
  const runs = f.camofox.pythonRuns().filter(run => run.args[1] !== '-c');
  assert.deepEqual(runs.map(run => [run.python, run.args.slice(0, 3)]), [
    [join(f.home, 'bin', 'python3'), ['-m', 'venv', join(f.camofox.install, 'venv', '0.5.9')]],
    [venv, ['-m', 'pip', 'install']],
    [venv, ['-m', 'camoufox', 'fetch']],
    [venv, ['-I', join(repo, '.agents/skills/browser/scripts/launch-config.py'), '--library']],
  ]);
  assert.ok(runs[1].args.includes('camoufox[geoip]==0.5.9'), 'pip gets the one pinned version');
  assert.deepEqual(runs.at(-1).args.slice(3), ['0.5.9', '--build', 'v158.0.1-beta.41', '--check']);
  for (const run of runs) {
    assert.equal(run.tmp, join(f.camofox.install, 'tmp'));
    assert.equal(run.cache, join(f.camofox.install, 'cache'), 'the library never sees the default cache folder');
  }
  assert.equal(statSync(f.camofox.install).mode & 0o777, 0o700);

  f.camofox.set('fail-pip');
  const failed = f.run('install');
  assert.equal(failed.status, 1);
  assert.equal(failed.stdout, 'BROWSE_ERROR=the install failed at the camoufox library; see the lines above\n');
  assert.match(failed.stderr, /no space left/, 'pip\'s own lines reach the person');
});

test('install with no Python 3.10 stops with BROWSE_NEEDS=python and installs nothing', t => {
  const f = fixture(t, { installed: false });
  const empty = mkdtempSync(join(tmpdir(), 'wong-test-no-python-'));
  t.after(() => rmSync(empty, { recursive: true, force: true }));
  const out = f.runWith({ PATH: empty }, 'install');
  assert.equal(out.status, 3, out.stderr);
  assert.equal(out.stdout, 'BROWSE_NEEDS=python\n');
  assert.match(out.stderr, /Python 3\.10 or newer/);
  assert.ok(!existsSync(join(f.camofox.install, 'venv')));
});

test('the server starts in its private folder with the key in a file, never on its command line, and stops', async t => {
  const f = fixture(t);
  assert.equal(ok(f, 'open', SHOP, '--session', 'a'), `BROWSE_URL=${SHOP}\n`);
  const env = f.camofox.env();
  const key = readFileSync(join(f.camofox.install, 'api-key'), 'utf8').trim();
  assert.match(key, /^[0-9a-f]{64}$/);
  assert.equal(statSync(join(f.camofox.install, 'api-key')).mode & 0o777, 0o600);
  assert.equal(statSync(join(f.camofox.install, 'server.json')).mode & 0o777, 0o600);
  assert.equal(env.TMPDIR, join(f.camofox.install, 'tmp'));
  assert.equal(env.cwd, f.camofox.install);
  assert.deepEqual(env.argv, [BROWSE_ENV.BROWSE_SERVER_SCRIPT], 'the key is not on the command line');
  const info = JSON.parse(readFileSync(join(f.camofox.install, 'server.json'), 'utf8'));
  assert.equal(info.port, Number(env.BROWSE_SERVER_PORT));
  assert.ok(f.camofox.requests().every(request => request.auth === `Bearer ${key}`), 'every request carries the key');
  assert.ok(!existsSync(join(f.camofox.install, 'server.log')), 'the server keeps no log');
  assert.ok(['profile', 'cache', 'tmp', 'tabs'].every(dir => (statSync(join(f.camofox.install, dir)).mode & 0o777) === 0o700), 'the private folders are the person\'s alone');

  assert.match(ok(f, 'status'), /^BROWSE_INSTALLED=yes camoufox 158\.0\.1-beta\.41 library 0\.5\.9\nBROWSE_SERVER=running\nBROWSE_WINDOW=on\nBROWSE_PROXY=off\nBROWSE_NETWORK=direct \(no upstream proxy\)\nBROWSE_SHOWN=none\n$/);
  ok(f, 'snapshot', '--session', 'a');
  assert.equal(f.camofox.starts(), 1, 'a later command uses the running server');

  assert.equal(ok(f, 'stop'), 'BROWSE_SERVER=stopped\n');
  assert.ok(f.camofox.has('stopped'), 'the server was asked to stop, so it can close the browser first');
  assert.ok(!alive(env.pid));
  assert.match(ok(f, 'status'), /BROWSE_SERVER=stopped/);
  assert.equal(ok(f, 'stop'), 'BROWSE_SERVER=stopped\n', 'stopping twice is fine');
});

test('a library and build that disagree are refused before anything starts, and status names the part to install', t => {
  const f = fixture(t);
  f.camofox.set('check.json', { error: 'the camoufox build 158.0.1-beta.41 is not installed (158.0.0-beta.40 is)', needs: 'build' });
  const out = f.run('open', SHOP);
  assert.equal(out.status, 1);
  assert.equal(out.stdout, 'BROWSE_ERROR=the browser will not start: the camoufox build 158.0.1-beta.41 is not installed (158.0.0-beta.40 is); run `browse.mjs install`\n');
  assert.equal(f.camofox.starts(), 0);
  assert.ok(!existsSync(join(f.camofox.install, 'server.json')));
  assert.equal(ok(f, 'status'), 'BROWSE_INSTALLED=no (the camoufox build 158.0.1-beta.41 is not installed (158.0.0-beta.40 is); the build part needs `browse.mjs install`)\nBROWSE_SERVER=stopped\n');
  assert.equal(installedLine({ error: 'camoufox 0.5.9 pins v158.0.2-beta.42, not v158.0.1-beta.41; raise both pins together', needs: 'pins' }), 'no (camoufox 0.5.9 pins v158.0.2-beta.42, not v158.0.1-beta.41; raise both pins together; the pins part needs `browse.mjs install`)');
});

test('a server that never answers is reported, not waited on forever, and one that names its failure is not tried again', t => {
  const f = fixture(t);
  const dead = join(f.home, 'dead-server.mjs');
  writeFileSync(dead, 'process.exit(1);\n');
  const out = f.runWith({ BROWSE_SERVER_SCRIPT: dead }, 'open', SHOP);
  assert.equal(out.status, 1);
  assert.equal(out.stdout, 'BROWSE_ERROR=the browser did not start\n');
  assert.ok(!existsSync(join(f.camofox.install, 'start.lock')), 'the start lock is released');

  const failing = join(f.home, 'failing-server.mjs');
  writeFileSync(failing, `import { appendFileSync, writeFileSync } from 'node:fs';
appendFileSync(${JSON.stringify(join(f.home, 'failing-starts'))}, 'start\\n');
writeFileSync('server.json', JSON.stringify({ pid: process.pid, error: 'Xvfb, the screen the browser draws on, is not installed' }));
process.exit(1);
`);
  const named = f.runWith({ BROWSE_SERVER_SCRIPT: failing }, 'open', SHOP);
  assert.equal(named.status, 1);
  assert.equal(named.stdout, 'BROWSE_ERROR=the browser did not start: Xvfb, the screen the browser draws on, is not installed\n');
  assert.equal(readFileSync(join(f.home, 'failing-starts'), 'utf8'), 'start\n', 'a start with a reason is not tried again');
  assert.ok(!existsSync(join(f.camofox.install, 'server.json')));
});

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
  const out = f.runWith({ BROWSE_SETTLE_MS: '300' }, 'open', SHOP);
  assert.equal(out.status, 0, out.stdout + out.stderr + f.camofox.errors());
  assert.equal(out.stdout, `BROWSE_URL=${SHOP}\n`);
  const reads = f.camofox.calls().filter(call => call === 'GET /tabs/:tab/snapshot').length;
  assert.ok(reads < 400, `the settle wait ended the reads, not the page: ${reads} reads`);
});

test('a start that dies before it answers is tried again on a new port', t => {
  const f = fixture(t);
  f.camofox.set('die-once');
  assert.equal(ok(f, 'open', SHOP), `BROWSE_URL=${SHOP}\n`);
  assert.ok(!f.camofox.has('die-once'), 'the first start died');
  assert.equal(f.camofox.starts(), 1);
  assert.ok(!existsSync(join(f.camofox.install, 'start.lock')), 'the start lock is released');
});

test('a task waiting on another\'s start starts the browser itself when that start ends with none', async t => {
  const f = fixture(t);
  mkdirSync(join(f.camofox.install, 'start.lock'), { recursive: true });
  const opening = f.start('open', SHOP);
  await new Promise(done => setTimeout(done, 500));
  rmSync(join(f.camofox.install, 'start.lock'), { recursive: true, force: true });
  const out = await opening;
  assert.equal(out.status, 0, out.stdout + out.stderr + f.camofox.errors());
  assert.equal(out.stdout, `BROWSE_URL=${SHOP}\n`);
  assert.equal(f.camofox.starts(), 1);
});

test('each command reaches its own route with the session\'s tab, as the person', t => {
  const f = fixture(t);
  const on = (...args) => ok(f, ...args, '--session', 'a');
  on('open', SHOP);
  const before = f.camofox.requests().length;
  assert.equal(on('click', 'e2'), 'BROWSE_DONE=click\n');
  assert.equal(on('click', '@e2'), 'BROWSE_DONE=click\n');
  assert.equal(on('click', '#go'), 'BROWSE_DONE=click\n', 'a selector that finds no tick box clicks once');
  assert.equal(on('type', 'e1', 'Jo Smith'), 'BROWSE_DONE=type\n');
  assert.equal(on('type', '#name', 'Jo'), 'BROWSE_DONE=type\n');
  assert.equal(on('press', 'Enter'), 'BROWSE_DONE=press\n');
  assert.equal(on('select', 'e3', 'Large'), 'BROWSE_DONE=select\n');
  assert.equal(on('get', 'url'), `${SHOP}\n`);
  assert.equal(on('get', 'count', '#cart li'), '1\n');
  assert.equal(on('get', 'value', '#name'), 'Jo\n');
  assert.equal(on('select', '#month', '03 - March'), 'BROWSE_DONE=select\n');
  assert.equal(on('get', 'value', '#month'), '03 - March\n', 'a dropdown reads as its picked choice\'s text, as by a ref');
  const sent = f.camofox.requests().slice(before);
  assert.deepEqual(sent.map(({ method, path, body }) => [`${method} ${path.replace(/^\/tabs\/[^/]+/, '')}`, body]), [
    ['POST /click', { userId: 'me', ref: 'e2' }],
    ['POST /click', { userId: 'me', ref: 'e2' }],
    ['POST /evaluate', { userId: 'me', expression: boxRead('#go') }],
    ['POST /click', { userId: 'me', selector: '#go' }],
    ['POST /type', { userId: 'me', ref: 'e1', text: 'Jo Smith' }],
    ['POST /type', { userId: 'me', selector: '#name', text: 'Jo' }],
    ['POST /press', { userId: 'me', key: 'Enter' }],
    ['POST /select', { userId: 'me', ref: 'e3', option: 'Large' }],
    ['POST /evaluate', { userId: 'me', expression: 'location.href' }],
    ['POST /evaluate', { userId: 'me', expression: countScript('#cart li') }],
    ['POST /evaluate', { userId: 'me', expression: fieldScript('#name') }],
    ['POST /select', { userId: 'me', selector: '#month', option: '03 - March' }],
    ['POST /evaluate', { userId: 'me', expression: fieldScript('#month') }],
  ]);

  // A main-page ref at its place: camofox numbers the main page in order.
  f.camofox.set('snapshot', '- textbox "Card number" [e1]: 4111\n- combobox "Expiry month" [e2]:\n  - option "02 - February"\n  - option "03 - March" [selected]');
  assert.equal(on('get', 'value', 'e1'), '[hidden]\n', 'a card number is never read back');
  assert.equal(on('get', 'value', '@e2'), '03 - March\n', 'a dropdown\'s picked choice');
  const missing = f.run('get', 'value', 'e99', '--session', 'a');
  assert.equal(missing.status, 1);
  assert.equal(missing.stdout, 'BROWSE_ERROR=no field e99 on the page\n');
  f.camofox.set('no-field');
  assert.equal(f.run('get', 'value', '#gone', '--session', 'a').stdout, 'BROWSE_ERROR=no field #gone on the page\n');
});

test('snapshot and get value hide a filled secret box, by its name or by a secret value the page holds', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP, '--session', 'a');
  f.camofox.set('snapshot', '- textbox "Email" [e1]: jo@example.com\n- textbox "Password" [e2]: hunter2\n- textbox "Shown" [e3]: Vault-7781');
  f.camofox.set('secrets.json', ['Vault-7781']);
  assert.equal(ok(f, 'snapshot', '--session', 'a'), `BROWSE_URL=${SHOP}\n- textbox "Email" [e1]: jo@example.com\n- textbox "Password" [e2]: [hidden]\n- textbox "Shown" [e3]: [hidden]\n`);
  assert.equal(ok(f, 'get', 'value', 'e2', '--session', 'a'), '[hidden]\n');
  assert.equal(ok(f, 'get', 'value', 'e3', '--session', 'a'), '[hidden]\n');
  assert.equal(ok(f, 'get', 'value', 'e1', '--session', 'a'), 'jo@example.com\n');
  const reads = f.camofox.requests().filter(request => request.path.endsWith('/evaluate')).map(request => request.body.expression);
  assert.ok(reads.length && reads.every(expression => expression === PAGE_READ), 'one read of the secret values per reading');
});

test('valueOf reads a key the CLI hides, by ref only, and the CLI has no way to it', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP, '--session', 'a');
  const key = 'ntn_MADEUPkey0000aaaaBBBBcccc91c0';
  f.camofox.set('snapshot', `- heading "Integration secret"\n- textbox "Secret key" [e1]: ${key}`);
  f.camofox.set('secrets.json', [key]);
  assert.equal(ok(f, 'get', 'value', 'e1', '--session', 'a'), '[hidden]\n', 'a key in a password box stays hidden on the CLI');
  const valueOf = target => spawnSync(process.execPath, ['--input-type=module', '-e',
    `import { client } from ${JSON.stringify(pathToFileURL(script).href)}; try { console.log(await client('a').valueOf(${JSON.stringify(target)})); } catch (error) { console.log('ERROR', error.message); }`],
  { cwd: f.home, env: f.env, encoding: 'utf8', timeout: 30_000 }).stdout;
  assert.equal(valueOf('@e1'), `${key}\n`);
  assert.equal(valueOf('#k'), 'ERROR no field #k on the page\n', 'a selector is not read');
  assert.equal(valueOf('e9'), 'ERROR no field e9 on the page\n');
  for (const args of [['get', 'valueOf', 'e1'], ['get', 'raw', 'e1'], ['valueOf', 'e1']]) assert.equal(f.run(...args, '--session', 'a').status, 2, args.join(' '));
});

test('snapshot prints the address and a long page whole, a secret box cut between pieces hidden', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP);
  // camofox cuts at character 74,800 and 149,600: inside the password, then inside the email.
  const password = '- textbox "Password" [e3]: fake-trial-123';
  const email = '- textbox "Email" [e1]: jo@example.com';
  const first = `- heading "Top"\n- text: ${'a'.repeat(74_800 - 5 - password.indexOf('fake') - 25)}\n`;
  const second = `${password}\n- text: ${'b'.repeat(149_596 - first.length - password.length - 10 - email.indexOf('jo@'))}\n`;
  const page = `${first}${second}${email}\n- text: ${'c'.repeat(9000)}\n- link "Next page" [e9]`;
  assert.deepEqual([page.slice(74_795, 74_805), page.slice(149_596, 149_604)], ['fake-trial', 'jo@examp'], 'the cuts land in the boxes');
  f.camofox.set('snapshot', page);
  const out = ok(f, 'snapshot');
  assert.equal(out, `BROWSE_URL=${SHOP}\n${page.replace('fake-trial-123', '[hidden]')}\n`);
  assert.ok(!/fake|trial|truncated/.test(out), 'no part of the password, and no piece marker');
  const pieces = f.camofox.requests().filter(request => request.path.endsWith('/snapshot') && request.query.includes('offset'));
  assert.deepEqual(pieces.map(request => new URLSearchParams(request.query).get('offset')), ['74800', '149600']);
});

test('joinPieces refuses pieces it can not join exactly, never joining them raw', () => {
  const tail = 'e'.repeat(10);
  const marker = end => `\n[... truncated at char ${end} of 30. Call snapshot with offset=${end} to see more. Pagination links below. ...]\n`;
  const whole = `${'a'.repeat(12)}${'b'.repeat(8)}${tail}`;
  const firstPiece = { snapshot: `${'a'.repeat(12)}${marker(12)}${tail}`, hasMore: true, nextOffset: 12, totalChars: 30 };
  assert.equal(joinPieces([firstPiece, { snapshot: `${'b'.repeat(8)}ee\n${tail}`, hasMore: false, totalChars: 30 }]), whole, 'the last part overlaps the end');
  assert.throws(() => joinPieces([{ ...firstPiece, snapshot: `${'a'.repeat(12)}\n[cut]\n${tail}` }, { snapshot: `\n${tail}`, totalChars: 30 }]), /can not join/);
  assert.throws(() => joinPieces([firstPiece, { snapshot: `${'b'.repeat(3)}\n${tail}`, totalChars: 30 }]), /can not join/, 'a gap before the end');
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
  const shots = () => f.camofox.requests().filter(request => request.path.endsWith('/screenshot')).map(request => request.query);
  assert.ok(shots().every(query => query === 'userId=me'), 'what shows, by default');
  ok(f, 'screenshot', '--full-page', '--session', 'a');
  assert.equal(shots().at(-1), 'userId=me&fullPage=true', '--full-page asks for the whole page');
});

test('a command with no page open says so, and bad words are a usage error', t => {
  const f = fixture(t);
  const lost = f.run('click', 'e1', '--session', 'nobody');
  assert.equal(lost.status, 1);
  assert.equal(lost.stdout, 'BROWSE_ERROR=no page is open in this session; run `browse.mjs open <url>` first\n');
  for (const args of [[], ['fly'], ['open'], ['open', 'ftp://files.example.com'], ['click'], ['type', 'e1'], ['snapshot', 'extra'], ['get'], ['get', 'title'], ['get', 'url', 'extra'], ['get', 'count'], ['logins'], ['forget', 'shop'], ['window', 'maybe'], ['window', 'on', 'off']]) {
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
  const dead = join(f.home, 'dead-server.mjs');
  writeFileSync(dead, 'process.exit(1);\n');
  assert.equal(f.runWith({ BROWSE_SERVER_SCRIPT: dead }, 'click', 'e1').stdout, 'BROWSE_ERROR=the browser did not start\n');
});

test('two sessions started at once share one server, and close in one leaves the other\'s tab open', async t => {
  const f = fixture(t);
  f.camofox.set('die-once');
  const [a, b] = await Promise.all([f.start('open', SHOP, '--session', 'a'), f.start('open', ACCOUNT, '--session', 'b')]);
  assert.equal(a.status, 0, a.stdout + a.stderr + f.camofox.errors());
  assert.equal(b.status, 0, b.stdout + b.stderr + f.camofox.errors());
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
  // Dated ahead, so the lock reads as live however slowly the waiting task starts.
  const ahead = new Date(Date.now() + 3_600_000);
  utimesSync(join(f.camofox.install, 'start.lock'), ahead, ahead);
  const waited = f.runWith({ BROWSE_START_MS: '400' }, 'open', SHOP);
  assert.equal(waited.stdout, 'BROWSE_ERROR=the browser did not start\n', 'another task holds the start and no server came');
  const old = new Date(Date.now() - 3_600_000);
  utimesSync(join(f.camofox.install, 'start.lock'), old, old);
  assert.equal(ok(f, 'open', SHOP), `BROWSE_URL=${SHOP}\n`);
});

test('save keeps the sign-ins with every tab open', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP, '--session', 'a');
  const before = f.camofox.requests().length;
  assert.equal(ok(f, 'save', '--session', 'a'), 'BROWSE_SAVED=yes\n');
  assert.deepEqual(f.camofox.requests().slice(before).map(({ method, path, body }) => [method, path, body]), [['POST', '/sessions/me/cookies', { cookies: [] }]]);
  assert.equal(f.camofox.tabs().length, 1, 'the tab is still open');
});

test('saved logins are gone: login, logins and forget are usage errors, and no script reads logins.json', t => {
  const f = fixture(t);
  mkdirSync(join(f.home, '.wong-stack'), { recursive: true });
  writeFileSync(join(f.home, '.wong-stack/logins.json'), '[{"name": "shop", "url": "https://shop.example.com/", "password": "x"}]');
  for (const args of [['login'], ['login', 'shop'], ['login', 'shop', '--password', 'e2'], ['logins'], ['forget', 'shop']]) {
    const out = f.run(...args);
    assert.equal(out.status, 2, args.join(' '));
    assert.match(out.stderr, /usage: browse\.mjs/);
  }
  assert.doesNotMatch(f.run('--help').stdout, /login|forget|main-domain/);
  const browser = join(repo, '.agents/skills/browser/scripts');
  assert.ok(!existsSync(join(browser, 'logins.mjs')));
  for (const name of ['browse.mjs', 'browser-server.mjs']) assert.doesNotMatch(readFileSync(join(browser, name), 'utf8'), /logins\.(json|mjs)/, name);
  assert.equal(f.camofox.starts(), 0);
});

test('window prints the setting, on by default, and on or off saves it for the next start without a restart', t => {
  const f = fixture(t);
  const settings = join(f.home, '.wong-stack/browser-settings.json');
  assert.equal(ok(f, 'window'), 'BROWSE_WINDOW=on\n');
  assert.ok(!existsSync(settings), 'a read writes nothing');
  ok(f, 'open', SHOP);
  const pid = f.camofox.serverPid();
  const next = 'This takes effect the next time the browser starts; a running browser stays as it is.\n';
  assert.equal(ok(f, 'window', 'off'), `BROWSE_WINDOW=off\n${next}`);
  assert.deepEqual(JSON.parse(readFileSync(settings, 'utf8')), { window: false });
  assert.equal(ok(f, 'window'), 'BROWSE_WINDOW=off\n');
  assert.equal(ok(f, 'window', 'on'), `BROWSE_WINDOW=on\n${next}`);
  assert.deepEqual(JSON.parse(readFileSync(settings, 'utf8')), { window: true });
  assert.equal(statSync(settings).mode & 0o777, 0o600, 'the settings are the person\'s alone');
  assert.equal(f.camofox.serverPid(), pid);
  assert.ok(alive(pid) && f.camofox.starts() === 1, 'the running browser was not restarted');
  assert.match(f.run('--help').stdout, /window \[on\|off\]/);
  assert.match(f.run('--help').stdout, /on Linux, off \(or no screen\) sends a live-view link instead/);
});

test('proxy is off unless turned on, kept beside the window setting in the home folder, and a running browser keeps its own', t => {
  const f = fixture(t);
  const settings = join(f.home, '.wong-stack/browser-settings.json');
  const next = 'This takes effect the next time the browser starts; a running browser stays as it is.\n';
  assert.equal(ok(f, 'proxy'), 'BROWSE_PROXY=off\n');
  assert.ok(!existsSync(settings), 'a read writes nothing');
  ok(f, 'open', SHOP);
  const pid = f.camofox.serverPid();
  ok(f, 'window', 'off');
  assert.equal(ok(f, 'proxy', 'on'), `BROWSE_PROXY=on\n${next}`);
  assert.deepEqual(JSON.parse(readFileSync(settings, 'utf8')), { window: false, proxy: true }, 'one file, each setting kept');
  assert.equal(statSync(settings).mode & 0o777, 0o600);
  assert.ok(!resolve(settings).startsWith(repo), 'outside every repo');
  assert.equal(ok(f, 'status').split('\n').slice(2).join('\n'), 'BROWSE_WINDOW=off\nBROWSE_PROXY=on\nBROWSE_NETWORK=direct (no upstream proxy)\nBROWSE_SHOWN=none\nThe running browser started with other settings. This takes effect the next time the browser starts; a running browser stays as it is.\n');
  assert.ok(alive(pid) && f.camofox.starts() === 1, 'the running browser was not restarted');
  assert.equal(ok(f, 'proxy', 'off'), `BROWSE_PROXY=off\n${next}`);
  assert.deepEqual(JSON.parse(readFileSync(settings, 'utf8')), { window: false, proxy: false });
  for (const args of [['proxy', 'maybe'], ['proxy', 'on', 'off']]) assert.equal(f.run(...args).status, 2, args.join(' '));
  assert.match(f.run('--help').stdout, /proxy \[on\|off\]/);
});

test('status says what the running browser shows: a window, a live-view link, or nothing', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP);
  const record = join(f.camofox.install, 'server.json');
  const write = more => writeFileSync(record, JSON.stringify({ ...JSON.parse(readFileSync(record, 'utf8')), ...more }));
  const shown = () => /^BROWSE_SHOWN=(.*)$/m.exec(ok(f, 'status'))[1];
  write({ window: true });
  assert.equal(shown(), 'window');
  write({ window: undefined, display: ':7' });
  assert.equal(shown(), 'link');
  write({ display: null, proxy: undefined, windowSetting: undefined });
  assert.match(ok(f, 'status'), /\nThe running browser started with other settings\./, 'one from before the settings ran the proxy');
});

test("status names the running browser's route from its own server's network state, never an address", t => {
  const f = fixture(t);
  const file = join(f.camofox.install, 'network.json');
  const network = () => /^BROWSE_NETWORK=(.*)$/m.exec(ok(f, 'status'))[1];
  mkdirSync(f.camofox.install, { recursive: true });
  writeFileSync(file, JSON.stringify({ network: 'upstream', pid: 1 }));
  assert.equal(network(), 'unknown (browser stopped)');
  ok(f, 'open', SHOP);
  const pid = f.camofox.serverPid();
  for (const [state, line] of [
    [{ network: 'upstream', pid }, 'upstream'],
    [{ network: 'upstream', route: 'backup', pid }, 'upstream (backup)'],
    [{ network: 'direct', reason: 'unreachable', pid }, 'direct (upstream unreachable)'],
    [{ network: 'direct', reason: 'no-upstream', pid }, 'direct (no upstream proxy)'],
    [{ network: 'upstream', pid: pid + 1 }, 'direct (no upstream proxy)'],
  ]) {
    writeFileSync(file, JSON.stringify(state));
    assert.equal(network(), line, JSON.stringify(state));
  }
  assert.match(f.run('--help').stdout, /BROWSE_NETWORK=/);
});

test('the browser shows in a window unless turned off; on Linux only where a screen exists, else it draws on Xvfb', t => {
  const desk = { DISPLAY: ':0', XAUTHORITY: '/home/me/.Xauthority', HOME: '/home/me' };
  for (const [platform, setting, env, args, screen, record, xvfb] of [
    ['linux', true, desk, ['--window'], { DISPLAY: ':0', XAUTHORITY: '/home/me/.Xauthority' }, { window: true }, false],
    ['linux', true, { WAYLAND_DISPLAY: 'wayland-0', XDG_RUNTIME_DIR: '/run/user/1000' }, ['--window'], { WAYLAND_DISPLAY: 'wayland-0', XDG_RUNTIME_DIR: '/run/user/1000' }, { window: true }, false],
    ['linux', false, desk, [], {}, {}, true],
    ['linux', true, {}, [], {}, {}, true],
    ['darwin', true, {}, ['--window'], {}, { window: true }, false],
    ['win32', true, desk, ['--window'], {}, { window: true }, false],
    ['darwin', false, {}, [], {}, {}, false],
    ['win32', false, {}, [], {}, {}, false],
  ]) assert.deepEqual(windowLaunch({ platform, setting, env }), { args, env: screen, record, xvfb }, `${platform} ${setting} ${Object.keys(env)}`);
  const f = fixture(t);
  const read = () => spawnSync(process.execPath, ['--input-type=module', '-e', `import { serverWindow } from ${JSON.stringify(pathToFileURL(script).href)}; console.log(serverWindow());`], { env: f.env, encoding: 'utf8' }).stdout;
  mkdirSync(f.camofox.install, { recursive: true });
  writeFileSync(join(f.camofox.install, 'server.json'), JSON.stringify({ pid: 1, port: 1, window: true }));
  assert.equal(read(), 'true\n');
  writeFileSync(join(f.camofox.install, 'server.json'), JSON.stringify({ pid: 1, port: 1, display: ':7' }));
  assert.equal(read(), 'false\n');
});

test('hostOf names a URL\'s host without www, and nothing for another scheme', () => {
  assert.equal(hostOf('https://WWW.Shop.example.com/login'), 'shop.example.com');
  assert.equal(hostOf('android://x@com.app/'), '');
  assert.equal(hostOf('not a url'), '');
});

/** Runs `body` on session a's client in its own process, as hand-over.mjs holds one, under the fixture's HOME.
 * Resolves to `{value}`, what the body returns, or to `{error, status}`. */
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

test('targetOf takes a ref in either spelling, else a selector', () => {
  assert.deepEqual(targetOf('e12'), { ref: 'e12' });
  assert.deepEqual(targetOf('@e12'), { ref: 'e12' });
  for (const selector of ['#card', 'iframe#pay >> input[name="cvc"]', 'email', '@card', 'e12x']) assert.deepEqual(targetOf(selector), { selector });
});

test('valueIn reads a text box\'s text, under its placeholder too, and a dropdown\'s picked choice from a snapshot', () => {
  const snapshot = [
    '- textbox "Name" [e1]: "Jo Smith"',
    '- textbox "Email" [e2]',
    '- combobox "Month" [e3] [disabled]:',
    '  - option "February"',
    '  - option "March" [selected]',
    '- combobox "Year" [e4]:',
    '  - option "2028"',
    '- textbox "City" [e5]: Markham',
    '- textbox "Email" [e6]:',
    '  - /placeholder: you@example.com',
    '  - text: jo@example.com',
    '- combobox "Country" [e7]:',
    '  - /placeholder: Search',
    '  - text: Canada',
  ].join('\n');
  assert.equal(valueIn(snapshot, 'e1'), 'Jo Smith');
  assert.equal(valueIn(snapshot, 'e2'), '', 'an empty box');
  assert.equal(valueIn(snapshot, 'e3'), 'March');
  assert.equal(valueIn(snapshot, 'e4'), '', 'nothing marked as picked');
  assert.equal(valueIn(snapshot, 'e5'), 'Markham');
  assert.equal(valueIn(snapshot, 'e6'), 'jo@example.com', 'a box with a placeholder shows its text below it');
  assert.equal(valueIn(snapshot, 'e7'), 'Canada', 'a typed-in dropdown too');
  assert.equal(valueIn(snapshot, 'e9'), null);
  const placeheld = '- textbox "Email" [e1]:\n  - /placeholder: you@example.com\n  - text: jo@example.com\n- textbox "Name" [e2]:\n  - /placeholder: Jo';
  assert.equal(valueIn(placeheld, 'e1'), 'jo@example.com', 'a box whose placeholder differs from its name holds its text on a child line');
  assert.equal(valueIn(placeheld, 'e2'), '', 'an empty box with a placeholder');
});

test('hideSecrets hides a filled password, card, expiry, code, or secret value, and nothing else', () => {
  const snapshot = [
    '- textbox "Password" [e1]: fake-trial-123',
    '- textbox "Card number" [e2]: 4111 1111 1111 1111',
    '- textbox "Expiration date (MM / YY)" [e3]: 03 / 28',
    '- spinbutton "One-time code" [e4]: "123456"',
    '- textbox "Promo" [e5]: "Vault 7781"',
    '- textbox "Email" [e6]: jo@example.com',
    '- combobox "Expiry month" [e7]:',
    '  - option "03 - March" [selected]',
    '- textbox "Password" [e8]',
    '- searchbox "Shipping notes" [e9] [disabled]: leave at door',
    '- text: fake-trial-123',
  ].join('\n');
  assert.equal(hideSecrets(snapshot, ['Vault  7781', '', '  ']), [
    '- textbox "Password" [e1]: [hidden]',
    '- textbox "Card number" [e2]: [hidden]',
    '- textbox "Expiration date (MM / YY)" [e3]: [hidden]',
    '- spinbutton "One-time code" [e4]: [hidden]',
    '- textbox "Promo" [e5]: [hidden]',
    '- textbox "Email" [e6]: jo@example.com',
    '- combobox "Expiry month" [e7]:',
    '  - option "03 - March" [selected]',
    '- textbox "Password" [e8]',
    '- searchbox "Shipping notes" [e9] [disabled]: leave at door',
    '- text: fake-trial-123',
  ].join('\n'), 'a matched value under a plain name hides; an empty box, a dropdown, and page text read as given');
  assert.equal(valueIn(hideSecrets(snapshot), 'e7'), '03 - March', 'a dropdown\'s pick still reads back');
  assert.equal(hideSecrets('- textbox [e1]: "bad \\q"', ['bad \\q']), '- textbox [e1]: [hidden]', 'a quote JSON can not read is compared inside its quotes');
});

test('hideSecrets hides a value on a box\'s child line, and a box line Playwright quotes', () => {
  const placeheld = [
    '- textbox "Password" [e3]:',
    '  - /placeholder: Enter your password',
    '  - text: fake-trial-123',
    '- textbox "Promo" [e4]:',
    '  - /placeholder: Code',
    '  - text: Vault-7781',
    '- textbox "Email" [e5]:',
    '  - /placeholder: you@example.com',
    '  - text: jo@example.com',
    '- text: fake-trial-123',
  ].join('\n');
  const hidden = hideSecrets(placeheld, ['Vault-7781']);
  assert.equal(hidden, placeheld.replace('  - text: fake-trial-123', '  - text: [hidden]').replace('Vault-7781', '[hidden]'));
  assert.equal(valueIn(hidden, 'e3'), '[hidden]');
  assert.equal(valueIn(hidden, 'e5'), 'jo@example.com');
  // camofox adds no ref to a quoted line; a ref there still hides.
  assert.equal(hideSecrets([
    `- 'textbox "Password: case-sensitive"': fake-trial-123`,
    `- 'textbox "Password: case-sensitive"' [e3]: fake-trial-123`,
    `- 'textbox "Owner''s card number {main}" [disabled]':`,
    '  - /placeholder: 0000 0000 0000 0000',
    '  - text: 4111 1111 1111 1111',
    `- 'textbox "Note: \`gift\`"': fake-trial-123`,
    `- 'textbox "Note: \`gift\`"': happy birthday`,
    `- textbox "Owner's name" [e7]: Jo`,
  ].join('\n'), ['fake-trial-123']), [
    `- 'textbox "Password: case-sensitive"': [hidden]`,
    `- 'textbox "Password: case-sensitive"' [e3]: [hidden]`,
    `- 'textbox "Owner''s card number {main}" [disabled]':`,
    '  - /placeholder: 0000 0000 0000 0000',
    '  - text: [hidden]',
    `- 'textbox "Note: \`gift\`"': [hidden]`,
    `- 'textbox "Note: \`gift\`"': happy birthday`,
    `- textbox "Owner's name" [e7]: Jo`,
  ].join('\n'));
});

/** A page made of `html`, its same-origin frame holding `frame`, for the scripts the browser runs. */
function domOf(html, frame = '') {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://shop.example.com/' });
  const inner = dom.window.document.querySelector('iframe');
  if (inner) inner.contentDocument.body.innerHTML = frame;
  return dom.window;
}

test('the page scripts find secret values in frames and shadow roots, and read a secret field as hidden', () => {
  const page = domOf(`<input type="password" value="pw-1"><input autocomplete="section-pay cc-number" value="4111">
    <select autocomplete="cc-exp-month"><option selected>03</option></select><input name="email" value="jo@example.com">
    <input type="password" value=""><div id="host"></div><iframe></iframe>`, '<input autocomplete="one-time-code" value="123456">');
  page.document.querySelector('#host').attachShadow({ mode: 'open' }).innerHTML = '<input type="password" value="shown-pw">';
  assert.deepEqual([...page.eval(SECRETS_SCRIPT)], ['pw-1', '4111', 'shown-pw', '123456']);

  const fields = domOf(`<input id="password" type="password" value="fake-trial-123"><label>PIN <input id="pin" value="0000"></label>
    <input id="code" aria-label="Verification code" value="77"><input id="user" value="tomsmith"><input id="empty" type="password">
    <span id="l">Card number</span><input id="cc" aria-labelledby="x l" value="4111">
    <select id="month" autocomplete="cc-exp-month"><option>02</option><option selected>03</option></select>`);
  const read = selector => fields.eval(fieldScript(selector));
  assert.deepEqual(['#password', '#pin', '#code', '#cc', '#user', '#empty', '#month', '#gone'].map(read), ['[hidden]', '[hidden]', '[hidden]', '[hidden]', 'tomsmith', '', '03', null]);

});

const CHECKOUT = [
  '- heading "Checkout" [level=1]',
  '- textbox "Email" [e4]',
  '- textbox "Full name" [e5]',
  '- button "Calendar"',
  '- button "Pay" [e3]',
  '- iframe "link":',
  '  - textbox "Email": zq-link@mail.example',
  '  - textbox "Full name"',
  '  - checkbox "Save my information for faster checkout" [e6] [checked]',
  '- iframe "js.stripe.com":',
  '  - textbox "Card number" [e7]',
  '  - textbox "Expiration" [e8]',
  '  - textbox "CVC" [e9]',
].join('\n');

test('relabel gives each box in a frame page its place in camofox\'s order, and skips what camofox skips', () => {
  assert.equal(relabel(CHECKOUT, 9), [
    '- heading "Checkout" [level=1]',
    '- textbox "Email" [e1]',
    '- textbox "Full name" [e2]',
    '- button "Calendar"',
    '- button "Pay" [e3]',
    '- iframe "link":',
    '  - textbox "Email" [e4]: zq-link@mail.example',
    '  - textbox "Full name" [e5]',
    '  - checkbox "Save my information for faster checkout" [e6] [checked]',
    '- iframe "js.stripe.com":',
    '  - textbox "Card number" [e7]',
    '  - textbox "Expiration" [e8]',
    '  - textbox "CVC" [e9]',
  ].join('\n'));
  const dates = '- textbox "Date"\n- button "Open datepicker"\n- textbox "Name" [e1]\n- iframe "pay":\n  - textbox "Name"\n  - link [e3]';
  assert.equal(relabel(dates, 3), '- textbox "Date"\n- button "Open datepicker"\n- textbox "Name" [e1]\n- iframe "pay":\n  - textbox "Name" [e2]\n  - link [e3]', 'an unnamed link counts');
});

test('relabel leaves a page with no frame block byte for byte, and a bare iframe line is no block', () => {
  for (const page of ['- textbox "Email" [e1]\n- textbox "Email" [e2]\n', '- iframe\n- button "Go" [e1]', '- iframe "pay":\n- button "Go" [e1]', '- textbox "Date"\n- link [e1]\n- textbox "Name"\n- button "Go" [e3]', '']) assert.equal(relabel(page, 99), page);
});

test('relabel drops a main-page mark that isn\'t the line\'s place, as when a frame went missing from the second read', () => {
  const page = '- heading "Checkout" [level=1]\n- textbox "Email" [e4]\n- textbox "Full name" [e2]\n- button "Pay" [e3]';
  assert.equal(relabel(page, 6), `- heading "Checkout" [level=1]\n- textbox "Email"\n- textbox "Full name" [e2]\n- button "Pay" [e3]\n${NO_REF_NOTE}`);
  assert.equal(relabel(page, null), page, 'a windowed read is left to the frame-page rule');
  const framed = '- textbox "Email" [e4]\n- textbox "Phone" [e5]\n- iframe "card":\n  - textbox "Card number" [e3]';
  assert.equal(relabel(framed, 5), `- textbox "Email"\n- textbox "Phone"\n- iframe "card":\n  - textbox "Card number" [e3]\n${NO_REF_NOTE}`, 'a frame page\'s main marks are checked too');
});

test('relabel keeps camofox\'s marks when the counts disagree, drops those shared across blocks, and says so', () => {
  const expected = [
    '- heading "Checkout" [level=1]',
    '- textbox "Email"',
    '- textbox "Full name"',
    '- button "Calendar"',
    '- button "Pay" [e3]',
    '- iframe "link":',
    '  - textbox "Email": zq-link@mail.example',
    '  - textbox "Full name"',
    '  - checkbox "Save my information for faster checkout" [e6] [checked]',
    '- iframe "js.stripe.com":',
    '  - textbox "Card number" [e7]',
    '  - textbox "Expiration" [e8]',
    '  - textbox "CVC" [e9]',
    NO_REF_NOTE,
  ].join('\n');
  for (const count of [8, 10, null, undefined]) assert.equal(relabel(CHECKOUT, count), expected, String(count));
  const big = ['- iframe "pay":', ...Array.from({ length: 501 }, (_, index) => `  - button "B${index}" [e${index + 1}]`)].join('\n');
  assert.equal(relabel(big, 501), `${big}\n${NO_REF_NOTE}`, 'past 500, camofox stopped numbering');
});

test('boxesIn reads each tick box, radio, and switch with its state; boxChanged says when a click took', () => {
  const page = '- checkbox "A" [e1]\n- checkbox "B" [e2] [checked]\n- radio "C" [e3] [checked=mixed]\n- switch [e4]\n- button "D" [e5]\n- checkbox "E"';
  assert.deepEqual(boxesIn(page), { e1: ['checkbox', 'A', false], e2: ['checkbox', 'B', true], e3: ['radio', 'C', 'mixed'], e4: ['switch', '', false] });
  assert.equal(boxChanged(['checkbox', 'A', false], ['checkbox', 'A', true]), true);
  assert.equal(boxChanged(['checkbox', 'A', true], ['checkbox', 'A', true]), false);
  assert.equal(boxChanged(['radio', 'C', true], ['radio', 'C', true]), true, 'a picked radio stays picked');
  assert.equal(boxChanged(['radio', 'C', false], ['radio', 'C', false]), false);
  assert.equal(boxChanged(['checkbox', 'A', false], null), true, 'the box went: the click did something');
  assert.equal(boxChanged(['checkbox', 'A', false], ['button', 'A', false]), true, 'another thing holds the ref now');
  assert.equal(boxChanged(['checkbox', 'A', false], ['checkbox', 'Save my information', false]), true, 'another box of the same role holds the ref now');
});

test('boxAt reads a native or ARIA tick box, and nothing else', () => {
  const checks = ['checkbox', 'radio', 'switch', 'menuitemcheckbox'];
  const doc = (...found) => ({ querySelectorAll: selector => { if (selector === 'bad') throw new SyntaxError('bad'); return found; } });
  const el = (fields, attributes = {}) => ({ ...fields, getAttribute: name => attributes[name] ?? null });
  assert.deepEqual(boxAt(doc(el({ tagName: 'INPUT', type: 'checkbox', checked: true })), '#a', checks), ['checkbox', '', true]);
  assert.deepEqual(boxAt(doc(el({ tagName: 'INPUT', type: 'radio', checked: false })), '#a', checks), ['radio', '', false]);
  assert.deepEqual(boxAt(doc(el({ tagName: 'INPUT', type: 'checkbox', checked: true }, { role: 'switch' })), '#a', checks), ['switch', '', true]);
  assert.deepEqual(boxAt(doc(el({ tagName: 'DIV' }, { role: 'checkbox', 'aria-checked': 'true' })), '#a', checks), ['checkbox', '', true]);
  assert.deepEqual(boxAt(doc(el({ tagName: 'DIV' }, { role: 'menuitemcheckbox', 'aria-checked': 'mixed' })), '#a', checks), ['menuitemcheckbox', '', 'mixed']);
  assert.deepEqual(boxAt(doc(el({ tagName: 'DIV' }, { role: 'switch' })), '#a', checks), ['switch', '', false]);
  assert.equal(boxAt(doc(el({ tagName: 'BUTTON', type: 'submit' })), '#a', checks), null);
  assert.equal(boxAt(doc(), '#a', checks), null);
  assert.equal(boxAt(doc(), 'bad', checks), null, 'a selector the page can\'t parse');
});

test('boxAt reads the match camofox\'s click and focus both take, and nothing when they differ', () => {
  const checks = ['checkbox'];
  const doc = (...found) => ({ querySelectorAll: () => found, defaultView: { getComputedStyle: element => ({ visibility: element.shown === false ? 'hidden' : 'visible' }) } });
  const box = (checked, { size = 20, shown } = {}) => ({ tagName: 'INPUT', type: 'checkbox', checked, shown, getAttribute: () => null, getBoundingClientRect: () => ({ width: size, height: size }) });
  assert.deepEqual(boxAt(doc(box(false, { size: 0 }), box(true)), '.agree', checks), null, 'a hidden copy first: the click takes the second, focus the first');
  assert.deepEqual(boxAt(doc(box(false, { shown: false }), box(true)), '.agree', checks), null, 'visibility: hidden first');
  assert.deepEqual(boxAt(doc(box(true), box(false, { size: 0 })), '.agree', checks), ['checkbox', '', true], 'the visible one first');
  assert.deepEqual(boxAt(doc(box(false), box(true)), '.agree', checks), ['checkbox', '', false], 'two visible: the first');
  assert.deepEqual(boxAt(doc(box(false, { size: 0 }), box(true, { size: 0 })), '.agree', checks), ['checkbox', '', false], 'none visible: the first');
  assert.deepEqual(boxAt(doc(box(false, { size: 0 }), box(true)), '.agree, #x', checks), ['checkbox', '', false], 'a selector list stays as given');
});

test('a filled card box in a payment frame stays hidden under its renumbered ref', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP);
  f.camofox.set('snapshot', CHECKOUT.replace('"Card number" [e7]', '"Card number" [e7]: 4242 4242 4242 4242').replace('"CVC" [e9]', '"CVC" [e9]: "123"'));
  f.camofox.set('refs-count', '9');
  const out = ok(f, 'snapshot');
  assert.match(out, /^ {2}- textbox "Card number" \[e7\]: \[hidden\]$/m, 'a cross-site frame, hidden by its name');
  assert.match(out, /^ {2}- textbox "CVC" \[e9\]: \[hidden\]$/m);
  assert.match(out, /^ {2}- textbox "Email" \[e4\]: zq-link@mail\.example$/m, 'other frame boxes read as given');
  assert.ok(!/4242|123/.test(out));
  assert.equal(ok(f, 'get', 'value', 'e7'), '[hidden]\n');
});

test('snapshot prints a frame page\'s renumbered refs, and get value reads the frame box by its own ref', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP);
  f.camofox.set('snapshot', CHECKOUT);
  f.camofox.set('refs-count', '9');
  const out = ok(f, 'snapshot');
  assert.match(out, /^- textbox "Email" \[e1\]$/m);
  assert.match(out, /^ {2}- textbox "Email" \[e4\]: zq-link@mail\.example$/m);
  assert.equal(ok(f, 'get', 'value', 'e4'), 'zq-link@mail.example\n');
  assert.equal(ok(f, 'get', 'value', 'e1'), '\n', 'the page\'s own Email is empty');
  f.camofox.set('refs-count', '7');
  const unsure = ok(f, 'snapshot');
  assert.match(unsure, /^- textbox "Email"$/m);
  assert.ok(unsure.endsWith(`${NO_REF_NOTE}\n`));
});

/** Opens the shop with a tick box at e3 (also `#agree`) and a button at e2, read once so the tab file knows them. */
function boxPage(t) {
  const f = fixture(t);
  ok(f, 'open', SHOP);
  f.camofox.set('box', 'e3');
  f.camofox.set('snapshot', '- link "Shop" [e1]\n- button "Pay" [e2]\n- checkbox "I understand" [e3]{ticked}');
  ok(f, 'snapshot');
  return f;
}

test('a tick box that ticks on click takes one click and one read; a button takes the click alone', t => {
  const f = boxPage(t);
  let before = f.camofox.calls().length;
  assert.equal(ok(f, 'click', 'e3'), 'BROWSE_DONE=click\n');
  // A reading is the page text and one read of its secret values.
  assert.deepEqual(f.camofox.calls().slice(before), ['POST /tabs/:tab/click', 'GET /tabs/:tab/snapshot', 'POST /tabs/:tab/evaluate']);
  assert.equal(f.camofox.tabs()[0].ticked, true);
  assert.equal(ok(f, 'click', 'e3'), 'BROWSE_DONE=click\n', 'unticking is a change too');
  assert.equal(f.camofox.tabs()[0].ticked, false);
  before = f.camofox.calls().length;
  ok(f, 'click', 'e2');
  assert.deepEqual(f.camofox.calls().slice(before), ['POST /tabs/:tab/click']);
  before = f.camofox.calls().length;
  ok(f, 'click', '#agree');
  assert.deepEqual(f.camofox.calls().slice(before), ['POST /tabs/:tab/evaluate', 'POST /tabs/:tab/click', 'POST /tabs/:tab/evaluate'], 'a selector reads before and after');
  assert.equal(f.camofox.tabs()[0].ticked, true);
});

test('a tick box that ignores the click but takes Space ends ticked, by ref or selector', t => {
  const f = boxPage(t);
  f.camofox.set('box-ignores-click');
  let before = f.camofox.requests().length;
  assert.equal(ok(f, 'click', 'e3'), 'BROWSE_DONE=click\n');
  const sent = f.camofox.requests().slice(before);
  assert.deepEqual(sent.map(({ method, path }) => `${method} ${path.replace(/\/tabs\/[^/]+/, '/tabs/:tab')}`), ['POST /tabs/:tab/click', 'GET /tabs/:tab/snapshot', 'POST /tabs/:tab/evaluate', 'POST /tabs/:tab/type', 'POST /tabs/:tab/press', 'GET /tabs/:tab/snapshot', 'POST /tabs/:tab/evaluate']);
  assert.deepEqual([sent[3].body, sent[4].body], [{ userId: 'me', ref: 'e3', text: '', mode: 'keyboard' }, { userId: 'me', key: 'Space' }]);
  assert.equal(f.camofox.tabs()[0].ticked, true);

  before = f.camofox.calls().length;
  assert.equal(ok(f, 'click', '#agree'), 'BROWSE_DONE=click\n');
  assert.deepEqual(f.camofox.calls().slice(before), ['POST /tabs/:tab/evaluate', 'POST /tabs/:tab/click', 'POST /tabs/:tab/evaluate', 'POST /tabs/:tab/type', 'POST /tabs/:tab/press', 'POST /tabs/:tab/evaluate']);
  assert.equal(f.camofox.tabs()[0].ticked, false);
});

test('a tick box nothing ticks says the box did not change, by ref or selector', t => {
  const f = boxPage(t);
  f.camofox.set('box-ignores-click');
  f.camofox.set('box-ignores-space');
  for (const target of ['e3', '#agree']) {
    const out = f.run('click', target);
    assert.equal(out.status, 1, target);
    assert.equal(out.stdout, 'BROWSE_ERROR=the box did not change\n', target);
  }
});

test('a ref that names another box after the click is not pressed: camofox renumbered', t => {
  const f = boxPage(t);
  f.camofox.set('box-ignores-click');
  f.camofox.set('click-snapshot', '- link "Shop" [e1]\n- button "Pay" [e2]\n- checkbox "Save my information" [e3]');
  const before = f.camofox.calls().length;
  assert.equal(ok(f, 'click', 'e3'), 'BROWSE_DONE=click\n');
  assert.deepEqual(f.camofox.calls().slice(before), ['POST /tabs/:tab/click', 'GET /tabs/:tab/snapshot', 'POST /tabs/:tab/evaluate'], 'no type, no Space');
});

test('a tab file from before tick boxes were kept, or a page opened since, clicks as before', t => {
  const f = boxPage(t);
  f.camofox.set('box-ignores-click');
  const tabFile = join(f.camofox.install, 'tabs', `${basename(f.home)}.json`);
  const { refs, ...old } = JSON.parse(readFileSync(tabFile, 'utf8'));
  assert.deepEqual(refs, { e3: ['checkbox', 'I understand', false] });
  writeFileSync(tabFile, JSON.stringify(old));
  let before = f.camofox.calls().length;
  ok(f, 'click', 'e3');
  assert.deepEqual(f.camofox.calls().slice(before), ['POST /tabs/:tab/click']);

  ok(f, 'snapshot');
  ok(f, 'open', ACCOUNT);
  assert.equal(JSON.parse(readFileSync(tabFile, 'utf8')).refs, undefined, 'the last page\'s boxes are gone');
  before = f.camofox.calls().length;
  ok(f, 'click', 'e3');
  assert.deepEqual(f.camofox.calls().slice(before), ['POST /tabs/:tab/click']);
});

// A shop page whose sign-in box is a frame from the login site, as camofox prints it: after the footer.
const FRAMED = [
  '- navigation "Main":',
  '  - link "Home" [e1]',
  '- main:',
  '  - iframe',
  '- contentinfo:',
  '  - link "Privacy" [e2]',
  '- iframe "auth-widget":',
  '  - textbox "Email" [e3]',
  '  - button "Continue" [e4]',
].join('\n');
const AUTH_FRAME = ['auth-widget', 'https://login.example.com/start?x=1'];
const framed = (frames = [AUTH_FRAME], raw = FRAMED) => labelFrames(raw, frameSites(raw, frames));

test('a frame header names its site, and the first line says frame boxes are at the end', () => {
  const lines = framed().split('\n');
  assert.equal(lines[0], '- note: boxes in frames are at the end: auth-widget (login.example.com)');
  assert.ok(lines.includes('- iframe "auth-widget" (login.example.com):'));
  assert.ok(lines.includes('  - iframe'), 'the bare main-page iframe line stays');
});

test('a frame labelled by its hostname gets that host; an unknown label reads as unknown site', () => {
  const raw = '- button "Pay" [e1]\n- iframe "js.pay.example":\n  - textbox "Card number" [e2]\n- iframe "mystery":\n  - textbox "Code" [e3]';
  const text = labelFrames(raw, frameSites(raw, [['', 'https://js.pay.example/v3/elements'], ['other', 'https://x.example/']]));
  assert.match(text, /^- iframe "js.pay.example" \(js.pay.example\):$/m);
  assert.match(text, /^- iframe "mystery" \(unknown site\):$/m);
  assert.equal(text.split('\n')[0], '- note: boxes in frames are at the end: js.pay.example (js.pay.example), mystery (unknown site)');
});

test('two same-named frames on different hosts read as unknown site; a frame named by its id gets its src host', () => {
  assert.match(framed([AUTH_FRAME, ['auth-widget', 'https://evil.example/signin']]), /^- iframe "auth-widget" \(unknown site\):$/m);
  // FRAMES_SCRIPT gives an iframe with no name its id, as camofox labels it.
  const frame = new JSDOM('<iframe id="auth-frame" src="https://login.example.com/start"></iframe>', { runScripts: 'outside-only', url: 'https://shop.example.com/' }).window;
  const frames = frame.eval(FRAMES_SCRIPT);
  assert.deepEqual([...frames].map(pair => [...pair]), [['auth-frame', 'https://login.example.com/start']]);
  const raw = '- button "Next" [e1]\n- iframe "auth-frame":\n  - textbox "Email" [e2]';
  assert.match(labelFrames(raw, frameSites(raw, frames)), /^- iframe "auth-frame" \(login\.example\.com\):$/m);
});

test('a page with no frame boxes gets no note', () => {
  const plainPage = '- textbox "Email" [e1]\n- button "Go" [e2]';
  assert.equal(framed([], plainPage), plainPage);
  assert.ok(!framed([['ads', 'https://ads.example/']], '- button "Go" [e1]\n- iframe "ads":\n  - text: hello').startsWith('- note'));
});

test('a selector the page can not read says to use the box\'s ref, not a code error', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP);
  for (const args of [['get', 'count', 'iframe >> input'], ['get', 'value', 'iframe >> input']]) {
    const out = f.run(...args);
    assert.equal(out.status, 1, args.join(' '));
    assert.equal(out.stdout, 'BROWSE_ERROR=iframe >> input is not a selector this page can read; a selector reads only the main page, so use the box\'s ref\n');
  }
  assert.equal(ok(f, 'get', 'count', 'input'), '1\n', 'a selector the page reads counts as before');
  assert.equal(selectorError('#x').message.endsWith('use the box\'s ref'), true);
  const broken = { querySelectorAll: () => { throw new TypeError('broken page'); } };
  assert.throws(() => new Function('document', `return ${countScript('#x')}`)(broken), TypeError, 'only a selector error becomes the plain stop');
});

test('each ref names its box by role and name; page text holding a ref is no box', () => {
  const page = ['- button "Accept" [e1]', '- textbox "Card number" [e2]: [hidden]', '- link [e3]', '- text: see [e4]'].join('\n');
  assert.deepEqual(refNames(page), { e1: ['button', 'Accept'], e2: ['textbox', 'Card number'], e3: ['link', ''] });
});

test('a click says BROWSE_CLICK=script only when the page\'s own script took it', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP);
  for (const via of ['mouse', 'forced']) {
    f.camofox.set('click-via', via);
    assert.equal(ok(f, 'click', '#continue'), 'BROWSE_DONE=click\n', via);
  }
  f.camofox.set('click-via', 'script');
  const out = f.run('click', '#continue');
  assert.equal(out.status, 0, out.stdout + out.stderr);
  assert.equal(out.stdout, 'BROWSE_CLICK=script\nBROWSE_DONE=click\n');
  assert.match(out.stderr, /live view that stays open/);
});

test('a snapshot keeps each ref\'s box in the tab file, and a new page drops them', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP, '--session', 'names');
  const names = () => JSON.parse(readFileSync(join(f.home, '.wong-stack/camoufox/tabs/names.json'), 'utf8')).names;
  ok(f, 'snapshot', '--session', 'names');
  assert.deepEqual(names(), { e1: ['textbox', 'Name'], e2: ['button', 'Go'] });
  ok(f, 'open', ACCOUNT, '--session', 'names');
  assert.equal(names(), undefined);
});

test("status names each added add-on, and a password manager's refusal of a step reaches the agent as the server gives it", t => {
  const f = fixture(t);
  writeFileSync(join(f.camofox.install, 'addons.json'), JSON.stringify({ added: [{ guid: 'pm@maker.example', name: 'PM' }, { guid: 'blocker@maker.example', name: 'Blocker' }] }));
  assert.match(ok(f, 'status'), /\nBROWSE_ADDON=PM\nBROWSE_ADDON=Blocker\n$/);
  writeFileSync(join(f.camofox.install, 'addons.json'), JSON.stringify({ added: [] }));
  assert.doesNotMatch(ok(f, 'status'), /BROWSE_ADDON/, 'none added, no line');
  ok(f, 'open', SHOP);
  f.camofox.set('click-refused', "that is the password manager's own; the person uses it in the live view");
  const out = f.run('click', '#pm-menu');
  assert.equal(out.status, 1);
  assert.equal(out.stdout, "BROWSE_ERROR=that is the password manager's own; the person uses it in the live view\n");
});

test('no password manager question: install, status and a task\'s first open print no offer, and asked and decline are gone', t => {
  const f = fixture(t);
  assert.equal(ok(f, 'open', SHOP), `BROWSE_URL=${SHOP}\n`);
  assert.doesNotMatch(ok(f, 'status'), /BROWSE_ADDON/);
  assert.ok(!existsSync(join(f.camofox.install, 'addons.json')), 'nothing is saved');
  for (const verb of ['asked', 'decline']) {
    const out = f.run('addon', verb);
    assert.equal(out.status, 2, verb);
    assert.match(out.stderr, /addon takes find, add, open, status, or remove/);
  }
  assert.doesNotMatch(f.run('--help').stdout, /asked|decline/);
});

test('front brings this task\'s tab to the front, and says so when the person is using another tab', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP);
  assert.equal(ok(f, 'front'), 'BROWSE_FRONT=yes\n');
  assert.deepEqual(f.camofox.requests().at(-1).body, { userId: 'me' });
  f.camofox.set('front-refused');
  const out = f.run('front');
  assert.equal(out.status, 1);
  assert.equal(out.stdout, 'BROWSE_ERROR=the person is using the browser\n');
  assert.match(f.run('--help').stdout, /front .*bring this task's tab to the front/);
});

test('show brings this task\'s tab to the front with no turn, then says how the browser shows', t => {
  const f = fixture(t);
  ok(f, 'open', SHOP);
  assert.equal(ok(f, 'show'), 'BROWSE_SHOWN=none\n', 'the stand-in browser records no window');
  const { path, body } = f.camofox.requests().at(-1);
  assert.match(path, /\/front$/);
  assert.deepEqual(body, { userId: 'me' }, 'a plain front: no turn held');
  const record = join(f.camofox.install, 'server.json');
  writeFileSync(record, JSON.stringify({ ...JSON.parse(readFileSync(record, 'utf8')), window: true }));
  assert.equal(ok(f, 'show'), 'BROWSE_SHOWN=window\n');
  f.camofox.set('front-refused');
  assert.equal(f.run('show').stdout, 'BROWSE_ERROR=the person is using the browser\n', 'during another chat\'s turn the window already shows');
  assert.equal(f.run('show', 'now').status, 2, 'show takes no words');
  assert.match(f.run('--help').stdout, /show .*front, with no turn held, to show the person a page/);
});
