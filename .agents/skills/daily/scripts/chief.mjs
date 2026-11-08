// The watch over the person's chats for the daily's helpers, their replies and the Inbox's chat list. Its
// limits live here, not in a model: only watched agents, 5 own actions in a row, outward commands wait for the person.
import { execFileSync } from 'node:child_process';
import { appendFileSync, chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync,
  watch as fsWatch } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir, tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { EXIT, PaseoError, findPaseo, paseo } from '../../schedule/scripts/lib/paseo.mjs';
import { localDay } from './config.mjs';
import { finished } from './finished.mjs';
import { keepChats, openChats } from './todos.mjs';

export const BUCKETS = ['keep-going', 'pick', 'person'];
// The watch's own actions in a row on one agent before the next stop is left for the person.
export const STREAK = 5;
// How long a stop after the person's own message waits for them, and how much of a turn a watch line shows.
export const HOLD_MS = 15 * 60e3;
const PREVIEW = 200;
const DAY_MS = 24 * 3600e3;
const KEPT_EVENTS = 100;
const UNSUPPORTED = 'This chat is not in Paseo, so it cannot watch other chats.';
const unsupported = { status: 'unsupported', reason: UNSUPPORTED };

export const readJson = (file, fallback) => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return fallback; } };

/** Writes private JSON in one step, so a reader never sees half a file. */
export function writeJson(file, value) {
  mkdirSync(join(file, '..'), { recursive: true, mode: 0o700 });
  writeFileSync(`${file}.tmp`, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  chmodSync(`${file}.tmp`, 0o600);
  renameSync(`${file}.tmp`, file);
}

export const watchFile = (stateDir, day) => join(stateDir, `${day}.watch.json`);
/** The line-up's map of the watched chats and its pending notes: line-up.mjs owns it. */
export const lineUpFile = stateDir => join(stateDir, 'line-up.json');
const handsFile = (stateDir, day) => join(stateDir, `${day}.hands.json`);
const actionsFile = (stateDir, day) => join(stateDir, `${day}.actions.jsonl`);
const oneLine = value => String(value).split('\n')[0].slice(0, 200);
const lowered = value => String(value ?? '').toLowerCase();
export const live = agent => agent && agent.status !== 'closed' && !agent.archivedAt;
const folder = (cwd, home = homedir()) => String(cwd ?? '').replace(/^~(?=\/|$)/, home).replace(/\/+$/, '');
export const working = status => status === 'running' || status === 'initializing';

/** The rows `start` recorded on `day`, by their keys. */
function startedOn(record, timezone, day) {
  return Object.entries(record).filter(([, entry]) => entry?.at && !entry.pending && localDay(new Date(entry.at), timezone) === day)
    .map(([key, entry]) => ({ agentId: entry.agentId ?? null, cwd: entry.cwd ?? null, title: entry.title ?? key.split(':')[0],
      workspace: entry.workspace ?? null, source: 'started' }));
}

const watchDays = stateDir => {
  try { return readdirSync(stateDir).map(name => /^(\d{4}-\d{2}-\d{2})\.watch\.json$/.exec(name)?.[1]).filter(Boolean); } catch { return []; }
};

/** Today once today's daily started or watched; before that, a watch day under 24 hours old keeps its list. */
export function chiefDay({ stateDir, started, timezone, now = new Date() }) {
  const today = localDay(now, timezone);
  if (startedOn(started(), timezone, today).length || existsSync(watchFile(stateDir, today))) return today;
  return watchDays(stateDir).filter(day => day < today).sort().reverse()
    .find(day => now.getTime() - Date.parse(readJson(watchFile(stateDir, day), {}).startedAt ?? 0) < DAY_MS) ?? today;
}

/** True when a later day's daily started or watched: that day's watch owns watching now. */
function newerDay({ stateDir, started, timezone, day }) {
  return Object.values(started()).some(entry => entry?.at && localDay(new Date(entry.at), timezone) > day)
    || watchDays(stateDir).some(each => each > day);
}

/** The chats a pass add-on said to leave alone, as the watch last read them. */
const skipped = (stateDir, day) => new Set(readJson(watchFile(stateDir, day), {}).skip ?? []);

// The watch list for `day`: started rows, hands, then admitted chats, one row per agent. Never this chat or a `skip`.
export function watched({ stateDir, day, started, timezone, list = [], self, ignore = [], chats = readJson(watchFile(stateDir, day), {}).chats ?? [],
  skip = skipped(stateDir, day) }) {
  const agents = list.filter(live);
  const byFolder = cwd => (cwd ? agents.find(agent => folder(agent.cwd) === folder(cwd))?.id : null) ?? null;
  const own = startedOn(started(), timezone, day).map(row => ({ ...row, agentId: row.agentId ?? byFolder(row.cwd) }));
  const seen = new Set();
  return [...own, ...readJson(handsFile(stateDir, day), []), ...chats]
    .filter(row => row.agentId && row.agentId !== self && !ignore.includes(row.agentId) && !row.closed && !skip.has(row.agentId)
      && !seen.has(row.agentId) && seen.add(row.agentId));
}

/** Each workspace folder's name in Paseo; empty when Paseo does not list them, so a folder name stands in. */
async function workspaceNames(call) {
  const list = await call(['workspace', 'ls', '--background']).catch(() => null);
  return new Map((Array.isArray(list) ? list : []).filter(each => each?.cwd && each.name).map(each => [folder(each.cwd), each.name]));
}

// A row shows `workspace`; `cwd` keeps the folder, so a folder name still finds the chat.
const placeOf = (names, cwd) => ({ workspace: names.get(folder(cwd)) ?? (basename(folder(cwd)) || null), cwd: cwd ?? null });

/** A folder's git common dir, real path, or null when it is gone or not in git. */
export function commonDir(cwd) {
  try {
    const dir = execFileSync('git', ['-C', cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir'],
      { encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return realpathSync(dir);
  } catch { return null; }
}

/** `cwd => bool`: true for a folder in `project`'s repo or one of its worktrees; each folder is asked once. */
export function sameRepo(project, read = commonDir) {
  const mine = read(project);
  const seen = new Map();
  return cwd => {
    if (!seen.has(cwd)) seen.set(cwd, Boolean(mine) && read(cwd) === mine);
    return seen.get(cwd);
  };
}

// Admits each live top-level chat in this repo that worked in the last 24 hours, once; `inspect` runs again only on a
// new status. A skipped chat leaves, and joins again only when it works after the skip ends.
async function admit({ rows, list, state, call, self, ignore = [], now, skip = new Set(), ownRepo = () => true }) {
  let names;
  for (const row of state.chats.filter(each => skip.has(each.agentId))) {
    state.known[row.agentId] = { parent: null, status: null, skipped: true };
    delete state.agents[row.agentId];
  }
  state.chats = state.chats.filter(row => !skip.has(row.agentId));
  for (const agent of list.filter(live)) {
    if (agent.id === self || ignore.includes(agent.id) || rows.some(row => row.agentId === agent.id)
      || state.chats.some(row => row.agentId === agent.id) || !ownRepo(folder(agent.cwd))) continue;
    if (skip.has(agent.id)) { state.known[agent.id] = { parent: null, status: agent.status, skipped: true }; continue; }
    const known = state.known[agent.id];
    if (known?.skipped ? !working(agent.status) : known && (known.parent || known.status === agent.status)) continue;
    let detail;
    try { detail = await call(['inspect', agent.id]); } catch { continue; }
    state.known[agent.id] = { parent: detail?.ParentAgentId ?? null, updatedAt: detail?.UpdatedAt ?? null, status: agent.status };
    if (detail?.ParentAgentId || !(working(agent.status) || now - Date.parse(detail?.UpdatedAt ?? 0) < DAY_MS)) continue;
    names ??= await workspaceNames(call);
    state.chats.push({ agentId: agent.id, title: agent.name ?? null, ...placeOf(names, agent.cwd), source: 'own', at: new Date(now).toISOString() });
  }
}

const describe = row => ({ agent: row.agentId, title: row.title ?? null, workspace: row.workspace ?? null, source: row.source });

/** The watch's logged actions on `day`, oldest first. */
export function actions({ stateDir, day }) {
  const file = actionsFile(stateDir, day);
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
}

function logAction(stateDir, day, action) {
  mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  appendFileSync(actionsFile(stateDir, day), `${JSON.stringify(action)}\n`, { mode: 0o600 });
  return action;
}

/** The own actions on one agent since the person's last word: a `person` entry, or `since`, their last message. */
export function streak(log, agentId, since = null) {
  let count = 0;
  for (const entry of [...log].reverse()) {
    if (entry.agent !== agentId) continue;
    if (entry.bucket === 'person' || (since && entry.at <= since)) break;
    count++;
  }
  return count;
}

const AGENT_ID = /^(?!\.{1,2}$)[A-Za-z0-9._-]{1,128}$/;

/** Paseo's own record of a chat, read from its folder; {} when unread. */
export function paseoRecord(agentId, home = homedir()) {
  if (!AGENT_ID.test(String(agentId ?? ''))) return {};
  const root = join(home, '.paseo', 'agents');
  try {
    for (const project of readdirSync(root)) {
      const file = join(root, project, `${agentId}.json`);
      if (existsSync(file)) return readJson(file, {}) ?? {};
    }
  } catch { /* no record */ }
  return {};
}

/** When the person last typed in a chat, from Paseo's own agent record (its CLI does not show it); null when unread. */
export const userAt = (agentId, home = homedir()) => paseoRecord(agentId, home).lastUserMessageAt ?? null;

/** The listed agents a name means: its id, an id prefix of 4 or more, its title, or its workspace folder, in order. */
export function findAgents(list, name) {
  const want = lowered(name);
  for (const match of [
    agent => agent.id === name,
    agent => name.length >= 4 && agent.id.startsWith(name),
    agent => lowered(agent.name) === want,
    agent => lowered(basename(folder(agent.cwd))) === want,
  ]) {
    const found = list.filter(match);
    if (found.length) return found;
  }
  return [];
}

export function watchedRow(rows, name) {
  const want = lowered(name);
  return rows.find(row => row.agentId === name) ?? rows.find(row => name.length >= 4 && row.agentId.startsWith(name))
    ?? rows.find(row => lowered(row.title) === want || lowered(row.workspace) === want || (row.cwd && lowered(basename(folder(row.cwd))) === want))
    ?? null;
}

/** A short mark of a text, or null for none: a different mark means the agent said something new. */
export const messageMark = text => (text === null || text === undefined ? null : createHash('sha256').update(text).digest('hex').slice(0, 16));
/** The mark of a message as the log shows it to the watch: its first line, at most 200 characters. */
export const userMarkOf = text => messageMark(String(text).trim().split('\n')[0].slice(0, PREVIEW));

export const USER = '[User] ';
/** An agent's words in log lines: what the watch marks as its turn. */
export const saidOf = lines => lines.filter(each => !/^\[[A-Za-z]+\] /.test(each)).join('\n').trim();

/** The agent's last turn, `{said, mark, userMark}`: its text after the last `[User]` entry; null when unread. */
export async function readTurn(call, agentId) {
  const logs = more => call(['logs', agentId, ...more, '--filter', 'text']);
  let text;
  try {
    text = await logs(['--tail', '80']);
    if (typeof text === 'string' && !`\n${text}`.includes(`\n${USER}`)) text = await logs([]);
  } catch { return null; }
  if (typeof text !== 'string') return null;
  const lines = text.split('\n');
  const at = lines.findLastIndex(each => each.startsWith(USER));
  const said = saidOf(lines.slice(at + 1));
  return { said, mark: messageMark(said), userMark: at < 0 ? undefined : userMarkOf(lines[at].slice(USER.length)) };
}

const preview = turn => (turn ? turn.said.replace(/\s+/g, ' ').trim().slice(-PREVIEW) : null);
const notPaseo = error => error instanceof PaseoError && error.code === EXIT.noPaseo;

async function readPaseo(call) {
  const [list, pending] = [await call(['ls', '--global']), await call(['permit', 'ls'])];
  if (!Array.isArray(list) || !Array.isArray(pending)) throw new Error('Paseo did not return a list.');
  return { list, pending };
}

// The person's own new message at this stop. With no time to compare, a new `[User]` entry the watch did not send
// counts; an unread log counts too: a wrong wait costs less than a wrong action.
function personWrote({ row, seen, turn, log, at }) {
  if (at && seen.userAt) return at !== seen.userAt;
  if (!turn) return true;
  if (turn.userMark === undefined || turn.userMark === seen.userMark) return false;
  if (log.some(entry => entry.agent === row.agentId && entry.sent === turn.userMark)) return false;
  return seen.userMark !== undefined || row.source === 'own';
}

// One pass over the watched agents: `gone`, `asking` per new request, `stopped` once per idle spell. A stop after the
// person's own message waits until 15 minutes after it, through the agent's later runs; their next message restarts it.
async function notice({ rows, list, pending, state, log, record, call, line, now, typedAt }) {
  for (const row of rows) {
    const agent = list.find(entry => entry.id === row.agentId);
    if (!live(agent)) {
      line({ event: 'gone', ...describe(row) });
      state.gone.push(row.agentId);
      delete state.agents[row.agentId];
      continue;
    }
    const seen = state.agents[row.agentId] ?? { idle: false, at: null, requests: [] };
    const asks = pending.filter(request => request.agentId === row.agentId);
    const fresh = asks.filter(ask => !seen.requests.includes(ask.id));
    const asking = (ask, turn) => line({ event: 'asking', ...describe(row), request: { id: ask.id, name: ask.name, description: ask.description ?? null },
      last: preview(turn), mark: turn?.mark ?? null });
    const stopped = turn => line({ event: 'stopped', ...describe(row), status: agent.status, last: preview(turn), mark: turn?.mark ?? null });
    const stop = (turn, say, requests = []) => {
      const at = typedAt(row.agentId);
      const theirs = personWrote({ row, seen, turn, log, at });
      if (turn?.userMark !== undefined) seen.userMark = turn.userMark;
      if (at) seen.userAt = at;
      const holding = seen.hold && now() < seen.hold.until;
      if (!theirs && !holding) return say();
      let until = seen.hold?.until;
      if (theirs) {
        const user = at ?? turn?.userMark;
        if (user !== undefined && !log.some(entry => entry.agent === row.agentId && entry.kind === 'own-chat' && entry.user === user)) {
          log.push(record({ at: new Date(now()).toISOString(), ...describe(row), bucket: 'person', kind: 'own-chat', user }));
        }
        until = (at ? Date.parse(at) : now()) + HOLD_MS;
        if (now() >= until) { delete seen.hold; return say(); }
      }
      const kept = requests.length ? seen.hold?.requests ?? [] : [];
      seen.hold = { until, requests: [...requests, ...kept] };
    };
    let turn;
    const read = async () => (turn === undefined ? (turn = await readTurn(call, row.agentId)) : turn);
    if (seen.hold?.requests.length) {
      const held = asks.filter(ask => seen.hold.requests.includes(ask.id));
      if (!held.length) seen.hold.requests = [];
      else if (now() >= seen.hold.until) { const at = await read(); for (const ask of held) asking(ask, at); delete seen.hold; }
    }
    if (fresh.length) {
      const at = await read();
      stop(at, () => { for (const ask of fresh) asking(ask, at); }, fresh.map(ask => ask.id));
    }
    seen.requests = asks.map(ask => ask.id);
    if (agent.status !== 'idle' && agent.status !== 'error') {
      seen.idle = false;
      if (seen.hold && !seen.hold.requests.length && now() >= seen.hold.until) delete seen.hold;
    } else if (!asks.length) {
      const actedSince = log.some(entry => entry.agent === row.agentId && entry.kind !== 'own-chat' && seen.at && entry.at > seen.at);
      const at = await read(), mark = at?.mark ?? null;
      const said = mark !== null && seen.last && mark !== seen.last;
      if (!seen.idle || actedSince || said) {
        stop(at, () => stopped(at));
        seen.idle = true;
        seen.at = new Date(now()).toISOString();
      } else if (seen.hold && now() >= seen.hold.until) {
        delete seen.hold;
        stopped(at);
        seen.at = new Date(now()).toISOString();
      }
      if (mark !== null) seen.last = mark;
    }
    state.agents[row.agentId] = seen;
  }
}

/** The pass add-ons' answer: posts and events as lines, `skip` kept for this pass, one `not-read` per failed add-on. */
async function passAddons({ addons, state, line, missed, cleared }) {
  const out = await addons(state.lastEvents ?? []);
  const failed = new Set(out.failed.map(each => `add-on ${each.addon}`));
  for (const each of out.failed) missed(`add-on ${each.addon}`, new Error(each.error));
  for (const source of state.notRead.filter(each => each.startsWith('add-on ') && !failed.has(each))) cleared(source);
  for (const text of out.lines) line({ event: 'post', text });
  for (const event of out.events) line(event);
  if (!failed.size) state.skip = [...new Set(out.skip)];
  return !failed.size;
}

// Notices, never acts on an agent: one JSON line per event, kept in `<day>.watch.json` so a restart repeats nothing.
// It ends on a later day.
export async function watch({ stops = () => null, ...args }) {
  const wake = { heard: false, ids: new Set() };
  const watcher = stops(name => { if (!name || wake.ids.has(name)) wake.heard = true; });
  try { return await passes({ ...args, wake }); } finally { watcher?.close?.(); }
}

// `chats`, `{sync, computer}`, sends the Inbox's chat list each pass; without it the pass sends none.
async function passes({ stateDir, started, timezone, call, chats = null, addons = null, env = process.env, self = env.PASEO_AGENT_ID,
  ignore = [], service = false, print = console.log, seconds = 60, once = false, now = () => Date.now(),
  sleep = ms => new Promise(done => setTimeout(done, ms)), wake, typedAt = userAt, agentRecord = paseoRecord, ownRepo = () => true }) {
  let printed = [];
  const line = event => { printed.push(event); print(JSON.stringify(event)); };
  if (!service && !self) { line({ event: 'unsupported', reason: UNSUPPORTED }); return null; }
  const day = chiefDay({ stateDir, started, timezone, now: new Date(now()) });
  const file = watchFile(stateDir, day);
  if (service) endEarlier(stateDir, day);
  for (;;) {
    wake.heard = false;
    const state = { startedAt: new Date(now()).toISOString(), agents: {}, gone: [], notRead: [], chats: [], known: {}, skip: [],
      ...(service && { read: [] }), ...readJson(file, {}) };
    if (state.ended) return day;
    // The service also hears each repeat failure and each read after a failure or first that day, so the worker counts
    // failures in a row; those events stay out of `lastEvents`, which the add-ons read.
    const tell = event => print(JSON.stringify(event));
    const missed = (source, error) => {
      const again = state.notRead.includes(source);
      if (!again) line({ event: 'not-read', source, error: oneLine(error.message) });
      else if (service) tell({ event: 'not-read', source, error: oneLine(error.message), again: true });
      state.notRead = [...new Set([...state.notRead, source])];
    };
    const cleared = source => {
      if (service && (state.notRead.includes(source) || !state.read.includes(source))) tell({ event: 'read', source });
      if (service) state.read = [...new Set([...state.read, source])];
      state.notRead = state.notRead.filter(each => each !== source);
    };
    const end = reason => {
      writeJson(file, service ? { ...state, ended: reason } : state);
      line({ event: 'end', reason });
      return day;
    };
    if (newerDay({ stateDir, started, timezone, day })) return end('next-day');
    printed = [];
    if (addons) await passAddons({ addons, state, line, missed, cleared });
    let read = null;
    try {
      read = await readPaseo(call);
      cleared('workspaces');
    } catch (error) {
      if (notPaseo(error)) { line({ event: 'unsupported', reason: error.message }); return null; }
      missed('workspaces', error);
    }
    if (read) {
      const list = { stateDir, day, started, timezone, list: read.list, self, ignore };
      const skip = new Set(state.skip);
      await admit({ rows: watched({ ...list, chats: [], skip }), list: read.list, state, call, self, ignore, now: now(), skip, ownRepo });
      const rows = watched({ ...list, chats: state.chats, skip }).filter(row => !state.gone.includes(row.agentId));
      wake.ids = new Set(rows.map(row => row.agentId));
      const log = actions({ stateDir, day });
      await notice({ rows, ...read, state, log, record: action => logAction(stateDir, day, action), call, line, now, typedAt });
      if (chats) {
        const open = openChats({ rows, list: read.list, known: state.known, ignore, self, ownRepo: cwd => ownRepo(folder(cwd)),
          record: id => agentRecord(id), now: now() });
        await keepChats({ stateDir, chats: open, ...chats, list: read.list, send: agentId => sendText(call, agentId, '/close'), typedAt, line,
          now: new Date(now()), read: name => readJson(name, {}), write: writeJson }).then(() => cleared('chats'), error => missed('chats', error));
      }
    }
    state.lastEvents = printed.slice(-KEPT_EVENTS);
    writeJson(file, state);
    if (once) return day;
    await pause({ seconds, sleep, heard: () => wake.heard });
  }
}

/** Marks each earlier day's watch that no `end` closed as ended: its chats join today's watch when they work again. */
function endEarlier(stateDir, day) {
  for (const other of watchDays(stateDir).filter(each => each < day)) {
    const old = readJson(watchFile(stateDir, other), {});
    if (!old.ended) writeJson(watchFile(stateDir, other), { ...old, ended: 'next-day' });
  }
}

/** The folder where each chat's stop hook leaves a file named for its agent. */
export const agentEvents = env => join(env.HOME || homedir(), '.wong-stack', 'agent-events');

/** A chat's stop report: touches its file so a watch looks now. Outside Paseo it does nothing. */
export function mark({ env = process.env, now = new Date() } = {}) {
  const id = env.PASEO_AGENT_ID;
  // A schedule run's hand-over shares the folder: a chat id never takes its name.
  if (!AGENT_ID.test(id ?? '') || id.startsWith('schedule-run-')) return { status: 'skipped' };
  try {
    mkdirSync(agentEvents(env), { recursive: true });
    writeFileSync(join(agentEvents(env), id), `${now.toISOString()}\n`);
    return { status: 'marked' };
  } catch { return { status: 'skipped' }; }
}

/** Calls `notice(agentId)` on each stop report; null when the folder can not be watched, and the minute pass stays. */
export function watchStops(env, notice, watcher = fsWatch) {
  const dir = agentEvents(env);
  try {
    mkdirSync(dir, { recursive: true });
    return watcher(dir, (_type, name) => notice(name ? String(name) : null));
  } catch { return null; }
}

const STOP_WAIT_MS = 1000;

async function pause({ seconds, sleep, heard }) {
  let waited = 0;
  do {
    const step = Math.min(STOP_WAIT_MS, seconds * 1000 - waited);
    await sleep(step);
    waited += step;
  } while (waited < seconds * 1000 && !heard());
}

// The worker writes this beat each pass: `D ensure` starts no second worker while it is fresh.
const beatFile = stateDir => join(stateDir, 'serve.json');
/** The worker's beat: its pid, time, pass length and the stamp of the code it runs. */
export const beat = ({ stateDir, seconds, now = Date.now(), code }) =>
  writeJson(beatFile(stateDir), { pid: process.pid, at: new Date(now).toISOString(), seconds, ...(code && { code }) });
export const readBeat = stateDir => readJson(beatFile(stateDir), null);
export const serviceAlive = (stateDir, now = Date.now()) => {
  const last = readBeat(stateDir);
  return Boolean(last) && now - Date.parse(last.at) < Math.max(3 * (last.seconds ?? 60) * 1000, 5 * 60e3);
};

/** A background run's stand-in id; it matches no chat. */
export const RUN_ID = 'daily-worker';

/** The env a command runs with: a background run with no Paseo id acts under the stand-in, so an install's jobs run. */
export const chiefEnv = env => (env.PASEO_AGENT_ID || !env.WONG_DAILY_RUN ? env : { ...env, PASEO_AGENT_ID: RUN_ID });

/** Adds a chat the person names to the day's watch list. */
export async function hand({ stateDir, day, started, timezone, agent: name, call, env = process.env, now = new Date() }) {
  if (!env.PASEO_AGENT_ID) return unsupported;
  const list = await call(['ls', '--global']);
  const found = findAgents(list.filter(live), name);
  if (!found.length) return { status: 'unknown', error: `No chat named ${name}: check its name in the app, or give its id.` };
  if (found.length > 1) {
    return { status: 'ambiguous', error: `${name} names ${found.length} chats: give one id.`, agents: found.map(agent => ({ agent: agent.id, title: agent.name })) };
  }
  const [agent] = found;
  if (agent.id === env.PASEO_AGENT_ID) return { status: 'refused', error: 'That is this chat.' };
  if (skipped(stateDir, day).has(agent.id)) return { status: 'refused', reason: 'skip', error: `An add-on leaves ${agent.name ?? name} alone.` };
  const before = watched({ stateDir, day, started, timezone, list }).find(row => row.agentId === agent.id);
  if (before) return { status: 'already', ...describe(before) };
  const entry = { agentId: agent.id, title: agent.name ?? name, ...placeOf(await workspaceNames(call), agent.cwd), source: 'handed', at: now.toISOString() };
  writeJson(handsFile(stateDir, day), [...readJson(handsFile(stateDir, day), []), entry]);
  return { status: 'handed', ...describe(entry) };
}

// What reply, answer and allow share: a watched agent, or the line-up's `row` for a chat with a card, a message, and
// room left in the streak.
async function handFor({ stateDir, day, started, timezone, agent: name, text, bucket, label, call, env = process.env, now = new Date(), typedAt = userAt,
  row: given = null }) {
  if (!env.PASEO_AGENT_ID) return { refused: unsupported };
  const list = await call(['ls', '--global']);
  const row = given ?? watchedRow(watched({ stateDir, day, started, timezone, list, self: env.PASEO_AGENT_ID }), name);
  if (!row) return { refused: { status: 'refused', reason: 'unwatched', error: `${name} is not a chat the watch has: hand it first.` } };
  if (!String(text ?? '').trim()) return { refused: { status: 'refused', reason: 'message', error: 'The message is empty.' } };
  if (bucket !== 'person' && streak(actions({ stateDir, day }), row.agentId, typedAt(row.agentId)) >= STREAK) {
    return { refused: { status: 'refused', reason: 'streak', ...describe(row),
      error: `${STREAK} actions in a row on ${row.title} with no word from the person: leave it in its chat.` } };
  }
  // `sent` marks the words as the agent's log shows them, so the watch never takes them for the person's.
  const log = (entry, words) => logAction(stateDir, day, { at: now.toISOString(), ...describe(row), bucket, label, ...entry, sent: userMarkOf(words) });
  return { row, agent: list.find(entry => entry.id === row.agentId), log };
}

/** Sends `text` through a private file, as `paseo send --prompt-file` takes it; `steer` puts it into a running turn. */
export async function sendText(call, agentId, text, behavior = null) {
  const directory = mkdtempSync(join(tmpdir(), 'daily-chief-'));
  try {
    const file = join(directory, 'message.txt');
    writeFileSync(file, `${text.trim()}\n`, { mode: 0o600 });
    await call(['send', agentId, '--prompt-file', file, ...(behavior ? ['--behavior', behavior] : []), '--no-wait']);
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

/** Sends a watched, stopped agent one message, or with `steer` a working one too. With `mark`, it refuses a stop
 * that moved on since that line. */
export async function reply({ text, mark: stopMark, behavior = null, ...args }) {
  const { refused, row, agent, log } = await handFor({ ...args, text });
  if (refused) return refused;
  if (!live(agent)) return { status: 'refused', reason: 'gone', ...describe(row), error: `${row.title} is gone.` };
  if (working(agent.status) && behavior !== 'steer') return { status: 'refused', reason: 'running', ...describe(row), error: `${row.title} is working; wait for it to stop.` };
  if (stopMark && (await readTurn(args.call, row.agentId))?.mark !== stopMark) {
    return { status: 'refused', reason: 'moved', ...describe(row), error: `${row.title} moved on since that stop: nothing sent.` };
  }
  await sendText(args.call, row.agentId, text, behavior);
  return { status: 'sent', ...log({ kind: working(agent.status) ? 'steer' : 'reply' }, text) };
}

async function pendingAsk(call, agentId, request) {
  const asks = (await call(['permit', 'ls'])).filter(ask => ask.agentId === agentId);
  return asks.find(entry => entry.id === request) ?? asks.find(entry => String(request).length >= 4 && entry.id.startsWith(request)) ?? null;
}

const COMMAND_TOOL = 'Bash';
const noRequest = (row, request) => ({ status: 'refused', reason: 'request', ...describe(row), error: `${row.title} has no pending request ${request}.` });

// Answers a pending card: the CLI can't fill an answer, so it rides on a denial's message. A command card takes allow.
export async function answer({ request, text, ...args }) {
  const { refused, row, log } = await handFor({ ...args, text });
  if (refused) return refused;
  const ask = await pendingAsk(args.call, row.agentId, request);
  if (!ask) return noRequest(row, request);
  if (ask.name === COMMAND_TOOL && args.bucket !== 'person') {
    return { status: 'refused', reason: 'tool', ...describe(row), error: 'A command card takes allow, or waits in its chat: a denial makes the chat ask again.' };
  }
  const words = `Answer: ${text.trim()}`;
  await args.call(['permit', 'deny', row.agentId, ask.id, '--message', words]);
  return { status: 'answered', ...log({ kind: 'answer', request: ask.id }, words) };
}

// A command that reaches outside its workspace or can't be undone waits for the person, behind the judge's own rules.
const OUTWARD = [/\bgit\s+push\b/, /\bgh\s+(pr\s+(merge|create)|release)\b/, /\bnpm\s+publish\b/, /\bwrangler\s+(deploy|secret)\b/, /--prod\b/,
  /\brm\s+-(rf|fr)\b/, /\bcurl\b.*(\s-X\s*(POST|PUT|PATCH|DELETE)\b|\s-d\b|\s--data)/, /company-api\.mjs\s+call\b/, /\bpaseo\s+send\b/,
  /\b(deploy|publish|merge|send)\b/i];
const SHELL = /^\[(?:Shell|Bash)\] (.+)$/;

async function commandOf(call, agentId, ask) {
  let shown;
  try { shown = SHELL.exec(String(await call(['logs', agentId, '--tail', '1', '--filter', 'tools'])).trim())?.[1]; } catch { return null; }
  return shown ? `${ask.description === '-' ? '' : ask.description ?? ''} ${shown}`.trim() : null;
}

async function keepGoingReason(call, agentId, ask) {
  const pending = (await call(['permit', 'ls'])).filter(entry => entry.agentId === agentId);
  if (pending.length > 1) return `${pending.length} cards wait in this chat, so the log does not show this card's command for sure: leave it in its chat.`;
  return outwardReason(await commandOf(call, agentId, ask));
}

/** Why a command must wait for the person, or null: an outward word, a command cut short, or none read. */
export function outwardReason(command) {
  if (!command) return 'The log shows no command for this card: leave it in its chat.';
  if (command.endsWith('...')) return 'The log shows only part of the command: leave it in its chat.';
  return OUTWARD.some(pattern => pattern.test(command)) ? `The command reaches outside or can't be undone: ${command.slice(0, 200)}` : null;
}

/** Allows a pending command card. With `keep-going`, never an outward command; `person` is the person's own yes. */
export async function allow({ request, ...args }) {
  if (!['keep-going', 'person'].includes(args.bucket)) return { status: 'refused', reason: 'bucket', error: 'allow takes keep-going or person.' };
  const { refused, row, log } = await handFor({ ...args, text: args.label });
  if (refused) return refused;
  const ask = await pendingAsk(args.call, row.agentId, request);
  if (!ask) return noRequest(row, request);
  if (ask.name !== COMMAND_TOOL) return { status: 'refused', reason: 'tool', ...describe(row), error: `${ask.name} is not a command card: answer it.` };
  const why = args.bucket === 'person' ? null : await keepGoingReason(args.call, row.agentId, ask);
  if (why) return { status: 'refused', reason: 'outward', ...describe(row), error: why };
  await args.call(['permit', 'allow', row.agentId, ask.id]);
  return { status: 'allowed', ...log({ kind: 'allow', request: ask.id }, args.label) };
}

/** Each watched agent with its status, open cards and last action, and `finished` on one with no card that
 * `finishedOf` passes, `covered` on one the line-up told another chat covers; the last 5 actions. */
export async function status({ stateDir, day, started, timezone, call, env = process.env, project = process.cwd(),
  finishedOf = agent => finished({ agent, project, inspect: id => call(['inspect', id]) }) }) {
  if (!env.PASEO_AGENT_ID) return unsupported;
  let read;
  try { read = await readPaseo(call); } catch (error) { return notPaseo(error) ? unsupported : { state: 'not-read', error: oneLine(error.message) }; }
  const log = actions({ stateDir, day });
  const rows = watched({ stateDir, day, started, timezone, list: read.list, self: env.PASEO_AGENT_ID });
  const map = readJson(lineUpFile(stateDir), {})?.chats ?? {};
  // The line-up keys its map by chat key, and keeps each chat's Paseo id.
  const mapped = id => map[id] ?? Object.values(map).find(chat => chat?.paseoId === id);
  const titleOf = id => map[id]?.title ?? rows.find(row => row.agentId === id)?.title ?? id;
  const agents = [];
  for (const row of rows) {
    const agent = read.list.find(entry => entry.id === row.agentId && live(entry));
    const asking = read.pending.filter(ask => ask.agentId === row.agentId).length;
    const covered = !asking && agent && !working(agent.status) && mapped(row.agentId)?.covered;
    agents.push({ ...describe(row), status: agent?.status ?? 'gone', asking, last: log.filter(entry => entry.agent === row.agentId).at(-1) ?? null,
      ...(!asking && agent && await finishedOf(agent) && { finished: true }), ...(covered && { covered: titleOf(covered) }) });
  }
  return { state: 'read', day, agents, recent: log.filter(entry => entry.label).slice(-5).map(entry => entry.label) };
}

const END_CHARS = 300;
/** A helper's end line, one line of at most 300 characters, kept in the day's actions for `status`. */
export function noteEnd({ stateDir, day, line, now = new Date() }) {
  const words = String(line ?? '').trim();
  if (!words || words.includes('\n') || words.length > END_CHARS) return { status: 'refused', reason: 'line', error: 'The line is one line of at most 300 characters.' };
  logAction(stateDir, day, { at: now.toISOString(), kind: 'note-end', label: words });
  return { status: 'noted', line: words };
}

/** A watched chat's done, with the proof the judge checked; it changes nothing, as the person picks what closes. */
export async function doneAgent({ stateDir, day, started, timezone, agent: name, proof, call, env = process.env }) {
  if (!env.PASEO_AGENT_ID) return unsupported;
  const row = watchedRow(watched({ stateDir, day, started, timezone, list: await call(['ls', '--global']), self: env.PASEO_AGENT_ID }), name);
  if (!row) return { status: 'refused', reason: 'unwatched', error: `${name} is not a chat the watch has.` };
  const words = String(proof ?? '').trim().slice(0, 2000);
  if (!words) return { status: 'refused', reason: 'proof', error: 'Done needs its proof.' };
  return { status: 'marked', ...describe(row), proof: words };
}

/** The Paseo CLI, one `--json` call at a time. */
export function paseoCli(env = process.env) {
  let bin;
  return args => { bin ??= findPaseo(env, 'DAILY_PASEO_BIN'); return paseo(bin, args, { env }); };
}
