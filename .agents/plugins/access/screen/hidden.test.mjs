// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from './test-dom.mjs'

// A project with only some slots: the status leaves out the rest, and the page hides it. No `apps`, no ticks; no
// `keys`, no levels or Services; no `key`, no sign-in state; no `project`, no Project step.
const person = (email, changes = {}) => ({ email, status: 'active', settled: false, role: null, ...changes })
const bare = () => ({ ownerEmail: 'owner@shop.com', viewer: { email: 'owner@shop.com', owner: true }, environment: 'live', started: true, imported: 0,
  roles: [{ id: 'sales', name: 'Sales' }], people: [person('kim@shop.com'), person('lee@shop.com', { role: 'sales' })] })
let roster
let fetchMock
beforeEach(() => {
  roster = bare()
  fetchMock = vi.fn(async (url, init) => {
    const path = url.replace('/api/access/', '')
    if (init?.method === 'POST') return Response.json(roster)
    if (path === 'apps') return Response.json({ state: 'current', role: 'owner', manages: true, apps: ['access'], revision: 1 })
    if (path === 'pushers') return Response.json({ state: 'not_github', pushers: [] })
    return Response.json(roster)
  })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const open = (path = '') => render(`/apps/access/${path}`)
const tabs = () => within(screen.getByRole('navigation', { name: 'Access views' })).getAllByRole('link').map(link => link.textContent)
const heads = (name) => within(screen.getByRole('table', { name })).getAllByRole('columnheader').map(cell => cell.textContent)
const cells = (email) => [...within(screen.getByRole('table', { name: 'People' })).getByText(email).closest('tr').querySelectorAll('td')].map(cell => cell.textContent)
// The named groups in an opened panel: Apps, Keys, Project, and a group per key level.
const groups = () => screen.queryAllByRole('group').map(group => group.querySelector(':scope > legend')?.textContent).filter(Boolean)
const sent = (path) => fetchMock.mock.calls.filter(([url, init]) => url.endsWith(path) && init?.method === 'POST').map(([, init]) => JSON.parse(init.body))

it('with no apps, keys, sign-in list or project: no set column, no Services, rows say Listed, and a removal says only what happens here', async () => {
  await open(); await screen.findByRole('table', { name: 'People' })
  expect(tabs()).toEqual(['People 3', 'Roles 1'])
  expect(heads('People')).toEqual(['Person', 'Sign-in', 'Role', 'Actions'])
  expect(cells('kim@shop.com').slice(0, 2)).toEqual(['kim@shop.com', 'Listed'])
  // No notice for who an update unticked, and no row offers a sign-in retry.
  expect(screen.queryByText('Unticked in this update')).toBeNull()
  await fireEvent.keyDown(screen.getByLabelText('Actions for kim@shop.com'), { key: 'Enter' })
  expect(within(screen.getByRole('menu')).getAllByRole('menuitem').map(item => item.textContent)).toEqual(['Open', 'Remove'])
  await fireEvent.click(within(screen.getByRole('menu')).getByRole('menuitem', { name: 'Remove' }))
  const ask = screen.getByRole('alertdialog', { name: 'Remove kim@shop.com?' }).textContent
  expect(ask).toMatch(/They are blocked at once\./); expect(ask).not.toMatch(/project/)
  cleanup()
  // Roles have no set column either, and Services is not there at all: its old address shows People.
  await open('roles'); await screen.findByRole('table', { name: 'Roles' }); expect(heads('Roles')).toEqual(['Role', 'People'])
  cleanup(); await open('services'); await screen.findByRole('table', { name: 'People' }); expect(tabs()).toEqual(['People 3', 'Roles 1'])
})

it('an opened person or role has no ticks, levels or project step, and a save sends no apps or keys', async () => {
  await open('people/kim@shop.com'); await screen.findByRole('dialog', { name: 'kim@shop.com' })
  expect([screen.queryAllByRole('checkbox'), screen.queryAllByRole('radio'), groups()]).toEqual([[], [], []])
  expect(screen.getByText('Listed', { selector: 'p' })).toBeTruthy()
  await fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'sales' } }); await fireEvent.click(screen.getByRole('button', { name: 'Save access' }))
  await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'kim@shop.com', removed: false, role: 'sales' }])
  cleanup(); await open('people/new'); await screen.findByRole('dialog', { name: 'Add person' })
  await fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bo@shop.com' } }); await fireEvent.click(screen.getByRole('button', { name: 'Save access' }))
  await waitFor(() => expect(sent('people')).toHaveLength(2))
  expect(sent('people')[1]).toEqual({ email: 'bo@shop.com', removed: false, role: null })
  cleanup(); await open('roles/new'); await screen.findByRole('dialog', { name: 'Add role' })
  expect([screen.queryAllByRole('checkbox'), screen.queryAllByRole('radio'), groups()]).toEqual([[], [], []])
})

it('with apps alone: ticks and the Apps column, no keys, and saves leave keys out', async () => {
  roster.apps = [{ id: 'hello', title: 'Hello', description: '' }]; roster.unticked = { people: [], roles: [] }
  roster.people[0].apps = ['hello']; roster.key = 'none'
  await open(); await screen.findByRole('table', { name: 'People' })
  expect([tabs(), heads('People')]).toEqual([['People 3', 'Roles 1'], ['Person', 'Sign-in', 'Role', 'Apps', 'Actions']])
  expect([cells('kim@shop.com')[1], cells('kim@shop.com')[3]]).toEqual(['Listed', '1 app'])
  cleanup(); await open('people/kim@shop.com'); await screen.findByRole('dialog', { name: 'kim@shop.com' })
  expect(groups()).toEqual(['Apps'])
  await fireEvent.click(screen.getByRole('checkbox', { name: 'Hello' })); await fireEvent.click(screen.getByRole('button', { name: 'Save access' }))
  await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'kim@shop.com', removed: false, role: null, apps: { hello: false } }])
})

it('with keys alone: levels, Services and the Keys column, no ticks, and saves leave apps out', async () => {
  roster.keys = [{ id: 'stripe', title: 'Stripe', levels: ['read', 'write'], saved: true }]; roster.people[0].keys = { stripe: 'read' }
  await open(); await screen.findByRole('table', { name: 'People' })
  expect([tabs(), heads('People')]).toEqual([['People 3', 'Roles 1', 'Services 1'], ['Person', 'Sign-in', 'Role', 'Keys', 'Actions']])
  expect(cells('kim@shop.com')[3]).toBe('1 key')
  cleanup(); await open('people/kim@shop.com'); await screen.findByRole('dialog', { name: 'kim@shop.com' })
  expect([screen.queryAllByRole('checkbox'), groups()]).toEqual([[], ['Keys', 'Stripe · Saved']])
  await fireEvent.click(screen.getByRole('radio', { name: 'Read & write' })); await fireEvent.click(screen.getByRole('button', { name: 'Save access' }))
  await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'kim@shop.com', removed: false, role: null, keys: { stripe: 'write' } }])
})
