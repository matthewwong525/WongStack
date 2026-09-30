#!/usr/bin/env node
// Drives Cloudflare's cloud browser (Browser Run) with agent-browser, for sites that block the agent's own.
//
//     node .claude/skills/browser/scripts/cloud-browser.mjs open [--minutes N]
//     node .claude/skills/browser/scripts/cloud-browser.mjs close [--session cloud-N]
//     node .claude/skills/browser/scripts/cloud-browser.mjs check [--session s]
//     node .claude/skills/browser/scripts/cloud-browser.mjs carry-in|carry-back --site <host>... [--session cloud-N] [--from s]
//     node .claude/skills/browser/scripts/cloud-browser.mjs first [local|cloud]
//
// `open` reads CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID from the environment or the primary worktree's
// .env, acquires a Browser Run session, and starts a detached loopback bridge on 127.0.0.1:<port>/<secret>.
// agent-browser can't send a header on its CDP socket (vercel-labs/agent-browser#1642), so the bridge adds
// `Authorization` to each upgrade and pipes bytes both ways, never reading a frame. The token reaches the
// bridge on stdin: never argv, a file, or output. A first 401 or 403 widens the token by one group
// (Browser Run Write) by the rules in wong-setup's references/permission-groups.md, then retries with backoff.
//
// The bridge ends on `close`, when its last client leaves after one connected, or at the deadline (30 minutes
// by default). Each time it sends Browser.close upstream, so no billable browser stays open.
//
// `check` reads only the page's title and first visible text and prints BROWSER_BLOCKED=check|block|none;
// a check counts only once it has held about 15 seconds. `carry-in` copies one site's cookies and storage
// from the personal session (`--from`, default `default`) into the cloud session, and `carry-back` the other
// way, dropping bot-check cookies; the copy lives in a private temp folder deleted in a `finally`. `first`
// reads or sets ~/.wong-stack/browser.json's `first`.
//
// Exit codes: 0 ok · 1 failed · 2 usage · 3 the account's cloud browser allowance is used up.
// Node built-ins only. WONG_CLOUDFLARE_API points every call at another API base, for tests.
import { execFileSync, spawn } from 'node:child_process';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { connect as connectTcp, createServer as createTcpServer } from 'node:net';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { connect as connectTls } from 'node:tls';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { cloudflareApi, loadEnv, repoContext } from '../../memory/scripts/lib/store.mjs';

const USAGE = `usage: cloud-browser.mjs open [--minutes N]      start a cloud session; prints CLOUD_BROWSER_CDP= and CLOUD_BROWSER_SESSION=
       cloud-browser.mjs close [--session cloud-N]   end one cloud session, or every one
       cloud-browser.mjs check [--session s]         print BROWSER_BLOCKED=check|block|none
       cloud-browser.mjs carry-in --site <host>... [--session cloud-N] [--from s]    one site's login into the cloud
       cloud-browser.mjs carry-back --site <host>... [--session cloud-N] [--from s]  and back; prints CARRY=done|none|busy
       cloud-browser.mjs first [local|cloud]         read or set which browser a task tries first`;
export const GROUP = 'Browser Run Write';
/** The waits, in seconds, while a widened token takes effect: permission-groups.md's backoff. */
export const PROPAGATION = [2, 4, 8, 15, 30];
const KEEP_ALIVE = 600_000;
const DIR = () => join(homedir(), '.wong-stack', 'cloud-browser');
const SETTING = () => join(homedir(), '.wong-stack', 'browser.json');
const GRACE_MS = Number(process.env.CLOUD_BROWSER_GRACE_MS) || 3000;
const HOLD_MS = Number(process.env.CLOUD_BROWSER_HOLD_MS ?? 15_000);
const HEAD_LIMIT = 16_384;
const sleep = ms => new Promise(done => setTimeout(done, ms));

/** A stop with a plain reason; `kind` is `quota`, `refused`, or `failed`. */
export class CloudBrowserError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

// ---------------------------------------------------------------------------
// Block detection

