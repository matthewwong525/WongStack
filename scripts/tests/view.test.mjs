import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { connect, createServer as createTcpServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fakeViewer, fakeViewTools, GREETING, SCREEN } from './fixtures/fake-view-tools.mjs';

// view.mjs finds the browser through browse.mjs, which fixes its folder under the home folder when it
// loads. HOME points at an empty folder first, so no test here reads the real one.
const HOME = mkdtempSync(join(tmpdir(), 'wong-test-view-home-'));
process.env.HOME = HOME;
test.after(() => rmSync(HOME, { recursive: true, force: true }));
const { checkView, endView, findTool, fingerprint, installView, listensOnTcp, liveView, MANUAL, OFF_LINUX, screenOf, socketOf, startSource, stopSource, TOOLS, VIEWER, viewerDir, viewerFile, viewRoutes } = await import('../../.agents/skills/hand-over/scripts/view.mjs');

// The checks that read the real /proc run where a live view does.
const linux = { skip: process.platform !== 'linux' && 'a live view runs on Linux only' };
const APT = ['install', '-y', '--no-install-recommends', 'x11vnc', 'xdotool'];
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
const pause = ms => new Promise(done => setTimeout(done, ms));
const sha = data => createHash('sha256').update(data).digest('hex');

/** Writes `files`, a map of path to text, under `dir`. */
function tree(dir, files) {
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), text);
  }
  return dir;
}

// A home folder of its own and fake tools this process's own calls find, as hand-over.mjs's do.
// `set` and `unset` write the fakes' control files (fake-view-tools.mjs lists them).
function setup(t) {
  const home = mkdtempSync(join(tmpdir(), 'wong-test-view-'));
  const control = join(home, 'control');
  const tools = fakeViewTools(home, control);
  Object.assign(process.env, tools.env());
  t.after(() => rmSync(home, { recursive: true, force: true }));
  return {
    home,
    tools,
    env: (...missing) => ({ PATH: '', ...tools.env(...missing) }),
    set: (name, value = '') => writeFileSync(join(control, name), typeof value === 'string' ? value : JSON.stringify(value)),
    unset: name => rmSync(join(control, name), { force: true }),
  };
}

// ---------------------------------------------------------------------------
// What a view needs

test('checkView says unsupported off Linux, and names each missing tool', t => {
  const f = setup(t);
  for (const platform of ['darwin', 'win32']) assert.deepEqual(checkView({ platform, env: f.env(), home: f.home }), { unsupported: OFF_LINUX, missing: [] });
  assert.deepEqual(checkView({ platform: 'linux', env: f.env('x11vnc', 'xdotool'), home: f.home }), { missing: ['x11vnc', 'xdotool', 'novnc'] });
  assert.deepEqual(checkView({ platform: 'linux', env: f.env(), home: f.home }), { missing: ['novnc'] });
  fakeViewer(f.home, VIEWER.version);
  for (const name of ['x11vnc', 'xdotool']) assert.deepEqual(checkView({ platform: 'linux', env: f.env(name), home: f.home }), { missing: [name] });
  assert.deepEqual(checkView({ platform: 'linux', env: f.env(), home: f.home }), { missing: [] }, 'all present');
  fakeViewer(f.home, '0.0.1');
  rmSync(viewerDir(f.home), { recursive: true });
  assert.deepEqual(checkView({ platform: 'linux', env: f.env(), home: f.home }), { missing: ['novnc'] }, 'another version is not the pinned one');
  assert.deepEqual(Object.keys(TOOLS), ['x11vnc', 'xdotool', 'novnc']);
  for (const name of ['x11vnc', 'xdotool']) assert.match(TOOLS[name], /needs admin rights/);
  assert.match(TOOLS.novnc, /home folder/);
});

