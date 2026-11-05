// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Run, Schedule } from './api'
import { App } from './App'
import { line } from './line.test.kit'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 10, 5, 12)
const today = Math.floor(NOW / DAY) * DAY
/** A moment `day` days from today, at `hour` o'clock in UTC, the timezone these schedules keep. */
const at = (day: number, hour: number) => today + day * DAY + hour * 3_600_000
const V1 = 'a'.repeat(64)
const run = (key: string, state: Run['state'], more: Partial<Run> = {}): Run => ({ id: `${key}-run`, key, dueAt: at(0, 8), source: 'clock', state,
  result: null, ...more })
const schedule = (key: string, name: string, more: Partial<Schedule> = {}): Schedule => ({ key, host: 'app', name, summary: '',
  timing: { mode: 'recurring', cron: '0 8 * * 1-5', timezone: 'UTC' }, state: 'on', nextRunAt: null, lastRun: null, waiting: null,
  instructions: `Do the ${name}.`, ended: null, version: V1, approvedVersion: V1, approvedAt: null, computerName: 'Desk', ...more })

let server: { schedules: Schedule[] | null; online: boolean; board: boolean; items: number; week: number; runs: () => Response; change: () => Response }
let calls: { path: string; body: unknown }[]
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  calls = []
  server = { schedules: [], online: true, board: true, items: 200, week: 500, runs: () => Response.json({ runs: [] }), change: () => Response.json({}) }
  vi.stubGlobal('fetch', vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, body: init?.body && JSON.parse(init.body as string) })
    const url = new URL(path, 'https://app.test')
    const route = url.pathname.replace('/apps/inbox/api/', '')
    if (route === 'items') return Response.json({ items: [], computerOnline: server.online, board: server.board }, { status: server.items })
    if (route === 'week') return new Response(null, { status: server.week })
    if (route === 'schedules') return server.schedules ? Response.json({ schedules: server.schedules, computerOnline: server.online })
      : new Response(null, { status: 503 })
    if (route === 'schedule') {
      const found = server.schedules!.find(each => each.key === url.searchParams.get('key'))!
      const answer = server.runs()
      return answer.ok ? Response.json({ schedule: found, ...await answer.json() }) : answer
    }
    return server.change()
  }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers() })

function Where() {
  const location = useLocation()
  return <p data-testid="where">{location.pathname + location.search}</p>
}
const show = (path = '/apps/inbox/?view=schedules') => render(<MemoryRouter initialEntries={[path]}>
  <Routes><Route path="/apps/:name/*" element={<><App /><Where /></>} /></Routes>
</MemoryRouter>)
const open = async () => { show(); await screen.findByRole('region', { name: 'Schedules' }) }
const card = (name: string) => screen.getByRole('button', { name }).closest<HTMLElement>('[data-slot="card"]')!
const buttons = (name: string) => within(card(name)).getAllByRole('button').map(button => button.textContent).slice(1)
const press = (name: string, inside: HTMLElement) => act(async () => { fireEvent.click(within(inside).getByRole('button', { name })) })
const changes = () => calls.filter(call => !/\/(schedules|items|week)$/.test(call.path)).map(call => [call.path.split('/').at(-1), call.body])

it('shows each schedule in plain words: what it does, when it runs next, how its last run went, and what you can do', async () => {
  server.schedules = [
    schedule('daily-plan', 'Daily plan', { summary: 'Plans the day from email and calendar.', nextRunAt: at(1, 8), lastRun: run('daily-plan', 'started') }),
    schedule('invoices', 'Invoice follow-up', { state: 'paused', nextRunAt: at(3, 10), timing: { mode: 'recurring', cron: '0 10 * * 5', timezone: 'UTC' },
      lastRun: run('invoices', 'missed', { dueAt: at(-1, 10) }) }),
    schedule('research', 'Weekly research', { host: 'paseo', timing: { mode: 'recurring', every: '1d', timezone: 'UTC' }, version: '',
      approvedVersion: null, instructions: '' }),
    schedule('stock', 'Stock check', { lastRun: run('stock', 'blocked', { result: 'no_work' }) }),
  ]
  await open()
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
  // A run with no work to do is no failure.
  expect(within(card('Stock check')).getByText('Last run today 8:00 · nothing to do')).toBeTruthy()
})

