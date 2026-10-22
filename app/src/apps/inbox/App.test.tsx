// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from 'react-router'
import { expect, it, vi } from 'vitest'
import { routes } from '../../router'
import { App } from './App'
import { bar, calls, card, choose, DAYS, FIRST, item, key, open, outlined, PLAN, press, QUESTION, SECOND, send, server, taps, tapOf, tick, type } from './App.test.kit'
import { REFRESH_MS } from './List'
import { TAP_POLL_MS } from './TapLine'
it('groups what waits on the person, questions first, with the computer shown online', async () => {
  server.items = [item(PLAN, 'plan', 'One inbox', { workspace: 'lousy-dingo' }), item(FIRST, 'approval', 'Send the quote'),
    item(QUESTION, 'question', 'Which day?', DAYS)]
  await open()
  expect(screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent)).toEqual(['Needs you'])
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
  expect(within(card('Which day?')).getAllByRole('radio').map(radio => radio.textContent)).toEqual(['1Friday', '2Monday'])
  for (const title of ['Which day?', 'Send the quote']) expect(within(card(title)).getByPlaceholderText('Or type your own answer')).toBeTruthy()
  expect(within(card('Which day?')).queryByText('Risky')).toBeNull()
  type('Your own answer', 'Which day?', 'Tuesday'); type('Your own answer', 'Which day?', ' ')
  expect([bar(), screen.getByRole('button', { name: 'Send 0 answers' }).hasAttribute('disabled')]).toEqual(['0 of 2 picked', true])
  expect(screen.getByText(/pick and go on/).className).toContain('md:block')
  // On a phone nothing grows past the screen: the columns can shrink, and a long who-line wraps, never cut off.
  const columns = [screen.getByRole('heading', { level: 1 }).parentElement!.parentElement!, ...document.querySelectorAll('section')]
  expect(columns.map(column => column.className.split(' ').includes('grid-cols-1'))).toEqual([true, true])
  const who = within(card('Send the quote')).getByText('Send the quote · email')
  expect(who.className).toBe('wrap-anywhere')
  expect(who.parentElement!.className.split(' ')).toContain('min-w-0')
  expect(who.parentElement!.className).not.toMatch(/truncate|flex/)
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
  expect(within(card('Which day?')).getByRole('radio', { name: 'Monday' }).getAttribute('aria-checked')).toBe('true')
  await choose("Don't approve", 'Send the quote')
  // A folded card keeps its answer to one line; the who-line beside it wraps.
  expect(within(card('Send the quote')).getByText("✓ Don't approve").className).toContain('truncate')
  expect(within(card('Send the quote')).getByText('Send the quote · email').className).toBe('wrap-anywhere')
  // The reopened card stays open until a new pick.
  expect(within(card('Which day?')).getByRole('radiogroup')).toBeTruthy()
  await choose('Friday', 'Which day?')
  expect(within(card('Which day?')).getByText('✓ Friday')).toBeTruthy()
  expect(bar()).toBe('2 of 2 picked')
})

it('takes the person own words in one box, folding them once Enter or Escape closes it', async () => {
  server.items = [item(QUESTION, 'question', 'Which day?', DAYS)]
  await open()
  const field = within(card('Which day?')).getByPlaceholderText('Or type your own answer')
  // Empty words are no answer: the card stays open.
  await key('Enter', {}, field)
  expect(bar()).toBe('0 of 1 picked')
  type('Your own answer', 'Which day?', 'Ask Kim first')
  await key('Enter', { shiftKey: true }, field)
  await key('Enter', { isComposing: true }, field)
  expect(bar()).toBe('1 of 1 picked')
  expect(within(card('Which day?')).getByLabelText('Your own answer')).toBeTruthy()
  await key('Enter', {}, field)
  expect(within(card('Which day?')).getByText('✓ Ask Kim first')).toBeTruthy()
  await press('Change', card('Which day?'))
  await key('Escape', {}, within(card('Which day?')).getByLabelText('Your own answer'))
  expect(within(card('Which day?')).getByText('✓ Ask Kim first')).toBeTruthy()
  await send()
  expect(taps()).toEqual([{ item: QUESTION, action: 'send', version: 'v1', text: 'Ask Kim first' }])
})

