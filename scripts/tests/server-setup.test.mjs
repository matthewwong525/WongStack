import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// server/setup.sh and the contract in server/README.md. A host embeds the
// script in first-boot data, so its size is part of the contract.
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = resolve(repo, 'server/setup.sh');
const readme = readFileSync(resolve(repo, 'server/README.md'), 'utf8');
const BUDGET = 12 * 1024;
const TOOLS = ['node', 'git', 'gh', 'openspec', 'paseo', 'claude', 'codex', 'opencode', 'agent-browser'];

test('the script stays inside the size budget', () => {
  const size = statSync(script).size;
  assert.ok(size <= BUDGET, `server/setup.sh is ${size} bytes; the budget is ${BUDGET}`);
  assert.match(readme, /at most 12 KiB/);
});

test('the script parses as bash', () => {
  const run = spawnSync('bash', ['-n', script], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
});

test('the script stops on the first failed command', () => {
  assert.match(readFileSync(script, 'utf8'), /^set -euo pipefail$/m);
});

test('the final check covers every tool the contract promises', () => {
  const text = readFileSync(script, 'utf8');
  const checked = text.match(/^for tool in (.+); do$/m)?.[1].split(' ');
  assert.deepEqual(checked, TOOLS);
  for (const tool of TOOLS) assert.ok(readme.includes(`\`${tool}\``), `server/README.md does not name ${tool}`);
  assert.match(text, /systemctl is-active --quiet paseo\.service/);
});

test('the script leaves the host paths alone', () => {
  const text = readFileSync(script, 'utf8');
  assert.doesNotMatch(text, /\/(etc|opt)\/wongstack/);
  assert.match(readme, /`\/etc\/wongstack` or `\/opt\/wongstack`/);
});
