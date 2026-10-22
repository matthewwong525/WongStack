// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Item, Tap } from './api'
import { routes } from '../../router'
import { App } from './App'
import { REFRESH_MS } from './List'
import { TAP_POLL_MS } from './TapLine'

// A made-up inbox server: the items it lists, whether the computer is in, and how it answers each call.
const QUESTION = 'q'.repeat(32)
const FIRST = 'a'.repeat(32)
const SECOND = 'b'.repeat(32)
const PLAN = 'c'.repeat(32)
const item = (id: string, kind: Item['kind'], title: string, more: Partial<Item> = {}): Item => ({ id, kind, title, workspace: 'email',
  actions: kind === 'approval' ? ['approve', 'decline'] : kind === 'plan' ? ['build', 'publish'] : [], version: 'v1', createdAt: 1, closesAt: 2,
  detail: kind === 'plan' ? null : { text: `About ${title}` }, tap: null, ...more })
const tapOf = (on: string, state: Tap['state'], more: Partial<Tap> = {}): Tap => ({ id: `t${on}`.slice(0, 32), item: on, action: 'approve', text: '', state, ...more })

let server: { items: Item[]; online: boolean; tap: (input: Record<string, string>) => Response; read: (id: string) => Response; cancel: () => Response }
let calls: { path: string; body: Record<string, string> | null }[]
beforeEach(() => {
  server = { items: [], online: true, tap: input => Response.json({ tap: tapOf(input.item, 'waiting', input) }),
    read: id => Response.json({ tap: tapOf(id, 'sent') }), cancel: () => Response.json({ tap: tapOf(FIRST, 'cancelled') }) }
  calls = []
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

const open = async () => {
  render(<MemoryRouter initialEntries={['/apps/inbox/']}><Routes><Route path="/apps/:name/*" element={<App />} /></Routes></MemoryRouter>)
  await screen.findByText(/^Computer (online|offline)$/)
}
const card = (title: string) => screen.getByRole('heading', { name: title }).closest<HTMLElement>('[data-slot="card"]')!
const press = async (name: string, within_: HTMLElement = document.body) => {
  await act(async () => { fireEvent.click(within(within_).getByRole('button', { name })) })
}
const tick = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms) }) }
const taps = () => calls.filter(call => call.path.endsWith('/tap')).map(call => call.body)

it('groups what waits on the person, questions first, with the computer shown online', async () => {
  server.items = [item(PLAN, 'plan', 'One inbox', { workspace: 'lousy-dingo' }), item(FIRST, 'approval', 'Send the quote'),
    item(QUESTION, 'question', 'Which day?', { detail: { text: 'Ship Friday or Monday?', options: ['Friday', 'Monday'] } })]
  await open()
  expect(screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent)).toEqual(['Needs you', 'Approvals', 'Plans to review'])
  expect(screen.getByText('Computer online').getAttribute('data-variant')).toBe('secondary')
  expect(within(card('One inbox')).getByRole('link', { name: 'Open plan' }).getAttribute('href')).toBe(`/apps/inbox/?item=${PLAN}`)
  expect(within(card('One inbox')).getByText('lousy-dingo')).toBeTruthy()
  expect(within(card('Send the quote')).getAllByRole('button').map(button => [button.textContent, button.getAttribute('data-variant')]))
    .toEqual([['Approve', 'default'], ['Decline', 'ghost']])
  expect(within(card('Which day?')).getAllByRole('button').map(button => [button.textContent, button.getAttribute('data-variant')]))
    .toEqual([['Friday', 'default'], ['Monday', 'outline'], ['Send', 'outline']])
  // One approval needs no Approve all.
  expect(screen.queryByRole('button', { name: 'Approve all' })).toBeNull()
})

it('opens at its own address, inside the page frame', async () => {
  const inbox = vi.mocked(fetch)
  vi.stubGlobal('fetch', vi.fn(async (path: string, init?: RequestInit) => path === '/api/access/apps'
    ? Response.json({ state: 'current', role: 'employee', revision: 1, apps: ['inbox'] }) : inbox(path, init)))
  await act(async () => { render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/apps/inbox/'] })} />) })
  await screen.findByText('Computer online')
  expect(screen.getByRole('heading', { level: 1, name: 'Inbox' }).closest('main')).not.toBeNull()
})

it('says nothing is waiting and how items arrive, and says the computer is offline in words', async () => {
  server.online = false
  await open()
  expect(screen.getByText('Nothing is waiting on you.')).toBeTruthy()
  expect(screen.getByText(/show up here while your computer is signed in/)).toBeTruthy()
  expect(screen.getByText('Computer offline').getAttribute('data-variant')).toBe('destructive')
  expect(screen.queryByRole('heading', { level: 2 })).toBeNull()
})

it('shows grey blocks while it loads, and offers Retry when the inbox is unavailable', async () => {
  let fail = true
  const items = vi.fn(async () => fail ? Response.json({ error: { code: 'internal' } }, { status: 500 }) : Response.json({ items: [], computerOnline: true }))
  vi.stubGlobal('fetch', items)
  render(<MemoryRouter initialEntries={['/apps/inbox/']}><Routes><Route path="/apps/:name/*" element={<App />} /></Routes></MemoryRouter>)
  expect(screen.getByRole('status').textContent).toBe('Loading your inbox…')
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'The inbox is unavailable.')
  fail = false
  await press('Retry')
  expect(await screen.findByText('Nothing is waiting on you.')).toBeTruthy()
})

it('looks again every 15 seconds while the page is visible, and at once when it comes back', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  await open()
  const reads = () => calls.filter(call => call.path.endsWith('/items')).length
  expect(reads()).toBe(1)
  server.items = [item(FIRST, 'approval', 'Send the quote')]
  await tick(REFRESH_MS)
  expect(reads()).toBe(2)
  expect(screen.getByRole('heading', { name: 'Send the quote' })).toBeTruthy()
  const hidden = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  await tick(REFRESH_MS)
  expect(reads()).toBe(2)
  hidden.mockReturnValue('visible')
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(reads()).toBe(3)
})

