#!/usr/bin/env node
// Claude Code hooks for ../references/asking-the-user.md#which-tool-carries-it, each described in USAGE.
// All fail open: an unreadable turn ends, or asks, as it is.
import { readFileSync } from 'node:fs';
import { isMain, parseCli, usageError } from '../skills/memory/scripts/lib/cli.mjs';

const USAGE = 'usage: ask-check.mjs stop|links|reminder   Claude Code hooks; read the hook JSON on stdin\n'
  + '  stop      the Stop hook: sends a reply back once when it ends with a typed question or choices typed as a list\n'
  + '  links     a PreToolUse hook on AskUserQuestion: sends a question back once when it leaves out a link, or holds none of the drafts, tables and quotes, the turn showed\n'
  + '  reminder  a SessionStart hook for compact: prints the ask rule in one line';
const MODES = ['stop', 'links', 'reminder'];

const TOOL = 'AskUserQuestion';
const OPTION = /^\s*(?:[-*]|\d+[.)])\s+\S/;
export const REASON = `Your reply ends with a question for the person. If you need their answer, ask it now with ${TOOL}: 2 to 4 short options, recommended first. Put in the question what they must read to answer. If you need no answer, or ${TOOL} isn't callable here, end the turn and say nothing more.`;
export const LINKS_REASON = 'This question leaves out a link the person needs. Ask again with the full link in the question text (not in an option), and keep it on its own chat line above:';
export const REVIEW_REASON = 'This question leaves out what the person must read to answer: the text above a card can be hidden. Ask again with it in the question text, or, when longer than about 40 lines, put it on a page and put the page\'s full link in the question. It begins:';
export const REMINDER = `Asks, next steps included, go through the question tool (${TOOL} here), never typed as a list while it is callable; a question shows the full link in its text too, and what the person must read to answer: .claude/skills/explore/references/asking-the-user.md#which-tool-carries-it`;

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

