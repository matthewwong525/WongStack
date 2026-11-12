// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createBrowserRouter, MemoryRouter, Route, RouterProvider, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { App } from './App'
import { appAccessSchema, setupSchema, useAccess } from '../../lib/access'
import { apps as built } from '../../lib/apps'
import { Home } from '../../pages/home/Home'
import { AppPage } from '../AppPage'

// The Access page is the access plugin's module, whose own tests cover it; these cover the app around it: the mount,
// the app's router, Home's Connect card and the app pages that read the same access.
const setup = { role: 'employee', api: 'authenticated', identity: { email: 'employee@example.com', subject: 'employee' }, apps: ['hello'],
  repository: 'manual_provider_setup', memory: 'independent_operator_setup', prompt: { state: 'ready', text: 'Synthetic reviewed setup prompt' } }
const person = { email: 'employee@example.com', status: 'active', settled: true, role: null, apps: ['hello'], keys: {} }
const status = { ownerEmail: 'owner@example.com', viewer: { email: 'owner@example.com', owner: true }, environment: 'live', key: 'ready', started: true, imported: 0,
  keysStarted: true, unticked: { people: [], roles: [] }, apps: [{ id: 'hello', title: 'Hello', description: '' }, { id: 'custom', title: 'Custom', description: '' }],
  keys: [], roles: [], people: [person], work: [], project: 'ready' }
let mode: 'owner' | 'employee' | 'legacy' | 'waiting-owner' | 'waiting-employee'; let catalogue: string[]
let own: typeof setup; let failed: Set<string>; let fetchMock: ReturnType<typeof vi.fn>
function appAccess() {
  if (mode === 'legacy') return { state: 'legacy' }
  const role = mode.endsWith('owner') ? 'owner' : 'employee'
  if (mode.startsWith('waiting')) return { state: 'not_started', role, manages: role === 'owner', apps: catalogue }
  return { state: 'current', role, manages: role === 'owner', apps: catalogue, revision: 1 }
}
beforeEach(() => {
  mode = 'owner'; own = structuredClone(setup); catalogue = ['access', 'hello']; failed = new Set()
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const path = url.replace('/api/access/', '')
    if (failed.has(path)) return Response.json({ code: 'unavailable' }, { status: 503 })
    if (init?.method === 'POST') return Response.json(status)
    if (path === 'apps') return Response.json(appAccess())
    if (path === 'setup') return Response.json(own)
    if (path === 'pushers') return Response.json({ state: 'not_github', pushers: [] })
    return Response.json(status)
  })
  vi.stubGlobal('fetch', fetchMock)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(async () => {}) } })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
const moment = () => act(async () => { await new Promise(resolve => setTimeout(resolve)) })
const popup = () => screen.queryByRole('dialog'); const showing = () => !!popup(); const steps = () => screen.queryByRole('region', { name: 'Connect your assistant' })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const reads = (path: string) => fetchMock.mock.calls.filter(([url, init]) => url.endsWith(path) && init?.method !== 'POST')
const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')

// The app as it runs: its own router on the browser's address, with Home at / and every mini app at /apps/<name>/.
const app = (at = '/apps/access/') => {
  window.history.replaceState(null, '', at)
  const router = createBrowserRouter([{ path: '/', element: <p>Home page</p> }, { path: '/apps/:name/*', element: <App /> }])
  render(<RouterProvider router={router} />)
  return router
}
const go = (router: ReturnType<typeof app>, to: string | number) => act(async () => { await (typeof to === 'number' ? router.navigate(to) : router.navigate(to)) })
const KIM = '/apps/access/people/employee%40example.com'

it('mounts the Access page in its box, names each app by the title this build gives it, and removes it on leaving', async () => {
  mode = 'employee'; const router = app()
  const can = await screen.findByRole('region', { name: 'You can use' })
  expect(within(within(can).getByRole('list', { name: 'Apps' })).getAllByRole('listitem').map(item => item.textContent)).toEqual([built.find(item => item.name === 'hello')!.title])
  expect(can.closest('[data-access-screen]')).toBeTruthy()
  await go(router, '/'); await screen.findByText('Home page'); expect(document.querySelector('[data-access-screen]')).toBeNull()
})

