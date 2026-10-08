#!/usr/bin/env node
// Opens a private link that closes itself: a private form, the password link, or the key link.
//
//     node .claude/skills/hand-over/scripts/hand-over.mjs open --form <file> (--until <glob> | --until-gone <selector>) [--session <name>] [--minutes N]
//     node .claude/skills/hand-over/scripts/hand-over.mjs open --passwords [--site <url>] [--username <user>] [--minutes N]
//     node .claude/skills/hand-over/scripts/hand-over.mjs open --keys NAME[,NAME] [--guide <file>] [--minutes N]
//     node .claude/skills/hand-over/scripts/hand-over.mjs wait
//     node .claude/skills/hand-over/scripts/hand-over.mjs close
//
// `open` picks a free loopback port and a random key, starts a Cloudflare quick tunnel to that port,
// and spawns a detached watcher that serves the link's page there. It then asks the tunnel's public
// address for the page until it answers, so a first tap never lands on Cloudflare's error page, and
// only then prints `HANDOVER_LINK=<origin>/#key=<hex>` and exits. A tunnel that never registers and an
// address that never answers fail the same way, within 30 seconds. Every link goes through the tunnel:
// there is no loopback link. Each route needs the key in an `x-hand-over-key` header, logs nothing, and
// answers 410 once the link is ending. On the finish, the deadline, `close`, or a signal the watcher
// stops taking input, writes `result.json` with no address or key in it, tells the workspace that opened
// the link when the result is ready, and kills the tunnel. `wait` blocks for that result and prints
// `HANDOVER_RESULT=done|not-accepted|timeout|closed|error`.
//
// `open --form <file>` opens a private form for values the agent must never see, such as card details.
// form.mjs checks the file before any tunnel: a bad one exits 2 with `FORM_FILE=<where>: <reason>`. The
// form rides in the state file; it names the site's fields and button, never a value. The form works
// on the page open in the opener's browser session: browse.mjs's own default, the checkout's folder
// name, or `--session`. `open` refuses when that session has no page, or the page already meets the
// finish, since the form could not then tell sent from not accepted. The watcher serves form-page.html
// and .mjs and mounts form.mjs's keyed `GET /form`, `POST /send`, and `POST /done`. It sends the browser
// nothing until the person's one send. form.mjs then fills the site's fields through browse.mjs's
// client, which starts no browser and retries no step, and presses the site's button once. The watcher
// polls for up to 60 seconds, reading only the page's address (matched against `--until`: `**` any
// run, `*` no `/`) and a count of `--until-gone`'s selector (0 meets it); both given means both must
// hold. Reached is `done`. Otherwise form.mjs empties the text boxes it typed into and the result is
// `not-accepted`, which never announces readiness. A send under way outlasts the deadline and `close`.
//
// `open --passwords` opens the password link on the same key, tunnel, lock, and deadline, and touches
// no browser page. It serves passwords-page.html and .mjs and mounts passwords.mjs's keyed `POST /save`
// and `POST /done`; it ends on `/done`, `close`, or the deadline. `result.json` then also holds `saved`,
// the names the logins saved under, and `wait` prints `HANDOVER_SAVED=<name>,<name>` after the result: never a
// host, username, or password. `--site` (an http(s) URL or a bare host) and `--username` pre-fill the
// page's add-a-login form: they ride only in the printed link's fragment,
// `#key=<hex>&site=<url>&user=<username>`, URL-encoded, which a browser never sends, so they reach no
// server, log, or file.
//
// `open --keys NAME[,NAME]` opens the key link the same way, also touching no browser page. Before any
// tunnel, keys.mjs resolves each name against the example files: one declared in neither exits 2 with
// `KEYS_UNDECLARED=<name>,<name>`, one in both with `KEYS_AMBIGUOUS=`, and a destination not git-ignored
// exits 1. `--guide <file>` names a JSON file of each key's plain title, key-page address, steps, and
// test, which keys.mjs checks there too: a bad one exits 2 with `KEYS_GUIDE=<name>: <reason>`. The
// guide rides in the state file. It serves keys-page.html and .mjs and mounts keys.mjs's keyed
// `GET /keys`, `POST /save`, and `POST /done`; it ends on `/done`, on the save that leaves no asked-for
// key unsaved, `close`, or the deadline. `wait` prints `HANDOVER_SAVED=` the key names saved, then
// `HANDOVER_APP_KEYS=` those that went to app/.dev.vars, which the agent then loads with
// `npm run secrets:push`: never a value. Then `HANDOVER_OPENED=yes|no`: whether anyone opened the page.
//
// A key link's `--minutes` defaults to 30, the other links' to 10; each deadline starts at `open`. The
// first keyed `GET /keys` writes an `opened` marker. Until then a key link gives way: a new `open`
// writes `replaced.json`, the old link's completion identity and the new opener's folder name, signals
// the old watcher, which ends as `closed`, and takes its place. The first link's `wait` prints
// `HANDOVER_RESULT=closed` with no saved names, then `HANDOVER_REPLACED_BY=<folder>`, the workspace
// whose link took its place; no other link's `wait` reads that record as its own. An opened key link,
// a private form, or a password link refuses a second `open`.
//
// State lives in ~/.wong-stack/hand-over/; one link at a time. Exit codes: 0 ok · 1 failed or a
// link is already open · 2 usage · 3 `cloudflared` is missing (prints HANDOVER_NEEDS=cloudflared).
// Node built-ins only. For tests: HANDOVER_POLL_MS overrides the 2-second poll, HANDOVER_SEND_WAIT_MS
// the 60-second wait after a send, HANDOVER_TUNNEL_WAIT_MS the 30-second tunnel wait, and
// HANDOVER_PROBE_ORIGIN the address asked before the link prints, `{port}` standing for the page's port.

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { primaryRoot } from '../../memory/scripts/lib/primary-root.mjs';
import { client as browseClient, sessionName } from '../../browser/scripts/browse.mjs';
import { checkForm, FORM_ROUTES, formRoutes, sendForm } from './form.mjs';
import { APP_FILE, checkGuide, KEY_ROUTES, keyRoutes, LIMITS as KEY_LIMITS, NAME as KEY_NAME, resolveKeys } from './keys.mjs';
import { alive, freePort, hasCloudflared, keyMatches, killTunnel, linkAnswers, signal, startTunnel } from './lib/tunnel.mjs';
import { chatTarget, wakeChat } from './lib/wake.mjs';
import { hostOf, LIMITS as PASSWORD_LIMITS, PASSWORD_ROUTES, passwordRoutes } from './passwords.mjs';
import { siteUrl } from './passwords-page.mjs';

