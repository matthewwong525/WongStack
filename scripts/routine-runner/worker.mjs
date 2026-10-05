// The routine runner: one Worker in the person's own Cloudflare account, on the pinned SDK. A clock
// starts each routine's run in a short-lived computer; /routine's client manages the list over HTTP.
// Wiring only: schedule.mjs owns when, routines.mjs the list and the management API, run.mjs what
// one run does and is given. wiki/stack/cloud-routines.md owns how a routine runs.
import { DurableObject, WorkflowEntrypoint } from 'cloudflare:workers';
import { Sandbox, getSandbox } from '@cloudflare/sandbox';
import { API_VERSION, authorized, book, manage, notFound, tick } from './routines.mjs';
import { BOUNDS, missing, runRoutine } from './run.mjs';

const configOf = (env) => JSON.parse(env.WONG_ROUTINES);
const listOf = (env) => env.ROUTINES.get(env.ROUTINES.idFromName('list'));

/** The short-lived computer of one run: the stock Sandbox image, reached by nothing from outside. */
export class RoutineSandbox extends Sandbox {}

/** The list of routines and its clock: one alarm, at the earliest next run. */
export class Routines extends DurableObject {
  routines() {
    return book(this.ctx.storage);
  }

  deps() {
    return {
      key: this.env.ROUTINES_KEY,
      routines: this.routines(),
      ready: (routine) => missing(routine, this.env, configOf(this.env)),
      start: (routine, runId) => this.env.RUN.create({ id: runId, params: { routineId: routine.id, runId } }),
      setAlarm: (at) => (at === null ? this.ctx.storage.deleteAlarm() : this.ctx.storage.setAlarm(at)),
      about: { runner: API_VERSION, route: configOf(this.env).route },
    };
  }

  fetch(request) {
    return manage(request, this.deps());
  }

  async alarm() {
    const { setAlarm, ...deps } = this.deps();
    await setAlarm(await tick(deps.routines, deps));
  }

  // What a run asks of the list.
  routine(id) {
    return this.routines().get(id);
  }

  takeSlot(runId) {
    return this.routines().takeSlot(runId);
  }

  leaveSlot(runId) {
    return this.routines().leaveSlot(runId);
  }

  /**
   * One run's key to the install's Artifacts repository: made once and kept here for the run, so a
   * run Cloudflare restarts gets the same key and its saved output can still hide it.
   */
  async mint(runId) {
    const kept = await this.ctx.storage.get(`access:${runId}`);
    if (kept) return kept;
    const repository = await this.env.ARTIFACTS.get(configOf(this.env).repo);
    const { plaintext } = await repository.createToken('write', BOUNDS.tokenSeconds);
    await this.ctx.storage.put(`access:${runId}`, plaintext);
    return plaintext;
  }

  async finish(routineId, runId, result) {
    await this.ctx.storage.delete(`access:${runId}`);
    await this.routines().finish(routineId, runId, result);
    return true;
  }
}

/** One run of one routine. */
export class Run extends WorkflowEntrypoint {
  async run(event, step) {
    const { routineId, runId } = event.payload;
    const list = listOf(this.env);
    const routine = await step.do('routine', () => list.routine(routineId));
    if (!routine) return { status: 'gone' };
    let result;
    try {
      result = await runRoutine({
        routine, runId, step, env: this.env, config: configOf(this.env),
        sandbox: () => getSandbox(this.env.SANDBOX, runId),
        mint: () => list.mint(runId),
        slots: { take: () => list.takeSlot(runId), leave: () => list.leaveSlot(runId) },
      });
    } catch (error) {
      // The message of a failed step can quote what the step held, so it is never saved.
      result = { status: 'failed', note: `The run stopped on an error (${error?.name ?? 'Error'}).`, log: '' };
    }
    await step.do('result', () => list.finish(routineId, runId, result));
    return { status: result.status };
  }
}

// Everything without this install's routines key gets the same answer as an address that does not exist.
export default {
  async fetch(request, env) {
    if (!(await authorized(request, env.ROUTINES_KEY))) return notFound();
    return listOf(env).fetch(request);
  },
};
