// Each chat the person opens is one to-do on their week board, kept by the watch with no model. On doubt it changes
// nothing and tries again next pass. wiki/development/daily.md#a-to-do-for-each-chat
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { localDay, mondayOf, slotOf } from './config.mjs';

/** The watch sources that are the person's own chats: opened, handed to the watch, or opened by the Daily chat. */
export const TODO_SOURCES = ['own', 'handed', 'asked'];
const END = 9999;
const TITLE_CHARS = 200;
const BRANCH_MS = 10 * 60e3;
// A Done on the board is seen this soon; a chat gets `/close` this long after the person's last word; 3 tries a send.
const BOARD_MS = 5 * 60e3;
const QUIET_MS = 15 * 60e3;
const CLOSE_TRIES = 3;
// A final entry stays this long, so a chat seen again never gets a second to-do.
const KEEP_MS = 60 * 24 * 3600e3;
const DEFAULT_BRANCHES = new Set(['main', 'master', 'HEAD']);

export const todosFile = stateDir => join(stateDir, 'todos.json');
export const todoKey = agentId => `chat:${agentId}`;

const run = promisify(execFile);
/** One command's stdout; it throws when the command fails or runs past 20 seconds. */
export const exec = async (command, args, { cwd } = {}) => (await run(command, args, { cwd, timeout: 20000 })).stdout;

const folder = cwd => String(cwd ?? '').replace(/\/+$/, '');
const live = agent => agent && agent.status !== 'closed' && !agent.archivedAt;
const working = agent => agent.status === 'running' || agent.status === 'initializing';
const oneLine = value => String(value).split('\n')[0].slice(0, 200);

/** `owner/name` from a GitHub remote, https or ssh; null for any other. */
export function repoOf(remote) {
  const match = /github\.com[:/]([^/\s]+\/[^/\s]+?)(?:\.git)?\/?$/.exec(String(remote ?? '').trim());
  return match ? match[1] : null;
}

/** The chat's branch and GitHub repo, each null when its folder does not say. */
async function whereOf(cwd, shell) {
  const read = async args => { try { return String(await shell('git', ['-C', cwd, ...args])).trim() || null; } catch { return null; } };
  return { branch: cwd ? await read(['rev-parse', '--abbrev-ref', 'HEAD']) : null,
    repo: cwd ? repoOf(await read(['remote', 'get-url', 'origin'])) : null };
}

/** True when the record of anything daily started names this chat: a routine or a board task's workspace. */
const dailyStarted = (record, agent) => Object.values(record).some(entry => entry && (
  (entry.agentId && entry.agentId === agent.id) || (entry.cwd && agent.cwd && folder(entry.cwd) === folder(agent.cwd))));

/** Whether a watched row gets a to-do: the person's own chat, from no board task, that no daily start opened. */
const wanted = (row, agent, record) => TODO_SOURCES.includes(row.source) && !row.task && live(agent) && !dailyStarted(record, agent);
// A launch claims its key before its workspace exists: while one is that young, a new chat may be daily's own.
const LAUNCH_MS = 10 * 60e3;
const launching = (record, now) => Object.values(record).some(entry => entry?.pending && now - Date.parse(entry.at) < LAUNCH_MS);

