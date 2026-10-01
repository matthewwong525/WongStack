// Code areas: which area tags a repo path falls in, from references/areas.json; the docs an area names; the paths a
// change names; and the archived changes that touched a path or an area.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from './store.mjs';

export const AREAS_FILE = fileURLToPath(new URL('../../references/areas.json', import.meta.url));

// Tag -> { definition, paths }. A missing or broken list maps nothing, so no write ever fails on it.
export const loadAreas = (file = AREAS_FILE) => readJson(file, {});

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

// The tags of a path's longest matching prefix, and that prefix's length; equal-length matches all count.
function longestArea(path, areas, root) {
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

export const areasOf = (path, areas, root) => longestArea(path, areas, root).tags;

// The docs the tags' areas name, in list order, once each; a doc this repo lacks is skipped.
export function areaDocs(tags, areas, root) {
  return [...new Set(tags.flatMap(tag => areas[tag]?.docs || []))].filter(doc => existsSync(join(root, doc)));
}

// Every word inside a backticked span of a change's proposal, design, and tasks: the paths it names.
// The name may be an archived change's `archive/<folder>`.
export function changePaths(root, name) {
  const dir = join(root, 'openspec', 'changes', name);
  return ['proposal.md', 'design.md', 'tasks.md'].map(file => join(dir, file)).filter(existsSync)
    .flatMap(file => [...readFileSync(file, 'utf8').matchAll(/`([^`\n]+)`/g)])
    .flatMap(([, span]) => span.split(/[\s"'()]+/).filter(Boolean));
}

// Each area the paths fall in, with the first path that put it there.
export function pathAreas(paths, areas, root) {
  const found = new Map();
  for (const path of paths) for (const tag of areasOf(path, areas, root)) if (!found.has(tag)) found.set(tag, path);
  return found;
}

// newTags plus every area tag the facts use that the store lacks, defined from the list.
export function withAreaTags(existing, facts, newTags = [], areas = loadAreas()) {
  const named = new Set([...existing, ...newTags.map(tag => tag.name)]);
  const missing = [...new Set(facts.flatMap(fact => fact.tags || []))].filter(tag => !named.has(tag) && areas[tag]?.definition);
  return [...newTags, ...missing.map(name => ({ name, definition: areas[name].definition }))];
}

const looksLikePath = word => word.includes('/') || /\.[a-z]+$/i.test(word);
const bare = (path, root) => normalizePath(path, root)?.replace(/\/+$/, '');

// Does an archived change name this path: the path itself, a path inside it, or a folder holding it at least as
// deep as its area's folder? A broad folder like `wiki/` or `.agents/skills/` names too much to count.
function namesPath(named, path, areas, root) {
  const longest = Math.max(longestArea(path, areas, root).longest, longestArea(`${path}/`, areas, root).longest);
  return named.some(word => word === path || word.startsWith(`${path}/`)
    || (path.startsWith(`${word}/`) && word.length + 1 >= longest && word.includes('/')));
}

// Up to `limit` archived changes, newest first: those naming one of the paths, then those sharing only an area.
// Read from the archive on each call, so nothing is kept up to date. `skip` is a change's own name.
export function pastChanges(root, paths, tags, areas, { skip, limit = 5 } = {}) {
  const archive = join(root, 'openspec', 'changes', 'archive');
  if (!existsSync(archive)) return [];
  const asked = [...new Set(paths.filter(looksLikePath).map(path => bare(path, root)).filter(Boolean))];
  const ranked = [[], []];
  for (const folder of readdirSync(archive).sort().reverse()) {
    if (folder.replace(/^\d{4}-\d{2}-\d{2}-/, '') === skip) continue;
    const named = [...new Set(changePaths(root, `archive/${folder}`).filter(looksLikePath).map(word => bare(word, root)).filter(Boolean))];
    if (asked.some(path => namesPath(named, path, areas, root))) ranked[0].push(folder);
    else if ([...pathAreas(named, areas, root).keys()].some(tag => tags.includes(tag))) ranked[1].push(folder);
  }
  return ranked.flat().slice(0, limit).map(folder => {
    const proposal = join(archive, folder, 'proposal.md');
    const title = existsSync(proposal) && readFileSync(proposal, 'utf8').match(/^# (.+)$/m)?.[1];
    return { folder, title: title || folder, proposal: `openspec/changes/archive/${folder}/proposal.md` };
  });
}
