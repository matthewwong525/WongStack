#!/usr/bin/env node
// Opens a reply link: a page the assistant made, at a web address that closes itself, whose one send
// puts the person's text into the chat that opened it.
//
//     node .claude/skills/hand-over/scripts/reply-link.mjs open <file> --header "<line>" [--hours N]
//     node .claude/skills/hand-over/scripts/reply-link.mjs close <file>
//     node .claude/skills/hand-over/scripts/reply-link.mjs list
//
// `open` registers one self-contained HTML file in ~/.wong-stack/reply-link/pages/<id>.json: its path,
// a random key, the fixed header line, the chat to wake, and a deadline 8 hours on. One detached server
// and one Cloudflare quick tunnel serve every registered page, so the first `open` waits for the tunnel
// (30 seconds at most) and later ones print at once. It prints `REPLY_LINK=<origin>/p/<id>/#key=<hex>`
// only once the public address answers. Opening a file again keeps its id and key and moves its
// deadline. Where no link can open it prints `REPLY_LINK=none` and `REPLY_REASON=<why>` and exits 0, so
// the caller falls back to the file: `off` (REPLY_LINK=off is set), `no-chat` (the host names no chat or
// has no way to wake one), `no-cloudflared`, or `tunnel-down`. It never asks to install anything.
//
// The server answers, for a registered and unexpired `<id>`:
//
//     GET  /p/<id>/        the file, read from disk each time
//     GET  /p/<id>/alive   200 {closesAt}                          needs the key
//     POST /p/<id>/send    {text} -> 200 {sent:true} | 502 {sent:false}   needs the key
//
// The key rides in the link's fragment, which a browser never sends, and returns in an `x-reply-key`
// header. `send` wakes the registered chat with the header line, a newline, then the text: at most
// 20,000 characters, one send per 5 seconds per page. It answers `sent:true` only when the host
// confirms that chat got it. An unknown, closed, or expired id answers 410. The server logs nothing,
// and exits, killing its tunnel, once no page is unexpired or the tunnel has died.
//
// This is not a private link: it carries plan text and notes, never a secret, and shares no state with
// hand-over.mjs, so neither kind of link can block the other. `close` ends one page; `list` prints each
// open page's file and deadline, never a key.
//
// Exit codes: 0 ok, a `none` answer included · 1 the file is missing · 2 usage. Node built-ins only.
// For tests: REPLY_LINK_TUNNEL_WAIT_MS overrides the 30-second tunnel wait, REPLY_LINK_POLL_MS the
// server's 5-second check, REPLY_LINK_SEND_GAP_MS the 5 seconds between sends, and
// HANDOVER_PROBE_ORIGIN the address asked before the link prints.

import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { alive, freePort, hasCloudflared, keyMatches, killTunnel, linkAnswers, signal, startTunnel } from './lib/tunnel.mjs';
import { canWake, chatTarget, wakeChat } from './lib/wake.mjs';

const USAGE = `usage: reply-link.mjs open <file> --header "<line>" [--hours N]
       reply-link.mjs close <file> | list
  open    serve one self-contained HTML file at a link that closes itself and print
          REPLY_LINK=<url>; its page sends text to this chat under the header line.
          Prints REPLY_LINK=none and REPLY_REASON=off|no-chat|no-cloudflared|tunnel-down
          where no link can open, and exits 0: fall back to the file
          --header: the fixed first line of every message the page sends
          --hours: how long the link stays open (default 8)
  close   close the file's link
  list    print each open page's file and when it closes`;
export const LIMITS = { text: 20_000, body: 128 * 1024, header: 300 };
const HOURS = 8;
const ID = /^[0-9a-f]{32}$/;
const ROUTE = /^\/p\/([0-9a-f]{32})\/(alive|send)?$/;
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

// ---------------------------------------------------------------------------
// Registrations

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

/** Writes the file's registration, keeping an open one's id and key so its link stays the same. */
function register(state, { file, header, hours, target }) {
  mkdirSync(state.pages, { recursive: true, mode: 0o700 });
  const kept = openPages(state).find(page => page.file === file);
  const page = { id: kept?.id ?? randomBytes(16).toString('hex'), file, key: kept?.key ?? randomBytes(32).toString('hex'), header, target, deadline: Date.now() + hours * 3_600_000 };
  writeFileSync(pageFile(state, page.id), `${JSON.stringify(page)}\n`, { mode: 0o600 });
  return page;
}

// ---------------------------------------------------------------------------
// The server

const PAGE_HEADERS = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY', 'content-security-policy': "frame-ancestors 'none'" };
const CLOSED_PAGE = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>This link has closed</title><body style="font:16px/1.5 system-ui,sans-serif;margin:2em"><h1 style="font-size:22px">This link has closed</h1><p>Ask your assistant for a new link.</p></body></html>';

function reply(response, status, body) {
  const text = body ? JSON.stringify(body) : '';
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(text) }).end(text);
}

function html(response, status, text) {
  response.writeHead(status, PAGE_HEADERS).end(text);
}

