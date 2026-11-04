// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { when, type Review } from './api'
import { App } from './App'

const HOUR = 3_600_000
const NOW = Date.UTC(2026, 10, 3, 12, 0)
const row = (n: number, more: Partial<Review> = {}): Review => ({ id: n.toString(16).padStart(32, '0'), title: `Page ${n}`, workspace: 'desk',
  createdAt: NOW - n * HOUR, closesAt: NOW - n * HOUR + 24 * HOUR, endedAt: NOW - n * HOUR + HOUR, answered: true, ...more })
const waiting = [row(100, { title: 'Weekly profit summary', closesAt: NOW + 21 * HOUR, endedAt: null }),
  row(101, { title: 'Spring sale ads', workspace: 'ads', closesAt: NOW + 3 * 24 * HOUR, endedAt: null })]
// An expired page with no answer has no end of its own: its closing time shows.
const archived = [row(1, { title: 'Profit by channel' }), row(2, { title: 'Stock check', answered: false, endedAt: null })]

let answer: (query: URLSearchParams) => Response | Promise<Response>
let reads: URLSearchParams[]
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  reads = []
  answer = () => Response.json({ waiting, archived, more: false })
  vi.stubGlobal('fetch', vi.fn(async (path: string) => {
    const url = new URL(path, 'https://app.test')
    if (url.pathname !== '/apps/inbox/api/reviews') return new Response(null, { status: 404 })
    reads.push(url.searchParams)
    return answer(url.searchParams)
  }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers() })

function Where() {
  const location = useLocation()
  return <p data-testid="where">{location.pathname + location.search}</p>
}
/** An answer the test gives later, so a newer read can overtake it. */
const held = () => {
  let give: (response: Response) => void = () => undefined
  const response = new Promise<Response>(done => { give = done })
  return { response, give: (response: Response) => act(async () => { give(response) }) }
}
const open = async () => {
  render(<MemoryRouter initialEntries={['/apps/inbox/?view=reviews']}>
    <Routes><Route path="/apps/:name/*" element={<><App /><Where /></>} /></Routes>
  </MemoryRouter>)
  await screen.findByRole('heading', { name: /Archive/ })
}
const part = (name: RegExp) => within(screen.getByRole('heading', { name }).parentElement!)
const links = (name: RegExp) => part(name).queryAllByRole('link').map(link => link.textContent)
const search = async (text: string) => {
  fireEvent.change(screen.getByLabelText('Search reviews by title'), { target: { value: text } })
  await act(async () => { await new Promise(done => setTimeout(done, 300)) })
}

it('shows the pages waiting on you as cards with the time left, then the Archive with each answer and its time', async () => {
  await open()
  expect(screen.getByRole('radio', { name: 'Reviews' }).getAttribute('aria-checked')).toBe('true')
  expect(part(/Waiting/).getByText('2')).toBeTruthy()
  expect(links(/Waiting/)).toEqual(['Weekly profit summarydesk · Closes in 21 h', `Spring sale adsads · Closes ${when(NOW + 3 * 24 * HOUR)}`])
  expect(links(/Archive/)).toEqual([`Profit by channelAnswered, ${when(archived[0].endedAt!)} · desk`,
    `Stock checkNo answer, ${when(archived[1].closesAt)} · desk`])
  // The field waits for a tap: a phone's keyboard stays down.
  expect(document.activeElement).not.toBe(screen.getByLabelText('Search reviews by title'))
  expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull()
})

it("opens a row's page, whose Back returns here, and leaves for the week board by the toggle", async () => {
  await open()
  expect(part(/Archive/).getByRole('link', { name: /Stock check/ }).getAttribute('href')).toBe(`/apps/inbox/?item=${archived[1].id}&from=reviews`)
  expect(part(/Waiting/).getByRole('link', { name: /Weekly profit/ }).getAttribute('href')).toBe(`/apps/inbox/?item=${waiting[0].id}&from=reviews`)
  vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 503 })))
  await act(async () => { fireEvent.click(screen.getByRole('radio', { name: 'Day' })) })
  expect(screen.getByTestId('where').textContent).toBe('/apps/inbox/?view=day')
})

