// The live view's parts, used by `hand-over.mjs open --view` and `install-view`: what a computer needs
// to show one, the install, the screen source, the fit, and the page's routes.
//
// A live view shows camofox's browser, which on Linux draws on a virtual screen, and takes the person's
// taps and typing. It needs three tools. `x11vnc` serves that screen. `xdotool` reads the screen's size
// and keeps the page's window in front. noVNC draws the screen on the link's page: the one version in
// VIEWER, from its source release, kept in `~/.wong-stack/live-view/novnc-<version>/`.
//
// `checkView` runs before anything opens: off Linux it answers `unsupported`, else it names each tool
// that is missing. `installView` adds what is missing. The viewer is downloaded, only its `core/`,
// `vendor/`, and `LICENSE.txt` unpacked into a scratch folder, and moved into place only when
// `fingerprint` gives VIEWER's value: the SHA-256 of a `sha256sum` line per file under `core/` and
// `vendor/`, sorted by path. The two system tools come from `apt-get install -y
// --no-install-recommends x11vnc xdotool`, run as root or through `sudo -n`. With no `apt-get`, or a
// `sudo` that wants a password, the result is `manual`, MANUAL is the one command for the person, and
// nothing is installed, the viewer included.
//
// `screenOf` finds the screen from the running browser: `DISPLAY` in the environment of the camofox
// server's `camoufox-bin` child, else the X socket its `Xvfb` child holds, as camofox's own helper maps
// it through `/proc/net/unix`. `startSource` starts `x11vnc` there on a Unix socket in the folder it is
// given, mode 0700, with `-rfbport 0 -rfbportv6 0`: either port flag alone leaves a network port open
// with no password. `-localhost` is left out on purpose: with it x11vnc drops every client that comes
// over the Unix socket, right after its first line. It then reads `/proc` and, when `x11vnc` holds any listening TCP socket,
// stops it and throws. `stopSource` stops it and removes the folder.
//
// `liveView` fits the page and keeps it in front, one step at a time. The fit uses browse.mjs's
// `resize`, camofox's own call, which resizes the page's window too. The first fit sizes the page to
// the whole screen and reads the bar above it: the window's height less the page's. The wide fit is
// the screen's width by its height less that bar; the phone fit is 480 wide by the same height, and
// the page shows only that strip. `front` raises the `Navigator` window (`xdotool search --classname`;
// `--class` finds none) as tall as the screen and at least as wide as the fit, the narrowest such. `revive` starts a screen source that exited again.
// `end`, and `endView` for a watcher that died, set the page's first size back and stop the source.
//
// `viewRoutes` mounts the page's keyed routes. `GET /view` gives `{note, fit, closesAt, now}`; `POST
// /fit` takes `{fit: 'phone'|'wide'}` and answers the new fit; `POST /done` closes the link. A fit is
// `{kind, width, screen: [width, height]}`: the strip's width and the screen's size, never anything from
// the page. `viewerFile` maps `/novnc/...` to one of the viewer's own scripts under `core/` or
// `vendor/`, and to nothing else.
//
// Node built-ins, plus `tar`. For tests: HANDOVER_X11VNC_BIN, HANDOVER_XDOTOOL_BIN,
// HANDOVER_APT_GET_BIN, and HANDOVER_SUDO_BIN each name that command's file.

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { accessSync, constants, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, join, relative } from 'node:path';
import { serverPid } from '../../browser/scripts/browse.mjs';
import { readBody, reply } from './form.mjs';
import { alive, killTunnel } from './lib/tunnel.mjs';

/**
 * The one viewer version WongStack has tried: where its source release is, and the fingerprint of its
 * `core/` and `vendor/` files. The three move together, by hand; update.mjs only reads the version.
 */
