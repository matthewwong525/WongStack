// `memory.mjs join`: get or renew this machine's memory key through the person's GitHub access to the repo.
// The key goes to the primary checkout's .env and is never printed; key.json keeps its email, machine, and
// expiry, so the session-start hook knows when to renew. With --background (the hook), a failure the person
// must fix is kept in join-error.json, and the hook shows it until they run join themselves.
import { execFileSync } from 'node:child_process';
import { closeSync, openSync, rmSync, statSync } from 'node:fs';
import { join as joinPath } from 'node:path';
import { envKeyFile, machineName, writeEnvKey } from './members.mjs';
import { loadConfig, SCRIPT, statePath, StoreError, writeJson } from './store.mjs';

export const RENEW_DAYS = 7;
const TIMEOUT_MS = 20000;
const REFRESH = 'gh auth refresh -h github.com -s user:email';

// What the person can do about each refusal, by the Worker's error code.
const FIXES = {
  gh_login: 'sign in to GitHub on this machine: gh auth login',
  github_token: 'sign in to GitHub again: gh auth login',
  needs_scope: `let gh read your verified emails: ${REFRESH}`,
  no_access: 'ask the repo\'s owner for access on GitHub: read access to a private repo, push access to a public one',
  no_email: 'verify an email on your GitHub account, at https://github.com/settings/emails',
  no_repo: 'wait until CI deploys production, which tells the memory Worker its repository',
  not_migrated: `ask the repo's owner to run \`${SCRIPT} migrate\``,
  not_deployed: 'wait until CI deploys production with the memory route',
};

// Refusals only the person can fix; the others (a Worker not yet deployed or migrated) clear on their own.
const PERSONAL = new Set(['gh_login', 'github_token', 'needs_scope', 'no_access', 'no_email']);

export const joinErrorFile = ctx => joinPath(ctx.stateDir, 'join-error.json');

class JoinError extends StoreError {
  constructor(code, reason, kind = 'auth') {
    super(`${reason}; ${FIXES[code] || 'try again later'}`, { kind });
    this.code = code;
  }
}

function githubToken() {
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000 }).trim();
  } catch { return ''; }
}

export async function joinStore(ctx) {
  const config = loadConfig(ctx);
  if (!config.worker) throw new StoreError('no memory Worker URL is recorded as components.memory.worker; pull the latest main', { kind: 'unconfigured' });
  const token = githubToken();
  if (!token) throw new JoinError('gh_login', 'GitHub is not signed in on this machine');
  const machine = machineName(ctx);
  envKeyFile(ctx);
  let response;
  try {
    response = await fetch(`${config.worker.replace(/\/$/, '')}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, machine, email: ctx.author || '' }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new StoreError(`memory Worker unreachable (${error.name === 'TimeoutError' ? 'timeout' : 'network'})`, { kind: 'network' });
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    const { code, message } = data.errors?.[0] || {};
    if (FIXES[code]) throw new JoinError(code, message);
    if (response.status === 404) throw new JoinError('not_deployed', 'the memory Worker does not answer joins yet', 'unconfigured');
    throw new StoreError(`join failed: ${message || `HTTP ${response.status}`}`, { kind: response.status >= 500 ? 'server' : 'query' });
  }
  const { key, email, role, expiresAt } = data.result;
  const file = writeEnvKey(ctx, key);
  writeJson(statePath(ctx, 'key.json'), { email, role, machine, expiresAt });
  rmSync(joinErrorFile(ctx), { force: true });
  return { email, role, machine, expiresAt, file };
}

// One join at a time per clone: two sessions starting together would otherwise each replace the other's key.
function takeLock(ctx) {
  const file = statePath(ctx, 'join.lock');
  try {
    closeSync(openSync(file, 'wx'));
    return () => rmSync(file, { force: true });
  } catch {
    if (Date.now() - (statSync(file, { throwIfNoEntry: false })?.mtimeMs ?? 0) < TIMEOUT_MS * 3) return null;
    rmSync(file, { force: true });
    return takeLock(ctx);
  }
}

async function joinCommand(ctx, { values }) {
  const release = takeLock(ctx);
  if (!release) {
    if (values.background) return;
    throw new StoreError('another join is running on this clone; try again in a minute');
  }
  try {
    const joined = await joinStore(ctx);
    const differs = ctx.author && ctx.author.toLowerCase() !== joined.email ? ` (${ctx.author} is not a verified email on your GitHub account)` : '';
    const reader = joined.role === 'reader' ? ' As a reader, only you see the facts you save.' : '';
    console.log(`joined this repo's memory as ${joined.email}${differs}, ${joined.role}, on machine ${joined.machine}. The key is in ${joined.file} as CLOUDFLARE_MEMORY_TOKEN, and renews itself before ${joined.expiresAt.slice(0, 10)}.${reader}`);
  } catch (error) {
    // Only a refusal the person must fix is kept; a network failure is retried at the next session start.
    if (values.background && PERSONAL.has(error.code)) writeJson(statePath(ctx, 'join-error.json'), { message: error.message, at: new Date().toISOString() });
    throw error;
  } finally { release(); }
}

export const JOIN_COMMANDS = { join: joinCommand };
