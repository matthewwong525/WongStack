#!/usr/bin/env node
// Code check: does an app's server side, or a main handler, name a saved key its route does not list, or the MCP
// sign-in seal outside app/worker/mcp/? app/worker/keys.ts is the registry; wiki/stack/company-api.md owns the rule.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
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
const sources = (dir, kind = /(?<!\.test)\.ts$/) => (existsSync(dir) ? readdirSync(dir, { recursive: true, withFileTypes: true }) : [])
  .filter(entry => entry.isFile() && kind.test(entry.name))
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

const SEAL = 'WONG_MCP_SEAL';
const mcp = join(worker, 'mcp');
/** Each file outside app/worker/mcp/ that names the seal: only that folder may open a stored sign-in. */
const sealNamed = [...sources(worker), ...sources(join(root, 'app', 'src'), /(?<!\.test)\.tsx?$/)]
  .filter(file => !file.startsWith(`${mcp}${sep}`) && new RegExp(`\\b${SEAL}\\b`).test(readFileSync(file, 'utf8')))
  .map(file => `${relative(root, file)}: names ${SEAL}, which only app/worker/mcp/ may read: import what you need from there`);

const apps = join(worker, 'apps');
const folders = existsSync(apps) ? readdirSync(apps, { withFileTypes: true }).filter(entry => entry.isDirectory()) : [];
const problems = [
  ...folders.flatMap(folder => sources(join(apps, folder.name)).flatMap(file => unlisted(file, listed(join(apps, folder.name, 'api.ts'))))),
  ...sources(join(worker, 'api')).flatMap(file => unlisted(file, listed(join(worker, 'api', 'router.ts')))),
  ...sealNamed,
];

if (problems.length) {
  for (const problem of problems) console.error(problem);
  if (sealNamed.length) console.error(`\n${SEAL} seals each person's MCP sign-in; any route that names it could read them all.`);
  if (problems.length > sealNamed.length) console.error(`\n${problems.length - sealNamed.length} saved key(s) named but not listed. A route is handed only the keys it lists: add \`keys: ["<id>"]\` to the action, \`export const keys = ["<id>"]\` to the app's api.ts, or \`keys\` to the route's entry in app/worker/api/router.ts.`);
  process.exit(1);
}
console.log(`app keys: every saved key named in ${folders.length} app(s) and the main handlers is listed by its route`);
