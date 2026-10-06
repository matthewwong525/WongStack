#!/usr/bin/env node
// Did this change loosen a check without saying why? One answer for CI and /apply.
//
// Agents write almost all the code, and every check has an escape hatch: a skip
// comment, a skipped or deleted test, a lowered limit in a config. CI stays
// green through all of them, and a person who does not read code can not see
// them. So each one needs a reason written where the person reads: a bullet in
// the change's Decision log that starts with `Check:` and names the file, as
// wiki/development/the-change-loop.md#the-gate says.
//
// A file is flagged when the change:
//   - adds a line that turns a check off (a skip comment anywhere, or a
//     skipped, focused, or to-do test in a test file);
//   - deletes a test file, other than by moving it to another test file;
//   - changes a check's settings: a known config file, any workflow file, a
//     script under .github/scripts/ (check-settings.mjs holds that list), or a
//     package.json `test` script or a script it runs. Any change counts, stricter ones too: a script can not
//     tell stricter from looser for every setting.
// Prose (wiki/, openspec/, *.md) is never read for markers, and neither is this
// script, because it names every marker. A change to it is still a settings change.
//
// A flagged file is explained when a proposal.md the change adds or edits,
// under openspec/changes/ or its archive, names it in backticks in a
// Decision-log bullet whose text after the date starts with `Check:`. Only
// changed proposals count, so an old archive never excuses a new loosening.
//
// Prints a Markdown report on stdout for the job summary. Exit 0 when every
// flagged file is explained, 1 when one is not, 2 on a usage error. An empty
// --base (app-untouched.sh found nothing to compare with) prints why and exits 0.
//
// Usage: node .github/scripts/loosened-checks.mjs --base <sha>
//        node .github/scripts/loosened-checks.mjs --worktree

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCli, usageError } from '../../.claude/skills/memory/scripts/lib/cli.mjs';
import { changedFiles, git, isSettings } from './check-settings.mjs';
import { TEST_FILE } from './test-file.mjs';

const USAGE = `usage: node .github/scripts/loosened-checks.mjs --base <sha>
       node .github/scripts/loosened-checks.mjs --worktree

--base <sha>  compare the commit checked out with <sha>
--worktree    compare the working tree, untracked files included, with the base
              app-untouched.sh --worktree finds`;

const SELF = '.github/scripts/loosened-checks.mjs';

// A comment that turns a check off for the lines it covers.
const SKIP_COMMENTS = [
  /Stryker disable/,
  /\b[cv]8 ignore\b/,
  /istanbul ignore\b/,
  /oxlint-disable/,
  /eslint-disable/,
  /biome-ignore/,
  /jscpd:ignore/,
  /@ts-(ignore|expect-error|nocheck)\b/,
];

