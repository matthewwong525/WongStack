import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer as httpServer, request } from 'node:http';
import { connect, createServer as tcpServer, Server } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { isLocal, networkLine, startForwarder } from '../../.agents/skills/browser/scripts/forwarder.mjs';

async function listen(t, server) {
  const sockets = new Set();
  server.on('connection', socket => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)); });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => new Promise(done => { server.close(() => done()); for (const socket of sockets) socket.destroy(); }));
  return server.address().port;
}

async function proxy(t, options) {
  const forwarder = await startForwarder(options);
  t.after(() => forwarder.close());
  return forwarder;
}

function send(port, path, { method = 'GET', headers = {}, chunks = [] } = {}) {
  return new Promise((resolve, reject) => {
    const outgoing = request({ hostname: '127.0.0.1', port, path, method, headers, agent: false }, response => {
      const received = [];
      response.on('data', chunk => received.push(chunk));
      response.once('error', reject);
      response.once('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(received) }));
    });
    outgoing.once('error', reject);
    for (const chunk of chunks) outgoing.write(chunk);
    outgoing.end();
  });
}

function raw(port, bytes) {
  return new Promise((resolve, reject) => {
    const received = [];
    const socket = connect(port, '127.0.0.1', () => socket.write(bytes));
    socket.on('data', chunk => received.push(chunk));
    socket.once('error', reject);
    socket.once('end', () => resolve(Buffer.concat(received)));
    socket.setTimeout(5000, () => socket.destroy(new Error('test socket timeout')));
  });
}

test('HTTP forwards streamed request and response bytes and removes hop and proxy authentication headers', async t => {
  const first = Buffer.from([0, 255, 32, 13, 10]);
  const last = Buffer.from('last chunk');
  let receivedHeaders;
  let receivedPath;
  const target = await listen(t, httpServer((incoming, response) => {
    receivedHeaders = incoming.headers;
    receivedPath = incoming.url;
    response.writeHead(201, { 'x-end-to-end': 'yes', connection: 'x-response-hop', 'x-response-hop': 'remove', 'proxy-authenticate': 'remove' });
    incoming.on('data', chunk => response.write(chunk));
    incoming.once('end', () => response.end());
  }));
  const p = await proxy(t);
  const result = await new Promise((resolve, reject) => {
    const outgoing = request({ hostname: '127.0.0.1', port: p.port, path: `http://127.0.0.1:${target}/path?q=one`, method: 'POST', headers: {
      host: 'wrong.example', connection: 'x-request-hop', 'x-request-hop': 'remove', 'proxy-connection': 'keep-alive', 'proxy-authorization': 'secret', 'x-end-to-end': 'yes',
    } }, response => {
      const chunks = [];
      response.on('data', chunk => {
        chunks.push(chunk);
        if (chunks.length === 1) { assert.deepEqual(chunk, first); outgoing.end(last); }
      });
      response.once('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
      response.once('error', reject);
    });
    outgoing.once('error', reject);
    outgoing.write(first); // The first response arrives before the request finishes.
  });
  assert.equal(result.status, 201);
  assert.deepEqual(result.body, Buffer.concat([first, last]));
  assert.equal(receivedPath, '/path?q=one');
  assert.equal(receivedHeaders.host, `127.0.0.1:${target}`);
  for (const name of ['x-request-hop', 'proxy-authorization', 'proxy-connection']) assert.equal(receivedHeaders[name], undefined);
  for (const name of ['x-response-hop', 'proxy-authenticate']) assert.equal(result.headers[name], undefined);
  assert.equal(result.headers['x-end-to-end'], 'yes');
  assert.equal(receivedHeaders['x-end-to-end'], 'yes');
});

test('CONNECT tunnels opaque binary data including bytes in the initial HTTP head', async t => {
  const target = await listen(t, tcpServer(socket => socket.pipe(socket)));
  const p = await proxy(t);
  const bytes = Buffer.from([22, 3, 1, 0, 255, 10, 13]);
  await new Promise((resolve, reject) => {
    const socket = connect(p.port, '127.0.0.1', () => socket.write(Buffer.concat([Buffer.from(`CONNECT 127.0.0.1:${target} HTTP/1.1\r\nHost: 127.0.0.1:${target}\r\n\r\n`), bytes])));
    let received = Buffer.alloc(0);
    socket.on('data', chunk => {
      received = Buffer.concat([received, chunk]);
      const split = received.indexOf('\r\n\r\n');
      if (split < 0 || received.length < split + 4 + bytes.length) return;
      assert.equal(received.subarray(0, split).toString(), 'HTTP/1.1 200 Connection Established');
      assert.deepEqual(received.subarray(split + 4), bytes);
      socket.destroy();
      resolve();
    });
    socket.once('error', reject);
  });
});

test('failed upstream connections have generic HTTP and CONNECT failures', async t => {
  const unused = tcpServer();
  await new Promise(done => unused.listen(0, '127.0.0.1', done));
  const port = unused.address().port;
  await new Promise(done => unused.close(done));
  const p = await proxy(t);
  const response = await send(p.port, `http://127.0.0.1:${port}/private?secret=yes`);
  assert.equal(response.status, 502);
  assert.equal(response.body.toString(), 'Proxy request failed\n');
  const tunnel = await raw(p.port, `CONNECT 127.0.0.1:${port} HTTP/1.1\r\n\r\n`);
  assert.match(tunnel.toString(), /^HTTP\/1.1 502 Proxy request failed/);
  assert.doesNotMatch(tunnel.toString(), /ECONN|127\.0\.0\.1/);
});

test('malformed destinations and unsupported schemes are rejected before forwarding', async t => {
  const p = await proxy(t);
  for (const path of ['/relative', 'https://example.com/', 'ftp://example.com/', 'http://user:secret@example.com/', 'http://example.com/#fragment', 'http://example.com:0/', 'http://example.com:99999/', 'http://bad\\host/']) {
    const response = await send(p.port, path);
    assert.equal(response.status, 400, path);
    assert.equal(response.body.toString(), 'Proxy request failed\n', path);
  }
  for (const path of ['example.com', 'example.com:0', 'example.com:99999', 'user:secret@example.com:443', 'example.com:443/private', '[broken]:443']) {
    assert.match((await raw(p.port, `CONNECT ${path} HTTP/1.1\r\n\r\n`)).toString(), /^HTTP\/1.1 400 Proxy request failed/, path);
  }
  assert.match((await raw(p.port, 'invalid HTTP bytes\r\n\r\n')).toString(), /^HTTP\/1.1 400 Proxy request failed/);
});

test('upstream response establishment has a deadline and browser disconnects close upstream sockets', async t => {
  let closed;
  const disconnected = new Promise(done => { closed = done; });
  let ready;
  const target = await listen(t, httpServer(incoming => { incoming.socket.once('close', () => closed()); ready?.(); }));
  const p = await proxy(t, { connectMs: 50 });
  assert.equal((await send(p.port, `http://127.0.0.1:${target}/slow`)).status, 502);
  await disconnected;
  const aborted = new Promise(done => { closed = done; });
  const arrived = new Promise(done => { ready = done; });
  const client = connect(p.port, '127.0.0.1');
  await new Promise(done => client.once('connect', done));
  client.write(`GET http://127.0.0.1:${target}/abort HTTP/1.1\r\nHost: example.com\r\n\r\n`);
  await arrived;
  client.destroy();
  await aborted;
});

test('closing the forwarder destroys a live CONNECT tunnel and its upstream and closes the listener', async t => {
  let remoteClosed;
  const closure = new Promise(done => { remoteClosed = done; });
  const target = await listen(t, tcpServer(socket => socket.once('close', remoteClosed)));
  const p = await proxy(t);
  const client = connect(p.port, '127.0.0.1');
  await new Promise(done => client.once('connect', done));
  const accepted = new Promise(done => client.once('data', done));
  client.write(`CONNECT 127.0.0.1:${target} HTTP/1.1\r\n\r\n`);
  assert.match((await accepted).toString(), /200 Connection Established/);
  const clientClosed = new Promise(done => client.once('close', done));
  await p.close();
  await Promise.all([closure, clientClosed]);
  await assert.rejects(raw(p.port, 'GET / HTTP/1.1\r\n\r\n'), { code: 'ECONNREFUSED' });
});

test('an incomplete upstream HTTP response closes the downstream stream', async t => {
  const target = await listen(t, httpServer((_, response) => {
    response.writeHead(200, { 'content-length': '100' });
    response.write('partial');
    setImmediate(() => response.destroy());
  }));
  const p = await proxy(t);
  await assert.rejects(send(p.port, `http://127.0.0.1:${target}/`));
});

test('CONNECT forwards a complete upstream end without losing its buffered bytes', async t => {
  const bytes = Buffer.alloc(256 * 1024, 251);
  const target = await listen(t, tcpServer(socket => socket.end(bytes)));
  const p = await proxy(t);
  const result = await raw(p.port, `CONNECT 127.0.0.1:${target} HTTP/1.1\r\n\r\n`);
  const split = result.indexOf('\r\n\r\n');
  assert.match(result.subarray(0, split).toString(), /200 Connection Established/);
  assert.deepEqual(result.subarray(split + 4), bytes);
});

test('listener always binds only IPv4 loopback, and startup errors and stalls fail generically', async t => {
  const original = Server.prototype.listen;
  let binding;
  // Each mock is undone before the next: stacked mocks restore in the wrong order, and a later test would inherit one.
  const mocked = listen => t.mock.method(Server.prototype, 'listen', listen).mock;
  let mock = mocked(function (...args) { binding = args.slice(0, 2); return original.apply(this, args); });
  const p = await proxy(t);
  assert.deepEqual(binding, [0, '127.0.0.1']);
  await p.close();
  mock.restore();
  mock = mocked(function () { this.emit('error', new Error('sensitive machine detail')); return this; });
  await assert.rejects(startForwarder(), { message: 'proxy startup failed' });
  mock.restore();
  mock = mocked(function () { return this; });
  await assert.rejects(startForwarder({ startMs: 10 }), { message: 'proxy startup failed' });
  mock.restore();
});

// Routes: a first proxy, then the upstream (its backup), then the site itself.
const LOGIN = 'tester';
const PASSWORD = 's3cret-pass';
const AUTH = `Basic ${Buffer.from(`${LOGIN}:${PASSWORD}`).toString('base64')}`;
// A public name the forwarder sends to a route; the fake gateway, not DNS, answers for it.
const SITE_HOST = 'site.example.test';
// The fallback tests reach the fake site at 127.0.0.1, so `local` marks no address local: each tries a route first.
const remote = () => false;
const wait = ms => new Promise(done => setTimeout(done, ms));
const closedPort = async t => { const server = tcpServer(); const port = await listen(t, server); await new Promise(done => server.close(done)); return port; };
const upstreamAt = port => ({ host: '127.0.0.1', port, username: LOGIN, password: PASSWORD });
/** A first proxy at `firstPort` with no login, as at a home, and the paid upstream behind it. */
const bothAt = (firstPort, upstreamPort) => ({ first: { host: '127.0.0.1', port: firstPort }, upstream: upstreamAt(upstreamPort) });

/** A fake site: plain HTTP that answers `site:<method> <path> <body>`, and a raw echo for tunnels. */
async function fakeSite(t) {
  const hits = [];
  const http = httpServer((incoming, response) => {
    hits.push(incoming.url);
    let body = '';
    incoming.on('data', chunk => { body += chunk; });
    incoming.on('end', () => response.end(`site:${incoming.method} ${incoming.url} ${body}`));
  });
  const echo = tcpServer(socket => socket.on('data', chunk => socket.write(`echo:${chunk}`)));
  return { hits, httpPort: await listen(t, http), echoPort: await listen(t, echo) };
}

/** Opens a tunnel to the site's echo for a gateway's CONNECT. */
function toEcho(site, socket, head = Buffer.alloc(0)) {
  const out = connect({ host: '127.0.0.1', port: site.echoPort }, () => {
    socket.write('HTTP/1.1 200 Connection established\r\n\r\n');
    if (head.length) out.write(head);
    out.pipe(socket);
    socket.pipe(out);
  });
  out.on('error', () => socket.destroy());
  socket.on('error', () => out.destroy());
}

/** A fake proxy route: it records each request's login, refuses with `refuse()`, such as 407, else reaches the site. */
async function fakeGateway(t, site, { refuse = () => null } = {}) {
  const seen = [];
  const gateway = httpServer((incoming, response) => {
    seen.push({ kind: 'http', url: incoming.url, auth: incoming.headers['proxy-authorization'] });
    if (refuse()) return response.writeHead(refuse()).end();
    let body = '';
    incoming.on('data', chunk => { body += chunk; });
    incoming.on('end', () => response.end(`gateway:${incoming.method} ${new URL(incoming.url).pathname} ${body}`));
  });
  gateway.on('connect', (incoming, socket, head) => {
    seen.push({ kind: 'connect', url: incoming.url, auth: incoming.headers['proxy-authorization'] });
    if (refuse()) return socket.end(`HTTP/1.1 ${refuse()} Refused\r\nContent-Length: 0\r\n\r\n`);
    toEcho(site, socket, head);
  });
  return { seen, port: await listen(t, gateway) };
}
const refusing = status => ({ refuse: () => status });

/** A tunnel through the forwarder to `target`: the CONNECT reply's first line, then what `ping` echoes back. */
function tunnel(port, target, ping = 'ping') {
  return new Promise((resolve, reject) => {
    const socket = connect({ host: '127.0.0.1', port }, () => socket.write(`CONNECT ${target} HTTP/1.1\r\nHost: ${target}\r\n\r\n`));
    let text = '';
    let sent = false;
    socket.on('data', chunk => {
      text += chunk;
      if (!sent && text.includes('\r\n\r\n')) {
        sent = true;
        if (!text.startsWith('HTTP/1.1 200')) { socket.destroy(); return resolve({ status: text.split('\r\n')[0], echo: null }); }
        socket.write(ping);
      }
      if (sent && text.includes(`echo:${ping}`)) { socket.destroy(); resolve({ status: text.split('\r\n')[0], echo: `echo:${ping}` }); }
    });
    socket.on('error', reject);
    socket.on('close', () => resolve({ status: text.split('\r\n')[0], echo: null }));
  });
}

/** A plain HTTP request through the forwarder, as a browser sends it to a proxy. */
function viaProxy(port, url, { method = 'GET', body } = {}) {
  return new Promise((resolve, reject) => {
    const socket = connect({ host: '127.0.0.1', port }, () => {
      const length = body ? `Content-Length: ${Buffer.byteLength(body)}\r\n` : '';
      socket.write(`${method} ${url} HTTP/1.1\r\nHost: ${new URL(url).host}\r\nConnection: close\r\n${length}\r\n${body ?? ''}`);
    });
    let text = '';
    socket.on('data', chunk => { text += chunk; });
    socket.on('error', reject);
    socket.on('close', () => resolve({ status: Number(text.split(' ')[1]), body: text.split('\r\n\r\n').slice(1).join('\r\n\r\n') }));
  });
}

/** A network.json path in a temporary folder. */
function stateFile(t) {
  const dir = mkdtempSync(join(tmpdir(), 'forwarder-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return join(dir, 'network.json');
}
/** The network state without its pid, which must be this process's: the forwarder runs in the test. */
const read = file => {
  const { pid, ...state } = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(pid, process.pid);
  return state;
};

test('a tunnel and a plain request go through the upstream with its login, and the state names no address or login', async t => {
  const site = await fakeSite(t);
  const gw = await fakeGateway(t, site);
  const file = stateFile(t);
  const p = await proxy(t, { upstream: upstreamAt(gw.port), networkFile: file });
  const opened = await tunnel(p.port, `${SITE_HOST}:443`);
  assert.match(opened.status, /^HTTP\/1\.1 200/);
  assert.equal(opened.echo, 'echo:ping');
  const page = await viaProxy(p.port, `http://${SITE_HOST}/hello?x=1`, { method: 'POST', body: 'form=1' });
  assert.equal(page.status, 200);
  assert.equal(page.body, 'gateway:POST /hello form=1');
  assert.deepEqual(gw.seen.map(({ kind, url, auth }) => [kind, url, auth]), [['connect', `${SITE_HOST}:443`, AUTH], ['http', `http://${SITE_HOST}/hello?x=1`, AUTH]]);
  assert.deepEqual(read(file), { network: 'upstream' });
  assert.equal(statSync(file).mode & 0o777, 0o600);
  const text = readFileSync(file, 'utf8');
  for (const secret of [LOGIN, PASSWORD, '127.0.0.1', SITE_HOST, String(gw.port)]) assert.ok(!text.includes(secret), `network.json names ${secret}`);
});

test('a 407 from the upstream moves the same request to the site directly and records why', async t => {
  const site = await fakeSite(t);
  const gw = await fakeGateway(t, site, refusing(407));
  const file = stateFile(t);
  const p = await proxy(t, { upstream: upstreamAt(gw.port), networkFile: file, local: remote });
  assert.equal((await viaProxy(p.port, `http://127.0.0.1:${site.httpPort}/x`, { method: 'POST', body: 'a=1' })).body, 'site:POST /x a=1');
  assert.equal((await tunnel(p.port, `127.0.0.1:${site.echoPort}`)).echo, 'echo:ping');
  assert.equal(gw.seen.length, 2);
  assert.deepEqual(read(file), { network: 'direct', reason: 'unreachable' });
});

test('first proxy on: it carries tunnels and plain requests with no login, and the upstream gets nothing', async t => {
  const site = await fakeSite(t);
  const home = await fakeGateway(t, site);
  const backup = await fakeGateway(t, site);
  const file = stateFile(t);
  const p = await proxy(t, { ...bothAt(home.port, backup.port), networkFile: file });
  assert.equal((await tunnel(p.port, `${SITE_HOST}:443`)).echo, 'echo:ping');
  assert.equal((await viaProxy(p.port, `http://${SITE_HOST}/home`)).body, 'gateway:GET /home ');
  assert.deepEqual(home.seen.map(({ kind, auth }) => [kind, auth]), [['connect', undefined], ['http', undefined]]);
  assert.equal(backup.seen.length, 0);
  assert.deepEqual(read(file), { network: 'upstream' });
});

test('first proxy down: the same tunnel goes through the backup, the first waits its skip time, then is tried again', async t => {
  const site = await fakeSite(t);
  let down = true;
  const home = await fakeGateway(t, site, { refuse: () => (down ? 502 : null) });
  const backup = await fakeGateway(t, site);
  const file = stateFile(t);
  const p = await proxy(t, { ...bothAt(home.port, backup.port), networkFile: file, downMs: 400 });
  assert.equal((await tunnel(p.port, `${SITE_HOST}:443`)).echo, 'echo:ping');
  assert.deepEqual(read(file), { network: 'upstream', route: 'backup' });
  assert.deepEqual(backup.seen.map(({ kind, auth }) => [kind, auth]), [['connect', AUTH]]);
  // Within the skip, connections start at the backup: the first proxy sees no second try, plain requests included.
  assert.equal((await tunnel(p.port, `${SITE_HOST}:443`)).echo, 'echo:ping');
  assert.equal((await viaProxy(p.port, `http://${SITE_HOST}/skip`)).body, 'gateway:GET /skip ');
  assert.equal(home.seen.length, 1);
  assert.equal(backup.seen.length, 3);
  down = false;
  await wait(500);
  assert.equal((await tunnel(p.port, `${SITE_HOST}:443`)).echo, 'echo:ping');
  assert.equal(home.seen.length, 2);
  assert.equal(backup.seen.length, 3);
  assert.deepEqual(read(file), { network: 'upstream' });
});

test('a first proxy that never answers moves the tunnel to the backup', async t => {
  const site = await fakeSite(t);
  const silent = await listen(t, tcpServer(socket => socket.on('data', () => {})));
  const backup = await fakeGateway(t, site);
  const file = stateFile(t);
  const p = await proxy(t, { ...bothAt(silent, backup.port), networkFile: file, connectMs: 300 });
  assert.equal((await tunnel(p.port, `${SITE_HOST}:443`)).echo, 'echo:ping');
  assert.deepEqual(read(file), { network: 'upstream', route: 'backup' });
});

test('a site the first proxy can not reach starts the skip only when the backup then opens the same tunnel', async t => {
  const site = await fakeSite(t);
  const home = await fakeGateway(t, site, refusing(500));
  let refuse = true;
  const backup = await fakeGateway(t, site, { refuse: () => (refuse ? 502 : null) });
  const file = stateFile(t);
  const p = await proxy(t, { ...bothAt(home.port, backup.port), networkFile: file, local: remote });
  // The backup fails too: the site is down, not the first proxy, so the next connection tries the first proxy again.
  assert.equal((await tunnel(p.port, `127.0.0.1:${site.echoPort}`)).echo, 'echo:ping');
  assert.deepEqual(read(file), { network: 'direct', reason: 'unreachable' });
  assert.equal((await tunnel(p.port, `127.0.0.1:${site.echoPort}`)).echo, 'echo:ping');
  assert.deepEqual([home.seen.length, backup.seen.length], [2, 2]);
  refuse = false;
  assert.equal((await tunnel(p.port, `127.0.0.1:${site.echoPort}`)).echo, 'echo:ping');
  assert.deepEqual(read(file), { network: 'upstream', route: 'backup' });
  assert.equal((await tunnel(p.port, `127.0.0.1:${site.echoPort}`)).echo, 'echo:ping');
  assert.deepEqual([home.seen.length, backup.seen.length], [3, 4]);
});

test('both routes down: the tunnel goes direct, and the state says every route failed', async t => {
  const site = await fakeSite(t);
  const home = await fakeGateway(t, site, refusing(502));
  const backup = await fakeGateway(t, site, refusing(407));
  const file = stateFile(t);
  const p = await proxy(t, { ...bothAt(home.port, backup.port), networkFile: file, local: remote });
  assert.equal((await tunnel(p.port, `127.0.0.1:${site.echoPort}`)).echo, 'echo:ping');
  assert.deepEqual(read(file), { network: 'direct', reason: 'unreachable' });
  assert.deepEqual([home.seen.length, backup.seen.length], [1, 1]);
});

test('a plain request a first proxy took gets its error page once; one it never reached goes to the backup', async t => {
  const site = await fakeSite(t);
  const home = await fakeGateway(t, site, refusing(502));
  const backup = await fakeGateway(t, site);
  const file = stateFile(t);
  const took = await proxy(t, { ...bothAt(home.port, backup.port), networkFile: file });
  assert.equal((await viaProxy(took.port, `http://${SITE_HOST}/pay`, { method: 'POST', body: 'once=1' })).status, 502);
  assert.equal(home.seen.length, 1);
  assert.equal(backup.seen.length, 0, 'the request went to the backup as well');
  await took.close();
  const refused = await proxy(t, { ...bothAt(await closedPort(t), backup.port), networkFile: file });
  assert.equal((await viaProxy(refused.port, `http://${SITE_HOST}/a`, { method: 'POST', body: 'b=1' })).body, 'gateway:POST /a b=1');
  assert.deepEqual(read(file), { network: 'upstream', route: 'backup' });
  assert.deepEqual(backup.seen.map(({ kind, auth }) => [kind, auth]), [['http', AUTH]]);
});

test('a plain request goes direct after a route never opened, but is never sent twice once a route took it', async t => {
  const site = await fakeSite(t);
  const file = stateFile(t);
  const refused = await proxy(t, { upstream: upstreamAt(await closedPort(t)), networkFile: file, local: remote });
  assert.equal((await viaProxy(refused.port, `http://127.0.0.1:${site.httpPort}/c`, { method: 'POST', body: 'b=1' })).body, 'site:POST /c b=1');
  assert.deepEqual(read(file), { network: 'direct', reason: 'unreachable' });
  await refused.close();
  site.hits.length = 0;
  // A route that reads the request, then drops it or never answers: the site may already have it.
  const received = [];
  const dropping = tcpServer(socket => socket.once('data', chunk => { received.push(String(chunk)); socket.destroy(); }));
  const silent = tcpServer(socket => socket.once('data', chunk => received.push(String(chunk))));
  for (const gateway of [dropping, silent]) {
    const p = await proxy(t, { upstream: upstreamAt(await listen(t, gateway)), networkFile: file, connectMs: 500, local: remote });
    assert.equal((await viaProxy(p.port, `http://127.0.0.1:${site.httpPort}/pay`, { method: 'POST', body: 'once=1' })).status, 502);
    await p.close();
  }
  assert.equal(received.length, 2);
  for (const text of received) assert.match(text, /^POST http:\/\/127\.0\.0\.1:\d+\/pay /);
  assert.deepEqual(site.hits, [], 'the request reached the site directly as well');
});

test('local hosts always go direct, and with no route every connection is direct', async t => {
  const site = await fakeSite(t);
  const gw = await fakeGateway(t, site);
  const p = await proxy(t, { upstream: upstreamAt(gw.port), networkFile: stateFile(t) });
  assert.equal((await tunnel(p.port, `127.0.0.1:${site.echoPort}`)).echo, 'echo:ping');
  assert.equal((await viaProxy(p.port, `http://localhost:${site.httpPort}/b`)).body, 'site:GET /b ');
  assert.equal(gw.seen.length, 0);
  for (const host of ['localhost', 'app.localhost', '127.0.0.1', '10.1.2.3', '192.168.0.4', '172.20.0.1', '169.254.1.1', '100.100.1.1', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) assert.ok(isLocal(host), host);
  for (const host of ['example.com', '203.0.113.8', '172.32.0.1', '2606:4700::1111']) assert.ok(!isLocal(host), host);
  const file = stateFile(t);
  const none = await proxy(t, { networkFile: file, local: remote });
  assert.equal((await tunnel(none.port, `127.0.0.1:${site.echoPort}`)).echo, 'echo:ping');
  assert.equal((await viaProxy(none.port, `http://127.0.0.1:${site.httpPort}/a`)).body, 'site:GET /a ');
  assert.deepEqual(read(file), { network: 'direct', reason: 'no-upstream' });
});

test('a tunnel cancelled while a route still dials writes no unreachable state', async t => {
  const file = stateFile(t);
  let dialed;
  const dialing = new Promise(resolve => { dialed = resolve; });
  const silent = await listen(t, tcpServer(socket => socket.once('data', () => dialed())));
  const p = await startForwarder({ upstream: upstreamAt(silent), networkFile: file, connectMs: 5000 });
  const client = connect({ host: '127.0.0.1', port: p.port }, () => client.write(`CONNECT ${SITE_HOST}:443 HTTP/1.1\r\nHost: ${SITE_HOST}:443\r\n\r\n`));
  client.on('error', () => {});
  await dialing;
  await p.close();
  await wait(200);
  assert.ok(!existsSync(file), 'the cancelled dial wrote a network state');
});

test('closing the forwarder deletes its network state, but not a state another start wrote', async t => {
  const file = stateFile(t);
  const p = await startForwarder({ networkFile: file });
  assert.deepEqual(read(file), { network: 'direct', reason: 'no-upstream' });
  await p.close();
  assert.ok(!existsSync(file));
  const other = await startForwarder({ networkFile: file });
  writeFileSync(file, JSON.stringify({ network: 'upstream', pid: process.pid + 1 }));
  await other.close();
  assert.ok(existsSync(file));
});

test('the status line names each route, and a state from another process or none reads as no upstream', () => {
  assert.equal(networkLine({ network: 'upstream', pid: 7 }, 7), 'upstream');
  assert.equal(networkLine({ network: 'upstream', route: 'backup', pid: 7 }, 7), 'upstream (backup)');
  assert.equal(networkLine({ network: 'direct', reason: 'no-upstream', pid: 7 }, 7), 'direct (no upstream proxy)');
  assert.equal(networkLine({ network: 'direct', reason: 'unreachable', pid: 7 }, 7), 'direct (upstream unreachable)');
  assert.equal(networkLine({ network: 'upstream', pid: 6 }, 7), 'direct (no upstream proxy)');
  assert.equal(networkLine({ network: 'upstream' }, 7), 'direct (no upstream proxy)');
  assert.equal(networkLine(null, 7), 'direct (no upstream proxy)');
  assert.equal(networkLine({ network: 'upstream', pid: 7 }, null), 'unknown (browser stopped)');
});
