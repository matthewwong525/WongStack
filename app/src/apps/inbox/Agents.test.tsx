// @vitest-environment jsdom
// The inbox as a list of agents: where each stands, and their morning plan cards.
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { bar, card, choose, DAYS, FIRST, item, key, open, outlined, PLAN, QUESTION, SECOND, send, server, taps, tick, type } from './App.test.kit'
import { REFRESH_MS } from './List'
import { TAP_POLL_MS } from './TapLine'

// The agents a day's watch reports, and their morning plans.
const status = (id: string, workspace: string, title: string, detail: Record<string, string>) => item(id, 'agent', title, { workspace, detail })
const plan = (id: string, workspace: string, title: string, detail: unknown) => item(id, 'start', title, { workspace, detail })
const MORNING = { willDo: ["Read last year's ads.", 'Draft the brief.'], needs: ['Last year’s results.'], askFirst: ['Sending the brief to the ads team.'],
  questions: [{ text: 'Which offer leads?', options: ['Gift card', 'Free shipping'] }] }
const section = (name: string) => screen.getByRole('heading', { level: 2, name }).closest('section')!
const titles = (name: string) => within(section(name)).getAllByRole('heading', { level: 3 }).map(heading => heading.textContent)

it('lists agents in Needs you, Working and Done, each with where it stands, and a chat nothing watches by its name', async () => {
  const proof = 'Files in the shared drive: https://drive.example/ronald'
  server.items = [status(FIRST, 'landing', 'Check the landing page', { state: 'working', step: 'Checking the banner on a phone', action: 'Kept going: Check the landing page' }),
    status(SECOND, 'files', "Get Ronald's files", { state: 'done', proof }),
    status(PLAN, 'brief', 'Write the ad brief', { state: 'planning' }), plan('d'.repeat(32), 'brief', 'Write the ad brief', { state: 'ready', plan: MORNING }),
    item(QUESTION, 'question', 'Which day?', DAYS)]
  await open()
  expect(screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent)).toEqual(['Needs you', 'Working', 'Done'])
  expect(titles('Needs you')).toEqual(['Write the ad brief', 'email', 'Ship Friday or Monday?'])
  expect(section('Needs you').querySelector('h2 + [data-slot="badge"]')!.textContent).toBe('2')
  expect(titles('Working')).toEqual(['Check the landing page'])
  expect(within(section('Working')).getByText('Checking the banner on a phone · Kept going: Check the landing page')).toBeTruthy()
  expect(within(section('Done')).getByRole('link', { name: 'https://drive.example/ronald' }).getAttribute('href')).toBe('https://drive.example/ronald')
  // A watched agent planning says so on its plan card; a chat nothing watches shows only what waits.
  expect(within(card('Write the ad brief')).queryByText('Planning')).toBeNull()
  expect(screen.getByRole('heading', { level: 3, name: 'email' }).nextElementSibling).toBeNull()
  expect(within(section('Working')).queryByRole('radio')).toBeNull()
})

it('moves an agent to Needs you while it asks, and back to Working, saying Sent, once the answer reaches it', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  const working = status(FIRST, 'landing', 'Check the landing page', { state: 'working', step: 'Checking the banner' })
  server.items = [working]
  await open()
  expect(titles('Working')).toEqual(['Check the landing page'])
  server.items = [working, item(QUESTION, 'question', 'Which banner?', { workspace: 'landing', detail: { text: 'Which banner?', options: ['Gift card', 'Shipping'] } })]
  await tick(REFRESH_MS)
  expect(screen.queryByRole('heading', { level: 2, name: 'Working' })).toBeNull()
  expect(within(section('Needs you')).getByText('Checking the banner')).toBeTruthy()
  await choose('Gift card', 'Which banner?')
  await send()
  expect(titles('Needs you')).toContain('Check the landing page')
  server.items = [working]
  await tick(TAP_POLL_MS)
  expect(titles('Working')).toEqual(['Check the landing page'])
  expect(within(card('Check the landing page')).getByRole('status').textContent).toBe('Sent')
  expect(screen.queryByRole('heading', { level: 2, name: 'Needs you' })).toBeNull()
})

