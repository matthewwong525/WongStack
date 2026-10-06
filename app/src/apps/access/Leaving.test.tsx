// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes, useLocation } from 'react-router'
import { App } from './App'
import type { Area, Person, SavedKey, Status } from '../../lib/access'

// Closing an opened person, role, app or key with changes not saved asks first, in a popup over its panel.
// A shop where Hello changes things with Stripe, and so does its one skill, Refund a customer. The tip calculator uses no key.
const key = (id: string, title: string, changes: Partial<SavedKey> = {}): SavedKey => ({ id, title, levels: ['read', 'write'], saved: true, setup: false, usedBy: [], alone: false, ...changes })
const area = (id: string, title: string): Area => ({ id, title, description: `${title} for the shop`, screen: true })
const person = (email: string, changes: Partial<Person> = {}): Person => ({ email, status: 'active', settled: true, role: null, manager: false, apps: {}, keys: {}, ...changes })
const hello = () => ({ apps: { hello: 'write' as const }, keys: { stripe: 'read' as const } })
const status = (): Status => ({ ownerEmail: 'owner@shop.com', viewer: { email: 'owner@shop.com', owner: true }, environment: 'live', key: 'ready', started: true, imported: 0,
  keysStarted: true, kept: 0, appKeys: { hello: [{ id: 'stripe', need: 'write' }], tips: [] },
  areas: [area('hello', 'Hello'), area('tips', 'Tip calculator')],
  skills: [{ id: 'refund', title: 'Refund a customer', areas: { hello: 'write' }, keys: { stripe: 'write' } }],
  keys: [key('stripe', 'Stripe', { usedBy: [{ app: 'hello', need: 'write' }] }), key('bank', 'Bank')],
  roles: [{ id: 'sales', name: 'Sales', ...hello() }],
  people: [person('kim@shop.com', hello()), person('lee@shop.com', { role: 'sales', ...hello() })],
  work: [] })
