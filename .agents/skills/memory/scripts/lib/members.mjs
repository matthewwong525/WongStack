// The admin's sign-in jobs on the memory store, through the Cloudflare API: moving notes to people, and old keys.
// Who sees memory is set in Access; an install with no sign-in yet keeps one admin key.
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hashKey, newKey } from '../../worker/memory-worker.mjs';
import { MACHINE_ID } from './machine-id.mjs';
import { configFile, loadConfig, openStore, readJson, SCRIPT, StoreError } from './store.mjs';

const now = () => new Date().toISOString();
export const RETIRED = 'memory takes the company sign-in now: no key to hand out. Give a person access in the app\'s Access page, and they sign in once. See wiki/development/memory.md#who-sees-what';

async function keys(ctx, statements) {
  try { return await openStore(ctx, { admin: true }).batch(statements); } catch (error) {
    if (error.kind === 'auth') throw new StoreError('CLOUDFLARE_API_TOKEN lacks D1 Write; widen the provisioning token and run again', { kind: 'auth', help: '.claude/skills/wong-setup/references/permission-groups.md' });
    if (/no such (?:column|table)|has no column named/i.test(error.message)) throw new StoreError(`the memory store needs its latest migration; run ${SCRIPT} migrate first`, { kind: 'unconfigured' });
    throw error;
  }
}

// Whether the app has a company sign-in: with none yet ("open until the card"), memory keeps the admin key.
const signInOn = ctx => Boolean(readJson(configFile(ctx), {}).components?.access?.audience);

export function writeEnvKey(ctx, key) {
  if (!ctx.primaryRoot) throw new StoreError('Git cannot confirm the primary checkout; run from the main checkout', { kind: 'unconfigured' });
  const file = join(ctx.primaryRoot, '.env');
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const lines = text.split('\n').filter(line => !/^\s*(?:export\s+)?CLOUDFLARE_MEMORY_TOKEN\s*=/.test(line));
  writeFileSync(file, `${lines.join('\n').replace(/\n*$/, '')}\nCLOUDFLARE_MEMORY_TOKEN=${key}\n`, { mode: 0o600 });
  chmodSync(file, 0o600);
  return file;
}

async function admin(ctx) {
  if (signInOn(ctx)) throw new StoreError(RETIRED);
  if (!loadConfig(ctx).worker) throw new StoreError('no production memory Worker URL is recorded', { kind: 'unconfigured' });
  const key = newKey(ctx.machineId), created = now();
  await keys(ctx, [
    ['INSERT INTO memory_keys (hash, email, role, reader, created_at, machine_id) VALUES (?, ?, ?, 0, ?, ?)', [await hashKey(key), ctx.author || '', 'admin', created, ctx.machineId]],
    ['UPDATE memory_keys SET expires_at = ? WHERE machine_id = ? AND hash != ?', [created, ctx.machineId, await hashKey(key)]],
  ]);
  console.log(`Installed this computer's admin memory key in ${writeEnvKey(ctx, key)}. Once the app has a sign-in, memory uses it instead.`);
}

async function remove(ctx, machineId) {
  await keys(ctx, [['UPDATE memory_keys SET expires_at = ? WHERE machine_id = ?', [now(), machineId]]]);
  console.log(`Turned off every memory key for computer ${machineId}.`);
}

async function list(ctx) {
  const [rows] = await keys(ctx, [['SELECT machine_id, email, role, reader, expires_at, login_identity FROM memory_keys ORDER BY machine_id, created_at']]);
  const login = row => row.login_identity ? `; signed in as ${JSON.parse(row.login_identity).email}` : '';
  console.log(rows.map(row => `- ${row.machine_id || 'unassigned legacy key'} (${row.reader ? 'reader' : row.role}, ${row.email || 'no label'}, ${row.expires_at ? 'off' : 'on'})${login(row)}`).join('\n') || 'No keys.');
}

