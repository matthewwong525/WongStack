// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { App } from './App'
import type { BuiltApp, Person, SavedKey, Status } from '../../lib/access'

// A shop with three apps: Hello changes things with Stripe, Payroll with Bank, and the tip calculator uses no key.
const key = (id: string, title: string, changes: Partial<SavedKey> = {}): SavedKey => ({ id, title, levels: ['read', 'write'], saved: true, setup: false, alone: false, ...changes })
const built = (id: string, title: string): BuiltApp => ({ id, title, description: `${title} for the shop` })
const person = (email: string, changes: Partial<Person> = {}): Person => ({ email, status: 'active', settled: true, role: null, manager: false, apps: [], keys: {}, ...changes })
const sales = () => ({ apps: ['hello', 'tips'], keys: { stripe: 'read' as const } })
// Support has Hello, which changes things with Stripe, and holds Stripe at Read: the two have nothing to do with each other.
const support = () => ({ apps: ['hello'], keys: { stripe: 'read' as const } })
const status = (): Status => ({ ownerEmail: 'owner@shop.com', viewer: { email: 'owner@shop.com', owner: true }, environment: 'live', key: 'ready', started: true, imported: 0,
  keysStarted: true, unticked: { people: [], roles: [] },
  apps: [built('hello', 'Hello'), built('payroll', 'Payroll'), built('tips', 'Tip calculator')],
  keys: [key('stripe', 'Stripe'), key('bank', 'Bank'),
    key('cloudflare', 'Cloudflare', { levels: ['read'], setup: true, alone: true }), key('code', 'Project code', { levels: ['read'], alone: true })],
  roles: [{ id: 'office', name: 'Office', apps: [], keys: {} }, { id: 'sales', name: 'Sales', ...sales() }, { id: 'support', name: 'Support', ...support() }],
  people: [person('gone@shop.com', { status: 'removed' }), person('kim@shop.com', { apps: ['hello'], keys: { stripe: 'read', cloudflare: 'read' } }),
    person('lee@shop.com', { role: 'sales', ...sales() }), person('sam@shop.com', { role: 'sales', ...sales() }), person('pat@shop.com', { role: 'support', ...support() })],
  work: [], project: 'ready' })
