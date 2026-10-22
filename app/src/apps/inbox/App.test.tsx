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
const DAYS = { detail: { text: 'Ship Friday or Monday?', options: ['Friday', 'Monday'] } }
const item = (id: string, kind: Item['kind'], title: string, more: Partial<Item> = {}): Item => ({ id, kind, title, workspace: 'email',
  actions: kind === 'approval' ? ['approve', 'decline'] : kind === 'plan' ? ['build', 'publish'] : [], version: 'v1', createdAt: 1, closesAt: 2,
  detail: kind === 'plan' ? null : { text: `About ${title}` }, tap: null, ...more })
const tapOf = (on: string, state: Tap['state'], more: Partial<Tap> = {}): Tap => ({ id: `t${on}`.slice(0, 32), item: on, action: 'approve', text: '', state, ...more })

let server: { items: Item[]; online: boolean; tap: (input: Record<string, string>) => Response; read: (id: string) => Response; cancel: () => Response }
let calls: { path: string; body: Record<string, string> | null }[]
beforeEach(() => {
  localStorage.clear()
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
/** The card whose words hold `title`, folded or open. */
const card = (title: string) => [...document.querySelectorAll<HTMLElement>('[data-slot="card"]')].find(each => each.textContent!.includes(title))!
const press = async (name: string, within_: HTMLElement = document.body) => {
  await act(async () => { fireEvent.click(within(within_).getByRole('button', { name })) })
}
const choose = async (name: string, title: string) => { await act(async () => { fireEvent.click(within(card(title)).getByRole('radio', { name })) }) }
const send = (name = /^Send \d+ answers?$/) => act(async () => { fireEvent.click(screen.getByRole('button', { name })) })
const key = (key: string, more: KeyboardEventInit = {}, on: Element = document.activeElement ?? document.body) =>
  act(async () => { fireEvent.keyDown(on, { key, ...more }) })
const type = (label: string, title: string, value: string) => fireEvent.change(within(card(title)).getByLabelText(label), { target: { value } })
const tick = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms) }) }
const taps = () => calls.filter(call => call.path.endsWith('/tap')).map(call => call.body)
const bar = () => screen.getByText(/ picked$/).textContent
const outlined = () => [...document.querySelectorAll('[data-slot="card"].ring-2')].map(each => each.id)

it('groups what waits on the person, questions first, with the computer shown online', async () => {
  server.items = [item(PLAN, 'plan', 'One inbox', { workspace: 'lousy-dingo' }), item(FIRST, 'approval', 'Send the quote'),
    item(QUESTION, 'question', 'Which day?', DAYS)]
  await open()
  expect(screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent)).toEqual(['Needs you', 'Approvals', 'Plans to review'])
  expect(screen.getByText('Computer online').getAttribute('data-variant')).toBe('secondary')
  expect(within(card('One inbox')).getByRole('link', { name: 'Open plan' }).getAttribute('href')).toBe(`/apps/inbox/?item=${PLAN}`)
  expect(within(card('One inbox')).getByText('lousy-dingo')).toBeTruthy()
  // A decision says where it came from in small words, then asks, then offers its choices one per line with keys.
  expect(within(card('Send the quote')).getByText('Send the quote · email')).toBeTruthy()
  expect(within(card('Send the quote')).getByText('Risky')).toBeTruthy()
  expect(within(card('Send the quote')).getByRole('heading', { name: 'About Send the quote' })).toBeTruthy()
  const approval = within(card('Send the quote')).getByRole('radiogroup', { name: 'About Send the quote' })
  expect(within(approval).getAllByRole('radio').map(radio => [radio.textContent, radio.getAttribute('aria-checked')]))
    .toEqual([['1Approve', 'false'], ["2Don't approve", 'false']])
  expect(within(card('Which day?')).getAllByRole('radio').map(radio => radio.textContent)).toEqual(['1Friday', '2Monday', '3Your own answer'])
  expect(within(card('Which day?')).queryByText('Risky')).toBeNull()
  expect(bar()).toBe('0 of 2 picked')
  expect(screen.getByRole('button', { name: 'Send 0 answers' })).toHaveProperty('disabled', true)
  expect(screen.getByText(/pick and go on/).className).toContain('md:block')
  // On a phone nothing grows past the screen: the columns can shrink, and a long who-line truncates instead.
  const columns = [screen.getByRole('heading', { level: 1 }).parentElement!.parentElement!, ...document.querySelectorAll('section')]
  expect(columns.map(column => column.className.split(' ').includes('grid-cols-1'))).toEqual([true, true, true, true])
  expect(within(card('Send the quote')).getByText('Send the quote · email').className).toBe('min-w-0 truncate')
})

