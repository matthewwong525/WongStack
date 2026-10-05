#!/usr/bin/env node
// Code check: does an app's server side, or a main handler, name a saved key
// its route does not list?
//
// The Worker hands a route only the saved keys it lists (app/worker/keys.ts is
// the registry; wiki/stack/company-api.md owns the rule), and Access shows the
// owner that same list. A handler that reads a key its route does not list
// gets nothing at run time, with no error until a person uses it. This finds
// it before publishing.
//
// A file under app/worker/apps/<name>/ may name a registered secret when the
// key is listed in that file (`keys: ["stripe"]` on its action) or in the app's
// api.ts (`export const keys = ["stripe"]`). A file under app/worker/api/ may
// name one when the key is listed in that file or in router.ts's `routeAccess`.
// Test files are not read.
//
// Exit 0 when every named secret is listed, 1 when one is not, 2 on a usage error.
// Usage: node scripts/check-app-keys.mjs [--root <repo>]

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseCli } from './lib-cli.mjs';

const USAGE = `usage: node scripts/check-app-keys.mjs [--root <repo>]

--root <repo>  the repo to check; default: the one this script sits in`;

const { values } = parseCli({ usage: USAGE, options: { root: { type: 'string' } } });
const root = resolve(values.root ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
const worker = join(root, 'app', 'worker');
const registry = join(worker, 'keys.ts');

if (!existsSync(registry)) {
  console.log('app keys: no key registry at app/worker/keys.ts, so nothing to check');
  process.exit(0);
}
const { keys } = await import(pathToFileURL(registry).href);

/** Every source file under `dir`, test files left out. */
const sources = dir => (existsSync(dir) ? readdirSync(dir, { recursive: true, withFileTypes: true }) : [])
  .filter(entry => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts'))
  .map(entry => join(entry.parentPath, entry.name));

/** The key ids a file lists: `keys: [...]` on an action or a mapping, or `export const keys = [...]`. */
const listed = file => new Set(existsSync(file)
  ? [...readFileSync(file, 'utf8').matchAll(/\bkeys\b[^\n]*?[:=]\s*\[([^\]]*)\]/g)]
    .flatMap(match => [...match[1].matchAll(/["'`]([^"'`]+)["'`]/g)].map(found => found[1]))
  : []);

/** Each registered key whose secret `file` names without the key being listed in `file` or in `shared`. */
function unlisted(file, shared) {
  const text = readFileSync(file, 'utf8');
  const own = listed(file);
  return Object.entries(keys).flatMap(([id, key]) => own.has(id) || shared.has(id) ? [] : key.secrets
    .filter(secret => new RegExp(`\\b${secret}\\b`).test(text))
    .map(secret => `${relative(root, file)}: names ${secret}, but its route does not list the key "${id}"`));
}

const apps = join(worker, 'apps');
const folders = existsSync(apps) ? readdirSync(apps, { withFileTypes: true }).filter(entry => entry.isDirectory()) : [];
const problems = [
  ...folders.flatMap(folder => sources(join(apps, folder.name)).flatMap(file => unlisted(file, listed(join(apps, folder.name, 'api.ts'))))),
  ...sources(join(worker, 'api')).flatMap(file => unlisted(file, listed(join(worker, 'api', 'router.ts')))),
];

if (problems.length) {
  for (const problem of problems) console.error(problem);
  console.error(`\n${problems.length} saved key(s) named but not listed. A route is handed only the keys it lists: add \`keys: ["<id>"]\` to the action, \`export const keys = ["<id>"]\` to the app's api.ts, or \`keys\` to the route's entry in app/worker/api/router.ts.`);
  process.exit(1);
}
console.log(`app keys: every saved key named in ${folders.length} app(s) and the main handlers is listed by its route`);