// Each computer's newest verified login, read once from the old keys: the only link from a computer to a person.
async function linkedMachines(ctx) {
  const [rows] = await keys(ctx, [["SELECT machine_id, json_extract(login_identity, '$.subject') AS subject, json_extract(login_identity, '$.email') AS email FROM memory_keys WHERE machine_id IS NOT NULL AND login_identity IS NOT NULL ORDER BY created_at"]]);
  return new Map(rows.filter(row => row.subject).map(row => [row.machine_id, row]));
}

const move = (subject, email, machineId) => ['facts', 'sessions'].map(table =>
  [`UPDATE ${table} SET owner_subject = ?, owner_email = ? WHERE owner_machine_id = ? AND owner_subject IS NULL RETURNING 1 AS moved`, [subject, email, machineId]]);

const WAITING = [`SELECT machine_id, sum(fact) AS facts, sum(1 - fact) AS sessions FROM (
  SELECT owner_machine_id AS machine_id, 1 AS fact FROM facts WHERE owner_subject IS NULL AND owner_machine_id IS NOT NULL
  UNION ALL SELECT owner_machine_id, 0 FROM sessions WHERE owner_subject IS NULL AND owner_machine_id IS NOT NULL) GROUP BY machine_id`, []];

// Moves linked computers' notes in one transaction, then turns every old key off in a second, only once it committed.
async function migratePeople(ctx) {
  const linked = [...(await linkedMachines(ctx)).values()];
  const moved = linked.length ? await keys(ctx, linked.flatMap(row => move(row.subject, row.email, row.machine_id))) : [];
  const count = table => moved.filter((_, index) => index % 2 === (table === 'facts' ? 0 : 1)).flat().length;
  const [waiting] = await keys(ctx, [WAITING]);
  const off = signInOn(ctx);
  if (off) await keys(ctx, [['UPDATE memory_keys SET expires_at = ? WHERE expires_at IS NULL OR expires_at > ?', [now(), now()]]]);
  console.log([
    `Moved ${count('facts')} facts and ${count('sessions')} chats to their people.`,
    waiting.length ? `Waiting for an owner, seen only by admins: ${waiting.map(row => `${row.machine_id} (${row.facts} facts, ${row.sessions} chats)`).join(', ')}. Give them to a person with ${SCRIPT} assign <machine-id> <email>.` : 'No notes wait for an owner.',
    off ? 'Old memory keys are off: each computer signs in to the company app instead.' : 'This app has no sign-in yet, so the admin key stays on.',
  ].join('\n'));
}

// The person is found by the subject their own signed-in chats recorded, never by an email someone typed alone.
async function assign(ctx, machineId, email) {
  const [[person]] = await keys(ctx, [['SELECT owner_subject AS subject FROM sessions WHERE lower(owner_email) = lower(?) AND owner_subject IS NOT NULL LIMIT 1', [email]]]);
  if (!person) throw new StoreError(`${email} has not used memory with the company sign-in yet; ask them to start one chat, then run assign again`);
  const moved = await keys(ctx, move(person.subject, email.toLowerCase(), machineId));
  console.log(`Gave ${moved[0].length} facts and ${moved[1].length} chats from computer ${machineId} to ${email}.`);
}

const USAGE = 'usage: member list | member remove <machine-id>';
export const MEMBER_COMMANDS = {
  member: (ctx, { positionals: [action, id] }) => {
    if (action === 'admin') return admin(ctx);
    if (action === 'add') throw new StoreError(RETIRED);
    if (action === 'list') return list(ctx);
    if (action === 'remove' && MACHINE_ID.test(id || '')) return remove(ctx, id);
    throw new StoreError(USAGE);
  },
  join: () => { throw new StoreError(RETIRED); },
  'migrate-people': migratePeople,
  assign: (ctx, { positionals: [machineId, email] }) => {
    if (!MACHINE_ID.test(machineId || '') || !/^[^\s@]+@[^\s@]+$/.test(email || '')) throw new StoreError(`usage: assign <machine-id> <email>`);
    return assign(ctx, machineId, email);
  },
};
