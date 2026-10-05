// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { App } from './App'
import { FINISH_REQUEST } from './status'
import type { Person, SavedKey, Status } from '../../lib/access'

// The Keys and Apps views, and the two pages that save through `grants`.
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
// One key's or app's row in a list; one role or person on a page, by the words beside them; and a level choice inside either.
const row = async (title: string) => within((await screen.findByText(title)).closest('tr')!)
const columns = (table: HTMLElement) => within(table).getAllByRole('columnheader').map(cell => cell.textContent)
const who = (name: string) => within(screen.getByRole('group', { name }))
const tick = (name: string) => who(name).getByRole('checkbox') as HTMLInputElement
const offered = (name: string) => who(name).getAllByRole('radio').map(radio => radio.parentElement!.textContent)
const chosen = (name: string) => checked(who(name).getAllByRole('radio'))
const pick = (name: string, level: string) => fireEvent.click(who(name).getByRole('radio', { name: level }))
const unfinished = 'That did not finish. Check the list below before trying again.'
// The labels in one row, by the name of each list of them.
const labelled = (box: Awaited<ReturnType<typeof row>>) => box.queryAllByRole('list').map(list => [list.getAttribute('aria-label'), ...within(list).getAllByRole('listitem').map(item => item.textContent)])
const [office, team, kim] = ['Office · nobody yet', 'Sales · lee@shop.com, sam@shop.com', 'kim@shop.com']

