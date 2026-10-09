// A loopback-only HTTP forwarder. HTTPS bytes pass through CONNECT untouched; nothing is logged.
import { createServer, request as httpRequest } from 'node:http';
import { connect } from 'node:net';

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

/** Starts an ephemeral listener; close destroys every downstream and upstream connection. */
export async function startForwarder({ connectMs = 15_000, startMs = 5000 } = {}) {
  const sockets = new Set();
  const track = socket => {
    sockets.add(socket);
    socket.on('error', () => socket.destroy());
    socket.once('close', () => sockets.delete(socket));
    return socket;
  };
  const server = createServer((request, response) => {
    const to = destination(request.url);
    if (!to) return refuse(response, 400);
    const headers = { ...endHeaders(request.headers), host: to.url.host };
    const upstream = httpRequest({ hostname: to.host, port: to.port, method: request.method, path: `${to.url.pathname}${to.url.search}`, headers, agent: false });
    const timer = setTimeout(() => upstream.destroy(), connectMs);
    upstream.once('socket', socket => track(socket));
    upstream.once('response', incoming => {
      clearTimeout(timer);
      response.writeHead(incoming.statusCode, endHeaders(incoming.headers));
      incoming.once('error', () => response.destroy());
      incoming.pipe(response);
    });
    upstream.once('error', () => {
      clearTimeout(timer);
      refuse(response, 502);
    });
    request.once('aborted', () => upstream.destroy());
    request.once('error', () => upstream.destroy());
    response.once('close', () => upstream.destroy());
    request.pipe(upstream);
  });
  server.on('connection', track);
  server.on('connect', (request, client, head) => {
    const to = destination(request.url, true);
    if (!to) return refuseTunnel(client, 400);
    const upstream = track(connect({ host: to.host, port: to.port }));
    let connected = false;
    const timer = setTimeout(() => upstream.destroy(new Error('connection timeout')), connectMs);
    upstream.once('connect', () => {
      clearTimeout(timer);
      connected = true;
      client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head.length) upstream.write(head);
      client.pipe(upstream);
      upstream.pipe(client);
    });
    upstream.once('error', () => connected ? client.destroy() : refuseTunnel(client, 502));
    upstream.once('close', () => { clearTimeout(timer); if (connected && !upstream.readableEnded) client.destroy(); });
    client.once('error', () => upstream.destroy());
    client.once('close', () => upstream.destroy());
  });
  server.on('clientError', (_, socket) => refuseTunnel(socket, 400));
  server.headersTimeout = 15_000;
  server.requestTimeout = 60_000;
  const close = () => new Promise(resolve => {
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
