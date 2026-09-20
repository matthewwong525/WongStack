#!/usr/bin/env node
// Retire only the old WongStack-owned OpenSpec 1.8.0 generated skills.
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const hashes = JSON.parse(readFileSync(resolve(here, '../references/generated-openspec-hashes.json'), 'utf8')).skills;
const root = resolve(process.argv[2] || '.');
const apply = process.argv.includes('--apply');
const recordPath = join(root, '.claude/.wong-stack.json');
if (!existsSync(recordPath)) { console.error('migration: no WongStack install record; no file removed'); process.exit(2); }
const record = JSON.parse(readFileSync(recordPath, 'utf8'));
if (!record.upstream?.repo || !/wongstack/i.test(record.upstream.repo)) {
  console.error('migration: upstream ownership is not recorded; no file removed');
  process.exit(2);
}
const skillRoots = [...new Set(['.claude/skills', '.agents/skills']
  .map(path => join(root, path)).filter(existsSync).map(realpathSync))];
const found = [];
const unresolved = [];
for (const skillRoot of skillRoots) {
  const marker = join(skillRoot, '.openspec-target');
  const ownedMarker = existsSync(marker) && ['agents', 'claude', 'codex'].includes(readFileSync(marker, 'utf8').trim());
  for (const name of readdirSync(skillRoot).filter(name => name.startsWith('openspec-'))) {
    const expected = hashes[name];
    const dir = join(skillRoot, name);
    if (!ownedMarker) { unresolved.push(`${name}: no known OpenSpec target marker; ownership unclear`); continue; }
    if (!expected) { unresolved.push(`${name}: not a known WongStack-generated skill`); continue; }
    if (!lstatSync(dir).isDirectory()) { unresolved.push(`${name}: not a skill directory`); continue; }
    const files = readdirSync(dir);
    if (files.length !== 1 || files[0] !== 'SKILL.md') { unresolved.push(`${name}: extra or missing files`); continue; }
    const body = readFileSync(join(dir, 'SKILL.md'), 'utf8');
    const normalized = body.replace(/^user-invocable: false\r?\n/m, '');
    const actual = createHash('sha256').update(normalized).digest('hex');
    if (actual !== expected) { unresolved.push(`${name}: content differs from known generated version`); continue; }
    found.push({ name, dir });
  }
}
for (const item of found) {
  if (apply) rmSync(item.dir, { recursive: true });
  console.log(`${apply ? 'retired' : 'would retire'}: ${item.name}`);
}
for (const skillRoot of skillRoots) {
  const marker = join(skillRoot, '.openspec-target');
  if (!existsSync(marker)) continue;
  const markerText = readFileSync(marker, 'utf8').trim();
  if (['agents', 'claude', 'codex'].includes(markerText) && unresolved.length === 0) {
    if (apply) rmSync(marker);
    console.log(`${apply ? 'retired' : 'would retire'}: .openspec-target`);
  } else unresolved.push('.openspec-target: unknown content or unresolved skill migration');
}
for (const issue of unresolved) console.error(`preserved: ${issue}`);
console.log(`migration: ${found.length} known skills, ${unresolved.length} unresolved`);
if (unresolved.length) process.exitCode = 2;
