// Trusted provisioning authority issues per-machine repository credentials.
// Ordinary memory keys cannot access this table. Secrets go only to private files.
import { chmodSync, existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { hashKey, newKey } from '../../worker/memory-worker.mjs';
import { loginMarker } from '../../worker/login-link.mjs';
import { MACHINE_ID } from './machine-id.mjs';
import { loadConfig, openStore, SCRIPT, statePath, StoreError, writeJson } from './store.mjs';

const now = () => new Date().toISOString();
async function keys(ctx, statements) {
  try { return await openStore(ctx, { admin: true }).batch(statements); } catch (error) {
    if (error.kind === 'auth') throw new StoreError('CLOUDFLARE_API_TOKEN lacks D1 Write; widen the provisioning token and run again', { kind: 'auth', help: '.claude/skills/wong-setup/references/permission-groups.md' });
    if (/no such (?:column|table)|has no column named/i.test(error.message)) throw new StoreError(`the memory store needs its latest migration; run ${SCRIPT} migrate first`, { kind: 'unconfigured' });
    throw error;
  }
}
export const keyFile = ctx => join(ctx.stateDir, 'key.json');
export function envKeyFile(ctx) {
  if (!ctx.primaryRoot) throw new StoreError('Git cannot confirm the primary checkout; run from the main checkout', { kind: 'unconfigured' });
  return join(ctx.primaryRoot, '.env');
}
export function writeEnvKey(ctx, key) {
  const file = envKeyFile(ctx);
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const lines = text.split('\n').filter(line => !/^\s*(?:export\s+)?CLOUDFLARE_MEMORY_TOKEN\s*=/.test(line));
  writeFileSync(file, `${lines.join('\n').replace(/\n*$/, '')}\nCLOUDFLARE_MEMORY_TOKEN=${key}\n`, { mode: 0o600 });
  chmodSync(file, 0o600);
  return file;
}

// Prepare a restricted transfer file before touching grants. No tracked file or
// file inside a checkout may carry a transferable credential.
function transferFile(ctx, path) {
  if (!path || !isAbsolute(path)) throw new StoreError('--key-file must be an absolute private path outside the checkout');
  const file = join(realpathSync(dirname(resolve(path))), basename(path));
  for (let dir = dirname(file); ; dir = dirname(dir)) {
    if (existsSync(join(dir, '.git'))) throw new StoreError('the transfer file must be outside a repository');
    if (dirname(dir) === dir) break;
  }
  if ([ctx.root, ctx.primaryRoot].filter(Boolean).some(root => file === root || file.startsWith(`${root}/`))) throw new StoreError('the transfer file must be outside every checkout');
  writeFileSync(file, '', { flag: 'wx', mode: 0o600 });
  return file;
}

async function issue(ctx, machineId, role, label, marker = null) {
  const key = newKey(machineId);
  const created = now();
  const hash = await hashKey(key);
  // Retain old rows and association labels. Replacement invalidates all older
  // keys and pending markers in the same transaction as the new hash insert.
  await keys(ctx, [
    [`INSERT INTO memory_keys (hash, email, role, reader, created_at, machine_id, login_link_hash, login_link_expires_at, login_identity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, (SELECT login_identity FROM memory_keys WHERE machine_id = ? AND login_identity IS NOT NULL ORDER BY created_at DESC LIMIT 1))`,
      [hash, label || '', role === 'admin' ? 'admin' : 'member', role === 'reader' ? 1 : 0, created, machineId, marker ? await hashKey(marker) : null, marker ? new Date(Date.now() + 24 * 3600000).toISOString() : null, machineId]],
    ['UPDATE memory_keys SET expires_at = ?, login_link_hash = NULL, login_link_expires_at = NULL WHERE machine_id = ? AND hash != ?', [created, machineId, hash]],
  ]);
  return key;
}
export async function prepareAppLink(ctx, credential = null) {
  try {
    const url = await openStore(ctx, { credential }).loginLink();
    writeJson(statePath(ctx, 'key.json'), { machineId: ctx.machineId, appUrl: url });
    return url;
  } catch { return null; }
}
async function admin(ctx) {
  const config = loadConfig(ctx);
  const file = envKeyFile(ctx);
  if (!config.worker) throw new StoreError('no production memory Worker URL is recorded', { kind: 'unconfigured' });
  const marker = loginMarker();
  const key = await issue(ctx, ctx.machineId, 'admin', ctx.author, marker);
  writeEnvKey(ctx, key);
  const link = new URL('/', config.worker);
  link.searchParams.set('memory_login_link', marker);
  const appUrl = link.href;
  writeJson(statePath(ctx, 'key.json'), { machineId: ctx.machineId, appUrl });
  console.log(`Installed this machine’s admin memory credential in ${file}. Open the app and sign in normally: ${appUrl}`);
}
async function add(ctx, machineId, values) {
  const role = values.role || 'member';
  if (!['member', 'reader'].includes(role)) throw new StoreError('--role must be member or reader');
  const file = transferFile(ctx, values['key-file']);
  const config = loadConfig(ctx);
  if (!config.worker) throw new StoreError('no production memory Worker URL is recorded', { kind: 'unconfigured' });
  const key = await issue(ctx, machineId, role, values.label);
  writeFileSync(file, `${JSON.stringify({ key, machineId, worker: config.worker, databaseId: config.databaseId })}\n`, { mode: 0o600 });
  console.log(`Prepared ${role} repository access for machine ${machineId} in the private transfer file. The recipient installs it with join --file <private-file>. Earlier credentials for this machine are revoked.`);
}
async function remove(ctx, machineId) {
  await keys(ctx, [['UPDATE memory_keys SET expires_at = ?, login_link_hash = NULL, login_link_expires_at = NULL WHERE machine_id = ?', [now(), machineId]]]);
  console.log(`Revoked every repository credential for machine ${machineId}.`);
}
async function list(ctx) {
  const [rows] = await keys(ctx, [['SELECT machine_id, email, role, reader, expires_at, login_identity FROM memory_keys ORDER BY machine_id, created_at']]);
  console.log(rows.map(row => `- ${row.machine_id || 'unassigned legacy key'} (${row.reader ? 'reader' : row.role}, ${row.email || 'no label'}, ${row.expires_at ? 'revoked' : 'active'})${row.login_identity ? `; login ${JSON.parse(row.login_identity).issuer} / ${JSON.parse(row.login_identity).subject}` : ''}`).join('\n') || 'No credentials.');
}
const USAGE = 'usage: member admin | member add <machine-id> --key-file <private-path> [--role member|reader] | member remove <machine-id> | member list';
export const MEMBER_COMMANDS = { member: (ctx, { positionals: [action, id], values }) => {
  if (action === 'admin') return admin(ctx);
  if (action === 'list') return list(ctx);
  if (!MACHINE_ID.test(id || '')) throw new StoreError(USAGE);
  if (action === 'add') return add(ctx, id, values);
  if (action === 'remove') return remove(ctx, id);
  throw new StoreError(USAGE);
} };
