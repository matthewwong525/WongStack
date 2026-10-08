// The check runner: one Worker in the person's own Cloudflare account, on the pinned SDK. A push to
// the install's Artifacts repository starts a run; the run checks the commit, and deploys it only
// when its checks pass. pipeline.mjs owns what a run does; wiki/stack/artifacts-route.md owns the route.
import { DurableObject } from 'cloudflare:workers';
import { CIWorkflow } from '@cloudflare/ci';
import { BOUNDS, eventParams, leaveTurn, runPipeline, takeTurn } from './pipeline.mjs';
import { runId } from './run-id.mjs';

export { CiSandbox } from '@cloudflare/ci/worker';

const configOf = (env) => JSON.parse(env.WONG_RUNNER);

/** The line of runs: one run at a time for the repository. */
export class Turns extends DurableObject {
  async take(id) {
    const { line, mine } = takeTurn((await this.ctx.storage.get('line')) ?? [], id, Date.now());
    await this.ctx.storage.put('line', line);
    return mine;
  }

  async leave(id) {
    await this.ctx.storage.put('line', leaveTurn((await this.ctx.storage.get('line')) ?? [], id));
    return true;
  }
}

export class Checks extends CIWorkflow {
  // A push starts this under an id Cloudflare picks. That first run only starts the real one, named
  // for the commit and branch, so the verbs can find it and a repeated event starts nothing twice.
  async run(event, step) {
    if ('provider' in event.payload) {
      this.outcome = undefined;
      await super.run(event, step);
      return this.outcome;
    }
    const params = eventParams(event.payload, configOf(this.env));
    if (!params) return { started: null };
    const id = await runId(params.sha, params.ref);
    await step.do('start', async () => (await this.env.CI_WORKFLOW.createBatch([{ id, params }])).length);
    return { started: id };
  }

  async pipeline(event, step, ci) {
    const turns = this.env.TURNS.get(this.env.TURNS.idFromName('line'));
    const id = event.instanceId;
    let mine = false;
    for (let poll = 0; poll < BOUNDS.turnPolls && !mine; poll++) {
      mine = await step.do(`turn-${poll}`, () => turns.take(id));
      if (!mine) await step.sleep(`wait-${poll}`, `${BOUNDS.turnSeconds} seconds`);
    }
    try {
      this.outcome = mine
        ? await runPipeline(event.payload, ci, configOf(this.env))
        // Never started is not failed: the verbs read it as cut off, and can start this run again.
        : { commit: event.payload.sha, ref: event.payload.ref, result: 'interrupted', stage: 'turn', reason: 'an earlier run never finished, so this one did not start' };
    } finally {
      await step.do('leave', () => turns.leave(id));
    }
  }
}

// The runner answers no web request: results are read through Cloudflare's own API.
export default {
  fetch() {
    return new Response(null, { status: 404 });
  },
};
