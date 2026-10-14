#!/usr/bin/env node
// Did this change loosen a check without saying why? One answer for CI and /apply.
// What is flagged, and the `Check:` bullet that explains it: wiki/development/loosened-checks.md

import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCli, usageError } from '../../.claude/skills/memory/scripts/lib/cli.mjs';
import { readSpec, rewrittenRequirements, sameJourney, scenarioDigest } from '../../.claude/skills/verify/scripts/kept-promises.mjs';
import { changedFiles, git, isSettings } from './check-settings.mjs';
import { TEST_FILE } from './test-file.mjs';

const USAGE = `usage: node .github/scripts/loosened-checks.mjs --base <sha>
       node .github/scripts/loosened-checks.mjs --worktree

--base <sha>  compare the commit checked out with <sha>
--worktree    compare the working tree, untracked files included, with the base
              app-untouched.sh --worktree finds`;

const SELF = '.github/scripts/loosened-checks.mjs';

// A base holding no files, such as a new install's `Start the project` commit, has no check to loosen.
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';

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
const DELTA_SPEC = /^openspec\/changes\/(?:archive\/)?[^/]+\/specs\/([^/]+)\/spec\.md$/;

// A kept check, by where verify-journeys.mjs keeps them.
const isKept = path => path.startsWith('.agents/verification/journeys/') && path.endsWith('.json') && basename(path) !== 'replay.json';

const KIND = {
  skip: 'turns a check off on a line',
  test: 'deletes a test',
  settings: "changes a check's settings",
  kept: 'changes or removes a kept check',
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
      // A folder link such as `.claude -> .agents` lists as one untracked path; reading it would crash.
      if (added.has(path) || !existsSync(path) || !lstatSync(path).isFile()) continue;
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
      // A file new in the change is absent at the base; Git's `fatal:` would only alarm the reader.
      return execFileSync('git', ['-c', 'core.quotePath=false', 'show', `${rev}:${path}`], {
        encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'],
      });
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

// A kept check as an object, or null when its text is absent or unreadable.
function journeyOf(text) {
  try {
    const journey = JSON.parse(text ?? '');
    return journey !== null && typeof journey === 'object' ? journey : null;
  } catch {
    return null;
  }
}

// Each requirement the change's own delta specs rewrite, as JSON of [capability, requirement].
function rewrittenByDeltas(files, read) {
  const own = new Set();
  for (const { status, path } of files) {
    const capability = status === 'D' ? null : DELTA_SPEC.exec(path)?.[1];
    if (!capability) continue;
    for (const name of rewrittenRequirements(readSpec(read.after(path) ?? ''))) own.add(JSON.stringify([capability, name]));
  }
  return own;
}

// Whether the change rewrites or removes the promise a kept check points at.
function promiseMoved(journey, read, deltas) {
  const { capability, requirement, scenario } = journey?.scenario ?? {};
  if (![capability, requirement, scenario].every(part => typeof part === 'string') || !/^[a-z0-9][a-z0-9-]*$/.test(capability)) return false;
  if (deltas.has(JSON.stringify([capability, requirement]))) return true;
  const spec = `openspec/specs/${capability}/spec.md`;
  const at = text => scenarioDigest(readSpec(text ?? ''), { requirement, scenario });
  return at(read.before(spec)) !== at(read.after(spec));
}

// The kept checks the change weakens: the path to name for each, never one it adds.
function weakenedKept(files, read) {
  const deltas = rewrittenByDeltas(files, read);
  const weakened = [];
  for (const { status, path, from } of files) {
    const was = from ?? path;
    if (!['M', 'T', 'R', 'D'].includes(status) || !isKept(was)) continue;
    const before = journeyOf(read.before(was));
    const gone = status === 'D' || !isKept(path);
    if (!gone && sameJourney(before, journeyOf(read.after(path)))) continue;
    // The base says which promise the check guards; the change's own copy only when the base's is unreadable.
    if (promiseMoved(before ?? journeyOf(gone ? null : read.after(path)), read, deltas)) continue;
    weakened.push(gone ? was : path);
  }
  return weakened;
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
  for (const path of weakenedKept(files, read)) flag(flags, path, 'kept');
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
  if (git(['rev-parse', `${base}^{tree}`]).trim() === EMPTY_TREE) {
    console.log("### Loosened checks\n\nThere was nothing to loosen: this is the project's first change.\n");
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
