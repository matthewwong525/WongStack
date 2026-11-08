#!/usr/bin/env node
// The daily's commands; each prints JSON. The model judges; this script holds the limits a model could drift past.
// wiki/development/daily.md
import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, cpSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { primaryRoot } from '../../memory/scripts/lib/primary-root.mjs';
import { loadConfig, memoryOrigin, repoContext, signIn, signInHelp } from '../../memory/scripts/lib/store.mjs';
import { runAddons } from './addons.mjs';
import { computerId } from '../../hand-over/scripts/lib/computer.mjs';
import { SCHEDULE_LABEL, chatCalls, chatClient } from './chats.mjs';
import { BUCKETS, allow, answer, chiefDay, chiefEnv, doneAgent, hand, mark, noteEnd, paseoCli, readBeat, readJson, reply,
  serviceAlive, status, writeJson } from './chief.mjs';
import { RUN_AGENTS, SettingsError, defaultSettings, loadSettings, localDay, settingsFor } from './config.mjs';
import { addLine, format, newLines, readLines } from './journal.mjs';
import { writeCard } from './chat-list.mjs';
import { lineUpData, saveMap, tell } from './line-up.mjs';
import { refuseRuns, scheduleApp, takeRuns, waitingRuns } from './schedule-runs.mjs';
import { handOver } from './waiting-notes.mjs';
import { DEFAULT_SCHEDULES, alive, codeStamp, dropServeLock, handOff, loadSweeps, lockedBy, morningFile, serveDaily, stopGroup,
  takeServeLock } from './worker.mjs';

const LAUNCHER = fileURLToPath(new URL('../../schedule/scripts/workspace.mjs', import.meta.url));
const REPO = fileURLToPath(new URL('../../../../', import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const KEPT = 400;
const run = promisify(execFile);
const oneLine = value => String(value).split('\n')[0].slice(0, 200);

/** This computer's private daily state folder for one checkout and person. */
export const stateDirectory = (project, person, root = join(homedir(), '.local', 'state', 'wongstack', 'daily')) =>
  join(root, createHash('sha256').update(resolve(project)).digest('hex'), person);

// ---------------------------------------------------------------------------
// who

function appOrigin(ctx) {
  try { return memoryOrigin(loadConfig(ctx)); } catch { return null; }
}

/** The settings file: `--config`, else the one whose `emails` hold the git email, else the sign-in email. A lone file
 * that lists neither is another person's. */
export function who({ repo = REPO, ctx = repoContext(repo), origin = appOrigin(ctx), signedIn = signIn, config = null } = {}) {
  let me;
  if (origin) {
    const found = signedIn(origin);
    const ok = found.state === 'valid' || found.state === 'near';
    me = { source: 'sign-in', state: found.state, email: found.email ?? null, origin, days: found.days ?? null, login: ok ? null : signInHelp(origin) };
  } else {
    me = { source: 'git', state: ctx.author ? 'valid' : 'missing', email: ctx.author || null, origin: null, days: null, login: null };
  }
  const file = config ? resolve(config) : settingsFor(repo, ctx.author) ?? settingsFor(repo, me.email);
  let settings = null, error = null;
  if (file) { try { settings = loadSettings(file, repo); } catch (failed) { error = failed.message; } }
  return { ...me, file: file ?? null, person: settings?.person ?? null, team: settings?.teamFile ?? null, guide: settings?.guide ?? null,
    ...(error ? { error } : {}) };
}

/** `{me, config}`: the person's settings file, else the defaults from the sign-in email while it is good, else the git
 * email; `config` is null with neither. */
export function personSettings({ repo = REPO, ctx = repoContext(repo), ...rest } = {}) {
  const me = who({ repo, ctx, ...rest });
  if (me.file) return { me, config: loadSettings(me.file, repo) };
  const email = (me.source === 'sign-in' && ['valid', 'near'].includes(me.state) && me.email) || ctx.author || null;
  return { me, config: email ? defaultSettings({ email }) : null };
}

/** This repo's state folder for the person's settings. */
export const stateOf = (config, repo = REPO, root) => stateDirectory(primaryRoot(repo).primary, config.person, root);

// ---------------------------------------------------------------------------
// The started record: one row per morning that started, under a file lock

const LOCK_RETRY_MS = 50, LOCK_STALE_MS = 10e3;
/** A claim that never got its workspace: after this long it counts as failed, and the next run starts it again. */
export const PENDING_MS = 10 * 60e3;
const wait = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Runs `work` while this process holds `<file>.lock`; a lock older than 10 s is a dead run's, and is taken over. */
export function withLock(file, work) {
  const lock = `${file}.lock`;
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  for (;;) {
    try { closeSync(openSync(lock, 'wx', 0o600)); break; } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        if (Date.now() - statSync(lock).mtimeMs > LOCK_STALE_MS) rmSync(lock, { force: true });
      } catch { /* it just went */ }
      wait(LOCK_RETRY_MS);
    }
  }
  try { return work(); } finally { rmSync(lock, { force: true }); }
}

