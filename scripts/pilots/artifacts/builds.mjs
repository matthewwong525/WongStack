// Trusted managed-build adapter. Candidate tests never receive this capability.
import { branchName, shaOK } from './core.mjs';
import { buildResult, deploymentResult } from './pipeline.mjs';

const need = (condition, message) => { if (!condition) throw new Error(message); };
const quote = value => `'${String(value).replaceAll("'", "'\\''")}'`;
export function managedConfig(config) {
  need(config.backend === 'workers-builds' && config.builds?.trigger && config.builds?.connection && config.builds?.workerTag && config.builds?.repoID, 'Acknowledged managed-build configuration required');
  need(config.staging?.startsWith(`wong-artifacts-pilot-${config.run}-`) && config.production?.startsWith(`wong-artifacts-pilot-${config.run}-`) && config.staging !== config.production && config.stagingDB && config.productionDB && config.stagingDB !== config.productionDB, 'Unexpected managed-build targets');
  return config.builds;
}
export function managedTrigger(config, token) {
  const b = managedConfig(config);
  need(token && token !== b.managementTokenID, 'Fresh build token registration required');
  const wrangler = { name: config.staging, account_id: config.account, main: 'built-worker.mjs', compatibility_date: '2026-10-01', workers_dev: true, preview_urls: true, d1_databases: [{ binding: 'DB', database_id: config.stagingDB, database_name: config.staging }] };
  return {
    external_script_id: b.workerTag, repo_connection_uuid: b.connection, build_token_uuid: token,
    trigger_name: `wong-artifacts-pilot-${config.run}-managed`, root_directory: '/',
    build_command: 'PILOT_COMMIT="$WORKERS_CI_COMMIT_SHA" npm run build',
    deploy_command: `printf %s ${quote(JSON.stringify(wrangler))} > pilot-wrangler.json && npx --yes wrangler@4.146.0 versions upload --config pilot-wrangler.json --no-bundle`,
    branch_includes: ['*'], branch_excludes: ['*'], path_includes: ['*'], path_excludes: [], build_caching_enabled: false,
  };
}
export function validateTrigger(trigger, config) {
  const b = managedConfig(config), expected = managedTrigger(config, trigger.build_token_uuid || 'registered');
  need(trigger.trigger_uuid === b.trigger && trigger.external_script_id === b.workerTag && trigger.repo_connection?.repo_connection_uuid === b.connection && String(trigger.repo_connection?.repo_id) === String(b.repoID) && trigger.repo_connection?.repo_name === config.repo, 'Managed trigger repository/Worker mismatch');
  for (const field of ['branch_includes', 'branch_excludes', 'path_includes', 'path_excludes', 'build_command', 'deploy_command', 'root_directory', 'build_caching_enabled']) need(JSON.stringify(trigger[field]) === JSON.stringify(expected[field]), `Unsafe managed trigger ${field}`);
  return trigger;
}
export function managedReceipt(receipt, logs, config, sha, ref, id) {
  const b = managedConfig(config), metadata = receipt.build_trigger_metadata;
  need(receipt.build_uuid === id && receipt.status === 'stopped' && receipt.build_outcome === 'success', 'Managed build did not finish successfully');
  validateTrigger(receipt.trigger, config);
  need(metadata?.branch === branchName(ref) && metadata.commit_hash === sha && metadata.repo_name === config.repo, 'Managed build checked out a different commit or branch');
  const result = buildResult(logs, sha, 0), deployment = deploymentResult(logs, config, 'staging');
  need(!receipt.preview_url || new URL(receipt.preview_url).origin === new URL(deployment.url).origin, 'Managed receipt preview differs from reported immutable version');
  return { result, deployment, build: { id, status: receipt.status, outcome: receipt.build_outcome, sha, branch: metadata.branch, trigger: b.trigger, connection: b.connection, workerTag: b.workerTag, createdOn: receipt.created_on, stoppedOn: receipt.stopped_on } };
}

