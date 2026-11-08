// The daily's service on a computer (`daily.mjs serve`): each pass runs the watch, then one background AI run per event
// job or handed-over schedule run, and journals the rest. wiki/development/daily.md#the-daily-on-a-computer
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { linkCopy, place } from '../../memory/scripts/knowledge.mjs';
import { headlessCommand } from '../../memory/scripts/lib/headless.mjs';
import { runNode } from './addons.mjs';
import { HOLD_MS, beat, readJson, sameRepo, serviceAlive, userAt, watch, watchStops, writeJson } from './chief.mjs';
import { RUN_AGENTS, SETTINGS_DIR, localDay, morningOf } from './config.mjs';
import { addLine, prune, readLines } from './journal.mjs';
import { deliverNotes } from './line-up.mjs';
import { checkRun, scheduleApp, takeRuns as takeHandOvers } from './schedule-runs.mjs';

const REFERENCES = fileURLToPath(new URL('../references/', import.meta.url));
export const SKILL_BRIEFS = join(REFERENCES, 'briefs');
export const DEFAULT_SWEEPS = join(REFERENCES, 'sweeps.json');
export const DEFAULT_SCHEDULES = join(REFERENCES, 'schedules.json');
export const RUN_MS = 30 * 60e3;
const DAY_MS = 24 * 3600e3;
// A handed-over schedule run waits at most this long for a free run: the app calls it not started after 2 minutes.
const HAND_OVER_MS = 100e3;
// With no job of the install's own for them, these go to each chat's own stop step, not the journal.
const STOP_EVENTS = ['stopped', 'asking'];
const oneLine = value => String(value?.message ?? value).split('\n')[0].slice(0, 200);

// ---------------------------------------------------------------------------
// The job list and its briefs

const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const BRIEF = /^[a-z0-9][a-z0-9-]*\.md$/;

/** The default list with the install's merged over it: its `events` over the default's. A `sweeps` entry is a timed
 * job: one with a default schedule's id is that schedule's, and any other waits, by id, in `waiting`, to move. */
export function loadSweeps({ project, file, base = DEFAULT_SWEEPS, schedules = DEFAULT_SCHEDULES }) {
  const read = path => JSON.parse(readFileSync(path, 'utf8'));
  const defaults = read(base);
  const own = file ? read(resolve(project, file)) : {};
  const { sweeps: _timed, ...merged } = { ...defaults, ...own };
  merged.events = { ...defaults.events, ...own.events };
  const goodDeny = merged.deny === undefined
    || (Array.isArray(merged.deny) && merged.deny.every(pattern => typeof pattern === 'string' && pattern.trim() !== ''));
  const bad = (goodDeny ? undefined : 'deny') ?? Object.entries(merged.events).find(([, entry]) => !plain(entry) || !BRIEF.test(entry.brief))?.[0];
  if (bad !== undefined) throw new Error(`The sweep list has a bad entry: ${bad}. See wiki/development/daily.md#your-own-jobs.`);
  const ids = new Set(read(schedules).schedules.map(schedule => schedule.id));
  merged.waiting = (own.sweeps ?? []).filter(sweep => !ids.has(sweep?.id) && sweep?.off !== true).map(sweep => String(sweep?.id));
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

/** The whole prompt of one run: the header, then the item's brief or a schedule's own text, with its fields and the run
 * id. */
export function briefFor(item, runId, folders) {
  const fields = { ...item.fields, line: JSON.stringify(item.fields), run: runId };
  const read = name => {
    const found = folders.map(folder => join(folder, name)).find(file => existsSync(file));
    if (!found) throw new Error(`no brief ${name}`);
    return readFileSync(found, 'utf8');
  };
  return `${fillText(read('header.md'), fields)}\n${item.text === undefined ? fillText(read(item.brief), fields) : fillText(item.text, fields, false)}`;
}

// ---------------------------------------------------------------------------
// Times and checks

function clockOf(date, timezone) {
  const [hour, minute] = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(date).split(':').map(Number);
  const day = localDay(date, timezone);
  return { day, hour, minute, weekday: new Date(`${day}T12:00:00Z`).getUTCDay() };
}
const toMinutes = text => { const [hour, minute] = String(text).split(':').map(Number); return hour * 60 + minute; };

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

/** A run's env: no Paseo id, so its daily commands act under the stand-in id; no hook, memory run or tidy of its own.
 * Claude Code refuses to bypass permissions as root unless `IS_SANDBOX=1`. */
export function runEnv(env, runId, { agent = 'claude', root = process.getuid?.() === 0 } = {}) {
  const { PASEO_AGENT_ID: _drop, ...rest } = env;
  return { ...rest, ...(agent === 'claude' && root ? { IS_SANDBOX: '1' } : {}), WONG_DAILY_RUN: '1', WONG_DAILY_RUN_ID: runId,
    WONG_MEMORY_NO_HEADLESS: '1', WONG_TIDY: '0' };
}

/** One git command in `cwd`; it throws when git fails or runs past 2 minutes. */
export const runGit = (cwd, args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120e3 });

