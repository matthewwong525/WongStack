import { describe, expect, it } from 'vitest'
import type { Task } from '@/lib/board'
import {
  dayLabel, effortTotals, formatTaskTitle, formatWeek, groupDateLabel, groupsForView, localDateFromIsoDate, localDay,
  moveScheduleDay, planGroups, scheduleDay, scheduleView, scheduleWeek, selectedGroup, slotForDate, splitOnWords, summarize,
  tasksInGroup,
} from './plan'

const made = (id: string, more: Partial<Task>): Task => ({ id, title: id, status: 'open', week: '2026-10-26', slot: 'sat',
  backlogGroupId: null, position: 1000, estimateHours: null, importKey: null, link: null, chat: null, createdAt: '', updatedAt: '', ...more })

describe('the week board helpers', () => {
  it('writes a title and its hours as a person types them', () => {
    expect(formatTaskTitle('Read', null)).toBe('Read')
    expect(formatTaskTitle('Read', 0.5)).toBe('Read (0.5)')
    expect(formatTaskTitle('Read', 1)).toBe('Read (1)')
  })

  it('reads dates as local days and refuses days that do not exist', () => {
    expect(localDateFromIsoDate('2026-02-30')).toBeNull()
    expect(localDateFromIsoDate('soon')).toBeNull()
    expect(localDay(localDateFromIsoDate('2026-10-28')!)).toBe('2026-10-28')
    expect(localDay()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(slotForDate(localDateFromIsoDate('2026-11-01')!)).toBe('sun')
    expect(formatWeek('2026-09-07')).toContain('7')
  })

  it('counts open, done and unestimated work apart', () => {
    const totals = effortTotals([made('a', { estimateHours: 1 }), made('b', { estimateHours: 2, status: 'done' }),
      made('c', {}), made('d', { status: 'done' })])
    expect(totals).toEqual({ openHours: 1, doneHours: 2, unestimatedCount: 1 })
    expect(summarize(totals)).toBe('1h open · 2h done · 1 unest.')
    expect(summarize(effortTotals([]))).toBe('')
  })

  it('orders the weekend cell by band, then Saturday before Sunday', () => {
    const slots = { mon: [], tue: [], wed: [], thu: [], fri: [], backlog: [],
      sat: [made('sat-open', {}), made('sat-doing', { status: 'in_progress' })],
      sun: [made('sun-doing', { slot: 'sun', status: 'in_progress' }), made('sun-done', { slot: 'sun', status: 'done' })] }
    expect(tasksInGroup(slots, planGroups[5]).map(task => task.id)).toEqual(['sat-doing', 'sun-doing', 'sat-open', 'sun-done'])
    expect(groupDateLabel('2026-10-26', planGroups[5])).toBe('31–1')
    expect(groupDateLabel('2026-10-26', planGroups[0])).toBe('26')
  })

  it('reads the day and view from the address', () => {
    expect(scheduleView('week')).toBe('week')
    expect(scheduleView(null)).toBe('week')
    expect(scheduleDay('2026-10-28')).toBe('2026-10-28')
    expect(scheduleDay('bad')).toBe(localDay())
    expect(scheduleDay(null)).toBe(localDay())
    expect(scheduleWeek('2026-11-01')).toBe('2026-10-26')
    expect(selectedGroup('2026-10-28')).toMatchObject({ key: 'wed', slots: ['wed'] })
    expect(moveScheduleDay('2026-10-28', 'day', 1)).toBe('2026-10-29')
    expect(moveScheduleDay('2026-10-28', 'week', -1)).toBe('2026-10-21')
    expect(groupsForView('2026-10-28', 'week')).toBe(planGroups)
    expect(groupsForView('2026-10-28', 'day')).toHaveLength(1)
    expect(dayLabel('2026-10-28')).toContain('28')
  })

  it('marks the longest word that starts at a place, as plain text', () => {
    expect(splitOnWords('Fix the fixture.', ['fix', 'fixture'])).toEqual([
      { text: 'Fix', match: true }, { text: ' the ', match: false }, { text: 'fixture', match: true }, { text: '.', match: false },
    ])
    expect(splitOnWords('a.b', ['.'])).toEqual([{ text: 'a', match: false }, { text: '.', match: true }, { text: 'b', match: false }])
  })
})
