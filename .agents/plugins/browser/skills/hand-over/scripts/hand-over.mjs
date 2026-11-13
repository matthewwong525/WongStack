#!/usr/bin/env node
// Opens a private link that closes itself: a key link per chat, in ~/.wong-stack/hand-over/links/, or a turn in the
// one live view, a tab per chat, in hand-over/view/. Exit codes: 0 ok · 1 failed · 2 usage · 3 a tool is missing.

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { isMain } from '../../../scripts/lib/cli.mjs';
import { primaryRoot } from '../../../scripts/lib/primary-root.mjs';
import { client as browseClient, sessionName } from '../../../scripts/browse.mjs';
import { slot } from '../../../scripts/lib/profile.mjs';
import { checkGuide, KEY_ROUTES, keyFiles, keyRoutes, LIMITS as KEY_LIMITS, NAME as KEY_NAME, resolveKeys } from './keys.mjs';
import { readableName } from './keys-page.mjs';
import { appendTiming, linkOf } from './lib/timings.mjs';
import { alive, freePort, hasCloudflared, keyMatches, killTunnel, linkAnswers, signal, startTunnel } from './lib/tunnel.mjs';
import { screenBridge } from './lib/ws-bridge.mjs';
import { checkView, endView, installView, liveView, MANUAL, OFF_LINUX, reply, screenOf, socketOf, startSource, stopSource, TOOLS, VIEW_ROUTES, viewerFile, viewRoutes } from './view.mjs';

export { keyMatches, tunnelOrigin } from './lib/tunnel.mjs';

const USAGE = `usage: hand-over.mjs open --view --note <line> [--session <name>] [--minutes N]
       hand-over.mjs open --watch [--session <name>] [--note <line>] [--minutes N]
       hand-over.mjs open --keys NAME[,NAME] [--guide <file>] [--minutes N]
       hand-over.mjs wait | close [--stopped] | install-view
       hand-over.mjs line <text> | turn --note <line>
  open    start the private link, print HANDOVER_LINK=<url> once it answers through
          Cloudflare, then HANDOVER_SEND=<reminder to end the turn with the link>, list its address
          in the app's inbox, and watch until it ends
          --view: the person's turn in the browser, as a live view of the --session page: a
          payment, a backup code, a sign-in, a check that asks whether a person is there, or a
          stuck step; the person types or pastes on the real site, and the agent sees nothing
          until the turn ends; the task's tab title starts with a bell, and the page lists
          each open turn's --note (what to do now); the turn ends only on Hand back in the
          browser's toolbar (which ends every open turn), close, or the time limit, never on a
          page change; open for 480 minutes; while another chat's view is open, this chat's
          turn joins it and prints the view's link, which opens on its tab
          HANDOVER_VIEW=window, with no link, where the browser shows in its own window: the
          task's tab gets the bell and is held, the person does the step there and clicks Hand
          back in the browser's toolbar or says done in the chat (then run close); several
          chats' turns stand at once, and a new one comes to the front only with no other open;
          HANDOVER_VIEW=unsupported where the browser has no
          screen to show, and HANDOVER_NEEDS=live-view (exit 3) with a line per missing tool
          --watch: a live view the agent drives while the person watches, as one
          for connecting tools: the person's taps reach the browser only after they
          tap Take over, or on their turn; it ends at close;
          open for 480 minutes, the one live view as --view is; where the browser
          shows in its own window, HANDOVER_VIEW=window with no link: the person
          watches that window, and a turn is theirs there until close
          --keys: one box per declared name; it ends on cancellation or
          once every key is saved (exit 2 with KEYS_UNDECLARED= or KEYS_AMBIGUOUS=);
          an unopened one gives way to a new open from the same chat
          --guide: a JSON file keyed by name, each with any of title, url, open,
          steps, and check {url, auth}, shown on the key page (exit 2 with KEYS_GUIDE=)
          --minutes: time limit for any link, default 1440 (24 hours); 480 for --view
  wait    block until the link closes; print HANDOVER_RESULT=done|handed-back|closed|timeout|error:
          done for a key link's save, handed-back for Hand back (or close of a window);
          then HANDOVER_SAVED=<name>,<name>,
          HANDOVER_APP_KEYS=<name>,<name> and HANDOVER_OPENED=yes|no (whether
          anyone opened it) for a key link, then HANDOVER_REPLACED_BY=<folder>
          for a key link that gave way to a newer link from this same chat
  close   close an open link (the person said done); --stopped ends a watch as stopped
  line    set the one line a watch link shows: what the agent does now (exit 1 with no watch open)
  turn    give a watch link's browser to the person, as for a sign-in, until they tap Hand back
          (close, in a window); --note is what to do (exit 1 unless the agent holds it)
  wait on a watch link prints each change once, as HANDOVER_RESULT=opened (the page's first
          load), taken-over, or handed-back, and at the end done
          (close), stopped (close --stopped), or timeout
  install-view
          add the live view's tools once the person agrees: prints
          HANDOVER_INSTALLED=live-view, or HANDOVER_INSTALL=manual and the one
          command for the person, having installed nothing`;
// Chat apps often hide text between tool calls; only the turn's last message shows for sure.
const SEND_REMINDER = 'Run wait in the background, then end this turn with the link above on its own line; text between tool calls may not show.';
const WINDOW_REMINDER = 'Run wait in the background, then end this turn telling the person what to do on the 🔔 tab in the browser window, then to click Hand back at the top of the browser; on done in the chat, run close.';
/** The longest --note. */
const NOTE_MOST = 140;
/** How a view ends by the person's own hand: each wakes the chat. */
const PERSON_ENDS = new Set(['done', 'handed-back']);
const TUNNEL_WAIT_MS = Number(process.env.HANDOVER_TUNNEL_WAIT_MS) || 30_000;
const PAGE_WAIT_MS = 10_000;
const POLL_MS = Number(process.env.HANDOVER_POLL_MS) || 2000;
const KEEP_MS = Number(process.env.HANDOVER_KEEPALIVE_MS) || 60_000;
/** How long an open waits for another process that starts, joins, or ends the view. */
const LOCK_WAIT_MS = TUNNEL_WAIT_MS + PAGE_WAIT_MS + 20_000;
const DIR = join(homedir(), '.wong-stack', 'hand-over');
const LINKS = join(DIR, 'links');
/** The chat's name: its checkout's folder, as the browser session names it. */
const CHAT = sessionName().replace(/^\.+$/, 'default');
const CHAT_DIR = join(LINKS, CHAT);
/** A link's files in `dir`; older code kept them in DIR itself. The timing record stays one for the computer. */
const filesIn = dir => ({ pid: join(dir, 'watcher.pid'), state: join(dir, 'state.json'), result: join(dir, 'result.json'), log: join(dir, 'tunnel.log'), config: join(dir, 'cloudflared.yml'), opened: join(dir, 'opened'), replaced: join(dir, 'replaced.json'), closing: join(dir, 'closing'), shown: join(dir, 'shown'), line: join(dir, 'line.json'), turn: join(dir, 'turn.json'), control: join(dir, 'control.json'), seen: join(dir, 'watch-seen') });
let FILES = { ...filesIn(CHAT_DIR), timings: join(DIR, 'timings.jsonl') };
/** The one live view's place: its watcher, state, tunnel, lock, and `turns/<chat>.json` per turn (`.close` ends it).
 * A chat's own folder keeps its result, and the watcher's pid while its turn is open. */
const VIEW_DIR = join(DIR, 'view');
const TURNS = join(VIEW_DIR, 'turns');
const SHARED = { ...filesIn(VIEW_DIR), lock: join(VIEW_DIR, 'lock'), listed: join(VIEW_DIR, 'listed.json') };
const turnFile = chat => join(TURNS, `${chat}.json`);
const closeFile = chat => join(TURNS, `${chat}.close`);
/** The mark an opener leaves in its chat's folder while a view starts, before its state is written. */
const OPENER = /^view-opener\.(\d+)$/;
/** Removes a link's own files, the pid last: `wait` reads its absence as the end. Its result stays, and
 * so does the give-way record, which `wait` may read after this. */
