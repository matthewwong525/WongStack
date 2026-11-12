// The live view's parts, used by `hand-over.mjs open --view` and `install-view`: what a computer needs
// to show one, the install, the screen source, the fit, the routes, and a request's body. Node built-ins, plus `tar`.

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { accessSync, constants, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, join, relative } from 'node:path';
import { serverDisplay, serverPid, serverWindow } from '../../../scripts/browse.mjs';
import { alive, killTunnel } from './lib/tunnel.mjs';

/** The one viewer version WongStack has tried: its source release and the fingerprint of its `core/` and
 * `vendor/` files. The three move together, by hand; update.mjs only reads the version. */
export const VIEWER = { version: '1.6.0', url: 'https://github.com/novnc/noVNC/archive/refs/tags/v1.6.0.tar.gz', sha256: '25e27eaae3c616d207ea020ef40d3ba066f4dbaf47ef506fd0457975a137d17a' };
/** What each tool is for, and what its install needs, as the person is told. */
export const TOOLS = {
  x11vnc: 'x11vnc shows the browser\'s screen. It is a system package, so it needs admin rights.',
  xdotool: 'xdotool keeps the page\'s window in front. It is a system package, so it needs admin rights.',
  novnc: `noVNC ${VIEWER.version} draws that screen on the link's page. It goes in your home folder.`,
};
export const OFF_LINUX = 'A live view needs Linux, where the browser runs on a virtual screen it can show.';
export const VIEW_ROUTES = new Set(['/view', '/fit', '/give', '/show', '/watch', '/take']);
/** A watch link's buttons, each its route: the person takes the browser, or hands it back. */
const WATCH_ACTIONS = new Set(['/take', '/give']);
const BODY_MOST = 16 * 1024;
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

/** A command's file: the one `HANDOVER_<NAME>_BIN` names, for tests, else the first on PATH; null with none. */
export function findTool(name, env = process.env) {
  const named = env[`HANDOVER_${name.toUpperCase().replace('-', '_')}_BIN`];
  const files = named ? [named] : (env.PATH ?? '').split(delimiter).filter(Boolean).map(dir => join(dir, name));
  return files.find(file => { try { accessSync(file, constants.X_OK); return true; } catch { return false; } }) ?? null;
}

/** The folder the pinned viewer is kept in. */
export function viewerDir(home = homedir(), { version } = VIEWER) {
  return join(home, '.wong-stack', 'live-view', `novnc-${version}`);
}

/** How this computer shows the browser: `window` when the running browser has its own window, else `unsupported` off
 * Linux, else `missing`, each absent tool. */
export function checkView({ platform = process.platform, env = process.env, home = homedir(), viewer = VIEWER, window = serverWindow() } = {}) {
  if (window) return { window: true, missing: [] };
  if (platform !== 'linux') return { unsupported: OFF_LINUX, missing: [] };
  const present = name => (name === 'novnc' ? existsSync(join(viewerDir(home, viewer), 'core', 'rfb.js')) : Boolean(findTool(name, env)));
  return { missing: Object.keys(TOOLS).filter(name => !present(name)) };
}

/** The viewer's fingerprint: the SHA-256 of a `sha256sum` line for each file under `core/` and
 * `vendor/`, sorted by path. Null when a folder is absent or holds anything but plain files. */
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

/** Downloads `viewer`'s source release and keeps its `core/`, `vendor/`, and licence in `dir`, only
 * when every file matches the recorded fingerprint. Throws, with nothing installed, when it does not. */
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

/** Installs what `checkView` finds missing: `installed`, `unsupported` off Linux, or `manual`, with nothing
 * installed, when `apt-get` can not run without a password. Throws on a fingerprint miss or a failed install. */
export async function installView({ platform = process.platform, env = process.env, home = homedir(), uid = process.getuid?.(), viewer = VIEWER } = {}) {
  const { unsupported, missing } = checkView({ platform, env, home, viewer, window: false });
  if (unsupported) return 'unsupported';
  const packages = missing.some(name => PACKAGES.includes(name));
  const apt = packages ? aptCommand(env, uid) : [];
  if (!apt) return 'manual';
  if (missing.includes('novnc')) await installViewer(viewer, viewerDir(home, viewer));
  if (packages && spawnSync(apt[0], [...apt.slice(1), ...INSTALL], { stdio: ['ignore', 2, 2], timeout: INSTALL_MS }).status !== 0) throw new Error('apt-get did not install x11vnc and xdotool; see its lines above');
  const still = checkView({ platform, env, home, viewer, window: false }).missing;
  if (still.length) throw new Error(`still missing after the install: ${still.join(', ')}`);
  return 'installed';
}

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

