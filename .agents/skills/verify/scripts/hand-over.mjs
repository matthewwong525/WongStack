#!/usr/bin/env node
// Hands the agent's browser to the person through a private link that closes itself.
//
//     node .claude/skills/verify/scripts/hand-over.mjs open [--until <glob>] [--until-gone <selector>] [--local] [--minutes N]
//     node .claude/skills/verify/scripts/hand-over.mjs open --passwords [--local] [--minutes N]
//     node .claude/skills/verify/scripts/hand-over.mjs wait
//     node .claude/skills/verify/scripts/hand-over.mjs close
//
// `open` sets the page to 1280×720, so the live picture and the clicks agree; closes blank tabs and
// brings the task's page to the front; reads the session's live-feed port; picks a free loopback port
// and a random key; starts a Cloudflare quick tunnel to that port; spawns a detached watcher; waits
// until the page answers; prints `HANDOVER_LINK=<origin>/#key=<hex>`; and exits. `--local` skips the
// tunnel and prints `http://127.0.0.1:<port>/#key=<hex>`.
//
// The watcher (`watch`, internal) serves the hand-over page (hand-over-page.html and .mjs) on that
// port and passes `/stream?key=<hex>` through to the live feed, with no `Origin`, never reading a
// frame. It polls every 2 seconds, reading only `agent-browser get url` (matched against `--until`:
// `**` any run, `*` no `/`) and `agent-browser get count <selector>` (0 meets `--until-gone`); both
// given means both must hold, neither means only `close` or the deadline ends it.
//
// For the page's field list it also serves four routes, each needing the key in an `x-hand-over-key`
// header. `GET /fields` runs the fixed FIELD_SCAN through `agent-browser eval`, which reads each
// field's label, kind, marks, and a dropdown's choices, never a value, tick state, or current choice;
// the page gets them with a `ref` per field and never sees a selector. `POST /focus` clears and
// focuses a field (`fill <sel> ""`, `focus <sel>`), `POST /select` picks a scanned choice, and
// `POST /check` ticks or unticks a box. Typed text never reaches the watcher: the page sends it as key
// presses over the live feed. `POST /viewport`, keyed the same way, sets the page to the size the
// hand-over page asks for (a phone's width), clamped to 320–1280 × 400–1280. The routes run one at a
// time and log nothing. On finish, deadline, `close`, or a signal it closes the page, kills the
// tunnel, puts the page back to 1280×720, and writes `result.json` with no address or key in it.
// `wait` blocks for that result and prints `HANDOVER_RESULT=done|timeout|closed|error`.
//
// `open --passwords` opens the password link on the same key, tunnel, lock, and deadline, and touches
// no browser page: no viewport, tabs, live feed, or field routes. It serves passwords-page.html and
// .mjs and mounts passwords.mjs's keyed `POST /save` and `POST /done`; it ends on `/done`, `close`, or
// the deadline. `result.json` then also holds `saved`, the vault names saved, and `wait` prints
// `HANDOVER_SAVED=<name>,<name>` after the result: never a host, username, or password.
//
// State lives in ~/.wong-stack/hand-over/; one link at a time. Exit codes: 0 ok · 1 failed or a
// link is already open · 2 usage · 3 `cloudflared` is missing (prints HANDOVER_NEEDS=cloudflared).
// Node built-ins only. HANDOVER_POLL_MS overrides the 2-second poll, for tests.

