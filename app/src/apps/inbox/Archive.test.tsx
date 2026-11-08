// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { when, type Review } from './api'
import { Archive } from './Archive'

const HOUR = 3_600_000
const NOW = Date.UTC(2026, 10, 3, 12, 0)
const row = (n: number, more: Partial<Review> = {}): Review => ({ id: n.toString(16).padStart(32, '0'), title: `Page ${n}`, workspace: 'desk',
  createdAt: NOW - n * HOUR, closesAt: NOW - n * HOUR + 24 * HOUR, endedAt: NOW - n * HOUR + HOUR, answered: true, ...more })
const waiting = [row(100, { title: 'Weekly profit summary', closesAt: NOW + 21 * HOUR, endedAt: null })]
// An expired page with no answer has no end of its own: its closing time shows.
const archived = [row(1, { title: 'Profit by channel' }), row(2, { title: 'Stock check', answered: false, endedAt: null, closesAt: NOW - HOUR })]

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

/** An answer the test gives later, so a newer read can overtake it. */
const held = () => {
  let give: (response: Response) => void = () => undefined
  const response = new Promise<Response>(done => { give = done })
  return { response, give: (response: Response) => act(async () => { give(response) }) }
}
const show = () => render(<MemoryRouter initialEntries={['/apps/inbox/']}><Archive /></MemoryRouter>)
const settle = () => act(async () => { await new Promise(done => setTimeout(done, 10)) })
const open = async () => { show(); await settle() }
const links = () => within(screen.getByRole('region', { name: 'Archive' })).queryAllByRole('link').map(link => link.textContent)
const search = async (text: string) => {
  fireEvent.change(screen.getByLabelText('Search reviews by title'), { target: { value: text } })
  await act(async () => { await new Promise(done => setTimeout(done, 300)) })
}

it('lists the answered and closed pages with each answer and its time, and opens a page from its row', async () => {
  await open()
  expect(links()).toEqual([`Profit by channelAnswered, ${when(archived[0].endedAt!)} · desk`,
    `Stock checkNo answer, ${when(archived[1].closesAt)} · desk`])
  expect(screen.getByRole('link', { name: /Stock check/ }).getAttribute('href')).toBe(`/apps/inbox/?item=${archived[1].id}`)
  // The field waits for a tap: a phone's keyboard stays down.
  expect(document.activeElement).not.toBe(screen.getByLabelText('Search reviews by title'))
  expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull()
})

it('searches by title as you type, waiting pages too, and says when nothing matches', async () => {
  await open()
  answer = query => Response.json(!query.get('q') ? { waiting, archived, more: false } : query.get('q') === 'profit'
    ? { waiting, archived: [archived[0]], more: false } : { waiting: [], archived: [], more: false })
  await search('profit')
  expect(reads.at(-1)!.get('q')).toBe('profit')
  expect(links()).toEqual(['Weekly profit summaryWaiting · desk', `Profit by channelAnswered, ${when(archived[0].endedAt!)} · desk`])
  await search('nothing')
  expect(screen.getByText('No page matches.')).toBeTruthy()
  fireEvent.keyDown(screen.getByLabelText('Search reviews by title'), { key: 'Escape' })
  await settle()
  expect(links()).toHaveLength(2)
})

it('shows only the newest search: an answer to an older one, found or failed, is dropped', async () => {
  const first = held(), second = held()
  const answers = [first.response, second.response, Response.json({ waiting: [], archived: [archived[1]], more: false })]
  answer = () => answers.shift()!
  await open()
  await search('profit')
  await search('stock')
  await first.give(Response.json({ waiting, archived, more: false }))
  await second.give(new Response(null, { status: 500 }))
  expect(reads.map(read => read.get('q'))).toEqual([null, 'profit', 'stock'])
  expect(links()).toEqual([`Stock checkNo answer, ${when(archived[1].closesAt)} · desk`])
  expect(screen.queryByRole('alert')).toBeNull()
})

it('reads the next pages after the last one shown with Show more, and says when that fails', async () => {
  answer = query => Response.json(query.get('before')
    ? { waiting: [], archived: [row(3, { title: 'Older page' })], more: false } : { waiting, archived, more: true })
  await open()
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Show more' })) })
  expect(reads.at(-1)!.get('before')).toBe(`${archived[1].createdAt}:${archived[1].id}`)
  expect(links().map(text => text!.split(/Answered|No answer/)[0])).toEqual(['Profit by channel', 'Stock check', 'Older page'])
  expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull()
  cleanup()
  answer = query => query.get('before') ? new Response(null, { status: 500 }) : Response.json({ waiting, archived, more: true })
  await open()
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Show more' })) })
  expect(screen.getByRole('alert').textContent).toBe('More pages could not be loaded. Try again.')
})

it('says when no page is answered yet, and offers Retry when the list does not load', async () => {
  answer = () => new Response(null, { status: 500 })
  show()
  expect(screen.getByRole('status').textContent).toBe('Loading…')
  expect(await screen.findByText('Past pages could not be loaded.')).toBeTruthy()
  answer = () => Response.json({ waiting, archived: [], more: false })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry' })) })
  await settle()
  expect(screen.getByText('No answered pages yet.')).toBeTruthy()
})

it('clears the search with Escape or the Clear button, and a second Escape on an empty field keeps it empty', async () => {
  await open()
  await search('profit')
  const field = screen.getByLabelText<HTMLInputElement>('Search reviews by title')
  fireEvent.keyDown(field, { key: 'a' })
  expect(field.value).toBe('profit')
  fireEvent.keyDown(field, { key: 'Escape' })
  expect(field.value).toBe('')
  fireEvent.keyDown(field, { key: 'Escape' })
  expect(field.value).toBe('')
  await search('stock')
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
  expect(field.value).toBe('')
})

it('drops more pages that arrive after a new search', async () => {
  const late = held()
  answer = query => query.get('before') ? late.response : Response.json(query.get('q')
    ? { waiting: [], archived: [archived[1]], more: false } : { waiting, archived, more: true })
  await open()
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Show more' })) })
  await search('stock')
  await late.give(Response.json({ waiting: [], archived: [row(3, { title: 'Older page' })], more: false }))
  expect(links()).toEqual([`Stock checkNo answer, ${when(archived[1].closesAt)} · desk`])
})
