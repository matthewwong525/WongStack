// Memory store client: repo context, config, credentials, local state, the D1 and R2 calls, and the spool.
// A memory key's calls go to the app's production Worker (components.memory.worker); any other token's go to
// the Cloudflare REST API. The requests are the same.
import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, hostname } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCRIPT = 'node .claude/skills/memory/scripts/memory.mjs';
const TOKEN_VAR = 'CLOUDFLARE_MEMORY_TOKEN';
const TOKEN_PAGE = 'wiki/development/memory.md#the-memory-token';
const SPOOLABLE = new Set(['unconfigured', 'auth', 'network', 'server']);
const CLOUDFLARE_API = 'https://api.cloudflare.com/client/v4';
export const KEY_PREFIX = 'wongm_';

// The email a memory key was made for (wongm_<base64url(email)>.<random>), or null for any other token.
export function keyEmail(token) {
  if (!token?.startsWith(KEY_PREFIX)) return null;
  const email = Buffer.from(token.slice(KEY_PREFIX.length).split('.')[0], 'base64url').toString('utf8');
  return email.includes('@') ? email.toLowerCase() : null;
}

// kind: unconfigured | auth | network | server | query. `reason` is the short form for one-line reports.
export class StoreError extends Error {
  constructor(reason, { kind = 'query', help } = {}) {
    super(help ? `${reason}. See ${help}.` : reason);
    this.kind = kind;
    this.reason = reason;
  }
  get spoolable() { return SPOOLABLE.has(this.kind); }
}