import { execFile, spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { connect, createServer as createTcpServer } from 'node:net';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';
import { PASSWORD_ROUTES, passwordRoutes } from './passwords.mjs';

const USAGE = `usage: hand-over.mjs open [--until <glob>] [--until-gone <selector>] [--local] [--minutes N]
       hand-over.mjs open --passwords [--local] [--minutes N]
       hand-over.mjs wait | close
  open    start the private link, print HANDOVER_LINK=<url>, and watch for the finish
          --passwords: the password link instead, to save logins; it ends on Done
  wait    block until the link closes; print HANDOVER_RESULT=done|timeout|closed|error,
          then HANDOVER_SAVED=<name>,<name> for a password link
  close   close an open link (the person said done)`;
const TUNNEL_WAIT_MS = 30_000;
const PAGE_WAIT_MS = 10_000;
const TOOL_TIMEOUT_MS = 15_000;
const POLL_MS = Number(process.env.HANDOVER_POLL_MS) || 2000;
const DIR = join(homedir(), '.wong-stack', 'hand-over');
const FILES = { pid: join(DIR, 'watcher.pid'), state: join(DIR, 'state.json'), result: join(DIR, 'result.json'), log: join(DIR, 'tunnel.log'), config: join(DIR, 'cloudflared.yml') };
const HERE = dirname(fileURLToPath(import.meta.url));
const pages = name => ({
  '/': { file: join(HERE, `${name}.html`), type: 'text/html; charset=utf-8' },
  '/page.mjs': { file: join(HERE, `${name}.mjs`), type: 'text/javascript; charset=utf-8' },
});
const PAGES = { handOver: pages('hand-over-page'), passwords: pages('passwords-page') };
const BLANK_URLS = new Set(['', 'about:blank', 'chrome://newtab/', 'chrome://new-tab-page/']);
const BODY_LIMIT = 4096;
const VIEWPORT_LIMITS = { width: [320, 1280], height: [400, 1280] };
const sleep = ms => new Promise(done => setTimeout(done, ms));

/**
 * The page script behind `GET /fields`: the top document's visible, enabled, writable text fields,
 * dropdowns, and tick boxes in page order, at most 40, each with a selector the watcher keeps. It reads
 * attributes, labels, and a dropdown's choices, and never a field's value, tick state, or choice.
 */
export const FIELD_SCAN = `(() => {
  const SKIP = new Set(['hidden', 'submit', 'button', 'reset', 'image', 'file', 'radio', 'range', 'color']);
  const clean = text => String(text ?? '').replace(/\\s+/g, ' ').trim().slice(0, 80);
  const textOf = node => {
    const copy = node.cloneNode(true);
    for (const inner of copy.querySelectorAll('input, select, textarea, script, style')) inner.remove();
    return copy.textContent;
  };
  const byIds = ids => ids.split(/\\s+/).map(id => document.getElementById(id)).filter(Boolean).map(textOf).join(' ');
  const labelOf = field => clean(field.labels?.[0] && textOf(field.labels[0])) || clean(field.getAttribute('aria-label'))
    || clean(byIds(field.getAttribute('aria-labelledby') ?? '')) || clean(field.getAttribute('placeholder')) || clean(field.getAttribute('name'));
  const path = field => {
    const steps = [];
    for (let node = field; node && node !== document.body; node = node.parentElement) {
      let nth = 1;
      for (let before = node.previousElementSibling; before; before = before.previousElementSibling) if (before.localName === node.localName) nth++;
      steps.unshift(node.localName + ':nth-of-type(' + nth + ')');
    }
    return 'body > ' + steps.join(' > ');
  };
  const selectorOf = field => field.id && document.querySelectorAll('#' + CSS.escape(field.id)).length === 1 ? '#' + CSS.escape(field.id) : path(field);
  const fields = [];
  for (const field of document.querySelectorAll('input, select, textarea')) {
    const type = field.localName === 'input' ? field.type : field.localName;
    if (SKIP.has(type) || field.disabled || field.readOnly || !field.getClientRects().length) continue;
    fields.push({
      kind: type === 'select' ? 'select' : type === 'checkbox' ? 'checkbox' : 'text',
      type,
      label: labelOf(field),
      autocomplete: field.getAttribute('autocomplete') ?? '',
      name: field.getAttribute('name') ?? '',
      id: field.id,
      placeholder: field.getAttribute('placeholder') ?? '',
      required: field.required,
      options: type === 'select' ? Array.from(field.options, option => ({ value: option.getAttribute('value') ?? option.text, text: clean(option.text) })) : [],
      selector: selectorOf(field),
    });
    if (fields.length === 40) break;
  }
  return fields;
})()`;

/** The HTML autofill field names a page's own `autocomplete` may end in. */
const AUTOFILL_TOKENS = new Set(['name', 'honorific-prefix', 'given-name', 'additional-name', 'family-name', 'honorific-suffix', 'nickname', 'username', 'new-password', 'current-password', 'one-time-code', 'organization-title', 'organization', 'street-address', 'address-line1', 'address-line2', 'address-line3', 'address-level4', 'address-level3', 'address-level2', 'address-level1', 'country', 'country-name', 'postal-code', 'cc-name', 'cc-given-name', 'cc-additional-name', 'cc-family-name', 'cc-number', 'cc-exp', 'cc-exp-month', 'cc-exp-year', 'cc-csc', 'cc-type', 'transaction-currency', 'transaction-amount', 'language', 'bday', 'bday-day', 'bday-month', 'bday-year', 'sex', 'url', 'photo', 'tel', 'tel-country-code', 'tel-national', 'tel-area-code', 'tel-local', 'tel-extension', 'email', 'impp']);
const MONTHS = /^((0?[1-9]|1[0-2])\b|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/;
const EXP = /\bexp|\bvalid/;

/** The choices of a dropdown that look like a date part, placeholders such as *Month* left out. */
const dateChoices = options => (options ?? []).map(option => option.text.toLowerCase()).filter(text => /^\d+$/.test(text) || MONTHS.test(text));
const monthList = options => { const texts = dateChoices(options); return texts.length === 12 && texts.every(text => MONTHS.test(text)); };
const yearList = options => { const texts = dateChoices(options); return texts.length > 1 && !monthList(options) && texts.every(text => /^(\d{2}|\d{4})$/.test(text)); };

/** The first rule matching a field's joined name, id, label, and placeholder names its token. */
const AUTOFILL_RULES = [
  ['cc-number', words => /\bcard ?(number|num|no)\b|\bcardnum|\bcc ?num|\bpan\b/.test(words)],
  ['cc-csc', words => /\b(cvv2?|cvc2?|cvn|cv2|csc)\b|security code|card verification|verification (number|value)/.test(words)],
  ['cc-exp-month', (words, field) => /\bmm\b(?! ?\/)/.test(words) || (EXP.test(words) && (/\bmonth/.test(words) || monthList(field.options)))],
  ['cc-exp-year', (words, field) => /(?<!\/ ?)\byy(yy)?\b/.test(words) || (EXP.test(words) && (/\byear/.test(words) || yearList(field.options)))],
  ['cc-exp', words => /expir|\bexp\b|\bmm ?\/ ?yy/.test(words)],
  ['cc-name', words => /name on card|card ?holder|\bcc ?name/.test(words)],
  ['one-time-code', words => /\botp\b|one ?time|verification code|\b2fa\b|\bmfa\b/.test(words)],
  ['new-password', words => /pass ?(word|wd)|\bpwd\b/.test(words) && /\bnew|confirm|repeat|again/.test(words)],
  ['current-password', words => /pass ?(word|wd)|\bpwd\b/.test(words)],
  ['email', words => /e ?mail/.test(words)],
  ['username', words => /\buser|\blog ?in\b/.test(words)],
  ['tel', words => /phone|mobile|\btel\b/.test(words)],
  ['postal-code', words => /postal|\bzip|post ?code/.test(words)],
  ['address-line1', words => /address|street/.test(words)],
  ['address-level2', words => /\bcity\b|\btown\b/.test(words)],
  ['country', words => /country/.test(words)],
  ['given-name', words => /first ?name|given ?name/.test(words)],
  ['family-name', words => /last ?name|surname|family ?name/.test(words)],
  ['name', words => /full ?name/.test(words)],
];
const TYPE_TOKENS = { email: 'email', tel: 'tel', password: 'current-password' };
const NUMERIC_TOKENS = new Set(['cc-number', 'cc-csc', 'one-time-code']);

// ---------------------------------------------------------------------------
// Pure helpers

/** agent-browser's URL glob as a whole-string RegExp: `**` any run, `*` anything but `/`. */
export function globToRegExp(glob) {
  const body = glob.split('**').map(part => part.split('*').map(text => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*');
  return new RegExp(`^${body}$`);
}

/** The first quick-tunnel origin in cloudflared's log, or null. */
export function tunnelOrigin(log) {
  return /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(log)?.[0] ?? null;
}

/** True when the finish is met: every named check holds, and at least one was named. */
export function finished({ until, untilGone }, { url, count }) {
  if (!until && !untilGone) return false;
  if (until && !(url != null && globToRegExp(until).test(url))) return false;
  if (untilGone && count !== 0) return false;
  return true;
}

/**
 * Which tabs `open` closes and which it brings to the front, from `tab list --json`'s tabs.
 * Blank tabs close only beside a real one; a blank active tab yields to the last real tab.
 */
export function tidyTabs(tabs) {
  const blank = tab => BLANK_URLS.has(tab.url ?? '');
  const real = tabs.filter(tab => !blank(tab));
  if (!real.length) return { close: [], front: null };
  const active = tabs.find(tab => tab.active);
  return { close: tabs.filter(blank).map(tab => tab.tabId), front: !active || blank(active) ? real.at(-1).tabId : null };
}

/**
 * The autofill token for a scanned field, so a password manager can fill its box, or '': the page's
 * own `autocomplete` when it ends in a known token, else the first rule its words match, else its type.
 */
export function autofillToken(field) {
  const own = (field.autocomplete ?? '').toLowerCase().split(/\s+/).findLast(word => AUTOFILL_TOKENS.has(word));
  if (own) return own;
  const words = [field.name, field.id, field.label, field.placeholder].join(' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[^a-zA-Z0-9/]+/g, ' ').toLowerCase();
  return AUTOFILL_RULES.find(([, matches]) => matches(words, field))?.[0] ?? TYPE_TOKENS[field.type] ?? '';
}

/** The hand-over page's box for a field: its autofill token and the `type` and `inputmode` it implies. */
export function fieldBox(field) {
  const autocomplete = autofillToken(field);
  const type = autocomplete.endsWith('-password') ? 'password' : autocomplete === 'email' || autocomplete === 'tel' ? autocomplete : 'text';
  return { autocomplete, type, inputmode: NUMERIC_TOKENS.has(autocomplete) ? 'numeric' : '' };
}

/** True when `given` is the hand-over key, compared in constant time. */
export function keyMatches(given, key) {
  const a = Buffer.from(String(given ?? ''));
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Files and processes

const readJson = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };
const readText = file => { try { return readFileSync(file, 'utf8'); } catch { return ''; } };

function alive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; }
}

const watcherPid = () => Number(readText(FILES.pid).trim()) || null;

const execFileAsync = promisify(execFile);

/** Runs agent-browser without blocking the page server; resolves to trimmed stdout, or null when it fails. */
async function browser(args) {
  try {
    return (await execFileAsync('agent-browser', args, { encoding: 'utf8', timeout: TOOL_TIMEOUT_MS })).stdout.trim();
  } catch {
    return null;
  }
}

/** Runs agent-browser with `--json`; resolves to its `data`, or null when it fails. */
async function browserData(args) {
  try { return JSON.parse((await browser([...args, '--json'])) ?? '').data ?? null; } catch { return null; }
}

/** Signals a process group, or the lone process where groups don't exist. */
function signal(pid, sig) {
  try { process.kill(-pid, sig); } catch { try { process.kill(pid, sig); } catch { /* already gone */ } }
}

async function killTunnel(pid) {
  if (!pid) return;
  signal(pid, 'SIGTERM');
  for (let i = 0; i < 30 && alive(pid); i++) await sleep(100);
  if (alive(pid)) signal(pid, 'SIGKILL');
}

/**
 * Kills the tunnel, puts the page back to 1280×720 after any phone size (a password link touched no
 * page, so it skips that), records the result and any saved names, and clears the rest; the watcher
 * closes its page first.
 */
async function teardown(result, tunnelPid, { passwords = false, saved } = {}) {
  await killTunnel(tunnelPid);
  if (!passwords) await browser(['set', 'viewport', '1280', '720']);
  writeFileSync(FILES.result, `${JSON.stringify({ result, ...(saved && { saved }) })}
`);
  for (const file of [FILES.state, FILES.log, FILES.config, FILES.pid]) rmSync(file, { force: true });
}

/** Tears down a hand-over whose watcher died without finishing. */
async function recoverStale(result) {
  const state = readJson(FILES.state);
  await teardown(result, state?.tunnelPid, { passwords: Boolean(state?.passwords) });
}

// ---------------------------------------------------------------------------
// The hand-over page

/** Ends a refused upgrade with a bare status line. */
function refuse(socket, status) {
  socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}

/** Ends a route with a JSON reply, or an empty one. */
function reply(response, status, body) {
  const text = body ? JSON.stringify(body) : '';
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(text) }).end(text);
}

/** A request's JSON object body, or null when it is not one or passes BODY_LIMIT. */
async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size <= BODY_LIMIT) chunks.push(chunk);
  }
  if (size > BODY_LIMIT) return null;
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

