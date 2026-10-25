import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { lineAddress } from '../line-stand-in.mjs';

const script = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'line-stand-in.mjs');
const COMPUTER = 'a'.repeat(32);

test('the line address takes only this computer, and turns http into ws', () => {
  assert.equal(lineAddress('http://localhost:5173', COMPUTER), `ws://localhost:5173/apps/inbox/api/line?computer=${COMPUTER}`);
  assert.equal(lineAddress('http://127.0.0.1:8787/apps/inbox/', COMPUTER), `ws://127.0.0.1:8787/apps/inbox/api/line?computer=${COMPUTER}`);
  assert.equal(lineAddress('https://[::1]:5173', COMPUTER), `wss://[::1]:5173/apps/inbox/api/line?computer=${COMPUTER}`);
  for (const address of ['https://wongstack.example.com', 'http://localhost.example.com', 'http://127.0.0.2', 'http://10.0.0.1:5173',
    'ws://localhost:5173', 'file:///etc/passwd', 'localhost:5173', '']) {
    assert.equal(lineAddress(address, COMPUTER), null, address);
  }
});

test('a live address is refused before anything connects', () => {
  const result = spawnSync(process.execPath, [script, 'https://wongstack.example.com'], { encoding: 'utf8', timeout: 10_000 });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Refused: the stand-in joins only this computer's app/);
  assert.equal(result.stdout, '');
});

/** One text frame from the server: unmasked, under 126 bytes. */
const frame = text => Buffer.concat([Buffer.from([0x81, Buffer.byteLength(text)]), Buffer.from(text)]);

test('it joins as a computer with no Origin and prints each message it hears', async t => {
  const seen = [];
  const server = createServer();
  server.on('upgrade', (request, socket) => {
    seen.push({ url: request.url, origin: request.headers.origin });
    const accept = createHash('sha1').update(`${request.headers['sec-websocket-key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    socket.write(Buffer.concat([frame('{"t":"look"}'), frame('{"t":"bye"}')]));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());
  const child = spawn(process.execPath, [script, `http://127.0.0.1:${server.address().port}`], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => child.kill());
  let out = '';
  child.stdout.on('data', chunk => { out += chunk; });
  const deadline = Date.now() + 10_000;
  while (!out.includes('{"t":"bye"}') && Date.now() < deadline) await new Promise(r => setTimeout(r, 20));
  assert.match(out, /^\+\d+\.\d\ds joined ws:\/\/127\.0\.0\.1:\d+\/apps\/inbox\/api\/line\?computer=[0-9a-f]{32}$/m);
  assert.match(out, /^\+\d+\.\d\ds \{"t":"look"\}$/m);
  assert.match(out, /^\+\d+\.\d\ds \{"t":"bye"\}$/m);
  assert.equal(seen.length, 1);
  assert.match(seen[0].url, /^\/apps\/inbox\/api\/line\?computer=[0-9a-f]{32}$/);
  assert.equal(seen[0].origin, undefined);
});
