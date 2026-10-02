import { ProjectController, initialProject } from './project.mjs';
import { HostedProvider } from './provider.mjs';
import { need, reply, uuidOK, digest, shaOK, publicCandidate, projectAllowed } from './security.mjs';
import { validateBundle } from './bundle.mjs';
import { publishBundle } from './pipeline.mjs';

export class ProjectService {
  constructor(ctx, env, fetcher = (...args) => fetch(...args)) {
    this.ctx = ctx; this.env = env; this.fetcher = fetcher; this.config = JSON.parse(env.HOSTED_CONFIG);
    this.provider = new HostedProvider(this.config, env.CF_TOKEN, fetcher);
  }
  async load() {
    this.state = await this.ctx.storage.get('state') || initialProject();
    this.controller = new ProjectController(this.state, { config: this.config, provider: this.provider, checkpoint: state => this.ctx.storage.put('state', state), enqueue: () => this.enqueue() });
  }
  async enqueue() {
    const s = this.state;
    if (s.stopped) return;
    const queued = Object.values(s.candidates).filter(row => row.status === 'queued');
    if (s.active || queued.some(row => row.workflow)) { await this.ctx.storage.setAlarm(Date.now() + 15000); return; }
    const row = queued[0];
    if (!row) return;
    row.workflow = `hosted-${s.id}-${row.sha}-${row.attempts + 1}-${(await digest(row.ref)).slice(0, 8)}`;
    await this.controller.save();
    try {
      await this.env.CI_WORKFLOW.create({ id: row.workflow, params: { provider: 'cloudflare-artifacts', providerData: { namespace: this.config.namespace }, owner: this.config.namespace, repo: s.id, sha: row.sha, ref: row.ref, event: { type: 'push' }, trigger: 'push' } });
    } catch {
      // A failed acknowledgment can still have created the Workflow. Preserve its ID and inspect
      // it on the alarm; never create an untracked duplicate from a transient response failure.
      row.failure = 'Workflow creation acknowledgment unreadable'; await this.controller.save();
    }
    await this.ctx.storage.setAlarm(Date.now() + 15000);
  }
  async recover() {
    await this.load();
    if (this.state.stopped) return;
    const row = Object.values(this.state.candidates).find(c => ['checking', 'queued'].includes(c.status) && c.workflow);
    if (row) {
      let status;
      try { status = await (await this.env.CI_WORKFLOW.get(row.workflow)).status(); }
      catch {
        row.failure = 'Workflow status unreadable; operator reconciliation required'; row.recoveryPolls = (row.recoveryPolls || 0) + 1;
        await this.controller.save();
        if (row.recoveryPolls < 60) await this.ctx.storage.setAlarm(Date.now() + 30000);
        return;
      }
      if (['errored', 'terminated', 'complete'].includes(status.status)) {
        delete row.workflow;
        await this.controller.fail(row.sha, row.ref, status.status !== 'complete');
      } else if (Date.now() - (row.startedAt || row.createdAt) > this.config.candidateTimeoutMs + 60000) {
        await (await this.env.CI_WORKFLOW.get(row.workflow)).terminate();
        delete row.workflow; await this.controller.fail(row.sha, row.ref, true);
      }
    }
    await this.enqueue();
  }
  async loadBundle(sha, ref, expectedDigest) {
    const candidate = this.controller.getCandidate(sha, ref);
    need(candidate.bundleDigest === expectedDigest && candidate.uploadKey?.startsWith(`${this.state.id}/bundles/${sha}/`), 'Immutable storage identity mismatch');
    const object = await this.env.BUNDLES.get(candidate.uploadKey);
    need(object, 'Immutable bundle unavailable');
    const raw = await object.text();
    need(await digest(raw) === expectedDigest, 'Immutable storage corruption');
    const validated = await validateBundle(JSON.parse(raw), sha, this.state.id);
    need(validated.digest === expectedDigest, 'Bundle encoding changed');
    return { bundle: validated.bundle, state: this.state };
  }
  async upload(request, sha, ref) {
    const c = this.controller.getCandidate(sha, ref);
    const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
    need(c.status === 'checking' && c.uploadHash && await digest(token || '') === c.uploadHash, 'Candidate upload authority unavailable', 403);
    need(Number(request.headers.get('Content-Length') || 0) <= 90 * 1024 * 1024, 'Encoded bundle exceeds bound', 413);
    const raw = await request.text(); need(new TextEncoder().encode(raw).length <= 90 * 1024 * 1024, 'Encoded bundle exceeds bound', 413);
    const validated = await validateBundle(JSON.parse(raw), sha, this.state.id);
    const hash = await digest(raw); need(hash === validated.digest, 'Bundle must use canonical JSON');
    need(!c.bundleDigest || c.bundleDigest === hash, 'Immutable bundle already stored');
    const key = `${this.state.id}/bundles/${sha}/${hash}`;
    if (!await this.env.BUNDLES.head(key)) await this.env.BUNDLES.put(key, raw, { customMetadata: { sha, projectId: this.state.id, digest: hash } });
    c.bundleDigest = hash; c.uploadKey = key; await this.controller.save();
    return { sha, projectId: this.state.id, digest: hash };
  }
  async dispatch(request) {
    await this.load();
    const url = new URL(request.url);
    const path = url.pathname;
    const input = request.method === 'POST' ? await request.json() : {};
    const c = this.controller;
    if (path.startsWith('/internal/')) {
      const operation = path.slice(10);
      if (operation === 'start') return c.start(input.sha, input.ref, input.workflow);
      if (operation === 'passed') return c.passed(input.sha, input.ref, input.result);
      if (operation === 'fail') { await c.fail(input.sha, input.ref, input.retryable); return { failed: true }; }
      if (operation === 'bundle') return this.loadBundle(input.sha, input.ref, input.digest);
      throw Object.assign(new Error('Unknown internal operation'), { status: 404 });
    }
    if (path === '/admin/prepare' && request.method === 'POST') return c.prepare(input);
    need(this.state.preparation === 'ready', 'Project unavailable', 404);
    if (path === '/admin/access' && request.method === 'POST') return c.access(input);
    if (path.startsWith('/admin/access/') && request.method === 'DELETE') return c.remove(decodeURIComponent(path.slice(14)));
    if (path === '/admin/status') return c.status();
    if (path === '/admin/site' && request.method === 'POST') {
      need(this.state.access?.verified === true, 'Private site Access configuration is unavailable');
      const candidate = input.sha ? Object.values(this.state.candidates).find(row => row.sha === input.sha && row.status === 'passed') : null;
      const target = input.sha ? candidate?.url : this.state.production?.url;
      need(target && (!input.sha || shaOK(input.sha)), 'Requested private site unavailable', 404);
      return { url: target, projectId: this.state.id, sha: input.sha || this.state.production.sha, accessVerified: true };
    }
    if (path === '/admin/stop' && request.method === 'POST') {
      this.state.stopped = true; await c.save();
      for (const row of Object.values(this.state.candidates).filter(each => ['checking', 'queued'].includes(each.status) && each.workflow)) {
        await (await this.env.CI_WORKFLOW.get(row.workflow)).terminate(); row.status = 'cancelled';
      }
      this.state.active = null; await c.save(); return c.status();
    }
    if (path === '/admin/cleanup' && request.method === 'POST') return this.cleanup();
    if (path === '/admin/export-receipt' && request.method === 'POST') {
      need(this.state.stopped && !this.state.active && !this.state.publication, 'Quiesce before export receipt');
      need(input.projectId === this.state.id && input.account === this.config.account && input.namespace === this.config.namespace && input.gitUrl === this.state.gitUrl && /^[a-f0-9]{64}$/.test(input.refsDigest || '') && input.refsIdentical === true && input.fsckPassed === true && input.independentRestore === true && Number.isFinite(input.completedAt) && input.completedAt <= Date.now() && input.completedAt > Date.now() - 86400000, 'Exact recent independently verified Git restore receipt required');
      this.state.exportEvidence = { projectId: input.projectId, refsDigest: input.refsDigest, completedAt: input.completedAt, refsIdentical: true, fsckPassed: true, independentRestore: true };
      this.state.exportVerified = true; await c.save(); return this.state.exportEvidence;
    }
    if (path.startsWith('/upload/') && request.method === 'PUT') return this.upload(request, path.slice(8), url.searchParams.get('ref'));
    const actor = await c.actor(request.headers.get('Authorization')?.replace(/^Bearer /, ''));
    if (path === '/workspace' && request.method === 'GET') return c.workspace(actor);
    if (path === '/status' && request.method === 'GET') return c.status();
    if (path === '/git-token' && request.method === 'POST') return c.gitToken(actor);
    if (path === '/setup' && request.method === 'POST') return c.setup(actor);
    if (path === '/candidates' && request.method === 'POST') return c.candidate(input);
    if (path.startsWith('/candidates/') && request.method === 'GET') return publicCandidate(c.getCandidate(path.slice(12), url.searchParams.get('ref')));
    if (path === '/approvals' && request.method === 'POST') return c.approve(actor, input);
    if (path === '/publications' && request.method === 'POST') return publishBundle(c, actor, input.approvalId, { provider: this.provider, loadBundle: (sha, ref, hash) => this.loadBundle(sha, ref, hash), fetch: this.fetcher });
    throw Object.assign(new Error('Unknown service operation'), { status: 404 });
  }
  async cleanup() {
    const s = this.state;
    need(s.stopped && !s.active && !s.publication, 'Stop and reconcile publication before owned cleanup');
    for (const vmId of Object.keys(s.grants)) await this.controller.remove(vmId);
    // Memory's independently owned memberships/devices are revoked by its operator before deleting
    // its resources. Cleanup is a destructive, explicit admin operation after Git export evidence.
    need(s.exportVerified === true, 'Verified Git export receipt required before deleting repository');
    need(!s.resources.some(row => row.status === 'creating'), 'Reconcile ambiguous resource creation before cleanup');
    for (const row of [...s.resources].reverse().filter(row => row.status === 'created')) {
      await this.provider.deleteResource(row); row.status = 'deleted'; await this.controller.save();
    }
    if (s.access?.appId) {
      await this.provider.request(this.provider.path(`access/apps/${s.access.appId}`), 'DELETE', undefined, true);
      need(await this.provider.request(this.provider.path(`access/apps/${s.access.appId}`), 'GET', undefined, true) === null, 'Access application cleanup unreadable');
      await this.provider.request(this.provider.path(`access/service_tokens/${s.access.serviceTokenId}`), 'DELETE', undefined, true);
      need(await this.provider.request(this.provider.path(`access/service_tokens/${s.access.serviceTokenId}`), 'GET', undefined, true) === null, 'Access service credential deletion unreadable');
    }
    for (let page = 0; page < 100; page++) {
      const listed = await this.env.BUNDLES.list({ prefix: `${s.id}/`, limit: 1000 });
      need(listed.objects.every(row => row.key.startsWith(`${s.id}/`)), 'Private storage cleanup crossed tenant prefix');
      if (!listed.objects.length) break;
      await this.env.BUNDLES.delete(listed.objects.map(row => row.key));
      need(page < 99, 'Private bundle cleanup bound reached; retry owned cleanup');
    }
    need(!(await this.env.BUNDLES.list({ prefix: `${s.id}/`, limit: 1 })).objects.length, 'Private bundle cleanup readback failed');
    await this.provider.request(this.provider.artifact(this.provider.repo(s)), 'DELETE', undefined, true);
    need(await this.provider.request(this.provider.artifact(this.provider.repo(s)), 'GET', undefined, true) === null, 'Repository cleanup unreadable');
    s.preparation = 'deleted'; await this.controller.save(); return { deleted: true, projectId: s.id };
  }
}

