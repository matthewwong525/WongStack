#!/usr/bin/env node
// Read-only maintenance leads, not a correctness or security verdict. No network.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LIMIT = 20;
const MAX_BYTES = 1024 * 1024;
const TEXT = /\.(?:[cm]?[jt]sx?|py|rb|php|rs|go|java|kt|swift|cs|c|cc|cpp|h|hpp|sh|sql|md|mdx|txt|jsonc?|toml|ya?ml|css|scss|html|vue|svelte)$/;
const CODE = /\.(?:[cm]?[jt]sx?|py|rb|php|rs|go|java|kt|swift|cs|c|cc|cpp|h|hpp|sh)$/;
const TEST = /(?:^|\/)(?:tests?\/|__tests__\/|test_[^/]+|[^/]+\.(?:test|spec))\.[^/]+$/;
const SPLIT_ROOTS = new Set(['apps', 'packages', 'services', 'crates', 'cmd', 'plugins']);
const SENSITIVE = [
  ['raw-html', /dangerouslySetInnerHTML|\binnerHTML\s*=|\bv-html\b/],
  ['identity-boundary', /Authenticated-User|SKIP_AUTH|BYPASS_AUTH|DISABLE_AUTH/],
  ['sql-interpolation', /\b(?:SELECT|WHERE|SET|ORDER BY|VALUES|IN)\b.*\$\{/i],
  ['request-url-fetch', /\bfetch\([^\n]*(?:\bbody\.|\brequest\.|\bsearchParams\b)/],
  ['possible-secret-log', /(?:console\.(?:log|warn|error)|\bprint)\([^\n]*(?:token|secret|password|apiKey)/i],
];

function excluded(file) {
  return /^(?:notes|openspec\/changes)(?:\/|$)/.test(file)
    || /(?:^|\/)(?:node_modules|vendor|dist|build|coverage|target|\.git|\.wrangler|\.venv|__pycache__)(?:\/|$)/.test(file)
    || /(?:^|\/)(?:\.env(?:\.[^/]*)?|\.dev\.vars(?:\.[^/]*)?|package-lock\.json|bun\.lockb?|pnpm-lock\.yaml|yarn\.lock|Cargo\.lock|worker-configuration\.d\.ts|review\.html)$/.test(file)
    || file.endsWith('.min.js');
}

function git(root, args, options = {}) {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024, timeout: 30_000, ...options,
  });
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function slash(value) { return value.split(path.sep).join('/'); }

/** Map a tracked path to a stable maintained-area name. */
export function areaFor(file) {
  const parts = slash(file).split('/').filter(Boolean);
  if (parts.length <= 1) return '(root)';
  if ((parts[0] === '.agents' || parts[0] === '.claude') && parts[1] === 'skills') {
    return parts.length >= 3 ? `${parts[0]}/skills/${parts[2]}` : `${parts[0]}/skills`;
  }
  if (SPLIT_ROOTS.has(parts[0]) && parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  return parts[0];
}

function missingLinks(root, file, text) {
  const findings = [];
  const prose = text.replace(/^([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\2[^\n]*$/gm,
    block => block.replace(/[^\n]/g, ' '));
  for (const match of prose.matchAll(/\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const raw = match[1].replace(/^<|>$/g, '').split(/[?#]/)[0];
    if (!raw || /^(?:[a-z][\w+.-]*:|\/)/i.test(raw) || /[<>*{}…]/.test(raw)) continue;
    let destination;
    try { destination = decodeURIComponent(raw); } catch { continue; }
    const target = path.resolve(root, path.dirname(file), destination);
    if (!inside(root, target)) continue;
    if (!existsSync(target)) findings.push({
      file, line: prose.slice(0, match.index).split('\n').length, target: destination,
    });
  }
  return findings;
}

function resolveScope(root, literal) {
  if (path.isAbsolute(literal)) throw new Error('Scope must be a repository-relative literal path.');
  const lexical = path.resolve(root, literal);
  if (!inside(root, lexical)) throw new Error('Scope must stay inside the repository.');
  if (!existsSync(lexical)) throw new Error('Scope does not exist.');
  const resolved = realpathSync(lexical);
  if (!inside(root, resolved)) throw new Error('Scope alias must resolve inside the repository.');
  return slash(path.relative(root, resolved)) || '.';
}

function trackedFiles(root) {
  return [...new Set(git(root, ['ls-files', '--cached', '-z']).split('\0').filter(Boolean))].sort();
}

function inScope(file, scope) {
  return scope === '.' || file === scope || file.startsWith(`${scope}/`);
}

function bounded(rows) { return { total: rows.length, sample: rows.slice(0, LIMIT) }; }

/** A UTC week number suitable for stable rotation, with an injectable date for tests. */
export function utcWeekOrdinal(input = new Date()) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) throw new Error('Rotation date is invalid.');
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 604_800_000);
}

/** Select the calendar start and prefer an area outside the recent-change set. */
export function selectRotation(areas, changedAreas = [], input = new Date()) {
  const stable = [...new Set(areas)].sort((a, b) => a.localeCompare(b));
  if (!stable.length) return { weekOrdinal: utcWeekOrdinal(input), start: null, selected: null, allRecent: false };
  const week = utcWeekOrdinal(input);
  const index = ((week % stable.length) + stable.length) % stable.length;
  const recent = new Set(changedAreas);
  const ordered = stable.map((_, offset) => stable[(index + offset) % stable.length]);
  return {
    weekOrdinal: week,
    start: stable[index],
    selected: ordered.find(area => !recent.has(area)) || stable[index],
    allRecent: ordered.every(area => recent.has(area)),
  };
}

function maintenanceMarkers(root, tracked) {
  const rows = [];
  for (const file of tracked.filter(name => /^openspec\/changes\/archive\/[^/]+\/proposal\.md$/.test(name))) {
    let text;
    try { text = readFileSync(path.join(root, file), 'utf8'); } catch { continue; }
    if (!/^Maintenance-Origin:\s*\/improve\s*$/m.test(text)) continue;
    const revision = text.match(/^Maintenance-Revision:\s*([^\s]+)\s*$/m)?.[1];
    if (revision) rows.push({ file, revision });
  }
  return rows.reverse();
}

function commitExists(root, revision) {
  execFileSync('git', ['-C', root, 'cat-file', '-e', `${revision}^{commit}`], {
    stdio: 'ignore', timeout: 30_000,
  });
  return true;
}

function isAncestor(root, revision, head) {
  try {
    execFileSync('git', ['-C', root, 'merge-base', '--is-ancestor', revision, head], {
      stdio: 'ignore', timeout: 30_000,
    });
    return true;
  } catch { return false; }
}

/** Resolve the recent-history base from shipped maintenance markers or a seven-day fallback. */
export function selectRecentRange(root, tracked = trackedFiles(root), input = new Date()) {
  const head = git(root, ['rev-parse', 'HEAD']).trim();
  const rejected = [];
  for (const marker of maintenanceMarkers(root, tracked)) {
    let exists = false;
    try { exists = commitExists(root, marker.revision); } catch { exists = false; }
    if (!exists) { rejected.push({ ...marker, reason: 'missing-commit' }); continue; }
    if (!isAncestor(root, marker.revision, head)) {
      rejected.push({ ...marker, reason: 'not-ancestor' }); continue;
    }
    return { head, base: marker.revision, source: 'maintenance-revision', marker: marker.file, rejected };
  }
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) throw new Error('Baseline date is invalid.');
  const before = new Date(date.getTime() - 7 * 86_400_000).toISOString();
  let base = '';
  try { base = git(root, ['rev-list', '--first-parent', '-1', `--before=${before}`, head]).trim(); } catch { base = ''; }
  return {
    head,
    base: base || null,
    source: base ? 'seven-day-fallback' : 'repository-start-fallback',
    since: before,
    rejected,
  };
}

function changedFiles(root, range, tracked, scope) {
  if (!range.base) return tracked.filter(file => inScope(file, scope));
  return git(root, ['diff', '--name-only', '-z', `${range.base}..${range.head}`, '--'])
    .split('\0').filter(Boolean).filter(file => inScope(file, scope));
}

/** Survey tracked working-tree text. Throws for invalid scope or unavailable Git. */
export function survey(directory = process.cwd(), area = '.', options = {}) {
  const root = realpathSync(git(directory, ['rev-parse', '--show-toplevel']).trim());
  const scope = resolveScope(root, area);
  if (excluded(scope)) throw new Error('Scope is excluded from the current-source survey.');
  const allTracked = trackedFiles(root);
  const tracked = allTracked.filter(file => inScope(file, scope));
  const files = tracked.filter(file => !excluded(file) && TEXT.test(file));
  if (!files.length) throw new Error('Scope contains no supported current tracked text files.');

  const errors = [];
  const inventory = new Map();
  const hotspots = [];
  const links = [];
  const sensitive = new Map(SENSITIVE.map(([kind]) => [kind, []]));
  const blocks = new Map();
  const skipped = { excludedOrUnsupported: tracked.length - files.length, symlinks: 0, large: 0 };
  let scanned = 0;
  for (const file of files) {
    const absolute = path.join(root, file);
    let text;
    try {
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink()) { skipped.symlinks++; continue; }
      if (!stat.isFile()) throw Object.assign(new Error('Not a regular file'), { code: 'NOT_FILE' });
      if (stat.size > MAX_BYTES) { skipped.large++; continue; }
      text = readFileSync(absolute, 'utf8');
    } catch (error) {
      errors.push({ file, operation: 'read', reason: error.code || 'READ_FAILED' });
      continue;
    }
    scanned++;
    const lines = text.split('\n');
    const count = lines.length - (text.endsWith('\n') ? 1 : 0);
    const areaName = areaFor(file);
    const row = inventory.get(areaName) || { area: areaName, files: 0, lines: 0 };
    row.files++; row.lines += count; inventory.set(areaName, row);
    if (/\.mdx?$/.test(file)) links.push(...missingLinks(root, file, text));
    if (!CODE.test(file) || TEST.test(file) || /\/components\/ui\//.test(file)) continue;
    hotspots.push({ file, lines: count });
    lines.forEach((line, index) => {
      for (const [kind, pattern] of SENSITIVE) {
        if (pattern.test(line)) sensitive.get(kind).push({ file, line: index + 1 });
      }
    });
    for (let i = 0; i <= lines.length - 12; i++) {
      const block = lines.slice(i, i + 12).map(line => line.trim()).join('\n');
      if (block.length < 350 || /\b(?:import|require)\b/.test(block)) continue;
      const hash = createHash('sha256').update(block).digest('hex');
      const locations = blocks.get(hash) || new Map();
      if (!locations.has(file)) locations.set(file, i + 1);
      blocks.set(hash, locations);
    }
  }
  const duplicates = [];
  const seenFileSets = new Set();
  for (const locations of [...blocks.values()].filter(value => value.size >= 2)
    .sort((a, b) => b.size - a.size)) {
    const key = JSON.stringify([...locations.keys()].sort());
    if (seenFileSets.has(key)) continue;
    seenFileSets.add(key);
    duplicates.push({ files: locations.size,
      locations: [...locations].slice(0, LIMIT).map(([file, line]) => ({ file, line })) });
  }

  const now = options.now || new Date();
  const range = selectRecentRange(root, allTracked, now);
  const recentFiles = changedFiles(root, range, tracked, scope);
  const recentAreas = [...new Set(recentFiles.map(areaFor))].sort((a, b) => a.localeCompare(b));
  const areas = [...inventory.keys()].sort((a, b) => a.localeCompare(b));
  const rotation = selectRotation(areas, recentAreas, now);
  const reportedRange = { ...range, rejected: bounded(range.rejected) };
  return {
    status: errors.length ? 'partial' : 'complete',
    revision: range.head,
    scope,
    coverage: {
      trackedInScope: tracked.length,
      scanned,
      skipped,
      supportedExtensions: TEXT.source,
      areas: bounded([...inventory.values()].sort((a, b) => a.area.localeCompare(b.area))),
      recent: {
        ...reportedRange,
        changedFiles: bounded(recentFiles),
        changedAreas: bounded(recentAreas),
      },
      rotation,
    },
    candidates: {
      largeFiles: bounded(hotspots.sort((a, b) => b.lines - a.lines)),
      repeatedBlocks: bounded(duplicates),
      missingLocalLinks: bounded(links),
      securityLocations: Object.fromEntries([...sensitive].map(([kind, rows]) => [kind, bounded(rows)])),
    },
    errors: bounded(errors),
    limits: [
      'Tracked working-tree text only; untracked files, secrets, generated files, historical records, and file symlinks are excluded.',
      `Files over ${MAX_BYTES} bytes are excluded; output has at most ${LIMIT} examples per category.`,
      'Heuristic leads only. No advisory lookup, usage telemetry, performance measurement, or full vulnerability or dead-code analysis.',
      range.source === 'maintenance-revision'
        ? 'Recent changes start at the latest usable shipped /improve revision.'
        : 'No usable shipped /improve revision was found; recent changes use the reported bounded fallback.',
    ],
  };
}

function isDirectEntry() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

const USAGE = 'usage: node survey.mjs [literal-area-path]';

if (isDirectEntry()) {
  const args = process.argv.slice(2);
  if (args[0] === '--help') { console.log(USAGE); process.exit(0); }
  if (args.length > 1 || args[0]?.startsWith('-')) { console.error(USAGE); process.exit(2); }
  try {
    const report = survey(process.cwd(), process.argv[2]);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = report.status === 'partial' ? 2 : 0;
  } catch (error) {
    const reason = error.status !== undefined || error.code
      ? 'Repository survey could not read its Git context.' : error.message;
    process.stderr.write(`${JSON.stringify({ status: 'failed', reason })}\n`);
    process.exitCode = 1;
  }
}
