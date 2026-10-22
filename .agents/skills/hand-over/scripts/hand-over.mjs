#!/usr/bin/env node
// Opens a private link that closes itself: a private form, the password link, the key link, or a live view.
// One link at a time, state in ~/.wong-stack/hand-over/. Exit codes: 0 ok · 1 failed · 2 usage · 3 a tool is missing.

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { primaryRoot } from '../../memory/scripts/lib/primary-root.mjs';
import { lookCss } from '../../plan/scripts/look.mjs';
import { client as browseClient, sessionName } from '../../browser/scripts/browse.mjs';
import { checkForm, FORM_ROUTES, formRoutes, LIMITS as FORM_LIMITS, sendForm } from './form.mjs';
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

const USAGE = `usage: hand-over.mjs open --form <file> (--until <glob> | --until-gone <selector>) [--session <name>] [--minutes N]
       hand-over.mjs open --view (--until <glob> | --until-gone <selector>) [--session <name>] [--note <line>] [--minutes N]
       hand-over.mjs open --passwords [--site <url> [--email-first]] [--username <user>] [--session <name>] [--minutes N]
       hand-over.mjs open --keys NAME[,NAME] [--guide <file>] [--minutes N]
       hand-over.mjs wait | close | install-view
  open    start the private link, print HANDOVER_LINK=<url> once it answers through
          Cloudflare, list its address (no username) in the app's inbox, and watch for the finish
          --form: a JSON file of title, note, fields (label, kind, target, options),
          and submit (label, target), drawn as one box per field (exit 2 with
          FORM_FILE=); the person's one send fills the site's fields and presses its
          button; --until and --until-gone name where the site goes once it accepts;
          --session names the browse.mjs session whose page it is, when not the default;
          the page shows one picture of the whole site page, taken before the link opens
          --view: a live view of that page for a check that asks whether a person is
          there, or a stuck login; the person taps or signs in through it, and it closes once the page meets --until
          or --until-gone; --note is the one line the page shows; open for 480 minutes;
          HANDOVER_VIEW=unsupported where the browser has no screen to show, and
          HANDOVER_NEEDS=live-view (exit 3) with a line per missing tool
          --passwords: save logins and continue, or cancel; --site and --username
          fill in the add-a-login form, carried only in the link; with --site, a
          picture of the --session page when it is on that site; --email-first,
          for a site that asks the email on a page of its own, makes the password
          optional
          --keys: one box per declared name; it ends on cancellation or
          once every key is saved (exit 2 with KEYS_UNDECLARED= or KEYS_AMBIGUOUS=);
          an unopened one gives way to a new open
          --guide: a JSON file keyed by name, each with any of title, url, open,
          steps, and check {url, auth}, shown on the key page (exit 2 with KEYS_GUIDE=)
          --minutes: time limit for any link, default 1440 (24 hours); 480 for --view
  wait    block until the link closes; print
          HANDOVER_RESULT=done|not-accepted|unconfirmed|timeout|closed|error,
          then for a form whose site has not answered HANDOVER_WATCHING=<minutes>:
          it still watches the site, and a second wait prints the final result;
          then HANDOVER_SAVED=<name>,<name> for a password or key link, and
          HANDOVER_APP_KEYS=<name>,<name> and HANDOVER_OPENED=yes|no (whether
          anyone opened it) for a key link, then HANDOVER_REPLACED_BY=<folder>
          for a key link that gave way to that workspace's link
  close   close an open link (the person said done)
  install-view
          add the live view's tools once the person agrees: prints
          HANDOVER_INSTALLED=live-view, or HANDOVER_INSTALL=manual and the one
          command for the person, having installed nothing`;
const TUNNEL_WAIT_MS = Number(process.env.HANDOVER_TUNNEL_WAIT_MS) || 30_000;
const PAGE_WAIT_MS = 10_000;
const POLL_MS = Number(process.env.HANDOVER_POLL_MS) || 2000;
const SEND_WAIT_MS = Number(process.env.HANDOVER_SEND_WAIT_MS) || 60_000;
const SEND_POLL_MS = Number(process.env.HANDOVER_SEND_POLL_MS) || 500;
const WATCH_MS = Number(process.env.HANDOVER_WATCH_MS) || 10 * 60_000;
const KEEP_MS = Number(process.env.HANDOVER_KEEPALIVE_MS) || 60_000;
const DIR = join(homedir(), '.wong-stack', 'hand-over');
const FILES = { pid: join(DIR, 'watcher.pid'), state: join(DIR, 'state.json'), result: join(DIR, 'result.json'), log: join(DIR, 'tunnel.log'), config: join(DIR, 'cloudflared.yml'), opened: join(DIR, 'opened'), replaced: join(DIR, 'replaced.json'), picture: join(DIR, 'picture.png'), timings: join(DIR, 'timings.jsonl'), reported: join(DIR, 'reported'), closing: join(DIR, 'closing'), shown: join(DIR, 'shown') };
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
/** Why a link can not open on a page that already meets its finish. */
const MET = {
  form: 'The page already meets the finish, so the form could not tell sent from not accepted; name where the site goes next.',
  view: 'The page already meets the finish, so the view would close at once; name where the site goes once the check is passed.',
};
const sleep = ms => new Promise(done => setTimeout(done, ms));

