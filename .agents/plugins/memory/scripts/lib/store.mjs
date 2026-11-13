// Memory's local side: repo context, .env, local state, the spool, and the store the repo's profile connects.
// The profile owns the backend and the sign-in; this file names no server. wiki/development/memory.md#the-profile
import { execFileSync, spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { httpStore, OPERATIONS, StoreError } from '../../store/interface.mjs';
import { machineId } from './machine-id.mjs';
import { primaryRoot } from './primary-root.mjs';

export { isMain } from './cli.mjs';
export { StoreError };

const PLUGIN = fileURLToPath(new URL('../..', import.meta.url));
// A checkout's own copy keeps the short path every skill names; an installed copy is named by its full path.
const inCheckout = existsSync(join(process.cwd(), '.claude/skills/memory/scripts/memory.mjs'));
export const pluginPath = rel => (inCheckout ? `.claude/skills/memory/${rel}` : join(PLUGIN, rel));
export const SCRIPT = `node ${pluginPath('scripts/memory.mjs')}`;
export const SETUP_GUIDE = pluginPath('references/setup.md');

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
  const files = [join(ctx.root, '.env'), ctx.primaryRoot && join(ctx.primaryRoot, '.env')].filter(file => file && existsSync(file));
  return Object.assign({}, ...files.map(file => parseEnv(readFileSync(file, 'utf8'))));
}

// The repo's profile: `.agents/memory/profile.mjs`, or the file WONG_MEMORY_PROFILE names; null when it has none.
export async function loadProfile(ctx) {
  const file = process.env.WONG_MEMORY_PROFILE || join(ctx.root, '.agents', 'memory', 'profile.mjs');
  return existsSync(file) ? (await import(pathToFileURL(file).href)).default : null;
}

// The profile's store, each operation wrapped: a refused sign-in leaves a mark so session start shows no stale digest.
export async function openStore(ctx, options = {}) {
  const profile = await loadProfile(ctx);
  if (!profile?.connect) throw new StoreError(`memory is not set up: ${SETUP_GUIDE}`, { kind: 'unconfigured' });
  // A profile may give only `{ url, headers }`, so a repo's profile never imports from the plugin's own folder.
  const made = await profile.connect(ctx, options);
  const store = typeof made.facts === 'function' ? made : httpStore({ ...options, ...made });
  const refused = join(ctx.stateDir, 'authorization-refused.json');
  const wrapped = { profile, identity: store.identity, get role() { return store.role; } };
  for (const op of Object.keys(OPERATIONS)) {
    wrapped[op] = async (...args) => {
      try {
        const result = await store[op](...args);
        rmSync(refused, { force: true });
        return result;
      } catch (error) {
        if (error.kind === 'auth') writeJson(statePath(ctx, 'authorization-refused.json'), { at: new Date().toISOString() });
        throw error;
      }
    };
  }
  return wrapped;
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

// A node script started detached and silent, so a hook never waits on it; true when it started.
export function detached(script, args, { cwd, env = process.env, start = spawn } = {}) {
  try {
    const child = start(process.execPath, [script, ...args], { cwd, env, detached: true, stdio: 'ignore' });
    child.on('error', () => {});
    child.unref();
    return true;
  } catch { return false; }
}
