// When a routine runs next: scripts/routine-runner/schedule.mjs, the one reader of a routine's
// five-field cron and its IANA timezone.
import assert from 'node:assert/strict';
import test from 'node:test';
import { ScheduleError, invalidCronField, invalidTimezone, nextRun, normalizeCron, parseCron, wallTime } from '../routine-runner/schedule.mjs';

const at = (iso) => Date.parse(iso);
const next = (cron, from, timezone = 'UTC') => new Date(nextRun(cron, timezone, at(from))).toISOString();
// Monday 5 October 2026, 10:07 UTC.
const MONDAY = '2026-10-05T10:07:00Z';
const NEW_YORK = 'America/New_York';

test('every field form is read: a star, a number, a range, a list, and a step', () => {
  assert.equal(next('* * * * *', MONDAY), '2026-10-05T10:08:00.000Z');
  assert.equal(next('30 14 * * *', MONDAY), '2026-10-05T14:30:00.000Z');
  assert.equal(next('0 9 * * 1-5', '2026-10-02T10:00:00Z'), '2026-10-05T09:00:00.000Z', 'a weekday routine skips the weekend');
  assert.equal(next('0 0 1,15 * *', MONDAY), '2026-10-15T00:00:00.000Z');
  assert.equal(next('*/15 * * * *', MONDAY), '2026-10-05T10:15:00.000Z');
  assert.equal(next('0 8-12/2 * * *', MONDAY), '2026-10-05T12:00:00.000Z', 'a stepped range is 8, 10, 12');
  assert.equal(next('5/20 * * * *', MONDAY), '2026-10-05T10:25:00.000Z', 'a number with a step runs on to the field\'s end');
  assert.equal(next('0 0 1 1 *', MONDAY), '2027-01-01T00:00:00.000Z');
  assert.deepEqual([...parseCron('0 8-12/2 * * *').hours], [8, 10, 12]);
  assert.deepEqual([...parseCron('5/20 * * * *').minutes], [5, 25, 45]);
});

test('day-of-week 0 and 7 are both Sunday', () => {
  assert.equal(next('0 12 * * 0', MONDAY), '2026-10-11T12:00:00.000Z');
  assert.equal(next('0 12 * * 7', MONDAY), '2026-10-11T12:00:00.000Z');
  assert.deepEqual([...parseCron('0 0 * * 5-7').weekdays].sort(), [0, 5, 6]);
});

test('with both day fields set either one is enough, as cron has it', () => {
  // The 13th is a Tuesday; the Friday before it comes first.
  assert.equal(next('0 0 13 * 5', MONDAY), '2026-10-09T00:00:00.000Z');
  assert.equal(next('0 0 13 * 5', '2026-10-09T00:00:00Z'), '2026-10-13T00:00:00.000Z');
  assert.equal(next('0 0 13 * *', MONDAY), '2026-10-13T00:00:00.000Z', 'a star leaves the other field to decide');
});

test('a next run is strictly after the time asked about, and a rare one is still found', () => {
  assert.equal(next('0 9 * * *', '2026-10-05T09:00:00Z'), '2026-10-06T09:00:00.000Z');
  assert.equal(next('0 9 * * *', '2026-10-05T08:59:59.999Z'), '2026-10-05T09:00:00.000Z');
  assert.equal(next('0 0 29 2 *', MONDAY), '2028-02-29T00:00:00.000Z');
  assert.equal(nextRun('0 0 30 2 *', 'UTC', at(MONDAY)), null, 'a 30 February never runs');
});

test('the time is read in the routine\'s own timezone, summer and winter', () => {
  assert.equal(next('0 9 * * *', '2026-10-05T00:00:00Z', 'America/Toronto'), '2026-10-05T13:00:00.000Z');
  assert.equal(next('0 9 * * *', '2026-12-05T00:00:00Z', 'America/Toronto'), '2026-12-05T14:00:00.000Z');
  assert.equal(next('0 9 * * 1', '2026-10-04T23:30:00Z', 'Asia/Tokyo'), '2026-10-05T00:00:00.000Z', 'Monday starts earlier in Tokyo');
  assert.equal(next('30 9 * * *', MONDAY, 'Asia/Kolkata'), '2026-10-06T04:00:00.000Z', 'a half-hour zone');
  assert.deepEqual(wallTime(at('2026-10-05T04:30:00Z'), 'Asia/Tokyo'), { year: 2026, month: 10, day: 5, hour: 13, minute: 30, second: 0 });
});

