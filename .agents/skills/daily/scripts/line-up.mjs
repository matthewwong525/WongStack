// The line-up: a map of the open chats, the notes a background run sends them, and their delivery. The run judges
// what to tell whom; this file holds the limits. wiki/development/chats-in-line.md
import { randomUUID } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { RUN_ID, chiefDay, lineUpFile, live, readJson, reply, userAt, watchFile, working, writeJson } from './chief.mjs';
import { KEY, chatList, findChat } from './chat-list.mjs';
import { addLine } from './journal.mjs';
import { readNew } from './transcript.mjs';
import { appendNote, takeNotes } from './waiting-notes.mjs';
import { needsYouChats } from './worker.mjs';

const WEEK_MS = 7 * 24 * 3600e3;
// A run reads what `D line-up` showed within this long; after it, an unsaved read counts as lost and runs again.
const READING_MS = 15 * 60e3;
const TAIL_CHARS = 60_000, KEPT_TOLD = 20, KEPT_CHOICES = 20, FIRST_WORDS = 80;
/** Every note starts so, so the chat and the person can tell it from the person's own words. */
export const NOTE_LEAD = 'From the daily:';
// The map's chats are keyed by chat key; a map without this mark is an older one keyed by Paseo id.
const KEYS = 'chat';
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sizeOf = file => { try { return statSync(file).size; } catch { return null; } };
const firstWords = text => (text.length > FIRST_WORDS ? `${text.slice(0, FIRST_WORDS).trim()}…` : text);
const ROLES = { assistant: '[Agent]', user: '[Note]' };

/** `{chats, notes, shown}`: the map by chat key, the pending Paseo notes, and what `D line-up` last showed a run. */
export function readMap(stateDir) {
  const map = readJson(lineUpFile(stateDir), {});
  return { ...map, chats: plain(map?.chats) ? map.chats : {}, notes: Array.isArray(map?.notes) ? map.notes : [] };
}

/** Reads, changes and writes the map in one go, so the worker and a run lose little to each other. Only a new map
 * gets the mark: an older one keeps none until `freshMap` starts it fresh. */
function updateMap(stateDir, change) {
  const file = lineUpFile(stateDir);
  const keys = existsSync(file) ? readMap(stateDir).keys : KEYS;
  const map = change(readMap(stateDir));
  writeJson(file, { ...map, keys });
  return map;
}

/** An older map, keyed by Paseo id, starts fresh: its notes are minutes old, and the next read finds the same news. */
function freshMap({ stateDir, timezone, now }) {
  const map = readMap(stateDir);
  if (map.keys === KEYS || !existsSync(lineUpFile(stateDir))) return map;
  writeJson(lineUpFile(stateDir), { keys: KEYS, chats: {}, notes: [] });
  addLine({ stateDir, timezone, kind: 'line-up', now,
    line: `The line-up started a new map: it now knows chats by session. Dropped ${map.notes.length} waiting notes.` });
  return readMap(stateDir);
}

const chatsFor = ({ stateDir, day, project, env, home, now, ownRepo }) => {
  const skip = new Set(readJson(watchFile(stateDir, day), {}).skip ?? []);
  return chatList({ project, env, home, now: +now, ...(ownRepo && { ownRepo }) }).filter(chat => !skip.has(chat.paseoId));
};

/** A chat's messages after the byte the map read, as `[Person]`, `[Agent]` or `[Note]` lines, and the read's end. */
function newMessages(chat, read) {
  let found;
  try { found = readNew(chat.transcript, chat.tool, read); } catch { return null; }
  const lines = found.messages.filter(message => ROLES[message.role]).map(message => `${message.person ? '[Person]' : ROLES[message.role]} ${message.text}`);
  return { text: lines.join('\n\n').slice(-TAIL_CHARS), end: found.end, typed: found.messages.filter(message => message.person).at(-1)?.at ?? null };
}

/** `D line-up`: the map, and each open chat in this project with its new messages when its transcript grew. */
export async function lineUpData({ stateDir, day, timezone, project = process.cwd(), env = process.env, home = homedir(), now = new Date(),
  ownRepo }) {
  const map = freshMap({ stateDir, timezone, now });
  const list = chatsFor({ stateDir, day, project, env, home, now, ownRepo });
  const chats = [], marks = {}, typed = {};
  for (const chat of list) {
    const read = map.chats[chat.key]?.read ?? null;
    const size = sizeOf(chat.transcript);
    const found = size !== null && size !== read ? newMessages(chat, read) : null;
    if (found) {
      marks[chat.key] = found.end;
      if (found.typed) typed[chat.key] = found.typed;
    }
    chats.push({ agent: chat.key, title: chat.name, tool: chat.tool, status: chat.state, ...(chat.paseoId && { paseo: chat.paseoId }),
      ...(found?.text && { messages: found.text }) });
  }
  const shown = { at: now.toISOString(), marks, typed, watching: list.map(chat => chat.key),
    paseo: Object.fromEntries(list.filter(chat => chat.paseoId).map(chat => [chat.key, chat.paseoId])) };
  updateMap(stateDir, latest => ({ ...latest, shown }));
  return { state: 'read', day, map: { chats: map.chats, notes: map.notes }, chats };
}