it('lists every key as a row: whether it is saved, what uses it, and who has it in a column per level, the owner first', async () => {
  roster.keys.push(key('maps', 'Maps', { saved: false, usedBy: [{ app: 'tips', need: 'read' }] })); roster.appKeys.tips = [{ id: 'maps', need: 'read' }]
  roster.roles[0].keys = { stripe: 'write' }
  open(); fireEvent.click(await screen.findByRole('link', { name: /^Keys/ }))
  expect(columns(await screen.findByRole('table', { name: 'Keys' }))).toEqual(['Key', 'Saved', 'Used by', 'Read & write', 'Read'])
  // No button adds a key: the spot beside the title says how one arrives.
  expect(screen.getByText('Your assistant sends a link for a new key')).toBeTruthy(); expect(screen.queryByRole('link', { name: /Add/ })).toBeNull()
  const stripe = await row('Stripe')
  expect(stripe.getByText('Saved')).toBeTruthy(); expect(stripe.getByText('Used by Hello: look up, change')).toBeTruthy()
  // The higher level first, each holder a label, and the owner before the rest at the most the key offers.
  expect(labelled(stripe)).toEqual([['Read & write', 'Owner', 'Office'], ['Read', 'Sales', 'kim@shop.com']]); expect(stripe.queryByText('Nobody')).toBeNull()
  expect(stripe.getByRole('link', { name: 'Stripe' }).getAttribute('href')).toBe('/apps/access/keys/stripe')
  const bank = await row('Bank')
  expect(labelled(bank)).toEqual([['Read & write', 'Owner']]); expect(bank.getByText('Nobody')).toBeTruthy()
  const cloudflare = await row('Cloudflare')
  expect(cloudflare.getByText('Look-ups, no app needed · Read only')).toBeTruthy(); expect(labelled(cloudflare)).toEqual([['Read', 'Owner', 'kim@shop.com']])
  // A key that is not saved yet keeps the row's shape, says how it arrives, and opens nothing.
  const maps = await row('Maps')
  expect(maps.getByText('Not saved yet')).toBeTruthy(); expect(maps.getByText('Used by Tip calculator: look up')).toBeTruthy()
  expect(maps.getByText('Ask your assistant for the key link')).toBeTruthy(); expect(maps.queryByRole('link')).toBeNull()
  fireEvent.click(maps.getByText('Not saved yet')); expect(where()).toBe('/apps/access/keys')
  // A click anywhere on a saved key's row opens it.
  fireEvent.click(bank.getByText('Saved')); await screen.findByRole('heading', { name: 'Bank · Saved' }); expect(where()).toBe('/apps/access/keys/bank')
})
it('says one step is left for the key setup makes, with the request to copy, and how a key arrives when there are none', async () => {
  roster.keys[2].saved = false
  open('keys'); const cloudflare = await row('Cloudflare')
  // The row keeps its shape: the key, its state, and the step in the cells where the levels would be.
  expect(cloudflare.getByText('One step left')).toBeTruthy(); expect(cloudflare.getAllByRole('cell')).toHaveLength(3)
  expect(cloudflare.getByText(/^Look-ups need a read-only key\. Ask your assistant:/)).toBeTruthy(); expect(cloudflare.getByText('Finish Access setup')).toBeTruthy()
  expect(cloudflare.queryByRole('link')).toBeNull(); expect(cloudflare.queryByText(/Look-ups, no app needed/)).toBeNull()
  fireEvent.click(cloudflare.getByRole('button', { name: 'Copy that request' }))
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(FINISH_REQUEST))
  cleanup(); roster.keys = []; open('keys'); await screen.findByText('No keys saved yet.')
  expect(screen.getByText('When an app needs a service, your assistant sends a private link for its key. It shows up here.')).toBeTruthy()
  expect(screen.queryByRole('table')).toBeNull()
})
it("tells a manager the key setup makes is the owner's step, with nothing to copy", async () => {
  roster.keys[2].saved = false; roster.viewer = { email: 'kim@shop.com', owner: false }
  open('keys'); const cloudflare = await row('Cloudflare')
  expect(cloudflare.getByText('Look-ups need a read-only key. owner@shop.com finishes that in Access setup.')).toBeTruthy()
  expect(cloudflare.queryByText('Finish Access setup')).toBeNull(); expect(cloudflare.queryByRole('button')).toBeNull()
  expect(cloudflare.getByText('One step left')).toBeTruthy(); expect(cloudflare.getAllByRole('cell')).toHaveLength(3)
})
it('says on a preview that the key setup makes is not on previews yet, with no step to ask for', async () => {
  roster.environment = 'practice'; roster.key = 'practice'; roster.keys[2].saved = false
  roster.keys.push(key('maps', 'Maps', { saved: false }))
  open('keys'); const cloudflare = await row('Cloudflare')
  expect(cloudflare.getByText('Not on previews yet')).toBeTruthy(); expect(cloudflare.getByText('Look-ups, no app needed · Read only')).toBeTruthy()
  expect(cloudflare.getAllByRole('cell')).toHaveLength(3)
  expect(cloudflare.queryByText('One step left')).toBeNull(); expect(cloudflare.queryByText('Finish Access setup')).toBeNull()
  expect(cloudflare.queryByRole('button')).toBeNull(); expect(cloudflare.queryByRole('link')).toBeNull()
  expect(cloudflare.queryByText('Ask your assistant for the key link')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Copy that request' })).toBeNull()
  // A key that arrives through its link still says so on a preview, and a saved one is as on the live app.
  expect((await row('Maps')).getByText('Ask your assistant for the key link')).toBeTruthy(); expect((await row('Stripe')).getByText('Saved')).toBeTruthy()
  cleanup(); open('keys/cloudflare'); await screen.findByRole('heading', { name: 'Cloudflare · Not on previews yet' })
})
it('sets one key for every role and every person with their own set, on one page and in one save', async () => {
  open('keys'); fireEvent.click((await row('Stripe')).getByRole('link', { name: 'Stripe' }))
  await screen.findByRole('heading', { name: 'Stripe · Saved' }); expect(where()).toBe('/apps/access/keys/stripe')
  expect(screen.getByRole('link', { name: 'Keys' }).getAttribute('href')).toBe('/apps/access/keys'); expect(screen.getByRole('navigation', { name: 'Access views' })).toBeTruthy()
  expect(screen.getByText('Used by Hello: look up, change')).toBeTruthy()
  expect([chosen(office), chosen(team), chosen(kim)]).toEqual([['None'], ['Read'], ['Read']])
  // A person who holds a role has the role's level, so they have no choice of their own; a removed person has none.
  for (const name of ['lee@shop.com', 'sam@shop.com', 'gone@shop.com']) expect(screen.queryByRole('group', { name })).toBeNull()
  pick(office, 'Read & write'); pick(kim, 'None'); expect([chosen(office), chosen(kim)]).toEqual([['Read & write'], ['None']])
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('grants')).toEqual([{ key: 'stripe', roles: { office: 'write', sales: 'read' }, people: { 'kim@shop.com': null } }])
  expect(where()).toBe('/apps/access/keys')
  // A Read-only key offers two choices to everyone.
  cleanup(); open('keys/cloudflare'); await screen.findByRole('heading', { name: 'Cloudflare · Saved' })
  expect(screen.getByText('Look-ups, no app needed · Read only')).toBeTruthy()
  expect([offered(office), offered(kim), chosen(kim)]).toEqual([['None', 'Read'], ['None', 'Read'], ['Read']])
  cleanup(); roster.roles = []; roster.people = []; open('keys/bank'); await screen.findByText('No roles or people yet.')
})
it('lists each app as a row with the keys it uses and who has it as labels, the owner first', async () => {
  open(); fireEvent.click(await screen.findByRole('link', { name: /^Apps/ }))
  expect(columns(await screen.findByRole('table', { name: 'Apps' }))).toEqual(['App', 'Uses', 'Who has it'])
  // No button adds an app: the spot beside the title says how one is made.
  expect(screen.getByText('Ask your assistant to build an app')).toBeTruthy()
  const hello = await row('Hello')
  expect(hello.getByText('Stripe: look up, change')).toBeTruthy(); expect(labelled(hello)).toEqual([['Who has it', 'Owner', 'Sales', 'kim@shop.com']])
  expect(hello.getByRole('link', { name: 'Hello' }).getAttribute('href')).toBe('/apps/access/apps/hello')
  const payroll = await row('payroll')
  expect(payroll.getByText('Bank: look up, change')).toBeTruthy(); expect(labelled(payroll)).toEqual([['Who has it', 'Owner']])
  const tips = await row('Tip calculator')
  expect(tips.getByText('No keys')).toBeTruthy(); expect(labelled(tips)).toEqual([['Who has it', 'Owner', 'Sales']])
  // A click anywhere on the row opens the app.
  fireEvent.click(tips.getByText('No keys')); await screen.findByRole('heading', { name: 'Tip calculator' }); expect(where()).toBe('/apps/access/apps/tips')
  cleanup(); roster.apps = []; open('apps'); await screen.findByText('No apps built yet. Ask your assistant to make one.')
  expect(screen.queryByRole('table')).toBeNull()
})
it('gives an app to roles and people, with the levels of the keys it uses beside each tick', async () => {
  open('apps'); fireEvent.click((await row('Hello')).getByRole('link', { name: 'Hello' }))
  await screen.findByRole('heading', { name: 'Hello' }); expect(where()).toBe('/apps/access/apps/hello')
  expect(screen.getByRole('link', { name: 'Apps' }).getAttribute('href')).toBe('/apps/access/apps'); expect(screen.getByRole('navigation', { name: 'Access views' })).toBeTruthy()
  expect(screen.getByText('Uses Stripe: look up, change')).toBeTruthy(); expect(screen.getByText('A level holds in every app.')).toBeTruthy()
  expect([tick(office).checked, tick(team).checked, tick(kim).checked]).toEqual([false, true, true])
  expect(who(office).queryByRole('radio')).toBeNull(); expect([chosen(team), chosen(kim)]).toEqual([['Read'], ['Read']])
  expect(within(who(team).getByRole('group', { name: 'Stripe' })).getAllByRole('radio')).toHaveLength(3)
  // Ticking gives Read on the app's keys still at None, never Read & write.
  fireEvent.click(tick(office)); expect(chosen(office)).toEqual(['Read'])
  pick(kim, 'Read & write'); expect(chosen(kim)).toEqual(['Read & write'])
  // An unticked role or person shows no levels, and none are sent for it.
  fireEvent.click(tick(team)); expect(who(team).queryByRole('radio')).toBeNull()
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('grants')).toEqual([{ app: 'hello', roles: { office: true, sales: false }, people: { 'kim@shop.com': true },
    keys: { roles: { office: { stripe: 'read' } }, people: { 'kim@shop.com': { stripe: 'write' } } } }])
  expect(where()).toBe('/apps/access/apps')
  // An app that uses no keys has ticks alone.
  cleanup(); open('apps/tips'); await screen.findByRole('heading', { name: 'Tip calculator' })
  expect(screen.getByText('Uses no keys')).toBeTruthy(); expect(screen.queryByRole('radio')).toBeNull()
  fireEvent.click(tick(kim)); click('Save access'); await screen.findByText('Saved.')
  expect(sent('grants')[1]).toEqual({ app: 'tips', roles: { office: false, sales: true }, people: { 'kim@shop.com': true }, keys: { roles: { sales: {} }, people: { 'kim@shop.com': {} } } })
  cleanup(); roster.roles = []; roster.people = []; open('apps/payroll'); await screen.findByText('No roles or people yet.')
})
it('every row opens its page from the link in its first cell, and no list has an Edit button', async () => {
  for (const [path, name, links] of [['', 'People', ['gone@shop.com', 'kim@shop.com', 'lee@shop.com', 'sam@shop.com']], ['roles', 'Roles', ['Office', 'Sales']],
    ['apps', 'Apps', ['Hello', 'payroll', 'Tip calculator']], ['keys', 'Keys', ['Stripe', 'Bank', 'Cloudflare']]] as const) {
    open(path); const table = await screen.findByRole('table', { name })
    expect(Array.from(table.querySelectorAll('tbody td:first-child a')).map(link => link.textContent), path).toEqual(links)
    expect(screen.queryByRole('link', { name: 'Edit' }), path).toBeNull()
    cleanup()
  }
})
it('a key or app save that did not finish says so and reads the list again', async () => {
  failed.add('grants')
  for (const [path, title] of [['keys/bank', 'Bank'], ['apps/payroll', 'payroll']]) {
    open(path); await screen.findByRole('button', { name: 'Save access' }); const before = reads('status').length; click('Save access')
    await screen.findByText(unfinished); await row(title)
    expect(where()).toBe(`/apps/access/${path.split('/')[0]}`); expect(reads('status').length).toBeGreaterThan(before); cleanup()
  }
  expect(posts('grants')).toHaveLength(2)
})
