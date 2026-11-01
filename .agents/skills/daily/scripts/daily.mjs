#!/usr/bin/env node
// /daily's commands; each prints JSON. The model judges; this script holds the limits a model could drift past.
// wiki/development/daily.md
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, cpSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { primaryRoot } from '../../memory/scripts/lib/primary-root.mjs';
import { loadConfig, memoryOrigin, repoContext, signIn, signInHelp } from '../../memory/scripts/lib/store.mjs';
import { runAddons } from './addons.mjs';
import { boardCalls, boardClient } from './board.mjs';
import { BUCKETS, HAND_SOURCES, allow, answer, chiefDay, chiefEnv, close, doneAgent, hand, mark, noteEnd, paseoCli, readJson,
  remind, reply, status, todoLink, watch, watchStops, writeJson } from './chief.mjs';
import { SettingsError, addDays, loadSettings, localDay, mondayOf, occurrence, placePath, settingsFiles, settingsFor, slotOf } from './config.mjs';
import { addLine, format, hookOutput, newLines, readLines } from './journal.mjs';
import { serveDaily } from './worker.mjs';

const LAUNCHER = fileURLToPath(new URL('../../schedule/scripts/workspace.mjs', import.meta.url));
const REPO = fileURLToPath(new URL('../../../../', import.meta.url));
const KEPT = 400;
const ROWS = 30;
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

/** The settings file: `--config`, else the only one, else the one with the git email, else the sign-in email. */
export function who({ repo = REPO, ctx = repoContext(repo), origin = appOrigin(ctx), signedIn = signIn, config = null } = {}) {
  let me;
  if (origin) {
    const found = signedIn(origin);
    const ok = found.state === 'valid' || found.state === 'near';
    me = { source: 'sign-in', state: found.state, email: found.email ?? null, origin, days: found.days ?? null, login: ok ? null : signInHelp(origin) };
  } else {
    me = { source: 'git', state: ctx.author ? 'valid' : 'missing', email: ctx.author || null, origin: null, days: null, login: null };
  }
  const files = settingsFiles(repo);
  const file = config ? resolve(config) : files.length === 1 ? files[0].file : settingsFor(repo, ctx.author) ?? settingsFor(repo, me.email);
  let settings = null, error = null;
  if (file) { try { settings = loadSettings(file, repo); } catch (failed) { error = failed.message; } }
  return { ...me, file: file ?? null, person: settings?.person ?? null, team: settings?.teamFile ?? null, guide: settings?.guide ?? null,
    ...(error ? { error } : {}) };
}

// ---------------------------------------------------------------------------
// The started record: one row per routine, task or morning that started, under a file lock

