#!/usr/bin/env node
// Claude Code hooks for ../references/asking-the-user.md#which-tool-carries-it, each described in USAGE.
// All fail open: an unreadable turn ends, or asks, as it is.
import { readFileSync } from 'node:fs';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';

const USAGE = 'usage: ask-check.mjs stop|links|reminder   Claude Code hooks; read the hook JSON on stdin\n'
  + '  stop      the Stop hook: sends a reply back once when it ends with choices typed as a list\n'
  + '  links     a PreToolUse hook on AskUserQuestion: sends a question back once when it leaves out a link the turn showed\n'
  + '  reminder  a SessionStart hook for compact: prints the ask rule in one line';
const MODES = ['stop', 'links', 'reminder'];

const TOOL = 'AskUserQuestion';
const OPTION = /^\s*(?:[-*]|\d+[.)])\s+\S/;
export const REASON = `Your reply ends with choices typed as a list. Ask them now with ${TOOL}, recommended first; don't repeat the report or the list. If ${TOOL} isn't callable here, end the turn and say nothing more: the typed list stands.`;
export const LINKS_REASON = 'This question leaves out a link the person needs. Ask again with the full link in the question text (not in an option), and keep it on its own chat line above:';
export const REMINDER = `Asks, next steps included, go through the question tool (${TOOL} here), never typed as a list while it is callable; a question that needs a link shows the full link in its text too: .claude/skills/explore/references/asking-the-user.md#which-tool-carries-it`;

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

// A web address, and the trailing marks that end a sentence or a Markdown link rather than the address.
const WEB = /https?:\/\/[^\s<>"'`[\]()]+/g;
const TRAILING = /[.,;:)\]*_>]+$/;
// A builder's printed line, such as build-review.mjs's `[👉 Tap here to see the plan](<target>)`.
const CLICK = /^\[👉 Tap here to see [^\]\n]{1,60}(\].*)$/gm;
const PATH = /^(?:\/|~\/|\.{1,2}\/|[A-Za-z]:[\\/])|review\.html$/;

// The target of a Tap here line: its web address, else its file path, else null.
function clickTarget(rest) {
  const web = rest.match(WEB)?.[0];
  if (web) return web.replace(TRAILING, '');
  const markdown = rest.match(/\]\(<([^>]+)>\)|\]\(([^)\s]+)\)/);
  const target = markdown ? markdown[1] ?? markdown[2] : rest.trim().split(/\s+/)[0].replace(TRAILING, '');
  return PATH.test(target) ? target : null;
}

// The text of a message part or a tool result's content: a string, or its text parts joined.
function partText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content.map(part => typeof part === 'string' ? part : part?.type === 'text' ? String(part.text ?? '') : '').join('\n');
}

/** The links since the person last spoke or answered a question, and whether this check sent one back. */
export function turnLinks(rows) {
  let start = rows.length;
  while (start > 0 && !isHuman(rows[start - 1])) start -= 1;
  const links = new Set();
  const asks = new Set();
  let sentBack = false;
  const clicks = value => {
    for (const [, rest] of value.matchAll(CLICK)) {
      const target = clickTarget(rest);
      if (target) links.add(target);
    }
  };
  for (const row of rows.slice(start)) {
    const content = row?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (row.type === 'assistant' && part?.type === 'tool_use' && part.name === TOOL) asks.add(part.id);
      else if (row.type === 'assistant' && part?.type === 'text') {
        const value = String(part.text ?? '');
        for (const [address] of value.matchAll(WEB)) links.add(address.replace(TRAILING, ''));
        clicks(value);
      } else if (row.type === 'user' && part?.type === 'tool_result') {
        const value = partText(part.content);
        if (value.includes(LINKS_REASON)) sentBack = true;
        else if (asks.has(part.tool_use_id)) {
          links.clear();
          sentBack = false;
        }
        clicks(value);
      }
    }
  }
  return { links: [...links].filter(Boolean), sentBack };
}

function readRows(file) {
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).flatMap(line => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

/** Waits up to `ms` for the transcript to hold the call's own row: Claude Code writes it just after the hook starts. */
export function waitForCall(file, id, ms = 2000) {
  const end = Date.now() + ms;
  while (id && Date.now() < end) {
    try { if (readFileSync(file, 'utf8').includes(`"${id}"`)) return true; } catch { return false; }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50);
  }
  return false;
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

/** The PreToolUse hook's answer for an AskUserQuestion call: a deny object naming the missing links, or null. */
export function linksDecision(input, env = process.env) {
  if (env.WONG_MEMORY_RUN === '1' || !input?.transcript_path) return null;
  if (input.tool_name && input.tool_name !== TOOL) return null;
  const questions = Array.isArray(input.tool_input?.questions) ? input.tool_input.questions.map(item => String(item?.question ?? '')) : [];
  if (!questions.length) return null;
  let turn;
  try { turn = turnLinks(readRows(input.transcript_path)); } catch { return null; }
  if (turn.sentBack) return null;
  const missing = turn.links.filter(link => !questions.some(question => question.includes(link)));
  if (!missing.length) return null;
  return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: `${LINKS_REASON}\n${missing.join('\n')}` } };
}

if (isMain(import.meta.url)) {
  const { positionals } = parseCli({ usage: USAGE, allowPositionals: true });
  const [mode] = positionals;
  if (positionals.length !== 1 || !MODES.includes(mode)) usageError(USAGE, 'expected one mode, stop, links or reminder');
  if (mode === 'reminder') console.log(REMINDER);
  else {
    let input = null;
    try { input = JSON.parse(readFileSync(0, 'utf8') || 'null'); } catch { /* no input: let it go */ }
    if (mode === 'links' && input?.transcript_path) waitForCall(input.transcript_path, input.tool_use_id);
    const decision = mode === 'stop' ? stopDecision(input) : linksDecision(input);
    if (decision) console.log(JSON.stringify(decision));
  }
}
