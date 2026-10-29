// @vitest-environment jsdom
import { act, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { line } from '../line.test.kit'
import { REFRESH_MS } from '../line'
import { blur, button, calls, DAY, fake, hold, key, open, press, settle, task, titles, type, WEEK } from './week.test.kit'

const where = (router: Awaited<ReturnType<typeof open>>) => router.state.location.search
const goal = () => screen.getByLabelText<HTMLTextAreaElement>('Goal for the week')
const notice = () => screen.queryByRole('alert')?.textContent ?? null

it('shows the week on screen, its days, its hours and the backlog, under the Inbox heading', async () => {
  task('Read (1)')
  task('Write (2)', { status: 'in_progress', slot: 'mon' })
  task('Fix', { slot: 'sun' })
  task('Old (1)', { status: 'done', slot: 'tue' })
  task('Plan', { slot: 'backlog' })
  const scroll = vi.spyOn(HTMLElement.prototype, 'scrollIntoView')
  await open()
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Inbox')
  expect(titles('day-wed')).toEqual(['Read'])
  expect(titles('day-sat')).toEqual(['Fix'])
  expect(titles('day-backlog')).toEqual(['Plan'])
  expect(screen.getByText(/This week 3h open · 1h done · 1 in progress · 1 unestimated/)).toBeTruthy()
  expect(screen.getByText('Week of Oct 26')).toBeTruthy()
  expect(screen.getByText('today').closest('section')!.dataset.slotKey).toBe('wed')
  // This week's Week view brings today into view.
  expect(scroll).toHaveBeenCalledWith({ block: 'center' })
  expect(screen.getByText('31–1')).toBeTruthy()
  scroll.mockRestore()
})

it('shows grey blocks while it loads, and Try again when the week did not load', async () => {
  fake.fail = 'GET week'
  const gate = hold('GET week')
  await open(undefined, false)
  expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  await gate.release()
  await press(await screen.findByRole('button', { name: 'Try again' }))
  expect(await screen.findByTestId('backlog-grid')).toBeTruthy()
})

it('keeps the week on screen when a quiet read fails, and draws nothing new when a read finds no change', async () => {
  task('Read')
  await open()
  const before = box()
  fake.fail = 'GET week'
  await act(async () => { window.dispatchEvent(new Event('focus')) })
  await settle()
  expect(titles('day-wed')).toEqual(['Read'])
  vi.setSystemTime(new Date(2026, 9, 28, 13))
  await act(async () => { window.dispatchEvent(new Event('focus')) })
  await settle()
  expect(calls('GET week')).toHaveLength(3)
  expect(box()).toBe(before)
})
const box = () => screen.getByLabelText('Edit Read')

it('moves by day and by week, opens today, and drops a slow answer for a week no longer on screen', async () => {
  task('Read')
  const router = await open()
  const gate = hold('GET week')
  await press(button('Next week'))
  expect(where(router)).toBe('?day=2026-11-04&view=week')
  await press(button('Previous week'))
  await gate.release()
  await settle()
  expect(titles('day-wed')).toEqual(['Read'])
  await press(screen.getByRole('radio', { name: 'Day' }))
  expect(where(router)).toBe(`?day=${DAY}&view=day`)
  expect(screen.getByText('Wednesday, Oct 28')).toBeTruthy()
  // The pressed view gives no value when it is pressed again, and nothing changes.
  await press(screen.getByRole('radio', { name: 'Day' }))
  expect(where(router)).toBe(`?day=${DAY}&view=day`)
  await press(button('Next day'))
  expect(screen.getByText('No tasks on this day. Use Add task to add one.')).toBeTruthy()
  expect(button('Today').getAttribute('aria-pressed')).toBe('false')
  await press(button('Today'))
  expect(where(router)).toBe(`?day=${DAY}&view=day`)
  await press(button('Previous day'))
  await press(screen.getByRole('radio', { name: 'Week' }))
  expect(where(router)).toBe('?day=2026-10-27&view=week')
})

it('opens this week in the Week view when the address names no day or a day that is not real', async () => {
  const router = await open('/apps/inbox/?day=2026-02-30')
  expect(screen.getByRole('radio', { name: 'Week' }).getAttribute('aria-checked')).toBe('true')
  expect(where(router)).toBe('?day=2026-02-30')
})

it('opens the Day view with the caret in its add box from Add task, and adds tasks there', async () => {
  const router = await open()
  const frames: FrameRequestCallback[] = []
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback))
  await press(button('Add task'))
  expect(where(router)).toBe(`?day=${DAY}&view=day`)
  await act(async () => { frames.splice(0).forEach(frame => frame(0)) })
  const add = screen.getByLabelText<HTMLInputElement>('Add task to Wednesday')
  expect(document.activeElement).toBe(add)
  await key(add, 'Enter')
  await key(add, 'a')
  expect(calls('POST task')).toHaveLength(0)
  await type(add, 'Read (0.5)')
  await key(add, 'Enter')
  await settle()
  expect(add.value).toBe('')
  expect(titles('day-wed')).toEqual(['Read'])
  expect(calls('POST task')[0].body).toEqual({ title: 'Read (0.5)', week: WEEK, slot: 'wed' })
  await type(add, 'Write')
  await blur(add)
  await settle()
  expect(titles('day-wed')).toEqual(['Read', 'Write'])
  expect(fake.tasks.map(each => each.id)).toEqual(['task_1', 'task_2'])
})

