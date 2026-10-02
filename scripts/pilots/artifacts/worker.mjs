import { DurableObject } from 'cloudflare:workers';
import { CIWorkflow } from '@cloudflare/ci';
export { CiSandbox } from '@cloudflare/ci/worker';
import { initialState, PilotController, pilotMemory, verifySession, branchName } from './core.mjs';
import { runPipeline } from './pipeline.mjs';
import { ManagedBuilds } from './builds.mjs';
import { DirectUpload } from './direct.mjs';

const configOf = env => JSON.parse(env.PILOT_CONFIG);
const stubOf = env => env.PILOT_STATE.get(env.PILOT_STATE.idFromName(configOf(env).run));
const reply = value => Response.json(value, { headers: { 'Cache-Control': 'no-store' } });

export class CI extends CIWorkflow {
  async pipeline(event, step, ci) {
    const call = async (operation, input) => {
      const response = await stubOf(this.env).fetch(new Request(`https://controller/internal/${operation}`, { method: 'POST', body: JSON.stringify(input) }));
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
    };
    const config = configOf(this.env);
    const request = async (path, method = 'GET', body, _allow404 = false, scope) => {
      const multipart = body instanceof FormData;
      const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, { method, headers: { Authorization: `Bearer ${scope === 'deployment' ? this.env.CF_TOKEN : this.env.BUILDS_API_TOKEN}`, ...(config.backend === 'direct-api' && scope === 'deployment' ? { 'Cloudflare-Workers-Script-Api-Date': '2025-08-01' } : {}), ...(!multipart ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: multipart ? body : JSON.stringify(body) } : {}) });
      const result = await response.json();
      if (!response.ok || result.success === false) throw new Error(`Pilot API HTTP ${response.status}, code ${result.errors?.[0]?.code || 'unknown'}`);
      return result.result;
    };
    const adapter = config.backend === 'direct-api' ? new DirectUpload(config, request, step) : config.backend === 'workers-builds' ? new ManagedBuilds(config, request, step) : undefined;
    await runPipeline(event, ci, call, config, adapter);
  }
}

