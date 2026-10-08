// The keyed screen connection a live view's page opens (see hand-over.mjs `open --view`): a WebSocket
// answered here, in Node built-ins, and piped to the screen source's Unix socket.
//
// `screenBridge({key, socketPath, isOpen})` gives the handler for an HTTP server's `upgrade` event. A
// browser's WebSocket can send no header of its own, so the link's key travels as the WebSocket
// subprotocol, compared with `keyMatches`, and is echoed back, as a browser requires. Nothing upgrades
// without it: another path answers 404, a handshake that is no WebSocket's 400, a missing or wrong key
// 401, a link that is ending 410, and a screen source that is not there 503.
//
// Once upgraded, each data frame the page sends, whole or in fragments, at any of the three length
// sizes, is unmasked and written to the socket in order; what the socket sends goes back as unmasked
// binary frames. A ping is answered with a pong, a pong is dropped, and a close is answered and ends
// both sides. A frame no browser sends, unmasked or over 1 MB, ends both sides at once. Each side waits
// when the other is slow. `close()` on the handler ends every connection. Nothing here logs.

import { createHash } from 'node:crypto';
import { connect } from 'node:net';
import { keyMatches } from './tunnel.mjs';

export const SCREEN_PATH = '/screen';
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MOST = 1024 * 1024;
const OP = { binary: 2, close: 8, ping: 9, pong: 10 };

/** The `Sec-WebSocket-Accept` value that answers a handshake's `Sec-WebSocket-Key`. */
export function acceptFor(key) {
  return createHash('sha1').update(key + GUID).digest('base64');
}

/** One whole, unmasked frame, as a server sends it. */
export function frame(opcode, payload = Buffer.alloc(0)) {
  const size = payload.length;
  const wide = size < 126 ? 0 : size < 65536 ? 2 : 8;
  const head = Buffer.alloc(2 + wide);
  head[0] = 0x80 | opcode;
  head[1] = wide === 0 ? size : wide === 2 ? 126 : 127;
  if (wide === 2) head.writeUInt16BE(size, 2);
  if (wide === 8) head.writeBigUInt64BE(BigInt(size), 2);
  return Buffer.concat([head, payload]);
}

/**
 * Takes the complete frames off the front of `buffer`. Resolves to `{frames, rest}`, each frame
 * `{opcode, payload}` with its mask removed, or to null for a frame no browser sends: unmasked, or
 * over the size limit.
 */
export function takeFrames(buffer) {
  const frames = [];
  let at = 0;
  while (buffer.length - at >= 2) {
    const short = buffer[at + 1] & 0x7f;
    const wide = short === 126 ? 2 : short === 127 ? 8 : 0;
    if (buffer.length - at < 2 + wide) break;
    const size = wide === 2 ? buffer.readUInt16BE(at + 2) : wide === 8 ? Number(buffer.readBigUInt64BE(at + 2)) : short;
    if (!(buffer[at + 1] & 0x80) || size > MOST) return null;
    const start = at + 2 + wide + 4;
    if (buffer.length < start + size) break;
    const payload = Buffer.from(buffer.subarray(start, start + size));
    for (let i = 0; i < size; i++) payload[i] ^= buffer[start - 4 + (i & 3)];
    frames.push({ opcode: buffer[at] & 0x0f, payload });
    at = start + size;
  }
  return { frames, rest: buffer.subarray(at) };
}

/** Why a request does not upgrade, as an HTTP status line, or null when it may. */
function refusal(request, key, isOpen) {
  if (new URL(request.url, 'http://page').pathname !== SCREEN_PATH) return '404 Not Found';
  if (request.method !== 'GET' || !/^websocket$/i.test(request.headers.upgrade ?? '') || !request.headers['sec-websocket-key']) return '400 Bad Request';
  const offered = String(request.headers['sec-websocket-protocol'] ?? '').split(',').map(name => name.trim());
  if (!offered.some(given => keyMatches(given, key))) return '401 Unauthorized';
  return isOpen() ? null : '410 Gone';
}

/** Pauses `from` while `to` is slow to take what was just written to it. */
function pace(taken, from, to) {
  if (taken) return;
  from.pause();
  to.once('drain', () => from.resume());
}

/**
 * The `upgrade` handler that bridges the page's WebSocket at `/screen` to the Unix socket at
 * `socketPath`, for the link whose key is `key`, while `isOpen()` holds. Its `close()` ends every
 * connection it holds.
 */
export function screenBridge({ key, socketPath, isOpen = () => true }) {
  const open = new Set();
  const refuse = (socket, status) => socket.end(`HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);

  /** Carries frames one way and bytes the other until either side ends. */
  function carry(socket, screen, head, drop) {
    let rest = Buffer.alloc(0);
    const take = chunk => {
      const parsed = takeFrames(Buffer.concat([rest, chunk]));
      if (!parsed) return drop();
      rest = parsed.rest;
      for (const { opcode, payload } of parsed.frames) {
        if (opcode === OP.close) return socket.end(frame(OP.close, payload.subarray(0, 2)), drop);
        if (opcode === OP.ping) socket.write(frame(OP.pong, payload));
        else if (opcode <= OP.binary) pace(screen.write(payload), socket, screen);
      }
    };
    socket.on('data', take);
    screen.on('data', chunk => pace(socket.write(frame(OP.binary, chunk)), screen, socket));
    screen.on('error', drop).on('close', drop);
    take(head);
  }

  const bridge = (request, socket, head = Buffer.alloc(0)) => {
    socket.on('error', () => {});
    const status = refusal(request, key, isOpen);
    if (status) return refuse(socket, status);
    const screen = connect(socketPath);
    const drop = () => { open.delete(drop); screen.destroy(); socket.destroy(); };
    const absent = () => refuse(socket, '503 Service Unavailable');
    open.add(drop);
    socket.on('close', drop);
    screen.once('error', absent);
    screen.once('connect', () => {
      screen.off('error', absent);
      socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${acceptFor(request.headers['sec-websocket-key'])}\r\nSec-WebSocket-Protocol: ${key}\r\n\r\n`);
      carry(socket, screen, head, drop);
    });
  };
  bridge.close = () => { for (const drop of open) drop(); };
  return bridge;
}
