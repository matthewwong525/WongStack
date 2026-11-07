// The line-up: a map of the watched chats, the notes a background run queues for them, and their delivery. The run
// judges what to tell whom; this file holds the limits. wiki/development/daily.md#your-chats-in-line
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { RUN_ID, USER, chiefDay, lineUpFile, live, messageMark, readJson, reply, saidOf, userAt, watchFile, watched, watchedRow, working,
  writeJson } from './chief.mjs';
import { addLine } from './journal.mjs';

const WEEK_MS = 7 * 24 * 3600e3;
// A run reads what `D line-up` showed within this long; after it, an unsaved read counts as lost and runs again.
const READING_MS = 15 * 60e3;
const LOG_LINES = 400, TAIL_CHARS = 60_000, KEPT_TOLD = 20, KEPT_CHOICES = 20, FIRST_WORDS = 80;
/** Every note starts so, so the chat and the person can tell it from the person's own words. */
export const NOTE_LEAD = 'From the daily:';
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const unsupported = { status: 'unsupported', reason: 'This chat is not in Paseo, so it cannot watch other chats.' };

/** `{chats, notes, shown}`: the map by agent id, the pending notes, and what `D line-up` last showed a run. */
export function readMap(stateDir) {
  const map = readJson(lineUpFile(stateDir), {});
  return { ...map, chats: plain(map?.chats) ? map.chats : {}, notes: Array.isArray(map?.notes) ? map.notes : [] };
}

/** Reads, changes and writes the map in one go, so the worker and a run lose little to each other. */
function updateMap(stateDir, change) {
  const map = change(readMap(stateDir));
  writeJson(lineUpFile(stateDir), map);
  return map;
}

/** The watch's last-turn mark, and the time the person last wrote (`typed`), of each chat it still has. */
function watchMarks(stateDir, day) {
  const state = readJson(watchFile(stateDir, day), {});
  const gone = new Set(state.gone ?? []);
  const agents = Object.entries(plain(state.agents) ? state.agents : {}).filter(([id]) => !gone.has(id));
  const each = field => Object.fromEntries(agents.filter(([, seen]) => seen?.[field]).map(([id, seen]) => [id, seen[field]]));
  return { ids: new Set(agents.map(([id]) => id)), marks: each('last'), typed: each('userAt') };
}

/** The chat's log after the turn marked `read`, or its whole tail when that turn is gone; null when unread. */
async function newMessages(call, agentId, read) {
  let text;
  try { text = await call(['logs', agentId, '--tail', String(LOG_LINES), '--filter', 'text']); } catch { return null; }
  if (typeof text !== 'string') return null;
  const lines = text.split('\n');
  const users = lines.flatMap((line, at) => (line.startsWith(USER) ? [at] : []));
  const turn = read ? users.findLastIndex((at, index) => messageMark(saidOf(lines.slice(at + 1, users[index + 1]))) === read) : -1;
  const from = turn < 0 ? 0 : users[turn + 1] ?? lines.length;
  return lines.slice(from).join('\n').trim().slice(-TAIL_CHARS);
}

/** `D line-up`: the map, and each watched chat with its new messages when its last turn is one the map has not read. */
export async function lineUpData({ stateDir, day, started, timezone, call, env = process.env, now = new Date() }) {
  if (!env.PASEO_AGENT_ID) return unsupported;
  const list = await call(['ls', '--global']);
  const rows = watched({ stateDir, day, started, timezone, list, self: env.PASEO_AGENT_ID })
    .filter(row => live(list.find(agent => agent.id === row.agentId)));
  const { marks, typed } = watchMarks(stateDir, day);
  const map = readMap(stateDir);
  const chats = [];
  for (const row of rows) {
    const read = map.chats[row.agentId]?.read ?? null;
    const changed = marks[row.agentId] && marks[row.agentId] !== read;
    chats.push({ agent: row.agentId, title: row.title ?? null, workspace: row.workspace ?? null,
      status: list.find(agent => agent.id === row.agentId).status, ...(changed && { messages: await newMessages(call, row.agentId, read) }) });
  }
  const shown = { at: now.toISOString(), marks: Object.fromEntries(rows.filter(row => marks[row.agentId]).map(row => [row.agentId, marks[row.agentId]])),
    watching: rows.map(row => row.agentId), typed: Object.fromEntries(rows.filter(row => typed[row.agentId]).map(row => [row.agentId, typed[row.agentId]])) };
  updateMap(stateDir, latest => ({ ...latest, shown }));
  return { state: 'read', day, map: { chats: map.chats, notes: map.notes }, chats };
}