/** Each POST field route: the field kind it acts on, and its agent-browser calls, or null for a bad body. */
const FIELD_ACTIONS = {
  '/focus': { kind: 'text', calls: field => [['fill', field.selector, ''], ['focus', field.selector]] },
  '/select': { kind: 'select', calls: (field, { value }) => (field.options.some(option => option.value === value) ? [['select', field.selector, value]] : null) },
  '/check': { kind: 'checkbox', calls: (field, { checked }) => (typeof checked === 'boolean' ? [[checked ? 'check' : 'uncheck', field.selector]] : null) },
};

/** A `/viewport` body's size clamped to VIEWPORT_LIMITS, or null unless width and height are integers. */
export function clampViewport(body) {
  if (!Number.isInteger(body?.width) || !Number.isInteger(body?.height)) return null;
  const clamp = (value, [low, high]) => Math.min(high, Math.max(low, value));
  return { width: clamp(body.width, VIEWPORT_LIMITS.width), height: clamp(body.height, VIEWPORT_LIMITS.height) };
}

/**
 * The field list's routes. The last scan's fields, selectors included, stay here; the page names a
 * field only by its `ref`, an index into that scan. Every agent-browser call, `/viewport`'s too, runs
 * through one queue.
 */
function fieldRoutes() {
  let scanned = [];
  let queue = Promise.resolve();
  let scanning = null;
  const serial = job => {
    const run = queue.then(job);
    queue = run.catch(() => {});
    return run;
  };
  const readFields = async () => {
    const found = (await browserData(['eval', '-b', Buffer.from(FIELD_SCAN).toString('base64')]))?.result;
    if (!Array.isArray(found)) return null;
    scanned = found;
    const fields = found.map((field, ref) => ({ ref, kind: field.kind, label: field.label, ...fieldBox(field), options: field.options.map(({ value, text }) => ({ value, text })) }));
    return { signature: createHash('sha256').update(JSON.stringify(fields)).digest('hex'), fields };
  };
  // A request joins a scan already waiting, unless a command was queued since: a pick can show a new field.
  const scan = () => {
    if (!scanning) {
      const run = serial(readFields).catch(() => null);
      scanning = run;
      run.then(() => { if (scanning === run) scanning = null; });
    }
    return scanning;
  };

  return async (pathname, request, response) => {
    if (pathname === '/fields') {
      if (request.method !== 'GET') return reply(response, 405);
      const list = await scan();
      return list ? reply(response, 200, list) : reply(response, 503);
    }
    if (request.method !== 'POST') return reply(response, 405);
    const body = await readBody(request);
    if (pathname === '/viewport') {
      const size = clampViewport(body);
      if (!size) return reply(response, 400);
      const ok = await serial(() => browser(['set', 'viewport', String(size.width), String(size.height)]));
      return ok === null ? reply(response, 502) : reply(response, 200, size);
    }
    const action = FIELD_ACTIONS[pathname];
    if (!body || !Number.isInteger(body.ref) || body.ref < 0) return reply(response, 400);
    const field = scanned[body.ref];
    if (!field) return reply(response, 409);
    const calls = field.kind === action.kind && action.calls(field, body);
    if (!calls) return reply(response, 400);
    scanning = null;
    const ok = await serial(async () => {
      for (const args of calls) if ((await browser(args)) === null) return false;
      return true;
    });
    return ok ? reply(response, 200, { ok }) : reply(response, 409);
  };
}

