// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { App } from './App'
import { sharedFileUrl } from './downloads'

const TOKEN = 'tok_1'
let answer: () => Response
let paths: string[]
let frameWindow: { postMessage: ReturnType<typeof vi.fn> }
beforeEach(() => {
  frameWindow = { postMessage: vi.fn() }
  vi.spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get').mockReturnValue(frameWindow as unknown as Window)
  answer = () => Response.json({ title: 'Kit sales, November', sharedBy: 'matthew', updatedAt: Date.UTC(2026, 10, 23, 12) })
  paths = []
  vi.stubGlobal('fetch', vi.fn(async (path: string) => {
    paths.push(path)
    return path.startsWith('/apps/inbox/api/shared?') ? answer() : Response.json({ items: [], computerOnline: false })
  }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

const open = async () => {
  render(<MemoryRouter initialEntries={[`/apps/inbox/?shared=${TOKEN}`]}><Routes><Route path="/apps/:name/*" element={<App />} /></Routes></MemoryRouter>)
  await act(async () => { await new Promise(done => setTimeout(done, 10)) })
}

it("shows a teammate's page by its link: title, who shared it, when it changed, and the page sealed and read-only", async () => {
  await open()
  expect(paths).toEqual([`/apps/inbox/api/shared?token=${TOKEN}`])
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Kit sales, November')
  expect(screen.getByText('Shared by matthew · updated 23 Nov')).toBeTruthy()
  const frame = screen.getByTitle<HTMLIFrameElement>('Kit sales, November')
  expect(frame.getAttribute('src')).toBe(`/apps/inbox/api/shared-frame?token=${TOKEN}`)
  expect(frame.getAttribute('sandbox')).toBe('allow-scripts allow-popups allow-popups-to-escape-sandbox')
  fireEvent.load(frame)
  expect(frameWindow.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'inbox:hello', actions: [], readOnly: true }), '*',
    [expect.any(MessagePort)])
  expect(screen.queryByRole('button', { name: 'Share with team' })).toBeNull()
})

it("hears only the page's own Back, on the newest load's port, and goes to the inbox", async () => {
  await open()
  // The second load means the page left: its new frame's first load greets it again.
  const frame = screen.getByTitle<HTMLIFrameElement>('Kit sales, November')
  fireEvent.load(frame)
  fireEvent.load(frame)
  fireEvent.load(screen.getByTitle('Kit sales, November'))
  const [first, second] = frameWindow.postMessage.mock.calls.map(call => (call[2] as MessagePort[])[0])
  const wait = () => act(async () => { await new Promise(done => setTimeout(done, 10)) })
  first.postMessage({ type: 'inbox:back' })
  second.postMessage(null)
  second.postMessage({ type: 'inbox:tap' })
  await wait()
  expect(screen.getByTitle('Kit sales, November')).toBeTruthy()
  second.postMessage({ type: 'inbox:back' })
  await wait()
  expect(screen.queryByTitle('Kit sales, November')).toBeNull()
})

it('says a stopped link is no longer shared, and a missing one does not exist', async () => {
  answer = () => Response.json({ error: { code: 'stopped' } }, { status: 410 })
  await open()
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('This page is no longer shared')
  expect(screen.getByText('The person who shared it turned the link off. Ask them for a new link.')).toBeTruthy()
  expect(screen.queryByTitle('Kit sales, November')).toBeNull()
  cleanup()
  answer = () => Response.json({ error: { code: 'not_found' } }, { status: 404 })
  await open()
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('This link does not exist')
  expect(screen.getByText('Check the link, or ask the person who sent it for a new one.')).toBeTruthy()
})

it('offers Retry when the page does not load, and shows it once it does', async () => {
  answer = () => { throw new TypeError('Failed to fetch') }
  await open()
  expect(screen.getByRole('alert').textContent).toBe('The page could not be loaded.')
  answer = () => new Response(null, { status: 503 })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry' })); await new Promise(done => setTimeout(done, 10)) })
  expect(screen.getByRole('alert').textContent).toBe('The page could not be loaded.')
  answer = () => Response.json({ title: 'Kit sales, November', sharedBy: 'matthew', updatedAt: 0 })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry' })); await new Promise(done => setTimeout(done, 10)) })
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Kit sales, November')
})

it("downloads a shared file page's files once on open, and Download saves them again; a stopped link saves none", async () => {
  const saved: string[] = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { saved.push(this.getAttribute('href') ?? '') })
  answer = () => Response.json({ title: 'Kit sales, November', sharedBy: 'matthew', updatedAt: 0, files: [{ name: 'q2-sales.xlsx', size: 10 }] })
  await open()
  expect(saved).toEqual([sharedFileUrl(TOKEN, 'q2-sales.xlsx')])
  expect(screen.getByRole('status').textContent).toBe('Downloading q2-sales.xlsx…')
  fireEvent.click(screen.getByRole('button', { name: 'Download' }))
  expect(saved).toHaveLength(2)
  cleanup()
  saved.length = 0
  answer = () => Response.json({ error: { code: 'stopped' } }, { status: 410 })
  await open()
  expect([saved, screen.queryByRole('button', { name: 'Download' })]).toEqual([[], null])
})
