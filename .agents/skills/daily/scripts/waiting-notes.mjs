// Notes for a chat outside Paseo, or one Paseo failed to reach: the chat's own hooks hand them over at its next stop or
// next message. wiki/development/chats-in-line.md
import { appendFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { KEY } from './chat-list.mjs';
import { withLock } from './daily.mjs';
import { addLine } from './journal.mjs';

const FIRST_WORDS = 80;
export const notesDir = home => join(home, '.local', 'state', 'wongstack', 'notes');
// Null for a key that is not a chat key, so a name such as `../x` never reaches outside the folder.
const notesFile = (home, key) => (KEY.test(key ?? '') ? join(notesDir(home), `${key}.jsonl`) : null);

/** Adds one note, `{text, title, stateDir, timezone, at}`: the hand-over journals it in the person's own journal. */
export function appendNote({ home = homedir(), key, note }) {
  const file = notesFile(home, key);
  if (!file) return;
  withLock(file, () => appendFileSync(file, `${JSON.stringify(note)}\n`, { mode: 0o600 }));
}

/** Removes and returns the chat's notes in one locked step, so two readers never hand over one note twice. */
export function takeNotes({ home = homedir(), key }) {
  const file = notesFile(home, key);
  if (!file || !existsSync(file)) return [];
  return withLock(file, () => {
    let lines;
    try { lines = readFileSync(file, 'utf8').split('\n'); } catch { return []; }
    rmSync(file, { force: true });
    return lines.flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } }).filter(note => typeof note?.text === 'string');
  });
}

const firstWords = text => (text.length > FIRST_WORDS ? `${text.slice(0, FIRST_WORDS).trim()}…` : text);

/** Hands the chat its notes: their text for the hook, or null with none; one journal line each. */
export function handOver({ home = homedir(), key, now = Date.now() }) {
  const notes = takeNotes({ home, key });
  for (const note of notes) {
    try {
      addLine({ stateDir: note.stateDir, timezone: note.timezone, line: `Told ${note.title}: ${firstWords(note.text.replace(/^From the daily:\s*/, ''))}`,
        kind: 'line-up', title: note.title, now: new Date(now) });
    } catch { /* the note still goes */ }
  }
  return notes.length ? notes.map(note => note.text).join('\n\n') : null;
}
