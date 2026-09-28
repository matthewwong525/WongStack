#!/usr/bin/env node
// Hands the agent's browser to the person through a private link that closes itself.
//
//     node .claude/skills/verify/scripts/hand-over.mjs open [--until <glob>] [--until-gone <selector>] [--local] [--minutes N]
//     node .claude/skills/verify/scripts/hand-over.mjs wait
//     node .claude/skills/verify/scripts/hand-over.mjs close
//
// `open` starts a Cloudflare quick tunnel first, because the dashboard must be told the tunnel's
// exact origin, then restarts `agent-browser dashboard` with that origin, prints
// `HANDOVER_LINK=<private url>`, spawns a detached watcher, and exits. `--local` skips the tunnel and
// prints the loopback dashboard. The watcher (`watch`, internal) polls every 2 seconds, reading only
// `agent-browser get url` (matched against `--until`: `**` any run, `*` no `/`) and
// `agent-browser get count <selector>` (0 meets `--until-gone`); both given means both must hold,
// neither means only `close` or the deadline ends it. On finish, deadline, `close`, or a signal it
// stops the dashboard, kills the tunnel, and writes `result.json` with no address in it.
// `wait` blocks for that result and prints `HANDOVER_RESULT=done|timeout|closed|error`.
//
// State lives in ~/.wong-stack/hand-over/; one link at a time. Exit codes: 0 ok · 1 failed or a
// link is already open · 2 usage · 3 `cloudflared` is missing (prints HANDOVER_NEEDS=cloudflared).
// Node built-ins only. HANDOVER_POLL_MS overrides the 2-second poll, for tests.

import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const USAGE = `usage: hand-over.mjs open [--until <glob>] [--until-gone <selector>] [--local] [--minutes N]
       hand-over.mjs wait | close
  open    start the private link, print HANDOVER_LINK=<url>, and watch for the finish
  wait    block until the link closes; print HANDOVER_RESULT=done|timeout|closed|error
  close   close an open link (the person said done)`;
const PORT = 4848;
const TUNNEL_WAIT_MS = 30_000;
const TOOL_TIMEOUT_MS = 15_000;
const POLL_MS = Number(process.env.HANDOVER_POLL_MS) || 2000;
const DIR = join(homedir(), '.wong-stack', 'hand-over');
const FILES = { pid: join(DIR, 'watcher.pid'), state: join(DIR, 'state.json'), result: join(DIR, 'result.json'), log: join(DIR, 'tunnel.log'), config: join(DIR, 'cloudflared.yml') };
const sleep = ms => new Promise(done => setTimeout(done, ms));

// ---------------------------------------------------------------------------
// Pure helpers

/** agent-browser's URL glob as a whole-string RegExp: `**` any run, `*` anything but `/`. */
export function globToRegExp(glob) {
  const body = glob.split('**').map(part => part.split('*').map(text => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*');
  return new RegExp(`^${body}$`);
}

/** The first quick-tunnel origin in cloudflared's log, or null. */
export function tunnelOrigin(log) {
  return /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(log)?.[0] ?? null;
}

/** The first tokenized `<origin>/…#…` URL in `dashboard start` output, or null. */
export function accessUrl(output, origin) {
  const escaped = origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${escaped}/\\S*#\\S+`).exec(output)?.[0] ?? null;
}

/** True when the finish is met: every named check holds, and at least one was named. */
export function finished({ until, untilGone }, { url, count }) {
  if (!until && !untilGone) return false;
  if (until && !(url != null && globToRegExp(until).test(url))) return false;
  if (untilGone && count !== 0) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Files and processes

const readJson = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };
const readText = file => { try { return readFileSync(file, 'utf8'); } catch { return ''; } };

function alive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; }
}

const watcherPid = () => Number(readText(FILES.pid).trim()) || null;