/** `D map`: the run's entries replace the map's; the script keeps `read`, `told`, `paseoId`, `closedAt`, a chat that
 * left for 7 days, listed or not, and `covered` until the person writes after it or the run saves it as null. */
export function saveMap({ stateDir, chats, now = new Date() }) {
  if (!plain(chats) || !Object.values(chats).every(plain)) return { status: 'refused', reason: 'map', error: 'The map is {"chats": {"<chat key>": {...}}}.' };
  const map = updateMap(stateDir, latest => {
    const { marks = {}, watching = null, typed = {}, paseo = {} } = latest.shown ?? {};
    const left = id => Boolean(watching) && !watching.includes(id);
    const fresh = chat => !chat.closedAt || now - Date.parse(chat.closedAt) < WEEK_MS;
    const kept = Object.fromEntries(Object.entries(latest.chats).filter(([id, chat]) => chat.closedAt || left(id))
      .map(([id, chat]) => [id, { ...chat, closedAt: chat.closedAt ?? now.toISOString() }]));
    for (const [id, entry] of Object.entries({ ...Object.fromEntries(Object.keys(marks).map(id => [id, {}])), ...chats })) {
      const before = latest.chats[id] ?? {};
      const closedAt = before.closedAt ?? (left(id) ? now.toISOString() : null);
      const ended = entry.covered === null || Date.parse(typed[id]) > Date.parse(before.coveredAt);
      kept[id] = { ...entry, read: marks[id] ?? before.read ?? null, told: before.told ?? [], paseoId: paseo[id] ?? before.paseoId ?? null,
        covered: ended ? null : before.covered ?? null, coveredAt: ended ? null : before.coveredAt ?? null, closedAt };
    }
    return { ...latest, chats: Object.fromEntries(Object.entries(kept).filter(([, chat]) => fresh(chat))) };
  });
  return { status: 'saved', chats: Object.keys(map.chats).length };
}

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

/** The limits every note keeps, else null: check-ins on and no *Needs you* card. The streak is kept where the note
 * goes out: Paseo's send, or the stop check's hand-over. */
function refusal({ stateDir, chat }) {
  if (existsSync(join(stateDir, 'off'))) return { status: 'refused', reason: 'off', error: 'Check-ins are off: no notes.' };
  if (chat.paseoId && needsYouChats(stateDir).includes(chat.paseoId)) {
    return { status: 'refused', reason: 'needs you', error: `${chat.name} waits for the person: no note.` };
  }
  return null;
}

/** Puts a note in the chat's waiting notes, told from now: its hooks hand it over at its next stop or message. */
function queueWaiting({ stateDir, timezone, home, note, at }) {
  settle(stateDir, note, at);
  appendNote({ home, key: note.agent, note: { text: `${NOTE_LEAD} ${note.text}`, title: note.title, stateDir, timezone, at } });
}

/** `D tell`: one note for an open chat, through Paseo when it has a Paseo id, else as a waiting note; `drop` first
 * clears a chat's pending notes. */
export async function tell({ stateDir, day, timezone, project = process.cwd(), env = process.env, home = homedir(), agent: name, text, urgent = false,
  coveredBy, drop, now = new Date(), ownRepo }) {
  const list = chatsFor({ stateDir, day, project, env, home, now, ownRepo });
  let dropped = 0;
  if (drop) {
    const key = findChat(list, drop)?.key ?? (KEY.test(drop) ? drop : null);
    if (!key) return { status: 'refused', reason: 'unwatched', error: `${drop} is not a chat key or an open chat in this project.` };
    updateMap(stateDir, map => {
      const notes = map.notes.filter(note => note.agent !== key);
      dropped = map.notes.length - notes.length;
      return { ...map, notes };
    });
    dropped += takeNotes({ home, key }).length;
    if (!name) return { status: 'dropped', agent: key, dropped };
  }
  const chat = findChat(list, name);
  if (!chat) return { status: 'refused', reason: 'unwatched', error: `${name} is not an open chat in this project.` };
  const words = String(text ?? '').trim();
  if (!words) return { status: 'refused', reason: 'message', error: 'The note is empty.' };
  const cover = coveredBy ? findChat(list, coveredBy) : null;
  if (coveredBy && !cover) return { status: 'refused', reason: 'unwatched', error: `${coveredBy} is not an open chat in this project.` };
  const refused = refusal({ stateDir, chat });
  if (refused) return refused;
  const way = chat.paseoId ? 'paseo' : 'waiting';
  const at = now.toISOString();
  const note = { id: randomUUID(), agent: chat.key, title: chat.name, text: words, now: Boolean(urgent), way,
    ...(chat.paseoId && { paseoId: chat.paseoId }), ...(cover && { coveredBy: cover.key }), at };
  const extra = drop ? { dropped } : {};
  if (way === 'paseo') updateMap(stateDir, map => ({ ...map, notes: [...map.notes, note] }));
  else queueWaiting({ stateDir, timezone, home, note, at });
  return { status: 'queued', ...note, ...extra };
}