/** `D map`: the run's entries replace the map's; the script keeps `read`, `told`, `closedAt`, a chat that left the
 * watch for 7 days, listed or not, and `covered` until the person writes after it or the run saves it as null. */
export function saveMap({ stateDir, chats, now = new Date() }) {
  if (!plain(chats) || !Object.values(chats).every(plain)) return { status: 'refused', reason: 'map', error: 'The map is {"chats": {"<agent id>": {...}}}.' };
  const map = updateMap(stateDir, latest => {
    const { marks = {}, watching = null, typed = {} } = latest.shown ?? {};
    const left = id => Boolean(watching) && !watching.includes(id);
    const fresh = chat => !chat.closedAt || now - Date.parse(chat.closedAt) < WEEK_MS;
    const kept = Object.fromEntries(Object.entries(latest.chats).filter(([id, chat]) => chat.closedAt || left(id))
      .map(([id, chat]) => [id, { ...chat, closedAt: chat.closedAt ?? now.toISOString() }]));
    for (const [id, entry] of Object.entries({ ...Object.fromEntries(Object.keys(marks).map(id => [id, {}])), ...chats })) {
      const before = latest.chats[id] ?? {};
      const closedAt = before.closedAt ?? (left(id) ? now.toISOString() : null);
      const ended = entry.covered === null || Date.parse(typed[id]) > Date.parse(before.coveredAt);
      kept[id] = { ...entry, read: marks[id] ?? before.read ?? null, told: before.told ?? [], covered: ended ? null : before.covered ?? null,
        coveredAt: ended ? null : before.coveredAt ?? null, closedAt };
    }
    return { ...latest, chats: Object.fromEntries(Object.entries(kept).filter(([, chat]) => fresh(chat))) };
  });
  return { status: 'saved', chats: Object.keys(map.chats).length };
}

/** `D tell`: queues one note for a watched chat; `drop` first clears a chat's pending notes. */
export async function tell({ stateDir, day, started, timezone, call, env = process.env, agent: name, text, urgent = false, coveredBy, drop,
  now = new Date() }) {
  if (!env.PASEO_AGENT_ID) return unsupported;
  const rows = watched({ stateDir, day, started, timezone, list: await call(['ls', '--global']), self: env.PASEO_AGENT_ID });
  let dropped = 0;
  if (drop) {
    const id = watchedRow(rows, drop)?.agentId ?? drop;
    updateMap(stateDir, map => {
      const notes = map.notes.filter(note => note.agent !== id);
      dropped = map.notes.length - notes.length;
      return { ...map, notes };
    });
    if (!name) return { status: 'dropped', agent: id, dropped };
  }
  const row = watchedRow(rows, name);
  if (!row) return { status: 'refused', reason: 'unwatched', error: `${name} is not a chat the watch has.` };
  const words = String(text ?? '').trim();
  if (!words) return { status: 'refused', reason: 'message', error: 'The note is empty.' };
  const cover = coveredBy ? watchedRow(rows, coveredBy) : null;
  if (coveredBy && !cover) return { status: 'refused', reason: 'unwatched', error: `${coveredBy} is not a chat the watch has.` };
  const note = { id: randomUUID(), agent: row.agentId, title: row.title ?? row.agentId, text: words, now: Boolean(urgent),
    ...(cover && { coveredBy: cover.agentId }), at: now.toISOString() };
  updateMap(stateDir, map => ({ ...map, notes: [...map.notes, note] }));
  return { status: 'queued', ...note, ...(drop && { dropped }) };
}

const firstWords = text => (text.length > FIRST_WORDS ? `${text.slice(0, FIRST_WORDS).trim()}…` : text);

/** Takes a note off the queue; when sent, adds it to its chat's `told` and marks the chat covered from then. */
function settle(stateDir, note, sentAt) {
  updateMap(stateDir, map => {
    const notes = map.notes.filter(each => each.id !== note.id);
    if (!sentAt) return { ...map, notes };
    const chat = map.chats[note.agent] ?? { title: note.title };
    const told = [...(chat.told ?? []), { at: sentAt, text: note.text }].slice(-KEPT_TOLD);
    return { ...map, notes, chats: { ...map.chats, [note.agent]: { ...chat, told, ...(note.coveredBy && { covered: note.coveredBy, coveredAt: sentAt }) } } };
  });
}

