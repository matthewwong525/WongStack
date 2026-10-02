// A trusted Workflow uploads bytes; candidate commands never receive this capability.
import { artifactBytes } from './core.mjs';

const need = (condition, message) => { if (!condition) throw new Error(message); };
const versionOK = value => /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value || '');

export class DirectUpload {
  constructor(config, request, step, fetcher = (...args) => fetch(...args)) {
    this.config = config; this.request = request; this.step = step; this.fetcher = fetcher;
  }
  target(environment) {
    const c = this.config;
    need(c.backend === 'direct-api' && /^[a-f0-9]{32}$/.test(c.account || '') && /^[a-z0-9-]{6,14}$/.test(c.run || ''), 'Explicit direct API account/run required');
    need(c.staging === `wong-artifacts-pilot-${c.run}-staging` && c.production === `wong-artifacts-pilot-${c.run}-production` && c.stagingDB && c.productionDB && c.stagingDB !== c.productionDB, 'Unexpected direct API targets or shared data');
    need(['staging', 'production'].includes(environment), 'Unexpected deployment environment');
    return `/accounts/${c.account}/workers/scripts/${encodeURIComponent(c[environment])}`;
  }
  call(path, method = 'GET', body) { return this.request(path, method, body, false, 'deployment'); }
  once(name, fn) { return this.step.do(name, { retries: { limit: 0 }, timeout: '2 minutes' }, fn); }
  async form(artifact, sha, environment) {
    this.target(environment);
    const bytes = await artifactBytes(artifact, sha);
    const form = new FormData();
    form.set('metadata', new Blob([JSON.stringify({ main_module: 'worker.mjs', compatibility_date: '2026-10-01', bindings: [{ type: 'd1', name: 'DB', id: this.config[`${environment}DB`] }] })], { type: 'application/json' }));
    form.set('worker.mjs', new Blob([bytes], { type: 'application/javascript+module' }), 'worker.mjs');
    return form;
  }
  async version(environment, id) {
    need(versionOK(id), 'Upload returned no immutable version');
    const version = await this.call(`${this.target(environment)}/versions/${id}`);
    const bindings = version?.resources?.bindings;
    need(version?.id === id && Array.isArray(bindings) && bindings.length === 1 && bindings[0].type === 'd1' && bindings[0].name === 'DB' && bindings[0].id === this.config[`${environment}DB`], 'Version has unexpected runtime bindings');
    return version;
  }
  async routing(environment) {
    await this.call(`${this.target(environment)}/subdomain`, 'POST', { enabled: true, previews_enabled: true });
    // Same source as pinned Wrangler's getWorkerSubdomain; never invent an account suffix.
    const worker = await this.call(`/accounts/${this.config.account}/workers/workers/${encodeURIComponent(this.config[environment])}`);
    need(worker?.subdomain?.enabled === true && worker.subdomain.previews_enabled === true, 'Worker preview routing was not enabled');
    return worker.subdomain;
  }
  url(value, environment, prefix = '') {
    const url = new URL(value);
    need(url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/' && url.hostname.endsWith('.workers.dev') && url.hostname.startsWith(`${prefix}${this.config[environment]}.`), 'Untrusted provider Worker URL');
    return url.origin;
  }
  async identity(url, sha, label) {
    for (let poll = 0; poll < 12; poll++) {
      const matches = await this.once(`${label}-identity-${poll}`, async () => {
        try {
          const response = await this.fetcher(`${url}/identity`, { redirect: 'manual' });
          return response.ok && (await response.json()).commit === sha;
        } catch { return false; }
      });
      if (matches) return;
      if (poll < 11) await this.step.sleep(`${label}-propagation-${poll}`, '5 seconds');
    }
    throw new Error('Worker identity differs or is unreadable; publication reservation retained if present');
  }
  async preview(result, sha) {
    need(result.exitCode === 0, 'Failed checks cannot upload a preview');
    const form = await this.form(result, sha, 'staging');
    const uploaded = await this.once(`direct-upload-${sha}`, () => this.call(`${this.target('staging')}/versions?bindings_inherit=strict`, 'POST', form));
    const deployment = await this.once(`direct-preview-receipt-${sha}`, async () => {
      await this.version('staging', uploaded?.id);
      const routing = await this.routing('staging');
      need(typeof routing.preview_url_suffix === 'string' && routing.preview_url_suffix.startsWith(`-${this.config.staging}.`), 'Provider reported no immutable preview suffix');
      const url = this.url(`https://${uploaded.id.slice(0, 8)}${routing.preview_url_suffix}`, 'staging', `${uploaded.id.slice(0, 8)}-`);
      return { version: uploaded.id, url, target: this.config.staging, database: this.config.stagingDB, reported: true, previewSuffix: routing.preview_url_suffix };
    });
    await this.identity(deployment.url, sha, `direct-preview-${sha}`);
    return deployment;
  }
  async publish(candidate) {
    need(candidate.approval?.sha === candidate.sha && candidate.approval.digest === candidate.digest && candidate.approval.status === 'approved' && candidate.checks === 'PASS' && candidate.status === 'preview-ready', 'Exact approved immutable artifact required');
    const form = await this.form(candidate, candidate.sha, 'production');
    const label = `direct-publication-${candidate.approval.id}`;
    const uploaded = await this.once(`${label}-upload`, () => this.call(this.target('production'), 'PUT', form));
    const url = await this.once(`${label}-receipt`, async () => {
      await this.version('production', uploaded?.version_id);
      const routing = await this.routing('production');
      need(typeof routing.url === 'string', 'Provider reported no production URL');
      return this.url(routing.url, 'production');
    });
    await this.identity(url, candidate.sha, label);
    return { version: uploaded.version_id };
  }
}
