#!/usr/bin/env node
// Opens a private link that closes itself: a private form, the password link, the key link, or a live view.
// One link per chat, in ~/.wong-stack/hand-over/links/. Exit codes: 0 ok · 1 failed · 2 usage · 3 a tool is missing.

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { primaryRoot } from '../../memory/scripts/lib/primary-root.mjs';
import { lookCss } from '../../plan/scripts/look.mjs';
import { client as browseClient, sessionName } from '../../browser/scripts/browse.mjs';
import { checkForm, FORM_ROUTES, formReady, formRoutes, LIMITS as FORM_LIMITS, sendForm } from './form.mjs';
import { APP_FILE, checkGuide, KEY_ROUTES, keyRoutes, LIMITS as KEY_LIMITS, NAME as KEY_NAME, resolveKeys } from './keys.mjs';
import { readableName } from './keys-page.mjs';
import { closeItem, companyFor, inTime, listLink } from './lib/inbox.mjs';
import { appendTiming, linkOf } from './lib/timings.mjs';
import { alive, freePort, hasCloudflared, keyMatches, killTunnel, linkAnswers, signal, startTunnel } from './lib/tunnel.mjs';
import { chatTarget, wakeChat } from './lib/wake.mjs';
import { screenBridge } from './lib/ws-bridge.mjs';
import { hostOf, LIMITS as PASSWORD_LIMITS, PASSWORD_ROUTES, passwordRoutes } from './passwords.mjs';
import { siteUrl } from './passwords-page.mjs';
import { checkView, endView, installView, liveView, MANUAL, OFF_LINUX, screenOf, socketOf, startSource, TOOLS, VIEW_ROUTES, viewerFile, viewRoutes } from './view.mjs';

export { keyMatches, tunnelOrigin } from './lib/tunnel.mjs';

const USAGE = `usage: hand-over.mjs open --form <file> <finish> [--session <name>] [--minutes N]
       hand-over.mjs open --view <finish> [--session <name>] [--note <line>] [--minutes N]
       hand-over.mjs open --view --keep-open [--session <name>] [--note <line>] [--minutes N]
       hand-over.mjs open --passwords [--site <url> [--email-first] [<finish> --sign-in <user-ref>,<password-ref>[,<submit-ref>]]]
                          [--username <user>] [--session <name>] [--minutes N]
       hand-over.mjs open --keys NAME[,NAME] [--guide <file>] [--minutes N]
       hand-over.mjs wait | close | install-view
  open    start the private link, print HANDOVER_LINK=<url> once it answers through
          Cloudflare, then HANDOVER_SEND=<reminder to end the turn with the link>, list its address
          (no username) in the app's inbox, and watch for the finish
          <finish>: one or more of --until <glob> (the address), --until-gone <selector>
          (no match shown), and --until-text <words> (shown on the page); all must hold
          --form: a JSON file of title, site, note, fields (label, kind, target, options),
          and submit (label, target), drawn as one box per field (exit 2 with
          FORM_FILE=); the person's one send checks every target is still on the page,
          fills the site's fields, and presses its button; the finish names where the
          site goes once it accepts; where a live view can open, the link shows the site
          live from the press, as a view does, the page at its own size;
          --session names the browse.mjs session whose page it is, when not the default;
          the page shows one picture of the whole site page, taken before the link opens
          --view: a live view of that page for a check that asks whether a person is
          there, or a stuck login; the person taps or signs in through it, and it closes once the page meets
          the finish; --note is the one line the page shows; open for 480 minutes;
          --keep-open, in place of a finish: a view for a stuck site or payment step
          that stays open through every page until the person taps I'm finished
          (done), close (closed), or the time limit (timeout); it reads no finish;
          HANDOVER_VIEW=unsupported where the browser has no screen to show, and
          HANDOVER_NEEDS=live-view (exit 3) with a line per missing tool
          --passwords: save logins and continue, or cancel; --site and --username
          fill in the add-a-login form, carried only in the link; with --site, a
          picture of the --session page when it is on that site; --email-first,
          for a site that asks the email on a page of its own, makes the password
          optional; with a finish, a save signs in with browse.mjs login on the
          --sign-in boxes, shown live where a view can open, and ends on the finish
          --keys: one box per declared name; it ends on cancellation or
          once every key is saved (exit 2 with KEYS_UNDECLARED= or KEYS_AMBIGUOUS=);
          an unopened one gives way to a new open from the same chat
          --guide: a JSON file keyed by name, each with any of title, url, open,
          steps, and check {url, auth}, shown on the key page (exit 2 with KEYS_GUIDE=)
          --minutes: time limit for any link, default 1440 (24 hours); 480 for --view
  wait    block until the link closes; print
          HANDOVER_RESULT=done|not-accepted|unconfirmed|timeout|closed|error,
          then HANDOVER_REASON=page-changed|fill for a form that pressed nothing,
          viewed for a live send the person ended, or no-answer for a watched send
          whose page kept still (a pressed send is never not-accepted, and its boxes
          keep what was typed); then for a send or sign-in the site
          has not finished in a minute HANDOVER_VIEWING=yes (the person still sees it
          live, up to 30 minutes) or HANDOVER_WATCHING=<minutes> (no view: it still
          watches the site), and a second wait prints the final result;
          then HANDOVER_SAVED=<name>,<name> for a password or key link, and
          HANDOVER_APP_KEYS=<name>,<name> and HANDOVER_OPENED=yes|no (whether
          anyone opened it) for a key link, then HANDOVER_REPLACED_BY=<folder>
          for a key link that gave way to a newer link from this same chat
  close   close an open link (the person said done)
  install-view
          add the live view's tools once the person agrees: prints
          HANDOVER_INSTALLED=live-view, or HANDOVER_INSTALL=manual and the one
          command for the person, having installed nothing`;
