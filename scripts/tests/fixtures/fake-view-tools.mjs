// Stand-ins for what a live view runs, shared by the view and private-link tests, plus a WebSocket
// client that builds its own frames.
//
// `fakeViewTools(root, control)` writes four commands into `<root>/view-tools/`, each logging its
// arguments as a JSON line to `calls.jsonl` there, and returns the `env` that names them, as view.mjs's
// test-only variables do. `control` is a folder of files a test sets, the fake camofox's own:
//
//   x11vnc    serves the socket `-unixsock` names: it greets each connection with `RFB 003.008\n`,
//             appends what it is sent to `screen-input`, and writes its pid to `x11vnc.pid` first.
//             `x11vnc-fails` makes it exit 1 at once; `x11vnc-listens` makes it open a TCP port first.
//   xdotool   answers for a 1280x720 screen holding one window per tab in `tabs.json`, the fake
//             camofox's list, each as wide as its page and 57 taller, found only by
//             `search --classname Navigator`. `xdotool-fails` makes every call exit 1.
//   apt-get   creates each file `apt-creates.json` lists, as the real one puts tools on PATH;
//             `apt-fails` makes it exit 1.
//   sudo      runs what follows `-n`; `sudo-asks` makes it exit 1, as one that wants a password does.
//
// `fakeViewer(home, version)` lays out an installed viewer, with files a link must never serve beside
// the ones it may. `upgrade` and `clientFrame` are the WebSocket client.

import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { connect } from 'node:net';
import { dirname, join } from 'node:path';

export const SCREEN = [1280, 720];
export const BAR = 57;
export const GREETING = 'RFB 003.008\n';
// RFC 6455's sample handshake: this key is answered with ACCEPT.
export const WS_KEY = 'dGhlIHNhbXBsZSBub25jZQ==';
export const WS_ACCEPT = 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=';

const TOOLS = {
  x11vnc: `const net = require('node:net');
if (has('x11vnc-fails')) process.exit(1);
fs.writeFileSync(file('x11vnc.pid'), String(process.pid));
const serve = () => net.createServer(socket => {
  socket.on('error', () => {});
  socket.write(${JSON.stringify(GREETING)});
  socket.on('data', chunk => fs.appendFileSync(file('screen-input'), chunk));
}).listen(args[args.indexOf('-unixsock') + 1]);
if (has('x11vnc-listens')) net.createServer().listen(0, '127.0.0.1', serve);
else serve();`,
  xdotool: `if (has('xdotool-fails')) process.exit(1);
const tabs = has('tabs.json') ? JSON.parse(fs.readFileSync(file('tabs.json'), 'utf8')) : [];
const [command] = args;
if (command === 'getdisplaygeometry') console.log(${JSON.stringify(SCREEN.join(' '))});
else if (command === 'search') {
  if (args[1] !== '--classname' || args[2] !== 'Navigator' || !tabs.length) process.exit(1);
  tabs.forEach((tab, index) => console.log(100 + index));
} else if (command === 'getwindowgeometry') {
  const [width, height] = tabs[Number(args.at(-1)) - 100].size;
  console.log(['WINDOW=' + args.at(-1), 'X=0', 'Y=0', 'WIDTH=' + width, 'HEIGHT=' + (height + ${BAR}), 'SCREEN=0'].join('\\n'));
} else if (command !== 'windowraise') process.exit(1);`,
  'apt-get': `if (has('apt-fails')) process.exit(1);
for (const made of has('apt-creates.json') ? JSON.parse(fs.readFileSync(file('apt-creates.json'), 'utf8')) : []) fs.writeFileSync(made, '#!/bin/sh\\n', { mode: 0o755 });`,
  sudo: `if (has('sudo-asks')) process.exit(1);
const [command, ...rest] = args.slice(1);
if (command !== 'true') process.exit(require('node:child_process').spawnSync(command, rest, { stdio: 'inherit' }).status);`,
};

export function fakeViewTools(root, control) {
  const dir = join(root, 'view-tools');
  mkdirSync(dir, { recursive: true });
  mkdirSync(control, { recursive: true });
  const log = join(dir, 'calls.jsonl');
  for (const [name, body] of Object.entries(TOOLS)) {
    writeFileSync(join(dir, name), `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const file = name => path.join(${JSON.stringify(control)}, name);
const has = name => fs.existsSync(file(name));
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify([${JSON.stringify(name)}, process.env.DISPLAY ?? null, ...args]) + '\\n');
${body}
`);
    chmodSync(join(dir, name), 0o755);
  }
  const variable = name => `HANDOVER_${name.toUpperCase().replace('-', '_')}_BIN`;
  return {
    dir,
    /** The environment that names each fake; `missing` names the tools to point at no file. */
    env: (...missing) => Object.fromEntries(Object.keys(TOOLS).map(name => [variable(name), join(dir, missing.includes(name) ? `no-${name}` : name)])),
    /** Each call of `tool` so far, as its arguments; `display` instead gives each call's DISPLAY. */
    calls(tool, { display = false } = {}) {
      const lines = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
      return lines.filter(([name]) => name === tool).map(([, shown, ...args]) => (display ? shown : args));
    },
    /** What the screen source was sent so far. */
    input: () => (existsSync(join(control, 'screen-input')) ? readFileSync(join(control, 'screen-input')) : Buffer.alloc(0)),
    sourcePid: () => Number(existsSync(join(control, 'x11vnc.pid')) && readFileSync(join(control, 'x11vnc.pid'), 'utf8')),
  };
}

