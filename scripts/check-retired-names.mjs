#!/usr/bin/env node
// Release check: does any live file still name something WongStack removed? scripts/retired-names.json lists
// each retired name and the files that may keep it. Owner: .claude/rules/payload.md

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