it('approves with the version seen, waits for the computer, then says Sent even once the approval has closed', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  server.online = false
  server.items = [item(FIRST, 'approval', 'Send the quote', { version: 'q7' })]
  await open()
  await press('Approve', card('Send the quote'))
  expect(taps()).toEqual([{ item: FIRST, action: 'approve', version: 'q7', text: '' }])
  expect(within(card('Send the quote')).getByRole('status').textContent).toContain('Waiting for your computer')
  expect(within(card('Send the quote')).queryByRole('button', { name: 'Approve' })).toBeNull()
  server.items = []
  await tick(TAP_POLL_MS)
  expect(within(card('Send the quote')).getByRole('status').textContent).toBe('Sent')
  await tick(REFRESH_MS)
  expect(within(card('Send the quote')).getByRole('status').textContent).toBe('Sent')
})

it('keeps waiting quietly when a look at the tap fails, and says Waiting while the computer is in', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  server.items = [item(FIRST, 'approval', 'Send the quote', { tap: tapOf(FIRST, 'waiting') })]
  server.read = () => Response.json({ error: { code: 'internal' } }, { status: 500 })
  await open()
  await tick(TAP_POLL_MS)
  expect(within(card('Send the quote')).getByRole('status').textContent).toContain('Waiting…')
})

it('declines, and answers a question with an option or its own words', async () => {
  server.items = [item(FIRST, 'approval', 'Send the quote'),
    item(QUESTION, 'question', 'Which day?', { detail: { text: 'Ship Friday or Monday?', options: ['Friday', 'Monday'] } }),
    item(SECOND, 'question', 'Anything else?')]
  await open()
  await press('Decline', card('Send the quote'))
  await press('Monday', card('Which day?'))
  const send = within(card('Anything else?')).getByRole('button', { name: 'Send' })
  expect(send).toHaveProperty('disabled', true)
  fireEvent.change(within(card('Anything else?')).getByLabelText('Your answer'), { target: { value: 'Ask Kim first' } })
  await press('Send', card('Anything else?'))
  expect(taps().map(tap => [tap!.item, tap!.action, tap!.text])).toEqual([[FIRST, 'decline', ''], [QUESTION, 'send', 'Monday'], [SECOND, 'send', 'Ask Kim first']])
})

it('says why a tap was refused, and keeps the answer buttons', async () => {
  server.items = [item(FIRST, 'approval', 'Send the quote')]
  const answers = [Response.json({ error: { code: 'done' } }, { status: 409 }), Response.json({ error: { code: 'changed' } }, { status: 409 }),
    Response.json({ error: { code: 'too_soon' } }, { status: 429 }), Response.json({ error: { code: 'closed' } }, { status: 410 }),
    Response.json({ error: { code: 'internal' } }, { status: 500 }), new Response('oops', { status: 502 })]
  server.tap = () => answers.shift()!
  await open()
  for (const said of ['That was already sent.', 'This changed since you opened it.', 'Wait a few seconds, then try again.', 'This has closed.', 'Your answer did not reach the inbox.',
    'Your answer did not reach the inbox.']) {
    await press('Approve', card('Send the quote'))
    expect(within(card('Send the quote')).getByRole('alert').textContent).toContain(said)
  }
  server.tap = () => { throw new TypeError('offline') }
  await press('Approve', card('Send the quote'))
  expect(within(card('Send the quote')).getByRole('alert').textContent).toContain('did not reach the inbox')
  server.tap = input => Response.json({ tap: tapOf(input.item, 'waiting', input) })
  await press('Approve', card('Send the quote'))
  expect(within(card('Send the quote')).queryByRole('alert')).toBeNull()
})

