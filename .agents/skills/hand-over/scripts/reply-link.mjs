#!/usr/bin/env node
// Opens a reply link: a page the assistant made, at a web address that closes itself, whose send puts the person's
// text into the chat that opened it. Not a private link: it never carries a secret. wiki/development/reply-links.md

import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { lookCss } from '../../plan/scripts/look.mjs';
import { alive, freePort, hasCloudflared, keyMatches, killTunnel, linkAnswers, signal, startTunnel } from './lib/tunnel.mjs';
import { canWake, chatTarget, wakeChat } from './lib/wake.mjs';

const USAGE = `usage: reply-link.mjs open <file> --header "<line>" [--hours N] [--action <name>=<message>]...
       reply-link.mjs close <file> | list
  open    serve one self-contained HTML file at a link that closes itself and print
          REPLY_LINK=<url>; its page sends text to this chat under the header line.
          Prints REPLY_LINK=none and REPLY_REASON=off|no-chat|no-cloudflared|tunnel-down
          where no link can open, and exits 0: fall back to the file
          --header: the fixed first line of every message the page sends
          --hours: how long the link stays open (default 8)
          --action: a button the page may offer, and the one-line message a tap on it
          sends to this chat; the page can never change that message (6 at most)
  close   close the file's link
  list    print each open page's file and when it closes`;
export const LIMITS = { text: 20_000, body: 128 * 1024, header: 300, action: 300, actions: 6 };
const HOURS = 8;
// Raised when the server's routes change: a running server from older code is swapped for this one.
const PROTOCOL = 3;
const ID = /^[0-9a-f]{32}$/;
const ACTION = /^[a-z][a-z0-9-]{0,30}$/;
const ROUTE = /^\/p\/([0-9a-f]{32})\/(alive|send|act)?$/;
const TUNNEL_WAIT_MS = Number(process.env.REPLY_LINK_TUNNEL_WAIT_MS) || 30_000;
const POLL_MS = Number(process.env.REPLY_LINK_POLL_MS) || 5000;
const SEND_GAP_MS = Number(process.env.REPLY_LINK_SEND_GAP_MS) || 5000;
const PROBE_MS = 4000;
const sleep = ms => new Promise(done => setTimeout(done, ms));
const readJson = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };

/** The state files under `env.HOME`, apart from hand-over's. */
function files(env = process.env) {
  const dir = join(env.HOME || homedir(), '.wong-stack', 'reply-link');
  return { dir, pages: join(dir, 'pages'), server: join(dir, 'server.json'), lock: join(dir, 'starting.lock'), log: join(dir, 'tunnel.log'), config: join(dir, 'cloudflared.yml') };
}

const pageFile = (state, id) => join(state.pages, `${id}.json`);

/** A registration as written, or null when it is missing, malformed, or past its deadline. */
function readPage(state, id, now = Date.now()) {
  const page = ID.test(id) ? readJson(pageFile(state, id)) : null;
  const sound = page && page.id === id && typeof page.file === 'string' && typeof page.key === 'string' && typeof page.header === 'string' && Number.isFinite(page.deadline);
  return sound && page.deadline > now ? page : null;
}

/** Every unexpired registration; with `sweep`, an expired or broken one's file is removed. */
function openPages(state, { sweep = false } = {}) {
  let names;
  try { names = readdirSync(state.pages); } catch { return []; }
  const found = [];
  for (const name of names) {
    const page = readPage(state, name.replace(/\.json$/, ''));
    if (page) found.push(page);
    else if (sweep) rmSync(join(state.pages, name), { force: true });
  }
  return found;
}

/** The `[name, message]` pairs as one name-to-message object; throws on a pair outside the limits. */
function checkActions(pairs) {
  if (pairs.length > LIMITS.actions) throw new Error(`--action: ${LIMITS.actions} at most`);
  const actions = {};
  for (const [name, message] of pairs) {
    const text = typeof message === 'string' ? message.trim() : '';
    if (!ACTION.test(name) || Object.hasOwn(actions, name)) throw new Error(`--action takes <name>=<message>, each name once, lowercase: ${name}`);
    if (!text || /[\r\n]/.test(text) || text.length > LIMITS.action) throw new Error(`--action ${name} takes one line of text`);
    actions[name] = text;
  }
  return actions;
}

/** A registration's actions; one written before actions has none. */
const actionsOf = page => (page.actions && typeof page.actions === 'object' ? page.actions : {});

