// A loopback-only HTTP forwarder. HTTPS bytes pass through CONNECT untouched; nothing is logged.
// Routes go in order: the `first` proxy, then the `upstream`, then the site itself, each when the one before fails.
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { connect, isIP } from 'node:net';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

/** Which network the browser last used: `{ network, route, reason, pid }`, never a host, an address, or a credential.
 * `pid` is the server process that wrote it, so a file left by another start never reads as current. */
export const NETWORK_FILE = join(homedir(), '.wong-stack', 'camoufox', 'network.json');
const NETWORK = {
  upstream: { network: 'upstream' },
  backup: { network: 'upstream', route: 'backup' },
  none: { network: 'direct', reason: 'no-upstream' },
  unreachable: { network: 'direct', reason: 'unreachable' },
};
/** The `BROWSE_NETWORK=` value for a network.json state and the running server's pid (null when stopped). A state
 * another process wrote, or none, reads as no upstream: a server started by code without this file never chains. */
export function networkLine(state, serverPid) {
  if (!serverPid) return 'unknown (browser stopped)';
  if (state?.pid !== serverPid) return 'direct (no upstream proxy)';
  if (state.network === 'upstream') return state.route === 'backup' ? 'upstream (backup)' : 'upstream';
  return state.reason === 'unreachable' ? 'direct (upstream unreachable)' : 'direct (no upstream proxy)';
}

const MAX_REPLY = 16 * 1024;
const MAX_BODY = 16 * 1024 * 1024;

const HOP_HEADERS = ['connection', 'proxy-connection', 'keep-alive', 'transfer-encoding', 'te', 'trailer', 'upgrade', 'proxy-authorization', 'proxy-authenticate'];

function endHeaders(headers) {
  const removed = new Set([...HOP_HEADERS, ...(headers.connection ?? '').split(',').map(name => name.trim().toLowerCase())]);
  return Object.fromEntries(Object.entries(headers).filter(([name]) => !removed.has(name)));
}