/** Runs agent-browser; returns trimmed stdout, or null when it fails. */
function browser(args) {
  try {
    return execFileSync('agent-browser', args, { encoding: 'utf8', timeout: TOOL_TIMEOUT_MS, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

/** Signals a process group, or the lone process where groups don't exist. */
function signal(pid, sig) {
  try { process.kill(-pid, sig); } catch { try { process.kill(pid, sig); } catch { /* already gone */ } }
}

async function killTunnel(pid) {
  if (!pid) return;
  signal(pid, 'SIGTERM');
  for (let i = 0; i < 30 && alive(pid); i++) await sleep(100);
  if (alive(pid)) signal(pid, 'SIGKILL');
}

/** Stops the dashboard and the tunnel, records the result, and clears the rest. */
async function teardown(result, tunnelPid) {
  browser(['dashboard', 'stop']);
  await killTunnel(tunnelPid);
  writeFileSync(FILES.result, `${JSON.stringify({ result })}\n`);
  for (const file of [FILES.state, FILES.log, FILES.config, FILES.pid]) rmSync(file, { force: true });
}

/** Tears down a hand-over whose watcher died without finishing. */
async function recoverStale(result) {
  await teardown(result, readJson(FILES.state)?.tunnelPid);
}

// ---------------------------------------------------------------------------
// Subcommands

function hasCloudflared() {
  return !spawnSync('cloudflared', ['--version'], { stdio: 'ignore' }).error;
}

/** Starts the quick tunnel in its own process group and waits for its registered origin. */
async function startTunnel() {
  writeFileSync(FILES.config, '');
  const log = openSync(FILES.log, 'w');
  const child = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--config', FILES.config, '--url', `http://127.0.0.1:${PORT}`], { detached: true, stdio: ['ignore', log, log] });
  closeSync(log);
  child.unref();
  const pid = child.pid;
  const deadline = Date.now() + TUNNEL_WAIT_MS;
  while (Date.now() < deadline && alive(pid)) {
    const text = readText(FILES.log);
    const origin = tunnelOrigin(text);
    if (origin && /Registered tunnel connection/.test(text)) return { pid, origin };
    await sleep(200);
  }
  return { pid, origin: null };
}

async function open(values) {
  mkdirSync(DIR, { recursive: true });
  if (alive(watcherPid())) {
    console.error('A hand-over link is already open. Run `hand-over.mjs close` first.');
    return 1;
  }
  if (existsSync(FILES.pid)) await recoverStale('error');
  if (!values.local && !hasCloudflared()) {
    console.log('HANDOVER_NEEDS=cloudflared');
    console.error('Cloudflare\'s tunnel tool, cloudflared, is not installed; ask the person, install it, and retry.');
    return 3;
  }
  rmSync(FILES.result, { force: true });
  const deadline = Date.now() + values.minutes * 60_000;
  let tunnelPid = null;
  let link = `http://localhost:${PORT}`;
  const fail = async message => {
    console.error(message);
    await teardown('error', tunnelPid);
    return 1;
  };
  browser(['dashboard', 'stop']);
  if (values.local) {
    if (browser(['dashboard', 'start', '--port', String(PORT)]) == null) return fail('agent-browser could not start the dashboard.');
  } else {
    const tunnel = await startTunnel();
    tunnelPid = tunnel.pid;
    if (!tunnel.origin) return fail('The Cloudflare tunnel did not come up within 30 seconds; try again in a minute.');
    const output = browser(['dashboard', 'start', '--port', String(PORT), '--allowed-origins', tunnel.origin]);
    link = output && accessUrl(output, tunnel.origin);
    if (!link) return fail('agent-browser printed no private dashboard link for the tunnel.');
  }
  writeFileSync(FILES.state, `${JSON.stringify({ tunnelPid, until: values.until ?? null, untilGone: values['until-gone'] ?? null, deadline })}\n`);
  const watcher = spawn(process.execPath, [fileURLToPath(import.meta.url), 'watch'], { detached: true, stdio: 'ignore' });
  writeFileSync(FILES.pid, `${watcher.pid}\n`);
  watcher.unref();
  console.log(`HANDOVER_LINK=${link}`);
  return 0;
}

/** Reads only the address and a count, never page content, until the finish or the deadline. */
async function watch() {
  const state = readJson(FILES.state);
  if (!state) return 1;
  let done = false;
  const finish = async result => {
    if (done) return;
    done = true;
    await teardown(result, state.tunnelPid);
    process.exit(0);
  };
  for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(sig, () => finish('closed'));
  while (!done) {
    if (Date.now() >= state.deadline) return finish('timeout');
    const seen = {};
    if (state.until) seen.url = browser(['get', 'url']);
    if (state.untilGone) seen.count = Number.parseInt(browser(['get', 'count', state.untilGone]) ?? '', 10);
    if (finished(state, seen)) return finish('done');
    await sleep(Math.min(POLL_MS, Math.max(0, state.deadline - Date.now())));
  }
}

/** Blocks until the watcher records a result; recovers a watcher that died without one. */
async function wait() {
  for (;;) {
    const result = readJson(FILES.result)?.result;
    if (result) {
      console.log(`HANDOVER_RESULT=${result}`);
      return 0;
    }
    if (!existsSync(FILES.pid)) {
      console.error('No hand-over link is open.');
      return 1;
    }
    if (!alive(watcherPid())) await recoverStale('error');
    await sleep(250);
  }
}

async function close() {
  const pid = watcherPid();
  if (!pid) {
    console.error('No hand-over link is open.');
    return 0;
  }
  if (alive(pid)) process.kill(pid, 'SIGTERM');
  else await recoverStale('closed');
  return wait();
}

// ---------------------------------------------------------------------------
// CLI

function usageError(message) {
  console.error(`${message}\n${USAGE}`);
  process.exit(2);
}

function parse(args) {
  let parsed;
  try {
    parsed = parseArgs({ args, allowPositionals: true, strict: true, options: { until: { type: 'string' }, 'until-gone': { type: 'string' }, local: { type: 'boolean' }, minutes: { type: 'string' }, help: { type: 'boolean' } } });
  } catch (error) {
    usageError(error.message);
  }
  if (parsed.values.help) {
    console.log(USAGE);
    process.exit(0);
  }
  const [command, ...rest] = parsed.positionals;
  if (!['open', 'watch', 'wait', 'close'].includes(command) || rest.length) usageError(command ? `unknown command: ${[command, ...rest].join(' ')}` : 'missing command');
  const minutes = Number(parsed.values.minutes ?? 10);
  if (!(minutes > 0)) usageError('--minutes must be a positive number');
  return { command, values: { ...parsed.values, minutes } };
}

const isMain = () => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } };
if (isMain()) {
  const { command, values } = parse(process.argv.slice(2));
  const run = { open: () => open(values), watch, wait, close }[command];
  process.exitCode = await run();
}