const clearLink = () => {
  for (const file of [FILES.log, FILES.config, FILES.opened, FILES.state, FILES.closing, FILES.shown, FILES.line, FILES.turn, FILES.control, FILES.seen, FILES.pid]) rmSync(file, { force: true });
};
/** Adds one line to the timing record; a record that can not be written never stops a link. */
const time = (completionId, entry) => {
  try { appendTiming(FILES.timings, { link: linkOf(completionId), ...entry }); } catch { /* no record */ }
};
const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = 'text/javascript; charset=utf-8';
/** The repo's look, `{ css, themeJs }`, from the profile's `look` slot; null for the plain one. */
const look = async () => (await (await slot('look'))?.()) ?? null;
const pages = name => ({
  '/': { file: join(HERE, `${name}.html`), type: 'text/html; charset=utf-8' },
  '/page.mjs': { file: join(HERE, `${name}.mjs`), type: SCRIPT },
  '/page.css': { text: async () => `${(await look())?.css ?? readFileSync(join(HERE, 'plain-look.css'), 'utf8')}\n${readFileSync(join(HERE, 'private-page.css'), 'utf8')}`, type: 'text/css; charset=utf-8' },
  // The light and dark switch, loaded blocking in each page's <head> so a saved dark choice applies before paint.
  '/theme.js': { text: async () => (await look())?.themeJs ?? '', type: SCRIPT },
});
const PAGES = { keys: pages('keys-page'), view: pages('view-page') };
const ROUTES = { keys: KEY_ROUTES, view: VIEW_ROUTES };
const sleep = ms => new Promise(done => setTimeout(done, ms));

const readJson = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };
const readText = file => { try { return readFileSync(file, 'utf8'); } catch { return ''; } };

const watcherPid = (file = FILES.pid) => Number(readText(file).trim()) || null;

/** A link's browser client: it starts no browser and retries no step, so nothing is typed or pressed twice. */
const pageOf = session => browseClient(session, { retry: false, start: false });

/** The link's mode from its state: the key link, or a live view. */
const modeOf = ({ keys } = {}) => (keys ? 'keys' : 'view');

/** Writes `value` as JSON beside `file`, then renames it in: another process never reads half of it. */
function writeWhole(file, value) {
  writeFileSync(`${file}.${process.pid}.tmp`, `${JSON.stringify(value)}\n`, { mode: 0o600 });
  renameSync(`${file}.${process.pid}.tmp`, file);
}

/** Who holds a watch's browser, from the watcher's `control` and the agent's last `turn`: a turn the watcher has not
 * ended is the person's. Each file has one writer, so neither loses the other's change. */
export const controlOf = ({ control = 'assistant', turnDone = 0 } = {}, turn = null) => (turn?.n > turnDone ? 'turn' : control);

/** Who holds this chat's watch link's browser now: `assistant`, `person`, or `turn`; null with no watch. */
export function watchControl() {
  const state = readJson(FILES.state);
  if (!state?.view?.watch || !alive(watcherPid())) return null;
  return controlOf(readJson(FILES.control) ?? {}, readJson(FILES.turn));
}

/** Sets the line this chat's watch link shows; false with no watch open. */
export function setLine(text) {
  if (!watchControl()) return false;
  writeWhole(FILES.line, { text: String(text).replace(/\s+/g, ' ').trim().slice(0, NOTE_MOST) });
  return true;
}

/** Gives the watch's browser to the person until they hand it back, with `note` on the page; false unless the agent
 * holds it. */
export function startTurn(note) {
  if (watchControl() !== 'assistant') return false;
  const n = Math.max(readJson(FILES.turn)?.n ?? 0, readJson(FILES.control)?.turnDone ?? 0) + 1;
  writeWhole(FILES.turn, { n, note });
  return true;
}

/** Ends a link whose watcher can not: puts a view's page back and stops its screen source, kills the
 * tunnel, records the result, and clears the rest. The watcher closes its page first. */
async function teardown(result, { tunnelPid, view, session, completionId } = {}, cause = 'error') {
  // The page gets its size back while the turn still shows its tab, then lets go.
  if (view && !view.window) await endView(view, pageOf(session));
  if (session) await endTurn(pageOf(session));
  await killTunnel(tunnelPid);
  if (completionId) time(completionId, { ended: result, cause });
  writeFileSync(FILES.result, `${JSON.stringify({ result })}\n`);
  clearLink();
}

const BUSY = /the person is using the browser/;
/** Lets go of the person's turn on the page's tab, so other tasks can show their own tabs again. Every end of a turn
 * calls it: done, closed, handed-back, timeout, and an error. */
const endTurn = page => page.front({ turn: false }).catch(() => {});

/** Result-only completion message; routing and private input are never taken from the page. */
export function completionMessage(state, result) {
  const names = list => (list ?? []).filter(name => typeof name === 'string' && /^[a-zA-Z0-9_-]{1,200}$/.test(name));
  return `Private input ended. Resume the existing task once for this completion; if wait already reported it, consume the duplicate without repeating the task. ${JSON.stringify({ completionId: state.completionId, mode: modeOf(state), result: result.result, saved: names(result.saved), appKeys: names(result.appKeys) })}${result.appKeys?.length ? ' Push the saved Worker keys to the live app as the secrets guide requires.' : ''}`;
}

/** Sends `message` to the chat that opened the link, by the profile's `wakeChat` slot: `notified`, `unconfirmed`, or
 * `unavailable` with no slot, when the person says done in the chat instead. */
async function wake(state, message) {
  const send = await slot('wakeChat');
  return send ? send(state, message) : 'unavailable';
}

/** Tells the workspace that opened the link its result is ready: `notified`, `unconfirmed`, or `unavailable`. */
export function notifyWorkspace(state, result) {
  return wake(state, completionMessage(state, result));
}

/** Tears down a link whose watcher died without finishing; a turn in the one live view ends that view. */
async function recoverStale(result) {
  if (existsSync(turnFile(CHAT))) return recoverView(result);
  await teardown(result, readJson(FILES.state) ?? {}, result === 'closed' ? 'close-command' : 'error');
}

/** Serves a page file, or 404 for none. */
function sendFile(page, response) {
  if (!page) return void response.writeHead(404, { 'content-length': 0 }).end();
  response.writeHead(200, { 'content-type': page.type, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY', 'content-security-policy': "frame-ancestors 'none'" });
  if (!page.text) return void response.end(readFileSync(page.file));
  page.text().then(text => response.end(text), () => response.end());
}

/** Serves the link's page on 127.0.0.1:`port`, each route keyed by an `x-hand-over-key` header, except a view's viewer
 * scripts (an `import` sends none). */
export function servePage({ port, key, keys = null, view = null, deadline }, hooks = {}) {
  const sockets = new Set();
  let finishing = false;
  let receipt = null;
  const mode = modeOf({ keys });
  hooks = { ...hooks, isOpen: () => !finishing };
  const routes = mode === 'keys' ? keyRoutes(keys, { ...hooks, closesAt: deadline }) : viewRoutes(view, { ...hooks, closesAt: deadline });
  const bridge = view ? screenBridge({ key, socketPath: socketOf(view.dir), isOpen: () => !finishing }) : null;
  const keyed = request => keyMatches(request.headers['x-hand-over-key'], key);
  /** What a GET of `pathname` serves: a page file, or for a view one of the viewer's scripts. */
  const fileFor = pathname => {
    if (Object.hasOwn(PAGES[mode], pathname)) return PAGES[mode][pathname];
    const file = bridge && viewerFile(pathname);
    return file ? { file, type: SCRIPT } : null;
  };
  const answerReceipt = (request, response) => {
    if (!keyed(request)) return reply(response, 403);
    if (request.method !== 'GET') return reply(response, 405);
    return reply(response, receipt ? 200 : 202, receipt ?? { finishing, now: Date.now() });
  };
  const server = createServer((request, response) => {
    const { pathname } = new URL(request.url, 'http://page');
    if (pathname === '/receipt') return answerReceipt(request, response);
    if (ROUTES[mode].has(pathname)) {
      if (!keyed(request)) return reply(response, 403);
      if (finishing) return reply(response, 410);
      return void routes(pathname, request, response).catch(() => reply(response, 500));
    }
    sendFile(request.method === 'GET' && fileFor(pathname), response);
  });
  server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  server.on('upgrade', (request, socket, head) => (bridge ? bridge(request, socket, head) : socket.destroy()));
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const close = () => new Promise(done => {
        server.close(() => done());
        for (const socket of sockets) socket.destroy();
      });
      close.stopInput = async () => {
        finishing = true;
        bridge?.close();
        const drained = await Promise.race([Promise.resolve(routes.drain?.()).then(() => true), sleep(1000).then(() => false)]);
        if (!drained) { routes.abort?.(); await Promise.race([routes.drain?.(), sleep(100)]); }
      };
      close.setReceipt = value => { receipt = value; };
      resolve(close);
    });
  });
}

