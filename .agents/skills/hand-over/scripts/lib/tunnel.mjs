// The Cloudflare quick tunnel a link opens through, shared by hand-over.mjs and reply-link.mjs: start
// one to a loopback port, ask its public address until it answers, and kill it. Each caller keeps its
// own log and config files, so neither touches the other's state.
//
// Node built-ins only. For tests: HANDOVER_PROBE_ORIGIN is the address asked before a link prints,
// `{port}` standing for the page's port.

import { spawn, spawnSync } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';
import { closeSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer as createTcpServer } from 'node:net';

const PROBE_TIMEOUT_MS = 5000;
const PROBE_EVERY_MS = 500;
const PROBE_ORIGIN = process.env.HANDOVER_PROBE_ORIGIN;
const sleep = ms => new Promise(done => setTimeout(done, ms));
const readText = file => { try { return readFileSync(file, 'utf8'); } catch { return ''; } };

/** The first quick-tunnel origin in cloudflared's log, or null. */
export function tunnelOrigin(log) {
  return /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(log)?.[0] ?? null;
}

/** True when `given` is the link's key, compared in constant time. */
export function keyMatches(given, key) {
  const a = Buffer.from(String(given ?? ''));
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function alive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; }
}

/** Signals a process group, or the lone process where groups don't exist. */
export function signal(pid, sig) {
  try { process.kill(-pid, sig); } catch { try { process.kill(pid, sig); } catch { /* already gone */ } }
}

export async function killTunnel(pid) {
  if (!pid) return;
  signal(pid, 'SIGTERM');
  for (let i = 0; i < 30 && alive(pid); i++) await sleep(100);
  if (alive(pid)) signal(pid, 'SIGKILL');
}

/** A loopback port free right now. */
export function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createTcpServer().once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

export function hasCloudflared() {
  return !spawnSync('cloudflared', ['--version'], { stdio: 'ignore' }).error;
}

/**
 * Starts the quick tunnel to `port` in its own process group, logging to `files.log` with the empty
 * config `files.config`, and waits until `deadline` for its registered origin.
 */
export async function startTunnel(port, deadline, files) {
  writeFileSync(files.config, '');
  const log = openSync(files.log, 'w');
  const child = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--config', files.config, '--url', `http://127.0.0.1:${port}`], { detached: true, stdio: ['ignore', log, log] });
  closeSync(log);
  child.unref();
  const pid = child.pid;
  while (Date.now() < deadline && alive(pid)) {
    const text = readText(files.log);
    const origin = tunnelOrigin(text);
    if (origin && /Registered tunnel connection/.test(text)) return { pid, origin };
    await sleep(200);
  }
  return { pid, origin: null };
}

/**
 * True once the link's public address serves the page, so a first tap never lands on Cloudflare's
 * error page; false at `deadline` or when the tunnel dies.
 */
export async function linkAnswers(origin, port, tunnelPid, deadline) {
  const address = `${PROBE_ORIGIN ? PROBE_ORIGIN.replace('{port}', port) : origin}/`;
  while (Date.now() < deadline && alive(tunnelPid)) {
    try {
      const response = await fetch(address, { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
      await response.body?.cancel().catch(() => {});
      if (response.ok) return true;
    } catch { /* not routed yet */ }
    await sleep(PROBE_EVERY_MS);
  }
  return false;
}