/** Writes the file's registration, keeping an open one's id and key so its link stays; its actions are replaced. */
function register(state, { file, header, actions, hours, target }) {
  mkdirSync(state.pages, { recursive: true, mode: 0o700 });
  const kept = openPages(state).find(page => page.file === file);
  const page = { id: kept?.id ?? randomBytes(16).toString('hex'), file, key: kept?.key ?? randomBytes(32).toString('hex'), header, actions, target, deadline: Date.now() + hours * 3_600_000 };
  writeFileSync(pageFile(state, page.id), `${JSON.stringify(page)}\n`, { mode: 0o600 });
  return page;
}

const PAGE_HEADERS = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY', 'content-security-policy': "frame-ancestors 'none'" };
const CLOSED_STYLE = 'body{display:grid;place-items:center;min-height:100vh;margin:0;padding:1rem;box-sizing:border-box;line-height:1.5}'
  + '.card{max-width:24rem;padding:1.5rem}h1{margin:0 0 .25rem;font-size:1.25rem}p{margin:0;color:var(--muted-foreground)}';
const CLOSED_PAGE = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
  + `<title>This link has closed</title><style>${lookCss()}${CLOSED_STYLE}</style>`
  + '<body><main class="card"><h1>This link has closed</h1><p>Ask your assistant for a new link.</p></main></body></html>';

function reply(response, status, body) {
  const text = body ? JSON.stringify(body) : '';
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(text) }).end(text);
}

function html(response, status, text) {
  response.writeHead(status, PAGE_HEADERS).end(text);
}

/** The request's JSON body, or null when it is over the limit or not JSON; an oversized one is read and dropped. */
async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size <= LIMITS.body) chunks.push(chunk);
  }
  if (size > LIMITS.body) return null;
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return null; }
}

/** The text a send carries, or null: a non-empty string within the limit. */
function sendText(body) {
  const text = body && typeof body.text === 'string' ? body.text.trim() : '';
  return text && text.length <= LIMITS.text ? text : null;
}

/** The SHA-256 of the page's file as it stands, or null when the file is gone. */
function fileVersion(page) {
  try { return createHash('sha256').update(readFileSync(page.file)).digest('hex'); } catch { return null; }
}

/** The request handler for every registered page. `wake(target, message)` resolves to wakeChat's
 * answer; the page supplies neither the header, nor the target, nor an action's message. */
export function replyRoutes(state, { wake = wakeChat } = {}) {
  const lastSend = new Map();
  const accepted = new Map();
  /** True when this page sent inside the gap; otherwise the gap starts now. */
  function tooSoon(page) {
    if (Date.now() - (lastSend.get(page.id) ?? -Infinity) < SEND_GAP_MS) return true;
    lastSend.set(page.id, Date.now());
    return false;
  }
  async function send(page, request, response) {
    if (tooSoon(page)) return reply(response, 429, { sent: false });
    const text = sendText(await readBody(request));
    if (!text) return reply(response, 400, { sent: false });
    const sent = (await wake(page.target, `${page.header}\n${text}`)) === 'notified';
    return reply(response, sent ? 200 : 502, { sent });
  }
  /** The names accepted for the page's file as it stands; a new version starts empty. */
  function acceptedFor(page, version) {
    if (accepted.get(page.id)?.version !== version) accepted.set(page.id, { version, names: new Set() });
    return accepted.get(page.id).names;
  }
  async function act(page, request, response) {
    if (tooSoon(page)) return reply(response, 429, { sent: false });
    const body = await readBody(request);
    const actions = actionsOf(page);
    const name = typeof body?.action === 'string' && Object.hasOwn(actions, body.action) ? body.action : null;
    if (!name || (Object.hasOwn(body, 'text') && (typeof body.text !== 'string' || body.text.length > LIMITS.text))) return reply(response, 400, { sent: false });
    const text = body.text?.trim() || '';
    const version = fileVersion(page);
    if (!version) return reply(response, 410, { closed: true });
    if (body.version !== version) return reply(response, 409, { changed: true });
    const names = acceptedFor(page, version);
    if (names.has(name)) return reply(response, 409, { done: true });
    // Marked before the wake, so a tap that arrives during it is refused; unmarked when the chat did not get it.
    names.add(name);
    const sent = (await wake(page.target, actions[name] + (text ? `\n${text}` : ''))) === 'notified';
    if (!sent) names.delete(name);
    return reply(response, sent ? 200 : 502, { sent });
  }
  return async (request, response) => {
    const { pathname } = new URL(request.url, 'http://page');
    // The outside probe asks `/`: it answers with nothing, so the address is known to route.
    if (pathname === '/') return reply(response, request.method === 'GET' ? 204 : 405);
    const [, id, action] = ROUTE.exec(pathname) ?? [];
    if (!id) return reply(response, 404);
    const page = readPage(state, id);
    if (!action) {
      if (request.method !== 'GET') return reply(response, 405);
      let text = null;
      try { if (page) text = readFileSync(page.file); } catch { /* the file is gone: the link has closed */ }
      return text ? html(response, 200, text) : html(response, 410, CLOSED_PAGE);
    }
    if (!page) return reply(response, 410, { closed: true });
    if (!keyMatches(request.headers['x-reply-key'], page.key)) return reply(response, 403);
    if (request.method !== (action === 'alive' ? 'GET' : 'POST')) return reply(response, 405);
    if (action === 'alive') return reply(response, 200, { closesAt: page.deadline, actions: Object.keys(actionsOf(page)), version: fileVersion(page) });
    return (action === 'send' ? send : act)(page, request, response);
  };
}

