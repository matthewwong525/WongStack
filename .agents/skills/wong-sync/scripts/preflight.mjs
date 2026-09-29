#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
} from 'node:fs';
import { dirname, isAbsolute, posix, relative, resolve, sep } from 'node:path';
import { performance } from 'node:perf_hooks';
import { isMain } from '../../memory/scripts/lib/cli.mjs';

const SCHEMA_VERSION = 1;
const DEFAULT_MAX_CHANGES = 10_000;
const MAX_GIT_OUTPUT = 64 * 1024 * 1024;
const USAGE = 'usage: preflight.mjs --target <dir> --source <dir> [--record <path>] [--max-changes <n>]';

class PreflightError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function fail(code, message) {
  throw new PreflightError(code, message);
}

function slash(value) {
  return value.split(sep).join('/');
}

function safeRelativePath(value, label) {
  if (typeof value !== 'string' || !value || isAbsolute(value)) {
    fail('unsafe-path', `${label} must be a non-empty repository-relative path`);
  }
  const normalized = slash(value).replace(/^\.\//, '').replace(/\/$/, '');
  if (!normalized || normalized === '..' || normalized.startsWith('../') || normalized.includes('/../') || normalized.includes('\0')) {
    fail('unsafe-path', `${label} escapes the repository`);
  }
  return normalized;
}

function inside(root, candidate, label) {
  const rel = relative(root, candidate);
  if (rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))) return candidate;
  fail('unsafe-path', `${label} must resolve inside ${root}`);
}

function directory(value, label) {
  if (typeof value !== 'string' || !value) fail('invalid-argument', `${label} is required`);
  const absolute = realpathSync(resolve(value));
  if (!lstatSync(absolute).isDirectory()) fail('invalid-argument', `${label} is not a directory`);
  return absolute;
}

function git(source, args, { allowMissing = false, buffer = false } = {}) {
  const result = spawnSync('git', ['-C', source, ...args], {
    encoding: buffer ? null : 'utf8',
    maxBuffer: MAX_GIT_OUTPUT,
  });
  if (result.status === 0) return result.stdout;
  if (allowMissing && result.status === 1) return null;
  const detail = String(result.stderr || result.stdout || '').trim().split('\n')[0];
  fail('git-failed', `git ${args[0]} failed${detail ? `: ${detail}` : ''}`);
}

function parseJson(raw, label) {
  try {
    return JSON.parse(raw);
  } catch {
    fail('invalid-json', `${label} is not valid JSON`);
  }
}

function logicalSourcePath(gitPath) {
  if (gitPath === '.agents') return '.claude';
  if (gitPath.startsWith('.agents/')) return `.claude/${gitPath.slice('.agents/'.length)}`;
  return gitPath;
}

// A symlink in a Git tree is a blob whose content is the link text, so a payload
// file stored as a link (this source's CLAUDE.md -> AGENTS.md) must be read
// through its target. Resolution is one hop, by Git path: links to folders,
// to other links, or to nothing are dropped, and a real file always wins.
function readLinkTargets(source, links) {
  if (links.length === 0) return [];
  const result = spawnSync('git', ['-C', source, 'cat-file', '--batch'], {
    input: `${links.map(link => link.oid).join('\n')}\n`,
    maxBuffer: MAX_GIT_OUTPUT,
  });
  if (result.status !== 0) fail('git-failed', 'git cat-file failed while reading symlinks');
  const out = result.stdout;
  const targets = [];
  let offset = 0;
  for (const link of links) {
    const headerEnd = out.indexOf(0x0a, offset);
    const size = Number(out.toString('utf8', offset, headerEnd).split(' ')[2]);
    if (!Number.isSafeInteger(size)) fail('git-failed', `cannot read symlink ${link.gitPath}`);
    targets.push(out.toString('utf8', headerEnd + 1, headerEnd + 1 + size));
    offset = headerEnd + 1 + size + 1;
  }
  return targets;
}

