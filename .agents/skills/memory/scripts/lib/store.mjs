// Memory store client: repo context, config, credentials, local state, the D1 and R2 calls, and the spool.
// A sign-in's calls go to the app's production Worker; the admin's API token goes to the Cloudflare REST API.
import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { dirname, join } from 'node:path';
import { ROLE_HEADER, TEAM_HEADER } from '../../worker/memory-worker.mjs';
import { machineId, MACHINE_ID } from './machine-id.mjs';
import { primaryRoot } from './primary-root.mjs';

export { isMain } from './cli.mjs';

export const SCRIPT = 'node .claude/skills/memory/scripts/memory.mjs';
const TOKEN_VAR = 'CLOUDFLARE_MEMORY_TOKEN';
const TOKEN_PAGE = 'wiki/development/memory.md#sign-in-and-expiry';
const SPOOLABLE = new Set(['unconfigured', 'auth', 'network', 'server', 'signin']);
const DAY_MS = 86400000;
// Each new chat warns this long before the company sign-in ends.
export const WARN_DAYS = 5;
const CLOUDFLARE_API = 'https://api.cloudflare.com/client/v4';

// The payload is metadata; the Worker trusts only the credential's hashed grant.
export function keyMachine(token) {
  const match = token?.match(/^wongm_([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{43})$/);
  if (!match) return null;
  const payload = Buffer.from(match[1], 'base64url').toString('utf8');
  return payload.startsWith('machine:') && MACHINE_ID.test(payload.slice(8)) ? payload.slice(8) : null;
}

// kind: unconfigured | signin | auth | network | server | query. `reason` is the short form for one-line reports.
export class StoreError extends Error {
  constructor(reason, { kind = 'query', help } = {}) {
    super(help ? `${reason}. See ${help}.` : reason);
    this.kind = kind;
    this.reason = reason;
  }
  get spoolable() { return SPOOLABLE.has(this.kind); }
  }

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const tryGit = (cwd, ...args) => { try { return git(cwd, ...args); } catch { return ''; } };

// primaryRoot is null when Git cannot confirm the primary worktree: reads fall back to this checkout; a write stops.
export function repoContext(cwd = process.cwd()) {
  const [root, commonDir] = git(cwd, 'rev-parse', '--show-toplevel', '--path-format=absolute', '--git-common-dir').split('\n');
  let author, owner, primary = null;
  try { primary = primaryRoot(cwd).primary; } catch { /* reported by the write that needs it */ }
  return {
    root,
    commonDir,
    primaryRoot: primary,
    branch: tryGit(cwd, 'rev-parse', '--abbrev-ref', 'HEAD'),
    get author() { author ??= tryGit(cwd, 'config', 'user.email'); return author; },
    machine: hostname(),
    get machineId() { owner ??= machineId(); return owner; },
    get stateDir() { return join(process.env.WONG_MEMORY_STATE_DIR || join(commonDir, 'wong-memory'), this.machineId); },
  };
}

// Every checkout of this clone: the primary one plus each linked worktree that still exists.
export function checkouts(ctx) {
  const dir = join(ctx.commonDir, 'worktrees');
  const linked = existsSync(dir) ? readdirSync(dir).map(name => {
    try { return dirname(readFileSync(join(dir, name, 'gitdir'), 'utf8').trim()); } catch { return null; }
  }) : [];
  return [ctx.primaryRoot, ...linked].filter(path => path && existsSync(path));
}

// The reference .env parser: quotes, `export`, comments, and CRLF. verify-staging.sh reads values through it.
// A quoted value keeps everything inside its quotes; a comment is cut only after it or from an unquoted value.
export function parseEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (!match) continue;
    const value = match[2].trim();
    const quoted = value.match(/^(['"])(.*)\1(?:\s+#.*)?$/);
    env[match[1]] = quoted ? quoted[2] : value.replace(/\s+#.*$/, '');
  }
  return env;
}

// The primary worktree's .env wins; a linked worktree's own copy fills gaps (secrets convention).
export function loadEnv(ctx) {
  const env = {};
  for (const file of [join(ctx.root, '.env'), ctx.primaryRoot && join(ctx.primaryRoot, '.env')]) {
    if (!file) continue;
    if (existsSync(file)) Object.assign(env, parseEnv(readFileSync(file, 'utf8')));
  }
  return env;
}

export const configFile = ctx => join(ctx.root, '.claude', '.wong-stack.json');

export function loadConfig(ctx) {
  const file = configFile(ctx);
  const memory = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).components?.memory : null;
  if (!memory?.accountId || !memory?.databaseId) throw new StoreError('no memory store is recorded in .claude/.wong-stack.json; run /wong-sync to plan it', { kind: 'unconfigured' });
  // A repo is a team when the install record says so, or when the memory Worker last said so (see openStore).
  const said = readJson(join(ctx.stateDir, 'team.json'), {});
  const team = memory.team === true || said.team === true;
  // In a linked worktree, only the primary checkout's address counts; the branch's is never a fallback.
  // With no confirmed primary, this checkout's record is the only one.
  const linked = Boolean(ctx.primaryRoot) && ctx.primaryRoot !== ctx.root;
  const worker = (linked ? readJson(configFile({ root: ctx.primaryRoot }), null)?.components?.memory?.worker : memory.worker) || null;
  const branchWorker = linked && memory.worker && memory.worker !== worker ? memory.worker : null;
  return { accountId: memory.accountId, databaseId: memory.databaseId, bucket: memory.bucket || null, worker, branchWorker, team, role: said.role || null };
}

// The admin's Cloudflare API: the provisioning token, straight to Cloudflare (the tests point it at a fake).
export const ADMIN_TOKEN_VAR = 'CLOUDFLARE_API_TOKEN';
export const cloudflareApi = () => (process.env.WONG_CLOUDFLARE_API || CLOUDFLARE_API).replace(/\/$/, '');

export function adminToken(ctx) {
  const env = loadEnv(ctx);
  const token = process.env[ADMIN_TOKEN_VAR] || env[ADMIN_TOKEN_VAR];
  if (!token) throw new StoreError(`${ADMIN_TOKEN_VAR} is not set in .env; only the admin can run this`, { kind: 'unconfigured', help: TOKEN_PAGE });
  return token;
}

// The JWT's claims, read without verifying it: only for display and to name the owner the Worker checks.
export function tokenClaims(token) {
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')); } catch { return null; }
}

// The company sign-in `cloudflared` saved for the app. It never logs in, so it never waits on a person.
const signIns = new Map();
export function signIn(origin, now = Date.now()) {
  if (!signIns.has(origin)) {
    let token = null;
    try {
      const out = execFileSync('cloudflared', ['access', 'token', `-app=${origin}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 });
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
function memoryAccess(ctx, config, env) {
  const id = process.env.WONG_MEMORY_CLIENT_ID, secret = process.env.WONG_MEMORY_CLIENT_SECRET;
  if (id && secret) return { headers: { 'CF-Access-Client-Id': id, 'CF-Access-Client-Secret': secret }, owner: null, email: null };
  const origin = memoryOrigin(config);
  const person = origin ? signIn(origin) : { state: 'missing' };
  if (['valid', 'near'].includes(person.state)) return { headers: { 'cf-access-token': person.token }, owner: person.subject, email: person.email };
  const key = process.env[TOKEN_VAR] || env[TOKEN_VAR];
  if (keyMachine(key)) {
    if (keyMachine(key) !== ctx.machineId) throw new StoreError('the memory key in .env belongs to another computer', { kind: 'auth' });
    return { headers: { Authorization: `Bearer ${key}` }, owner: null, email: null };
  }
  const why = person.state === 'expired' ? 'your company sign-in has ended' : 'this computer is not signed in to the company app';
  throw new StoreError(origin ? `${why}; ${signInHelp(origin)}` : why, { kind: 'signin', help: TOKEN_PAGE });
}

// `admin` goes straight to the Cloudflare API with the provisioning token: for migrations (a Worker's D1 binding
// runs one statement at a time) and for the sign-in tables the Worker refuses to every caller.
export function openStore(ctx, { timeoutMs = 15000, admin = false, signal, onRequest = () => {} } = {}) {
  const config = loadConfig(ctx);
  const env = loadEnv(ctx);
  if (!admin && !config.worker && !process.env.WONG_MEMORY_API) {
    throw new StoreError('.claude/.wong-stack.json records no components.memory.worker; pull the latest main or ask the admin', { kind: 'unconfigured', help: TOKEN_PAGE });
  }
  const access = admin ? { headers: { Authorization: `Bearer ${adminToken(ctx)}` }, owner: null, email: null } : memoryAccess(ctx, config, env);
  const viaWorker = !admin;
  const api = (admin ? cloudflareApi() : process.env.WONG_MEMORY_API || config.worker).replace(/\/$/, '');
  const base = `${api}/accounts/${config.accountId}`;
  const objectPath = key => `/r2/buckets/${config.bucket}/objects/${encodeURI(key)}`;
  // The caller's role, as the Worker last named it; a Cloudflare token reads the store whole, as the admin does.
  let role = viaWorker ? config.role : 'admin';

  async function call(path, init = {}, budget = timeoutMs) {
    let response;
    try {
      onRequest();
      response = await fetch(`${base}${path}`, { ...init, redirect: 'manual', headers: { ...access.headers, ...init.headers }, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(budget)]) : AbortSignal.timeout(budget) });
    } catch (error) {
      throw new StoreError(`memory store unreachable (${error.name === 'TimeoutError' ? 'timeout' : 'network'})`, { kind: 'network' });
    }
    if (response.status >= 300 && response.status < 400) throw new StoreError('memory transport refused a redirect', { kind: 'auth' });
    if (viaWorker) role = recordTeam(ctx, response.headers.get(TEAM_HEADER), response.headers.get(ROLE_HEADER)) || role;
    if (response.status === 403) {
      const code = (await response.clone().json().catch(() => ({}))).errors?.[0]?.code;
      if (code === 'not_author') throw new StoreError('only its owner and the admin can read this transcript', { kind: 'forbidden' });
      if (code === 'member_read') throw new StoreError(`the memory store refused this read: ${(await response.clone().json()).errors[0].message}`, { kind: 'forbidden' });
      // One session or statement refused (another person's, or private): the sign-in itself is fine.
      if (code === 'member_write') throw new StoreError(`the memory store refused this write: ${(await response.clone().json()).errors[0].message}`, { kind: 'forbidden' });
    }
    if (response.status === 401 || response.status === 403) {
      if (viaWorker) writeJson(statePath(ctx, 'authorization-refused.json'), { at: new Date().toISOString() });
      throw new StoreError(`the memory store refused ${admin ? ADMIN_TOKEN_VAR : 'this sign-in'} (HTTP ${response.status})`, { kind: 'auth', help: TOKEN_PAGE });
    }
    if (viaWorker && response.ok) rmSync(join(ctx.stateDir, 'authorization-refused.json'), { force: true });
    if (response.status >= 500) throw new StoreError(`memory store error (HTTP ${response.status})`, { kind: 'server' });
    // Only a transcript GET may 404 on its own; any other Worker 404 means production has not deployed the route.
    if (viaWorker && response.status === 404 && (await response.clone().json().catch(() => ({}))).errors?.[0]?.code !== 10007) {
      throw new StoreError('the memory Worker does not answer yet; it serves memory once production deploys the memory route', { kind: 'unconfigured' });
    }
    return response;
  }

  // Run statements in one D1 batch, in order; returns one array of rows per statement.
  async function batch(statements, budget) {
    const body = JSON.stringify({ batch: statements.map(([sql, params = []]) => ({ sql, params })) });
    const response = await call(`/d1/database/${config.databaseId}/query`, { method: 'POST', body, headers: { 'Content-Type': 'application/json' } }, budget);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new StoreError(`memory query failed: ${(data.errors || []).map(error => error.message).join('; ') || `HTTP ${response.status}`}`);
    return data.result.map(result => result.results || []);
  }

  async function putObject(key, body) {
    const response = await call(objectPath(key), { method: 'PUT', body, headers: { 'Content-Type': 'application/octet-stream' } });
    if (!response.ok) throw new StoreError(`transcript upload failed: HTTP ${response.status}`);
  }

  async function getObject(key) {
    const response = await call(objectPath(key));
    if (response.status === 404) return null;
    if (!response.ok) throw new StoreError(`transcript download failed: HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  const author = ctx.author || access.email || access.owner;
  return { config, env, owner: access.owner, email: access.email, author, get role() { return role; }, batch, query: async (sql, params) => (await batch([[sql, params]]))[0], putObject, getObject };
}

// The memory Worker says on every answer that personal privacy is enforced, and the caller's role; remember
// both for the next session's digest and search. An unchanged answer writes nothing. Returns the role.
const ROLES = new Set(['admin', 'member', 'reader', 'team']);
function recordTeam(ctx, header, roleHeader) {
  if (header !== '0' && header !== '1') return null;
  const file = join(ctx.stateDir, 'team.json');
  const said = { team: header === '1', ...(ROLES.has(roleHeader) ? { role: roleHeader } : {}) };
  const before = readJson(file, {});
  if (before.team === said.team && before.role === said.role) return said.role;
  try { writeJson(statePath(ctx, 'team.json'), said); } catch { /* best effort */ }
  return said.role;
}

// The background run's tally of what it stored, in the state folder while run.mjs holds its lock.
export const RUN_TALLY = 'run-tally.json';

export function statePath(ctx, ...parts) {
  const path = join(ctx.stateDir, ...parts);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  return path;
}

export const readJson = (path, fallback) => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; } };
// Write a temp file, then rename it: a concurrent reader sees the old file or the new one, never a torn one.
export function writeJson(path, value) {
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  renameSync(temp, path);
}

// The first `bytes` of a file, without reading the rest.
export function readHead(file, bytes) {
  const buffer = Buffer.alloc(bytes);
  const fd = openSync(file, 'r');
  try { return buffer.subarray(0, readSync(fd, buffer, 0, bytes, 0)).toString('utf8'); } finally { closeSync(fd); }
}

export const spoolWrite = (ctx, payload) => {
  const file = statePath(ctx, 'spool', `${Date.now()}-${process.pid}.json`);
  writeJson(file, payload);
  return file;
};

export function spoolList(ctx) {
  const dir = join(ctx.stateDir, 'spool');
  return existsSync(dir) ? readdirSync(dir).filter(name => name.endsWith('.json')).sort().map(name => join(dir, name)) : [];
}

export const spoolRemove = file => rmSync(file, { force: true });
