// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { when, type Review } from './api'
import { App } from './App'
import './line.test.kit'

const HOUR = 3_600_000
const NOW = Date.UTC(2026, 10, 11, 12)
const page = (id: string, title: string, hoursAgo: number, workspace = 'desk'): Review => ({ id: id.repeat(32), title, workspace,
  createdAt: NOW - hoursAgo * HOUR, closesAt: NOW + (24 - hoursAgo) * HOUR, endedAt: null, answered: false })
const older = page('a', '3 invoices are late', 5, 'MyApp')
const newer = page('b', 'Daily becomes a module any project can add', 1, 'durable-hamster')

let server: { waiting: Review[]; online: boolean; fails: boolean }
let calls: string[]
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  calls = []
  // The route gives the pages in any order: the list puts the newest first.
  server = { waiting: [older, newer], online: true, fails: false }
  vi.stubGlobal('fetch', vi.fn(async (path: string) => {
    const route = new URL(path, 'https://app.test').pathname.replace('/apps/inbox/api/', '')
    calls.push(route)
    if (route === 'reviews') return Response.json({ waiting: server.waiting, archived: [], more: false })
    if (route === 'items') return server.fails ? new Response(null, { status: 503 }) : Response.json({ items: [], computerOnline: server.online })
    return new Response(null, { status: 404 })
  }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers() })

function Where() {
  const location = useLocation()
  return <p data-testid="where">{location.pathname + location.search}</p>
}
const open = async () => {
  render(<MemoryRouter initialEntries={['/apps/inbox/']}>
    <Routes><Route path="/apps/:name/*" element={<><App /><Where /></>} /></Routes>
  </MemoryRouter>)
  await act(async () => { await new Promise(done => setTimeout(done, 10)) })
}
const needs = () => within(screen.getByRole('region', { name: /Needs you/ }))
const rows = () => needs().getAllByRole('link').map(link => link.querySelector('span.font-medium')!.textContent)

it('shows the pages waiting for you under Needs you, newest first, each with its folder and when it came', async () => {
  await open()
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Inbox')
  expect(screen.getByText('Computer online')).toBeTruthy()
  expect(rows()).toEqual([newer.title, older.title])
  expect(needs().getByText('2')).toBeTruthy()
  expect(needs().getByText(`durable-hamster · ${when(newer.createdAt)}`)).toBeTruthy()
  expect(needs().getAllByText('Review')).toHaveLength(2)
  expect(screen.getByRole('region', { name: 'Archive' })).toBeTruthy()
  expect(screen.queryByText('Nothing waits for you.')).toBeNull()
})

it('opens a waiting page with one tap', async () => {
  await open()
  const link = needs().getByRole('link', { name: new RegExp(newer.title) })
  expect(link.getAttribute('href')).toBe(`/apps/inbox/?item=${newer.id}`)
  await act(async () => { fireEvent.click(link) })
  expect(screen.getByTestId('where').textContent).toBe(`/apps/inbox/?item=${newer.id}`)
})

it('says nothing waits, and shows the Archive below, when no page waits for you', async () => {
  server.waiting = []
  await open()
  expect(screen.getByText('Nothing waits for you.')).toBeTruthy()
  expect(screen.queryByRole('region', { name: /Needs you/ })).toBeNull()
  expect(screen.getByRole('region', { name: 'Archive' })).toBeTruthy()
})

it('says when the computer is offline', async () => {
  server.online = false
  await open()
  expect(screen.getByText('Computer offline')).toBeTruthy()
  expect(screen.queryByText('Computer online')).toBeNull()
})

it('offers Retry when the pages do not load, and opens Schedules from the top bar', async () => {
  server.fails = true
  await open()
  expect(screen.getByText('Your pages could not be loaded.')).toBeTruthy()
  server.fails = false
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry' })) })
  expect(rows()).toEqual([newer.title, older.title])
  await act(async () => { fireEvent.click(screen.getByRole('link', { name: 'Schedules' })) })
  expect(screen.getByTestId('where').textContent).toBe('/apps/inbox/?view=schedules')
})

it('reads the waiting pages again when the page comes back into view, and not while it is hidden', async () => {
  await open()
  const reads = () => calls.filter(each => each === 'items').length
  const before = reads()
  const look = (state: string) => act(async () => {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await look('hidden')
  expect(reads()).toBe(before)
  await look('visible')
  expect(reads()).toBe(before + 1)
})
