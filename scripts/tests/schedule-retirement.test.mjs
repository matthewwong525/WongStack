// Retirement removes creation, provisioning, the mover and the old cloud commands; old data stays in place.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = rel => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

test('retired runner source and cloud creation entry point are absent', () => {
  assert.equal(existsSync(new URL('../../scripts/routine-runner/', import.meta.url)), false);
  assert.equal(existsSync(new URL('../../.agents/skills/schedule/scripts/routine.mjs', import.meta.url)), false);
  assert.equal(existsSync(new URL('../../.agents/skills/schedule/scripts/lib/cloudflare.mjs', import.meta.url)), false);
});

test('the old skill folder stays retired with no exception, and the old entry point has only this test', () => {
  const retired = JSON.parse(read('scripts/retired-names.json'));
  const oldFolder = retired.find(row => row.name === 'skills/' + 'routine/');
  assert.ok(oldFolder);
  assert.equal(oldFolder.allow, undefined);
  const oldEntry = retired.find(row => row.name === 'schedule/scripts/' + 'routine.mjs');
  assert.ok(oldEntry);
  assert.deepEqual(oldEntry.allow, ['scripts/tests/schedule-retirement.test.mjs']);
});

test('the goal schema and the record-only save route are gone, so no schedule needs a publish', () => {
  for (const path of ['openspec/schemas/scheduled-work/', '.agents/skills/save/scripts/schedule-record.mjs', '.agents/skills/save/references/schedule-records.md']) {
    assert.equal(existsSync(new URL(`../../${path}`, import.meta.url)), false, path);
  }
});

test('memory keeps the old routine topic as an alias and maps the skill and old repo records', () => {
  const areas = JSON.parse(read('.agents/memory/areas.json'));
  assert.ok(areas.schedule.aliases.includes('routine'), 'existing facts remain discoverable');
  for (const path of ['.agents/plugins/daily/schedule/', 'schedules/']) assert.ok(areas.schedule.paths.includes(path));
  assert.ok(!areas.schedule.paths.some(path => path.includes('scheduled-work')));
  assert.ok(areas.schedule.docs.includes('wiki/stack/host-schedules.md'));
});

test('the mover and the old cloud commands are gone, with their pages', () => {
  // Split spellings keep the retired names out of this file.
  for (const path of ['.agents/inbox/move-in.mjs', '.agents/inbox/lib/legacy.mjs', '.agents/skills/schedule/references/' + 'migration.md',
    'wiki/stack/legacy-' + 'cloud-schedules.md']) assert.equal(existsSync(new URL(`../../${path}`, import.meta.url)), false, path);
});

test('the wiki tidy schedule is retired: its check, brief and default entry are gone, and the list names why', () => {
  for (const path of ['.agents/skills/daily/scripts/wiki-tidy-check.mjs', '.agents/skills/daily/references/briefs/wiki-tidy.md']) {
    assert.equal(existsSync(new URL(`../../${path}`, import.meta.url)), false, path);
  }
  const list = JSON.parse(read('.agents/skills/daily/references/schedules.json'));
  assert.ok(!list.schedules.some(entry => entry.id === 'wiki-tidy'));
  assert.match(list.retired.find(entry => entry.id === 'wiki-tidy').reason, /first chat of each day/);
});
