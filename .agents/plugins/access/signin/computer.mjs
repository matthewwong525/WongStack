// This computer's sign-in to the app: the token `cloudflared` saved for it, read without logging in, so it never
// waits on a person. A helper, memory's connection included, sends `headers(origin)` with each call.
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DAY_MS = 86400000;
// Each new chat warns this long before the sign-in ends.
export const WARN_DAYS = 5;

/** The JWT's claims, read without verifying it: only for display, and to name who the app will check. */
export function tokenClaims(token) {
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')); } catch { return null; }
}

// Its installer puts cloudflared in ~/.local/bin, which a hook's PATH may lack.
const signIns = new Map();
/** The sign-in for `origin`: `missing`, `expired`, `near` its end, or `valid`, with the token, subject and email. */
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

/** The headers a call to the app sends as this person, or null when this computer is not signed in. */
export function headers(origin, read = signIn) {
  const person = read(origin);
  return ['valid', 'near'].includes(person.state) ? { 'cf-access-token': person.token } : null;
}

/** What the assistant runs to show the person the sign-in link: a login waits on them, so a helper never runs it. */
export const signInHelp = origin => `to sign in, run \`cloudflared access login ${origin}\` and show the person the link it prints`;