/** Serves every page on 127.0.0.1:`port` until no page is unexpired or the tunnel dies, then kills the tunnel. */
async function serve(port, tunnelPid) {
  const state = files();
  const routes = replyRoutes(state);
  const server = createServer((request, response) => void routes(request, response).catch(() => reply(response, 500)));
  await new Promise((resolve, reject) => server.once('error', reject).listen(port, '127.0.0.1', resolve));
  let ending = false;
  const end = async () => {
    if (ending) return;
    ending = true;
    server.close();
    server.closeAllConnections();
    await killTunnel(tunnelPid);
    if (readJson(state.server)?.pid === process.pid) for (const file of [state.server, state.log, state.config]) rmSync(file, { force: true });
    process.exit(0);
  };
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(sig, end);
  for (;;) {
    await sleep(POLL_MS);
    if (!openPages(state, { sweep: true }).length || !alive(tunnelPid)) return end();
  }
}

/** The running server's record when it and its tunnel are alive and the public address answers, else null. */
async function liveServer(state) {
  const server = readJson(state.server);
  if (!server || !alive(server.pid) || !alive(server.tunnelPid)) return null;
  return (await linkAnswers(server.origin, server.port, server.tunnelPid, Date.now() + PROBE_MS)) ? server : null;
}

/** True when this process now holds the start lock; a lock whose holder died is taken over. */
function takeLock(state) {
  for (let i = 0; i < 2; i++) {
    try { writeFileSync(state.lock, `${process.pid}\n`, { flag: 'wx' }); return true; } catch { /* held */ }
    // An empty lock is one being written this instant: still held.
    let holder = '';
    try { holder = readFileSync(state.lock, 'utf8').trim(); } catch { continue; }
    if (!holder || alive(Number(holder))) return false;
    rmSync(state.lock, { force: true });
  }
  return false;
}

/** Ends a server that no longer answers, and its tunnel. */
async function endStale(state) {
  const old = readJson(state.server);
  if (!old) return;
  if (alive(old.pid)) signal(old.pid, 'SIGKILL');
  await killTunnel(old.tunnelPid);
  rmSync(state.server, { force: true });
}

/** Spawns the detached server for `port`, tied to the tunnel's life. */
function spawnServer(port, tunnelPid, env) {
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'serve', String(port), String(tunnelPid)], { detached: true, stdio: 'ignore', env });
  child.unref();
  return child;
}

/** Replaces a running server from older code with this one on the same port, keeping its tunnel, so
 * every open link keeps its address. Resolves to the new record, or null when the address stops answering. */
async function swapServer(state, old, env) {
  // SIGKILL, not SIGTERM: the old server's own ending would take the tunnel with it.
  signal(old.pid, 'SIGKILL');
  for (let i = 0; i < 50 && alive(old.pid); i++) await sleep(100);
  const child = spawnServer(old.port, old.tunnelPid, env);
  if (!(await linkAnswers(old.origin, old.port, old.tunnelPid, Date.now() + TUNNEL_WAIT_MS))) return null;
  const server = { ...old, pid: child.pid, protocol: PROTOCOL };
  writeFileSync(state.server, `${JSON.stringify(server)}\n`, { mode: 0o600 });
  return server;
}

