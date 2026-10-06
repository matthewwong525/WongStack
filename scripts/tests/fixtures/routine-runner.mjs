// Stand-ins for what the routine runner gets from Cloudflare and from pi-ai, for its script tests:
// a Durable Object's storage, a Workflow's steps, a Sandbox, the model catalog and its test request,
// and the runner's own API over HTTP.
import { createServer } from 'node:http';
import { GATEWAY } from '../../routine-runner/models.mjs';
import { book, manage } from '../../routine-runner/routines.mjs';
import { missing } from '../../routine-runner/run.mjs';

export const MAKER = { id: '0123456789ab', name: 'Ada', email: 'ada@example.com' };
export const ROUTINES_KEY = 'routines-key-for-tests';
/** Monday 5 October 2026, 08:00 UTC. */
export const START = Date.parse('2026-10-05T08:00:00Z');

/** What a create sends, with any field replaced. */
export const routineInput = (overrides = {}) => ({ name: 'improve demo', cron: '0 9 * * 1-5', timezone: 'UTC', prompt: '/improve', maker: MAKER, ...overrides });

/** A few of the models Cloudflare's AI service lists, as the runner's catalog answers them. */
export const CATALOG = [
  { id: 'workers-ai/@cf/moonshotai/kimi-k2.7-code', name: 'Kimi K2.7 Code' },
  { id: 'workers-ai/@cf/zai-org/glm-5.3', name: 'GLM-5.3' },
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5' },
  { id: 'gpt-5.5', name: 'GPT-5.5' },
];
export const KIMI = CATALOG[0].id;
/** A Cloudflare pick as the list reports it in use. */
export const PICKED = { via: 'cloudflare', provider: GATEWAY, model: KIMI };
/** The runner's own config: where the project lives, and the account and gateway a picked model is reached through. */
export const CONFIG = { account: 'a'.repeat(32), route: 'artifacts', gateway: 'demo-routines' };
/** The Worker's secrets once setup has run: the token that can only run models. */
export const AI_RUN_TOKEN = 'cf-ai-run-token-secret';
export const installed = (more = {}) => ({ AI_RUN_TOKEN, ...more });

/**
 * A stand-in for pi-ai in the Worker. `accepts(candidate)` says which test request works; a refusal
 * answers `status` and `message`. `tested` lists every request made, key included.
 */
export function fakeModels({ accepts = () => true, status = 401, message = 'refused by the service' } = {}) {
  const tested = [];
  return {
    tested,
    catalog: async () => CATALOG,
    test: async (candidate) => {
      tested.push(candidate);
      return accepts(candidate) ? { ok: true, status: 200 } : { ok: false, status, message: typeof message === 'function' ? message(candidate) : message };
    },
  };
}

/** A clock tests move by hand. */
export function clock(start = START) {
  let at = start;
  return { now: () => at, set: (ms) => (at = ms), advance: (ms) => (at += ms) };
}

/** A Durable Object's storage: values are copied in and out, as the real one does. */
export function memoryStorage() {
  const map = new Map();
  return {
    map,
    get: async (key) => structuredClone(map.get(key)),
    put: async (key, value) => void map.set(key, structuredClone(value)),
    delete: async (key) => map.delete(key),
    list: async ({ prefix = '' } = {}) => new Map([...map].filter(([key]) => key.startsWith(prefix)).sort(([a], [b]) => (a < b ? -1 : 1)).map(([key, value]) => [key, structuredClone(value)])),
  };
}

/** A list of routines on a hand-moved clock, with ids `a1000000`, `a2000000`, and so on (`b1000000` from the tenth). */
export function list(time = clock()) {
  const storage = memoryStorage();
  let serial = 0;
  return { time, storage, routines: book(storage, { now: time.now, newId: () => `${++serial < 10 ? 'a' : 'b'}${serial}`.padEnd(8, '0') }) };
}

/**
 * A Workflow's steps. Each `do` runs its callback once and records its name and what it returned,
 * which is what Cloudflare stores; `sleep` moves the clock.
 */