/** True once the page answers on `port`, false after PAGE_WAIT_MS or when the watcher dies. */
async function pageAnswers(port, pid) {
  const deadline = Date.now() + PAGE_WAIT_MS;
  while (Date.now() < deadline && alive(pid)) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/`)).ok) return true;
    } catch { /* not listening yet */ }
    await sleep(100);
  }
  return false;
}

/** The `--guide` file's entries for `names`, or null once it has said why not. */
function readGuide(file, names) {
  const { guide, fault } = checkGuide(readJson(file), names);
  if (!fault) return guide;
  console.log(`KEYS_GUIDE=${fault}`);
  console.error('Fix the guide file first: a JSON object keyed by asked-for key name.');
  return null;
}

/** The key link's config, each key with its guide entry, or an exit code once it has said why not:
 * 2 for a name no key file takes or several do, or a bad guide; 1 for a destination not git-ignored. */
async function keyConfig(names, guideFile) {
  let ctx;
  try {
    ctx = primaryRoot();
  } catch (error) {
    console.error(`The key link needs a Git checkout: ${error.message}`);
    return 1;
  }
  const { keys, undeclared, ambiguous, unignored } = resolveKeys(names, ctx, await keyFiles(ctx));
  if (undeclared.length) console.log(`KEYS_UNDECLARED=${undeclared.join(',')}`);
  if (ambiguous.length) console.log(`KEYS_AMBIGUOUS=${ambiguous.join(',')}`);
  if (undeclared.length || ambiguous.length) {
    console.error('Declare each key first, blank and with a comment on where to get it, in the example file of exactly one key file.');
    return 2;
  }
  if (unignored.length) {
    console.error(`Not git-ignored, so no key is written there: ${unignored.join(', ')}`);
    return 1;
  }
  const guide = guideFile === undefined ? {} : readGuide(guideFile, names);
  if (!guide) return 2;
  const { root, primary, linked, gitDir } = ctx;
  return { root, primary, linked, gitDir, keys: keys.map(key => ({ ...key, ...(guide[key.name] && { guide: guide[key.name] }) })) };
}

/** True once the live link has closed for a new one: only a key link nobody has opened gives way. It
 * first records whose place this opener's folder took, for the old link's `wait`. */
async function givesWay(pid) {
  const state = readJson(FILES.state) ?? {};
  if (modeOf(state) !== 'keys' || existsSync(FILES.opened)) return false;
  writeFileSync(FILES.replaced, `${JSON.stringify({ completionId: state.completionId, by: CHAT })}\n`, { mode: 0o600 });
  try { process.kill(pid, 'SIGTERM'); } catch { /* it ended first */ }
  for (let i = 0; i < 80 && alive(pid); i++) await sleep(100);
  return !alive(pid);
}

/** Why a view can not open on `page`, or null: no page answers. The password manager's own page counts as one. */
export async function pageFault(page) {
  const open = await page.url().then(() => true, error => Boolean(error?.addonPage));
  return open ? null : 'No page is open in this browser session; open the site\'s page with browse.mjs first, or name its --session.';
}

/** Says this computer can not show the browser, and resolves to exit code 1. */
function unsupported(reason) {
  console.log('HANDOVER_VIEW=unsupported');
  console.error(`${reason} Give the person steps for their own device instead.`);
  return 1;
}

/** Says why this computer can not open a live view yet, and resolves to the exit code; 0 when it can. */
function viewRefusal() {
  const { unsupported: reason, missing } = checkView();
  if (reason) return unsupported(reason);
  if (!missing.length) return 0;
  console.log('HANDOVER_NEEDS=live-view');
  for (const name of missing) console.error(TOOLS[name]);
  console.error('A live view needs these; ask the person, run `hand-over.mjs install-view`, and retry.');
  return 3;
}

/** A view's state for the session's page, its screen source started. Null, once it has said so, when the browser has
 * no screen. Throws when the source does not start. */
async function openView(session, note, watch = false) {
  const display = screenOf();
  if (!display) return void unsupported('The browser has no screen to show.');
  const size = await sizeOf(pageOf(session));
  // The screen's socket stays in the computer's place: a long chat folder would pass the 108-character socket limit.
  return { note: note ?? null, ...(watch && { watch }), size, display, ...(await startSource(display, mkdtempSync(join(DIR, 'screen-')))) };
}

/** Adds the live view's tools and says how it went; resolves to the exit code. */
async function installViewTools() {
  let result;
  try {
    result = await installView();
  } catch (error) {
    console.error(`The live view's tools are not installed: ${error.message}.`);
    return 1;
  }
  if (result === 'unsupported') return unsupported(OFF_LINUX);
  if (result === 'installed') {
    console.log('HANDOVER_INSTALLED=live-view');
    return 0;
  }
  console.log(`HANDOVER_INSTALL=manual\n${MANUAL}`);
  console.error('Nothing was installed: the two system tools need admin rights this account can not use without a password. Ask the person to run the command above, then run `install-view` again.');
  return 1;
}

const namesIn = dir => { try { return readdirSync(dir, { withFileTypes: true }); } catch { return []; } };

/** True when another live opener in `dir` is starting a view: its state is not written yet. */
const viewOpening = dir => namesIn(dir).some(entry => {
  const pid = Number(OPENER.exec(entry.name)?.[1]);
  return pid && pid !== process.pid && alive(pid);
});

/** The chat whose live view (a watch link or a window turn) is open or opening, or null; a dead watcher reads as
 * closed. `shared`: a window turn, beside which other chats' window turns stand, and an opener counts only here. */
function chatViewHolder(shared = false) {
  const chats = namesIn(LINKS).filter(entry => entry.isDirectory()).map(entry => entry.name);
  for (const [dir, chat] of [[DIR, null], ...chats.map(name => [join(LINKS, name), name])]) {
    const { state, pid } = filesIn(dir);
    const { view, cwd } = readJson(state) ?? {};
    const beside = shared && chat !== CHAT && view?.window && !view.watch;
    if (view && !beside && alive(watcherPid(pid))) return chat ?? (typeof cwd === 'string' ? basename(cwd) : 'another chat');
    if (chat && (!shared || chat === CHAT) && viewOpening(dir)) return chat;
  }
  return null;
}

/** The chat whose live view is open or opening, the one with a tab per chat included, or null. A view shows the
 * browser's one screen, so it counts on the whole computer. */
export function viewHolder() {
  const locker = watcherPid(SHARED.lock);
  const busy = alive(watcherPid(SHARED.pid)) || (locker !== process.pid && alive(locker));
  return chatViewHolder() ?? (busy ? readJson(SHARED.listed)?.shown ?? turnsOnDisk()[0]?.chat ?? 'another chat' : null);
}

/** Says a live view is open in `holder` and resolves to exit code 1, or to 0 with no holder. */
function refuseView(holder) {
  if (!holder) return 0;
  console.error(`A live view is already open in ${holder}.`);
  return 1;
}

async function open(values) {
  const keys = values.keys ? await keyConfig(values.keys, values.guide) : null;
  if (typeof keys === 'number') return keys;
  // A turn by link joins the one live view: only a watch link, or a view in a window, keeps it out. Turns in the
  // window stand side by side, each tab with its bell.
  const window = values.view && !values.watch && checkView().window;
  const turn = values.view && !values.watch && !window;
  const holder = () => (turn ? chatViewHolder() : window ? chatViewHolder(true) : viewHolder());
  const refused = values.view ? refuseView(holder()) || viewRefusal() : 0;
  if (refused) return refused;
  mkdirSync(CHAT_DIR, { recursive: true });
  if (turn) return openTurn(values);
  // Two views opening at once each see the other's mark, written before the second check, until the state stands.
  const mark = values.view ? join(CHAT_DIR, `view-opener.${process.pid}`) : null;
  if (!mark) return startLink(values, keys);
  writeFileSync(mark, `${process.pid}\n`, { mode: 0o600 });
  try {
    return refuseView(holder()) || (await startLink(values, keys));
  } finally {
    rmSync(mark, { force: true });
  }
}

