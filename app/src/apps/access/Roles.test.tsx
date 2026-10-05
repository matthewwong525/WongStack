// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { App } from './App'
import type { Person, SavedKey, Status } from '../../lib/access'

// A shop with three apps: Hello changes things with Stripe, payroll with Bank, and the tip calculator uses no key.
const key = (id: string, title: string, changes: Partial<SavedKey> = {}): SavedKey => ({ id, title, levels: ['read', 'write'], saved: true, setup: false, usedBy: [], alone: false, ...changes })
const person = (email: string, changes: Partial<Person> = {}): Person => ({ email, status: 'active', settled: true, role: null, manager: false, apps: [], keys: {}, ...changes })
const sales = () => ({ apps: ['hello', 'tips'], keys: { stripe: 'read' as const } })
const status = (): Status => ({ ownerEmail: 'owner@shop.com', viewer: { email: 'owner@shop.com', owner: true }, environment: 'live', key: 'ready', started: true, imported: 0,
  keysStarted: true, kept: 0, apps: ['hello', 'payroll', 'tips'],
  appKeys: { hello: [{ id: 'stripe', need: 'write' }], payroll: [{ id: 'bank', need: 'write' }], tips: [] },
  keys: [key('stripe', 'Stripe', { usedBy: [{ app: 'hello', need: 'write' }] }), key('bank', 'Bank', { usedBy: [{ app: 'payroll', need: 'write' }] }),
    key('cloudflare', 'Cloudflare', { levels: ['read'], setup: true, alone: true })],
  roles: [{ id: 'office', name: 'Office', apps: [], keys: {} }, { id: 'sales', name: 'Sales', ...sales() }],
  people: [person('gone@shop.com', { status: 'removed' }), person('kim@shop.com', { apps: ['hello'], keys: { stripe: 'read', cloudflare: 'read' } }),
    person('lee@shop.com', { role: 'sales', ...sales() }), person('sam@shop.com', { role: 'sales', ...sales() })],
  work: [] })
