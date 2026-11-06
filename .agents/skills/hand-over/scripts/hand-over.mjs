#!/usr/bin/env node
// Opens a private link that closes itself: the key link, or a live view for the person's turn in the browser.
// One link per chat, in ~/.wong-stack/hand-over/links/. Exit codes: 0 ok · 1 failed · 2 usage · 3 a tool is missing.

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { primaryRoot } from '../../memory/scripts/lib/primary-root.mjs';
import { lookCss } from '../../plan/scripts/look.mjs';
import { client as browseClient, sessionName } from '../../browser/scripts/browse.mjs';
import { APP_FILE, checkGuide, KEY_ROUTES, keyRoutes, LIMITS as KEY_LIMITS, NAME as KEY_NAME, resolveKeys } from './keys.mjs';
import { readableName } from './keys-page.mjs';
import { closeItem, companyFor, inTime, listLink } from './lib/inbox.mjs';
import { appendTiming, linkOf } from './lib/timings.mjs';
import { alive, freePort, hasCloudflared, keyMatches, killTunnel, linkAnswers, signal, startTunnel } from './lib/tunnel.mjs';
import { chatTarget, wakeChat } from './lib/wake.mjs';
import { screenBridge } from './lib/ws-bridge.mjs';
import { checkView, endView, installView, liveView, MANUAL, OFF_LINUX, reply, screenOf, socketOf, startSource, TOOLS, VIEW_ROUTES, viewerFile, viewRoutes } from './view.mjs';

export { keyMatches, tunnelOrigin } from './lib/tunnel.mjs';

const USAGE = `usage: hand-over.mjs open --view <finish> --note <line> [--session <name>] [--minutes N]
       hand-over.mjs open --view --keep-open --note <line> [--session <name>] [--minutes N]
       hand-over.mjs open --watch [--session <name>] [--note <line>] [--minutes N]
       hand-over.mjs open --keys NAME[,NAME] [--guide <file>] [--minutes N]
       hand-over.mjs wait | close [--stopped] | install-view
       hand-over.mjs line <text> | turn <finish> --note <line>
  open    start the private link, print HANDOVER_LINK=<url> once it answers through
          Cloudflare, then HANDOVER_SEND=<reminder to end the turn with the link>, list its address
          in the app's inbox, and watch for the finish
          --view: the person's turn in the browser, as a live view of the --session page: a
          payment, a backup code, a sign-in, a check that asks whether a person is there, or a
          stuck step; the person types or pastes on the real site, and the agent sees nothing
          until the turn ends; the page shows --note as its one line (what to do now), with
          Hand back; open for 480 minutes
          <finish>: one or more of --until <glob> (the address), --until-gone <selector>
          (no match shown), and --until-text <words> (shown on the page); all must hold
          --keep-open, in place of a finish: the turn ends only on Hand back, close, or the time
          limit; it reads no finish
          HANDOVER_VIEW=window, with no link, where the browser shows in its own window: the
          page is brought to the front, the person does the step there and says done in the
          chat, and close ends the turn; HANDOVER_VIEW=unsupported where the browser has no
          screen to show, and HANDOVER_NEEDS=live-view (exit 3) with a line per missing tool
          --watch: a live view the agent drives while the person watches, as one
          for connecting tools: the person's taps reach the browser only after they
          tap Take over, or on their turn; it reads no finish and ends at close;
          open for 480 minutes, the one live view as --view is
          --keys: one box per declared name; it ends on cancellation or
          once every key is saved (exit 2 with KEYS_UNDECLARED= or KEYS_AMBIGUOUS=);
          an unopened one gives way to a new open from the same chat
          --guide: a JSON file keyed by name, each with any of title, url, open,
          steps, and check {url, auth}, shown on the key page (exit 2 with KEYS_GUIDE=)
          --minutes: time limit for any link, default 1440 (24 hours); 480 for --view
  wait    block until the link closes; print HANDOVER_RESULT=done|handed-back|closed|timeout|error:
          for a view, done when the page meets the finish, handed-back on Hand back (or close of a
          window); then HANDOVER_SAVED=<name>,<name>,
          HANDOVER_APP_KEYS=<name>,<name> and HANDOVER_OPENED=yes|no (whether
          anyone opened it) for a key link, then HANDOVER_REPLACED_BY=<folder>
          for a key link that gave way to a newer link from this same chat
  close   close an open link (the person said done); --stopped ends a watch as stopped
  line    set the one line a watch link shows: what the agent does now (exit 1 with no watch open)
  turn    give a watch link's browser to the person, as for a sign-in, until the page meets the
          finish or they tap Hand back; --note is what to do (exit 1 unless the agent holds it)
  wait on a watch link prints each change once, as HANDOVER_RESULT=opened (the page's first
          load), taken-over, handed-back, or signed-in (a turn's finish), and at the end done
          (close), stopped (close --stopped), or timeout
  install-view
          add the live view's tools once the person agrees: prints
          HANDOVER_INSTALLED=live-view, or HANDOVER_INSTALL=manual and the one
          command for the person, having installed nothing`;
