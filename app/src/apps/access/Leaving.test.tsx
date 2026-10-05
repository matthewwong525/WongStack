// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes, useLocation } from 'react-router'
import { App } from './App'
import type { Person, SavedKey, Status } from '../../lib/access'

// Leaving a page with changes not saved asks first. A shop where Hello changes things with Stripe.
const key = (id: string, title: string, changes: Partial<SavedKey> = {}): SavedKey => ({ id, title, levels: ['read', 'write'], saved: true, setup: false, usedBy: [], alone: false, ...changes })
const person = (email: string, changes: Partial<Person> = {}): Person => ({ email, status: 'active', settled: true, role: null, manager: false, apps: [], keys: {}, ...changes })
const status = (): Status => ({ origin: 'https://shop.example.com', ownerEmail: 'owner@shop.com', viewer: { email: 'owner@shop.com', owner: true }, environment: 'live', key: 'ready', started: true, imported: 0,
  keysStarted: true, kept: 0, apps: ['hello', 'tips'], appKeys: { hello: [{ id: 'stripe', need: 'write' }], tips: [] },
  keys: [key('stripe', 'Stripe', { usedBy: [{ app: 'hello', need: 'write' }] }), key('bank', 'Bank')],
  roles: [{ id: 'sales', name: 'Sales', apps: ['hello'], keys: { stripe: 'read' } }],
  people: [person('kim@shop.com', { apps: ['hello'], keys: { stripe: 'read' } }), person('lee@shop.com', { role: 'sales', apps: ['hello'], keys: { stripe: 'read' } })],
  work: [] })