// Each worker pass, for a chat in Paseo: an idle chat gets one note as its next turn; a working one only a `now` note,
// steered into its running turn. Every send steers, never interrupts; a failed send becomes a waiting note.
export async function deliverNotes({ stateDir, started, timezone, call, home = homedir(), now = () => new Date(), dryRun = false,
  print = () => {}, typedAt = userAt }) {
  if (!dryRun) freshMap({ stateDir, timezone, now: now() });
  const pending = () => readMap(stateDir).notes;
  if (!pending().length) return;
  let list;
  try { list = await call(['ls', '--global']); } catch { return; }
  if (!Array.isArray(list)) return;
  const day = chiefDay({ stateDir, started, timezone, now: now() });
  const journal = (line, title) => { if (!dryRun) addLine({ stateDir, timezone, line, kind: 'line-up', title, now: now() }); };
  const sentTo = new Set();
  for (const note of pending()) {
    const agent = list.find(each => each.id === note.paseoId);
    if (!live(agent)) {
      if (!dryRun) settle(stateDir, note, null);
      journal(`Not told ${note.title}: the chat is gone`, note.title);
      continue;
    }
    const steer = working(agent.status);
    if (sentTo.has(note.agent) || (steer && !note.now)) continue;
    if (dryRun) { print({ wouldTell: note.title, steer, text: note.text }); continue; }
    // Check-ins turned off, or a *Needs you* card, since the run queued the note: it goes nowhere.
    const refused = refusal({ stateDir, chat: { paseoId: note.paseoId, name: note.title } });
    if (refused) {
      settle(stateDir, note, null);
      journal(`Not told ${note.title}: ${refused.reason === 'off' ? 'check-ins are off' : 'it waits for you'}`, note.title);
      continue;
    }
    // The card gives the row, not the watch: a chat another agent opened is in no watch, and still gets its note.
    const sent = await reply({ stateDir, day, started, timezone, call, env: { PASEO_AGENT_ID: RUN_ID }, agent: note.paseoId, typedAt,
      row: { agentId: note.paseoId, title: note.title, source: 'line-up' }, text: `${NOTE_LEAD} ${note.text}`, bucket: 'line-up',
      label: `${steer ? 'Steered' : 'Told'} ${note.title}`, behavior: 'steer', now: now() })
      .catch(error => ({ status: 'failed', error: String(error?.message ?? error).split('\n')[0] }));
    if (sent.status === 'sent') {
      sentTo.add(note.agent);
      settle(stateDir, note, now().toISOString());
      journal(`${sent.kind === 'steer' ? 'Steered' : 'Told'} ${note.title}: ${firstWords(note.text)}`, note.title);
    } else if (!['streak', 'running'].includes(sent.reason)) {
      queueWaiting({ stateDir, timezone, home, note, at: now().toISOString() });
      journal(`Not sent through Paseo to ${note.title}: ${String(sent.error ?? sent.reason).replace(/\.$/, '')}. It waits for the chat's next stop or message.`, note.title);
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

/** The check: `{chats}` when a chat ended a turn the map has not read, or a chat another waits for closed; else null.
 * A read `D line-up` showed in the last 15 minutes counts as read. */
export function lineUpDue({ stateDir, project, home = homedir(), now = Date.now(), ownRepo }) {
  const list = chatList({ project, env: {}, home, now, ...(ownRepo && { ownRepo }) });
  const ids = new Set(list.map(chat => chat.key));
  const map = readMap(stateDir);
  const recent = map.shown && now - Date.parse(map.shown.at) < READING_MS ? map.shown : { marks: {}, watching: null };
  // A working chat waits for its turn to end, as the watch's last-turn mark did: its file grows with every step.
  const changed = list.filter(chat => {
    const size = chat.state === 'idle' ? sizeOf(chat.transcript) : null;
    return Boolean(size) && size !== map.chats[chat.key]?.read && size !== recent.marks?.[chat.key];
  }).map(chat => chat.key);
  const left = on => on && !ids.has(on) && map.chats[on] && !map.chats[on].closedAt && (!recent.watching || recent.watching.includes(on));
  const ended = Object.entries(map.chats).filter(([, chat]) => !chat.closedAt && Array.isArray(chat.waitsFor) && chat.waitsFor.some(wait => left(wait?.on)))
    .map(([id]) => id);
  const chats = [...new Set([...changed, ...ended])];
  return chats.length ? { chats: chats.join(',') } : null;
}