export function steps(time = clock()) {
  const done = [];
  const seconds = (duration) => Number(/^(\d+) seconds$/.exec(duration)[1]);
  return {
    done,
    names: () => done.map((step) => step.name),
    stored: () => JSON.stringify(done.map((step) => step.result)),
    step: {
      async do(name, config, callback) {
        const result = await (callback ?? config)();
        done.push({ name, config: callback ? config : null, result });
        return result;
      },
      async sleep(name, duration) {
        done.push({ name, result: null });
        time.advance(seconds(duration) * 1000);
      },
    },
  };
}

/**
 * A Sandbox. `bootstrap` is what the bootstrap command answers (`{ exitCode, stdout, stderr }`, or
 * an Error to throw), `polls` how many status reads the assistant stays running for (Infinity for
 * a run that never ends), `exitCode` and `output` how it ends.
 */
export function sandbox({ bootstrap = { exitCode: 0, stdout: 'WONG_BOOTSTRAPPED abc\n', stderr: '' }, polls = 1, exitCode = 0, output = 'done\n', errors = '' } = {}) {
  const calls = [];
  const files = {};
  let reads = 0;
  const box = {
    async writeFile(path, content) { files[path] = content; },
    async exec(command, options) {
      calls.push({ call: 'exec', command, options });
      if (bootstrap instanceof Error) throw bootstrap;
      return { success: bootstrap.exitCode === 0, ...bootstrap };
    },
    async startProcess(command, options) {
      calls.push({ call: 'startProcess', command, options });
      return { id: options.processId };
    },
    async getProcess(id) {
      calls.push({ call: 'getProcess', id });
      return ++reads > polls ? { id, status: exitCode === 0 ? 'completed' : 'failed', exitCode } : { id, status: 'running' };
    },
    async killProcess(id) { calls.push({ call: 'killProcess', id }); },
    async getProcessLogs(id) {
      calls.push({ call: 'getProcessLogs', id });
      return { stdout: output, stderr: errors, processId: id };
    },
    async destroy() { calls.push({ call: 'destroy' }); },
  };
  return { box, calls, files, called: (name) => calls.filter((each) => each.call === name) };
}

/**
 * The runner's management API over HTTP, on the real list and router with stand-in storage. `env` is
 * the Worker's secrets, changed by tests as `routine.mjs` would through Cloudflare; `started` lists
 * the runs handed to the Workflow; `models` is the stand-in for pi-ai. `answer` replaces every reply, or only its first `times`,
 * for a runner that has changed.
 */
export async function fakeRunner({ config = {}, env = {}, time = clock(), models = fakeModels() } = {}) {
  const { routines, storage } = list(time);
  const wired = { ...CONFIG, ...config };
  const state = { env: { ...env }, started: [], alarm: null, answer: null, calls: [], models };
  const deps = () => ({
    // The key the client's setup stored for the Worker, else the fixed one of an install made earlier.
    key: state.env.ROUTINES_KEY ?? ROUTINES_KEY, routines,
    ready: (choice) => missing(state.env, wired, choice),
    start: async (routine, runId) => void state.started.push({ id: routine.id, runId }),
    setAlarm: async (at) => void (state.alarm = at),
    models: state.models,
    about: { route: wired.route },
  });
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    state.calls.push(`${req.method} ${req.url}`);
    if (state.answer) {
      const forced = state.answer;
      // `times` forced replies, then the runner answers as itself again.
      if (forced.times !== undefined && --forced.times <= 0) state.answer = null;
      res.writeHead(forced.status, { 'Content-Type': forced.type ?? 'application/json' });
      return res.end(forced.body);
    }
    const request = new Request(`http://runner${req.url}`, { method: req.method, headers: req.headers, body: chunks.length ? Buffer.concat(chunks) : undefined });
    const response = await manage(request, deps());
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return {
    url: `http://127.0.0.1:${server.address().port}`, state, routines, storage, time,
    close: () => new Promise((done) => {
      server.closeAllConnections();
      server.close(done);
    }),
  };
}