export class ManagedBuilds {
  constructor(config, request, step, fetcher = (...args) => fetch(...args)) { this.config = config; this.request = request; this.step = step; this.fetcher = fetcher; }
  path(suffix) { return `/accounts/${this.config.account}/builds/${suffix}`; }
  async triggers() { return this.request(this.path(`workers/${encodeURIComponent(managedConfig(this.config).workerTag)}/triggers`)); }
  async start(sha, ref) {
    need(shaOK(sha), 'Exact build commit required');
    const b = managedConfig(this.config);
    const triggers = await this.triggers();
    need(triggers.length === 1, 'Only the manifest-owned manual trigger may exist');
    validateTrigger(triggers[0], this.config);
    const receipt = await this.request(this.path(`triggers/${encodeURIComponent(b.trigger)}/builds`), 'POST', { branch: branchName(ref), commit_hash: sha });
    need(receipt?.build_uuid, 'Managed build returned no receipt');
    return receipt.build_uuid;
  }
  get(id) { return this.request(this.path(`builds/${encodeURIComponent(id)}`)); }
  cancel(id) { return this.request(this.path(`builds/${encodeURIComponent(id)}/cancel`), 'PUT'); }
  async logs(id) {
    let cursor, output = '', seen = new Set();
    for (let page = 0; page < 100; page++) {
      const result = await this.request(this.path(`builds/${encodeURIComponent(id)}/logs${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`));
      need(Array.isArray(result.lines), 'Unreadable managed build logs');
      output += result.lines.map(line => { need(Array.isArray(line) && typeof line[1] === 'string', 'Unreadable managed log line'); return line[1]; }).join('\n') + '\n';
      need(output.length < 1048576, 'Managed build log bound reached');
      if (!result.truncated) return output;
      need(result.cursor && !seen.has(result.cursor), 'Managed log pagination did not advance');
      cursor = result.cursor; seen.add(cursor);
    }
    throw new Error('Managed log pagination bound reached');
  }
  async preview(sha, ref, record) {
    // No retries around starting a build: an ambiguous POST must be reconciled.
    const id = await this.step.do(`managed-start-${sha}`, { retries: { limit: 0 }, timeout: '1 minute' }, () => this.start(sha, ref));
    await record(id);
    for (let poll = 0; poll < 120; poll++) {
      const receipt = await this.step.do(`managed-status-${id}-${poll}`, { retries: { limit: 0 }, timeout: '1 minute' }, () => this.get(id));
      if (receipt.status === 'stopped') {
        return this.step.do(`managed-result-${id}`, { retries: { limit: 0 }, timeout: '2 minutes' }, async () => {
          const result = managedReceipt(receipt, await this.logs(id), this.config, sha, ref, id);
          const version = await this.request(`/accounts/${this.config.account}/workers/scripts/${encodeURIComponent(this.config.staging)}/versions/${encodeURIComponent(result.deployment.version)}`, 'GET', undefined, false, 'deployment');
          need(version?.id === result.deployment.version && version.resources?.bindings?.length === 1 && version.resources.bindings[0].type === 'd1' && version.resources.bindings[0].name === 'DB' && version.resources.bindings[0].id === this.config.stagingDB, 'Managed version has unexpected runtime bindings');
          return result;
        });
      }
      await this.step.sleep(`managed-wait-${id}-${poll}`, '10 seconds');
    }
    await this.cancel(id);
    throw new Error('Managed build exceeded twenty-minute bound; cancellation requested');
  }
  async publish(candidate) {
    const config = this.config; managedConfig(config);
    need(shaOK(candidate.sha) && typeof candidate.code === 'string' && /^[A-Za-z0-9+/=]+$/.test(candidate.code), 'Approved immutable artifact required');
    const form = new FormData();
    form.set('metadata', new Blob([JSON.stringify({ main_module: 'worker.mjs', compatibility_date: '2026-10-01', bindings: [{ type: 'd1', name: 'DB', id: config.productionDB }] })], { type: 'application/json' }));
    form.set('worker.mjs', new Blob([atob(candidate.code)], { type: 'application/javascript+module' }), 'worker.mjs');
    const uploaded = await this.request(`/accounts/${config.account}/workers/scripts/${encodeURIComponent(config.production)}`, 'PUT', form, false, 'deployment');
    need(uploaded?.version_id, 'Production upload returned no immutable version');
    const subdomain = await this.request(`/accounts/${config.account}/workers/subdomain`, 'GET', undefined, false, 'deployment');
    need(subdomain?.subdomain, 'Production URL is unreadable');
    const response = await this.fetcher(`https://${config.production}.${subdomain.subdomain}.workers.dev/identity`, { redirect: 'manual' });
    need(response.ok && (await response.json()).commit === candidate.sha, 'Production identity differs; reservation retained');
    return { version: uploaded.version_id };
  }
}
