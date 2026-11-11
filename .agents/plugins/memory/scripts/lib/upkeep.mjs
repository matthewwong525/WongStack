// Upkeep: tidying that needs no judgment, decided in plain code after every write and background run: stale threads
// closed, tags added, topic tags kept equal to the profile's topics. memory.mjs reads and writes; this only decides.
import { areasOf } from './areas.mjs';

// Restates per pass: the rest wait for the next write, so one batch stays within the route's limits.
export const UPKEEP_CAP = 50;
export const STALE_DAYS = 30;
const MAX_BODY = 400;

// A slash command in a thread names the step whose next run should check it: the profile's `steps` map.
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function slashSteps(steps = {}) {
  const stepOf = new Map(Object.entries(steps).flatMap(([step, commands]) => commands.map(command => [command, step])));
  const names = [...stepOf.keys()].sort((a, b) => b.length - a.length).map(escape).join('|');
  return { stepOf, pattern: names && new RegExp(`(?<![\\w/.-])(${names})(?![\\w-])`, 'g') };
}

// Words that look like a path: a `/` or a file extension, with quotes, brackets, and end punctuation dropped.
export const pathWords = body => body.split(/[\s`"'()<>[\]{},;]+/).map(word => word.replace(/[.:!?]+$/, ''))
  .filter(word => word.includes('/') || /\.[a-z0-9]+$/i.test(word));

// The topic tags a fact's words name, and for a thread, the step tags its slash commands name.
export function wordTags(fact, areas, root, steps) {
  const tags = new Set(pathWords(fact.body).flatMap(word => areasOf(word, areas, root)));
  const { stepOf, pattern } = slashSteps(steps);
  if (fact.type === 'thread' && pattern) for (const [, command] of fact.body.matchAll(pattern)) tags.add(stepOf.get(command));
  return [...tags];
}

// The fact that closes a stale thread, cut at a word boundary to fit.
export function closingBody(thread) {
  const text = `Closed unchecked after ${STALE_DAYS} days (thread #${thread.id}, ${thread.created_at.slice(0, 10)}): ${thread.body}`;
  return text.length <= MAX_BODY ? text : `${text.slice(0, MAX_BODY - 1).replace(/\s+\S*$/, '')}…`;
}

// The defineTag calls that set each topic tag's definition and aliases to the profile's. A listed alias the store
// lacks is skipped; one that other tags point at is skipped too, so aliases stay one level deep.
export function tagSync(tagRows, areas) {
  const byName = new Map(tagRows.map(row => [row.name, row]));
  const calls = [];
  for (const [name, area] of Object.entries(areas)) {
    const tag = byName.get(name);
    const aliases = (area.aliases || []).map(alias => byName.get(alias))
      .filter(row => row && row.alias_of !== name && !tagRows.some(other => other.alias_of === row.name));
    if ((tag && tag.definition !== area.definition) || (aliases.length && !tag)) calls.push({ name, definition: area.definition, aliasOf: tag?.alias_of ?? null });
    for (const row of aliases) calls.push({ name: row.name, definition: row.definition, aliasOf: name });
  }
  return calls;
}

// What one pass does, from the live facts the key may change (each with its `tags`): the threads to close,
// oldest first, then the re-tags, together at most UPKEEP_CAP.
export function upkeepPlan(facts, tagRows, { areas, root, steps, now = Date.now() }) {
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
    const adds = wordTags(fact, areas, root, steps).filter(tag => !has.has(tag));
    if (adds.length) retag.push({ id: fact.id, tags: adds });
  }
  return { close, retag };
}
