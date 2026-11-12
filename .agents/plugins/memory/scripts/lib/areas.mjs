// Areas: the profile's topics as tag -> { definition, paths, docs, aliases, kind, page }; which tags a repo path
// falls in; and the docs an area names.
import { existsSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';
import { loadProfile } from './store.mjs';

export const areaMap = topics => Object.fromEntries(topics.map(({ tag, summary, paths = [], docs = [], aliases = [], kind, page }) =>
  [tag, { definition: summary, paths, docs, aliases, kind, page }]));

// A missing profile or a broken topic list maps nothing, so no write ever fails on it.
export async function loadAreas(ctx, profile) {
  try { return areaMap(await (profile ?? await loadProfile(ctx))?.topics?.(ctx) ?? []); } catch { return {}; }
}

// The topic a tag names, through the areas' alias lists and the store's own aliases; null for a tag with no page.
export function topicNamer(areas, tagRows = []) {
  const alias = new Map([...tagRows.filter(row => row.alias_of).map(row => [row.name, row.alias_of]),
    ...Object.entries(areas).flatMap(([tag, area]) => (area.aliases || []).map(name => [name, tag]))]);
  return tag => [tag, alias.get(tag)].find(name => name && areas[name]?.page) ?? null;
}

// A repo-relative path, with .claude/ and .codex/ read as .agents/; null for a path outside the repo.
export function normalizePath(path, root) {
  let rel = path.replace(/^\.\//, '');
  if (isAbsolute(rel)) {
    if (!root) return null;
    rel = relative(root, rel);
    if (rel.startsWith('..') || isAbsolute(rel)) return null;
  }
  return rel.replace(/^\.(?:claude|codex)\//, '.agents/');
}

// The repo path a path really is, through any symlinked folder, so one file has one name; null when it is missing.
export function realPath(path, root) {
  try {
    const rel = relative(realpathSync(root), realpathSync(join(root, path)));
    return rel && !rel.startsWith('..') && !isAbsolute(rel) ? rel : null;
  } catch { return null; }
}

// The tags of a path's longest matching prefix, and that prefix's length; equal-length matches all count.
export function longestArea(path, areas, root) {
  const rel = normalizePath(path, root);
  let longest = 0;
  let tags = [];
  for (const [tag, { paths = [] }] of Object.entries(areas)) {
    for (const prefix of paths) {
      if (!rel?.startsWith(prefix) || prefix.length < longest) continue;
      if (prefix.length > longest) { longest = prefix.length; tags = []; }
      tags.push(tag);
    }
  }
  return { tags: [...new Set(tags)], longest };
}

// A path's areas: its longest matching folder prefix, plus each area that names it among its docs, so a spec
// or wiki page lands on its own subject, not only the folder that holds it.
export function areasOf(path, areas, root) {
  const rel = normalizePath(path, root);
  const named = rel ? Object.keys(areas).filter(tag => (areas[tag].docs || []).includes(rel)) : [];
  return [...new Set([...longestArea(path, areas, root).tags, ...named])];
}

// The docs the tags' areas name, in list order, once each; a doc this repo lacks is skipped.
export function areaDocs(tags, areas, root) {
  return [...new Set(tags.flatMap(tag => areas[tag]?.docs || []))].filter(doc => existsSync(join(root, doc)));
}

// Each area the paths fall in, with the first path that put it there.
export function pathAreas(paths, areas, root) {
  const found = new Map();
  for (const path of paths) for (const tag of areasOf(path, areas, root)) if (!found.has(tag)) found.set(tag, path);
  return found;
}

// newTags plus every topic tag the facts use that the store lacks, defined from its summary.
export function withAreaTags(existing, facts, newTags, areas) {
  const named = new Set([...existing, ...(newTags || []).map(tag => tag.name)]);
  const missing = [...new Set(facts.flatMap(fact => fact.tags || []))].filter(tag => !named.has(tag) && areas[tag]?.definition);
  return [...(newTags || []), ...missing.map(name => ({ name, definition: areas[name].definition }))];
}
