// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { App } from './App'
import type { Area, Level, Person, SavedKey, Status } from '../../lib/access'

// A shop with three apps and one group of actions with no screen: Hello changes things with Stripe, Payroll with Bank, the tip
// calculator uses no key, and Customers has no screen. One skill, Refund a customer, changes things in Hello and with Stripe,
// looks customers up and needs Project code.
const key = (id: string, title: string, changes: Partial<SavedKey> = {}): SavedKey => ({ id, title, levels: ['read', 'write'], saved: true, setup: false, usedBy: [], alone: false, ...changes })
const area = (id: string, title: string, screen = true): Area => ({ id, title, description: `${title} for the shop`, screen })
const person = (email: string, changes: Partial<Person> = {}): Person => ({ email, status: 'active', settled: true, role: null, manager: false, apps: {}, keys: {}, ...changes })
const sales = () => ({ apps: { hello: 'write' as const, tips: 'read' as const }, keys: { stripe: 'read' as const } })
// Support looks things up in Hello, which Read is enough for, and holds every area the skill calls: the one thing it can't run is the skill.
const support = () => ({ apps: { hello: 'read' as const, customers: 'read' as const }, keys: { stripe: 'read' as const } })
const status = (): Status => ({ ownerEmail: 'owner@shop.com', viewer: { email: 'owner@shop.com', owner: true }, environment: 'live', key: 'ready', started: true, imported: 0,
  keysStarted: true, kept: 0, appKeys: { hello: [{ id: 'stripe', need: 'write' }], payroll: [{ id: 'bank', need: 'write' }], tips: [], customers: [] },
  areas: [area('hello', 'Hello'), area('payroll', 'Payroll'), area('tips', 'Tip calculator'), area('customers', 'Customers', false)],
  skills: [{ id: 'refund', title: 'Refund a customer', areas: { hello: 'write', customers: 'read' }, keys: { stripe: 'write', code: 'read' } }],
  keys: [key('stripe', 'Stripe', { usedBy: [{ app: 'hello', need: 'write' }] }), key('bank', 'Bank', { usedBy: [{ app: 'payroll', need: 'write' }] }),
    key('cloudflare', 'Cloudflare', { levels: ['read'], setup: true, alone: true }), key('code', 'Project code', { levels: ['read'], alone: true })],
  roles: [{ id: 'office', name: 'Office', apps: {}, keys: {} }, { id: 'sales', name: 'Sales', ...sales() }, { id: 'support', name: 'Support', ...support() }],
  people: [person('gone@shop.com', { status: 'removed' }), person('kim@shop.com', { apps: { hello: 'write' }, keys: { stripe: 'read', cloudflare: 'read' } }),
    person('lee@shop.com', { role: 'sales', ...sales() }), person('sam@shop.com', { role: 'sales', ...sales() }), person('pat@shop.com', { role: 'support', ...support() })],
  work: [], project: 'ready' })
