import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'check-runtime-tests.mjs');
const ENTRY = 'import { hello } from "./apps/hello.ts";\nimport { orders } from "./apps/orders.ts";\n';

// Runs the check on a throwaway repo holding `files` under app/.
function check(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-runtime-tests-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, 'app', path)), { recursive: true });
    writeFileSync(join(root, 'app', path), text);
  }
  const result = spawnSync(process.execPath, [script, '--root', root], { encoding: 'utf8' });
  return { status: result.status, out: `${result.stdout}${result.stderr}` };
}

const tree = {
  'worker/apps/hello/api.ts': 'export const routes = new Map();\n',
  'worker/apps/orders/api.ts': 'export const routes = new Map();\n',
  // A folder with no api.ts has no server code, so it needs no file.
  'worker/apps/shared/rows.ts': 'export {};\n',
  'tests/runtime/apps/hello.ts': 'export {};\n',
  'tests/runtime/apps/orders.ts': 'export {};\n',
  'tests/runtime/runtime.test.ts': ENTRY,
};

test('every server app with its own file, imported by the entry, passes', t => {
  const { status, out } = check(t, tree);
  assert.equal(status, 0, out);
  assert.match(out, /each of 2 app\(s\) with server code/);
});

test('a server app with no runtime file fails, naming the app and the file to add', t => {
  const { 'tests/runtime/apps/orders.ts': _, ...without } = tree;
  const { status, out } = check(t, without);
  assert.equal(status, 1);
  assert.match(out, /orders\s+\(add tests\/runtime\/apps\/orders\.ts\)/);
  assert.doesNotMatch(out, /hello/);
});

test('a runtime file the entry does not import fails, naming the import to add', t => {
  const { status, out } = check(t, { ...tree, 'tests/runtime/runtime.test.ts': 'import { hello } from "./apps/hello.ts";\n' });
  assert.equal(status, 1);
  assert.match(out, /orders\s+\(import \.\/apps\/orders\.ts in tests\/runtime\/runtime\.test\.ts\)/);
});