it('shows a question once when its title says the same, and a question with no words by its title', async () => {
  server.items = [item(QUESTION, 'question', 'Which day?', { detail: { text: 'Which day?' } }), item(SECOND, 'question', 'Anything else?', { detail: null, workspace: '' })]
  await open()
  expect(within(card('Which day?')).getAllByText(/Which day\?/)).toHaveLength(1)
  expect(within(card('Which day?')).getByText('email')).toBeTruthy()
  expect(within(card('Anything else?')).getByRole('heading', { name: 'Anything else?' })).toBeTruthy()
  expect(within(card('Anything else?')).getAllByText('Anything else?')).toHaveLength(1)
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
  expect(screen.queryByText(/ picked$/)).toBeNull()
  // With nothing to answer, the keys do nothing.
  await key('j')
  await key('Enter', { ctrlKey: true })
  expect(taps()).toEqual([])
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
  expect(screen.getByRole('heading', { name: 'About Send the quote' })).toBeTruthy()
  const hidden = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  await tick(REFRESH_MS)
  expect(reads()).toBe(2)
  hidden.mockReturnValue('visible')
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
  expect(reads()).toBe(3)
})

it('folds a picked card to its answer without sending, and Change opens it again', async () => {
  server.items = [item(QUESTION, 'question', 'Which day?', DAYS), item(FIRST, 'approval', 'Send the quote')]
  await open()
  await choose('Monday', 'Which day?')
  expect(taps()).toEqual([])
  expect(within(card('Which day?')).queryByRole('radiogroup')).toBeNull()
  expect(within(card('Which day?')).getByText('✓ Monday')).toBeTruthy()
  expect(bar()).toBe('1 of 2 picked')
  expect(screen.getByRole('button', { name: 'Send 1 answer' })).toHaveProperty('disabled', false)
  await press('Change', card('Which day?'))
  expect(document.activeElement).toBe(card('Which day?'))
  const monday = within(card('Which day?')).getByRole('radio', { name: 'Monday' })
  expect([monday.getAttribute('aria-checked'), monday.getAttribute('data-variant')]).toEqual(['true', 'default'])
  await choose("Don't approve", 'Send the quote')
  expect(within(card('Send the quote')).getByText("✓ Don't approve")).toBeTruthy()
  // The reopened card stays open until a new pick.
  expect(within(card('Which day?')).getByRole('radiogroup')).toBeTruthy()
  await choose('Friday', 'Which day?')
  expect(within(card('Which day?')).getByText('✓ Friday')).toBeTruthy()
  expect(bar()).toBe('2 of 2 picked')
})

it('takes words of the person own, folding them once Enter or Escape closes the field', async () => {
  server.items = [item(QUESTION, 'question', 'Which day?', DAYS)]
  await open()
  await choose('Your own answer', 'Which day?')
  const field = within(card('Which day?')).getByLabelText('Your answer')
  expect(document.activeElement).toBe(field)
  // Empty words are no answer: the card stays open.
  await key('Enter', {}, field)
  expect(bar()).toBe('0 of 1 picked')
  type('Your answer', 'Which day?', 'Ask Kim first')
  await key('Enter', { shiftKey: true }, field)
  await key('Enter', { isComposing: true }, field)
  expect(bar()).toBe('1 of 1 picked')
  expect(within(card('Which day?')).getByLabelText('Your answer')).toBeTruthy()
  await key('Enter', {}, field)
  expect(within(card('Which day?')).getByText('✓ Ask Kim first')).toBeTruthy()
  await press('Change', card('Which day?'))
  await key('Escape', {}, within(card('Which day?')).getByLabelText('Your answer'))
  expect(within(card('Which day?')).getByText('✓ Ask Kim first')).toBeTruthy()
  await send()
  expect(taps()).toEqual([{ item: QUESTION, action: 'send', version: 'v1', text: 'Ask Kim first' }])
})

