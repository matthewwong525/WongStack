import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = resolve(dirname(fileURLToPath(import.meta.url)), '../check-openspec-config.mjs');

// Runs the check in a repo with `config`. With `stdout`, a fake `openspec`
// prints it and exits with `code`; without, the real CLI on PATH answers.
function check(t, stdout, code, config = 'schema: spec-driven\n') {
  const root = mkdtempSync(join(tmpdir(), 'openspec-config-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'openspec'));
  writeFileSync(join(root, 'openspec/config.yaml'), config);
  mkdirSync(join(root, 'bin'));
  if (stdout != null) {
    writeFileSync(join(root, 'bin/out'), stdout);
    writeFileSync(join(root, 'bin/openspec'), `#!/usr/bin/env bash\ncat "$(dirname "$0")/out"\nexit ${code}\n`);
    chmodSync(join(root, 'bin/openspec'), 0o755);
  }
  const env = { ...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}` };
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', env });
  return { status: result.status, out: `${result.stdout}${result.stderr}` };
}

test('a non-zero exit without JSON fails the check', t => {
  const result = check(t, 'Error: something broke', 1);
  assert.equal(result.status, 1, result.out);
  assert.match(result.out, /exited 1 without JSON/);
});

test('a non-zero exit with a JSON answer passes', t => {
  const result = check(t, '{"changes":[]}', 1);
  assert.equal(result.status, 0, result.out);
});

test('an exit 0 without JSON fails the check', t => {
  const result = check(t, "it's fine", 0);
  assert.equal(result.status, 1, result.out);
  assert.match(result.out, /exited 0 without JSON/);
});

test('an error in the JSON status fails the check', t => {
  const result = check(t, JSON.stringify({ status: [{ severity: 'error', message: 'config could not be read as YAML' }] }), 1);
  assert.equal(result.status, 1, result.out);
  assert.match(result.out, /could not be read as YAML/);
});

// The real parser is the one that matters. CI installs it; a laptop without it skips.
const hasCli = !spawnSync('openspec', ['--version']).error;
test('the real OpenSpec CLI fails a config it cannot read', { skip: !hasCli && !process.env.CI && 'the openspec CLI is not on PATH' }, t => {
  assert.ok(hasCli, 'CI must have the openspec CLI on PATH');
  const broken = {
    'a parse error': 'schema: spec-driven\nrules: [a, b\n',
    'an unquoted colon-space in a rule': 'schema: spec-driven\nrules:\n  proposal:\n    - Keep it short: one page\n',
  };
  for (const [name, config] of Object.entries(broken)) {
    const result = check(t, null, 0, config);
    assert.equal(result.status, 1, `${name}: ${result.out}`);
    assert.match(result.out, /FAIL {2}openspec\/config\.yaml/, name);
  }
  const good = check(t, null, 0);
  assert.equal(good.status, 0, good.out);
});