export const VIEWER = { version: '1.6.0', url: 'https://github.com/novnc/noVNC/archive/refs/tags/v1.6.0.tar.gz', sha256: '25e27eaae3c616d207ea020ef40d3ba066f4dbaf47ef506fd0457975a137d17a' };
/** What each tool is for, and what its install needs, as the person is told. */
export const TOOLS = {
  x11vnc: 'x11vnc shows the browser\'s screen. It is a system package, so it needs admin rights.',
  xdotool: 'xdotool keeps the page\'s window in front. It is a system package, so it needs admin rights.',
  novnc: `noVNC ${VIEWER.version} draws that screen on the link's page. It goes in your home folder.`,
};
export const OFF_LINUX = 'A live view needs Linux, where the browser runs on a virtual screen it can show.';
export const VIEW_ROUTES = new Set(['/view', '/fit', '/done']);
const FITS = ['phone', 'wide'];
const PHONE_WIDTH = 480;
const PACKAGES = ['x11vnc', 'xdotool'];
const INSTALL = ['install', '-y', '--no-install-recommends', ...PACKAGES];
/** The one command for the person, where the agent can not install the system tools. */
export const MANUAL = `sudo apt-get ${INSTALL.join(' ')}`;
const HASHED = ['core', 'vendor'];
const KEPT = [...HASHED, 'LICENSE.txt'];
const DOWNLOAD_MS = 120_000;
const INSTALL_MS = 10 * 60_000;
const SOURCE_WAIT_MS = 10_000;
const TOOL_MS = 5000;
const sleep = ms => new Promise(done => setTimeout(done, ms));
const readText = file => { try { return readFileSync(file, 'utf8'); } catch { return ''; } };
const sha256 = data => createHash('sha256').update(data).digest('hex');

// ---------------------------------------------------------------------------
// What a view needs

/** A command's file: the one `HANDOVER_<NAME>_BIN` names, for tests, else the first on PATH; null when there is none. */
export function findTool(name, env = process.env) {
  const named = env[`HANDOVER_${name.toUpperCase().replace('-', '_')}_BIN`];
  const files = named ? [named] : (env.PATH ?? '').split(delimiter).filter(Boolean).map(dir => join(dir, name));
  return files.find(file => { try { accessSync(file, constants.X_OK); return true; } catch { return false; } }) ?? null;
}

/** The folder the pinned viewer is kept in. */
export function viewerDir(home = homedir(), { version } = VIEWER) {
  return join(home, '.wong-stack', 'live-view', `novnc-${version}`);
}

/** Why this computer can not open a live view yet: `unsupported` off Linux, else `missing`, each absent tool by name. */
export function checkView({ platform = process.platform, env = process.env, home = homedir(), viewer = VIEWER } = {}) {
  if (platform !== 'linux') return { unsupported: OFF_LINUX, missing: [] };
  const present = name => (name === 'novnc' ? existsSync(join(viewerDir(home, viewer), 'core', 'rfb.js')) : Boolean(findTool(name, env)));
  return { missing: Object.keys(TOOLS).filter(name => !present(name)) };
}

// ---------------------------------------------------------------------------
// The install

/**
 * The viewer's fingerprint: the SHA-256 of a `sha256sum` line for each file under `core/` and
 * `vendor/`, sorted by path. Null when a folder is absent or holds anything but plain files.
 */
export function fingerprint(dir) {
  const lines = [];
  try {
    for (const entry of HASHED.flatMap(top => readdirSync(join(dir, top), { recursive: true, withFileTypes: true }))) {
      if (entry.isDirectory()) continue;
      if (!entry.isFile()) return null;
      const file = join(entry.parentPath, entry.name);
      lines.push(`${sha256(readFileSync(file))}  ${relative(dir, file)}\n`);
    }
  } catch {
    return null;
  }
  const path = line => line.slice(66);
  return sha256(lines.sort((a, b) => (path(a) < path(b) ? -1 : 1)).join(''));
}

/**
 * Downloads `viewer`'s source release and keeps its `core/`, `vendor/`, and licence in `dir`, only
 * when every file matches the recorded fingerprint. Throws, with nothing installed, when it does not.
 */
