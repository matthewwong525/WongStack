// The routine runner: one Worker in the person's own Cloudflare account, on the pinned SDK. A clock
// starts each routine's run in a short-lived computer; /routine's client manages the list over HTTP.
// Wiring only: schedule.mjs owns when, routines.mjs the list and the management API, models.mjs
// which model, run.mjs what one run does and is given. wiki/stack/cloud-routines.md owns how a
// routine runs.
import { DurableObject, WorkflowEntrypoint } from 'cloudflare:workers';
import { Sandbox, getSandbox } from '@cloudflare/sandbox';
import { GATEWAY, modelEnv } from './models.mjs';
import { API_VERSION, authorized, book, manage, notFound, tick } from './routines.mjs';
import { BOUNDS, missing, runRoutine } from './run.mjs';
import toolsManifest from './tools/package.json' with { type: 'json' };
import toolsLock from './tools/package-lock.json' with { type: 'json' };

const configOf = (env) => JSON.parse(env.WONG_ROUTINES);
const listOf = (env) => env.ROUTINES.get(env.ROUTINES.idFromName('list'));
/** What a run installs in its computer: this folder's own locked list, written there as files. */
const TOOLS = { manifest: JSON.stringify(toolsManifest), lock: JSON.stringify(toolsLock) };
// A hosted model can take ten seconds or more to answer its first request.
const TEST_MS = 60_000;
/** The HTTP status a refusal's own words start with, when the request never handed one back. */
const statusIn = (message) => Number(/^\s*([45]\d\d)\b/.exec(String(message ?? ''))?.[1]) || null;

// pi-ai and its catalog load on the first model request, never when the clock rings.
const catalog = async () => (await import('@earendil-works/pi-ai/providers/all')).builtinModels();

/** The models Cloudflare's AI service lists at the pinned version. */
async function gatewayModels() {
  return (await catalog()).getModels(GATEWAY).map(({ id, name }) => ({ id, name }));
}

/**
 * One small request to `model`, in memory: with `key`, a pasted key under its service's own name;
 * without one, through this install's AI Gateway on the model-only token. Answers
 * `{ ok, status, message }`, and no message carries the key or the token.
 */
async function testModel({ provider, model, key }, env) {
  const config = configOf(env);
  const held = { key, token: env.AI_RUN_TOKEN, account: config.account, gateway: config.gateway };
  const scoped = modelEnv({ via: key ? 'key' : 'cloudflare', provider, model }, held);
  if (!scoped) return { ok: false, status: null, message: key ? `${provider} takes no pasted key.` : 'The runner holds no key for Cloudflare\'s AI service. Run setup again.' };
  const models = await catalog();
  const found = models.getModel(provider, model);
  if (!found) return { ok: false, status: 404, message: `No model "${model}" is listed for ${provider}.` };
  let status = null;
  const hide = (text) => [key, env.AI_RUN_TOKEN].filter(Boolean).reduce((out, secret) => out.replaceAll(secret, '[key]'), String(text ?? ''));
  try {
    const reply = await models.complete(found, { messages: [{ role: 'user', content: 'Reply with the one word OK.', timestamp: Date.now() }] }, {
      env: scoped, maxTokens: 16, maxRetries: 0, timeoutMs: TEST_MS, signal: AbortSignal.timeout(TEST_MS), onResponse: (response) => { status = response.status; },
    });
    const refused = reply.stopReason === 'error' || reply.stopReason === 'aborted';
    return refused ? { ok: false, status: status ?? statusIn(reply.errorMessage), message: hide(reply.errorMessage) } : { ok: true, status };
  } catch (error) {
    return { ok: false, status: status ?? statusIn(error?.message), message: hide(error?.message ?? error) };
  }
}

/** The short-lived computer of one run: the stock Sandbox image, reached by nothing from outside. */
export class RoutineSandbox extends Sandbox {}

/** The list of routines, the model they run on, and the clock: one alarm, at the earliest next run. */
export class Routines extends DurableObject {
  routines() {
    return book(this.ctx.storage);
  }

  deps() {
    return {
      key: this.env.ROUTINES_KEY,
      routines: this.routines(),
      ready: (choice) => missing(this.env, configOf(this.env), choice),
      start: (routine, runId) => this.env.RUN.create({ id: runId, params: { routineId: routine.id, runId } }),
      setAlarm: (at) => (at === null ? this.ctx.storage.deleteAlarm() : this.ctx.storage.setAlarm(at)),
      models: { catalog: gatewayModels, test: (candidate) => testModel(candidate, this.env) },
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

  model() {
    return this.routines().model();
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
    const choice = await step.do('model', () => list.model());
    let result;
    try {
      result = await runRoutine({
        routine, runId, step, choice, tools: TOOLS, env: this.env, config: configOf(this.env),
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
