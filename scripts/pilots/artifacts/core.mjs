// Controller-owned decisions; candidate code never imports this module.
import { handleMemory, hashKey, newKey } from '../../../.agents/skills/memory/worker/memory-worker.mjs';

const requireThat = (condition, message) => { if (!condition) throw new Error(message); };
export const shaOK = sha => /^[a-f0-9]{40}$/.test(sha || '');
const b64 = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
const unb64 = text => Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
const encoder = new TextEncoder();
const signKey = secret => crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

export async function signSession(secret, claims) {
  requireThat(secret.length >= 32, 'Signing secret too short');
  const payload = b64(encoder.encode(JSON.stringify(claims)));
  return `${payload}.${b64(new Uint8Array(await crypto.subtle.sign('HMAC', await signKey(secret), encoder.encode(payload))))}`;
}

export async function verifySession(secret, token, state, now = Date.now()) {
  const [payload, signature, extra] = String(token).split('.');
  requireThat(payload && signature && !extra, 'Invalid test session');
  let claims;
  try {
    requireThat(await crypto.subtle.verify('HMAC', await signKey(secret), unb64(signature), encoder.encode(payload)), 'Forged test session');
    claims = JSON.parse(new TextDecoder().decode(unb64(payload)));
  } catch { throw new Error('Invalid test session'); }
  requireThat(claims.run === state.run && claims.project === state.repo && claims.aud === 'artifacts-pilot' && Number.isFinite(claims.exp) && claims.exp > now && claims.exp <= now + 3600000, 'Expired or incorrectly scoped test session');
  const member = state.roster[claims.sub];
  requireThat(member?.status === 'active' && claims.epoch === member.epoch, 'Membership removed or session invalidated');
  return { sub: claims.sub, ...member };
}

export function initialState(config) {
  requireThat(config.owner && config.ownerEmail, 'Stable owner subject and fixture email required');
  return {
    run: config.run, repo: config.repo, namespace: config.namespace, account: config.account,
    production: null, latest: {}, candidates: {}, approvals: {}, jobs: {}, attempts: 0, active: null,
    stopped: false, roster: { [config.owner]: { email: config.ownerEmail, role: 'owner', status: 'active', epoch: 0 } },
    gitTokens: [], memoryKeys: [], removals: {},
  };
}