/**
 * Serves the page on 127.0.0.1:`port` and pipes `/stream?key=<key>` to the live feed on
 * `streamPort` as a fresh upgrade with no `Origin`; it never parses a frame. The field routes and
 * `/viewport` need the key in an `x-hand-over-key` header. With `passwords` it serves the password
 * page and routes instead, passing `hooks` to them, and has no feed. Resolves to a close().
 */
export function servePage({ port, streamPort, key, passwords = false }, hooks = {}) {
  const sockets = new Set();
  const track = socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); return socket; };
  const routes = passwords ? passwordRoutes(hooks) : fieldRoutes();
  const isRoute = pathname => (passwords ? PASSWORD_ROUTES.has(pathname) : pathname === '/fields' || pathname === '/viewport' || Boolean(FIELD_ACTIONS[pathname]));
  const served = passwords ? PAGES.passwords : PAGES.handOver;
  const server = createServer((request, response) => {
    const { pathname } = new URL(request.url, 'http://page');
    if (isRoute(pathname)) {
      if (!keyMatches(request.headers['x-hand-over-key'], key)) return reply(response, 403);
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
  server.on('connection', track);
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, 'http://page');
    if (passwords || url.pathname !== '/stream') return refuse(socket, '404 Not Found');
    if (!keyMatches(url.searchParams.get('key'), key)) return refuse(socket, '403 Forbidden');
    const upstream = track(connect(streamPort, '127.0.0.1'));
    const lines = ['GET / HTTP/1.1', `Host: 127.0.0.1:${streamPort}`, 'Upgrade: websocket', 'Connection: Upgrade'];
    for (const name of ['sec-websocket-key', 'sec-websocket-version', 'sec-websocket-extensions']) if (request.headers[name]) lines.push(`${name}: ${request.headers[name]}`);
    upstream.write(`${lines.join('\r\n')}\r\n\r\n`);
    if (head.length) upstream.write(head);
    upstream.pipe(socket).pipe(upstream);
    for (const [one, other] of [[socket, upstream], [upstream, socket]]) one.on('error', () => other.destroy()).on('close', () => other.destroy());
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(() => new Promise(done => {
      server.close(() => done());
      for (const socket of sockets) socket.destroy();
    })));
  });
}

