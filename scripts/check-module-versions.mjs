#!/usr/bin/env node
// Release check: a module folder that differs from main raises its version in both plugin.json files, so one version
// names one exact folder, an update's merge base. Owner: wiki/maintaining/adding-a-module.md
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMain, parseCli } from './lib-cli.mjs';

const USAGE = 'usage: check-module-versions.mjs [--base <ref>]   run from the repo root; --base defaults to origin/main, else main';
const MANIFESTS = ['.claude-plugin/plugin.json', '.codex-plugin/plugin.json'];

const git = (root, ...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
const version = text => { try { return JSON.parse(text).version ?? null; } catch { return null; } };
const read = path => { try { return readFileSync(path, 'utf8'); } catch { return ''; } };
const newer = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }) > 0;

/** A line per module whose version is off: its two manifests differ, or it changed since `base` at one version. */
export function moduleProblems(root, base) {
  const dir = join(root, '.agents/plugins');
  const names = existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name) : [];
  return names.flatMap(name => {
    const folder = `.agents/plugins/${name}`;
    const [now, other] = MANIFESTS.map(file => version(read(join(root, folder, file))));
    if (now !== other) return [`${folder}: its two plugin.json versions differ (${now}, ${other}); give both the same version`];
    const before = version(git(root, 'show', `${base}:${folder}/${MANIFESTS[0]}`).stdout);
    const changed = git(root, 'diff', '--quiet', base, '--', folder).status === 1;
    return before && changed && !newer(now, before) ? [`${folder} differs from ${base}, but its version is still ${now}; raise it in both plugin.json files`] : [];
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