it("follows the app's own moves, and an opened person with changes holds a move away until the owner answers", async () => {
  const router = app(); await screen.findByRole('table', { name: 'People' })
  await go(router, '/apps/access/roles'); await screen.findByRole('table', { name: 'Roles' })
  await go(router, KIM); await screen.findByRole('dialog', { name: 'employee@example.com' })
  fireEvent.click(screen.getByRole('checkbox', { name: 'Custom' })); await screen.findByText('Not saved yet')
  // The app's move away waits on the page's own question.
  await go(router, '/'); await screen.findByRole('alertdialog', { name: 'Leave without saving?' })
  expect([router.state.location.pathname, window.location.pathname, !!screen.queryByText('Home page')]).toEqual([KIM, KIM, false])
  click('Keep editing'); await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  expect((screen.getByRole('checkbox', { name: 'Custom' }) as HTMLInputElement).checked).toBe(true)
  await go(router, '/'); await screen.findByRole('alertdialog', { name: 'Leave without saving?' }); click('Leave')
  await screen.findByText('Home page'); expect([router.state.location.pathname, posts()]).toEqual(['/', []])
  // With nothing changed, Back goes at once.
  await go(router, -1); await screen.findByRole('dialog', { name: 'employee@example.com' }); expect(screen.queryByRole('alertdialog')).toBeNull()
})

it("holds Back out of a changed person until the owner answers, and keeps the change on staying", async () => {
  const router = app('/'); await go(router, '/apps/access/'); await screen.findByRole('table', { name: 'People' })
  await go(router, KIM); await screen.findByRole('dialog', { name: 'employee@example.com' })
  fireEvent.click(screen.getByRole('checkbox', { name: 'Custom' })); await screen.findByText('Not saved yet')
  // Back to the list, and Back out of Access, both ask, and the panel stays with its change.
  for (const steps of [-1, -2]) {
    await go(router, steps); await screen.findByRole('alertdialog', { name: 'Leave without saving?' })
    await waitFor(() => expect([router.state.location.pathname, window.location.pathname]).toEqual([KIM, KIM]))
    click('Keep editing'); await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect((screen.getByRole('checkbox', { name: 'Custom' }) as HTMLInputElement).checked).toBe(true)
  }
  await go(router, -1); await screen.findByRole('alertdialog', { name: 'Leave without saving?' }); click('Leave')
  await screen.findByRole('table', { name: 'People' }); expect([window.location.pathname, posts()]).toEqual(['/apps/access/', []])
})

// While a mini app's page reads who may open it, a screen reader hears the words and everyone sees a heading line
// and a card block.
it('a mini app page shows its loading blocks first', async () => {
  const blocks = () => screen.getByRole('status').querySelectorAll('[aria-hidden="true"] [data-slot="skeleton"]')
  render(<MemoryRouter initialEntries={['/apps/hello/']}><Routes><Route path="/apps/:name/" element={<AppPage />} /></Routes></MemoryRouter>)
  expect(screen.getByRole('status').textContent).toBe('Loading app access…'); expect(blocks()).toHaveLength(2)
  await screen.findByRole('heading', { name: 'Hello' })
})