/** A URL glob as a whole-string RegExp: `**` any run, `*` anything but `/`. */
export function globToRegExp(glob) {
  const body = glob.split('**').map(part => part.split('*').map(text => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*');
  return new RegExp(`^${body}$`);
}

/** True when the finish is met: every named check holds, and at least one was named. */
export function finished({ until, untilGone }, { url, count }) {
  if (!until && !untilGone) return false;
  if (until && !(url != null && globToRegExp(until).test(url))) return false;
  if (untilGone && count !== 0) return false;
  return true;
}

const readJson = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };
const readText = file => { try { return readFileSync(file, 'utf8'); } catch { return ''; } };

const watcherPid = () => Number(readText(FILES.pid).trim()) || null;

/** A link's browser client: it starts no browser and retries no step, so nothing is typed or pressed twice. */
const pageOf = session => browseClient(session, { retry: false, start: false });

/** The link's mode from its state: the password link, the key link, a live view, or a private form. */
const modeOf = ({ passwords, keys, view } = {}) => (passwords ? 'passwords' : keys ? 'keys' : view ? 'view' : 'form');

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
  return `Private input ended. Resume the existing task once for this completion; if wait already reported it, consume the duplicate without repeating the task. ${JSON.stringify({ completionId: state.completionId, mode: modeOf(state), result: result.result, ...(result.watching && { watching: true }), saved: names(result.saved), appKeys: names(result.appKeys) })}${result.appKeys?.length ? ' Push the saved Worker keys to the live app as the secrets guide requires.' : ''}`;
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

/** Serves the link's page on 127.0.0.1:`port`; each route needs the key in an `x-hand-over-key` header.
 * A view's viewer scripts go unkeyed, since an `import` carries no header. Resolves to a close(). */
export function servePage({ port, key, passwords = false, keys = null, form = null, view = null, picture = false, deadline }, hooks = {}) {
  const sockets = new Set();
  let finishing = false;
  let receipt = null;
  let step = null;
  const mode = modeOf({ passwords, keys, view });
  hooks = { ...hooks, isOpen: () => !finishing };
  const routes = { passwords: () => passwordRoutes(hooks), keys: () => keyRoutes(keys, { ...hooks, closesAt: deadline }), form: () => formRoutes(form, { ...hooks, closesAt: deadline, picture }), view: () => viewRoutes(view, { ...hooks, closesAt: deadline }) }[mode]();
  const served = PAGES[mode];
  const bridge = view && screenBridge({ key, socketPath: socketOf(view.dir), isOpen: () => !finishing });
  /** What a GET of `pathname` serves: the page's own file, or for a view one of the viewer's scripts. */
  const fileFor = pathname => {
    if (Object.hasOwn(served, pathname)) return served[pathname];
    const file = view && viewerFile(pathname);
    return file ? { file, type: SCRIPT } : null;
  };
  const server = createServer((request, response) => {
    const { pathname } = new URL(request.url, 'http://page');
    if (pathname === '/receipt') {
      if (!keyMatches(request.headers['x-hand-over-key'], key)) return reply(response, 403);
      if (request.method !== 'GET') return reply(response, 405);
      return reply(response, receipt ? 200 : 202, receipt ?? { finishing, ...(step && { step }) });
    }
    if (pathname === '/picture' && PICTURED.has(mode)) return servePicture(request, response, { key, finishing, picture });
    if (ROUTES[mode].has(pathname)) {
      if (!keyMatches(request.headers['x-hand-over-key'], key)) return reply(response, 403);
      if (finishing) return reply(response, 410);
      return void routes(pathname, request, response).catch(() => reply(response, 500));
    }
    const page = request.method === 'GET' && fileFor(pathname);
    if (!page) {
      response.writeHead(404, { 'content-length': 0 }).end();
      return;
    }
    response.writeHead(200, { 'content-type': page.type, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY', 'content-security-policy': "frame-ancestors 'none'" });
    response.end(page.text ? page.text() : readFileSync(page.file));
  });
  server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  if (bridge) server.on('upgrade', bridge);
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
      close.setStep = value => { step = value; };
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

/** What a finish is judged by: the page's address and the named element's count, each read only when
 * named. An address that can not be read is null, and a count NaN. */
async function seen(page, { until, untilGone }) {
  return {
    ...(until && { url: await page.url().catch(() => null) }),
    ...(untilGone && { count: await page.count(untilGone).then(Number, () => NaN) }),
  };
}

/** The page's address and, when the finish names one, the gone element's count: what a send compares. */
async function reading(page, { untilGone }) {
  return { url: await page.url().catch(() => null), ...(untilGone && { count: await page.count(untilGone).then(Number, () => NaN) }) };
}

/** One read after the press: true once the finish is met. A failed read, or an address other than the press's
 * (`track.at`), marks the page `moved` for good: unknown is never "not yet", and nothing is put back on it. */
async function look(page, state, track) {
  const now = await reading(page, state);
  if (now.url === null || Number.isNaN(now.count) || now.url !== track.at?.url) track.moved = true;
  track.last = now;
  return finished(state, now);
}

/** True once the site meets the finish; false when SEND_WAIT_MS passes after the press was sent, at `since`. */
async function reachesFinish(page, state, track, since) {
  const end = since + SEND_WAIT_MS;
  for (;;) {
    if (await look(page, state, track)) return true;
    if (Date.now() >= end) return false;
    await sleep(SEND_POLL_MS);
  }
}

/** True when the page is as it was at the press: never moved, the same address, any gone element's count unchanged. */
const keptStill = ({ moved, at, last }) => !moved && Boolean(at && last) && last.url === at.url && last.count === at.count;

/** Reads an unconfirmed send's page every POLL_MS for WATCH_MS or until `stop`; each read keeps the page open. `done`
 * on the finish; `not-accepted`, boxes put back, only on a page that kept still, so not paying; else `unconfirmed`. */
async function watchSite(page, state, track, { putBack, stop, stopped }) {
  const end = Date.now() + WATCH_MS;
  while (!stopped() && Date.now() < end) {
    if (await look(page, state, track)) return 'done';
    await Promise.race([sleep(POLL_MS), stop]);
  }
  if (await look(page, state, track)) return 'done';
  if (!keptStill(track)) return 'unconfirmed';
  await putBack();
  return 'not-accepted';
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
  writeFileSync(FILES.replaced, `${JSON.stringify({ completionId: state.completionId, by: basename(process.cwd()) })}\n`, { mode: 0o600 });
  try { process.kill(pid, 'SIGTERM'); } catch { /* it ended first */ }
  for (let i = 0; i < 80 && alive(pid); i++) await sleep(100);
  return !alive(pid);
}

/** Why a form or a view can not open on the session's page, or null: no page, or a finish already met (`met`). */
async function pageFault(session, finish, met) {
  const now = await seen(pageOf(session), finish);
  if (now.url === null || Number.isNaN(now.count)) return 'No page is open in this browser session; open the site\'s page with browse.mjs first, or name its --session.';
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

/** A view's state for the session's page, its screen source started. Null, once it has said so, when the
 * browser has no screen. Throws when the source does not start. */
async function openView(session, note) {
  const display = screenOf();
  if (!display) return void unsupported('The browser has no screen to show.');
  const size = await pageOf(session).size();
  return { note: note ?? null, size, display, ...(await startSource(display, mkdtempSync(join(DIR, 'screen-')))) };
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

async function open(values) {
  const keys = values.keys ? keyConfig(values.keys, values.guide) : null;
  if (typeof keys === 'number') return keys;
  const form = values.form === undefined ? null : readForm(values.form);
  if (values.form !== undefined && !form) return 2;
  const refused = values.view ? viewRefusal() : 0;
  if (refused) return refused;
  mkdirSync(DIR, { recursive: true });
  const live = watcherPid();
  if (alive(live) && !(await givesWay(live))) {
    console.error('A private link is already open. Run `hand-over.mjs close` first.');
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
  const finish = { until: values.until ?? null, untilGone: values['until-gone'] ?? null };
  const session = form || values.view ? sessionName(values.session) : null;
  const fail = async message => {
    if (message) console.error(message);
    if (watcher) signal(watcher, 'SIGKILL');
    await teardown('error', { tunnelPid, view, session });
    return 1;
  };
  const fault = session && (await pageFault(session, finish, form ? MET.form : MET.view));
  if (fault) return fail(fault);
  if (values.view) {
    try {
      view = await openView(session, values.note);
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
  writeFileSync(FILES.state, `${JSON.stringify({ completionId, ...chatTarget(), tunnelPid, port, session, key, passwords: Boolean(values.passwords), keys, form, view, picture: pictured, ...finish, deadline })}\n`, { mode: 0o600 });
  // The listing holds the site, so it rides in the watcher's environment, never in a file.
  const env = { ...process.env, HANDOVER_LISTING: JSON.stringify(listing) };
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'watch'], { detached: true, stdio: 'ignore', env });
  watcher = child.pid;
  writeFileSync(FILES.pid, `${watcher}\n`);
  child.unref();
  if (!(await pageAnswers(port, watcher))) return fail('The link\'s page did not start; try again.');
  if (!(await linkAnswers(tunnel.origin, port, tunnelPid, tunnelDeadline))) return fail(tunnelDown);
  console.log(`HANDOVER_LINK=${tunnel.origin}/#${linkFragment(key, values)}`);
  // The watcher lists the link in the inbox once the chat has it, so open returns at once.
  writeFileSync(FILES.shown, '');
  return 0;
}

/** What the inbox lists for a link: its address without the username, and a title from what the opener already has,
 * never a value, a note, or a picture. */
export function listingOf({ completionId, key, keys, form, view, deadline }, origin, { site, 'email-first': emailFirst } = {}, cwd = process.cwd()) {
  const [what, title] = keys ? ['key', keys.keys.map(each => each.guide?.title ?? readableName(each.name)).join(', ')]
    : form ? ['card', form.title] : view ? ['view', 'Help the browser past a check']
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

/** Serves the page until the link's own finish, `close`, or the deadline; an unanswered send then watches the site.
 * A send and a view's poll read only the address and a count; an idle page is kept open by one call a minute. */
async function watch() {
  const state = readJson(FILES.state);
  if (!state) return 1;
  const listing = JSON.parse(process.env.HANDOVER_LISTING ?? 'null');
  delete process.env.HANDOVER_LISTING;
  let done = false;
  // open, then sending once the person sends, then watching once a send is unconfirmed.
  let phase = 'open';
  let closePage = null;
  let stopCause = null;
  let endWatch = () => {};
  const stop = new Promise(resolve => { endWatch = resolve; });
  const page = state.session ? pageOf(state.session) : null;
  const live = state.view ? liveView(state.view, page) : null;
  const saved = page ? undefined : [];
  const record = entry => time(state.completionId, entry);
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
  const finish = (result, { ready = result === 'done', watching = false, cause = 'send' } = {}) => {
    if (finishingPromise) return finishingPromise;
    done = true;
    record({ ended: result, cause });
    finishingPromise = (async () => {
      await closePage?.stopInput();
      await live?.end();
      const appKeys = state.keys && saved.filter(name => state.keys.keys.some(key => key.name === name && key.file === APP_FILE));
      const outcome = await publish({ result, ready, ...(watching && { watching: true }), ...(saved && { saved }), ...(appKeys && { appKeys }), ...(state.keys && { opened: existsSync(FILES.opened) }), completionId: state.completionId }, ready || watching);
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
  /** After an unconfirmed send: watches the site, then reports the final result as a new completion and ends. */
  const watchOn = async (track, putBack) => {
    const started = Date.now();
    state.watching = { until: started + WATCH_MS, sentUrl: track.at?.url ?? null };
    writeFileSync(FILES.state, `${JSON.stringify(state)}\n`, { mode: 0o600 });
    const result = await watchSite(page, state, track, { putBack, stop, stopped: () => Boolean(stopCause) }).catch(() => 'unconfirmed');
    record({ step: 'watch', ms: Date.now() - started, ok: result === 'done' });
    record({ ended: result, cause: stopCause ?? 'watch' });
    const completionId = `${state.completionId}:late`;
    await publish({ result, ready: result === 'done', completionId }, true, { ...state, completionId });
    await inputDown.catch(() => {});
    clearLink();
    process.exit(0);
  };
  /** What sent a signal: the close command, a newer link this one gave way to, or the signal alone. */
  const causeOf = sig => (existsSync(FILES.closing) ? 'close-command' : readJson(FILES.replaced)?.completionId === state.completionId ? 'gave-way' : sig);
  // A send under way ends the link itself: stopping it midway could leave a card typed on the page. A signal
  // during it is kept, so a watch that follows ends at once; a watch ends early.
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(sig, () => {
    if (phase === 'open') return finish('closed', { ready: false, cause: causeOf(sig) });
    stopCause ??= causeOf(sig);
    if (phase === 'watching') endWatch();
  });
  const onSend = async values => {
    phase = 'sending';
    const track = { moved: false };
    const sent = await sendForm(state.form, values, {
      browser: page,
      reached: since => reachesFinish(page, state, track, since),
      beforePress: async () => { track.at = await reading(page, state); },
      onStep: name => closePage?.setStep(name),
      record,
    });
    if (sent.result !== 'unconfirmed') return finish(sent.result);
    phase = 'watching';
    const outcome = await finish('unconfirmed', { watching: true });
    void watchOn(track, sent.putBack);
    return outcome;
  };
  const hooks = { onSaved: name => { if (!saved.includes(name)) saved.push(name); }, onDone: ready => finish('done', { ready }), onContinue: () => finish('done'), onOpened: () => writeFileSync(FILES.opened, ''), onSend, onCancel: () => finish('closed', { ready: false, cause: 'cancel-route' }), fitted: () => live.describe(), onFit: kind => live.fit(kind) };
  try {
    await live?.fit();
    // A close that came during the first fit has ended the link: no page is served after it.
    if (!done) closePage = await servePage(state, hooks);
  } catch {
    return finish('error', { cause: 'error' });
  }
  /** One poll of a live view: a screen source that exited is started again and recorded, the finish is
   * read, and the page's window is raised. Resolves to the result that ends the view, or null. */
  const pollView = async () => {
    try {
      if (await live.revive()) writeFileSync(FILES.state, `${JSON.stringify(state)}\n`, { mode: 0o600 });
    } catch {
      return 'error';
    }
    if (finished(state, await seen(page, state))) return 'done';
    live.front();
    return null;
  };
  /** The call camofox counts as use, which keeps the link's page open: a view's fit again, a form's constant. */
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

function report({ result, watching, saved, appKeys, opened, completionId, notification }) {
  console.log(`HANDOVER_RESULT=${result}`);
  if (watching) console.log(`HANDOVER_WATCHING=${Math.ceil(WATCH_MS / 60_000)}`);
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

/** Blocks until the watcher records a result, recovering a dead watcher; a watching result reports once unless `final`.
 * A key link that gave way reports `closed`, unopened, with nothing saved, never the newer link's result. */
async function wait({ final = false } = {}) {
  const mine = readJson(FILES.state)?.completionId;
  for (;;) {
    const outcome = readJson(FILES.result) ?? {};
    if (mine && gaveWay(mine, outcome)) return report({ result: 'closed', saved: [], appKeys: [], opened: false, completionId: mine, notification: 'not-requested' });
    const landed = outcome.result && outcome.notification !== 'pending';
    if (landed && outcome.watching && !final && firstReport(outcome)) return report(outcome);
    if (landed && !outcome.watching && !existsSync(FILES.pid)) return report(outcome);
    if (!existsSync(FILES.pid)) {
      console.error('No private link is open.');
      return 1;
    }
    if (!alive(watcherPid())) await recoverStale('error');
    await sleep(250);
  }
}

async function close() {
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
    parsed = parseArgs({ args, allowPositionals: true, strict: true, options: { form: { type: 'string' }, view: { type: 'boolean' }, note: { type: 'string' }, until: { type: 'string' }, 'until-gone': { type: 'string' }, passwords: { type: 'boolean' }, session: { type: 'string' }, site: { type: 'string' }, username: { type: 'string' }, 'email-first': { type: 'boolean' }, keys: { type: 'string' }, guide: { type: 'string' }, minutes: { type: 'string' }, help: { type: 'boolean' } } });
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
  const finish = values.until !== undefined || values['until-gone'] !== undefined;
  if (finish && !onPage) usageError('--until and --until-gone go with --form or --view only');
  if (values.session !== undefined && !onPage && mode !== 'passwords') usageError('--session goes with --form, --view, or --passwords only');
  if (!finish && onPage) usageError(`--${mode} needs --until or --until-gone, to tell ${mode === 'form' ? 'sent from not accepted' : 'when the site lets the person through'}`);
  if (values.note !== undefined && (mode !== 'view' || !oneLine(values.note, FORM_LIMITS.note))) usageError(`--note goes with --view only, as one line of up to ${FORM_LIMITS.note} characters`);
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