export const isMain = url => Boolean(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(url);

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const tryGit = (cwd, ...args) => { try { return git(cwd, ...args); } catch { return ''; } };

export function repoContext(cwd = process.cwd()) {
  const [root, commonDir] = git(cwd, 'rev-parse', '--show-toplevel', '--path-format=absolute', '--git-common-dir').split('\n');
  let author;
  return {
    root,
    commonDir,
    primaryRoot: dirname(commonDir),
    branch: tryGit(cwd, 'rev-parse', '--abbrev-ref', 'HEAD'),
    get author() { author ??= tryGit(cwd, 'config', 'user.email'); return author; },
    machine: hostname(),
    stateDir: process.env.WONG_MEMORY_STATE_DIR || join(commonDir, 'wong-memory'),
  };
}

// The machine record names the person's home repo: ~/.wong-stack/machine.json, {"home": "<absolute path>"}.
export const machineFile = () => process.env.WONG_MACHINE_FILE || join(homedir(), '.wong-stack', 'machine.json');

// Home's context, or null. A missing or unreadable record, or a path with no memory store, means no home.
// `isCurrent` marks the case where this repo is home; home's own state folder never follows WONG_MEMORY_STATE_DIR.
export function homeContext(ctx) {
  const path = readJson(machineFile(), null)?.home;
  if (typeof path !== 'string' || !isAbsolute(path) || !existsSync(path)) return null;
  let home;
  try { home = repoContext(path); loadConfig(home); } catch { return null; }
  if (ctx && home.commonDir === ctx.commonDir) return Object.assign(Object.create(ctx), { isHome: true, isCurrent: true });
  return Object.assign(home, { stateDir: join(home.commonDir, 'wong-memory'), isHome: true, isCurrent: false });
}

// Every checkout of this clone: the primary one plus each linked worktree that still exists.
export function checkouts(ctx) {
  const dir = join(ctx.commonDir, 'worktrees');
  const linked = existsSync(dir) ? readdirSync(dir).map(name => {
    try { return dirname(readFileSync(join(dir, name, 'gitdir'), 'utf8').trim()); } catch { return null; }
  }) : [];
  return [ctx.primaryRoot, ...linked].filter(path => path && existsSync(path));
}

// The reference .env parser: quotes, `export`, and CRLF. verify-staging.sh reads values through it.
export function parseEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const value = match[2];
    env[match[1]] = /^(['"]).*\1$/.test(value) ? value.slice(1, -1) : value.replace(/\s+#.*$/, '');
  }
  return env;
}

// The primary worktree's .env wins; a linked worktree's own copy fills gaps (secrets convention).
export function loadEnv(ctx) {
  const env = {};
  for (const file of [join(ctx.root, '.env'), join(ctx.primaryRoot, '.env')]) {
    if (existsSync(file)) Object.assign(env, parseEnv(readFileSync(file, 'utf8')));
  }
  return env;
}

export const configFile = ctx => join(ctx.root, '.claude', '.wong-stack.json');

export function loadConfig(ctx) {
  const file = configFile(ctx);
  const memory = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).components?.memory : null;
  if (!memory?.accountId || !memory?.databaseId) throw new StoreError('no memory store is recorded in .claude/.wong-stack.json; run /wong-sync to plan it', { kind: 'unconfigured' });
  return { accountId: memory.accountId, databaseId: memory.databaseId, bucket: memory.bucket || null, worker: memory.worker || null, team: memory.team === true };
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

// `admin` opens the store straight through the Cloudflare API with the provisioning token, for
// migrations (a Worker's D1 binding runs one statement at a time, and a migration file holds many)
// and for memory keys (the Worker refuses the keys table to every key).
export function openStore(ctx, { timeoutMs = 15000, admin = false } = {}) {
  const config = loadConfig(ctx);
  const env = loadEnv(ctx);
  // Another repo's store (home) uses its own .env token first, never this process's.
  const token = admin ? adminToken(ctx) : ctx.isHome && !ctx.isCurrent ? env[TOKEN_VAR] || process.env[TOKEN_VAR] : process.env[TOKEN_VAR] || env[TOKEN_VAR];
  if (!token) throw new StoreError(`${TOKEN_VAR} is not set in .env`, { kind: 'unconfigured', help: TOKEN_PAGE });
  if (!admin && keyEmail(token) && !config.worker && !process.env.WONG_MEMORY_API) {
    throw new StoreError(`${TOKEN_VAR} holds a memory key, but .claude/.wong-stack.json records no components.memory.worker; pull the latest main or ask the admin`, { kind: 'unconfigured', help: TOKEN_PAGE });
  }
  const viaWorker = !admin && Boolean(keyEmail(token));
  const api = admin ? cloudflareApi() : (process.env.WONG_MEMORY_API || (viaWorker ? config.worker : cloudflareApi())).replace(/\/$/, '');
  const base = `${api}/accounts/${config.accountId}`;
  const objectPath = key => `/r2/buckets/${config.bucket}/objects/${encodeURI(key)}`;

  async function call(path, init = {}, budget = timeoutMs) {
    let response;
    try {
      response = await fetch(`${base}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers }, signal: AbortSignal.timeout(budget) });
    } catch (error) {
      throw new StoreError(`memory store unreachable (${error.name === 'TimeoutError' ? 'timeout' : 'network'})`, { kind: 'network' });
    }
    if (response.status === 403) {
      const code = (await response.clone().json().catch(() => ({}))).errors?.[0]?.code;
      if (code === 'not_author') throw new StoreError('only the author and the admin can read this transcript', { kind: 'forbidden' });
    }
    if (response.status === 401 || response.status === 403) throw new StoreError(`the memory store rejected ${admin ? ADMIN_TOKEN_VAR : TOKEN_VAR} (HTTP ${response.status})`, { kind: 'auth', help: TOKEN_PAGE });
    if (response.status >= 500) throw new StoreError(`memory store error (HTTP ${response.status})`, { kind: 'server' });
    // Only a transcript GET may 404 on its own; any other 404 from the Worker means production has not deployed the route.
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

  // Transcripts are filed under this email: the memory key's, or the git email for a direct token.
  const email = keyEmail(token) || (ctx.author || '').toLowerCase() || 'unknown';
  return { config, env, email, batch, query: async (sql, params) => (await batch([[sql, params]]))[0], putObject, getObject };
}

// ---------- local state, shared by every worktree of one clone ----------

export function statePath(ctx, ...parts) {
  const path = join(ctx.stateDir, ...parts);
  mkdirSync(dirname(path), { recursive: true });
  return path;
}

export const readJson = (path, fallback) => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; } };
// Write a temp file, then rename it: a concurrent reader sees the old file or the new one, never a torn one.
export function writeJson(path, value) {
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`);
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