let roster: Status
let failed: Set<string>
let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  roster = status(); failed = new Set()
  fetchMock = vi.fn(async (url: string) => {
    const path = url.replace('/api/access/', '')
    if (failed.has(path)) return Response.json({ code: 'unavailable' }, { status: 503 })
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
const posts = (path: string) => fetchMock.mock.calls.filter(([url, init]) => url.endsWith(path) && init?.method === 'POST')
const sent = (path: string) => posts(path).map(([, init]) => JSON.parse(init.body))
const reads = (path: string) => fetchMock.mock.calls.filter(([url, init]) => url.endsWith(path) && init?.method !== 'POST')
const checked = (inputs: HTMLElement[]) => inputs.filter(input => (input as HTMLInputElement).checked).map(input => input.parentElement!.textContent)
// One role's row in the list, one app's tick with the lines under it, and one key's level choice by the name in its legend.
const row = async (name: string) => within((await screen.findByText(name)).closest('tr')!)
const app = (name: string) => within(screen.getByRole('checkbox', { name }).closest('div')!)
const ticks = () => checked(screen.getAllByRole('checkbox'))
const level = (name: string) => within(screen.getByRole('group', { name }))
const chosen = (name: string) => checked(level(name).getAllByRole('radio'))
const named = () => screen.getByLabelText('Name') as HTMLInputElement
const labels = (name: string, box: ReturnType<typeof within>) => within(box.getByRole('list', { name })).getAllByRole('listitem').map(item => item.textContent)
const tick = (name: string) => fireEvent.click(screen.getByRole('checkbox', { name }))
const held = (name: string, key: string) => checked(within(app(name).getByRole('group', { name: key })).getAllByRole('radio'))
const raise = 'Hello also changes things. Pick Read & write to let it.'

it('says what a role is for when there are none yet, with one way to add the first', async () => {
  roster.roles = []; roster.people = [person('kim@shop.com')]
  open('roles'); const add = await screen.findByRole('link', { name: 'Add role' })
  expect(add.getAttribute('href')).toBe('/apps/access/roles/new')
  const purpose = screen.getByText('A role saves a set of apps and key levels to give to several people.')
  expect(screen.getByText('No roles yet.').compareDocumentPosition(purpose) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  // The add button sits beside the title, above both lines, and no empty table is drawn.
  expect(add.compareDocumentPosition(screen.getByText('No roles yet.')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(add.closest('div')!.querySelector('h2')!.textContent).toBe('Roles'); expect(screen.queryByRole('table')).toBeNull()
})
it('lists each role with its apps, its levels and who holds it as labels, and changes one on its own page', async () => {
  open(); fireEvent.click(await screen.findByRole('link', { name: /^Roles/ }))
  expect(within(await screen.findByRole('table', { name: 'Roles' })).getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Role', 'Apps', 'Keys', 'People'])
  const office = await row('Office')
  expect(office.getByText('No apps')).toBeTruthy(); expect(office.getByText('No keys')).toBeTruthy(); expect(office.getByText('Nobody yet')).toBeTruthy()
  expect(office.queryByRole('listitem')).toBeNull()
  // Apps, key levels and holders are labels; the line marked "!" says where an app can't do its job yet.
  const sales = await row('Sales')
  expect([labels('Apps', sales), labels('Keys', sales), labels('People', sales)]).toEqual([['Hello', 'Tip calculator'], ['Stripe Read'], ['lee@shop.com', 'sam@shop.com']])
  expect(labels("Can't do yet", sales)).toEqual(['! Hello can look up, not change'])
  expect(screen.queryByText('No roles yet.')).toBeNull(); expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull()
  expect(sales.getByRole('link', { name: 'Sales' }).getAttribute('href')).toBe('/apps/access/roles/sales')
  // A click anywhere on the row opens the role.
  fireEvent.click(sales.getByText('Stripe Read'))
  await screen.findByRole('heading', { name: 'Change role' }); expect(where()).toBe('/apps/access/roles/sales')
  expect(screen.getByRole('link', { name: 'Roles' }).getAttribute('href')).toBe('/apps/access/roles'); expect(screen.getByRole('navigation', { name: 'Access views' })).toBeTruthy()
  expect(named().value).toBe('Sales'); expect(screen.queryByLabelText('Start from a person')).toBeNull()
  // The same ticks and levels as on a person's page, and who a save will reach.
  expect(ticks()).toEqual(['Hello', 'Tip calculator']); expect([held('Hello', 'Stripe'), chosen('Bank'), chosen('Cloudflare')]).toEqual([['Read'], ['None'], ['None']])
  expect(app('Hello').getByText(raise)).toBeTruthy(); expect(app('payroll').getByText('uses Bank')).toBeTruthy()
  const other = within(screen.getByRole('group', { name: 'Keys no ticked app uses' }))
  expect(other.getAllByRole('group').map(group => group.querySelector('legend')!.textContent)).toEqual(['Bank', 'Cloudflare'])
  expect(level('Cloudflare').getByText('look-ups, no app needed')).toBeTruthy()
  expect(screen.getByText('People: lee@shop.com, sam@shop.com')).toBeTruthy()
  fireEvent.change(named(), { target: { value: 'Field sales' } })
  tick('payroll'); expect(held('payroll', 'Bank')).toEqual(['Read'])
  fireEvent.click(level('Bank').getByRole('radio', { name: 'Read & write' }))
  click('Save role'); await screen.findByText('Saved.')
  expect(sent('roles')).toEqual([{ id: 'sales', name: 'Field sales', apps: ['hello', 'tips', 'payroll'], keys: { stripe: 'read', bank: 'write', cloudflare: null } }])
  expect(where()).toBe('/apps/access/roles')
})
it("sets a role's key level under the app's tick: the tick gives Read, a raise saves Read & write, and a shared key follows", async () => {
  roster.keys[0].usedBy.push({ app: 'tips', need: 'read' }); roster.appKeys.tips = [{ id: 'stripe', need: 'read' }]
  open('roles/office'); await screen.findByRole('heading', { name: 'Change role' })
  // Nothing is ticked: no app shows a level, and each says what it uses.
  expect(screen.getByRole('group', { name: 'Apps' }).querySelector('input[type="radio"]')).toBeNull()
  expect(app('Hello').getByText('uses Stripe')).toBeTruthy(); expect(chosen('Stripe')).toEqual(['None'])
  tick('Hello'); expect(held('Hello', 'Stripe')).toEqual(['Read']); expect(app('Hello').getByText(raise)).toBeTruthy()
  tick('Tip calculator'); expect(held('Tip calculator', 'Stripe')).toEqual(['Read'])
  fireEvent.click(within(app('Hello').getByRole('group', { name: 'Stripe' })).getByRole('radio', { name: 'Read & write' }))
  expect([held('Hello', 'Stripe'), held('Tip calculator', 'Stripe')]).toEqual([['Read & write'], ['Read & write']])
  expect(app('Hello').queryByText(raise)).toBeNull(); expect(app('Tip calculator').getByText('One level, shared with Hello')).toBeTruthy()
  // An unticked app hides its picker, and takes no level with it.
  tick('Tip calculator'); expect(app('Tip calculator').queryByRole('radio')).toBeNull(); expect(held('Hello', 'Stripe')).toEqual(['Read & write'])
  click('Save role'); await screen.findByText('Saved.')
  expect(sent('roles')).toEqual([{ id: 'office', name: 'Office', apps: ['hello'], keys: { stripe: 'write', bank: null, cloudflare: null } }])
})
it('adds a role, which can start from what one person has now', async () => {
  open('roles'); fireEvent.click(await screen.findByRole('link', { name: 'Add role' }))
  await screen.findByRole('heading', { name: 'Add role' }); expect(where()).toBe('/apps/access/roles/new')
  expect(document.activeElement).toBe(named())
  expect(screen.getByText('People: nobody yet')).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Remove role' })).toBeNull()
  // Only people who can sign in are offered.
  const from = screen.getByLabelText('Start from a person')
  expect(within(from).getAllByRole('option').map(option => option.textContent)).toEqual(['Nobody', 'kim@shop.com', 'lee@shop.com', 'sam@shop.com'])
  expect(ticks()).toEqual([])
  // A person who holds a role starts the new role from what that role gives them.
  fireEvent.change(from, { target: { value: 'lee@shop.com' } })
  expect(ticks()).toEqual(['Hello', 'Tip calculator']); expect([held('Hello', 'Stripe'), chosen('Cloudflare')]).toEqual([['Read'], ['None']])
  fireEvent.change(from, { target: { value: '' } })
  expect(ticks()).toEqual([]); expect(chosen('Stripe')).toEqual(['None'])
  fireEvent.change(from, { target: { value: 'kim@shop.com' } })
  expect(ticks()).toEqual(['Hello']); expect([chosen('Stripe'), chosen('Cloudflare')]).toEqual([['Read'], ['Read']])
  fireEvent.change(named(), { target: { value: 'Helpers' } }); click('Save role'); await screen.findByText('Saved.')
  expect(sent('roles')).toEqual([{ name: 'Helpers', apps: ['hello'], keys: { stripe: 'read', bank: null, cloudflare: 'read' } }])
})
it('asks before removing a role, says its people keep their access, and keeps the page as it was on Cancel', async () => {
  open('roles/sales'); await screen.findByRole('heading', { name: 'Change role' })
  fireEvent.change(named(), { target: { value: 'Field sales' } }); click('Remove role')
  expect(screen.getByRole('heading', { name: 'Remove Sales?' })).toBeTruthy()
  expect(screen.getByText('Its people keep the access they have now, as their own set.')).toBeTruthy()
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove role' })); expect(screen.queryByRole('button', { name: 'Save role' })).toBeNull()
  // The four views stay while it asks.
  expect(screen.getByRole('navigation', { name: 'Access views' })).toBeTruthy()
  click('Cancel'); expect(named().value).toBe('Field sales'); expect(posts('roles')).toHaveLength(0)
  click('Remove role'); click('Remove role'); await screen.findByText('Saved.')
  expect(sent('roles')).toEqual([{ id: 'sales', removed: true }]); expect(where()).toBe('/apps/access/roles')
})
it('a role save that did not finish says so and reads the list again', async () => {
  open('roles/office'); await screen.findByRole('button', { name: 'Save role' }); failed.add('roles'); click('Save role')
  await screen.findByText('That did not finish. Check the list below before trying again.')
  await row('Office'); expect(where()).toBe('/apps/access/roles')
  expect(posts('roles')).toHaveLength(1); expect(reads('status').length).toBeGreaterThan(1)
})
