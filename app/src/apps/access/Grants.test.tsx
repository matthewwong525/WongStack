// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { App } from './App'
import { FINISH_REQUEST, PROJECT_REQUEST } from './status'
import type { Area, Person, SavedKey, Status } from '../../lib/access'

// The Keys and Apps views, and the two opened items that save through `grants`.
// A shop with three apps and one area with no screen: Hello changes things with Stripe, Payroll with Bank, and the tip
// calculator and Customers use no key. One skill refunds a customer through Hello.
const key = (id: string, title: string, changes: Partial<SavedKey> = {}): SavedKey => ({ id, title, levels: ['read', 'write'], saved: true, setup: false, usedBy: [], alone: false, ...changes })
const area = (id: string, title: string, screen = true): Area => ({ id, title, description: '', screen })
const person = (email: string, changes: Partial<Person> = {}): Person => ({ email, status: 'active', settled: true, role: null, manager: false, apps: {}, keys: {}, ...changes })
// Sales changes things in Hello and looks things up in the tip calculator; Kim, with her own set, looks things up in Hello.
const sales = (): Pick<Person, 'apps' | 'keys'> => ({ apps: { hello: 'write', tips: 'read' }, keys: { stripe: 'read' } })
const status = (): Status => ({ ownerEmail: 'owner@shop.com', viewer: { email: 'owner@shop.com', owner: true }, environment: 'live', key: 'ready', started: true, imported: 0,
  keysStarted: true, kept: 0, appKeys: { hello: [{ id: 'stripe', need: 'write' }], payroll: [{ id: 'bank', need: 'write' }], tips: [], customers: [] },
  areas: [area('hello', 'Hello'), area('payroll', 'Payroll'), area('tips', 'Tip calculator'), area('customers', 'Customers', false)],
  skills: [{ id: 'refund', title: 'Refund a customer', areas: { hello: 'write' }, keys: { stripe: 'write' } }],
  keys: [key('stripe', 'Stripe', { usedBy: [{ app: 'hello', need: 'write' }] }), key('bank', 'Bank', { usedBy: [{ app: 'payroll', need: 'write' }] }),
    key('cloudflare', 'Cloudflare', { levels: ['read'], setup: true, alone: true })],
  roles: [{ id: 'office', name: 'Office', apps: {}, keys: {} }, { id: 'sales', name: 'Sales', ...sales() }],
  people: [person('gone@shop.com', { status: 'removed' }), person('kim@shop.com', { apps: { hello: 'read' }, keys: { stripe: 'read', cloudflare: 'read' } }),
    person('lee@shop.com', { role: 'sales', ...sales() }), person('sam@shop.com', { role: 'sales', ...sales() })],
  work: [], project: 'ready' })
let roster: Status
let failed: Set<string>
let fetchMock: ReturnType<typeof vi.fn>
// The screens a person can open: every area that has one.
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
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(async () => {}) } })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
const Where = () => <span data-testid="where">{decodeURIComponent(useLocation().pathname)}</span>
const open = (path = '') => render(<MemoryRouter initialEntries={[`/apps/access/${path}`]}><Where /><Routes><Route path="/apps/:name/*" element={<App />} /></Routes></MemoryRouter>)
const where = () => screen.getByTestId('where').textContent
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const posts = (path: string) => fetchMock.mock.calls.filter(([url, init]) => url.endsWith(path) && init?.method === 'POST')
const sent = (path: string) => posts(path).map(([, init]) => JSON.parse(init.body))
const reads = (path: string) => fetchMock.mock.calls.filter(([url, init]) => url.endsWith(path) && init?.method !== 'POST')
const checked = (inputs: HTMLElement[]) => inputs.filter(input => (input as HTMLInputElement).checked).map(input => input.parentElement!.textContent)
// One key's or app's row in a list and what its cells say.
const row = async (title: string) => within((await screen.findByRole('link', { name: title })).closest('tr')!)
const cells = async (title: string) => Array.from((await screen.findByRole('link', { name: title })).closest('tr')!.querySelectorAll('td')).map(cell => cell.textContent)
const columns = (table: HTMLElement) => within(table).getAllByRole('columnheader').map(cell => cell.textContent)
// The panel a key or an app is opened in, by its name, and that none is open any more.
const panel = async (name: string) => within(await screen.findByRole('dialog', { name }))
const closed = () => waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
// One role or person in a panel, by the words beside them: their tick, and every level chosen beside it, in order. An app's
// panel holds several level choices per role or person, so `legend` names the one meant: the app's own, or a key's.
const who = (name: string, legend?: string) => {
  const group = within(screen.getByRole('group', { name }))
  return legend ? within(group.getByRole('group', { name: legend })) : group
}
const tick = (name: string) => who(name).getByRole('checkbox') as HTMLInputElement
const offered = (name: string, legend?: string) => who(name, legend).getAllByRole('radio').map(radio => radio.parentElement!.textContent)
const chosen = (name: string) => checked(who(name).getAllByRole('radio'))
const pick = (name: string, level: string, legend?: string) => fireEvent.click(who(name, legend).getByRole('radio', { name: level }))
const unfinished = 'That did not finish. Check the list below before trying again.'
const follows = (first: Element, second: Element) => !!(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)
const [office, team, kim] = ['Office · nobody yet', 'Sales · lee@shop.com, sam@shop.com', 'kim@shop.com']