/** Starts the watcher, `watch` or `watch-view`, with `env`; resolves to its pid. */
function startWatcher(env = process.env, command = 'watch') {
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), command], { detached: true, stdio: 'ignore', env });
  if (command === 'watch') writeFileSync(FILES.pid, `${child.pid}\n`);
  child.unref();
  return child.pid;
}

/** Takes the view's lock, so one process at a time starts, joins, closes, or mends the view; true once held. A dead
 * holder's lock, or one left empty, is taken over. */
function tryLock() {
  mkdirSync(TURNS, { recursive: true, mode: 0o700 });
  for (let tries = 0; tries < 2; tries++) {
    try {
      writeFileSync(SHARED.lock, `${process.pid}\n`, { flag: 'wx', mode: 0o600 });
      return true;
    } catch { /* held */ }
    const holder = watcherPid(SHARED.lock);
    if (holder === process.pid) return true;
    const young = Date.now() - (statSync(SHARED.lock, { throwIfNoEntry: false })?.mtimeMs ?? 0) < 5000;
    if (holder ? alive(holder) : young) return false;
    rmSync(SHARED.lock, { force: true });
  }
  return false;
}

/** Waits up to `ms` for the view's lock; true once held. */
async function lockView(ms = LOCK_WAIT_MS) {
  for (const end = Date.now() + ms; !tryLock(); await sleep(100)) if (Date.now() >= end) return false;
  return true;
}

const unlockView = () => { if (watcherPid(SHARED.lock) === process.pid) rmSync(SHARED.lock, { force: true }); };

/** Each turn in the view, from its file: `{chat, note, session, deadline, completionId, joined, size, target}`. */
const turnsOnDisk = () => namesIn(TURNS).map(entry => entry.name).filter(name => name.endsWith('.json'))
  .map(name => ({ ...readJson(join(TURNS, name)), chat: name.slice(0, -5) })).filter(turn => turn.session).sort((a, b) => a.joined - b.joined);

/** Removes the view's own files, the lock last and only when this process holds it. */
function clearView() {
  rmSync(TURNS, { recursive: true, force: true });
  for (const file of [SHARED.log, SHARED.config, SHARED.opened, SHARED.state, SHARED.shown, SHARED.listed, SHARED.pid]) rmSync(file, { force: true });
  unlockView();
}

/** Ends a view whose watcher died: pages back, `result` for this chat and `error` for the others, tunnel and source
 * stopped. Does nothing while another process holds the lock, unless `locked` says this one does. */
async function recoverView(result, locked = false) {
  if (!locked && !tryLock()) return;
  try {
    if (alive(watcherPid(SHARED.pid))) return;
    const state = readJson(SHARED.state) ?? {};
    const shown = readJson(SHARED.listed)?.shown;
    for (const turn of turnsOnDisk()) {
      const page = pageOf(turn.session);
      if (turn.chat === shown && turn.size) await page.resize(...turn.size).catch(() => {});
      await endTurn(page);
      const files = filesIn(join(LINKS, turn.chat));
      const ended = turn.chat === CHAT ? result : 'error';
      time(turn.completionId, { ended, cause: ended === 'closed' ? 'close-command' : 'error' });
      writeFileSync(files.result, `${JSON.stringify({ result: ended })}\n`, { mode: 0o600 });
      rmSync(files.pid, { force: true });
    }
    await killTunnel(state.tunnelPid);
    if (state.view) await stopSource(state.view);
    clearView();
  } finally {
    if (!locked) unlockView();
  }
}

/** Opens this chat's turn in the one live view: starts the view, or joins the open one as a tab that waits for the
 * person's tap. Resolves to the exit code. */
async function openTurn(values) {
  const own = watcherPid();
  if (alive(own) && !(await givesWay(own))) {
    console.error(`A private link is already open in ${CHAT}. Run \`hand-over.mjs close\` first.`);
    return 1;
  }
  if (existsSync(FILES.pid)) await recoverStale('error');
  for (const file of [FILES.result, FILES.opened, FILES.closing, FILES.shown]) rmSync(file, { force: true });
  const session = sessionName(values.session);
  const page = pageOf(session);
  const fault = await pageFault(page);
  if (fault) return turnFailed(fault);
  if (!(await lockView())) return turnFailed('Another chat is still opening the live view; try again in a minute.');
  try {
    if (refuseView(chatViewHolder())) return 1;
    const turn = { note: values.note, session, deadline: Date.now() + values.minutes * 60_000, completionId: randomBytes(16).toString('hex'), joined: Date.now(), target: (await (await slot('chatTarget'))?.()) ?? null };
    return alive(watcherPid(SHARED.pid)) ? await joinView(turn, page) : await startView(turn, page);
  } finally {
    unlockView();
  }
}

/** Says why this chat's turn did not open, records `error` as its result, and resolves to exit code 1. */
function turnFailed(message) {
  if (message) console.error(message);
  writeFileSync(FILES.result, `${JSON.stringify({ result: 'error' })}\n`, { mode: 0o600 });
  rmSync(FILES.pid, { force: true });
  return 1;
}

/** The page's size, which the end of its turn sets back; null on the password manager's page, where the size is the
 * one the site gets back. An older browser server gives none. */
const sizeOf = page => page.size().catch(error => (error.addonPage ? null : Promise.reject(error)));

/** Adds this chat's turn to the open view, behind the tab the person is on, and prints the view's link once the
 * watcher lists it. Resolves to the exit code. */
async function joinView(turn, page) {
  const { origin, key } = readJson(SHARED.state) ?? {};
  try {
    turn.size = await sizeOf(page);
  } catch (error) {
    return turnFailed(error.message);
  }
  const pid = watcherPid(SHARED.pid);
  writeFileSync(FILES.pid, `${pid}\n`);
  writeWhole(turnFile(CHAT), turn);
  for (const end = Date.now() + PAGE_WAIT_MS + POLL_MS; !readJson(SHARED.listed)?.chats?.includes(CHAT); await sleep(100)) {
    if (Date.now() < end && alive(pid)) continue;
    rmSync(turnFile(CHAT), { force: true });
    return turnFailed('The live view did not take this chat\'s tab; try again.');
  }
  console.log(`HANDOVER_LINK=${addressOf(origin, key, CHAT)}`);
  console.log(`HANDOVER_SEND=${SEND_REMINDER}`);
  return 0;
}

/** Starts the one live view with this chat's turn shown: the screen source, the tunnel, and the watcher. Resolves to
 * the exit code once the link answers. */
