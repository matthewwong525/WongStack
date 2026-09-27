import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// server/setup.sh. A host embeds the script in first-boot data, so its size
// is part of the contract in server/README.md.
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = resolve(repo, 'server/setup.sh');
const BUDGET = 12 * 1024;

test('the script stays inside the size budget', () => {
  const size = statSync(script).size;
  assert.ok(size <= BUDGET, `server/setup.sh is ${size} bytes; the budget is ${BUDGET}`);
});

test('the script parses as bash', () => {
  const run = spawnSync('bash', ['-n', script], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
});