export class PilotState extends DurableObject {
  async fetch(request) {
    return this.ctx.blockConcurrencyWhile(async () => {
      const config = configOf(this.env);
      const state = await this.ctx.storage.get('state') || initialState(config);
      const api = async (path, method = 'GET', body) => {
        const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${config.account}/artifacts/namespaces/${config.namespace}/${path}`, { method, headers: { Authorization: `Bearer ${this.env.CF_TOKEN}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(`Artifacts API ${response.status}, code ${result.errors?.[0]?.code || 'unknown'}`);
        return result.result;
      };
      const db = this.env.MEMORY_DB;
      const controller = new PilotController(state, {
        ...config, fetch: (...args) => fetch(...args),
        head: async ref => {
          const rows = await api(`repos/${encodeURIComponent(config.repo)}/log?ref=${encodeURIComponent(branchName(ref))}&limit=1`);
          // Fail closed on an SDK/API schema change; never substitute the event's asserted SHA.
          return rows[0]?.hash;
        },
        issueToken: async (repo, scope, ttl) => {
          const result = await api('tokens', 'POST', { repo, scope, ttl });
          return { ...result, expiresAt: result.expires_at };
        },
        revokeToken: id => api(`tokens/${encodeURIComponent(id)}`, 'DELETE'),
        tokenRevoked: async id => {
          // Observe the exact tracked ID; an unreadable/paginated response cannot prove revocation.
          for (let page = 1; page <= 100; page++) {
            const rows = await api(`repos/${encodeURIComponent(config.repo)}/tokens?state=all&per_page=100&page=${page}`);
            const row = rows.find(each => each.id === id);
            if (row) return row.state === 'revoked' || row.state === 'expired';
            if (rows.length < 100) return false;
          }
          return false;
        },
        deleteMemoryKey: hash => db.prepare('DELETE FROM memory_keys WHERE hash=?').bind(hash).run(),
        memoryKeyAbsent: async hash => !await db.prepare('SELECT hash FROM memory_keys WHERE hash=?').bind(hash).first(),
      });
      try {
        const path = new URL(request.url).pathname;
        if (path.startsWith('/_memory/')) return await pilotMemory(request, this.env, controller, this.env.SESSION_SECRET);
        const input = request.method === 'POST' ? await request.json() : {};
        // Internal paths exist only on this DO capability. The public Worker never forwards them.
        if (path.startsWith('/internal/')) return reply(await internal(controller, path.slice('/internal/'.length), input));
        const actor = await verifySession(this.env.SESSION_SECRET, request.headers.get('X-Pilot-Session'), state);
        if (path === '/state') {
          controller.owner(actor);
          const { memoryKeys: _keys, ...safe } = state;
          const candidates = Object.fromEntries(Object.entries(safe.candidates).map(([key, { code: _code, ...candidate }]) => [key, candidate]));
          return reply({ ...safe, candidates });
        }
        if (request.method !== 'POST') throw new Error('POST required');
        if (path === '/member') { controller.addMember(actor, input.sub, input.email); return reply({ added: input.sub }); }
        if (path === '/git-token') return reply(await controller.gitToken(actor, input.scope));
        if (path === '/remove') return reply(await controller.remove(actor, input.sub));
        if (path === '/stop') { controller.owner(actor); state.stopped = true; return reply({ stopped: true, active: state.active, publication: state.publication }); }
        if (path === '/drain-buckets') {
          controller.owner(actor);
          if (!state.stopped) throw new Error('Stop controller and terminate runner instances before draining buckets');
          const counts = {};
          for (const [name, bucket] of [['cache', this.env.BACKUP_BUCKET], ['memory', this.env.MEMORY_BUCKET]]) {
            let total = 0;
            for (let page = 0; page < 100; page++) {
              const listed = await bucket.list({ limit: 1000 });
              if (!listed.objects.length) break;
              await bucket.delete(listed.objects.map(row => row.key)); total += listed.objects.length;
              if (page === 99) throw new Error('Bucket cleanup bound reached; retry drain');
            }
            if ((await bucket.list({ limit: 1 })).objects.length) throw new Error('Bucket cleanup readback failed');
            counts[name] = total;
          }
          return reply({ drained: counts, readbacksEmpty: true });
        }
        if (path === '/approve') return reply(await controller.approve(actor, input.sha, input.ref));
        if (path === '/publish') {
          controller.owner(actor);
          const approval = state.approvals[input.id];
          if (!approval || approval.subject !== actor.sub || approval.status !== 'approved') throw new Error('Owner approval record required');
          const workflow = await this.env.CI_WORKFLOW.create({ id: `publish-${approval.id}`, params: { provider: 'cloudflare-artifacts', providerData: { namespace: config.namespace }, owner: config.namespace, repo: config.repo, sha: approval.sha, ref: approval.ref, event: { type: 'push' }, trigger: 'push', pilotApproval: approval.id } });
          return reply({ workflow: workflow.id });
        }
        throw new Error('Unknown pilot operation');
      } catch (error) { return Response.json({ error: error.message }, { status: 403 }); }
      finally { await this.ctx.storage.put('state', state); }
    });
  }
}

async function internal(controller, operation, input) {
  if (operation === 'start') return controller.start(input.params, input.job);
  if (operation === 'build-started') {
    const candidate = controller.candidate(input.sha, input.ref);
    if (candidate.status !== 'checking' || !input.id || candidate.buildID && candidate.buildID !== input.id) throw new Error('Managed build tracking mismatch');
    candidate.buildID = input.id; return { tracked: input.id };
  }
  if (operation === 'preview') {
    const result = await controller.preview(input.sha, input.ref, input.result, input.deployment);
    if (input.build) controller.candidate(input.sha, input.ref).build = input.build;
    return result;
  }
  if (operation === 'fail') { controller.fail(input.sha, input.ref); return { failed: true }; }
  if (operation === 'begin-publication') {
    const approval = controller.state.approvals[input.id];
    if (approval?.status !== 'published') await controller.currentHead(approval?.sha, approval?.ref);
    return controller.beginPublication(input.id, input.job);
  }
  if (operation === 'finish-publication') { controller.finishPublication(input.id, input.sha, input.version); return { published: input.sha }; }
  throw new Error('Unknown internal operation');
}

export default {
  fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/internal/') || !['/state', '/member', '/git-token', '/remove', '/stop', '/approve', '/publish', '/drain-buckets'].includes(path) && !path.startsWith('/_memory/')) return new Response(null, { status: 404 });
    return stubOf(env).fetch(request);
  },
};