test('findTool takes the file a test names, else the first on PATH', t => {
  const f = setup(t);
  const real = join(f.tools.dir, 'x11vnc');
  assert.equal(findTool('x11vnc', { PATH: `/no/such/folder:${f.tools.dir}` }), real);
  assert.equal(findTool('x11vnc', { PATH: '' }), null);
  assert.equal(findTool('x11vnc', {}), null);
  assert.equal(findTool('apt-get', { PATH: '', HANDOVER_APT_GET_BIN: join(f.tools.dir, 'apt-get') }), join(f.tools.dir, 'apt-get'));
  assert.equal(findTool('x11vnc', { PATH: f.tools.dir, HANDOVER_X11VNC_BIN: join(f.home, 'absent') }), null, 'a named file that is absent is not looked for elsewhere');
  writeFileSync(join(f.home, 'plain'), 'not a program');
  assert.equal(findTool('x11vnc', { HANDOVER_X11VNC_BIN: join(f.home, 'plain') }), null, 'a file that can not run is no tool');
});

// ---------------------------------------------------------------------------
// The install

const RELEASE = {
  'core/rfb.js': 'export default class RFB {}\n',
  'core/util/int.js': 'export const int = 1;\n',
  'vendor/pako/lib/zlib/inflate.js': 'export const inflate = 1;\n',
  'vendor/pako/LICENSE': 'pako licence\n',
  'LICENSE.txt': 'licence\n',
  'README.md': 'not kept\n',
  'app/ui.js': 'export const panel = 1;\n',
};

