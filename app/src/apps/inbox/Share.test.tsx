// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { App } from './App'

const PLAN = 'c'.repeat(32)
const plan = { id: PLAN, kind: 'plan', title: 'One inbox', workspace: 'lousy-dingo', actions: ['build', 'publish'], version: 'v1', createdAt: 1,
  closesAt: 2, detail: null, tap: null, body: '<!doctype html><title>One inbox</title><p>The plan</p>', files: [] }

let item: Record<string, unknown>
let shareAnswer: () => Response
let calls: { path: string; body: unknown }[]
// The frame's window as the inbox sees it: a plain page must get no hello on it.
let frameWindow: { postMessage: ReturnType<typeof vi.fn> }
beforeEach(() => {
  frameWindow = { postMessage: vi.fn() }
  vi.spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get').mockReturnValue(frameWindow as unknown as Window)
  item = plan
  shareAnswer = () => Response.json({ token: 'tok_1' })
  calls = []
  vi.stubGlobal('fetch', vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, body: typeof init?.body === 'string' ? JSON.parse(init.body) : null })
    if (path.startsWith('/apps/inbox/api/item?')) return Response.json({ item, computerOnline: false })
    if (path === '/apps/inbox/api/share') return shareAnswer()
    if (path === '/apps/inbox/api/share-stop') return Response.json({ stopped: true })
    return Response.json({ items: [], computerOnline: false })
  }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

/** Waits, a few milliseconds at a time, for what an answer from the inbox's own calls brings. */
const until = async (check: () => boolean) => {
  for (let i = 0; i < 200 && !check(); i++) await act(async () => { await new Promise(done => setTimeout(done, 5)) })
}
const open = () => render(<MemoryRouter initialEntries={[`/apps/inbox/?item=${PLAN}`]}><Routes><Route path="/apps/:name/*" element={<App />} /></Routes></MemoryRouter>)

it('opens a plain page from its own sealed address, greets it with nothing, and shows no answer line', async () => {
  item = { ...plan, actions: [], plain: true, shared: null }
  open()
  const frame = await screen.findByTitle<HTMLIFrameElement>('One inbox')
  expect(frame.getAttribute('src')).toBe(`/apps/inbox/api/frame?id=${PLAN}`)
  expect(frame.hasAttribute('srcdoc')).toBe(false)
  expect(frame.getAttribute('sandbox')).toBe('allow-scripts allow-popups allow-popups-to-escape-sandbox')
  fireEvent.load(frame)
  expect(frameWindow.postMessage).not.toHaveBeenCalled()
  expect(screen.queryByRole('status')).toBeNull()
  expect(screen.getByRole('button', { name: 'Share with team' })).toBeTruthy()
  // A page that loads another address starts again, says so, and after three tries shows no more.
  fireEvent.load(screen.getByTitle('One inbox'))
  expect(screen.getByRole('status').textContent).toBe('This page tried to leave the page.')
  for (let load = 0; load < 4; load++) fireEvent.load(screen.getByTitle('One inbox'))
  expect(screen.getByRole('status').textContent).toBe('This page keeps trying to leave. Reload to try again.')
  expect(screen.queryByTitle('One inbox')).toBeNull()
})

it('shares a page with the team, copies its link, and stops it; a failed share says so', async () => {
  const writeText = vi.fn(async () => undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  open()
  await screen.findByTitle('One inbox')
  shareAnswer = () => new Response(null, { status: 503 })
  fireEvent.click(screen.getByRole('button', { name: 'Share with team' }))
  await until(() => screen.queryByText('The page was not shared. Try again.') !== null)
  shareAnswer = () => Response.json({ token: 'tok_1' })
  fireEvent.click(screen.getByRole('button', { name: 'Share with team' }))
  await until(() => screen.queryByText('Shared with the team') !== null)
  expect(calls.filter(call => call.path === '/apps/inbox/api/share').map(call => call.body)).toEqual([{ id: PLAN }, { id: PLAN }])
  const link = `${location.origin}/apps/inbox/?shared=tok_1`
  expect(screen.getByText(`Anyone who can open the Inbox with the link can open this page: ${link}`)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
  await until(() => screen.queryByText('Link copied.') !== null)
  expect(writeText).toHaveBeenCalledWith(link)
  fireEvent.click(screen.getByRole('button', { name: 'Stop sharing' }))
  await until(() => screen.queryByRole('button', { name: 'Share with team' }) !== null)
  expect(calls.find(call => call.path === '/apps/inbox/api/share-stop')?.body).toEqual({ id: PLAN })
  expect(screen.queryByText(/Anyone who can open the Inbox/)).toBeNull()
})