it('lists every key on one line: whether it is saved, what uses it, and how many have it in a column per level, the owner first', async () => {
  roster.keys.push(key('maps', 'Maps', { saved: false, usedBy: [{ app: 'tips', need: 'read' }] })); roster.appKeys.tips = [{ id: 'maps', need: 'read' }]
  roster.roles[0].keys = { stripe: 'write' }
  open(); fireEvent.click(await screen.findByRole('link', { name: /^Keys/ }))
  const table = await screen.findByRole('table', { name: 'Keys' })
  expect(columns(table)).toEqual(['Key', 'Saved', 'Used by', 'Read & write', 'Read'])
  // No button adds a key: a quiet line under the list says how one arrives.
  expect(follows(table, screen.getByText('Your assistant sends a link for a new key.'))).toBe(true); expect(screen.queryByRole('link', { name: /Add/ })).toBeNull()
  // The higher level first; the owner before the rest, at the most the key offers; counts, not names.
  expect(await cells('Stripe')).toEqual(['Stripe', 'Saved', '1 app', 'Owner, 1 role', '1 role, 1 person'])
  expect(await cells('Bank')).toEqual(['Bank', 'Saved', '1 app', 'Owner', 'Nobody'])
  expect(await cells('Cloudflare')).toEqual(['Cloudflare', 'Saved', 'Look-ups', 'Nobody', 'Owner, 1 person'])
  expect(document.querySelector('[data-slot="badge"]')).toBeNull()
  const stripe = await row('Stripe')
  expect(stripe.getByRole('link', { name: 'Stripe' }).getAttribute('href')).toBe('/apps/access/keys/stripe')
  // What uses a key is cut short when it is long, with the whole of it in its title.
  expect(stripe.getByText('1 app').title).toBe('1 app')
  // A key that is not saved yet keeps the row's shape and says its state in words, with nothing to copy in the row.
  expect(await cells('Maps')).toEqual(['Maps', 'Not saved yet', '1 app', 'Owner', 'Nobody'])
  const maps = await row('Maps'); expect(maps.queryByRole('button')).toBeNull()
  // It opens like any other, and its next step is in the panel.
  fireEvent.click(maps.getByText('Not saved yet')); const opened = await panel('Maps'); expect(where()).toBe('/apps/access/keys/maps')
  expect([!!opened.getByText('Not saved yet'), !!opened.getByText('Ask your assistant for the key link.'), opened.queryByRole('button', { name: /Copy/ })]).toEqual([true, true, null])
  click('Close'); await closed(); expect(where()).toBe('/apps/access/keys')
  // A click anywhere on a saved key's row opens it too, with its row marked.
  fireEvent.click((await row('Bank')).getByText('Saved')); const bank = await panel('Bank'); expect(where()).toBe('/apps/access/keys/bank')
  expect(screen.getByRole('table', { name: 'Keys' }).querySelector('tr[aria-current="true"] a')!.textContent).toBe('Bank')
  expect([!!bank.getByText('Saved'), bank.queryByText('Ask your assistant for the key link.')]).toEqual([true, null])
  // The apps that use it are named by their titles in the list of areas.
  expect(bank.getByText('Used by Payroll: look up, change')).toBeTruthy()
})
it('says one step is left for the key setup makes, with the request to copy where the owner opens it, and how a key arrives when there are none', async () => {
  roster.keys[2].saved = false
  open('keys'); const cloudflare = await row('Cloudflare')
  // The row keeps its shape and stays one line: the key, its state in words, and nothing to copy.
  expect(await cells('Cloudflare')).toEqual(['Cloudflare', 'One step left', 'Look-ups', 'Nobody', 'Owner, 1 person'])
  expect(cloudflare.queryByRole('button')).toBeNull(); expect(screen.queryByText('Finish Access setup')).toBeNull()
  // Opened, it says the next step and offers the request to copy.
  fireEvent.click(cloudflare.getByRole('link', { name: 'Cloudflare' })); const opened = await panel('Cloudflare')
  expect(opened.getByText('One step left')).toBeTruthy()
  expect(opened.getByText(/^Look-ups need a read-only key\. Ask your assistant:/)).toBeTruthy(); expect(opened.getByText('Finish Access setup')).toBeTruthy()
  expect(opened.queryByText('Ask your assistant for the key link.')).toBeNull()
  fireEvent.click(opened.getByRole('button', { name: 'Copy that request' }))
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(FINISH_REQUEST))
  cleanup(); roster.keys = []; open('keys'); await screen.findByText('No keys saved yet.')
  expect(screen.getByText('When an app needs a service, your assistant sends a private link for its key. It shows up here.')).toBeTruthy()
  expect(screen.queryByRole('table')).toBeNull(); expect(screen.queryByText('Your assistant sends a link for a new key.')).toBeNull()
})
it("tells a manager who opens the key setup makes that it is the owner's step, with nothing to copy", async () => {
  roster.keys[2].saved = false; roster.viewer = { email: 'kim@shop.com', owner: false }
  open('keys'); expect((await cells('Cloudflare'))[1]).toBe('One step left')
  fireEvent.click((await row('Cloudflare')).getByText('One step left')); const opened = await panel('Cloudflare')
  expect(opened.getByText('Look-ups need a read-only key. owner@shop.com finishes that in Access setup.')).toBeTruthy()
  expect(opened.queryByText('Finish Access setup')).toBeNull(); expect(opened.queryByRole('button', { name: /Copy/ })).toBeNull()
  expect(opened.getByText('One step left')).toBeTruthy()
})
it('says on a preview that the key setup makes is not on previews yet, with no step to ask for', async () => {
  roster.environment = 'practice'; roster.key = 'practice'; roster.keys[2].saved = false
  roster.keys.push(key('maps', 'Maps', { saved: false }))
  open('keys')
  expect([(await cells('Cloudflare'))[1], (await cells('Maps'))[1], (await cells('Stripe'))[1]]).toEqual(['Not on previews yet', 'Not saved yet', 'Saved'])
  // No step can finish it on a preview: opened, it says only where it stands.
  fireEvent.click((await row('Cloudflare')).getByText('Not on previews yet')); const opened = await panel('Cloudflare')
  expect(opened.getByText('Not on previews yet')).toBeTruthy(); expect(opened.getByText('Look-ups, no app needed · Read only')).toBeTruthy()
  expect(opened.queryByText('One step left')).toBeNull(); expect(opened.queryByText('Finish Access setup')).toBeNull()
  expect(opened.queryByText('Ask your assistant for the key link.')).toBeNull(); expect(screen.queryByRole('button', { name: /Copy/ })).toBeNull()
  // A key that arrives through its link still says so on a preview.
  cleanup(); open('keys/maps'); expect((await panel('Maps')).getByText('Ask your assistant for the key link.')).toBeTruthy()
})
it('Project code opened from Keys names the step a person\'s page shows, and its level there is the same choice as the tick', async () => {
  const code = key('code', 'Project code', { levels: ['read'], saved: false, alone: true })
  roster.keys.push(code, key('maps', 'Maps', { saved: false })); roster.project = 'key'; roster.people[1].keys = { code: 'read' }
  open('keys'); expect(await cells('Project code')).toEqual(['Project code', 'Not saved yet', 'Installs the project', 'Nobody', 'Owner, 1 person'])
  fireEvent.click((await row('Project code')).getByRole('link', { name: 'Project code' })); const opened = await panel('Project code')
  expect(opened.getByText('Not saved yet')).toBeTruthy(); expect(opened.queryByText('Ask your assistant for the key link.')).toBeNull()
  expect(opened.getByText(/The app needs a read-only GitHub key to hand the project out\. Ask your assistant:/)).toBeTruthy(); expect(opened.getByText('Let teammates install the project')).toBeTruthy()
  fireEvent.click(opened.getByRole('button', { name: 'Copy that request' }))
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(PROJECT_REQUEST))
  // A tick saved on a person's page reads as Read here, and the level still saves before the key arrives.
  expect([offered(kim), chosen(kim), chosen(office)]).toEqual([['None', 'Read'], ['Read'], ['None']])
  // Another key that is not saved still comes through its link.
  cleanup(); open('keys/maps'); expect((await panel('Maps')).getByText('Ask your assistant for the key link.')).toBeTruthy()
  // An install with no project recorded is sent to Access setup; a manager reads that either step is the owner's.
  cleanup(); roster.project = 'setup'; open('keys/code'); const unset = await panel('Project code')
  expect(unset.getByText('Finish Access setup')).toBeTruthy(); expect(unset.queryByText(/GitHub/)).toBeNull()
  fireEvent.click(unset.getByRole('button', { name: 'Copy that request' }))
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(FINISH_REQUEST))
  cleanup(); roster.project = 'key'; roster.viewer = { email: 'kim@shop.com', owner: false }; open('keys/code'); const managed = await panel('Project code')
  expect(managed.getByText('One step first for the owner.').parentElement!.textContent).toBe('One step first for the owner. owner@shop.com adds a read-only GitHub key.')
  expect(managed.queryByRole('button', { name: /Copy/ })).toBeNull()
  // Saved, it says so and asks for nothing.
  cleanup(); roster.project = 'ready'; roster.keys[3].saved = true; open('keys/code'); const saved = await panel('Project code')
  expect(saved.getByText('Saved')).toBeTruthy(); expect(saved.queryByText(/One step first/)).toBeNull()
})
it('sets one key for every role and every person with their own set, in one panel and in one save', async () => {
  open('keys'); fireEvent.click((await row('Stripe')).getByRole('link', { name: 'Stripe' }))
  const opened = await panel('Stripe'); expect(where()).toBe('/apps/access/keys/stripe')
  // The list and the five views stay in place beside it.
  expect(screen.getByRole('table', { name: 'Keys' })).toBeTruthy(); expect(screen.getByRole('navigation', { name: 'Access views' })).toBeTruthy()
  expect(opened.getByText('Saved')).toBeTruthy(); expect(opened.getByText('Used by Hello: look up, change')).toBeTruthy()
  expect([chosen(office), chosen(team), chosen(kim)]).toEqual([['None'], ['Read'], ['Read']])
  // A person who holds a role has the role's level, so they have no choice of their own; a removed person has none.
  for (const name of ['lee@shop.com', 'sam@shop.com', 'gone@shop.com']) expect(screen.queryByRole('group', { name })).toBeNull()
  pick(office, 'Read & write'); pick(kim, 'None'); expect([chosen(office), chosen(kim)]).toEqual([['Read & write'], ['None']])
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('grants')).toEqual([{ key: 'stripe', roles: { office: 'write', sales: 'read' }, people: { 'kim@shop.com': null } }])
  expect(where()).toBe('/apps/access/keys')
  // A Read-only key offers two choices to everyone.
  cleanup(); open('keys/cloudflare'); expect((await panel('Cloudflare')).getByText('Look-ups, no app needed · Read only')).toBeTruthy()
  expect([offered(office), offered(kim), chosen(kim)]).toEqual([['None', 'Read'], ['None', 'Read'], ['Read']])
  cleanup(); roster.roles = []; roster.people = []; open('keys/bank'); await screen.findByText('No roles or people yet.')
})
it('lists each app on one line with the keys it uses and how many have it, the owner first, and an area with no screen beside them', async () => {
  open(); fireEvent.click(await screen.findByRole('link', { name: /^Apps/ }))
  const table = await screen.findByRole('table', { name: 'Apps' })
  expect(columns(table)).toEqual(['App', 'Uses', 'Who has it'])
  // No button adds an app: a quiet line under the list says how one is made.
  expect(follows(table, screen.getByText('Ask your assistant to build an app.'))).toBe(true); expect(screen.queryByRole('link', { name: /Add/ })).toBeNull()
  // A role or a person has an app at either level.
  expect(await cells('Hello')).toEqual(['Hello', 'Stripe: look up, change', 'Owner, 1 role, 1 person'])
  expect(await cells('Payroll')).toEqual(['Payroll', 'Bank: look up, change', 'Owner'])
  expect(await cells('Tip calculator')).toEqual(['Tip calculator', 'No keys', 'Owner, 1 role'])
  // An area with no screen is listed like an app and says so beside its name.
  expect(await cells('Customers')).toEqual(['Customers No screen', 'No keys', 'Owner'])
  expect((await row('Hello')).getByRole('link', { name: 'Hello' }).getAttribute('href')).toBe('/apps/access/apps/hello')
  expect(document.querySelector('[data-slot="badge"]')).toBeNull()
  // A click anywhere on the row opens the app beside the list.
  fireEvent.click((await row('Tip calculator')).getByText('No keys')); await panel('Tip calculator'); expect(where()).toBe('/apps/access/apps/tips')
  expect(table.querySelector('tr[aria-current="true"] a')!.textContent).toBe('Tip calculator')
  cleanup(); roster.areas = []; open('apps'); await screen.findByText('No apps built yet. Ask your assistant to make one.')
  expect(screen.queryByRole('table')).toBeNull(); expect(screen.queryByText('Ask your assistant to build an app.')).toBeNull()
})
it('gives an app to roles and people, with its own level and the levels of the keys it uses beside each tick', async () => {
  open('apps'); fireEvent.click((await row('Hello')).getByRole('link', { name: 'Hello' }))
  const opened = await panel('Hello'); expect(where()).toBe('/apps/access/apps/hello')
  expect(screen.getByRole('table', { name: 'Apps' })).toBeTruthy(); expect(screen.getByRole('navigation', { name: 'Access views' })).toBeTruthy()
  expect(opened.getByText('Uses Stripe: look up, change')).toBeTruthy(); expect(opened.getByText('A level holds in every app.')).toBeTruthy()
  expect([tick(office).checked, tick(team).checked, tick(kim).checked]).toEqual([false, true, true])
  // Beside a tick: the app's own level, named by the app, then the level of each key it uses.
  expect(who(office).queryByRole('radio')).toBeNull(); expect([chosen(team), chosen(kim)]).toEqual([['Look up & change', 'Read'], ['Look up', 'Read']])
  expect([offered(team, 'Hello'), offered(team, 'Stripe')]).toEqual([['None', 'Look up', 'Look up & change'], ['None', 'Read', 'Read & write']])
  // Ticking starts the app at Look up and gives Read on its keys still at None, never Read & write.
  fireEvent.click(tick(office)); expect(chosen(office)).toEqual(['Look up', 'Read'])
  // Raising the app's level beside the tick leaves its keys where they are.
  pick(office, 'Look up & change'); expect(chosen(office)).toEqual(['Look up & change', 'Read'])
  pick(kim, 'Read & write'); expect(chosen(kim)).toEqual(['Look up', 'Read & write'])
  // None beside the tick unticks, and takes no key level with it: ticked again, the app starts at Look up and the key is as it was.
  pick(team, 'Read & write'); pick(team, 'None', 'Hello'); expect(tick(team).checked).toBe(false); expect(who(team).queryByRole('radio')).toBeNull()
  fireEvent.click(tick(team)); expect(chosen(team)).toEqual(['Look up', 'Read & write'])
  // An unticked role or person shows no levels, and none are sent for it.
  fireEvent.click(tick(team)); expect(who(team).queryByRole('radio')).toBeNull()
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('grants')).toEqual([{ app: 'hello', roles: { office: 'write', sales: null }, people: { 'kim@shop.com': 'read' },
    keys: { roles: { office: { stripe: 'read' } }, people: { 'kim@shop.com': { stripe: 'write' } } } }])
  expect(where()).toBe('/apps/access/apps')
  // An app that uses no keys has its own level alone beside a tick. A person given it here starts at Look up.
  cleanup(); open('apps/tips'); expect((await panel('Tip calculator')).getByText('Uses no keys')).toBeTruthy()
  expect([offered(team), chosen(team), who(kim).queryByRole('radio')]).toEqual([['None', 'Look up', 'Look up & change'], ['Look up'], null])
  fireEvent.click(tick(kim)); expect(chosen(kim)).toEqual(['Look up']); click('Save access'); await screen.findByText('Saved.')
  expect(sent('grants')[1]).toEqual({ app: 'tips', roles: { office: null, sales: 'read' }, people: { 'kim@shop.com': 'read' }, keys: { roles: { sales: {} }, people: { 'kim@shop.com': {} } } })
  cleanup(); roster.roles = []; roster.people = []; open('apps/payroll'); await screen.findByText('No roles or people yet.')
})
it('gives an area with no screen the same way: it says No screen, and its level sits beside each tick', async () => {
  open('apps'); fireEvent.click((await row('Customers')).getByRole('link', { name: 'Customers' }))
  const opened = await panel('Customers'); expect(where()).toBe('/apps/access/apps/customers')
  expect(opened.getByText('No screen · Uses no keys')).toBeTruthy(); expect(opened.getByText('A level holds in every app.')).toBeTruthy()
  expect(screen.getByRole('table', { name: 'Apps' }).querySelector('tr[aria-current="true"] a')!.textContent).toBe('Customers')
  // Nobody has it yet: a tick each, and no level.
  expect([tick(office).checked, tick(team).checked, tick(kim).checked]).toEqual([false, false, false]); expect(screen.queryByRole('radio')).toBeNull()
  // A person given it here starts at Look up, in a choice named by the area.
  fireEvent.click(tick(kim)); expect([offered(kim, 'Customers'), chosen(kim)]).toEqual([['None', 'Look up', 'Look up & change'], ['Look up']])
  // A role is raised to Look up & change beside its tick. The office keeps None.
  fireEvent.click(tick(team)); pick(team, 'Look up & change'); expect(chosen(team)).toEqual(['Look up & change'])
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('grants')).toEqual([{ app: 'customers', roles: { office: null, sales: 'write' }, people: { 'kim@shop.com': 'read' },
    keys: { roles: { sales: {} }, people: { 'kim@shop.com': {} } } }])
  expect(where()).toBe('/apps/access/apps')
})
it('every row opens its item from the link in its first cell, and no list has an Edit button', async () => {
  for (const [path, name, links] of [['', 'People', ['gone@shop.com', 'kim@shop.com', 'lee@shop.com', 'sam@shop.com']], ['roles', 'Roles', ['Office', 'Sales']],
    ['apps', 'Apps', ['Hello', 'Payroll', 'Tip calculator', 'Customers']], ['skills', 'Skills', ['Refund a customer']], ['keys', 'Keys', ['Stripe', 'Bank', 'Cloudflare']]] as const) {
    open(path); const table = await screen.findByRole('table', { name })
    expect(Array.from(table.querySelectorAll('tbody td:first-child a')).map(link => link.textContent), path).toEqual(links)
    expect(screen.queryByRole('link', { name: 'Edit' }), path).toBeNull()
    cleanup()
  }
})
it('a key or app save that did not finish says so and reads the list again', async () => {
  failed.add('grants')
  for (const [path, title] of [['keys/bank', 'Bank'], ['apps/payroll', 'Payroll']]) {
    open(path); await screen.findByRole('button', { name: 'Save access' }); const before = reads('status').length; click('Save access')
    await screen.findByText(unfinished); await row(title)
    expect(where()).toBe(`/apps/access/${path.split('/')[0]}`); expect(reads('status').length).toBeGreaterThan(before); cleanup()
  }
  expect(posts('grants')).toHaveLength(2)
})
