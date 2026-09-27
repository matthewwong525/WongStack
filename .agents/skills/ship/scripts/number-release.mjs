#!/usr/bin/env node
/**
 * Number this branch's release from the default branch's version, right before /ship's checkpoint.
 *
 *     node .claude/skills/ship/scripts/number-release.mjs
 *
 * A change writes its CHANGELOG.md entry as `## Next (patch|minor|major) — <Title>` and leaves VERSION
 * alone. This finds the branch's one entry (the `## Next` or `## X.Y.Z` heading the default branch's
 * CHANGELOG.md lacks), bumps the default branch's VERSION by its level, and writes VERSION and the
 * `## X.Y.Z — <Title>` heading, entry on top, one blank line before every `## ` heading. A numbered entry
 * takes its level from the gap to the newest lower version in the file, so a renumber after another
 * release landed, and a branch that raised VERSION by hand, take the same path.
 *
 * Prints one line:
 *   release=none                  nothing to number (no CHANGELOG.md, or no entry of its own); exit 0
 *   release=X.Y.Z from=A.B.C      numbered; exit 0
 *   behind=yes                    merge origin/<default> first, then run again; exit 3
 * Exit 1 names the problem: two entries, an unknown level, or no VERSION on the default branch.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const USAGE = `usage: number-release.mjs
  Numbers this branch's CHANGELOG.md entry and VERSION from origin/<default branch>.
  Prints release=none, release=X.Y.Z from=A.B.C, or behind=yes (exit 3).`;

const NEXT = /^## Next\b/;
const NEXT_PARTS = /^## Next \((patch|minor|major)\) — (.+)$/;
const NUMBERED = /^## (\d+)\.(\d+)\.(\d+) — (.+)$/;
const LEVELS = ['major', 'minor', 'patch'];

try {
  const { values } = parseArgs({ options: { help: { type: 'boolean' } }, strict: true });
  if (values.help) { console.log(USAGE); process.exit(0); }
} catch (error) {
  console.error(`${error.message}\n${USAGE}`);
  process.exit(2);
}

const fail = message => { console.error(`number-release: ${message}`); process.exit(1); };
const gitOr = (fallback, ...args) => {
  try { return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return fallback; }
};

const root = gitOr('', 'rev-parse', '--show-toplevel') || fail('not inside a git repository');
const changelogPath = join(root, 'CHANGELOG.md');
if (!existsSync(changelogPath)) { console.log('release=none'); process.exit(0); }

const base = gitOr('origin/main', 'symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD');
if (!gitOr('', 'rev-parse', '--verify', '--quiet', `${base}^{commit}`)) fail(`no ${base}; fetch the default branch first`);

const lines = readFileSync(changelogPath, 'utf8').split('\n');
const baseHeadings = new Set(gitOr('', 'show', `${base}:CHANGELOG.md`).split('\n'));
const isEntry = line => NEXT.test(line) || NUMBERED.test(line);
const own = lines.flatMap((line, i) => (isEntry(line) && !baseHeadings.has(line) ? [i] : []));

if (own.length === 0) { console.log('release=none'); process.exit(0); }
if (own.length > 1) fail(`one entry per release, found ${own.length}: ${own.map(i => lines[i]).join(' | ')}`);
if (gitOr('no', 'merge-base', '--is-ancestor', base, 'HEAD') === 'no') { console.log('behind=yes'); process.exit(3); }

const at = own[0];
const heading = lines[at];
const semver = text => text.split('.').map(Number);
const compare = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

// The level: stated in a `## Next` heading, or the gap from a numbered entry to the newest lower version.
let level;
let title;
if (NEXT.test(heading)) {
  const parts = heading.match(NEXT_PARTS);
  if (!parts) fail(`unknown level in "${heading}"; write ## Next (patch|minor|major) — <Title>`);
  [, level, title] = parts;
} else {
  const [, major, minor, patch, name] = heading.match(NUMBERED);
  const version = [major, minor, patch].map(Number);
  const lower = lines
    .filter((line, i) => i !== at && NUMBERED.test(line))
    .map(line => line.match(NUMBERED).slice(1, 4).map(Number))
    .filter(other => compare(other, version) < 0)
    .sort(compare)
    .at(-1);
  if (!lower) fail(`no version below "${heading}" to read its level from; write ## Next (patch|minor|major) — ${name}`);
  level = LEVELS[version.findIndex((part, i) => part !== lower[i])];
  title = name;
}

const from = gitOr('', 'show', `${base}:VERSION`);
if (!/^\d+\.\d+\.\d+$/.test(from)) fail(`${base} has no VERSION to number from`);
const next = semver(from);
const bump = LEVELS.indexOf(level);
next[bump] += 1;
for (let i = bump + 1; i < 3; i++) next[i] = 0;
const release = next.join('.');

// Cut the entry out, renamed, and put it back above the newest entry.
const end = lines.findIndex((line, i) => i > at && line.startsWith('## '));
const block = lines.slice(at, end === -1 ? lines.length : end);
block[0] = `## ${release} — ${title}`;
const rest = [...lines.slice(0, at), ...(end === -1 ? [] : lines.slice(end))];
const top = rest.findIndex(isEntry);
rest.splice(top === -1 ? rest.length : top, 0, ...block);

// One blank line before every `## ` heading, and one newline at the end.
const out = [];
for (const line of rest) {
  if (line.startsWith('## ') && out.length) {
    while (out.at(-1) === '') out.pop();
    out.push('');
  }
  out.push(line);
}
while (out.at(-1) === '') out.pop();

writeFileSync(changelogPath, `${out.join('\n')}\n`);
writeFileSync(join(root, 'VERSION'), `${release}\n`);
console.log(`release=${release} from=${from}`);