const runIdOf = (kind, date) => `${kind}-${date.toISOString().replace(/[-:.]/g, '').slice(0, 15)}-${Math.random().toString(36).slice(2, 6)}`;

/** One event with no job, as its journal line. */
export function quietLine(event) {
  const name = event.title ?? event.workspace ?? event.agent;
  switch (event.event) {
    case 'gone': return `Closed: ${name}`;
    case 'not-read': return `Not read: ${event.source}${event.error ? ` — ${event.error}` : ''}`;
    case 'post': return String(event.text);
    case 'close': return `Sent /close: ${name}`;
    case 'not-closed': return `Not closed: ${name}${event.error ? ` — ${event.error}` : ''}`;
    case 'end': return `Watch ended: ${event.reason}`;
    default: return `${event.event}: ${JSON.stringify(event).slice(0, 200)}`;
  }
}

// ---------------------------------------------------------------------------
// A run's handoff: its words for one chat the worker opens after the run

const RUN_NAME = /^[A-Za-z0-9][A-Za-z0-9-]{0,127}$/;
const HANDOFF_CHARS = 20000;
/** Beside the run's log, so the run logs' tidy removes one a crash left. */
export const handoffFile = (stateDir, runId) => join(stateDir, 'runs', `${runId}.handoff.md`);

/** `D handoff`: keeps a background run's words for the one chat the worker opens after it ends. */
export function handOff({ stateDir, timezone, env = process.env, text, now = new Date() }) {
  const runId = env.WONG_DAILY_RUN_ID;
  if (!RUN_NAME.test(runId ?? '')) return { status: 'refused', reason: 'run', error: 'Only a background run hands off.' };
  const words = String(text ?? '').trim();
  if (!words || words.length > HANDOFF_CHARS) return { status: 'refused', reason: 'text', error: `The file needs words, at most ${HANDOFF_CHARS}.` };
  const file = handoffFile(stateDir, runId);
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  try { writeFileSync(file, `${words}\n`, { flag: 'wx', mode: 0o600 }); } catch (error) {
    if (error.code === 'EEXIST') return { status: 'refused', reason: 'already', error: 'This run handed off already: one chat a run.' };
    throw error;
  }
  addLine({ stateDir, timezone, line: `Handed off: ${oneLine(words)}`, kind: 'handoff', run: runId, now });
  return { status: 'handed', run: runId };
}

// ---------------------------------------------------------------------------
// A problem that needs the person

/** `{counts: {kind: n}, opened: {kind: day}, chats: [agentId]}`: failures in a row, the day a kind's chat opened,
 * and the chats the watch and the check-ins leave alone. */
export const needsYouFile = stateDir => join(stateDir, 'needs-you.json');
export const needsYouChats = stateDir => readJson(needsYouFile(stateDir), {}).chats ?? [];
const DAILY = 'node .claude/skills/daily/scripts/daily.mjs';
const NEEDS_YOU = {
  chats: { what: 'the chat list', steps: [`Run \`${DAILY} who\`. On \`missing\` or \`expired\`, run its \`login\` command in the background and show the person its link.`,
    'The worker sends the list again within a minute of the sign-in.'] },
  paseo: { what: 'Paseo', steps: ['Run `paseo ls`.', 'Fix what its error names, such as a stopped Paseo daemon.'] },
  morning: { what: 'the morning start', steps: [`Run \`${DAILY} start --dry-run\`.`,
    'Fix the settings file it names, by wiki/development/daily.md#your-settings-file.'] },
};

