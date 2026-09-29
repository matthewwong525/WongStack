import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
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

// Every place that names the OpenSpec version moves together; CI's pin is the reference.
const PINS = [
  'server/setup.sh',
  '.agents/skills/save/references/preconditions.md',
  '.github/CONTRIBUTING.md',
];

test('every OpenSpec pin matches the version CI checks the skills against', () => {
  const pinned = file => readFileSync(resolve(repo, file), 'utf8').match(/@fission-ai\/openspec@([\w.-]+)/)?.[1];
  const ci = pinned('.github/workflows/payload.yml');
  assert.ok(ci, '.github/workflows/payload.yml installs an unpinned OpenSpec');
  for (const file of PINS) {
    const pin = pinned(file);
    assert.ok(pin, `${file} names no pinned OpenSpec version`);
    assert.equal(pin, ci, `${file} pins OpenSpec ${pin}, but .github/workflows/payload.yml pins ${ci}`);
  }
});

// The final check and server/README.md's end state promise the same tools; a
// host reads the README, so a tool on one side only breaks it silently.
test('the final check names the tools the end state promises', () => {
  const checked = new Set(readFileSync(script, 'utf8').match(/^for tool in ([^;]+);/m)?.[1].trim().split(/\s+/));
  const readme = readFileSync(resolve(repo, 'server/README.md'), 'utf8');
  const bullet = readme.split(/^## The end state$/m)[1]?.match(/^- (.+)$/m)?.[1] ?? '';
  const promised = new Set([...bullet.matchAll(/`([^`]+)`/g)].map(m => m[1]));
  assert.ok(checked.size, 'server/setup.sh has no `for tool in` check');
  assert.ok(promised.size, "server/README.md's end state names no tools");
  const only = (a, b) => [...a].filter(t => !b.has(t));
  assert.deepEqual(only(checked, promised), [], 'checked by setup.sh but not in the end state');
  assert.deepEqual(only(promised, checked), [], 'in the end state but not checked by setup.sh');
});

// A new server gets the Node the rest of the repo uses; .nvmrc is the reference.
test("the script installs .nvmrc's Node major", () => {
  const nvmrc = readFileSync(resolve(repo, '.nvmrc'), 'utf8').trim().match(/^v?(\d+)/)?.[1];
  const setup = readFileSync(script, 'utf8').match(/deb\.nodesource\.com\/setup_(\d+)\.x/)?.[1];
  assert.ok(nvmrc, '.nvmrc names no Node major');
  assert.ok(setup, 'server/setup.sh installs no NodeSource major');
  assert.equal(setup, nvmrc, `server/setup.sh installs Node ${setup}, but .nvmrc says ${nvmrc}`);
});
