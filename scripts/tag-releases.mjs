#!/usr/bin/env node
// Give every CHANGELOG.md version a `v<version>` tag and a GitHub Release, on the first commit on this
// branch's first-parent line that set VERSION to it. Versions that already have a Release are left alone,
// so a run on each push to main labels the new version and fills in any that a failed run missed.
// Meta-only: .github/workflows/release.yml runs it; no target receives it.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseCli } from './lib-cli.mjs';

const USAGE = `usage: tag-releases.mjs [--dry-run]
  Creates the missing tag and GitHub Release for each version in CHANGELOG.md.
  --dry-run  print what it would create, and create nothing`;

const HEADING = /^## (\d+\.\d+\.\d+) — (.+)$/;

const run = (cmd, args, input) => execFileSync(cmd, args, { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'inherit'] }).trim();
const lines = text => text.split('\n').filter(Boolean);

// [{ version, title, body }] from each `## X.Y.Z — Title` section, newest first.
function changelogEntries(text) {
  const entries = [];
  for (const line of text.split('\n')) {
    const heading = line.match(HEADING);
    if (heading) entries.push({ version: heading[1], title: heading[2], body: [] });
    else if (line.startsWith('## ')) entries.push(null);
    else entries.at(-1)?.body.push(line);
  }
  return entries.filter(Boolean).map(entry => ({ ...entry, body: entry.body.join('\n').trim() }));
}

// Relative links point into the repo at the tag, because a Release page has no base path.
const absoluteLinks = (body, repo, tag) =>
  repo ? body.replace(/\]\((?![a-z]+:|#)([^)]+)\)/g, `](https://github.com/${repo}/blob/${tag}/$1)`) : body;

const semver = version => version.split('.').map(Number);
const newer = (a, b) => semver(a).reduce((order, part, i) => order || part - semver(b)[i], 0) > 0;

// version → the first first-parent commit whose VERSION file holds it.
function versionCommits() {
  const commits = new Map();
  for (const sha of lines(run('git', ['log', '--first-parent', '--reverse', '--format=%H', 'HEAD', '--', 'VERSION']))) {
    let version;
    try { version = run('git', ['show', `${sha}:VERSION`]); } catch { continue; }
    if (!commits.has(version)) commits.set(version, sha);
  }
  return commits;
}

const { values } = parseCli({ usage: USAGE, options: { 'dry-run': { type: 'boolean' } } });
const entries = changelogEntries(readFileSync('CHANGELOG.md', 'utf8'));
const commits = versionCommits();
const released = new Set(lines(run('gh', ['release', 'list', '--limit', '1000', '--json', 'tagName', '--jq', '.[].tagName'])));
const tags = new Set(lines(run('git', ['tag', '--list', 'v*'])));
const latest = entries.map(entry => entry.version).reduce((a, b) => (a && !newer(b, a) ? a : b), null);
const missing = [];

for (const { version, title, body } of entries.toReversed()) {
  const tag = `v${version}`;
  if (released.has(tag)) continue;
  const sha = commits.get(version);
  if (!sha) { missing.push(version); continue; }
  const where = tags.has(tag) ? ['--verify-tag'] : ['--target', sha];
  const args = ['release', 'create', tag, ...where, '--title', `${version} — ${title}`, '--notes-file', '-', `--latest=${version === latest}`];
  console.log(`${values['dry-run'] ? 'would create' : 'creating'} ${tag} at ${tags.has(tag) ? 'its existing tag' : sha.slice(0, 7)}`);
  if (!values['dry-run']) run('gh', args, absoluteLinks(body, process.env.GITHUB_REPOSITORY, tag));
}

if (missing.length) {
  console.error(`tag-releases: no commit set VERSION to ${missing.join(', ')}; fix CHANGELOG.md or VERSION history.`);
  process.exitCode = 1;
}