it('says Planning, Working or Done when an agent sends no step or proof', async () => {
  server.items = [status(FIRST, 'landing', 'Check the landing page', { state: 'working' }), status(SECOND, 'files', "Get Ronald's files", { state: 'done' }),
    status(PLAN, 'brief', 'Write the ad brief', { state: 'planning' })]
  await open()
  expect(within(card('Check the landing page')).getByText('Working')).toBeTruthy()
  expect(within(card('Write the ad brief')).getByText('Planning')).toBeTruthy()
  expect(within(card("Get Ronald's files")).getByText('Done')).toBeTruthy()
})

it('keeps the last status it was sent while the computer is offline, and says so', async () => {
  server.online = false
  server.items = [status(FIRST, 'landing', 'Check the landing page', { state: 'working', step: 'Checking the banner' })]
  await open()
  expect(screen.getByText('Computer offline')).toBeTruthy()
  expect(within(section('Working')).getByText('Checking the banner')).toBeTruthy()
})

// A plan card sits under its agent's folder name until the watch sends the agent's own card.
it('starts every plan card on Go and sends each with the other answers on one Start, one tap per card', async () => {
  server.items = [plan(PLAN, 'brief', 'Write the ad brief', { state: 'ready', plan: MORNING }), plan(SECOND, 'tiktok', 'Set up TikTok Shop', { state: 'ready', plan: { ...MORNING, questions: [] } }),
    plan('d'.repeat(32), 'files', "Get Ronald's files", { state: 'planning' }), plan('e'.repeat(32), 'van', 'Book the van', { state: 'no-plan' }),
    item(FIRST, 'approval', 'Send the quote', { workspace: 'quote' })]
  await open()
  const goes = () => screen.getAllByRole('radio', { name: 'Go' }).map(radio => radio.getAttribute('aria-checked'))
  expect(goes()).toEqual(['true', 'true', 'true', 'true'])
  expect(screen.getByRole('button', { name: 'Start 4 agents' })).toBeTruthy()
  expect(bar()).toBe('4 of 5 picked')
  expect(within(card('brief')).getByText('Will do').nextElementSibling!.textContent).toBe("Read last year's ads.Draft the brief.")
  expect(within(card('brief')).getByText('Asks before')).toBeTruthy()
  expect(within(card('files')).getByText(/^Still planning/)).toBeTruthy()
  expect(within(card('van')).getByText(/^No plan came/)).toBeTruthy()
  await act(async () => { fireEvent.click(within(card('tiktok')).getByRole('radio', { name: 'Not today' })) })
  expect(within(card('tiktok')).getByText('It stops today and comes back another day.')).toBeTruthy()
  expect(within(card('tiktok')).queryByText('Will do')).toBeNull()
  expect(screen.getByRole('button', { name: 'Start 3 agents' })).toBeTruthy()
  await choose('Gift card', 'brief')
  type('A note for this agent', 'brief', 'Keep it short')
  await choose('Approve', 'Send the quote')
  await send(/^Start 3 agents$/)
  expect(taps()).toEqual([
    { item: PLAN, action: 'go', version: 'v1', text: 'Note: Keep it short\n\nWhich offer leads?\nGift card' },
    { item: SECOND, action: 'skip', version: 'v1', text: '' }, { item: 'd'.repeat(32), action: 'go', version: 'v1', text: '' },
    { item: 'e'.repeat(32), action: 'go', version: 'v1', text: '' }, { item: FIRST, action: 'approve', version: 'v1', text: '' },
  ])
  expect(within(card('brief')).getByRole('status').textContent).toContain('Waiting')
  expect(within(card('brief')).queryByRole('radio', { name: 'Go' })).toBeNull()
  // While waiting, each card still shows what was sent: Not today keeps its plan hidden.
  expect(within(card('tiktok')).getByText('It stops today and comes back another day.')).toBeTruthy()
  expect(within(card('tiktok')).queryByText('Will do')).toBeNull()
  expect(within(card('brief')).getByText('Will do')).toBeTruthy()
  expect(localStorage.getItem('inbox-decisions')).toBe('{}')
})

