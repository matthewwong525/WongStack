// The replacement scheduling payload ships formats and helpers, never an install's live jobs.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = rel => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');
const inventory = JSON.parse(read('.agents/skills/wong-sync/references/payload-files.json'));
const listed = Object.values(inventory).filter(value => value && typeof value === 'object').flatMap(value => [...(value.files || []), ...(value.dirs || [])]);

test('all installs receive schedule helpers and the finite-goal schema without live definitions', () => {
  assert.ok(inventory.core.skillDirs.includes('schedule'));
  assert.ok(!inventory.core.skillDirs.includes('routine'));
  assert.ok(inventory.core.dirs.includes('openspec/schemas/scheduled-work'));
  assert.ok(existsSync(new URL('../../.agents/skills/schedule/scripts/schedule.mjs', import.meta.url)));
  assert.ok(existsSync(new URL('../../openspec/schemas/scheduled-work/schema.yaml', import.meta.url)));
  assert.deepEqual(listed.filter(path => /^schedules(?:\/|$)|^openspec\/changes\//.test(path)), [], 'definitions and business goal plans belong to the target');
  assert.deepEqual(listed.filter(path => path.startsWith('scripts/routine-runner/')), [], 'an update must not distribute a cloud runner again');
});

test('scheduling owns no cloud provisioning and setup keeps its independent check-runner library', () => {
  const client = read('.agents/skills/schedule/scripts/schedule.mjs');
  assert.doesNotMatch(client, /wong-setup|installRunner|ROUTINES_PROVISION|AI_RUN_TOKEN/);
  const setup = read('.agents/skills/wong-setup/scripts/provision.mjs');
  assert.match(setup, /from '\.\/lib\/cloudflare\.mjs'/);
  assert.doesNotMatch(setup, /from .*schedule|ROUTINES_PROVISION/);
  const shared = read('.agents/skills/wong-setup/scripts/lib/cloudflare.mjs');
  assert.doesNotMatch(shared, /ROUTINES_PROVISION|AI_RUN_TOKEN/);
  assert.match(shared, /export async function installRunner/, 'Artifacts check-runner installation still exists');
});

test('both owner guides are reachable and the manifest explains preserved installations', () => {
  const hub = read('wiki/stack/README.md');
  assert.match(hub, /\]\(host-schedules\.md\)/);
  assert.match(hub, /\]\(legacy-cloud-schedules\.md\)/);
  const manifest = read('.agents/skills/wong-sync/references/payload-manifest.md');
  assert.match(manifest, /Never add those live records to this inventory/);
  assert.match(manifest, /Updates preserve deployed cloud resources and native host jobs/);
});