let roster: Status
let failed: Set<string>
let fetchMock: ReturnType<typeof vi.fn>
// The apps a person can open: the areas with a screen.
const screens = () => roster.areas.filter(item => item.screen).map(item => item.id)
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
// A named group: one of a set's three parts, or one area's or key's level choice by the name in its legend, with the quiet lines under it.
const part = (name: string) => screen.getByRole('group', { name })
const level = (name: string) => within(part(name))
const pick = (name: string, to: string) => fireEvent.click(level(name).getByRole('radio', { name: to }))
const note = (name: string) => Array.from(part(name).querySelectorAll('p')).map(line => line.textContent)
// Start from: a press on one of its buttons, and the words of the ones shown as pressed.
const start = (name: string) => fireEvent.click(level('Start from').getByRole('button', { name }))
const pressed = () => level('Start from').getAllByRole('button').filter(button => button.getAttribute('aria-pressed') === 'true').map(button => button.textContent)
// Project code is the one tick a role has, in a group of its own after Can reach, with the step left under it.
const INSTALL = 'Can install the project'
const install = () => screen.getByRole('checkbox', { name: INSTALL }) as HTMLInputElement
const project = () => level('Project')
// Can reach: every line with the level it shows, and the lines above None.
const lines = () => level('Can reach').getAllByRole('group')
const title = (line: Element) => line.querySelector('legend, label')!.textContent!
const reach = () => Object.fromEntries(lines().map(line => [title(line), checked(within(line).getAllByRole('radio'))[0]]))
const held = () => Object.fromEntries(Object.entries(reach()).filter(([, at]) => at !== 'None'))
// Everything marked new: the lines in Can reach, then the tick, whose mark sits beside it.
const NEW = `${INSTALL} new`
const fresh = () => [...lines(), install().closest('div')!].filter(line => line.querySelector('strong')).map(line => `${title(line)} ${line.querySelector('strong')!.textContent}`)
// What the panel shows, as a save names it: a level for every area and every key by its id, None as null, and Read on Project code while the tick is on.
const WORDS: Record<string, Level | null> = { None: null, 'Look up': 'read', 'Look up & change': 'write', Read: 'read', 'Read & write': 'write' }
const listed = () => {
  const shown = reach()
  const each = (list: { id: string; title: string }[]) => Object.fromEntries(list.map(item => [item.id, WORDS[shown[item.title]!]]))
  return { apps: each(roster.areas), keys: { ...each(roster.keys.slice(0, 3)), code: install().checked ? 'read' : null } }
}
// Can't yet: its lines.
const cant = () => note("Can't yet")
const fine = 'Nothing: everything here can run'
const REFUND = 'Refund a customer'
const GIVE = `Give ${REFUND} what it needs`

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
it('lists each role on one line with how many apps, keys and people it has and its gap, and changes one in the panel beside the list', async () => {
  open(); fireEvent.click(await screen.findByRole('link', { name: /^Roles/ }))
  expect(within(await screen.findByRole('table', { name: 'Roles' })).getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Role', 'Apps and keys', 'People'])
  // Counts, not labels: the names show where the role is opened. The "!" says an app or a skill can't do its job yet.
  expect([await cells('Office'), await cells('Sales'), await cells('Support')]).toEqual([['Office', 'No apps', 'Nobody yet'], ['Sales', '2 apps, 1 key ! 1 gap', '2 people'], ['Support', '2 apps, 1 key ! 1 gap', '1 person']])
  expect(document.querySelector('[data-slot="badge"]')).toBeNull()
  const sales = await row('Sales')
  expect(screen.queryByText('No roles yet.')).toBeNull(); expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull()
  expect(sales.getByRole('link', { name: 'Sales' }).getAttribute('href')).toBe('/apps/access/roles/sales')
  // A click anywhere on the row opens the role beside the list, with its row marked.
  fireEvent.click(sales.getByText('2 people'))
  await panel('Sales'); expect(where()).toBe('/apps/access/roles/sales')
  expect(screen.getByRole('table', { name: 'Roles' }).querySelector('tr[aria-current="true"] a')!.textContent).toBe('Sales'); expect(screen.getByRole('navigation', { name: 'Access views' })).toBeTruthy()
  expect(named().value).toBe('Sales'); expect(screen.queryByLabelText('Start from a person')).toBeNull()
  // The same three parts as for a person, with one tick, the project's, and none for managing, and who a save will reach.
  expect(reach()).toEqual({ Hello: 'Look up & change', Payroll: 'None', 'Tip calculator': 'Look up', Customers: 'None', Stripe: 'Read', Bank: 'None', Cloudflare: 'None' })
  expect([pressed(), fresh(), cant()]).toEqual([[], [], ['! Hello can look up, not change']]); expect(screen.getAllByRole('checkbox')).toEqual([install()]); expect(install().checked).toBe(false)
  expect([note('Hello'), note('Tip calculator'), note('Stripe'), note('Bank'), note('Cloudflare')]).toEqual([['opens Hello app'], ['opens Tip calculator app'], ['used by Hello'], [], ['look-ups, no app needed']])
  expect(screen.getByText('People: lee@shop.com, sam@shop.com')).toBeTruthy(); expect(screen.queryByText('Not saved yet')).toBeNull()
  fireEvent.change(named(), { target: { value: 'Field sales' } }); expect(screen.getByText('Not saved yet')).toBeTruthy()
  // An app chosen in Start from gives Look up and Read; a level raised by hand after it is the owner's own.
  start('Payroll'); expect([held().Payroll, held().Bank, fresh(), pressed()]).toEqual(['Look up', 'Read', ['Payroll new', 'Bank new'], ['Payroll ✓']])
  pick('Bank', 'Read & write'); expect([fresh(), pressed()]).toEqual([['Payroll new'], []])
  click('Save role'); await screen.findByText('Saved.')
  expect(sent('roles')).toEqual([{ id: 'sales', name: 'Field sales', apps: { hello: 'write', payroll: 'read', tips: 'read', customers: null }, keys: { stripe: 'read', bank: 'write', cloudflare: null, code: null } }])
  expect(where()).toBe('/apps/access/roles'); expect(screen.queryByRole('dialog')).toBeNull()
})
it("a role whose only gap is a skill says so on its row and, opened, names what the skill lacks; given that and saved, its people can run the skill", async () => {
  open('roles'); expect((await cells('Support'))[1]).toBe('2 apps, 1 key ! 1 gap')
  fireEvent.click((await row('Support')).getByText('1 gap')); await panel('Support')
  // Can't yet names the skill and each thing it is short of, with the one press that gives it. A key that offers Read alone has no level beside it.
  const lack = `! ${REFUND}: Hello Look up & change, Stripe Read & write, Project code`
  expect([cant(), pressed()]).toEqual([[lack], []]); expect(screen.getByRole('button', { name: GIVE }).textContent).toBe('Give what it needs')
  // An area names a skill among what it opens only once the set can run it.
  expect([note('Hello'), note('Customers')]).toEqual([['opens Hello app'], ['no screen']])
  // The press raises the two lines the skill lacks and turns the project's tick on, marks all three new and marks the skill in Start from. Nothing is sent.
  click(GIVE)
  expect([held(), install().checked]).toEqual([{ Hello: 'Look up & change', Customers: 'Look up', Stripe: 'Read & write' }, true])
  expect([fresh(), pressed(), cant()]).toEqual([['Hello new', 'Stripe new', NEW], [`${REFUND} ✓`], [fine]])
  expect([note('Hello'), note('Customers')]).toEqual([[`opens Hello app, ${REFUND}`], [`no screen · opens ${REFUND}`]])
  expect(screen.getByText('Not saved yet')).toBeTruthy(); expect(posts('roles')).toHaveLength(0)
  // Pressed again in Start from, the skill takes it all back: the role is as it was, with nothing to save.
  start(REFUND); expect([held(), install().checked, fresh(), pressed(), cant()]).toEqual([{ Hello: 'Look up', Customers: 'Look up', Stripe: 'Read' }, false, [], [], [lack]])
  expect(screen.queryByText('Not saved yet')).toBeNull()
  // Chosen in Start from, it fills the same, and the save sends exactly what Can reach shows, with every area and key named.
  start(REFUND); expect([fresh(), pressed()]).toEqual([['Hello new', 'Stripe new', NEW], [`${REFUND} ✓`]])
  const list = listed(); const given = { apps: { hello: 'write' as const, customers: 'read' as const }, keys: { stripe: 'write' as const, code: 'read' as const } }
  // The server answers with the role's new set, which is its people's too.
  roster.roles[2] = { ...roster.roles[2], ...given }; roster.people[4] = { ...roster.people[4], ...given }
  click('Save role'); await screen.findByText('Saved.')
  expect(sent('roles')).toEqual([{ id: 'support', name: 'Support', ...list }])
  expect(list).toEqual({ apps: { hello: 'write', payroll: null, tips: null, customers: 'read' }, keys: { stripe: 'write', bank: null, cloudflare: null, code: 'read' } })
  // The row has no gap any more, and the skill lists the role and its people among those who can run it.
  await screen.findByText('2 apps, 2 keys'); expect(await cells('Support')).toEqual(['Support', '2 apps, 2 keys', '1 person'])
  fireEvent.click(screen.getByRole('link', { name: /^Skills/ })); fireEvent.click(await screen.findByRole('link', { name: REFUND }))
  expect(within(await screen.findByRole('list', { name: 'Can run' })).getAllByRole('listitem').map(item => item.textContent)).toEqual(['You', 'Support · pat@shop.com'])
  expect(where()).toBe('/apps/access/skills/refund')
})
it("gives a whole role the project with the same tick as a person's, and names the step left under it", async () => {
  roster.keys[3].saved = false; roster.project = 'key'
  open('roles/office'); await panel('Office')
  expect(install().checked).toBe(false); expect(project().queryByText(/One step first/)).toBeNull()
  // Project code is the tick, never a level choice among the keys.
  expect(lines().map(title).slice(4)).toEqual(['Stripe', 'Bank', 'Cloudflare']); expect(project().queryByRole('radio')).toBeNull()
  fireEvent.click(install())
  expect(project().getByText('One step first.')).toBeTruthy(); expect(project().getByRole('button', { name: 'Copy that request' })).toBeTruthy()
  // Set by hand, the tick is not marked new, and it saves before the key arrives.
  const none = { hello: null, payroll: null, tips: null, customers: null }
  expect(fresh()).toEqual([]); click('Save role'); await screen.findByText('Saved.')
  expect(sent('roles')).toEqual([{ id: 'office', name: 'Office', apps: none, keys: { stripe: null, bank: null, cloudflare: null, code: 'read' } }])
  // Once the app can hand the project out, the tick shows with nothing under it, and unticking saves none.
  cleanup(); roster.keys[3].saved = true; roster.project = 'ready'; roster.roles[0].keys = { code: 'read' }
  open('roles/office'); await panel('Office')
  expect(install().checked).toBe(true); expect(project().queryByText(/One step first/)).toBeNull(); expect(project().queryByRole('button')).toBeNull()
  fireEvent.click(install()); click('Save role'); await screen.findByText('Saved.')
  expect(sent('roles')[1]).toEqual({ id: 'office', name: 'Office', apps: none, keys: { stripe: null, bank: null, cloudflare: null, code: null } })
})
it('adds a role, which can start from what one person has now, with nothing marked', async () => {
  open('roles'); fireEvent.click(await screen.findByRole('link', { name: 'Add role' }))
  await panel('Add role'); expect(where()).toBe('/apps/access/roles/new')
  expect(document.activeElement).toBe(named())
  expect(screen.getByText('People: nobody yet')).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Remove role' })).toBeNull()
  // The list stays beside the panel, and no row is marked: the new role has none yet.
  expect(screen.getByRole('table', { name: 'Roles' }).querySelector('tr[aria-current]')).toBeNull()
  // Only people who can sign in are offered, and Nobody is picked.
  const from = screen.getByLabelText('Start from a person') as HTMLSelectElement
  expect(within(from).getAllByRole('option').map(option => option.textContent)).toEqual(['Nobody', 'kim@shop.com', 'lee@shop.com', 'sam@shop.com', 'pat@shop.com'])
  expect([from.value, held(), pressed(), cant()]).toEqual(['', {}, [], [fine]])
  start('Payroll'); expect([held(), fresh(), pressed()]).toEqual([{ Payroll: 'Look up', Bank: 'Read' }, ['Payroll new', 'Bank new'], ['Payroll ✓']])
  // A person who holds a role starts the new role from what that role gives them. The three parts start again: nothing is marked.
  fireEvent.change(from, { target: { value: 'lee@shop.com' } })
  expect([from.value, held(), fresh(), pressed()]).toEqual(['lee@shop.com', { Hello: 'Look up & change', 'Tip calculator': 'Look up', Stripe: 'Read' }, [], []])
  // An app the person's set already covers raises nothing, and is still marked as pressed until the next pick.
  start('Hello'); expect([held(), fresh(), pressed()]).toEqual([{ Hello: 'Look up & change', 'Tip calculator': 'Look up', Stripe: 'Read' }, [], ['Hello ✓']])
  fireEvent.change(from, { target: { value: '' } })
  expect([from.value, held(), fresh(), pressed()]).toEqual(['', {}, [], []])
  fireEvent.change(from, { target: { value: 'kim@shop.com' } })
  expect([from.value, held()]).toEqual(['kim@shop.com', { Hello: 'Look up & change', Stripe: 'Read', Cloudflare: 'Read' }])
  fireEvent.change(named(), { target: { value: 'Helpers' } }); click('Save role'); await screen.findByText('Saved.')
  expect(sent('roles')).toEqual([{ name: 'Helpers', apps: { hello: 'write', payroll: null, tips: null, customers: null }, keys: { stripe: 'read', bank: null, cloudflare: 'read', code: null } }])
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
