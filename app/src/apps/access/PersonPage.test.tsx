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
const status = (): Status => ({ ownerEmail: 'owner@shop.com', viewer: { email: 'owner@shop.com', owner: true }, environment: 'live', key: 'ready', started: true, imported: 0,
  keysStarted: true, kept: 0, appKeys: { hello: [{ id: 'stripe', need: 'write' }], payroll: [{ id: 'bank', need: 'write' }], tips: [], customers: [] },
  areas: [area('hello', 'Hello'), area('payroll', 'Payroll'), area('tips', 'Tip calculator'), area('customers', 'Customers', false)],
  skills: [{ id: 'refund', title: 'Refund a customer', areas: { hello: 'write', customers: 'read' }, keys: { stripe: 'write', code: 'read' } }],
  keys: [key('stripe', 'Stripe', { usedBy: [{ app: 'hello', need: 'write' }] }), key('bank', 'Bank', { usedBy: [{ app: 'payroll', need: 'write' }] }),
    key('cloudflare', 'Cloudflare', { levels: ['read'], setup: true, alone: true }), key('code', 'Project code', { levels: ['read'], alone: true })],
  // Support looks things up in Hello, which Read is enough for: the one thing it can't run is the skill.
  roles: [{ id: 'office', name: 'Office', apps: {}, keys: {} }, { id: 'sales', name: 'Sales', ...sales() },
    { id: 'support', name: 'Support', apps: { hello: 'read', customers: 'read' }, keys: { stripe: 'read' } }],
  people: [person('gone@shop.com', { status: 'removed' }), person('kim@shop.com', { apps: { hello: 'write' }, keys: { stripe: 'read', cloudflare: 'read' } }),
    person('lee@shop.com', { role: 'sales', ...sales() }), person('sam@shop.com', { role: 'sales', ...sales() })],
  work: [] })
