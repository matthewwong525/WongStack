// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Tap } from './api'
import { App } from './App'
import { REFRESH_MS } from './List'
import { TAP_POLL_MS } from './TapLine'

const PLAN = 'c'.repeat(32)
const BODY = '<!doctype html><title>One inbox</title><body data-change="inbox-mini-app"><p>The plan</p>'
const NOTES = 'wong-review3:inbox-mini-app'
const plan = (version = 'v1', tap: Tap | null = null) => ({ id: PLAN, kind: 'plan', title: 'One inbox', workspace: 'lousy-dingo',
  actions: ['build', 'publish'], version, createdAt: 1, closesAt: 2, detail: null, tap, body: BODY })
const waiting: Tap = { id: 't'.repeat(32), item: PLAN, action: 'build', text: '', state: 'waiting' }

let answer: () => Response
let tapAnswer: () => Response
let tapState: Tap['state']
let online: boolean | null
let calls: { path: string; body: unknown }[]
// The frame's window as the inbox sees it: jsdom loads each frame once, and that load greets this stand-in.
let frameWindow: { postMessage: ReturnType<typeof vi.fn> }
beforeEach(() => {
  frameWindow = { postMessage: vi.fn() }
  vi.spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get').mockReturnValue(frameWindow as unknown as Window)
  answer = () => Response.json({ item: plan(), computerOnline: false })
  tapAnswer = () => Response.json({ tap: waiting })
  tapState = 'sent'
  online = false
  calls = []
  localStorage.clear()
  vi.stubGlobal('fetch', vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, body: init?.body ? JSON.parse(init.body as string) : null })
    if (path.startsWith('/apps/inbox/api/item?')) return answer()
    if (path === '/apps/inbox/api/tap') return tapAnswer()
    if (path === '/apps/inbox/api/items') return online === null ? new Response(null, { status: 503 }) : Response.json({ items: [], computerOnline: online })
    return Response.json({ tap: { ...waiting, state: tapState } })
  }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); document.documentElement.className = '' })

/** Waits, a few milliseconds at a time, for what an answer from the inbox's own calls brings. */
const until = async (check: () => boolean) => {
  for (let i = 0; i < 200 && !check(); i++) await act(async () => { await new Promise(done => setTimeout(done, 5)) })
}
/** The port the frame's first load was handed. */
const greeted = async () => {
  await until(() => frameWindow.postMessage.mock.calls.length > 0)
  return (frameWindow.postMessage.mock.calls[0][2] as MessagePort[])[0]
}

// Opens the plan and loads its frame. `say` speaks as the page on the port it was handed; `heard` is every answer.
const open = async () => {
  render(<MemoryRouter initialEntries={[`/apps/inbox/?item=${PLAN}`]}><Routes><Route path="/apps/:name/*" element={<App />} /></Routes></MemoryRouter>)
  const frame = await screen.findByTitle<HTMLIFrameElement>('One inbox')
  const port = await greeted()
  const posted = frameWindow.postMessage
  const heard: unknown[] = []
  let marked: (() => void) | null = null
  port.onmessage = event => { heard.push(event.data); if ((event.data as { type: string }).type === 'inbox:notes') marked?.() }
  // Messages on one port arrive in order: the answer to a later notes read shows each was handled or ignored.
  const settled = async () => {
    await new Promise<void>(resolve => { marked = resolve; port.postMessage({ type: 'inbox:notes-get', key: NOTES }) })
    heard.splice(heard.map(data => (data as { type: string }).type).lastIndexOf('inbox:notes'), 1)
  }
  const say = async (data: unknown) => { port.postMessage(data); await act(settled) }
  return { frame, posted, port, heard, say, settled }
}

