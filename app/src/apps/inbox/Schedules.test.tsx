// @vitest-environment jsdom
import { screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import type { Run, Schedule } from './api'
import { calls, card, open, press, server, show, view } from './App.test.kit'

const DAY = 86_400_000
const today = Math.floor(Date.now() / DAY) * DAY
/** A moment `day` days from today, at `hour` o'clock in UTC, the timezone these schedules keep. */
const at = (day: number, hour: number) => today + day * DAY + hour * 3_600_000
const run = (key: string, state: Run['state'], more: Partial<Run> = {}): Run => ({ id: `${key}-run`, key, dueAt: at(0, 8), source: 'clock', state,
  result: null, ...more })
const schedule = (key: string, name: string, more: Partial<Schedule> = {}): Schedule => ({ key, host: 'app', name, summary: '',
  timing: { mode: 'recurring', cron: '0 8 * * 1-5', timezone: 'UTC' }, state: 'on', nextRunAt: null, lastRun: null, waiting: null, ...more })
const SCHEDULES = '/apps/inbox/?view=schedules'
const buttons = (title: string) => within(card(title)).queryAllByRole('button').map(button => button.textContent)
const reads = () => calls.filter(call => call.path.endsWith('/schedules')).length
const changes = () => calls.filter(call => !/\/(schedules|items)$/.test(call.path)).map(call => [call.path.split('/').at(-1), call.body])

it('shows each schedule in plain words: what it does, when it runs next, how its last run went, and what you can do', async () => {
  server.schedules = [
    schedule('daily-plan', 'Daily plan', { summary: 'Plans the day from email and calendar.', nextRunAt: at(1, 8), lastRun: run('daily-plan', 'started') }),
    schedule('invoices', 'Invoice follow-up', { state: 'paused', nextRunAt: at(3, 10), timing: { mode: 'recurring', cron: '0 10 * * 5', timezone: 'UTC' },
      lastRun: run('invoices', 'missed', { dueAt: at(-1, 10) }) }),
    schedule('research', 'Weekly research', { host: 'paseo', timing: { mode: 'recurring', every: '1d', timezone: 'UTC' } }),
  ]
  await open(SCHEDULES)
  expect(screen.getByRole('radio', { name: 'Schedules' }).getAttribute('aria-checked')).toBe('true')
  expect(screen.getByText('Computer online')).toBeTruthy()
  const daily = within(card('Daily plan'))
  expect(daily.getByText('On')).toBeTruthy()
  expect(daily.getByText('Plans the day from email and calendar.')).toBeTruthy()
  expect(daily.getByText('Every weekday at 8:00 · next run tomorrow 8:00')).toBeTruthy()
  expect(daily.getByText('Last run today 8:00 · done').className).toContain('text-muted-foreground')
  expect(buttons('Daily plan')).toEqual(['Pause', 'Run now'])
  // A paused schedule says no next run, and a missed run stands out.
  const invoices = within(card('Invoice follow-up'))
  expect(invoices.getByText('Paused')).toBeTruthy()
  expect(invoices.getByText('Every Friday at 10:00')).toBeTruthy()
  expect(invoices.getByText('Last run yesterday 10:00 · missed, computer was off').className).toContain('text-destructive')
  expect(buttons('Invoice follow-up')).toEqual(['Resume'])
  // A schedule still in Paseo is only shown.
  const research = within(card('Weekly research'))
  expect(research.getByText('Runs in Paseo')).toBeTruthy()
  expect(research.getByText('Every day')).toBeTruthy()
  expect(research.getByText('Ask your assistant to move it here.')).toBeTruthy()
  expect(buttons('Weekly research')).toEqual([])
})

it('pauses, resumes and runs a schedule now, reads the list again after each, and says why one did not go through', async () => {
  server.schedules = [schedule('daily-plan', 'Daily plan'), schedule('invoices', 'Invoice follow-up', { state: 'paused' })]
  const answers = [Response.json({}), Response.json({ error: { code: 'too_soon' } }, { status: 429 }),
    Response.json({ error: { code: 'already_waiting' } }, { status: 409 }), Response.json({}, { status: 500 }), new Response('oops', { status: 502 })]
  server.change = () => answers.shift() ?? Response.json({})
  await open(SCHEDULES)
  await press('Pause', card('Daily plan'))
  expect(changes()).toEqual([['pause', { key: 'daily-plan' }]])
  expect(reads()).toBe(2)
  for (const said of ['This ran a moment ago. Try again later.', 'A run is already waiting.', 'That did not go through. Try again.',
    'That did not go through. Try again.']) {
    await press('Run now', card('Daily plan'))
    expect(within(card('Daily plan')).getByRole('alert').textContent).toBe(said)
  }
  server.change = () => { throw new TypeError('offline') }
  await press('Run now', card('Daily plan'))
  expect(within(card('Daily plan')).getByRole('alert').textContent).toBe('That did not go through. Try again.')
  server.change = () => Response.json({})
  await press('Run now', card('Daily plan'))
  expect(within(card('Daily plan')).queryByRole('alert')).toBeNull()
  await press('Resume', card('Invoice follow-up'))
  expect(changes().at(-1)).toEqual(['resume', { key: 'invoices' }])
  expect(reads()).toBe(9)
})

it('shows a run waiting for the computer with Cancel until the computer takes it', async () => {
  server.online = false
  server.schedules = [schedule('daily-plan', 'Daily plan', { waiting: run('daily-plan', 'due', { source: 'now', id: 'r1' }) }),
    schedule('invoices', 'Invoice follow-up', { waiting: run('invoices', 'due', { id: 'r2' }) }),
    schedule('backup', 'Nightly backup', { waiting: run('backup', 'taken') })]
  server.change = () => Response.json({ error: { code: 'not_waiting' } }, { status: 409 })
  await open(SCHEDULES)
  expect(screen.getByText('Computer offline')).toBeTruthy()
  expect(within(card('Daily plan')).getByText('Run now on Daily plan is waiting for your computer.')).toBeTruthy()
  expect(buttons('Daily plan')).toEqual(['Cancel'])
  expect(within(card('Invoice follow-up')).getByText('This run is waiting for your computer.')).toBeTruthy()
  expect(within(card('Nightly backup')).getByText('Starting on your computer…')).toBeTruthy()
  expect(buttons('Nightly backup')).toEqual([])
  await press('Cancel', card('Daily plan'))
  expect(changes()).toEqual([['run-cancel', { id: 'r1' }]])
  expect(within(card('Daily plan')).getByRole('alert').textContent).toBe('Your computer already took that run.')
})

it('says when the schedules are unavailable, says none are set up yet, and switches back to the agents', async () => {
  server.schedules = null
  show(SCHEDULES)
  expect((await screen.findByRole('alert')).textContent).toBe('The inbox is unavailable.')
  server.schedules = []
  await press('Retry')
  expect(await screen.findByText('No schedules yet')).toBeTruthy()
  expect(screen.getByText('Ask your assistant to do something every week, or on a date.')).toBeTruthy()
  // Tapping the view already shown keeps it.
  await view('Schedules')
  expect(screen.getByText('No schedules yet')).toBeTruthy()
  await view('Agents')
  expect(await screen.findByText('Nothing is waiting on you.')).toBeTruthy()
  expect(screen.getByRole('radio', { name: 'Agents' }).getAttribute('aria-checked')).toBe('true')
})