it("says which schedules wait for the person's OK and on which computer, with no Run now and no button that approves", async () => {
  server.schedules = [
    schedule('changed', 'Changed in a chat', { version: 'b'.repeat(64), computerName: "Jo's laptop" }),
    schedule('refused', 'Refused run', { state: 'paused', lastRun: run('refused', 'blocked', { result: 'not_approved' }) }),
    schedule('copy', 'Team copy', { approvedVersion: null, computerName: null }),
    schedule('approved', 'Cleared run', { approvedAt: at(0, 9), lastRun: run('approved', 'blocked', { result: 'not_approved' }) }),
    schedule('off', 'Check-ins off', { lastRun: run('off', 'blocked', { result: 'checkins_off' }) }),
  ]
  await open()
  const changed = within(card('Changed in a chat'))
  expect(changed.getByText("Needs your OK on Jo's laptop")).toBeTruthy()
  expect(changed.getByText("To let it run, open a chat on Jo's laptop and say OK.")).toBeTruthy()
  expect(buttons('Changed in a chat')).toEqual(['Pause'])
  expect(within(card('Refused run')).getByText('Needs your OK on Desk')).toBeTruthy()
  expect(within(card('Refused run')).getByRole('button', { name: 'Resume' }).dataset.variant).toBe('ghost')
  expect(within(card('Team copy')).getByText('Needs your OK on your computer')).toBeTruthy()
  expect(screen.queryByRole('button', { name: /approve|OK/i })).toBeNull()
  // An OK given after the refused run clears the tag, and Run now is back.
  expect(within(card('Cleared run')).getByText('On')).toBeTruthy()
  expect(buttons('Cleared run')).toEqual(['Pause', 'Run now'])
  expect(within(card('Check-ins off')).getByText("Last run today 8:00 · didn't start, check-ins are off")).toBeTruthy()
})

it('keeps ended schedules under a closed Ended section, each with when and why it ended, and no buttons', async () => {
  server.schedules = [schedule('daily-plan', 'Daily plan'),
    schedule('launch', 'Launch checklist', { state: 'paused', ended: { at: at(-1, 9), reason: 'Every item is done.' }, version: 'c'.repeat(64) })]
  await open()
  const ended = screen.getByText('Ended (1)').closest('details')!
  expect(ended.open).toBe(false)
  expect(within(ended).queryByText('Daily plan')).toBeNull()
  const launch = within(card('Launch checklist'))
  expect(launch.getByText('Ended')).toBeTruthy()
  expect(launch.getByText('Ended yesterday 9:00: Every item is done.')).toBeTruthy()
  expect(buttons('Launch checklist')).toEqual([])
})