const LOCK_RETRY_MS = 50, LOCK_STALE_MS = 10e3;
/** A claim that never got its workspace: after this long it counts as failed, and the next run starts it again. */
export const PENDING_MS = 10 * 60e3;
const wait = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Runs `work` while this process holds `<file>.lock`; a lock older than 10 s is a dead run's, and is taken over. */
function withLock(file, work) {
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

/** The launcher's arguments; it reads `--agent` only when no Paseo agent called it. */
export const launcherArgs = ({ title, brief }) => [LAUNCHER, 'open', '--title', title, '--brief', brief, '--agent', 'claude'];

/** Opens one workspace in `destination` through the launcher. Throws with the launcher's reason. */
async function launchWorkspace({ destination, title, message }) {
  const directory = mkdtempSync(join(tmpdir(), 'daily-'));
  const brief = join(directory, 'message.txt');
  try {
    writeFileSync(brief, `${message}\n`, { mode: 0o600 });
    const { stdout } = await run(process.execPath, launcherArgs({ title, brief }), { cwd: destination, encoding: 'utf8', maxBuffer: 1024 * 1024 });
    return JSON.parse(stdout);
  } catch (error) {
    let reason = error.message;
    try { reason = JSON.parse(error.stdout).error ?? reason; } catch { /* no JSON: keep the first reason */ }
    throw new Error(reason);
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

/** The name the person sees in Paseo's list of worktrees, such as `little-giraffe`. */
const workspaceOf = opened => (opened.cwd && basename(opened.cwd)) || opened.workspaceName || opened.workspaceId || null;

// ---------------------------------------------------------------------------
// start

/** `.agents/skills/news/SKILL.md` is `/news`; a routine's `prompt` replaces it. */
export const firstMessage = task => task.prompt ?? `/${basename(dirname(task.procedure))}`;

/** Each routine due on `day` with the key of its occurrence: `review:2026-10-12`, `finance:2026-11`. */
export function dueTasks(config, project, day) {
  return config.checks.filter(check => check.enabled && check.start === 'run').flatMap(check => {
    const due = occurrence(check, day);
    return due ? [{ ...check, destination: placePath(config, check.place, project), key: `${check.id}:${check.cadence.kind === 'monthly' ? due.slice(0, 7) : due}` }] : [];
  });
}

/** One routine's row, or null when its occurrence started on an earlier day. */
async function startOne(task, { record, day, timezone, now, launch, dryRun }) {
  const message = firstMessage(task);
  const held = holder => (localDay(new Date(holder.at), timezone) === day ? { title: task.title, state: 'already', workspace: holder.workspace ?? null } : null);
  const before = record.read()[task.key];
  if (holds(before, now)) return held(before);
  if (!existsSync(join(task.destination, task.procedure))) {
    return { title: task.title, state: 'failed', workspace: null, reason: `No skill at ${task.procedure} in ${task.destination}.` };
  }
  if (dryRun) return { title: task.title, state: 'due', workspace: null, message };
  const { holder, entry, error } = await launchOnce({ record, key: task.key, now, claim: { title: task.title },
    open: () => launch({ destination: task.destination, title: task.title, message }),
    fill: opened => ({ workspace: workspaceOf(opened), cwd: opened.cwd ?? null, agentId: opened.agentId ?? null, title: task.title, at: now.toISOString() }) });
  if (holder) return held(holder);
  if (error) return { title: task.title, state: 'failed', workspace: null, reason: error };
  return { title: task.title, state: 'started', workspace: entry.workspace };
}

const morningFile = (stateDir, day) => join(stateDir, `morning-${day}.json`);
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

/** Starts each due routine once, then the morning add-ons once per day; with `dryRun` it starts nothing. */
export async function start({ config, project, stateDir, now = new Date(), launch = launchWorkspace, dryRun = false, addons = runAddons,
  env = process.env }) {
  const day = localDay(now, config.timezone);
  const record = startedRecord(stateDir);
  const rows = [];
  for (const task of dueTasks(config, project, day)) {
    const row = await startOne(task, { record, day, timezone: config.timezone, now, launch, dryRun });
    if (row) rows.push(row);
  }
  if (dryRun) return { day, tasks: rows, guide: config.guide ?? null };
  if (env.PASEO_AGENT_ID) dailyRecord(stateDir).write({ ...dailyRecord(stateDir).read(), agentId: env.PASEO_AGENT_ID });
  const morning = await morningAddons({ config, project, record, day, now, addons });
  const saved = readJson(morningFile(stateDir, day), { tasks: [], lines: [], events: [], notRead: [] });
  const report = { ...saved, ...morning, tasks: [...saved.tasks, ...rows.filter(row => row.state !== 'already')] };
  writeJson(morningFile(stateDir, day), report);
  return { day, tasks: rows, lines: report.lines, events: report.events, notRead: report.notRead, guide: config.guide ?? null };
}

/** What today's morning started, with no launch: the started rows, then the saved failed rows, lines and events. */
export function startReport({ config, stateDir, now = new Date() }) {
  const day = localDay(now, config.timezone);
  const record = startedRecord(stateDir).read();
  const saved = readJson(morningFile(stateDir, day), null);
  const started = Object.entries(record).filter(([, entry]) => entry?.at && !entry.pending && !entry.addons && localDay(new Date(entry.at), config.timezone) === day)
    .map(([key, entry]) => ({ key, title: entry.title ?? key, state: 'started', workspace: entry.workspace ?? null }));
  return { day, morning: saved ? 'done' : 'not run', tasks: [...started, ...(saved?.tasks ?? []).filter(row => row.state === 'failed')],
    lines: saved?.lines ?? [], events: saved?.events ?? [], notRead: saved?.notRead ?? [], guide: config.guide ?? null };
}

// ---------------------------------------------------------------------------
// picture

const WEEK_SLOTS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const dayOfSlot = (week, slot) => addDays(week, WEEK_SLOTS.indexOf(slot));
const daysBetween = (from, to) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);
/** Late tasks come from the 4 weeks before: older undone work is in the backlog. */
const PAST_WEEKS = [1, 2, 3, 4];
const capped = (rows, cut) => { if (rows.length > ROWS) cut.truncated = true; return rows.slice(0, ROWS); };

/** This week's dated tasks and backlog, and `late`: undone tasks on a day of the 4 weeks before, oldest first. */
function trimTasks(board, past, day) {
  const cut = {}, undone = task => task.status !== 'done', open = board.tasks.filter(undone);
  const row = task => ({ id: task.id, title: task.title, status: task.status, slot: task.slot, ...(task.chat ? { chat: task.chat } : {}) });
  const late = past.flatMap(read => read.tasks.filter(task => task.week === read.week && task.slot !== 'backlog' && undone(task)))
    .map(task => ({ ...row(task), day: dayOfSlot(task.week, task.slot) })).sort((a, b) => a.day.localeCompare(b.day))
    .map(task => ({ ...task, lateDays: daysBetween(task.day, day) }));
  return { week: mondayOf(day), dated: capped(open.filter(task => task.slot !== 'backlog').map(row), cut),
    backlog: capped(open.filter(task => task.slot === 'backlog').map(row), cut), late: capped(late, cut),
    ...(cut.truncated || board.truncated || past.some(read => read.truncated) ? { truncated: true } : {}) };
}

const live = agent => agent && agent.status !== 'closed' && !agent.archivedAt;
const folderOf = cwd => String(cwd ?? '').replace(/^~(?=\/|$)/, homedir()).replace(/\/+$/, '');

/** The checkout's worktree folders, from git. */
async function worktrees(project) {
  const { stdout } = await run('git', ['-C', project, 'worktree', 'list', '--porcelain'], { encoding: 'utf8', timeout: 20000 });
  return stdout.split('\n').filter(line => line.startsWith('worktree ')).map(line => folderOf(line.slice(9)));
}

/** Live top-level chats in this checkout's worktrees, never the Daily chat: names and status, no typed text. */
async function readChats({ call, project, self, trees = worktrees }) {
  const folders = new Set(await trees(project));
  const list = await call(['ls', '--global']);
  if (!Array.isArray(list)) throw new Error('Paseo did not return a list.');
  const rows = [];
  for (const agent of list.filter(each => live(each) && each.id !== self && each.name !== 'Daily' && folders.has(folderOf(each.cwd))).slice(0, ROWS)) {
    if ((await call(['inspect', agent.id]).catch(() => null))?.ParentAgentId) continue;
    rows.push({ agent: agent.id, title: agent.name ?? null, status: agent.status, workspace: basename(folderOf(agent.cwd)) || null });
  }
  return { chats: rows };
}

/** The day's picture: each source on in the settings, or `off`; a source that does not answer is `unavailable`. */
export async function picture({ config, project, now = new Date(), board, call, env = process.env, trees }) {
  const day = localDay(now, config.timezone);
  const week = mondayOf(day), earlier = PAST_WEEKS.map(count => addDays(week, -7 * count));
  const calls = {
    tasks: async () => {
      const [current, ...past] = await Promise.all([week, ...earlier].map(each => board.tasks(each)));
      if (![current, ...past].every(read => Array.isArray(read?.tasks))) throw new Error('No tasks in the answer.');
      return trimTasks(current, past.map((read, index) => ({ ...read, week: earlier[index] })), day);
    },
    chats: () => readChats({ call, project, self: env.PASEO_AGENT_ID, ...(trees && { trees }) }),
  };
  const result = { day, sources: {} };
  await Promise.all(Object.keys(calls).map(async source => {
    if (!config.sources[source]) { result.sources[source] = 'off'; return; }
    try { Object.assign(result, await calls[source]()); result.sources[source] = 'ok'; } catch { result.sources[source] = 'unavailable'; }
  }));
  return result;
}

// ---------------------------------------------------------------------------
// start-task: one workspace per board task, one time ever

const TITLE_CHARS = 60;
/** The line that asks the agent to prepare a step that needs the person, and to say what is left for them. */
export const OWN_STEPS = 'Do what an agent can. When a step needs the person, such as a call, a visit or a meeting, get it ready and say what is left for them.';
/** Each risky step waits for the person: the workspace asks with its own card, and the watch leaves it in that chat. */
export const RISKY_STEPS = 'Before you send, post, pay, buy, publish, merge, delete or sign up, ask and wait for the answer.';

/** The started task's first message; the launcher refuses one that starts with "-". */
export const taskMessage = ({ title, note = '' }) => `${title.replace(/^[\s-]+/, '') || 'Task'}\n${note ? `Note: ${note}\n` : ''}${OWN_STEPS}\n${RISKY_STEPS}`;

/** Opens one undone board task of today in its own workspace, one time ever, and marks it in progress. */
export async function startTask({ config, project, stateDir, id, note = '', now = new Date(), board, launch = launchWorkspace }) {
  const day = localDay(now, config.timezone);
  const read = await board.tasks(mondayOf(day));
  const task = (read?.tasks ?? []).find(each => each.id === id && each.week === mondayOf(day) && each.slot === slotOf(day) && each.status !== 'done');
  if (!task) return { state: 'refused', error: `Task ${id} is not an undone task on today's board.` };
  if (task.chat || String(task.importKey ?? '').startsWith('chat:')) return { state: 'already', title: task.title, workspace: task.chat ?? null };
  const named = workspace => (workspace ? board.link({ id, chat: String(workspace).slice(0, 100) }).catch(() => null) : null);
  const { holder, entry, error } = await launchOnce({ record: startedRecord(stateDir), key: `task:${id}`, now, claim: { title: task.title, id },
    open: () => launch({ destination: project, title: `Task: ${task.title}`.slice(0, TITLE_CHARS), message: taskMessage({ title: task.title, note }) }),
    fill: opened => ({ workspace: workspaceOf(opened), cwd: opened.cwd ?? null, agentId: opened.agentId ?? null, at: now.toISOString(), title: task.title, id }) });
  if (holder) { await named(holder.workspace); return { day, title: task.title, state: 'already', workspace: holder.workspace ?? null }; }
  if (error) return { day, title: task.title, state: 'failed', workspace: null, reason: error };
  await named(entry.workspace);
  try { await board.status({ id, status: 'in_progress' }); } catch {
    return { day, title: task.title, state: 'started', workspace: entry.workspace, reason: 'not marked in progress' };
  }
  return { day, title: task.title, state: 'started', workspace: entry.workspace };
}

// ---------------------------------------------------------------------------
// open-daily: the Daily workspace and its /daily, one time per day

/** Where the Daily workspace and agent are saved. */
export function dailyRecord(stateDir) {
  const file = join(stateDir, 'daily-workspace.json');
  return { read: () => readJson(file, {}), write: value => writeJson(file, value) };
}

const busy = status => status === 'running' || status === 'initializing';

/** Takes the day's open-daily lock; false when a run already took it. */
function takeDay(stateDir, day) {
  mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  try { closeSync(openSync(join(stateDir, `open-daily-${day}.lock`), 'wx', 0o600)); return true; } catch (error) {
    if (error.code === 'EEXIST') return false;
    throw error;
  }
}

/** Finds or opens the Daily workspace, archives older idle Daily agents with nothing pending, and sends `/daily`. */
export async function openDaily({ config, project, stateDir, now = new Date(), call, dryRun = false }) {
  const saved = dailyRecord(stateDir);
  const workspaces = await call(['workspace', 'ls', '--background']);
  if (!Array.isArray(workspaces)) throw new Error('Paseo gave no workspace list.');
  const open = workspaces.find(each => saved.read().workspaceId && each.workspaceId === saved.read().workspaceId)
    ?? workspaces.find(each => folderOf(each.cwd) === folderOf(project) && each.name === 'Daily') ?? null;
  if (dryRun) return { dryRun: true, workspace: open?.workspaceId ?? null, create: !open };
  const day = localDay(now, config.timezone);
  if (!takeDay(stateDir, day)) return { state: 'already', day, workspace: saved.read().workspaceId ?? null, agent: saved.read().agentId ?? null };
  let id = open?.workspaceId;
  if (!id) {
    id = (await call(['workspace', 'create', '--isolation', 'local', '--path', project, '--title', 'Daily', '--no-background']))?.workspaceId;
    if (!id) throw new Error('Paseo did not make the Daily workspace.');
  }
  saved.write({ workspaceId: id });
  const kept = [], archived = [];
  for (const agent of (await call(['ls', '--global', '--label', 'daily-chat=1'])).filter(live)) {
    const detail = busy(agent.status) ? null : await call(['inspect', agent.id]).catch(() => null);
    if (!detail || detail.PendingPermissions?.length) kept.push(agent.id);
    else { await call(['archive', agent.id]); archived.push(agent.id); }
  }
  const started = await call(['run', '--workspace', id, '--label', 'daily-chat=1', '--title', 'Daily', '--provider', 'claude', '--mode', 'bypassPermissions',
    '--no-wait', '/daily']);
  saved.write({ workspaceId: id, agentId: started?.agentId ?? null });
  return { state: 'opened', day, workspace: id, created: !open, agent: started?.agentId ?? null, archived, kept };
}

// ---------------------------------------------------------------------------
// Command

const USAGE = `usage: daily.mjs who | start [--dry-run] [--report] | picture | open-daily [--dry-run]
       daily.mjs start-task --id <task id> [--note <words>] | remind --day <YYYY-MM-DD> --text <words>
       daily.mjs watch [--seconds 60] [--hours 24] [--once] | serve [--seconds 60] [--once] [--dry-run] | status
       daily.mjs journal [--new] | journal --line <words> [--run <id>]
       daily.mjs hand --agent <id|title|workspace> [--source handed|asked] | close --agent <a>
       daily.mjs reply --agent <a> --file <text file> --bucket keep-going|pick|person --label <line> [--mark <mark>]
       daily.mjs answer --agent <a> --request <id> --file <text file> --bucket keep-going|pick|person --label <line>
       daily.mjs allow --agent <a> --request <id> --bucket keep-going|person --label <line>
       daily.mjs done-agent --agent <a> --proof <text> | todo link --agent <a> --url <https link> | note-end --line <words>
       daily.mjs mark | journal --hook
  each but the two hooks takes --config <settings file>; a hook never fails; chief-service is serve`;
const FLAGS = { who: [], start: ['dry-run', 'report'], picture: [], 'open-daily': ['dry-run'], 'start-task': ['id', 'note'], remind: ['day', 'text'],
  watch: ['seconds', 'hours', 'once'], serve: ['seconds', 'once', 'dry-run'], journal: ['new', 'line', 'run'], status: [], hand: ['agent', 'source'], close: ['agent'],
  reply: ['agent', 'file', 'bucket', 'label', 'mark'], answer: ['agent', 'request', 'file', 'bucket', 'label'], allow: ['agent', 'request', 'bucket', 'label'],
  'done-agent': ['agent', 'proof'], 'todo link': ['agent', 'url'], 'note-end': ['line'] };
const NEEDS = { 'start-task': ['id'], remind: ['day', 'text'], hand: ['agent'], close: ['agent'], reply: ['agent', 'file', 'bucket', 'label'],
  answer: ['agent', 'request', 'file', 'bucket', 'label'], allow: ['agent', 'request', 'bucket', 'label'], 'done-agent': ['agent', 'proof'],
  'todo link': ['agent', 'url'], 'note-end': ['line'] };
/** An answer that changed nothing it was asked to change. */
const REFUSED = new Set(['refused', 'unknown', 'ambiguous', 'failed', 'not confirmed', 'unsupported']);

/** The command line as `{command, values}`; a wrong one exits with the usage. */
export function readArgs(args) {
  const { values, positionals } = parseCli({ usage: USAGE, allowPositionals: true, args, options: Object.fromEntries([
    ...['config', 'seconds', 'hours', 'id', 'note', 'agent', 'source', 'file', 'bucket', 'label', 'request', 'day', 'text', 'mark', 'proof', 'url', 'line',
      'run'].map(name => [name, { type: 'string' }]),
    ...['dry-run', 'once', 'report', 'new'].map(name => [name, { type: 'boolean' }])]) });
  const [first, ...extra] = positionals;
  const named = first === 'todo' ? `${first} ${extra.shift()}` : first;
  const command = named === 'chief-service' ? 'serve' : named;
  const flags = Object.keys(values).filter(name => name !== 'config');
  if (!Object.hasOwn(FLAGS, command) || extra.length || flags.some(flag => !FLAGS[command].includes(flag)) || (NEEDS[command] ?? []).some(flag => !values[flag])) {
    usageError(USAGE);
  }
  for (const [name, low, high, fallback] of [['seconds', 5, 3600, 60], ['hours', 1, 24, 24]]) {
    const value = values[name] === undefined ? fallback : Number(values[name]);
    if (!Number.isInteger(value) || value < low || value > high) usageError(USAGE, `--${name} must be a whole number from ${low} to ${high}.`);
    values[name] = value;
  }
  if (values.bucket !== undefined && !BUCKETS.includes(values.bucket)) usageError(USAGE, `--bucket takes ${BUCKETS.join(', ')}.`);
  if (command === 'allow' && values.bucket === 'pick') usageError(USAGE, '--bucket takes keep-going or person.');
  if (values.source !== undefined && !HAND_SOURCES.includes(values.source)) usageError(USAGE, `--source takes ${HAND_SOURCES.join(', ')}.`);
  return { command, values };
}

/** Each command, over the settings, the checkout, the state folder and the injected calls. */
export function commands({ config, project, stateDir, values, call, board, origin = () => board.origin(), env = process.env, addons = runAddons,
  print = console.log }) {
  const started = () => startedRecord(stateDir).read();
  const daily = dailyRecord(stateDir);
  const at = { stateDir, started, timezone: config.timezone };
  const chief = async () => {
    const dailyId = daily.read().agentId ?? null;
    return { ...at, day: chiefDay(at), call, dailyId, env: await chiefEnv(env, { daily: dailyId }, call) };
  };
  const hosts = async () => { try { return [new URL(await origin()).hostname]; } catch { return []; } };
  const passAddons = config.addons?.pass?.length
    ? events => addons({ list: config.addons.pass, repo: project, context: { ...addonContext(config, project, localDay(new Date(), config.timezone), 'pass'), events } })
    : null;
  const watching = { board: board.tasks, todos: config.sources.tasks ? board : null, addons: passAddons, stops: notice => watchStops(env, notice) };
  const said = () => ({ agent: values.agent, text: readFileSync(values.file, 'utf8'), bucket: values.bucket, label: values.label });
  return {
    start: () => (values.report ? startReport({ config, stateDir }) : start({ config, project, stateDir, dryRun: Boolean(values['dry-run']), env, addons })),
    picture: () => picture({ config, project, board, call, env }),
    'open-daily': () => openDaily({ config, project, stateDir, call, dryRun: Boolean(values['dry-run']) }),
    'start-task': () => startTask({ config, project, stateDir, id: values.id, note: values.note, board }),
    remind: () => remind({ day: values.day, text: values.text, today: localDay(new Date(), config.timezone), add: board.add }),
    watch: async () => {
      const context = await chief();
      await watch({ ...context, ...watching, ignore: [context.dailyId].filter(Boolean), seconds: values.seconds, hours: values.hours, once: Boolean(values.once) });
    },
    // A dry run works on a copy of the state, so the live service's watch and queue see nothing taken.
    serve: async () => {
      const dryRun = Boolean(values['dry-run']);
      const dir = dryRun ? mkdtempSync(join(tmpdir(), 'daily-serve-')) : stateDir;
      if (dryRun && existsSync(stateDir)) cpSync(stateDir, dir, { recursive: true });
      try {
        await serveDaily({ config, project, stateDir: dir, call, env, seconds: values.seconds, once: Boolean(values.once), dryRun, print: item => print(JSON.stringify(item)),
          started: () => startedRecord(dir).read(), daily: dailyRecord(dir),
          watching: { board: board.tasks, ...(!dryRun && { todos: watching.todos, addons: passAddons }) } });
      } finally { if (dryRun) rmSync(dir, { recursive: true, force: true }); }
    },
    journal: () => {
      if (values.line) return addLine({ stateDir, timezone: config.timezone, line: values.line, run: values.run, kind: values.run ? 'end' : 'note' });
      const text = values.new
        ? newLines({ stateDir, timezone: config.timezone, agentId: env.PASEO_AGENT_ID, dailyId: daily.read().agentId, run: Boolean(env.WONG_DAILY_RUN) })
        : readLines({ stateDir }).map(entry => format(entry, config.timezone)).join('\n');
      if (text) print(text);
    },
    status: async () => status(await chief()),
    hand: async () => hand({ ...(await chief()), agent: values.agent, source: values.source }),
    close: async () => close({ ...(await chief()), agent: values.agent }),
    reply: async () => reply({ ...(await chief()), ...said(), mark: values.mark }),
    answer: async () => answer({ ...(await chief()), ...said(), request: values.request }),
    allow: async () => allow({ ...(await chief()), agent: values.agent, request: values.request, bucket: values.bucket, label: values.label }),
    'done-agent': async () => doneAgent({ ...(await chief()), agent: values.agent, proof: values.proof, board }),
    'todo link': async () => todoLink({ ...(await chief()), agent: values.agent, url: values.url, board, hosts: await hosts() }),
    'note-end': async () => { const { stateDir: dir, day } = await chief(); return noteEnd({ stateDir: dir, day, line: values.line }); },
  };
}

/** The prompt hook: the Daily agent's new journal lines, found with no sign-in check; any other chat gets ''. */
export function journalHook({ env = process.env, repo = REPO, root } = {}) {
  const agentId = env.PASEO_AGENT_ID;
  if (!agentId || env.WONG_DAILY_RUN) return '';
  const base = stateDirectory(primaryRoot(repo).primary, '', root);
  for (const person of readdirSync(base)) {
    const stateDir = join(base, person);
    if (dailyRecord(stateDir).read().agentId !== agentId) continue;
    const file = settingsFiles(repo).find(entry => readJson(entry.file, {}).person === person)?.file;
    return file ? hookOutput(newLines({ stateDir, timezone: loadSettings(file, repo).timezone, agentId, dailyId: agentId })) : '';
  }
  return '';
}

async function main(args = process.argv.slice(2)) {
  // A hook runs mark and journal --hook: they never fail the chat, and print nothing but the hook's own answer.
  if (args[0] === 'mark') { mark(); return; }
  if (args[0] === 'journal' && args.includes('--hook')) {
    try { const out = journalHook(); if (out) console.log(out); } catch { /* nothing: the prompt goes on */ }
    return;
  }
  const { command, values } = readArgs(args);
  const me = who({ config: values.config });
  if (command === 'who') { console.log(JSON.stringify(me, null, 2)); return; }
  if (!me.file) throw new SettingsError(`No daily settings for ${me.email ?? 'this person'}: add .agents/daily/<name>.json. See wiki/development/daily.md#your-settings-file.`);
  const config = loadSettings(me.file, REPO);
  const project = primaryRoot(REPO).primary;
  const stateDir = stateDirectory(project, config.person);
  const board = boardCalls(boardClient(project));
  const result = await commands({ config, project, stateDir, values, call: paseoCli(), board })[command]();
  if (result !== undefined) console.log(JSON.stringify(result, null, 2));
  if (REFUSED.has(result?.status ?? result?.state)) process.exitCode = 1;
}

if (isMain(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