function treeAt(source, revision) {
  const raw = git(source, ['ls-tree', '-r', '-z', revision], { buffer: true });
  const entries = new Map();
  const byGitPath = new Map();
  const links = [];
  for (const record of raw.toString('utf8').split('\0').filter(Boolean)) {
    const match = record.match(/^(\d+) (\w+) ([0-9a-f]+)\t([\s\S]+)$/);
    if (!match || match[2] !== 'blob') continue;
    const [, mode, , oid, gitPath] = match;
    const candidate = { mode, oid, gitPath };
    if (mode === '120000') {
      links.push(candidate);
      continue;
    }
    byGitPath.set(gitPath, candidate);
    const logicalPath = logicalSourcePath(gitPath);
    const existing = entries.get(logicalPath);
    if (!existing || gitPath.startsWith('.agents/')) entries.set(logicalPath, candidate);
  }
  readLinkTargets(source, links).forEach((linkText, index) => {
    const link = links[index];
    const targetPath = posix.normalize(posix.join(posix.dirname(link.gitPath), linkText));
    const resolved = byGitPath.get(targetPath);
    const logicalPath = logicalSourcePath(link.gitPath);
    if (resolved && !entries.has(logicalPath)) entries.set(logicalPath, resolved);
  });
  return entries;
}

function blob(source, revision, logicalPath, tree) {
  const found = tree.get(logicalPath);
  if (!found) return null;
  return { ...found, content: git(source, ['show', `${revision}:${found.gitPath}`], { buffer: true }) };
}

// An installed commit from before the inventory existed has none: with `optional`,
// that returns null and the caller compares against an empty baseline.
function inventoryAt(source, revision, tree, { optional = false } = {}) {
  const logical = '.claude/skills/wong-sync/references/payload-files.json';
  const found = tree.get(logical);
  if (found) {
    const raw = git(source, ['show', `${revision}:${found.gitPath}`]);
    return { path: found.gitPath, value: parseJson(raw, `payload inventory at ${revision}`) };
  }
  if (optional) return null;
  fail('missing-inventory', `payload inventory is absent at ${revision}`);
}

function validateInventory(inventory, revision) {
  if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory)) {
    fail('invalid-inventory', `payload inventory at ${revision} must be an object`);
  }
  for (const [category, entry] of Object.entries(inventory)) {
    if (category.startsWith('$') || category === 'seededBySetup') continue;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      fail('invalid-inventory', `category ${category} at ${revision} must be an object`);
    }
    for (const key of ['files', 'dirs', 'skillDirs', 'exclude']) {
      if (entry[key] !== undefined && (!Array.isArray(entry[key]) || entry[key].some(value => typeof value !== 'string'))) {
        fail('invalid-inventory', `${category}.${key} at ${revision} must be a string array`);
      }
    }
    if (entry.blocks !== undefined && (!Array.isArray(entry.blocks) || entry.blocks.some(block =>
      !block || typeof block.file !== 'string' || !Array.isArray(block.markers) || block.markers.length !== 2 || block.markers.some(marker => typeof marker !== 'string' || !marker)
    ))) {
      fail('invalid-inventory', `${category}.blocks at ${revision} is invalid`);
    }
  }
}

function skillMappings(record) {
  const raw = record.components?.skillMap ?? record.components?.skills;
  const mapping = new Map();
  if (raw === undefined) return mapping;
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (typeof entry === 'string') {
        mapping.set(entry, entry);
      } else if (entry && typeof entry === 'object') {
        const source = entry.source ?? entry.upstream ?? entry.name;
        const target = entry.target ?? entry.local ?? entry.installedAs ?? source;
        if (typeof source !== 'string' || typeof target !== 'string') fail('invalid-record', 'components.skills contains an invalid mapping');
        mapping.set(safeRelativePath(source, 'source skill name'), safeRelativePath(target, 'target skill name'));
      } else {
        fail('invalid-record', 'components.skills must contain names or mappings');
      }
    }
  } else if (raw && typeof raw === 'object') {
    for (const [source, target] of Object.entries(raw)) {
      if (typeof target !== 'string') fail('invalid-record', 'components skill mapping values must be strings');
      mapping.set(safeRelativePath(source, 'source skill name'), safeRelativePath(target, 'target skill name'));
    }
  } else {
    fail('invalid-record', 'components.skills must be an array or object');
  }
  for (const [source, target] of mapping) {
    if (source.includes('/') || target.includes('/')) fail('invalid-record', 'skill names cannot contain path separators');
  }
  return mapping;
}

// Every install takes every category; old component flags are ignored.
function selectedCategories(inventory) {
  return ['core', 'ui', 'pack', 'scaffold'].filter(category => category === 'core' || inventory[category]);
}

function listTree(tree, logicalDirectory) {
  const root = safeRelativePath(logicalDirectory, 'payload directory');
  return [...tree.keys()].filter(path => path.startsWith(`${root}/`)).sort();
}