/** A loopback port free right now. */
function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createTcpServer().once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
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

function hasCloudflared() {
  return !spawnSync('cloudflared', ['--version'], { stdio: 'ignore' }).error;
}

/** Starts the quick tunnel to `port` in its own process group and waits for its registered origin. */
async function startTunnel(port) {
  writeFileSync(FILES.config, '');
  const log = openSync(FILES.log, 'w');
  const child = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--config', FILES.config, '--url', `http://127.0.0.1:${port}`], { detached: true, stdio: ['ignore', log, log] });
  closeSync(log);
  child.unref();
  const pid = child.pid;
  const deadline = Date.now() + TUNNEL_WAIT_MS;
  while (Date.now() < deadline && alive(pid)) {
    const text = readText(FILES.log);
    const origin = tunnelOrigin(text);
    if (origin && /Registered tunnel connection/.test(text)) return { pid, origin };
    await sleep(200);
  }
  return { pid, origin: null };
}

/** Sets the page to agent-browser's own 1280×720, so the picture's size and the page's agree. */
async function prepareBrowser() {
  await browser(['set', 'viewport', '1280', '720']);
  const { close, front } = tidyTabs((await browserData(['tab', 'list']))?.tabs ?? []);
  for (const id of close) await browser(['tab', 'close', id]);
  if (front) await browser(['tab', front]);
}