export { keyMatches, tunnelOrigin } from './lib/tunnel.mjs';

const USAGE = `usage: hand-over.mjs open --form <file> (--until <glob> | --until-gone <selector>) [--session <name>] [--minutes N]
       hand-over.mjs open --passwords [--site <url>] [--username <user>] [--minutes N]
       hand-over.mjs open --keys NAME[,NAME] [--guide <file>] [--minutes N]
       hand-over.mjs wait | close
  open    start the private link, print HANDOVER_LINK=<url> once it answers through
          Cloudflare, and watch for the finish
          --form: a JSON file of title, note, fields (label, kind, target, options),
          and submit (label, target), drawn as one box per field (exit 2 with
          FORM_FILE=); the person's one send fills the site's fields and presses its
          button; --until and --until-gone name where the site goes once it accepts;
          --session names the browse.mjs session whose page it is, when not the default
          --passwords: save logins and continue, or cancel; --site and --username
          fill in the add-a-login form, carried only in the link
          --keys: one box per declared name; it ends on cancellation or
          once every key is saved (exit 2 with KEYS_UNDECLARED= or KEYS_AMBIGUOUS=);
          open for 30 minutes, not 10, and an unopened one gives way to a new open
          --guide: a JSON file keyed by name, each with any of title, url, open,
          steps, and check {url, auth}, shown on the key page (exit 2 with KEYS_GUIDE=)
  wait    block until the link closes; print
          HANDOVER_RESULT=done|not-accepted|timeout|closed|error,
          then HANDOVER_SAVED=<name>,<name> for a password or key link, and
          HANDOVER_APP_KEYS=<name>,<name> and HANDOVER_OPENED=yes|no (whether
          anyone opened it) for a key link, then HANDOVER_REPLACED_BY=<folder>
          for a key link that gave way to that workspace's link
  close   close an open link (the person said done)`;