// One to-do per own chat, on today: done on proof, a Done on the board or a merge; else removed. An add-on's `skip`
// removes it too. A board or `gh` that does not answer changes nothing. `never`: chats it never sends `/close`.
export async function keepTodos({ stateDir, rows, list, started, board, timezone, skip = new Set(), adding = true, now = new Date(), shell = exec,
  read, write, log = () => {}, send = null, typedAt = () => null, line = () => {}, never = new Set() }) {
  const kept = read(todosFile(stateDir));
  const today = localDay(now, timezone);
  const save = () => write(todosFile(stateDir), kept);
  const record = started();
  for (const row of adding && !launching(record, now) ? rows : []) {
    const agent = list.find(each => each.id === row.agentId);
    if (kept[row.agentId] || skip.has(row.agentId) || !wanted(row, agent, record)) continue;
    const entry = await addTodo({ row, agent, today, board, shell, now }).catch(error => { log(`To-do not added: ${oneLine(error.message)}`); return null; });
    if (entry) { kept[row.agentId] = entry; save(); }
  }
  const weeks = new Map();
  const weekOf = async week => {
    if (!weeks.has(week)) weeks.set(week, board.tasks(week).then(answer => (Array.isArray(answer?.tasks) ? answer.tasks : null), () => null));
    return weeks.get(week);
  };
  const update = (agentId, next) => { if (next) { kept[agentId] = { ...kept[agentId], ...next }; save(); } };
  for (const agentId of Object.keys(kept)) {
    const agent = list.find(each => each.id === agentId);
    if (kept[agentId].state === 'open') {
      const entry = kept[agentId];
      update(agentId, skip.has(agentId) ? await drop({ agentId, board, now })
        : live(agent) ? await tend({ entry, agent, today, board, weekOf, shell, now }) : await settle({ agentId, entry, board, weekOf, shell, now }));
    }
    const entry = kept[agentId];
    if (entry.state !== 'open' && now - Date.parse(entry.endedAt ?? entry.at) > KEEP_MS) { delete kept[agentId]; save(); }
    else if (entry.state === 'done-open') update(agentId, await closeDone({ agentId, entry, agent, weekOf, send, typedAt, line, never: never.has(agentId) || skip.has(agentId), now }));
  }
}

/** Adds the chat's to-do on today and marks it in progress, with its chat's name. */
async function addTodo({ row, agent, today, board, shell, now }) {
  const title = String(row.title ?? row.workspace ?? row.agentId).replace(/\s+/g, ' ').trim().slice(0, TITLE_CHARS) || 'Chat';
  const task = await board.add({ importKey: todoKey(row.agentId), title, week: mondayOf(today), slot: slotOf(today) });
  if (!task?.id) throw new Error('The board gave no task id.');
  if (task.status !== 'in_progress' && task.status !== 'done') await board.status({ id: task.id, status: 'in_progress' });
  if (row.workspace) await board.link({ id: task.id, chat: String(row.workspace).slice(0, 100) }).catch(() => null);
  return { taskId: task.id, title, workspace: row.workspace ?? null, cwd: agent.cwd ?? null, ...(await whereOf(agent.cwd, shell)), day: today,
    branchAt: now.toISOString(), boardAt: now.toISOString(), state: task.status === 'done' ? 'done' : 'open', at: now.toISOString() };
}

// A live chat's to-do: the board is read each 5 minutes, and a Done waits for the chat's close (`done-open`); an
// undone one moves to today on a new day. Its branch is read again each 10 minutes.
async function tend({ entry, agent, today, board, weekOf, shell, now }) {
  const change = {};
  if (now - Date.parse(entry.branchAt ?? 0) >= BRANCH_MS) {
    const where = await whereOf(agent.cwd ?? entry.cwd, shell);
    Object.assign(change, { branchAt: now.toISOString(), ...(where.branch && { branch: where.branch }), ...(where.repo && { repo: where.repo }) });
  }
  const newDay = entry.day < today;
  if (!newDay && now - Date.parse(entry.boardAt ?? 0) < BOARD_MS) return Object.keys(change).length ? change : null;
  const tasks = await weekOf(mondayOf(entry.day));
  if (!tasks) return Object.keys(change).length ? change : null;
  change.boardAt = now.toISOString();
  if (tasks.find(task => task.id === entry.taskId)?.status === 'done') return { ...change, ...doneOpen(now) };
  if (!newDay) return change;
  try {
    await board.place({ id: entry.taskId, week: mondayOf(today), slot: slotOf(today), index: END });
    return { ...change, day: today };
  } catch (error) {
    // The person deleted it: nothing is left to move.
    return /\b404\b|not.found/i.test(error.message) ? { ...change, state: 'removed', endedAt: now.toISOString() } : (Object.keys(change).length ? change : null);
  }
}

