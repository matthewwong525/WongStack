// The admin's memory-key commands. Keys live in the store's memory_keys table, and the admin's GitHub account
// in memory_admins; the app Worker's memory route refuses both to every key. These commands reach them with
// CLOUDFLARE_API_TOKEN, straight to Cloudflare. No command makes a key for another person: they join through GitHub.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { join } from 'node:path';
import { hashKey, KEY_DAYS, newKey } from '../../worker/memory-worker.mjs';
import { loadConfig, openStore, readJson, SCRIPT, statePath, StoreError, writeJson } from './store.mjs';

const WIDEN = '.claude/skills/wong-setup/references/permission-groups.md';
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const iso = time => new Date(time).toISOString().replace(/\.\d{3}Z$/, 'Z');
const now = () => iso(Date.now());

// Run statements on the memory database as the admin. A refused token names the permission the step needs.
async function keys(ctx, statements) {
  try {
    return await openStore(ctx, { admin: true }).batch(statements);
  } catch (error) {
    if (error.kind === 'auth') throw new StoreError('CLOUDFLARE_API_TOKEN lacks D1 Write on the memory database; widen it and run again', { kind: 'auth', help: WIDEN });
    if (/no such (?:column|table)|has no column named/.test(error.message)) throw new StoreError(`the memory store needs its latest migration; run \`${SCRIPT} migrate\` first`, { kind: 'unconfigured' });
    throw error;
  }
}

export const keyFile = ctx => join(ctx.stateDir, 'key.json');

// This clone's machine name: the host name and a short suffix kept in key.json, so two hosts with the same
// name never replace each other's key.
export const machineName = ctx => readJson(keyFile(ctx), {}).machine || `${hostname()}-${randomBytes(3).toString('hex')}`;

// The GitHub account gh is signed in as, or null.
export function githubUser() {
  try {
    const user = JSON.parse(execFileSync('gh', ['api', 'user'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000 }));
    return user?.id ? { id: String(user.id), login: user.login || null } : null;
  } catch { return null; }
}

// Link a GitHub account as the store's admin: a join gives an admin key to that account only.
export const linkAdmin = (user, email) => ['INSERT INTO memory_admins (github_id, login, email, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (github_id) DO UPDATE SET login = excluded.login, email = excluded.email',
  [user.id, user.login, email, now()]];

// The primary checkout's .env, or a stop when Git cannot confirm that checkout: a key is never saved in a guess.
export function envKeyFile(ctx) {
  if (!ctx.primaryRoot) throw new StoreError('Git cannot confirm the primary checkout, so there is no safe .env to save the key in; run this from the main checkout', { kind: 'unconfigured' });
  return join(ctx.primaryRoot, '.env');
}

// Set CLOUDFLARE_MEMORY_TOKEN in the primary checkout's .env, replacing every earlier line for it: the
// parser keeps the last one, so a stale duplicate would win.
export function writeEnvKey(ctx, key) {
  const file = envKeyFile(ctx);
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const line = `CLOUDFLARE_MEMORY_TOKEN=${key}`;
  const earlier = /^\s*(?:export\s+)?CLOUDFLARE_MEMORY_TOKEN\s*=[^\n]*$/;
  const lines = text.split('\n');
  const first = lines.findIndex(each => earlier.test(each));
  const next = first === -1
    ? `${text}${text && !text.endsWith('\n') ? '\n' : ''}${line}\n`
    : lines.flatMap((each, index) => index === first ? [line] : earlier.test(each) ? [] : [each]).join('\n');
  writeFileSync(file, next);
  return file;
}