it('takes a task back with a notice when it did not save, and the notice closes', async () => {
  await open()
  fake.fail = 'POST task'
  const add = screen.getByLabelText('Add task to Wed')
  await type(add, 'Read')
  await key(add, 'Enter')
  await settle()
  expect(screen.queryByLabelText('Edit Read')).toBeNull()
  expect(notice()).toContain('That task did not save.')
  await press(button('Close'))
  expect(notice()).toBeNull()
})

it('drops an answer for a week the person left', async () => {
  await open()
  const gate = hold('POST task')
  const add = screen.getByLabelText('Add task to Wed')
  await type(add, 'Read')
  await key(add, 'Enter')
  await press(button('Next week'))
  await screen.findByTestId('backlog-grid')
  await gate.release()
  await settle()
  expect(screen.queryByLabelText('Edit Read')).toBeNull()
})

it('saves the week goal when its box loses focus, and Escape puts it back', async () => {
  fake.goals[WEEK] = 'Ship'
  await open()
  expect(goal().value).toBe('Ship')
  await blur(goal())
  expect(calls('PUT week-goal')).toHaveLength(0)
  await type(goal(), 'Rest')
  await key(goal(), 'a')
  await key(goal(), 'Escape')
  expect(goal().value).toBe('Ship')
  await type(goal(), ' Rest ')
  await key(goal(), 'Enter')
  await blur(goal())
  await settle()
  expect(fake.goals[WEEK]).toBe('Rest')
  fake.fail = 'PUT week-goal'
  await type(goal(), 'Run')
  await blur(goal())
  await settle()
  expect(notice()).toContain('That goal did not save.')
})

it('moves the unfinished day tasks to the backlog or to next week, and says how many moved', async () => {
  task('Read', { backlogGroupId: 'backlog_other' })
  task('Write', { slot: 'mon' })
  task('Done', { status: 'done' })
  await open()
  const sweep = () => screen.getByText(/^Move \d+ unfinished$/).closest('button')!
  expect(sweep().textContent).toBe('Move 2 unfinished')
  await key(sweep(), 'Enter')
  await press(screen.getByRole('menuitem', { name: 'To backlog' }))
  await settle()
  expect(notice()).toContain('2 unfinished tasks moved to the backlog.')
  expect(titles('day-backlog')).toEqual(['Write', 'Read'])
  expect(sweep().getAttribute('aria-hidden')).toBe('true')
  task('Run')
  await act(async () => { vi.setSystemTime(new Date(2026, 9, 28, 13)); window.dispatchEvent(new Event('online')) })
  await settle()
  await key(sweep(), 'Enter')
  await press(screen.getByRole('menuitem', { name: 'To next week' }))
  await settle()
  expect(notice()).toContain('1 unfinished task moved to next week.')
  expect(fake.tasks.find(each => each.title === 'Run')!.week).toBe('2026-11-02')
})

it('shows whether the computer is on, and shows nothing when the person has no Inbox access', async () => {
  fake.online = false
  await open()
  expect(await screen.findByText('Computer offline')).toBeTruthy()
})

it('shows no badge on a refused read, and tries no more', async () => {
  fake.online = 403
  await open()
  await act(async () => { window.dispatchEvent(new Event('online')) })
  expect(calls('GET items')).toHaveLength(1)
  expect(screen.queryByText(/Computer/)).toBeNull()
})

it('tries again after another failed read when the page is in view again', async () => {
  fake.online = 500
  await open()
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(calls('GET items')).toHaveLength(1)
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  fake.online = true
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(await screen.findByText('Computer online')).toBeTruthy()
})

it('reads the week again on each look of the live line, and on a timer while the line is down', async () => {
  task('Read')
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  await open()
  expect(await screen.findByText('Computer online')).toBeTruthy()
  const reads = calls('GET week').length
  vi.setSystemTime(new Date(2026, 9, 28, 13))
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
  await act(async () => { vi.advanceTimersByTime(REFRESH_MS) })
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  expect(calls('GET week')).toHaveLength(reads)
  await act(async () => { vi.advanceTimersByTime(REFRESH_MS) })
  expect(calls('GET week')).toHaveLength(reads + 1)
  vi.setSystemTime(new Date(2026, 9, 28, 14))
  vi.useRealTimers()
  vi.setSystemTime(new Date(2026, 9, 28, 14))
  await line().open()
  expect(calls('GET week')).toHaveLength(reads + 2)
  // Looks inside one second are one read, at the end of the second.
  await line().say('{"t":"look"}')
  await line().say('{"t":"look"}')
  vi.setSystemTime(new Date(2026, 9, 28, 15))
  await waitFor(() => expect(calls('GET week')).toHaveLength(reads + 3), { timeout: 2000 })
})

