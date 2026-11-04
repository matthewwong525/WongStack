// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { when, type Tap } from './api'
import { App } from './App'
import { LINE_REFRESH_MS, REFRESH_MS } from './line'
import { FakeSocket, line } from './line.test.kit'
import { TAP_POLL_MS } from './TapLine'

const PLAN = 'c'.repeat(32)
const BODY = '<!doctype html><title>One inbox</title><body data-change="inbox-mini-app"><p>The plan</p>'
const NOTES = 'wong-review3:inbox-mini-app'
const plan = (version = 'v1', tap: Tap | null = null, files: string[] = []) => ({ id: PLAN, kind: 'plan', title: 'One inbox', workspace: 'lousy-dingo',
  actions: ['build', 'publish'], version, createdAt: 1, closesAt: 2, detail: null, tap, body: BODY, files })
const waiting: Tap = { id: 't'.repeat(32), item: PLAN, action: 'build', text: '', state: 'waiting' }

let answer: () => Response
let tapAnswer: () => Response
let tapState: Tap['state']
let online: boolean | null
let calls: { path: string; body: unknown }[]
let fileAnswer: () => Response
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
  fileAnswer = () => Response.json({ file: { id: 'f'.repeat(32) } })
  localStorage.clear()
  vi.stubGlobal('fetch', vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, body: typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body ?? null })
    if (path.startsWith('/apps/inbox/api/file?')) return fileAnswer()
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
const open = async (entry = `/apps/inbox/?item=${PLAN}`) => {
  render(<MemoryRouter initialEntries={[entry]}><Routes><Route path="/apps/:name/*" element={<App />} /></Routes></MemoryRouter>)
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
  // The hello names the workspace, so a page that draws its own Back can show it there.
  expect(posted).toHaveBeenCalledWith({ type: 'inbox:hello', item: PLAN, version: 'v1', actions: ['build', 'publish'], workspace: 'lousy-dingo',
    files: [], theme: 'light' }, '*', [port])
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

it("pins an older plan's Back above it, and nothing hides, slides or resizes as the plan scrolls", async () => {
  const { frame, say } = await open()
  const column = frame.parentElement!
  const top = screen.getByRole('link', { name: 'Back' }).parentElement!
  expect(column.firstElementChild).toBe(top)
  for (const data of [{ type: 'inbox:scroll', down: true, top: false }, { type: 'inbox:scroll', down: false, top: false }]) {
    await say(data)
    expect(top.className).not.toContain('hidden')
    expect(column.className.split(' ')).toContain('h-[calc(100dvh-5.5rem)]')
    expect(document.documentElement.dataset.bars).toBeUndefined()
  }
})

it('leaves Back to a page that draws its own: none shows outside the frame, and the plan keeps its height as it scrolls', async () => {
  answer = () => Response.json({ item: { ...plan(), body: BODY.replace('<body ', '<body data-own-back ') }, computerOnline: false })
  const { frame, say } = await open()
  const column = frame.parentElement!
  expect(screen.queryByRole('link', { name: 'Back' })).toBeNull()
  expect(screen.queryByText('lousy-dingo')).toBeNull()
  expect(screen.getByRole('heading', { level: 1, name: 'One inbox' }).className).toBe('sr-only')
  expect(column.className.split(' ')).toEqual(expect.arrayContaining(['flex', 'flex-col', 'h-[calc(100dvh-5.5rem)]', '-mb-8']))
  await say({ type: 'inbox:scroll', down: true, top: false })
  expect(column.className.split(' ')).toEqual(expect.arrayContaining(['h-[calc(100dvh-5.5rem)]', '-mb-8']))
  expect(column.className).not.toMatch(/h-dvh|-mt-8/)
  expect(document.documentElement.dataset.bars).toBeUndefined()
})

it("opens the week board when the page's own Back is tapped", async () => {
  const { port } = await open()
  port.postMessage({ type: 'inbox:back' })
  await until(() => screen.queryByTitle('One inbox') === null)
  expect(screen.queryByTitle('One inbox')).toBeNull()
  await until(() => calls.some(call => call.path === '/apps/inbox/api/items'))
  expect(calls.some(call => call.path === '/apps/inbox/api/items')).toBe(true)
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
  // Answered: the page reads as its Archive will show it, before the computer closes it.
  expect(screen.getAllByRole('status').map(el => el.textContent)).toEqual([`Archived · Build, ${when(Date.now())}`])
  await until(() => heard.length > 0)
  expect(heard).toEqual([{ type: 'inbox:result', state: 'sent' }])
})

it('opens a page whose tap reached the chat read-only under that answer, before the computer closes it', async () => {
  answer = () => Response.json({ item: plan('v1', { ...waiting, state: 'sent', text: 'Shorter' }), computerOnline: true })
  const { posted, port } = await open()
  expect(posted).toHaveBeenCalledWith({ type: 'inbox:hello', item: PLAN, version: 'v1', actions: [], readOnly: true, workspace: 'lousy-dingo',
    files: [], theme: 'light' }, '*', [port])
  expect(screen.getAllByRole('status').map(el => el.textContent)).toEqual([expect.stringMatching(/^Archived · Build, .+With notes: “Shorter”$/)])
  expect(screen.queryByText('Sent')).toBeNull()
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
  expect(screen.getByRole('status').textContent).toMatch(/^Archived · Build, /)
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

it('reads a waiting tap and the computer at each look on the open line, and stops asking every few seconds', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  answer = () => Response.json({ item: plan('v1', waiting), computerOnline: true })
  tapState = 'waiting'
  online = true
  await open()
  const count = (part: string) => calls.filter(call => call.path.includes(part)).length
  // The waiting tap joins the line once the page has drawn it; an opened line then looks once, for what changed.
  await act(async () => { await new Promise(done => setTimeout(done, 0)) })
  await line().open()
  await until(() => count('/items') === 1 && count('tap?id=') === 1)
  await act(async () => { await vi.advanceTimersByTimeAsync(REFRESH_MS) })
  expect([count('/items'), count('tap?id=')]).toEqual([1, 1])
  online = false
  await line().say('{"t":"look"}')
  await until(() => screen.getByRole('status').textContent!.includes('Waiting for your computer'))
  expect(count('tap?id=')).toBe(2)
  // Once a minute it still asks, so a computer that went quiet shows.
  await act(async () => { await vi.advanceTimersByTimeAsync(LINE_REFRESH_MS - REFRESH_MS) })
  await until(() => count('/items') === 3)
  tapState = 'sent'
  await line().say('{"t":"look"}')
  await until(() => screen.getByRole('status').textContent!.startsWith('Archived · Build, '))
  // Nothing waits now: a look reads nothing.
  await line().say('{"t":"look"}')
  expect([count('/items'), count('tap?id=')]).toEqual([4, 3])
})

it('keeps the line open beside a plan with no tap, and a look then reads nothing', async () => {
  await open()
  await act(async () => { await new Promise(done => setTimeout(done, 0)) })
  await line().open()
  await line().say('{"t":"look"}')
  expect(calls.filter(call => call.path.includes('/items') || call.path.includes('tap?id='))).toEqual([])
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
  expect(screen.getByRole('status').textContent).toBe('Loading…')
  expect((await screen.findByRole('alert')).textContent).toBe('This has closed. Ask its chat for a new link.')
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

const picked = (bytes: number, ref = 'shot') => ({ type: 'inbox:file', ref, name: 'shot.png', question: 'A picture of the old page',
  data: new ArrayBuffer(bytes) })

it("sends a file the page hands over for its own item, answers its id, and refuses one over 25 MB with no call", async () => {
  const { heard, say } = await open()
  await say(picked(3))
  await until(() => heard.length > 0)
  const sent = calls.find(call => call.path.startsWith('/apps/inbox/api/file?'))!
  expect(new URL(sent.path, 'https://app.example').searchParams.toString())
    .toBe(new URLSearchParams({ item: PLAN, name: 'shot.png', question: 'A picture of the old page' }).toString())
  expect((sent.body as ArrayBuffer).byteLength).toBe(3)
  expect(heard).toEqual([{ type: 'inbox:file-result', ref: 'shot', id: 'f'.repeat(32) }])
  const before = calls.length
  await say(picked(25 * 1024 * 1024 + 1, 'big'))
  await until(() => heard.length > 1)
  expect(heard[1]).toEqual({ type: 'inbox:file-result', ref: 'big', error: 'too big: 25 MB at most' })
  expect(calls.slice(before).filter(call => call.path.startsWith('/apps/inbox/api/file?'))).toEqual([])
  fileAnswer = () => Response.json({ error: { code: 'bad_file', message: 'No.' } }, { status: 400 })
  await say(picked(3, 'odd'))
  await until(() => heard.length > 2)
  expect(heard[2]).toEqual({ type: 'inbox:file-result', ref: 'odd', error: 'this is not a file the page takes' })
})

it('passes the files the page sent with its tap', async () => {
  const { say } = await open()
  await say({ type: 'inbox:tap', action: 'build', text: 'With a picture', files: ['f'.repeat(32)] })
  await until(() => calls.some(call => call.path === '/apps/inbox/api/tap'))
  expect(calls.find(call => call.path === '/apps/inbox/api/tap')?.body).toEqual({ item: PLAN, action: 'build', version: 'v1',
    text: 'With a picture', files: ['f'.repeat(32)] })
})

it("leaves the item's 100 MB to the app, which counts only the files it still holds, and words each refusal as the page shows it", async () => {
  const { heard, say } = await open()
  const answers = () => heard.map(data => (data as { error?: string }).error ?? 'sent')
  for (let n = 0; n < 5; n++) await say(picked(25 * 1024 * 1024, `part-${n}`))
  await until(() => heard.length === 5)
  expect(answers()).toEqual(['sent', 'sent', 'sent', 'sent', 'sent'])
  heard.length = 0
  const refusals: (() => Response)[] = [
    () => Response.json({ error: { code: 'too_large', message: 'No.' } }, { status: 413 }),
    () => Response.json({ error: { code: 'full', message: 'No.' } }, { status: 507 }),
    () => Response.json({ error: { code: 'not_found', message: 'No.' } }, { status: 404 }),
    () => { throw new TypeError('offline') },
  ]
  for (const refusal of refusals) { fileAnswer = refusal; await say(picked(0)); await until(() => heard.length === refusals.indexOf(refusal) + 1) }
  expect(answers()).toEqual(['the files for this page pass 100 MB', 'the app is full for now; try again later', 'it was not sent; try again',
    'it was not sent; try again'])
})

const LOGO = 'a'.repeat(32), BRIEF = 'b'.repeat(32)
it('tells the page which files the app still holds when it opens, and after a tap with files that did not reach the chat', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  answer = () => Response.json({ item: plan('v1', null, [BRIEF]), computerOnline: true })
  const { posted, heard, say } = await open()
  expect(posted.mock.calls[0][0]).toMatchObject({ type: 'inbox:hello', files: [BRIEF] })
  // The app deleted the logo: the tap is refused, and the page hears it with what is still held.
  tapAnswer = () => Response.json({ error: { code: 'files_gone', message: 'No.' } }, { status: 409 })
  await say({ type: 'inbox:tap', action: 'build', text: '', files: [LOGO, BRIEF] })
  await until(() => heard.length === 1)
  expect(heard).toEqual([{ type: 'inbox:result', state: 'gone', files: [BRIEF] }])
  // A cancelled tap took its file with it.
  tapAnswer = () => Response.json({ tap: waiting })
  await say({ type: 'inbox:tap', action: 'build', text: '', files: [BRIEF] })
  await until(() => screen.queryByRole('status') !== null)
  answer = () => Response.json({ item: plan('v1', null, []), computerOnline: true })
  tapState = 'cancelled'
  await act(async () => { await vi.advanceTimersByTimeAsync(TAP_POLL_MS) })
  await until(() => heard.length === 2)
  expect(heard[1]).toEqual({ type: 'inbox:result', state: 'cancelled', files: [] })
  // A tap with no files, or one that reached the chat, asks the app nothing more.
  const reads = calls.filter(call => call.path.startsWith('/apps/inbox/api/item?')).length
  tapAnswer = () => Response.json({ error: { code: 'too_soon' } }, { status: 429 })
  await say({ type: 'inbox:tap', action: 'send', text: 'A note' })
  await until(() => heard.length === 3)
  expect(heard[2]).toEqual({ type: 'inbox:result', state: 'soon' })
  expect(calls.filter(call => call.path.startsWith('/apps/inbox/api/item?'))).toHaveLength(reads)
  // When the app can't say, the page keeps every file it has.
  answer = () => { throw new TypeError('offline') }
  await say({ type: 'inbox:tap', action: 'build', text: '', files: [BRIEF] })
  await until(() => heard.length === 4)
  expect(heard[3]).toEqual({ type: 'inbox:result', state: 'soon' })
})

// A closed plan as the inbox gives it: notes and Build and publish reached the chat, named by the page's own buttons.
const READY = '<div id="ready" data-actions="[{&quot;name&quot;:&quot;publish&quot;,&quot;label&quot;:&quot;Build and publish&quot;}]" hidden></div>'
const archived = (answers: { action: string; text: string; at: number }[]) => () => Response.json({ item: { ...plan('v1', waiting),
  body: BODY.replace('<p>The plan</p>', READY), archived: { endedAt: 9_000, answers } }, computerOnline: true })

it('opens an archived page read-only under what reached the chat, and starts no line, poll or tap line', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  answer = archived([{ action: 'send', text: 'Shorter, please', at: 3_000 }, { action: 'publish', text: '', at: 4_000 }])
  const { posted, port } = await open()
  expect(posted).toHaveBeenCalledWith({ type: 'inbox:hello', item: PLAN, version: 'v1', actions: [], readOnly: true, workspace: 'lousy-dingo',
    files: [], theme: 'light' }, '*', [port])
  expect(screen.getByRole('status').textContent).toBe(`Archived · Notes sent, ${when(3_000)}With notes: “Shorter, please”` +
    `Archived · Build and publish, ${when(4_000)}`)
  await act(async () => { await vi.advanceTimersByTimeAsync(REFRESH_MS * 2) })
  expect(FakeSocket.all).toEqual([])
  expect(calls.map(call => call.path)).toEqual([`/apps/inbox/api/item?id=${PLAN}`])
})

it('says an archived page had no answer and when it closed, and an action the page does not name by its own label', async () => {
  answer = archived([])
  await open()
  expect(screen.getByRole('status').textContent).toBe(`Archived · No answer, ${when(9_000)}`)
  cleanup()
  answer = archived([{ action: 'build', text: '', at: 3_000 }])
  await open()
  expect(screen.getByRole('status').textContent).toBe(`Archived · Build, ${when(3_000)}`)
})

it('answers any tap or file from an archived page with closed, sends none, keeps no notes, and goes Back to the Reviews list', async () => {
  answer = archived([])
  const { heard, say, port } = await open(`/apps/inbox/?item=${PLAN}&from=reviews`)
  await say({ type: 'inbox:tap', action: 'send', text: 'More notes' })
  await say({ type: 'inbox:tap', action: 'build', text: '' })
  expect(heard).toEqual([{ type: 'inbox:result', state: 'closed' }, { type: 'inbox:result', state: 'closed' }])
  expect(calls.filter(call => call.path === '/apps/inbox/api/tap')).toEqual([])
  await say({ type: 'inbox:file', ref: 'late', name: 'shot.png', question: 'A picture', data: new ArrayBuffer(3) })
  expect(heard[2]).toEqual({ type: 'inbox:file-result', ref: 'late', error: 'this page has closed' })
  expect(calls.filter(call => call.path.startsWith('/apps/inbox/api/file?'))).toEqual([])
  await say({ type: 'inbox:notes-set', key: NOTES, value: '{"notes":[]}' })
  expect(localStorage.getItem(NOTES)).toBeNull()
  expect(screen.getByRole('link', { name: 'Back' }).getAttribute('href')).toBe('/apps/inbox/?view=reviews')
  port.postMessage({ type: 'inbox:back' })
  await until(() => calls.some(call => call.path.startsWith('/apps/inbox/api/reviews')))
  expect(screen.queryByTitle('One inbox')).toBeNull()
})
