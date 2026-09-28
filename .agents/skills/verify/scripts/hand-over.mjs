#!/usr/bin/env node
// Hands the agent's browser to the person through a private link that closes itself.
//
//     node .claude/skills/verify/scripts/hand-over.mjs open [--until <glob>] [--until-gone <selector>] [--local] [--minutes N]
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
// given means both must hold, neither means only `close` or the deadline ends it. On finish,
// deadline, `close`, or a signal it closes the page, kills the tunnel, and writes `result.json` with
// no address or key in it. `wait` blocks for that result and prints
// `HANDOVER_RESULT=done|timeout|closed|error`.
//
// State lives in ~/.wong-stack/hand-over/; one link at a time. Exit codes: 0 ok · 1 failed or a
// link is already open · 2 usage · 3 `cloudflared` is missing (prints HANDOVER_NEEDS=cloudflared).
// Node built-ins only. HANDOVER_POLL_MS overrides the 2-second poll, for tests.

import { execFile, spawn, spawnSync } from 'node:child_process';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { connect, createServer as createTcpServer } from 'node:net';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';

const USAGE = `usage: hand-over.mjs open [--until <glob>] [--until-gone <selector>] [--local] [--minutes N]
       hand-over.mjs wait | close
  open    start the private link, print HANDOVER_LINK=<url>, and watch for the finish
  wait    block until the link closes; print HANDOVER_RESULT=done|timeout|closed|error
  close   close an open link (the person said done)`;
const TUNNEL_WAIT_MS = 30_000;
const PAGE_WAIT_MS = 10_000;
const TOOL_TIMEOUT_MS = 15_000;
const POLL_MS = Number(process.env.HANDOVER_POLL_MS) || 2000;
const DIR = join(homedir(), '.wong-stack', 'hand-over');
const FILES = { pid: join(DIR, 'watcher.pid'), state: join(DIR, 'state.json'), result: join(DIR, 'result.json'), log: join(DIR, 'tunnel.log'), config: join(DIR, 'cloudflared.yml') };
const HERE = dirname(fileURLToPath(import.meta.url));
const PAGES = {
  '/': { file: join(HERE, 'hand-over-page.html'), type: 'text/html; charset=utf-8' },
  '/page.mjs': { file: join(HERE, 'hand-over-page.mjs'), type: 'text/javascript; charset=utf-8' },
};
const BLANK_URLS = new Set(['', 'about:blank', 'chrome://newtab/', 'chrome://new-tab-page/']);
const sleep = ms => new Promise(done => setTimeout(done, ms));

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

/** Kills the tunnel, records the result, and clears the rest; the watcher closes its page first. */
async function teardown(result, tunnelPid) {
  await killTunnel(tunnelPid);
  writeFileSync(FILES.result, `${JSON.stringify({ result })}\n`);
  for (const file of [FILES.state, FILES.log, FILES.config, FILES.pid]) rmSync(file, { force: true });
}

/** Tears down a hand-over whose watcher died without finishing. */
async function recoverStale(result) {
  await teardown(result, readJson(FILES.state)?.tunnelPid);
}

// ---------------------------------------------------------------------------
// The hand-over page

/** Ends a refused upgrade with a bare status line. */
function refuse(socket, status) {
  socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}

/**
 * Serves the page on 127.0.0.1:`port` and pipes `/stream?key=<key>` to the live feed on
 * `streamPort` as a fresh upgrade with no `Origin`; it never parses a frame. Resolves to a close().
 */
export function servePage({ port, streamPort, key }) {
  const sockets = new Set();
  const track = socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); return socket; };
  const server = createServer((request, response) => {
    const page = request.method === 'GET' && PAGES[new URL(request.url, 'http://page').pathname];
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
    if (url.pathname !== '/stream') return refuse(socket, '404 Not Found');
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
    await teardown('error', tunnelPid);
    return 1;
  };
  await prepareBrowser();
  const feed = await streamPort();
  if (!feed) return fail('agent-browser reported no live feed for this browser session.');
  const port = await freePort();
  const key = randomBytes(32).toString('hex');
  let origin = `http://127.0.0.1:${port}`;
  if (!values.local) {
    const tunnel = await startTunnel(port);
    tunnelPid = tunnel.pid;
    if (!tunnel.origin) return fail('The Cloudflare tunnel did not come up within 30 seconds; try again in a minute.');
    origin = tunnel.origin;
  }
  writeFileSync(FILES.state, `${JSON.stringify({ tunnelPid, port, streamPort: feed, key, until: values.until ?? null, untilGone: values['until-gone'] ?? null, deadline })}\n`, { mode: 0o600 });
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
  const finish = async result => {
    if (done) return;
    done = true;
    await closePage?.();
    await teardown(result, state.tunnelPid);
    process.exit(0);
  };
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(sig, () => finish('closed'));
  try {
    closePage = await servePage(state);
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
    const result = readJson(FILES.result)?.result;
    if (result) {
      console.log(`HANDOVER_RESULT=${result}`);
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
    parsed = parseArgs({ args, allowPositionals: true, strict: true, options: { until: { type: 'string' }, 'until-gone': { type: 'string' }, local: { type: 'boolean' }, minutes: { type: 'string' }, help: { type: 'boolean' } } });
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
  return { command, values: { ...parsed.values, minutes } };
}

const isMain = () => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } };
if (isMain()) {
  const { command, values } = parse(process.argv.slice(2));
  const run = { open: () => open(values), watch, wait, close }[command];
  process.exitCode = await run();
}