it('finds tasks in every week and opens the one chosen, marked for a moment', async () => {
  task('Read the book', { status: 'in_progress' })
  task('Read notes', { week: '2026-11-02', slot: 'sat', status: 'done' })
  task('Reading list', { slot: 'backlog' })
  task('Read later', { slot: 'backlog', backlogGroupId: 'gone' })
  const router = await open(`/apps/inbox/?day=${DAY}&view=day`)
  await press(button('Search tasks'))
  const field = screen.getByLabelText('Search every week')
  await type(field, 'read')
  expect(screen.getByTestId('task-search-loading')).toBeTruthy()
  const results = await screen.findAllByTestId('task-search-result')
  expect(results.map(result => result.textContent)).toEqual([
    'Read the bookIn progressWed · Week of Oct 26', 'Read notesDoneSat/Sun · Week of Nov 2',
    'Reading listOpenBacklog · Other', 'Read laterOpenBacklog'])
  expect(results[0].querySelector('mark')!.textContent).toBe('Read')
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
  await press(results[1])
  expect(where(router)).toBe('?day=2026-11-02&view=week')
  for (let i = 0; i < 5; i++) await act(async () => { await vi.advanceTimersByTimeAsync(0) })
  expect(document.querySelector<HTMLElement>('[data-found]')!.dataset.taskId).toBe('task_2')
  await act(async () => { vi.advanceTimersByTime(2000) })
  expect(document.querySelector('[data-found]')).toBeNull()
  vi.useRealTimers()
  vi.setSystemTime(new Date(2026, 9, 28, 12))
  // A backlog task is in every week: the week on screen stays.
  await press(button('Search tasks'))
  await type(screen.getByLabelText('Search every week'), 'reading')
  await press((await screen.findAllByTestId('task-search-result'))[0])
  expect(where(router)).toBe('?day=2026-11-02&view=week')
  expect(document.querySelector<HTMLElement>('[data-found]')!.dataset.taskId).toBe('task_3')
})

it('marks nothing when the chosen task is gone by the time its week shows', async () => {
  task('Read', { week: '2026-11-02' })
  await open()
  await press(button('Search tasks'))
  await type(screen.getByLabelText('Search every week'), 'read')
  const result = (await screen.findAllByTestId('task-search-result'))[0]
  fake.tasks = []
  await press(result)
  await screen.findByTestId('backlog-grid')
  await settle()
  expect(document.querySelector('[data-found]')).toBeNull()
})

it('says when nothing matches, offers Retry when a search failed, and clears or closes with Escape', async () => {
  task('Read')
  await open()
  await press(button('Search tasks'))
  const field = screen.getByLabelText<HTMLInputElement>('Search every week')
  fake.fail = 'GET task-search'
  await type(field, 'read')
  await press(await screen.findByRole('button', { name: 'Retry' }))
  expect(await screen.findAllByTestId('task-search-result')).toHaveLength(1)
  await type(field, '  nothing  ')
  expect(await screen.findByText('No tasks match “nothing”')).toBeTruthy()
  await press(button('Clear'))
  expect(field.value).toBe('')
  expect(screen.getByTestId('backlog-grid')).toBeTruthy()
  await type(field, 'x')
  await key(field, 'a')
  await key(field, 'Escape')
  expect(field.value).toBe('')
  await key(field, 'Escape')
  expect(screen.queryByLabelText('Search every week')).toBeNull()
  await press(button('Search tasks'))
  await press(button('Search tasks'))
  expect(screen.queryByLabelText('Search every week')).toBeNull()
})

it('shows only the newest search, even when an older answer comes last', async () => {
  task('Read')
  task('Ride')
  await open()
  await press(button('Search tasks'))
  const field = screen.getByLabelText('Search every week')
  const gate = hold('GET task-search')
  await type(field, 'read')
  await waitFor(() => expect(calls('GET task-search')).toHaveLength(1))
  await type(field, 'ride')
  expect(await screen.findAllByTestId('task-search-result')).toHaveLength(1)
  await gate.release()
  await settle()
  expect(screen.getByTestId('task-search-result').textContent).toContain('Ride')
  const second = hold('GET task-search')
  await type(field, 'r')
  await waitFor(() => expect(calls('GET task-search')).toHaveLength(3))
  await type(field, 're')
  expect(await screen.findAllByTestId('task-search-result')).toHaveLength(1)
  fake.fail = 'GET task-search'
  await second.release()
  await settle()
  expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
})