it('pauses, resumes and runs a schedule now, reads the list again after each, and says why one did not go through', async () => {
  server.schedules = [schedule('daily-plan', 'Daily plan'), schedule('invoices', 'Invoice follow-up', { state: 'paused' })]
  const answers = [Response.json({}), Response.json({ error: { code: 'too_soon' } }, { status: 429 }),
    Response.json({ error: { code: 'already_waiting' } }, { status: 409 }), Response.json({ error: { code: 'ended' } }, { status: 409 }),
    Response.json({}, { status: 500 }), new Response('oops', { status: 502 })]
  server.change = () => answers.shift() ?? Response.json({})
  await open()
  const reads = () => calls.filter(call => call.path.endsWith('/schedules')).length
  await press('Pause', card('Daily plan'))
  expect(changes()).toEqual([['pause', { key: 'daily-plan' }]])
  expect(reads()).toBe(2)
  for (const said of ['This ran a moment ago. Try again later.', 'A run is already waiting.', 'This schedule has ended.',
    'That did not go through. Try again.', 'That did not go through. Try again.']) {
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
  expect(reads()).toBe(10)
  // Each look on the line reads the list again.
  await line().open()
  expect(reads()).toBe(11)
})

it('shows a run waiting for the computer with Cancel until the computer takes it', async () => {
  server.online = false
  server.schedules = [schedule('daily-plan', 'Daily plan', { waiting: run('daily-plan', 'due', { source: 'now', id: 'r1' }) }),
    schedule('invoices', 'Invoice follow-up', { waiting: run('invoices', 'due', { id: 'r2' }) }),
    schedule('backup', 'Nightly backup', { waiting: run('backup', 'taken') })]
  server.change = () => Response.json({ error: { code: 'not_waiting' } }, { status: 409 })
  await open()
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

it('opens a schedule to its instructions as plain text and its ten newest runs', async () => {
  server.schedules = [schedule('daily-plan', 'Daily plan', { instructions: 'Read my email.\nPlan the day.' }),
    schedule('research', 'Weekly research', { host: 'paseo', instructions: '' }),
    schedule('once', 'Tax reminder', { timing: { mode: 'once', timezone: 'UTC', dueAt: '2026-12-01T09:00:00Z' } })]
  server.runs = () => Response.json({ runs: [run('daily-plan', 'started', { id: 'a', dueAt: at(0, 8) }),
    run('daily-plan', 'blocked', { id: 'b', dueAt: at(-1, 8), result: 'no_work' })] })
  await open()
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Daily plan' })) })
  const sheet = within(screen.getByRole('dialog'))
  expect(sheet.getByRole('heading', { name: 'Daily plan' })).toBeTruthy()
  expect(sheet.getByText('Every weekday at 8:00')).toBeTruthy()
  expect(sheet.getByText(/Read my email/).textContent).toBe('Read my email.\nPlan the day.')
  expect(sheet.getAllByRole('listitem').map(item => item.textContent)).toEqual(['today 8:00 · done', 'yesterday 8:00 · nothing to do'])
  expect(sheet.queryByRole('textbox')).toBeNull()
  expect(calls.at(-1)!.path).toBe('/apps/inbox/api/schedule?key=daily-plan')
  await act(async () => { fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }) })
  expect(screen.queryByRole('dialog')).toBeNull()

  server.runs = () => Response.json({ runs: [] })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Weekly research' })) })
  expect(within(screen.getByRole('dialog')).getByText('None here: it runs in Paseo.')).toBeTruthy()
  expect(within(screen.getByRole('dialog')).getByText('No runs yet.')).toBeTruthy()
  await act(async () => { fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }) })

  server.runs = () => new Response(null, { status: 503 })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Tax reminder' })) })
  expect(within(screen.getByRole('dialog')).getByText('Once on Tue 1 Dec 9:00')).toBeTruthy()
  expect(within(screen.getByRole('dialog')).getByRole('alert').textContent).toBe('The runs could not be loaded.')
})

it('says when the schedules could not be loaded, and that none are set up yet, with a chat to ask', async () => {
  server.schedules = null
  show()
  expect((await screen.findByRole('alert')).textContent).toContain('Schedules could not be loaded.')
  server.schedules = []
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry' })) })
  expect(screen.getByText('No schedules yet')).toBeTruthy()
  expect(screen.getByText('Ask a chat to do something every week, or on a date.')).toBeTruthy()
  // Tapping the view already shown keeps it; the owner's Day goes to the board.
  await act(async () => { fireEvent.click(screen.getByRole('radio', { name: 'Schedules' })) })
  expect(screen.getByTestId('where').textContent).toBe('/apps/inbox/?view=schedules')
  await act(async () => { fireEvent.click(screen.getByRole('radio', { name: 'Day' })) })
  expect(screen.getByTestId('where').textContent).toBe('/apps/inbox/?view=day')
})

it('opens a teammate with no week board on their own schedules, with no Day or Week', async () => {
  server.board = false
  server.week = 403
  server.schedules = [schedule('daily-plan', 'Daily plan')]
  show('/apps/inbox/')
  await screen.findByRole('region', { name: 'Schedules' })
  expect(screen.getByTestId('where').textContent).toBe('/apps/inbox/?view=schedules')
  expect(screen.getAllByRole('radio').map(radio => radio.textContent)).toEqual(['Reviews', 'Schedules'])
  await act(async () => { fireEvent.click(screen.getByRole('radio', { name: 'Reviews' })) })
  expect(screen.getByTestId('where').textContent).toBe('/apps/inbox/?view=reviews')
})

it("keeps Day and Week for the preview checker, whom the Inbox list refuses while the board lets it in", async () => {
  server.items = 403
  await open()
  expect(screen.getAllByRole('radio').map(radio => radio.textContent)).toEqual(['Day', 'Week', 'Reviews', 'Schedules'])
})