let roster: Status
let failed: Set<string>
let fetchMock: ReturnType<typeof vi.fn>
// The apps a person can open.
const screens = () => roster.apps.map(item => item.id)
beforeEach(() => {
  roster = status(); failed = new Set()
  fetchMock = vi.fn(async (url: string) => {
    const path = url.replace('/api/access/', '')
    if (failed.has(path)) return Response.json({ code: 'unavailable' }, { status: 503 })
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
const posts = (path: string) => fetchMock.mock.calls.filter(([url, init]) => url.endsWith(path) && init?.method === 'POST')
const sent = (path: string) => posts(path).map(([, init]) => JSON.parse(init.body))
const reads = (path: string) => fetchMock.mock.calls.filter(([url, init]) => url.endsWith(path) && init?.method !== 'POST')
const checked = (inputs: HTMLElement[]) => inputs.filter(input => (input as HTMLInputElement).checked).map(input => input.parentElement!.textContent)
// One role's row in the list and what its cells say.
const row = async (name: string) => within((await screen.findByRole('link', { name })).closest('tr')!)
const cells = async (name: string) => Array.from((await screen.findByRole('link', { name })).closest('tr')!.querySelectorAll('td')).map(cell => cell.textContent)
// The panel a role is opened in, by its name, and that none is open any more.
const panel = (name: string) => screen.findByRole('dialog', { name })
const closed = () => waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
const moment = () => act(async () => { await new Promise(resolve => setTimeout(resolve)) })
const named = () => screen.getByLabelText('Name') as HTMLInputElement
// A named group: Apps, Keys or Project, or one key's level choice by the name its legend starts with, with the quiet lines under it.
const part = (name: string) => screen.getByRole('group', { name: new RegExp(`^${name}( · |$)`) })
const level = (name: string) => within(part(name))
const pick = (name: string, to: string) => fireEvent.click(level(name).getByRole('radio', { name: to }))
const note = (name: string) => Array.from(part(name).querySelectorAll('p')).map(line => line.textContent)
// Apps: a press on one app's tick, and the apps that are ticked.
const give = (name: string) => fireEvent.click(level('Apps').getByRole('checkbox', { name }))
const given = () => checked(level('Apps').getAllByRole('checkbox'))
// Project code is one tick in a group of its own after the keys, with the step left under it.
const INSTALL = 'Can install the project'
const install = () => screen.getByRole('checkbox', { name: INSTALL }) as HTMLInputElement
const project = () => level('Project')
// Keys: every line with the level it shows, and the lines above None.
const lines = () => level('Keys').getAllByRole('group')
const title = (line: Element) => line.querySelector('legend')!.firstChild!.textContent!
// The same line's whole legend: the key, then whether the app holds it.
const state = (line: Element) => line.querySelector('legend')!.textContent!
const levels = () => Object.fromEntries(lines().map(line => [title(line), checked(within(line).getAllByRole('radio'))[0]]))
const held = () => Object.fromEntries(Object.entries(levels()).filter(([, at]) => at !== 'None'))
const NO_APPS = { hello: false, payroll: false, tips: false }
const NO_KEYS = { stripe: null, bank: null, cloudflare: null, code: null }

it('says what a role is for when there are none yet, with one way to add the first', async () => {
  roster.roles = []; roster.people = [person('kim@shop.com')]
  open('roles'); const add = await screen.findByRole('link', { name: 'Add role' })
  expect(add.getAttribute('href')).toBe('/apps/access/roles/new')
  const purpose = screen.getByText('A role saves a set of apps and key levels to give to several people.')
  expect(screen.getByText('No roles yet.').compareDocumentPosition(purpose) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  // The add button ends the views' line, above both lines, and no empty table is drawn.
  expect(add.compareDocumentPosition(screen.getByText('No roles yet.')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(screen.getByRole('navigation', { name: 'Access views' }).parentElement!.lastElementChild).toBe(add); expect(screen.queryByRole('table')).toBeNull()
})
it('lists each role on one line with how many apps, keys and people it has, with nothing marked as missing, and changes one in the panel beside the list', async () => {
  open(); fireEvent.click(await screen.findByRole('link', { name: /^Roles/ }))
  const table = await screen.findByRole('table', { name: 'Roles' })
  expect(within(table).getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Role', 'Apps and keys', 'People'])
  // Counts, not labels: the names show where the role is opened. Sales has Hello with Stripe at Read, and no row marks that.
  expect([await cells('Office'), await cells('Sales'), await cells('Support')]).toEqual([['Office', 'No apps', 'Nobody yet'], ['Sales', '2 apps, 1 key', '2 people'], ['Support', '1 app, 1 key', '1 person']])
  expect(table.textContent).not.toMatch(/!|gap/); expect(document.querySelector('[data-slot="badge"]')).toBeNull()
  const sales = await row('Sales')
  expect(screen.queryByText('No roles yet.')).toBeNull(); expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull()
  expect(sales.getByRole('link', { name: 'Sales' }).getAttribute('href')).toBe('/apps/access/roles/sales')
  // A click anywhere on the row opens the role beside the list, with its row marked.
  fireEvent.click(sales.getByText('2 people'))
  const opened = await panel('Sales'); expect(where()).toBe('/apps/access/roles/sales')
  expect(screen.getByRole('table', { name: 'Roles' }).querySelector('tr[aria-current="true"] a')!.textContent).toBe('Sales'); expect(screen.getByRole('navigation', { name: 'Access views' })).toBeTruthy()
  expect(named().value).toBe('Sales'); expect(screen.queryByLabelText('Copy from a person')).toBeNull()
  // The same two groups as for a person: a tick per app, then a level per key. One more tick, the project's, and none for managing.
  expect([given(), levels()]).toEqual([['Hello', 'Tip calculator'], { Stripe: 'Read', Bank: 'None', Cloudflare: 'None' }])
  expect(screen.getAllByRole('checkbox').map(box => box.parentElement!.textContent)).toEqual(['Hello', 'Payroll', 'Tip calculator', INSTALL]); expect(install().checked).toBe(false)
  expect([note('Stripe'), note('Bank'), note('Cloudflare')]).toEqual([[], [], []])
  // Each key says whether the app holds it, as where a person is opened, and no Key settings is offered.
  expect(lines().map(state)).toEqual(['Stripe · Saved', 'Bank · Saved', 'Cloudflare · Saved']); expect(screen.queryByRole('link', { name: 'Key settings' })).toBeNull()
  // No Start from, Can reach or Can't yet, and nothing said to be missing.
  for (const name of ['Start from', 'Can reach', "Can't yet"]) expect(screen.queryByRole('group', { name }), name).toBeNull()
  expect(opened.textContent).not.toMatch(/Start from|Can reach|Can't yet|can't use|not change|what it needs|Look up|gap|!/)
  expect(screen.getByText('People: lee@shop.com, sam@shop.com')).toBeTruthy(); expect(screen.queryByText('Not saved yet')).toBeNull()
  fireEvent.change(named(), { target: { value: 'Field sales' } }); expect(screen.getByText('Not saved yet')).toBeTruthy()
  // A tick gives the app and moves no key level: Payroll changes things with Bank, and Bank stays at None until it is picked by hand.
  give('Payroll'); expect([given(), held()]).toEqual([['Hello', 'Payroll', 'Tip calculator'], { Stripe: 'Read' }])
  pick('Bank', 'Read & write'); expect(given()).toEqual(['Hello', 'Payroll', 'Tip calculator'])
  click('Save role'); await screen.findByText('Saved.')
  expect(sent('roles')).toEqual([{ id: 'sales', name: 'Field sales', apps: { hello: true, payroll: true, tips: true }, keys: { ...NO_KEYS, stripe: 'read', bank: 'write' } }])
  expect(where()).toBe('/apps/access/roles'); expect(screen.queryByRole('dialog')).toBeNull()
})
it("a tick on a role saves the app and no key level, and the role's people then have what the role has", async () => {
  open('roles'); fireEvent.click((await row('Support')).getByText('1 person')); await panel('Support')
  expect([given(), held()]).toEqual([['Hello'], { Stripe: 'Read' }])
  give('Payroll'); expect([given(), held()]).toEqual([['Hello', 'Payroll'], { Stripe: 'Read' }])
  expect(screen.getByText('Not saved yet')).toBeTruthy(); expect(posts('roles')).toHaveLength(0)
  // Unticked again, the role is as it was, with nothing to save.
  give('Payroll'); expect(screen.queryByText('Not saved yet')).toBeNull(); give('Payroll')
  // The server answers with the role's new set, which is its people's too.
  const now = { apps: ['hello', 'payroll'], keys: { stripe: 'read' as const } }
  roster.roles[2] = { ...roster.roles[2], ...now }; roster.people[4] = { ...roster.people[4], ...now }
  click('Save role'); await screen.findByText('Saved.')
  expect(sent('roles')).toEqual([{ id: 'support', name: 'Support', apps: { ...NO_APPS, hello: true, payroll: true }, keys: { ...NO_KEYS, stripe: 'read' } }])
  expect(await cells('Support')).toEqual(['Support', '2 apps, 1 key', '1 person'])
  // Its person, opened, names what the role gives: each app by its title, and the key with its level.
  fireEvent.click(screen.getByRole('link', { name: /^People/ })); fireEvent.click(await screen.findByRole('link', { name: 'pat@shop.com' }))
  expect(within(await panel('pat@shop.com')).getAllByRole('listitem').map(item => item.textContent)).toEqual(['Hello', 'Payroll', 'Stripe Read'])
})
it("gives a whole role the project with the same tick as a person's, and names the step left under it", async () => {
  roster.keys[3].saved = false; roster.project = 'key'
  open('roles/office'); await panel('Office')
  expect(install().checked).toBe(false); expect(project().queryByText(/One step first/)).toBeNull()
  // Project code is the tick, never a level choice among the keys.
  expect(lines().map(title)).toEqual(['Stripe', 'Bank', 'Cloudflare']); expect(project().queryByRole('radio')).toBeNull()
  fireEvent.click(install())
  expect(project().getByText('One step first.')).toBeTruthy(); expect(project().getByRole('button', { name: 'Copy that request' })).toBeTruthy()
  // It saves before the key arrives, and ticks no app.
  click('Save role'); await screen.findByText('Saved.')
  expect(sent('roles')).toEqual([{ id: 'office', name: 'Office', apps: NO_APPS, keys: { ...NO_KEYS, code: 'read' } }])
  // Once the app can hand the project out, the tick shows with nothing under it, and unticking saves none.
  cleanup(); roster.keys[3].saved = true; roster.project = 'ready'; roster.roles[0].keys = { code: 'read' }
  open('roles/office'); await panel('Office')
  expect(install().checked).toBe(true); expect(project().queryByText(/One step first/)).toBeNull(); expect(project().queryByRole('button')).toBeNull()
  fireEvent.click(install()); click('Save role'); await screen.findByText('Saved.')
  expect(sent('roles')[1]).toEqual({ id: 'office', name: 'Office', apps: NO_APPS, keys: NO_KEYS })
})
it('adds a role, which can copy what one person has now', async () => {
  open('roles'); fireEvent.click(await screen.findByRole('link', { name: 'Add role' }))
  await panel('Add role'); expect(where()).toBe('/apps/access/roles/new')
  expect(document.activeElement).toBe(named())
  expect(screen.getByText('People: nobody yet')).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Remove role' })).toBeNull()
  // The list stays beside the panel, and no row is marked: the new role has none yet.
  expect(screen.getByRole('table', { name: 'Roles' }).querySelector('tr[aria-current]')).toBeNull()
  // Only people who can sign in are offered, and Nobody is picked.
  const from = screen.getByLabelText('Copy from a person') as HTMLSelectElement
  expect(within(from).getAllByRole('option').map(option => option.textContent)).toEqual(['Nobody', 'kim@shop.com', 'lee@shop.com', 'sam@shop.com', 'pat@shop.com'])
  expect([from.value, given(), held()]).toEqual(['', [], {}])
  give('Payroll'); expect(given()).toEqual(['Payroll'])
  // A person who holds a role gives the new role what that role gives them, in place of what was ticked.
  fireEvent.change(from, { target: { value: 'lee@shop.com' } })
  expect([from.value, given(), held()]).toEqual(['lee@shop.com', ['Hello', 'Tip calculator'], { Stripe: 'Read' }])
  fireEvent.change(from, { target: { value: '' } })
  expect([from.value, given(), held()]).toEqual(['', [], {}])
  fireEvent.change(from, { target: { value: 'kim@shop.com' } })
  expect([from.value, given(), held()]).toEqual(['kim@shop.com', ['Hello'], { Stripe: 'Read', Cloudflare: 'Read' }])
  fireEvent.change(named(), { target: { value: 'Helpers' } }); click('Save role'); await screen.findByText('Saved.')
  expect(sent('roles')).toEqual([{ name: 'Helpers', apps: { ...NO_APPS, hello: true }, keys: { ...NO_KEYS, stripe: 'read', cloudflare: 'read' } }])
})
it('asks in a popup before removing a role, says its people keep their access, and keeps the panel as it was on Cancel', async () => {
  open('roles/sales'); await panel('Sales')
  fireEvent.change(named(), { target: { value: 'Field sales' } }); click('Remove role')
  const ask = within(screen.getByRole('alertdialog', { name: 'Remove Sales?' }))
  expect(ask.getByText('Its people keep the access they have now, as their own set.')).toBeTruthy()
  // The way out is focused first; the action is the question's one solid button.
  const [out, yes] = [ask.getByRole('button', { name: 'Cancel' }), ask.getByRole('button', { name: 'Remove role' })]
  await moment(); expect([document.activeElement, out.getAttribute('data-variant'), yes.getAttribute('data-variant')]).toEqual([out, 'outline', 'default'])
  // The panel stays under the question, with its change.
  click('Cancel'); expect(screen.queryByRole('alertdialog')).toBeNull(); expect(named().value).toBe('Field sales'); expect(posts('roles')).toHaveLength(0)
  expect((await panel('Sales')).contains(screen.getByRole('button', { name: 'Save role' }))).toBe(true); await moment()
  click('Remove role'); click('Remove role'); await screen.findByText('Saved.')
  expect(sent('roles')).toEqual([{ id: 'sales', removed: true }]); expect(where()).toBe('/apps/access/roles'); await closed()
})
it('a role save that did not finish says so and reads the list again', async () => {
  open('roles/office'); await screen.findByRole('button', { name: 'Save role' }); failed.add('roles'); click('Save role')
  await screen.findByText('That did not finish. Check the list below before trying again.')
  await row('Office'); expect(where()).toBe('/apps/access/roles')
  expect(posts('roles')).toHaveLength(1); expect(reads('status').length).toBeGreaterThan(1)
})
it('every row opens its item from the link in its first cell, and no list has an Edit button', async () => {
  for (const [path, name, links] of [['', 'People', ['gone@shop.com', 'kim@shop.com', 'lee@shop.com', 'sam@shop.com', 'pat@shop.com']], ['roles', 'Roles', ['Office', 'Sales', 'Support']]] as const) {
    open(path); const table = await screen.findByRole('table', { name })
    expect(Array.from(table.querySelectorAll('tbody td:first-child a')).map(link => link.textContent), path).toEqual(links)
    expect(screen.queryByRole('link', { name: 'Edit' }), path).toBeNull()
    cleanup()
  }
})
it('names each person and role an update unticked, with the app they lost, in the one notice spot on both views until the next save', async () => {
  const [kim, lost] = [{ email: 'kim@example.com', apps: ['Orders'] }, { name: 'Sales', apps: ['Payroll', 'Orders'] }]
  const after = (first: Element, second: Element) => !!(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)
  roster.unticked = { people: [kim], roles: [lost] }
  open(); const heading = await screen.findByText('Unticked in this update'); const box = heading.closest<HTMLElement>('[data-slot="alert"]')!
  // Marked by a "!" in the text and by bold words, never by colour alone.
  expect([heading.tagName, heading.textContent]).toEqual(['STRONG', '! Unticked in this update'])
  // One line per person and per role, each with what they lost, then what to do about it.
  expect(Array.from(box.querySelectorAll('p, li')).map(item => item.textContent)).toEqual(['! Unticked in this update', 'They could only look, and a tick gives everything:',
    'kim@example.com: Orders', 'Sales role: Payroll, Orders', 'Tick an app to give it back.'])
  expect([after(screen.getByRole('navigation', { name: 'Access views' }), box), after(box, screen.getByRole('table', { name: 'People' }))]).toEqual([true, true])
  // It shows on Roles too, and beside an opened role.
  fireEvent.click(screen.getByRole('link', { name: 'Roles 3' })); await screen.findByRole('region', { name: 'Roles' }); expect(screen.getAllByText('Unticked in this update')).toHaveLength(1)
  fireEvent.click(screen.getByRole('link', { name: 'Add role' })); await panel('Add role'); expect(screen.getAllByText('Unticked in this update')).toHaveLength(1); cleanup()
  // A role alone, or a person alone, is named the same way.
  roster.unticked = { people: [], roles: [lost] }; open(); await screen.findByText('Sales role: Payroll, Orders'); expect(screen.queryByText(/kim@example\.com/)).toBeNull(); cleanup()
  roster.unticked = { people: [kim], roles: [] }; open(); await screen.findByText('kim@example.com: Orders'); expect(screen.queryByText(/ role: /)).toBeNull(); cleanup()
  // The next save clears the names, and the notice with them: nobody unticked, no notice.
  roster.unticked = { people: [], roles: [] }; open(); await screen.findByRole('link', { name: 'Add person' })
  expect([screen.queryByText('Unticked in this update'), document.querySelector('[data-slot="alert"]')]).toEqual([null, null])
})