function excluded(path, excludes) {
  return excludes.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

function targetPathFor(logicalPath, mapping) {
  const match = logicalPath.match(/^\.claude\/skills\/([^/]+)(\/.*)?$/);
  if (!match) return logicalPath;
  const localName = mapping.get(match[1]) ?? match[1];
  return `.claude/skills/${localName}${match[2] ?? ''}`;
}

function expandInventory(source, revision, tree, inventory, record) {
  validateInventory(inventory, revision);
  const categories = selectedCategories(inventory);
  const mapping = skillMappings(record);
  const files = new Map();
  const targets = new Map();
  const blocks = new Map();
  const excludes = [];

  for (const category of categories) {
    const entry = inventory[category];
    if (!entry) fail('invalid-inventory', `selected category ${category} is absent at ${revision}`);
    for (const value of entry.exclude ?? []) excludes.push(safeRelativePath(value, `${category}.exclude`));
  }

  const addFile = (logicalPath, category) => {
    const path = safeRelativePath(logicalPath, `${category} payload path`);
    if (excluded(path, excludes)) return;
    const existing = files.get(path);
    if (existing) {
      existing.categories = [...new Set([...existing.categories, category])].sort();
      return;
    }
    const targetPath = targetPathFor(path, mapping);
    const owner = targets.get(targetPath);
    if (owner) fail('path-collision', `${owner} and ${path} both map to ${targetPath}`);
    targets.set(targetPath, path);
    files.set(path, { key: `file:${path}`, kind: 'file', sourcePath: path, targetPath, categories: [category] });
  };

  for (const category of categories) {
    const entry = inventory[category];
    for (const path of entry.files ?? []) addFile(path, category);
    for (const name of entry.skillDirs ?? []) {
      const skill = safeRelativePath(name, `${category}.skillDirs`);
      if (skill.includes('/')) fail('invalid-inventory', `skill directory ${skill} cannot contain a slash`);
      for (const path of listTree(tree, `.claude/skills/${skill}`)) addFile(path, category);
    }
    for (const directory of entry.dirs ?? []) {
      const root = safeRelativePath(directory, `${category}.dirs`);
      for (const path of listTree(tree, root)) addFile(path, category);
    }
    for (const block of entry.blocks ?? []) {
      const file = safeRelativePath(block.file, `${category}.blocks.file`);
      const key = `block:${file}:${block.markers.join(':')}`;
      blocks.set(key, {
        key,
        kind: 'block',
        sourcePath: file,
        targetPath: file,
        markers: [...block.markers],
        categories: [category],
      });
    }
  }
  return { categories, units: new Map([...files.values(), ...blocks.values()].map(unit => [unit.key, unit])) };
}

function extractBlock(content, markers, label, { required }) {
  if (content === null) {
    if (required) fail('missing-block-source', `${label} is absent`);
    return null;
  }
  const text = content.toString('utf8');
  const begin = text.indexOf(markers[0]);
  const endMarker = text.indexOf(markers[1], begin < 0 ? 0 : begin + markers[0].length);
  if (begin < 0 || endMarker < 0) {
    if (required) fail('missing-block-marker', `${label} lacks the required block markers`);
    return null;
  }
  const start = text.lastIndexOf('\n', begin) + 1;
  const nextLine = text.indexOf('\n', endMarker + markers[1].length);
  return Buffer.from(text.slice(start, nextLine < 0 ? text.length : nextLine + 1));
}

function sourceValue(source, revision, tree, unit) {
  const found = blob(source, revision, unit.sourcePath, tree);
  if (unit.kind === 'file') return found?.content ?? null;
  return extractBlock(found?.content ?? null, unit.markers, `${unit.sourcePath} at ${revision}`, { required: true });
}

export function targetValue(target, unit) {
  const path = inside(target, resolve(target, safeRelativePath(unit.targetPath, 'target payload path')), 'target payload path');
  if (existsSync(path)) inside(target, realpathSync(path), 'target payload path');
  else {
    let parent = dirname(path);
    while (!existsSync(parent) && parent !== target) parent = dirname(parent);
    inside(target, realpathSync(parent), 'target payload parent');
  }
  let content;
  try {
    content = readFileSync(path);
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return null;
    fail('target-read-failed', `cannot read ${unit.targetPath}: ${error?.code ?? 'read error'}`);
  }
  if (unit.kind === 'file') return content;
  return extractBlock(content, unit.markers, unit.targetPath, { required: false });
}

function equal(left, right) {
  if (left === null || right === null) return left === right;
  return left.equals(right);
}

function mergeUnit(base, current) {
  if (!base) return { ...current, categories: [...current.categories] };
  if (!current) return { ...base, categories: [...base.categories] };
  if (base.kind !== current.kind || base.sourcePath !== current.sourcePath || base.targetPath !== current.targetPath) {
    fail('inventory-conflict', `payload unit ${base.key} changes identity across revisions`);
  }
  return { ...current, categories: [...new Set([...base.categories, ...current.categories])].sort() };
}

function classify(baseValue, currentValue, localValue) {
  if (localValue === null) return 'missing';
  if (currentValue !== null && equal(localValue, currentValue)) return 'latest-equivalent';
  if (baseValue !== null && equal(localValue, baseValue)) return 'installed-equivalent';
  return 'locally-adapted';
}

function operation(baseValue, currentValue) {
  if (baseValue === null) return 'added';
  if (currentValue === null) return 'removed';
  return 'modified';
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!['--target', '--source', '--record', '--max-changes'].includes(arg)) fail('invalid-argument', `unknown argument ${arg}`);
    const value = argv[++index];
    if (value === undefined) fail('invalid-argument', `${arg} needs a value`);
    options[arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
  }
  return options;
}