it('keeps a plan card’s picks, note and answers through a reload, and drops them once the card is gone', async () => {
  server.items = [plan(PLAN, 'brief', 'Write the ad brief', { state: 'ready', plan: MORNING })]
  await open()
  await act(async () => { fireEvent.click(screen.getByRole('radio', { name: 'Not today' })) })
  await act(async () => { fireEvent.click(screen.getByRole('radio', { name: 'Go' })) })
  await act(async () => { fireEvent.click(screen.getByRole('radio', { name: 'Go' })) })
  expect(screen.getByRole('radio', { name: 'Go' }).getAttribute('aria-checked')).toBe('true')
  await choose('Free shipping', 'brief')
  type('A note for this agent', 'brief', 'Ask Kim')
  cleanup()
  await open()
  expect(within(card('brief')).getByRole('radio', { name: 'Free shipping' }).getAttribute('aria-checked')).toBe('true')
  expect(within(card('brief')).getByRole('radio', { name: 'Go' }).getAttribute('aria-checked')).toBe('true')
  expect(within(card('brief')).getByLabelText('A note for this agent')).toHaveProperty('value', 'Ask Kim')
  cleanup()
  server.items = []
  await open()
  expect(localStorage.getItem('inbox-decisions')).toBe('{}')
})

it('shows a plan holding markup as text, runs nothing, and counts no hours', async () => {
  const markup = '<script>window.ran = true</script><b>Bold</b>'
  server.items = [plan(PLAN, 'brief', 'Write the ad brief', { state: 'ready', plan: { ...MORNING, willDo: [markup], questions: [{ text: '<img src=x onerror=alert(1)>', options: ['<i>yes</i>'] }] } })]
  await open()
  expect(within(card('brief')).getByText(markup)).toBeTruthy()
  expect(within(card('brief')).getByText('<img src=x onerror=alert(1)>')).toBeTruthy()
  expect(within(card('brief')).getByRole('radio', { name: '<i>yes</i>' })).toBeTruthy()
  expect(document.querySelectorAll('main script, [data-slot="card"] script, [data-slot="card"] b, [data-slot="card"] img')).toHaveLength(0)
  expect(document.body.textContent).not.toMatch(/hour/i)
})

it('takes Go or Not today from the keys, and N writes the note', async () => {
  server.items = [plan(PLAN, 'brief', 'Write the ad brief', { state: 'planning' }), plan(SECOND, 'tiktok', 'Set up TikTok Shop', { state: 'no-plan' })]
  await open()
  expect(outlined()).toEqual([`inbox-${PLAN}`])
  await key('2')
  expect(outlined()).toEqual([`inbox-${SECOND}`])
  await key('n')
  expect(document.activeElement).toBe(within(card('tiktok')).getByLabelText('A note for this agent'))
  await key('Enter', { ctrlKey: true })
  expect(taps()).toEqual([{ item: PLAN, action: 'skip', version: 'v1', text: '' }, { item: SECOND, action: 'go', version: 'v1', text: '' }])
})

it('says why a plan card did not start, and keeps its pick', async () => {
  server.items = [plan(PLAN, 'brief', 'Write the ad brief', { state: 'no-plan' })]
  server.tap = () => Response.json({ error: { code: 'closed' } }, { status: 410 })
  await open()
  await send(/^Start 1 agent$/)
  expect(within(card('brief')).getByRole('alert').textContent).toContain('This has closed.')
  expect(within(card('brief')).getByRole('radio', { name: 'Go' }).getAttribute('aria-checked')).toBe('true')
})
