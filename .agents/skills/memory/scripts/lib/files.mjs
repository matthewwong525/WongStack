// The files behind facts: what each fact's change touched, the paths a fact names, and its topic's docs and folders,
// merged and ranked on each read. Nothing is stored. wiki/development/document-retrieval.md#files-behind-the-facts
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { areaDocs, normalizePath, realPath } from './areas.mjs';
import { pathWords } from './upkeep.mjs';

export const FILES_LIMIT = 8;
export const PER_CHANGE = 10;
const NAMED = 1.5;
const TOPIC = 0.5;
const VIA = ['named', 'change', 'topic'];

// The repo paths a fact's words name that exist now, without a `#anchor` or `:line` suffix.
export function namedPaths(body, root) {
  const found = pathWords(String(body ?? '')).map(word => normalizePath(word.replace(/[#:].*$/, ''), root))
    .map(path => path && !path.startsWith('..') && realPath(path, root)).filter(Boolean);
  return [...new Set(found)];
}

// The lookup's answer, or an empty map and `unavailable` when it throws or misses its deadline.
async function changeFiles(ctx, profile, slugs, deadline) {
  if (!slugs.length || !profile?.lookup?.files) return { bySlug: new Map(), state: 'ok' };
  let timer;
  const late = new Promise(resolve => { timer = setTimeout(resolve, Math.max(0, deadline - Date.now()), null); });
  try {
    const found = await Promise.race([Promise.resolve().then(() => profile.lookup.files(ctx, slugs, { deadline })), late]);
    return found instanceof Map ? { bySlug: found, state: 'ok' } : { bySlug: new Map(), state: 'unavailable' };
  } catch { return { bySlug: new Map(), state: 'unavailable' }; } finally { clearTimeout(timer); }
}

// A topic's docs, then its code folders that exist.
const topicPaths = (tags, areas, root) => [...areaDocs(tags, areas, root),
  ...tags.flatMap(tag => (areas[tag]?.paths || []).filter(path => path.endsWith('/') && existsSync(join(root, path))))];

/** The ranked files behind `facts`, in their order: `{ files: [{ path, facts, via }], state }`. A change adds
 *  1 / (1 + i/4) to each of its top files, i the rank of its first fact; a named path 1.5; a topic path 0.5. */
export async function filesBehind(ctx, facts, { profile, areas = {}, limit = FILES_LIMIT, perChange = PER_CHANGE, deadline = Date.now() + 1500 } = {}) {
  const slugs = [...new Set(facts.map(fact => fact.slug).filter(Boolean))];
  const { bySlug, state } = await changeFiles(ctx, profile, slugs, deadline);
  const scores = new Map();
  const add = (path, weight, ids, via) => {
    const entry = scores.get(path) ?? scores.set(path, { path, weight: 0, facts: new Set(), via }).get(path);
    entry.weight += weight;
    ids.forEach(id => entry.facts.add(id));
    if (VIA.indexOf(via) < VIA.indexOf(entry.via)) entry.via = via;
  };
  const counted = new Set();
  facts.forEach((fact, i) => {
    const touched = (bySlug.get(fact.slug) ?? []).slice().sort((a, b) => (b.churn || 0) - (a.churn || 0)).slice(0, perChange);
    const named = namedPaths(fact.body, ctx.root);
    if (touched.length && !counted.has(fact.slug)) {
      counted.add(fact.slug);
      const ids = facts.filter(each => each.slug === fact.slug).map(each => each.id);
      for (const { path } of touched) add(path, 1 / (1 + i / 4), ids, 'change');
    }
    for (const path of named) add(path, NAMED, [fact.id], 'named');
    if (!touched.length && !named.length) for (const path of topicPaths(fact.tags || [], areas, ctx.root)) add(path, TOPIC, [fact.id], 'topic');
  });
  const files = [...scores.values()].sort((a, b) => b.weight - a.weight || a.path.localeCompare(b.path)).slice(0, limit)
    .map(({ path, facts: ids, via }) => ({ path, facts: [...ids], via }));
  return { files, state: state === 'unavailable' ? state : files.length ? 'ok' : 'empty' };
}
