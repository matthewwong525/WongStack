// The list of routines, its clock, and the management API, with no Cloudflare import, so the script
// tests can run it. worker.mjs wires it to a Durable Object's storage and alarm
// (wiki/stack/cloud-routines.md owns how a routine runs).
//
// `storage` is the four calls a Durable Object's storage answers: get(key), put(key, value),
// delete(key), and list({ prefix }) returning a Map. One key holds one routine; a run's saved output
// has its own key, so a long log never crowds the list.
import { invalidCronField, invalidTimezone, nextRun, normalizeCron } from './schedule.mjs';

/** The shape of the management API's answers. /routine's client stops when this is not the one it knows. */
export const API_VERSION = 1;

export const LIMITS = {
  /** Results kept for each routine. */
  results: 10,
  /** How long one run may take, start to finish. */
  runMs: 30 * 60_000,
  /** A run not heard from for this long is counted as lost, so its routine can run again. */
  lostMs: 45 * 60_000,
  /** Short-lived computers running at once; a later run waits its turn. */
  slots: 2,
  logLines: 200,
  logChars: 100_000,
  routines: 50,
  nameChars: 80,
  promptChars: 20_000,
  keys: 10,
};

export const AGENTS = ['claude', 'codex'];

const KEY_NAME = /^[A-Z][A-Z0-9_]{0,63}$/;
const MAKER_ID = /^[0-9a-f]{12}$/;
// Never a run's to hold: the person's Cloudflare token, the publishing keys, this runner's own key, and sign-ins.
const FORBIDDEN_KEYS = /^(CLOUDFLARE_API_TOKEN|CLOUDFLARE_MEMORY_TOKEN|CF_TOKEN|GITHUB_TOKEN|GH_TOKEN|WONG_ROUTINES_KEY|WONG_ROUTINE_.*|ROUTINES_KEY|MEMORY_TOKEN|SIGNIN_.*|RUN_.*)$/;

/** Returns null when a routine may name `name` as an extra key, else why not. */
export function invalidKeyName(name) {
  if (!KEY_NAME.test(String(name ?? ''))) return `"${name}" is not a key name: use capital letters, digits, and _.`;
  if (FORBIDDEN_KEYS.test(name)) return `A routine can not be given ${name}.`;
  return null;
}

/** A refused request: `status` for the API, `code` to tell refusals apart, and what to show. */
export class RoutineError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

const bad = (message, extra) => new RoutineError(400, 'input', message, extra);

function text(value, what, max) {
  const out = typeof value === 'string' ? value.trim() : '';
  if (!out) throw bad(`The ${what} is empty.`);
  if (out.length > max) throw bad(`The ${what} is longer than ${max} characters.`);
  return out;
}

function cadence(cron, timezone) {
  const field = invalidCronField(cron);
  if (field) throw bad(`Invalid cron "${cron}": ${field}.`, { field });
  const zone = invalidTimezone(timezone);
  if (zone) throw bad(zone, { field: 'timezone' });
  return { cron: normalizeCron(cron), timezone };
}

function maker(value) {
  const id = String(value?.id ?? '');
  if (!MAKER_ID.test(id)) throw bad('The routine does not say who made it.');
  return { id, name: text(value.name, 'maker\'s name', LIMITS.nameChars), email: text(value.email, 'maker\'s email', 254) };
}

function keyNames(value) {
  if (!Array.isArray(value ?? [])) throw bad('The extra keys are not a list of names.');
  const names = [...new Set(value ?? [])];
  if (names.length > LIMITS.keys) throw bad(`A routine names at most ${LIMITS.keys} extra keys.`);
  for (const name of names) {
    const why = invalidKeyName(name);
    if (why) throw bad(why);
  }
  return names;
}