const CHECK = [/^just a moment/i, /performing security verification/i, /verify(ing)? you are (a )?human/i, /checking (if the site connection is secure|your browser)/i, /needs to review the security of your connection/i];
const BLOCK = [/^attention required! \| cloudflare/i, /sorry, you have been blocked/i, /error\s*(code:?\s*)?1020/i, /used cloudflare to restrict access/i, /you are unable to access/i];

/** Whether a page's title and first visible text show Cloudflare's check, its block, or neither. */
export function classify({ title = '', text = '' }) {
  const seen = [title.trim(), text.slice(0, 1000)];
  if (seen.some(part => BLOCK.some(sign => sign.test(part)))) return 'block';
  if (seen.some(part => CHECK.some(sign => sign.test(part)))) return 'check';
  return 'none';
}

// ---------------------------------------------------------------------------
// Login carry-over

/** Cookies a bot check issues: Cloudflare, Akamai, DataDome, PerimeterX, and Imperva. Never carried. */
export const CHALLENGE_COOKIES = [
  /^cf_clearance$/, /^__cf_bm$/, /^__cflb$/, /^__cfruid$/, /^_cfuvid$/, /^__cfwaitingroom$/, /^cf_chl_/,
  /^_abck$/, /^ak_bmsc$/, /^bm_(sz|sv|mi|so|s|ss)$/, /^sbsd(_o)?$/,
  /^datadome$/,
  /^_px(\d|hd|vid|de|ff_.*)?$/, /^pxcts$/,
  /^incap_ses_/, /^visid_incap_/, /^nlbi_/, /^reese84$/, /^___utmvc$/,
];

const bare = host => String(host).trim().toLowerCase().replace(/^\.+/, '').replace(/^www\./, '');
const under = (host, sites) => sites.some(site => host === site || host.endsWith(`.${site}`));
const originHost = origin => { try { return new URL(origin).hostname.toLowerCase(); } catch { return ''; } };

/** Only the named sites' cookies and storage, each site's subdomains included, with no bot-check cookie. */
export function keepFor(state, sites) {
  const hosts = sites.map(bare);
  return {
    cookies: (state.cookies ?? []).filter(cookie => under(String(cookie.domain ?? '').toLowerCase().replace(/^\.+/, ''), hosts) && !CHALLENGE_COOKIES.some(name => name.test(cookie.name))),
    origins: (state.origins ?? []).filter(origin => under(originHost(origin.origin), hosts)),
  };
}

// ---------------------------------------------------------------------------
// The Cloudflare side: the upgrade, the one-group widen, and Browser.close

/** The API base as a socket target: TLS for https, plain TCP for a test's http. */
function target(api) {
  const url = new URL(api);
  const tls = url.protocol === 'https:';
  return { tls, host: url.hostname, port: Number(url.port) || (tls ? 443 : 80), prefix: url.pathname.replace(/\/$/, '') };
}

/** Opens a socket to the API and writes a WebSocket upgrade for `path`, with the token and `headers`. */
function upgrade(api, token, path, headers = {}) {
  const { tls, host, port, prefix } = target(api);
  const socket = tls ? connectTls({ host, port, servername: host }) : connectTcp(port, host);
  const lines = [`GET ${prefix}${path} HTTP/1.1`, `Host: ${host}`, 'Upgrade: websocket', 'Connection: Upgrade', `Authorization: Bearer ${token}`];
  for (const [name, value] of Object.entries({ 'sec-websocket-version': '13', 'sec-websocket-key': randomBytes(16).toString('base64'), ...headers })) lines.push(`${name}: ${value}`);
  socket.write(`${lines.join('\r\n')}\r\n\r\n`);
  return socket;
}

/** Resolves to the response head's status and lowercased headers, keeping the socket open. */
function responseHead(socket) {
  return new Promise((resolve, reject) => {
    let head = '';
    const onData = chunk => {
      head += chunk.toString('latin1');
      const end = head.indexOf('\r\n\r\n');
      if (end < 0 && head.length < HEAD_LIMIT) return;
      socket.off('data', onData);
      const [status, ...lines] = head.slice(0, end < 0 ? head.length : end).split('\r\n');
      resolve({ status: Number(/^HTTP\/1\.1 (\d{3})/.exec(status)?.[1] ?? 0), headers: Object.fromEntries(lines.map(line => [line.slice(0, line.indexOf(':')).trim().toLowerCase(), line.slice(line.indexOf(':') + 1).trim()])) });
    };
    socket.on('data', onData);
    socket.once('error', reject);
    socket.once('close', () => resolve({ status: 0, headers: {} }));
  });
}

