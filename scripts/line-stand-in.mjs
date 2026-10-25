#!/usr/bin/env node
// A stand-in computer for trying a line change on this computer: it joins the local app's live line and prints
// what it hears. It takes this computer's address only, so it never reaches a live app. wiki/stack/live-line.md
import { randomBytes } from 'node:crypto';
import { isMain, parseCli, usageError } from './lib-cli.mjs';

const USAGE = `usage: node scripts/line-stand-in.mjs [<app address>]
  Joins the local app's live line as a computer and prints each message it hears, with the time since it joined.
  Ctrl-C closes it. <app address> defaults to http://localhost:5173; only localhost, 127.0.0.1 or [::1] is taken.`;
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/** The line's WebSocket address on the local app at `address`, or null for any address but this computer's. */
export function lineAddress(address, computer) {
  let url;
  try { url = new URL(address); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol) || !LOOPBACK.has(url.hostname)) return null;
  const line = new URL(`/apps/inbox/api/line?computer=${computer}`, url.origin);
  line.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return line.href;
}

/** Opens the line, sending no Origin as a computer doesn't, and prints each message; resolves when it closes. */
export function standIn(href, { open = url => new WebSocket(url), print = console.log, now = Date.now } = {}) {
  const since = now();
  const at = () => `+${((now() - since) / 1000).toFixed(2)}s`;
  const socket = open(href);
  return new Promise(resolve => {
    socket.addEventListener('open', () => print(`${at()} joined ${href}`));
    socket.addEventListener('message', event => print(`${at()} ${event.data}`));
    socket.addEventListener('close', event => { print(`${at()} closed ${event.code}${event.reason ? ` ${event.reason}` : ''}`); resolve(event.code); });
    process.once('SIGINT', () => socket.close(1000));
  });
}

if (isMain(import.meta.url)) {
  const { positionals } = parseCli({ usage: USAGE, allowPositionals: true });
  if (positionals.length > 1) usageError(USAGE, 'takes one address at most');
  const href = lineAddress(positionals[0] ?? 'http://localhost:5173', randomBytes(16).toString('hex'));
  if (!href) usageError(USAGE, 'Refused: the stand-in joins only this computer\'s app (localhost, 127.0.0.1 or [::1]).');
  const code = await standIn(href);
  process.exit(code === 1000 ? 0 : 1);
}
