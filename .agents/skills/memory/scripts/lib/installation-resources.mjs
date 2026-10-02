import { accessConflicts } from '../../../../../scripts/lib-access-config.mjs';
import { providerCall, requireValue } from './installation-validation.mjs';

const binding = (worker, name) => worker.settings.bindings.find(row => row.name === name);
const validBindings = values => Array.isArray(values) && values.every(row => row && typeof row.name === 'string' && typeof row.type === 'string') && new Set(values.map(row => row.name)).size === values.length;
const variable = (worker, name) => { const row = binding(worker, name); return row?.type === 'plain_text' ? row.text : undefined; };

export async function inspectResources(operator, target) {
  const root = `/accounts/${target.accountId}`;
  const database = await providerCall(operator, 'GET', `${root}/d1/database/${target.databaseId}`);
  requireValue(database?.uuid === target.databaseId, 'target-mismatch');
  if (target.bucketName !== null) {
    const bucket = await providerCall(operator, 'GET', `${root}/r2/buckets/${target.bucketName}`);
    requireValue(bucket?.name === target.bucketName, 'target-mismatch');
  }
  const subdomain = await providerCall(operator, 'GET', `${root}/workers/subdomain`);
  requireValue(typeof subdomain?.subdomain === 'string' && /^[a-z0-9-]+$/.test(subdomain.subdomain), 'target-mismatch');
  const workers = [];
  for (const name of new Set([target.appWorkerName, target.memoryWorkerName])) {
    const info = await providerCall(operator, 'GET', `${root}/workers/workers/${name}`);
    const settings = await providerCall(operator, 'GET', `${root}/workers/scripts/${name}/settings`);
    requireValue(info?.name === name && /^[a-f0-9]{32}$/.test(info?.id || '') && Array.isArray(settings?.bindings), 'target-mismatch');
    requireValue((info.references?.domains === undefined || (Array.isArray(info.references.domains) && info.references.domains.every(row => typeof row?.hostname === 'string'))) &&
      (info.routes === undefined || (Array.isArray(info.routes) && info.routes.every(row => typeof row?.pattern === 'string'))), 'target-mismatch');
    // Settings can describe an uploaded version which is not serving traffic.
    const deployments = await providerCall(operator, 'GET', `${root}/workers/scripts/${name}/deployments?per_page=1`);
    const current = deployments?.deployments?.[0];
    const version = current?.versions?.[0];
    requireValue(current?.strategy === 'percentage' && Array.isArray(current.versions) && current.versions.length === 1 && version?.percentage === 100 &&
      typeof version.version_id === 'string' && /^[a-f0-9-]{36}$/.test(version.version_id), 'target-mismatch');
    const active = await providerCall(operator, 'GET', `${root}/workers/scripts/${name}/versions/${version.version_id}`);
    requireValue(active?.id === version.version_id && validBindings(active.resources?.bindings) && validBindings(settings.bindings), 'target-mismatch');
    const relevant = values => values.filter(row => /^(MEMORY_|CF_ACCESS_|WONG_ENVIRONMENT$|WORKSPACE_LOGIN$|SKIP_AUTH$)/.test(row.name))
      .map(row => [row.name, row.type, row.text ?? null, row.database_id ?? row.id ?? null, row.bucket_name ?? null]).sort(([a], [b]) => a.localeCompare(b));
    requireValue(JSON.stringify(relevant(settings.bindings)) === JSON.stringify(relevant(active.resources.bindings)), 'target-mismatch');
    const worker = { ...info, settings: { bindings: active.resources.bindings } };
    const db = binding(worker, 'MEMORY_DB');
    requireValue(db?.type === 'd1' && (db.database_id ?? db.id) === target.databaseId &&
      (db.id === undefined || db.id === target.databaseId), 'target-mismatch');
    const bucket = binding(worker, 'MEMORY_BUCKET');
    requireValue(target.bucketName === null ? !bucket : bucket?.type === 'r2_bucket' && bucket.bucket_name === target.bucketName, 'target-mismatch');
    requireValue(variable(worker, 'WONG_ENVIRONMENT') === 'production' && !binding(worker, 'SKIP_AUTH'), 'target-mismatch');
    workers.push(worker);
  }
  for (const [name, origin] of [[target.appWorkerName, target.appUrl], [target.memoryWorkerName, target.memoryOrigin]]) {
    const worker = workers.find(row => row.name === name);
    const host = new URL(origin).hostname;
    requireValue(host === `${name}.${subdomain.subdomain}.workers.dev` || worker.references?.domains?.some(row => row.hostname === host), 'target-mismatch');
  }
  return { workers, subdomain: subdomain.subdomain };
}