const hex = (bytes) => [...crypto.getRandomValues(new Uint8Array(bytes))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
const iso = (ms) => (ms === null || ms === undefined ? null : new Date(ms).toISOString());

/** What the list and every answer show of one routine: never a key's value, and no saved output. */
export function summarize(routine) {
  const results = routine.results ?? [];
  const last = results.at(-1) ?? null;
  return {
    id: routine.id,
    name: routine.name,
    cadence: `${routine.cron} (${routine.timezone})`,
    cron: routine.cron,
    timezone: routine.timezone,
    status: routine.status,
    agent: routine.agent,
    model: routine.model ?? null,
    keys: routine.keys,
    maker: { name: routine.maker.name, email: routine.maker.email },
    prompt: routine.prompt,
    nextRunAt: routine.status === 'active' ? iso(routine.nextRunAt) : null,
    running: Boolean(routine.running),
    lastRun: last && { status: last.status, at: iso(last.at), durationMs: last.durationMs ?? null, exitCode: last.exitCode ?? null, note: last.note ?? null },
    skippedTicks: results.filter((result) => result.status === 'skipped').length,
  };
}

/** The last `LIMITS.logLines` lines of a run's output, within `LIMITS.logChars`. */
export function lastLines(output) {
  const lines = String(output ?? '').replace(/\r\n/g, '\n').trimEnd().split('\n').slice(-LIMITS.logLines);
  return lines.join('\n').slice(-LIMITS.logChars);
}

/**
 * The list of routines over `storage`. `now` and `newId` are the clock and the id maker, replaced
 * in tests.
 */
export function book(storage, { now = () => Date.now(), newId = () => hex(4) } = {}) {
  const routineKey = (id) => `routine:${id}`;
  const logKey = (id, runId) => `log:${id}:${runId}`;
  const save = async (routine) => {
    await storage.put(routineKey(routine.id), routine);
    return routine;
  };

  async function list() {
    const all = [...(await storage.list({ prefix: 'routine:' })).values()];
    return all.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  }

  /** Exact id, then the name in any case, then a unique id prefix. Anything else changes nothing. */
  async function find(key) {
    const wanted = String(key ?? '').trim();
    if (!wanted) throw bad('Name or id a routine.');
    const all = await list();
    const byId = all.find((routine) => routine.id === wanted);
    if (byId) return byId;
    const lower = wanted.toLowerCase();
    const byName = all.filter((routine) => routine.name.toLowerCase() === lower);
    const found = byName.length ? byName : all.filter((routine) => routine.id.startsWith(lower));
    if (found.length === 1) return found[0];
    const brief = (routines) => routines.map(({ id, name }) => ({ id, name }));
    if (!found.length) throw new RoutineError(400, 'no-match', `No routine matches "${wanted}".`, { routines: brief(all) });
    throw new RoutineError(400, 'ambiguous', `"${wanted}" matches more than one routine. Use an id.`, { matches: brief(found) });
  }

  async function freeName(name, except) {
    const lower = name.toLowerCase();
    const clash = (await list()).find((routine) => routine.id !== except && routine.name.toLowerCase() === lower);
    if (clash) throw bad(`A routine named "${name}" already exists (${clash.id}). Pick another name.`);
  }

  function scheduled(routine) {
    const next = routine.status === 'active' ? nextRun(routine.cron, routine.timezone, now()) : null;
    if (routine.status === 'active' && next === null) throw bad(`The cron "${routine.cron}" never runs.`, { field: 'cron' });
    return { ...routine, nextRunAt: next };
  }

  async function create(input) {
    const name = text(input?.name, 'name', LIMITS.nameChars);
    const prompt = text(input.prompt, 'prompt', LIMITS.promptChars);
    if (!AGENTS.includes(input.agent)) throw bad(`Unknown agent "${input.agent ?? ''}". Use claude or codex.`);
    const model = input.model === undefined || input.model === null ? null : text(input.model, 'model', LIMITS.nameChars);
    const routine = scheduled({
      name, prompt, agent: input.agent, model, ...cadence(input.cron, input.timezone),
      keys: keyNames(input.keys), maker: maker(input.maker), status: 'active', createdAt: now(), running: null, results: [],
    });
    if ((await list()).length >= LIMITS.routines) throw bad(`This install already has ${LIMITS.routines} routines. Delete one first.`);
    await freeName(name);
    return save({ id: newId(), ...routine });
  }

  async function change(key, input) {
    const routine = await find(key);
    const { cron, timezone, prompt } = input ?? {};
    if (cron === undefined && timezone === undefined && prompt === undefined) throw bad('Nothing to change. Give a new time, timezone, or prompt.');
    const next = { ...routine, ...cadence(cron ?? routine.cron, timezone ?? routine.timezone) };
    if (prompt !== undefined) next.prompt = text(prompt, 'prompt', LIMITS.promptChars);
    return save(scheduled(next));
  }

  async function pause(key) {
    return save({ ...(await find(key)), status: 'paused', nextRunAt: null });
  }

  async function resume(key) {
    return save(scheduled({ ...(await find(key)), status: 'active' }));
  }

  async function remove(key) {
    const routine = await find(key);
    for (const logged of (await storage.list({ prefix: `log:${routine.id}:` })).keys()) await storage.delete(logged);
    await storage.delete(routineKey(routine.id));
    return routine;
  }

  /** Adds one result, keeps the last `LIMITS.results`, and drops the saved output of the ones let go. */
  async function record(id, result, log) {
    const routine = await storage.get(routineKey(id));
    if (!routine) return null;
    const entry = { at: now(), ...result };
    const results = [...routine.results, entry];
    for (const dropped of results.splice(0, Math.max(0, results.length - LIMITS.results))) {
      if (dropped.runId) await storage.delete(logKey(id, dropped.runId));
    }
    if (log !== undefined && entry.runId) await storage.put(logKey(id, entry.runId), lastLines(log));
    return save({ ...routine, results, running: routine.running?.runId === entry.runId ? null : routine.running });
  }

  /** The active routines whose time has come. */
  async function due() {
    const at = now();
    return (await list()).filter((routine) => routine.status === 'active' && routine.nextRunAt !== null && routine.nextRunAt <= at);
  }

  /** Moves a routine's clock on to its next run after now. */
  async function advance(id) {
    const routine = await storage.get(routineKey(id));
    return routine ? save(scheduled(routine)) : null;
  }

  /**
   * Starts one run's record. A routine never runs twice at once: while its last run is going, the
   * tick is recorded as skipped and nothing starts. A run not heard from in `LIMITS.lostMs` is
   * recorded as lost first.
   */
  async function begin(id, tick = null) {
    let routine = await storage.get(routineKey(id));
    if (!routine) return { started: false, reason: 'gone' };
    if (routine.running && now() - routine.running.startedAt >= LIMITS.lostMs) {
      routine = await record(id, { runId: routine.running.runId, status: 'lost', note: 'This run was never heard from again.' });
    }
    if (routine.running) {
      await record(id, { status: 'skipped', tick, note: 'The run before this one was still going.' });
      return { started: false, reason: 'running' };
    }
    const runId = `run-${id}-${now().toString(36)}-${hex(2)}`;
    await save({ ...routine, running: { runId, startedAt: now(), tick } });
    return { started: true, runId };
  }

  /** Ends a run: its result joins the list and its output is saved. A result for a run that is not this routine's current one is still kept. */
  async function finish(id, runId, result) {
    const { log, ...rest } = result ?? {};
    return record(id, { ...rest, runId, status: rest.status ?? 'failed' }, log ?? '');
  }

  /** When the clock must ring next: the earliest next run of an active routine, or null. */
  async function nextAlarm() {
    const times = (await list()).filter((routine) => routine.status === 'active' && routine.nextRunAt !== null).map((routine) => routine.nextRunAt);
    return times.length ? Math.min(...times) : null;
  }

  /** A routine's recent results, newest last, and the saved output of its latest run. */
  async function logs(key) {
    const routine = await find(key);
    const latest = routine.results.findLast((result) => result.runId);
    return { routine, results: routine.results.map((result) => ({ ...result, at: iso(result.at) })), log: latest ? ((await storage.get(logKey(routine.id, latest.runId))) ?? '') : '' };
  }

  /** One of the `LIMITS.slots` places for a running computer. True when `runId` holds one. */
  async function takeSlot(runId) {
    const held = ((await storage.get('slots')) ?? []).filter((slot) => now() - slot.at < LIMITS.lostMs);
    const mine = held.some((slot) => slot.id === runId) || held.length < LIMITS.slots;
    if (mine && !held.some((slot) => slot.id === runId)) held.push({ id: runId, at: now() });
    await storage.put('slots', held);
    return mine;
  }

  async function leaveSlot(runId) {
    await storage.put('slots', ((await storage.get('slots')) ?? []).filter((slot) => slot.id !== runId));
    return true;
  }

  const get = (id) => storage.get(routineKey(id));

  return { list, find, get, create, change, pause, resume, remove, record, due, advance, begin, finish, nextAlarm, logs, takeSlot, leaveSlot };
}

const STARTED_NOTES = {
  signin: ['needs-signin', 'Its maker has no working sign-in stored. Sign in again, then run it.'],
  'project-access': ['needs-project-access', 'The runner has no access to the project. Give it the project key, then run it.'],
};

/**
 * Starts one run of `routine`, unless something stops it first: a missing sign-in or project access
 * (`ready` names which) is recorded and nothing starts; a run still going is recorded as skipped.
 * `start(routine, runId)` hands the run to the Workflow.
 */
export async function launch(routines, routine, { start, ready, tick = null }) {
  const need = ready(routine);
  if (need) {
    const [status, note] = STARTED_NOTES[need];
    await routines.record(routine.id, { status, tick, note });
    return { started: false, reason: status };
  }
  const begun = await routines.begin(routine.id, tick);
  if (!begun.started) return begun;
  try {
    await start(routine, begun.runId);
  } catch (error) {
    await routines.finish(routine.id, begun.runId, { status: 'failed', note: `The run could not start: ${error?.message ?? error}` });
    return { started: false, reason: 'failed' };
  }
  return begun;
}

/**
 * The clock rang: every due routine's clock moves on, then its run starts. Returns when the clock
 * must ring next, or null. The caller sets the alarm.
 */
export async function tick(routines, { start, ready }) {
  for (const routine of await routines.due()) {
    await routines.advance(routine.id);
    await launch(routines, routine, { start, ready, tick: routine.nextRunAt });
  }
  return routines.nextAlarm();
}

// ---------------------------------------------------------------------------
// The management API

/** What every caller without the key gets, and every unknown address: nothing to learn from. */
export const notFound = () => new Response(null, { status: 404 });

const answer = (status, body) => new Response(JSON.stringify({ version: API_VERSION, ...body }), { status, headers: { 'Content-Type': 'application/json' } });

/** True when the request carries this install's routines key. Compared in constant time. */
export async function authorized(request, key) {
  const given = /^Bearer (.+)$/.exec(request.headers.get('Authorization') ?? '')?.[1];
  if (!key || !given) return false;
  const digest = async (value) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  const [a, b] = await Promise.all([digest(given), digest(key)]);
  let different = 0;
  for (let i = 0; i < a.length; i++) different |= a[i] ^ b[i];
  return different === 0;
}

async function body(request) {
  try {
    const parsed = JSON.parse(await request.text());
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {
    // Falls through to the one refusal.
  }
  throw bad('The request is not a JSON object.');
}

/**
 * Answers one management request. `deps`: `key` (this install's routines key), `routines` (the
 * list), `start` and `ready` (see launch), `setAlarm(ms|null)`, and `about` (what /status adds).
 * No answer carries a key's value.
 */
export async function manage(request, { key, routines, start, ready, setAlarm, about = {} }) {
  if (!(await authorized(request, key))) return notFound();
  const { pathname } = new URL(request.url);
  const [, root, rawKey, action, ...rest] = pathname.split('/');
  const route = `${request.method} /${root}${rawKey === undefined ? '' : '/:key'}${action === undefined ? '' : `/${action}`}`;
  if (rest.length) return notFound();
  const named = () => {
    try {
      return decodeURIComponent(rawKey);
    } catch {
      throw bad('The routine\'s name is not readable.');
    }
  };
  const rewind = async () => setAlarm(await routines.nextAlarm());
  try {
    switch (route) {
      case 'GET /status':
        return answer(200, { ok: true, ...about, routines: (await routines.list()).length });
      case 'GET /routines':
        return answer(200, { ok: true, routines: (await routines.list()).map(summarize) });
      case 'POST /routines': {
        const input = await body(request);
        const need = AGENTS.includes(input.agent) && input.maker ? ready({ agent: input.agent, maker: input.maker, keys: input.keys ?? [] }) : null;
        if (need) return answer(409, { ok: false, code: 'needs', needs: need, error: STARTED_NOTES[need][1] });
        const routine = await routines.create(input);
        await rewind();
        return answer(200, { ok: true, routine: summarize(routine) });
      }
      case 'GET /routines/:key':
        return answer(200, { ok: true, routine: summarize(await routines.find(named())) });
      case 'PATCH /routines/:key': {
        const routine = await routines.change(named(), await body(request));
        await rewind();
        return answer(200, { ok: true, action: 'change', routine: summarize(routine) });
      }
      case 'DELETE /routines/:key': {
        const routine = await routines.remove(named());
        await rewind();
        return answer(200, { ok: true, action: 'delete', routine: { id: routine.id, name: routine.name } });
      }
      case 'POST /routines/:key/pause':
      case 'POST /routines/:key/resume': {
        const routine = await routines[action](named());
        await rewind();
        return answer(200, { ok: true, action, routine: summarize(routine) });
      }
      case 'POST /routines/:key/run': {
        const routine = await routines.find(named());
        const run = await launch(routines, routine, { start, ready });
        return answer(200, { ok: true, action: 'run', run, routine: summarize(await routines.get(routine.id)) });
      }
      case 'GET /routines/:key/logs': {
        const { routine, results, log } = await routines.logs(named());
        return answer(200, { ok: true, action: 'logs', routine: { id: routine.id, name: routine.name }, results, log });
      }
      default:
        return notFound();
    }
  } catch (error) {
    if (!(error instanceof RoutineError)) throw error;
    return answer(error.status, { ok: false, code: error.code, error: error.message, ...error.extra });
  }
}