/** True while a row holds its key: a started row, or a claim younger than 10 minutes. */
export const holds = (entry, now = new Date()) => Boolean(entry) && (!entry.pending || now - Date.parse(entry.at) < PENDING_MS);

/** The started record, the newest 400 rows: `claim` writes a pending row or gives the holder; `fill`, `release`. */
export function startedRecord(stateDir) {
  const file = join(stateDir, 'started.json');
  const read = () => readJson(file, {});
  const write = all => writeJson(file, Object.fromEntries(Object.entries(all).sort(([, a], [, b]) => b.at.localeCompare(a.at)).slice(0, KEPT)));
  const locked = work => withLock(file, () => work(read()));
  return {
    read,
    fill: (key, entry) => locked(all => write({ ...all, [key]: entry })),
    claim: (key, entry, now = new Date()) => locked(all => {
      if (holds(all[key], now)) return all[key];
      write({ ...all, [key]: { ...entry, at: now.toISOString(), pending: true } });
      return null;
    }),
    release: key => locked(all => {
      if (!all[key]?.pending) return;
      delete all[key];
      write(all);
    }),
  };
}

/** Claims `key`, then opens: `{entry}` once filled, `{holder}` when a row holds it, `{error}` with the claim gone. */
async function launchOnce({ record, key, now, claim, open, fill }) {
  const holder = record.claim(key, claim, now);
  if (holder) return { holder };
  try {
    const opened = await open();
    if (!opened?.ok) throw new Error(opened?.error ?? 'The launcher did not confirm the workspace.');
    const entry = fill(opened);
    record.fill(key, entry);
    return { entry };
  } catch (error) {
    record.release(key);
    return { error: oneLine(error.message) };
  }
}

/** The launcher's arguments; it reads `--agent` only when no Paseo agent called it. A schedule's chat gets a label. */
export const launcherArgs = ({ title, brief, schedule = null }) => [LAUNCHER, 'open', '--title', title, '--brief', brief, '--agent', 'claude',
  ...(schedule ? ['--label', `${SCHEDULE_LABEL}=${schedule}`] : [])];

