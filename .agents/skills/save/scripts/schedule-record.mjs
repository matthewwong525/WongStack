#!/usr/bin/env node
// A record-only delivery boundary; the existing checkpoint and merge still own the gate.
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { checkpointEvidence } from './checkpoint-evidence.mjs';

export function goalSchema(text) {
  return /^schema:[ \t]*(?:scheduled-work|'scheduled-work'|"scheduled-work")[ \t]*(?:#.*)?$/m.test(text ?? '');
}

/** Classify only for routing. Delivery validates the whole record through the schedule helper. */
export function operationalChange(root, changeRoot, read = path => readFileSync(path, 'utf8')) {
  try { return goalSchema(read(join(resolve(root, changeRoot), '.openspec.yaml'))); }
  catch { return false; }
}

export function publishedGoal(root, changeRoot) {
  if (!operationalChange(root, changeRoot)) return false;
  try { return JSON.parse(readFileSync(resolve(root, changeRoot, 'binding.json'), 'utf8')).lifecycle?.published === true; }
  catch { return false; }
}

export function recordPath(root, file) {
  const path = relative(resolve(root), resolve(root, file)).split(sep).join('/');
  if (!path || path === '..' || path.startsWith('../') || isAbsolute(path)) throw new Error('schedule record must be inside the repository');
  return path;
}

/** Every branch, index, worktree and rename source must be exactly one allowed artifact. */
export function assertRecordScope(record, { branchPaths = [], dirtyPaths = [], stagedPaths = [] } = {}) {
  if (!['routine', 'goal'].includes(record.kind) || !Array.isArray(record.files) || !record.files.length) throw new Error('missing validated schedule record file scope');
  const allowed = new Set(record.files.map(file => recordPath(record.root, file)));
  const paths = [...branchPaths, ...stagedPaths, ...dirtyPaths.flatMap(entry => [entry.path, entry.from].filter(Boolean))];
  const outside = [...new Set(paths.filter(path => !allowed.has(path)))];
  if (outside.length) throw new Error(`record-only delivery rejects mixed source or code plans: ${outside.join(', ')}`);
  return [...allowed];
}

async function validateGoal(record) {
  await promisify(execFile)('openspec', ['validate', record.name, '--strict', '--no-interactive', ...(record.store ? ['--store', record.store] : [])], { cwd: record.root, encoding: 'utf8' });
}

export async function scheduleRecord({ root, reference, store, base, stagedPaths = [], evidence, load, validate = validateGoal } = {}) {
  const loader = load ?? (await import('../../schedule/scripts/lib/records.mjs')).loadRecord;
  const record = await loader(root, reference, { store });
  if (record.reference !== recordPath(root, reference)) throw new Error('delivery requires the exact schedule record reference, not a code change name');
  if (record.kind === 'goal') {
    if (!operationalChange(root, record.reference)) throw new Error('goal delivery requires exact scheduled-work schema metadata');
    if (!record.archived) await validate(record);
  }
  if (record.archived) {
    assertTerminalGoal(record);
    const previous = recordPath(root, record.binding.record);
    if (previous === record.reference || /(^|\/)archive\//.test(previous)) throw new Error('archived goal must retain its original active reference');
    const removals = record.files.map(file => `${previous}/${file.split('/').at(-1)}`);
    if (removals.some(file => existsSync(resolve(root, file)))) throw new Error('archived goal still has active instruction artifacts');
    record.files = [...record.files, ...removals];
    record.removals = removals;
  }
  // Symlinks cannot turn an allowed repo artifact into external operational data.
  for (const file of record.files) {
    if (record.removals?.includes(file)) continue;
    const absolute = resolve(root, file);
    if (recordPath(root, realpathSync(absolute)) !== recordPath(root, absolute)) throw new Error('schedule record artifacts cannot use symlinks');
  }
  const observed = evidence ?? checkpointEvidence({ repo: root, base });
  if (observed.dirtyPaths?.some(entry => entry.status === '??' || (entry.status && entry.status[1] !== ' '))) throw new Error('stage the complete schedule record; unstaged or untracked files cannot be published');
  assertRecordScope(record, { ...observed, stagedPaths });
  return record;
}

export function recordPrBody(record, summary) {
  if (!String(summary).trim()) throw new Error('summary must not be empty');
  const instructions = record.kind === 'goal'
    ? `${readFileSync(join(record.root, record.reference, 'proposal.md'), 'utf8')}\n\n${readFileSync(join(record.root, record.reference, 'tasks.md'), 'utf8')}`
    : `\`\`\`json\n${readFileSync(resolve(record.root, record.reference), 'utf8').trim()}\n\`\`\``;
  return `${String(summary).trim()}\n\n## Schedule record\n\n${instructions}\n\n---\n_Record-only checkpoint: ${record.reference}. Publication preserves the ${record.kind === 'goal' ? 'open goal checklist' : 'routine definition'}; execution registration is confirmed separately by host inspection._\n`;
}

export function assertCodeScope({ branchPaths = [], dirtyPaths = [] }, goalRoots = []) {
  const paths = [...branchPaths, ...dirtyPaths.flatMap(entry => [entry.path, entry.from].filter(Boolean))];
  const mixed = paths.filter(path => /^schedules\/[^/]+\.json$/.test(path) || goalRoots.some(root => path === root || path.startsWith(`${root}/`)));
  if (mixed.length) throw new Error(`ordinary code delivery leaves schedule records alone; use --schedule-record for: ${[...new Set(mixed)].join(', ')}`);
}

export function assertTerminalGoal(record) {
  const lifecycle = record.binding?.lifecycle;
  if (record.kind !== 'goal' || !['completed', 'cancelled', 'superseded'].includes(lifecycle?.state) || lifecycle.stopVerified !== true || !lifecycle.evidence || lifecycle.cleanupPending === true) throw new Error('archive-record requires a terminal goal, evidence and verified stopping; cleanup pending stays open');
}