let roster: Status
let fetchMock: ReturnType<typeof vi.fn>
// The apps a person can open: every area here has a screen.
const screens = () => roster.areas.map(item => item.id)
beforeEach(() => {
  roster = status()
  fetchMock = vi.fn(async (url: string) => {
    const path = url.replace('/api/access/', '')
    if (path === 'apps') return Response.json({ state: 'current', role: 'owner', apps: ['access', ...screens()], revision: 1 })
    if (path === 'setup') return Response.json({ role: 'owner', api: 'authenticated', identity: { email: 'owner@shop.com', subject: 'owner' }, apps: screens(),
      repository: 'manual_provider_setup', memory: 'independent_operator_setup', prompt: { state: 'unavailable', message: 'Not on this preview' } })
    return Response.json(roster)
  })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const Where = () => <span data-testid="where">{decodeURIComponent(useLocation().pathname)}</span>
const open = (path = '') => render(<MemoryRouter initialEntries={[`/apps/access/${path}`]}><Where /><Routes><Route path="/apps/:name/*" element={<App />} /></Routes></MemoryRouter>)
const where = () => screen.getByTestId('where').textContent
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
const question = () => screen.queryByRole('alertdialog', { name: 'Leave without saving?' })
// The panel an opened item sits in, and that none is open any more.
const panel = (name: string) => screen.getByRole('dialog', { name })
const closed = () => waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
// The parts start listening for a press outside them, and hand the keyboard back, a moment after they open or close.
const moment = () => act(async () => { await new Promise(resolve => setTimeout(resolve)) })
// One of the five views in the switch, by its title: its count follows.
const tab = (title: string) => within(screen.getByRole('navigation', { name: 'Access views' })).getByRole('link', { name: new RegExp(`^${title} \\d+$`) })
const radio = (group: string, name: string) => within(screen.getByRole('group', { name: group })).getByRole('radio', { name }) as HTMLInputElement
// A starting point in an opened person or role, and whether it shows as pressed: one press fills in what it needs, and saves nothing.
const start = (name: string) => within(screen.getByRole('group', { name: 'Start from' })).getByRole('button', { name })
const pressed = (name: string) => start(name).getAttribute('aria-pressed')
// What the browser is told when the tab closes or reloads: true when it should ask.
const unloadAsks = () => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented }
// A press with the pointer: the panel answers one beside it once the click lands.
const press = (on: Element) => { fireEvent.pointerDown(on); fireEvent.click(on) }
const KIM = '/apps/access/people/kim@shop.com'

it('closes an untouched panel at once by its ✕, Escape, Cancel or a press on the page beside it, back to its view, with its row marked while it is open', async () => {
  const ways = [() => click('Close'), () => fireEvent.keyDown(panel('Sales'), { key: 'Escape' }), () => click('Cancel'), () => press(screen.getByRole('heading', { name: 'Access' }))]
  for (const [at, close] of ways.entries()) {
    open('roles/sales'); await screen.findByRole('button', { name: 'Save role' }); await moment()
    // The list stays in place beside the panel, with the open role's row marked.
    const marked = screen.getByRole('table', { name: 'Roles' }).querySelector<HTMLElement>('tr[aria-current="true"]')!
    expect(within(marked).getByRole('link', { name: 'Sales' }), `${at}`).toBeTruthy()
    // A press inside the panel leaves it open, and so does the keyboard moving to the page beside it.
    // A press on a row beside it is the row's own to answer: the panel does not also go back to its view.
    press(panel('Sales')); fireEvent.focusIn(tab('People')); press(within(marked).getByText('1 person')); await moment()
    expect([!!panel('Sales'), where()], `${at}`).toEqual([true, '/apps/access/roles/sales'])
    close(); await closed()
    expect([where(), !!question(), document.querySelector('tr[aria-current]')], `${at}`).toEqual(['/apps/access/roles', false, null]); cleanup()
  }
  expect(posts()).toHaveLength(0)
})
it('asks in a popup before a panel changed only by a press in Start from is closed by its ✕, Escape or Cancel, keeps the change on staying, and saves nothing on leaving', async () => {
  open('people/kim@shop.com'); await screen.findByRole('button', { name: 'Save access' })
  expect(unloadAsks()).toBe(false); expect(screen.queryByText('Not saved yet')).toBeNull()
  // One press is a change that waits to be saved: the panel says so above its buttons, and nothing is sent.
  fireEvent.click(start('Tip calculator')); expect(unloadAsks()).toBe(true)
  expect(screen.getByText('Not saved yet').compareDocumentPosition(screen.getByRole('button', { name: 'Save access' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); expect(posts()).toHaveLength(0)
  // Cancel asks over the panel: the way out is focused first, and the action is the one solid button.
  const cancel = screen.getByRole('button', { name: 'Cancel' }); cancel.focus(); fireEvent.click(cancel)
  const ask = within(question()!); expect(ask.getByText('Your changes here are not saved yet.')).toBeTruthy()
  const [stay, leave] = [ask.getByRole('button', { name: 'Keep editing' }), ask.getByRole('button', { name: 'Leave' })]
  await moment(); expect([document.activeElement, stay.getAttribute('data-variant'), leave.getAttribute('data-variant')]).toEqual([stay, 'outline', 'default'])
  // A click on the dimmed page round the question does not answer it.
  const dimmed = document.querySelector('[data-slot="alert-dialog-overlay"]')!; fireEvent.pointerDown(dimmed); fireEvent.click(dimmed)
  expect([!!question(), where()]).toEqual([true, KIM])
  // Staying keeps the change in the panel, and the keyboard goes back to where it was in it.
  click('Keep editing'); expect(question()).toBeNull(); await moment()
  expect([document.activeElement, panel('kim@shop.com').contains(cancel)]).toEqual([cancel, true])
  expect([radio('Tip calculator', 'Look up').checked, pressed('Tip calculator'), screen.getByRole('button', { name: 'Save access' }).closest('fieldset')!.disabled]).toEqual([true, 'true', false])
  // The ✕ asks too, and Escape answers the question the same way as Keep editing: the panel stays.
  click('Close'); expect(question()).toBeTruthy(); fireEvent.keyDown(question()!, { key: 'Escape' })
  expect([question(), where(), radio('Tip calculator', 'Look up').checked]).toEqual([null, KIM, true]); await moment()
  // Escape on the panel asks as well; leaving goes to the list and sends nothing.
  fireEvent.keyDown(panel('kim@shop.com'), { key: 'Escape' }); expect(question()).toBeTruthy(); click('Leave')
  await closed(); expect(where()).toBe('/apps/access/'); expect(posts()).toHaveLength(0)
  expect(unloadAsks()).toBe(false); expect(screen.queryByText('Saved.')).toBeNull()
})
it("a view's link asks before a changed panel is left, goes where it led on leaving, and leaves at once from an untouched one", async () => {
  open('people/kim@shop.com'); await screen.findByRole('button', { name: 'Save access' })
  // The five views show beside the panel, each with its count.
  expect(within(screen.getByRole('navigation', { name: 'Access views' })).getAllByRole('link').map(link => link.textContent)).toEqual(['People 3', 'Roles 1', 'Apps 2', 'Skills 1', 'Keys 2'])
  // A skill pressed in Start from raises Stripe to what it needs: that alone is a change to lose.
  fireEvent.click(start('Refund a customer')); fireEvent.click(tab('Roles'))
  expect(question()).toBeTruthy(); expect(where()).toBe(KIM)
  // Staying keeps the change; leaving goes to the view the link named, and sends nothing.
  click('Keep editing'); expect([radio('Stripe', 'Read & write').checked, pressed('Refund a customer')]).toEqual([true, 'true'])
  fireEvent.click(tab('Keys')); expect(question()).toBeTruthy(); click('Leave')
  await screen.findByRole('table', { name: 'Keys' }); expect(where()).toBe('/apps/access/keys'); expect(posts()).toHaveLength(0)
  cleanup(); open('people/kim@shop.com'); await screen.findByRole('button', { name: 'Save access' })
  fireEvent.click(tab('Roles')); await screen.findByRole('table', { name: 'Roles' }); expect(question()).toBeNull(); expect(where()).toBe('/apps/access/roles')
})
it('closes at once a panel put back the way it was', async () => {
  open('people/kim@shop.com'); await screen.findByRole('button', { name: 'Save access' })
  // A level raised and lowered again, a key and an area picked and put back to None, a starting point pressed and pressed again: nothing to lose.
  fireEvent.click(radio('Stripe', 'Read & write')); expect(screen.getByText('Not saved yet')).toBeTruthy(); fireEvent.click(radio('Stripe', 'Read'))
  fireEvent.click(radio('Bank', 'Read')); fireEvent.click(radio('Bank', 'None'))
  fireEvent.click(radio('Tip calculator', 'Look up & change')); fireEvent.click(radio('Tip calculator', 'None'))
  for (const name of ['Tip calculator', 'Refund a customer']) { fireEvent.click(start(name)); expect([name, pressed(name), unloadAsks()]).toEqual([name, 'true', true]); fireEvent.click(start(name)) }
  expect([pressed('Tip calculator'), pressed('Refund a customer'), unloadAsks()]).toEqual(['false', 'false', false]); expect(screen.queryByText('Not saved yet')).toBeNull()
  click('Cancel'); await closed(); expect([question(), where()]).toEqual([null, '/apps/access/'])
})
it('asks on every kind of opened item: a person, a new person, a role, a new role, an app and a key', async () => {
  const pages: [string, () => void][] = [
    ['people/lee@shop.com', () => fireEvent.change(screen.getByLabelText('Role'), { target: { value: '' } })],
    ['people/new', () => fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@shop.com' } })],
    ['roles/sales', () => fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Field sales' } })],
    ['people/kim@shop.com', () => fireEvent.click(radio('Hello', 'Look up'))],
    ['roles/sales', () => fireEvent.click(radio('Tip calculator', 'Look up'))],
    ['roles/sales', () => fireEvent.click(start('Refund a customer'))],
    ['roles/new', () => fireEvent.click(start('Tip calculator'))],
    ['roles/new', () => fireEvent.change(screen.getByLabelText('Start from a person'), { target: { value: 'kim@shop.com' } })],
    ['apps/hello', () => fireEvent.click(within(screen.getByRole('group', { name: 'kim@shop.com' })).getByRole('radio', { name: 'Read & write' }))],
    ['keys/stripe', () => fireEvent.click(radio('kim@shop.com', 'None'))],
  ]
  for (const [path, change] of pages) {
    const home = `/apps/access/${path.split('/')[0].replace('people', '')}`
    // Untouched, Cancel closes at once, and the list was there all along.
    open(path); await screen.findByRole('button', { name: /^Save/ }); expect(screen.getByRole('table'), path).toBeTruthy(); click('Cancel')
    await closed(); expect([path, where(), !!question()]).toEqual([path, home, false]); cleanup()
    // Changed, it asks; staying keeps the panel, leaving goes to its list.
    open(path); await screen.findByRole('button', { name: /^Save/ }); change(); click('Cancel')
    expect([path, where(), !!question()]).toEqual([path, `/apps/access/${path}`, true])
    click('Keep editing'); expect(question()).toBeNull(); click('Cancel'); click('Leave')
    await closed(); expect([path, where()]).toEqual([path, home]); cleanup()
  }
  expect(posts()).toHaveLength(0)
})
it('where the router can hold a move, the browser Back button and any link ask too, and a save passes without asking', async () => {
  const router = createMemoryRouter([{ path: '/apps/:name/*', element: <App /> }],
    { initialEntries: ['/apps/access/', '/apps/access/people/kim@shop.com'], initialIndex: 1 })
  const at = () => router.state.location.pathname
  render(<RouterProvider router={router} />); await screen.findByRole('button', { name: 'Save access' })
  // A press in Start from is the only change.
  fireEvent.click(start('Tip calculator')); expect(unloadAsks()).toBe(true)
  // Back is held: the panel stays, with its change, until the owner answers.
  await act(async () => { await router.navigate(-1) })
  expect(question()).toBeTruthy(); expect(at()).toBe(KIM)
  click('Keep editing'); expect(question()).toBeNull(); expect([radio('Tip calculator', 'Look up').checked, pressed('Tip calculator')]).toEqual([true, 'true'])
  // The panel's own ways out and the views' links are held the same way, by one question.
  click('Cancel'); expect(screen.getAllByRole('alertdialog')).toHaveLength(1); click('Keep editing')
  fireEvent.click(tab('Roles')); expect(screen.getAllByRole('alertdialog')).toHaveLength(1); expect(at()).toBe(KIM); click('Keep editing')
  click('Close'); expect(question()).toBeTruthy(); expect(at()).toBe(KIM)
  click('Leave'); await closed(); expect(at()).toBe('/apps/access/'); expect(posts()).toHaveLength(0)
  // An untouched panel is never held.
  await act(async () => { await router.navigate('/apps/access/people/kim@shop.com') }); await screen.findByRole('button', { name: 'Save access' })
  await act(async () => { await router.navigate('/apps/access/roles') }); await screen.findByRole('region', { name: 'Roles' }); expect(question()).toBeNull()
  // A save is the owner's answer already: it lands on the list with its box, and no question.
  await act(async () => { await router.navigate('/apps/access/people/kim@shop.com') }); await screen.findByRole('button', { name: 'Save access' })
  fireEvent.click(radio('Stripe', 'Read & write')); click('Save access')
  await screen.findByText('Saved.'); expect(at()).toBe('/apps/access/'); expect(question()).toBeNull(); expect(posts()).toHaveLength(1)
})