it('cancels a waiting tap, and says when Cancel did not go through', async () => {
  server.items = [item(FIRST, 'approval', 'Send the quote', { tap: tapOf(FIRST, 'waiting') })]
  server.cancel = () => Response.json({ error: { code: 'not_waiting' } }, { status: 409 })
  await open()
  await press('Cancel', card('Send the quote'))
  expect(within(card('Send the quote')).getByRole('alert').textContent).toBe('Cancel did not go through. Try again.')
  server.cancel = () => Response.json({ tap: tapOf(FIRST, 'cancelled') })
  await press('Cancel', card('Send the quote'))
  expect(within(card('Send the quote')).getByRole('status').textContent).toBe('Cancelled. Nothing was sent.')
  // A cancelled answer can be given again.
  expect(within(card('Send the quote')).getByRole('button', { name: 'Approve' })).toBeTruthy()
})

it('says Sending once the computer has taken a tap, with no Cancel, and keeps asking until it lands', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  server.items = [item(FIRST, 'approval', 'Send the quote', { tap: tapOf(FIRST, 'delivering') })]
  await open()
  expect(within(card('Send the quote')).getByRole('status').textContent).toBe('Sending…')
  expect(within(card('Send the quote')).queryByRole('button', { name: 'Cancel' })).toBeNull()
  await tick(TAP_POLL_MS)
  expect(within(card('Send the quote')).getByRole('status').textContent).toBe('Sent')
})

it('reads the whole of a long answer that did not arrive, so the words to copy are all there', async () => {
  const words = `${'Ask Kim first. '.repeat(30)}Then send it.`
  server.items = [item(QUESTION, 'question', 'Which day?', { tap: tapOf(QUESTION, 'failed', { action: 'send', text: words.slice(0, 200) }) }),
    item(SECOND, 'question', 'Anything else?', { tap: tapOf(SECOND, 'failed', { action: 'send', text: 'x'.repeat(200) }) })]
  server.read = id => id === tapOf(QUESTION, 'failed').id ? Response.json({ tap: tapOf(QUESTION, 'failed', { action: 'send', text: words }) })
    : Response.json({ error: { code: 'internal' } }, { status: 500 })
  await open()
  await waitFor(() => expect(within(card('Which day?')).getByLabelText('The message to copy')).toHaveProperty('value', `Which day?: ${words}`))
  expect(within(card('Anything else?')).getByLabelText('The message to copy')).toHaveProperty('value', `Anything else?: ${'x'.repeat(200)}`)
})

it("says an answer didn't arrive with the words to copy, and when it never left or the plan changed", async () => {
  server.items = [item(FIRST, 'approval', 'Send the quote', { tap: tapOf(FIRST, 'failed') }),
    item(SECOND, 'approval', 'Book the van', { tap: tapOf(SECOND, 'expired') }),
    item(QUESTION, 'question', 'Which day?', { tap: tapOf(QUESTION, 'changed', { action: 'send', text: 'Friday' }) }),
    item(PLAN, 'plan', 'One inbox', { tap: tapOf(PLAN, 'changed', { action: 'build' }) })]
  await open()
  expect(within(card('Send the quote')).getByText("Didn't arrive. Copy your answer into the chat.")).toBeTruthy()
  expect(within(card('Send the quote')).getByLabelText('The message to copy')).toHaveProperty('value', 'Send the quote: Approve')
  expect(within(card('Book the van')).getByRole('status').textContent).toMatch(/^This closed before your computer picked it up/)
  expect(within(card('Which day?')).getByRole('status').textContent).toContain('This plan changed.')
  // A plan opens its new version from Open plan, so its row says nothing more.
  expect(within(card('One inbox')).queryByRole('status')).toBeNull()
  server.items = [item(QUESTION, 'question', 'Which day?')]
  await press('Reload', card('Which day?'))
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Send the quote' })).toBeNull())
  expect(within(card('Which day?')).queryByRole('status')).toBeNull()
})

it('forgets an answer given here once Reload asks for the inbox again', async () => {
  server.items = [item(FIRST, 'approval', 'Send the quote')]
  server.tap = input => Response.json({ tap: tapOf(input.item, 'changed', input) })
  await open()
  await press('Approve', card('Send the quote'))
  expect(within(card('Send the quote')).getByRole('status').textContent).toContain('This plan changed.')
  await press('Reload', card('Send the quote'))
  await waitFor(() => expect(within(card('Send the quote')).queryByRole('status')).toBeNull())
})

it('approves all open approvals, one tap each, only after the person confirms', async () => {
  server.items = [item(FIRST, 'approval', 'Send the quote'), item(SECOND, 'approval', 'Book the van'),
    item(PLAN, 'approval', 'Pay the bill', { tap: tapOf(PLAN, 'sent') })]
  await open()
  await press('Approve all')
  const dialog = screen.getByRole('alertdialog', { name: 'Approve all 2?' })
  expect(within(dialog).getAllByRole('listitem').map(entry => entry.textContent)).toEqual(['Send the quote', 'Book the van'])
  await press('Cancel', dialog)
  expect(taps()).toEqual([])
  await press('Approve all')
  await press('Approve all', screen.getByRole('alertdialog'))
  expect(taps().map(tap => [tap!.item, tap!.action])).toEqual([[FIRST, 'approve'], [SECOND, 'approve']])
})
