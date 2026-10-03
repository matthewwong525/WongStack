import { DurableObject } from 'cloudflare:workers';
import { CIWorkflow, cloudflareArtifacts } from '@cloudflare/ci';
export { CiSandbox } from '@cloudflare/ci/worker';
import { ProjectService, safeRoute } from './service.mjs';
import { HostedProvider } from './provider.mjs';
import { runHostedPipeline } from './pipeline.mjs';
import { trackedSourceAdapter } from './source-checkout.mjs';
import { reply } from './security.mjs';
import { ProjectOperations } from './serialization.mjs';

export class HostedProject extends DurableObject {
  operations = new ProjectOperations();
  async fetch(request) {
    try {
      const pending = this.operations.run(() => new ProjectService(this.ctx, this.env).dispatch(request));
      // Continue durable checkpoints if the requesting client disconnects. This
      // does not release serialization or turn an uncertain write into success.
      this.ctx.waitUntil(pending.catch(() => {}));
      return reply(await pending);
    } catch (error) { return reply({ error: error.status && error.status < 500 ? error.message : 'Hosted project operation failed; inspect safe status' }, error.status || 502); }
  }
  async alarm() { return this.operations.run(() => new ProjectService(this.ctx, this.env).recover()); }
}
export class HostedCI extends CIWorkflow {
  static getProvider() { return trackedSourceAdapter(cloudflareArtifacts()); }
  async pipeline(event, step, ci) {
    const config = JSON.parse(this.env.HOSTED_CONFIG);
    const stub = this.env.PROJECTS.get(this.env.PROJECTS.idFromName(event.payload.repo));
    const call = (operation, input) => step.do(`hosted-controller-${operation}`, { retries: { limit: 0, delay: '1 second' }, timeout: '3 minutes' }, async () => {
      const response = await stub.fetch(new Request(`https://project/internal/${operation}`, { method: 'POST', body: JSON.stringify(input) }));
      const row = await response.json(); if (!response.ok) throw new Error(row.error); return row;
    });
    await runHostedPipeline(event, ci, { config, call, provider: new HostedProvider(config, this.env.CF_TOKEN), loadBundle: (sha, ref, digest) => call('bundle', { sha, ref, digest }), fetch: (...args) => fetch(...args), sleep: (name, duration) => step.sleep(name, duration) });
  }
}
export default { fetch: safeRoute };