/** Opens one workspace in `destination` through the launcher. Throws with the launcher's reason. */
async function launchWorkspace({ destination, title, message, schedule = null }) {
  const directory = mkdtempSync(join(tmpdir(), 'daily-'));
  const brief = join(directory, 'message.txt');
  try {
    writeFileSync(brief, `${message}\n`, { mode: 0o600 });
    const { stdout } = await run(process.execPath, launcherArgs({ title, brief, schedule }), { cwd: destination, encoding: 'utf8', maxBuffer: 1024 * 1024 });
    return JSON.parse(stdout);
  } catch (error) {
    let reason = error.message;
    try { reason = JSON.parse(error.stdout).error ?? reason; } catch { /* no JSON: keep the first reason */ }
    throw new Error(reason);
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

// ---------------------------------------------------------------------------
// start

/** `.agents/skills/news/SKILL.md` is `/news`; a routine's `prompt` replaces it. The move to the app reads it. */
export const firstMessage = task => task.prompt ?? `/${basename(dirname(task.procedure))}`;

/** What each add-on gets on stdin. */
const addonContext = (config, project, day, kind) => ({ kind, day, person: config.person, timezone: config.timezone, repo: project });

/** The morning add-ons, once per day: `{lines, events, notRead}`, or null when they already ran today. */
async function morningAddons({ config, project, record, day, now, addons }) {
  const list = config.addons?.morning ?? [];
  if (!list.length) return { lines: [], events: [], notRead: [] };
  let out;
  const { holder } = await launchOnce({ record, key: `addons:${day}`, now, claim: { title: 'Morning add-ons' },
    open: async () => { out = await addons({ list, repo: project, context: addonContext(config, project, day, 'morning') }); return { ok: true }; },
    fill: () => ({ title: 'Morning add-ons', at: now.toISOString(), addons: true }) });
  if (holder) return null;
  return { lines: out.lines, events: out.events, notRead: out.failed.map(each => ({ source: `add-on ${each.addon}`, error: each.error })) };
}

/** The morning add-ons once per day; routines left in the settings start nothing, and `waiting` names them. */
export async function start({ config, project, stateDir, now = new Date(), dryRun = false, addons = runAddons }) {
  const day = localDay(now, config.timezone);
  const waiting = (config.checks ?? []).map(check => check.title);
  if (dryRun) return { day, addons: config.addons?.morning ?? [], waiting, guide: config.guide ?? null };
  const morning = await morningAddons({ config, project, record: startedRecord(stateDir), day, now, addons });
  const saved = readJson(morningFile(stateDir, day), { lines: [], events: [], notRead: [] });
  const report = { ...saved, ...morning };
  writeJson(morningFile(stateDir, day), report);
  return { day, lines: report.lines, events: report.events, notRead: report.notRead, waiting, guide: config.guide ?? null };
}

/** What today's morning gave, with no launch: the saved lines, events and sources not read. */
export function startReport({ config, stateDir, now = new Date() }) {
  const day = localDay(now, config.timezone);
  const saved = readJson(morningFile(stateDir, day), null);
  return { day, morning: saved ? 'done' : 'not run', lines: saved?.lines ?? [], events: saved?.events ?? [], notRead: saved?.notRead ?? [],
    guide: config.guide ?? null };
}

// ---------------------------------------------------------------------------
// Command

const USAGE = `usage: daily.mjs who | start [--dry-run] [--report] | handoff --file <text file>
       daily.mjs remind   a reminder is a one-time chat schedule now: ask /schedule
       daily.mjs serve [--agent claude|codex] [--seconds 60] [--once] [--dry-run] | ensure [--agent claude|codex] | status
       daily.mjs checkins off | checkins on
       daily.mjs journal [--new] | journal --line <words> [--run <id>]
       daily.mjs hand --agent <id|title|workspace>
       daily.mjs reply --agent <a> --file <text file> --bucket keep-going|pick|person --label <line> [--mark <mark>]
       daily.mjs answer --agent <a> --request <id> --file <text file> --bucket keep-going|pick|person --label <line>
       daily.mjs allow --agent <a> --request <id> --bucket keep-going|person --label <line>
       daily.mjs done-agent --agent <a> --proof <text> | note-end --line <words>
       daily.mjs line-up | map --file <json file> | tell --agent <a> --file <text file> [--now] [--covered-by <a>] | tell --drop <a>
       daily.mjs mark [--agent claude|codex]
  each but the mark hook takes --config <settings file>; a hook never fails; chief-service is serve`;
const FLAGS = { who: [], start: ['dry-run', 'report'], handoff: ['file'], remind: ['day', 'text'],
  serve: ['agent', 'seconds', 'once', 'dry-run'], ensure: ['agent'], 'checkins off': [], 'checkins on': [], journal: ['new', 'line', 'run'], status: [],
  hand: ['agent'],
  reply: ['agent', 'file', 'bucket', 'label', 'mark'], answer: ['agent', 'request', 'file', 'bucket', 'label'], allow: ['agent', 'request', 'bucket', 'label'],
  'done-agent': ['agent', 'proof'], 'note-end': ['line'], 'line-up': [], map: ['file'],
  tell: ['agent', 'file', 'now', 'covered-by', 'drop'] };
const NEEDS = { handoff: ['file'], hand: ['agent'], reply: ['agent', 'file', 'bucket', 'label'],
  answer: ['agent', 'request', 'file', 'bucket', 'label'], allow: ['agent', 'request', 'bucket', 'label'], 'done-agent': ['agent', 'proof'],
  'note-end': ['line'], map: ['file'] };
/** An answer that changed nothing it was asked to change. */
const REFUSED = new Set(['refused', 'unknown', 'ambiguous', 'failed', 'not confirmed', 'unsupported']);

/** The command line as `{command, values}`; a wrong one exits with the usage. */
export function readArgs(args) {
  const { values, positionals } = parseCli({ usage: USAGE, allowPositionals: true, args, options: Object.fromEntries([
    ...['config', 'seconds', 'agent', 'file', 'bucket', 'label', 'request', 'day', 'text', 'mark', 'proof', 'line',
      'run', 'covered-by', 'drop'].map(name => [name, { type: 'string' }]),
    ...['dry-run', 'once', 'report', 'new', 'now'].map(name => [name, { type: 'boolean' }])]) });
  const [first, ...extra] = positionals;
  const named = first === 'checkins' ? `${first} ${extra.shift()}` : first;
  const command = named === 'chief-service' ? 'serve' : named;
  const flags = Object.keys(values).filter(name => name !== 'config');
  if (!Object.hasOwn(FLAGS, command) || extra.length || flags.some(flag => !FLAGS[command].includes(flag)) || (NEEDS[command] ?? []).some(flag => !values[flag])) {
    usageError(USAGE);
  }
  const seconds = values.seconds === undefined ? 60 : Number(values.seconds);
  if (!Number.isInteger(seconds) || seconds < 5 || seconds > 3600) usageError(USAGE, '--seconds must be a whole number from 5 to 3600.');
  values.seconds = seconds;
  if (['serve', 'ensure'].includes(command) && values.agent !== undefined && !RUN_AGENTS.includes(values.agent)) {
    usageError(USAGE, `--agent takes ${RUN_AGENTS.join(', ')}.`);
  }
  // A line-up run answers a card a person's choice in another chat settles.
  const buckets = command === 'answer' ? [...BUCKETS, 'line-up'] : BUCKETS;
  if (values.bucket !== undefined && !buckets.includes(values.bucket)) usageError(USAGE, `--bucket takes ${buckets.join(', ')}.`);
  if (command === 'tell' && (Boolean(values.agent) !== Boolean(values.file) || !(values.agent || values.drop))) usageError(USAGE);
  if (command === 'allow' && values.bucket === 'pick') usageError(USAGE, '--bucket takes keep-going or person.');
  return { command, values };
}

/** What `D remind` says: a reminder is a schedule now. */
export const REMIND = 'A reminder is a one-time chat schedule now: ask /schedule for one that opens a chat with the words at that time.';
const TASKS_IGNORED = 'Ignored: `sources.tasks` in your settings. The week board is gone; your open chats show in the Inbox.';

/** One journal line, the first time, for an older settings file's `tasks` source: the week board is gone. */
export function ignoreTasks({ config, stateDir }) {
  if (!config.sources.tasks || readLines({ stateDir }).some(entry => entry.kind === 'tasks-ignored')) return;
  addLine({ stateDir, timezone: config.timezone, line: TASKS_IGNORED, kind: 'tasks-ignored' });
}

/** Each command, over the settings, the checkout, the state folder and the injected calls, `chats` the chat list. */
export function commands({ config, project, stateDir, values, call, chats, env = process.env, addons = runAddons,
  print = console.log, warn = console.error, keep = () => ensure({ env }), reread = () => personSettings({ repo: project, config: values.config }),
  defaults = () => startDefaults({ home: workerHome(project), stateDir, env, timezone: config.timezone }) }) {
  const started = () => startedRecord(stateDir).read();
  const at = { stateDir, started, timezone: config.timezone };
  const chief = async () => ({ ...at, day: chiefDay(at), call, env: chiefEnv(env) });
  const passAddons = config.addons?.pass?.length
    ? events => addons({ list: config.addons.pass, repo: project, context: { ...addonContext(config, project, localDay(new Date(), config.timezone), 'pass'), events } })
    : null;
  // No app or `chats: false`: the worker sends no list, so a missing app never opens a *Needs you* chat.
  const chatList = async () => (config.sources.chats && await chats.origin() ? { sync: chats.sync, computer: computerId(env) } : null);
  const said = () => ({ agent: values.agent, text: readFileSync(values.file, 'utf8'), bucket: values.bucket, label: values.label });
  return {
    start: () => (values.report ? startReport({ config, stateDir }) : start({ config, project, stateDir, dryRun: Boolean(values['dry-run']), addons })),
    handoff: () => handOff({ stateDir, timezone: config.timezone, env, text: readFileSync(values.file, 'utf8') }),
    remind: () => ({ status: 'refused', reason: 'schedule', error: REMIND }),
    // A dry run works on a copy of the state, so the live service's watch and queue see nothing taken.
    serve: async () => {
      const dryRun = Boolean(values['dry-run']);
      if (!dryRun && !takeServeLock({ stateDir })) { warn('Another daily worker runs for this person and repo.'); return; }
      const dir = dryRun ? mkdtempSync(join(tmpdir(), 'daily-serve-')) : stateDir;
      // A job's copy of the repo stays out: the dry run never runs in it.
      if (dryRun && existsSync(stateDir)) cpSync(stateDir, dir, { recursive: true, filter: from => from !== join(stateDir, 'copies') });
      if (!dryRun) ignoreTasks({ config, stateDir });
      try {
        await serveDaily({ config, project, stateDir: dir, call, env, seconds: values.seconds, once: Boolean(values.once), dryRun, print: item => print(JSON.stringify(item)),
          started: () => startedRecord(dir).read(), start: options => start({ project, stateDir: dir, addons, ...options }),
          // The morning reads the settings again each pass, from the main checkout: a file made or changed
          // after the start counts, and a removed copy of the repo breaks nothing.
          settings: () => { const found = reread(); return { config: found.config, hasFile: Boolean(found.me.file) }; },
          ...(values.agent && { agent: values.agent }),
          openChat: ({ title, message, schedule }) => launchWorkspace({ destination: project, title, message, schedule }),
          watching: dryRun ? {} : { chats: await chatList(), addons: passAddons } });
      } finally { if (dryRun) rmSync(dir, { recursive: true, force: true }); else dropServeLock(stateDir); }
    },
    // The default schedules pause or go on again at once, not at the next chat.
    'checkins off': () => {
      const result = checkinsOff({ stateDir, timezone: config.timezone });
      try { defaults(); } catch { /* best effort, as in ensure */ }
      return result;
    },
    'checkins on': () => {
      rmSync(offFile(stateDir), { force: true });
      try { defaults(); } catch { /* best effort, as in ensure */ }
      addLine({ stateDir, timezone: config.timezone, line: 'Check-ins on.', kind: 'checkins' });
      return { state: 'on', worker: keep().state };
    },
    journal: () => {
      if (values.line) return addLine({ stateDir, timezone: config.timezone, line: values.line, run: values.run, kind: values.run ? 'end' : 'note' });
      const text = values.new
        ? (env.WONG_DAILY_RUN ? null : newLines({ stateDir, timezone: config.timezone, key: chatKey(env) }))
        : readLines({ stateDir }).map(entry => format(entry, config.timezone)).join('\n');
      if (text) print(text);
    },
    status: async () => status({ ...(await chief()), project }),
    hand: async () => hand({ ...(await chief()), agent: values.agent }),
    reply: async () => reply({ ...(await chief()), ...said(), mark: values.mark }),
    answer: async () => answer({ ...(await chief()), ...said(), request: values.request }),
    allow: async () => allow({ ...(await chief()), agent: values.agent, request: values.request, bucket: values.bucket, label: values.label }),
    'done-agent': async () => doneAgent({ ...(await chief()), agent: values.agent, proof: values.proof }),
    'note-end': async () => { const { stateDir: dir, day } = await chief(); return noteEnd({ stateDir: dir, day, line: values.line }); },
    'line-up': async () => lineUpData({ ...(await chief()), project }),
    map: () => {
      let read;
      try { read = JSON.parse(readFileSync(values.file, 'utf8')); } catch (error) { return { status: 'refused', reason: 'map', error: oneLine(error.message) }; }
      return saveMap({ stateDir, chats: read?.chats });
    },
    tell: async () => tell({ ...(await chief()), project, agent: values.agent, text: values.file && readFileSync(values.file, 'utf8'), urgent: Boolean(values.now),
      coveredBy: values['covered-by'], drop: values.drop }),
  };
}

/** A command's journal place: the chat's session where the host shows it, else its Paseo id. */
export const chatKey = env => env.CLAUDE_CODE_SESSION_ID || env.CODEX_THREAD_ID || env.PASEO_AGENT_ID || 'cli';

// ---------------------------------------------------------------------------
// Check-ins: the off switch, and the worker kept running when the person has a job for it

export const offFile = stateDir => join(stateDir, 'off');
/** Set in a background run: such a run starts no worker and gets no check-in. */
export const RUN_FLAGS = ['WONG_DAILY_RUN', 'WONG_MEMORY_RUN', 'WONG_STOP_CHECK'];

/** Writes the off file, stops a running worker, and journals it. */
export function checkinsOff({ stateDir, timezone, kill = stopGroup, isAlive = alive }) {
  mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  writeFileSync(offFile(stateDir), `${new Date().toISOString()}\n`, { mode: 0o600 });
  const pid = lockedBy(stateDir, { isAlive });
  const stopped = pid && pid !== process.pid ? pid : null;
  if (stopped) kill(stopped);
  addLine({ stateDir, timezone, line: 'Check-ins off: a chat goes on only when you write.', kind: 'checkins' });
  return { state: 'off', stopped };
}

/** True when the worker has work: the chat list with an app, add-ons, a background schedule run handed over, a default
 * schedule this computer added, or an event job on the default list merged with the person's own. */
function hasJobs(config, project, env, stateDir, app) {
  if ((config.sources.chats && app) || config.addons?.morning?.length || config.addons?.pass?.length || waitingRuns(env).length) return true;
  if (Object.keys(readJson(defaultsFile(stateDir), {}).added ?? {}).length) return true;
  try { return Object.keys(loadSweeps({ project, file: config.sweeps }).events).length > 0; } catch { return false; }
}

/** The worker's env: not this chat's Paseo id or Claude Code session. */
const workerEnv = env => Object.fromEntries(Object.entries(env).filter(([key]) => key !== 'PASEO_AGENT_ID' && !/^CLAUDE(?!_CONFIG_DIR$)/.test(key)));

/** Starts `script serve` detached in `repo`, with the worker's env. */
export function startServe({ repo, script = SELF, env, agent, run = spawn }) {
  const child = run(process.execPath, [script, 'serve', '--agent', agent], { cwd: repo, detached: true, stdio: 'ignore', env: workerEnv(env) });
  child.on('error', () => {});
  child.unref();
}

/** Where the worker runs from: the main checkout's daily scripts, so a chat in any copy of the repo asks for the same
 * worker and code; this copy's when the main checkout has none. `{repo, script, dir}`. */
export function workerHome(repo = REPO, self = SELF) {
  const primary = primaryRoot(repo).primary;
  for (const skills of ['.agents', '.claude']) {
    const script = join(primary, skills, 'skills', 'daily', 'scripts', 'daily.mjs');
    if (existsSync(script)) return { repo: primary, script, dir: dirname(script) };
  }
  return { repo, script: self, dir: dirname(self) };
}

/** True when the worker's last beat came from code other than `code`, the main checkout's: a worker from before an
 * update. A lock holder that has not beaten yet is a new worker, and counts as current. */
function oldCode(stateDir, holder, code) {
  const last = readBeat(stateDir);
  return Boolean(last) && last.code !== code && (!holder || last.pid === holder);
}

/** True when the main checkout's worker writes a code stamp; before that, a restart only starts the same old code. */
function stamps(dir) {
  try { return readFileSync(join(dir, 'worker.mjs'), 'utf8').includes('codeStamp'); } catch { return false; }
}

/** Waits up to 1 second for a stopped worker to exit, so the new one can take its lock. */
function waitGone(pid, isAlive) {
  for (let waited = 0; waited < 1000 && isAlive(pid); waited += LOCK_RETRY_MS) wait(LOCK_RETRY_MS);
}

/** `{stamp, day, off, added, tried, failed}`: the defaults added here, the off state applied, the day and stamp a try
 * last set up every default, the running try `{at, stamp}`, and the last failure `{day, stamp, reason, at}`. */
export const defaultsFile = stateDir => join(stateDir, 'defaults.json');
const listStamp = file => { try { return createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 16); } catch { return null; } };
const RETRY_MS = 60 * 60e3;

/** The shipped list's stamp, with `:off` while check-ins are `off`; null when the list can not be read. */
export function defaultsStamp(stateDir, list = DEFAULT_SCHEDULES, off = existsSync(offFile(stateDir))) {
  const stamp = listStamp(list);
  return stamp && off ? `${stamp}:off` : stamp;
}

/** The running try as `{at, stamp}`; an older file's plain time is a try of no known stamp. */
const triedOf = kept => (typeof kept.tried === 'number' ? { at: kept.tried } : kept.tried);

/** The file without its running try when that try is the one for `stamp`, or of no known stamp; a newer try stays. */
function endTry(kept, stamp) {
  const tried = triedOf(kept);
  if (tried && tried.stamp !== undefined && tried.stamp !== stamp) return kept;
  const { tried: _tried, ...rest } = kept;
  return rest;
}

/** Marks today and `stamp`, the one the run started with, as set up, and forgets its try and the last failure. */
export function defaultsDone({ stateDir, timezone, list = DEFAULT_SCHEDULES, stamp = defaultsStamp(stateDir, list), now = Date.now() }) {
  const { failed: _failed, ...kept } = endTry(readJson(defaultsFile(stateDir), {}), stamp);
  writeJson(defaultsFile(stateDir), { ...kept, day: localDay(new Date(now), timezone), ...(stamp && { stamp }) });
}

/** Records a failed try of `stamp` and journals it, once a day for the same reason. */
export function defaultsFailed({ stateDir, timezone, list = DEFAULT_SCHEDULES, stamp = defaultsStamp(stateDir, list), reason, line, now = Date.now() }) {
  const kept = endTry(readJson(defaultsFile(stateDir), {}), stamp), day = localDay(new Date(now), timezone);
  const told = kept.failed?.day === day && kept.failed.reason === reason;
  writeJson(defaultsFile(stateDir), { ...kept, failed: { day, stamp, reason, at: now } });
  if (!told) addLine({ stateDir, timezone, line: line ?? `Default schedules not set up: ${reason}. Trying again in an hour.`, kind: 'defaults', now: new Date(now) });
}

const scheduleScript = home => join(home.dir, '..', '..', 'schedule', 'scripts', 'schedule.mjs');

/** Starts `schedule.mjs <command> --unattended` detached, with the worker's env. */
function runSchedule(command, { home, env, run }) {
  const child = run(process.execPath, [scheduleScript(home), command, '--unattended'], { cwd: home.repo, detached: true, stdio: 'ignore', env: workerEnv(env) });
  child.on('error', () => {});
  child.unref();
}

/** Once a day, while the person's file still holds routines, starts the schedule skill's unattended move to the app;
 * false when it did not, or the schedule skill is missing. */
export function startMoveIn({ home, stateDir, env, now = Date.now(), timezone, run = spawn }) {
  const marker = join(stateDir, 'move-in.json'), kept = readJson(marker, {}), day = localDay(new Date(now), timezone);
  if (!existsSync(scheduleScript(home)) || kept.day === day) return false;
  writeJson(marker, { ...kept, day });
  runSchedule('move-in', { home, env, run });
  return true;
}

/** Starts the unattended add of the default schedules until a try works today; a running or failed try waits an hour
 * unless the stamp changed. The stamp reads the started copy's list, so the child marks the same one. */
export function startDefaults({ home, stateDir, env, now = Date.now(), timezone, run = spawn, list = join(home.dir, '..', 'references', 'schedules.json') }) {
  if (!existsSync(scheduleScript(home))) return false;
  const kept = readJson(defaultsFile(stateDir), {}), day = localDay(new Date(now), timezone), stamp = defaultsStamp(stateDir, list);
  if (kept.day === day && (kept.stamp ?? null) === stamp) return false;
  const tried = triedOf(kept), { failed } = kept;
  if (tried) {
    const running = now - tried.at < RETRY_MS;
    if (running && (tried.stamp ?? null) === stamp) return false;
    if (!running) defaultsFailed({ stateDir, timezone, list, stamp: tried.stamp, reason: 'the last try stopped with no result', now });
  } else if (failed?.day === day && (failed.stamp ?? null) === stamp && now - failed.at < RETRY_MS) return false;
  writeJson(defaultsFile(stateDir), { ...readJson(defaultsFile(stateDir), {}), tried: { at: now, stamp } });
  runSchedule('defaults', { home, env, run });
  return true;
}

/** `D ensure`: starts the main checkout's worker, detached, when the person has a job and none runs, and restarts one
 * whose code is not the main checkout's; returns at once. Off, it takes handed-over schedule runs as `refused`. */
export function ensure({ repo = REPO, home = workerHome(repo), env = process.env, agent = RUN_AGENTS[0],
  resolve: settings = () => personSettings({ repo: home.repo }), spawnServe = startServe, root, now = Date.now(), isAlive = alive, kill = stopGroup,
  code = codeStamp(home.dir), stamped = stamps(home.dir), moveIn = startMoveIn, defaults = startDefaults } = {}) {
  if (RUN_FLAGS.some(name => env[name])) return { state: 'run' };
  const { me, config } = settings();
  if (!config) return { state: 'no-person' };
  const stateDir = stateOf(config, repo, root);
  if (config.checks?.length) {
    try { moveIn({ home, stateDir, env, now, timezone: config.timezone }); } catch { /* best effort */ }
  }
  try { defaults({ home, stateDir, env, now, timezone: config.timezone }); } catch { /* best effort */ }
  if (existsSync(offFile(stateDir))) {
    const refused = waitingRuns(env).length ? takeRuns({ env, project: primaryRoot(repo).primary, emails: config.emails, stateDir, now }) : [];
    return { state: 'off', ...(refused.length ? { refused } : {}) };
  }
  const holder = lockedBy(stateDir, { isAlive, now });
  const changed = stamped && oldCode(stateDir, holder, code);
  if (!changed && (serviceAlive(stateDir, now) || holder)) return { state: 'running' };
  if (!hasJobs(config, primaryRoot(repo).primary, env, stateDir, Boolean(me?.origin))) return { state: 'no-jobs' };
  const stop = changed && holder && holder !== process.pid ? holder : null;
  if (stop) {
    kill(stop);
    waitGone(stop, isAlive);
    addLine({ stateDir, timezone: config.timezone, line: 'Restarted the worker: its code changed.', kind: 'restart' });
  }
  spawnServe({ repo: home.repo, script: home.script, env, agent });
  return { state: stop ? 'restarted' : 'started' };
}

/** The `mark` hook, Claude Code or Codex: the chat's card at its start and each message; on a message, its waiting
 * notes as added context; Paseo's stop mark on a stop or notice. The stop check writes a stop's card. Never throws. */
export function markHook({ tool = 'claude', input = {}, env = process.env, home = homedir(), now = Date.now(), print = console.log }) {
  const event = input.hook_event_name;
  try {
    if (event !== 'Stop') writeCard({ tool, input, env, home, now });
    const notes = event === 'UserPromptSubmit' ? handOver({ home, key: input.session_id || env.CODEX_THREAD_ID, now }) : null;
    if (notes) print(notes);
  } catch { /* a hook never fails the chat */ }
  if (!['SessionStart', 'UserPromptSubmit'].includes(event)) mark({ env, now: new Date(now) });
}

/** A hook's JSON input on stdin, or {}. */
export function hookInput() {
  try { return JSON.parse(readFileSync(0, 'utf8') || '{}') ?? {}; } catch { return {}; }
}

/** Commands that need a settings file: the defaults hold no add-ons. */
const NEED_FILE = new Set(['start']);

/** The settings `command` runs with: the file's, else the defaults; it throws for a command that needs a file. */
export function commandSettings(command, { me, config }) {
  if (config && (me.file || !NEED_FILE.has(command))) return config;
  throw new SettingsError(`No daily settings for ${me.email ?? 'this person'}: add .agents/daily/<name>.json. See wiki/development/daily.md#your-settings-file.`);
}

async function main(args = process.argv.slice(2)) {
  // Each chat's hooks run mark: it never fails the chat. A chat opened before the update runs the old prompt hook.
  if (args[0] === 'mark') { markHook({ tool: args.includes('codex') ? 'codex' : 'claude', input: hookInput() }); return; }
  if (args[0] === 'journal' && args.includes('--hook')) return;
  const { command, values } = readArgs(args);
  if (command === 'ensure') {
    const { refused = [], ...result } = ensure({ agent: values.agent });
    if (refused.length) result.refused = await refuseRuns(refused, scheduleApp(primaryRoot(REPO).primary));
    console.log(JSON.stringify(result)); return;
  }
  const found = personSettings({ config: values.config });
  if (command === 'who') { console.log(JSON.stringify(found.me, null, 2)); return; }
  const config = commandSettings(command, found);
  const project = primaryRoot(REPO).primary;
  const stateDir = stateDirectory(project, config.person);
  const result = await commands({ config, project, stateDir, values, call: paseoCli(), chats: chatCalls(chatClient(project)) })[command]();
  if (result !== undefined) console.log(JSON.stringify(result, null, 2));
  if (REFUSED.has(result?.status ?? result?.state)) process.exitCode = 1;
}

if (isMain(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