const devtools = (account, sessionId) => `/accounts/${account}/browser-run/devtools/browser${sessionId ? `/${sessionId}` : ''}?keep_alive=${KEEP_ALIVE}`;

/** One acquire attempt: `{status, sessionId}`. The socket closes; the browser waits for the bridge's client. */
async function probe({ api, token, account }) {
  const socket = upgrade(api, token, devtools(account));
  try {
    const { status, headers } = await responseHead(socket);
    return { status, sessionId: headers['cf-browser-session-id'] ?? null };
  } catch {
    return { status: 0, sessionId: null };
  } finally {
    socket.destroy();
  }
}

/** A masked text frame asking the browser to close: the one frame the bridge ever writes. */
export function closeFrame() {
  const payload = Buffer.from(JSON.stringify({ id: 1, method: 'Browser.close' }));
  const mask = randomBytes(4);
  return Buffer.concat([Buffer.from([0x81, 0x80 | payload.length]), mask, payload.map((byte, i) => byte ^ mask[i % 4])]);
}

/** Connects to the session and sends Browser.close, waiting at most `ms` for an answer. */
async function closeBrowser({ api, token, account, sessionId }, ms = 2000) {
  const socket = upgrade(api, token, devtools(account, sessionId));
  socket.on('error', () => {});
  const timer = sleep(ms);
  const { status } = await Promise.race([responseHead(socket).catch(() => ({ status: 0 })), timer.then(() => ({ status: 0 }))]);
  if (status === 101) {
    socket.write(closeFrame());
    await Promise.race([new Promise(done => socket.once('data', done).once('close', done)), sleep(ms)]);
  }
  socket.destroy();
}