let roster: Status
let fetchMock: ReturnType<typeof vi.fn>
// The apps a person can open: the areas with a screen.
const screens = () => roster.areas.filter(item => item.screen).map(item => item.id)
beforeEach(() => {
  roster = status()
  fetchMock = vi.fn(async (url: string) => {
    const path = url.replace('/api/access/', '')
    // The owner, or a manager: an employee who manages. The status names which in `viewer`.
    if (path === 'apps') return Response.json({ state: 'current', role: roster.viewer.owner ? 'owner' : 'employee', manages: true, apps: ['access', ...screens()], revision: 1 })
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
const checked = (inputs: HTMLElement[]) => inputs.filter(input => (input as HTMLInputElement).checked).map(input => input.parentElement!.textContent)
// One person's row in the list, what its cells say and the role picked in it.
const row = async (email: string) => within((await screen.findByRole('link', { name: email })).closest('tr')!)
const cells = async (email: string) => Array.from((await screen.findByRole('link', { name: email })).closest('tr')!.querySelectorAll('td')).map(cell => cell.textContent)
const picked = (email: string) => (screen.getByRole('combobox', { name: `Role for ${email}` }) as HTMLSelectElement).selectedOptions[0].textContent
const labels = (box: { queryAllByRole: (role: string) => HTMLElement[] }) => box.queryAllByRole('listitem').map(item => item.textContent)
// The panel a person is opened in, by their email, and that none is open any more.
const panel = async (name: string) => within(await screen.findByRole('dialog', { name }))
const closed = () => waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
// Every tick in the panel by its words. No app has a tick: the one left is the owner's, for managing.
const ticks = () => checked(screen.getAllByRole('checkbox'))
const boxes = () => screen.getAllByRole('checkbox').map(input => input.parentElement!.textContent)
const MANAGE = 'Can manage Access'
const managing = () => screen.getByRole('checkbox', { name: MANAGE }) as HTMLInputElement
// A named group: one of a set's three parts, or one area's or key's level choice by the name in its legend, with the quiet lines under it.
const part = (name: string) => screen.getByRole('group', { name })
const level = (name: string) => within(part(name))
const pick = (name: string, to: string) => fireEvent.click(level(name).getByRole('radio', { name: to }))
const note = (name: string) => Array.from(part(name).querySelectorAll('p')).map(line => line.textContent)
// Start from: its buttons, a press on one, and the words of the ones shown as pressed.
const starts = () => level('Start from').queryAllByRole('button')
const start = (name: string) => fireEvent.click(level('Start from').getByRole('button', { name }))
const pressed = () => starts().filter(button => button.getAttribute('aria-pressed') === 'true').map(button => button.textContent)
// Can reach: every line with the level it shows, the lines above None, and the lines marked new.
const lines = () => level('Can reach').queryAllByRole('group')
const title = (line: HTMLElement) => line.querySelector('legend')!.textContent!
const reach = () => Object.fromEntries(lines().map(line => [title(line), checked(within(line).getAllByRole('radio'))[0]]))
const held = () => Object.fromEntries(Object.entries(reach()).filter(([, at]) => at !== 'None'))
const fresh = () => lines().filter(line => line.querySelector('strong')).map(line => `${title(line)} ${line.querySelector('strong')!.textContent}`)
// What Can reach shows, as a save names it: a level for every area and every key by its id, None as null.
const WORDS: Record<string, Level | null> = { None: null, 'Look up': 'read', 'Look up & change': 'write', Read: 'read', 'Read & write': 'write' }
const listed = () => {
  const shown = reach()
  const named = (list: { id: string; title: string }[]) => Object.fromEntries(list.map(item => [item.id, WORDS[shown[item.title]!]]))
  return { apps: named(roster.areas), keys: named(roster.keys) }
}
// Can't yet: its lines, and the name of the button that gives one app or skill what it lacks.
const cant = () => note("Can't yet")
const give = (name: string) => `Give ${name} what it needs`
const role = () => screen.getByLabelText('Role') as HTMLSelectElement
const gap = '! Hello can look up, not change'
const fine = 'Nothing: everything here can run'
const REFUND = 'Refund a customer'

it('shows each person on one line with their role, counts and gap, and opened, a role as labels with one link to it and no ticks', async () => {
  open(); const lee = await row('lee@shop.com')
  expect(picked('lee@shop.com')).toBe('Sales'); expect(lee.getByText('Can sign in')).toBeTruthy()
  // How many apps and keys, never their names: the list holds no label. A gap is marked by a "!" in the text, in bold.
  expect([(await cells('lee@shop.com'))[3], labels(screen)]).toEqual(['2 apps, 1 key ! 1 gap', []])
  const mark = lee.getByText('1 gap'); expect([mark.tagName, mark.textContent]).toEqual(['STRONG', '! 1 gap'])
  expect(picked('kim@shop.com')).toBe('Own set'); expect((await cells('kim@shop.com'))[3]).toBe('1 app, 2 keys ! 1 gap')
  // A removed person keeps the row's parts, with no role to pick and nothing counted.
  const gone = await row('gone@shop.com')
  expect((await cells('gone@shop.com')).slice(0, 4)).toEqual(['gone@shop.com', 'Removed', 'No role', 'No apps']); expect(gone.queryByRole('combobox')).toBeNull()
  fireEvent.click(lee.getByRole('link', { name: 'lee@shop.com' }))
  const opened = await panel('lee@shop.com'); expect(where()).toBe('/apps/access/people/lee@shop.com')
  // The list and the five views stay in place beside the panel, with her row marked.
  expect(screen.getByRole('table', { name: 'People' }).querySelector('tr[aria-current="true"] a')!.textContent).toBe('lee@shop.com'); expect(screen.getByRole('navigation', { name: 'Access views' })).toBeTruthy()
  expect(opened.getByText('Can sign in')).toBeTruthy()
  expect(role().value).toBe('sales'); expect(screen.queryByLabelText('Email')).toBeNull()
  // Opened, the names show: each kind of label is its own named list, an area with its level, and the gap says which app and what it can't do.
  expect(screen.getByText('From the Sales role:')).toBeTruthy()
  expect(labels(opened)).toEqual(['Hello Look up & change', 'Tip calculator Look up', 'Stripe Read', gap])
  expect(opened.getAllByRole('list').map(list => list.getAttribute('aria-label'))).toEqual(['Apps', 'Keys', "Can't do yet"])
  // A role is changed where the role is opened: no starting point, no level and no tick but the owner's.
  expect(boxes()).toEqual([MANAGE]); expect(screen.queryByRole('radio')).toBeNull(); expect(screen.queryByRole('group', { name: 'Start from' })).toBeNull()
  expect(screen.getByRole('link', { name: 'Edit the Sales role' }).getAttribute('href')).toBe('/apps/access/roles/sales')
  // An area with no screen says so on its label, and a role whose only gap is a skill names the skill and what it lacks.
  fireEvent.change(role(), { target: { value: 'support' } }); expect(screen.getByText('From the Support role:')).toBeTruthy()
  expect(labels(opened)).toEqual(['Hello Look up', 'Customers Look up · No screen', 'Stripe Read', `! ${REFUND}: Hello Look up & change, Stripe Read & write, Project code`])
  // A role with nothing in it says so, and the save names the role alone.
  fireEvent.change(role(), { target: { value: 'office' } })
  expect(labels(opened)).toEqual([]); expect(opened.getByText('No apps')).toBeTruthy(); expect(opened.queryAllByRole('list')).toEqual([])
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'lee@shop.com', removed: false, role: 'office' }]); expect(where()).toBe('/apps/access/')
  // The role itself is one link from the person.
  fireEvent.click((await row('sam@shop.com')).getByRole('link', { name: 'sam@shop.com' }))
  fireEvent.click(await screen.findByRole('link', { name: 'Edit the Sales role' }))
  expect((await screen.findByLabelText('Name') as HTMLInputElement).value).toBe('Sales'); expect(where()).toBe('/apps/access/roles/sales')
})
it("the People list drops a person's gap mark once their levels cover what the app does, and counts a skill that can't run", async () => {
  roster.people[1].keys = { stripe: 'write' }
  open(); expect((await cells('kim@shop.com'))[3]).toBe('1 app, 1 key')
  // At Look up an app only looks things up, so Read is all it needs.
  cleanup(); roster.people[1] = person('kim@shop.com', { apps: { hello: 'read' }, keys: { stripe: 'read' } })
  open(); expect((await cells('kim@shop.com'))[3]).toBe('1 app, 1 key')
  // Once she holds every area a skill calls, the skill counts too: here it is her only gap. An area with no screen counts as an app.
  cleanup(); roster.people[1].apps = { hello: 'read', customers: 'read' }
  open(); expect((await cells('kim@shop.com'))[3]).toBe('2 apps, 1 key ! 1 gap')
  // With no level at all, the row still marks it without opening her, and opening her says the app can't use the key.
  cleanup(); roster.people[1] = person('kim@shop.com', { apps: { hello: 'write' } })
  open(); expect((await cells('kim@shop.com'))[3]).toBe('1 app ! 1 gap')
  fireEvent.click((await row('kim@shop.com')).getByText('1 gap'))
  await panel('kim@shop.com'); expect(cant()).toEqual(["! Hello can't use Stripe yet"])
})
it("with their own set, the panel has three parts: what to start from, a level for every area and key with what each opens, and what can't run yet", async () => {
  open('people/kim@shop.com'); await panel('kim@shop.com')
  expect(role().value).toBe('')
  expect(within(role()).getAllByRole('option').map(option => option.textContent)).toEqual(['Their own set', 'Office', 'Sales', 'Support'])
  // Start from: each app with a screen, then each skill, none pressed. An area with no screen is no starting point, and no app has a tick.
  expect(starts().map(button => [button.textContent, button.getAttribute('aria-pressed')])).toEqual([['Hello', 'false'], ['Payroll', 'false'], ['Tip calculator', 'false'], [REFUND, 'false']])
  expect(level('Start from').getByText('A press fills in what it needs below. Nothing is saved until you save.')).toBeTruthy(); expect(boxes()).toEqual([MANAGE])
  // Can reach: every area, a screen or not, then every key, each with its level and nothing marked.
  expect(lines().map(title)).toEqual(['Hello', 'Payroll', 'Tip calculator', 'Customers', 'Stripe', 'Bank', 'Cloudflare', 'Project code'])
  expect(reach()).toEqual({ Hello: 'Look up & change', Payroll: 'None', 'Tip calculator': 'None', Customers: 'None', Stripe: 'Read', Bank: 'None', Cloudflare: 'Read', 'Project code': 'None' })
  expect([fresh(), pressed()]).toEqual([[], []])
  // An area offers its own three levels; a key offers three, or two when it is Read only.
  const offered = (name: string) => level(name).getAllByRole('radio').map(radio => radio.parentElement!.textContent)
  expect([offered('Hello'), offered('Customers')]).toEqual(Array(2).fill(['None', 'Look up', 'Look up & change']))
  expect([offered('Bank'), offered('Cloudflare'), offered('Project code')]).toEqual([['None', 'Read', 'Read & write'], ['None', 'Read'], ['None', 'Read']])
  // Under a held area, what it opens; under one with no screen, that; under a key, the held apps that use it and what it does with no app.
  expect([note('Hello'), note('Payroll'), note('Tip calculator'), note('Customers')]).toEqual([['opens Hello app'], [], [], ['no screen']])
  expect([note('Stripe'), note('Bank'), note('Cloudflare'), note('Project code')]).toEqual([['used by Hello'], [], ['look-ups, no app needed'], ['installs the project, no app needed']])
  // Can't yet: Hello changes things with Stripe and she holds Read. The line comes with the one press that fixes it.
  expect(cant()).toEqual([gap]); expect(screen.getByRole('button', { name: give('Hello') }).textContent).toBe('Give what it needs')
  expect(screen.queryByText('Not saved yet')).toBeNull()
  // A key's level changed by hand: raised, nothing is left that can't run; at None, Hello can't use the key at all.
  pick('Stripe', 'Read & write'); expect(cant()).toEqual([fine]); expect(screen.getByText('Not saved yet')).toBeTruthy()
  pick('Stripe', 'None'); expect([cant(), note('Stripe')]).toEqual([["! Hello can't use Stripe yet"], ['used by Hello']])
  // An area's level changed by hand: at Look up Hello only looks things up, so Read is enough for it.
  pick('Hello', 'Look up'); expect(cant()).toEqual(["! Hello can't use Stripe yet"])
  pick('Stripe', 'Read'); expect(cant()).toEqual([fine])
  // At None the area opens nothing, and its key is used by no app she has. An area with no screen opens no app of its own.
  pick('Hello', 'None'); expect([note('Hello'), note('Stripe'), cant()]).toEqual([[], [], [fine]])
  pick('Customers', 'Look up'); expect(note('Customers')).toEqual(['no screen'])
  // No level changed by hand is marked, and none marks a starting point.
  expect([fresh(), pressed()]).toEqual([[], []])
  const list = listed(); click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'kim@shop.com', removed: false, role: null, ...list }])
  expect(list).toEqual({ apps: { hello: null, payroll: null, tips: null, customers: 'read' }, keys: { stripe: 'read', bank: null, cloudflare: 'read', code: null } })
  // A key an app uses that also works with no app says both.
  cleanup(); roster.keys[0].alone = true
  open('people/kim@shop.com'); await panel('kim@shop.com'); expect(note('Stripe')).toEqual(['used by Hello · look-ups, no app needed'])
})
it('each press in Start from fills what the app or skill needs and marks it, takes it back when pressed again, and saves nothing until the save', async () => {
  roster.people.push(person('pat@shop.com'))
  open('people/pat@shop.com'); await panel('pat@shop.com')
  expect([held(), cant()]).toEqual([{}, [fine]]); expect(screen.queryByText('Not saved yet')).toBeNull()
  // An app gives Look up on its area and Read on each key it uses, never more. Both lines are marked new, and the button shows as pressed.
  start('Payroll')
  expect([held(), fresh(), pressed()]).toEqual([{ Payroll: 'Look up', Bank: 'Read' }, ['Payroll new', 'Bank new'], ['Payroll ✓']])
  const payroll = level('Start from').getByRole('button', { name: 'Payroll' }); expect([payroll.getAttribute('aria-pressed'), payroll.querySelector('[aria-hidden="true"]')!.textContent]).toEqual(['true', ' ✓'])
  expect(level('Payroll').getByText('new').tagName).toBe('STRONG'); expect([note('Payroll'), note('Bank'), cant()]).toEqual([['opens Payroll app'], ['used by Payroll'], [fine]])
  // The panel says the change waits, and nothing has been sent.
  expect(screen.getByText('Not saved yet')).toBeTruthy(); expect(posts('people')).toHaveLength(0)
  // A skill gives every level it needs: Look up & change where it changes things, Look up where it reads, Read & write on Stripe, and Project code.
  start(REFUND)
  expect(held()).toEqual({ Hello: 'Look up & change', Payroll: 'Look up', Customers: 'Look up', Stripe: 'Read & write', Bank: 'Read', 'Project code': 'Read' })
  expect([fresh(), pressed()]).toEqual([['Hello new', 'Payroll new', 'Customers new', 'Stripe new', 'Bank new', 'Project code new'], ['Payroll ✓', `${REFUND} ✓`]])
  // Each area now names the skill among what it opens, and everything she has can run.
  expect([note('Hello'), note('Customers'), note('Stripe'), cant()]).toEqual([[`opens Hello app, ${REFUND}`], [`no screen · opens ${REFUND}`], ['used by Hello'], [fine]])
  // An app the set already covers raises nothing and lowers nothing, and is still marked as pressed.
  const before = reach(); start('Hello')
  expect([reach(), pressed()]).toEqual([before, ['Hello ✓', 'Payroll ✓', `${REFUND} ✓`]]); expect(fresh()).toHaveLength(6)
  expect(posts('people')).toHaveLength(0)
  // Pressed again, the skill takes back what it filled and what was started after it: Hello is unmarked too, and Payroll's own lines stay.
  start(REFUND)
  expect([held(), fresh(), pressed()]).toEqual([{ Payroll: 'Look up', Bank: 'Read' }, ['Payroll new', 'Bank new'], ['Payroll ✓']])
  // Press one, press another, press the first again: both are unmarked, every mark is gone and the set is as it was, with nothing to save.
  start(REFUND); expect(pressed()).toEqual(['Payroll ✓', `${REFUND} ✓`]); start('Payroll')
  expect([held(), fresh(), pressed()]).toEqual([{}, [], []]); expect(screen.queryByText('Not saved yet')).toBeNull()
  // The save sends exactly what Can reach shows, with every area and key named.
  start(REFUND); expect(fresh()).toEqual(['Hello new', 'Customers new', 'Stripe new', 'Project code new']); expect(posts('people')).toHaveLength(0)
  const list = listed(); roster.people[4] = person('pat@shop.com', { apps: { hello: 'write', customers: 'read' }, keys: { stripe: 'write', code: 'read' } })
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'pat@shop.com', removed: false, role: null, ...list }])
  expect(list).toEqual({ apps: { hello: 'write', payroll: null, tips: null, customers: 'read' }, keys: { stripe: 'write', bank: null, cloudflare: null, code: 'read' } })
  // Saved, the lines are hers: opened again, nothing is marked new and no starting point is pressed.
  fireEvent.click(await screen.findByText('2 apps, 2 keys')); await panel('pat@shop.com')
  expect([held(), fresh(), pressed(), cant()]).toEqual([{ Hello: 'Look up & change', Customers: 'Look up', Stripe: 'Read & write', 'Project code': 'Read' }, [], [], [fine]])
})
it('a level changed by hand clears the pressed marks and its own new mark, and Give what it needs raises a set to what an app or a skill lacks', async () => {
  open('people/kim@shop.com'); await panel('kim@shop.com')
  // One press gives Hello what it does with Stripe: that line is marked new and Hello shows as the starting point. Nothing is sent.
  click(give('Hello'))
  expect([held().Stripe, fresh(), pressed(), cant()]).toEqual(['Read & write', ['Stripe new'], ['Hello ✓'], [fine]]); expect(posts('people')).toHaveLength(0)
  // Pressed again in Start from, Hello takes that back.
  start('Hello'); expect([held().Stripe, fresh(), pressed(), cant()]).toEqual(['Read', [], [], [gap]])
  // The skill raises three lines: she already has Hello at Look up & change, and no level is lowered.
  start(REFUND); expect([fresh(), pressed()]).toEqual([['Customers new', 'Stripe new', 'Project code new'], [`${REFUND} ✓`]])
  // One of them changed by hand makes the set the owner's own: no starting point is marked, that line loses its mark, the others keep theirs.
  pick('Stripe', 'Read'); expect([fresh(), pressed()]).toEqual([['Customers new', 'Project code new'], []])
  // Hello and the skill both lack what Stripe was lowered from, and each names what it is short of.
  expect(cant()).toEqual([gap, `! ${REFUND}: Stripe Read & write`]); expect([note('Hello'), note('Customers')]).toEqual([['opens Hello app'], ['no screen']])
  expect(within(part("Can't yet")).getAllByRole('button').map(button => button.textContent)).toEqual(Array(2).fill('Give what it needs'))
  click(give(REFUND))
  expect([held().Stripe, fresh(), pressed(), cant()]).toEqual(['Read & write', ['Customers new', 'Stripe new', 'Project code new'], [`${REFUND} ✓`], [fine]])
  // An area changed by hand does the same. A skill counts only while every area it calls is held, so nothing is short.
  pick('Customers', 'None'); expect([fresh(), pressed(), cant()]).toEqual([['Stripe new', 'Project code new'], [], [fine]])
  // A line no starting point raised changes with no mark of its own, and the marked ones stay.
  pick('Bank', 'Read'); expect(fresh()).toEqual(['Stripe new', 'Project code new'])
  const list = listed(); click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'kim@shop.com', removed: false, role: null, ...list }])
  expect(list).toEqual({ apps: { hello: 'write', payroll: null, tips: null, customers: null }, keys: { stripe: 'write', bank: 'read', cloudflare: 'read', code: 'read' } })
})
it('a line two starting points raised keeps its new mark when only the later one is taken back', async () => {
  roster.people.push(person('pat@shop.com'))
  open('people/pat@shop.com'); await panel('pat@shop.com')
  // Hello gives Look up and Read; the skill raises both further; the skill pressed again puts them back to what Hello gave.
  start('Hello'); start(REFUND); start(REFUND)
  expect([held(), pressed()]).toEqual([{ Hello: 'Look up', Stripe: 'Read' }, ['Hello ✓']])
  // Hello's press still stands and is not saved yet, so its two lines stay marked.
  expect(fresh()).toEqual(['Hello new', 'Stripe new'])
})
it('moving from a role to their own set starts from what that role gave', async () => {
  open('people/sam@shop.com'); fireEvent.change(await screen.findByLabelText('Role'), { target: { value: '' } })
  expect([held(), fresh(), pressed()]).toEqual([{ Hello: 'Look up & change', 'Tip calculator': 'Look up', Stripe: 'Read' }, [], []])
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'sam@shop.com', removed: false, role: null, apps: { hello: 'write', payroll: null, tips: 'read', customers: null }, keys: { stripe: 'read', bank: null, cloudflare: null, code: null } }])
  cleanup()
  // Kim has her own set: picking a role hides the three parts, and coming back starts from that role too.
  open('people/kim@shop.com'); fireEvent.change(await screen.findByLabelText('Role'), { target: { value: 'sales' } })
  expect(boxes()).toEqual([MANAGE]); expect(screen.queryByRole('group', { name: 'Can reach' })).toBeNull(); expect(screen.getByText('From the Sales role:')).toBeTruthy()
  fireEvent.change(role(), { target: { value: '' } })
  expect(held()).toEqual({ Hello: 'Look up & change', 'Tip calculator': 'Look up', Stripe: 'Read' })
})
it('adds a person with a role in one save, from the keyboard, with every control labelled', async () => {
  open(); fireEvent.click(await screen.findByRole('link', { name: 'Add person' }))
  const email = await screen.findByLabelText('Email'); expect(document.activeElement).toBe(email)
  expect(where()).toBe('/apps/access/people/new'); expect(await panel('Add person')).toBeTruthy()
  expect([held(), pressed(), cant()]).toEqual([{}, [], [fine]])
  expect(screen.getByText('A new person starts with no apps. Project code is shared separately.')).toBeTruthy()
  // The three parts and the owner's tick are each a group under its own name.
  expect(['Start from', 'Can reach', "Can't yet", 'Managing'].map(name => part(name).tagName)).toEqual(Array(4).fill('FIELDSET'))
  // Each level choice is one radio group with its area or key as the legend: arrow keys move inside it, Tab moves to the next.
  const groups = lines().map(line => new Set(within(line).getAllByRole('radio').map(radio => (radio as HTMLInputElement).name)))
  expect(groups.map(names => names.size)).toEqual(Array(8).fill(1)); expect(new Set(groups.flatMap(names => Array.from(names))).size).toBe(8)
  // Four areas with three levels each, two keys with three and two that are Read only.
  expect(level('Can reach').getAllByRole('radio')).toHaveLength(22)
  // A starting point is a button of its own: it never sends the form.
  expect(starts().map(button => button.getAttribute('type'))).toEqual(Array(4).fill('button'))
  fireEvent.change(email, { target: { value: 'new@shop.com' } }); fireEvent.change(role(), { target: { value: 'sales' } })
  // Enter in a field submits the form: no pointer is needed.
  fireEvent.submit(email.closest('form')!); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'new@shop.com', removed: false, role: 'sales' }])
})
it('holds every control while a save is on its way, and Cancel goes back without saving', async () => {
  open('people/kim@shop.com'); await screen.findByRole('button', { name: 'Save access' })
  click('Cancel'); await closed(); expect(where()).toBe('/apps/access/')
  fireEvent.click((await row('kim@shop.com')).getByRole('link', { name: 'kim@shop.com' })); expect(posts('people')).toHaveLength(0)
  const save = await screen.findByRole('button', { name: 'Save access' })
  let finish: (reply: Response) => void = () => {}
  fetchMock.mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve }))
  click('Save access'); expect(save.closest('fieldset')!.disabled).toBe(true)
  await act(async () => finish(Response.json(roster))); await screen.findByText('Saved.')
  expect(posts('people')).toHaveLength(1)
})
it('says so when there is no app, skill or key to give yet', async () => {
  roster.areas = []; roster.skills = []; roster.appKeys = {}; roster.keys = []
  open('people/new'); await screen.findByText('No apps built yet. Ask your assistant to make one.')
  expect(screen.getByText('No keys saved yet.')).toBeTruthy(); expect(boxes()).toEqual([MANAGE])
  // With nothing to start from, the first part has a line and no button, and nothing can be short.
  expect(starts()).toEqual([]); expect(note('Start from')).toEqual(['No apps or skills yet. Ask your assistant to make one.']); expect(cant()).toEqual([fine])
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@shop.com' } }); click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'new@shop.com', removed: false, role: null, apps: {}, keys: {} }])
  // An area with no screen is no starting point either, and is still given a level.
  cleanup(); roster.areas = [area('customers', 'Customers', false)]
  open('people/new'); await screen.findByText('No keys saved yet.')
  expect([starts(), note('Start from'), reach(), note('Customers')]).toEqual([[], ['No apps or skills yet. Ask your assistant to make one.'], { Customers: 'None' }, ['no screen']])
  expect(screen.queryByText('No apps built yet. Ask your assistant to make one.')).toBeNull()
})
it('the owner picks a manager with one tick in the last group, full trust said right under it, and the save carries it', async () => {
  open('people/kim@shop.com'); await panel('kim@shop.com')
  const group = part('Managing')
  // Below the three parts of her set, so the common edits come first.
  expect(part("Can't yet").compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(managing().checked).toBe(false); expect(within(group).getAllByRole('checkbox')).toHaveLength(1)
  // The warning is plain text at full weight, never muted.
  const trust = within(group).getByText('Full trust. A manager can add and remove people and give anyone, themselves included, any app or key level.')
  expect([trust.tagName, trust.className]).toEqual(['P', ''])
  expect(screen.queryByText(/only the owner changes this/)).toBeNull()
  fireEvent.click(managing()); expect(ticks()).toEqual([MANAGE])
  roster.people[1].manager = true
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'kim@shop.com', removed: false, role: null, apps: { hello: 'write', payroll: null, tips: null, customers: null },
    keys: { stripe: 'read', bank: null, cloudflare: 'read', code: null }, manager: true }])
  expect((await cells('kim@shop.com'))[0]).toBe('kim@shop.com Manager'); expect(picked('kim@shop.com')).toBe('Own set')
  // It works the same for a person with a role, and for a new person; unticking sends the switch off.
  roster.people[2].manager = true
  cleanup(); open('people/lee@shop.com'); await panel('lee@shop.com')
  expect(managing().checked).toBe(true); fireEvent.click(managing())
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')[1]).toEqual({ email: 'lee@shop.com', removed: false, role: 'sales', manager: false })
  cleanup(); open('people/new'); fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'new@shop.com' } })
  expect(managing().checked).toBe(false); fireEvent.click(managing())
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')[2]).toEqual({ email: 'new@shop.com', removed: false, role: null, apps: { hello: null, payroll: null, tips: null, customers: null },
    keys: { stripe: null, bank: null, cloudflare: null, code: null }, manager: true })
})
it('a tick left as it was is no change: closing asks nothing, and the save names no manager', async () => {
  roster.people[1].manager = true
  open('people/kim@shop.com'); await screen.findByRole('button', { name: 'Save access' })
  expect(managing().checked).toBe(true)
  // A changed tick asks before the panel closes; put back, it closes at once.
  fireEvent.click(managing()); click('Cancel')
  expect(screen.getByRole('alertdialog', { name: 'Leave without saving?' })).toBeTruthy(); click('Keep editing')
  fireEvent.click(managing()); click('Cancel')
  expect(screen.queryByRole('alertdialog')).toBeNull(); await closed()
  fireEvent.click((await row('kim@shop.com')).getByRole('link', { name: 'kim@shop.com' })); expect(posts('people')).toHaveLength(0)
  // Another change saves without the switch: left out, Kim keeps it.
  await screen.findByRole('button', { name: 'Save access' }); start('Payroll')
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'kim@shop.com', removed: false, role: null, apps: { hello: 'write', payroll: 'read', tips: null, customers: null },
    keys: { stripe: 'read', bank: 'read', cloudflare: 'read', code: null } }])
})
it("a manager has no tick to set: opened, a manager says only the owner changes it, and their save never names it", async () => {
  roster.viewer = { email: 'kim@shop.com', owner: false }; roster.people[1].manager = true
  open('people/kim@shop.com'); await panel('kim@shop.com')
  // A plain line under the sign-in state, above the role.
  const said = screen.getByText('Manager · only the owner changes this')
  expect(said.compareDocumentPosition(role()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(screen.queryByRole('group', { name: 'Managing' })).toBeNull(); expect(screen.queryByRole('checkbox')).toBeNull()
  expect(screen.queryByText(/Full trust/)).toBeNull()
  // A manager changes a manager's areas and levels, their own included.
  start('Payroll'); click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'kim@shop.com', removed: false, role: null, apps: { hello: 'write', payroll: 'read', tips: null, customers: null },
    keys: { stripe: 'read', bank: 'read', cloudflare: 'read', code: null } }])
  // Someone who is not a manager has no such line, and a new person no tick.
  for (const [path, wait] of [['people/lee@shop.com', 'lee@shop.com'], ['people/new', 'Add person']]) {
    cleanup(); open(path); await panel(wait)
    expect(screen.queryByText(/only the owner changes this/), path).toBeNull(); expect(screen.queryByRole('checkbox', { name: MANAGE }), path).toBeNull()
  }
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@shop.com' } }); click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')[1]).toEqual({ email: 'new@shop.com', removed: false, role: null, apps: { hello: null, payroll: null, tips: null, customers: null },
    keys: { stripe: null, bank: null, cloudflare: null, code: null } })
})