// Chat apps often hide text between tool calls; only the turn's last message shows for sure.
const SEND_REMINDER = 'Run wait in the background, then end this turn with the link above on its own line; text between tool calls may not show.';
const TUNNEL_WAIT_MS = Number(process.env.HANDOVER_TUNNEL_WAIT_MS) || 30_000;
const PAGE_WAIT_MS = 10_000;
const POLL_MS = Number(process.env.HANDOVER_POLL_MS) || 2000;
const SEND_WAIT_MS = Number(process.env.HANDOVER_SEND_WAIT_MS) || 60_000;
const SEND_POLL_MS = Number(process.env.HANDOVER_SEND_POLL_MS) || 500;
const WATCH_MS = Number(process.env.HANDOVER_WATCH_MS) || 10 * 60_000;
const VIEW_WATCH_MS = Number(process.env.HANDOVER_VIEW_WATCH_MS) || 30 * 60_000;
const KEEP_MS = Number(process.env.HANDOVER_KEEPALIVE_MS) || 60_000;
const DIR = join(homedir(), '.wong-stack', 'hand-over');
const LINKS = join(DIR, 'links');
/** The chat's name: its checkout's folder, as the browser session names it. */
const CHAT = sessionName().replace(/^\.+$/, 'default');
const CHAT_DIR = join(LINKS, CHAT);
/** A link's files in `dir`; older code kept them in DIR itself. The timing record stays one for the computer. */
const filesIn = dir => ({ pid: join(dir, 'watcher.pid'), state: join(dir, 'state.json'), result: join(dir, 'result.json'), log: join(dir, 'tunnel.log'), config: join(dir, 'cloudflared.yml'), opened: join(dir, 'opened'), replaced: join(dir, 'replaced.json'), picture: join(dir, 'picture.png'), reported: join(dir, 'reported'), closing: join(dir, 'closing'), shown: join(dir, 'shown') });
let FILES = { ...filesIn(CHAT_DIR), timings: join(DIR, 'timings.jsonl') };
/** The mark an opener leaves in its chat's folder while a view starts, before its state is written. */
const OPENER = /^view-opener\.(\d+)$/;
/** The files only a reachable link needs; a watch after the send drops them and keeps the rest. */
const dropInput = () => { for (const file of [FILES.log, FILES.config, FILES.opened, FILES.picture]) rmSync(file, { force: true }); };
/** Removes a link's own files, the pid last: `wait` reads its absence as the end. Its result stays, and
 * so does the give-way record, which `wait` may read after this. */
const clearLink = () => {
  dropInput();
  for (const file of [FILES.state, FILES.reported, FILES.closing, FILES.shown, FILES.pid]) rmSync(file, { force: true });
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
const PICTURE_VIEW = { '/picture-view.mjs': { file: join(HERE, 'picture-view.mjs'), type: SCRIPT } };
const PAGES = { form: { ...pages('form-page'), ...PICTURE_VIEW }, passwords: { ...pages('passwords-page'), ...PICTURE_VIEW }, keys: pages('keys-page'), view: pages('view-page') };
const ROUTES = { form: FORM_ROUTES, passwords: PASSWORD_ROUTES, keys: KEY_ROUTES, view: VIEW_ROUTES };
/** Where a form's or a sign-in's live view is served on its own link: the view page, under this folder. */
const LIVE = '/live';
const LIVE_ROUTES = new Set(['/view', '/done']);
const BROWSE = join(HERE, '../../browser/scripts/browse.mjs');
/** Why a link can not open on a page that already meets its finish. */
const MET = {
  form: 'The page already meets the finish, so the form could not tell sent from not accepted; name where the site goes next.',
  view: 'The page already meets the finish, so the view would close at once; name where the site goes once the check is passed.',
  passwords: 'The page already meets the finish, so the sign-in would end at once; name where the site goes once you are signed in.',
};
const sleep = ms => new Promise(done => setTimeout(done, ms));

/** A URL glob as a whole-string RegExp: `**` any run, `*` anything but `/`. */
export function globToRegExp(glob) {
  const body = glob.split('**').map(part => part.split('*').map(text => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*');
  return new RegExp(`^${body}$`);
}

/** True when the finish is met: every named check holds, and at least one was named. */
export function finished({ until, untilGone, untilText }, { url, count, text }) {
  if (!until && !untilGone && !untilText) return false;
  if (until && !(url != null && globToRegExp(until).test(url))) return false;
  if (untilGone && count !== 0) return false;
  if (untilText && text !== true) return false;
  return true;
}

const readJson = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };
const readText = file => { try { return readFileSync(file, 'utf8'); } catch { return ''; } };

const watcherPid = (file = FILES.pid) => Number(readText(file).trim()) || null;

/** A link's browser client: it starts no browser and retries no step, so nothing is typed or pressed twice. */
const pageOf = session => browseClient(session, { retry: false, start: false });

/** The link's mode from its state: the password link, the key link, a private form, or a live view. A form's
 * state names a view too once its press is shown live. */
const modeOf = ({ passwords, keys, form, view } = {}) => (passwords ? 'passwords' : keys ? 'keys' : form ? 'form' : view ? 'view' : 'form');

/** Ends a link whose watcher can not: puts a view's page back and stops its screen source, kills the
 * tunnel, records the result, and clears the rest. The watcher closes its page first. */
async function teardown(result, { tunnelPid, view, session, completionId } = {}, cause = 'error') {
  if (view) await endView(view, pageOf(session));
  await killTunnel(tunnelPid);
  if (completionId) time(completionId, { ended: result, cause });
  writeFileSync(FILES.result, `${JSON.stringify({ result })}\n`);
  clearLink();
}

/** Result-only completion message; routing and private input are never taken from the page. */
export function completionMessage(state, result) {
  const names = list => (list ?? []).filter(name => typeof name === 'string' && /^[a-zA-Z0-9_-]{1,200}$/.test(name));
  return `Private input ended. Resume the existing task once for this completion; if wait already reported it, consume the duplicate without repeating the task. ${JSON.stringify({ completionId: state.completionId, mode: modeOf(state), result: result.result, ...(result.reason && { reason: result.reason }), ...(result.watching && { watching: true }), ...(result.viewing && { viewing: true }), saved: names(result.saved), appKeys: names(result.appKeys) })}${result.appKeys?.length ? ' Push the saved Worker keys to the live app as the secrets guide requires.' : ''}`;
}

/** Tells the workspace that opened the link its result is ready: `notified`, `unconfirmed`, or `unavailable`. */
export function notifyWorkspace(state, result) {
  return state.agentId ? wakeChat(state, completionMessage(state, result)) : Promise.resolve('unavailable');
}

/** Tears down a link whose watcher died without finishing. */
async function recoverStale(result) {
  await teardown(result, readJson(FILES.state) ?? {}, result === 'closed' ? 'close-command' : 'error');
}

/** The modes whose page may show the site's page. */
const PICTURED = new Set(['form', 'passwords']);

/** `GET /picture`: the site page's picture behind the key, never kept by the device; 404 when the link has none. */
function servePicture(request, response, { key, finishing, picture }) {
  if (!keyMatches(request.headers['x-hand-over-key'], key)) return reply(response, 403);
  if (request.method !== 'GET') return reply(response, 405);
  if (finishing) return reply(response, 410);
  const png = picture && existsSync(FILES.picture) && readFileSync(FILES.picture);
  if (!png) return reply(response, 404);
  response.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'no-store', 'content-length': png.length }).end(png);
}

