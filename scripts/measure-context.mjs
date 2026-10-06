#!/usr/bin/env node
// Fixed source-load accounting, not a runtime token estimator.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli } from './lib-cli.mjs';

// The vendored browser skill is upstream text; every other skill folder is WongStack-authored.
const vendored = new Set(['agent-browser']);
// A skill marked `disable-model-invocation: true` runs only when a person types it or another skill
// names its file: no session loads its description, and the assistant can not pull its text in on its
// own. Its files are counted as `on-call`, apart from the instruction total the check holds down.
export const callOnly = text => /^disable-model-invocation:\s*true\s*$/m.test(text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '');
// Every other skill's `description:`, joined: what each session reads before the first message.
export const DESCRIPTIONS = 'skill-descriptions';
const canonical = path => path.replace(/^\.claude\//, '.agents/');
export const countText = text => ({ words: text.trim() ? text.trim().split(/\s+/u).length : 0, bytes: Buffer.byteLength(text) });
const total = records => records.reduce((sum, value) => ({ words: sum.words + value.words, bytes: sum.bytes + value.bytes }), { words: 0, bytes: 0 });

function walk(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(path, entry.name)) : [join(path, entry.name)]);
}

const skillDirs = root => {
  const skills = join(root, '.agents/skills');
  return existsSync(skills) ? readdirSync(skills, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort() : [];
};

/** The `description:` value of a SKILL.md frontmatter, folded continuation lines included. */
export function skillDescription(text) {
  const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!front) return '';
  const lines = front[1].split(/\r?\n/);
  const start = lines.findIndex(line => line.startsWith('description:'));
  if (start < 0) return '';
  const parts = [lines[start].replace(/^description:\s*/, '').replace(/^[>|][-+]?\s*$/, '')];
  for (const line of lines.slice(start + 1)) {
    if (!/^\s+\S/.test(line)) break;
    parts.push(line.trim());
  }
  return parts.join(' ').trim().replace(/^(['"])([\s\S]*)\1$/, '$2');
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
  const descriptions = [];
  const onCall = [];
  for (const skill of skillDirs(root)) {
    const dir = `.agents/skills/${skill}`;
    const text = existsSync(join(root, dir, 'SKILL.md')) ? readFileSync(join(root, dir, 'SKILL.md'), 'utf8') : '';
    if (callOnly(text)) onCall.push(`${dir}/`);
    else if (text) descriptions.push(skillDescription(text));
    if (vendored.has(skill)) continue;
    paths.add(`${dir}/SKILL.md`);
    for (const folder of ['references', 'scripts']) {
      for (const path of walk(join(root, dir, folder))) {
        if (/\.(md|html|mjs|js|sh)$/.test(path)) paths.add(relative(root, path).split('\\').join('/'));
      }
    }
  }
  const after = Object.fromEntries([...paths].sort().map(path => [path, countText(readFileSync(join(root, path), 'utf8'))]));
  after[DESCRIPTIONS] = countText(descriptions.filter(Boolean).join('\n'));
  const kind = path => path === DESCRIPTIONS ? 'descriptions' : owners.has(path) ? 'owners' : path.endsWith('.md') ? (onCall.some(dir => path.startsWith(dir)) ? 'on-call' : 'instructions') : path.endsWith('.html') ? 'html' : 'helpers';
  const inventory = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().map(path => ({ path, kind: kind(path), before: before[path] ?? { words: 0, bytes: 0 }, after: after[path] ?? { words: 0, bytes: 0 } }));
  const categories = Object.fromEntries(['instructions', 'on-call', 'owners', 'descriptions', 'html', 'helpers'].map(category => {
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
  const ceiling = baseline.startupCeiling;
  if (ceiling !== undefined) {
    if (!routes.startup) throw new Error('startupCeiling needs a startup route');
    if (routes.startup.after.words > ceiling) issues.push(`startup: ${routes.startup.after.words} words is over the ceiling of ${ceiling}`);
  }
  return { baseline: baseline.revision, metric: 'Source words and UTF-8 bytes; not measured runtime tokens', assumptions: baseline.notes, startupCeiling: ceiling ?? null, categories, routes, inventory, issues };
}

/** A new baseline at `revision`: today's counts, each route's before set to its after, the rest kept. */
export function rebaseline(root, baseline, revision) {
  // The old before lists may name files that no longer exist; only today's counts matter here.
  const report = measureContext(root, { ...baseline, routes: {}, startupCeiling: undefined });
  const files = Object.fromEntries(report.inventory.filter(row => row.after.words || row.after.bytes || row.path === DESCRIPTIONS).map(row => [row.path, row.after]));
  const routes = Object.fromEntries(Object.entries(baseline.routes).map(([name, route]) => {
    const next = { ...route, before: [...route.after] };
    delete next.increaseReason;
    return [name, next];
  }));
  return { ...baseline, revision, files, routes };
}

if (isMain(import.meta.url)) {
  const { values } = parseCli({ usage: 'usage: measure-context.mjs [--json] [--check] [--write-baseline]', options: { json: { type: 'boolean' }, check: { type: 'boolean' }, 'write-baseline': { type: 'boolean' } } });
  try {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const fixture = join(root, 'scripts/fixtures/context-baseline.json');
    let baseline = JSON.parse(readFileSync(fixture, 'utf8'));
    if (values['write-baseline']) {
      const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
      baseline = rebaseline(root, baseline, revision);
      writeFileSync(fixture, `${JSON.stringify(baseline, null, 2)}\n`);
      console.log(`Baseline recorded at ${revision}`);
    }
    const report = measureContext(root, baseline);
    if (values.json) console.log(JSON.stringify(report, null, 2));
    else {
      console.log(report.metric);
      for (const [name, counts] of Object.entries(report.categories)) console.log(`${name}: ${counts.before.words} -> ${counts.after.words} words; ${counts.before.bytes} -> ${counts.after.bytes} bytes`);
      for (const [name, counts] of Object.entries(report.routes)) console.log(`${name}: ${counts.before.words} -> ${counts.after.words} words; ${counts.before.bytes} -> ${counts.after.bytes} bytes${counts.increaseReason ? ` (${counts.increaseReason})` : ''}`);
      if (report.startupCeiling !== null) console.log(`startup ceiling: ${report.startupCeiling} words`);
      for (const issue of report.issues) console.log(`ISSUE: ${issue}`);
    }
    if (values.check && report.issues.length) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
