// Upkeep: the tidying that needs no judgment, decided in plain code after every write and background run. It
// closes threads nobody checked in 30 days, adds the area and verb tags a fact's own words name, and keeps
// area tags' definitions and aliases equal to references/areas.json. memory.mjs reads the store and writes
// the plan; this file only decides.
import { WRITES, ADMIN_WRITES } from '../../worker/statements.mjs';
import { areasOf } from './areas.mjs';

// Restates per pass: the rest wait for the next write, so one batch stays within the route's limits.
export const UPKEEP_CAP = 50;
export const STALE_DAYS = 30;
const MAX_BODY = 400;

// A slash command in a thread names the verb whose next run should check it.
const SLASH = /(?<![\w/.-])\/(explore|plan|apply|save|ship|continue|verify|routine|close|improve-code|improve|dream-memory|dream|wong-sync|wong-setup)(?![\w-])/g;
const VERB_OF = { 'wong-sync': 'sync', 'wong-setup': 'setup', 'improve-code': 'improve', 'dream-memory': 'dream' };

// Words that look like a path: a `/` or a file extension, with quotes, brackets, and end punctuation dropped.
export const pathWords = body => body.split(/[\s`"'()<>[\]{},;]+/).map(word => word.replace(/[.:!?]+$/, ''))
  .filter(word => word.includes('/') || /\.[a-z0-9]+$/i.test(word));

// The area tags a fact's words name, and for a thread, the verb tags its slash commands name.
export function wordTags(fact, areas, root) {
  const tags = new Set(pathWords(fact.body).flatMap(word => areasOf(word, areas, root)));
  if (fact.type === 'thread') for (const [, verb] of fact.body.matchAll(SLASH)) tags.add(VERB_OF[verb] || verb);
  return [...tags];
}

// The fact that closes a stale thread, cut at a word boundary to fit.
export function closingBody(thread) {
  const text = `Closed unchecked after ${STALE_DAYS} days (thread #${thread.id}, ${thread.created_at.slice(0, 10)}): ${thread.body}`;
  return text.length <= MAX_BODY ? text : `${text.slice(0, MAX_BODY - 1).replace(/\s+\S*$/, '')}…`;
}

// Statements that set each area tag's definition and aliases to the list's. A listed alias the store lacks
// is skipped; one that other tags point at is skipped too, so aliases stay one level deep.
export function tagSync(tagRows, areas, { author, now }) {
  const byName = new Map(tagRows.map(row => [row.name, row]));
  const statements = [];
  for (const [name, area] of Object.entries(areas)) {
    const tag = byName.get(name);
    if (tag && tag.definition !== area.definition) statements.push([ADMIN_WRITES.tagUpdate.sql, [area.definition, tag.alias_of, name]]);
    const aliases = (area.aliases || []).map(alias => byName.get(alias))
      .filter(row => row && row.alias_of !== name && !tagRows.some(other => other.alias_of === row.name));
    if (aliases.length && !tag) statements.push([WRITES.tag.sql, [name, area.definition, null, author, now]]);
    for (const row of aliases) statements.push([ADMIN_WRITES.tagUpdate.sql, [row.definition, name, row.name]]);
  }
  return statements;
}

// What one pass does, from the live facts the key may change (each with its `tags`): the threads to close,
// oldest first, then the re-tags, together at most UPKEEP_CAP.
export function upkeepPlan(facts, tagRows, { areas, root, now = Date.now() }) {
  const cutoff = new Date(now - STALE_DAYS * 86400000).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const close = facts.filter(fact => fact.type === 'thread' && fact.created_at <= cutoff)
    .sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(0, UPKEEP_CAP);
  const aliasOf = new Map([...tagRows.map(row => [row.name, row.alias_of]),
    ...Object.entries(areas).flatMap(([name, area]) => (area.aliases || []).map(alias => [alias, name]))]);
  const retag = [];
  for (const fact of facts) {
    if (close.length + retag.length >= UPKEEP_CAP) break;
    if (close.includes(fact)) continue;
    const has = new Set(fact.tags.flatMap(tag => [tag, aliasOf.get(tag)]));
    const adds = wordTags(fact, areas, root).filter(tag => !has.has(tag));
    if (adds.length) retag.push({ id: fact.id, tags: adds });
  }
  return { close, retag };
}