function readRecord(target, recordInput) {
  const recordPath = inside(target, resolve(target, recordInput ?? '.claude/.wong-stack.json'), '--record');
  if (existsSync(recordPath)) inside(target, realpathSync(recordPath), '--record');
  let record;
  try {
    record = parseJson(readFileSync(recordPath, 'utf8'), 'install record');
  } catch (error) {
    if (error instanceof PreflightError) throw error;
    fail('record-read-failed', `cannot read install record: ${error?.code ?? 'read error'}`);
  }
  if (!record || typeof record !== 'object' || Array.isArray(record)) fail('invalid-record', 'install record must be an object');
  return record;
}

// The shared selection behind preflight and merge-check: both commits' payload,
// expanded for this target, and every unit whose source value changed between them.
// `from` overrides the record's commit (merge-check checks against the commit a plan started from).
export function compareSelection({ target: targetInput, source: sourceInput, record: recordInput, from, maxChanges = DEFAULT_MAX_CHANGES }) {
  const target = directory(targetInput, '--target');
  const source = directory(sourceInput, '--source');
  const limit = Number(maxChanges);
  if (!Number.isSafeInteger(limit) || limit < 1) fail('invalid-argument', '--max-changes must be a positive integer');
  const record = readRecord(target, recordInput);
  const installed = from ?? record.commit;
  if (typeof installed !== 'string' || !installed) fail('missing-installed-commit', 'install record has no source commit');

  const sourceRoot = realpathSync(String(git(source, ['rev-parse', '--show-toplevel'])).trim());
  if (sourceRoot !== source) fail('invalid-source', '--source must be the source repository root');
  const currentCommit = String(git(source, ['rev-parse', 'HEAD'])).trim();
  const installedCommit = String(git(source, ['rev-parse', '--verify', `${installed}^{commit}`])).trim();
  if (spawnSync('git', ['-C', source, 'merge-base', '--is-ancestor', installedCommit, currentCommit]).status !== 0) {
    fail('installed-commit-not-ancestor', `${installed} is not an ancestor of ${currentCommit}`);
  }

  const baseTree = treeAt(source, installedCommit);
  const currentTree = treeAt(source, currentCommit);
  const baseInventory = inventoryAt(source, installedCommit, baseTree, { optional: true });
  const currentInventory = inventoryAt(source, currentCommit, currentTree).value;
  const baseSelection = baseInventory
    ? expandInventory(source, installedCommit, baseTree, baseInventory.value, record)
    : { categories: [], units: new Map() };
  const currentSelection = expandInventory(source, currentCommit, currentTree, currentInventory, record);
  const keys = [...new Set([...baseSelection.units.keys(), ...currentSelection.units.keys()])].sort();
  const changes = [];

  for (const key of keys) {
    const baseUnit = baseSelection.units.get(key);
    const currentUnit = currentSelection.units.get(key);
    const unit = mergeUnit(baseUnit, currentUnit);
    const baseEntry = baseUnit?.kind === 'file' ? baseTree.get(baseUnit.sourcePath) : null;
    const currentEntry = currentUnit?.kind === 'file' ? currentTree.get(currentUnit.sourcePath) : null;
    if (baseUnit?.kind === 'file' && currentUnit?.kind === 'file' && baseEntry?.oid === currentEntry?.oid) continue;
    const baseValue = baseUnit ? sourceValue(source, installedCommit, baseTree, baseUnit) : null;
    const currentValue = currentUnit ? sourceValue(source, currentCommit, currentTree, currentUnit) : null;
    if (equal(baseValue, currentValue)) continue;
    const localValue = targetValue(target, unit);
    changes.push({
      unit,
      baseEntry: baseUnit ? baseTree.get(baseUnit.sourcePath) ?? null : null,
      currentEntry: currentUnit ? currentTree.get(currentUnit.sourcePath) ?? null : null,
      operation: operation(baseValue, currentValue),
      localState: classify(baseValue, currentValue, localValue),
    });
    if (changes.length > limit) fail('change-limit', `payload delta exceeds the ${limit} unit safety limit`);
  }

  return {
    target,
    source,
    record,
    currentCommit,
    installedCommit,
    currentTree,
    baseline: baseInventory ? 'inventory' : 'empty',
    baseSelection,
    currentSelection,
    keys,
    changes,
  };
}

