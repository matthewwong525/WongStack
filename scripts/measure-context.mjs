#!/usr/bin/env node
// Fixed source-load accounting, not a runtime token estimator.
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const verbs = ['explore', 'plan', 'apply', 'save', 'continue', 'ship', 'verify'];
const canonical = path => path.replace(/^\.claude\//, '.agents/');
export const countText = text => ({ words: text.trim() ? text.trim().split(/\s+/u).length : 0, bytes: Buffer.byteLength(text) });
const total = records => records.reduce((sum, value) => ({ words: sum.words + value.words, bytes: sum.bytes + value.bytes }), { words: 0, bytes: 0 });

function walk(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(path, entry.name)) : [join(path, entry.name)]);
}

export function measureContext(root, baseline) {
  const before = {};
  for (const [name, counts] of Object.entries(baseline.files)) {
    const path = canonical(name);
    if (before[path]) throw new Error(`duplicate canonical baseline path: ${path}`);
    if (!Number.isInteger(counts.words) || !Number.isInteger(counts.bytes) || counts.words < 0 || counts.bytes < 0) throw new Error(`invalid counts: ${path}`);
    before[path] = counts;
  }
  const owners = new Set(baseline.owners.map(canonical));
  const paths = new Set(owners);
  for (const verb of verbs) {
    const dir = `.agents/skills/${verb}`;
    paths.add(`${dir}/SKILL.md`);
    for (const folder of ['references', 'scripts']) {
      for (const path of walk(join(root, dir, folder))) {
        if (/\.(md|html|mjs|js|sh)$/.test(path)) paths.add(relative(root, path).split('\\').join('/'));
      }
    }
  }
  const after = Object.fromEntries([...paths].sort().map(path => [path, countText(readFileSync(join(root, path), 'utf8'))]));
  const kind = path => owners.has(path) ? 'owners' : path.endsWith('.md') ? 'instructions' : path.endsWith('.html') ? 'html' : 'helpers';
  const inventory = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().map(path => ({ path, kind: kind(path), before: before[path] ?? { words: 0, bytes: 0 }, after: after[path] ?? { words: 0, bytes: 0 } }));
  const categories = Object.fromEntries(['instructions', 'owners', 'html', 'helpers'].map(category => {
    const files = inventory.filter(row => row.kind === category);
    return [category, { before: total(files.map(row => row.before)), after: total(files.map(row => row.after)) }];
  }));
  const issues = [];
  for (const unit of ['words', 'bytes']) {
    if (categories.instructions.after[unit] >= categories.instructions.before[unit]) issues.push(`instruction ${unit} did not decrease`);
  }
  const routes = {};
  for (const [name, route] of Object.entries(baseline.routes)) {
    const counts = (names, source) => {
      const files = [...new Set(names.map(canonical))].sort();
      for (const file of files) if (!source[file]) throw new Error(`${name}: missing required input ${file}`);
      return { files, ...total(files.map(file => source[file])) };
    };
    const a = counts(route.before, before);
    const b = counts(route.after, after);
    routes[name] = { before: a, after: b, increaseReason: route.increaseReason ?? null };
    if (route.requireReduction && (b.words >= a.words || b.bytes >= a.bytes)) issues.push(`${name}: required reduction absent`);
    if ((b.words > a.words || b.bytes > a.bytes) && !route.increaseReason) issues.push(`${name}: unexplained increase`);
  }
  return { baseline: baseline.revision, metric: 'Source words and UTF-8 bytes; not measured runtime tokens', assumptions: baseline.notes, categories, routes, inventory, issues };
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const report = measureContext(root, JSON.parse(readFileSync(join(root, 'scripts/fixtures/context-baseline.json'), 'utf8')));
    if (args.some(arg => !['--json', '--check'].includes(arg))) throw new Error('usage: measure-context.mjs [--json] [--check]');
    if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
    else {
      console.log(report.metric);
      for (const [name, counts] of Object.entries(report.categories)) console.log(`${name}: ${counts.before.words} -> ${counts.after.words} words; ${counts.before.bytes} -> ${counts.after.bytes} bytes`);
      for (const [name, counts] of Object.entries(report.routes)) console.log(`${name}: ${counts.before.words} -> ${counts.after.words} words; ${counts.before.bytes} -> ${counts.after.bytes} bytes${counts.increaseReason ? ` (${counts.increaseReason})` : ''}`);
      for (const issue of report.issues) console.log(`ISSUE: ${issue}`);
    }
    if (args.includes('--check') && report.issues.length) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
