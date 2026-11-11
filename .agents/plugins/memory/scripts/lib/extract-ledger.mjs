// An opaque task, not an answer cache. Reservations survive failed calls and process crashes.
import { createHash, randomUUID } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
export const EXTRACT_LIMITS = Object.freeze({ input: 12288, output: 3072, searches: 3, calls: 2, deadline: 20000, ttl: 86400000 });
export const bytes = text => Buffer.byteLength(text, 'utf8');
export function scopeOf(values = {}) {
  if (values.all || values.state) throw new Error('extract does not support --all or --state; use ordinary search');
  const allowed = ['author', 'branch', 'change', 'everyone', 'since', 'slug', 'tag', 'type', 'until'];
  return Object.fromEntries(allowed.filter(key => values[key]).sort().map(key => [key, values[key]]));
}
export const taskIdentity = (ctx, scope, caller) => createHash('sha256').update(JSON.stringify([ctx.commonDir || ctx.root, ctx.machineId, caller, scope])).digest('hex');
const directory = ctx => join(ctx.stateDir, 'extract-tasks');
function fileFor(ctx, handle) {
  if (!/^[a-f0-9-]{36}$/.test(handle || '')) throw new Error('invalid extract task handle');
  return join(directory(ctx), `${handle}.json`);
}
function save(file, value) {
  const temp = `${file}.${randomUUID()}.tmp`;
  writeFileSync(temp, JSON.stringify(value), { mode: 0o600 });
  renameSync(temp, file);
}
export function issueTask(ctx, identity, now = Date.now()) {
  const dir = directory(ctx);
  mkdirSync(dir, { recursive: true, mode: 0o700 }); chmodSync(dir, 0o700);
  const handle = randomUUID();
  save(fileFor(ctx, handle), { version: 1, identity, expires: now + EXTRACT_LIMITS.ttl, input: 0, output: 0, searches: 0, calls: 0, returned: [] });
  return handle;
}
export async function withTask(ctx, handle, identity, deadline, run) {
  const file = fileFor(ctx, handle), lock = `${file}.lock`;
  if (!existsSync(file)) throw new Error('extract task is missing; explicitly create one');
  while (true) {
    try { mkdirSync(lock, { mode: 0o700 }); break; } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() >= deadline) throw new Error('extract task is busy; deadline exhausted');
      await new Promise(resolve => setTimeout(resolve, Math.min(25, deadline - Date.now())));
    }
  }
  try {
    if (Date.now() >= deadline) throw new Error('extract task deadline exhausted');
    const ledger = JSON.parse(readFileSync(file, 'utf8'));
    if (ledger.version !== 1 || ledger.identity !== identity) throw new Error('extract task identity or scope mismatch');
    if (!Number.isFinite(ledger.expires) || !Array.isArray(ledger.returned) || ledger.returned.some(id => !Number.isSafeInteger(id) || id <= 0)
      || ['input', 'output', 'searches', 'calls'].some(key => !Number.isSafeInteger(ledger[key]) || ledger[key] < 0 || ledger[key] > EXTRACT_LIMITS[key])) throw new Error('invalid extract task state');
    if (Date.now() >= ledger.expires) throw new Error('extract task expired; explicitly create one');
    const reserve = (key, amount) => {
      if (!Number.isSafeInteger(amount) || amount < 0 || ledger[key] + amount > EXTRACT_LIMITS[key]) return false;
      ledger[key] += amount; save(file, ledger); return true;
    };
    const reserveWork = input => {
      if (!Number.isSafeInteger(input) || input < 0 || ledger.input + input > EXTRACT_LIMITS.input || ledger.calls >= EXTRACT_LIMITS.calls) return false;
      ledger.input += input; ledger.calls += 1; save(file, ledger); return true;
    };
    return await run({ ledger, reserve, reserveWork, remember: ids => { ledger.returned = [...new Set([...ledger.returned, ...ids])]; save(file, ledger); } });
  } finally { rmSync(lock, { recursive: true, force: true }); }
}