/** The X display the browser draws on, or null when it has none: the one its server recorded, else `DISPLAY` of
 * the server's `camoufox-bin` child, else the socket of its `Xvfb` child. */
export function screenOf(server = serverPid(), proc = '/proc', recorded = proc === '/proc' && server === serverPid() ? serverDisplay() : null) {
  if (recorded) return recorded;
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

/** Starts `x11vnc` on a Unix socket in `dir`; throws if it holds a TCP listener. `-rfbport 0` or `-rfbportv6 0`
 * alone leaves a port open with no password; `-localhost` is left out, since it drops every Unix-socket client. */
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

/** Each browser page's window on `display`, as `{id, width, height}`; none when the search finds none.
 * xdotool finds the `Navigator` window by `--classname`; `--class` finds none. */
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

/** Sizes each page window bigger than the screen to the screen, at its corner: on an add-on's page the browser keeps
 * the page's height, and a window from a bigger start would hang off the screen, toolbar included. */
function fitWindows(display, screen) {
  for (const win of pageWindows(display).filter(each => each.width > screen.width || each.height > screen.height)) {
    try {
      xdotool(display, 'windowsize', win.id, String(screen.width), String(screen.height), 'windowmove', win.id, '0', '0');
    } catch { /* the next fit tries again */ }
  }
}

/** True while a browser pop-up shows on `display`, such as an add-on's toolbar pop-up or a menu: Firefox draws each as
 * a window of its own, X instance name `Camoufox`, where a page's window is `Navigator`. */
export function popupOpen(display) {
  try { return xdotool(display, 'search', '--onlyvisible', '--classname', '^Camoufox$').trim() !== ''; } catch { return false; }
}

/** The window to keep in front among `fits`: one the person just opened, such as a password manager's own window, else
 * the one kept last, else the narrowest. `seen` holds every window id the view has listed before. */
export function keptWindow(fits, seen, kept) {
  const opened = seen.size ? fits.filter(win => !seen.has(win.id)) : [];
  return opened.at(-1) ?? fits.find(win => win.id === kept) ?? [...fits].sort((a, b) => a.width - b.width)[0];
}

/** Sets the page's first size back and stops the screen source: what every end of a view does. */
export async function endView(view, page) {
  if (view.size) await page.resize(...view.size).catch(() => {});
  await stopSource(view);
}

/** The open view's fit and source, for the watcher, on the shown `page`, which `show` sets. Each step waits for the
 * one before it, and none acts once `end` has run. */
export function liveView(view, page = null) {
  let kind = 'wide';
  let screen = null;
  let bar = null;
  // The last answer came from the password manager's page.
  let addon = false;
  let ended = false;
  let last = Promise.resolve();
  const seen = new Set();
  let kept = null;
  const inTurn = job => {
    const run = last.then(job);
    last = run.catch(() => {});
    return run;
  };
  const fitted = () => ({ width: kind === 'phone' ? Math.min(PHONE_WIDTH, screen.width) : screen.width, height: screen.height - (bar ?? 0) });
  const describe = () => screen && { kind, width: fitted().width, screen: [screen.width, screen.height] };
  /** The bar above the page: how much taller its window is than the page, read with the page as tall as the screen.
   * None on the password manager's page, which takes only the width and keeps its height under the bar. */
  const measureBar = async () => {
    addon = Boolean((await page.resize(screen.width, screen.height))?.addonPage);
    if (addon) return null;
    const over = pageWindows(view.display).filter(win => win.width === screen.width && win.height > screen.height).map(win => win.height - screen.height);
    return over.length ? Math.min(...over) : null;
  };
  /** Sizes the page as the fit; resolves to whether the password manager's page shows. */
  const size = async () => (addon = Boolean((await page.resize(fitted().width, fitted().height))?.addonPage));
  /** Raises and focuses a window as tall as the screen and at least as wide as the fit (the browser's stops near 500).
   * None while a pop-up shows: a raise covers it, and focus on it closes it; it takes keys with the page's focus. */
  const front = () => {
    if (!screen || ended || popupOpen(view.display)) return;
    const windows = pageWindows(view.display);
    const fits = windows.filter(win => win.height === screen.height && win.width >= fitted().width);
    const own = keptWindow(fits, seen, kept);
    for (const win of windows) seen.add(win.id);
    kept = own?.id ?? null;
    try { if (own) xdotool(view.display, 'windowraise', own.id, 'windowfocus', own.id); } catch { /* next poll */ }
  };
  return {
    describe,
    front,
    /** True while a browser pop-up shows on the view's screen. */
    popupOpen: () => !ended && popupOpen(view.display),
    /** Fits the page as `next`, `phone` or `wide`, or as it was; resolves to the fit. */
    fit: (next = kind) => inTurn(async () => {
      if (ended || !page) return describe();
      kind = next;
      screen ??= screenSize(view.display);
      // On the password manager's page a reading widens the page to the screen, and the fit narrows it again: so the
      // bar waits there, and is read at the first fit whose answer comes from a site.
      const waited = addon;
      if (!waited) bar ??= await measureBar();
      if (!await size() && waited && bar == null) {
        bar = await measureBar();
        await size();
      }
      if (addon) fitWindows(view.display, screen);
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
    /** Shows `next`, or none, once `swap` has let the page shown before go. */
    show: (next, swap = async () => {}) => inTurn(async () => {
      if (ended) return;
      await swap();
      page = next;
    }),
    end: () => inTurn(async () => {
      ended = true;
      await endView(view, page);
    }),
  };
}

/** The pinned viewer's own file for a `/novnc/...` address, or null: only a script under its `core/` or `vendor/`. */
export function viewerFile(pathname, dir = viewerDir()) {
  const inside = /^\/novnc\/((?:core|vendor)\/[\w./-]+\.js)$/.exec(pathname)?.[1];
  if (!inside || inside.split('/').includes('..')) return null;
  const file = join(dir, inside);
  return statSync(file, { throwIfNoEntry: false })?.isFile() ? file : null;
}

/** A request's JSON body, or a status: 413 past the byte limit, 400 when it isn't JSON. */
export async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size <= BODY_MOST) chunks.push(chunk);
  }
  if (size > BODY_MOST) return 413;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return 400;
  }
}

