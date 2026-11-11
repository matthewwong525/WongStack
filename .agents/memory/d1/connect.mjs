// How this computer reaches WongStack's memory store: the app's memory route, as a schedule's sign-in, the
// person's company sign-in, or an old admin key. The profile's `connect`. wiki/development/memory.md#sign-in-and-expiry
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { httpStore, StoreError } from '../../skills/memory/store/interface.mjs';
import { MACHINE_ID } from '../../skills/memory/scripts/lib/machine-id.mjs';
import { loadEnv, readJson } from '../../skills/memory/scripts/lib/store.mjs';

const TOKEN_VAR = 'CLOUDFLARE_MEMORY_TOKEN';
export const TOKEN_PAGE = 'wiki/development/memory.md#sign-in-and-expiry';
const DAY_MS = 86400000;
// Each new chat warns this long before the company sign-in ends.
export const WARN_DAYS = 5;

export const configFile = ctx => join(ctx.root, '.claude', '.wong-stack.json');

// In a linked worktree, only the primary checkout's address counts; the branch's is never a fallback.
export function loadConfig(ctx) {
  const file = configFile(ctx);
  const memory = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).components?.memory : null;
  if (!memory?.accountId || !memory?.databaseId) throw new StoreError('no memory store is recorded in .claude/.wong-stack.json; run /wong-sync to plan it', { kind: 'unconfigured' });
  const linked = Boolean(ctx.primaryRoot) && ctx.primaryRoot !== ctx.root;
  const worker = (linked ? readJson(configFile({ root: ctx.primaryRoot }), null)?.components?.memory?.worker : memory.worker) || null;
  const branchWorker = linked && memory.worker && memory.worker !== worker ? memory.worker : null;
  return { accountId: memory.accountId, databaseId: memory.databaseId, bucket: memory.bucket || null, worker, branchWorker };
}

// The payload is metadata; the Worker trusts only the credential's hashed grant.
export function keyMachine(token) {
  const match = token?.match(/^wongm_([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{43})$/);
  if (!match) return null;
  const payload = Buffer.from(match[1], 'base64url').toString('utf8');
  return payload.startsWith('machine:') && MACHINE_ID.test(payload.slice(8)) ? payload.slice(8) : null;
}

// The JWT's claims, read without verifying it: only for display and to name the owner the Worker checks.
export function tokenClaims(token) {
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')); } catch { return null; }
}

// The company sign-in `cloudflared` saved for the app. It never logs in, so it never waits on a person.
// Its installer puts it in ~/.local/bin, which a hook's PATH may lack.
const signIns = new Map();
export function signIn(origin, now = Date.now()) {
  if (!signIns.has(origin)) {
    let token = null;
    try {
      const out = execFileSync('cloudflared', ['access', 'token', `-app=${origin}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000,
        env: { ...process.env, PATH: `${process.env.PATH || ''}:${join(homedir(), '.local', 'bin')}` } });
      token = out.match(/eyJ[\w-]+\.[\w-]+\.[\w-]+/)?.[0] || null;
    } catch { /* none saved, or cloudflared is not installed */ }
    signIns.set(origin, token);
  }
  const token = signIns.get(origin), claims = token && tokenClaims(token);
  if (!claims?.sub || typeof claims.exp !== 'number') return { state: 'missing', origin };
  const days = Math.ceil((claims.exp * 1000 - now) / DAY_MS);
  const state = claims.exp * 1000 <= now ? 'expired' : days <= WARN_DAYS ? 'near' : 'valid';
  return { state, origin, days, token, subject: claims.sub, email: claims.email || null };
}

// What the assistant runs to show the person the sign-in link: a login waits on them, so memory never runs it.
export const signInHelp = origin => `to sign in, run \`cloudflared access login ${origin}\` and show the person the link it prints`;

export const memoryOrigin = config => { try { return new URL(config.worker).origin; } catch { return null; } };

// How a call proves who it is: a schedule's own sign-in, the person's company sign-in, or an old admin key.
export function memoryAccess(ctx, config, env = loadEnv(ctx)) {
  const id = process.env.WONG_MEMORY_CLIENT_ID, secret = process.env.WONG_MEMORY_CLIENT_SECRET;
  if (id && secret) return { 'CF-Access-Client-Id': id, 'CF-Access-Client-Secret': secret };
  const origin = memoryOrigin(config);
  const person = origin ? signIn(origin) : { state: 'missing' };
  if (['valid', 'near'].includes(person.state)) return { 'cf-access-token': person.token };
  const key = process.env[TOKEN_VAR] || env[TOKEN_VAR];
  if (keyMachine(key)) {
    if (keyMachine(key) !== ctx.machineId) throw new StoreError('the memory key in .env belongs to another computer', { kind: 'auth' });
    return { Authorization: `Bearer ${key}` };
  }
  const why = person.state === 'expired' ? 'your company sign-in has ended' : 'this computer is not signed in to the company app';
  throw new StoreError(origin ? `${why}; ${signInHelp(origin)}` : why, { kind: 'signin', help: TOKEN_PAGE });
}

// The profile's `connect`: the memory route of the primary checkout's app, signed in as this computer.
export async function connect(ctx, { timeoutMs, signal, onRequest } = {}) {
  const config = loadConfig(ctx);
  const url = process.env.WONG_MEMORY_API || config.worker;
  if (!url) throw new StoreError('.claude/.wong-stack.json records no components.memory.worker; pull the latest main or ask the admin', { kind: 'unconfigured', help: TOKEN_PAGE });
  const headers = memoryAccess(ctx, config);
  // What an extract task binds to: the person, so a renewed sign-in keeps it, else the credential itself.
  const identity = tokenClaims(headers['cf-access-token'] || '')?.sub || Object.values(headers).join(' ');
  return Object.assign(httpStore({ url, headers: () => headers, timeoutMs, signal, onRequest }), { identity });
}