/** Calls the Cloudflare API with the token and returns `result`; a refusal names the call, never the token. */
async function cf({ api, token }, method, path, body) {
  const init = { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  const response = await fetch(`${api}${path}`, body ? { ...init, body: JSON.stringify(body) } : init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new CloudBrowserError('refused', `Cloudflare ${method} ${path.split('?')[0]}: HTTP ${response.status}`);
  return data.result;
}

const isAccountKey = key => key.startsWith('com.cloudflare.api.account.') && !key.includes('.zone.');

/**
 * Grants the token Browser Run Write, keeping every other policy, its `resources`, both API-token grants,
 * and its condition, as permission-groups.md requires. False when the token already holds it.
 */
export async function widenBrowserRun(call) {
  const { id } = await cf(call, 'GET', '/user/tokens/verify');
  const [self, groups] = await Promise.all([cf(call, 'GET', `/user/tokens/${id}`), cf(call, 'GET', '/user/tokens/permission_groups?per_page=1000')]);
  const group = groups.find(each => each.name === GROUP && each.scopes?.includes('com.cloudflare.api.account'));
  if (!group) throw new CloudBrowserError('refused', `Cloudflare lists no account permission group named ${GROUP}`);
  if (self.policies.some(policy => policy.permission_groups.some(each => each.id === group.id))) return false;
  const policy = self.policies.find(each => each.effect === 'allow' && Object.keys(each.resources ?? {}).some(isAccountKey));
  if (!policy) throw new CloudBrowserError('refused', `the token has no account policy for ${GROUP}`);
  policy.permission_groups.push({ id: group.id });
  const { name, status, policies, condition } = self;
  await cf(call, 'PUT', `/user/tokens/${self.id ?? id}`, { name, status, policies, ...(condition && { condition }) });
  return true;
}

const refusedStatus = status => status === 401 || status === 403;
const byHand = `Cloudflare refused the cloud browser. Add this permission to your Cloudflare token by hand: ${GROUP} (Account).`;

/**
 * Acquires a Browser Run session: `{sessionId, granted}`. A first 401 or 403 widens the token once, then
 * retries through the propagation window; only a refusal at its end is real.
 */
export async function acquire({ api, token, account, wait = sleep }) {
  let attempt = await probe({ api, token, account });
  let granted = false;
  if (refusedStatus(attempt.status)) {
    try {
      granted = await widenBrowserRun({ api, token });
    } catch (error) {
      throw new CloudBrowserError('refused', `${byHand} (${error.message})`);
    }
    for (const seconds of PROPAGATION) {
      if (!refusedStatus(attempt.status)) break;
      await wait(seconds * 1000);
      attempt = await probe({ api, token, account });
    }
  }
  if (attempt.status === 429) throw new CloudBrowserError('quota', 'Your Cloudflare account has used up its cloud browser time for now: the free Workers plan includes 10 minutes a day. Do this step on your own device, or move to the Workers Paid plan.');
  if (refusedStatus(attempt.status)) throw new CloudBrowserError('refused', byHand);
  if (attempt.status !== 101 || !attempt.sessionId) throw new CloudBrowserError('failed', attempt.status ? `Cloudflare's cloud browser answered HTTP ${attempt.status}; try again in a minute.` : 'Could not reach Cloudflare\'s cloud browser; check the connection and try again.');
  return { sessionId: attempt.sessionId, granted };
}

// ---------------------------------------------------------------------------
// The bridge

const secretMatches = (given, secret) => {
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Serves 127.0.0.1:`port`. An upgrade to `/<secret>` becomes one to the session with the token added; bytes
 * pass both ways unread. Resolves to a `shutdown()` that closes every socket and then the browser.
 */
export function serveBridge(config, { onIdle = () => {} } = {}) {
  const { port, secret } = config;
  const sockets = new Set();
  let clients = 0;
  let idle = null;
  const track = socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)).on('error', () => socket.destroy()); return socket; };
  const server = createServer((request, response) => response.writeHead(404, { 'content-length': 0 }).end());
  server.on('connection', track);
  server.on('upgrade', (request, socket, head) => {
    const path = new URL(request.url, 'http://bridge').pathname.replace(/\/$/, '');
    if (!secretMatches(path, `/${secret}`)) return socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
    clients++;
    clearTimeout(idle);
    const forwarded = {};
    for (const name of ['sec-websocket-key', 'sec-websocket-version', 'sec-websocket-extensions']) if (request.headers[name]) forwarded[name] = request.headers[name];
    const upstream = track(upgrade(config.api, config.token, devtools(config.account, config.sessionId), forwarded));
    if (head.length) upstream.write(head);
    upstream.pipe(socket).pipe(upstream);
    let left = false;
    const leave = () => {
      if (left) return;
      left = true;
      socket.destroy();
      upstream.destroy();
      if (--clients === 0) idle = setTimeout(onIdle, GRACE_MS);
    };
    socket.on('close', leave);
    upstream.on('close', leave);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(async () => {
      clearTimeout(idle);
      server.close();
      for (const socket of sockets) socket.destroy();
      await closeBrowser(config).catch(() => {});
    }));
  });
}

/** The detached bridge process: its config arrives on stdin, so the token never sits in argv. */
async function bridge() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const config = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  let shutdown = null;
  let stopping = null;
  const stop = () => (stopping ??= (async () => {
    await shutdown?.();
    rmSync(config.file, { force: true });
    process.exit(0);
  })());
  shutdown = await serveBridge(config, { onIdle: stop });
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(sig, stop);
  setTimeout(stop, Math.max(0, config.deadline - Date.now()));
}

// ---------------------------------------------------------------------------
// Files, processes, and agent-browser

const readJson = file => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null);
const alive = pid => { try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; } };
const sessionFile = name => join(DIR(), `${name}.json`);
const openSessions = () => (existsSync(DIR()) ? readdirSync(DIR()).filter(name => /^cloud-\d+\.json$/.test(name)).map(name => name.slice(0, -5)) : []);

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createTcpServer().once('error', reject);
    server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve(port)); });
  });
}

/** True once something accepts on the loopback `port`. */
function listening(port) {
  return new Promise(resolve => {
    const socket = connectTcp(port, '127.0.0.1');
    socket.once('connect', () => { socket.destroy(); resolve(true); }).once('error', () => resolve(false));
  });
}

