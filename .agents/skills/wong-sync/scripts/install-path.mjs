#!/usr/bin/env node
// Where a payload file lands in an install, and its text there: a module folder ships from `.agents/plugins/<name>/`
// to `.agents/skills/<name>/`, and a link, import, or repo path into it follows. Doc: ../references/payload-manifest.md
import { readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';

const USAGE = 'usage: install-path.mjs --source <source checkout> <source path>   prints the file as an install receives it';
export const INVENTORY = '.agents/skills/wong-sync/references/payload-files.json';
const CATEGORIES = ['core', 'ui', 'pack', 'scaffold'];

const logical = path => path.replace(/^\.(?:agents|codex)(?=\/|$)/, '.claude');
const physical = path => path.replace(/^\.claude(?=\/|$)/, '.agents');
const under = (path, dir) => path === dir || path.startsWith(`${dir}/`);

/** Every `[source folder, install folder]` pair the manifest maps, in logical `.claude/` form. */
export const mappedDirs = manifest => CATEGORIES.flatMap(name => Object.entries(manifest[name]?.mapped ?? {}));

/** The mapped pair that holds a logical path, or undefined: a nested entry wins over its parent's. */
export const pairFor = (path, mapped) => mapped.filter(([from]) => under(path, from)).sort((a, b) => b[0].length - a[0].length)[0];

/** A logical path where an install keeps it. */
export function installPath(path, mapped) {
  const pair = pairFor(path, mapped);
  return pair ? pair[1] + path.slice(pair[0].length) : path;
}

const LINK = /(\]\()([^)\s]+)|^( {0,3}\[[^\]]+\]:[ \t]*<?)([^\s>]+)/gm;
const SPECIFIER = /(\bfrom\s*['"]|\bimport\s*\(\s*['"]|\bimport\s+['"])(\.{1,2}\/[^'"]*)/g;
// A repo path into a module: in a script anywhere but a web address, in Markdown only after `--show-toplevel)/` or
// `node `, so a setup guide's source paths stay the source's.
const ROOTED = { script: /(?<!https?:\/\/\S*)\.(?:claude|agents)\/plugins\/[\w.-]+(?:\/[\w.-]+)*/g,
  md: /(?<=--show-toplevel\)\/|\bnode )\.(?:claude|agents)\/plugins\/[\w.-]+(?:\/[\w.-]+)*/g };
/** True for a file whose text an install may rewrite; any other file is copied byte for byte. */
export const installsAsText = path => /\.(md|mjs|js|sh)$/.test(path);

/** A file's text for its install path: each relative Markdown link and script import into a mapped folder points
 * at its install path, and so does each repo path in a mapped folder's own file, such as `.claude/plugins/<name>/x`. */
export function installText(sourcePath, text, mapped) {
  if (!installsAsText(sourcePath) || !mapped.length) return text;
  const from = posix.dirname(physical(sourcePath));
  const at = posix.dirname(physical(installPath(logical(sourcePath), mapped)));
  const relocate = (whole, open, path, anchor = '') => {
    const resolved = logical(posix.normalize(posix.join(from, path)));
    const moved = installPath(resolved, mapped);
    let relative = (posix.relative(at, physical(moved)) || '.') + (path.endsWith('/') ? '/' : '');
    if (path.startsWith('./') && !relative.startsWith('.')) relative = `./${relative}`;
    return posix.normalize(relative) === posix.normalize(path) ? whole : open + relative + anchor;
  };
  let out = text;
  if (sourcePath.endsWith('.md')) {
    out = out.replace(LINK, (whole, open, target, refOpen, refTarget) => {
      const link = target ?? refTarget;
      if (/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(link)) return whole;
      const [path, anchor] = link.split(/(?=#)/);
      return relocate(whole, open ?? refOpen, path, anchor);
    });
  }
  if (/\.m?js$/.test(sourcePath)) out = out.replace(SPECIFIER, (whole, open, path) => relocate(whole, open, path));
  if (pairFor(logical(sourcePath), mapped)) {
    out = out.replace(ROOTED[sourcePath.endsWith('.md') ? 'md' : 'script'], path => {
      const moved = installPath(logical(path), mapped);
      return moved === logical(path) ? path : path.slice(0, path.indexOf('/')) + moved.slice(moved.indexOf('/'));
    });
  }
  return out;
}

if (isMain(import.meta.url)) {
  const { values, positionals } = parseCli({ usage: USAGE, options: { source: { type: 'string' } }, allowPositionals: true });
  if (!values.source || positionals.length !== 1) usageError(USAGE);
  const mapped = mappedDirs(JSON.parse(readFileSync(join(values.source, INVENTORY), 'utf8')));
  const path = logical(positionals[0]);
  const raw = readFileSync(join(values.source, physical(path)));
  process.stdout.write(installsAsText(path) ? installText(path, raw.toString('utf8'), mapped) : raw);
}
