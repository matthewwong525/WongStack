#!/usr/bin/env node
// After a sync merges new WongStack text into files the person edited, list any
// upstream addition that did not make it in. It reuses the preflight's selection,
// so it checks exactly the units the preflight called modified and locally adapted.
// A line match is loose on purpose: a moved or reworded line passes, a dropped
// section does not. The report names where to look, never file bodies.

import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

// Added lines of `git diff -U0 <old blob> <new blob>`, grouped by hunk, with new-side line numbers.
function addedHunks(source, oldOid, newOid) {
  const result = spawnSync('git', ['-C', source, 'diff', '--no-color', '--no-ext-diff', '-U0', oldOid, newOid], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) {
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
    let hunks = addedHunks(compared.source, change.baseEntry.oid, change.currentEntry.oid);
    if (unit.kind === 'block') {
      const range = blockRange(showBlob(compared.source, change.currentEntry.oid), unit.markers);
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

function isDirectRun() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
  }
}

if (isDirectRun()) {
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
