#!/usr/bin/env node
// SubagentStop hook, Claude Code and Codex: a build or review helper that stops without its report is sent back once.
// It never traps: a second stop, any other agent, and anything it cannot read go through with no output.
import { readFileSync } from 'node:fs';
import { isMain, parseCli } from '../../memory/scripts/lib/cli.mjs';

// Each helper is known by its brief and ends its report with its own line.
const helper = (brief, label) => ({
  brief, line: new RegExp(`^[\\s>*_\`#-]*${label}[*_\`]*\\s*:`, 'im'),
  reason: 'You stopped without your report. If a check or helper you started still runs, wait for it to finish. '
    + `Then end with the report ${brief} asks for, including its \`${label}:\` line.`,
});
export const HELPERS = [helper('apply/references/build-helper.md', 'local checks'), helper('apply/references/review-helper.md', 'review')];
export const [{ brief: BRIEF, reason: REASON }, { reason: REVIEW_REASON }] = HELPERS;

const texts = content => typeof content === 'string' ? [content]
  : Array.isArray(content) ? content.filter(part => /^(text|input_text|output_text)$/.test(part?.type)).map(part => part.text) : [];

// The agent's own entries. A Codex helper forked from its parent starts with the parent's history;
// its own part begins at the first entry stamped with its own thread id.
export function ownEntries(entries) {
  const meta = entries[0]?.type === 'session_meta' ? entries[0].payload : undefined;
  const start = meta?.forked_from_id ? entries.findIndex(entry => entry.payload?.thread_id === meta.id) : -1;
  return start < 0 ? entries : entries.slice(start);
}

// Only its first ask and first three commands count: an agent opening a brief later is no such helper.
// A Codex helper's task arrives encrypted, so there its early read of the brief names it.
export function taskTexts(entries) {
  const asked = [], ran = [];
  for (const { type, message, payload } of entries) {
    if (type === 'user') asked.push(...texts(message?.content));
    else if (type === 'assistant') ran.push(...(message?.content || []).filter(part => part?.type === 'tool_use').map(part => JSON.stringify(part.input)));
    else if (type !== 'response_item') continue;
    else if (payload?.type === 'message' && payload.role === 'user') asked.push(...texts(payload.content));
    else if (String(payload?.type).endsWith('call')) ran.push(JSON.stringify(payload.arguments ?? payload.input ?? payload.action ?? ''));
  }
  return [asked.find(text => text.trim()), ...ran.slice(0, 3)].filter(Boolean);
}

export function lastAssistantText(entries) {
  for (const { type, message, payload } of [...entries].reverse()) {
    const content = type === 'assistant' ? message?.content
      : type === 'response_item' && payload?.type === 'message' && payload.role === 'assistant' ? payload.content : null;
    const text = texts(content).join('\n');
    if (text.trim()) return text;
  }
  return '';
}

// The hook's stdout for one stop: '' lets it stop; a block decision sends it back once.
export function stopCheck(input) {
  if (input.stop_hook_active || !input.agent_transcript_path) return '';
  const entries = readFileSync(input.agent_transcript_path, 'utf8').split('\n').flatMap(line => {
    try { return line.trim() ? [JSON.parse(line)] : []; } catch { return []; }
  });
  const own = ownEntries(entries);
  // The earliest text naming a brief decides: a reviewer that later opens the build brief is still a reviewer.
  const named = taskTexts(own).find(text => HELPERS.some(({ brief }) => text.includes(brief)));
  if (!named) return '';
  const matched = HELPERS.filter(({ brief }) => named.includes(brief));
  const last = typeof input.last_assistant_message === 'string' ? input.last_assistant_message : lastAssistantText(own);
  if (matched.some(({ line }) => line.test(last))) return '';
  return `${JSON.stringify({ decision: 'block', reason: matched[0].reason })}\n`;
}

if (isMain(import.meta.url)) {
  parseCli({ usage: 'usage: helper-stop-check.mjs   the SubagentStop hook; reads the hook\'s JSON on stdin' });
  let out = '';
  try { out = stopCheck(JSON.parse(readFileSync(0, 'utf8'))); } catch { /* never traps a helper */ }
  process.stdout.write(out, () => process.exit(0));
}