/** The session's live-feed port, enabling the feed when it is off; null when there is none. */
async function streamPort() {
  let status = await browserData(['stream', 'status']);
  if (status && !status.enabled) {
    await browser(['stream', 'enable']);
    status = await browserData(['stream', 'status']);
  }
  return status?.enabled && status.port ? status.port : null;
}

async function open(values) {
  mkdirSync(DIR, { recursive: true });
  if (alive(watcherPid())) {
    console.error('A hand-over link is already open. Run `hand-over.mjs close` first.');
    return 1;
  }
  if (existsSync(FILES.pid)) await recoverStale('error');
  if (!values.local && !hasCloudflared()) {
    console.log('HANDOVER_NEEDS=cloudflared');
    console.error('Cloudflare\'s tunnel tool, cloudflared, is not installed; ask the person, install it, and retry.');
    return 3;
  }
  rmSync(FILES.result, { force: true });
  const deadline = Date.now() + values.minutes * 60_000;
  let tunnelPid = null;
  let watcher = null;
  const fail = async message => {
    console.error(message);
    if (watcher) signal(watcher, 'SIGKILL');
    await teardown('error', tunnelPid, { passwords: Boolean(values.passwords) });
    return 1;
  };
  let feed = null;
  if (!values.passwords) {
    await prepareBrowser();
    feed = await streamPort();
    if (!feed) return fail('agent-browser reported no live feed for this browser session.');
  }
  const port = await freePort();
  const key = randomBytes(32).toString('hex');
  let origin = `http://127.0.0.1:${port}`;
  if (!values.local) {
    const tunnel = await startTunnel(port);
    tunnelPid = tunnel.pid;
    if (!tunnel.origin) return fail('The Cloudflare tunnel did not come up within 30 seconds; try again in a minute.');
    origin = tunnel.origin;
  }
  writeFileSync(FILES.state, `${JSON.stringify({ tunnelPid, port, streamPort: feed, key, passwords: Boolean(values.passwords), until: values.until ?? null, untilGone: values['until-gone'] ?? null, deadline })}\n`, { mode: 0o600 });
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'watch'], { detached: true, stdio: 'ignore' });
  watcher = child.pid;
  writeFileSync(FILES.pid, `${watcher}\n`);
  child.unref();
  if (!(await pageAnswers(port, watcher))) return fail('The hand-over page did not start; try again.');
  console.log(`HANDOVER_LINK=${origin}/#key=${key}`);
  return 0;
}

