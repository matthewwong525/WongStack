#!/usr/bin/env node
// Release check: a module folder that differs from main raises the version in its VERSION file, so one version names
// one exact folder, an update's merge base. Owner: wiki/maintaining/adding-a-module.md
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMain, parseCli } from './lib-cli.mjs';

const USAGE = 'usage: check-module-versions.mjs [--base <ref>]   run from the repo root; --base defaults to origin/main, else main';
// An older base kept the version in a plugin manifest.
const OLD_MANIFEST = '.claude-plugin/plugin.json';

const git = (root, ...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
const manifestVersion = text => { try { return JSON.parse(text).version ?? null; } catch { return null; } };
const read = path => { try { return readFileSync(path, 'utf8').trim() || null; } catch { return null; } };
const shown = (root, ref) => { const out = git(root, 'show', ref); return out.status === 0 ? out.stdout.trim() || null : null; };
const newer = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }) > 0;

/** A line per module whose version is off: it has no VERSION file, or it changed since `base` at one version. */
export function moduleProblems(root, base) {
  const dir = join(root, '.agents/plugins');
  const names = existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name) : [];
  return names.flatMap(name => {
    const folder = `.agents/plugins/${name}`;
    const now = read(join(root, folder, 'VERSION'));
    if (!now) return [`${folder} has no VERSION file; add one with its version`];
    const before = shown(root, `${base}:${folder}/VERSION`) ?? manifestVersion(shown(root, `${base}:${folder}/${OLD_MANIFEST}`));
    const changed = git(root, 'diff', '--quiet', base, '--', folder).status === 1;
    return before && changed && !newer(now, before) ? [`${folder} differs from ${base}, but its version is still ${now}; raise it in its VERSION file`] : [];
  });
}

if (isMain(import.meta.url)) {
  const { values } = parseCli({ usage: USAGE, options: { base: { type: 'string' } } });
  const root = process.cwd();
  const base = values.base ?? ['origin/main', 'main'].find(ref => git(root, 'rev-parse', '--verify', '--quiet', ref).status === 0);
  const problems = base ? moduleProblems(root, base) : [];
  for (const line of problems) console.error(`module versions: ${line}`);
  console.log(base ? `module versions: ${problems.length ? 'FAIL' : 'ok'}` : 'module versions: no main to compare; nothing checked');
  process.exitCode = problems.length ? 1 : 0;
}