export async function installViewer(viewer, dir) {
  mkdirSync(dirname(dir), { recursive: true, mode: 0o700 });
  const scratch = mkdtempSync(join(dirname(dir), 'download-'));
  try {
    const response = await fetch(viewer.url, { signal: AbortSignal.timeout(DOWNLOAD_MS) }).catch(() => null);
    if (!response?.ok) throw new Error(`the viewer could not be downloaded from ${viewer.url}`);
    const archive = join(scratch, 'viewer.tar.gz');
    writeFileSync(archive, Buffer.from(await response.arrayBuffer()));
    spawnSync('tar', ['-xzf', archive, '-C', scratch, '--strip-components=1', ...KEPT.map(name => `noVNC-${viewer.version}/${name}`)], { stdio: 'ignore' });
    rmSync(archive);
    const found = fingerprint(scratch);
    if (found !== viewer.sha256) throw new Error(`the viewer's files are not the ones WongStack tried: their fingerprint is ${found ?? 'unreadable'}, not ${viewer.sha256}. Nothing was installed`);
    rmSync(dir, { recursive: true, force: true });
    renameSync(scratch, dir);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** How `apt-get` runs here with no password, as a command line, or null: as root, or through `sudo -n`. */
function aptCommand(env, uid) {
  const apt = findTool('apt-get', env);
  if (!apt) return null;
  if (uid === 0) return [apt];
  const sudo = findTool('sudo', env);
  return sudo && spawnSync(sudo, ['-n', 'true'], { stdio: 'ignore' }).status === 0 ? [sudo, '-n', apt] : null;
}

/**
 * Installs what `checkView` finds missing. Resolves to `installed`; to `unsupported` off Linux; or to
 * `manual`, with nothing installed, when a system tool is missing and `apt-get` can not run without a
 * password. Throws when the viewer's files miss the fingerprint or an install fails.
 */
export async function installView({ platform = process.platform, env = process.env, home = homedir(), uid = process.getuid?.(), viewer = VIEWER } = {}) {
  const { unsupported, missing } = checkView({ platform, env, home, viewer });
  if (unsupported) return 'unsupported';
  const packages = missing.some(name => PACKAGES.includes(name));
  const apt = packages ? aptCommand(env, uid) : [];
  if (!apt) return 'manual';
  if (missing.includes('novnc')) await installViewer(viewer, viewerDir(home, viewer));
  if (packages && spawnSync(apt[0], [...apt.slice(1), ...INSTALL], { stdio: ['ignore', 2, 2], timeout: INSTALL_MS }).status !== 0) throw new Error('apt-get did not install x11vnc and xdotool; see its lines above');
  const still = checkView({ platform, env, home, viewer }).missing;
  if (still.length) throw new Error(`still missing after the install: ${still.join(', ')}`);
  return 'installed';
}

// ---------------------------------------------------------------------------
// The screen and its source

/** The processes whose parent is `pid`, as `{pid, name}`. */
function childrenOf(pid, proc) {
  const children = [];
  for (const entry of readdirSync(proc).filter(name => /^\d+$/.test(name))) {
    const stat = readText(join(proc, entry, 'stat'));
    const close = stat.lastIndexOf(')');
    if (Number(stat.slice(close + 2).split(' ')[1]) === pid) children.push({ pid: Number(entry), name: stat.slice(stat.indexOf('(') + 1, close) });
  }
  return children;
}

/** The kernel's number for each socket `pid` holds open. */
function socketsOf(pid, proc) {
  const fds = join(proc, String(pid), 'fd');
  let names;
  try { names = readdirSync(fds); } catch { return []; }
  return names.flatMap(fd => {
    try { return /^socket:\[(\d+)\]$/.exec(readlinkSync(join(fds, fd)))?.[1] ?? []; } catch { return []; }
  });
}

/** A `/proc/net` table's rows, each split into its columns. */
const rows = (proc, table) => readText(join(proc, 'net', table)).split('\n').map(line => line.trim().split(/\s+/));

/** The display an `Xvfb` process serves, from the X socket it holds open. */
function xvfbDisplay(pid, proc) {
  const paths = new Map(rows(proc, 'unix').map(columns => [columns[6], columns[7]]));
  for (const inode of socketsOf(pid, proc)) {
    const display = /^\/tmp\/\.X11-unix\/X(\d+)$/.exec(paths.get(inode) ?? '')?.[1];
    if (display) return `:${display}`;
  }
  return null;
}

/**
 * The X display camofox's browser draws on, or null when it has none: `DISPLAY` of the server's
 * `camoufox-bin` child, whose value is the browser's own, else the socket of its `Xvfb` child.
 */
export function screenOf(server = serverPid(), proc = '/proc') {
  const children = server ? childrenOf(server, proc) : [];
  for (const { pid } of children.filter(child => child.name === 'camoufox-bin')) {
    const display = readText(join(proc, String(pid), 'environ')).split('\0').find(entry => entry.startsWith('DISPLAY='))?.slice(8);
    if (display) return display;
  }
  const xvfb = children.find(child => child.name === 'Xvfb');
  return xvfb ? xvfbDisplay(xvfb.pid, proc) : null;
}

/** True when `pid` holds a listening TCP socket, or when the kernel's list of them can not be read. */
export function listensOnTcp(pid, proc = '/proc') {
  if (!existsSync(join(proc, 'net', 'tcp'))) return true;
  const listening = new Set(['tcp', 'tcp6'].flatMap(table => rows(proc, table)).filter(columns => columns[3] === '0A').map(columns => columns[9]));
  return socketsOf(pid, proc).some(inode => listening.has(inode));
}

/** The screen source's socket in its folder. */
export const socketOf = dir => join(dir, 'screen.sock');

/** Stops the screen source and removes its folder. */
export async function stopSource({ sourcePid, dir }) {
  await killTunnel(sourcePid);
  rmSync(dir, { recursive: true, force: true });
}

/**
 * Starts `x11vnc` on `display`, serving a Unix socket in `dir`, a folder only this user can open.
 * Resolves to `{dir, sourcePid}`. Throws, with the source stopped and the folder removed, when it does
 * not start or holds any TCP listener.
 */
export async function startSource(display, dir) {
  const socket = socketOf(dir);
  rmSync(socket, { force: true });
  const bin = findTool('x11vnc');
  const child = bin && spawn(bin, ['-display', display, '-unixsock', socket, '-rfbport', '0', '-rfbportv6', '0', '-nopw', '-forever', '-shared', '-noxdamage', '-quiet'], { detached: true, stdio: 'ignore' });
  child?.on('error', () => {}).unref();
  const end = Date.now() + SOURCE_WAIT_MS;
  while (!existsSync(socket) && alive(child?.pid) && Date.now() < end) await sleep(50);
  const fault = !existsSync(socket) ? 'The screen tool, x11vnc, did not start.' : listensOnTcp(child.pid) ? 'The screen tool, x11vnc, opened a network port, so it was stopped and no link was opened.' : null;
  if (!fault) return { dir, sourcePid: child.pid };
  await stopSource({ sourcePid: child?.pid, dir });
  throw new Error(fault);
}

// ---------------------------------------------------------------------------
// Fit, front, and restore

/** Runs xdotool on `display` and resolves to what it prints; throws when it is missing or fails. */
function xdotool(display, ...args) {
  const bin = findTool('xdotool');
  const out = bin && spawnSync(bin, args, { env: { ...process.env, DISPLAY: display }, encoding: 'utf8', timeout: TOOL_MS });
  if (out?.status !== 0) throw new Error(`xdotool ${args[0]} failed`);
  return out.stdout;
}

/** The screen's size, `{width, height}`. */
function screenSize(display) {
  const [width, height] = xdotool(display, 'getdisplaygeometry').trim().split(/\s+/).map(Number);
  if (!(width > 0 && height > 0)) throw new Error('xdotool gave no screen size');
  return { width, height };
}

/** Each browser page's window on `display`, as `{id, width, height}`; none when the search finds none. */
function pageWindows(display) {
  const number = (shape, name) => Number(new RegExp(`^${name}=(\\d+)$`, 'm').exec(shape)?.[1]);
  try {
    return xdotool(display, 'search', '--classname', 'Navigator').split('\n').filter(Boolean).map(id => {
      const shape = xdotool(display, 'getwindowgeometry', '--shell', id);
      return { id, width: number(shape, 'WIDTH'), height: number(shape, 'HEIGHT') };
    });
  } catch {
    return [];
  }
}

/** Sets the page's first size back and stops the screen source: what every end of a view does. */
export async function endView(view, page) {
  await page.resize(...view.size).catch(() => {});
  await stopSource(view);
}

/**
 * The open view's fit and source, for the watcher. `view` is the link's `{size, display, dir,
 * sourcePid}` and `page` browse.mjs's client for the session. Each step waits for the one before it,
 * and none acts once `end` has run.
 */
export function liveView(view, page) {
  let kind = 'wide';
  let screen = null;
  let bar = null;
  let ended = false;
  let last = Promise.resolve();
  const inTurn = job => {
    const run = last.then(job);
    last = run.catch(() => {});
    return run;
  };
  const fitted = () => ({ width: kind === 'phone' ? Math.min(PHONE_WIDTH, screen.width) : screen.width, height: screen.height - (bar ?? 0) });
  const describe = () => screen && { kind, width: fitted().width, screen: [screen.width, screen.height] };
  /** The bar above the page: how much taller its window is than the page, read with the page as tall as the screen. */
  const measureBar = async () => {
    await page.resize(screen.width, screen.height);
    const over = pageWindows(view.display).filter(win => win.width === screen.width && win.height >= screen.height).map(win => win.height - screen.height);
    return over.length ? Math.min(...over) : null;
  };
  /**
   * Raises the page's window: the one as tall as the screen and at least as wide as the fit, the
   * narrowest such. Not exactly as wide: the browser's window stops at about 500, so on the phone fit
   * it is wider than the 480 strip. It gets the keyboard too: with no window manager the newest window
   * keeps it, so the person's typing would land on another task's page.
   */
  const front = () => {
    if (!screen || ended) return;
    const own = pageWindows(view.display).filter(win => win.height === screen.height && win.width >= fitted().width).sort((a, b) => a.width - b.width)[0];
    try { if (own) xdotool(view.display, 'windowraise', own.id, 'windowfocus', own.id); } catch { /* the next poll raises it */ }
  };
  return {
    describe,
    front,
    /** Fits the page as `next`, `phone` or `wide`, or as it was; resolves to the fit. */
    fit: (next = kind) => inTurn(async () => {
      if (ended) return describe();
      kind = next;
      screen ??= screenSize(view.display);
      bar ??= await measureBar();
      await page.resize(fitted().width, fitted().height);
      front();
      return describe();
    }),
    /** Starts the screen source again when it has exited, on the browser's screen now; resolves to whether it did. */
    revive: () => inTurn(async () => {
      if (ended || alive(view.sourcePid)) return false;
      const display = screenOf();
      if (!display) throw new Error('the browser has no screen to show');
      Object.assign(view, { display }, await startSource(display, view.dir));
      return true;
    }),
    end: () => inTurn(async () => {
      ended = true;
      await endView(view, page);
    }),
  };
}

// ---------------------------------------------------------------------------
// The page's routes

/** The pinned viewer's own file for a `/novnc/...` address, or null: only a script under its `core/` or `vendor/` folder. */
export function viewerFile(pathname, dir = viewerDir()) {
  const inside = /^\/novnc\/((?:core|vendor)\/[\w./-]+\.js)$/.exec(pathname)?.[1];
  if (!inside || inside.split('/').includes('..')) return null;
  const file = join(dir, inside);
  return statSync(file, { throwIfNoEntry: false })?.isFile() ? file : null;
}

/**
 * The view's routes for the link's `{note}`. `fitted()` gives the fit now; `onFit(kind)` refits and
 * resolves to the new one; `onCancel()` runs once `/done`'s reply has gone. `closesAt` is the deadline
 * `GET /view` reports.
 */
export function viewRoutes({ note }, { fitted = () => null, onFit = async () => null, onCancel = () => {}, closesAt } = {}) {
  let ended = false;
  return async (pathname, request, response) => {
    if (pathname === '/view') return request.method === 'GET' ? reply(response, 200, { ...(note && { note }), fit: fitted(), closesAt, now: Date.now() }) : reply(response, 405);
    if (request.method !== 'POST') return reply(response, 405);
    if (pathname === '/done') {
      if (ended) return reply(response, 409);
      ended = true;
      response.once('finish', () => onCancel());
      return reply(response, 200, { ok: true });
    }
    const kind = (await readBody(request))?.fit;
    if (!FITS.includes(kind)) return reply(response, 400);
    reply(response, 200, { fit: await onFit(kind) });
  };
}
