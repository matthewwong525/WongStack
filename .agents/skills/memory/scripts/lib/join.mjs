// Install an already issued credential. Repository permission is the policy;
// the trusted admin's private transfer file proves it to this store.
import { readFileSync, statSync } from 'node:fs';
import { prepareAppLink, envKeyFile, writeEnvKey } from './members.mjs';
import { keyMachine, loadConfig, StoreError } from './store.mjs';

export async function joinStore(ctx, file) {
  if (!file) throw new StoreError('usage: join --file <private-credential-file>');
  const info = statSync(file);
  if (process.platform !== 'win32' && (info.mode & 0o077)) throw new StoreError('the credential file must be private (mode 600)');
  let input;
  try { input = JSON.parse(readFileSync(file, 'utf8')); } catch { throw new StoreError('the private credential file is invalid; request a fresh file from the admin'); }
  const config = loadConfig(ctx);
  if (!config.worker || input.worker !== config.worker || input.databaseId !== config.databaseId) throw new StoreError('credential belongs to another repository or Worker', { kind: 'auth' });
  if (input.machineId !== ctx.machineId || keyMachine(input.key) !== ctx.machineId) throw new StoreError('credential belongs to another installation', { kind: 'auth' });
  envKeyFile(ctx);
  let response;
  try { response = await fetch(`${config.worker.replace(/\/$/, '')}/caller`, { headers: { Authorization: `Bearer ${input.key}` }, signal: AbortSignal.timeout(15000) }); }
  catch { throw new StoreError('memory Worker unreachable; credential was not installed', { kind: 'network' }); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success || data.result?.machineId !== ctx.machineId) throw new StoreError('memory Worker refused this credential; ask the admin for a current replacement', { kind: 'auth' });
  const installed = writeEnvKey(ctx, input.key);
  const appUrl = await prepareAppLink(ctx, input.key);
  return { file: installed, appUrl, role: data.result.role };
}
export const JOIN_COMMANDS = { join: async (ctx, { values }) => {
  const result = await joinStore(ctx, values.file);
  console.log(`Installed ${result.role} repository memory access in ${result.file}; ordinary chats load and capture memory automatically. ${result.appUrl ? `Open the app and sign in normally: ${result.appUrl}` : 'The optional login association link is unavailable; memory access is installed.'}`);
} };