const TUNNEL_WAIT_MS = Number(process.env.HANDOVER_TUNNEL_WAIT_MS) || 30_000;
const PAGE_WAIT_MS = 10_000;
const POLL_MS = Number(process.env.HANDOVER_POLL_MS) || 2000;
const SEND_WAIT_MS = Number(process.env.HANDOVER_SEND_WAIT_MS) || 60_000;
const DIR = join(homedir(), '.wong-stack', 'hand-over');
const FILES = { pid: join(DIR, 'watcher.pid'), state: join(DIR, 'state.json'), result: join(DIR, 'result.json'), log: join(DIR, 'tunnel.log'), config: join(DIR, 'cloudflared.yml'), opened: join(DIR, 'opened'), replaced: join(DIR, 'replaced.json') };
/**
 * Removes a link's own files, the pid last: `wait` reads its absence as the end. Its result stays, and
 * so does the give-way record, which `wait` may read after this.
 */
const clearLink = () => { for (const file of [FILES.state, FILES.log, FILES.config, FILES.opened, FILES.pid]) rmSync(file, { force: true }); };
const HERE = dirname(fileURLToPath(import.meta.url));
const pages = name => ({
  '/': { file: join(HERE, `${name}.html`), type: 'text/html; charset=utf-8' },
  '/page.mjs': { file: join(HERE, `${name}.mjs`), type: 'text/javascript; charset=utf-8' },
});
const PAGES = { form: pages('form-page'), passwords: pages('passwords-page'), keys: pages('keys-page') };
const ROUTES = { form: FORM_ROUTES, passwords: PASSWORD_ROUTES, keys: KEY_ROUTES };
const sleep = ms => new Promise(done => setTimeout(done, ms));

// ---------------------------------------------------------------------------
// Pure helpers

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

// ---------------------------------------------------------------------------
// Files and processes

const readJson = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };
const readText = file => { try { return readFileSync(file, 'utf8'); } catch { return ''; } };

const watcherPid = () => Number(readText(FILES.pid).trim()) || null;

/** The browser client for a form's session: it starts no browser and retries no step, so nothing is typed or pressed twice. */
const formPage = session => browseClient(session, { retry: false, start: false });

/** The link's mode from its state: the password link, the key link, or a private form. */
const modeOf = ({ passwords, keys } = {}) => (passwords ? 'passwords' : keys ? 'keys' : 'form');

/** Kills the tunnel, records the result, and clears the rest; the watcher closes its page first. */
async function teardown(result, tunnelPid) {
  await killTunnel(tunnelPid);
  writeFileSync(FILES.result, `${JSON.stringify({ result })}\n`);
  clearLink();
}

/** Result-only completion message; routing and private input are never taken from the page. */
export function completionMessage(state, result) {
  const names = list => (list ?? []).filter(name => typeof name === 'string' && /^[a-zA-Z0-9_-]{1,200}$/.test(name));
  return `Private input ended. Resume the existing task once for this completion; if wait already reported it, consume the duplicate without repeating the task. ${JSON.stringify({ completionId: state.completionId, mode: modeOf(state), result: result.result, saved: names(result.saved), appKeys: names(result.appKeys) })}${result.appKeys?.length ? ' Push the saved Worker keys to both Workers as the secrets guide requires.' : ''}`;
}

/** Tells the workspace that opened the link its result is ready: `notified`, `unconfirmed`, or `unavailable`. */
export function notifyWorkspace(state, result) {
  return state.agentId ? wakeChat(state, completionMessage(state, result)) : Promise.resolve('unavailable');
}

/** Tears down a link whose watcher died without finishing. */
async function recoverStale(result) {
  await teardown(result, readJson(FILES.state)?.tunnelPid);
}

// ---------------------------------------------------------------------------
// The link's page

/** Ends a route with a JSON reply, or an empty one. */
function reply(response, status, body) {
  const text = body ? JSON.stringify(body) : '';
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(text) }).end(text);
}

/**
 * Serves the link's page on 127.0.0.1:`port` and mounts its mode's routes, passing `hooks` to them.
 * Each route needs the key in an `x-hand-over-key` header; a key link's and a form's page also hear
 * `deadline`. Resolves to a close().
 */