it('adds a note that goes with the answer: after a question\'s words, or alone with an approval', async () => {
  server.items = [item(QUESTION, 'question', 'Which day?', DAYS), item(FIRST, 'approval', 'Send the quote'), item(SECOND, 'approval', 'Book the van')]
  await open()
  await press('+ Add a note', card('Which day?'))
  const note = within(card('Which day?')).getByLabelText('Note')
  expect([document.activeElement, note.getAttribute('maxlength')]).toEqual([note, '500'])
  type('Note', 'Which day?', 'Tell Kim')
  await key('Enter', {}, note)
  expect(within(card('Which day?')).getByText('Note: Tell Kim')).toBeTruthy()
  await choose('Monday', 'Which day?')
  await press('+ Add a note', card('Send the quote'))
  type('Note', 'Send the quote', '   ')
  await key('Escape', {}, within(card('Send the quote')).getByLabelText('Note'))
  expect(within(card('Send the quote')).getByRole('button', { name: '+ Add a note' })).toBeTruthy()
  await press('+ Add a note', card('Send the quote'))
  type('Note', 'Send the quote', 'Copy Jo in')
  await key('Escape', {}, within(card('Send the quote')).getByLabelText('Note'))
  await choose('Approve', 'Send the quote')
  await choose('Approve', 'Book the van')
  // N on a folded card opens its note, and the card folds again once the note closes.
  await act(async () => { card('Which day?').focus() })
  await key('n')
  expect(within(card('Which day?')).getByLabelText('Note')).toHaveProperty('value', 'Tell Kim')
  await key('Enter', {}, within(card('Which day?')).getByLabelText('Note'))
  expect(within(card('Which day?')).getByText('✓ Monday')).toBeTruthy()
  await press('Change', card('Which day?'))
  expect(within(card('Which day?')).getByRole('button', { name: 'Edit note' })).toBeTruthy()
  await send()
  expect(taps()).toEqual([{ item: QUESTION, action: 'send', version: 'v1', text: 'Monday\nTell Kim' },
    { item: FIRST, action: 'approve', version: 'v1', text: 'Copy Jo in' }, { item: SECOND, action: 'approve', version: 'v1', text: '' }])
})

it('sends only the picked decisions, one tap each, and keeps the rest for later', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  server.online = false
  server.items = [item(QUESTION, 'question', 'Which day?', DAYS), item(FIRST, 'approval', 'Send the quote', { version: 'q7' }),
    item(SECOND, 'approval', 'Book the van'), item(PLAN, 'plan', 'One inbox')]
  await open()
  await choose('Friday', 'Which day?')
  await choose('Approve', 'Send the quote')
  expect(bar()).toBe('2 of 3 picked')
  await send(/^Send 2 answers$/)
  expect(taps()).toEqual([{ item: QUESTION, action: 'send', version: 'v1', text: 'Friday' }, { item: FIRST, action: 'approve', version: 'q7', text: '' }])
  expect(within(card('Send the quote')).getByRole('status').textContent).toContain('Waiting for your computer')
  expect(within(card('Send the quote')).queryByRole('radio')).toBeNull()
  expect(within(card('Book the van')).getAllByRole('radio')).toHaveLength(2)
  expect(bar()).toBe('0 of 1 picked')
  expect(localStorage.getItem('inbox-decisions')).toBe('{}')
  server.items = [item(SECOND, 'approval', 'Book the van')]
  await tick(TAP_POLL_MS)
  expect(within(card('Send the quote')).getByRole('status').textContent).toBe('Sent')
  await tick(REFRESH_MS)
  expect(within(card('Send the quote')).getByRole('status').textContent).toBe('Sent')
})

it('keeps picks and notes through a reload, and drops them once the item is gone or changed', async () => {
  server.items = [item(QUESTION, 'question', 'Which day?', DAYS), item(FIRST, 'approval', 'Send the quote'), item(SECOND, 'approval', 'Book the van')]
  await open()
  await choose('Monday', 'Which day?')
  await press('+ Add a note', card('Send the quote'))
  type('Note', 'Send the quote', 'Copy Jo in')
  await choose('Approve', 'Book the van')
  cleanup()
  server.items = [item(QUESTION, 'question', 'Which day?', DAYS), item(FIRST, 'approval', 'Send the quote')]
  await open()
  expect(within(card('Which day?')).getByText('✓ Monday')).toBeTruthy()
  expect(within(card('Send the quote')).getByText('Note: Copy Jo in')).toBeTruthy()
  expect(Object.keys(JSON.parse(localStorage.getItem('inbox-decisions')!))).toEqual([`${QUESTION}:v1`, `${FIRST}:v1`])
  cleanup()
  server.items = [item(QUESTION, 'question', 'Which day?', { ...DAYS, version: 'v2' })]
  await open()
  expect(within(card('Which day?')).getByRole('radio', { name: 'Monday' }).getAttribute('aria-checked')).toBe('false')
  expect(localStorage.getItem('inbox-decisions')).toBe('{}')
})