/** Runs agent-browser and returns its trimmed stdout; a failure throws with its last error line. */
function ab(args) {
  try {
    return execFileSync('agent-browser', args, { encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    throw new CloudBrowserError('failed', `agent-browser ${args.filter(arg => !arg.startsWith('ws://')).slice(0, 4).join(' ')} failed: ${String(error.stderr || error.message).trim().split('\n').at(-1)}`);
  }
}

/** The agent-browser flags for a session: a cloud one also gets its bridge, so it never launches a local browser. */
function sessionArgs(name) {
  if (!name) return [];
  const cloud = /^cloud-\d+$/.test(name) && readJson(sessionFile(name));
  return ['--session', name, ...(cloud ? ['--cdp', cloud.cdp] : [])];
}

/** The one open cloud session, or the named one; a stop when that is ambiguous or missing. */
function cloudSession(name) {
  const open = openSessions();
  if (name) {
    if (!open.includes(name)) throw new CloudBrowserError('failed', `No cloud session named ${name} is open.`);
    return name;
  }
  if (open.length !== 1) throw new CloudBrowserError('failed', open.length ? `Several cloud sessions are open (${open.join(', ')}); name one with --session.` : 'No cloud session is open; run `open` first.');
  return open[0];
}

/**
 * True when another browser holds the personal profile: its Chrome lock names a live process, and the
 * personal session is not the one running. The lock is only read, never removed.
 */
function profileBusy(personal) {
  const profile = process.env.AGENT_BROWSER_PROFILE || readJson(join(homedir(), '.agent-browser', 'config.json'))?.profile;
  if (!profile) return false;
  let lock;
  try { lock = readlinkSync(join(profile, 'SingletonLock')); } catch { return false; }
  const pid = Number(/-(\d+)$/.exec(lock)?.[1]);
  if (!pid || !alive(pid)) return false;
  const sessions = JSON.parse(ab(['session', 'list', '--json']) || '{}').data?.sessions ?? [];
  return !sessions.includes(personal);
}

// ---------------------------------------------------------------------------
// Subcommands

async function open({ minutes }) {
  let env = {};
  try { env = loadEnv(repoContext()); } catch { /* outside a checkout: the environment only */ }
  const token = process.env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID || env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !account) throw new CloudBrowserError('failed', 'CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must be set in the primary worktree\'s .env.');
  const api = cloudflareApi();
  const { sessionId, granted } = await acquire({ api, token, account });
  if (granted) console.log(`CLOUD_BROWSER_GRANTED=${GROUP}`);
  mkdirSync(DIR(), { recursive: true, mode: 0o700 });
  const taken = new Set(openSessions());
  let n = 1;
  while (taken.has(`cloud-${n}`)) n++;
  const name = `cloud-${n}`;
  const file = sessionFile(name);
  const port = await freePort();
  const secret = randomBytes(24).toString('hex');
  const cdp = `ws://127.0.0.1:${port}/${secret}`;
  const deadline = Date.now() + minutes * 60_000;
  writeFileSync(file, `${JSON.stringify({ cdp, port, deadline })}\n`, { mode: 0o600, flag: 'wx' });
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'bridge'], { detached: true, stdio: ['pipe', 'ignore', 'ignore'] });
  child.stdin.end(JSON.stringify({ api, token, account, sessionId, port, secret, deadline, file }));
  child.unref();
  writeFileSync(file, `${JSON.stringify({ cdp, port, deadline, pid: child.pid })}\n`, { mode: 0o600 });
  for (let i = 0; i < 100 && alive(child.pid); i++) {
    if (await listening(port)) {
      console.log(`CLOUD_BROWSER_CDP=${cdp}`);
      console.log(`CLOUD_BROWSER_SESSION=${name}`);
      return 0;
    }
    await sleep(100);
  }
  child.kill('SIGKILL');
  rmSync(file, { force: true });
  await closeBrowser({ api, token, account, sessionId });
  throw new CloudBrowserError('failed', 'The cloud browser bridge did not start; try again.');
}