/** Ends a route with a JSON reply, or an empty one. */
function reply(response, status, body) {
  const text = body ? JSON.stringify(body) : '';
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(text) }).end(text);
}

/** Serves a page file, or 404 for none. */
function sendFile(page, response) {
  if (!page) return void response.writeHead(404, { 'content-length': 0 }).end();
  response.writeHead(200, { 'content-type': page.type, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY', 'content-security-policy': "frame-ancestors 'none'" });
  response.end(page.text ? page.text() : readFileSync(page.file));
}

/** Serves the link's page on 127.0.0.1:`port`, each route keyed by an `x-hand-over-key` header, except a view's viewer
 * scripts (an `import` sends none). `viewAfter` also serves the view page under LIVE once it has a screen. */
export function servePage({ port, key, passwords = false, keys = null, form = null, view = null, viewAfter = false, picture = false, deadline }, hooks = {}) {
  const sockets = new Set();
  let finishing = false;
  let receipt = null;
  let step = null;
  const mode = modeOf({ passwords, keys, form, view });
  hooks = { ...hooks, isOpen: () => !finishing };
  const routes = { passwords: () => passwordRoutes(hooks), keys: () => keyRoutes(keys, { ...hooks, closesAt: deadline }), form: () => formRoutes(form, { ...hooks, closesAt: deadline, picture }), view: () => viewRoutes(view, { ...hooks, closesAt: deadline }) }[mode]();
  let bridge = null;
  const mountView = shown => { bridge = screenBridge({ key, socketPath: socketOf(shown.dir), isOpen: () => !finishing }); };
  if (view) mountView(view);
  const keyed = request => keyMatches(request.headers['x-hand-over-key'], key);
  /** What a GET of `pathname` serves from `files`: a page file, or once a screen is up one of the viewer's scripts. */
  const fileFor = (files, pathname, viewer = true) => {
    if (Object.hasOwn(files, pathname)) return files[pathname];
    const file = viewer && bridge && viewerFile(pathname);
    return file ? { file, type: SCRIPT } : null;
  };
  const answerReceipt = (request, response) => {
    if (!keyed(request)) return reply(response, 403);
    if (request.method !== 'GET') return reply(response, 405);
    return reply(response, receipt ? 200 : 202, receipt ?? { finishing, ...step, now: Date.now() });
  };
  /** The live view of a form's press or a sign-in: the view page, its viewer, its line (`/view`), and its Done. */
  const serveLive = (pathname, request, response) => {
    if (pathname === '/receipt') return answerReceipt(request, response);
    if (!LIVE_ROUTES.has(pathname)) return sendFile(request.method === 'GET' && fileFor(PAGES.view, pathname), response);
    if (!keyed(request)) return reply(response, 403);
    if (finishing || !bridge) return reply(response, 410);
    if (pathname === '/view') return request.method === 'GET' ? reply(response, 200, hooks.liveInfo()) : reply(response, 405);
    if (request.method !== 'POST') return reply(response, 405);
    reply(response, 200, { ok: true });
    hooks.onViewed();
  };
  const server = createServer((request, response) => {
    const { pathname } = new URL(request.url, 'http://page');
    if (viewAfter && pathname.startsWith(`${LIVE}/`)) return serveLive(pathname.slice(LIVE.length), request, response);
    if (pathname === '/receipt') return answerReceipt(request, response);
    if (pathname === '/picture' && PICTURED.has(mode)) return servePicture(request, response, { key, finishing, picture });
    if (ROUTES[mode].has(pathname)) {
      if (!keyed(request)) return reply(response, 403);
      if (finishing) return reply(response, 410);
      return void routes(pathname, request, response).catch(() => reply(response, 500));
    }
    sendFile(request.method === 'GET' && fileFor(PAGES[mode], pathname, mode === 'view'), response);
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
      /** The step a send is on, with any `more` (the press's time) for the page's line. */
      close.setStep = (name, more = {}) => { step = { step: name, ...more }; };
      close.mountView = mountView;
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

/** What a finish is judged by: the page's address, the named element's shown count, and whether the named words
 * show, each read only when named. An address or words that can not be read are null, and a count NaN. */
export async function seen(page, { until, untilGone, untilText }) {
  return {
    ...(until && { url: await page.url().catch(() => null) }),
    ...(untilGone && { count: await page.countShown(untilGone).then(Number, () => NaN) }),
    ...(untilText && { text: await page.hasText(untilText).catch(() => null) }),
  };
}

/** True when a read failed: the page is gone, or the browser didn't answer. */
const unread = now => now.url === null || Number.isNaN(now.count) || now.text === null;

/** The page's address, with what the finish names: what a send compares. */
async function reading(page, state) {
  return { url: await page.url().catch(() => null), ...(await seen(page, { ...state, until: null })) };
}

/** One read after the press: true once the finish is met. A failed read, or an address other than the press's
 * (`track.at`), marks the page `moved` for good: unknown is never "not yet". */
async function look(page, state, track) {
  const now = await reading(page, state);
  if (unread(now) || now.url !== track.at?.url) track.moved = true;
  track.last = now;
  return finished(state, now);
}

/** True once the site meets the finish; false when SEND_WAIT_MS passes after the press was sent, at `since`, or
 * once `stopped()`. `poll` runs before each read. */
async function reachesFinish(page, state, track, since, stopped = () => false, poll = async () => {}) {
  const end = since + SEND_WAIT_MS;
  for (;;) {
    await poll();
    if (await look(page, state, track)) return true;
    if (Date.now() >= end || stopped()) return false;
    await sleep(SEND_POLL_MS);
  }
}

/** True when the page is as it was at the press: never moved, the same address, any gone element's count unchanged. */
const keptStill = ({ moved, at, last }) => !moved && Boolean(at && last) && last.url === at.url && last.count === at.count && last.text === at.text;

/** Reads an unconfirmed send's page every POLL_MS for WATCH_MS or to `stop`: `done` on the finish, else `unconfirmed`
 * (`no-answer` for a still page), never `not-accepted`, since a site that saved the card in place keeps still too. */
async function watchSite(page, state, track, { stop, stopped }) {
  const end = Date.now() + WATCH_MS;
  while (!stopped() && Date.now() < end) {
    if (await look(page, state, track)) return { result: 'done' };
    await Promise.race([sleep(POLL_MS), stop]);
  }
  if (await look(page, state, track)) return { result: 'done' };
  return { result: 'unconfirmed', ...(keptStill(track) && { reason: 'no-answer' }) };
}

/** The `--form` file's form, or null once it has said why not. */
function readForm(file) {
  const { form, fault } = checkForm(readJson(file));
  if (!fault) return form;
  console.log(`FORM_FILE=${fault}`);
  console.error('Fix the form file first: a JSON object of title, note, fields, and submit.');
  return null;
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
    console.error('Declare each key, blank and with a comment on where to get it, in exactly one of .env.example and app/.dev.vars.example first.');
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
  const now = named ? await seen(page, finish) : { url: await page.url().catch(() => null) };
  if (unread(now)) return 'No page is open in this browser session; open the site\'s page with browse.mjs first, or name its --session.';
  return finished(finish, now) ? met : null;
}

/** True when `url` is on `site`'s host or one under it, as `accounts.netflix.com` is on `netflix.com`. */
export function onSite(url, site) {
  const [host, at] = [hostOf(url ?? ''), hostOf(siteUrl(site))];
  return Boolean(host && at) && (host === at || host.endsWith(`.${at}`));
}

/** Writes one picture of the session's whole page for the link, before anything private is typed: for a form,
 * and for a one-site password link whose page is on that site. True once written; a failed one shows none. */
async function takePicture(session, { form, site }) {
  try {
    const page = pageOf(session);
    if (!form && !onSite(await page.url(), site)) return false;
    writeFileSync(FILES.picture, await page.png({ fullPage: true }), { mode: 0o600 });
    return true;
  } catch {
    return false;
  }
}

/** True when a form's press or a sign-in may show its site live: Linux, the view's tools in place, the browser on a
 * screen. Whether another chat holds the one view is asked again at the press. */
function viewPossible() {
  const { unsupported, missing } = checkView();
  return !unsupported && !missing.length && Boolean(screenOf());
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

/** A view's state for the session's page, its screen source started; one `keepOpen` reads no finish. Null, once it has
 * said so, when the browser has no screen. Throws when the source does not start. */
async function openView(session, note, keepOpen = false) {
  const display = screenOf();
  if (!display) return void unsupported('The browser has no screen to show.');
  const size = await pageOf(session).size();
  // The screen's socket stays in the computer's place: a long chat folder would pass the 108-character socket limit.
  return { note: note ?? null, ...(keepOpen && { keepOpen }), size, display, ...(await startSource(display, mkdtempSync(join(DIR, 'screen-')))) };
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
function viewHolder() {
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
  const form = values.form === undefined ? null : readForm(values.form);
  if (values.form !== undefined && !form) return 2;
  const refused = values.view ? viewTaken() || viewRefusal() : 0;
  if (refused) return refused;
  mkdirSync(CHAT_DIR, { recursive: true });
  // Two views opening at once each see the other's mark, written before the second check, until the state stands.
  const mark = values.view ? join(CHAT_DIR, `view-opener.${process.pid}`) : null;
  if (!mark) return startLink(values, keys, form);
  writeFileSync(mark, `${process.pid}\n`, { mode: 0o600 });
  try {
    return viewTaken() || (await startLink(values, keys, form));
  } finally {
    rmSync(mark, { force: true });
  }
}

/** Opens this chat's link once no other blocks it; resolves to the exit code. */
async function startLink(values, keys, form) {
  const live = watcherPid();
  if (alive(live) && !(await givesWay(live))) {
    console.error(`A private link is already open in ${CHAT}. Run \`hand-over.mjs close\` first.`);
    return 1;
  }
  if (existsSync(FILES.pid)) await recoverStale('error');
  if (!hasCloudflared()) {
    console.log('HANDOVER_NEEDS=cloudflared');
    console.error('Cloudflare\'s tunnel tool, cloudflared, is not installed; ask the person, install it, and retry.');
    return 3;
  }
  for (const file of [FILES.result, FILES.opened, FILES.picture, FILES.reported, FILES.closing, FILES.shown]) rmSync(file, { force: true });
  const deadline = Date.now() + values.minutes * 60_000;
  let tunnelPid = null;
  let watcher = null;
  let view = null;
  const finish = { until: values.until ?? null, untilGone: values['until-gone'] ?? null, untilText: values['until-text'] ?? null };
  const signIn = values['sign-in'] === undefined ? null : signInBoxes(values['sign-in']);
  const session = form || values.view || signIn ? sessionName(values.session) : null;
  const fail = async message => {
    if (message) console.error(message);
    if (watcher) signal(watcher, 'SIGKILL');
    await teardown('error', { tunnelPid, view, session });
    return 1;
  };
  const fault = session && (await pageFault(pageOf(session), finish, form ? MET.form : values.view ? MET.view : MET.passwords));
  if (fault) return fail(fault);
  if (form) form.site ??= hostOf((await pageOf(session).url().catch(() => null)) ?? '') || 'The site';
  const viewAfter = Boolean(form || signIn) && viewPossible();
  if (values.view) {
    try {
      view = await openView(session, values.note, values['keep-open']);
    } catch (error) {
      return fail(error.message);
    }
    if (!view) return fail();
  }
  const pictured = Boolean(form || values.site) && (await takePicture(session ?? sessionName(values.session), { form, site: values.site }));
  const port = await freePort();
  const key = randomBytes(32).toString('hex');
  const tunnelDeadline = Date.now() + TUNNEL_WAIT_MS;
  const tunnelDown = 'The Cloudflare tunnel did not come up within 30 seconds; try again in a minute.';
  const tunnel = await startTunnel(port, tunnelDeadline, FILES);
  tunnelPid = tunnel.pid;
  if (!tunnel.origin) return fail(tunnelDown);
  const completionId = randomBytes(16).toString('hex');
  const listing = listingOf({ completionId, key, keys, form, view, deadline }, tunnel.origin, values);
  writeFileSync(FILES.state, `${JSON.stringify({ completionId, ...chatTarget(), tunnelPid, port, session, key, passwords: Boolean(values.passwords), keys, form, view, viewAfter, signIn, picture: pictured, ...finish, deadline })}\n`, { mode: 0o600 });
  // The listing and a sign-in's site hold the site, so they ride in the watcher's environment, never in a file.
  const env = { ...process.env, HANDOVER_LISTING: JSON.stringify(listing), ...(signIn && { HANDOVER_SITE: hostOf(siteUrl(values.site)) }) };
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'watch'], { detached: true, stdio: 'ignore', env });
  watcher = child.pid;
  writeFileSync(FILES.pid, `${watcher}\n`);
  child.unref();
  if (!(await pageAnswers(port, watcher))) return fail('The link\'s page did not start; try again.');
  if (!(await linkAnswers(tunnel.origin, port, tunnelPid, tunnelDeadline))) return fail(tunnelDown);
  console.log(`HANDOVER_LINK=${tunnel.origin}/#${linkFragment(key, values)}`);
  console.log(`HANDOVER_SEND=${SEND_REMINDER}`);
  // The watcher lists the link in the inbox once the chat has it, so open returns at once.
  writeFileSync(FILES.shown, '');
  return 0;
}

/** What the inbox lists for a link: its address without the username, and a title from what the opener already has,
 * never a value, a note, or a picture. */
export function listingOf({ completionId, key, keys, form, view, deadline }, origin, { site, 'email-first': emailFirst } = {}, cwd = process.cwd()) {
  const [what, title] = keys ? ['key', keys.keys.map(each => each.guide?.title ?? readableName(each.name)).join(', ')]
    : form ? ['card', form.title] : view ? ['view', view.keepOpen ? 'Finish a step in the browser' : 'Help the browser past a check']
      : ['login', site ? `Save your ${hostOf(siteUrl(site))} login` : 'Save your logins'];
  const url = `${origin}/#${linkFragment(key, { site, 'email-first': emailFirst })}`;
  return { id: completionId, what, title: title.slice(0, 200), url, closesAt: deadline, workspace: basename(cwd).slice(0, 100) };
}

/** Lists a link in the inbox; resolves to the client that closes it, or null when the app is out of reach. */
async function list(listing) {
  const client = await companyFor();
  if (client) await listLink(client, listing);
  return client;
}

/** The link's `#` part: the key, then any site and username to pre-fill, and an email-first mark, URL-encoded. */
export function linkFragment(key, { site, username, 'email-first': emailFirst } = {}) {
  return new URLSearchParams({ key, ...(site && { site: site.trim() }), ...(username && { user: username.trim() }), ...(site && emailFirst && { emailFirst: '1' }) }).toString();
}

/** Runs `browse.mjs login` for the saved login `name` on `session`'s page, the one reader of passwords, in the
 * `boxes` (username, password, submit); resolves to its BROWSE_LOGIN= result, or `failed`. */
function signInWith(session, name, [username, password, submit]) {
  const flags = [['--username', username], ['--password', password], ['--submit', submit]].filter(([, box]) => box).flat();
  return new Promise(resolve => {
    const child = spawn(process.execPath, [BROWSE, 'login', name, '--session', session, ...flags], { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    child.stdout.on('data', chunk => { out += chunk; });
    child.on('error', () => resolve('failed'));
    child.on('close', () => resolve(/^BROWSE_LOGIN=([a-z-]+)$/m.exec(out)?.[1] ?? 'failed'));
  });
}

/** Serves the page until its finish, `close`, or the deadline; an unanswered send then watches the site, live where a
 * view can open. Polls read only the address, a shown count, and named words; one call a minute keeps an idle page. */
async function watch() {
  const state = readJson(FILES.state);
  if (!state) return 1;
  const listing = JSON.parse(process.env.HANDOVER_LISTING ?? 'null');
  const site = state.form?.site ?? process.env.HANDOVER_SITE ?? 'The site';
  delete process.env.HANDOVER_LISTING;
  delete process.env.HANDOVER_SITE;
  let done = false;
  // open, then sending once the person sends or saves, then viewing or watching once the site has not finished.
  let phase = 'open';
  let closePage = null;
  let stopCause = null;
  let endWatch = () => {};
  const stop = new Promise(resolve => { endWatch = resolve; });
  const page = state.session ? pageOf(state.session) : null;
  const live = state.view ? liveView(state.view, page) : null;
  // A form's or a sign-in's live view, once claimed at the press, and when it began.
  let shown = null;
  let shownSince = null;
  const saved = state.form || state.view ? undefined : [];
  const record = entry => time(state.completionId, entry);
  const saveState = () => writeFileSync(FILES.state, `${JSON.stringify(state)}\n`, { mode: 0o600 });
  // The inbox's listing of the link, once open has printed it: every end below closes it.
  let listed = null;
  // One 3 s limit for the listing and its close together: a stalled app never holds the link's end back.
  const unlist = () => inTime((async () => {
    const client = await listed;
    if (client) await closeItem(client, listing.id);
  })());
  /** Writes `outcome` as the result, tells the chat when `notifies`, and writes it again with how that went. */
  const publish = async (outcome, notifies, target = state) => {
    outcome.notification = notifies ? 'pending' : 'not-requested';
    writeFileSync(FILES.result, `${JSON.stringify(outcome)}\n`, { mode: 0o600 });
    if (notifies) outcome.notification = await notifyWorkspace(target, outcome);
    writeFileSync(FILES.result, `${JSON.stringify(outcome)}\n`, { mode: 0o600 });
    return outcome;
  };
  let finishingPromise = null;
  // The page closed, the tunnel killed, and the receipt sent: a watch that ends sooner waits for it before exiting.
  let inputDown = Promise.resolve();
  /** Ends the link. `late` marks the final result of a send already reported as viewing. */
  const finish = (result, { ready = result === 'done', watching = false, late = false, reason, cause = 'send' } = {}) => {
    if (finishingPromise) return finishingPromise;
    done = true;
    record({ ended: result, cause, ...(reason && { reason }) });
    finishingPromise = (async () => {
      await closePage?.stopInput();
      await live?.end();
      await shown?.end();
      const appKeys = state.keys && saved.filter(name => state.keys.keys.some(key => key.name === name && key.file === APP_FILE));
      const completionId = late ? `${state.completionId}:late` : state.completionId;
      const outcome = await publish({ result, ready, ...(reason && { reason }), ...(watching && { watching: true }), ...(saved && { saved }), ...(appKeys && { appKeys }), ...(state.keys && { opened: existsSync(FILES.opened) }), completionId }, ready || watching || late, { ...state, completionId });
      closePage?.setReceipt(outcome);
      // Receipt delivery is independent of the client: even a vanished client cannot retain input.
      const shutDown = sleep(1200).then(async () => {
        await closePage?.();
        await killTunnel(state.tunnelPid);
      });
      inputDown = Promise.all([shutDown, unlist()]).then(() => {
        if (watching) return dropInput();
        clearLink();
        process.exit(0);
      });
      return outcome;
    })();
    return finishingPromise;
  };
  /** After an unconfirmed send with no view: watches the site, then reports the final result as a new completion. */
  const watchOn = async track => {
    const started = Date.now();
    state.watching = { until: started + WATCH_MS, sentUrl: track.at?.url ?? null };
    saveState();
    const { result, reason } = await watchSite(page, state, track, { stop, stopped: () => Boolean(stopCause) }).catch(() => ({ result: 'unconfirmed' }));
    record({ step: 'watch', ms: Date.now() - started, ok: result === 'done' });
    record({ ended: result, cause: stopCause ?? 'watch', ...(reason && { reason }) });
    const completionId = `${state.completionId}:late`;
    await publish({ result, ready: result === 'done', ...(reason && { reason }), completionId }, true, { ...state, completionId });
    await inputDown.catch(() => {});
    clearLink();
    process.exit(0);
  };
  /** Claims the computer's one live view for a press and starts its screen source; null, showing nothing, when another
   * chat holds it or it can not start. The page keeps its own size: a resize mid-payment can make a site reset. */
  const claimView = async () => {
    const display = state.viewAfter && !viewHolder() && screenOf();
    if (!display) return null;
    try {
      state.view = { note: null, display, ...(await startSource(display, mkdtempSync(join(DIR, 'screen-')))) };
    } catch {
      return null;
    }
    saveState();
    closePage?.mountView(state.view);
    shown = liveView(state.view, page);
    await raise();
    return shown;
  };
  let raisedAt = 0;
  /** Raises the shown page's own window by the browser, at most once a poll: another chat's newer page can cover it
   * and take the person's typing. `live.front()` finds a window by the size its fit set, and this view sets none. */
  const raise = async () => {
    if (!shown || done || Date.now() - raisedAt < POLL_MS) return;
    raisedAt = Date.now();
    await page.front().catch(() => {});
  };
  const showStep = (name, more) => {
    if (name === 'viewing') shownSince ??= more.since;
    closePage?.setStep(name, more);
  };
  /** After a send or a sign-in shown live that has not finished: tells the chat once, then reads the finish until it is
   * met, the person's Done or `close`, or VIEW_WATCH_MS. The person's page stays live throughout. */
  const viewOn = async () => {
    phase = 'viewing';
    const started = Date.now();
    if (!stopCause) await publish({ result: 'unconfirmed', ready: false, watching: true, viewing: true, completionId: state.completionId }, true);
    let met = false;
    while (!met && !stopCause && Date.now() < started + VIEW_WATCH_MS) {
      if (await shown.revive().catch(() => false)) saveState();
      await raise();
      met = finished(state, await seen(page, state));
      if (!met) await Promise.race([sleep(POLL_MS), stop]);
    }
    record({ step: 'view', ms: Date.now() - started, ok: met });
    return finish(met ? 'done' : 'unconfirmed', { late: true, ...(!met && { reason: 'viewed' }), cause: met ? 'send' : stopCause ?? 'watch' });
  };
  /** A send or sign-in the site has not finished: shown live on the person's page, else watched; resolves to a receipt.
   * A view's receipt comes at once: its page has gone to the view, which reads the final one. */
  const unfinished = async track => {
    if (shown) {
      void viewOn();
      return { result: 'unconfirmed', viewing: true };
    }
    phase = 'watching';
    const outcome = await finish('unconfirmed', { watching: true });
    void watchOn(track);
    return outcome;
  };
  // A view ends its wait for the finish at the person's Done or a close; a watch, which follows at once, ends then.
  const stopped = () => Boolean(shown && stopCause);
  /** What sent a signal: the close command, a newer link this one gave way to, or the signal alone. */
  const causeOf = sig => (existsSync(FILES.closing) ? 'close-command' : readJson(FILES.replaced)?.completionId === state.completionId ? 'gave-way' : sig);
  // A send under way ends the link itself: stopping it midway could leave a card typed on the page. A signal
  // during it is kept, so a watch or a view that follows ends at once; a watch or a view ends early.
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(sig, () => {
    if (phase === 'open') return finish('closed', { ready: false, cause: causeOf(sig) });
    stopCause ??= causeOf(sig);
    if (phase !== 'sending') endWatch();
  });
  const onSend = async values => {
    phase = 'sending';
    const track = { moved: false };
    const sent = await sendForm(state.form, values, {
      browser: page,
      // The view starts once the page is ready, as the fills begin, so its screen is up by the press.
      ready: async () => {
        if (!(await formReady(state.form, page))) return false;
        await claimView();
        return true;
      },
      reached: since => reachesFinish(page, state, track, since, stopped, raise),
      beforePress: async () => { track.at = await reading(page, state); },
      onStep: (name, more) => showStep(shown && more ? 'viewing' : name, more),
      record,
    });
    if (sent.result !== 'unconfirmed') return finish(sent.result, { reason: sent.reason });
    return unfinished(track);
  };
  /** After a one-site password link's save, with a finish: signs in with the saved login `name`, live where a view
   * can open, and waits for the finish as a send does. */
  const signIn = async name => {
    phase = 'sending';
    await claimView();
    const since = Date.now();
    showStep(shown ? 'viewing' : 'signing', { since });
    const track = { moved: false, at: await reading(page, state) };
    void signInWith(state.session, name, state.signIn).then(result => record({ step: 'login', ms: Date.now() - since, ok: result === 'accepted' || result === 'next-step', result }));
    const met = await reachesFinish(page, state, track, since, stopped, raise).catch(() => false);
    record({ step: 'finish', ms: Date.now() - since, ok: met });
    return met ? finish('done') : unfinished(track);
  };
  const onContinue = () => {
    if (!state.signIn) return finish('done');
    void signIn(saved.at(-1));
    return { signing: true, site };
  };
  const liveInfo = () => ({ live: { site, kind: state.form ? 'pay' : 'sign-in', since: shownSince, waitMs: SEND_WAIT_MS }, fit: shown?.whole() ?? null, now: Date.now() });
  const onViewed = () => {
    stopCause ??= 'view-done';
    endWatch();
  };
  const hooks = { onSaved: name => { if (!saved.includes(name)) saved.push(name); }, onDone: ready => finish('done', { ready }), onContinue, onOpened: () => writeFileSync(FILES.opened, ''), onSend, onCancel: () => finish('closed', { ready: false, cause: 'cancel-route' }), onFinished: () => finish('done', { cause: 'finished-route' }), fitted: () => live.describe(), onFit: kind => live.fit(kind), ready: () => formReady(state.form, page), onChanged: () => finish('not-accepted', { reason: 'page-changed', cause: 'ready' }), liveInfo, onViewed };
  try {
    await live?.fit();
    // A close that came during the first fit has ended the link: no page is served after it.
    if (!done) closePage = await servePage(state, hooks);
  } catch {
    return finish('error', { cause: 'error' });
  }
  /** One poll of a live view: a screen source that exited is started again and recorded, the finish is read unless
   * the view stays open, and the page's window is raised. Resolves to the result that ends the view, or null. */
  const pollView = async () => {
    try {
      if (await live.revive()) saveState();
    } catch {
      return 'error';
    }
    if (!state.view.keepOpen && finished(state, await seen(page, state))) return 'done';
    live.front();
    return null;
  };
  /** The call the server counts as use, which keeps the link's page open: a view's fit again, a form's constant. */
  const keepOpen = () => (live ? live.fit() : page.keepAlive());
  let keepAt = Date.now() + KEEP_MS;
  while (!done) {
    if (!listed && listing && existsSync(FILES.shown)) listed = list(listing);
    const idle = phase === 'open';
    if (idle && Date.now() >= state.deadline) return finish('timeout', { cause: 'deadline' });
    const ended = live && (await pollView());
    if (ended) return finish(ended, { cause: ended === 'error' ? 'error' : 'send' });
    if (page && idle && !done && Date.now() >= keepAt) {
      keepAt = Date.now() + KEEP_MS;
      await keepOpen().catch(() => {});
    }
    await sleep(idle ? Math.min(POLL_MS, Math.max(0, state.deadline - Date.now())) : POLL_MS);
  }
}

/** The folder name of the opener whose link took this one's place, on one line, or null. */
function replacedBy(completionId) {
  const record = readJson(FILES.replaced);
  const mine = completionId && record?.completionId === completionId && typeof record.by === 'string';
  return mine ? record.by.replace(/[\r\n]+/g, ' ') : null;
}

function report({ result, reason, watching, viewing, saved, appKeys, opened, completionId, notification }) {
  console.log(`HANDOVER_RESULT=${result}`);
  if (reason) console.log(`HANDOVER_REASON=${reason}`);
  if (viewing) console.log('HANDOVER_VIEWING=yes');
  else if (watching) console.log(`HANDOVER_WATCHING=${Math.ceil(WATCH_MS / 60_000)}`);
  if (Array.isArray(saved)) console.log(`HANDOVER_SAVED=${saved.join(',')}`);
  if (Array.isArray(appKeys)) console.log(`HANDOVER_APP_KEYS=${appKeys.join(',')}`);
  if (typeof opened === 'boolean') console.log(`HANDOVER_OPENED=${opened ? 'yes' : 'no'}`);
  const by = replacedBy(completionId);
  if (by) console.log(`HANDOVER_REPLACED_BY=${by}`);
  if (completionId) console.log(`HANDOVER_COMPLETION=${completionId}`);
  if (notification) console.log(`HANDOVER_NOTIFICATION=${notification}`);
  return 0;
}

/** True when the link `wait` began on, `mine`, gave way: another link holds the state, or took its result. A
 * watch's final result is the same link's, its completion marked `:late`. */
function gaveWay(mine, outcome) {
  const current = readJson(FILES.state)?.completionId;
  if (current) return current !== mine;
  return outcome.completionId ? outcome.completionId.replace(/:late$/, '') !== mine : !outcome.result && !existsSync(FILES.pid);
}

/** True the first time a `wait` meets this watching result, which it marks; the next `wait` blocks for the final. */
function firstReport(outcome) {
  if (readText(FILES.reported).trim() === outcome.completionId) return false;
  writeFileSync(FILES.reported, `${outcome.completionId}\n`, { mode: 0o600 });
  return true;
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
  for (;;) {
    // The watcher writes its result, then removes its pid: look for the pid first, so a result between the two is read.
    const running = existsSync(FILES.pid);
    const outcome = readJson(FILES.result) ?? {};
    if (mine && gaveWay(mine, outcome)) return report({ result: 'closed', saved: [], appKeys: [], opened: false, completionId: mine, notification: 'not-requested' });
    const landed = outcome.result && outcome.notification !== 'pending';
    if (landed && outcome.watching && !final && firstReport(outcome)) return report(outcome);
    if (landed && !outcome.watching && !existsSync(FILES.pid)) return report(outcome);
    if (!running) {
      console.error('No private link is open.');
      return 1;
    }
    if (!alive(watcherPid())) await recoverStale('error');
    await sleep(250);
  }
}

async function close() {
  useOwnPlace();
  const pid = watcherPid();
  if (!pid) {
    console.error('No private link is open.');
    return 0;
  }
  if (alive(pid)) {
    writeFileSync(FILES.closing, '', { mode: 0o600 });
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
    parsed = parseArgs({ args, allowPositionals: true, strict: true, options: { form: { type: 'string' }, view: { type: 'boolean' }, 'keep-open': { type: 'boolean' }, note: { type: 'string' }, until: { type: 'string' }, 'until-gone': { type: 'string' }, 'until-text': { type: 'string' }, 'sign-in': { type: 'string' }, passwords: { type: 'boolean' }, session: { type: 'string' }, site: { type: 'string' }, username: { type: 'string' }, 'email-first': { type: 'boolean' }, keys: { type: 'string' }, guide: { type: 'string' }, minutes: { type: 'string' }, help: { type: 'boolean' } } });
  } catch (error) {
    usageError(error.message);
  }
  const { values } = parsed;
  if (values.help) {
    console.log(USAGE);
    process.exit(0);
  }
  const [command, ...rest] = parsed.positionals;
  if (!['open', 'watch', 'wait', 'close', 'install-view'].includes(command) || rest.length) usageError(command ? `unknown command: ${[command, ...rest].join(' ')}` : 'missing command');
  // A live view holds a browser open while it waits, so it keeps the shorter day.
  const minutes = Number(values.minutes ?? (values.view ? 480 : 1440));
  if (!(minutes > 0)) usageError('--minutes must be a positive number');
  if (command === 'open') checkMode(values);
  return { command, values: { ...values, minutes, ...(values.keys !== undefined && { keys: keyNames(values.keys) }) } };
}

/** `open` takes one mode, and each flag goes with its own mode only, or a usage error. */
function checkMode(values) {
  checkPrefill(values);
  if (values.guide !== undefined && values.keys === undefined) usageError('--guide goes with --keys only');
  const modes = ['form', 'passwords', 'keys', 'view'].filter(mode => values[mode] !== undefined);
  if (modes.length !== 1) usageError('open takes one of --form, --passwords, --keys, or --view');
  const [mode] = modes;
  const onPage = mode === 'form' || mode === 'view';
  const finish = ['until', 'until-gone', 'until-text'].some(name => values[name] !== undefined);
  const signsIn = mode === 'passwords' && values.site !== undefined;
  if (values['keep-open'] && mode !== 'view') usageError('--keep-open goes with --view only');
  if (values['keep-open'] && finish) usageError('--keep-open takes no --until, --until-gone, or --until-text: it ends only on the person\'s I\'m finished, close, or the time limit');
  if (finish && !onPage && !signsIn) usageError('--until, --until-gone, and --until-text go with --form, --view, or --passwords --site only');
  if (values['sign-in'] !== undefined && !signsIn) usageError('--sign-in goes with --passwords --site only');
  if (signsIn && finish !== (values['sign-in'] !== undefined)) usageError('--passwords --site takes a finish and --sign-in together, or neither');
  if (values['sign-in'] !== undefined && !signInBoxes(values['sign-in'])) usageError('--sign-in takes the username box, the password box, and the submit button, as e3,e4,e5; leave out one you don\'t need, as e3,,e5');
  if (values['until-text'] !== undefined && !oneLine(values['until-text'], FORM_LIMITS.note)) usageError(`--until-text takes one line of up to ${FORM_LIMITS.note} characters`);
  if (values.session !== undefined && !onPage && mode !== 'passwords') usageError('--session goes with --form, --view, or --passwords only');
  if (!finish && onPage && !values['keep-open']) usageError(`--${mode} needs --until, --until-gone, or --until-text, to tell ${mode === 'form' ? 'sent from not accepted' : 'when the site lets the person through'}`);
  if (values.note !== undefined && (mode !== 'view' || !oneLine(values.note, FORM_LIMITS.note))) usageError(`--note goes with --view only, as one line of up to ${FORM_LIMITS.note} characters`);
}

/** `--sign-in`'s boxes, `[username, password, submit]`, each a ref or selector or null; null when it names neither a
 * username nor a password box, or has more than three parts. */
export function signInBoxes(text) {
  const boxes = text.split(',').map(box => box.trim() || null);
  const fits = boxes.length <= 3 && boxes.every(box => box === null || !box.startsWith('-')) && Boolean(boxes[0] || boxes[1]);
  return fits ? [0, 1, 2].map(at => boxes[at] ?? null) : null;
}

/** True for one line of text, not blank, of at most `most` characters. */
const oneLine = (text, most) => Boolean(text.trim()) && !/[\r\n]/.test(text) && text.length <= most;

/** `--site` and `--username` come only with `--passwords`: a website and one line of username, or a usage error.
 * `--email-first` comes only with `--site`. */
function checkPrefill({ passwords, site, username, 'email-first': emailFirst }) {
  if ((site !== undefined || username !== undefined) && !passwords) usageError('--site and --username go with --passwords only');
  if (emailFirst && site === undefined) usageError('--email-first goes with --passwords --site only');
  if (site !== undefined && (!hostOf(siteUrl(site)) || site.length > PASSWORD_LIMITS.field)) usageError(`--site takes a website, like netflix.com or https://www.netflix.com/login: '${site}'`);
  if (username !== undefined && !oneLine(username, PASSWORD_LIMITS.field)) usageError('--username takes one line of text');
}

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
  const run = { open: () => open(values), watch, wait, close, 'install-view': installViewTools }[command];
  const code = await run();
  process.exitCode = typeof code === 'number' ? code : 0;
}