// Each worker pass: an idle chat gets one note as its next turn; a working one only a `now` note, steered into its
// running turn. Every send steers, never interrupts, so a chat that just started working is not stopped.
export async function deliverNotes({ stateDir, started, timezone, call, now = () => new Date(), dryRun = false, print = () => {},
  typedAt = userAt }) {
  if (!readMap(stateDir).notes.length) return;
  let list;
  try { list = await call(['ls', '--global']); } catch { return; }
  if (!Array.isArray(list)) return;
  const day = chiefDay({ stateDir, started, timezone, now: now() });
  const journal = (line, title) => { if (!dryRun) addLine({ stateDir, timezone, line, kind: 'line-up', title, now: now() }); };
  const sentTo = new Set();
  for (const note of readMap(stateDir).notes) {
    const agent = list.find(each => each.id === note.agent);
    if (!live(agent)) {
      if (!dryRun) settle(stateDir, note, null);
      journal(`Not told ${note.title}: the chat is gone`, note.title);
      continue;
    }
    const steer = working(agent.status);
    if (sentTo.has(note.agent) || (steer && !note.now)) continue;
    if (dryRun) { print({ wouldTell: note.title, steer, text: note.text }); continue; }
    const sent = await reply({ stateDir, day, started, timezone, call, env: { PASEO_AGENT_ID: RUN_ID }, agent: note.agent, typedAt,
      text: `${NOTE_LEAD} ${note.text}`, bucket: 'line-up', label: `${steer ? 'Steered' : 'Told'} ${note.title}`, behavior: 'steer', now: now() });
    if (sent.status === 'sent') {
      sentTo.add(note.agent);
      settle(stateDir, note, now().toISOString());
      journal(`${sent.kind === 'steer' ? 'Steered' : 'Told'} ${note.title}: ${firstWords(note.text)}`, note.title);
    } else if (!['streak', 'running'].includes(sent.reason)) {
      settle(stateDir, note, null);
      journal(`Not told ${note.title}: ${sent.error ?? sent.reason}`, note.title);
    }
  }
}

/** The stop judge's view of other chats: up to 20 newest choices, `<time> — <chat>: <text>`; empty with none. */
export function elsewhere(stateDir, self) {
  return Object.entries(readMap(stateDir).chats).filter(([id]) => id !== self)
    .flatMap(([id, chat]) => (Array.isArray(chat.choices) ? chat.choices : []).filter(choice => typeof choice?.text === 'string')
      .map(choice => ({ at: String(choice.at ?? ''), line: `${choice.at ?? '?'} — ${chat.title ?? id}: ${choice.text}` })))
    .sort((a, b) => b.at.localeCompare(a.at)).slice(0, KEPT_CHOICES).map(choice => choice.line).join('\n');
}

/** The check: `{chats}` when a watched chat has a turn the map has not read, or a chat another waits for left the
 * watch; else null. A read `D line-up` showed in the last 15 minutes counts as read. */
export function lineUpDue({ stateDir, timezone, now = Date.now() }) {
  const day = chiefDay({ stateDir, started: () => readJson(join(stateDir, 'started.json'), {}), timezone, now: new Date(now) });
  const { ids, marks } = watchMarks(stateDir, day);
  const map = readMap(stateDir);
  const recent = map.shown && now - Date.parse(map.shown.at) < READING_MS ? map.shown : { marks: {}, watching: null };
  const changed = Object.entries(marks).filter(([id, mark]) => mark !== map.chats[id]?.read && mark !== recent.marks?.[id]).map(([id]) => id);
  const left = on => on && !ids.has(on) && map.chats[on] && !map.chats[on].closedAt && (!recent.watching || recent.watching.includes(on));
  const ended = Object.entries(map.chats).filter(([, chat]) => !chat.closedAt && Array.isArray(chat.waitsFor) && chat.waitsFor.some(wait => left(wait?.on)))
    .map(([id]) => id);
  const chats = [...new Set([...changed, ...ended])];
  return chats.length ? { chats: chats.join(',') } : null;
}