export async function routeService(request, env) {
  const url = new URL(request.url);
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') || '';
  let projectId, path;
  const admin = url.pathname.match(/^\/v1\/projects(?:\/([a-f0-9-]{36})\/(access(?:\/[^/]+)?|status|site|stop|cleanup|export-receipt))?$/);
  if (admin) {
    need(token && env.ADMIN_TOKEN && await digest(token) === await digest(env.ADMIN_TOKEN), 'Service administrator required', 403);
    if (!admin[1]) { need(request.method === 'POST', 'POST required', 405); projectId = (await request.clone().json()).id; path = '/admin/prepare'; }
    else { projectId = admin[1]; path = '/admin/' + admin[2]; }
  } else {
    const upload = url.pathname.match(/^\/v1\/bundles\/([a-f0-9-]{36})\/([a-f0-9]{40})$/);
    if (upload) { projectId = upload[1]; path = `/upload/${upload[2]}`; }
    else {
      const match = token.match(/^wongh_([a-f0-9-]{36})_[a-f0-9]{64}$/);
      need(match, 'Scoped workspace grant required', 403); projectId = match[1];
      need(/^\/v1\/(workspace|status|git-token|setup|candidates(?:\/[a-f0-9]{40})?|approvals|publications)$/.test(url.pathname), 'Unknown service operation', 404);
      path = url.pathname.slice(3);
    }
  }
  need(uuidOK(projectId), 'Invalid project identity', 400);
  need(projectAllowed(JSON.parse(env.HOSTED_CONFIG), projectId), 'Project is outside the configured trial allowlist', 403);
  const stub = env.PROJECTS.get(env.PROJECTS.idFromName(projectId));
  url.pathname = path;
  return stub.fetch(new Request(url, request));
}
export async function safeRoute(request, env) {
  try { return await routeService(request, env); }
  catch (error) { return reply({ error: error.status && error.status < 500 ? error.message : 'Hosted service request failed; retry status or contact operator' }, error.status || 502); }
}
