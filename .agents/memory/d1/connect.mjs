// How this computer reaches WongStack's memory store: the app's memory route, as a schedule's sign-in, the
// person's company sign-in, or an old admin key. The profile's `connect`. wiki/development/memory.md#sign-in-and-expiry
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { httpStore, StoreError } from '../../skills/memory/store/interface.mjs';
import { MACHINE_ID } from '../../skills/memory/scripts/lib/machine-id.mjs';
import { loadEnv, readJson } from '../../skills/memory/scripts/lib/store.mjs';
import { headers as personHeaders, signIn, signInHelp, tokenClaims, WARN_DAYS } from '../../skills/access/signin/computer.mjs';

const TOKEN_VAR = 'CLOUDFLARE_MEMORY_TOKEN';
export const TOKEN_PAGE = 'wiki/development/memory.md#sign-in-and-expiry';

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

// The person's sign-in is the Access module's: `cloudflared`'s saved token, read without logging in.
export { signIn, signInHelp, tokenClaims, WARN_DAYS };

export const memoryOrigin = config => { try { return new URL(config.worker).origin; } catch { return null; } };

// How a call proves who it is: a schedule's own sign-in, the person's company sign-in, or an old admin key.
export function memoryAccess(ctx, config, env = loadEnv(ctx)) {
  const id = process.env.WONG_MEMORY_CLIENT_ID, secret = process.env.WONG_MEMORY_CLIENT_SECRET;
  if (id && secret) return { 'CF-Access-Client-Id': id, 'CF-Access-Client-Secret': secret };
  const origin = memoryOrigin(config);
  const person = origin ? signIn(origin) : { state: 'missing' };
  const signedIn = origin && personHeaders(origin, () => person);
  if (signedIn) return signedIn;
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