it('seals the plan in a frame that can run its page but never reach the app, and hands it a port with the version shown', async () => {
  const { frame, posted, port } = await open()
  expect(calls[0].path).toBe(`/apps/inbox/api/item?id=${PLAN}`)
  expect(frame.getAttribute('sandbox')).toBe('allow-scripts allow-popups allow-popups-to-escape-sandbox')
  expect(frame.getAttribute('sandbox')).not.toContain('allow-same-origin')
  expect(frame.getAttribute('srcdoc')).toBe(BODY)
  // The review page in the frame shows the title; the bar keeps it for screen readers only and shows the workspace.
  expect(screen.getByRole('heading', { level: 1, name: 'One inbox' }).className).toBe('sr-only')
  expect(screen.getByText('lousy-dingo')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Back' }).getAttribute('href')).toBe('/apps/inbox/')
  expect(posted).toHaveBeenCalledWith({ type: 'inbox:hello', item: PLAN, version: 'v1', actions: ['build', 'publish'], theme: 'light' }, '*', [port])
})

it('fills the window below the Back row and the tap line, edge to edge with no border, so only the plan scrolls', async () => {
  answer = () => Response.json({ item: plan('v1', waiting), computerOnline: true })
  const { frame } = await open()
  const column = frame.parentElement!
  expect(column.className.split(' ')).toEqual(expect.arrayContaining(['flex', 'flex-col', 'h-[calc(100dvh-5.5rem)]', '-mb-8']))
  expect(frame.className.split(' ')).toEqual(expect.arrayContaining(['min-h-0', 'flex-1', 'w-screen', 'ml-[calc(50%-50vw)]']))
  expect(frame.className).not.toMatch(/border|rounded|svh/)
  const [top, line, last] = column.children
  expect(top.contains(screen.getByRole('link', { name: 'Back' }))).toBe(true)
  expect(line.contains(screen.getByRole('status'))).toBe(true)
  expect(last).toBe(frame)
})

it("greets the page in the app's look and tells it each time the app's switch changes it, and nothing else", async () => {
  document.documentElement.classList.add('dark')
  const { posted, heard, settled } = await open()
  expect(posted.mock.calls[0][0]).toMatchObject({ type: 'inbox:hello', theme: 'dark' })
  document.documentElement.classList.remove('dark')
  await until(() => heard.length > 0)
  expect(heard).toEqual([{ type: 'inbox:theme', theme: 'light' }])
  // Another class on the root is not a change of look.
  document.documentElement.classList.add('busy')
  await act(settled)
  document.documentElement.classList.add('dark')
  await until(() => heard.length > 1)
  expect(heard).toEqual([{ type: 'inbox:theme', theme: 'light' }, { type: 'inbox:theme', theme: 'dark' }])
})

it("keeps the page's notes in this app's storage under its own review page's key, and no other", async () => {
  const { heard, say } = await open()
  await say({ type: 'inbox:notes-get', key: NOTES })
  expect(heard).toEqual([{ type: 'inbox:notes', value: null }])
  await say({ type: 'inbox:notes-set', key: NOTES, value: '{"notes":[]}' })
  expect(localStorage.getItem(NOTES)).toBe('{"notes":[]}')
  await say({ type: 'inbox:notes-get', key: NOTES })
  expect(heard.at(-1)).toEqual({ type: 'inbox:notes', value: '{"notes":[]}' })
  localStorage.setItem('wong-review3:another-plan', 'theirs')
  heard.length = 0
  await say({ type: 'inbox:notes-get', key: 'wong-review3:another-plan' })
  await say({ type: 'inbox:notes-set', key: 'wong-review3:another-plan', value: 'mine' })
  expect(heard).toEqual([])
  expect(localStorage.getItem('wong-review3:another-plan')).toBe('theirs')
})

it('gives a frame that loads again no port, and stops hearing the first one', async () => {
  const { frame, posted, port, heard } = await open()
  posted.mockClear()
  // A link that took the frame elsewhere: the new page is greeted with nothing.
  fireEvent.load(frame)
  expect(posted).not.toHaveBeenCalled()
  port.postMessage({ type: 'inbox:tap', action: 'publish', text: '' })
  port.postMessage({ type: 'inbox:notes-get', key: NOTES })
  // Nor does a message to the window count, even from the frame itself.
  const event = new MessageEvent('message', { data: { type: 'inbox:tap', action: 'build', text: '' } })
  Object.defineProperty(event, 'source', { value: frame.contentWindow })
  await act(async () => { window.dispatchEvent(event); await new Promise(done => setTimeout(done, 20)) })
  expect(heard).toEqual([])
  expect(calls.filter(call => call.path === '/apps/inbox/api/tap')).toEqual([])
})

it('queues a tap from the page on the version shown, waits for the computer, then tells the page it was sent', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  const { heard, say, settled } = await open()
  await say({ type: 'inbox:tap', action: 'build', text: '- Why: shorter' })
  expect(calls.find(call => call.path === '/apps/inbox/api/tap')).toEqual({ path: '/apps/inbox/api/tap', body: { item: PLAN, action: 'build', version: 'v1', text: '- Why: shorter' } })
  await until(() => screen.queryByRole('status') !== null)
  expect(screen.getByRole('status').textContent).toContain('Waiting for your computer')
  expect(heard).toEqual([])
  // Taken by the computer: no Cancel now, and the page is still waiting.
  tapState = 'delivering'
  await act(async () => { await vi.advanceTimersByTimeAsync(TAP_POLL_MS) })
  expect(screen.getByRole('status').textContent).toBe('Sending…')
  expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull()
  await act(settled)
  expect(heard).toEqual([])
  tapState = 'sent'
  await act(async () => { await vi.advanceTimersByTimeAsync(TAP_POLL_MS) })
  expect(screen.getByRole('status').textContent).toBe('Sent')
  await until(() => heard.length > 0)
  expect(heard).toEqual([{ type: 'inbox:result', state: 'sent' }])
})

