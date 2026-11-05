// Old repo records stay readable for the move to the app; the timing checks serve every schedule.
import assert from 'node:assert/strict';
import test from 'node:test';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { listRecords, loadRecord, validateRoutine, validateTiming } from '../../.agents/skills/schedule/scripts/lib/records.mjs';
import { folder, writeRecord } from './fixtures/scheduled-work.mjs';

test('a routine record loads; a changed instruction, a credential or a goal folder does not', t => {
  const root = folder(t), record = writeRecord(root);
  assert.equal(loadRecord(root, 'schedules/synthetic.json').binding.execution.nativeId, 'job-1');
  assert.throws(() => validateRoutine({ ...record, instructions: 'Changed without approval.' }), /revision/);
  assert.throws(() => validateRoutine({ ...record, binding: { ...record.binding, token: 'x' } }), /Credentials/);
  assert.throws(() => loadRecord(root, 'openspec/changes/check-payment'), /schedules/);
});

test('the list reads every record and shows an unreadable one as an error', t => {
  const root = folder(t);
  writeRecord(root);
  writeFileSync(path.join(root, 'schedules', 'broken.json'), '{');
  const { records, errors } = listRecords(root);
  assert.deepEqual(records.map(item => item.key), ['synthetic']);
  assert.deepEqual(errors.map(error => error.reference), ['schedules/broken.json']);
  assert.deepEqual(listRecords(folder(t)), { records: [], errors: [] });
});

test('a timing runs once at an absolute time or recurs; cron fields stay in their bounds', () => {
  const base = { timezone: 'UTC', allowedLatenessMs: 0 };
  assert.ok(validateTiming({ ...base, mode: 'once', dueAt: '2026-11-10T09:00:00Z' }));
  assert.throws(() => validateTiming({ ...base, mode: 'once', dueAt: '2026-11-10 09:00' }), /absolute/);
  assert.throws(() => validateTiming({ ...base, mode: 'once', dueAt: '2026-11-10T09:00:00Z', expiresAt: '2026-11-09T09:00:00Z' }));
  assert.throws(() => validateTiming({ ...base, mode: 'goal', cron: '0 9 * * *' }), /once or recurs/);
  assert.ok(validateTiming({ ...base, mode: 'recurring', cron: '*/15 9-16/2 1 * 1,3,5' }));
  for (const cron of ['60 9 * * *', '0 24 * * *', '0 9 * *', '0 9 * * 8', '0 9-7 * * *']) assert.throws(() => validateTiming({ ...base, mode: 'recurring', cron }), cron);
  assert.ok(validateTiming({ ...base, mode: 'recurring', cron: '0 9 * * 1#2' }), 'the second Monday');
  for (const cron of ['0 9 1 * 1#2', '0 9 * * 1#6', '0 9 1#2 * *']) assert.throws(() => validateTiming({ ...base, mode: 'recurring', cron }), /nth-weekday/);
  assert.throws(() => validateTiming({ ...base, mode: 'recurring', every: '0m' }));
  assert.throws(() => validateTiming({ ...base, mode: 'recurring', cron: '0 9 * * *', timezone: 'Mars/Base' }), /timezone/);
});