/** Ends a route with a JSON reply, or an empty one. */
export function reply(response, status, body) {
  const text = body ? JSON.stringify(body) : '';
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(text) }).end(text);
}

/** The view's routes for `{note}`: `tabs()` adds a turn view's tabs, `/show` runs `onShow(chat)`, and `/give` runs
 * `onGive(chat)`, which gives what ends that turn after the answer, or null. `watch` hooks serve a watch link. */
export function viewRoutes({ note }, { fitted = () => null, onFit = async () => null, onGive = () => null, onShow = async () => false, tabs = null, closesAt, watch = null } = {}) {
  return async (pathname, request, response) => {
    if (pathname === '/view') {
      if (request.method !== 'GET') return reply(response, 405);
      watch?.shown();
      return reply(response, 200, { note, ...(watch ? { watch: true } : { control: 'turn' }), fit: fitted(), closesAt, ...tabs?.(), now: Date.now() });
    }
    if ((!watch && (pathname === '/watch' || pathname === '/take')) || (!tabs && pathname === '/show')) return reply(response, 404);
    if (pathname === '/watch') return request.method === 'GET' ? reply(response, 200, watch.info()) : reply(response, 405);
    if (request.method !== 'POST') return reply(response, 405);
    if (watch && WATCH_ACTIONS.has(pathname)) {
      const now = watch[pathname.slice(1)]();
      return now ? reply(response, 200, now) : reply(response, 409);
    }
    // A body that is too big or not JSON names no chat and no fit.
    const body = await readBody(request).then(read => (typeof read === 'object' ? read : null));
    if (pathname === '/give') {
      const end = onGive(body?.chat);
      if (!end) return reply(response, 409);
      response.once('finish', end);
      return reply(response, 200, { control: 'assistant' });
    }
    if (pathname === '/show') return (await onShow(body?.chat)) ? reply(response, 200, { ...tabs(), now: Date.now() }) : reply(response, 409);
    const kind = body?.fit;
    if (!FITS.includes(kind)) return reply(response, 400);
    reply(response, 200, { fit: await onFit(kind) });
  };
}