it('starts clean when what the device kept is unreadable', async () => {
  localStorage.setItem('inbox-decisions', '{"x":{"pick":-1}}')
  server.items = [item(QUESTION, 'question', 'Which day?', DAYS)]
  await open()
  expect(bar()).toBe('0 of 1 picked')
  expect(localStorage.getItem('inbox-decisions')).toBe('{}')
})

it('works from the keys: move, pick and go on, note, clear and send, but never while the person types', async () => {
  server.items = [item(QUESTION, 'question', 'Which day?', DAYS), item(FIRST, 'approval', 'Send the quote'), item(SECOND, 'approval', 'Book the van'),
    item(PLAN, 'approval', 'Pay the bill', { tap: tapOf(PLAN, 'sent') })]
  await open()
  const [question, quote, van] = [card('Which day?').id, card('Send the quote').id, card('Book the van').id]
  expect(outlined()).toEqual([question])
  await key('j')
  expect([outlined(), document.activeElement?.id]).toEqual([[quote], quote])
  await key('ArrowDown')
  await key('ArrowDown')
  expect(outlined()).toEqual([van])
  await key('K')
  await key('ArrowUp')
  await key('ArrowUp')
  expect(outlined()).toEqual([question])
  for (const ignored of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }]) await key('j', ignored)
  await key('x')
  // Past the choices does nothing; 2 picks the second and goes on to the next card.
  await key('6')
  await key('2')
  expect([within(card('Which day?')).getByText('✓ Monday'), outlined()]).toEqual([expect.anything(), [quote]])
  await key('3')
  expect(outlined()).toEqual([quote])
  await key('n')
  const note = within(card('Send the quote')).getByLabelText('Note')
  expect(document.activeElement).toBe(note)
  for (const typed of ['j', '1', 'z']) await key(typed, {}, note)
  expect(outlined()).toEqual([quote])
  await key('Escape', {}, note)
  expect(document.activeElement?.id).toBe(quote)
  await key('1')
  expect(outlined()).toEqual([van])
  await key('1')
  await key('z')
  expect(within(card('Book the van')).getAllByRole('radio').map(radio => radio.getAttribute('aria-checked'))).toEqual(['false', 'false'])
  await key('k')
  expect(outlined()).toEqual([quote])
  await press('Change', card('Which day?'))
  await choose('Your own answer', 'Which day?')
  await key('Enter', { metaKey: true }, within(card('Which day?')).getByLabelText('Your answer'))
  expect(taps()).toEqual([{ item: FIRST, action: 'approve', version: 'v1', text: '' }])
  await act(async () => { card('Book the van').focus() })
  expect(outlined()).toEqual([van])
  await key('3')
  await key('Enter', { ctrlKey: true })
  expect(taps()).toHaveLength(1)
})

it('picks a question\'s own words by key, and numbers only the first six choices', async () => {
  const options = ['A', 'B', 'C', 'D', 'E', 'F']
  server.items = [item(QUESTION, 'question', 'Which day?', DAYS), item(SECOND, 'question', 'Which letter?', { detail: { text: 'Which?', options } })]
  await open()
  await key('3')
  expect(document.activeElement).toBe(within(card('Which day?')).getByLabelText('Your answer'))
  expect(within(card('Which letter?')).getAllByRole('radio').map(radio => radio.textContent)).toEqual([...options.map((letter, n) => `${n + 1}${letter}`), 'Your own answer'])
})

it('keeps waiting quietly when a look at the tap fails, and says Waiting while the computer is in', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  server.items = [item(FIRST, 'approval', 'Send the quote', { tap: tapOf(FIRST, 'waiting') })]
  server.read = () => Response.json({ error: { code: 'internal' } }, { status: 500 })
  await open()
  await tick(TAP_POLL_MS)
  expect(within(card('Send the quote')).getByRole('status').textContent).toContain('Waiting…')
  expect(screen.queryByText(/ picked$/)).toBeNull()
})