function parseVersion(value) {
  const match = typeof value === 'string' && /^v?(\d+)\.(\d+)\.(\d+)/.exec(value.trim());
  return match ? match.slice(1, 4).map(Number) : null;
}

function below(version, floor) {
  const parsed = parseVersion(version);
  if (!parsed) return false;
  for (let index = 0; index < 3; index += 1) {
    if (parsed[index] !== floor[index]) return parsed[index] < floor[index];
  }
  return false;
}

function kindAt(path) {
  try {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) return 'link';
    return stat.isDirectory() ? 'dir' : 'file';
  } catch {
    return null;
  }
}

// Skill folder names under the target's skills folders; names only, never bodies.
function skillNames(target) {
  const names = new Set();
  for (const folder of ['.claude/skills', '.agents/skills']) {
    const path = resolve(target, folder);
    try {
      const real = realpathSync(path);
      inside(target, real, 'skills folder');
      for (const entry of readdirSync(real, { withFileTypes: true })) {
        if (entry.isDirectory() || entry.isSymbolicLink()) names.add(entry.name);
      }
    } catch (error) {
      if (error instanceof PreflightError) continue;
      if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') continue;
      fail('target-read-failed', `cannot list ${folder}: ${error?.code ?? 'read error'}`);
    }
  }
  return [...names].sort();
}