let roster: Status
let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  roster = status()
  fetchMock = vi.fn(async (url: string) => {
    const path = url.replace('/api/access/', '')
    if (path === 'apps') return Response.json({ state: 'current', role: 'owner', apps: ['access', ...roster.apps], revision: 1 })
    if (path === 'setup') return Response.json({ role: 'owner', api: 'authenticated', identity: { email: 'owner@shop.com', subject: 'owner' }, apps: roster.apps,
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
const question = () => screen.queryByRole('heading', { name: 'Leave without saving?' })
const radio = (group: string, name: string) => within(screen.getByRole('group', { name: group })).getByRole('radio', { name }) as HTMLInputElement
// What the browser is told when the tab closes or reloads: true when it should ask.
const unloadAsks = () => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented }

it('asks before a changed page is left by its back link or Cancel, keeps the change on staying, and saves nothing on leaving', async () => {
  open('people/kim@shop.com'); await screen.findByRole('button', { name: 'Save access' })
  expect(unloadAsks()).toBe(false)
  fireEvent.click(radio('Stripe', 'Read & write')); expect(unloadAsks()).toBe(true)
  // The back link asks, and holds the page's controls while it does.
  fireEvent.click(screen.getByRole('link', { name: 'People' }))
  expect(question()).toBeTruthy(); expect(screen.getByText('Your changes on this page are not saved yet.')).toBeTruthy()
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Leave' }))
  expect(screen.getByRole('button', { name: 'Save access' }).closest('fieldset')!.disabled).toBe(true); expect(where()).toBe('/apps/access/people/kim@shop.com')
  // Staying keeps the change on the page.
  click('Keep editing'); expect(question()).toBeNull()
  expect(radio('Stripe', 'Read & write').checked).toBe(true); expect(screen.getByRole('button', { name: 'Save access' }).closest('fieldset')!.disabled).toBe(false)
  // Cancel asks too; leaving goes to the list and sends nothing.
  click('Cancel'); expect(question()).toBeTruthy(); click('Leave')
  await screen.findByRole('link', { name: 'Add person' }); expect(where()).toBe('/apps/access/'); expect(posts()).toHaveLength(0)
  expect(unloadAsks()).toBe(false); expect(screen.queryByText('Saved.')).toBeNull()
})
it('leaves at once from an untouched page, and from one put back the way it was', async () => {
  open('people/kim@shop.com'); await screen.findByRole('button', { name: 'Save access' })
  fireEvent.click(screen.getByRole('link', { name: 'People' })); await screen.findByRole('link', { name: 'Add person' }); expect(question()).toBeNull()
  cleanup(); open('people/kim@shop.com'); await screen.findByRole('button', { name: 'Save access' })
  // A level raised and lowered again, a key picked and put back to None, an app ticked and unticked: nothing to lose.
  fireEvent.click(radio('Stripe', 'Read & write')); fireEvent.click(radio('Stripe', 'Read'))
  fireEvent.click(radio('Bank', 'Read')); fireEvent.click(radio('Bank', 'None'))
  for (let turn = 0; turn < 2; turn++) fireEvent.click(screen.getByRole('checkbox', { name: 'Tip calculator' }))
  expect(unloadAsks()).toBe(false)
  click('Cancel'); await screen.findByRole('link', { name: 'Add person' }); expect(question()).toBeNull()
})
it('asks on every kind of page: a person, a new person, a role, a new role, an app and a key', async () => {
  const pages: [string, () => void][] = [
    ['people/lee@shop.com', () => fireEvent.change(screen.getByLabelText('Role'), { target: { value: '' } })],
    ['people/new', () => fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@shop.com' } })],
    ['roles/sales', () => fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Field sales' } })],
    ['roles/sales', () => fireEvent.click(screen.getByRole('checkbox', { name: 'Tip calculator' }))],
    ['roles/new', () => fireEvent.change(screen.getByLabelText('Start from a person'), { target: { value: 'kim@shop.com' } })],
    ['apps/hello', () => fireEvent.click(within(screen.getByRole('group', { name: 'kim@shop.com' })).getByRole('radio', { name: 'Read & write' }))],
    ['keys/stripe', () => fireEvent.click(radio('kim@shop.com', 'None'))],
  ]
  for (const [path, change] of pages) {
    const home = `/apps/access/${path.split('/')[0].replace('people', '')}`
    // Untouched, Cancel leaves at once.
    open(path); await screen.findByRole('button', { name: /^Save/ }); click('Cancel')
    await screen.findByRole('navigation', { name: 'Access views' }); expect([path, where(), !!question()]).toEqual([path, home, false]); cleanup()
    // Changed, it asks; staying keeps the page, leaving goes to its list.
    open(path); await screen.findByRole('button', { name: /^Save/ }); change(); click('Cancel')
    expect([path, where(), !!question()]).toEqual([path, `/apps/access/${path}`, true])
    click('Keep editing'); expect(question()).toBeNull(); click('Cancel'); click('Leave')
    await screen.findByRole('navigation', { name: 'Access views' }); expect([path, where()]).toEqual([path, home]); cleanup()
  }
  expect(posts()).toHaveLength(0)
})
it('where the router can hold a move, the browser Back button and any link ask too, and a save passes without asking', async () => {
  const router = createMemoryRouter([{ path: '/apps/:name/*', element: <App /> }],
    { initialEntries: ['/apps/access/', '/apps/access/people/kim@shop.com'], initialIndex: 1 })
  const at = () => router.state.location.pathname
  render(<RouterProvider router={router} />); await screen.findByRole('button', { name: 'Save access' })
  fireEvent.click(radio('Stripe', 'Read & write')); expect(unloadAsks()).toBe(true)
  // Back is held: the page stays, with its change, until the owner answers.
  await act(async () => { await router.navigate(-1) })
  expect(question()).toBeTruthy(); expect(at()).toBe('/apps/access/people/kim@shop.com')
  click('Keep editing'); expect(question()).toBeNull(); expect(radio('Stripe', 'Read & write').checked).toBe(true)
  // The page's own links are held the same way, by one question.
  click('Cancel'); expect(screen.getAllByRole('heading', { name: 'Leave without saving?' })).toHaveLength(1); click('Keep editing')
  fireEvent.click(screen.getByRole('link', { name: 'People' })); expect(question()).toBeTruthy(); expect(at()).toBe('/apps/access/people/kim@shop.com')
  click('Leave'); await screen.findByRole('link', { name: 'Add person' }); expect(at()).toBe('/apps/access/'); expect(posts()).toHaveLength(0)
  // An untouched page is never held.
  await act(async () => { await router.navigate('/apps/access/people/kim@shop.com') }); await screen.findByRole('button', { name: 'Save access' })
  await act(async () => { await router.navigate('/apps/access/roles') }); await screen.findByRole('region', { name: 'Roles' }); expect(question()).toBeNull()
  // A save is the owner's answer already: it lands on the list with its box, and no question.
  await act(async () => { await router.navigate('/apps/access/people/kim@shop.com') }); await screen.findByRole('button', { name: 'Save access' })
  fireEvent.click(radio('Stripe', 'Read & write')); click('Save access')
  await screen.findByText('Saved.'); expect(at()).toBe('/apps/access/'); expect(question()).toBeNull(); expect(posts()).toHaveLength(1)
})