test('when the clocks go forward, a skipped time runs once, right after the skip', () => {
  // New York skips 02:00 to 03:00 on 8 March 2026.
  assert.equal(next('30 2 * * *', '2026-03-07T12:00:00Z', NEW_YORK), '2026-03-08T07:30:00.000Z', '03:30 that morning');
  assert.equal(next('30 2 * * *', '2026-03-08T07:30:00Z', NEW_YORK), '2026-03-09T06:30:00.000Z', 'and 02:30 again the next day');
  assert.equal(next('0 * * * *', '2026-03-08T06:00:00Z', NEW_YORK), '2026-03-08T07:00:00.000Z', 'an hourly routine runs in every real hour');
});

test('when the clocks go back, a repeated time runs the first time only', () => {
  // New York repeats 01:00 to 02:00 on 1 November 2026.
  assert.equal(next('30 1 * * *', '2026-10-31T12:00:00Z', NEW_YORK), '2026-11-01T05:30:00.000Z');
  assert.equal(next('30 1 * * *', '2026-11-01T05:30:00Z', NEW_YORK), '2026-11-02T06:30:00.000Z', 'not a second time that night');
  assert.equal(next('0 * * * *', '2026-11-01T05:00:00Z', NEW_YORK), '2026-11-01T06:00:00.000Z', 'an hourly routine runs in both of the repeated hours');
  assert.equal(next('0 * * * *', '2026-11-01T06:00:00Z', NEW_YORK), '2026-11-01T07:00:00.000Z');
});

test('an invalid expression names its bad field, and nothing is scheduled from it', () => {
  assert.equal(invalidCronField('0 9 * * 1-5'), null);
  assert.equal(invalidCronField('0 9 * *'), 'field count (4, expected 5)');
  assert.equal(invalidCronField(''), 'field count (0, expected 5)');
  assert.equal(invalidCronField(undefined), 'field count (0, expected 5)');
  assert.equal(invalidCronField('60 9 * * *'), 'minute');
  assert.equal(invalidCronField('0 24 * * *'), 'hour');
  assert.equal(invalidCronField('0 9 0 * *'), 'day of month');
  assert.equal(invalidCronField('0 9 * 13 *'), 'month');
  assert.equal(invalidCronField('0 9 * * 8'), 'day of week');
  assert.equal(invalidCronField('*/0 9 * * *'), 'minute', 'a step of nothing');
  assert.equal(invalidCronField('0 9-8 * * *'), 'hour', 'a range that runs backwards');
  assert.equal(invalidCronField('0 9 * * mon'), 'day of week', 'names are not read');
  assert.throws(() => nextRun('every day', 'UTC', at(MONDAY)), (error) => error instanceof ScheduleError && error.field === 'field count (2, expected 5)');
  assert.throws(() => normalizeCron('0 9 * * 9'), { message: 'Invalid cron "0 9 * * 9": day of week.' });
  assert.equal(normalizeCron('  0   9 *  * 1-5 '), '0 9 * * 1-5');
});

test('an unknown timezone is refused, and a time that is not a number too', () => {
  assert.equal(invalidTimezone('America/Toronto'), null);
  assert.match(invalidTimezone('Mars/Olympus'), /Unknown timezone "Mars\/Olympus"/);
  assert.equal(invalidTimezone(''), 'the timezone is empty');
  assert.equal(invalidTimezone(undefined), 'the timezone is empty');
  assert.throws(() => nextRun('0 9 * * *', 'Mars/Olympus', at(MONDAY)), { field: 'timezone' });
  assert.throws(() => nextRun('0 9 * * *', 'UTC', 'soon'), { field: 'after' });
});