async function startView(turn, page) {
  if (existsSync(SHARED.pid)) await recoverView('error', true);
  if (!hasCloudflared()) {
    console.log('HANDOVER_NEEDS=cloudflared');
    console.error('Cloudflare\'s tunnel tool, cloudflared, is not installed; ask the person, install it, and retry.');
    return 3;
  }
  let tunnelPid = null;
  let watcher = null;
  let view = null;
  const fail = async message => {
    if (watcher) signal(watcher, 'SIGKILL');
    if (view) await stopSource(view);
    // Only the watcher fits the page, so a page with no watcher yet was never resized.
    if (watcher && turn.size) await page.resize(...turn.size).catch(() => {});
    await endTurn(page);
    await killTunnel(tunnelPid);
    time(turn.completionId, { ended: 'error', cause: 'error' });
    clearView();
    return turnFailed(message);
  };
  // The task's tab comes to the front first; its shared turn holds it, with its bell.
  const busy = await page.front({ turn: true, shared: true }).then(() => null, error => (BUSY.test(error.message) ? error : null));
  if (busy) return fail('The person is using the browser in another chat\'s tab; open this view once their turn ends.');
  const display = screenOf();
  if (!display) return fail(void unsupported('The browser has no screen to show.'));
  try {
    turn.size = await sizeOf(page);
    // The screen's socket stays in the computer's place: a long folder would pass the 108-character socket limit.
    view = { display, ...(await startSource(display, mkdtempSync(join(DIR, 'screen-')))) };
  } catch (error) {
    return fail(error.message);
  }
  const port = await freePort();
  const key = randomBytes(32).toString('hex');
  const tunnelDeadline = Date.now() + TUNNEL_WAIT_MS;
  const tunnelDown = 'The Cloudflare tunnel did not come up within 30 seconds; try again in a minute.';
  const tunnel = await startTunnel(port, tunnelDeadline, SHARED);
  tunnelPid = tunnel.pid;
  if (!tunnel.origin) return fail(tunnelDown);
  const state = { completionId: turn.completionId, chat: CHAT, tunnelPid, port, key, origin: tunnel.origin, view };
  const listing = listingOf({ ...state, deadline: turn.deadline }, tunnel.origin);
  writeWhole(SHARED.state, state);
  writeWhole(turnFile(CHAT), turn);
  // The listing rides in the watcher's environment, never in a file.
  watcher = startWatcher({ ...process.env, HANDOVER_LISTING: JSON.stringify(listing) }, 'watch-view');
  for (const file of [SHARED.pid, FILES.pid]) writeFileSync(file, `${watcher}\n`);
  if (!(await pageAnswers(port, watcher))) return fail('The link\'s page did not start; try again.');
  if (!(await linkAnswers(tunnel.origin, port, tunnelPid, tunnelDeadline))) return fail(tunnelDown);
  console.log(`HANDOVER_LINK=${addressOf(tunnel.origin, key, CHAT)}`);
  console.log(`HANDOVER_SEND=${SEND_REMINDER}`);
  // The watcher lists the link in the inbox once the chat has it, so open returns at once.
  writeFileSync(SHARED.shown, '');
  return 0;
}

const writeState = state => writeFileSync(FILES.state, `${JSON.stringify(state)}\n`, { mode: 0o600 });

/** Opens this chat's link once no other blocks it; resolves to the exit code. A view or watch where the browser has its
 * own window opens no link: the person's turn happens in that window. */
async function startLink(values, keys) {
  const live = watcherPid();
  if (alive(live) && !(await givesWay(live))) {
    console.error(`A private link is already open in ${CHAT}. Run \`hand-over.mjs close\` first.`);
    return 1;
  }
  if (existsSync(FILES.pid)) await recoverStale('error');
  const window = Boolean(values.view && checkView().window);
  if (!window && !hasCloudflared()) {
    console.log('HANDOVER_NEEDS=cloudflared');
    console.error('Cloudflare\'s tunnel tool, cloudflared, is not installed; ask the person, install it, and retry.');
    return 3;
  }
  for (const file of [FILES.result, FILES.opened, FILES.closing, FILES.shown]) rmSync(file, { force: true });
  const deadline = Date.now() + values.minutes * 60_000;
  let tunnelPid = null;
  let watcher = null;
  let view = null;
  const session = values.view ? sessionName(values.session) : null;
  const fail = async message => {
    if (message) console.error(message);
    if (watcher) signal(watcher, 'SIGKILL');
    await teardown('error', { tunnelPid, view, session });
    return 1;
  };
  const fault = session && (await pageFault(pageOf(session)));
  if (fault) return fail(fault);
  // The task's tab comes to the front first, unless another chat's turn is open; its turn holds it, with its bell. A
  // watch whose tab stays behind another chat's turn waits for it.
  const busy = session && (await pageOf(session).front(values.watch ? {} : { turn: true, shared: true }).then(answer => (answer?.behind ? answer : null), error => (BUSY.test(error.message) ? error : null)));
  if (busy) return fail('The person is using the browser in another chat\'s tab; open this view once their turn ends.');
  const completionId = randomBytes(16).toString('hex');
  if (window) {
    view = { note: values.note, ...(values.watch && { watch: true }), window: true };
    writeState({ completionId, session, view, deadline });
    watcher = startWatcher();
    console.log('HANDOVER_VIEW=window');
    console.log(`HANDOVER_SEND=${WINDOW_REMINDER}`);
    return 0;
  }
  if (values.view) {
    try {
      view = await openView(session, values.note, values.watch);
    } catch (error) {
      return fail(error.message);
    }
    if (!view) return fail();
  }
  const port = await freePort();
  const key = randomBytes(32).toString('hex');
  const tunnelDeadline = Date.now() + TUNNEL_WAIT_MS;
  const tunnelDown = 'The Cloudflare tunnel did not come up within 30 seconds; try again in a minute.';
  const tunnel = await startTunnel(port, tunnelDeadline, FILES);
  tunnelPid = tunnel.pid;
  if (!tunnel.origin) return fail(tunnelDown);
  const listing = listingOf({ completionId, key, keys, view, deadline }, tunnel.origin);
  writeState({ completionId, tunnelPid, port, session, key, keys, view, deadline });
  // The listing rides in the watcher's environment, never in a file.
  watcher = startWatcher({ ...process.env, HANDOVER_LISTING: JSON.stringify(listing) });
  if (!(await pageAnswers(port, watcher))) return fail('The link\'s page did not start; try again.');
  if (!(await linkAnswers(tunnel.origin, port, tunnelPid, tunnelDeadline))) return fail(tunnelDown);
  console.log(`HANDOVER_LINK=${addressOf(tunnel.origin, key)}`);
  console.log(`HANDOVER_SEND=${SEND_REMINDER}`);
  // The watcher lists the link in the inbox once the chat has it, so open returns at once.
  writeFileSync(FILES.shown, '');
  return 0;
}

/** The link's address: the page, with its key, and a turn's chat whose tab it opens, in the `#` part, which no
 * request carries. */
const addressOf = (origin, key, chat) => `${origin}/#key=${key}${chat ? `&chat=${encodeURIComponent(chat)}` : ''}`;

/** What the inbox lists for a link: its address and a title from what the opener has, never a value or a note. */
export function listingOf({ completionId, key, keys, view, deadline }, origin, cwd = process.cwd()) {
  const [what, title] = keys ? ['key', keys.keys.map(each => each.guide?.title ?? readableName(each.name)).join(', ')] : ['view', view?.watch ? 'Connect your tools' : 'Your turn in the browser'];
  return { id: completionId, what, title: title.slice(0, 200), url: addressOf(origin, key), closesAt: deadline, workspace: basename(cwd).slice(0, 100) };
}

/** Lists a link in the profile's `inbox`; resolves to the client that closes it, or null with no inbox or no app. */
async function list(listing) {
  const inbox = await slot('inbox');
  const client = await inbox?.companyFor();
  if (client) await inbox.listLink(client, listing);
  return client ?? null;
}

/** The inbox's listing of a link: `list()` once open has printed it, and `unlist()`, which every end calls. */
function inboxListing(listing) {
  let listed = null;
  return {
    list: () => { if (!listed && listing && existsSync(FILES.shown)) listed = list(listing); },
    // One 3 s limit for the listing and its close together: a stalled app never holds the link's end back.
    unlist: async () => {
      const inbox = listed && (await slot('inbox'));
      return inbox?.inTime((async () => {
        const client = await listed;
        if (client) await inbox.closeItem(client, listing.id);
      })());
    },
  };
}

/** Serves the page until Hand back, a key link's save, `close`, or the deadline; a window view serves none. Polls
 * never read the page; one call a minute keeps an idle page. */