it('says why a tap was refused, and keeps the card open with its pick', async () => {
  server.items = [item(FIRST, 'approval', 'Send the quote')]
  const answers = [Response.json({ error: { code: 'done' } }, { status: 409 }), Response.json({ error: { code: 'changed' } }, { status: 409 }),
    Response.json({ error: { code: 'too_soon' } }, { status: 429 }), Response.json({ error: { code: 'closed' } }, { status: 410 }),
    Response.json({ error: { code: 'internal' } }, { status: 500 }), new Response('oops', { status: 502 })]
  server.tap = () => answers.shift()!
  await open()
  await choose('Approve', 'Send the quote')
  for (const said of ['That was already sent.', 'This changed since you opened it.', 'Wait a few seconds, then try again.', 'This has closed.', 'Your answer did not reach the inbox.',
    'Your answer did not reach the inbox.']) {
    await send()
    expect(within(card('Send the quote')).getByRole('alert').textContent).toContain(said)
    expect(within(card('Send the quote')).getByRole('radio', { name: 'Approve' }).getAttribute('aria-checked')).toBe('true')
  }
  server.tap = () => { throw new TypeError('offline') }
  await send()
  expect(within(card('Send the quote')).getByRole('alert').textContent).toContain('did not reach the inbox')
  server.tap = input => Response.json({ tap: tapOf(input.item, 'waiting', input) })
  await send()
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
  expect(within(card('Send the quote')).getByRole('radio', { name: 'Approve' })).toBeTruthy()
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
    item(SECOND, 'approval', 'Book the van', { tap: tapOf(SECOND, 'failed', { action: 'decline', text: 'Ask Kim' }) }),
    item(PLAN, 'approval', 'Pay the bill', { tap: tapOf(PLAN, 'expired') }),
    item(QUESTION, 'question', 'Which day?', { tap: tapOf(QUESTION, 'changed', { action: 'send', text: 'Friday' }) }),
    item('d'.repeat(32), 'plan', 'One inbox', { tap: tapOf(PLAN, 'changed', { action: 'build' }) }),
    item('e'.repeat(32), 'plan', 'Ship notes', { tap: tapOf('e'.repeat(32), 'failed', { action: 'build' }) }),
    item('f'.repeat(32), 'plan', 'Pick a name', { tap: tapOf('f'.repeat(32), 'sent', { action: 'send', text: 'Shorter' }) })]
  await open()
  expect(within(card('Ship notes')).getByLabelText('The message to copy')).toHaveProperty('value', 'Ship notes: Build')
  expect(within(card('Pick a name')).getByRole('status').textContent).toBe('Sent')
  expect(within(card('Send the quote')).getByText("Didn't arrive. Copy your answer into the chat.")).toBeTruthy()
  expect(within(card('Send the quote')).getByLabelText('The message to copy')).toHaveProperty('value', 'Send the quote: Approve')
  expect(within(card('Book the van')).getByLabelText('The message to copy')).toHaveProperty('value', "Book the van: Don't approve\nAsk Kim")
  expect(within(card('Pay the bill')).getByRole('status').textContent).toMatch(/^This closed before your computer picked it up/)
  expect(within(card('Which day?')).getByRole('status').textContent).toContain('This plan changed.')
  // A plan opens its new version from Open plan, so its row says nothing more.
  expect(within(card('One inbox')).queryByRole('status')).toBeNull()
  server.items = [item(QUESTION, 'question', 'Which day?')]
  await press('Reload', card('Which day?'))
  await waitFor(() => expect(card('Send the quote')).toBeUndefined())
  expect(within(card('Which day?')).queryByRole('status')).toBeNull()
})

it('forgets an answer given here once Reload asks for the inbox again', async () => {
  server.items = [item(FIRST, 'approval', 'Send the quote')]
  server.tap = input => Response.json({ tap: tapOf(input.item, 'changed', input) })
  await open()
  await choose('Approve', 'Send the quote')
  await send()
  expect(within(card('Send the quote')).getByRole('status').textContent).toContain('This plan changed.')
  await press('Reload', card('Send the quote'))
  await waitFor(() => expect(within(card('Send the quote')).queryByRole('status')).toBeNull())
})
