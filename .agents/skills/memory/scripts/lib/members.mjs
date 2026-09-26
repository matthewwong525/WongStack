// The admin's memory-key commands. Keys live in the store's memory_keys table, which the app Worker's
// memory route refuses to every key; these commands reach it with CLOUDFLARE_API_TOKEN, straight to Cloudflare.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hashKey } from '../../worker/memory-worker.mjs';
import { configFile, KEY_PREFIX, loadConfig, openStore, StoreError } from './store.mjs';

const WIDEN = '.claude/skills/wong-setup/references/permission-groups.md';
const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

// Run statements on the memory database as the admin. A refused token names the permission the step needs.
async function keys(ctx, statements) {
  try {
    return await openStore(ctx, { admin: true }).batch(statements);
  } catch (error) {
    if (error.kind === 'auth') throw new StoreError('CLOUDFLARE_API_TOKEN lacks D1 Write on the memory database; widen it and run again', { kind: 'auth', help: WIDEN });
    throw error;
  }
}

// Merge a patch into components.memory of this checkout's install record.
function recordMemory(ctx, patch) {
  const file = configFile(ctx);
  const record = JSON.parse(readFileSync(file, 'utf8'));
  Object.assign(record.components.memory, patch);
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
}

// Set CLOUDFLARE_MEMORY_TOKEN in the primary checkout's .env, replacing an earlier value.
function writeEnvKey(ctx, key) {
  const file = join(ctx.primaryRoot, '.env');
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const line = `CLOUDFLARE_MEMORY_TOKEN=${key}`;
  const next = /^\s*(?:export\s+)?CLOUDFLARE_MEMORY_TOKEN\s*=.*$/m.test(text)
    ? text.replace(/^\s*(?:export\s+)?CLOUDFLARE_MEMORY_TOKEN\s*=.*$/m, line)
    : `${text}${text && !text.endsWith('\n') ? '\n' : ''}${line}\n`;
  writeFileSync(file, next);
  return file;
}

async function add(ctx, email, { admin, env }) {
  const config = loadConfig(ctx);
  if (!config.worker) throw new StoreError('no memory Worker URL is recorded as components.memory.worker; follow the provisioning runbook\'s memory step first', { kind: 'unconfigured' });
  const key = `${KEY_PREFIX}${Buffer.from(email).toString('base64url')}.${randomBytes(32).toString('base64url')}`;
  const role = admin ? 'admin' : 'member';
  await keys(ctx, [
    ['DELETE FROM memory_keys WHERE email = ?', [email]],
    ['INSERT INTO memory_keys (hash, email, role, created_at) VALUES (?, ?, ?, ?)', [await hashKey(key), email, role, now()]],
  ]);
  if (role === 'member' && !config.team) recordMemory(ctx, { team: true });
  const note = role === 'member' && !config.team ? '\nThis repo is now a team: save .claude/.wong-stack.json.' : '';
  if (env) { console.log(`added ${email} as ${role}; the key is in ${writeEnvKey(ctx, key)} as CLOUDFLARE_MEMORY_TOKEN. Any earlier key for ${email} no longer works.${note}`); return; }
  console.log([
    `added ${email} as ${role}. Any earlier key for ${email} no longer works. This key is shown once; send it privately.`,
    `The person puts this line in the .env of their main checkout:`,
    `CLOUDFLARE_MEMORY_TOKEN=${key}`,
  ].join('\n') + note);
}

async function remove(ctx, email) {
  const [removed] = await keys(ctx, [['DELETE FROM memory_keys WHERE email = ? RETURNING role', [email]]]);
  console.log(removed.length ? `removed ${email}: their key no longer opens this store` : `${email} has no key for this store`);
}

async function list(ctx) {
  const [rows] = await keys(ctx, [['SELECT email, role, created_at FROM memory_keys ORDER BY role, email']]);
  console.log(rows.length ? rows.map(row => `- ${row.email} (${row.role}, since ${row.created_at.slice(0, 10)})`).join('\n') : 'No keys open this store.');
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MEMBER_COMMANDS = {
  member: (ctx, { values, positionals: [action, raw] }) => {
    if (action === 'list') return list(ctx);
    const email = (raw || '').toLowerCase();
    if (!['add', 'remove'].includes(action) || !EMAIL_SHAPE.test(email)) throw new StoreError('usage: memory.mjs member add <email> [--admin] [--env] | member remove <email> | member list');
    return action === 'add' ? add(ctx, email, values) : remove(ctx, email);
  },
};