async function watch() {
  const state = readJson(FILES.state);
  if (!state) return 1;
  const listing = JSON.parse(process.env.HANDOVER_LISTING ?? 'null');
  delete process.env.HANDOVER_LISTING;
  const began = Date.now();
  let done = false;
  let closePage = null;
  const page = state.session ? pageOf(state.session) : null;
  const window = Boolean(state.view?.window);
  const live = state.view && !window ? liveView(state.view, page) : null;
  const watchSide = watchLink(state);
  const saved = state.keys ? [] : undefined;
  const saveState = () => writeState(state);
  const inbox = inboxListing(listing);
  /** Writes `outcome` as the result, tells the chat when `notifies`, and writes it again with how that went. */
  const publish = async (outcome, notifies) => {
    outcome.notification = notifies ? 'pending' : 'not-requested';
    writeFileSync(FILES.result, `${JSON.stringify(outcome)}\n`, { mode: 0o600 });
    if (notifies) outcome.notification = await notifyWorkspace(state, outcome);
    writeFileSync(FILES.result, `${JSON.stringify(outcome)}\n`, { mode: 0o600 });
    return outcome;
  };
  let finishingPromise = null;
  /** Ends the link once; resolves to its outcome, then closes the page and the tunnel and exits. */
  const finish = (result, { ready = PERSON_ENDS.has(result), cause = 'page' } = {}) => {
    if (finishingPromise) return finishingPromise;
    done = true;
    time(state.completionId, { ended: result, cause, ms: Date.now() - began });
    finishingPromise = (async () => {
      await closePage?.stopInput();
      await live?.end();
      if (state.view) await endTurn(page);
      const appKeys = state.keys && saved.filter(name => state.keys.keys.some(key => key.name === name && key.app));
      const outcome = await publish({ result, ready, ...(saved && { saved }), ...(appKeys && { appKeys }), ...(state.keys && { opened: existsSync(FILES.opened) }), completionId: state.completionId }, ready);
      closePage?.setReceipt(outcome);
      // Receipt delivery is independent of the client: even a vanished client cannot retain input.
      const shutDown = sleep(closePage ? 1200 : 0).then(async () => {
        await closePage?.();
        await killTunnel(state.tunnelPid);
      });
      void Promise.all([shutDown, inbox.unlist()]).then(() => {
        clearLink();
        process.exit(0);
      });
      return outcome;
    })();
    return finishingPromise;
  };
  /** What sent a signal: the close command, a newer link this one gave way to, or the signal alone. */
  const causeOf = sig => (existsSync(FILES.closing) ? 'close-command' : readJson(FILES.replaced)?.completionId === state.completionId ? 'gave-way' : sig);
  // In a window the person says done in the chat, and the agent's close is their Hand back.
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(sig, () => finish(watchSide ? watchSide.ending() : window ? 'handed-back' : 'closed', { ready: false, cause: causeOf(sig) }));
  const hooks = { onSaved: name => { if (!saved.includes(name)) saved.push(name); }, onDone: ready => finish('done', { ready }), onContinue: () => finish('done'), onOpened: () => writeFileSync(FILES.opened, ''), fitted: () => live.describe(), onFit: kind => live.fit(kind), watch: watchSide?.hooks };
  try {
    await live?.fit();
    // A close that came during the first fit has ended the link: no page is served after it.
    if (!done && !window) closePage = await servePage(state, hooks);
  } catch {
    return finish('error', { cause: 'error' });
  }
  let holding = !watchSide;
  /** Holds the turn on the page's tab: a live view selects it again unless a tab opened in the turn or a pop-up shows;
   * a window keeps it as a shared turn with its bell. Resolves to whether the person clicked Hand back. */
  const holdTurn = async (person, popup = false) => {
    // An ended view has let go of its turn; a late poll never takes it again.
    if (done || (!person && !holding)) return false;
    holding = person;
    const hold = window ? { turn: true, raise: false, ...(!watchSide && { shared: true }) } : { turn: true, ...(popup ? { raise: false } : { reselect: true }) };
    return (await page.front(person ? hold : { turn: false }).catch(() => null))?.handedBack === true;
  };
  /** One poll of a view: a stopped screen source starts again, the turn is renewed, and the tab and window come to
   * the front unless a pop-up shows. Resolves to 'error' when the source can not start, 'handed-back', or null. */
  const pollView = async () => {
    try {
      if (await live?.revive()) saveState();
    } catch {
      return 'error';
    }
    if (await holdTurn(!watchSide || watchSide.personHolds(), live?.popupOpen())) return 'handed-back';
    live?.front();
    return null;
  };
  /** The call the server counts as use, which keeps the link's page open: a view's fit again, else a constant. A fit
   * brings the tab to the front, which would cover a shown pop-up. */
  const keepOpen = () => (live && !live.popupOpen() ? live.fit() : page.keepAlive());
  let keepAt = Date.now() + KEEP_MS;
  while (!done) {
    inbox.list();
    if (Date.now() >= state.deadline) return finish('timeout', { cause: 'deadline' });
    const ended = state.view && (await pollView());
    if (ended) return finish(ended, { cause: ended === 'error' ? 'error' : 'hand-back' });
    if (page && !done && Date.now() >= keepAt) {
      keepAt = Date.now() + KEEP_MS;
      await keepOpen().catch(() => {});
    }
    await sleep(Math.min(POLL_MS, Math.max(0, state.deadline - Date.now())));
  }
}

/** Serves the one live view: each turn file's tab holds a shared turn with its bell, the view fits the bell tab shown,
 * and the browser's Hand back ends each at its renewal. Every change to the turns runs in order, polls included. */
