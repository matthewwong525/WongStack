// The inbox page's test kit: a made-up inbox server and the moves a person makes on the page.
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, vi } from 'vitest'
import type { Item, Tap } from './api'
import { App } from './App'

// A made-up inbox server: the items it lists, whether the computer is in, and how it answers each call.
export const QUESTION = 'q'.repeat(32)
export const FIRST = 'a'.repeat(32)
export const SECOND = 'b'.repeat(32)
export const PLAN = 'c'.repeat(32)
export const DAYS = { detail: { text: 'Ship Friday or Monday?', options: ['Friday', 'Monday'] } }
// An item as the server sends it: a plan card's or an agent's body rides in `detail`.
type Wire = Omit<Item, 'detail' | 'start' | 'status'> & { detail: unknown }
const ACTIONS: Partial<Record<Item['kind'], string[]>> = { approval: ['approve', 'decline'], plan: ['build', 'publish'], start: ['go', 'skip'] }
export const item = (id: string, kind: Item['kind'], title: string, more: Partial<Wire> = {}): Wire => ({ id, kind, title, workspace: 'email',
  actions: ACTIONS[kind] ?? [], version: 'v1', createdAt: 1, closesAt: 2,
  detail: kind === 'approval' || kind === 'question' ? { text: `About ${title}` } : null, link: null, tap: null, ...more })
export const tapOf = (on: string, state: Tap['state'], more: Partial<Tap> = {}): Tap => ({ id: `t${on}`.slice(0, 32), item: on, action: 'approve', text: '', state, ...more })

type Server = { items: Wire[]; online: boolean; tap: (input: Record<string, string>) => Response; read: (id: string) => Response; cancel: () => Response }
export const server = {} as Server
export const calls: { path: string; body: Record<string, string> | null }[] = []
beforeEach(() => {
  localStorage.clear()
  Object.assign(server, { items: [], online: true, tap: (input: Record<string, string>) => Response.json({ tap: tapOf(input.item, 'waiting', input) }),
    read: (id: string) => Response.json({ tap: tapOf(id, 'sent') }), cancel: () => Response.json({ tap: tapOf(FIRST, 'cancelled') }) })
  calls.length = 0
  vi.stubGlobal('fetch', vi.fn(async (path: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(init.body as string) as Record<string, string> : null
    calls.push({ path, body })
    const route = path.replace('/apps/inbox/api/', '')
    if (route === 'items') return Response.json({ items: server.items, computerOnline: server.online })
    if (route === 'tap') return server.tap(body!)
    if (route.startsWith('tap?id=')) return server.read(route.slice(7))
    if (route === 'tap-cancel') return server.cancel()
    throw new Error(`Unexpected request: ${path}`)
  }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers() })

export const open = async () => {
  render(<MemoryRouter initialEntries={['/apps/inbox/']}><Routes><Route path="/apps/:name/*" element={<App />} /></Routes></MemoryRouter>)
  await screen.findByText(/^Computer (online|offline)$/)
}
/** The innermost card whose words hold `title`, folded or open. */
export const card = (title: string) => {
  const found = [...document.querySelectorAll<HTMLElement>('[data-slot="card"]')].filter(each => each.textContent!.includes(title))
  return found.find(each => !found.some(other => other !== each && each.contains(other)))!
}
export const press = async (name: string, within_: HTMLElement = document.body) => {
  await act(async () => { fireEvent.click(within(within_).getByRole('button', { name })) })
}
export const choose = async (name: string, title: string) => { await act(async () => { fireEvent.click(within(card(title)).getByRole('radio', { name })) }) }
export const send = (name = /^Send \d+ answers?$/) => act(async () => { fireEvent.click(screen.getByRole('button', { name })) })
export const key = (key: string, more: KeyboardEventInit = {}, on: Element = document.activeElement ?? document.body) =>
  act(async () => { fireEvent.keyDown(on, { key, ...more }) })
export const type = (label: string, title: string, value: string) => fireEvent.change(within(card(title)).getByLabelText(label), { target: { value } })
export const tick = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms) }) }
export const taps = () => calls.filter(call => call.path.endsWith('/tap')).map(call => call.body)
export const bar = () => screen.getByText(/ picked$/).textContent
export const outlined = () => [...document.querySelectorAll('[data-slot="card"].ring-2')].map(each => each.id)
