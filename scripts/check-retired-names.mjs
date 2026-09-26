#!/usr/bin/env node
// Release check: does any live file still name something WongStack removed?
//
// Specs, skills, and wiki pages drift when a change removes or renames a feature
// and misses a mention elsewhere. OpenSpec validates a spec's shape, not whether
// its words are still true, so a stale name passes every other check. 24.0.3
// cleaned out mentions of `notes/`, the separate memory Worker, and removed
// OpenSpec commands that earlier removals had missed.
//
// scripts/retired-names.json lists each retired name, what replaced it, and the
// files allowed to keep naming it (a spec saying the command must stay gone, a
// migration step for older installs). CHANGELOG.md and openspec/changes/ record
// history and are never checked. Names are matched as literal text.
//
// Owner: .claude/rules/payload.md — removing or renaming a payload feature adds
// its old name to the list in the same change.

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCli } from './lib-cli.mjs';

const LIST = 'scripts/retired-names.json';
const EXEMPT = [/^CHANGELOG\.md$/, /^openspec\/changes\//, new RegExp(`^${LIST.replace(/\./g, '\\.')}$`)];

parseCli({ usage: 'usage: check-retired-names.mjs  (run from the repo root)' });
const root = process.cwd();
const entries = JSON.parse(readFileSync(join(root, LIST), 'utf8'));

const listed = spawnSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' });
if (listed.status !== 0) {
  console.error(`retired names: git ls-files failed: ${listed.stderr.trim()}`);
  process.exit(1);
}
const files = listed.stdout.split('\0').filter(file => file && !EXEMPT.some(re => re.test(file)));

const hits = [];
for (const file of files) {
  let text;
  try {
    text = readFileSync(join(root, file), 'utf8');
  } catch {
    continue; // a deleted-but-tracked file or a symlinked directory
  }
  if (text.includes('\0')) continue; // binary
  const lines = text.split('\n');
  for (const { name, replacement, allow = [] } of entries) {
    if (allow.includes(file) || !text.includes(name)) continue;
    lines.forEach((line, i) => {
      if (line.includes(name)) hits.push(`${file}:${i + 1}: ${name} — retired; use ${replacement}`);
    });
  }
}

if (hits.length) {
  for (const hit of hits) console.error(hit);
  console.error(`\n${hits.length} mention(s) of a retired name. Reword, or add the file to that entry's "allow" in ${LIST} with a reason.`);
  process.exit(1);
}
console.log(`retired names: none of ${entries.length} retired names appear outside their allowed files`);
