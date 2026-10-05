// The routine runner ships with the Cloudflare stack pack: every file in scripts/routine-runner/ is
// in the payload inventory, nothing generated is, and the pages that name it are linked.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const read = (rel) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');
const inventory = JSON.parse(read('.agents/skills/wong-sync/references/payload-files.json'));
const FOLDER = 'scripts/routine-runner';
// What the first /routine writes or installs in a target: never payload.
const GENERATED = new Set(['wrangler.jsonc', 'node_modules', '.wrangler']);

test('the pack lists exactly the routine runner\'s own files', () => {
  const onDisk = readdirSync(new URL(`../../${FOLDER}/`, import.meta.url)).filter((name) => !GENERATED.has(name)).map((name) => `${FOLDER}/${name}`).sort();
  const listed = inventory.pack.files.filter((file) => file.startsWith(`${FOLDER}/`)).sort();
  assert.deepEqual(listed, onDisk);
  for (const name of ['worker.mjs', 'routines.mjs', 'run.mjs', 'schedule.mjs', 'wrangler.template.jsonc', 'package.json', 'package-lock.json']) assert.ok(listed.includes(`${FOLDER}/${name}`), name);
  assert.ok(!inventory.pack.files.includes(`${FOLDER}/wrangler.jsonc`), 'the filled config carries an account id and stays in the target');
});

test('/routine ships with every script it imports, and setup\'s own scripts are not among them', () => {
  for (const skill of ['routine', 'memory', 'hand-over', 'ship']) assert.ok(inventory.core.skillDirs.includes(skill), skill);
  assert.ok(!inventory.core.skillDirs.includes('wong-setup'), 'setup is not installed in a project');
  const client = read('.agents/skills/routine/scripts/routine.mjs');
  const shared = read('.agents/skills/routine/scripts/lib/cloudflare.mjs');
  for (const source of [client, shared]) assert.doesNotMatch(source, /wong-setup/, 'a routine script reaches into setup, which a project does not have');
  // The client reads the runner's own rules, so each pack file it imports is listed.
  for (const name of ['routines.mjs', 'run.mjs', 'schedule.mjs']) {
    assert.ok(client.includes(`'../../../../${FOLDER}/${name}'`), name);
    assert.ok(inventory.pack.files.includes(`${FOLDER}/${name}`), name);
  }
  // Setup shares the Cloudflare steps by importing them from the routine skill, never the reverse.
  assert.match(read('.agents/skills/wong-setup/scripts/provision.mjs'), /from '\.\.\/\.\.\/routine\/scripts\/lib\/cloudflare\.mjs'/);
});

test('the routines page is in the stack hub, and the manifest names the runner in the pack', () => {
  assert.ok(inventory.pack.dirs.includes('wiki/stack'));
  assert.match(read('wiki/stack/README.md'), /\]\(cloud-routines\.md\)/);
  assert.match(read('.agents/skills/wong-sync/references/payload-manifest.md'), /scripts\/routine-runner\/worker\.mjs/);
  assert.doesNotMatch(read('.agents/skills/wong-sync/references/payload-manifest.md'), /Paseo scheduler/);
});