/** The request's JSON body, or null when it is over the limit or not JSON; the rest of an oversized one is read and dropped. */
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

/**
 * The request handler for every registered page. `wake(target, message)` resolves to wakeChat's
 * answer; the page supplies neither the header nor the target.
 */
export function replyRoutes(state, { wake = wakeChat } = {}) {
  const lastSend = new Map();
  async function send(page, request, response) {
    if (Date.now() - (lastSend.get(page.id) ?? -Infinity) < SEND_GAP_MS) return reply(response, 429, { sent: false });
    lastSend.set(page.id, Date.now());
    const text = sendText(await readBody(request));
    if (!text) return reply(response, 400, { sent: false });
    const sent = (await wake(page.target, `${page.header}\n${text}`)) === 'notified';
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
    if (request.method !== (action === 'send' ? 'POST' : 'GET')) return reply(response, 405);
    return action === 'send' ? send(page, request, response) : reply(response, 200, { closesAt: page.deadline });
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

// ---------------------------------------------------------------------------
// Opening

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

/** Starts the tunnel and the detached server; resolves to the server's record, or to why not. */
async function startServer(state, env) {
  await endStale(state);
  if (!hasCloudflared()) return { reason: 'no-cloudflared' };
  const port = await freePort();
  const deadline = Date.now() + TUNNEL_WAIT_MS;
  const tunnel = await startTunnel(port, deadline, state);
  const child = tunnel.origin ? spawn(process.execPath, [fileURLToPath(import.meta.url), 'serve', String(port), String(tunnel.pid)], { detached: true, stdio: 'ignore', env }) : null;
  child?.unref();
  if (!child || !(await linkAnswers(tunnel.origin, port, tunnel.pid, deadline))) {
    if (child) signal(child.pid, 'SIGKILL');
    await killTunnel(tunnel.pid);
    return { reason: 'tunnel-down' };
  }
  const server = { pid: child.pid, port, tunnelPid: tunnel.pid, origin: tunnel.origin };
  writeFileSync(state.server, `${JSON.stringify(server)}\n`, { mode: 0o600 });
  return server;
}

/** The one shared server, started when none answers; another opener's start is waited for, not doubled. */
async function ensureServer(state, env) {
  const until = Date.now() + TUNNEL_WAIT_MS + PROBE_MS;
  for (;;) {
    const live = await liveServer(state);
    if (live) return live;
    if (takeLock(state)) break;
    if (Date.now() >= until) return { reason: 'tunnel-down' };
    await sleep(250);
  }
  try { return await startServer(state, env); } finally { rmSync(state.lock, { force: true }); }
}

/** `{link}` for the file's reply link, or `{link: null, reason}` where none can open. */
async function openLink({ file, header, hours = HOURS, env = process.env, cwd = process.cwd() }) {
  if (env.REPLY_LINK === 'off') return { link: null, reason: 'off' };
  const target = chatTarget(env, cwd);
  if (!canWake(target, env)) return { link: null, reason: 'no-chat' };
  const state = files(env);
  const page = register(state, { file: realpathSync(file), header, hours, target });
  const server = await ensureServer(state, env);
  if (server.reason) {
    rmSync(pageFile(state, page.id), { force: true });
    return { link: null, reason: server.reason };
  }
  return { link: `${server.origin}/p/${page.id}/#key=${page.key}` };
}

/**
 * The file's reply link, or null, quickly and quietly, where none can open: the caller then offers
 * the file itself. `header` is the fixed first line of every message the page sends.
 */
export async function openReplyLink(options) {
  try { return (await openLink(options)).link; } catch { return null; }
}

// ---------------------------------------------------------------------------
// CLI

/** The file's real path, or exit 1 once it has said the file is missing. */
function realFile(file) {
  try { return realpathSync(file); } catch {
    console.error(`No such file: ${file}`);
    process.exit(1);
  }
}

async function open(file, { header, hours }) {
  const { link, reason } = await openLink({ file: realFile(file), header, hours });
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
  const { values, positionals: [command, ...rest] } = parseCli({ usage: USAGE, allowPositionals: true, options: { header: { type: 'string' }, hours: { type: 'string' } } });
  const takes = { open: 1, close: 1, list: 0, serve: 2 }[command];
  if (takes === undefined || rest.length !== takes) usageError(USAGE, command ? `unknown command: ${[command, ...rest].join(' ')}` : 'missing command');
  const hours = Number(values.hours ?? HOURS);
  if (!(hours > 0)) usageError(USAGE, '--hours must be a positive number');
  const header = values.header?.trim() ?? '';
  if (command === 'open' && (!header || /[\r\n]/.test(header) || header.length > LIMITS.header)) usageError(USAGE, '--header takes one line of text');
  if (command !== 'open' && (values.header !== undefined || values.hours !== undefined)) usageError(USAGE, '--header and --hours go with open only');
  await { open: () => open(rest[0], { header, hours }), close: () => close(rest[0]), list, serve: () => serve(Number(rest[0]), Number(rest[1])) }[command]();
}
