#!/usr/bin/env node
// Code check: does an app's server side, or a main handler, name a saved key its route does not list?
// app/worker/keys.ts is the registry; wiki/stack/company-api.md owns the rule.

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
// The direct-use, purpose and guide rules the Access module holds a key to; an older app keeps its own, or has none.
const rules = [join(root, '.agents/skills/access/server/key-rules.mjs'), join(worker, 'key-rules.ts')].find(file => existsSync(file));
const ruled = rules ? (await import(pathToFileURL(rules).href)).keyProblems(keys).map(problem => `app/worker/keys.ts: ${problem}`) : [];

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

if (ruled.length) {
  for (const problem of ruled) console.error(problem);
  console.error(`\n${ruled.length} key rule(s) broken: wiki/stack/company-api.md#use-a-key-directly`);
  process.exit(1);
}
if (problems.length) {
  for (const problem of problems) console.error(problem);
  console.error(`\n${problems.length} saved key(s) named but not listed. A route is handed only the keys it lists: add \`keys: ["<id>"]\` to the action, \`export const keys = ["<id>"]\` to the app's api.ts, or \`keys\` to the route's entry in app/worker/api/router.ts.`);
  process.exit(1);
}
console.log(`app keys: every saved key named in ${folders.length} app(s) and the main handlers is listed by its route`);
