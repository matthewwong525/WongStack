/**
 * What counts as a check's settings, and which files a change touches. One copy for
 * `loosened-checks.mjs`, which wants a written reason when a setting changes, and for
 * `checks.mjs`, which proves the app's checks still fail when one does, so the two lists
 * can not drift.
 */
import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';

const SETTINGS_FILE = [
  /^vitest\.config\./,
  /^jest\.config\./,
  /^stryker\.conf/,
  /^stryker\.config\./,
  /^\.oxlintrc/,
  /^\.eslintrc/,
  /^eslint\.config\./,
  /^biome\.jsonc?$/,
  /^\.jscpd\.json$/,
  /^knip\.jsonc?$/,
  /^knip\.config\./,
  /^tsconfig.*\.json$/,
  /^\.c8rc/,
  /^\.nycrc/,
];

/** A known config file, any workflow file, or a script under .github/scripts/. */
export const isSettings = path =>
  /^\.github\/workflows\/[^/]+\.ya?ml$/.test(path)
  || path.startsWith('.github/scripts/')
  || SETTINGS_FILE.some(pattern => pattern.test(basename(path)));

/** Git's answer as text, from `cwd` when given, with odd file names left as they are. */
export function git(args, cwd) {
  return execFileSync('git', ['-c', 'core.quotePath=false', ...args], { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}

/** The change as a list of { status, path, from }, where `from` is set for a rename. */
export function changedFiles(range, worktree, cwd) {
  const fields = git(['diff', '--name-status', '-M', '-z', ...range], cwd).split('\0').filter(Boolean);
  const files = [];
  for (let i = 0; i < fields.length;) {
    const status = fields[i++][0];
    if (status === 'R' || status === 'C') {
      const from = fields[i++];
      files.push({ status, from, path: fields[i++] });
    } else {
      files.push({ status, path: fields[i++] });
    }
  }
  if (worktree) {
    for (const path of git(['ls-files', '--others', '--exclude-standard', '-z'], cwd).split('\0').filter(Boolean)) {
      files.push({ status: 'A', path });
    }
  }
  return files;
}