/** Starts the tunnel and the detached server; resolves to the server's record, or to why not. */
async function startServer(state, env) {
  await endStale(state);
  if (!hasCloudflared()) return { reason: 'no-cloudflared' };
  const port = await freePort();
  const deadline = Date.now() + TUNNEL_WAIT_MS;
  const tunnel = await startTunnel(port, deadline, state);
  const child = tunnel.origin ? spawnServer(port, tunnel.pid, env) : null;
  if (!child || !(await linkAnswers(tunnel.origin, port, tunnel.pid, deadline))) {
    if (child) signal(child.pid, 'SIGKILL');
    await killTunnel(tunnel.pid);
    return { reason: 'tunnel-down' };
  }
  const server = { pid: child.pid, port, tunnelPid: tunnel.pid, origin: tunnel.origin, protocol: PROTOCOL };
  writeFileSync(state.server, `${JSON.stringify(server)}\n`, { mode: 0o600 });
  return server;
}

/** The one shared server, started when none answers; another opener's start is waited for, not doubled. */
async function ensureServer(state, env) {
  const until = Date.now() + TUNNEL_WAIT_MS + PROBE_MS;
  let live;
  for (;;) {
    live = await liveServer(state);
    if (live && (live.protocol ?? 1) >= PROTOCOL) return live;
    if (takeLock(state)) break;
    if (Date.now() >= until) return { reason: 'tunnel-down' };
    await sleep(250);
  }
  try { return (live && await swapServer(state, live, env)) || await startServer(state, env); } finally { rmSync(state.lock, { force: true }); }
}

/** `{link}` for the file's reply link, or `{link: null, reason}` where none can open. */
async function openLink({ file, header, actions = {}, hours = HOURS, env = process.env, cwd = process.cwd() }) {
  const checked = checkActions(Object.entries(actions));
  if (env.REPLY_LINK === 'off') return { link: null, reason: 'off' };
  const target = chatTarget(env, cwd);
  if (!canWake(target, env)) return { link: null, reason: 'no-chat' };
  const state = files(env);
  const page = register(state, { file: realpathSync(file), header, actions: checked, hours, target });
  const server = await ensureServer(state, env);
  if (server.reason) {
    rmSync(pageFile(state, page.id), { force: true });
    return { link: null, reason: server.reason };
  }
  return { link: `${server.origin}/p/${page.id}/#key=${page.key}` };
}

/** The file's reply link, or null, quickly and quietly, where none can open: the caller then offers the file.
 * `header` is the fixed first line of every message; `actions` maps each button to the one-line message it sends. */
export async function openReplyLink(options) {
  try { return (await openLink(options)).link; } catch { return null; }
}

/** The file's real path, or exit 1 once it has said the file is missing. */
function realFile(file) {
  try { return realpathSync(file); } catch {
    console.error(`No such file: ${file}`);
    process.exit(1);
  }
}

async function open(file, { header, actions, hours }) {
  const { link, reason } = await openLink({ file: realFile(file), header, actions, hours });
  console.log(`REPLY_LINK=${link ?? 'none'}`);
  if (!link) console.log(`REPLY_REASON=${reason}`);
}

function close(file) {
  const state = files();
  let path = resolve(file);
  try { path = realpathSync(file); } catch { /* a deleted file's link still closes */ }
  const page = openPages(state).find(open => open.file === path);
  if (page) rmSync(pageFile(state, page.id), { force: true });
  console.log(`REPLY_CLOSED=${page ? 'yes' : 'no'}`);
}

function list() {
  for (const page of openPages(files())) console.log(`${page.file}\tcloses ${new Date(page.deadline).toISOString()}`);
}

if (isMain(import.meta.url)) {
  const { values, positionals: [command, ...rest] } = parseCli({ usage: USAGE, allowPositionals: true, options: { header: { type: 'string' }, hours: { type: 'string' }, action: { type: 'string', multiple: true } } });
  const takes = { open: 1, close: 1, list: 0, serve: 2 }[command];
  if (takes === undefined || rest.length !== takes) usageError(USAGE, command ? `unknown command: ${[command, ...rest].join(' ')}` : 'missing command');
  const hours = Number(values.hours ?? HOURS);
  if (!(hours > 0)) usageError(USAGE, '--hours must be a positive number');
  const header = values.header?.trim() ?? '';
  if (command === 'open' && (!header || /[\r\n]/.test(header) || header.length > LIMITS.header)) usageError(USAGE, '--header takes one line of text');
  if (command !== 'open' && (values.header !== undefined || values.hours !== undefined || values.action !== undefined)) usageError(USAGE, '--header, --hours, and --action go with open only');
  let actions;
  try { actions = checkActions((values.action ?? []).map(pair => pair.split(/=(.*)/s).slice(0, 2))); } catch (error) { usageError(USAGE, error.message); }
  await { open: () => open(rest[0], { header, actions, hours }), close: () => close(rest[0]), list, serve: () => serve(Number(rest[0]), Number(rest[1])) }[command]();
}
