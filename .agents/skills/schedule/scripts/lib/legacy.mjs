// Compatibility management for deployed cloud jobs. Never create, provision or select a model.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { primaryRoot } from '../../../memory/scripts/lib/primary-root.mjs';
import { parseEnv } from '../../../memory/scripts/lib/store.mjs';
import { requireValue, ScheduleError } from './records.mjs';
import { normalizedReceipt } from './hosts.mjs';

export function legacyContext(cwd, env = process.env) {
  const roots = primaryRoot(cwd);
  const read = directory => existsSync(path.join(directory, '.env')) ? parseEnv(readFileSync(path.join(directory, '.env'), 'utf8')) : {};
  const record = directory => {
    const file = path.join(directory, '.claude/.wong-stack.json');
    return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).components?.routines : null;
  };
  return { roots, keys: { ...read(roots.root), ...read(roots.primary), ...env }, installed: record(roots.primary) ?? record(roots.root) };
}
export function legacyAdapter(context, { fetch: call = globalThis.fetch, timeoutMs = 15000 } = {}) {
  requireValue(context.installed?.url && context.keys.WONG_ROUTINES_KEY, 'No installed legacy management endpoint/key. New cloud setup is retired.');
  const route = id => `/routines/${encodeURIComponent(id)}`;
  async function request(method, endpoint) {
    let response;
    try {
      response = await call(`${context.installed.url.replace(/\/$/, '')}${endpoint}`, { method, redirect: 'manual', signal: AbortSignal.timeout(timeoutMs), headers: { Authorization: `Bearer ${context.keys.WONG_ROUTINES_KEY}` } });
    } catch { throw new ScheduleError('Legacy endpoint unavailable; mutation outcome may be unknown. Inspect before retrying.', 4); }
    const data = await response.json().catch(() => null);
    requireValue(response.ok && data?.ok === true && data.version === 1, 'Legacy endpoint refused or changed its receipt contract.');
    return data;
  }
  const inspect = async id => {
    const data = await request('GET', route(id));
    requireValue(data.routine?.id === id, 'Legacy management requires the full selected native ID.');
    return data.routine;
  };
  async function mutate(action, id) {
    await inspect(id);
    try { await request(action === 'cancel' ? 'DELETE' : 'POST', action === 'cancel' ? route(id) : `${route(id)}/${action}`); } catch { /* verify the exact job */ }
    const rows = (await request('GET', '/routines')).routines;
    const row = rows.find(each => each.id === id);
    const verified = action === 'cancel' ? !row : row?.status === (action === 'pause' ? 'paused' : 'active');
    return verified ? normalizedReceipt('legacy-cloud', action, row ?? { id, status: 'deleted' }, id) : { version: 1, host: 'legacy-cloud', action, nativeId: id, outcome: 'unknown' };
  }
  return { name: 'legacy-cloud', list: async () => (await request('GET', '/routines')).routines, inspect, pause: id => mutate('pause', id), resume: id => mutate('resume', id), cancel: id => mutate('cancel', id) };
}
export async function teardownLegacy(context, resources, { fetch: call = globalThis.fetch } = {}) {
  const installed = context.installed;
  requireValue(installed && context.keys.CLOUDFLARE_API_TOKEN && Array.isArray(resources) && resources.length > 0, 'Explicit recorded legacy resources and Cloudflare access are required.');
  const routes = {
    worker: `/accounts/${installed.accountId}/workers/scripts/${installed.worker}`,
    gateway: `/accounts/${installed.accountId}/ai-gateway/gateways/${installed.gateway}`,
    workflow: `/accounts/${installed.accountId}/workflows/${installed.worker}`,
    container: `/accounts/${installed.accountId}/containers/applications/${installed.containerId}`,
  };
  for (const resource of resources) requireValue(Object.hasOwn(routes, resource) && !routes[resource].endsWith('/undefined'), 'Only explicitly recorded legacy-owned resources can be removed; retain unknown IDs for manual teardown.');
  const adapter = legacyAdapter(context, { fetch: call });
  requireValue((await adapter.list()).length === 0, 'Legacy jobs still exist; explicitly move or remove them before teardown.');
  const outcomes = [];
  for (const resource of resources) {
    const endpoint = `https://api.cloudflare.com/client/v4${routes[resource]}`;
    const headers = { Authorization: `Bearer ${context.keys.CLOUDFLARE_API_TOKEN}` };
    try {
      await call(resource === 'worker' ? `${endpoint}?force=true` : endpoint, { method: 'DELETE', headers, redirect: 'manual' });
      const observed = await call(endpoint, { method: 'GET', headers, redirect: 'manual' });
      outcomes.push({ resource, verified: observed.status === 404 });
    } catch { outcomes.push({ resource, verified: false }); }
  }
  return { outcomes, complete: outcomes.every(row => row.verified), keysRetained: true };
}
export function legacyPromptStatus(prompt) {
  if (/^\/(?:routine|schedule)\s+(?:create|setup)/.test(prompt)) return { compatible: false, repairRequired: true };
  return { compatible: true, prompt: prompt.replace(/^\/improve(?=\s|$)/, '/improve-code').replace(/^\/dream(?=\s|$)/, '/dream-memory') };
}