async function watchView() {
  FILES = { ...SHARED, timings: FILES.timings };
  const state = readJson(FILES.state);
  if (!state) return 1;
  const inbox = inboxListing(JSON.parse(process.env.HANDOVER_LISTING ?? 'null'));
  delete process.env.HANDOVER_LISTING;
  const live = liveView(state.view);
  const turns = new Map();
  // Chats whose turn ended last: each `wait` returns once the view has closed, or once another chat joins.
  const held = new Set();
  // Ended turns' fitted pages behind another tab, which get their size back once no turn is left.
  const unsized = [];
  let shown = null;
  let done = false;
  let receipt = null;
  let closePage = null;
  let queue = Promise.resolve();
  const inOrder = job => {
    const run = queue.then(job);
    queue = run.catch(() => {});
    return run;
  };
  const record = () => writeWhole(SHARED.listed, { chats: [...turns.keys()], shown });
  const putBack = turn => turn.size && turn.page.resize(...turn.size).catch(() => {});
  /** Ends a turn in the browser and gives its fitted page its size back. A resize shows its tab, so a page behind
   * waits until the last turn has ended there, and the page shown goes last. */
  const endAndSizeBack = async (turn, front) => {
    if (turn.fitted && !front) unsized.push(turn);
    if (turn.fitted && front && turns.size) await putBack(turn);
    await endTurn(turn.page);
    if (turns.size) return;
    for (const each of unsized.splice(0)) await putBack(each);
    if (turn.fitted && front) await putBack(turn);
  };
  /** Shows `chat`'s page in the view, fitted, or none; a page keeps its fit when the person picks another tab. */
  const show = async chat => {
    const turn = turns.get(chat);
    await live.show(turn?.page ?? null);
    shown = turn ? chat : null;
    if (turn) turn.fitted = true;
    if (turn) await live.fit();
    record();
  };
  const release = () => {
    for (const chat of held) rmSync(filesIn(join(LINKS, chat)).pid, { force: true });
    held.clear();
  };
  /** Adds each new turn file, oldest first, as a shared turn with its bell; its tab comes to the front only when no
   * other turn is open. */
  const addTurns = async () => {
    const fresh = turnsOnDisk().filter(turn => !turns.has(turn.chat));
    for (const turn of fresh) {
      turns.set(turn.chat, { ...turn, page: pageOf(turn.session) });
      await turns.get(turn.chat).page.front({ turn: true, shared: true }).catch(() => {});
    }
    if (!fresh.length) return;
    release();
    record();
  };
  /** Marks `chat`'s turn as ending; its chat's name, or null when it is gone or already ending. */
  const claim = chat => {
    const turn = turns.get(chat);
    if (!turn || turn.ending) return null;
    turn.ending = true;
    return turn.chat;
  };
  /** Ends a claimed turn, its bell gone, and gives its chat alone the result. */
  const endOne = async (chat, result, cause) => {
    const turn = turns.get(chat);
    time(turn.completionId, { ended: result, cause, ms: Date.now() - turn.joined });
    turns.delete(chat);
    const front = chat === shown;
    if (front) await show(null);
    await endAndSizeBack(turn, front);
    record();
    for (const file of [turnFile(chat), closeFile(chat)]) rmSync(file, { force: true });
    receipt = await publishTurn(state, turn, result);
    if (turns.size) rmSync(filesIn(join(LINKS, chat)).pid, { force: true });
    else held.add(chat);
  };
  const endAll = async (result, cause) => {
    for (const chat of turns.keys()) if (claim(chat)) await endOne(chat, result, cause);
  };
  const finish = () => {
    if (done) return;
    done = true;
    void (async () => {
      await closePage?.stopInput();
      await live.end();
      closePage?.setReceipt(receipt ?? { result: 'closed' });
      const shutDown = sleep(closePage ? 1200 : 0).then(async () => {
        await closePage?.();
        await killTunnel(state.tunnelPid);
      });
      await Promise.all([shutDown, inbox.unlist()]);
      release();
      clearView();
      process.exit(0);
    })();
  };
  /** Closes the view once no turn is left, unless a chat is joining: the lock holds off a new turn meanwhile. */
  const closeIfEmpty = async () => {
    if (done || turns.size || !tryLock()) return;
    await addTurns();
    if (turns.size) return unlockView();
    finish();
  };
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(sig, () => void inOrder(async () => { await endAll('closed', sig); finish(); }));
  const tabs = () => {
    const open = [...turns.values()].filter(turn => !turn.ending);
    return { closesAt: Math.max(0, ...open.map(turn => turn.deadline)) || null, shown, tabs: open.map(turn => ({ chat: turn.chat, note: turn.note })) };
  };
  const hooks = {
    onOpened: () => writeFileSync(FILES.opened, ''),
    fitted: () => live.describe(),
    onFit: kind => live.fit(kind),
    tabs,
    // A chat's link shows its tab on the link's first load: the fit's resize brings it to the front.
    onShow: chat => inOrder(async () => {
      if (!turns.has(chat) || turns.get(chat).ending) return false;
      await show(chat);
      return true;
    }),
  };
  /** The chat whose bell tab the browser shows, or null: a tab behind another reads hidden. */
  const shownInBrowser = async () => {
    for (const turn of turns.values()) if (await turn.page.shown().catch(() => false)) return turn.chat;
    return null;
  };
  /** Renews each turn, the shown one last; the browser's Hand back has ended each one that answers `handedBack`. */
  const renew = async () => {
    for (const turn of [...turns.values()].sort((a, b) => (a.chat === shown) - (b.chat === shown))) {
      const answer = await turn.page.front({ turn: true, shared: true, raise: false }).catch(() => null);
      if (answer?.handedBack && claim(turn.chat)) await endOne(turn.chat, 'handed-back', 'hand-back');
    }
  };
  /** One poll: new turns join, a closed, late, or handed-back turn ends, and the view fits the bell tab the person
   * picked, or the oldest when the shown one ended. */
  const poll = async () => {
    await addTurns();
    for (const turn of turns.values()) {
      const why = existsSync(closeFile(turn.chat)) ? ['closed', 'close-command'] : Date.now() >= turn.deadline ? ['timeout', 'deadline'] : null;
      if (why && claim(turn.chat)) await endOne(turn.chat, ...why);
    }
    try {
      if (!done && await live.revive()) writeWhole(FILES.state, state);
    } catch {
      await endAll('error', 'error');
      return finish();
    }
    await renew();
    await closeIfEmpty();
    if (done || !turns.size) return;
    const picked = await shownInBrowser();
    if (picked ? picked !== shown : !turns.has(shown)) await show(picked ?? turns.keys().next().value);
    live.front();
  };
  try {
    await inOrder(async () => {
      await addTurns();
      await show(turns.keys().next().value ?? null);
    });
    if (!done) closePage = await servePage(state, hooks);
  } catch {
    await inOrder(() => endAll('error', 'error'));
    return finish();
  }
  let keepAt = Date.now() + KEEP_MS;
  while (!done) {
    inbox.list();
    await inOrder(poll);
    // Each renewal keeps its page open; the shown page is fitted again, so one back from the password manager's page
    // fits under the bar. A fit brings the tab up, which would cover a shown pop-up.
    if (!done && Date.now() >= keepAt) {
      keepAt = Date.now() + KEEP_MS;
      await inOrder(() => (shown && !live.popupOpen() ? live.fit() : null));
    }
    const next = Math.min(...[...turns.values()].map(turn => turn.deadline));
    await sleep(Math.min(POLL_MS, Math.max(0, next - Date.now())));
  }
}

/** Writes a turn's result in its chat's folder, then wakes that chat, and only that chat, when the person ended it. A
 * chat named by no target is the one that started the watcher, whose own environment names it. */
async function publishTurn(state, turn, result) {
  const file = filesIn(join(LINKS, turn.chat)).result;
  const ready = PERSON_ENDS.has(result);
  const outcome = { result, ready, completionId: turn.completionId, notification: ready ? 'pending' : 'not-requested' };
  writeFileSync(file, `${JSON.stringify(outcome)}\n`, { mode: 0o600 });
  const target = turn.target ?? (turn.chat === state.chat ? {} : null);
  if (ready) outcome.notification = target ? await wake({ ...target, completionId: turn.completionId }, completionMessage(turn, outcome)) : 'unavailable';
  writeFileSync(file, `${JSON.stringify(outcome)}\n`, { mode: 0o600 });
  return outcome;
}

/** A watch link's side of the watcher, or null for any other link: it alone writes `control`, and wakes the chat when
 * the person takes the browser. Each change is an event `wait` prints once. */
function watchLink(state) {
  if (!state.view?.watch) return null;
  let control = { control: 'assistant', turnDone: 0, opened: false, event: null };
  const now = () => controlOf(control, readJson(FILES.turn));
  const change = (next, result) => {
    control = { ...control, ...next, event: { n: (control.event?.n ?? 0) + 1, result } };
    writeWhole(FILES.control, control);
    if (result === 'taken-over') void wake(state, watchMessage(state, result));
    return info();
  };
  const endTurn = result => change({ control: 'assistant', turnDone: readJson(FILES.turn)?.n ?? control.turnDone }, result);
  const info = () => {
    const holder = now();
    const line = holder === 'turn' ? readJson(FILES.turn)?.note : readJson(FILES.line)?.text ?? state.view.note;
    return { control: holder, ...(line && { line }) };
  };
  writeWhole(FILES.control, control);
  return {
    hooks: {
      info,
      shown: () => { if (!control.opened) change({ opened: true }, 'opened'); },
      take: () => (now() === 'assistant' ? change({ control: 'person' }, 'taken-over') : null),
      give: () => (['person', 'turn'].includes(now()) ? endTurn('handed-back') : null),
    },
    /** Whether the person holds the browser: they took over, or it is their turn. */
    personHolds: () => now() !== 'assistant',
    /** How a close ends the watch: stopped when the chat stopped it, else done. */
    ending: () => (readText(FILES.closing).trim() === 'stopped' ? 'stopped' : 'done'),
  };
}

/** What wakes the chat when the person takes a watch's browser: the event alone, never the page. */
const watchMessage = (state, result) => `The watch link changed: the person took over the browser. Run hand-over.mjs wait in the background, and send the browser nothing until it prints handed-back. ${JSON.stringify({ completionId: state.completionId, mode: 'watch', result })}`;

/** The watch event `wait` has not printed yet, marked as printed; null when there is none. */
function newWatchEvent() {
  const event = readJson(FILES.control)?.event;
  if (!event || event.n <= Number(readText(FILES.seen).trim() || 0)) return null;
  writeFileSync(FILES.seen, `${event.n}\n`, { mode: 0o600 });
  return event;
}

/** The folder name of the opener whose link took this one's place, on one line, or null. */
function replacedBy(completionId) {
  const record = readJson(FILES.replaced);
  const mine = completionId && record?.completionId === completionId && typeof record.by === 'string';
  return mine ? record.by.replace(/[\r\n]+/g, ' ') : null;
}

function report({ result, saved, appKeys, opened, completionId, notification }) {
  console.log(`HANDOVER_RESULT=${result}`);
  if (Array.isArray(saved)) console.log(`HANDOVER_SAVED=${saved.join(',')}`);
  if (Array.isArray(appKeys)) console.log(`HANDOVER_APP_KEYS=${appKeys.join(',')}`);
  if (typeof opened === 'boolean') console.log(`HANDOVER_OPENED=${opened ? 'yes' : 'no'}`);
  const by = replacedBy(completionId);
  if (by) console.log(`HANDOVER_REPLACED_BY=${by}`);
  if (completionId) console.log(`HANDOVER_COMPLETION=${completionId}`);
  if (notification) console.log(`HANDOVER_NOTIFICATION=${notification}`);
  return 0;
}

