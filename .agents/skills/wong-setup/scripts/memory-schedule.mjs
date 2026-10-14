#!/usr/bin/env node
// A cloud schedule's own memory sign-in, made by the owner: it reads and writes team facts only.
// The secret goes only to a file the schedule's secret store takes; it never prints. See wiki/stack/host-schedules.md
import { chmodSync, writeFileSync } from 'node:fs';
import { isAbsolute, relative } from 'node:path';
import { hashKey } from '../../memory/worker/memory-worker.mjs';
import { adminToken, checkouts, isMain, loadConfig, openStore, repoContext, StoreError } from '../../memory/scripts/lib/store.mjs';
import { parseCli } from '../../memory/scripts/lib/cli.mjs';
import { cloudflare } from './lib/cloudflare.mjs';

const USAGE = 'usage: memory-schedule.mjs make <name> --secret-file <path> | list | revoke <name>';
const NAME = /^[a-z0-9][a-z0-9-]{0,62}$/;
export const tokenName = name => `memory-schedule:${name}`;

const insideCheckout = (ctx, file) => checkouts(ctx).some(root => !relative(root, file).startsWith('..'));

export async function make(ctx, name, secretFile, cf) {
  if (!isAbsolute(secretFile || '') || insideCheckout(ctx, secretFile)) throw new StoreError('--secret-file must be an absolute path outside every checkout of this repo');
  const store = openStore(ctx, { admin: true });
  const [[taken]] = await store.batch([['SELECT 1 FROM memory_schedules WHERE name = ? AND revoked_at IS NULL', [name]]]);
  if (taken) throw new StoreError(`${name} already has a memory sign-in; revoke it first to make a new one`);
  const root = `/accounts/${loadConfig(ctx).accountId}/access/service_tokens`;
  const token = await cf('POST', root, { name: tokenName(name), duration: '8760h' });
  try {
    await store.batch([['INSERT INTO memory_schedules (client_id, name, secret_hash, token_id, created_at) VALUES (?, ?, ?, ?, ?)',
      [token.client_id, name, await hashKey(token.client_secret), token.id, new Date().toISOString()]]]);
  } catch (error) {
    await cf('DELETE', `${root}/${token.id}`).catch(() => {});
    throw error;
  }
  writeFileSync(secretFile, `WONG_MEMORY_CLIENT_ID=${token.client_id}\nWONG_MEMORY_CLIENT_SECRET=${token.client_secret}\n`, { mode: 0o600 });
  chmodSync(secretFile, 0o600);
  console.log(`Made ${tokenName(name)}. Put the two values in ${secretFile} into the schedule's own secret store, then delete the file.`);
}

export async function list(ctx) {
  const [rows] = await openStore(ctx, { admin: true }).batch([['SELECT name, created_at, revoked_at FROM memory_schedules ORDER BY name, created_at']]);
  console.log(rows.map(row => `- ${tokenName(row.name)} (made ${row.created_at.slice(0, 10)}, ${row.revoked_at ? 'revoked' : 'on'})`).join('\n') || 'No schedule sign-ins.');
}

// Revoking both: the store row stops the Worker at once, and the Cloudflare token goes so no copy outlives it.
export async function revoke(ctx, name, cf) {
  const store = openStore(ctx, { admin: true });
  const [rows] = await store.batch([['UPDATE memory_schedules SET revoked_at = ? WHERE name = ? AND revoked_at IS NULL RETURNING token_id', [new Date().toISOString(), name]]]);
  if (!rows.length) throw new StoreError(`${name} has no memory sign-in that is on`);
  const root = `/accounts/${loadConfig(ctx).accountId}/access/service_tokens`;
  for (const { token_id: id } of rows) if (id) await cf('DELETE', `${root}/${id}`).catch(error => { if (error.status !== 404) throw error; });
  console.log(`Revoked ${tokenName(name)}.`);
}

if (isMain(import.meta.url)) {
  const { values, positionals: [action, name] } = parseCli({ usage: USAGE, options: { 'secret-file': { type: 'string' } }, allowPositionals: true });
  const ctx = repoContext();
  const cf = () => cloudflare(adminToken(ctx));
  const named = () => { if (!NAME.test(name || '')) throw new StoreError(USAGE); return name; };
  const run = { make: () => make(ctx, named(), values['secret-file'], cf()), list: () => list(ctx), revoke: () => revoke(ctx, named(), cf()) }[action];
  if (!run) { console.error(USAGE); process.exit(2); }
  await run().catch(error => { console.error(`memory-schedule: ${error.message}`); process.exit(1); });
}