const doneOpen = now => ({ state: 'done-open', closeAsked: null, closeTries: 0, endedAt: now.toISOString() });

// A Done to-do's live chat gets `/close` once, idle and quiet 15 minutes, after the board still shows Done. A gone or
// never-closed chat ends `done`; 3 failed sends give `Not closed: <title>`.
async function closeDone({ agentId, entry, agent, weekOf, send, typedAt, line, never, now }) {
  if (!live(agent) || never) return { state: 'done' };
  if (entry.closeAsked || !send || working(agent)) return null;
  const typed = Date.parse(typedAt(agentId) ?? 0) || 0;
  if (now - typed < QUIET_MS) return null;
  const tasks = await weekOf(mondayOf(entry.day));
  if (!tasks) return null;
  if (tasks.find(task => task.id === entry.taskId)?.status !== 'done') {
    return { state: 'open', closeAsked: null, closeTries: 0, endedAt: null, boardAt: now.toISOString() };
  }
  try { await send(agentId); } catch (error) {
    const tries = (entry.closeTries ?? 0) + 1;
    if (tries < CLOSE_TRIES) return { closeTries: tries };
    line({ event: 'not-closed', agent: agentId, title: entry.title, text: `Not closed: ${entry.title}`, error: oneLine(error.message) });
    return { closeTries: tries, state: 'done' };
  }
  line({ event: 'closed-on-done', agent: agentId, title: entry.title, text: `Closed on Done: ${entry.title}` });
  return { closeAsked: now.toISOString() };
}

/** Whether the branch's change merged: true, false, or null when `gh` did not answer. No work branch is not merged. */
async function merged(entry, shell) {
  if (!entry.branch || DEFAULT_BRANCHES.has(entry.branch) || !entry.repo) return false;
  try {
    const found = JSON.parse(String(await shell('gh', ['pr', 'list', '--repo', entry.repo, '--head', entry.branch, '--state', 'merged', '--json', 'number', '--limit', '1'])));
    return Array.isArray(found) ? found.length > 0 : null;
  } catch { return null; }
}

/** A to-do that is not the person's after all leaves the board. */
async function drop({ agentId, board, now }) {
  try { await board.remove({ importKey: todoKey(agentId) }); } catch { return null; }
  return { state: 'removed', endedAt: now.toISOString() };
}

/** A gone chat's to-do: done on proof, on the board or on a merge; removed only on a clear "not merged". */
async function settle({ agentId, entry, board, weekOf, shell, now }) {
  const endedAt = now.toISOString();
  const tasks = await weekOf(mondayOf(entry.day));
  if (!tasks) return null;
  if (tasks.find(task => task.id === entry.taskId)?.status === 'done') return { state: 'done', endedAt };
  const finished = entry.proof ? true : await merged(entry, shell);
  if (finished === null) return null;
  try {
    if (finished) await board.status({ id: entry.taskId, status: 'done' });
    else await board.remove({ importKey: todoKey(agentId) });
  } catch { return null; }
  return { state: finished ? 'done' : 'removed', endedAt };
}

/** The chat's to-do as the file keeps it, or null. */
export const todoOf = ({ stateDir, agentId, read }) => read(todosFile(stateDir))[agentId] ?? null;

/** Marks a chat's open to-do done after the chief checked its proof; `none` when the chat has no to-do. */
export async function finishTodo({ stateDir, agentId, proof, board, read, write, now = new Date() }) {
  const kept = read(todosFile(stateDir));
  const entry = kept[agentId];
  if (!entry) return { state: 'none' };
  if (entry.state !== 'open') return { state: entry.state === 'done-open' ? 'done' : entry.state };
  kept[agentId] = { ...entry, proof };
  write(todosFile(stateDir), kept);
  try { await board.status({ id: entry.taskId, status: 'done' }); } catch (error) { return { state: 'not confirmed', reason: oneLine(error.message) }; }
  kept[agentId] = { ...kept[agentId], ...doneOpen(now) };
  write(todosFile(stateDir), kept);
  return { state: 'done', task: entry.taskId };
}
