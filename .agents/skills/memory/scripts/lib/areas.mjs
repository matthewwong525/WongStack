// Code areas: which area tags a repo path falls in, from references/areas.json, and the paths a change names.
import { existsSync, readFileSync } from 'node:fs';
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

// The tags of a path's longest matching prefix; equal-length matches all count.
export function areasOf(path, areas, root) {
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
  return [...new Set(tags)];
}

// Every word inside a backticked span of the change's proposal, design, and tasks: the paths it names.
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
