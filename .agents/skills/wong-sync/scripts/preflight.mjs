#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

const SCHEMA_VERSION = 1;
const DEFAULT_MAX_CHANGES = 10_000;
const MAX_GIT_OUTPUT = 64 * 1024 * 1024;

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

function treeAt(source, revision) {
  const raw = git(source, ['ls-tree', '-r', '-z', revision], { buffer: true });
  const entries = new Map();
  for (const record of raw.toString('utf8').split('\0').filter(Boolean)) {
    const match = record.match(/^(\d+) (\w+) ([0-9a-f]+)\t([\s\S]+)$/);
    if (!match || match[2] !== 'blob') continue;
    const [, mode, , oid, gitPath] = match;
    const logicalPath = logicalSourcePath(gitPath);
    const candidate = { mode, oid, gitPath };
    const existing = entries.get(logicalPath);
    if (!existing || gitPath.startsWith('.agents/')) entries.set(logicalPath, candidate);
  }
  return entries;
}

function blob(source, revision, logicalPath, tree) {
  const found = tree.get(logicalPath);
  if (!found) return null;
  return { ...found, content: git(source, ['show', `${revision}:${found.gitPath}`], { buffer: true }) };
}

function inventoryAt(source, revision, tree) {
  const logical = '.claude/skills/wong-sync/references/payload-files.json';
  const found = tree.get(logical);
  if (found) {
    const raw = git(source, ['show', `${revision}:${found.gitPath}`]);
    return { path: found.gitPath, value: parseJson(raw, `payload inventory at ${revision}`) };
  }
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

function selectedCategories(inventory, record, target) {
  const selected = ['core'];
  const components = record.components ?? {};
  const hasUi = components.ui === true || components.appScaffold === true || existsSync(join(target, 'wiki/ux-principles.md'));
  if (hasUi && inventory.ui) selected.push('ui');
  if (components.stackPack === true && inventory.pack) selected.push('pack');
  if (components.stackPack === true && components.appScaffold === true && inventory.scaffold) selected.push('scaffold');
  return selected.filter((value, index, array) => array.indexOf(value) === index);
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

function expandInventory(source, revision, tree, inventory, record, target) {
  validateInventory(inventory, revision);
  const categories = selectedCategories(inventory, record, target);
  const mapping = skillMappings(record);
  const files = new Map();
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
    files.set(path, { key: `file:${path}`, kind: 'file', sourcePath: path, targetPath: targetPathFor(path, mapping), categories: [category] });
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

function targetValue(target, unit) {
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
    options[arg.slice(2)] = value;
  }
  return options;
}

export function preflight({ target: targetInput, source: sourceInput, record: recordInput, maxChanges = DEFAULT_MAX_CHANGES }) {
  const started = performance.now();
  const target = directory(targetInput, '--target');
  const source = directory(sourceInput, '--source');
  const recordPath = inside(target, resolve(target, recordInput ?? '.claude/.wong-stack.json'), '--record');
  if (existsSync(recordPath)) inside(target, realpathSync(recordPath), '--record');
  const limit = Number(maxChanges);
  if (!Number.isSafeInteger(limit) || limit < 1) fail('invalid-argument', '--max-changes must be a positive integer');

  let record;
  try {
    record = parseJson(readFileSync(recordPath, 'utf8'), 'install record');
  } catch (error) {
    if (error instanceof PreflightError) throw error;
    fail('record-read-failed', `cannot read install record: ${error?.code ?? 'read error'}`);
  }
  if (!record || typeof record !== 'object' || Array.isArray(record)) fail('invalid-record', 'install record must be an object');
  if (typeof record.commit !== 'string' || !record.commit) fail('missing-installed-commit', 'install record has no source commit');

  const sourceRoot = realpathSync(String(git(source, ['rev-parse', '--show-toplevel'])).trim());
  if (sourceRoot !== source) fail('invalid-source', '--source must be the source repository root');
  const currentCommit = String(git(source, ['rev-parse', 'HEAD'])).trim();
  const installedCommit = String(git(source, ['rev-parse', '--verify', `${record.commit}^{commit}`])).trim();
  if (spawnSync('git', ['-C', source, 'merge-base', '--is-ancestor', installedCommit, currentCommit]).status !== 0) {
    fail('installed-commit-not-ancestor', `${record.commit} is not an ancestor of ${currentCommit}`);
  }

  const baseTree = treeAt(source, installedCommit);
  const currentTree = treeAt(source, currentCommit);
  const baseInventory = inventoryAt(source, installedCommit, baseTree).value;
  const currentInventory = inventoryAt(source, currentCommit, currentTree).value;
  const baseSelection = expandInventory(source, installedCommit, baseTree, baseInventory, record, target);
  const currentSelection = expandInventory(source, currentCommit, currentTree, currentInventory, record, target);
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
      unit: unit.key,
      kind: unit.kind,
      sourcePath: unit.sourcePath,
      targetPath: unit.targetPath,
      categories: unit.categories,
      operation: operation(baseValue, currentValue),
      localState: classify(baseValue, currentValue, localValue),
    });
    if (changes.length > limit) fail('change-limit', `payload delta exceeds the ${limit} unit safety limit`);
  }

  let currentVersion = null;
  const versionBlob = blob(source, currentCommit, 'VERSION', currentTree);
  if (versionBlob) currentVersion = versionBlob.content.toString('utf8').trim();
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
    diagnostics: [{ code: error?.code ?? 'unexpected-error', message: error?.message ?? 'unexpected preflight error' }],
    timings: { preflightMs: Math.round((performance.now() - started) * 100) / 100 },
  };
}

function isDirectRun() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
  }
}

if (isDirectRun()) {
  const started = performance.now();
  try {
    const options = parseArgs(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(preflight(options), null, 2)}\n`);
  } catch (error) {
    process.stdout.write(`${JSON.stringify(errorReport(error, started), null, 2)}\n`);
    process.exitCode = 2;
  }
}