function destination(target, tunnel = false) {
  try {
    if (tunnel && !/^(?:\[[0-9a-f:]+\]|[^\s:/@?#]+):\d+$/i.test(target)) return null;
    if (!tunnel && (!/^http:\/\//i.test(target) || /[\s\\]/.test(target))) return null;
    const url = new URL(tunnel ? `http://${target}` : target);
    if (url.protocol !== 'http:' || !url.hostname || url.username || url.password || url.hash) return null;
    const port = Number(url.port || 80);
    if (port < 1 || port > 65535) return null;
    return { url, host: url.hostname.replace(/^\[|\]$/g, ''), port };
  } catch { return null; }
}

function refuse(response, status) {
  if (response.headersSent) return response.destroy();
  response.writeHead(status, { 'content-type': 'text/plain', connection: 'close' }).end('Proxy request failed\n');
}

function refuseTunnel(socket, status) {
  if (!socket.destroyed && !socket.writableEnded) socket.end(`HTTP/1.1 ${status} Proxy request failed\r\nConnection: close\r\nContent-Type: text/plain\r\nContent-Length: 21\r\n\r\nProxy request failed\n`);
}

/** True for this computer and the local network: a remote upstream can't reach them, and they must not leave. */
export function isLocal(host) {
  const name = host.toLowerCase().replace(/\.$/, '');
  if (name === 'localhost' || name.endsWith('.localhost')) return true;
  if (isIP(name) === 4) {
    const [a, b] = name.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  if (isIP(name) === 6) {
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(name);
    if (mapped) return isLocal(mapped[1]);
    return name === '::' || name === '::1' || /^f[cd]/.test(name) || /^fe[89ab]/.test(name);
  }
  return false;
}

const authority = ({ host, port }) => `${host.includes(':') ? `[${host}]` : host}:${port}`;
const basicAuth = ({ username, password }) => `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
/** The proxy login header, or none for a proxy line without a login. */
const loginHeader = proxy => (proxy.username === undefined ? {} : { 'proxy-authorization': basicAuth(proxy) });
const loginLine = proxy => (proxy.username === undefined ? '' : `Proxy-Authorization: ${basicAuth(proxy)}\r\n`);

/** Opens a tunnel to `to` through a proxy route: the socket and any bytes after its 200 reply, or a
 * rejection on a connect error, a timeout, or any other reply. `onSocket` sees the socket at once. */
function upstreamTunnel(upstream, to, connectMs, onSocket) {
  return new Promise((resolve, reject) => {
    const socket = connect({ host: upstream.host, port: upstream.port });
    onSocket(socket);
    let reply = Buffer.alloc(0);
    const fail = () => { clearTimeout(timer); socket.removeListener('data', read); socket.destroy(); reject(new Error('upstream failed')); };
    const timer = setTimeout(fail, connectMs);
    const read = chunk => {
      reply = Buffer.concat([reply, chunk]);
      const end = reply.indexOf('\r\n\r\n');
      if (end < 0) return reply.length > MAX_REPLY ? fail() : undefined;
      clearTimeout(timer);
      socket.removeListener('data', read);
      socket.removeListener('close', fail);
      socket.removeListener('error', fail);
      if (!/^HTTP\/1\.[01] 200(?:\s|$)/.test(reply.subarray(0, end).toString('latin1'))) return fail();
      socket.pause();
      resolve({ socket, rest: reply.subarray(end + 4) });
    };
    socket.once('connect', () => socket.write(`CONNECT ${authority(to)} HTTP/1.1\r\nHost: ${authority(to)}\r\n${loginLine(upstream)}\r\n`));
    socket.on('data', read);
    socket.once('error', fail);
    socket.once('close', fail);
  });
}

/** Joins an open tunnel to the browser's socket. A drop on one side ends the other. */
function joinTunnel(client, socket, head, rest = Buffer.alloc(0)) {
  client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
  if (rest.length) client.write(rest);
  if (head.length) socket.write(head);
  client.pipe(socket);
  socket.pipe(client);
  socket.resume();
  socket.once('error', () => client.destroy());
  socket.once('close', () => { if (!socket.readableEnded) client.destroy(); });
  client.once('error', () => socket.destroy());
  client.once('close', () => socket.destroy());
}

/** Reads a whole request body, so a failed upstream try can send it again directly; null when it is too big. */
function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) { request.removeAllListeners('data'); request.resume(); return resolve(null); }
      chunks.push(chunk);
    });
    request.once('end', () => resolve(Buffer.concat(chunks)));
    request.once('error', reject);
    request.once('aborted', () => reject(new Error('aborted')));
  });
}

/** Writes the network state when it changes; a write that fails never stops browsing. */
function networkNote(file) {
  let last = null;
  return state => {
    const text = `${JSON.stringify({ ...state, pid: process.pid })}\n`;
    if (!file || text === last) return;
    last = text;
    try {
      mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
      const temp = `${file}.${process.pid}.tmp`;
      writeFileSync(temp, text, { mode: 0o600 });
      renameSync(temp, file);
    } catch { /* the status line falls back to the last state written */ }
  };
}

/** Deletes the network state on close, unless a newer start has written its own. */
function networkClear(file) {
  try {
    if (file && JSON.parse(readFileSync(file, 'utf8')).pid === process.pid) rmSync(file, { force: true });
  } catch { /* no file, or not ours */ }
}

/** Starts an ephemeral listener; close ends every connection. `first`, then `upstream`, carry each non-`local` site,
 * and `first` waits `downMs` after a failure the upstream then carried; with neither, every connection is direct. */
export async function startForwarder({ connectMs = 15_000, startMs = 5000, downMs = 60_000, first = null, upstream = null, networkFile = null, local = isLocal } = {}) {
  const sockets = new Set();
  const track = socket => {
    sockets.add(socket);
    socket.on('error', () => socket.destroy());
    socket.once('close', () => sockets.delete(socket));
    return socket;
  };
  const note = networkNote(networkFile);
  // Each route records its own state; the upstream behind a first proxy is the backup.
  const routes = [
    first && { proxy: first, state: NETWORK.upstream, first: true },
    upstream && { proxy: upstream, state: first ? NETWORK.backup : NETWORK.upstream },
  ].filter(Boolean);
  let downUntil = 0;
  /** The routes to try now: a first proxy marked down in the last `downMs` waits, so pages don't wait on it. */
  const current = () => routes.filter(route => !route.first || Date.now() >= downUntil);
  const failed = route => { if (route.first) downUntil = Date.now() + downMs; };
  note(routes.length ? NETWORK.upstream : NETWORK.none);
  const chained = to => routes.length > 0 && !local(to.host);

  /** One plain HTTP request, directly or `via` a route. `next` runs instead of a 502 on a 407, or on an error
   * or timeout before the connection opens: after that the request may have left, so it is never sent twice. */
  const forward = (to, request, response, body, via, next) => {
    const headers = { ...endHeaders(request.headers), host: to.url.host };
    if (body) headers['content-length'] = String(body.length);
    const target = via
      ? { hostname: via.proxy.host, port: via.proxy.port, path: to.url.href, headers: { ...headers, ...loginHeader(via.proxy) } }
      : { hostname: to.host, port: to.port, path: `${to.url.pathname}${to.url.search}`, headers };
    const outgoing = httpRequest({ ...target, method: request.method, agent: false });
    let done = false;
    let opened = false;
    const fail = retry => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      outgoing.destroy();
      if (retry && next && !response.destroyed) next();
      else refuse(response, 502);
    };
    const timer = setTimeout(() => fail(!opened), connectMs);
    outgoing.once('socket', socket => { track(socket).once('connect', () => { opened = true; }); });
    outgoing.once('response', incoming => {
      clearTimeout(timer);
      if (via && incoming.statusCode === 407) { incoming.resume(); return fail(true); }
      done = true;
      if (via) note(via.state);
      response.writeHead(incoming.statusCode, endHeaders(incoming.headers));
      incoming.once('error', () => response.destroy());
      incoming.pipe(response);
    });
    outgoing.once('error', () => fail(!opened));
    response.once('close', () => { done = true; clearTimeout(timer); outgoing.destroy(); });
    if (body) outgoing.end(body);
    else {
      request.once('aborted', () => outgoing.destroy());
      request.once('error', () => outgoing.destroy());
      request.pipe(outgoing);
    }
  };

  const server = createServer(async (request, response) => {
    const to = destination(request.url);
    if (!to) return refuse(response, 400);
    if (!chained(to)) return forward(to, request, response, null, null, null);
    let body;
    try { body = await readBody(request); } catch { return response.destroy(); }
    if (!body) return refuse(response, 413);
    const send = ([route, ...rest]) => {
      if (!route) {
        note(NETWORK.unreachable);
        return forward(to, request, response, body, null, null);
      }
      forward(to, request, response, body, route, () => { failed(route); send(rest); });
    };
    send(current());
  });
  server.on('connection', track);

  /** Dials the site from this computer, as before any upstream. */
  const direct = (to, client, head) => {
    const socket = track(connect({ host: to.host, port: to.port }));
    let connected = false;
    const timer = setTimeout(() => socket.destroy(new Error('connection timeout')), connectMs);
    socket.once('connect', () => {
      clearTimeout(timer);
      connected = true;
      joinTunnel(client, socket, head);
    });
    socket.once('error', () => { if (!connected) refuseTunnel(client, 502); });
    socket.once('close', () => clearTimeout(timer));
    client.once('error', () => socket.destroy());
    client.once('close', () => socket.destroy());
  };

  server.on('connect', (request, client, head) => {
    const to = destination(request.url, true);
    if (!to) return refuseTunnel(client, 400);
    if (!chained(to)) return direct(to, client, head);
    let dialing = null;
    const stopDial = () => dialing?.destroy();
    const settle = () => {
      client.removeListener('error', stopDial);
      client.removeListener('close', stopDial);
    };
    client.once('error', stopDial);
    client.once('close', stopDial);
    // Nothing from the page leaves before a tunnel opens, so a failed route moves the same tunnel to the next one.
    // A home proxy also refuses when only the site is down, so it is skipped only once the backup opens the tunnel.
    const open = ([route, ...later], firstFailed = false) => {
      if (!route) {
        settle();
        note(NETWORK.unreachable);
        return direct(to, client, head);
      }
      upstreamTunnel(route.proxy, to, connectMs, socket => { dialing = track(socket); }).then(({ socket, rest }) => {
        settle();
        if (firstFailed) downUntil = Date.now() + downMs;
        note(route.state);
        if (client.destroyed) return socket.destroy();
        joinTunnel(client, socket, head, rest);
      }, () => {
        // A browser that gave up mid-dial cancelled it: the route did not fail.
        if (client.destroyed) return settle();
        open(later, firstFailed || Boolean(route.first));
      });
    };
    open(current());
  });
  server.on('clientError', (_, socket) => refuseTunnel(socket, 400));
  server.headersTimeout = 15_000;
  server.requestTimeout = 60_000;
  const close = () => new Promise(resolve => {
    networkClear(networkFile);
    server.close(() => resolve());
    for (const socket of sockets) socket.destroy();
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('proxy startup failed')), startMs);
      const failed = () => { clearTimeout(timer); reject(new Error('proxy startup failed')); };
      server.once('error', failed);
      server.listen(0, '127.0.0.1', () => {
        clearTimeout(timer);
        server.removeListener('error', failed);
        resolve();
      });
    });
  } catch {
    await close();
    throw new Error('proxy startup failed');
  }
  return { port: server.address().port, close };
}
