// The check runner ships with the Cloudflare stack pack: every file in scripts/check-runner/ is in
// the payload inventory, nothing generated is, and the pages that name it are linked.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const read = (rel) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');
const inventory = JSON.parse(read('.agents/skills/wong-sync/references/payload-files.json'));
const FOLDER = 'scripts/check-runner';
// What setup writes or installs in a target: never payload.
const GENERATED = new Set(['wrangler.jsonc', 'node_modules', '.wrangler']);

test('the pack lists exactly the check runner\'s own files', () => {
  const onDisk = readdirSync(new URL(`../../${FOLDER}/`, import.meta.url)).filter((name) => !GENERATED.has(name)).map((name) => `${FOLDER}/${name}`).sort();
  const listed = inventory.pack.files.filter((file) => file.startsWith(`${FOLDER}/`)).sort();
  assert.deepEqual(listed, onDisk);
  for (const name of ['worker.mjs', 'pipeline.mjs', 'run-id.mjs', 'wrangler.template.jsonc', 'package.json', 'package-lock.json']) assert.ok(listed.includes(`${FOLDER}/${name}`), name);
  assert.ok(!inventory.pack.files.includes(`${FOLDER}/wrangler.jsonc`), 'the filled config carries an account id and stays in the target');
});

test('the scripts the verbs call on this route ship with their skills', () => {
  for (const skill of ['save', 'ship', 'explore']) assert.ok(inventory.core.skillDirs.includes(skill), skill);
  for (const file of ['.agents/skills/save/scripts/delivery-route.mjs', '.agents/skills/save/scripts/artifacts-credential.mjs', '.agents/skills/save/scripts/artifacts-run.mjs', '.agents/skills/ship/scripts/publish-artifacts.sh']) assert.ok(read(file).length > 0, file);
  // The run reader imports the runner's naming rule, so the pack file it needs is listed.
  assert.match(read('.agents/skills/save/scripts/artifacts-run.mjs'), /scripts\/check-runner\/run-id\.mjs/);
});

test('the route page is in the stack hub, and the manifest names the runner in the pack', () => {
  assert.ok(inventory.pack.dirs.includes('wiki/stack'));
  assert.match(read('wiki/stack/README.md'), /\]\(artifacts-route\.md\)/);
  assert.match(read('.agents/skills/wong-sync/references/payload-manifest.md'), /scripts\/check-runner\/worker\.mjs/);
});