// Chat apps often hide text between tool calls; only the turn's last message shows for sure.
const SEND_REMINDER = 'Run wait in the background, then end this turn with the link above on its own line; text between tool calls may not show.';
const WINDOW_REMINDER = 'Run wait in the background, then end this turn telling the person what to do in the browser window, and to say done there in the chat; on done, run close.';
/** The longest --note or --until-text. */
const NOTE_MOST = 140;
/** How a view ends by the person's own hand: each wakes the chat. */
const PERSON_ENDS = new Set(['done', 'handed-back']);
const TUNNEL_WAIT_MS = Number(process.env.HANDOVER_TUNNEL_WAIT_MS) || 30_000;
const PAGE_WAIT_MS = 10_000;
const POLL_MS = Number(process.env.HANDOVER_POLL_MS) || 2000;
const KEEP_MS = Number(process.env.HANDOVER_KEEPALIVE_MS) || 60_000;
const DIR = join(homedir(), '.wong-stack', 'hand-over');
const LINKS = join(DIR, 'links');
/** The chat's name: its checkout's folder, as the browser session names it. */
const CHAT = sessionName().replace(/^\.+$/, 'default');
const CHAT_DIR = join(LINKS, CHAT);
/** A link's files in `dir`; older code kept them in DIR itself. The timing record stays one for the computer. */
const filesIn = dir => ({ pid: join(dir, 'watcher.pid'), state: join(dir, 'state.json'), result: join(dir, 'result.json'), log: join(dir, 'tunnel.log'), config: join(dir, 'cloudflared.yml'), opened: join(dir, 'opened'), replaced: join(dir, 'replaced.json'), closing: join(dir, 'closing'), shown: join(dir, 'shown'), line: join(dir, 'line.json'), turn: join(dir, 'turn.json'), control: join(dir, 'control.json'), seen: join(dir, 'watch-seen') });
let FILES = { ...filesIn(CHAT_DIR), timings: join(DIR, 'timings.jsonl') };
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
const pages = name => ({
  '/': { file: join(HERE, `${name}.html`), type: 'text/html; charset=utf-8' },
  '/page.mjs': { file: join(HERE, `${name}.mjs`), type: SCRIPT },
  '/page.css': { text: () => `${lookCss()}\n${readFileSync(join(HERE, 'private-page.css'), 'utf8')}`, type: 'text/css; charset=utf-8' },
  // The light and dark switch, loaded blocking in each page's <head> so a saved dark choice applies before paint.
  '/theme.js': { file: join(HERE, '../../plan/references/theme.js'), type: SCRIPT },
});
const PAGES = { keys: pages('keys-page'), view: pages('view-page') };
const ROUTES = { keys: KEY_ROUTES, view: VIEW_ROUTES };
/** Why a view can not open on a page that already meets its finish. */
const MET = 'The page already meets the finish, so the view would close at once; name where the site goes once the person is through.';
const sleep = ms => new Promise(done => setTimeout(done, ms));

