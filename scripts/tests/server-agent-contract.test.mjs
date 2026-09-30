// server/README.md's job table is contract 1: the agent's runJob handles exactly the job types it lists.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { CONTRACT } from '../../server/agent/agent.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (file) => readFileSync(resolve(repo, file), 'utf8');

/** The job types in the README's table under "Contract 1": each row's first cell. */
function documentedTypes(readme) {
  const section = /^### Contract 1\n([\s\S]*?)(?=^#{2,3} )/m.exec(readme)?.[1] ?? '';
  const table = /^\| Type \|.*\n\|[- |]+\|\n((?:\|.*\n)+)/m.exec(section)?.[1] ?? '';
  return table.split('\n').filter(Boolean).map((row) => /^\| `([^`]+)` \|/.exec(row)?.[1]).filter(Boolean);
}

/** The job types runJob's switch handles: each `case "<type>":` inside it. */
function handledTypes(source) {
  const body = /^export async function runJob\(.*\n([\s\S]*?)\n\}\n/m.exec(source)?.[1] ?? '';
  return [...body.matchAll(/^\s*case "([^"]+)":/gm)].map((match) => match[1]);
}

/** Every type on one side and not the other, named. */
function differences(documented, handled) {
  return [
    ...handled.filter((type) => !documented.includes(type)).map((type) => `the agent handles \`${type}\`, which server/README.md's job table does not list`),
    ...documented.filter((type) => !handled.includes(type)).map((type) => `server/README.md lists \`${type}\`, which the agent does not handle`),
  ];
}

test('the README job table and the agent handle the same job types', () => {
  const documented = documentedTypes(read('server/README.md'));
  const handled = handledTypes(read('server/agent/agent.mjs'));
  assert.ok(documented.length, "server/README.md's Contract 1 has no job table");
  assert.ok(handled.length, "server/agent/agent.mjs's runJob has no cases");
  assert.deepEqual(differences(documented, handled), []);
});

test('a row missing from the table, or an extra one, is named', () => {
  const readme = read('server/README.md');
  const handled = handledTypes(read('server/agent/agent.mjs'));
  const withoutPair = readme.replace(/^\| `pair` \|.*\n/m, '');
  assert.notEqual(withoutPair, readme);
  assert.deepEqual(differences(documentedTypes(withoutPair), handled), ["the agent handles `pair`, which server/README.md's job table does not list"]);
  const withShell = readme.replace(/^(\| `pair` \|.*\n)/m, '$1| `shell` | none | none |\n');
  assert.deepEqual(differences(documentedTypes(withShell), handled), ['server/README.md lists `shell`, which the agent does not handle']);
});

test('the README names the contract the agent declares', () => {
  assert.equal(CONTRACT, 1);
  const readme = read('server/README.md');
  assert.match(readme, new RegExp(`^### Contract ${CONTRACT}$`, 'm'));
  assert.ok(readme.includes(`\`CONTRACT = ${CONTRACT}\``));
});
