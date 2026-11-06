#!/usr/bin/env node
// Code check: does each app part with server code have its own real-database test, run by the one runtime entry?
// wiki/stack/testing.md owns the rule and says how to add the file.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCli } from './lib-cli.mjs';

const USAGE = `usage: node scripts/check-runtime-tests.mjs [--root <repo>]

Fail when an app/worker/apps/<name>/ with an api.ts has no app/tests/runtime/apps/<name>.ts, or the entry
app/tests/runtime/runtime.test.ts does not import it.
--root <repo>  the repo to check; default: the one this script sits in`;

const { values } = parseCli({ usage: USAGE, options: { root: { type: 'string' } } });
const app = join(resolve(values.root ?? join(dirname(fileURLToPath(import.meta.url)), '..')), 'app');
const apps = join(app, 'worker', 'apps');
const entry = join(app, 'tests', 'runtime', 'runtime.test.ts');

const server = existsSync(apps) ? readdirSync(apps, { withFileTypes: true })
  .filter(folder => folder.isDirectory() && existsSync(join(apps, folder.name, 'api.ts'))).map(folder => folder.name).sort() : [];
const imports = existsSync(entry) ? readFileSync(entry, 'utf8') : '';
const escaped = name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** What `name` lacks, as the fix to make, or null when its file exists and the entry imports it. */
function missing(name) {
  const file = `tests/runtime/apps/${name}.ts`;
  if (!existsSync(join(app, file))) return `add ${file}`;
  return new RegExp(`from\\s+["']\\./apps/${escaped(name)}\\.ts["']`).test(imports) ? null : `import ./apps/${name}.ts in tests/runtime/runtime.test.ts`;
}

const problems = server.map(name => [name, missing(name)]).filter(([, fix]) => fix);
if (problems.length) {
  const width = Math.max(...problems.map(([name]) => name.length));
  console.error(`✗ Each app part with server code needs its own real-database test:\n${
    problems.map(([name, fix]) => `    ${name.padEnd(width)}  (${fix})`).join('\n')}\nHow to add one: wiki/stack/testing.md`);
  process.exit(1);
}
console.log(`runtime tests: each of ${server.length} app(s) with server code has its own real-database test`);
