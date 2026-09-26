import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = resolve(dirname(fileURLToPath(import.meta.url)), '../check-openspec-config.mjs');

// Runs the check in a repo with a config and a fake `openspec` that prints
// `stdout` and exits with `code`.
function check(t, stdout, code) {
  const root = mkdtempSync('/tmp/openspec-config-');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'openspec'));
  writeFileSync(join(root, 'openspec/config.yaml'), 'schema: spec-driven\n');
  mkdirSync(join(root, 'bin'));
  writeFileSync(join(root, 'bin/openspec'), `#!/usr/bin/env bash\nprintf '%s' '${stdout}'\nexit ${code}\n`);
  chmodSync(join(root, 'bin/openspec'), 0o755);
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