async function list(operator, path) {
  const result = [];
  for (let page = 1; page <= 100; page++) {
    const values = await providerCall(operator, 'GET', `${path}?per_page=50&page=${page}`);
    requireValue(Array.isArray(values), 'provider-unavailable');
    result.push(...values);
    if (values.length < 50) return result;
  }
  requireValue(false, 'provider-unavailable');
}
function exactMemoryOverride(destination) {
  const values = destination.overrides;
  return Array.isArray(values) && values.length === 1 && values[0] && Object.keys(values[0]).length === 2 &&
    values[0].behavior === 'public' && values[0].path_pattern === '/_memory/*';
}
function safeDestinations(app, workerId, target, resources) {
  if (!Array.isArray(app.destinations) || !app.destinations.every(row => row && typeof row === 'object') ||
      !app.destinations.some(row => row.type === 'worker' && row.worker_id === workerId)) return false;
  const memoryId = resources.workers.find(row => row.name === target.memoryWorkerName).id;
  const host = new URL(target.memoryOrigin).hostname;
  const appHost = new URL(target.appUrl).hostname;
  if (app.domain !== undefined && ![host, appHost].includes(app.domain)) return false;
  const overridden = app.destinations.filter(row => row.overrides?.length);
  // A public hostname destination takes precedence over its native Worker destination.
  // If opening memory, insist on the exact pair in this same Access application.
  if (overridden.length && (overridden.length !== 2 ||
      !overridden.some(row => row.type === 'worker' && row.worker_id === memoryId) ||
      !overridden.some(row => row.type === 'public' && row.uri === host))) return false;
  return app.destinations.every(row => {
    if (row.type === 'public' && ![appHost, host].includes(row.uri)) return false;
    if (!['worker', 'preview_worker', 'public'].includes(row.type)) return false;
    if (row.type !== 'public' && (typeof row.worker_id !== 'string' || !/^[a-f0-9]{32}$/.test(row.worker_id))) return false;
    if (!row.overrides?.length) return row.overrides === undefined || Array.isArray(row.overrides);
    return exactMemoryOverride(row) && ((row.type === 'worker' && row.worker_id === memoryId) || (row.type === 'public' && row.uri === host));
  });
}
function safePolicies(app, policies) {
  if (!policies.every(row => row && typeof row.id === 'string') || !Array.isArray(app.policies) ||
      !app.policies.every(ref => ref && typeof ref.id === 'string' && policies.some(row => row.id === ref.id)) ||
      !policies.every(row => app.policies.some(ref => ref.id === row.id))) return false;
  const human = policies.filter(row => row.decision === 'allow');
  if (human.length !== 1) return false;
  return policies.every(row => Array.isArray(row.include) && row.include.length > 0 &&
    [row.exclude, row.require].every(value => value === undefined || (Array.isArray(value) && !value.length)) && (
    row.decision === 'allow' ? row.include.every(rule => rule && Object.keys(rule).length === 1 &&
      typeof rule.email?.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rule.email.email) &&
      !/(?:\.invalid|@(?:[^@]*\.)?noreply\.github\.com)$/i.test(rule.email.email)) :
      row.decision === 'non_identity' && row.include.every(rule => rule && Object.keys(rule).length === 1 && typeof rule.service_token?.token_id === 'string' && rule.service_token.token_id.length > 0)));
}

// Closed placeholders are permitted. Optional machine exceptions are narrowly
// bounded here; actual edge reachability and version-origin refusal need probes.
export async function inspectProtection(operator, target, access, resources) {
  if (access === null || resources.workers.some(worker => variable(worker, 'WORKSPACE_LOGIN') === 'off')) return 'login-required';
  const root = `/accounts/${target.accountId}/access`;
  const organization = await providerCall(operator, 'GET', `${root}/organizations`);
  if (`https://${organization?.auth_domain}` !== access.issuer) return 'access-unverified';
  const allApps = await list(operator, `${root}/apps`);
  if (!allApps.every(app => app && typeof app.id === 'string' &&
      (app.domain === undefined || typeof app.domain === 'string') &&
      (app.destinations === undefined || (Array.isArray(app.destinations) && app.destinations.every(row => row && typeof row.type === 'string'))))) return 'access-unverified';
  for (const [name, appId] of [[target.appWorkerName, access.appApplicationId], [target.memoryWorkerName, access.memoryApplicationId]]) {
    const worker = resources.workers.find(row => row.name === name);
    const app = await providerCall(operator, 'GET', `${root}/apps/${appId}`);
    if (app?.id !== appId || app.type !== 'self_hosted' || typeof app.aud !== 'string' || !app.aud ||
        (name === target.appWorkerName && app.aud !== access.audience) || !Array.isArray(app.allowed_idps) || !app.allowed_idps.length ||
        !safeDestinations(app, worker.id, target, resources)) return 'access-unverified';
    if (variable(worker, 'CF_ACCESS_TEAM_DOMAIN') !== access.issuer.slice(8) || variable(worker, 'CF_ACCESS_AUD') !== app.aud ||
        variable(worker, 'CF_ACCESS_APP_ID') !== appId || variable(worker, 'CF_ACCESS_WORKER_ID') !== worker.id || binding(worker, 'WORKSPACE_LOGIN')) return 'access-unverified';
    if (accessConflicts(allApps, [worker], resources.subdomain, appId).length) return 'access-unverified';
    const policies = await list(operator, `${root}/apps/${appId}/policies`);
    if (!safePolicies(app, policies)) return 'access-unverified';
  }
  return null;
}
