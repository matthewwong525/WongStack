#!/usr/bin/env node
// Code check: does a skill read a saved business key itself, or call a company
// action it does not declare?
//
// A skill does its business work through company actions, under the login of
// whoever runs it (wiki/stack/company-api.md owns the rule), and Access works
// out who can run a skill from the actions its `actions.json` lists. A skill
// that reads a key works only on the device that holds the key. One that calls
// an action it does not list shows in Access as needing less than it does.
// This finds both before publishing.
//
// A skill folder is a directory under .agents/skills/. The check fails when:
//   - a file in it names a secret of a registered business-service key
//     (app/worker/keys.ts is the registry). A key marked `setup` (setup makes
//     it) or `alone` (the Worker's own route uses it) is the stack's own key,
//     not a business-service key: wong-setup's scripts name those to install
//     them, so they are exempt;
//   - a file in it calls a literal action id through the shared helper, as
//     `company-api.mjs call <id>` or `.call('<id>'`, and the `actions.json`
//     beside its SKILL.md does not list that id, or is missing. A `memory.*`
//     id is a memory read, not a company action, so it needs no listing.
//     `list` and `describe` call nothing;
//   - its `actions.json` is not `{ "title": "...", "actions": ["<id>"] }`.
// Whether each listed id is an action the app has is not checked here: only the
// app's build knows the registered ids, so a test in the app suite does that.
// With no key registry, declared actions are still checked. Test files,
// `node_modules`, and files that are not text or are over 1 MB are not read.
//
// It closes the app's `npm test`, and .github/scripts/checks.mjs runs it on
// every change, a docs-only one included: a skill's text is Markdown, which the
// suite skips.
//
// Exit 0 when every skill passes, 1 when one does not, 2 on a usage error.
// Usage: node scripts/check-skill-actions.mjs [--root <repo>]

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseCli } from './lib-cli.mjs';

const USAGE = `usage: node scripts/check-skill-actions.mjs [--root <repo>]

--root <repo>  the repo to check; default: the one this script sits in`;

const { values } = parseCli({ usage: USAGE, options: { root: { type: 'string' } } });
const root = resolve(values.root ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
const skills = join(root, '.agents', 'skills');
const registry = join(root, 'app', 'worker', 'keys.ts');

const registered = existsSync(registry);
if (!registered) console.log('skill actions: no key registry at app/worker/keys.ts, so only declared actions are checked');
const { keys } = registered ? await import(pathToFileURL(registry).href) : { keys: {} };
/** Each business-service key: the stack's own keys, made by setup or used by the Worker alone, are left out. */
const business = Object.entries(keys).filter(([, key]) => !key.setup && !key.alone);

const MAX_BYTES = 1024 * 1024;
const ID = '[a-z][a-z0-9-]*(?:\\.[a-z][a-z0-9-]*)+';
const QUOTE = '["\'`]';
// A call through the helper: its command, typed or as the words of a spawned one, and its client's method.
const CALLS = [
  new RegExp(`company-api\\.mjs${QUOTE}?[\\s,]+${QUOTE}?call${QUOTE}?[\\s,]+${QUOTE}?(${ID})(?![\\w-]|\\.\\w)`, 'g'),
  new RegExp(`\\.call\\(\\s*${QUOTE}(${ID})${QUOTE}`, 'g'),
];

/** Every text file under `dir`: test files, `node_modules`, and huge or binary files left out. */
function texts(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : texts(path);
    if (!entry.isFile() || entry.name.includes('.test.') || statSync(path).size > MAX_BYTES) return [];
    const text = readFileSync(path, 'utf8');
    return text.includes('\0') ? [] : [{ path, text }];
  });
}

/** The company action ids `text` calls through the helper, each once; memory reads left out. */
const called = text => [...new Set(CALLS.flatMap(pattern => [...text.matchAll(pattern)].map(match => match[1])))]
  .filter(id => !id.startsWith('memory.'));

/** A skill's actions.json: whether it is there, the ids it lists (null when the list can not be read), and what is wrong with it. */
function declared(dir) {
  const file = join(dir, 'actions.json');
  if (!existsSync(file)) return { present: false, ids: new Set(), wrong: [] };
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return { present: true, ids: null, wrong: ['declares its actions in a file that is not valid JSON'] };
  }
  const titled = typeof data?.title === 'string' && data.title.trim() !== '';
  const listed = Array.isArray(data?.actions) && data.actions.every(id => typeof id === 'string');
  return { present: true, ids: listed ? new Set(data.actions) : null, wrong: [
    ...(titled ? [] : ['declares no "title", the name Access shows']),
    ...(listed ? [] : ['declares no "actions" list of action ids']),
  ] };
}

const folders = (existsSync(skills) ? readdirSync(skills, { withFileTypes: true }) : [])
  .filter(entry => entry.isDirectory()).map(entry => ({ name: entry.name, ...declared(join(skills, entry.name)) }));
const problems = folders.flatMap(({ name, present, ids, wrong }) => {
  const at = file => `${relative(root, file)}: the skill "${name}"`;
  return [
    ...wrong.map(what => `${at(join(skills, name, 'actions.json'))} ${what}`),
    ...texts(join(skills, name)).flatMap(({ path, text }) => [
      ...business.flatMap(([id, key]) => key.secrets.filter(secret => new RegExp(`\\b${secret}\\b`).test(text))
        .map(secret => `${at(path)} names ${secret}, a secret of the saved key "${id}"`)),
      // An unreadable list already has its own line; every call against it would only repeat it.
      ...(ids ? called(text).filter(id => !ids.has(id)) : [])
        .map(id => `${at(path)} calls ${id}, ${present ? 'which its actions.json does not list' : 'but has no actions.json'}`),
    ]),
  ];
});

if (problems.length) {
  for (const problem of problems) console.error(problem);
  console.error(`\n${problems.length} skill problem(s). A skill does business work through company actions, never with a saved key: call the action with \`node scripts/company-api.mjs call <id> --file -\`, under the login of whoever runs the skill, and list every action it calls in the actions.json beside its SKILL.md: { "title": "<name>", "actions": ["<id>"] }.`);
  process.exit(1);
}
console.log(`skill actions: ${folders.length} skill(s) read, ${folders.filter(folder => folder.present).length} declaring actions: none names a business key's secret or calls an action it does not list`);
