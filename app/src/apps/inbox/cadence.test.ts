import { expect, it } from 'vitest'
import type { Run } from './api'
import { cadence, outcome, when } from './cadence'

// Saturday 24 October 2026, noon in UTC.
const NOW = Date.UTC(2026, 9, 24, 12)
const on = (more: { cron?: string; every?: string }) => cadence({ mode: 'recurring', timezone: 'UTC', ...more }, NOW)

it('says a timetable in plain words, and a timing it cannot say as a set timetable', () => {
  expect(on({ cron: '0 8 * * 1-5' })).toBe('Every weekday at 8:00')
  expect(on({ cron: '30 7 * * *' })).toBe('Every day at 7:30')
  expect(on({ cron: '5 10 * * 5' })).toBe('Every Friday at 10:05')
  expect(on({ cron: '0 9 * * 7' })).toBe('Every Sunday at 9:00')
  for (const cron of ['*/5 * * * *', '0 8 1 * *', '0 8 * 1 *', '0 8 * * 1,3', '0 8 * * * 2026']) expect(on({ cron })).toBe('On a set timetable')
  expect(on({ every: '15m' })).toBe('Every 15 minutes')
  expect(on({ every: '1h' })).toBe('Every hour')
  expect(on({ every: '2d' })).toBe('Every 2 days')
  expect(on({ every: 'weekly' })).toBe('On a set timetable')
  expect(on({})).toBe('On a set timetable')
  expect(cadence({ mode: 'once', timezone: 'UTC', dueAt: Date.UTC(2026, 9, 25, 8) }, NOW)).toBe('Once on Sun 25 Oct 8:00')
  expect(cadence({ mode: 'once', timezone: 'UTC' }, NOW)).toBe('On a set timetable')
})

it("says a moment by the day it falls on near now, in the schedule's own timezone", () => {
  expect(when(Date.UTC(2026, 9, 24, 8), 'UTC', NOW)).toBe('today 8:00')
  expect(when(Date.UTC(2026, 9, 25, 8, 5), 'UTC', NOW)).toBe('tomorrow 8:05')
  expect(when(Date.UTC(2026, 9, 23, 22), 'UTC', NOW)).toBe('yesterday 22:00')
  expect(when(Date.UTC(2026, 9, 26, 8), 'UTC', NOW)).toBe('Mon 8:00')
  expect(when(Date.UTC(2026, 9, 20, 8), 'UTC', NOW)).toBe('Tue 8:00')
  expect(when(Date.UTC(2026, 10, 10, 8), 'UTC', NOW)).toBe('Tue 10 Nov 8:00')
  // 23:30 in UTC is already Sunday in London, an hour ahead until the clocks go back that night.
  expect(when(Date.UTC(2026, 9, 24, 23, 30), 'Europe/London', NOW)).toBe('tomorrow 0:30')
  // A timezone this browser doesn't know reads in the device's own.
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone
  expect(when(Date.UTC(2026, 9, 24, 8), 'Not/A_Zone', NOW)).toBe(when(Date.UTC(2026, 9, 24, 8), local, NOW))
})

it('says how a run went', () => {
  const said = (['due', 'taken', 'started', 'failed', 'blocked', 'missed', 'cancelled'] as const)
    .map(state => outcome({ id: 'r', key: 'k', dueAt: NOW, source: 'clock', state, result: null } satisfies Run))
  expect(said).toEqual(['waiting', 'starting', 'done', "didn't start", "didn't start", 'missed, computer was off', 'cancelled'])
})