/** The first message of a *Needs you* chat: what failed, why, and the steps, the guide's own fix first. */
export function needsYouMessage({ what, reason, steps, guide }) {
  return [`The daily's background worker failed two times in a row at ${what}.`, `Reason: ${reason}`,
    ...(guide ? [`First read ${guide}. When it gives its own fix for this problem, follow that, not the steps below.`] : []),
    'Steps to fix it:', ...steps.map((step, index) => `${index + 1}. ${step}`),
    'Do the steps an agent can do. Ask the person only for a step that needs them, such as a sign-in. Then check that the fix works.'].join('\n');
}

// The watch sources that count as a kind; other sources stay journal lines.
const NEEDS_SOURCES = { chats: 'chats', workspaces: 'paseo' };

// ---------------------------------------------------------------------------
// The worker

/** The worker over one state folder: `dispatch` routes events, `sweep` queues handed-over schedule runs,
 * `pump` starts runs, `boot` cleans up; `failed` and `worked` count a kind's failures in a row, `ignored` its chats. */
export function makeWorker({ stateDir, project, timezone, sweeps, agent = RUN_AGENTS[0], context = {}, call, env = process.env,
  briefs = briefFolders(project), launch = spawnRun, typedAt = userAt, isAlive = alive, kill = stopGroup, now = () => Date.now(),
  runCheck, git = runGit, dryRun = false, print = () => {}, wake = () => {}, guide = () => null, app = null, takeRuns = () => [],
  openChat = async () => { throw new Error('no way to open a chat here'); } }) {
  const file = join(stateDir, 'worker-queue.json');
  const waitingFile = join(stateDir, 'waiting.json');
  const runs = join(stateDir, 'runs');
  const copies = join(stateDir, 'copies');
  const exited = new Set();
  const date = () => new Date(now());
  const today = () => localDay(date(), timezone);
  const load = () => ({ queue: [], running: [], ...readJson(file, {}) });
  const save = state => writeJson(file, state);
  const journal = (line, more = {}) => addLine({ stateDir, timezone, line, now: date(), ...more });
  const maxRuns = sweeps.maxRuns ?? 3;
  const needsFile = needsYouFile(stateDir);
  const loadNeeds = () => ({ counts: {}, opened: {}, chats: [], ...readJson(needsFile, {}) });

  // The first failure in a row is `note`'s journal line; a later one opens one chat a kind a day, tried once.
  async function failed(kind, { note, reason }) {
    const needs = loadNeeds();
    needs.counts[kind] = (needs.counts[kind] ?? 0) + 1;
    if (!dryRun) writeJson(needsFile, needs);
    if (needs.counts[kind] === 1) { note(); return; }
    if (needs.opened[kind] === today()) return;
    const { what, steps } = NEEDS_YOU[kind];
    const title = `Needs you: ${what}`;
    const message = needsYouMessage({ what, reason, steps, guide: guide() });
    if (dryRun) { print({ wouldOpen: title, message }); return; }
    writeJson(needsFile, { ...needs, opened: { ...needs.opened, [kind]: today() } });
    try {
      const opened = await openChat({ title, message });
      if (!opened?.agentId) throw new Error(opened?.error ?? 'Paseo did not start the chat.');
      const after = loadNeeds();
      writeJson(needsFile, { ...after, chats: [...after.chats, opened.agentId].slice(-14) });
      journal(`Opened: ${title}`, { kind: 'opened', title });
    } catch (error) {
      journal(`Not opened: ${title} — ${oneLine(error)}`, { kind: 'not-opened' });
    }
  }

  function worked(kind) {
    const needs = loadNeeds();
    if (!(kind in needs.counts)) return;
    delete needs.counts[kind];
    if (!dryRun) writeJson(needsFile, needs);
  }

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

  const quiet = event => journal(quietLine(event), { kind: event.event, title: event.title ?? undefined, workspace: event.workspace ?? undefined });

  const ended = run => readLines({ stateDir }).some(entry => entry.run === run.runId && entry.kind === 'end');

  // A job's own copy of the repo: a detached worktree of `origin/main`, removed with its run.
  function makeCopy(runId) {
    const dir = join(copies, runId);
    git(project, ['fetch', '-q', 'origin', 'main']);
    mkdirSync(copies, { recursive: true, mode: 0o700 });
    git(project, ['worktree', 'add', '-q', '--detach', dir, 'origin/main']);
    // Company knowledge, when this computer holds a copy, so a job saves its pages there.
    try { linkCopy(place(dir)); } catch { /* the job works without it */ }
    return dir;
  }
  function removeCopy(dir) {
    // The link goes first: the removal must never reach into the computer's one knowledge copy.
    const link = join(dir, 'knowledge');
    try { if (lstatSync(link).isSymbolicLink()) unlinkSync(link); } catch { /* no link */ }
    try { git(project, ['worktree', 'remove', '--force', dir]); } catch { /* not a worktree any more */ }
    rmSync(dir, { recursive: true, force: true });
    try { git(project, ['worktree', 'prune']); } catch { /* the next removal prunes */ }
  }

  // A dry run's state is a copy, but its pids and copies are the live service's.
  function reap(state, gone) {
    state.running = state.running.filter(run => {
      const limit = run.minutes ?? RUN_MS / 60e3;
      const living = !exited.has(run.runId) && isAlive(run.pid);
      if (living && now() - Date.parse(run.startedAt) < limit * 60e3) return true;
      if (!living && !ended(run)) journal(`Not finished: ${run.title} — ${gone}`, { kind: 'not-finished', run: run.runId });
      if (living) {
        if (dryRun) print({ wouldStop: run.title, run: run.runId }); else kill(run.pid);
        journal(`Not finished: ${run.title} — stopped after ${limit} minutes`, { kind: 'not-finished', run: run.runId });
      }
      if (run.copy && !dryRun) removeCopy(run.copy);
      // Only a schedule's run hands off: a check-in leaves what it found in its own chat.
      if (run.kind === 'schedule-run') {
        state.handoffs = [...state.handoffs ?? [], { runId: run.runId, title: run.title, report: run.report, schedule: run.schedule }];
      }
      return false;
    });
  }

  async function start(item, state) {
    const runId = runIdOf(item.kind, date());
    const notStarted = async reason => {
      journal(`Not started: ${item.title} — ${reason}`, { kind: 'not-started' });
      if (item.report) await app?.report(item.report, { state: 'failed', reason: 'not_started' });
    };
    const deny = sweeps.deny ?? [];
    // Codex's command rules match fixed word prefixes, not these patterns: a run there would work unblocked.
    if (agent === 'codex' && deny.length) {
      await notStarted('the deny list works only with Claude Code');
      return;
    }
    let brief;
    try { brief = briefFor(item, runId, briefs); } catch (error) { await notStarted(oneLine(error)); return; }
    if (dryRun) { print({ wouldStart: item.kind, title: item.title, lane: item.lane, brief: item.brief }); return; }
    let copy = null;
    if (item.place === 'copy') {
      try { copy = makeCopy(runId); } catch (error) {
        removeCopy(join(copies, runId));
        await notStarted(oneLine(error));
        return;
      }
    }
    const [command, args] = headlessCommand({ agent, prompt: brief, access: { full: true }, deny });
    let child = null;
    try {
      child = launch({ command, args, project: copy ?? item.cwd ?? project, logFile: join(runs, `${runId}.jsonl`), env: runEnv(env, runId, { agent }) });
    } catch { /* journaled below */ }
    if (!child?.pid) {
      if (copy) removeCopy(copy);
      await notStarted(`${command} did not start`);
      return;
    }
    if (item.report) await app?.report(item.report, { state: 'started', chatTitle: item.title });
    child.on?.('exit', () => { exited.add(runId); wake(); });
    state.running.push({ runId, pid: child.pid, kind: item.kind, title: item.title, lane: item.lane, ownPlace: item.ownPlace,
      startedAt: date().toISOString(), ...(item.minutes && { minutes: item.minutes }), ...(copy && { copy }), ...(item.report && { report: item.report }),
      ...(item.kind === 'schedule-run' && { schedule: item.fields.schedule }) });
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

  // A background schedule run the helper handed over: refused, nothing to do, or queued in its schedule's lane.
  async function handOver(event, state) {
    const refuse = (outcome, reason) => {
      journal(`Not started: schedule ${event.key} — ${reason}`, { kind: 'not-started' });
      return app.report(event.run, { state: outcome, reason });
    };
    const { schedule, reason } = await checkRun(event, { app, project, env });
    if (!schedule) return refuse(reason === 'no_app' ? 'failed' : 'blocked', reason);
    const run = schedule.run;
    let fields = {};
    if (run.check) {
      try {
        fields = runOf(await runCheck({ sweep: { id: schedule.key, check: resolve(run.cwd, run.check) },
          context: { ...context, kind: 'schedule-run', day: today(), schedule: schedule.key } }));
      } catch { return refuse('failed', 'check_failed'); }
      if (!fields) return app.report(event.run, { state: 'blocked', reason: 'no_work' });
    }
    enqueue(state, { key: `schedule:${event.run}`, kind: 'schedule-run', text: schedule.instructions, title: schedule.name ?? schedule.key,
      fields: { ...fields, schedule: schedule.key }, lane: `schedule:${schedule.key}`, ownPlace: false, hold: false, request: null,
      place: run.place === 'copy' ? 'copy' : null, minutes: run.minutes ?? null, cwd: run.cwd, report: event.run, at: date().toISOString() });
  }

  // An ended run's handoff opens its one chat, named for the run and labeled with its schedule; the app's run shows it.
  async function openHandoffs(state) {
    for (const run of state.handoffs ?? []) {
      const file = handoffFile(stateDir, run.runId);
      let message;
      try { message = readFileSync(file, 'utf8').trim(); } catch { continue; }
      if (dryRun) { print({ wouldOpen: run.title, run: run.runId }); continue; }
      // Gone before the open, so a failed or repeated pass never opens a second chat for the run.
      rmSync(file, { force: true });
      try {
        const opened = await openChat({ title: run.title, message, schedule: run.schedule ?? null });
        if (!opened?.agentId) throw new Error(opened?.error ?? 'Paseo did not start the chat.');
        journal(`Opened: ${run.title}`, { kind: 'opened', title: run.title, run: run.runId });
        if (run.report) await app?.report(run.report, { state: 'started', chatTitle: run.title, agentId: opened.agentId });
      } catch (error) {
        journal(`Not opened: ${run.title} — ${oneLine(error)}`, { kind: 'not-opened', run: run.runId });
      }
    }
    state.handoffs = [];
  }

  // Copies a crash left behind: no running run holds them.
  function sweepCopies(state) {
    if (dryRun) return;
    let names = [];
    try { names = readdirSync(copies); } catch { return; }
    const held = new Set(state.running.map(run => run.copy));
    for (const name of names) if (!held.has(join(copies, name))) removeCopy(join(copies, name));
  }

  return {
    boot() { const state = load(); reap(state, 'the service restarted'); sweepCopies(state); save(state); },

    async dispatch(events) {
      const state = load();
      for (const event of events.filter(each => each?.event && each.event !== 'unsupported')) {
        const kind = NEEDS_SOURCES[event.source];
        if (kind && event.event === 'not-read') await failed(kind, { note: () => quiet(event), reason: event.error ?? 'no answer' });
        else if (kind && event.event === 'read') worked(kind);
        else if (event.again || event.event === 'read') continue;
        else {
          const item = itemOf(event);
          if (item) enqueue(state, item);
          else if (!STOP_EVENTS.includes(event.event)) quiet(event);
        }
      }
      save(state);
    },

    async sweep() {
      const state = load();
      if (sweeps.waiting?.length && readJson(waitingFile, {}).day !== today() && !dryRun) {
        writeJson(waitingFile, { day: today() });
        journal(`Timed jobs wait to move to the app, and do not run: ${sweeps.waiting.join(', ')}`, { kind: 'waiting' });
      }
      for (const event of dryRun ? [] : takeRuns()) await handOver(event, state);
      save(state);
    },

    async pump() {
      const state = load();
      reap(state, 'the run ended with no line');
      await openHandoffs(state);
      let pending;
      const permits = () => (pending ??= Promise.resolve().then(() => call(['permit', 'ls']))
        .then(list => (Array.isArray(list) ? list : null), () => null));
      const kept = [];
      for (const item of state.queue) {
        const next = await verdict(item, state, permits);
        if (next === 'start') await start(item, state);
        else if (next === 'wait' && item.report && now() - Date.parse(item.at) > HAND_OVER_MS) {
          journal(`Not started: ${item.title} — too many runs at once`, { kind: 'not-started' });
          await app?.report(item.report, { state: 'blocked', reason: 'busy' });
        } else if (next === 'wait') kept.push(item);
      }
      state.queue = kept;
      save(state);
      return state;
    },

    failed,
    worked,
    ignored: () => loadNeeds().chats,

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
// One worker per person and repo

const lockFile = stateDir => join(stateDir, 'serve.lock');
const SCRIPTS = dirname(fileURLToPath(import.meta.url));

/** A short hash of the daily scripts: a worker's beat holds the one it started with, so `D ensure` sees older code. */
export function codeStamp(dir = SCRIPTS) {
  const hash = createHash('sha256');
  for (const name of readdirSync(dir).filter(each => each.endsWith('.mjs')).sort()) hash.update(`${name}\0`).update(readFileSync(join(dir, name)));
  return hash.digest('hex').slice(0, 12);
}
// A new worker writes its first beat within a pass; until then its lock counts as held.
const LOCK_GRACE_MS = 5 * 60e3;

/** The pid in the worker's lock, or null. */
export function lockHolder(stateDir) {
  try { const pid = Number(readFileSync(lockFile(stateDir), 'utf8').trim()); return Number.isInteger(pid) && pid > 0 ? pid : null; } catch { return null; }
}

/** The live worker's pid: the lock's, while it beats or is under 5 minutes old; else null, as its pid may be another
 * program's now. */
export function lockedBy(stateDir, { isAlive = alive, now = Date.now() } = {}) {
  const holder = lockHolder(stateDir);
  if (!holder || !isAlive(holder)) return null;
  let age;
  try { age = now - statSync(lockFile(stateDir)).mtimeMs; } catch { return null; }
  return serviceAlive(stateDir, now) || age < LOCK_GRACE_MS ? holder : null;
}

const TAKE_STALE_MS = 10e3;

/** Makes the folder `dir` as a one-holder claim; a claim older than 10 seconds is a dead taker's, and is taken. */
function claimDir(dir) {
  try { mkdirSync(dir, { mode: 0o700 }); return true; } catch (error) { if (error.code !== 'EEXIST') throw error; }
  try {
    if (Date.now() - statSync(dir).mtimeMs < TAKE_STALE_MS) return false;
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { mode: 0o700 });
    return true;
  } catch { return false; }
}

/** Takes `<state>/serve.lock` for `pid`; false while another live worker holds it, else it takes the lock over. */
export function takeServeLock({ stateDir, pid = process.pid, isAlive = alive, now = Date.now() }) {
  mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  const file = lockFile(stateDir), taking = `${file}.take`;
  try { writeFileSync(file, `${pid}\n`, { flag: 'wx', mode: 0o600 }); return true; } catch (error) { if (error.code !== 'EEXIST') throw error; }
  if (lockHolder(stateDir) === pid) return true;
  // One taker at a time looks again and swaps the lock in one rename, so two racing workers never both win.
  if (lockedBy(stateDir, { isAlive, now }) || !claimDir(taking)) return false;
  try {
    if (lockedBy(stateDir, { isAlive, now })) return false;
    writeFileSync(`${file}.${pid}`, `${pid}\n`, { mode: 0o600 });
    renameSync(`${file}.${pid}`, file);
    return lockHolder(stateDir) === pid;
  } finally { rmSync(taking, { recursive: true, force: true }); }
}

/** Removes the lock when `pid` holds it. */
export function dropServeLock(stateDir, pid = process.pid) {
  if (lockHolder(stateDir) === pid) rmSync(lockFile(stateDir), { force: true });
}

// ---------------------------------------------------------------------------
// The loop

const STEP_MS = 1000;

/** The file `start` writes once the day's morning ran. */
export const morningFile = (stateDir, day) => join(stateDir, `morning-${day}.json`);

/** One journal line per add-on line and source not read, and one for routines still waiting in the settings file. */
function morningLines(result, journal) {
  if (result.waiting?.length) journal(`Routines wait to move to the app, and do not start: ${result.waiting.join(', ')}`, { kind: 'waiting' });
  for (const line of result.lines ?? []) journal(line, { kind: 'post' });
  for (const each of result.notRead ?? []) journal(`Not read: ${each.source} — ${each.error}`, { kind: 'not-read' });
}

/** The day's morning, at or past `config.morning` with no morning file yet: `start` runs it, the journal keeps what it
 * did, and its add-on events go to `dispatch`. A dry run prints each add-on it would run. */
export async function morningPass({ config, stateDir, start, dispatch, date = new Date(), dryRun = false, print = () => {} }) {
  const { day, hour, minute } = clockOf(date, config.timezone);
  if (hour * 60 + minute < toMinutes(morningOf(config)) || existsSync(morningFile(stateDir, day))) return;
  if (dryRun) {
    for (const addon of (await start({ config, dryRun: true, now: date })).addons) print({ wouldRun: 'add-on', addon });
    return;
  }
  const result = await start({ config, now: date });
  morningLines(result, (line, more) => addLine({ stateDir, timezone: config.timezone, line, now: date, ...more }));
  await dispatch(result.events ?? []);
}

/** One pass: the beat that tells `D ensure` this worker runs, the morning when due, the watch, the line-up's notes,
 * then the worker. */
export async function workerPass({ worker, watchOnce, stateDir, seconds, now = () => Date.now(), morning = async () => {}, code,
  deliver = async () => {} }) {
  beat({ stateDir, seconds, now: now(), code });
  await morning();
  await worker.dispatch(await watchOnce());
  await deliver();
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

/** `daily.mjs serve`: `watching` holds the chat list and add-ons; `start` runs the morning when `settings()`, read
 * each pass, has a file; `openChat` opens a *Needs you* or handoff chat. A dry run starts nothing, on a state copy. */
export async function serveDaily({ config, project, stateDir, call, env = process.env, watching, started, hasFile = false,
  settings = () => ({ config, hasFile }), start = null, seconds = 60, once = false, dryRun = false, print = item => console.log(JSON.stringify(item)),
  log, launch, watcher, sleep, agent = RUN_AGENTS[0], ownRepo = sameRepo(project), now = () => Date.now(), code = codeStamp(), openChat,
  guide = config.guide ?? null, typedAt }) {
  const signal = { heard: false };
  const timezone = config.timezone;
  // The guide of the settings read last: a file made or changed after the start counts.
  let current = { config: { guide } };
  const worker = makeWorker({ stateDir, project, timezone, sweeps: loadSweeps({ project, file: config.sweeps }),
    agent: config.runs?.agent ?? agent, call, env, dryRun, print, launch, context: { person: config.person, timezone, repo: project }, now,
    runCheck: ({ sweep, context }) => runNode({ file: resolve(project, sweep.check), cwd: project, input: context }),
    app: scheduleApp(project), takeRuns: () => takeHandOvers({ env, project, emails: config.emails, stateDir }),
    wake: () => { signal.heard = true; }, guide: () => current?.config?.guide ?? null, ...(openChat && { openChat }) });
  const watchOnce = async () => {
    const events = [];
    await watch({ stateDir, started, timezone, call, ...watching, env, self: null, ignore: worker.ignored(), service: true, once: true, ownRepo,
      print: text => events.push(JSON.parse(text)) });
    if (dryRun) for (const event of events) print({ event });
    return events;
  };
  // A settings file that can not be read, or a morning that throws, is a `morning` failure; the next pass tries again.
  const morning = async () => {
    if (!start) return;
    const date = new Date(now());
    const failed = (kind, line, error) => worker.failed('morning', { reason: oneLine(error),
      note: () => addLine({ stateDir, timezone, line: `${line} — ${oneLine(error)}`, kind, now: date }) });
    try { current = settings(); } catch (error) { await failed('not-read', 'Not read: the settings file', error); return; }
    if (!current?.hasFile || !current.config) return;
    try { await morningPass({ config: current.config, stateDir, start, dispatch: worker.dispatch, date, dryRun, print }); } catch (error) {
      await failed('not-started', 'Not started: the morning', error);
      return;
    }
    worker.worked('morning');
  };
  const stops = dryRun ? null : watchStops(env, () => { signal.heard = true; }, watcher);
  try {
    await serveWorker({ worker, signal, seconds, once: dryRun || once, sleep, ...(log && { log }),
      pass: () => workerPass({ worker, stateDir, seconds, watchOnce, now, morning, code,
        deliver: () => deliverNotes({ stateDir, started, timezone, call, dryRun, print, now: () => new Date(now()), ...(typedAt && { typedAt }) }) }) });
    if (dryRun) print({ dryRun: true, waiting: readJson(join(stateDir, 'worker-queue.json'), {}).queue?.map(item => item.title) ?? [] });
  } finally { stops?.close?.(); }
}
