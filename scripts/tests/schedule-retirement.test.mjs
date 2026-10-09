// Retirement must remove creation/provisioning while preserving explicit legacy migration knowledge.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = rel => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

test('retired runner source and cloud creation entry point are absent', () => {
  assert.equal(existsSync(new URL('../../scripts/routine-runner/', import.meta.url)), false);
  assert.equal(existsSync(new URL('../../.agents/skills/schedule/scripts/routine.mjs', import.meta.url)), false);
  assert.equal(existsSync(new URL('../../.agents/skills/schedule/scripts/lib/cloudflare.mjs', import.meta.url)), false);
});

test('retirement exceptions describe frozen history and migration, with no live caller exception', () => {
  const retired = JSON.parse(read('scripts/retired-names.json'));
  const oldFolder = retired.find(row => row.name === 'skills/' + 'routine/');
  assert.ok(oldFolder);
  assert.ok(oldFolder.why.includes('historical'));
  assert.ok(oldFolder.allow.every(path => path.startsWith('scripts/') && path.includes('fixture')));
  const oldEntry = retired.find(row => row.name === 'schedule/scripts/' + 'routine.mjs');
  assert.ok(oldEntry);
  assert.deepEqual(oldEntry.allow, ['scripts/tests/schedule-retirement.test.mjs']);
});

test('memory keeps the old routine topic as an alias and maps definitions, schema, and host bindings', () => {
  const areas = JSON.parse(read('.agents/skills/memory/references/areas.json'));
  assert.ok(areas.schedule.aliases.includes('routine'), 'existing facts remain discoverable');
  for (const path of ['.agents/skills/schedule/', 'openspec/schemas/scheduled-work/', 'schedules/']) assert.ok(areas.schedule.paths.includes(path));
  assert.ok(areas.schedule.docs.includes('wiki/stack/host-schedules.md'));
  assert.ok(areas.schedule.docs.includes('wiki/stack/legacy-cloud-schedules.md'));
});