it('sends only the words once typed after a pick, and only the choice once picked after words, on an approval too', async () => {
  server.items = [item(QUESTION, 'question', 'Which day?', DAYS), item(FIRST, 'approval', 'Send the quote'), item(SECOND, 'approval', 'Book the van')]
  await open()
  await choose('Monday', 'Which day?')
  await press('Change', card('Which day?'))
  type('Your own answer', 'Which day?', 'Tuesday, once Kim is back')
  expect(within(card('Which day?')).getByRole('radio', { name: 'Monday' }).getAttribute('aria-checked')).toBe('false')
  await choose('Approve', 'Send the quote')
  await press('Change', card('Send the quote'))
  type('Your own answer', 'Send the quote', 'Only once Jo has checked it')
  type('Your own answer', 'Book the van', 'Wait')
  await choose('Approve', 'Book the van')
  expect(within(card('Book the van')).getByText('✓ Approve')).toBeTruthy()
  await send()
  expect(taps()).toEqual([{ item: QUESTION, action: 'send', version: 'v1', text: 'Tuesday, once Kim is back' },
    { item: FIRST, action: 'send', version: 'v1', text: 'Only once Jo has checked it' }, { item: SECOND, action: 'approve', version: 'v1', text: '' }])
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

it('keeps picks and words through a reload, and drops them once the item is gone or changed', async () => {
  server.items = [item(QUESTION, 'question', 'Which day?', DAYS), item(FIRST, 'approval', 'Send the quote'), item(SECOND, 'approval', 'Book the van')]
  await open()
  await choose('Monday', 'Which day?')
  type('Your own answer', 'Send the quote', 'Copy Jo in')
  await choose('Approve', 'Book the van')
  cleanup()
  server.items = [item(QUESTION, 'question', 'Which day?', DAYS), item(FIRST, 'approval', 'Send the quote')]
  await open()
  expect(within(card('Which day?')).getByText('✓ Monday')).toBeTruthy()
  expect(within(card('Send the quote')).getByText('✓ Copy Jo in')).toBeTruthy()
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

it('reads a pick an older page kept with a note, and drops the note', async () => {
  localStorage.setItem('inbox-decisions', JSON.stringify({ [`${QUESTION}:v1`]: { pick: 1, note: 'Tell Kim' } }))
  server.items = [item(QUESTION, 'question', 'Which day?', DAYS)]
  await open()
  expect(within(card('Which day?')).getByText('✓ Monday')).toBeTruthy()
  await send()
  expect(taps()).toEqual([{ item: QUESTION, action: 'send', version: 'v1', text: 'Monday' }])
})

it('works from the keys: move, pick and go on, type, clear and send, but never while the person types', async () => {
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
  const words = within(card('Send the quote')).getByLabelText('Your own answer')
  expect(document.activeElement).toBe(words)
  for (const typed of ['j', '1', 'z']) await key(typed, {}, words)
  expect(outlined()).toEqual([quote])
  await key('Escape', {}, words)
  expect(document.activeElement?.id).toBe(quote)
  await key('1')
  expect(outlined()).toEqual([van])
  await key('1')
  await key('z')
  expect(within(card('Book the van')).getAllByRole('radio').map(radio => radio.getAttribute('aria-checked'))).toEqual(['false', 'false'])
  await key('k')
  expect(outlined()).toEqual([quote])
  // N opens a folded card at its own-answer box, and Ctrl/⌘ Enter sends from inside it.
  await act(async () => { card('Which day?').focus() })
  await key('n')
  const box = within(card('Which day?')).getByLabelText('Your own answer')
  expect(document.activeElement).toBe(box)
  await key('Enter', { metaKey: true }, box)
  expect(taps()).toEqual([{ item: QUESTION, action: 'send', version: 'v1', text: 'Monday' }, { item: FIRST, action: 'approve', version: 'v1', text: '' }])
  await act(async () => { card('Book the van').focus() })
  expect(outlined()).toEqual([van])
  await key('3')
  await key('Enter', { ctrlKey: true })
  expect(taps()).toHaveLength(2)
})

it('numbers only the first six choices', async () => {
  const options = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
  server.items = [item(SECOND, 'question', 'Which letter?', { detail: { text: 'Which?', options } })]
  await open()
  expect(within(card('Which letter?')).getAllByRole('radio').map(radio => radio.textContent)).toEqual([...options.slice(0, 6).map((letter, n) => `${n + 1}${letter}`), 'G'])
})

it('lists a private link under Needs you after the questions, opening it in a new tab, never as a decision', async () => {
  const closes = Date.UTC(2026, 9, 22, 17, 30)
  const at = new Date(closes).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
  const LOGIN = 'https://quiet-fox-lamp.trycloudflare.com/#key=abc&site=example.com'
  server.items = [item(FIRST, 'link', 'Save your example.com login', { closesAt: closes, link: { what: 'login', url: LOGIN } }),
    item(QUESTION, 'question', 'Which day?', DAYS), item(SECOND, 'link', 'Help the browser past a check', { closesAt: closes, workspace: '', link: { what: 'view', url: LOGIN } })]
  await open()
  expect(screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent)).toEqual(['Needs you'])
  // Each chat's card is titled by its workspace; a chat with none shows only its item's own title, once.
  expect([...document.querySelectorAll('[data-slot="card"] h3')].map(heading => heading.textContent)).toEqual(['email', 'Ship Friday or Monday?',
    'Save your example.com login', 'Help the browser past a check'])
  expect(within(card('Save your example.com login')).getByText(`Login · Closes ${at} · email`)).toBeTruthy()
  expect(within(card('Help the browser')).getByText(`Live view · Closes ${at}`)).toBeTruthy()
  const link = within(card('Save your example.com login')).getByRole('link', { name: 'Open' })
  expect([link.getAttribute('href'), link.getAttribute('target'), link.getAttribute('rel')]).toEqual([LOGIN, '_blank', 'noopener noreferrer'])
  expect(within(card('Save your example.com login')).queryByRole('radio')).toBeNull()
  expect(bar()).toBe('0 of 1 picked')
  await key('j')
  expect(outlined()).toEqual([card('Which day?').id])
})

it('turns web addresses in a decision into new-tab links that pick nothing, and picks a row by click, Enter or Space', async () => {
  const words = 'Compare https://a.example/q?x=1&y=2. Then pick (see https://b.example/doc).'
  server.items = [item(QUESTION, 'question', 'Which quote?', { detail: { text: words, options: ['Use https://a.example/q', 'javascript:alert(1)', 'Plain'] } })]
  await open()
  const heading = within(card('Which quote?')).getByRole('heading', { level: 3 })
  expect(heading.textContent).toBe(words)
  expect(within(heading).getAllByRole('link').map(link => [link.getAttribute('href'), link.getAttribute('target'), link.getAttribute('rel')]))
    .toEqual([['https://a.example/q?x=1&y=2', '_blank', 'noopener noreferrer'], ['https://b.example/doc', '_blank', 'noopener noreferrer']])
  const rows = () => within(card('Which quote?')).getAllByRole('radio')
  expect([1, 2].map(n => within(rows()[n]).queryByRole('link'))).toEqual([null, null])
  // The test page can't open a tab: the link's own click still runs, and the row under it hears nothing.
  document.addEventListener('click', event => event.preventDefault(), { once: true, capture: true })
  await act(async () => { fireEvent.click(within(rows()[0]).getByRole('link')) })
  await key('Enter', {}, within(rows()[0]).getByRole('link'))
  await key('x', {}, rows()[0])
  expect(rows().map(row => row.getAttribute('aria-checked'))).toEqual(['false', 'false', 'false'])
  expect(rows()[0].tabIndex).toBe(0)
  await key('Enter', {}, rows()[0])
  expect(within(card('Which quote?')).getByText('✓ Use https://a.example/q')).toBeTruthy()
  await press('Change', card('Which quote?'))
  expect(rows().map(row => row.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false'])
  await key(' ', {}, rows()[2])
  await press('Change', card('Which quote?'))
  expect(rows().map(row => row.getAttribute('aria-checked'))).toEqual(['false', 'false', 'true'])
  await act(async () => { fireEvent.click(rows()[1]) })
  expect(within(card('Which quote?')).getByText('✓ javascript:alert(1)')).toBeTruthy()
})

it('ticks several answers on a tick-several question, sending the ticks, then the words, as one answer', async () => {
  const tools = (text: string) => ({ detail: { text, options: ['Email', 'Calendar', 'Files'], multi: true } })
  server.items = [item(QUESTION, 'question', 'Tools', tools('Which tools?')), item(SECOND, 'question', 'Others', tools('Which others?')), item(FIRST, 'question', 'More', tools('Which more?'))]
  await open()
  const ticked = (title: string) => within(card(title)).getAllByRole('checkbox').map(box => box.getAttribute('aria-checked'))
  await act(async () => { fireEvent.click(within(card('Which tools?')).getByRole('checkbox', { name: 'Files' })) })
  await act(async () => { fireEvent.click(within(card('Which tools?')).getByText('Email')) })
  type('Your own answer', 'Which tools?', 'And Slack')
  expect(ticked('Which tools?')).toEqual(['true', 'false', 'true'])
  type('Your own answer', 'Which others?', 'None of these')
  expect(ticked('Which others?')).toEqual(['false', 'false', 'false'])
  // A key ticks or unticks, and stays on the card; nothing ticked or typed is no answer.
  await act(async () => { card('Which more?').focus() })
  await key('2')
  expect([ticked('Which more?'), bar()]).toEqual([['false', 'true', 'false'], '3 of 3 picked'])
  await key('2')
  expect([ticked('Which more?'), bar(), outlined()]).toEqual([['false', 'false', 'false'], '2 of 3 picked', [card('Which more?').id]])
  await send()
  expect(taps()).toEqual([{ item: QUESTION, action: 'send', version: 'v1', text: 'Email\nFiles\nAnd Slack' },
    { item: SECOND, action: 'send', version: 'v1', text: 'None of these' }])
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
