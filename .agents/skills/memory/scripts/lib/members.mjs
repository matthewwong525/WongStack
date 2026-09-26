// The admin's commands for the account's memory Worker: deploy it, attach this repo, and manage memory keys.
// They run with CLOUDFLARE_API_TOKEN, straight to the Cloudflare API; a memory key cannot run them.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bindingFor, hashKey } from '../../worker/memory-worker.mjs';
import { adminToken, cloudflareApi, configFile, KEY_PREFIX, loadConfig, StoreError } from './store.mjs';

const WORKER_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'worker', 'memory-worker.mjs');
const KEYS_SCHEMA = join(dirname(WORKER_FILE), 'keys.sql');
export const WORKER_NAME = 'wong-memory';
export const KEYS_DATABASE = 'wong-memory-keys';
const COMPATIBILITY_DATE = '2026-09-01';
const WIDEN = '.claude/skills/wong-setup/references/permission-groups.md';
const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

// One Cloudflare call as the admin. A 401 or 403 names the permission the step needs.
function cloudflare(ctx) {
  const token = adminToken(ctx);
  const base = `${cloudflareApi()}/accounts/${loadConfig(ctx).accountId}`;
  return async (path, { permission, method = 'GET', body, json, allow = [] }) => {
    const init = json ? { body: JSON.stringify(json), headers: { 'Content-Type': 'application/json' } } : { body, headers: {} };
    let response;
    try {
      response = await fetch(`${base}${path}`, { method, body: init.body, headers: { Authorization: `Bearer ${token}`, ...init.headers } });
    } catch (error) {
      throw new StoreError(`Cloudflare unreachable (${error.message})`, { kind: 'network' });
    }
    const data = await response.json().catch(() => ({}));
    if (allow.includes(response.status)) return { status: response.status, data };
    if (response.status === 401 || response.status === 403) {
      throw new StoreError(`CLOUDFLARE_API_TOKEN lacks ${permission} (HTTP ${response.status} on ${method} ${path}); widen it and run again`, { kind: 'auth', help: WIDEN });
    }
    if (!response.ok || data.success === false) {
      throw new StoreError(`Cloudflare ${method} ${path} failed: ${(data.errors || []).map(error => error.message).join('; ') || `HTTP ${response.status}`}`);
    }
    return { status: response.status, data };
  };
}

// The keys database's id; `create` makes it and applies its schema when the account has none.
async function keysDatabase(call, { create = false } = {}) {
  const { data } = await call(`/d1/database?name=${KEYS_DATABASE}`, { permission: 'D1 Write' });
  let id = (data.result || []).find(database => database.name === KEYS_DATABASE)?.uuid;
  if (!id && !create) throw new StoreError(`this account has no ${KEYS_DATABASE} database; run \`memory.mjs worker deploy\` first`, { kind: 'unconfigured' });
  if (!id) id = (await call('/d1/database', { method: 'POST', json: { name: KEYS_DATABASE }, permission: 'D1 Write' })).data.result.uuid;
  if (create) await keysQuery(call, id, [[readFileSync(KEYS_SCHEMA, 'utf8').replace(/^--.*\n/gm, '').trim()]]);
  return id;
}

async function keysQuery(call, id, statements) {
  const { data } = await call(`/d1/database/${id}/query`, { method: 'POST', json: { batch: statements.map(([sql, params = []]) => ({ sql, params })) }, permission: 'D1 Write' });
  return data.result.map(result => result.results || []);
}

