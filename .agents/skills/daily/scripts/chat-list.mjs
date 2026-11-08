// The open chats in this project, Claude Code or Codex, in Paseo or not: the line-up's list, from the status cards each
// chat's own hooks write. wiki/development/chats-in-line.md
import { readdirSync, rmSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { codexDayDir } from '../../memory/scripts/lib/transcripts.mjs';
import { folderOf, readState, titleOf } from '../../explore/scripts/step-title.mjs';
import { paseoRecord, readJson, sameRepo, writeJson } from './chief.mjs';
import { RUN_FLAGS } from './daily.mjs';

const DAY_MS = 24 * 3600e3, WEEK_MS = 7 * DAY_MS;
/** A chat key: a session or thread id, safe as a file name. */
export const KEY = /^(?!\.{1,2}$)[A-Za-z0-9._-]{1,128}$/;
const TOOLS = ['claude', 'codex'];
const CARD_EVENTS = ['SessionStart', 'UserPromptSubmit', 'Stop'];
const text = value => (typeof value === 'string' && value.trim() ? value.replace(/\s+/g, ' ').trim().slice(0, 80) : null);

/** Where each chat's hooks leave its card: one folder for the computer, filtered by repo. */
export const cardsDir = home => join(home, '.local', 'state', 'wongstack', 'chats');

const changedAt = file => { try { return statSync(file).mtimeMs; } catch { return 0; } };

/** Codex's transcript for a thread, when its hook gave none: today's or yesterday's `rollout-…-<key>.jsonl`. */
function codexTranscript(key, home, now) {
  for (const date of [new Date(now), new Date(now - DAY_MS)]) {
    const dir = codexDayDir(join(home, '.codex', 'sessions'), date);
    try {
      const name = readdirSync(dir).find(each => each.endsWith(`${key}.jsonl`));
      if (name) return join(dir, name);
    } catch { /* no such day */ }
  }
  return null;
}

/** The chat's name: its Paseo title, else its step title, else its folder. */
function nameOf({ paseoId, key, cwd, home }) {
  const folder = folderOf(cwd);
  return text(paseoRecord(paseoId, home).title) ?? (folder && text(titleOf(readState(folder, paseoId ?? key)))) ?? basename(cwd);
}

/** A hook's card for its chat: `working` from a start or a message, `idle` from a stop, or `state` when given. Not for
 * a background run or a sub-agent; `{status}`. */
export function writeCard({ tool = 'claude', input = {}, env = process.env, home = homedir(), now = Date.now(), state }) {
  const key = input.session_id || env.CODEX_THREAD_ID;
  if (!KEY.test(key ?? '') || !CARD_EVENTS.includes(input.hook_event_name) || RUN_FLAGS.some(name => env[name]) || input.agent_id
    || input.parent_thread_id) return { status: 'skipped' };
  const file = join(cardsDir(home), `${key}.json`);
  const cwd = input.cwd || process.cwd();
  const paseoId = KEY.test(env.PASEO_AGENT_ID ?? '') ? env.PASEO_AGENT_ID : null;
  const before = readJson(file, {});
  writeJson(file, { key, tool, name: nameOf({ paseoId, key, cwd, home }), paseoId, cwd,
    transcript: input.transcript_path || before.transcript || (tool === 'codex' ? codexTranscript(key, home, now) : null),
    state: state ?? (input.hook_event_name === 'Stop' ? 'idle' : 'working'), at: new Date(now).toISOString() });
  return { status: 'written' };
}

/** Every chat with a card. A card 24 hours old over an unchanged transcript is closed; at 7 days it goes. */
function cardChats({ home, now }) {
  const dir = cardsDir(home);
  let names;
  try { names = readdirSync(dir).filter(name => name.endsWith('.json')); } catch { return []; }
  return names.flatMap(name => {
    const card = readJson(join(dir, name), null);
    const age = now - Date.parse(card?.at);
    if (!KEY.test(card?.key ?? '') || !TOOLS.includes(card.tool) || typeof card.cwd !== 'string' || !(age >= 0)) return [];
    if (age > WEEK_MS) { rmSync(join(dir, name), { force: true }); return []; }
    if (age > DAY_MS && now - changedAt(card.transcript) > DAY_MS) return [];
    return [{ key: card.key, tool: card.tool, name: text(card.name) ?? basename(card.cwd), paseoId: KEY.test(card.paseoId ?? '') ? card.paseoId : null,
      cwd: card.cwd, transcript: card.transcript ?? null, state: card.state === 'working' ? 'working' : 'idle' }];
  });
}

/** Every open chat in `project`'s repo or its worktrees, but this one. */
export function chatList({ project, env = process.env, home = homedir(), now = Date.now(), ownRepo = sameRepo(project) } = {}) {
  const self = env.CLAUDE_CODE_SESSION_ID || env.CODEX_THREAD_ID || null;
  return cardChats({ home, now }).filter(chat => chat.key !== self && ownRepo(chat.cwd));
}

/** The chat a name means: its key, its Paseo id, a key prefix of 4 or more, its name, or its folder, in order. */
export function findChat(list, name) {
  const want = String(name ?? '').toLowerCase();
  if (!want) return null;
  return [chat => chat.key === name, chat => chat.paseoId === name, chat => want.length >= 4 && chat.key.startsWith(name),
    chat => chat.name.toLowerCase() === want, chat => basename(chat.cwd).toLowerCase() === want]
    .map(match => list.find(match)).find(Boolean) ?? null;
}
