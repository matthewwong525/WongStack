// A chat's transcript as the daily reads it, Claude Code or Codex: every readable message, and the person's own.
import { readFileSync } from 'node:fs';
import { parseTranscriptText } from '../../memory/scripts/lib/transcripts.mjs';

// Another chat's message sent through Paseo: an agent's words, not the person's.
const AGENT_MESSAGE = /^<paseo-system\b[^>]*\bkind="agent-message"/;
// The line-up's note to this chat: line-up.mjs's NOTE_LEAD.
const NOTE = /^\s*From the daily:/;
// The host's own wrap of a stop step's reply: Claude Code's feedback line, or Codex's hook prompt. A bare reply is the
// person's: neither host records one, and the person may type "Keep going." themselves.
const WRAPS = [/^Stop hook feedback:\s*([\s\S]*)$/i, /^<hook_prompt\b[^>]*>([\s\S]*)<\/hook_prompt>$/];
const unwrap = text => WRAPS.map(wrap => text.trim().match(wrap)?.[1].trim()).find(Boolean);

/** `{messages, person}`. A tool result, hook text or task notice is not the person's; nor is a message that is one
 * of `sent`, the replies the stop step gave, in the host's wrap. Throws on a file it can not read. */
export function readChat(file, sent = []) {
  const { messages } = parseTranscriptText(readFileSync(file, 'utf8'));
  const ours = text => sent.includes(unwrap(text));
  return { messages, person: messages.filter(message => message.role === 'user' && !message.origin && !AGENT_MESSAGE.test(message.text)
    && !NOTE.test(message.text) && !ours(message.text)) };
}