it('stays on Reviews when its own choice or Escape in the empty field is tapped', async () => {
  await open()
  await act(async () => { fireEvent.click(screen.getByRole('radio', { name: 'Reviews' })) })
  fireEvent.keyDown(screen.getByLabelText('Search reviews by title'), { key: 'Escape' })
  expect(screen.getByTestId('where').textContent).toBe('/apps/inbox/?view=reviews')
  expect(links(/Archive/)).toHaveLength(2)
})

it('shows only the newest search: an answer to an older one, found or failed, is dropped', async () => {
  const first = held(), second = held()
  const answers = [first.response, second.response, Response.json({ waiting: [], archived: [archived[1]], more: false })]
  answer = () => answers.shift()!
  render(<MemoryRouter initialEntries={['/apps/inbox/?view=reviews']}><Routes><Route path="/apps/:name/*" element={<App />} /></Routes></MemoryRouter>)
  await act(async () => { await new Promise(done => setTimeout(done, 10)) })
  await search('profit')
  await search('stock')
  await first.give(Response.json({ waiting, archived, more: false }))
  await second.give(new Response(null, { status: 500 }))
  expect(reads.map(read => read.get('q'))).toEqual([null, 'profit', 'stock'])
  expect(links(/Archive/)).toEqual([`Stock checkNo answer, ${when(archived[1].closesAt)} · desk`])
  expect(screen.queryByRole('alert')).toBeNull()
})

it('searches both parts by title as you type, and says when nothing matches', async () => {
  await open()
  answer = query => Response.json(query.get('q') === 'profit'
    ? { waiting: [waiting[0]], archived: [archived[0]], more: false } : { waiting: [], archived: [], more: false })
  await search('profit')
  expect(reads.at(-1)!.get('q')).toBe('profit')
  expect(links(/Waiting/)).toHaveLength(1)
  expect(links(/Archive/)).toHaveLength(1)
  await search('nothing')
  expect(screen.getByText('No page matches.')).toBeTruthy()
  expect(screen.queryByRole('heading', { name: /Archive/ })).toBeNull()
})

it('reads the next archived pages after the last one shown with Show more', async () => {
  answer = query => Response.json(query.get('before')
    ? { waiting: [], archived: [row(3, { title: 'Older page' })], more: false } : { waiting, archived, more: true })
  await open()
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Show more' })) })
  expect(reads.at(-1)!.get('before')).toBe(`${archived[1].createdAt}:${archived[1].id}`)
  expect(links(/Archive/).map(text => text!.split('Answered')[0].split('No answer')[0])).toEqual(['Profit by channel', 'Stock check', 'Older page'])
  expect(links(/Waiting/)).toHaveLength(2)
  expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull()
})

it('says when Show more fails, and drops a next page that comes after a new search', async () => {
  answer = query => query.get('before') ? new Response(null, { status: 500 }) : Response.json({ waiting, archived, more: true })
  await open()
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Show more' })) })
  expect(screen.getByRole('alert').textContent).toBe('More pages could not be loaded. Try again.')
  const late = held()
  answer = query => query.get('before') ? late.response : Response.json({ waiting: [], archived: [archived[0]], more: true })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Show more' })) })
  await search('profit')
  await late.give(Response.json({ waiting: [], archived: [row(3, { title: 'Older page' })], more: false }))
  expect(links(/Archive/)).toHaveLength(1)
  expect(part(/Waiting/).getByText('Nothing waits on you.')).toBeTruthy()
})

it('says when there are no review pages yet, and offers Retry when the list does not load', async () => {
  answer = () => Response.json({ waiting: [], archived: [], more: false })
  render(<MemoryRouter initialEntries={['/apps/inbox/?view=reviews']}><Routes><Route path="/apps/:name/*" element={<App />} /></Routes></MemoryRouter>)
  expect(screen.getByRole('status').textContent).toBe('Loading…')
  expect(await screen.findByText(/No review pages yet/)).toBeTruthy()
  cleanup()
  answer = () => new Response(null, { status: 500 })
  render(<MemoryRouter initialEntries={['/apps/inbox/?view=reviews']}><Routes><Route path="/apps/:name/*" element={<App />} /></Routes></MemoryRouter>)
  expect(await screen.findByText('Review pages could not be loaded.')).toBeTruthy()
  answer = () => Response.json({ waiting, archived: [], more: false })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry' })) })
  expect(await screen.findByText('No answered pages yet.')).toBeTruthy()
})