// The moves an install made before 19.0.0 may still need, from its layout (lstat
// only) and its record. references/catch-up.md owns what each code asks of the plan.
function catchUpNeeds(target, record, installedVersion, baseline) {
  const reasons = [];
  const at = path => kindAt(resolve(target, path));
  const agents = at('.agents');
  const claude = at('.claude');
  if (agents !== 'dir' || claude === 'dir') {
    reasons.push({ code: 'agent-folder', paths: ['.agents', '.claude'].filter(path => at(path) !== null) });
  }
  const codex = at('.codex');
  if (codex === 'dir' || codex === null) reasons.push({ code: 'codex-folder', paths: codex ? ['.codex'] : [] });
  const claudeFile = at('CLAUDE.md');
  const agentsFile = at('AGENTS.md');
  if (claudeFile === 'file' && (agentsFile === null || agentsFile === 'file')) {
    reasons.push({ code: 'rules-file', paths: agentsFile ? ['CLAUDE.md', 'AGENTS.md'] : ['CLAUDE.md'] });
  }
  if (agentsFile === 'link' && posix.normalize(slash(readlinkSync(resolve(target, 'AGENTS.md')))) === 'CLAUDE.md') {
    reasons.push({ code: 'rules-file-reversed', paths: ['AGENTS.md', 'CLAUDE.md'] });
  }
  const components = record.components && typeof record.components === 'object' ? record.components : {};
  if (typeof components.docsPath === 'string' && slash(components.docsPath).replace(/^\.\//, '').replace(/\/$/, '') !== 'wiki') {
    reasons.push({ code: 'wiki-elsewhere', paths: [components.docsPath] });
  }
  const declined = ['stackPack', 'appScaffold', 'ui'].filter(flag => components[flag] === false);
  if (declined.length) reasons.push({ code: 'opted-out', paths: declined.map(flag => `components.${flag}`) });
  const generated = skillNames(target).filter(name => name.startsWith('openspec-'));
  if (generated.length) reasons.push({ code: 'generated-openspec', paths: generated.map(name => `.claude/skills/${name}`) });
  if (below(installedVersion, [18, 0, 0]) && at('.github/workflows/deploy.yml') !== null) {
    reasons.push({ code: 'deploy-token', paths: ['.github/workflows/deploy.yml'] });
  }
  if (baseline === 'empty') reasons.push({ code: 'no-baseline', paths: [] });
  return { needed: reasons.length > 0 || below(installedVersion, [19, 0, 0]), reasons };
}

// Each CHANGELOG.md entry above the installed version, newest first, with its
// by-hand paragraph. A `Next` entry is unreleased and above every version.
function updatingNotes(source, revision, installedVersion) {
  const shown = spawnSync('git', ['-C', source, 'show', `${revision}:CHANGELOG.md`], { encoding: 'utf8', maxBuffer: MAX_GIT_OUTPUT });
  if (shown.status !== 0) return { updating: [], updatingComplete: false };
  const installed = parseVersion(installedVersion);
  const entries = [];
  let entry = null;
  for (const line of shown.stdout.replace(/\r\n?/g, '\n').split('\n')) {
    if (line.startsWith('## ')) {
      const heading = /^## +(.+?) +— +(.+?)\s*$/.exec(line);
      entry = heading ? { version: heading[1], title: heading[2], lines: [] } : null;
      if (entry) entries.push(entry);
      continue;
    }
    if (entry) entry.lines.push(line);
  }
  const dated = entries.filter(row => /^Next\b/.test(row.version) || parseVersion(row.version));
  if (!dated.length) return { updating: [], updatingComplete: false };
  const newer = dated.filter(row => /^Next\b/.test(row.version) || !installed || below(installedVersion, parseVersion(row.version)));
  const updating = newer.map(row => {
    const start = row.lines.findIndex(line => /^\*\*(?:Updating|Moving an existing install)\.\*\*/.test(line));
    return { version: row.version, title: row.title, note: start < 0 ? null : row.lines.slice(start).join('\n').trim() };
  });
  return { updating, updatingComplete: Boolean(installed) };
}

export function preflight(options) {
  const started = performance.now();
  const compared = compareSelection(options);
  const { source, record, currentCommit, installedCommit, currentTree, currentSelection, baseSelection, keys } = compared;
  const changes = compared.changes.map(({ unit, operation: op, localState }) => ({
    unit: unit.key,
    kind: unit.kind,
    sourcePath: unit.sourcePath,
    targetPath: unit.targetPath,
    categories: unit.categories,
    operation: op,
    localState,
  }));

  let currentVersion = null;
  const versionBlob = blob(source, currentCommit, 'VERSION', currentTree);
  if (versionBlob) currentVersion = versionBlob.content.toString('utf8').trim();
  const installedVersion = typeof record.version === 'string' ? record.version : null;
  const { updating, updatingComplete } = updatingNotes(source, currentCommit, installedVersion);
  return {
    schemaVersion: SCHEMA_VERSION,
    status: changes.length ? 'update' : 'current',
    source: { path: source, version: currentVersion, commit: currentCommit },
    installed: { version: record.version ?? null, commit: installedCommit },
    selection: {
      categories: currentSelection.categories,
      installedUnits: baseSelection.units.size,
      currentUnits: currentSelection.units.size,
      unionUnits: keys.length,
      changedUnits: changes.length,
    },
    changes,
    catchUp: catchUpNeeds(compared.target, record, installedVersion, compared.baseline),
    updating,
    updatingComplete,
    diagnostics: [],
    timings: { preflightMs: Math.round((performance.now() - started) * 100) / 100 },
  };
}

function errorReport(error, started) {
  return {
    schemaVersion: SCHEMA_VERSION,
    status: 'error',
    source: null,
    installed: null,
    selection: null,
    changes: [],
    catchUp: null,
    updating: [],
    updatingComplete: false,
    diagnostics: [{ code: error?.code ?? 'unexpected-error', message: error?.message ?? 'unexpected preflight error' }],
    timings: { preflightMs: Math.round((performance.now() - started) * 100) / 100 },
  };
}

if (isMain(import.meta.url) && process.argv.includes('--help')) {
  process.stdout.write(`${USAGE}\n`);
} else if (isMain(import.meta.url)) {
  const started = performance.now();
  try {
    const options = parseArgs(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(preflight(options), null, 2)}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify(errorReport(error, started), null, 2)}\n`);
    process.exitCode = 2;
  }
}