// Link the GitHub account gh is signed in as, and give this machine an admin key that expires and renews
// through join like any other. The key goes only to the primary .env; it is never printed.
async function admin(ctx) {
  const config = loadConfig(ctx);
  envKeyFile(ctx);
  if (!config.worker) throw new StoreError('no memory Worker URL is recorded as components.memory.worker; follow the provisioning runbook\'s memory step first', { kind: 'unconfigured' });
  const email = (ctx.author || '').toLowerCase();
  if (!EMAIL_SHAPE.test(email)) throw new StoreError('no git email is set here; set one with `git config user.email`, then run this again', { kind: 'unconfigured' });
  const user = githubUser();
  if (!user) throw new StoreError('GitHub is not signed in on this machine, so there is no account to link; run `gh auth login`, then this again', { kind: 'auth' });
  const machine = machineName(ctx);
  const key = newKey(email);
  const expiresAt = iso(Date.now() + KEY_DAYS * 86400000);
  await keys(ctx, [
    linkAdmin(user, email),
    ['DELETE FROM memory_keys WHERE machine = ? AND (email = ? OR github_id = ?)', [machine, email, user.id]],
    ['INSERT INTO memory_keys (hash, email, role, created_at, machine, expires_at, github_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [await hashKey(key), email, 'admin', now(), machine, expiresAt, user.id]],
  ]);
  const file = writeEnvKey(ctx, key);
  writeJson(statePath(ctx, 'key.json'), { email, role: 'admin', machine, expiresAt });
  console.log(`linked GitHub account ${user.login || user.id} as this store's admin, for ${email}. This machine's admin key (machine ${machine}) is in ${file} as CLOUDFLARE_MEMORY_TOKEN, and renews itself through GitHub before ${expiresAt.slice(0, 10)}.`);
}

async function remove(ctx, email) {
  const [removed, unlinked] = await keys(ctx, [
    ['DELETE FROM memory_keys WHERE email = ? RETURNING role', [email]],
    ['DELETE FROM memory_admins WHERE lower(email) = ? RETURNING login, github_id', [email]],
  ]);
  const gone = removed.length ? `removed ${email}: their ${removed.length === 1 ? 'key no longer opens' : `${removed.length} keys no longer open`} this store` : `${email} has no key for this store`;
  const link = unlinked.map(row => row.login || row.github_id).join(', ');
  console.log(`${gone}${link ? `; GitHub account ${link} is no longer linked as the admin, so its joins make member keys` : ''}`);
}

// The linked admins, or none on a store before schema 5.
const linkedAdmins = ctx => keys(ctx, [['SELECT github_id, login, email FROM memory_admins ORDER BY email']])
  .then(([rows]) => rows, error => { if (error.kind === 'unconfigured') return []; throw error; });

async function list(ctx) {
  // Every column, so a store before the reader schema lists its keys too.
  const [rows] = await keys(ctx, [['SELECT * FROM memory_keys ORDER BY role, email, machine']]);
  const admins = await linkedAdmins(ctx);
  const line = row => `- ${row.email} (${row.role}${row.reader ? ', reader' : ''}, since ${row.created_at.slice(0, 10)}, ${row.machine ? `machine ${row.machine}` : 'no machine'}, ${row.github_id ? `GitHub ${row.github_id}` : 'no GitHub account'}, ${row.expires_at ? `expires ${row.expires_at.slice(0, 10)}` : 'no expiry'})`;
  console.log([
    rows.length ? rows.map(line).join('\n') : 'No keys open this store.',
    admins.length ? `Linked admin: ${admins.map(row => `${row.login || 'GitHub'} (GitHub ${row.github_id}), ${row.email}`).join('; ')}` : `No GitHub account is linked as admin; \`${SCRIPT} member admin\` links yours.`,
  ].join('\n'));
}

const USAGE = 'usage: memory.mjs member admin | member remove <email> | member list';

export const MEMBER_COMMANDS = {
  member: (ctx, { positionals: [action, raw] }) => {
    if (action === 'list') return list(ctx);
    if (action === 'admin') return admin(ctx);
    const email = (raw || '').toLowerCase();
    if (action === 'add') throw new StoreError(`no key is made by hand${EMAIL_SHAPE.test(email) ? ` for ${email}` : ''}: a teammate joins through GitHub with \`${SCRIPT} join\`, which the session-start hook runs, and your own admin key comes from \`${SCRIPT} member admin\`. ${USAGE}`);
    if (action !== 'remove' || !EMAIL_SHAPE.test(email)) throw new StoreError(USAGE);
    return remove(ctx, email);
  },
};
