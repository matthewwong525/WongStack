import { need, shaOK, digest, from64, to64 } from './security.mjs';
import { verificationHeaders } from './access.mjs';
import { runtimeFetch } from './runtime.mjs';

export const BUNDLE_LIMIT = 64 * 1024 * 1024;
const fileOK = name => typeof name === 'string' && /^[A-Za-z0-9_.@/-]{1,240}$/.test(name) && !name.includes('..') && !name.startsWith('/') && !name.startsWith('__wongstack_');
const moduleTypes = ['application/javascript+module', 'application/wasm', 'text/plain', 'application/octet-stream'];
export async function validateBundle(bundle, sha, projectId) {
  need(bundle?.format === 1 && bundle.sha === sha && shaOK(sha) && bundle.projectId === projectId, 'Bundle commit or tenant mismatch');
  need(Array.isArray(bundle.modules) && bundle.modules.length > 0 && bundle.modules.length <= 128 && Array.isArray(bundle.assets) && bundle.assets.length <= 10000 && Array.isArray(bundle.migrations) && bundle.migrations.length <= 256, 'Bundle inventory exceeds bounds');
  need(fileOK(bundle.main) && bundle.modules.some(row => row.name === bundle.main), 'Bundle entry module missing');
  let size = 0;
  const names = new Set();
  for (const row of [...bundle.modules, ...bundle.assets, ...bundle.migrations]) {
    const name = row.path || row.name;
    need(typeof name === 'string' && !names.has(name), 'Duplicate bundle file'); names.add(name);
    need(row.path ? row.path.startsWith('/') && fileOK(row.path.slice(1)) : fileOK(row.name), 'Unsafe bundle file name');
    const bytes = from64(row.content); size += bytes.length;
    need(size <= BUNDLE_LIMIT && /^[a-f0-9]{64}$/.test(row.digest || '') && await digest(bytes) === row.digest, 'Corrupt or oversized bundle');
  }
  need(bundle.modules.every(row => moduleTypes.includes(row.type)), 'Unsupported Worker module type');
  need(bundle.assets.every(row => typeof row.type === 'string' && row.type.length < 100), 'Unsupported asset content type');
  need(bundle.migrations.every(row => row.name.endsWith('.sql') && from64(row.content).length <= 1024 * 1024), 'Unsupported migration');
  return { bundle, digest: await digest(JSON.stringify(bundle)), size };
}

// This outer module belongs to the service, never to the candidate. Candidate code cannot select
// resource bindings or impersonate another tenant by overriding its own Wrangler configuration.
export function entryModule(bundle, projectId) {
  return `import candidate from './${bundle.main}';\n${runtimeFetch.toString()}\nexport default {fetch(request,env,ctx){return runtimeFetch(request,{...env,__WONGSTACK_SHA:${JSON.stringify(bundle.sha)},__WONGSTACK_PROJECT:${JSON.stringify(projectId)}},ctx,candidate)}};`;
}

export async function applyMigrations(state, provider, bundle, environment) {
  const database = state.resources.find(row => row.kind === 'd1' && row.environment === environment)?.id;
  need(database, 'Owned application database missing');
  await provider.query(database, 'CREATE TABLE IF NOT EXISTS wongstack_migrations (name TEXT PRIMARY KEY,digest TEXT NOT NULL,applied_at INTEGER NOT NULL)');
  for (const row of bundle.migrations) {
    const current = await provider.query(database, 'SELECT digest FROM wongstack_migrations WHERE name=?', [row.name]);
    const applied = current[0]?.results?.[0];
    if (applied) { need(applied.digest === row.digest, 'Applied migration bytes changed'); continue; }
    const sql = new TextDecoder().decode(from64(row.content));
    // The D1 query batch applies migration and receipt together; unsafe transaction/control
    // statements and service receipt mutation cannot bypass our owned migration ledger.
    need(!/\b(?:BEGIN|COMMIT|ROLLBACK|ATTACH|DETACH|wongstack_migrations)\b/i.test(sql), 'Migration contains reserved transaction/ledger statements');
    await provider.query(database, `${sql}\n;INSERT INTO wongstack_migrations(name,digest,applied_at) VALUES (?,?,?)`, [row.name, row.digest, Date.now()]);
  }
}
export async function uploadBundle(state, provider, bundle, environment) {
  need(state.access?.verified, 'Verified private Access configuration required');
  await validateBundle(bundle, bundle.sha, state.id);
  const worker = state.resources.find(row => row.kind === 'worker' && row.environment === environment)?.name;
  const database = state.resources.find(row => row.kind === 'd1' && row.environment === environment)?.id;
  need(worker && database && ['production', 'staging'].includes(environment), 'Owned deployment target missing');
  const bindings = [{ type: 'd1', name: 'DB', id: database }, { type: 'assets', name: 'ASSETS' }, { type: 'plain_text', name: 'CF_ACCESS_TEAM_DOMAIN', text: state.access.teamDomain }, { type: 'plain_text', name: 'CF_ACCESS_AUD', text: state.access.audience }, { type: 'secret_text', name: '__WONGSTACK_RUNTIME', text: state.runtimeSecret }];
  need(state.access.workers?.some(row => row.name === worker && /^[a-f0-9]{32}$/.test(row.id)), 'Actual owned Access Worker identity missing');
  bindings.push({ type: 'plain_text', name: 'CF_ACCESS_APP_ID', text: state.access.appId }, { type: 'plain_text', name: 'CF_ACCESS_WORKER_ID', text: state.access.workers.find(row => row.name === worker).id }, { type: 'plain_text', name: 'WONG_ENVIRONMENT', text: environment });
  if (environment === 'production') {
    bindings.push({ type: 'd1', name: 'MEMORY_DB', id: state.resources.find(row => row.kind === 'd1' && row.environment === 'memory').id }, { type: 'r2_bucket', name: 'MEMORY_BUCKET', bucket_name: state.resources.find(row => row.kind === 'r2').name });
  }
  const modules = [...bundle.modules, { name: '__wongstack_entry.mjs', type: 'application/javascript+module', content: to64(new TextEncoder().encode(entryModule(bundle, state.id))) }];
  const assets = await provider.assets(worker, bundle.assets);
  const version = await provider.version(worker, modules, bindings, assets);
  const url = await provider.routing(worker, environment === 'staging' ? version : undefined);
  return { version, url, target: worker };
}
export async function verifyIdentity(state, receipt, sha, fetcher = (...args) => fetch(...args)) {
  const response = await fetcher(`${receipt.url}/__wongstack/identity`, { redirect: 'manual', headers: { ...verificationHeaders(state), 'X-WongStack-Runtime': state.runtimeSecret } });
  need(response.ok, 'Private preview identity unreadable', 502);
  const row = await response.json();
  need(row.sha === sha && row.projectId === state.id, 'Private preview serves a different commit or tenant');
}
