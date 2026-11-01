// The daily's service on a computer (`daily.mjs serve`): each pass runs the watch, then starts one background AI run
// per job in the sweep list, and writes the rest to the journal. wiki/development/daily.md#the-daily-on-a-computer
import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { headlessCommand } from '../../memory/scripts/lib/headless.mjs';
import { runNode } from './addons.mjs';
import { HOLD_MS, beat, dailyAgent, readJson, sendText, userAt, watch, watchStops, writeJson } from './chief.mjs';
import { RUN_AGENTS, SETTINGS_DIR, localDay } from './config.mjs';
import { addLine, prune, readLines } from './journal.mjs';

const REFERENCES = fileURLToPath(new URL('../references/', import.meta.url));
export const SKILL_BRIEFS = join(REFERENCES, 'briefs');
export const DEFAULT_SWEEPS = join(REFERENCES, 'sweeps.json');
export const RUN_MS = 30 * 60e3;
/** A timed job's `at` time still counts this long after it; a later pass skips it, as a missed routine. */
export const AT_GRACE_MIN = 15;
const DAY_MS = 24 * 3600e3;
const BOARD_SOURCES = ['board', 'to-dos'];
const oneLine = value => String(value?.message ?? value).split('\n')[0].slice(0, 200);

// ---------------------------------------------------------------------------
// The sweep list and its briefs

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const repoPath = value => typeof value === 'string' && value.length > 0 && !value.startsWith('/') && !value.split(/[\\/]/).includes('..');
const BRIEF = /^[a-z0-9][a-z0-9-]*\.md$/;

/** The default list with the install's merged over it: its `events` over the default's, and its timed `sweeps`. */
export function loadSweeps({ project, file, base = DEFAULT_SWEEPS }) {
  const read = path => JSON.parse(readFileSync(path, 'utf8'));
  const own = file ? read(resolve(project, file)) : {};
  const merged = { ...read(base), ...own };
  merged.events = { ...read(base).events, ...own.events };
  merged.sweeps = own.sweeps ?? [];
  const bad = Object.entries(merged.events).find(([, entry]) => !plain(entry) || !BRIEF.test(entry.brief))?.[0]
    ?? merged.sweeps.find(sweep => !plain(sweep) || typeof sweep.id !== 'string' || !BRIEF.test(sweep.brief)
      || (sweep.check !== undefined && !repoPath(sweep.check)))?.id;
  if (bad !== undefined) throw new Error(`The sweep list has a bad entry: ${bad}. See wiki/development/daily.md#your-own-jobs.`);
  return merged;
}

/** Where briefs are found: the install's own folder first, then the skill's. */
export const briefFolders = project => [join(project, SETTINGS_DIR, 'briefs'), SKILL_BRIEFS];

/** Fills `{{name}}` from `fields`; strict throws on a missing value, else it is left empty. */
export function fillText(template, fields, strict = true) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    const value = fields[name];
    if (value === undefined || value === null) {
      if (strict) throw new Error(`no value for {{${name}}}`);
      return '';
    }
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  });
}

/** The whole prompt of one run: the header, then the item's brief, with its fields and the run id. */
export function briefFor(item, runId, folders) {
  const fields = { ...item.fields, line: JSON.stringify(item.fields), run: runId };
  const read = name => {
    const found = folders.map(folder => join(folder, name)).find(file => existsSync(file));
    if (!found) throw new Error(`no brief ${name}`);
    return readFileSync(found, 'utf8');
  };
  return `${fillText(read('header.md'), fields)}\n${fillText(read(item.brief), fields)}`;
}

// ---------------------------------------------------------------------------
// Timed jobs

function clockOf(date, timezone) {
  const [hour, minute] = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(date).split(':').map(Number);
  const day = localDay(date, timezone);
  return { day, hour, minute, weekday: new Date(`${day}T12:00:00Z`).getUTCDay() };
}
const hhmm = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const toMinutes = text => { const [hour, minute] = String(text).split(':').map(Number); return hour * 60 + minute; };

/** The due time a job is in now, such as `2026-11-02T09:00`, or null: outside its days or hours, or no time due. */
export function dueKey(sweep, date, timezone) {
  const { day, hour, minute, weekday } = clockOf(date, timezone);
  if (Array.isArray(sweep.days) && !sweep.days.includes(weekday)) return null;
  if (sweep.hours) {
    const [from, to] = String(sweep.hours).split('-').map(Number);
    if (hour < from || hour >= to) return null;
  }
  const now = hour * 60 + minute;
  const every = Number(/^(\d+)m$/.exec(sweep.every ?? '')?.[1]);
  if (every) return `${day}T${hhmm(now - (now % every))}`;
  const due = (sweep.at ?? []).map(toMinutes).filter(at => at <= now && now - at < AT_GRACE_MIN);
  return due.length ? `${day}T${hhmm(Math.max(...due))}` : null;
}

