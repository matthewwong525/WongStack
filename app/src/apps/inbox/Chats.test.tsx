// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Chat } from './api'
import { App } from './App'
import './line.test.kit'

const NOW = Date.UTC(2026, 10, 7, 12)
const PAGE = 'a'.repeat(32)
const chat = (agentId: string | null, more: Partial<Chat> = {}): Chat => ({ agentId, name: `Chat ${agentId}`, step: 'APPLY', folder: 'desk',
  source: null, closeAskedAt: null, review: null, ...more })
const review = (id: string, title: string) => ({ id, title, createdAt: NOW - 1000, closesAt: NOW + 86_400_000 })

let server: { chats: () => Response; close: () => Response }
let calls: { method: string; route: string; body: unknown }[]
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  calls = []
  server = {
    chats: () => Response.json({ computerOnline: true, chats: [
      chat('a1', { name: 'Weekly profit summary', step: 'PLAN', folder: 'weekly-profit', review: review(PAGE, 'Weekly profit summary') }),
      chat(null, { name: 'Spring sale ads', step: null, folder: 'ads', review: review('b'.repeat(32), 'Spring sale ads') }),
      chat('a2', { name: 'Landing page check', step: null, source: 'schedule:landing', folder: 'shop' })] }),
    close: () => Response.json({ agentId: 'a2', closeAskedAt: NOW }),
  }
  vi.stubGlobal('fetch', vi.fn(async (path: string, init?: RequestInit) => {
    const url = new URL(path, 'https://app.test')
    const route = url.pathname.replace('/apps/inbox/api/', '')
    calls.push({ method: init?.method ?? 'GET', route, body: typeof init?.body === 'string' ? JSON.parse(init.body) : null })
    if (route === 'chats') return server.chats()
    if (route === 'chat-close') return server.close()
    if (route === 'reviews') return Response.json({ waiting: [], archived: [], more: false })
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
const part = (name: RegExp) => within(screen.getByRole('region', { name }))
const rows = (name: RegExp) => Array.from(screen.getByRole('region', { name }).querySelectorAll('span.truncate.font-medium'))
  .map(each => each.textContent)
const menu = (name: string) => {
  fireEvent.keyDown(screen.getByRole('button', { name: `More for ${name}` }), { key: 'Enter' })
  return within(screen.getByRole('menu'))
}

it('shows the chats waiting on a review under Needs you, then the working ones, each with its step or source and folder', async () => {
  await open()
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Inbox')
  expect(screen.getByText('Computer online')).toBeTruthy()
  expect(rows(/Needs you/)).toEqual(['Weekly profit summary', 'Spring sale ads'])
  expect(part(/Needs you/).getByText('2')).toBeTruthy()
  expect(rows(/Working/)).toEqual(['Landing page check'])
  expect(part(/Needs you/).getByText('Plan · weekly-profit')).toBeTruthy()
  expect(part(/Working/).getByText('From a schedule · shop')).toBeTruthy()
  expect(screen.getByRole('region', { name: 'Archive' })).toBeTruthy()
})

it("opens a waiting chat's review page with a tap, and gives a page with no known chat no menu", async () => {
  await open()
  const link = part(/Needs you/).getByRole('link', { name: /Weekly profit summary/ })
  expect(link.getAttribute('href')).toBe(`/apps/inbox/?item=${PAGE}`)
  expect(screen.queryByRole('button', { name: 'More for Spring sale ads' })).toBeNull()
  await act(async () => { fireEvent.click(link) })
  expect(screen.getByTestId('where').textContent).toBe(`/apps/inbox/?item=${PAGE}`)
})

it('asks to close a chat, shows it as closing, and says when the ask did not go through', async () => {
  await open()
  const first = menu('Landing page check').getByRole('menuitem', { name: 'Close chat' })
  await act(async () => { fireEvent.click(first) })
  expect(calls.filter(call => call.route === 'chat-close')).toEqual([{ method: 'POST', route: 'chat-close', body: { agentId: 'a2' } }])
  expect(part(/Working/).getByText('Closing')).toBeTruthy()
  server.close = () => new Response(null, { status: 503 })
  const second = menu('Weekly profit summary').getByRole('menuitem', { name: 'Close chat' })
  await act(async () => { fireEvent.click(second) })
  expect(screen.getByRole('alert').textContent).toBe('That chat was not closed. Try again.')
})

it('says when no chat is open, and when the computer is off', async () => {
  server.chats = () => Response.json({ computerOnline: false, chats: [] })
  await open()
  expect(screen.getByText('No open chats. A chat you start shows here.')).toBeTruthy()
  expect(screen.getByText('Computer offline')).toBeTruthy()
  expect(screen.queryByRole('region', { name: /Needs you/ })).toBeNull()
})

it('offers Retry when the chats do not load, and opens Schedules from the top bar', async () => {
  const good = server.chats
  server.chats = () => new Response(null, { status: 503 })
  await open()
  expect(screen.getByText('Your chats could not be loaded.')).toBeTruthy()
  server.chats = good
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry' })) })
  expect(rows(/Working/)).toEqual(['Landing page check'])
  await act(async () => { fireEvent.click(screen.getByRole('link', { name: 'Schedules' })) })
  expect(screen.getByTestId('where').textContent).toBe('/apps/inbox/?view=schedules')
})

it('reads the chats again when the page comes back into view, and not while it is hidden', async () => {
  await open()
  const reads = () => calls.filter(each => each.route === 'chats').length
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