async function close({ session }) {
  const names = session ? [session] : openSessions();
  const closed = [];
  for (const name of names) {
    const { pid } = readJson(sessionFile(name)) ?? {};
    if (pid && alive(pid)) {
      process.kill(pid, 'SIGTERM');
      for (let i = 0; i < 60 && alive(pid); i++) await sleep(100);
      if (alive(pid)) process.kill(pid, 'SIGKILL');
    }
    rmSync(sessionFile(name), { force: true });
    closed.push(name);
  }
  console.log(`CLOUD_BROWSER_CLOSED=${closed.join(',')}`);
  return 0;
}

/** The page's title and first visible text: nothing else is read. */
const page = session => ({ title: ab([...sessionArgs(session), 'get', 'title']), text: ab([...sessionArgs(session), 'get', 'text', 'body']).slice(0, 1000) });

async function check({ session }) {
  let seen = classify(page(session));
  for (const until = Date.now() + HOLD_MS; seen === 'check' && Date.now() < until;) {
    await sleep(Math.min(3000, Math.max(0, until - Date.now())));
    seen = classify(page(session));
  }
  console.log(`BROWSER_BLOCKED=${seen}`);
  return 0;
}

async function carry(direction, { site, session, from = 'default' }) {
  if (!site?.length) usageError(USAGE, `${direction} needs at least one --site`);
  const cloud = cloudSession(session);
  if (profileBusy(from)) {
    console.log('CARRY=busy');
    return 0;
  }
  const [source, destination] = direction === 'carry-in' ? [from, cloud] : [cloud, from];
  const dir = mkdtempSync(join(tmpdir(), 'wong-carry-'));
  try {
    chmodSync(dir, 0o700);
    const saved = join(dir, 'state.json');
    ab([...sessionArgs(source), 'state', 'save', saved]);
    const kept = keepFor(JSON.parse(readFileSync(saved, 'utf8')), site);
    if (!kept.cookies.length && !kept.origins.length) {
      console.log('CARRY=none');
      return 0;
    }
    const carried = join(dir, 'carry.json');
    writeFileSync(carried, JSON.stringify(kept), { mode: 0o600 });
    ab([...sessionArgs(destination), 'state', 'load', carried]);
    console.log('CARRY=done');
    return 0;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function first(value) {
  const file = SETTING();
  if (value) {
    mkdirSync(join(homedir(), '.wong-stack'), { recursive: true });
    writeFileSync(file, `${JSON.stringify({ ...readJson(file), first: value }, null, 2)}\n`);
  }
  console.log(`BROWSER_FIRST=${readJson(file)?.first === 'cloud' ? 'cloud' : 'local'}`);
  return 0;
}

// ---------------------------------------------------------------------------
// CLI

const COMMANDS = new Set(['open', 'close', 'check', 'carry-in', 'carry-back', 'first', 'bridge']);

function parse(args) {
  const { values, positionals } = parseCli({ usage: USAGE, args, allowPositionals: true, options: { minutes: { type: 'string' }, session: { type: 'string' }, site: { type: 'string', multiple: true }, from: { type: 'string' } } });
  const [command, ...rest] = positionals;
  if (!COMMANDS.has(command)) usageError(USAGE, command ? `unknown command: ${command}` : 'missing command');
  if (rest.length > (command === 'first' ? 1 : 0) || (command === 'first' && rest[0] && !['local', 'cloud'].includes(rest[0]))) usageError(USAGE, `unexpected: ${rest.join(' ')}`);
  const minutes = Number(values.minutes ?? 30);
  if (!(minutes > 0)) usageError(USAGE, '--minutes must be a positive number');
  return { command, values: { ...values, minutes }, value: rest[0] };
}

if (isMain(import.meta.url)) {
  const { command, values, value } = parse(process.argv.slice(2));
  const run = { open: () => open(values), close: () => close(values), check: () => check(values), 'carry-in': () => carry('carry-in', values), 'carry-back': () => carry('carry-back', values), first: () => first(value), bridge }[command];
  try {
    process.exitCode = (await run()) ?? 0;
  } catch (error) {
    if (error.kind === 'quota') console.log('CLOUD_BROWSER_QUOTA=used-up');
    if (error.kind === 'refused') console.log(`CLOUD_BROWSER_NEEDS=${GROUP}`);
    console.error(error.message);
    process.exitCode = error.kind === 'quota' ? 3 : 1;
  }
}
