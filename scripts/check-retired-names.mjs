#!/usr/bin/env node
// Release check: no live file names what scripts/retired-names.json retired, save the files an entry allows.
// An exception for a file that is gone, or that lacks the name, fails too. Owner: .claude/rules/payload.md

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
const tracked = listed.stdout.split('\0').filter(Boolean);
const files = tracked.filter(file => !EXEMPT.some(re => re.test(file)));
// null: a deleted-but-tracked file or a symlinked directory
const read = file => {
  try {
    return readFileSync(join(root, file), 'utf8');
  } catch {
    return null;
  }
};

const hits = [];
for (const file of files) {
  const text = read(file);
  if (text === null || text.includes('\0')) continue; // gone, or binary
  const lines = text.split('\n');
  for (const { name, replacement, allow = [] } of entries) {
    if (allow.includes(file) || !text.includes(name)) continue;
    lines.forEach((line, i) => {
      if (line.includes(name)) hits.push(`${file}:${i + 1}: ${name} — retired; use ${replacement}`);
    });
  }
}

// A dead exception hides nothing today, and would hide the name if the file took it again.
const dead = [];
const isTracked = new Set(tracked);
for (const { name, allow = [] } of entries) {
  for (const path of allow) {
    const text = isTracked.has(path) ? read(path) : null;
    if (text === null) dead.push(`${LIST}: ${name} — allows ${path}, which is not a tracked file`);
    else if (!text.includes(name)) dead.push(`${LIST}: ${name} — allows ${path}, which does not hold the name`);
  }
}

for (const line of [...hits, ...dead]) console.error(line);
if (hits.length) console.error(`\n${hits.length} mention(s) of a retired name. Reword, or add the file to that entry's "allow" in ${LIST} with a reason.`);
if (dead.length) console.error(`\n${dead.length} dead exception(s). Remove each path from its entry's "allow" in ${LIST}; keep the name.`);
if (hits.length || dead.length) process.exit(1);
console.log(`retired names: none of ${entries.length} retired names appear outside their allowed files`);