// A test that no longer runs, or that makes the others not run. Test files only.
const SKIP_TESTS = [
  /\b(it|test|describe|suite)\.(skip|only|todo|skipIf|runIf)\b/,
  /\bt\.(skip|todo)\(/,
  /\b(skip|only|todo)\s*:\s*(true|['"`])/,
];

const PROPOSAL = /^openspec\/changes\/(archive\/)?[^/]+\/proposal\.md$/;

const KIND = {
  skip: 'turns a check off on a line',
  test: 'deletes a test',
  settings: "changes a check's settings",
};

const isProse = path => /^(wiki|openspec)\//.test(path) || path.endsWith('.md');

// Added lines per path, from a zero-context diff; untracked files are added whole.
function addedLines(range, files, worktree) {
  const added = new Map();
  let current = null;
  for (const line of git(['diff', '-U0', '-M', '--no-color', '--no-ext-diff', ...range]).split('\n')) {
    if (line.startsWith('+++ ')) {
      current = line === '+++ /dev/null' ? null : line.slice('+++ b/'.length);
      if (current && !added.has(current)) added.set(current, []);
    } else if (current && line.startsWith('+')) {
      added.get(current).push(line.slice(1));
    }
  }
  if (worktree) {
    for (const { path } of files) {
      if (added.has(path) || !existsSync(path)) continue;
      const text = readFileSync(path, 'utf8');
      if (!text.includes('\0')) added.set(path, text.split('\n'));
    }
  }
  return added;
}

// The file's text at the base or in the change; null when it is absent there.
function reader(base, worktree) {
  const at = (rev, path) => {
    try {
      return git(['show', `${rev}:${path}`]);
    } catch {
      return null;
    }
  };
  return {
    before: path => at(base, path),
    after: path => (worktree ? (existsSync(path) ? readFileSync(path, 'utf8') : null) : at('HEAD', path)),
  };
}

// The `test` script and every script it reaches through `npm run <name>` or `npm test`.
function testScripts(text) {
  if (text === null) return {};
  let scripts;
  try {
    scripts = JSON.parse(text).scripts ?? {};
  } catch {
    return { unreadable: text };
  }
  const reached = {};
  const queue = ['test'];
  while (queue.length) {
    const name = queue.shift();
    if (name in reached || typeof scripts[name] !== 'string') continue;
    reached[name] = scripts[name];
    for (const match of scripts[name].matchAll(/\bnpm (?:run(?:-script)? ([\w:.-]+)|(test)\b)/g)) {
      queue.push(match[1] ?? match[2]);
    }
  }
  return reached;
}

function flag(flags, path, kind) {
  if (path === SELF && kind === 'skip') return;
  if (!flags.has(path)) flags.set(path, new Set());
  flags.get(path).add(kind);
}

// Every flagged path, mapped to the kinds of loosening found in it.
function findFlags(files, added, read) {
  const flags = new Map();
  for (const { status, path, from } of files) {
    for (const p of [path, from].filter(Boolean)) {
      if (isSettings(p)) flag(flags, p, 'settings');
    }
    if (basename(path) === 'package.json'
      && JSON.stringify(testScripts(read.before(from ?? path))) !== JSON.stringify(testScripts(read.after(path)))) {
      flag(flags, path, 'settings');
    }
    const gone = status === 'D' ? path : (status === 'R' && !TEST_FILE.test(path) ? from : null);
    if (gone && TEST_FILE.test(gone)) flag(flags, gone, 'test');
  }
  for (const [path, lines] of added) {
    if (isProse(path)) continue;
    const patterns = TEST_FILE.test(path) ? [...SKIP_COMMENTS, ...SKIP_TESTS] : SKIP_COMMENTS;
    if (lines.some(line => patterns.some(pattern => pattern.test(line)))) flag(flags, path, 'skip');
  }
  return flags;
}

// Paths named in `Check:` bullets of the proposals the change adds or edits.
function explainedPaths(files, read) {
  const explained = new Set();
  for (const { status, path } of files) {
    if (status === 'D' || !PROPOSAL.test(path)) continue;
    const log = (read.after(path) ?? '').split(/^## Decision log\s*$/m)[1]?.split(/^## /m)[0] ?? '';
    for (const bullet of log.split(/^- /m)) {
      const text = bullet.replace(/^\*\*\d{4}-\d{2}-\d{2}\*\*\s*[—–-]+\s*/, '');
      if (!text.startsWith('Check:')) continue;
      for (const match of text.matchAll(/`([^`\n]+)`/g)) explained.add(match[1]);
    }
  }
  return explained;
}

function report(flags, explained) {
  if (!flags.size) return { text: '### Loosened checks\n\nNo check was loosened.\n', ok: true };
  const missing = [];
  const lines = [...flags].sort(([a], [b]) => a.localeCompare(b)).map(([path, kinds]) => {
    const ok = explained.has(path);
    if (!ok) missing.push(path);
    return `- \`${path}\` ${[...kinds].map(kind => KIND[kind]).join('; ')}: ${ok ? 'explained' : '**needs a reason**'}`;
  });
  let text = `### Loosened checks\n\n${lines.join('\n')}\n`;
  if (missing.length) {
    text += '\nFor each file that needs a reason, either switch the check back on, or add a bullet to'
      + " the change's Decision log in `openspec/changes/<name>/proposal.md` that names the file:\n\n"
      + '```text\n'
      + missing.map(path => `- **YYYY-MM-DD** — Check: \`${path}\` <what was loosened>, because <why>.`).join('\n')
      + '\n```\n';
  }
  return { text, ok: !missing.length };
}

// The base app-untouched.sh finds for the working tree.
function worktreeBase() {
  const script = join(dirname(fileURLToPath(import.meta.url)), 'app-untouched.sh');
  const out = execFileSync('bash', [script, '--worktree'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  return /^base=(.*)$/m.exec(out)?.[1] ?? '';
}

function main() {
  const { values } = parseCli({ usage: USAGE, options: { base: { type: 'string' }, worktree: { type: 'boolean' } } });
  if ((values.base === undefined) === !values.worktree) usageError(USAGE, 'give exactly one of --base and --worktree');
  process.chdir(git(['rev-parse', '--show-toplevel']).trim());
  const worktree = Boolean(values.worktree);
  const base = worktree ? worktreeBase() : values.base.trim();
  if (!base) {
    console.log('### Loosened checks\n\nThere was nothing to compare with, so no check was read for loosening.\n');
    return;
  }
  const range = worktree ? [base] : [base, 'HEAD'];
  const files = changedFiles(range, worktree);
  const read = reader(base, worktree);
  const { text, ok } = report(findFlags(files, addedLines(range, files, worktree), read), explainedPaths(files, read));
  console.log(text);
  if (!ok) process.exit(1);
}

main();