/** True when the link `wait` began on, `mine`, gave way: another link holds the state, or took its result. */
function gaveWay(mine, outcome) {
  const current = readJson(FILES.state)?.completionId;
  if (current) return current !== mine;
  return outcome.completionId ? outcome.completionId !== mine : !outcome.result && !existsSync(FILES.pid);
}

/** This chat's older link in the shared place: its state names this chat by folder or session; its watcher lives. */
function ownOlderLink() {
  const old = filesIn(DIR);
  const { cwd, session } = readJson(old.state) ?? {};
  const mine = (typeof cwd === 'string' && sessionName(cwd) === CHAT) || session === CHAT;
  return mine && alive(watcherPid(old.pid)) ? old : null;
}

/** Points `wait` and `close` at this chat's older link when the chat never had a link of its own; another chat's
 * stays. A result left by this chat's own link keeps its `wait` and `close` here. */
function useOwnPlace() {
  const old = ![FILES.pid, FILES.state, FILES.result].some((file) => existsSync(file)) && ownOlderLink();
  if (old) FILES = { ...old, timings: FILES.timings };
}

/** Blocks until the watcher records a result, recovering a dead watcher; a watching result reports once unless `final`.
 * A key link that gave way reports `closed`, unopened, with nothing saved, never the newer link's result. */
async function wait({ final = false } = {}) {
  useOwnPlace();
  const mine = readJson(FILES.state)?.completionId;
  const watchOpen = Boolean(readJson(FILES.state)?.view?.watch);
  for (;;) {
    const event = watchOpen && !final && newWatchEvent();
    if (event) {
      console.log(`HANDOVER_RESULT=${event.result}`);
      return 0;
    }
    // The watcher writes its result, then removes its pid: look for the pid first, so a result between the two is read.
    const running = existsSync(FILES.pid);
    const outcome = readJson(FILES.result) ?? {};
    if (mine && gaveWay(mine, outcome)) return report({ result: 'closed', saved: [], appKeys: [], opened: false, completionId: mine, notification: 'not-requested' });
    const landed = outcome.result && outcome.notification !== 'pending';
    if (landed && !existsSync(FILES.pid)) return report(outcome);
    if (!running) {
      console.error('No private link is open.');
      return 1;
    }
    if (!alive(watcherPid())) await recoverStale('error');
    await sleep(250);
  }
}

async function close({ stopped = false } = {}) {
  useOwnPlace();
  const pid = watcherPid();
  if (!pid) {
    console.error('No private link is open.');
    return 0;
  }
  // A turn in the one live view asks its watcher to end that turn alone; the view stays for the other chats.
  if (alive(pid) && pid === watcherPid(SHARED.pid)) {
    if (existsSync(turnFile(CHAT))) writeFileSync(closeFile(CHAT), '', { mode: 0o600 });
    return wait({ final: true });
  }
  if (alive(pid)) {
    writeFileSync(FILES.closing, stopped ? 'stopped' : '', { mode: 0o600 });
    process.kill(pid, 'SIGTERM');
    for (let i = 0; i < 50 && alive(pid); i++) await sleep(100);
  }
  // A watcher signalled before it set its handlers dies without a result; the close still stands.
  if (alive(pid)) return wait({ final: true });
  if (!readJson(FILES.result)?.result) await recoverStale('closed');
  return wait({ final: true });
}

function usageError(message) {
  console.error(`${message}\n${USAGE}`);
  process.exit(2);
}

function parse(args) {
  let parsed;
  try {
    parsed = parseArgs({ args, allowPositionals: true, strict: true, options: { view: { type: 'boolean' }, watch: { type: 'boolean' }, stopped: { type: 'boolean' }, note: { type: 'string' }, session: { type: 'string' }, keys: { type: 'string' }, guide: { type: 'string' }, minutes: { type: 'string' }, help: { type: 'boolean' } } });
  } catch (error) {
    usageError(error.message);
  }
  const { values } = parsed;
  if (values.help) {
    console.log(USAGE);
    process.exit(0);
  }
  const [command, ...rest] = parsed.positionals;
  if (!['open', 'watch', 'watch-view', 'wait', 'close', 'install-view', 'line', 'turn'].includes(command) || rest.length !== (command === 'line' ? 1 : 0)) usageError(command ? `unknown command: ${[command, ...rest].join(' ')}` : 'missing command');
  if (values.stopped && command !== 'close') usageError('--stopped goes with close only');
  // A live view holds a browser open while it waits, so it keeps the shorter day.
  const minutes = Number(values.minutes ?? (values.view || values.watch ? 480 : 1440));
  if (!(minutes > 0)) usageError('--minutes must be a positive number');
  if (command === 'open') checkMode(values);
  if (command === 'line' && !oneLine(rest[0], 2000)) usageError('line takes one line of text');
  if (command === 'turn') checkTurn(values);
  // A watch is a live view the agent drives: every view rule holds for it.
  return { command, values: { ...values, minutes, ...(values.watch && { view: true }), ...(command === 'line' && { text: rest[0] }), ...(values.keys !== undefined && { keys: keyNames(values.keys) }) } };
}

/** `open` takes one mode, and each flag goes with its own mode only, or a usage error. */
function checkMode(values) {
  if (values.guide !== undefined && values.keys === undefined) usageError('--guide goes with --keys only');
  if ([values.keys, values.view, values.watch].filter(mode => mode !== undefined).length !== 1) usageError('open takes one of --keys, --view, or --watch');
  if (values.keys !== undefined) {
    if (['session', 'note'].some(name => values[name] !== undefined)) usageError('--session and --note go with --view only');
    return;
  }
  if (values.watch) {
    if (values.note !== undefined && !oneLine(values.note, NOTE_MOST)) usageError(`--note takes one line of up to ${NOTE_MOST} characters`);
    return;
  }
  if (values.note === undefined || !oneLine(values.note, NOTE_MOST)) usageError(`--view needs --note, the one line the person sees: what to do now, up to ${NOTE_MOST} characters`);
}

/** `turn` takes a one-line `--note`, and nothing else, or a usage error. */
function checkTurn(values) {
  if (Object.keys(values).some(name => name !== 'note')) usageError('turn takes --note only');
  if (values.note === undefined || !oneLine(values.note, NOTE_MOST)) usageError(`turn takes --note, one line of up to ${NOTE_MOST} characters`);
}

/** `line`: sets the watch link's line; exit 1 with no watch open. */
function lineCommand({ text }) {
  if (setLine(text)) return 0;
  console.error('No watch link is open in this chat.');
  return 1;
}

/** `turn`: gives the watch link's browser to the person; exit 1 unless the agent holds it. */
function turnCommand(values) {
  if (startTurn(values.note)) return 0;
  const holder = watchControl();
  console.error(holder ? `The watch link's browser is not the assistant's now: ${holder}.` : 'No watch link is open in this chat.');
  return 1;
}

/** True for one line of text, not blank, of at most `most` characters. */
const oneLine = (text, most) => Boolean(text.trim()) && !/[\r\n]/.test(text) && text.length <= most;

/** `--keys`' comma-separated names, each once, or a usage error. */
function keyNames(list) {
  const names = [...new Set(list.split(',').map(name => name.trim()))];
  const bad = names.filter(name => !KEY_NAME.test(name));
  if (bad.length || !names.length) usageError(`--keys takes names like EXAMPLE_API_KEY: ${bad.map(name => `'${name}'`).join(', ')}`);
  if (names.length > KEY_LIMITS.names) usageError(`--keys takes at most ${KEY_LIMITS.names} names`);
  return names;
}

if (isMain(import.meta.url)) {
  const { command, values } = parse(process.argv.slice(2));
  const run = { open: () => open(values), watch, 'watch-view': watchView, wait, close: () => close(values), 'install-view': installViewTools, line: () => lineCommand(values), turn: () => turnCommand(values) }[command];
  const code = await run();
  process.exitCode = typeof code === 'number' ? code : 0;
}