// A source release as GitHub packs it, one top folder named for the version, served from this
// computer. `change` edits the unpacked files after the fingerprint is taken, as a tampered download.
async function release(t, { version = '9.9.9', change = () => {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-view-release-'));
  const top = tree(join(root, `noVNC-${version}`), RELEASE);
  const sha256 = fingerprint(top);
  change(top);
  assert.equal(spawnSync('tar', ['-czf', join(root, 'release.tar.gz'), '-C', root, `noVNC-${version}`]).status, 0);
  let downloads = 0;
  const server = createServer((request, response) => {
    downloads++;
    if (request.url !== '/release.tar.gz') return response.writeHead(404).end();
    response.writeHead(200).end(readFileSync(join(root, 'release.tar.gz')));
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => {
    server.close();
    rmSync(root, { recursive: true, force: true });
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  return { viewer: { version, url: `${origin}/release.tar.gz`, sha256 }, origin, downloads: () => downloads };
}

/** An environment whose two system tools are absent until the fake apt-get creates them. */
function toolless(f) {
  const made = ['x11vnc', 'xdotool'].map(name => join(f.home, `installed-${name}`));
  f.set('apt-creates.json', made);
  return { ...f.env(), HANDOVER_X11VNC_BIN: made[0], HANDOVER_XDOTOOL_BIN: made[1] };
}

test('the fingerprint is the SHA-256 of a sha256sum line per file under core/ and vendor/, sorted by path as bytes', t => {
  const f = setup(t);
  const dir = tree(join(f.home, 'files'), { 'core/b.js': 'b', 'core/a/z.js': 'z', 'vendor/pako/lib/x.js': 'x', 'vendor/pako/LICENSE': 'l', 'LICENSE.txt': 'top', 'app/ui.js': 'ui' });
  const lines = [['core/a/z.js', 'z'], ['core/b.js', 'b'], ['vendor/pako/LICENSE', 'l'], ['vendor/pako/lib/x.js', 'x']].map(([path, text]) => `${sha(text)}  ${path}\n`);
  assert.equal(fingerprint(dir), sha(lines.join('')), 'a capital sorts before a small letter, as bytes do');
  writeFileSync(join(dir, 'LICENSE.txt'), 'changed');
  writeFileSync(join(dir, 'app/ui.js'), 'changed');
  assert.equal(fingerprint(dir), sha(lines.join('')), 'only the two folders count');
  writeFileSync(join(dir, 'core/b.js'), 'B');
  assert.notEqual(fingerprint(dir), sha(lines.join('')));
  symlinkSync('/etc/hostname', join(dir, 'core/link.js'));
  assert.equal(fingerprint(dir), null, 'a link is not a plain file');
  assert.equal(fingerprint(join(f.home, 'absent')), null);
  assert.match(VIEWER.sha256, /^[0-9a-f]{64}$/);
  assert.equal(VIEWER.url, `https://github.com/novnc/noVNC/archive/refs/tags/v${VIEWER.version}.tar.gz`);
});

test('install: a good archive installs only the viewer\'s two folders and its licence, then the two system tools', async t => {
  const f = setup(t);
  const { viewer, downloads } = await release(t);
  assert.equal(await installView({ platform: 'linux', env: toolless(f), home: f.home, uid: 0, viewer }), 'installed');
  const dir = viewerDir(f.home, viewer);
  assert.equal(dir, join(f.home, '.wong-stack/live-view/novnc-9.9.9'));
  assert.deepEqual(readdirSync(dir).sort(), ['LICENSE.txt', 'core', 'vendor']);
  assert.equal(readFileSync(join(dir, 'core/util/int.js'), 'utf8'), RELEASE['core/util/int.js']);
  assert.equal(fingerprint(dir), viewer.sha256);
  assert.deepEqual(readdirSync(dirname(dir)), ['novnc-9.9.9'], 'no download is left beside it');
  assert.equal(statSync(dirname(dir)).mode & 0o777, 0o700);
  assert.deepEqual(f.tools.calls('apt-get'), [APT]);
  assert.deepEqual(f.tools.calls('sudo'), [], 'root needs no sudo');
  assert.equal(downloads(), 1);

  assert.equal(await installView({ platform: 'linux', env: toolless(f), home: f.home, uid: 0, viewer }), 'installed');
  assert.equal(downloads(), 1, 'a second run finds everything there');
  assert.equal(f.tools.calls('apt-get').length, 1);
});

test('install: without root, apt-get runs through sudo -n', async t => {
  const f = setup(t);
  const { viewer } = await release(t);
  assert.equal(await installView({ platform: 'linux', env: toolless(f), home: f.home, uid: 1000, viewer }), 'installed');
  assert.deepEqual(f.tools.calls('sudo'), [['-n', 'true'], ['-n', join(f.tools.dir, 'apt-get'), ...APT]]);
  assert.deepEqual(f.tools.calls('apt-get'), [APT]);
});

test('install: a changed file installs nothing', async t => {
  const f = setup(t);
  const { viewer, downloads } = await release(t, { change: top => writeFileSync(join(top, 'core/util/int.js'), 'export const int = 2;\n') });
  await assert.rejects(installView({ platform: 'linux', env: toolless(f), home: f.home, uid: 0, viewer }), new RegExp(`not the ones WongStack tried: their fingerprint is [0-9a-f]{64}, not ${viewer.sha256}\\. Nothing was installed`));
  assert.equal(downloads(), 1);
  assert.deepEqual(readdirSync(join(f.home, '.wong-stack/live-view')), [], 'neither the viewer nor its download is kept');
  assert.deepEqual(f.tools.calls('apt-get'), [], 'and the system tools are not installed either');

  const linked = await release(t, { change: top => symlinkSync('/etc/hostname', join(top, 'core/link.js')) });
  await assert.rejects(installView({ platform: 'linux', env: toolless(f), home: f.home, uid: 0, viewer: linked.viewer }), /Nothing was installed/);
  const partial = await release(t, { change: top => rmSync(join(top, 'vendor'), { recursive: true }) });
  await assert.rejects(installView({ platform: 'linux', env: toolless(f), home: f.home, uid: 0, viewer: partial.viewer }), /Nothing was installed/);
  const gone = await release(t);
  await assert.rejects(installView({ platform: 'linux', env: toolless(f), home: f.home, uid: 0, viewer: { ...gone.viewer, url: `${gone.origin}/moved.tar.gz` } }), /could not be downloaded from http:\/\/127\.0\.0\.1:\d+\/moved\.tar\.gz/);
  assert.deepEqual(readdirSync(join(f.home, '.wong-stack/live-view')), []);
  assert.deepEqual(f.tools.calls('apt-get'), []);
});

test('install: where apt-get can not run without a password, nothing is installed and the result is manual', async t => {
  const f = setup(t);
  const { viewer, downloads } = await release(t);
  f.set('sudo-asks');
  assert.equal(await installView({ platform: 'linux', env: toolless(f), home: f.home, uid: 1000, viewer }), 'manual', 'a sudo that wants a password');
  assert.deepEqual(f.tools.calls('sudo'), [['-n', 'true']]);
  f.unset('sudo-asks');
  assert.equal(await installView({ platform: 'linux', env: f.env('sudo', 'x11vnc'), home: f.home, uid: 1000, viewer }), 'manual', 'no sudo');
  assert.equal(await installView({ platform: 'linux', env: f.env('apt-get', 'x11vnc'), home: f.home, uid: 0, viewer }), 'manual', 'no apt-get');
  assert.equal(downloads(), 0, 'not even the viewer, which needs no admin rights');
  assert.ok(!existsSync(join(f.home, '.wong-stack')));
  assert.deepEqual(f.tools.calls('apt-get'), []);
  assert.equal(MANUAL, `sudo apt-get ${APT.join(' ')}`);

  assert.equal(await installView({ platform: 'linux', env: f.env('apt-get', 'sudo'), home: f.home, uid: 1000, viewer }), 'installed', 'the viewer alone needs neither');
  assert.equal(downloads(), 1);
  assert.equal(await installView({ platform: 'darwin', env: f.env(), home: f.home, viewer }), 'unsupported');
});

test('install: an apt-get that fails, or installs nothing, is an error', async t => {
  const f = setup(t);
  const { viewer } = await release(t);
  const env = toolless(f);
  f.set('apt-fails');
  await assert.rejects(installView({ platform: 'linux', env, home: f.home, uid: 0, viewer }), /apt-get did not install x11vnc and xdotool/);
  f.unset('apt-fails');
  f.set('apt-creates.json', []);
  await assert.rejects(installView({ platform: 'linux', env, home: f.home, uid: 0, viewer }), /still missing after the install: x11vnc, xdotool/);
});

// ---------------------------------------------------------------------------
// The screen and its source

/** A pretend /proc: each process as `pid: {name, parent, env, fds}`, and the kernel's socket tables. */
function procTree(t, processes, tables = {}) {
  const proc = mkdtempSync(join(tmpdir(), 'wong-test-view-proc-'));
  t.after(() => rmSync(proc, { recursive: true, force: true }));
  for (const [pid, { name, parent, env = {}, fds = {} }] of Object.entries(processes)) {
    tree(join(proc, pid), { stat: `${pid} (${name}) S ${parent} ${pid} ${pid} 0 -1 4194304`, environ: Object.entries(env).map(([key, value]) => `${key}=${value}\0`).join('') });
    mkdirSync(join(proc, pid, 'fd'));
    for (const [fd, target] of Object.entries(fds)) symlinkSync(target, join(proc, pid, 'fd', fd));
  }
  tree(proc, { 'self/stat': 'not a process', uptime: '1', ...Object.fromEntries(Object.entries(tables).map(([name, text]) => [`net/${name}`, text])) });
  return proc;
}

const UNIX = `Num       RefCount Protocol Flags    Type St Inode Path
0000000000000000: 00000002 00000000 00010000 0001 01 555 @/tmp/.X11-unix/X98
0000000000000000: 00000002 00000000 00010000 0001 01 556 /tmp/.X11-unix/X98
0000000000000000: 00000003 00000000 00000000 0001 03 557
0000000000000000: 00000002 00000000 00010000 0001 01 558 /run/user/0/bus
`;

test('the screen is the DISPLAY of the server\'s camoufox-bin child, not of its other children', t => {
  const proc = procTree(t, {
    40: { name: 'node', parent: 1, env: { DISPLAY: ':0' } },
    41: { name: 'Xvfb', parent: 40, env: { DISPLAY: ':0' } },
    42: { name: 'Web Content (x)', parent: 40, env: { DISPLAY: ':3' } },
    43: { name: 'camoufox-bin', parent: 40, env: { HOME: '/root', DISPLAY: ':97', LANG: 'C' } },
    44: { name: 'camoufox-bin', parent: 7, env: { DISPLAY: ':5' } },
  });
  assert.equal(screenOf(40, proc), ':97');
  assert.equal(screenOf(7, proc), ':5');
  assert.equal(screenOf(41, proc), null, 'a process with no children');
  assert.equal(screenOf(null, proc), null, 'no server');
});

test('with no DISPLAY to read, the screen is the X socket the server\'s Xvfb child holds', t => {
  const processes = {
    41: { name: 'Xvfb', parent: 40, fds: { 0: '/dev/null', 3: 'socket:[557]', 4: 'socket:[555]', 5: 'socket:[556]', 6: 'anon_inode:[eventpoll]' } },
    43: { name: 'camoufox-bin', parent: 40, env: { HOME: '/root' } },
  };
  assert.equal(screenOf(40, procTree(t, processes, { unix: UNIX })), ':98');
  assert.equal(screenOf(40, procTree(t, processes)), null, 'no socket table to read');
  assert.equal(screenOf(40, procTree(t, { 41: { name: 'Xvfb', parent: 40, fds: { 3: 'socket:[558]' } } }, { unix: UNIX })), null, 'a socket that is no X display');
  assert.equal(screenOf(40, procTree(t, { 43: processes[43] }, { unix: UNIX })), null, 'no Xvfb either');
});

const TCP = `  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode
   0: 0100007F:170C 00000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 777 1 0000000000000000 100 0 0 10 0
   1: 0100007F:9C40 0100007F:170C 01 00000000:00000000 00:00000000 00000000     0        0 778 1 0000000000000000 20 4 30 10 -1
`;
const TCP6 = `  sl  local_address                         remote_address                        st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode
   0: 00000000000000000000000000000000:170C 00000000000000000000000000000000:0000 0A 00000000:00000000 00:00000000 00000000     0        0 779 1 0000000000000000 100 0 0 10 0
`;

test('a process that holds a listening TCP socket is found, on either kind of address, and an unreadable list counts as one', t => {
  const holds = (...inodes) => ({ 9: { name: 'x11vnc', parent: 1, fds: Object.fromEntries(inodes.map((inode, index) => [index + 3, `socket:[${inode}]`])) } });
  assert.equal(listensOnTcp(9, procTree(t, holds(777), { tcp: TCP, tcp6: TCP6 })), true);
  assert.equal(listensOnTcp(9, procTree(t, holds(600, 779), { tcp: TCP, tcp6: TCP6 })), true, 'the port -rfbport 0 alone leaves open');
  assert.equal(listensOnTcp(9, procTree(t, holds(778, 555), { tcp: TCP, tcp6: TCP6 })), false, 'a connection is not a listener');
  assert.equal(listensOnTcp(9, procTree(t, holds(777), { tcp: TCP.replace(' 0A ', ' 01 ') })), false, 'a computer with no tcp6 table');
  assert.equal(listensOnTcp(9, procTree(t, holds(), { tcp: TCP })), false);
  assert.equal(listensOnTcp(10, procTree(t, holds(777), { tcp: TCP })), false, 'a process that is gone holds nothing');
  assert.equal(listensOnTcp(9, procTree(t, holds(600))), true, 'no list to read: nothing is taken as safe');
});

test('the real /proc shows this process\'s own listener', linux, async t => {
  assert.equal(listensOnTcp(process.pid), false);
  const server = createTcpServer();
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => server.close());
  assert.equal(listensOnTcp(process.pid), true);
});

/** The first bytes a Unix socket sends. */
const greeting = path => new Promise((done, failed) => {
  const socket = connect(path).on('error', failed).on('data', chunk => { socket.destroy(); done(chunk.toString()); });
});

test('the screen source serves a private socket with both network ports switched off, and stops clean', linux, async t => {
  const f = setup(t);
  const dir = mkdtempSync(join(f.home, 'screen-'));
  assert.equal(statSync(dir).mode & 0o777, 0o700);
  const source = await startSource(':97', dir);
  t.after(() => stopSource(source));
  assert.equal(source.dir, dir);
  assert.equal(source.sourcePid, f.tools.sourcePid());
  assert.deepEqual(f.tools.calls('x11vnc'), [['-display', ':97', '-unixsock', socketOf(dir), '-rfbport', '0', '-rfbportv6', '0', '-nopw', '-forever', '-shared', '-noxdamage', '-quiet']]);
  assert.equal(socketOf(dir), join(dir, 'screen.sock'));
  assert.equal(await greeting(socketOf(dir)), GREETING);
  await stopSource(source);
  assert.ok(!alive(source.sourcePid), 'the source is stopped');
  assert.ok(!existsSync(dir), 'and its folder removed');
});

test('a screen source that holds a network port is stopped and fails the start; so does one that never starts', linux, async t => {
  const f = setup(t);
  f.set('x11vnc-listens');
  const open = mkdtempSync(join(f.home, 'screen-'));
  await assert.rejects(startSource(':97', open), /opened a network port, so it was stopped and no link was opened/);
  assert.ok(!alive(f.tools.sourcePid()), 'it is not left running');
  assert.ok(!existsSync(open));
  f.unset('x11vnc-listens');

  f.set('x11vnc-fails');
  const failed = mkdtempSync(join(f.home, 'screen-'));
  await assert.rejects(startSource(':97', failed), /x11vnc, did not start/);
  assert.ok(!existsSync(failed));
  f.unset('x11vnc-fails');

  process.env.HANDOVER_X11VNC_BIN = join(f.home, 'absent');
  const absent = mkdtempSync(join(f.home, 'screen-'));
  await assert.rejects(startSource(':97', absent), /did not start/);
  assert.ok(!existsSync(absent));
  assert.equal(f.tools.calls('x11vnc').length, 2, 'a missing tool runs nothing in its place');
});

// ---------------------------------------------------------------------------
// Fit, front, and restore

/** A process that stands in for a running screen source, and a folder for it. */
function standIn(t, f) {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { detached: true, stdio: 'ignore' });
  t.after(() => { try { process.kill(child.pid, 'SIGKILL'); } catch { /* stopped */ } });
  return { sourcePid: child.pid, dir: mkdtempSync(join(f.home, 'screen-')) };
}

// The page as the watcher's client sees it, with the fake xdotool's windows kept in step: the page's
// own window first (id 100), then another task's page at camofox's usual size (id 101).
function fakePage(f, first = [2560, 1328]) {
  const page = {
    calls: [],
    now: first,
    fails: false,
    hidden: false,
    show() { f.set('tabs.json', page.hidden ? [] : [{ size: page.now }, { size: [2560, 1328] }]); },
    async resize(width, height) {
      page.calls.push([width, height]);
      if (page.fails) throw new Error('the browser refused the step');
      page.now = [width, height];
      page.show();
    },
  };
  page.show();
  return page;
}

const raised = f => f.tools.calls('xdotool').filter(args => args[0] === 'windowraise').map(args => args[1]);

test('the first fit reads the bar and fits wide; a phone gets a 480 strip of the same height; each raises the page\'s own window', async t => {
  const f = setup(t);
  const page = fakePage(f);
  const live = liveView({ size: [2560, 1328], display: ':97', ...standIn(t, f) }, page);
  assert.equal(live.describe(), null, 'no fit yet');
  live.front();
  assert.deepEqual(f.tools.calls('xdotool'), [], 'and nothing to raise');

  assert.deepEqual(await live.fit(), { kind: 'wide', width: 1280, screen: SCREEN });
  assert.deepEqual(page.calls, [[1280, 720], [1280, 663]], 'the page as tall as the screen, to read the 57-pixel bar; then the screen\'s height less the bar');
  const calls = f.tools.calls('xdotool');
  assert.deepEqual(calls[0], ['getdisplaygeometry']);
  assert.ok(calls.some(args => args.join(' ') === 'search --classname Navigator'));
  assert.ok(!calls.some(args => args.includes('--class')), '--class finds no browser window');
  assert.deepEqual(raised(f), ['100'], 'the window whose size equals the fit, never the other task\'s');
  assert.ok(f.tools.calls('xdotool', { display: true }).every(display => display === ':97'), 'every call is on the browser\'s screen');

  assert.deepEqual(await live.fit('phone'), { kind: 'phone', width: 480, screen: SCREEN });
  assert.deepEqual(page.calls.at(-1), [480, 663]);
  assert.deepEqual(await live.fit(), { kind: 'phone', width: 480, screen: SCREEN }, 'a fit with no shape keeps the last');
  assert.deepEqual(page.calls.slice(2), [[480, 663], [480, 663]], 'the keep-alive: the same size again, and no second reading of the bar');
  assert.deepEqual(live.describe(), { kind: 'phone', width: 480, screen: SCREEN });
  assert.equal(f.tools.calls('xdotool').filter(args => args[0] === 'getdisplaygeometry').length, 1);
  assert.deepEqual(raised(f), ['100', '100', '100']);

  live.front();
  assert.deepEqual(raised(f), ['100', '100', '100', '100']);
  page.now = [2560, 1328];
  page.show();
  live.front();
  assert.equal(raised(f).length, 4, 'a page that was opened afresh is not the fit\'s size: nothing is raised until it is fitted again');
  assert.deepEqual(await live.fit('wide'), { kind: 'wide', width: 1280, screen: SCREEN });
  assert.deepEqual(raised(f).at(-1), '100');
});

test('fits take turns, and a failed one does not stop the next', async t => {
  const f = setup(t);
  const page = fakePage(f);
  const live = liveView({ size: [2560, 1328], display: ':97', ...standIn(t, f) }, page);
  f.set('xdotool-fails');
  await assert.rejects(live.fit(), /xdotool getdisplaygeometry failed/);
  assert.deepEqual(page.calls, []);
  f.unset('xdotool-fails');
  const [first, second] = await Promise.all([live.fit('phone'), live.fit('wide')]);
  assert.deepEqual([first.kind, second.kind], ['phone', 'wide']);
  assert.deepEqual(page.calls, [[1280, 720], [480, 663], [1280, 663]], 'one after the other, never at once');

  page.fails = true;
  await assert.rejects(live.fit('phone'), /the browser refused the step/);
  page.fails = false;
  f.set('xdotool-fails');
  assert.deepEqual(await live.fit('phone'), { kind: 'phone', width: 480, screen: SCREEN }, 'a window that can not be raised does not fail the fit');
  live.front();
  assert.deepEqual(raised(f).filter(id => id !== '100'), []);
});

test('a bar that can not be read yet is read at the next fit', async t => {
  const f = setup(t);
  const page = fakePage(f);
  page.hidden = true;
  page.show();
  const live = liveView({ size: [2560, 1328], display: ':97', ...standIn(t, f) }, page);
  assert.deepEqual(await live.fit(), { kind: 'wide', width: 1280, screen: SCREEN });
  assert.deepEqual(page.calls, [[1280, 720], [1280, 720]], 'no window to measure: the page takes the screen\'s whole height');
  assert.deepEqual(raised(f), []);
  page.hidden = false;
  await live.fit();
  assert.deepEqual(page.calls.slice(2), [[1280, 720], [1280, 663]]);
  assert.deepEqual(raised(f), ['100']);
});

test('the end sets the page\'s first size back, stops the source, removes its folder, and nothing acts after it', async t => {
  const f = setup(t);
  const page = fakePage(f, [1440, 900]);
  const view = { size: [1440, 900], display: ':97', ...standIn(t, f) };
  const live = liveView(view, page);
  await live.fit('phone');
  assert.equal(await live.revive(), false, 'a running source is left alone');
  await live.end();
  assert.deepEqual(page.calls.at(-1), [1440, 900]);
  assert.ok(!alive(view.sourcePid));
  assert.ok(!existsSync(view.dir));

  const [resizes, tools] = [page.calls.length, f.tools.calls('xdotool').length];
  assert.deepEqual(await live.fit('wide'), { kind: 'phone', width: 480, screen: SCREEN }, 'a late fit changes nothing');
  live.front();
  assert.equal(await live.revive(), false, 'and the stopped source is not started again');
  assert.deepEqual([page.calls.length, f.tools.calls('xdotool').length, f.tools.calls('x11vnc').length], [resizes, tools, 0]);
});

test('a page that can not be resized still has its source stopped; a source with no browser left can not come back', async t => {
  const f = setup(t);
  const view = { size: [1440, 900], display: ':97', ...standIn(t, f) };
  await endView(view, { resize: async () => { throw new Error('the browser is not running'); } });
  assert.ok(!alive(view.sourcePid));
  assert.ok(!existsSync(view.dir));

  const live = liveView(view, fakePage(f));
  await assert.rejects(live.revive(), /the browser has no screen to show/);
  assert.equal(f.tools.calls('x11vnc').length, 0);
});

// ---------------------------------------------------------------------------
// The page's routes

test('viewerFile gives only a script under the viewer\'s core/ or vendor/ folder', t => {
  const f = setup(t);
  const dir = fakeViewer(f.home, VIEWER.version);
  mkdirSync(join(dir, 'core/folder.js'));
  for (const inside of ['core/rfb.js', 'core/util/int.js', 'vendor/pako/lib/zlib/inflate.js']) assert.equal(viewerFile(`/novnc/${inside}`, dir), join(dir, inside));
  for (const refused of ['/novnc/app/ui.js', '/novnc/package.js', '/novnc/LICENSE.txt', '/novnc/core/notes.txt', '/novnc/core/absent.js', '/novnc/core/folder.js', '/novnc/core/', '/novnc/core/util', '/novnc/core/../app/ui.js', '/novnc/core/../../package.js', '/novnc/vendor/../../../etc/x.js', '/novnc/core/%2e%2e/app/ui.js', '/novnc/core/..%2fapp%2fui.js', '/novnc/core\\..\\app\\ui.js', '/novnc//etc/x.js', '/core/rfb.js', '/novnc/core/rfb.js/', '/']) {
    assert.equal(viewerFile(refused, dir), null, refused);
  }
  assert.equal(viewerFile('/novnc/core/rfb.js'), null, 'this home folder holds no viewer');
  const own = fakeViewer(HOME, VIEWER.version);
  assert.equal(viewerFile('/novnc/core/rfb.js'), join(own, 'core/rfb.js'), 'the pinned viewer in the home folder, by default');
});

/** Serves `routes` as hand-over.mjs mounts them; resolves to a caller of one route. */
async function mounted(t, routes) {
  const server = createServer((request, response) => routes(new URL(request.url, 'http://page').pathname, request, response));
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => server.close());
  return async (path, body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/${path}`, { method: body === undefined ? 'GET' : 'POST', body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    const text = await response.text();
    return { status: response.status, json: text ? JSON.parse(text) : null };
  };
}

test('the view\'s routes give the note, the fit, and the deadline, take a shape, and close once', async t => {
  const fits = [];
  let cancelled = 0;
  const fit = kind => ({ kind, width: kind === 'phone' ? 480 : 1280, screen: SCREEN });
  const call = await mounted(t, viewRoutes({ note: 'Messenger wants to know you\'re a person' }, { fitted: () => fit('wide'), onFit: async kind => { fits.push(kind); return fit(kind); }, onCancel: () => { cancelled++; }, closesAt: 1234 }));
  const view = await call('view');
  assert.equal(view.status, 200);
  assert.deepEqual({ ...view.json, now: 0 }, { note: 'Messenger wants to know you\'re a person', fit: fit('wide'), closesAt: 1234, now: 0 });
  assert.ok(Math.abs(view.json.now - Date.now()) < 5000, 'the watcher\'s own clock');
  assert.equal((await call('view', {})).status, 405);
  assert.equal((await call('fit')).status, 405);
  assert.deepEqual(await call('fit', { fit: 'phone' }), { status: 200, json: { fit: fit('phone') } });
  for (const body of ['{', {}, { fit: 'tall' }, { fit: ['phone'] }, 'x'.repeat(20_000)]) assert.equal((await call('fit', body)).status, 400, JSON.stringify(body).slice(0, 40));
  assert.deepEqual(fits, ['phone'], 'only a shape it knows reaches the browser');
  assert.deepEqual(await call('done', {}), { status: 200, json: { ok: true } });
  await pause(20);
  assert.equal((await call('done', {})).status, 409);
  assert.equal(cancelled, 1);

  const bare = await mounted(t, viewRoutes({ note: null }));
  assert.deepEqual(Object.keys((await bare('view')).json).sort(), ['fit', 'now'], 'no note, no line; nothing else from the page');
  assert.deepEqual((await bare('fit', { fit: 'wide' })).json, { fit: null });
  assert.equal((await bare('done', {})).status, 200);
});