// Every database id and bucket name in the account, so a deploy can drop bindings to deleted ones.
async function accountStores(call) {
  const databases = new Set();
  for (let page = 1; ; page += 1) {
    const { data } = await call(`/d1/database?per_page=100&page=${page}`, { permission: 'D1 Write' });
    (data.result || []).forEach(database => databases.add(database.uuid));
    if ((data.result || []).length < 100) break;
  }
  const { status, data } = await call('/r2/buckets?per_page=1000', { permission: 'Workers R2 Storage Write', allow: [403] });
  const buckets = status === 403 ? null : new Set((data.result?.buckets || []).map(bucket => bucket.name));
  return { databases, buckets };
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

// Deploy or update the Worker, attach this repo's database and bucket, and keep every other repo's bindings.
async function deploy(ctx) {
  const config = loadConfig(ctx);
  const call = cloudflare(ctx);
  const keysId = await keysDatabase(call, { create: true });
  const { status, data } = await call(`/workers/scripts/${WORKER_NAME}/settings`, { permission: 'Workers Scripts Write', allow: [404] });
  const wanted = [
    { type: 'd1', name: 'KEYS', id: keysId },
    { type: 'd1', name: bindingFor.database(config.databaseId), id: config.databaseId },
    ...(config.bucket ? [{ type: 'r2_bucket', name: bindingFor.bucket(config.bucket), bucket_name: config.bucket }] : []),
  ];
  // Keep other repos' bindings, minus any whose database or bucket was deleted (a torn-down repo).
  const stores = await accountStores(call);
  const exists = binding => binding.type === 'd1' ? stores.databases.has(binding.id || binding.database_id) : !stores.buckets || stores.buckets.has(binding.bucket_name);
  const kept = (status === 404 ? [] : data.result?.bindings || [])
    .filter(binding => ['d1', 'r2_bucket'].includes(binding.type) && !wanted.some(want => want.name === binding.name) && exists(binding))
    .map(binding => binding.type === 'd1'
      ? { type: 'd1', name: binding.name, id: binding.id || binding.database_id }
      : { type: 'r2_bucket', name: binding.name, bucket_name: binding.bucket_name });
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify({ main_module: 'memory-worker.mjs', compatibility_date: COMPATIBILITY_DATE, bindings: [...kept, ...wanted] })], { type: 'application/json' }));
  form.append('memory-worker.mjs', new Blob([readFileSync(WORKER_FILE)], { type: 'application/javascript+module' }), 'memory-worker.mjs');
  await call(`/workers/scripts/${WORKER_NAME}`, { method: 'PUT', body: form, permission: 'Workers Scripts Write' });
  await call(`/workers/scripts/${WORKER_NAME}/subdomain`, { method: 'POST', json: { enabled: true }, permission: 'Workers Scripts Write' });
  const subdomain = (await call('/workers/subdomain', { permission: 'Workers Scripts Write' })).data.result?.subdomain;
  if (!subdomain) throw new StoreError('this account has no workers.dev subdomain; choose one in the Cloudflare dashboard (Workers & Pages), then run again');
  const url = `https://${WORKER_NAME}.${subdomain}.workers.dev`;
  const changed = config.worker !== url;
  recordMemory(ctx, { worker: url });
  console.log([
    `deployed ${WORKER_NAME} with ${kept.length} other binding(s) kept, and attached ${config.databaseId}${config.bucket ? ` and bucket ${config.bucket}` : ''}`,
    `worker: ${url}${changed ? ' (recorded in .claude/.wong-stack.json; save it so teammates get it)' : ''}`,
  ].join('\n'));
}

async function add(ctx, email, { admin, env }) {
  const config = loadConfig(ctx);
  if (!config.worker) throw new StoreError('no memory Worker is recorded; run `memory.mjs worker deploy` first', { kind: 'unconfigured' });
  const call = cloudflare(ctx);
  const keysId = await keysDatabase(call);
  const key = `${KEY_PREFIX}${Buffer.from(email).toString('base64url')}.${randomBytes(32).toString('base64url')}`;
  const role = admin ? 'admin' : 'member';
  await keysQuery(call, keysId, [
    ['DELETE FROM keys WHERE email = ? AND database_id = ?', [email, config.databaseId]],
    ['INSERT INTO keys (hash, email, role, database_id, bucket, created_at) VALUES (?, ?, ?, ?, ?, ?)', [await hashKey(key), email, role, config.databaseId, config.bucket, now()]],
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
  const config = loadConfig(ctx);
  const call = cloudflare(ctx);
  const [removed] = await keysQuery(call, await keysDatabase(call), [['DELETE FROM keys WHERE email = ? AND database_id = ? RETURNING role', [email, config.databaseId]]]);
  console.log(removed.length ? `removed ${email}: their key no longer opens this store` : `${email} has no key for this store`);
}

async function list(ctx) {
  const config = loadConfig(ctx);
  const call = cloudflare(ctx);
  const [rows] = await keysQuery(call, await keysDatabase(call), [['SELECT email, role, created_at FROM keys WHERE database_id = ? ORDER BY role, email', [config.databaseId]]]);
  console.log(rows.length ? rows.map(row => `- ${row.email} (${row.role}, since ${row.created_at.slice(0, 10)})`).join('\n') : 'No keys open this store.');
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MEMBER_COMMANDS = {
  worker: (ctx, { positionals: [action] }) => {
    if (action !== 'deploy') throw new StoreError('usage: memory.mjs worker deploy');
    return deploy(ctx);
  },
  member: (ctx, { values, positionals: [action, raw] }) => {
    if (action === 'list') return list(ctx);
    const email = (raw || '').toLowerCase();
    if (!['add', 'remove'].includes(action) || !EMAIL_SHAPE.test(email)) throw new StoreError('usage: memory.mjs member add <email> [--admin] [--env] | member remove <email> | member list');
    return action === 'add' ? add(ctx, email, values) : remove(ctx, email);
  },
};
