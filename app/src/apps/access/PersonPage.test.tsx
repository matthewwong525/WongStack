// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { App } from './App'
import type { Person, SavedKey, Status } from '../../lib/access'

// A shop with three apps: Hello changes things with Stripe, payroll with Bank, and the tip calculator uses no key.
const key = (id: string, title: string, changes: Partial<SavedKey> = {}): SavedKey => ({ id, title, levels: ['read', 'write'], saved: true, setup: false, usedBy: [], alone: false, ...changes })
const person = (email: string, changes: Partial<Person> = {}): Person => ({ email, status: 'active', settled: true, role: null, apps: [], keys: {}, ...changes })
const sales = () => ({ apps: ['hello', 'tips'], keys: { stripe: 'read' as const } })
const status = (): Status => ({ origin: 'https://shop.example.com', ownerEmail: 'owner@shop.com', environment: 'live', key: 'ready', started: true, imported: 0,
  keysStarted: true, kept: 0, apps: ['hello', 'payroll', 'tips'],
  appKeys: { hello: [{ id: 'stripe', need: 'write' }], payroll: [{ id: 'bank', need: 'write' }], tips: [] },
  keys: [key('stripe', 'Stripe', { usedBy: [{ app: 'hello', need: 'write' }] }), key('bank', 'Bank', { usedBy: [{ app: 'payroll', need: 'write' }] }),
    key('cloudflare', 'Cloudflare', { levels: ['read'], setup: true, alone: true })],
  roles: [{ id: 'office', name: 'Office', apps: [], keys: {} }, { id: 'sales', name: 'Sales', ...sales() }],
  people: [person('gone@shop.com', { status: 'removed' }), person('kim@shop.com', { apps: ['hello'], keys: { stripe: 'read', cloudflare: 'read' } }),
    person('lee@shop.com', { role: 'sales', ...sales() }), person('sam@shop.com', { role: 'sales', ...sales() })],
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
const posts = (path: string) => fetchMock.mock.calls.filter(([url, init]) => url.endsWith(path) && init?.method === 'POST')
const sent = (path: string) => posts(path).map(([, init]) => JSON.parse(init.body))
const checked = (inputs: HTMLElement[]) => inputs.filter(input => (input as HTMLInputElement).checked).map(input => input.parentElement!.textContent)
// One person's box in the list with its labels, one app's tick with what sits under it, and one key's level choice by the name in its legend.
const row = async (email: string) => within((await screen.findByText(email)).closest('li')!)
const labels = (box: { queryAllByRole: (role: string) => HTMLElement[] }) => box.queryAllByRole('listitem').map(item => item.textContent)
const app = (name: string) => within(screen.getByRole('checkbox', { name }).closest('div')!)
const ticks = () => checked(screen.getAllByRole('checkbox'))
const tick = (name: string) => fireEvent.click(screen.getByRole('checkbox', { name }))
const level = (name: string) => within(screen.getByRole('group', { name }))
const chosen = (name: string) => checked(level(name).getAllByRole('radio'))
// A key's level under one app: the same key can sit under two.
const under = (name: string, key: string) => within(app(name).getByRole('group', { name: key }))
const held = (name: string, key: string) => checked(under(name, key).getAllByRole('radio'))
const other = () => within(screen.getByRole('group', { name: 'Keys no ticked app uses' }))
const others = () => other().getAllByRole('group').map(group => group.querySelector('legend')!.textContent)
const role = () => screen.getByLabelText('Role') as HTMLSelectElement
const gap = '! Hello can look up, not change'
const raise = 'Hello also changes things. Pick Read & write to let it.'

it('shows each person with their role, labels and gap, and a role on their page as labels with one link to it and no ticks', async () => {
  open(); const lee = await row('lee@shop.com')
  expect(lee.getByText('Sales')).toBeTruthy(); expect(lee.getByText('Can sign in').parentElement!.textContent).toBe('lee@shop.comCan sign in')
  expect(labels(lee)).toEqual(['Hello', 'Tip calculator', 'Stripe Read', gap])
  // Each kind of label is its own named list, and the gap is marked by a "!" in the text.
  expect(lee.getAllByRole('list').map(list => list.getAttribute('aria-label'))).toEqual(['Apps', 'Keys', "Can't do yet"])
  const kim = await row('kim@shop.com')
  expect(kim.getByText('Own set')).toBeTruthy(); expect(labels(kim)).toEqual(['Hello', 'Stripe Read', 'Cloudflare Read', gap])
  // A level that covers what the app does leaves no gap line; a removed person shows their status alone.
  const gone = await row('gone@shop.com')
  expect(gone.getByText('Removed')).toBeTruthy(); expect(labels(gone)).toEqual([]); expect(gone.queryByText('Own set')).toBeNull()
  fireEvent.click(lee.getByRole('link', { name: 'Edit' }))
  await screen.findByRole('heading', { name: 'lee@shop.com · Can sign in' }); expect(where()).toBe('/apps/access/people/lee@shop.com')
  expect(screen.getByRole('link', { name: 'People' }).getAttribute('href')).toBe('/apps/access/'); expect(screen.queryByRole('navigation')).toBeNull()
  expect(role().value).toBe('sales'); expect(screen.queryByLabelText('Email')).toBeNull()
  expect(screen.getByText('From the Sales role:')).toBeTruthy()
  expect(labels(screen)).toEqual(['Hello', 'Tip calculator', 'Stripe Read', gap])
  expect(screen.queryByRole('checkbox')).toBeNull(); expect(screen.queryByRole('radio')).toBeNull()
  expect(screen.getByRole('link', { name: 'Edit the Sales role' }).getAttribute('href')).toBe('/apps/access/roles/sales')
  // A role with nothing in it says so, and the save names the role alone.
  fireEvent.change(role(), { target: { value: 'office' } })
  expect(labels(screen)).toEqual([]); expect(screen.getByText('No apps')).toBeTruthy()
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'lee@shop.com', removed: false, role: 'office' }]); expect(where()).toBe('/apps/access/')
  // The role's own page is one link from the person.
  fireEvent.click((await row('sam@shop.com')).getByRole('link', { name: 'Edit' }))
  fireEvent.click(await screen.findByRole('link', { name: 'Edit the Sales role' }))
  expect((await screen.findByLabelText('Name') as HTMLInputElement).value).toBe('Sales'); expect(where()).toBe('/apps/access/roles/sales')
})
it("the People list drops a person's gap line once their level covers what the app does", async () => {
  roster.people[1].keys = { stripe: 'write' }
  open(); expect(labels(await row('kim@shop.com'))).toEqual(['Hello', 'Stripe Read & write'])
  // With no level at all, the line says the app can't use the key.
  cleanup(); roster.people[1].keys = {}
  open(); expect(labels(await row('kim@shop.com'))).toEqual(['Hello', "! Hello can't use Stripe yet"])
})
it("with their own set, a ticked app's key levels sit under its tick, and the keys no ticked app uses sit in a group below", async () => {
  open('people/kim@shop.com'); await screen.findByRole('heading', { name: 'kim@shop.com · Can sign in' })
  expect(role().value).toBe('')
  expect(within(role()).getAllByRole('option').map(option => option.textContent)).toEqual(['Their own set', 'Office', 'Sales'])
  expect(ticks()).toEqual(['Hello'])
  // Hello is ticked: its Stripe level is right there, with a hint that names the fix.
  expect(held('Hello', 'Stripe')).toEqual(['Read']); expect(app('Hello').getByText(raise)).toBeTruthy()
  expect(app('Hello').queryByText(/^uses/)).toBeNull()
  // An unticked app shows what it uses in a few words, and no level to pick.
  expect(app('payroll').getByText('uses Bank')).toBeTruthy(); expect(app('payroll').queryByRole('radio')).toBeNull()
  expect(app('Tip calculator').getByText('uses no keys')).toBeTruthy()
  // The second group holds the rest: a key of an unticked app, and the key that works with no app.
  expect(others()).toEqual(['Bank', 'Cloudflare']); expect([chosen('Bank'), chosen('Cloudflare')]).toEqual([['None'], ['Read']])
  expect(level('Cloudflare').getByText('look-ups, no app needed')).toBeTruthy(); expect(level('Bank').queryByText(/./, { selector: 'p' })).toBeNull()
  // A Read-only key offers two choices, any other key three.
  const offered = (name: string) => level(name).getAllByRole('radio').map(radio => radio.parentElement!.textContent)
  expect(offered('Cloudflare')).toEqual(['None', 'Read']); expect(offered('Bank')).toEqual(['None', 'Read', 'Read & write'])
  // Ticking an app gives Read on its keys at None, never Read & write, and moves the key under the app.
  tick('payroll')
  expect(held('payroll', 'Bank')).toEqual(['Read']); expect(others()).toEqual(['Cloudflare'])
  expect(app('payroll').getByText('payroll also changes things. Pick Read & write to let it.')).toBeTruthy()
  expect(app('payroll').queryByText('uses Bank')).toBeNull()
  // Raising a level under the app clears its hint; lowering it to None says the app can't use the key.
  fireEvent.click(under('Hello', 'Stripe').getByRole('radio', { name: 'Read & write' }))
  expect(held('Hello', 'Stripe')).toEqual(['Read & write']); expect(app('Hello').queryByText(raise)).toBeNull()
  fireEvent.click(under('Hello', 'Stripe').getByRole('radio', { name: 'None' }))
  expect(app('Hello').getByText("Hello can't use Stripe yet. Pick Read to let it look things up.")).toBeTruthy()
  // Unticking an app takes no level away: a level holds in every app. The key moves back to the group below.
  tick('payroll'); expect(others()).toEqual(['Bank', 'Cloudflare']); expect(chosen('Bank')).toEqual(['Read'])
  expect(app('payroll').getByText('uses Bank')).toBeTruthy(); tick('payroll')
  tick('Tip calculator'); tick('Tip calculator')
  expect(ticks()).toEqual(['Hello', 'payroll'])
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'kim@shop.com', removed: false, role: null, apps: ['hello', 'payroll'], keys: { stripe: null, bank: 'read', cloudflare: 'read' } }])
})
it('a key two ticked apps share shows under both as one level, and an unticked app hides its picker', async () => {
  // The tip calculator looks things up with Stripe too.
  roster.keys[0].usedBy.push({ app: 'tips', need: 'read' }); roster.appKeys.tips = [{ id: 'stripe', need: 'read' }]
  roster.people.push(person('pat@shop.com'))
  open('people/pat@shop.com'); await screen.findByRole('heading', { name: 'pat@shop.com · Can sign in' })
  expect(app('Hello').getByText('uses Stripe')).toBeTruthy(); expect(app('Tip calculator').getByText('uses Stripe')).toBeTruthy()
  expect(screen.getByRole('group', { name: 'Apps' }).querySelector('input[type="radio"]')).toBeNull(); expect(others()).toEqual(['Stripe', 'Bank', 'Cloudflare'])
  // The tick gives Read, never Read & write.
  tick('Hello'); expect(held('Hello', 'Stripe')).toEqual(['Read']); expect(others()).toEqual(['Bank', 'Cloudflare'])
  expect(app('Hello').queryByText(/shared with/)).toBeNull()
  // Ticked too, the second app shows the same level, and each says the level is shared.
  tick('Tip calculator'); expect([held('Hello', 'Stripe'), held('Tip calculator', 'Stripe')]).toEqual([['Read'], ['Read']])
  expect(app('Hello').getByText('One level, shared with Tip calculator')).toBeTruthy(); expect(app('Tip calculator').getByText('One level, shared with Hello')).toBeTruthy()
  // Read is all the tip calculator needs, so only Hello carries a hint.
  expect(app('Hello').getByText(raise)).toBeTruthy(); expect(app('Tip calculator').queryByText(/Pick/)).toBeNull()
  // They are two radio groups showing one value: change it under one and the other follows.
  const names = (name: string) => new Set(under(name, 'Stripe').getAllByRole('radio').map(radio => (radio as HTMLInputElement).name))
  expect([names('Hello').size, names('Tip calculator').size, new Set([...names('Hello'), ...names('Tip calculator')]).size]).toEqual([1, 1, 2])
  fireEvent.click(under('Hello', 'Stripe').getByRole('radio', { name: 'Read & write' }))
  expect([held('Hello', 'Stripe'), held('Tip calculator', 'Stripe')]).toEqual([['Read & write'], ['Read & write']])
  fireEvent.click(under('Tip calculator', 'Stripe').getByRole('radio', { name: 'Read' }))
  expect([held('Hello', 'Stripe'), held('Tip calculator', 'Stripe')]).toEqual([['Read'], ['Read']])
  // Unticked, the second app hides its picker and the shared line goes.
  tick('Tip calculator'); expect(app('Tip calculator').queryByRole('radio')).toBeNull(); expect(app('Tip calculator').getByText('uses Stripe')).toBeTruthy()
  expect(app('Hello').queryByText(/shared with/)).toBeNull()
  fireEvent.click(under('Hello', 'Stripe').getByRole('radio', { name: 'Read & write' }))
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'pat@shop.com', removed: false, role: null, apps: ['hello'], keys: { stripe: 'write', bank: null, cloudflare: null } }])
  // When every key is under a ticked app, the second group is gone; a key that also works alone says so under its app.
  cleanup(); roster.keys = [{ ...roster.keys[0], alone: true }]
  open('people/kim@shop.com'); await screen.findByRole('heading', { name: 'kim@shop.com · Can sign in' })
  expect(screen.queryByRole('group', { name: 'Keys no ticked app uses' })).toBeNull(); expect(screen.queryByText('No keys saved yet.')).toBeNull()
  expect(app('Hello').getByText('look-ups, no app needed')).toBeTruthy()
})
it('moving from a role to their own set starts from what that role gave', async () => {
  open('people/sam@shop.com'); fireEvent.change(await screen.findByLabelText('Role'), { target: { value: '' } })
  expect(ticks()).toEqual(['Hello', 'Tip calculator']); expect([held('Hello', 'Stripe'), chosen('Cloudflare')]).toEqual([['Read'], ['None']])
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'sam@shop.com', removed: false, role: null, apps: ['hello', 'tips'], keys: { stripe: 'read', bank: null, cloudflare: null } }])
  cleanup()
  // Kim has her own set: picking a role hides the ticks, and coming back starts from that role too.
  open('people/kim@shop.com'); fireEvent.change(await screen.findByLabelText('Role'), { target: { value: 'sales' } })
  expect(screen.queryByRole('checkbox')).toBeNull(); expect(screen.getByText('From the Sales role:')).toBeTruthy()
  fireEvent.change(role(), { target: { value: '' } })
  expect(ticks()).toEqual(['Hello', 'Tip calculator']); expect(chosen('Cloudflare')).toEqual(['None'])
})
it('adds a person with a role in one save, from the keyboard, with every control labelled', async () => {
  open(); fireEvent.click(await screen.findByRole('link', { name: 'Add person' }))
  const email = await screen.findByLabelText('Email'); expect(document.activeElement).toBe(email)
  expect(where()).toBe('/apps/access/people/new'); expect(screen.getByRole('heading', { name: 'Add person' })).toBeTruthy()
  expect(ticks()).toEqual([]); expect([chosen('Stripe'), chosen('Bank'), chosen('Cloudflare')]).toEqual([['None'], ['None'], ['None']])
  expect(screen.getByText('A new person starts with no apps. Project code is shared separately.')).toBeTruthy()
  // Each level choice is one radio group with its key as the legend: arrow keys move inside it, Tab moves to the next.
  const groups = ['Stripe', 'Bank', 'Cloudflare'].map(name => new Set(level(name).getAllByRole('radio').map(radio => (radio as HTMLInputElement).name)))
  expect(groups.map(names => names.size)).toEqual([1, 1, 1]); expect(new Set(groups.flatMap(names => Array.from(names))).size).toBe(3)
  expect(within(screen.getByRole('group', { name: 'Apps' })).getAllByRole('checkbox')).toHaveLength(3)
  // With nothing ticked, every key waits in the second group, and each app is a named group of its own.
  expect(other().getAllByRole('radio')).toHaveLength(8)
  for (const name of ['Hello', 'payroll', 'Tip calculator']) expect(within(screen.getByRole('group', { name })).getByRole('checkbox', { name })).toBeTruthy()
  fireEvent.change(email, { target: { value: 'new@shop.com' } }); fireEvent.change(role(), { target: { value: 'sales' } })
  // Enter in a field submits the form: no pointer is needed.
  fireEvent.submit(email.closest('form')!); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'new@shop.com', removed: false, role: 'sales' }])
})
it('holds every control while a save is on its way, and Cancel goes back without saving', async () => {
  open('people/kim@shop.com'); await screen.findByRole('button', { name: 'Save access' })
  click('Cancel'); fireEvent.click((await row('kim@shop.com')).getByRole('link', { name: 'Edit' })); expect(posts('people')).toHaveLength(0)
  const save = await screen.findByRole('button', { name: 'Save access' })
  let finish: (reply: Response) => void = () => {}
  fetchMock.mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve }))
  click('Save access'); expect(save.closest('fieldset')!.disabled).toBe(true)
  await act(async () => finish(Response.json(roster))); await screen.findByText('Saved.')
  expect(posts('people')).toHaveLength(1)
})
it('says so when there is no app or key to give yet', async () => {
  roster.apps = []; roster.appKeys = {}; roster.keys = []
  open('people/new'); await screen.findByText('No apps built yet. Ask your assistant to make one.')
  expect(screen.getByText('No keys saved yet.')).toBeTruthy(); expect(screen.queryByRole('checkbox')).toBeNull()
})
