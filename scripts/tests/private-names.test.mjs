import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(import.meta.url);
const repo = resolve(dirname(here), '../..');

// Private downstream repositories and services. This list lives here only.
const PRIVATE = /claymoo|wongos|wongstack-cloud/i;

// The changelog and the archive are the record and keep their names. Active
// changes are exempt too: a change that removes a name has to say it, and it
// moves to the archive when it ships. This file holds the list itself.
const isRecord = path =>
  path === 'CHANGELOG.md' || path.startsWith('openspec/changes/') || path === relative(repo, here);

function privateHits(files) {
  return files.filter(({ path, text }) => !isRecord(path) && PRIVATE.test(text)).map(({ path }) => path);
}

// Tracked regular files as they are in the working tree. A link's text is its
// target, and a deleted file has no text, so both are skipped.
function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], { cwd: repo, encoding: 'utf8' })
    .split('\0')
    .filter(path => path && existsSync(join(repo, path)) && lstatSync(join(repo, path)).isFile())
    .map(path => ({ path, text: readFileSync(join(repo, path), 'utf8') }));
}

test('the matcher flags live files and spares the record', () => {
  const sample = [
    { path: 'wiki/example.md', text: 'Run it in ClaymooApp.' },
    { path: 'scripts/tests/x.test.mjs', text: "const host = 'wongstack-cloud';" },
    { path: 'README.md', text: 'Built for WongOS.' },
    { path: 'CHANGELOG.md', text: 'Fixed for ClaymooApp.' },
    { path: 'openspec/changes/archive/2026-01-01-x/proposal.md', text: 'wongstack-cloud' },
    { path: 'openspec/changes/some-change/tasks.md', text: 'Replace ClaymooApp.' },
    { path: 'wiki/clean.md', text: 'Run it in MyApp.' },
  ];
  assert.deepEqual(privateHits(sample), ['wiki/example.md', 'scripts/tests/x.test.mjs', 'README.md']);
});

test('no live tracked file names a private downstream repo or service', () => {
  assert.deepEqual(privateHits(trackedFiles()), [],
    'use a generic name (MyApp, "hosted setups"); only CHANGELOG.md and openspec/changes/ keep private names');
});
