import { need, uuidOK, digest, to64 } from './security.mjs';
import { runtimeSource } from './runtime.mjs';

export function bootstrapBindings(state, environment, published = false) {
  need(['production', 'memory'].includes(environment) && state.access?.verified === true, 'Protected production bootstrap target required');
  const owned = (kind, env) => {
    const rows = state.resources.filter(row => row.kind === kind && row.environment === env);
    need(rows.length === 1 && rows[0].status === 'created' && rows[0].name && rows[0].id, 'Exact owned bootstrap resource required');
    return rows[0];
  };
  const database = owned('d1', 'memory');
  const databases = state.resources.filter(row => row.kind === 'd1');
  need(databases.length === 3 && databases.every(row => uuidOK(row.id) && row.status === 'created') && new Set(databases.map(row => row.id)).size === 3 && ['production', 'staging', 'memory'].every(env => databases.some(row => row.environment === env)), 'Bootstrap database environments must be distinct');
  const worker = owned('worker', environment);
  const actual = state.access.workers?.filter(row => row.name === worker.name);
  need(actual?.length === 1 && /^[a-f0-9]{32}$/.test(actual[0].id) && new Set(state.access.workers.map(row => row.id)).size === state.access.workers.length, 'Actual Access bootstrap Worker identity required');
  need(state.access.appId && state.access.audience && /^[a-z0-9-]+\.cloudflareaccess\.com$/.test(state.access.teamDomain || '') && state.runtimeSecret, 'Verified Access bootstrap configuration required');
  const bindings = [
    { type: 'd1', name: 'MEMORY_DB', id: database.id },
    { type: 'plain_text', name: 'WONG_ENVIRONMENT', text: 'production' },
    { type: 'plain_text', name: 'CF_ACCESS_TEAM_DOMAIN', text: state.access.teamDomain },
    { type: 'plain_text', name: 'CF_ACCESS_AUD', text: state.access.audience },
    { type: 'plain_text', name: 'CF_ACCESS_APP_ID', text: state.access.appId },
    { type: 'plain_text', name: 'CF_ACCESS_WORKER_ID', text: actual[0].id },
    { type: 'secret_text', name: '__WONGSTACK_RUNTIME', text: state.runtimeSecret },
  ];
  const buckets = state.resources.filter(row => row.kind === 'r2');
  need(buckets.length <= 1 && buckets.every(row => row.environment === 'memory' && row.status === 'created' && row.id === row.name), 'Exact owned memory bucket required');
  if (buckets.length) bindings.push({ type: 'r2_bucket', name: 'MEMORY_BUCKET', bucket_name: buckets[0].name });
  if (environment === 'production') bindings.push({ type: 'd1', name: 'DB', id: owned('d1', 'production').id });
  if (published) { need(environment === 'production', 'Memory Worker cannot bind business assets'); bindings.push({ type: 'assets', name: 'ASSETS' }); }
  return { worker, bindings };
}

export function bootstrapModule(projectId) {
  return `${runtimeSource}\nconst pending={fetch(){return new Response('Installation setup is pending',{status:503,headers:{'Cache-Control':'no-store'}})}};\nexport default {fetch(request,env,ctx){return runtimeFetch(request,{...env,__WONGSTACK_SHA:'bootstrap',__WONGSTACK_PROJECT:${JSON.stringify(projectId)}},ctx,pending)}};`;
}

// Receipt-bound initial wiring only. Uncertain uploads/deployments never replay;
// approved publication is authoritative and must never be replaced by bootstrap.
export async function wireBootstrap(state, provider, checkpoint) {
  state.bootstrap ||= {};
  for (const environment of ['production', 'memory']) {
    const { worker, bindings } = bootstrapBindings(state, environment, environment === 'production' && Boolean(state.production));
    const identity = await provider.request(provider.path(`workers/workers/${encodeURIComponent(worker.name)}`));
    need(identity?.id === bindings.find(binding => binding.name === 'CF_ACCESS_WORKER_ID').text, 'Actual bootstrap Worker identity changed');
    let receipt = state.bootstrap[environment];
    if (environment === 'production' && state.production) {
      need(receipt?.status === 'verified', 'Published application cannot be replaced by initial bootstrap');
      const current = await provider.currentDeployment(worker.name);
      need(current.versions[0].version_id === state.production.version, 'Published application deployment changed');
      await provider.verifyVersion(worker.name, state.production.version, bindings);
    } else {
      if (!receipt) {
        need(!state.publication && uuidOK(worker.initialVersion) && uuidOK(worker.initialDeployment), 'Initial Worker receipt required before bootstrap');
        const current = await provider.currentDeployment(worker.name);
        need(current.id === worker.initialDeployment && current.versions[0].version_id === worker.initialVersion, 'Initial Worker changed; bootstrap cannot replace existing code');
        await provider.verifyVersion(worker.name, worker.initialVersion, []);
        const source = bootstrapModule(state.id);
        receipt = state.bootstrap[environment] = { target: worker.name, digest: await digest(source), status: 'uploading' };
        await checkpoint();
        receipt.version = await provider.version(worker.name, [{ name: '__wongstack_entry.mjs', type: 'application/javascript+module', content: to64(new TextEncoder().encode(source)) }], bindings);
        receipt.status = 'uploaded'; await checkpoint();
      }
      need(receipt.target === worker.name && ['uploaded', 'deployed', 'verified'].includes(receipt.status), 'Interrupted bootstrap requires operator reconciliation');
      if (receipt.status === 'uploaded') {
        receipt.status = 'deploying'; await checkpoint();
        receipt.deployment = await provider.deploy(worker.name, receipt.version);
        receipt.status = 'deployed'; await checkpoint();
      }
      // 'deployed' is also a safe resume point after a successful acknowledged
      // deployment; routing/readback failures cannot trigger another upload.
      await provider.verifyVersion(worker.name, receipt.version, bindings);
      const current = await provider.currentDeployment(worker.name);
      need(current.id === receipt.deployment && current.versions[0].version_id === receipt.version, 'Bootstrap active deployment differs');
    }
    const origin = await provider.routing(worker.name, undefined, receipt.status === 'verified');
    need(!receipt.origin || receipt.origin === origin, 'Pinned bootstrap origin changed');
    receipt.origin = origin; receipt.status = 'verified'; await checkpoint();
  }
  return { appUrl: state.bootstrap.production.origin, memoryOrigin: state.bootstrap.memory.origin };
}