export function servePage({ port, key, passwords = false, keys = null, form = null, deadline }, hooks = {}) {
  const sockets = new Set();
  let finishing = false;
  let receipt = null;
  const mode = modeOf({ passwords, keys });
  hooks = { ...hooks, isOpen: () => !finishing };
  const routes = { passwords: () => passwordRoutes(hooks), keys: () => keyRoutes(keys, { ...hooks, closesAt: deadline }), form: () => formRoutes(form, { ...hooks, closesAt: deadline }) }[mode]();
  const served = PAGES[mode];
  const server = createServer((request, response) => {
    const { pathname } = new URL(request.url, 'http://page');
    if (pathname === '/receipt') {
      if (!keyMatches(request.headers['x-hand-over-key'], key)) return reply(response, 403);
      if (request.method !== 'GET') return reply(response, 405);
      return reply(response, receipt ? 200 : 202, receipt ?? { finishing });
    }
    if (ROUTES[mode].has(pathname)) {
      if (!keyMatches(request.headers['x-hand-over-key'], key)) return reply(response, 403);
      if (finishing) return reply(response, 410);
      return void routes(pathname, request, response).catch(() => reply(response, 500));
    }
    const page = request.method === 'GET' && Object.hasOwn(served, pathname) && served[pathname];
    if (!page) {
      response.writeHead(404, { 'content-length': 0 }).end();
      return;
    }
    response.writeHead(200, { 'content-type': page.type, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY', 'content-security-policy': "frame-ancestors 'none'" });
    response.end(readFileSync(page.file));
  });
  server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const close = () => new Promise(done => {
        server.close(() => done());
        for (const socket of sockets) socket.destroy();
      });
      close.stopInput = async () => {
        finishing = true;
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

// ---------------------------------------------------------------------------
// Subcommands

/**
 * What a finish is judged by: the page's address and the named element's count, each read only when
 * named. An address that can not be read is null, and a count NaN.
 */
async function seen(page, { until, untilGone }) {
  return {
    ...(until && { url: await page.url().catch(() => null) }),
    ...(untilGone && { count: await page.count(untilGone).then(Number, () => NaN) }),
  };
}

/** True once the site meets the finish; false when SEND_WAIT_MS passes first. */
async function reachesFinish(page, state) {
  const end = Date.now() + SEND_WAIT_MS;
  for (;;) {
    if (finished(state, await seen(page, state))) return true;
    if (Date.now() >= end) return false;
    await sleep(POLL_MS);
  }
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

/**
 * The key link's config, `{root, primary, linked, gitDir, keys}`, each key with its guide entry, or an
 * exit code once it has said why not: 2 for a name declared in neither example file or in both, or a
 * bad guide; 1 for a destination not git-ignored.
 */
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

/**
 * True once the live link has closed for a new one: only a key link nobody has opened gives way. It
 * first records whose place this opener's folder took, for the old link's `wait`.
 */
async function givesWay(pid) {
  const state = readJson(FILES.state) ?? {};
  if (modeOf(state) !== 'keys' || existsSync(FILES.opened)) return false;
  writeFileSync(FILES.replaced, `${JSON.stringify({ completionId: state.completionId, by: basename(process.cwd()) })}\n`, { mode: 0o600 });
  try { process.kill(pid, 'SIGTERM'); } catch { /* it ended first */ }
  for (let i = 0; i < 80 && alive(pid); i++) await sleep(100);
  return !alive(pid);
}

/** Why a form can not open on the session's page, or null: no page to read, or a finish it already meets. */
async function formFault(session, finish) {
  const now = await seen(formPage(session), finish);
  if (now.url === null || Number.isNaN(now.count)) return 'No page is open in this browser session; open the site\'s page with browse.mjs first, or name its --session.';
  if (finished(finish, now)) return 'The page already meets the finish, so the form could not tell sent from not accepted; name where the site goes next.';
  return null;
}

async function open(values) {
  const keys = values.keys ? keyConfig(values.keys, values.guide) : null;
  if (typeof keys === 'number') return keys;
  const form = values.form === undefined ? null : readForm(values.form);
  if (values.form !== undefined && !form) return 2;
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
  for (const file of [FILES.result, FILES.opened]) rmSync(file, { force: true });
  const deadline = Date.now() + values.minutes * 60_000;
  let tunnelPid = null;
  let watcher = null;
  const fail = async message => {
    console.error(message);
    if (watcher) signal(watcher, 'SIGKILL');
    await teardown('error', tunnelPid);
    return 1;
  };
  const finish = { until: values.until ?? null, untilGone: values['until-gone'] ?? null };
  const session = form ? sessionName(values.session) : null;
  const fault = form && (await formFault(session, finish));
  if (fault) return fail(fault);
  const port = await freePort();
  const key = randomBytes(32).toString('hex');
  const tunnelDeadline = Date.now() + TUNNEL_WAIT_MS;
  const tunnelDown = 'The Cloudflare tunnel did not come up within 30 seconds; try again in a minute.';
  const tunnel = await startTunnel(port, tunnelDeadline, FILES);
  tunnelPid = tunnel.pid;
  if (!tunnel.origin) return fail(tunnelDown);
  writeFileSync(FILES.state, `${JSON.stringify({ completionId: randomBytes(16).toString('hex'), ...chatTarget(), tunnelPid, port, session, key, passwords: Boolean(values.passwords), keys, form, ...finish, deadline })}\n`, { mode: 0o600 });
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'watch'], { detached: true, stdio: 'ignore' });
  watcher = child.pid;
  writeFileSync(FILES.pid, `${watcher}\n`);
  child.unref();
  if (!(await pageAnswers(port, watcher))) return fail('The link\'s page did not start; try again.');
  if (!(await linkAnswers(tunnel.origin, port, tunnelPid, tunnelDeadline))) return fail(tunnelDown);
  console.log(`HANDOVER_LINK=${tunnel.origin}/#${linkFragment(key, values)}`);
  return 0;
}

/** The link's `#` part: the key, then any site and username to pre-fill, URL-encoded. */
export function linkFragment(key, { site, username } = {}) {
  return new URLSearchParams({ key, ...(site && { site: site.trim() }), ...(username && { user: username.trim() }) }).toString();
}

/** Serves the page until the link's own finish, `close`, or the deadline; a form's send reads only the address and a count. */
async function watch() {
  const state = readJson(FILES.state);
  if (!state) return 1;
  let done = false;
  let sending = false;
  let closePage = null;
  const saved = modeOf(state) === 'form' ? undefined : [];
  let finishingPromise = null;
  const finish = (result, ready = result === 'done') => {
    if (finishingPromise) return finishingPromise;
    done = true;
    finishingPromise = (async () => {
      await closePage?.stopInput();
      const appKeys = state.keys && saved.filter(name => state.keys.keys.some(key => key.name === name && key.file === APP_FILE));
      const outcome = { result, ready, ...(saved && { saved }), ...(appKeys && { appKeys }), ...(state.keys && { opened: existsSync(FILES.opened) }), completionId: state.completionId, notification: ready ? 'pending' : 'not-requested' };
      writeFileSync(FILES.result, `${JSON.stringify(outcome)}\n`, { mode: 0o600 });
      outcome.notification = ready ? await notifyWorkspace(state, outcome) : 'not-requested';
      writeFileSync(FILES.result, `${JSON.stringify(outcome)}\n`, { mode: 0o600 });
      closePage?.setReceipt(outcome);
      // Receipt delivery is independent of the client: even a vanished client cannot retain input.
      setTimeout(async () => {
        await closePage?.();
        await killTunnel(state.tunnelPid);
        clearLink();
        process.exit(0);
      }, 1200);
      return outcome;
    })();
    return finishingPromise;
  };
  // A send under way ends the link itself: stopping it midway could leave a card typed on the page.
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(sig, () => { if (!sending) finish('closed', false); });
  const onSend = async values => {
    sending = true;
    const page = formPage(state.session);
    return finish(await sendForm(state.form, values, { browser: page, reached: () => reachesFinish(page, state) }));
  };
  const hooks = { onSaved: name => { if (!saved.includes(name)) saved.push(name); }, onDone: ready => finish('done', ready), onContinue: () => finish('done', true), onOpened: () => writeFileSync(FILES.opened, ''), onSend, onCancel: () => finish('closed', false) };
  try {
    closePage = await servePage(state, hooks);
  } catch {
    return finish('error');
  }
  while (!done) {
    if (!sending && Date.now() >= state.deadline) return finish('timeout');
    await sleep(sending ? POLL_MS : Math.min(POLL_MS, Math.max(0, state.deadline - Date.now())));
  }
}

/** The folder name of the opener whose link took this one's place, on one line, or null. */
function replacedBy(completionId) {
  const record = readJson(FILES.replaced);
  const mine = completionId && record?.completionId === completionId && typeof record.by === 'string';
  return mine ? record.by.replace(/[\r\n]+/g, ' ') : null;
}

/**
 * Prints a link's result lines: the result, then any saved names, whether a key link was opened, the
 * folder whose link took its place, completion identity, and notification.
 */
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

/**
 * Blocks until the watcher records a result; recovers a watcher that died without one. A key link that
 * gave way to a newer link reports `closed`, unopened, with nothing saved, never the newer link's result.
 */
async function wait() {
  const mine = readJson(FILES.state)?.completionId;
  for (;;) {
    const outcome = readJson(FILES.result) ?? {};
    if (mine && gaveWay(mine, outcome)) return report({ result: 'closed', saved: [], appKeys: [], opened: false, completionId: mine, notification: 'not-requested' });
    if (outcome.result && outcome.notification !== 'pending' && !existsSync(FILES.pid)) return report(outcome);
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
    process.kill(pid, 'SIGTERM');
    for (let i = 0; i < 50 && alive(pid); i++) await sleep(100);
  }
  // A watcher signalled before it set its handlers dies without a result; the close still stands.
  if (alive(pid)) return wait();
  if (!readJson(FILES.result)?.result) await recoverStale('closed');
  return wait();
}

// ---------------------------------------------------------------------------
// CLI

function usageError(message) {
  console.error(`${message}\n${USAGE}`);
  process.exit(2);
}

function parse(args) {
  let parsed;
  try {
    parsed = parseArgs({ args, allowPositionals: true, strict: true, options: { form: { type: 'string' }, until: { type: 'string' }, 'until-gone': { type: 'string' }, passwords: { type: 'boolean' }, session: { type: 'string' }, site: { type: 'string' }, username: { type: 'string' }, keys: { type: 'string' }, guide: { type: 'string' }, minutes: { type: 'string' }, help: { type: 'boolean' } } });
  } catch (error) {
    usageError(error.message);
  }
  const { values } = parsed;
  if (values.help) {
    console.log(USAGE);
    process.exit(0);
  }
  const [command, ...rest] = parsed.positionals;
  if (!['open', 'watch', 'wait', 'close'].includes(command) || rest.length) usageError(command ? `unknown command: ${[command, ...rest].join(' ')}` : 'missing command');
  const minutes = Number(values.minutes ?? (values.keys === undefined ? 10 : 30));
  if (!(minutes > 0)) usageError('--minutes must be a positive number');
  if (command === 'open') checkMode(values);
  return { command, values: { ...values, minutes, ...(values.keys !== undefined && { keys: keyNames(values.keys) }) } };
}

/** `open` takes one mode, and each flag goes with its own mode only, or a usage error. */
function checkMode(values) {
  checkPrefill(values);
  if (values.guide !== undefined && values.keys === undefined) usageError('--guide goes with --keys only');
  const modes = ['form', 'passwords', 'keys'].filter(mode => values[mode] !== undefined);
  if (modes.length !== 1) usageError('open takes one of --form, --passwords, or --keys');
  const finish = values.until !== undefined || values['until-gone'] !== undefined;
  if ((finish || values.session !== undefined) && modes[0] !== 'form') usageError('--until, --until-gone, and --session go with --form only');
  if (!finish && modes[0] === 'form') usageError('--form needs --until or --until-gone, to tell sent from not accepted');
}

/** `--site` and `--username` come only with `--passwords`: a website and one line of username, or a usage error. */
function checkPrefill({ passwords, site, username }) {
  if ((site !== undefined || username !== undefined) && !passwords) usageError('--site and --username go with --passwords only');
  if (site !== undefined && (!hostOf(siteUrl(site)) || site.length > PASSWORD_LIMITS.field)) usageError(`--site takes a website, like netflix.com or https://www.netflix.com/login: '${site}'`);
  if (username !== undefined && (!username.trim() || /[\r\n]/.test(username) || username.length > PASSWORD_LIMITS.field)) usageError('--username takes one line of text');
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
  const run = { open: () => open(values), watch, wait, close }[command];
  const code = await run();
  process.exitCode = typeof code === 'number' ? code : 0;
}