/** A URL glob as a whole-string RegExp: `**` any run, `*` anything but `/`. */
export function globToRegExp(glob) {
  const body = glob.split('**').map(part => part.split('*').map(text => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*');
  return new RegExp(`^${body}$`);
}

/** True when the finish is met: every named check holds, and at least one was named. `until` is one glob, or a list
 * of which any one matches, as a sign-in turn's exact key page with or without a query. */
export function finished({ until, untilGone, untilText }, { url, count, text }) {
  if (!until && !untilGone && !untilText) return false;
  if (until && !(url != null && [until].flat().some(glob => globToRegExp(glob).test(url)))) return false;
  if (untilGone && count !== 0) return false;
  if (untilText && text !== true) return false;
  return true;
}

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

/** Gives the watch's browser to the person until the page meets `finish` or they hand it back, with `note` on the
 * page; false unless the agent holds it. */
export function startTurn(finish, note) {
  if (watchControl() !== 'assistant') return false;
  const n = Math.max(readJson(FILES.turn)?.n ?? 0, readJson(FILES.control)?.turnDone ?? 0) + 1;
  writeWhole(FILES.turn, { n, ...finish, note });
  return true;
}

/** Ends a link whose watcher can not: puts a view's page back and stops its screen source, kills the
 * tunnel, records the result, and clears the rest. The watcher closes its page first. */
async function teardown(result, { tunnelPid, view, session, completionId } = {}, cause = 'error') {
  if (view && !view.window) await endView(view, pageOf(session));
  await killTunnel(tunnelPid);
  if (completionId) time(completionId, { ended: result, cause });
  writeFileSync(FILES.result, `${JSON.stringify({ result })}\n`);
  clearLink();
}

/** Result-only completion message; routing and private input are never taken from the page. */
export function completionMessage(state, result) {
  const names = list => (list ?? []).filter(name => typeof name === 'string' && /^[a-zA-Z0-9_-]{1,200}$/.test(name));
  return `Private input ended. Resume the existing task once for this completion; if wait already reported it, consume the duplicate without repeating the task. ${JSON.stringify({ completionId: state.completionId, mode: modeOf(state), result: result.result, saved: names(result.saved), appKeys: names(result.appKeys) })}${result.appKeys?.length ? ' Push the saved Worker keys to the live app as the secrets guide requires.' : ''}`;
}

/** Tells the workspace that opened the link its result is ready: `notified`, `unconfirmed`, or `unavailable`. */
export function notifyWorkspace(state, result) {
  return state.agentId ? wakeChat(state, completionMessage(state, result)) : Promise.resolve('unavailable');
}

/** Tears down a link whose watcher died without finishing. */
async function recoverStale(result) {
  await teardown(result, readJson(FILES.state) ?? {}, result === 'closed' ? 'close-command' : 'error');
}

/** Serves a page file, or 404 for none. */
function sendFile(page, response) {
  if (!page) return void response.writeHead(404, { 'content-length': 0 }).end();
  response.writeHead(200, { 'content-type': page.type, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY', 'content-security-policy': "frame-ancestors 'none'" });
  response.end(page.text ? page.text() : readFileSync(page.file));
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

/** What the tab gives while it shows the password manager's own page, which no one reads: no finish is met there. */
const ON_ADDON = { url: 'moz-extension:', count: null, text: false };
/** A failed read's value: the password manager's when its page shows, else `failed`. */
const orAddon = (name, failed) => error => (error?.addonPage ? ON_ADDON[name] : failed);
/** The page's address, or null when it can not be read. */
const urlOf = page => page.url().catch(orAddon('url', null));

/** What a finish is judged by: the page's address, the named element's shown count, and whether the named words
 * show, each read only when named. An address or words that can not be read are null, and a count NaN. */
export async function seen(page, { until, untilGone, untilText }) {
  return {
    ...(until && { url: await urlOf(page) }),
    ...(untilGone && { count: await page.countShown(untilGone).then(Number, orAddon('count', NaN)) }),
    ...(untilText && { text: await page.hasText(untilText).catch(orAddon('text', null)) }),
  };
}

/** True when a read failed: the page is gone, or the browser didn't answer. */
const unread = now => now.url === null || Number.isNaN(now.count) || now.text === null;

/** The `--guide` file's entries for `names`, or null once it has said why not. */
function readGuide(file, names) {
  const { guide, fault } = checkGuide(readJson(file), names);
  if (!fault) return guide;
  console.log(`KEYS_GUIDE=${fault}`);
  console.error('Fix the guide file first: a JSON object keyed by asked-for key name.');
  return null;
}

/** The key link's config, each key with its guide entry, or an exit code once it has said why not:
 * 2 for a name declared in neither example file or in both, or a bad guide; 1 for a destination not git-ignored. */
function keyConfig(names, guideFile) {
  let ctx;
  try {
    ctx = primaryRoot();
  } catch (error) {
    console.error(`The key link needs a Git checkout: ${error.message}`);
    return 1;
  }
  const { keys, undeclared, ambiguous, unignored } = resolveKeys(names, ctx);
  if (undeclared.length) console.log(`KEYS_UNDECLARED=${undeclared.join(',')}`);
  if (ambiguous.length) console.log(`KEYS_AMBIGUOUS=${ambiguous.join(',')}`);
  if (undeclared.length || ambiguous.length) {
    console.error('Declare each key, blank and with a comment on where to get it, in exactly one of .env.example and app/.dev.vars.example first. A tool added from a chat takes TOOL_<ID> with no declaration.');
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

/** Why a link with a finish can not open on `page`, or null: no page, or a finish already met (`met`). */
export async function pageFault(page, finish, met) {
  const named = Boolean(finish.until || finish.untilGone || finish.untilText);
  const now = named ? await seen(page, finish) : { url: await urlOf(page) };
  if (unread(now)) return 'No page is open in this browser session; open the site\'s page with browse.mjs first, or name its --session.';
  return finished(finish, now) ? met : null;
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

/** A view's state for the session's page, its screen source started; one `keepOpen`, or a `watch`, reads no finish.
 * Null, once it has said so, when the browser has no screen. Throws when the source does not start. */
async function openView(session, note, keepOpen = false, watch = false) {
  const display = screenOf();
  if (!display) return void unsupported('The browser has no screen to show.');
  // On the password manager's page, the size is the one the site gets back; an older browser server gives none.
  const size = await pageOf(session).size().catch(error => (error.addonPage ? null : Promise.reject(error)));
  // The screen's socket stays in the computer's place: a long chat folder would pass the 108-character socket limit.
  return { note: note ?? null, ...(keepOpen && { keepOpen }), ...(watch && { watch }), size, display, ...(await startSource(display, mkdtempSync(join(DIR, 'screen-')))) };
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

/** The chat whose live view is open or opening, from any chat's folder or an older link's shared place, or null. A
 * view shows the browser's one screen, so it counts on the whole computer; a dead watcher or opener reads as closed. */
export function viewHolder() {
  const chats = namesIn(LINKS).filter(entry => entry.isDirectory()).map(entry => entry.name);
  for (const [dir, chat] of [[DIR, null], ...chats.map(name => [join(LINKS, name), name])]) {
    const { state, pid } = filesIn(dir);
    const { view, cwd } = readJson(state) ?? {};
    if (view && alive(watcherPid(pid))) return chat ?? (typeof cwd === 'string' ? basename(cwd) : 'another chat');
    if (chat && viewOpening(dir)) return chat;
  }
  return null;
}

/** Says a live view is open elsewhere and resolves to exit code 1, or to 0 when none is. */
function viewTaken() {
  const holder = viewHolder();
  if (!holder) return 0;
  console.error(`A live view is already open in ${holder}.`);
  return 1;
}

async function open(values) {
  const keys = values.keys ? keyConfig(values.keys, values.guide) : null;
  if (typeof keys === 'number') return keys;
  const refused = values.view ? viewTaken() || viewRefusal() : 0;
  if (refused) return refused;
  mkdirSync(CHAT_DIR, { recursive: true });
  // Two views opening at once each see the other's mark, written before the second check, until the state stands.
  const mark = values.view ? join(CHAT_DIR, `view-opener.${process.pid}`) : null;
  if (!mark) return startLink(values, keys);
  writeFileSync(mark, `${process.pid}\n`, { mode: 0o600 });
  try {
    return viewTaken() || (await startLink(values, keys));
  } finally {
    rmSync(mark, { force: true });
  }
}

/** Starts the watcher with `env`; resolves to its pid. */
function startWatcher(env = process.env) {
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'watch'], { detached: true, stdio: 'ignore', env });
  writeFileSync(FILES.pid, `${child.pid}\n`);
  child.unref();
  return child.pid;
}

const writeState = state => writeFileSync(FILES.state, `${JSON.stringify(state)}\n`, { mode: 0o600 });

/** Opens this chat's link once no other blocks it; resolves to the exit code. A view where the browser has its own
 * window opens no link: the person's turn happens in that window. */
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
  const finish = { until: values.until ?? null, untilGone: values['until-gone'] ?? null, untilText: values['until-text'] ?? null };
  const session = values.view ? sessionName(values.session) : null;
  const fail = async message => {
    if (message) console.error(message);
    if (watcher) signal(watcher, 'SIGKILL');
    await teardown('error', { tunnelPid, view, session });
    return 1;
  };
  const fault = session && (await pageFault(pageOf(session), finish, MET));
  if (fault) return fail(fault);
  const completionId = randomBytes(16).toString('hex');
  if (window) {
    view = { note: values.note, ...(values['keep-open'] && { keepOpen: true }), window: true };
    writeState({ completionId, ...chatTarget(), session, view, ...finish, deadline });
    watcher = startWatcher();
    await pageOf(session).front().catch(() => {});
    console.log('HANDOVER_VIEW=window');
    console.log(`HANDOVER_SEND=${WINDOW_REMINDER}`);
    return 0;
  }
  if (values.view) {
    try {
      view = await openView(session, values.note, values['keep-open'], values.watch);
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
  writeState({ completionId, ...chatTarget(), tunnelPid, port, session, key, keys, view, ...finish, deadline });
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

/** The link's address: the page, with its key in the `#` part, which no request carries. */
const addressOf = (origin, key) => `${origin}/#key=${key}`;

/** What the inbox lists for a link: its address and a title from what the opener has, never a value or a note. */
export function listingOf({ completionId, key, keys, view, deadline }, origin, cwd = process.cwd()) {
  const [what, title] = keys ? ['key', keys.keys.map(each => each.guide?.title ?? readableName(each.name)).join(', ')] : ['view', view?.watch ? 'Connect your tools' : 'Your turn in the browser'];
  return { id: completionId, what, title: title.slice(0, 200), url: addressOf(origin, key), closesAt: deadline, workspace: basename(cwd).slice(0, 100) };
}

/** Lists a link in the inbox; resolves to the client that closes it, or null when the app is out of reach. */
async function list(listing) {
  const client = await companyFor();
  if (client) await listLink(client, listing);
  return client;
}

/** Serves the page until its finish, Hand back, `close`, or the deadline; a window view serves none. Polls read
 * only the address, a shown count, and named words; one call a minute keeps an idle page. */
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
  const watchSide = watchLink(state, page);
  const saved = state.keys ? [] : undefined;
  const saveState = () => writeState(state);
  // The inbox's listing of the link, once open has printed it: every end below closes it.
  let listed = null;
  // One 3 s limit for the listing and its close together: a stalled app never holds the link's end back.
  const unlist = () => inTime((async () => {
    const client = await listed;
    if (client) await closeItem(client, listing.id);
  })());
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
      const appKeys = state.keys && saved.filter(name => state.keys.keys.some(key => key.name === name && key.file === APP_FILE));
      const outcome = await publish({ result, ready, ...(saved && { saved }), ...(appKeys && { appKeys }), ...(state.keys && { opened: existsSync(FILES.opened) }), completionId: state.completionId }, ready);
      closePage?.setReceipt(outcome);
      // Receipt delivery is independent of the client: even a vanished client cannot retain input.
      const shutDown = sleep(closePage ? 1200 : 0).then(async () => {
        await closePage?.();
        await killTunnel(state.tunnelPid);
      });
      void Promise.all([shutDown, unlist()]).then(() => {
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
  const hooks = { onSaved: name => { if (!saved.includes(name)) saved.push(name); }, onDone: ready => finish('done', { ready }), onContinue: () => finish('done'), onOpened: () => writeFileSync(FILES.opened, ''), onGive: () => finish('handed-back', { cause: 'hand-back' }), fitted: () => live.describe(), onFit: kind => live.fit(kind), watch: watchSide?.hooks };
  try {
    await live?.fit();
    // A close that came during the first fit has ended the link: no page is served after it.
    if (!done && !window) closePage = await servePage(state, hooks);
  } catch {
    return finish('error', { cause: 'error' });
  }
  /** One poll of a view: a screen source that exited is started again and recorded, the finish is read unless the
   * view stays open, and the page's window is raised. Resolves to the result that ends the view, or null. */
  const pollView = async () => {
    try {
      if (await live?.revive()) saveState();
    } catch {
      return 'error';
    }
    if (watchSide) await watchSide.poll();
    else if (!state.view.keepOpen && finished(state, await seen(page, state))) return 'done';
    live?.front();
    return null;
  };
  /** The call the server counts as use, which keeps the link's page open: a view's fit again, else a constant. */
  const keepOpen = () => (live ? live.fit() : page.keepAlive());
  let keepAt = Date.now() + KEEP_MS;
  while (!done) {
    if (!listed && listing && existsSync(FILES.shown)) listed = list(listing);
    if (Date.now() >= state.deadline) return finish('timeout', { cause: 'deadline' });
    const ended = state.view && (await pollView());
    if (ended) return finish(ended, { cause: ended === 'error' ? 'error' : 'finish' });
    if (page && !done && Date.now() >= keepAt) {
      keepAt = Date.now() + KEEP_MS;
      await keepOpen().catch(() => {});
    }
    await sleep(Math.min(POLL_MS, Math.max(0, state.deadline - Date.now())));
  }
}

/** A watch link's side of the watcher, or null for any other link: it alone writes `control`, ends a turn whose finish
 * holds, and wakes the chat when the person takes the browser. Each change is an event `wait` prints once. */
function watchLink(state, page) {
  if (!state.view?.watch) return null;
  let control = { control: 'assistant', turnDone: 0, opened: false, event: null };
  const now = () => controlOf(control, readJson(FILES.turn));
  const change = (next, result) => {
    control = { ...control, ...next, event: { n: (control.event?.n ?? 0) + 1, result } };
    writeWhole(FILES.control, control);
    if (result === 'taken-over') void wakeChat(state, watchMessage(state, result));
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
    /** One poll: a turn ended once its finish holds. */
    async poll() {
      const turn = readJson(FILES.turn);
      if (now() === 'turn' && finished(turn, await seen(page, turn))) endTurn('signed-in');
    },
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
    parsed = parseArgs({ args, allowPositionals: true, strict: true, options: { view: { type: 'boolean' }, watch: { type: 'boolean' }, stopped: { type: 'boolean' }, 'keep-open': { type: 'boolean' }, note: { type: 'string' }, until: { type: 'string' }, 'until-gone': { type: 'string' }, 'until-text': { type: 'string' }, session: { type: 'string' }, keys: { type: 'string' }, guide: { type: 'string' }, minutes: { type: 'string' }, help: { type: 'boolean' } } });
  } catch (error) {
    usageError(error.message);
  }
  const { values } = parsed;
  if (values.help) {
    console.log(USAGE);
    process.exit(0);
  }
  const [command, ...rest] = parsed.positionals;
  if (!['open', 'watch', 'wait', 'close', 'install-view', 'line', 'turn'].includes(command) || rest.length !== (command === 'line' ? 1 : 0)) usageError(command ? `unknown command: ${[command, ...rest].join(' ')}` : 'missing command');
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
  const finish = ['until', 'until-gone', 'until-text'].some(name => values[name] !== undefined);
  if (values.keys !== undefined) {
    if (finish || ['session', 'note', 'keep-open'].some(name => values[name] !== undefined)) usageError('--until, --until-gone, --until-text, --session, --note, and --keep-open go with --view only');
    return;
  }
  if (values.watch) {
    if (finish || values['keep-open']) usageError('--watch takes no --until, --until-gone, --until-text, or --keep-open: it ends at close');
    if (values.note !== undefined && !oneLine(values.note, NOTE_MOST)) usageError(`--note takes one line of up to ${NOTE_MOST} characters`);
    return;
  }
  if (values['keep-open'] && finish) usageError('--keep-open takes no --until, --until-gone, or --until-text: the turn ends only on the person\'s Hand back, close, or the time limit');
  if (!finish && !values['keep-open']) usageError('--view needs --until, --until-gone, or --until-text, to tell when the person is through, or --keep-open');
  if (values.note === undefined || !oneLine(values.note, NOTE_MOST)) usageError(`--view needs --note, the one line the person sees: what to do now, up to ${NOTE_MOST} characters`);
  if (values['until-text'] !== undefined && !oneLine(values['until-text'], NOTE_MOST)) usageError(`--until-text takes one line of up to ${NOTE_MOST} characters`);
}

/** `turn` takes a finish and a one-line `--note`, and nothing else, or a usage error. */
function checkTurn(values) {
  const finish = ['until', 'until-gone', 'until-text'].some(name => values[name] !== undefined);
  const others = Object.keys(values).filter(name => !['until', 'until-gone', 'until-text', 'note'].includes(name));
  if (!finish || others.length) usageError('turn takes --until, --until-gone, or --until-text, and --note');
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
  const finish = { until: values.until ?? null, untilGone: values['until-gone'] ?? null, untilText: values['until-text'] ?? null };
  if (startTurn(finish, values.note)) return 0;
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
  const run = { open: () => open(values), watch, wait, close: () => close(values), 'install-view': installViewTools, line: () => lineCommand(values), turn: () => turnCommand(values) }[command];
  const code = await run();
  process.exitCode = typeof code === 'number' ? code : 0;
}
