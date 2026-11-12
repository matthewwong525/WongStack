#!/usr/bin/env node
// After a sync merges new WongStack text into files the person edited, list any upstream addition that did not make
// it in, for the units the preflight called modified. A line match is loose on purpose: only a dropped section fails.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isMain } from '../../memory/scripts/lib/cli.mjs';

import { installText } from './install-path.mjs';
import { compareSelection, targetValue } from './preflight.mjs';

const SCHEMA_VERSION = 1;
const FIRST_WIDTH = 80;
const USAGE = 'usage: merge-check.mjs --target <dir> --source <dir> [--from <installed commit>] [--record <path>]\n'
  + '  --from defaults to the install record\'s commit. Exit 0: nothing missing; 1: upstream text missing; 2: usage or read error.';

class UsageError extends Error {}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!['--target', '--source', '--from', '--record'].includes(arg)) throw new UsageError(`unknown argument ${arg}`);
    const value = argv[++index];
    if (value === undefined) throw new UsageError(`${arg} needs a value`);
    options[arg.slice(2)] = value;
  }
  if (!options.target || !options.source) throw new UsageError('--target and --source are required');
  return options;
}

// Added lines of `git diff -U0` from one text to another, grouped by hunk, with new-side line numbers.
function addedHunks(oldText, newText) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-merge-check-'));
  let result;
  try {
    writeFileSync(join(dir, 'base'), oldText);
    writeFileSync(join(dir, 'current'), newText);
    result = spawnSync('git', ['diff', '--no-index', '--no-color', '--no-ext-diff', '-U0', 'base', 'current'], { cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  // `--no-index` exits 1 when the texts differ.
  if (result.status !== 0 && result.status !== 1) {
    const error = new Error(`git diff failed: ${String(result.stderr).trim().split('\n')[0]}`);
    error.code = 'git-failed';
    throw error;
  }
  const hunks = [];
  let hunk = null;
  let line = 0;
  for (const text of result.stdout.split('\n')) {
    const header = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(text);
    if (header) {
      line = Number(header[1]);
      hunks.push(hunk = { lines: [] });
      continue;
    }
    if (!hunk || text.startsWith('+++')) continue;
    if (text.startsWith('+')) hunk.lines.push({ at: line++, text: text.slice(1) });
  }
  return hunks.filter(row => row.lines.length);
}

// The 1-based line range of a marked block in a text, or null.
function blockRange(text, markers) {
  const lines = text.split('\n');
  const begin = lines.findIndex(line => line.includes(markers[0]));
  if (begin < 0) return null;
  const end = lines.findIndex((line, index) => index >= begin && line.includes(markers[1]) && (index > begin || line.indexOf(markers[1]) > line.indexOf(markers[0])));
  return end < 0 ? null : [begin + 1, end + 1];
}

function showBlob(source, oid) {
  const result = spawnSync('git', ['-C', source, 'cat-file', 'blob', oid], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) {
    const error = new Error(`git cat-file failed for ${oid}`);
    error.code = 'git-failed';
    throw error;
  }
  return result.stdout;
}

export function mergeCheck({ target, source, from, record }) {
  const compared = compareSelection({ target, source, from, record });
  if (compared.baseline === 'empty') return { schemaVersion: SCHEMA_VERSION, status: 'skipped', skipped: 'no-baseline', checked: 0, files: [] };
  const files = [];
  let checked = 0;
  for (const change of compared.changes) {
    if (change.operation !== 'modified' || change.localState !== 'locally-adapted') continue;
    if (!change.baseEntry || !change.currentEntry) continue;
    checked += 1;
    const { unit } = change;
    // Both sides are read as the install writes them, each by its own commit's pairs: a link into a mapped folder
    // names the install path, and a new pair's rename shows as an added line though the source is unchanged.
    const baseText = installText(unit.sourcePath, showBlob(compared.source, change.baseEntry.oid), compared.baseMapped);
    const currentText = installText(unit.sourcePath, showBlob(compared.source, change.currentEntry.oid), compared.mapped);
    let hunks = addedHunks(baseText, currentText);
    if (unit.kind === 'block') {
      const range = blockRange(currentText, unit.markers);
      hunks = range
        ? hunks.map(row => ({ lines: row.lines.filter(line => line.at >= range[0] && line.at <= range[1]) })).filter(row => row.lines.length)
        : [];
    }
    const local = targetValue(compared.target, unit);
    const have = new Set((local ? local.toString('utf8') : '').split('\n').map(line => line.trim()));
    const missing = [];
    for (const row of hunks) {
      const absent = row.lines.filter(line => line.text.trim() && !have.has(line.text.trim()));
      if (!absent.length) continue;
      const first = row.lines[0].at;
      const last = row.lines[row.lines.length - 1].at;
      missing.push({
        sourceLines: first === last ? `${first}` : `${first}-${last}`,
        count: absent.length,
        first: absent[0].text.trim().slice(0, FIRST_WIDTH),
      });
    }
    if (missing.length) files.push({ targetPath: unit.targetPath, sourcePath: unit.sourcePath, missing });
  }
  return { schemaVersion: SCHEMA_VERSION, status: files.length ? 'missing' : 'clean', checked, files };
}

if (isMain(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv.includes('--help')) {
    process.stdout.write(`${USAGE}\n`);
  } else {
    try {
      const report = mergeCheck(parseArgs(argv));
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      process.exitCode = report.status === 'missing' ? 1 : 0;
    } catch (error) {
      if (error instanceof UsageError) {
        process.stderr.write(`${error.message}\n${USAGE}\n`);
      } else {
        const diagnostic = { code: error?.code ?? 'unexpected-error', message: error?.message ?? 'unexpected merge-check error' };
        process.stdout.write(`${JSON.stringify({ schemaVersion: SCHEMA_VERSION, status: 'error', checked: 0, files: [], diagnostics: [diagnostic] }, null, 2)}\n`);
      }
      process.exitCode = 2;
    }
  }
}