const TAP_LINE = /^\s*\[👉 Tap here/;
const ASKS = /\?["')\]]*(?:\s|$)/;

/** True when the reply's last paragraph, tap-link lines and Markdown marks dropped, holds a sentence ending in `?`. */
export function endsWithQuestion(text) {
  const kept = String(text ?? '').split('\n').filter(line => !TAP_LINE.test(line)).join('\n');
  const last = kept.split(/\n\s*\n/).map(part => part.trim()).filter(Boolean).at(-1) ?? '';
  return ASKS.test(last.replace(/[*_`>]/g, ''));
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

// Walks the turn since the person last spoke or answered a question: `text` gets each assistant text part,
// `result` each tool result's text, `reset` an answered question. Returns whether a check sent a question back.
function walkTurn(rows, { text, result = () => {}, reset }) {
  let start = rows.length;
  while (start > 0 && !isHuman(rows[start - 1])) start -= 1;
  const asks = new Set();
  let sentBack = false;
  for (const row of rows.slice(start)) {
    const content = row?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (row.type === 'assistant' && part?.type === 'tool_use' && part.name === TOOL) asks.add(part.id);
      else if (row.type === 'assistant' && part?.type === 'text') text(String(part.text ?? ''));
      else if (row.type === 'user' && part?.type === 'tool_result') {
        const value = partText(part.content);
        if (value.includes(LINKS_REASON) || value.includes(REVIEW_REASON)) sentBack = true;
        else if (asks.has(part.tool_use_id)) {
          reset();
          sentBack = false;
        }
        result(value);
      }
    }
  }
  return sentBack;
}

/** The links since the person last spoke or answered a question, and whether a check sent one back. */
export function turnLinks(rows) {
  const links = new Set();
  const clicks = value => {
    for (const [, rest] of value.matchAll(CLICK)) {
      const target = clickTarget(rest);
      if (target) links.add(target);
    }
  };
  const sentBack = walkTurn(rows, {
    text: value => {
      for (const [address] of value.matchAll(WEB)) links.add(address.replace(TRAILING, ''));
      clicks(value);
    },
    result: clicks,
    reset: () => links.clear(),
  });
  return { links: [...links].filter(Boolean), sentBack };
}

const FENCE = /^\s*(`{3,}|~{3,})\s*([\w+-]*)/;
const TABLE = /^\s*\|/;
const QUOTE = /^\s*>/;
const SEPARATOR = /^[\s|:-]+$/;
const MARKER = /^\s*(?:>\s*)*(?:[-*+]\s+|\d+[.)]\s+)?/;

/** A line as words only: lowercase, emphasis marks dropped, other runs of marks and spaces one space. Both sides of a
 *  match use it. */
export function plain(value) {
  return String(value ?? '').toLowerCase().replace(/[*_`~]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

// A line to show as a hint: its list, quote and table marks and Markdown emphasis dropped, spaces collapsed.
function shown(line) {
  return line.replace(MARKER, '').replace(/[*_`~]/g, '').replace(/^\s*\||\|\s*$/g, '').replace(/\s+/g, ' ').trim();
}

// The block's probe: its longest content line as shown, cut to 60 characters, or null when no line holds a word.
function probe(lines) {
  let best = '';
  for (const line of lines) {
    const value = shown(line);
    if (plain(value).length > plain(best).length) best = value;
  }
  return plain(best) ? best.slice(0, 60) : null;
}

// A drawing in a text fence: box lines and arrows, as in a flow or a screen sketch.
const DRAWING = /[\u2500-\u257F\u25B2-\u25C4]/;

/** The blocks a person reviews in assistant text, as probes: a code fence, a table or quote of 2+ lines. A drawing is a
 *  picture, and a list is mostly a report: a backtest sent back 3 report lists for each one a person had to read. */
export function reviewBlocks(text) {
  const lines = String(text ?? '').split('\n').filter(line => !TAP_LINE.test(line));
  const probes = [];
  const keep = block => {
    const value = probe(block);
    if (value) probes.push(value);
  };
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fence = line.match(FENCE);
    if (fence) {
      const body = [];
      let end = index + 1;
      while (end < lines.length && !lines[end].trim().startsWith(fence[1])) body.push(lines[end++]);
      if (fence[2].toLowerCase() !== 'mermaid' && !body.some(row => DRAWING.test(row))) keep(body);
      index = end;
    } else if (TABLE.test(line) || QUOTE.test(line)) {
      const kind = TABLE.test(line) ? TABLE : QUOTE;
      let end = index;
      while (end < lines.length && kind.test(lines[end])) end += 1;
      const block = lines.slice(index, end);
      if (block.length >= 2) {
        // A table's header row is not what a question repeats: its rows are.
        const rows = kind === TABLE ? block.filter(row => !SEPARATOR.test(row)) : block;
        keep(kind === TABLE && rows.length > 1 && SEPARATOR.test(block[1] ?? '') ? rows.slice(1) : rows);
      }
      index = end - 1;
    }
  }
  return probes;
}

/** The review blocks since the person last spoke or answered a question, from assistant text only, and whether a
 *  check sent one back. */
export function turnReview(rows) {
  let blocks = [];
  const sentBack = walkTurn(rows, {
    text: value => { blocks.push(...reviewBlocks(value)); },
    reset: () => { blocks = []; },
  });
  return { blocks, sentBack };
}

// A question that offers to close the chat ends finished work: what it reports needs no review.
const CLOSING = /\bclose (?:this|the) chat\b/i;
// A web address, or a file path of two or more parts, anywhere in a question.
const LINKED = /https?:\/\/\S|(?:^|[\s(<`'"])(?:~|\.{1,2})?\/[\w.@-]+\/\S|(?:^|[\s(<`'"])[A-Za-z]:[\\/]\S|review\.html\b/m;

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
  return endsWithChoices(text) || endsWithQuestion(text) ? { decision: 'block', reason: REASON } : null;
}

/** The PreToolUse hook's answer for an AskUserQuestion call: a deny naming the missing links or review, or null. */
export function linksDecision(input, env = process.env) {
  if (env.WONG_MEMORY_RUN === '1' || !input?.transcript_path) return null;
  if (input.tool_name && input.tool_name !== TOOL) return null;
  const items = Array.isArray(input.tool_input?.questions) ? input.tool_input.questions : [];
  const questions = items.map(item => String(item?.question ?? ''));
  if (!questions.length) return null;
  let links;
  let review;
  try {
    const rows = readRows(input.transcript_path);
    links = turnLinks(rows);
    review = turnReview(rows);
  } catch { return null; }
  if (links.sentBack || review.sentBack) return null;
  const deny = reason => ({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } });
  const missing = links.links.filter(link => !questions.some(question => question.includes(link)));
  if (missing.length) return deny(`${LINKS_REASON}\n${missing.join('\n')}`);
  if (!review.blocks.length || questions.some(question => LINKED.test(question) || CLOSING.test(question))) return null;
  // What the card shows: each question, and each option's description and preview.
  const card = plain(items.flatMap(item => [item?.question, ...(Array.isArray(item?.options) ? item.options.flatMap(option => [option?.description, option?.preview]) : [])]).filter(Boolean).join('\n'));
  if (review.blocks.some(block => card.includes(plain(block)))) return null;
  return deny(`${REVIEW_REASON}\n${[...new Set(review.blocks)].join('\n')}`);
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
