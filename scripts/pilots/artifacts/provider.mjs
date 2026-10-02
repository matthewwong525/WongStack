import { readFileSync } from 'node:fs';

const part = value => encodeURIComponent(value);
export class CloudflareProvider {
  constructor(account, credentials, namespace, fetcher = fetch) {
    if (!/^[a-f0-9]{32}$/i.test(account) || !credentials.token) throw new Error('Explicit account and private credential file required');
    this.account = account; this.credentials = credentials; this.namespace = namespace; this.fetcher = fetcher; this.operations = 0;
  }
  async request(path, method = 'GET', body, allow404 = false) {
    this.operations += 1;
    const multipart = body instanceof FormData;
    const token = path.includes('/builds/') ? this.credentials.buildsApiToken : this.credentials.token;
    if (!token) throw new Error('Separate user-scoped Builds API credential required');
    const response = await this.fetcher(`https://api.cloudflare.com/client/v4${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(!multipart ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: multipart ? body : JSON.stringify(body) } : {}) });
    if (allow404 && response.status === 404) return null;
    if (response.status === 204) { this.lastResultInfo = undefined; return null; }
    const result = await response.json().catch(() => { throw new Error(`Cloudflare ${method} ${path}: HTTP ${response.status}, invalid JSON response`); });
    if (!response.ok || result.success === false) throw new Error(`Cloudflare ${method} ${path}: HTTP ${response.status}, code ${result.errors?.[0]?.code || 'unknown'}`);
    this.lastResultInfo = result.result_info;
    return result.result;
  }
  path(suffix) { return `/accounts/${this.account}/${suffix}`; }
  artifact(suffix) { return this.path(`artifacts/namespaces/${part(this.namespace)}${suffix ? `/${suffix}` : ''}`); }
  async preflight() {
    const account = await this.request(this.path(''));
    const namespaces = await this.request(this.path('artifacts/namespaces?limit=20'));
    const subscriptions = await this.request(this.path('subscriptions'));
    const paid = subscriptions.some(row => /workers.*(paid|standard)|workers paid/i.test(`${row.rate_plan?.id || ''} ${row.rate_plan?.public_name || ''} ${row.rate_plan?.scope || ''}`));
    if (!paid) throw new Error('Workers Paid entitlement not observed; do not change billing');
    return { account: this.account, name: account.name, paid, artifactsReadable: true, namespaceCount: Array.isArray(namespaces) ? namespaces.length : null, at: new Date().toISOString(), operations: this.operations };
  }
  async find(spec) {
    if (['build-trigger', 'build-connection'].includes(spec.kind)) {
      if (!spec.workerTag) throw new Error('Manifest-owned staging Worker tag required');
      const triggers = await this.request(this.path(`builds/workers/${part(spec.workerTag)}/triggers`));
      if (spec.kind === 'build-trigger') return triggers.find(row => spec.id ? row.trigger_uuid === spec.id : row.trigger_name === spec.name) || null;
      const reference = triggers.find(row => spec.id && row.repo_connection?.repo_connection_uuid === spec.id);
      if (reference) return reference.repo_connection;
      // The API exposes no connection GET/list. Absence requires DELETE acknowledgment
      // and no remaining trigger reference; never invent a readback endpoint.
      if (spec.deletionAcknowledged) return null;
      if (!spec.id && spec.freshRepository) return null;
      throw new Error('Connection absence needs deletion acknowledgment and trigger reference readback');
    }
    if (spec.kind === 'namespace') return this.request(this.artifact(''), 'GET', undefined, true);
    if (spec.kind === 'repo') return this.request(this.artifact(`repos/${part(spec.name)}`), 'GET', undefined, true);
    if (spec.kind === 'worker') return this.request(this.path(`workers/scripts/${part(spec.name)}/settings`), 'GET', undefined, true);
    if (spec.kind === 'workflow') return this.request(this.path(`workflows/${part(spec.name)}`), 'GET', undefined, true);
    if (spec.kind === 'container') {
      const rows = await this.request(this.path('containers/applications'));
      return (Array.isArray(rows) ? rows : rows.applications || []).find(row => spec.id ? row.id === spec.id : row.name === spec.name) || null;
    }
    if (spec.kind === 'durable-object') {
      for (let page = 1; page <= 100; page++) {
        const rows = await this.request(this.path(`workers/durable_objects/namespaces?per_page=100&page=${page}`));
        const found = rows.find(row => spec.id ? row.id === spec.id : row.script === spec.script && row.class === spec.class);
        if (found) return found;
        if (rows.length < 100 || this.lastResultInfo?.total_pages <= page) return null;
      }
      throw new Error('Namespace readback exceeded pagination bound; absence is unproven');
    }
    if (spec.kind === 'd1') {
      if (spec.id) return this.request(this.path(`d1/database/${part(spec.id)}`), 'GET', undefined, true);
      return (await this.request(this.path(`d1/database?per_page=100&name=${part(spec.name)}`))).find(row => row.name === spec.name) || null;
    }
    if (spec.kind === 'r2') return this.request(this.path(`r2/buckets/${part(spec.name)}`), 'GET', undefined, true);
    throw new Error('Unsupported resource kind');
  }
  async create(spec) {
    if (spec.kind === 'namespace') {
      await this.request(this.path('artifacts/namespaces'), 'POST', { namespace: spec.name });
      return { id: spec.name };
    }
    if (spec.kind === 'repo') {
      const result = await this.request(this.artifact('repos'), 'POST', { name: spec.name, default_branch: 'main', description: 'Disposable WongStack Artifacts pilot' });
      const initial = await this.request(this.artifact(`repos/${part(spec.name)}/tokens?state=active&per_page=100&page=1`));
      return { id: result.id, remote: result.remote, initialTokenIDs: initial.map(row => row.id) };
    }
    if (spec.kind === 'd1') { const result = await this.request(this.path('d1/database'), 'POST', { name: spec.name }); return { id: result.uuid }; }
    if (spec.kind === 'r2') { await this.request(this.path('r2/buckets'), 'POST', { name: spec.name }); return { id: spec.name }; }
    if (spec.kind === 'worker') {
      const form = new FormData();
      form.set('metadata', new Blob([JSON.stringify({ main_module: 'worker.mjs', compatibility_date: '2026-10-01' })], { type: 'application/json' }));
      form.set('worker.mjs', new Blob(['export default {fetch(){return new Response("Uninitialized disposable pilot",{status:503})}}'], { type: 'application/javascript+module' }), 'worker.mjs');
      await this.request(this.path(`workers/scripts/${part(spec.name)}`), 'PUT', form);
      return { id: spec.name };
    }
    throw new Error(`${spec.kind} is created by controller deployment; capture its explicit receipt afterward`);
  }
  async delete(spec) {
    if (spec.kind === 'namespace') {
      // Operator-authorized compatibility probe: no documented namespace-delete contract as of
      // 2026-10-01. A refusal is evidence and an explicit metadata leftover, never a passed cleanup.
      return this.request(this.artifact(''), 'DELETE', undefined, true);
    }
    const suffix = {
      'build-trigger': `builds/triggers/${part(spec.id)}`,
      'build-connection': `builds/repos/connections/${part(spec.id)}`,
      repo: `artifacts/namespaces/${part(this.namespace)}/repos/${part(spec.name)}`,
      worker: `workers/scripts/${part(spec.name)}?force=true`,
      d1: `d1/database/${part(spec.id)}`, r2: `r2/buckets/${part(spec.name)}`,
      workflow: `workflows/${part(spec.name)}`, container: `containers/applications/${part(spec.id)}`,
    }[spec.kind];
    if (spec.kind === 'durable-object') {
      // Worker deletion removes associated namespaces; confirm by list, never delete unrelated namespaces.
      if (await this.find(spec)) throw new Error('Durable Object namespace remains after controller deletion');
      return;
    }
    if (!suffix) throw new Error('Unsupported resource teardown');
    await this.request(this.path(suffix), 'DELETE', undefined, true);
    if (spec.kind === 'build-connection') spec.deletionAcknowledged = true;
  }
  async revoke(credential) {
    if (credential.kind === 'build-registration') {
      if (!credential.id || credential.status === 'creating') throw new Error('Interrupted build token registration requires receipt reconciliation');
      await this.request(this.path(`builds/tokens/${part(credential.id)}`), 'DELETE', undefined, true);
      for (let page = 1; page <= 100; page++) {
        const rows = await this.request(this.path(`builds/tokens?page=${page}&per_page=100`));
        if (rows.some(row => row.build_token_uuid === credential.id)) throw new Error('Build token registration remains after deletion');
        if (rows.length < 100) return;
      }
      throw new Error('Build token absence exceeded pagination bound');
    }
    if (['management', 'r2', 'build-deployment'].includes(credential.kind)) {
      if (!this.credentials.adminToken) throw new Error('Separate existing token-management credential required for management-token teardown');
      const admin = new CloudflareProvider(this.account, { token: this.credentials.adminToken }, this.namespace, this.fetcher);
      return admin.request(credential.issuer === 'account' ? this.path(`tokens/${part(credential.id)}`) : `/user/tokens/${part(credential.id)}`, 'DELETE');
    }
    return this.request(this.artifact(`tokens/${part(credential.id)}`), 'DELETE', undefined, true);
  }
  async quiesce(manifest) {
    if (manifest.backend === 'workers-builds' && !manifest.quiesced?.buildsStopped) throw new Error('Managed build cancellation/terminal readbacks required before cleanup');
    const controller = manifest.resources.find(row => row.kind === 'worker' && row.name.endsWith('-controller') && row.status === 'created');
    if (!controller) return;
    // Updating settings alone cannot safely change event subscriptions. The caller must stop the DO,
    // disable the trigger through the trusted config, and terminate every Workflow instance first.
    if (!manifest.quiesced?.triggersDisabled || !manifest.quiesced?.instancesStopped || !manifest.quiesced?.controllerStopped) throw new Error('Recorded trigger disable, controller stop, and Workflow termination receipts required before cleanup');
  }
  async seed(dbID, sql) { return this.request(this.path(`d1/database/${part(dbID)}/query`), 'POST', { sql }); }
}

export const credentialsFile = file => {
  const value = JSON.parse(readFileSync(file, 'utf8'));
  if (typeof value.token !== 'string' || !value.token) throw new Error('Private credential file needs token');
  return value;
};
