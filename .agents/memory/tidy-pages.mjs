// The pages WongStack's memory tidy checks beyond the topic pages: each wiki page, the company knowledge copy's
// pages, and each spec, as own|shipped|spec. A shipped page comes from WongStack, so the tidy never edits it.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { knowledgeCopy } from '../skills/memory/scripts/lib/knowledge-copy.mjs';
import { wikiPages } from './lib/links.mjs';

const SPECS = 'openspec/specs';
// Payload groups whose files reach an install from WongStack. `seededBySetup` is left out: setup
// makes those pages once and the install owns them from then on.
const SHIPPED_GROUPS = ['core', 'ui', 'pack', 'scaffold'];

/** The shipped wiki paths of a payload file list: `{ files: Set, dirs: [] }`. */
export function shippedPaths(payload) {
  const groups = SHIPPED_GROUPS.map(name => payload?.[name] || {});
  return {
    files: new Set(groups.flatMap(group => group.files || [])),
    dirs: groups.flatMap(group => group.dirs || []).map(dir => dir.replace(/\/+$/, '')),
  };
}

/** True when the payload ships `path`, by file or by folder. */
export function isShipped(path, { files, dirs }) {
  return files.has(path) || dirs.some(dir => path.startsWith(`${dir}/`));
}

export const kindOf = (path, shipped) => (path.startsWith(`${SPECS}/`) ? 'spec' : isShipped(path, shipped) ? 'shipped' : 'own');

function payloadFiles(root) {
  const file = ['.claude', '.agents'].map(dir => join(root, dir, 'skills/wong-sync/references/payload-files.json')).find(existsSync);
  return file ? JSON.parse(readFileSync(file, 'utf8')) : {};
}

const specPages = root => (existsSync(join(root, SPECS)) ? readdirSync(join(root, SPECS)) : [])
  .map(name => `${SPECS}/${name}/spec.md`).filter(path => existsSync(join(root, path)));

/** `[{ path, kind }]`; company knowledge, when this computer holds a copy, is all the install's own. */
export function tidyPages({ root }) {
  const shipped = shippedPaths(payloadFiles(root));
  const knowledge = knowledgeCopy(root) ? wikiPages(root, 'knowledge') : [];
  return [...wikiPages(root), ...knowledge, ...specPages(root)].map(path => ({ path, kind: kindOf(path, shipped) }));
}

/** Links the run's copy to this computer's company knowledge, as a chat start does: git holds no `knowledge/`, so
 *  the copy has none, and no company page would be a topic or due. With no copy on the computer, it links nothing. */
export async function tidyPrepare({ root }) {
  const { linkCopy, place } = await import('./knowledge.mjs');
  linkCopy(place(root));
}

/** The tools the daily tidy's full-access part refuses: the install's daily deny list, as the daily's own runs. */
export async function tidyDeny({ root }) {
  const { personSettings } = await import('../skills/daily/scripts/daily.mjs');
  const { loadSweeps } = await import('../skills/daily/scripts/worker.mjs');
  const { config } = personSettings({ repo: root });
  return loadSweeps({ project: root, file: config?.sweeps }).deny ?? [];
}
