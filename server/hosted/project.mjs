import { need, shaOK, uuidOK, refName, digest, randomToken, publicCandidate, projectAllowed } from './security.mjs';
import { accessSetup, policies, revokeHuman } from './access.mjs';
import { proveAncestry } from './git.mjs';
import { wireBootstrap } from './bootstrap.mjs';

export const initialProject = () => ({ version: 1, grants: {}, candidates: {}, approvals: {}, resources: [], production: null, publication: null, stopped: false });
const keyOf = (sha, ref) => `${ref}:${sha}`;
export class ProjectController {
  constructor(state, adapters) { this.state = state; this.a = adapters; }
  async save() { await this.a.checkpoint(this.state); }
  async prepare(input) {
    need(uuidOK(input.id) && input.owner?.id && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.owner.email || '') && shaOK(input.source?.commit), 'Reviewed pinned source and verified owner required', 400);
    need(projectAllowed(this.a.config, input.id), 'Project is outside the configured trial allowlist', 403);
    need(this.a.config.sourceRepos.includes(input.source.repo), 'Hosted source repository is not reviewed', 422);
    const s = this.state;
    if (s.id) {
      need(s.id === input.id && s.owner.id === input.owner.id && s.owner.email === input.owner.email && s.sourceRepo === input.source.repo && s.sourceCommit === input.source.commit, 'Prepared project identity differs');
      need(s.preparation === 'ready', 'Interrupted repository preparation requires reconciliation'); return this.workspace();
    }
    Object.assign(s, { id: input.id, owner: input.owner, sourceRepo: input.source.repo, sourceCommit: input.source.commit, preparation: 'creating', runtimeSecret: randomToken(), setup: 'pending' });
    await this.save();
    s.gitUrl = await this.a.provider.prepare(s); s.preparation = 'ready'; await this.save();
    return this.workspace();
  }
  workspace(actor) {
    const s = this.state;
    return { id: s.id, projectId: s.id, gitUrl: s.gitUrl, sourceRepo: s.sourceRepo, sourceCommit: s.sourceCommit, ownerEmail: s.owner?.email, ...(actor ? { subject: actor.subject, subjectEmail: actor.email, role: actor.role } : {}), setup: s.setup, memory: s.memory || { status: 'pending-owner' } };
  }
  owner(actor) { need(actor?.role === 'owner' && actor.subject === this.state.owner.id && actor.status === 'active', 'Owner approval required', 403); }
  async actor(token) {
    const hash = await digest(token || '');
    const actor = Object.values(this.state.grants).find(row => row.hash === hash && row.status === 'active');
    need(actor && !this.state.stopped, 'Workspace grant is unavailable', 403); return actor;
  }
  async access(input) {
    const s = this.state;
    need(s.preparation === 'ready' && !s.stopped && typeof input.subject === 'string' && input.subject.length > 0 && typeof input.vmId === 'string' && input.vmId.length > 0 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email || '') && ['owner', 'member'].includes(input.role), 'Verified live cloud membership required', 400);
    need(input.role !== 'owner' || input.subject === s.owner.id && input.email === s.owner.email, 'Cloud owner identity differs', 403);
    const existing = s.grants[input.vmId];
    need(!existing || existing.status !== 'revocation-pending', 'Finish pending access removal before reissuing');
    if (existing?.status === 'active') await this.remove(input.vmId);
    const token = `wongh_${s.id}_${randomToken().slice(6)}`;
    s.grants[input.vmId] = { subject: input.subject, email: input.email.toLowerCase(), role: input.role, vmId: input.vmId, hash: await digest(token), status: 'active', gitTokens: [], createdAt: Date.now() };
    await this.save();
    if (s.access) await policies(s, this.a.provider, () => this.save());
    return { serviceUrl: this.a.config.serviceUrl, ...this.workspace(s.grants[input.vmId]), token };
  }
  async remove(vmId) {
    const grant = this.state.grants[vmId];
    if (!grant || grant.status === 'removed') return { removed: true, vmId };
    grant.status = 'revocation-pending'; await this.save();
    for (const row of grant.gitTokens.filter(row => !row.revoked)) {
      await this.a.provider.revoke(this.state, row.id); row.revoked = true; await this.save();
    }
    if (this.state.access) await revokeHuman(this.state, this.a.provider, grant.email, () => this.save());
    // Installation-owned memory identity is never inferred from this grant. Memory removal must
    // be explicitly acknowledged by its independently authenticated Devices/membership flow.
    grant.status = 'removed'; grant.removedAt = Date.now(); await this.save();
    return { removed: true, vmId, memory: { status: 'independent-membership', actionRequired: true } };
  }
  async gitToken(actor) {
    need(actor.status === 'active' && !this.state.stopped, 'Active workspace grant required', 403);
    const token = await this.a.provider.gitToken(this.state, 'write');
    actor.gitTokens.push({ id: token.id, expiresAt: token.expiresAt, revoked: false }); await this.save();
    return { token: token.token, username: token.username, expiresAt: token.expiresAt, gitUrl: this.state.gitUrl };
  }
  async setup(actor) {
    this.owner(actor);
    const s = this.state;
    if (s.setup !== 'ready') {
      s.setup = 'provisioning'; await this.save();
      for (const environment of ['production', 'staging', 'memory']) {
        for (const kind of ['worker', 'd1']) {
          await this.resource(kind, environment);
        }
      }
      await this.resource('r2', 'memory');
      await accessSetup(s, this.a.provider, () => this.save());
      const origins = await wireBootstrap(s, this.a.provider, () => this.save());
      s.productionUrl = origins.appUrl;
      // The separate memory Devices change installs the canonical schema and its verified-login
      // operator bootstrap. Cloud machine grants must never seed memory roles or credentials.
      need(!s.memory || s.memory.appUrl === origins.appUrl && s.memory.memoryOrigin === origins.memoryOrigin, 'Pinned installation origins differ');
      s.memory ||= { protocolVersion: 1, installationId: crypto.randomUUID(), repositoryId: crypto.randomUUID(), appUrl: origins.appUrl, memoryOrigin: origins.memoryOrigin, status: 'pending-owner', reason: 'owner-unconfirmed', action: { kind: 'confirm-owner', url: `${origins.appUrl}/apps/devices/`, operatorConfirmationRequired: true } };
      s.setup = 'ready'; await this.save();
    } else {
      await accessSetup(s, this.a.provider, () => this.save());
      const origins = await wireBootstrap(s, this.a.provider, () => this.save());
      need(s.memory?.appUrl === origins.appUrl && s.memory.memoryOrigin === origins.memoryOrigin, 'Pinned installation origins differ');
    }
    const db = environment => s.resources.find(row => row.kind === 'd1' && row.environment === environment);
    const worker = environment => s.resources.find(row => row.kind === 'worker' && row.environment === environment).name;
    const database = environment => ({ binding: 'DB', database_name: db(environment).name, database_id: db(environment).id, migrations_dir: 'migrations' });
    const vars = environment => ({ CF_ACCESS_TEAM_DOMAIN: s.access.teamDomain, CF_ACCESS_AUD: s.access.audience, CF_ACCESS_APP_ID: s.access.appId, CF_ACCESS_WORKER_ID: s.access.workers.find(row => row.name === worker(environment)).id, WONG_ENVIRONMENT: environment });
    const bucket = s.resources.find(row => row.kind === 'r2').name;
    const wrangler = { name: worker('production'), main: 'worker/index.ts', compatibility_date: '2026-10-01', compatibility_flags: ['nodejs_compat'], workers_dev: true, preview_urls: false, assets: { directory: './dist/client', binding: 'ASSETS', run_worker_first: true, not_found_handling: 'single-page-application' }, vars: vars('production'), d1_databases: [database('production'), { binding: 'MEMORY_DB', database_name: db('memory').name, database_id: db('memory').id }], r2_buckets: [{ binding: 'MEMORY_BUCKET', bucket_name: bucket }], env: { staging: { name: worker('staging'), preview_urls: true, vars: vars('staging'), d1_databases: [database('staging')], r2_buckets: [] } } };
    return { wrangler, installRecordMemory: { accountId: this.a.config.account, databaseId: db('memory').id, database: db('memory').name, bucket, worker: `${s.memory.memoryOrigin}/_memory`, installationId: s.memory.installationId, repositoryId: s.memory.repositoryId }, env: {}, memory: s.memory, accessVerified: s.access.verified };
  }
  async resource(kind, environment) {
    const s = this.state;
    let row = s.resources.find(each => each.kind === kind && each.environment === environment);
    if (row) { need(row.status === 'created', 'Interrupted owned-resource creation requires reconciliation'); return row; }
    row = { kind, environment, name: `${this.a.config.prefix}-${s.id}-${environment}`, status: 'creating' };
    s.resources.push(row); await this.save();
    row.id = await this.a.provider.resource(row); await this.save();
    need(kind !== 'd1' || !s.resources.some(each => each !== row && each.kind === 'd1' && each.id === row.id), 'Database environments share an unexpected resource identity');
    row.status = 'created'; await this.save(); return row;
  }
  async candidate(input) {
    const s = this.state;
    need(s.setup === 'ready' && !s.stopped, 'Run hosted setup before checks');
    need(shaOK(input.sha), 'Exact commit required', 400);
    const branch = refName(input.ref);
    need(await this.a.provider.head(s, branch) === input.sha, 'Saved head changed');
    const key = keyOf(input.sha, input.ref);
    if (s.candidates[key]) return publicCandidate(s.candidates[key]);
    need(Object.values(s.candidates).filter(row => ['queued', 'checking'].includes(row.status)).length < this.a.config.maxQueued, 'Candidate queue is full', 429);
    s.candidates[key] = { sha: input.sha, ref: input.ref, status: 'queued', checks: 'UNKNOWN', attempts: 0, createdAt: Date.now(), base: s.production?.sha || null, mainBase: await this.a.provider.mainHead(s) };
    await this.save(); await this.a.enqueue(); return publicCandidate(s.candidates[key]);
  }
  getCandidate(sha, ref) { need(shaOK(sha), 'Exact commit required', 400); refName(ref); const row = this.state.candidates[keyOf(sha, ref)]; need(row, 'Candidate unavailable', 404); return row; }
  async start(sha, ref, workflow) {
    const c = this.getCandidate(sha, ref);
    need(!this.state.stopped && c.status === 'queued' && !this.state.active && c.attempts < this.a.config.maxAttempts, 'Runner cannot start this candidate');
    need(await this.a.provider.head(this.state, refName(ref)) === sha, 'Queued head changed');
    const uploadToken = randomToken();
    c.status = 'checking'; c.attempts++; c.workflow = workflow; c.startedAt = Date.now(); c.uploadHash = await digest(uploadToken);
    this.state.active = keyOf(sha, ref); await this.save(); return { ...c, uploadToken };
  }
  async prepareGit(sha, ref, workflow) {
    const c = this.getCandidate(sha, ref);
    need(!this.state.stopped && c.status === 'checking' && this.state.active === keyOf(sha, ref) && c.workflow === workflow, 'Active exact runner required');
    need(!c.gitPreparation || c.gitPreparation.attempt < c.attempts && c.gitPreparation.revoked === true, 'Git preparation intent requires reconciliation');
    c.gitPreparation = { attempt: c.attempts, workflow, status: 'minting', revoked: false };
    await this.save();
    const credential = await this.a.provider.gitToken(this.state, 'read');
    Object.assign(c.gitPreparation, { status: 'issued', id: credential.id, expiresAt: credential.expiresAt, token: credential.token });
    await this.save();
    need(typeof credential.id === 'string' && typeof credential.token === 'string' && credential.token.length > 0 && !/[\r\n\0]/.test(credential.token) && Date.parse(credential.expiresAt) > Date.now(), 'Tracked Git receipt unavailable');
    return { remote: this.state.gitUrl, token: credential.token };
  }
  gitCheckout(sha) {
    const c = this.state.candidates[this.state.active];
    const prep = c?.gitPreparation;
    need(!this.state.stopped && c?.status === 'checking' && c.sha === sha && prep?.attempt === c.attempts && ['issued', 'ready'].includes(prep.status), 'Tracked checkout unavailable');
    need(prep.status === 'ready' ? prep.revoked === true && !prep.token : typeof prep.token === 'string' && Date.parse(prep.expiresAt) > Date.now(), 'Tracked checkout grant expired or unresolved');
    return { sha, remote: this.state.gitUrl, token: prep.status === 'ready' ? '' : prep.token, snapshotOnly: prep.status === 'ready' };
  }
  async revokeGit(c) {
    const prep = c.gitPreparation;
    if (!prep || prep.revoked) return;
    need(prep.id && prep.status !== 'minting', 'Ambiguous Git mint requires operator reconciliation');
    prep.status = 'revocation-pending'; await this.save();
    await this.a.provider.revoke(this.state, prep.id);
    delete prep.token; prep.revoked = true; prep.status = 'revoked'; await this.save();
  }
  async readyGit(sha, ref, receipt) {
    const c = this.getCandidate(sha, ref);
    need(!this.state.stopped && c.status === 'checking' && this.state.active === keyOf(sha, ref) && c.gitPreparation?.status === 'issued' && receipt.prepared === true && receipt.sha === sha && receipt.projectId === this.state.id && receipt.base === (c.mainBase === c.sha ? c.base : c.mainBase), 'Git preparation receipt differs');
    await this.revokeGit(c);
    c.gitPreparation.status = 'ready'; await this.save(); return { ready: true };
  }
  async passed(sha, ref, result) {
    const c = this.getCandidate(sha, ref);
    need(this.state.active === keyOf(sha, ref) && c.status === 'checking' && c.gitPreparation?.status === 'ready' && c.gitPreparation.revoked === true && c.bundleDigest === result.digest && c.uploadKey && result.sha === sha && result.exitCode === 0 && result.projectId === this.state.id && uuidOK(result.version), 'Passing immutable artifact receipt mismatch');
    c.status = 'passed'; c.checks = 'PASS'; c.version = result.version; c.url = result.url; c.previewUrl = result.url; delete c.uploadHash;
    this.state.active = null; await this.save(); await this.a.enqueue(); return publicCandidate(c);
  }
  async fail(sha, ref, retryable = false) {
    const c = this.getCandidate(sha, ref);
    await this.revokeGit(c);
    delete c.workflow;
    c.status = retryable && c.attempts < this.a.config.maxAttempts && !c.uploadKey ? 'queued' : 'failed'; c.checks = c.status === 'queued' ? 'UNKNOWN' : 'FAIL'; c.failure = retryable ? 'Remote runner interrupted' : 'Remote checks or immutable preview failed';
    if (this.state.active === keyOf(sha, ref)) this.state.active = null;
    delete c.uploadHash; await this.save(); await this.a.enqueue();
  }
  async approve(actor, input) {
    this.owner(actor);
    const c = this.getCandidate(input.sha, input.ref);
    need(c.status === 'passed' && c.checks === 'PASS' && c.bundleDigest && c.uploadKey && c.base === (this.state.production?.sha || null), 'Passing current production-base preview required');
    need(await this.a.provider.head(this.state, refName(input.ref)) === input.sha, 'Approved head changed');
    const id = crypto.randomUUID();
    need(await this.a.provider.mainHead(this.state) === c.mainBase, 'Default branch changed before approval');
    this.state.approvals[id] = { id, sha: c.sha, ref: c.ref, digest: c.bundleDigest, subject: actor.subject, base: c.base, mainBase: c.mainBase, status: 'approved', createdAt: Date.now() }; await this.save(); return { id, approvalId: id, sha: c.sha, ref: c.ref };
  }
  async beginPublication(actor, approvalId) {
    this.owner(actor);
    const approval = this.state.approvals[approvalId];
    need(approval?.subject === actor.subject && approval.status === 'approved', 'Current owner approval required');
    need(!this.state.publication, 'Publication reservation requires reconciliation');
    const c = this.getCandidate(approval.sha, approval.ref);
    need(c.status === 'passed' && c.checks === 'PASS' && c.bundleDigest === approval.digest && (this.state.production?.sha || null) === approval.base, 'Approved result or production base changed');
    need(await this.a.provider.head(this.state, refName(c.ref)) === c.sha, 'Publication head changed');
    need(await this.a.provider.mainHead(this.state) === approval.mainBase, 'Default branch changed before publication');
    await proveAncestry(this.a.provider, this.state, approval.mainBase, c.sha);
    this.state.publication = { approvalId, sha: c.sha, ref: c.ref, digest: c.bundleDigest, base: approval.base, mainBase: approval.mainBase, status: 'reserved', createdAt: Date.now() };
    approval.status = 'publishing'; await this.save(); return c;
  }
  async guardPublication(actor, approvalId) {
    this.owner(actor);
    const s = this.state, reservation = s.publication, approval = s.approvals[approvalId];
    need(s.grants[actor.vmId] === actor && s.grants[actor.vmId].status === 'active', 'Owner approval grant was revoked or replaced; reservation retained', 403);
    need(!s.stopped && reservation?.approvalId === approvalId && approval?.status === 'publishing' && approval.subject === actor.subject && approval.sha === reservation.sha && approval.ref === reservation.ref && approval.digest === reservation.digest && approval.base === reservation.base && approval.mainBase === reservation.mainBase, 'Publication approval changed; reservation retained');
    const c = this.getCandidate(reservation.sha, reservation.ref);
    need(c.sha === reservation.sha && c.ref === reservation.ref && c.status === 'passed' && c.checks === 'PASS' && c.bundleDigest === reservation.digest && c.base === reservation.base && c.mainBase === reservation.mainBase && (s.production?.sha || null) === reservation.base, 'Approved result or production base changed; reservation retained');
    need(await this.a.provider.head(s, refName(c.ref)) === reservation.sha && await this.a.provider.mainHead(s) === reservation.mainBase, 'Repository head changed before publication advancement; reservation retained');
  }
  async finishPublication(approvalId, receipt) {
    const reservation = this.state.publication;
    need(reservation?.status === 'deployed-awaiting-main' && reservation.approvalId === approvalId && reservation.sha === receipt.sha
      && uuidOK(receipt.version) && reservation.version === receipt.version && uuidOK(receipt.deployment) && reservation.deployment === receipt.deployment
      && reservation.target === receipt.target && reservation.url === receipt.url && reservation.identity?.sha === receipt.sha && reservation.identity.projectId === this.state.id
      && receipt.identity?.sha === receipt.sha && receipt.identity.projectId === this.state.id && reservation.digest === receipt.digest
      && receipt.defaultSha === receipt.sha && receipt.defaultRef === 'refs/heads/main', 'Publication receipt does not match reservation');
    this.state.production = { sha: receipt.sha, version: receipt.version, deployment: receipt.deployment, digest: receipt.digest, url: receipt.url };
    this.state.productionUrl = receipt.url; this.state.approvals[approvalId].status = 'published'; this.state.publication = null; await this.save();
    return { sha: receipt.sha, status: 'published', version: receipt.version, deployment: receipt.deployment, defaultRef: receipt.defaultRef, defaultSha: receipt.defaultSha };
  }
  status() {
    const s = this.state;
    return { ...this.workspace(), stopped: s.stopped, production: s.production, publication: s.publication ? { sha: s.publication.sha, status: s.publication.status, approvalId: s.publication.approvalId, digest: s.publication.digest, version: s.publication.version, target: s.publication.target, deployment: s.publication.deployment, mainBase: s.publication.mainBase, credentialId: s.publication.gitCredential?.id, credentialRevoked: s.publication.gitCredential?.revoked } : null, candidates: Object.values(s.candidates).map(publicCandidate), productionUrl: s.productionUrl || null, previews: Object.values(s.candidates).filter(row => row.status === 'passed').map(row => ({ sha: row.sha, url: row.previewUrl })), accessVerified: s.access?.verified === true, resources: s.resources.map(({ kind, environment, name, id, status, creationReceipt }) => ({ kind, environment, name, id, status, ...(kind === 'd1' && uuidOK(id) && creationReceipt?.uuid === id && creationReceipt.name === name && creationReceipt.accountId === this.a.config.account ? { creationReceipt: { uuid: creationReceipt.uuid, name: creationReceipt.name, accountId: creationReceipt.accountId } } : {}) })) };
  }
}
