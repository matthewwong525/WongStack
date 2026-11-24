// The signed-in person of the company app, for Daily's `who` and a workspace's failed fetch. wiki/development/daily.md
import { execFileSync } from 'node:child_process';
import { loadConfig, memoryOrigin, signIn, signInHelp } from '../../../../memory/d1/connect.mjs';
import { repoContext } from '../../../memory/scripts/lib/store.mjs';
import { wongDelivery } from '../../../../loop/routes/route.mjs';

/** The remote's address in a copy installed through the company app, else null. */
function appRemote(cwd) {
  try {
    if (wongDelivery(cwd).route !== 'app') return null;
    return new URL(execFileSync('git', ['-C', cwd, 'remote', 'get-url', 'origin'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()).origin;
  } catch { return null; }
}

/** `{email, state, origin, days, login, help}`, with the sign-in step a failed fetch names; undefined with no app. */
export function person(cwd = process.cwd()) {
  let origin = null;
  try { origin = memoryOrigin(loadConfig(repoContext(cwd))); } catch { /* no memory app */ }
  const remote = appRemote(cwd);
  origin ||= remote;
  if (!origin) return undefined;
  const found = signIn(origin), ok = found.state === 'valid' || found.state === 'near';
  const help = remote && `Sign in to the company app again, then retry: cloudflared access login ${remote}`;
  return { email: found.email ?? null, state: found.state, origin, days: found.days ?? null, login: ok ? null : signInHelp(origin), help };
}

/** `person`, or undefined when reading it fails: a hook never stops on it. */
export function personNow(cwd) {
  try { return person(cwd); } catch (error) {
    process.stderr.write(`Daily could not read the signed-in person: ${String(error?.message ?? error).split('\n')[0].slice(0, 160)}\n`);
    return undefined;
  }
}