/** Serves the page and reads only the address and a count, never page content, until the finish or the deadline. */
async function watch() {
  const state = readJson(FILES.state);
  if (!state) return 1;
  let done = false;
  let closePage = null;
  const saved = state.passwords ? [] : undefined;
  const finish = async result => {
    if (done) return;
    done = true;
    await closePage?.();
    await teardown(result, state.tunnelPid, { passwords: Boolean(state.passwords), saved });
    process.exit(0);
  };
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(sig, () => finish('closed'));
  const hooks = { onSaved: name => { if (!saved.includes(name)) saved.push(name); }, onDone: () => finish('done') };
  try {
    closePage = await servePage(state, hooks);
  } catch {
    return finish('error');
  }
  while (!done) {
    if (Date.now() >= state.deadline) return finish('timeout');
    const seen = {};
    if (state.until) seen.url = await browser(['get', 'url']);
    if (state.untilGone) seen.count = Number.parseInt((await browser(['get', 'count', state.untilGone])) ?? '', 10);
    if (finished(state, seen)) return finish('done');
    await sleep(Math.min(POLL_MS, Math.max(0, state.deadline - Date.now())));
  }
}

/** Blocks until the watcher records a result; recovers a watcher that died without one. */
async function wait() {
  for (;;) {
    const { result, saved } = readJson(FILES.result) ?? {};
    if (result) {
      console.log(`HANDOVER_RESULT=${result}`);
      if (Array.isArray(saved)) console.log(`HANDOVER_SAVED=${saved.join(',')}`);
      return 0;
    }
    if (!existsSync(FILES.pid)) {
      console.error('No hand-over link is open.');
      return 1;
    }
    if (!alive(watcherPid())) await recoverStale('error');
    await sleep(250);
  }
}

async function close() {
  const pid = watcherPid();
  if (!pid) {
    console.error('No hand-over link is open.');
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
    parsed = parseArgs({ args, allowPositionals: true, strict: true, options: { until: { type: 'string' }, 'until-gone': { type: 'string' }, passwords: { type: 'boolean' }, local: { type: 'boolean' }, minutes: { type: 'string' }, help: { type: 'boolean' } } });
  } catch (error) {
    usageError(error.message);
  }
  if (parsed.values.help) {
    console.log(USAGE);
    process.exit(0);
  }
  const [command, ...rest] = parsed.positionals;
  if (!['open', 'watch', 'wait', 'close'].includes(command) || rest.length) usageError(command ? `unknown command: ${[command, ...rest].join(' ')}` : 'missing command');
  const minutes = Number(parsed.values.minutes ?? 10);
  if (!(minutes > 0)) usageError('--minutes must be a positive number');
  if (parsed.values.passwords && (parsed.values.until || parsed.values['until-gone'])) usageError('--passwords ends on Done; it takes no --until or --until-gone');
  return { command, values: { ...parsed.values, minutes } };
}

const isMain = () => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } };
if (isMain()) {
  const { command, values } = parse(process.argv.slice(2));
  const run = { open: () => open(values), watch, wait, close }[command];
  process.exitCode = await run();
}
