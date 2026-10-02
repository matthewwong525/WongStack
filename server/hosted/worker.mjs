import { DurableObject } from 'cloudflare:workers';
import { CIWorkflow } from '@cloudflare/ci';
export { CiSandbox } from '@cloudflare/ci/worker';
import { ProjectService, safeRoute } from './service.mjs';
import { HostedProvider } from './provider.mjs';
import { runHostedPipeline } from './pipeline.mjs';
import { reply } from './security.mjs';

export class HostedProject extends DurableObject {
  async fetch(request) {
    return this.ctx.blockConcurrencyWhile(async () => {
      const service = new ProjectService(this.ctx, this.env);
      try { return reply(await service.dispatch(request)); }
      catch (error) { return reply({ error: error.status && error.status < 500 ? error.message : 'Hosted project operation failed; inspect safe status' }, error.status || 502); }
    });
  }
  async alarm() { return this.ctx.blockConcurrencyWhile(() => new ProjectService(this.ctx, this.env).recover()); }
}
export class HostedCI extends CIWorkflow {
  async pipeline(event, step, ci) {
    const config = JSON.parse(this.env.HOSTED_CONFIG);
    const stub = this.env.PROJECTS.get(this.env.PROJECTS.idFromName(event.payload.repo));
    const call = async (operation, input) => {
      const response = await stub.fetch(new Request(`https://project/internal/${operation}`, { method: 'POST', body: JSON.stringify(input) }));
      const row = await response.json(); if (!response.ok) throw new Error(row.error); return row;
    };
    await runHostedPipeline(event, ci, { config, call, provider: new HostedProvider(config, this.env.CF_TOKEN), loadBundle: (sha, ref, digest) => call('bundle', { sha, ref, digest }), fetch: (...args) => fetch(...args), sleep: (name, duration) => step.sleep(name, duration) });
  }
}
export default { fetch: safeRoute };
