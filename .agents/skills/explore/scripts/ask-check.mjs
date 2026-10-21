#!/usr/bin/env node
// Claude Code hooks for ../references/asking-the-user.md#which-tool-carries-it: `stop` sends back a reply typing its
// choices, `reminder` restates the rule after compaction. Both fail open: an unreadable turn ends as it is.
import { readFileSync } from 'node:fs';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';

const USAGE = 'usage: ask-check.mjs stop|reminder   Claude Code hooks; read the hook JSON on stdin\n'
  + '  stop      the Stop hook: sends a reply back once when it ends with choices typed as a list\n'
  + '  reminder  a SessionStart hook for compact: prints the ask rule in one line';

const TOOL = 'AskUserQuestion';
const OPTION = /^\s*(?:[-*]|\d+[.)])\s+\S/;
export const REASON = `Your reply ends with choices typed as a list. Ask them now with ${TOOL}, recommended first; don't repeat the report or the list. If ${TOOL} isn't callable here, end the turn and say nothing more: the typed list stands.`;
export const REMINDER = `Asks, next steps included, go through the question tool (${TOOL} here), never typed as a list while it is callable: .claude/skills/explore/references/asking-the-user.md#which-tool-carries-it`;

/** True when a reply ends in 2–4 list items under a question, or with an item marked Recommended. */
export function endsWithChoices(text) {
  const lines = String(text ?? '').trim().split('\n').filter(line => line.trim());
  let count = 0;
  for (const line of lines.slice(-5).reverse()) {
    if (!OPTION.test(line)) break;
    count += 1;
  }
  if (count < 2 || count > 4 || lines.length <= count) return false;
  const head = lines.at(-count - 1).replace(/[*_\s]+$/, '');
  return head.endsWith('?') || lines.slice(-count).some(line => line.includes('Recommended'));
}

// A row a person typed: a user row with text, not the compaction summary or a meta row.
function isHuman(row) {
  if (row?.type !== 'user' || row.isCompactSummary || row.isMeta) return false;
  const content = row.message?.content;
  return typeof content === 'string' || (Array.isArray(content) && content.some(part => part?.type === 'text'));
}

/** The turn after the last human row: `{ asked, text }`, `text` null when the turn ends on no text. */
export function readTurn(rows) {
  let start = rows.length;
  while (start > 0 && !isHuman(rows[start - 1])) start -= 1;
  let asked = false;
  let text = null;
  for (const row of rows.slice(start)) {
    if (row?.type !== 'assistant' || !Array.isArray(row.message?.content)) continue;
    for (const part of row.message.content) {
      if (part?.type === 'tool_use') {
        if (part.name === TOOL) asked = true;
        text = null;
      } else if (part?.type === 'text') text = part.text;
    }
  }
  return { asked, text };
}

function readRows(file) {
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).flatMap(line => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

/** The Stop hook's answer for its input: a block object, or null to let the turn end. */
export function stopDecision(input, env = process.env) {
  if (input?.stop_hook_active || env.WONG_MEMORY_RUN === '1' || !input?.transcript_path) return null;
  let turn;
  try { turn = readTurn(readRows(input.transcript_path)); } catch { return null; }
  if (turn.asked) return null;
  const text = typeof input.last_assistant_message === 'string' && input.last_assistant_message ? input.last_assistant_message : turn.text;
  return endsWithChoices(text) ? { decision: 'block', reason: REASON } : null;
}

if (isMain(import.meta.url)) {
  const { positionals } = parseCli({ usage: USAGE, allowPositionals: true });
  const [mode] = positionals;
  if (positionals.length !== 1 || !['stop', 'reminder'].includes(mode)) usageError(USAGE, 'expected one mode, stop or reminder');
  if (mode === 'reminder') console.log(REMINDER);
  else {
    let input = null;
    try { input = JSON.parse(readFileSync(0, 'utf8') || 'null'); } catch { /* no input: let the turn end */ }
    const decision = stopDecision(input);
    if (decision) console.log(JSON.stringify(decision));
  }
}