export class PilotController {
  constructor(state, adapters) { this.state = state; this.adapters = adapters; }
  owner(actor) { requireThat(actor?.role === 'owner' && this.state.roster[actor.sub]?.role === 'owner' && this.state.roster[actor.sub]?.status === 'active', 'Owner required'); }
  addMember(actor, sub, email) {
    this.owner(actor);
    requireThat(sub && email && !Object.values(this.state.roster).some(row => row.email === email), 'Use a distinct stable fixture subject and verified test email');
    requireThat(!this.state.roster[sub], 'Subject already recorded; removed subjects cannot be reactivated');
    this.state.roster[sub] = { email, role: 'member', status: 'active', epoch: 0 };
  }
  start(params, job) {
    requireThat(!this.state.stopped, 'Pilot stopped');
    requireThat(params.owner === this.state.namespace && params.repo === this.state.repo && shaOK(params.sha) && /^refs\/heads\//.test(params.ref), 'Unexpected event source or commit');
    if (this.state.jobs[job]) return { duplicate: true };
    const key = `${params.ref}:${params.sha}`;
    if (this.state.candidates[key]) return { duplicate: true };
    this.state.latest[params.ref] = params.sha;
    requireThat(!this.state.active && !this.state.publication && this.state.attempts < 10, 'Runner busy or ten-build bound reached');
    this.state.attempts += 1;
    this.state.jobs[job] = key;
    this.state.active = job;
    const candidate = { sha: params.sha, ref: params.ref, repo: params.repo, status: 'checking', startedAt: new Date().toISOString() };
    this.state.candidates[key] = candidate;
    return candidate;
  }
  candidate(sha, ref) {
    const found = this.state.candidates[`${ref}:${sha}`];
    requireThat(found?.sha === sha, 'No exact candidate');
    return found;
  }
  async preview(sha, ref, result, deployment) {
    const candidate = this.candidate(sha, ref);
    requireThat(candidate.status === 'checking' && result?.sha === sha && result.exitCode === 0 && typeof result.code === 'string', 'Unreadable or mismatched check evidence');
    requireThat(result.code.length < 131072 && /^[A-Za-z0-9+/=]+$/.test(result.code), 'Invalid candidate artifact');
    const code = atob(result.code);
    requireThat(await hashKey(code) === result.digest, 'Artifact digest mismatch');
    requireThat(deployment.target === this.adapters.staging && deployment.database === this.adapters.stagingDB, 'Unexpected deployment target');
    const url = new URL(deployment.url);
    requireThat(url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/' && url.hostname.endsWith('.workers.dev') && deployment.reported === true, 'Untrusted preview URL');
    requireThat(deployment.version && url.hostname.startsWith(`${deployment.version.slice(0, 8)}-${this.adapters.staging}.`), 'URL does not match deployment evidence');
    const response = await this.adapters.fetch(`${url.origin}/identity`, { redirect: 'error' });
    requireThat(response.ok && (await response.json()).commit === sha, 'Preview serves a different commit');
    Object.assign(candidate, { status: 'preview-ready', checks: 'PASS', code: result.code, digest: result.digest, url: url.origin, version: deployment.version, finishedAt: new Date().toISOString() });
    this.state.active = null;
    return { sha, url: candidate.url, status: candidate.status };
  }
  fail(sha, ref) {
    const candidate = this.candidate(sha, ref);
    candidate.status = 'failed'; candidate.checks = 'FAIL'; this.state.active = null;
  }
  async approve(actor, sha, ref) {
    this.owner(actor);
    const candidate = this.candidate(sha, ref);
    requireThat(candidate.status === 'preview-ready' && candidate.checks === 'PASS' && this.state.latest[ref] === sha, 'Only the latest passing preview can be approved');
    await this.currentHead(sha, ref);
    const response = await this.adapters.fetch(`${candidate.url}/identity`, { redirect: 'error' });
    requireThat(response.ok && (await response.json()).commit === sha, 'Approval preview identity unreadable');
    const approval = { id: crypto.randomUUID(), sha, ref, repo: this.state.repo, digest: candidate.digest, base: this.state.production, subject: actor.sub, at: new Date().toISOString(), status: 'approved' };
    this.state.approvals[approval.id] = approval;
    return approval;
  }
  async currentHead(sha, ref) {
    requireThat(typeof this.adapters.head === 'function' && await this.adapters.head(ref) === sha, 'Authoritative repository branch head is unreadable or changed');
  }
  beginPublication(id, job) {
    const approval = this.state.approvals[id];
    if (approval?.status === 'published') return { duplicate: true, sha: approval.sha };
    requireThat(approval?.status === 'approved' && !this.state.stopped, 'No approved publication');
    const candidate = this.candidate(approval.sha, approval.ref);
    requireThat(candidate.checks === 'PASS' && candidate.status === 'preview-ready' && candidate.digest === approval.digest && this.state.latest[approval.ref] === approval.sha && approval.base === this.state.production, 'Failed checks, stale candidate, or outdated production base');
    requireThat(this.state.roster[approval.subject]?.role === 'owner' && this.state.roster[approval.subject]?.status === 'active', 'Approving owner is inactive');
    requireThat(!this.state.active && !this.state.publication, 'Publication is serialized');
    this.state.publication = { id, job };
    return { ...candidate, approval };
  }
  finishPublication(id, sha, version) {
    const approval = this.state.approvals[id];
    requireThat(this.state.publication?.id === id && approval.sha === sha && approval.base === this.state.production && version, 'Publication reservation or base changed');
    this.state.production = sha; approval.status = 'published'; approval.version = version;
    this.state.publication = null;
  }
  async gitToken(actor, scope) {
    requireThat(this.state.roster[actor.sub]?.status === 'active' && ['read', 'write'].includes(scope), 'Active member and explicit Git scope required');
    const token = await this.adapters.issueToken(this.state.repo, scope, 1800);
    requireThat(token.id && token.plaintext && token.scope === scope, 'Provider token contract mismatch');
    this.state.gitTokens.push({ id: token.id, sub: actor.sub, scope, expiresAt: token.expiresAt, revoked: false });
    return token;
  }
  async remove(actor, sub) {
    this.owner(actor);
    const member = this.state.roster[sub];
    requireThat(member && member.role !== 'owner', 'Cannot remove owner or an unknown subject');
    if (member.status === 'active') { member.status = 'removing'; member.epoch += 1; }
    const removal = this.state.removals[sub] ||= { startedAt: new Date().toISOString(), status: 'pending' };
    for (const token of this.state.gitTokens.filter(row => row.sub === sub && !row.revoked)) {
      await this.adapters.revokeToken(token.id);
      requireThat(await this.adapters.tokenRevoked(token.id), 'Git revocation not observed');
      token.revoked = true;
    }
    for (const key of this.state.memoryKeys.filter(row => row.sub === sub && !row.revoked)) {
      await this.adapters.deleteMemoryKey(key.hash);
      requireThat(await this.adapters.memoryKeyAbsent(key.hash), 'Memory revocation not observed');
      key.revoked = true;
    }
    // The wrapper denies live roster status immediately, including old signed sessions.
    member.status = 'removed'; removal.status = 'complete'; removal.finishedAt = new Date().toISOString();
    return removal;
  }
}

export async function pilotMemory(request, env, controller, secret) {
  const path = new URL(request.url).pathname;
  if (path === '/_memory/join') {
    requireThat(request.method === 'POST', 'Pilot join requires POST');
    const actor = await verifySession(secret, request.headers.get('X-Pilot-Session'), controller.state);
    const input = await request.json();
    requireThat(typeof input.machine === 'string' && input.machine.length <= 100 && input.machine.length > 0 && !input.token && !input.email, 'Pilot join takes only a machine; identity comes from the signed fixture session');
    const key = newKey(actor.email), hash = await hashKey(key);
    const expiresAt = new Date(Date.now() + 1800000).toISOString();
    await env.MEMORY_DB.prepare('INSERT INTO memory_keys (hash,email,role,created_at,machine,expires_at,reader,github_id) VALUES (?,?,?,?,?,?,?,?)').bind(hash, actor.email, actor.role === 'owner' ? 'admin' : 'member', new Date().toISOString(), input.machine, expiresAt, 0, `pilot:${actor.sub}`).run();
    controller.state.memoryKeys.push({ hash, sub: actor.sub, revoked: false });
    return Response.json({ success: true, result: { key, email: actor.email, expiresAt } });
  }
  const bearer = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  // Hash once before selecting the controller-owned grant; no GitHub join is forwarded.
  const hash = await hashKey(bearer);
  const grant = controller.state.memoryKeys.find(each => each.hash === hash && !each.revoked);
  requireThat(grant && controller.state.roster[grant.sub]?.status === 'active', 'Memory member removed or key unknown');
  return handleMemory(request, env);
}