/** A check's answer: the object of its first `{"run": {...}}` line, or null for nothing to do. */
export function runOf(stdout) {
  for (const text of String(stdout).split('\n').map(each => each.trim()).filter(Boolean)) {
    try { const item = JSON.parse(text); if (plain(item?.run)) return item.run; } catch { /* not a run line */ }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Runs

/** Starts one detached run, its output in `logFile` (0600). The caller watches its pid. */
export function spawnRun({ command, args, project, logFile, env }) {
  mkdirSync(dirname(logFile), { recursive: true, mode: 0o700 });
  const fd = openSync(logFile, 'a', 0o600);
  try {
    const child = spawn(command, args, { cwd: project, detached: true, stdio: ['ignore', fd, fd], env });
    child.on('error', () => {});
    child.unref();
    return child;
  } finally { closeSync(fd); }
}

/** Stops a run's whole process group, else the process. */
export function stopGroup(pid) {
  for (const target of [-pid, pid]) { try { process.kill(target, 'SIGTERM'); return; } catch { /* try the next */ } }
}

export const alive = pid => {
  if (!Number.isInteger(pid)) return false;
  try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; }
};

/** A run's env: no Paseo id, so its daily commands act as the Daily chat's helper; no hook, memory run or tidy of its
 * own. Claude Code refuses to bypass permissions as root unless `IS_SANDBOX=1`. */
export function runEnv(env, runId, { agent = 'claude', root = process.getuid?.() === 0 } = {}) {
  const { PASEO_AGENT_ID: _drop, ...rest } = env;
  return { ...rest, ...(agent === 'claude' && root ? { IS_SANDBOX: '1' } : {}), WONG_DAILY_RUN: '1', WONG_DAILY_RUN_ID: runId,
    WONG_MEMORY_NO_HEADLESS: '1', WONG_TIDY: '0' };
}

const runIdOf = (kind, date) => `${kind}-${date.toISOString().replace(/[-:.]/g, '').slice(0, 15)}-${Math.random().toString(36).slice(2, 6)}`;

/** One event with no job, as its journal line. */
export function quietLine(event) {
  const name = event.title ?? event.workspace ?? event.agent;
  switch (event.event) {
    case 'gone': return `Closed: ${name}`;
    case 'not-read': return `Not read: ${event.source}${event.error ? ` — ${event.error}` : ''}`;
    case 'post': return String(event.text);
    case 'done': return `Done on the board: ${name}`;
    case 'end': return `Watch ended: ${event.reason}`;
    default: return `${event.event}: ${JSON.stringify(event).slice(0, 200)}`;
  }
}

// ---------------------------------------------------------------------------
// The worker

/** The worker over one state folder: `dispatch` routes events, `sweep` queues due jobs, `pump` ends stale runs and
 * starts what the queue allows, `boot` journals runs that a restart stopped. */
export function makeWorker({ stateDir, project, timezone, sweeps, agent = RUN_AGENTS[0], context = {}, call, env = process.env,
  briefs = briefFolders(project), launch = spawnRun, typedAt = userAt, isAlive = alive, kill = stopGroup, now = () => Date.now(),
  sendDaily, runCheck, dryRun = false, print = () => {}, wake = () => {} }) {
  const file = join(stateDir, 'worker-queue.json');
  const dueFile = join(stateDir, 'sweeps.json');
  const runs = join(stateDir, 'runs');
  const exited = new Set();
  const date = () => new Date(now());
  const today = () => localDay(date(), timezone);
  const load = () => ({ queue: [], running: [], told: null, ...readJson(file, {}) });
  const save = state => writeJson(file, state);
  const journal = (line, more = {}) => addLine({ stateDir, timezone, line, now: date(), ...more });
  const maxRuns = sweeps.maxRuns ?? 3;

  function itemOf(event) {
    const entry = sweeps.events?.[event.event];
    if (!entry) return null;
    const { addon: _addon, ...fields } = event;
    const request = event.event === 'asking' ? fields.request?.id ?? null : null;
    return { key: fields.agent ? `${event.event}:${fields.agent}:${request ?? ''}` : `${event.event}:${JSON.stringify(fields)}`,
      kind: event.event, brief: entry.brief, title: fillText(entry.title ?? '{{event}}', fields, false).trim() || event.event, fields,
      lane: fields.agent ?? entry.lane ?? null, ownPlace: Boolean(entry.ownPlace), hold: Boolean(entry.hold && fields.agent), request,
      at: date().toISOString() };
  }

  function enqueue(state, item) {
    if (item.hold) item.userAt = typedAt(item.lane) ?? null;
    // A question card means the chat moved on from its earlier stop.
    const stale = each => each.key === item.key || (item.kind === 'asking' && each.kind === 'stopped' && each.lane === item.lane);
    state.queue = [...state.queue.filter(each => !stale(each)), item];
  }

  async function boardLine(state, event) {
    if (state.told === today()) return;
    const text = `Not read: your board — ${event.error ?? 'no answer'}`;
    if (dryRun) { print({ wouldSend: text }); return; }
    try { await sendDaily(text); state.told = today(); } catch (error) {
      journal(`Not sent to the Daily chat: ${text} — ${oneLine(error)}`, { kind: 'not-sent' });
    }
  }

  async function quiet(state, event) {
    journal(quietLine(event), { kind: event.event, title: event.title ?? undefined, workspace: event.workspace ?? undefined });
    if (event.event === 'not-read' && BOARD_SOURCES.includes(event.source)) await boardLine(state, event);
  }

  const ended = run => readLines({ stateDir }).some(entry => entry.run === run.runId && entry.kind === 'end');

  function reap(state, gone) {
    state.running = state.running.filter(run => {
      if (exited.has(run.runId) || !isAlive(run.pid)) {
        if (!ended(run)) journal(`Not finished: ${run.title} — ${gone}`, { kind: 'not-finished', run: run.runId });
        return false;
      }
      if (now() - Date.parse(run.startedAt) < RUN_MS) return true;
      // A dry run's state is a copy, but its pids are the live service's runs.
      if (dryRun) print({ wouldStop: run.title, run: run.runId }); else kill(run.pid);
      journal(`Not finished: ${run.title} — stopped after 30 minutes`, { kind: 'not-finished', run: run.runId });
      return false;
    });
  }

  function start(item, state) {
    const runId = runIdOf(item.kind, date());
    let brief;
    try { brief = briefFor(item, runId, briefs); } catch (error) {
      journal(`Not started: ${item.title} — ${oneLine(error)}`, { kind: 'not-started' });
      return;
    }
    if (dryRun) { print({ wouldStart: item.kind, title: item.title, lane: item.lane, brief: item.brief }); return; }
    const [command, args] = headlessCommand({ agent, prompt: brief, access: { full: true } });
    let child = null;
    try {
      child = launch({ command, args, project, logFile: join(runs, `${runId}.jsonl`), env: runEnv(env, runId, { agent }) });
    } catch { /* journaled below */ }
    if (!child?.pid) { journal(`Not started: ${item.title} — ${command} did not start`, { kind: 'not-started' }); return; }
    child.on?.('exit', () => { exited.add(runId); wake(); });
    state.running.push({ runId, pid: child.pid, kind: item.kind, title: item.title, lane: item.lane, ownPlace: item.ownPlace,
      startedAt: date().toISOString() });
    journal(`Started: ${item.title}`, { kind: 'start', run: runId, title: item.fields.title ?? undefined, workspace: item.fields.workspace ?? undefined });
  }

  // 'start', 'wait' or 'drop'. A held event waits 15 minutes after the person's last message there, and goes if they
  // write again. An `ownPlace` job runs outside the cap; its lane still keeps it to one at a time.
  async function verdict(item, state, permits) {
    if (!item.ownPlace && state.running.filter(run => !run.ownPlace).length >= maxRuns) return 'wait';
    if (item.lane && state.running.some(run => run.lane === item.lane)) return 'wait';
    if (item.hold) {
      const typed = typedAt(item.lane) ?? null;
      if (typed !== item.userAt) { journal(`No action: ${item.title} — you wrote in that chat`, { kind: 'dropped' }); return 'drop'; }
      if (typed && now() < Date.parse(typed) + HOLD_MS) return 'wait';
    }
    if (item.request) {
      const pending = await permits();
      if (!pending) return 'wait';
      if (!pending.some(ask => ask.id === item.request)) { journal(`No action: ${item.title} — its question closed`, { kind: 'dropped' }); return 'drop'; }
    }
    return 'start';
  }

  async function checked(sweep) {
    if (!sweep.check) return {};
    try {
      return runOf(await runCheck({ sweep, context: { ...context, kind: 'sweep', day: today(), sweep: sweep.id } }));
    } catch (error) {
      journal(`Not read: job ${sweep.title ?? sweep.id} — ${oneLine(error)}`, { kind: 'not-read' });
      return null;
    }
  }

  return {
    boot() { const state = load(); reap(state, 'the service restarted'); save(state); },

    async dispatch(events) {
      const state = load();
      for (const event of events.filter(each => each?.event && each.event !== 'unsupported')) {
        const item = itemOf(event);
        if (item) enqueue(state, item);
        else await quiet(state, event);
      }
      save(state);
    },

    async sweep() {
      const done = readJson(dueFile, {});
      const state = load();
      for (const sweep of sweeps.sweeps ?? []) {
        const due = dueKey(sweep, date(), timezone);
        if (!due || done[sweep.id] === due) continue;
        done[sweep.id] = due;
        writeJson(dueFile, done);
        if (dryRun && sweep.check) { print({ wouldCheck: sweep.id, due }); continue; }
        const fields = await checked(sweep);
        if (!fields) continue;
        enqueue(state, { key: `sweep:${sweep.id}:${due}`, kind: 'sweep', brief: sweep.brief, title: sweep.title ?? sweep.id,
          fields: { ...fields, sweep: sweep.id, due }, lane: `sweep:${sweep.id}`, ownPlace: Boolean(sweep.ownPlace), hold: false, request: null,
          at: date().toISOString() });
      }
      save(state);
    },

    async pump() {
      const state = load();
      reap(state, 'the run ended with no line');
      let pending;
      const permits = () => (pending ??= Promise.resolve().then(() => call(['permit', 'ls']))
        .then(list => (Array.isArray(list) ? list : null), () => null));
      const kept = [];
      for (const item of state.queue) {
        const next = await verdict(item, state, permits);
        if (next === 'start') start(item, state);
        else if (next === 'wait') kept.push(item);
      }
      state.queue = kept;
      save(state);
      return state;
    },

    tidy() {
      prune({ stateDir, timezone, keep: sweeps.journalDays ?? 14, now: date() });
      let names = [];
      try { names = readdirSync(runs); } catch { return; }
      const oldest = now() - (sweeps.runLogDays ?? 7) * DAY_MS;
      for (const name of names) {
        try {
          if (statSync(join(runs, name)).mtimeMs < oldest) rmSync(join(runs, name), { force: true });
        } catch { /* it just went */ }
      }
    },
  };
}

// ---------------------------------------------------------------------------
// The loop

const STEP_MS = 1000;

/** One pass: the beat that keeps the chat's own watch off, the watch, then the worker. */
export async function workerPass({ worker, watchOnce, stateDir, seconds, now = () => Date.now() }) {
  beat({ stateDir, seconds, now: now() });
  await worker.dispatch(await watchOnce());
  await worker.sweep();
  await worker.pump();
  worker.tidy();
}

/** The pass each `seconds`, sooner on a chat's stop or a run's end; a failed pass is logged, and the loop goes on. */
export async function serveWorker({ worker, pass, signal, seconds = 60, once = false, sleep = ms => new Promise(done => setTimeout(done, ms)),
  log = text => console.error(text) }) {
  worker.boot();
  for (;;) {
    signal.heard = false;
    try { await pass(); } catch (error) { log(`Worker pass failed: ${oneLine(error)}`); }
    if (once) return;
    for (let waited = 0; waited < seconds * 1000 && !signal.heard; waited += STEP_MS) await sleep(STEP_MS);
  }
}

/** `daily.mjs serve`: the service over the person's settings. `watching` holds the watch's board, to-dos and add-ons;
 * a dry run works on a copy of the state, starts nothing, and prints what it would do. */
export async function serveDaily({ config, project, stateDir, call, env = process.env, watching, started, daily, seconds = 60, once = false,
  dryRun = false, print = item => console.log(JSON.stringify(item)), log, launch, watcher, sleep }) {
  const signal = { heard: false };
  const worker = makeWorker({ stateDir, project, timezone: config.timezone, sweeps: loadSweeps({ project, file: config.sweeps }),
    agent: config.runs?.agent, call, env, dryRun, print, launch, context: { person: config.person, timezone: config.timezone, repo: project },
    sendDaily: async text => sendText(call, await dailyAgent({ daily, call }), text),
    runCheck: ({ sweep, context }) => runNode({ file: resolve(project, sweep.check), cwd: project, input: context }),
    wake: () => { signal.heard = true; } });
  const watchOnce = async () => {
    const events = [];
    await watch({ stateDir, started, timezone: config.timezone, call, ...watching, env, self: null, ignore: [daily.read().agentId].filter(Boolean),
      service: true, once: true, print: text => events.push(JSON.parse(text)) });
    if (dryRun) for (const event of events) print({ event });
    return events;
  };
  const stops = dryRun ? null : watchStops(env, () => { signal.heard = true; }, watcher);
  try {
    await serveWorker({ worker, signal, seconds, once: dryRun || once, sleep, ...(log && { log }),
      pass: () => workerPass({ worker, stateDir, seconds, watchOnce }) });
    if (dryRun) print({ dryRun: true, waiting: readJson(join(stateDir, 'worker-queue.json'), {}).queue?.map(item => item.title) ?? [] });
  } finally { stops?.close?.(); }
}