it("tells the page at once when the tap is refused, and says nothing to a page that didn't ask", async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  answer = () => Response.json({ item: plan('v1', waiting), computerOnline: true })
  const answers = [Response.json({ error: { code: 'changed' } }, { status: 409 }), Response.json({ error: { code: 'too_soon' } }, { status: 429 })]
  tapAnswer = () => answers.shift()!
  const { heard, say } = await open()
  expect(screen.getByRole('status').textContent).toContain('Waiting…')
  await say({ type: 'inbox:tap', action: 'send', text: 'A note' })
  await until(() => heard.length === 1)
  await say({ type: 'inbox:tap', action: 'send', text: 'A note' })
  await until(() => heard.length === 2)
  expect(heard).toEqual([{ type: 'inbox:result', state: 'changed' }, { type: 'inbox:result', state: 'soon' }])
  heard.length = 0
  await act(async () => { await vi.advanceTimersByTimeAsync(TAP_POLL_MS) })
  expect(screen.getByRole('status').textContent).toBe('Sent')
  await say({ type: 'inbox:notes-get', key: 'cf-access-token' })
  expect(heard).toEqual([])
})

it('says a waiting tap waits for the computer once the computer goes offline, with no reload', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  answer = () => Response.json({ item: plan('v1', waiting), computerOnline: true })
  tapState = 'waiting'
  online = true
  await open()
  expect(screen.getByRole('status').textContent).toContain('Waiting…')
  // A hidden tab asks nothing, and a look that fails keeps what it knew.
  const looks = () => calls.filter(call => call.path === '/apps/inbox/api/items').length
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  await act(async () => { await vi.advanceTimersByTimeAsync(REFRESH_MS) })
  expect(looks()).toBe(0)
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  online = null
  await act(async () => { await vi.advanceTimersByTimeAsync(REFRESH_MS) })
  await until(() => looks() === 1)
  expect(screen.getByRole('status').textContent).toContain('Waiting…')
  online = false
  await act(async () => { await vi.advanceTimersByTimeAsync(REFRESH_MS) })
  await until(() => screen.getByRole('status').textContent!.includes('Waiting for your computer'))
  expect(screen.getByRole('status').textContent).toContain('Waiting for your computer')
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
  // Only the status is read again: the frame keeps the plan it loaded.
  expect(calls.filter(call => call.path.includes('item?'))).toHaveLength(1)
})

it('ignores a message of an unknown kind, too large, or for an action the plan does not offer', async () => {
  const { heard, say } = await open()
  const count = calls.length
  await say({ type: 'inbox:secret', key: NOTES })
  await say({ type: 'inbox:notes-get', key: 'cf-access-token' })
  await say({ type: 'inbox:tap', action: 'build', text: 'n'.repeat(20_001) })
  await say({ type: 'inbox:tap', action: 'merge', text: '' })
  await say('inbox:tap')
  expect(heard).toEqual([])
  expect(calls.length).toBe(count)
})

it('takes no notes from a plan whose page names no review', async () => {
  answer = () => Response.json({ item: { ...plan(), body: '<!doctype html><title>One inbox</title><p>No change named</p>' }, computerOnline: false })
  render(<MemoryRouter initialEntries={[`/apps/inbox/?item=${PLAN}`]}><Routes><Route path="/apps/:name/*" element={<App />} /></Routes></MemoryRouter>)
  await screen.findByTitle<HTMLIFrameElement>('One inbox')
  const port = await greeted()
  const heard: unknown[] = []
  port.onmessage = event => { heard.push(event.data) }
  port.postMessage({ type: 'inbox:notes-set', key: NOTES, value: 'x' })
  port.postMessage({ type: 'inbox:notes-get', key: NOTES })
  await act(async () => { await new Promise(done => setTimeout(done, 20)) })
  expect(heard).toEqual([])
  expect(localStorage.getItem(NOTES)).toBeNull()
})

it('reloads a plan that changed, and says when a plan has closed or the inbox is unavailable', async () => {
  answer = () => Response.json({ item: plan('v1', { ...waiting, state: 'changed' }), computerOnline: true })
  await open()
  answer = () => Response.json({ item: plan('v2'), computerOnline: true })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Reload' })) })
  await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
  expect(calls.filter(call => call.path.includes('item?'))).toHaveLength(2)
  cleanup()
  answer = () => Response.json({ error: { code: 'closed' } }, { status: 410 })
  render(<MemoryRouter initialEntries={[`/apps/inbox/?item=${PLAN}`]}><Routes><Route path="/apps/:name/*" element={<App />} /></Routes></MemoryRouter>)
  expect(screen.getByRole('status').textContent).toBe('Loading the plan…')
  expect((await screen.findByRole('alert')).textContent).toBe('This plan has closed. Ask its chat for a new link.')
  cleanup()
  answer = () => Response.json({ error: { code: 'not_found' } }, { status: 404 })
  render(<MemoryRouter initialEntries={[`/apps/inbox/?item=${PLAN}`]}><Routes><Route path="/apps/:name/*" element={<App />} /></Routes></MemoryRouter>)
  expect((await screen.findByRole('alert')).textContent).toMatch(/has closed/)
  cleanup()
  answer = () => { throw new TypeError('offline') }
  render(<MemoryRouter initialEntries={[`/apps/inbox/?item=${PLAN}`]}><Routes><Route path="/apps/:name/*" element={<App />} /></Routes></MemoryRouter>)
  expect((await screen.findByRole('alert')).textContent).toBe('The inbox is unavailable.')
  answer = () => Response.json({ item: plan(), computerOnline: true })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry' })) })
  expect(await screen.findByTitle('One inbox')).toBeTruthy()
})
