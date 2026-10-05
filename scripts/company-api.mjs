#!/usr/bin/env node
// Installed memory remains independent of standalone employee company transport.
import { readFileSync } from 'node:fs';
import { primaryRoot } from '../.agents/skills/memory/scripts/lib/primary-root.mjs';
import { isMain, parseCli } from './lib-cli.mjs';
import { memoryOperations, callMemory } from '../.agents/skills/memory/scripts/operations.mjs';
import { selectOperations, parseOperationInput } from '../.agents/skills/memory/scripts/lib/operations.mjs';
import { companyClient as transport } from './employee-bootstrap.mjs';
export { companyOrigin, cloudflared, loginUrl } from './employee-bootstrap.mjs';
export function companyClient(options = {}) { return transport({ root: options.root || primaryRoot().root, onboarding: false, ...options }); }

export async function combinedList(client, { scope = 'all', ...filters } = {}) {
  if (!['all', 'company', 'memory'].includes(scope)) throw new Error('Use company, memory or all scope');
  const { limit = 20, offset = 0 } = filters;
  const memory = selectOperations(memoryOperations, { ...filters, limit: 50, offset: 0 });
  // Validate requested bounds even when a company connection is absent.
  selectOperations([], { ...filters, limit, offset });
  if (scope === 'company') return client.list(filters);
  let company = { actions: [], total: 0, revision: null }, companyStatus = 'not_requested';
  if (scope === 'all') try {
    company = await client.list({ ...filters, limit, offset });
    companyStatus = 'available';
  } catch { companyStatus = 'unavailable; use company login'; }
  const memoryOffset = Math.max(0, offset - company.total);
  const actions = [...company.actions, ...memory.actions.slice(memoryOffset, memoryOffset + Math.max(0, limit - company.actions.length))];
  const total = company.total + memory.total;
  const ids = new Set();
  for (const item of actions) { if (ids.has(item.operationId)) throw new Error('Operation ID collision'); ids.add(item.operationId); }
  return { total, offset, next: offset + limit < total ? offset + limit : null, actions, companyStatus,
    revisions: { company: company.revision, memory: memoryOperations[0].revision } };
}
const USAGE = 'usage: company-api.mjs login [--origin <HTTPS origin>] | list [--scope all|company|memory] [--q words] [--app name] [--limit 1..50] [--offset n] | describe <id> | call <id> --file <JSON file or ->';
if (isMain(import.meta.url)) {
  const { positionals: [command, id, ...extra], values } = parseCli({ usage: USAGE, allowPositionals: true, options: Object.fromEntries(['origin', 'state', 'scope', 'q', 'app', 'limit', 'offset', 'file'].map(name => [name, { type: 'string' }])) });
  try {
    if (extra.length) throw new Error(USAGE);
    const client = companyClient({ stateDir: values.state, onLoginUrl: link => console.error(`Sign in with your own company account: ${link}`) });
    let result;
    if (command === 'login') result = await client.login(values.origin);
    else if (command === 'list') result = await combinedList(client, { scope: values.scope, q: values.q, app: values.app, limit: values.limit === undefined ? 20 : Number(values.limit), offset: values.offset === undefined ? 0 : Number(values.offset) });
    else if (command === 'describe') result = id?.startsWith('memory.') ? memoryOperations.find(operation => operation.operationId === id) : await client.describe(id);
    else if (command === 'call') result = id?.startsWith('memory.') ? await callMemory(id, parseOperationInput(readFileSync(values.file === '-' ? 0 : values.file, 'utf8'))) : await client.call(id, parseOperationInput(readFileSync(values.file === '-' ? 0 : values.file, 'utf8')));
    else throw new Error(USAGE);
    if (!result) throw new Error('Unknown operation');
    const packet = command === 'call' && ['memory.documents', 'memory.recall'].includes(id);
    console.log(JSON.stringify(result, null, packet ? undefined : 2));
    // A returned error is still printed, and ends as a failure a script can see.
    if (command === 'call' && result.error && typeof result.error === 'object') process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
