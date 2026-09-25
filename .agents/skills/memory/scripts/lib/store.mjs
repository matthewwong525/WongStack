// Memory store client: repo context, config, credentials, local state, the D1 and R2 REST calls, and the spool.
import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCRIPT = 'node .claude/skills/memory/scripts/memory.mjs';
const TOKEN_VAR = 'CLOUDFLARE_MEMORY_TOKEN';
const TOKEN_PAGE = 'wiki/development/memory.md#the-memory-token';
const SPOOLABLE = new Set(['unconfigured', 'auth', 'network', 'server']);

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

// Every checkout of this clone: the primary one plus each linked worktree that still exists.
export function checkouts(ctx) {
  const dir = join(ctx.commonDir, 'worktrees');
  const linked = existsSync(dir) ? readdirSync(dir).map(name => {
    try { return dirname(readFileSync(join(dir, name, 'gitdir'), 'utf8').trim()); } catch { return null; }
  }) : [];
  return [ctx.primaryRoot, ...linked].filter(path => path && existsSync(path));
}

function parseEnv(text) {
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

function loadConfig(ctx) {
  const file = join(ctx.root, '.claude', '.wong-stack.json');
  const memory = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).components?.memory : null;
  if (!memory?.accountId || !memory?.databaseId) throw new StoreError('no memory store is recorded in .claude/.wong-stack.json; run /wong-sync to plan it', { kind: 'unconfigured' });
  return { accountId: memory.accountId, databaseId: memory.databaseId, bucket: memory.bucket || null };
}

export function openStore(ctx, { timeoutMs = 15000 } = {}) {
  const config = loadConfig(ctx);
  const env = loadEnv(ctx);
  const token = process.env[TOKEN_VAR] || env[TOKEN_VAR];
  if (!token) throw new StoreError(`${TOKEN_VAR} is not set in .env`, { kind: 'unconfigured', help: TOKEN_PAGE });
  const api = (process.env.WONG_MEMORY_API || 'https://api.cloudflare.com/client/v4').replace(/\/$/, '');
  const base = `${api}/accounts/${config.accountId}`;
  const objectPath = key => `/r2/buckets/${config.bucket}/objects/${encodeURI(key)}`;

  async function call(path, init = {}, budget = timeoutMs) {
    let response;
    try {
      response = await fetch(`${base}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers }, signal: AbortSignal.timeout(budget) });
    } catch (error) {
      throw new StoreError(`memory store unreachable (${error.name === 'TimeoutError' ? 'timeout' : 'network'})`, { kind: 'network' });
    }
    if (response.status === 401 || response.status === 403) throw new StoreError(`the memory store rejected ${TOKEN_VAR} (HTTP ${response.status})`, { kind: 'auth', help: TOKEN_PAGE });
    if (response.status >= 500) throw new StoreError(`memory store error (HTTP ${response.status})`, { kind: 'server' });
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

  return { config, env, batch, query: async (sql, params) => (await batch([[sql, params]]))[0], putObject, getObject };
}

// ---------- local state, shared by every worktree of one clone ----------

export function statePath(ctx, ...parts) {
  const path = join(ctx.stateDir, ...parts);
  mkdirSync(dirname(path), { recursive: true });
  return path;
}

export const readJson = (path, fallback) => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; } };
export const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

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
