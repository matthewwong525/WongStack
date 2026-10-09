import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer as httpServer, request } from 'node:http';
import { connect, createServer as tcpServer, Server } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { startForwarder } from '../../.agents/skills/browser/scripts/forwarder.mjs';

async function listen(t, server) {
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => new Promise(done => { server.close(done); server.closeAllConnections?.(); }));
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
  for (const path of ['/relative', 'https://example.com/', 'ftp://example.com/', 'http://user:secret@example.com/', 'http://example.com/#private', 'http://example.com:0/', 'http://example.com:99999/', 'http://bad\\host/']) {
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
  t.mock.method(Server.prototype, 'listen', function (...args) { binding = args.slice(0, 2); return original.apply(this, args); });
  const p = await proxy(t);
  assert.deepEqual(binding, [0, '127.0.0.1']);
  await p.close();
  t.mock.method(Server.prototype, 'listen', function () { this.emit('error', new Error('sensitive machine detail')); return this; });
  await assert.rejects(startForwarder(), { message: 'proxy startup failed' });
  t.mock.method(Server.prototype, 'listen', function () { return this; });
  await assert.rejects(startForwarder({ startMs: 10 }), { message: 'proxy startup failed' });
});

test('launcher closes its proxy when Camofox import fails, with no direct fallback or error detail', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-proxy-launch-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const portFile = join(dir, 'port');
  const module = join(dir, 'broken.mjs');
  writeFileSync(module, `import {writeFileSync} from 'node:fs'; writeFileSync(${JSON.stringify(portFile)}, process.env.PROXY_PORT); throw new Error('private import failure');`);
  const launcher = fileURLToPath(new URL('../../.agents/skills/browser/scripts/server.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [launcher, module], { encoding: 'utf8', timeout: 5000 });
  assert.equal(result.status, 1);
  assert.equal(result.stdout + result.stderr, '');
  await assert.rejects(raw(Number(readFileSync(portFile, 'utf8')), 'GET / HTTP/1.1\r\n\r\n'), { code: 'ECONNREFUSED' });
});
