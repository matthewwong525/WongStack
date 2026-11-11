#!/usr/bin/env node
// Where a payload file lands in an install, and its text there: a module folder ships from `.agents/plugins/<name>/`
// to `.agents/skills/<name>/`, and a Markdown link into it follows. Doc: ../references/payload-manifest.md
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

/** A logical path where an install keeps it. */
export function installPath(path, mapped) {
  const pair = mapped.find(([from]) => under(path, from));
  return pair ? pair[1] + path.slice(pair[0].length) : path;
}

const LINK = /(\]\()([^)\s]+)|^( {0,3}\[[^\]]+\]:[ \t]*<?)([^\s>]+)/gm;

/** A Markdown file's text for its install path: each relative link into a mapped folder points at its install path. */
export function installText(sourcePath, text, mapped) {
  if (!sourcePath.endsWith('.md') || !mapped.length) return text;
  const from = posix.dirname(physical(sourcePath));
  const at = posix.dirname(physical(installPath(logical(sourcePath), mapped)));
  return text.replace(LINK, (whole, open, target, refOpen, refTarget) => {
    const link = target ?? refTarget;
    if (/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(link)) return whole;
    const [path, anchor] = link.split(/(?=#)/);
    const resolved = logical(posix.normalize(posix.join(from, path)));
    const moved = installPath(resolved, mapped);
    const relative = (posix.relative(at, physical(moved)) || '.') + (path.endsWith('/') ? '/' : '');
    return posix.normalize(relative) === posix.normalize(path) ? whole : (open ?? refOpen) + relative + (anchor ?? '');
  });
}

if (isMain(import.meta.url)) {
  const { values, positionals } = parseCli({ usage: USAGE, options: { source: { type: 'string' } }, allowPositionals: true });
  if (!values.source || positionals.length !== 1) usageError(USAGE);
  const mapped = mappedDirs(JSON.parse(readFileSync(join(values.source, INVENTORY), 'utf8')));
  const path = logical(positionals[0]);
  const raw = readFileSync(join(values.source, physical(path)));
  process.stdout.write(path.endsWith('.md') ? installText(path, raw.toString('utf8'), mapped) : raw);
}