// The Connect popup shows on a press of Home's card and shuts three ways; it is left open at the end.
async function opensAndCloses(side: string) {
  const press = () => fireEvent.click(screen.getByRole('button', { name: /^Connect your assistant/ }))
  // The ✕, a press on the dimmed page round the box, and Escape.
  const ways = [() => click('Close'), () => { const dimmed = document.querySelector('[data-slot="dialog-overlay"]')!; fireEvent.pointerDown(dimmed); fireEvent.click(dimmed) }, () => fireEvent.keyDown(popup()!, { key: 'Escape' })]
  for (const [at, close] of ways.entries()) {
    press(); expect(showing(), side).toBe(true); await screen.findByText('You sign in as employee@example.com')
    // The popup is named by the steps' own heading, and a press inside the box leaves it open.
    expect(screen.getByRole('dialog', { name: 'Connect your assistant' }), side).toBe(popup()); await moment(); fireEvent.pointerDown(steps()!); fireEvent.click(steps()!); expect(showing(), side).toBe(true)
    close(); expect([showing(), !!steps()], `${side} ${at}`).toEqual([false, false]); await moment()
  }
  press()
}
it('Home has no setup box: every signed-in person gets the Connect card, the one way to the steps, which opens them in a popup, and the welcome stays for everyone but a limited employee', async () => {
  for (const [viewer, welcome] of [['legacy', true], ['waiting-employee', true], ['waiting-owner', true], ['owner', true], ['employee', false]] as const) {
    mode = viewer; render(<Home />)
    const card = await screen.findByRole('button', { name: /^Connect your assistant/ })
    // Nothing is drawn or read until the card is pressed.
    expect([showing(), !!steps(), reads('setup').length, !!screen.queryByRole('region', { name: 'Make it yours' })], viewer).toEqual([false, false, 0, welcome])
    fireEvent.click(card); const copy = await screen.findByRole('button', { name: 'Copy' }); expect(copy.closest('[role="dialog"]'), viewer).toBe(popup())
    fireEvent.click(copy); await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(own.prompt.text))
    click('Close'); expect([showing(), !!steps()], viewer).toEqual([false, false]); await moment()
    if (viewer === 'owner') { await opensAndCloses(viewer); click('Close') }
    cleanup(); fetchMock.mockClear(); vi.mocked(navigator.clipboard.writeText).mockClear()
  }
// Five sides, each opening the popup, about 3 s alone, so a busy full run needs more than the 5 s default.
}, 20_000)
it('failed permissions withhold app cards, failed setup withholds the steps, and both support explicit retry', async () => {
  failed.add('apps'); render(<Home />); await screen.findByText('Your app access is unavailable.')
  expect(screen.queryByRole('link', { name: /Hello Example/ })).toBeNull()
  expect([steps(), screen.queryByRole('button', { name: /^Connect your assistant/ })]).toEqual([null, null])
  failed.delete('apps'); mode = 'employee'; catalogue = ['access']; own.apps = []; click('Retry apps')
  await screen.findByText('No business apps assigned. Contact your employer.')
  // Their way to the steps is the Connect card now, and Access stays theirs to open.
  expect(screen.getByRole('button', { name: /^Connect your assistant/ })).toBeTruthy(); expect(screen.getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(['/apps/access/'])
  expect(screen.queryByRole('region', { name: 'Make it yours' })).toBeNull()
  // When the steps can't be read, the popup says so and reads them again on Try again.
  failed.add('setup'); fireEvent.click(screen.getByRole('button', { name: /^Connect your assistant/ })); await screen.findByText("The steps couldn't load.")
  failed.delete('setup'); click('Try again'); await screen.findByText('You sign in as employee@example.com')
})
it('selected home cards and direct app pages obey the same current readback', async () => {
  mode = 'employee'; render(<Home />); await screen.findByRole('link', { name: /Hello Example/ })
  // Every other app this build holds is greyed; an install holds Hello alone, and AppList's tests cover a greyed card.
  for (const { title } of built.filter(app => !catalogue.includes(app.name))) { expect(screen.queryByRole('link', { name: new RegExp(title) }), title).toBeNull(); expect(screen.getByRole('button', { name: new RegExp(`^${title} No access`) }).getAttribute('aria-disabled'), title).toBe('true') }; cleanup()
  const page = () => render(<MemoryRouter initialEntries={['/apps/hello/']}><Routes><Route path="/apps/:name/" element={<AppPage />} /></Routes></MemoryRouter>)
  catalogue = ['access']; page(); await screen.findByText('App access denied'); expect(screen.queryByText('Enter your name')).toBeNull(); cleanup()
  // Before permissions start, the page opens whatever the list says.
  mode = 'waiting-employee'; page(); await screen.findByRole('heading', { name: 'Hello' }); cleanup(); mode = 'employee'
  failed.add('apps'); page(); await screen.findByText('App access unavailable'); failed.delete('apps'); catalogue = ['access', 'hello']; click('Retry access'); await screen.findByRole('heading', { name: 'Hello' })
})
it('unmounted responses cannot overwrite newer resource state', async () => {
  let fulfill: (value: Response) => void = () => {}, reject: (error: Error) => void = () => {}
  fetchMock.mockImplementationOnce(() => new Promise<Response>(resolve => { fulfill = resolve }))
  function Setup() { return <span>{useAccess('setup', setupSchema).data?.role}</span> }
  const mounted = render(<Setup />); mounted.unmount(); await act(async () => fulfill(Response.json(own)))
  fetchMock.mockImplementationOnce(() => new Promise<Response>((_resolve, fail) => { reject = fail }))
  const pending = render(<Setup />); pending.unmount(); await act(async () => reject(new Error('abort')))
  function Probe() { const resource = useAccess('apps', appAccessSchema); return <span>{resource.data?.state}</span> }
  render(<Probe />); await screen.findByText('current')
  expect(within(screen.getByText('current').parentElement!).getByText('current')).toBeTruthy()
})