/** An installed viewer under `home`: scripts a link may serve, and files beside them it must not. */
export function fakeViewer(home, version) {
  const dir = join(home, '.wong-stack', 'live-view', `novnc-${version}`);
  const files = {
    'core/rfb.js': 'export default class RFB {}\n',
    'core/util/int.js': 'export const int = 1;\n',
    'vendor/pako/lib/zlib/inflate.js': 'export const inflate = 1;\n',
    'core/notes.txt': 'not a script\n',
    'LICENSE.txt': 'licence\n',
    'app/ui.js': 'export const panel = 1;\n',
    'package.js': 'export const outside = 1;\n',
  };
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), text);
  }
  return dir;
}

// ---------------------------------------------------------------------------
// A WebSocket client that builds its own frames

/** One client frame: masked unless told otherwise, and whole unless `fin` is false. */
export function clientFrame(opcode, payload = Buffer.alloc(0), { fin = true, masked = true } = {}) {
  const size = payload.length;
  const wide = size < 126 ? 0 : size < 65536 ? 2 : 8;
  const head = Buffer.alloc(2 + wide);
  head[0] = (fin ? 0x80 : 0) | opcode;
  head[1] = (masked ? 0x80 : 0) | (wide === 0 ? size : wide === 2 ? 126 : 127);
  if (wide === 2) head.writeUInt16BE(size, 2);
  if (wide === 8) head.writeBigUInt64BE(BigInt(size), 2);
  if (!masked) return Buffer.concat([head, payload]);
  const mask = randomBytes(4);
  return Buffer.concat([head, mask, Buffer.from(payload).map((byte, index) => byte ^ mask[index & 3])]);
}

/**
 * Asks 127.0.0.1:`port` to upgrade `path`, offering the subprotocol `protocol` when given, as an
 * upgrade to `as`, with the bytes `early` in the same packet as the request. Resolves once the reply's
 * head arrives, to its `status` and `headers` with: `send(opcode, payload, options)`,
 * a frame built by `clientFrame`; `raw(bytes)`; `next()`, the next frame received, as `{opcode, fin,
 * masked, payload}`; `bytes(count)`, that many bytes of binary frames; `closed`, which resolves when
 * the connection ends; and `end()`.
 */
export function upgrade(port, path, { protocol, as = 'websocket', early = Buffer.alloc(0) } = {}) {
  return new Promise((resolve, reject) => {
    const socket = connect(port, '127.0.0.1');
    let buffer = Buffer.alloc(0);
    let answered = false;
    const frames = [];
    const waiting = [];
    const closed = new Promise(done => socket.on('close', () => done(true)));
    const next = () => (frames.length ? Promise.resolve(frames.shift()) : new Promise(done => waiting.push(done)));
    const bytes = async count => {
      const parts = [];
      for (let got = 0; got < count;) {
        const frame = await next();
        if (frame.opcode !== 2) continue;
        parts.push(frame.payload);
        got += frame.payload.length;
      }
      return Buffer.concat(parts);
    };
    const takeFrames = () => {
      while (buffer.length >= 2) {
        const short = buffer[1] & 0x7f;
        const wide = short === 126 ? 2 : short === 127 ? 8 : 0;
        if (buffer.length < 2 + wide) return;
        const size = wide === 2 ? buffer.readUInt16BE(2) : wide === 8 ? Number(buffer.readBigUInt64BE(2)) : short;
        if (buffer.length < 2 + wide + size) return;
        const frame = { opcode: buffer[0] & 0x0f, fin: Boolean(buffer[0] & 0x80), masked: Boolean(buffer[1] & 0x80), payload: Buffer.from(buffer.subarray(2 + wide, 2 + wide + size)) };
        buffer = buffer.subarray(2 + wide + size);
        if (waiting.length) waiting.shift()(frame);
        else frames.push(frame);
      }
    };
    const takeHead = () => {
      const end = buffer.indexOf('\r\n\r\n');
      if (end < 0) return;
      const [line, ...rest] = buffer.subarray(0, end).toString().split('\r\n');
      buffer = buffer.subarray(end + 4);
      answered = true;
      resolve({
        status: Number(line.split(' ')[1]),
        headers: Object.fromEntries(rest.map(header => [header.slice(0, header.indexOf(':')).toLowerCase(), header.slice(header.indexOf(':') + 1).trim()])),
        send: (...frame) => socket.write(clientFrame(...frame)),
        raw: data => socket.write(data),
        next,
        bytes,
        closed,
        end: () => socket.destroy(),
      });
    };
    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      if (!answered) takeHead();
      if (answered) takeFrames();
    });
    socket.on('error', reject);
    const request = `GET ${path} HTTP/1.1\r\nHost: x\r\nUpgrade: ${as}\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${WS_KEY}\r\nSec-WebSocket-Version: 13\r\n${protocol ? `Sec-WebSocket-Protocol: ${protocol}\r\n` : ''}\r\n`;
    socket.on('connect', () => socket.write(Buffer.concat([Buffer.from(request), early])));
  });
}
