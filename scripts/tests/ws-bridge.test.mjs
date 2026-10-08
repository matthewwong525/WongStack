import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { acceptFor, frame, SCREEN_PATH, screenBridge, takeFrames } from '../../.agents/skills/hand-over/scripts/lib/ws-bridge.mjs';
import { clientFrame, upgrade, WS_ACCEPT, WS_KEY } from './fixtures/fake-view-tools.mjs';

const KEY = 'ab'.repeat(32);
const OP = { more: 0, text: 1, binary: 2, close: 8, ping: 9, pong: 10 };
const pause = ms => new Promise(done => setTimeout(done, ms));

// A pretend screen source on a Unix socket, which sends back whatever it is sent, and a page server
// whose upgrades go to the bridge. `open` is whether the link is still open; `source: false` leaves
// the socket out, as a screen source that exited does.
async function fixture(t, { source = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-ws-bridge-'));
  const socketPath = join(dir, 'screen.sock');
  const state = { open: true, connections: 0, ended: 0, received: [] };
  const screen = createServer(socket => {
    state.connections++;
    socket.on('error', () => {});
    socket.on('close', () => { state.ended++; });
    socket.on('data', chunk => { state.received.push(chunk); socket.write(chunk); });
  });
  if (source) await new Promise(done => screen.listen(socketPath, done));
  const bridge = screenBridge({ key: KEY, socketPath, isOpen: () => state.open });
  const page = createHttpServer((request, response) => response.writeHead(404).end()).on('upgrade', bridge);
  await new Promise(done => page.listen(0, '127.0.0.1', done));
  t.after(() => {
    bridge.close();
    page.close();
    screen.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const { port } = page.address();
  return { port, bridge, state, received: () => Buffer.concat(state.received), connect: (options = { protocol: KEY }, path = SCREEN_PATH) => upgrade(port, path, options) };
}

test('the handshake answers the key\'s accept value and echoes the link\'s key as the subprotocol', async t => {
  assert.equal(acceptFor(WS_KEY), WS_ACCEPT, 'RFC 6455\'s own sample');
  const f = await fixture(t);
  const ws = await f.connect();
  assert.equal(ws.status, 101);
  assert.deepEqual([ws.headers.upgrade, ws.headers.connection, ws.headers['sec-websocket-accept'], ws.headers['sec-websocket-protocol']], ['websocket', 'Upgrade', WS_ACCEPT, KEY]);
  const among = await f.connect({ protocol: `chat, ${KEY}` });
  assert.equal(among.status, 101, 'the key among other subprotocols');
  assert.equal(f.state.connections, 2);
});

test('a missing key, a wrong key, and a wrong path do not upgrade, and reach no screen', async t => {
  const f = await fixture(t);
  assert.equal((await f.connect({})).status, 401, 'no key');
  assert.equal((await f.connect({ protocol: `${KEY.slice(0, -1)}c` })).status, 401, 'a wrong key');
  assert.equal((await f.connect({ protocol: KEY }, '/stream')).status, 404, 'a wrong path');
  assert.equal((await f.connect({ protocol: KEY }, `${SCREEN_PATH}/more`)).status, 404);
  assert.equal((await f.connect({}, `${SCREEN_PATH}?key=${KEY}`)).status, 401, 'the key is not taken from the address');
  assert.equal((await f.connect({ protocol: KEY, as: 'h2c' })).status, 400, 'an upgrade to something else');
  const refused = await f.connect({});
  assert.equal(await refused.closed, true, 'a refused connection is closed');
  f.state.open = false;
  assert.equal((await f.connect()).status, 410, 'a link that is ending');
  assert.equal((await f.connect({})).status, 401, 'which still tells a stranger nothing');
  assert.equal(f.state.connections, 0);
});

test('a screen source that is not there answers 503', async t => {
  const f = await fixture(t, { source: false });
  const ws = await f.connect();
  assert.equal(ws.status, 503);
  assert.equal(await ws.closed, true);
});

test('masked frames at each of the three length sizes reach the screen in order, and its bytes come back as unmasked binary frames', async t => {
  const f = await fixture(t);
  const ws = await f.connect();
  const sent = [randomBytes(5), randomBytes(300), randomBytes(70_000)];
  for (const payload of sent) ws.send(OP.binary, payload);
  const whole = Buffer.concat(sent);
  const back = await ws.bytes(whole.length);
  assert.ok(back.equals(whole), 'what came back is what was sent');
  assert.ok(f.received().equals(whole), 'the screen got the bytes with their masks removed');
  ws.send(OP.binary, Buffer.from('one more'));
  const reply = await ws.next();
  assert.deepEqual([reply.opcode, reply.fin, reply.masked, reply.payload.toString()], [OP.binary, true, false, 'one more']);
});

test('a message in fragments arrives whole, with a ping between them answered by a pong', async t => {
  const f = await fixture(t);
  const ws = await f.connect();
  ws.send(OP.binary, Buffer.from('AB'), { fin: false });
  ws.send(OP.ping, Buffer.from('still there?'));
  ws.send(OP.more, Buffer.from('CD'), { fin: false });
  ws.send(OP.more, Buffer.from('EF'));
  ws.send(OP.pong, Buffer.from('unasked'));
  ws.send(OP.text, Buffer.from('G'));
  const seen = [];
  while (Buffer.concat(seen.filter(reply => reply.opcode === OP.binary).map(reply => reply.payload)).length < 7) seen.push(await ws.next());
  assert.equal(f.received().toString(), 'ABCDEFG');
  const pongs = seen.filter(reply => reply.opcode === OP.pong);
  assert.deepEqual(pongs.map(reply => [reply.masked, reply.payload.toString()]), [[false, 'still there?']], 'one pong, for the ping; a pong itself gets no answer');
});

test('frames split across packets, or sent with the handshake, are put back together', async t => {
  const f = await fixture(t);
  const ws = await f.connect();
  const bytes = Buffer.concat([clientFrame(OP.binary, Buffer.from('split ')), clientFrame(OP.binary, Buffer.from('in three'))]);
  for (const part of [bytes.subarray(0, 1), bytes.subarray(1, 9), bytes.subarray(9)]) {
    ws.raw(part);
    await pause(20);
  }
  assert.equal((await ws.bytes(14)).toString(), 'split in three');
  const eager = await f.connect({ protocol: KEY, early: clientFrame(OP.binary, Buffer.from('early')) });
  assert.equal((await eager.bytes(5)).toString(), 'early');
});

test('a close is answered with a close and ends both sides', async t => {
  const f = await fixture(t);
  const ws = await f.connect();
  ws.send(OP.binary, Buffer.from('x'));
  await ws.bytes(1);
  ws.send(OP.close, Buffer.from([0x03, 0xe8]));
  const reply = await ws.next();
  assert.deepEqual([reply.opcode, reply.masked, [...reply.payload]], [OP.close, false, [0x03, 0xe8]]);
  assert.equal(await ws.closed, true);
  await pause(50);
  assert.equal(f.state.ended, 1, 'the screen\'s side ended too');
});

test('a frame no browser sends ends the connection: unmasked, or over the size limit', async t => {
  const f = await fixture(t);
  const unmasked = await f.connect();
  unmasked.send(OP.binary, Buffer.from('plain'), { masked: false });
  assert.equal(await unmasked.closed, true);
  const huge = await f.connect();
  const head = Buffer.alloc(10);
  head[0] = 0x80 | OP.binary;
  head[1] = 0x80 | 127;
  head.writeBigUInt64BE(BigInt(8 * 1024 * 1024), 2);
  huge.raw(head);
  assert.equal(await huge.closed, true);
  assert.deepEqual(f.received(), Buffer.alloc(0), 'neither reached the screen');
});

test('the screen ending ends the page\'s side, and close() ends every connection', async t => {
  const f = await fixture(t);
  const [first, second] = [await f.connect(), await f.connect()];
  first.send(OP.binary, Buffer.from('a'));
  second.send(OP.binary, Buffer.from('b'));
  await Promise.all([first.bytes(1), second.bytes(1)]);
  f.bridge.close();
  assert.deepEqual(await Promise.all([first.closed, second.closed]), [true, true]);
  await pause(50);
  assert.equal(f.state.ended, 2);
});

test('megabytes each way arrive whole, each side waiting when the other is slow', async t => {
  const f = await fixture(t);
  const ws = await f.connect();
  const parts = Array.from({ length: 6 }, () => randomBytes(512 * 1024));
  for (const part of parts) ws.send(OP.binary, part);
  const whole = Buffer.concat(parts);
  assert.ok((await ws.bytes(whole.length)).equals(whole));
});

test('a real WebSocket client connects with the key as its subprotocol', { skip: typeof WebSocket === 'undefined' && 'this Node has no WebSocket client' }, async t => {
  const f = await fixture(t);
  const socket = new WebSocket(`ws://127.0.0.1:${f.port}${SCREEN_PATH}`, [KEY]);
  socket.binaryType = 'arraybuffer';
  t.after(() => socket.close());
  await new Promise((done, failed) => { socket.onopen = done; socket.onerror = () => failed(new Error('the client refused the handshake')); });
  assert.equal(socket.protocol, KEY);
  const echoed = new Promise(done => { socket.onmessage = event => done(Buffer.from(event.data)); });
  socket.send(Buffer.from('hello screen'));
  assert.equal((await echoed).toString(), 'hello screen');
  const keyless = new WebSocket(`ws://127.0.0.1:${f.port}${SCREEN_PATH}`);
  assert.equal(await new Promise(done => { keyless.onopen = () => done('opened'); keyless.onerror = () => done('refused'); }), 'refused');
});

test('frame and takeFrames follow the three length sizes', () => {
  assert.deepEqual([...frame(OP.binary, Buffer.alloc(5)).subarray(0, 2)], [0x82, 5]);
  assert.deepEqual([...frame(OP.pong).subarray(0, 2)], [0x8a, 0]);
  assert.deepEqual([...frame(OP.binary, Buffer.alloc(125)).subarray(0, 2)], [0x82, 125]);
  assert.deepEqual([...frame(OP.binary, Buffer.alloc(300)).subarray(0, 4)], [0x82, 126, 0x01, 0x2c]);
  assert.deepEqual([...frame(OP.binary, Buffer.alloc(65_535)).subarray(0, 4)], [0x82, 126, 0xff, 0xff]);
  assert.deepEqual([...frame(OP.binary, Buffer.alloc(70_000)).subarray(0, 10)], [0x82, 127, 0, 0, 0, 0, 0, 0x01, 0x11, 0x70]);
  assert.equal(frame(OP.binary, Buffer.alloc(70_000)).length, 70_010);

  const sizes = [0, 125, 126, 65_535, 65_536];
  const payloads = sizes.map(size => randomBytes(size));
  const bytes = Buffer.concat(payloads.map(payload => clientFrame(OP.binary, payload)));
  const { frames, rest } = takeFrames(bytes);
  assert.equal(rest.length, 0);
  assert.deepEqual(frames.map(taken => taken.opcode), sizes.map(() => OP.binary));
  frames.forEach((taken, index) => assert.ok(taken.payload.equals(payloads[index]), `${sizes[index]} bytes`));

  for (const cut of [1, 2, 3, 5, 7]) {
    const part = takeFrames(clientFrame(OP.binary, randomBytes(300)).subarray(0, cut));
    assert.deepEqual([part.frames.length, part.rest.length], [0, cut], `a frame cut at ${cut} bytes waits for the rest`);
  }
  assert.equal(takeFrames(clientFrame(OP.binary, Buffer.from('x'), { masked: false })), null);
  assert.equal(takeFrames(Buffer.concat([clientFrame(OP.binary, Buffer.from('ok')), clientFrame(OP.binary, Buffer.alloc(1024 * 1024 + 1))])), null, 'one frame over the limit refuses the lot');
  assert.equal(takeFrames(clientFrame(OP.binary, Buffer.alloc(1024 * 1024))).frames.length, 1, 'the limit itself passes');
});
