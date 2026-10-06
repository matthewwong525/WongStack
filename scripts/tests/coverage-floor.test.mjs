import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The scripts' coverage floor is a guard like any other, so it is tested refusing: the committed
// settings file, read by the real tool, on a sample that is half tested. A settings file the tool
// no longer reads would let the sample pass, and this fails.
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const settings = join(repo, 'scripts/tests/.c8rc.json');
const c8 = join(repo, 'scripts/tests/node_modules/.bin/c8');

const SAMPLE = `export function direction(step) {
  if (step > 0) {
    return 'up';
  }
  return 'down';
}
`;
// What stands in for the sample's tests: one call, or one for each way through it.
const use = both => `import { direction } from '../half-tested.mjs';

if (direction(1) !== 'up'${both ? " || direction(-1) !== 'down'" : ''}) process.exit(1);
`;

// Measure the sample in a folder laid out like this repo, so the settings' own paths find it.
function measure(t, both) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-coverage-floor-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of ['scripts/tests', '.agents/skills', '.github/scripts']) mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, 'scripts/half-tested.mjs'), SAMPLE);
  writeFileSync(join(root, 'scripts/tests/use-sample.mjs'), use(both));
  // The suite around this test is measured through NODE_V8_COVERAGE. Left set, a tool that ignored
  // its settings would write into that folder, and clear it first.
  const env = { ...process.env };
  delete env.NODE_V8_COVERAGE;
  const result = spawnSync(c8, ['--config', settings, '--temp-directory', join(root, 'measured'), '--reports-dir', join(root, 'report'),
    process.execPath, 'scripts/tests/use-sample.mjs'], { cwd: root, env, encoding: 'utf8' });
  return { status: result.status, out: `${result.stdout}${result.stderr}` };
}

test('the committed floor refuses a half-tested script, naming what it measured', t => {
  const floor = JSON.parse(readFileSync(settings, 'utf8'));
  const half = measure(t, false);
  assert.notEqual(half.status, 0, half.out);
  for (const kind of ['lines', 'branches']) {
    const refusal = new RegExp(`Coverage for ${kind} \\(([\\d.]+)%\\) does not meet global threshold \\((\\d+)%\\)`).exec(half.out);
    assert.ok(refusal, `${kind}: ${half.out}`);
    assert.equal(Number(refusal[2]), floor[kind], `the ${kind} floor is the committed one`);
    assert.ok(Number(refusal[1]) < floor[kind]);
  }
});

test('the same script, fully tested, passes the floor', t => {
  const whole = measure(t, true);
  assert.equal(whole.status, 0, whole.out);
  assert.doesNotMatch(whole.out, /does not meet/);
});
