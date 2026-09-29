import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PIN_FILES } from '../../.agents/skills/update-dependencies/scripts/update.mjs';

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

// Every place that names the OpenSpec version moves together; CI's pin, the first, is the reference.
test('every OpenSpec pin matches the version CI checks the skills against', () => {
  const pinned = file => readFileSync(resolve(repo, file), 'utf8').match(/@fission-ai\/openspec@([\w.-]+)/)?.[1];
  const [reference, ...pins] = PIN_FILES;
  assert.equal(reference, '.github/workflows/payload.yml');
  const ci = pinned(reference);
  assert.ok(ci, '.github/workflows/payload.yml installs an unpinned OpenSpec');
  for (const file of pins) {
    const pin = pinned(file);
    assert.ok(pin, `${file} names no pinned OpenSpec version`);
    assert.equal(pin, ci, `${file} pins OpenSpec ${pin}, but .github/workflows/payload.yml pins ${ci}`);
  }
});

// A server runs the Node.js major CI tests; the update script moves .nvmrc.
test('the server installs the Node.js major .nvmrc names', () => {
  const server = readFileSync(script, 'utf8').match(/setup_(\d+)\.x/)?.[1];
  const ci = readFileSync(resolve(repo, '.nvmrc'), 'utf8').trim().replace(/^v/, '').split('.')[0];
  assert.ok(server, 'server/setup.sh names no nodesource setup_<major>.x');
  assert.equal(server, ci, `server/setup.sh installs Node.js ${server}, but .nvmrc names ${ci}`);
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
