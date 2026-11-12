#!/usr/bin/env node
// By hand, signed in to memory, never in CI: for the newest N shipped changes, ask memory the change's title with only
// older facts, build the files list with the real filesBehind, and count how often it names a file the change touched.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAreas } from '../../../.agents/plugins/memory/scripts/lib/areas.mjs';
import { FILES_LIMIT, filesBehind } from '../../../.agents/plugins/memory/scripts/lib/files.mjs';
import { loadProfile } from '../../../.agents/plugins/memory/scripts/lib/store.mjs';

const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const N = Number(process.argv[2]) || 60;
const ctx = { root };
const profile = await loadProfile(ctx);
const areas = await loadAreas(ctx, profile);
const STOP = new Set('the a an and or of to in on for with its it is are be can any your you from by at as that this then not no each one new own'.split(' '));
const words = text => text.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length > 2 && !STOP.has(word));
// Facts written before the change, not about it: what memory knew when the change began.
function olderFacts(title, slug, date) {
  const out = execFileSync(process.execPath, [join(root, '.claude/skills/memory/scripts/memory.mjs'), 'search', ...words(title),
    '--until', date, '--limit', '16', '--json'], { cwd: root, encoding: 'utf8' });
  return JSON.parse(out).facts.filter(fact => fact.slug !== slug && fact.created_at.slice(0, 10) < date).slice(0, 8);
}

const rows = [];
for (const folder of readdirSync(join(root, 'openspec/changes/archive')).sort().reverse().slice(0, N)) {
  const date = folder.slice(0, 10), slug = folder.slice(11);
  const touched = new Set(((await profile.lookup.files(ctx, [slug], { deadline: Date.now() + 10000 })).get(slug) ?? []).map(file => file.path));
  const title = readFileSync(join(root, 'openspec/changes/archive', folder, 'proposal.md'), 'utf8').match(/^# (.+)$/m)?.[1] || slug;
  if (!touched.size || /^proposal$/i.test(title)) continue;
  let facts = [];
  try { facts = olderFacts(title, slug, date); } catch (error) { console.error(`${slug}: search failed (${error.message.split('\n')[0]})`); }
  const started = performance.now();
  const { files, state } = await filesBehind(ctx, facts, { profile, areas });
  const ms = performance.now() - started;
  const right = files.filter(file => touched.has(file.path)).length;
  rows.push({ slug, right, listed: files.length, ms, state });
  console.log(`${slug.padEnd(44)} right ${right}/${files.length} · ${Math.round(ms)} ms${state === 'unavailable' ? ' · unavailable' : ''}`);
}
const hit = rows.filter(row => row.right > 0).length;
const times = rows.map(row => row.ms).sort((a, b) => a - b);
const median = times.length ? (times[(times.length - 1) >> 1] + times[times.length >> 1]) / 2 : 0;
console.log(`\nChanges with a right file: ${hit} of ${rows.length} (${Math.round(100 * hit / Math.max(1, rows.length))}%)`);
console.log(`Right files per answer: ${(rows.reduce((sum, row) => sum + row.right, 0) / Math.max(1, rows.length)).toFixed(1)} of ${FILES_LIMIT}`);
console.log(`Median added time: ${Math.round(median)} ms`);
