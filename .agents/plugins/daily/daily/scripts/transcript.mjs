// A chat's transcript as the daily reads it, Claude Code or Codex: every readable message, and the person's own.
import { closeSync, openSync, readFileSync, readSync, statSync } from 'node:fs';
import { parseTranscriptText } from './lib/transcripts.mjs';

// Another chat's message sent through Paseo: an agent's words, not the person's.
const AGENT_MESSAGE = /^<paseo-system\b[^>]*\bkind="agent-message"/;
// The line-up's note to this chat: line-up.mjs's NOTE_LEAD.
const NOTE = /^\s*From the daily:/;
// The host's own wrap of a stop step's reply: Claude Code's feedback line, or Codex's hook prompt. A bare reply is the
// person's: neither host records one, and the person may type "Keep going." themselves.
const WRAPS = [/^Stop hook feedback:\s*([\s\S]*)$/i, /^<hook_prompt\b[^>]*>([\s\S]*)<\/hook_prompt>$/];
const unwrap = text => WRAPS.map(wrap => text.trim().match(wrap)?.[1].trim()).find(Boolean);
const TAIL_BYTES = 2_000_000;
// A Codex file names its format only in its first record, so a read from the middle starts with one.
const CODEX_HEAD = JSON.stringify({ type: 'session_meta', payload: {} });

/** True for the person's own words: not a tool result, hook text, task notice, another chat's Paseo message or a note,
 * nor one of `sent`, the replies the stop step gave, in the host's wrap. */
const personal = (message, sent = []) => message.role === 'user' && !message.origin && !AGENT_MESSAGE.test(message.text)
  && !NOTE.test(unwrap(message.text) ?? message.text) && !sent.includes(unwrap(message.text));

/** `{messages, person}`. Throws on a file it can not read. */
export function readChat(file, sent = []) {
  const { messages } = parseTranscriptText(readFileSync(file, 'utf8'));
  return { messages, person: messages.filter(message => personal(message, sent)) };
}

/** `{messages, end}`: each message, with `person`, in the whole lines written after byte `from`, or in the last 2 MB
 * when `from` is null or past the end; the next read starts at `end`. Throws on a file it can not read. */
export function readNew(file, tool, from = null) {
  const size = statSync(file).size;
  const start = Number.isInteger(from) && from >= 0 && from <= size ? from : Math.max(0, size - TAIL_BYTES);
  const bytes = Buffer.alloc(size - start);
  const fd = openSync(file, 'r');
  try { readSync(fd, bytes, 0, bytes.length, start); } finally { closeSync(fd); }
  const last = bytes.lastIndexOf(10);
  const first = start > 0 && start !== from ? bytes.indexOf(10) + 1 : 0;
  const text = last < first ? '' : bytes.subarray(first, last + 1).toString('utf8');
  let messages = [];
  try {
    messages = parseTranscriptText(tool === 'codex' ? `${CODEX_HEAD}\n${text}` : text).messages;
  } catch { /* no whole message yet */ }
  return { messages: messages.map(message => ({ ...message, person: personal(message) })), end: start + last + 1 };
}
