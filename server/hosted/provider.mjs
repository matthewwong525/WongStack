import { need, https, uuidOK, shaOK, from64, digest } from './security.mjs';

const part = encodeURIComponent;
export class HostedProvider {
  constructor(config, token, fetcher = (...args) => fetch(...args)) {
    need(/^[a-f0-9]{32}$/.test(config.account || '') && token, 'Service provider configuration missing');
    this.config = config; this.token = token; this.fetcher = fetcher;
  }
  async request(path, method = 'GET', body, absent = false, token = this.token) {
    const multipart = body instanceof FormData;
    const response = await this.fetcher(`https://api.cloudflare.com/client/v4${path}`, {
      method, redirect: 'manual', headers: { Authorization: `Bearer ${token}`, 'Cloudflare-Workers-Script-Api-Date': '2025-08-01', ...(!multipart ? { 'Content-Type': 'application/json' } : {}) },
      ...(body !== undefined ? { body: multipart ? body : JSON.stringify(body) } : {}),
    });
    if (absent && response.status === 404 || response.status === 204 && method === 'DELETE') return null;
    const result = await response.json().catch(() => null);
    need(response.ok && result && result.success !== false, `Provider request failed (HTTP ${response.status}, code ${result?.errors?.[0]?.code || 'unknown'})`, 502);
    return result.result;
  }
  path(suffix) { return `/accounts/${this.config.account}/${suffix}`; }
  artifact(suffix) { return this.path(`artifacts/namespaces/${part(this.config.namespace)}/${suffix}`); }
  repo(project) { need(uuidOK(project.id), 'Invalid project identity'); return `repos/${part(project.id)}`; }
  async head(project, branch) { const rows = await this.request(this.artifact(`${this.repo(project)}/log?ref=${part(branch)}&limit=1`)); need(shaOK(rows?.[0]?.hash), 'Repository head unreadable', 502); return rows[0].hash; }
  async mainHead(project) { const rows = await this.request(this.artifact(`${this.repo(project)}/log?ref=main&limit=1`)); need(Array.isArray(rows) && (rows.length === 0 || shaOK(rows[0]?.hash)), 'Default branch unreadable', 502); return rows[0]?.hash || null; }
  async prepare(project) {
    const existing = await this.request(this.artifact(this.repo(project)), 'GET', undefined, true);
    need(!existing, 'Repository already exists; operator must reconcile recorded preparation');
    const row = await this.request(this.artifact('repos'), 'POST', { name: project.id, default_branch: 'main', description: 'Private hosted WongStack project' });
    need(row?.remote, 'Repository creation has no Git receipt', 502);
    const url = new URL(row.remote);
    need(url.protocol === 'https:' && !url.username && !url.password && url.hostname === `${this.config.account}.artifacts.cloudflare.net` && url.pathname === `/git/${this.config.namespace}/${project.id}.git`, 'Unexpected repository URL', 502);
    // Artifacts can return a creation token. Never deliver or retain it: issue only tracked, short-lived grants.
    const initial = await this.request(this.artifact(`${this.repo(project)}/tokens?state=active&per_page=100&page=1`));
    for (const token of initial) await this.revoke(project, token.id);
    return url.href;
  }
  async gitToken(project, scope = 'write') {
    need(['read', 'write'].includes(scope), 'Invalid repository scope');
    const row = await this.request(this.artifact('tokens'), 'POST', { repo: project.id, scope, ttl: 1800 });
    need(row?.id && row.plaintext && row.expires_at && row.scope === scope, 'Repository token receipt missing', 502);
    return { id: row.id, token: row.plaintext, expiresAt: row.expires_at, username: 'x-token-auth' };
  }
  async revoke(project, id) {
    await this.request(this.artifact(`tokens/${part(id)}`), 'DELETE', undefined, true);
    for (let page = 1; page <= 100; page++) {
      const rows = await this.request(this.artifact(`${this.repo(project)}/tokens?state=all&per_page=100&page=${page}`));
      const found = rows.find(row => row.id === id);
      if (found) { need(['revoked', 'expired'].includes(found.state), 'Repository revocation not observed', 502); return; }
      if (rows.length < 100) break;
    }
    throw Object.assign(new Error('Repository revocation receipt unreadable'), { status: 502 });
  }
  async resource(row) {
    const { name, kind } = row;
    if (kind === 'd1') {
      const found = await this.request(this.path(`d1/database?name=${part(name)}&per_page=100`));
      need(!found.some(x => x.name === name), 'Database already exists; reconcile provisioning');
      const created = await this.request(this.path('d1/database'), 'POST', { name });
      need(uuidOK(created?.uuid), 'Database receipt missing', 502); return created.uuid;
    }
    if (kind === 'r2') {
      need(!await this.request(this.path(`r2/buckets/${part(name)}`), 'GET', undefined, true), 'Bucket already exists; reconcile provisioning');
      await this.request(this.path('r2/buckets'), 'POST', { name }); return name;
    }
    if (kind === 'worker') {
      need(!await this.request(this.path(`workers/scripts/${part(name)}/settings`), 'GET', undefined, true), 'Worker already exists; reconcile provisioning');
      const form = new FormData();
      form.set('metadata', new Blob([JSON.stringify({ main_module: 'entry.mjs', compatibility_date: '2026-10-01' })], { type: 'application/json' }));
      form.set('entry.mjs', new Blob(['export default {fetch(){return new Response("Setup pending",{status:503})}}'], { type: 'application/javascript+module' }), 'entry.mjs');
      await this.request(this.path(`workers/scripts/${part(name)}`), 'PUT', form);
      const initial = await this.currentDeployment(name);
      row.initialVersion = initial.versions[0].version_id; row.initialDeployment = initial.id;
      await this.verifyVersion(name, row.initialVersion, []);
      return name;
    }
    throw new Error('Unsupported owned resource');
  }
  async query(id, sql, params = []) {
    need(uuidOK(id), 'Owned database ID required');
    const rows = await this.request(this.path(`d1/database/${id}/query`), 'POST', { sql, params });
    need(Array.isArray(rows) && rows.length > 0 && rows.every(x => x.success !== false), 'Database query unreadable', 502);
    return rows;
  }
  async routing(name, version, readOnly = false) {
    const previews = name.endsWith('-staging');
    need(!version || previews, 'Production/memory version previews are forbidden');
    if (!readOnly) await this.request(this.path(`workers/scripts/${part(name)}/subdomain`), 'POST', { enabled: true, previews_enabled: previews });
    const row = await this.request(this.path(`workers/workers/${part(name)}`));
    need(row?.subdomain?.enabled && row.subdomain.previews_enabled === previews, 'Worker private routing state differs', 502);
    const value = version ? `https://${version.slice(0, 8)}${row.subdomain.preview_url_suffix}` : row.subdomain.url;
    const url = new URL(value);
    need(https(value) && url.hostname.endsWith('.workers.dev') && url.hostname.startsWith(`${version ? version.slice(0, 8) + '-' : ''}${name}.`), 'Unexpected Worker routing receipt', 502);
    return url.origin;
  }
  async version(target, modules, bindings, assets, main = '__wongstack_entry.mjs') {
    const form = new FormData();
    const metadata = { main_module: main, compatibility_date: '2026-10-01', compatibility_flags: ['nodejs_compat'], bindings, ...(assets ? { assets: { jwt: assets, config: { run_worker_first: true, not_found_handling: 'single-page-application' } } } : {}) };
    form.set('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    for (const module of modules) form.set(module.name, new Blob([from64(module.content)], { type: module.type }), module.name);
    const row = await this.request(this.path(`workers/scripts/${part(target)}/versions?bindings_inherit=strict`), 'POST', form);
    need(uuidOK(row?.id), 'Immutable Worker receipt missing', 502);
    await this.verifyVersion(target, row.id, bindings);
    return row.id;
  }
  async verifyVersion(target, version, bindings) {
    const observed = await this.request(this.path(`workers/scripts/${part(target)}/versions/${version}`));
    need(observed?.id === version, 'Worker version readback mismatch', 502);
    const actual = observed.resources?.bindings;
    need(Array.isArray(actual) && actual.length === bindings.length && new Set(actual.map(binding => binding.name)).size === actual.length && bindings.every(binding => actual.some(b => b.name === binding.name && b.type === binding.type && (binding.id === undefined || b.id === binding.id) && (binding.bucket_name === undefined || b.bucket_name === binding.bucket_name) && (binding.type !== 'plain_text' || b.text === binding.text))), 'Unexpected version bindings', 502);
    return observed;
  }
  async currentDeployment(target) {
    const row = await this.request(this.path(`workers/scripts/${part(target)}/deployments?per_page=1`));
    const current = row?.deployments?.[0];
    need(uuidOK(current?.id) && current.strategy === 'percentage' && current.versions?.length === 1 && uuidOK(current.versions[0].version_id) && current.versions[0].percentage === 100, 'Current deployment readback mismatch', 502);
    return current;
  }
  async deploy(target, version) {
    const base = this.path(`workers/scripts/${part(target)}/deployments`);
    const row = await this.request(base, 'POST', { strategy: 'percentage', versions: [{ version_id: version, percentage: 100 }] });
    need(uuidOK(row?.id), 'Deployment acknowledgment missing', 502);
    const actual = await this.request(`${base}/${row.id}`);
    need(actual?.id === row.id && actual.strategy === 'percentage' && actual.versions?.length === 1 && actual.versions[0].version_id === version && actual.versions[0].percentage === 100, 'Exact deployment readback mismatch', 502);
    return row.id;
  }
  async assets(target, assets) {
    const manifest = Object.fromEntries(assets.map(asset => [asset.path, { hash: asset.digest.slice(0, 32), size: from64(asset.content).byteLength }]));
    const start = await this.request(this.path(`workers/scripts/${part(target)}/assets-upload-session`), 'POST', { manifest });
    need(start?.jwt && Array.isArray(start.buckets), 'Asset session receipt missing', 502);
    let completion = start.buckets.length ? null : start.jwt;
    for (const bucket of start.buckets) {
      const form = new FormData();
      need(Array.isArray(bucket) && bucket.length <= 10000, 'Invalid asset bucket receipt', 502);
      for (const hash of bucket) {
        const asset = assets.find(row => row.digest.slice(0, 32) === hash);
        need(asset && await digest(from64(asset.content)) === asset.digest, 'Asset bucket names unknown/corrupt bytes');
        form.set(hash, new Blob([asset.content], { type: asset.type }), hash);
      }
      const result = await this.request(this.path('workers/assets/upload?base64=true'), 'POST', form, false, start.jwt);
      if (result?.jwt) completion = result.jwt;
    }
    need(completion, 'Assets upload completion unreadable', 502); return completion;
  }
  async deleteResource(row) {
    need(row.status === 'created' && row.id, 'Only receipt-owned resources can be deleted');
    const path = row.kind === 'd1' ? this.path(`d1/database/${row.id}`) : row.kind === 'r2' ? this.path(`r2/buckets/${part(row.name)}`) : this.path(`workers/scripts/${part(row.name)}?force=true`);
    await this.request(path, 'DELETE', undefined, true);
    const readback = row.kind === 'worker' ? this.path(`workers/scripts/${part(row.name)}/settings`) : path;
    need(await this.request(readback, 'GET', undefined, true) === null, 'Owned resource deletion not observed', 502);
  }
}
