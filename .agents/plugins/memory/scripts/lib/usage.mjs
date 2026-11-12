// Use counts: one JSON line in the state folder for each look-up a chat makes. The daily tidy's map reads them;
// nothing here reaches git or the store. wiki/development/memory-search.md#how-use-is-counted
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { statePath } from './store.mjs';

const FILE = 'usage.jsonl';
export const USAGE_DAYS = 30;
const DAY_MS = 86_400_000;
const MAX_IDS = 20;
const MAX_WORDS = 200;
const PAIR_DAYS = 3;

/** Count one look-up. It never throws, so no read fails or waits on it; a background run writes nothing. */
export function recordUse(ctx, { command, node = null, topics = [], facts = [], miss = false, words = '' }) {
  if (process.env.WONG_MEMORY_RUN === '1') return;
  try {
    const row = { at: new Date().toISOString(), command, node, topics: [...new Set(topics)], facts: [...new Set(facts)].slice(0, MAX_IDS),
      workspace: basename(ctx.root), ...(miss ? { miss: true, words: String(words).replace(/\s+/g, ' ').trim().slice(0, MAX_WORDS) } : {}) };
    appendFileSync(statePath(ctx, FILE), `${JSON.stringify(row)}\n`, { mode: 0o600 });
  } catch { /* a count is never worth a failed read */ }
}

// A main word has four letters or more and is none of these. Two words are one when their first five letters agree.
const STOP = new Set('what which when where does have with from that this these those about into should would could there their they them then than were been will your'.split(' '));
const MAIN_LETTERS = 4;
const STEM_LETTERS = 5;
const stemsOf = text => [...new Set((String(text).toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])
  .filter(word => word.length >= MAIN_LETTERS && !STOP.has(word)).map(word => word.slice(0, STEM_LETTERS)))];
const sameWord = (a, b) => a.startsWith(b) || b.startsWith(a);

/** True when `texts`, the facts and passages a look-up gave, do not answer the question `words`: none came back,
 *  or no one text holds half of the question's main words. With under two main words, any text is an answer. */
export function weakAnswer(words, texts) {
  if (!texts.length) return true;
  const main = stemsOf(words);
  if (main.length < 2) return false;
  return !texts.some(text => {
    const stems = stemsOf(text);
    return main.filter(word => stems.some(stem => sameWord(word, stem))).length * 2 >= main.length;
  });
}

// The rows of the last 30 days; older ones are dropped from the file first. A line that is no JSON is dropped too.
function keptRows(ctx, now) {
  let file, lines;
  try {
    file = statePath(ctx, FILE);
    lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
  } catch { return []; }
  const cutoff = new Date(now - USAGE_DAYS * DAY_MS).toISOString();
  const rows = lines.flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } }).filter(row => row?.at >= cutoff);
  // A trim that fails is tried again at the next read.
  if (rows.length < lines.length) try { writeFileSync(file, rows.map(row => `${JSON.stringify(row)}\n`).join(''), { mode: 0o600 }); } catch { return rows; }
  return rows;
}

const mostFirst = counts => [...counts].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'en', { numeric: true }));
const bump = (counts, key) => counts.set(key, (counts.get(key) || 0) + 1);

// Topic pairs a workspace used on one day, counted by the days it happened: `[{ topics: [a, b], days }]`.
function pairsOf(rows) {
  const used = new Map();
  for (const row of rows) {
    const key = JSON.stringify([row.at.slice(0, 10), row.workspace]);
    used.set(key, new Set([...(used.get(key) ?? []), ...row.topics]));
  }
  const days = new Map();
  for (const [key, topics] of used) {
    const list = [...topics].sort();
    for (const [index, a] of list.entries()) {
      for (const b of list.slice(index + 1)) days.set(JSON.stringify([a, b]), new Set([...(days.get(JSON.stringify([a, b])) ?? []), JSON.parse(key)[0]]));
    }
  }
  return mostFirst([...days].map(([pair, set]) => [pair, set.size])).filter(([, n]) => n >= PAIR_DAYS).map(([pair, n]) => ({ topics: JSON.parse(pair), days: n }));
}

/** How chats used memory since `since` (an ISO time; default every kept row): topics and facts most used first,
 *  misses newest first, and pairs. `topicOf(tag)` gives a tag's topic, or null to leave the tag out. */
export function usageSummary(ctx, { since, now = Date.now(), topicOf = tag => tag } = {}) {
  const rows = keptRows(ctx, now).filter(row => !since || row.at >= since)
    .map(row => ({ ...row, topics: [...new Set((row.topics || []).map(topicOf).filter(Boolean))], facts: row.facts || [] }));
  const topics = new Map(), facts = new Map(), misses = new Map();
  for (const row of rows) {
    for (const topic of row.topics) bump(topics, topic);
    for (const id of row.facts) bump(facts, id);
    if (!row.miss || !row.words) continue;
    const key = row.words.toLowerCase();
    const seen = misses.get(key);
    misses.set(key, { words: row.words, command: row.command, at: seen && seen.at > row.at ? seen.at : row.at, times: (seen?.times || 0) + 1 });
  }
  return { lookups: rows.length, topics: mostFirst(topics).map(([topic, uses]) => ({ topic, uses })), facts: mostFirst(facts).map(([id, uses]) => ({ id, uses })),
    misses: [...misses.values()].sort((a, b) => b.at.localeCompare(a.at)), pairs: pairsOf(rows) };
}
