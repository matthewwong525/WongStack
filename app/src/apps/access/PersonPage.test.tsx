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
// One person's box in the list, one app's tick with the lines under it, and one key's level choice by the name in its legend.
const row = async (email: string) => within((await screen.findByText(email)).closest('li')!)
const app = (name: string) => within(screen.getByRole('checkbox', { name }).closest('div')!)
const ticks = () => checked(screen.getAllByRole('checkbox'))
const level = (name: string) => within(screen.getByRole('group', { name }))
const chosen = (name: string) => checked(level(name).getAllByRole('radio'))
const role = () => screen.getByLabelText('Role') as HTMLSelectElement

it('shows each person with their role and key levels, and a role on their page as text with one link to it and no ticks', async () => {
  open(); const lee = await row('lee@shop.com')
  expect(lee.getByText('Sales · Can sign in')).toBeTruthy(); expect(lee.getByText('Hello, Tip calculator · Stripe: Read')).toBeTruthy()
  const kim = await row('kim@shop.com')
  expect(kim.getByText('Can sign in')).toBeTruthy(); expect(kim.getByText('Hello · Stripe: Read · Cloudflare: Read')).toBeTruthy()
  expect((await row('gone@shop.com')).getByText('Removed')).toBeTruthy()
  fireEvent.click(lee.getByRole('link', { name: 'Edit' }))
  await screen.findByRole('heading', { name: 'lee@shop.com · Can sign in' }); expect(where()).toBe('/apps/access/people/lee@shop.com')
  expect(screen.getByRole('link', { name: 'People' }).getAttribute('href')).toBe('/apps/access/'); expect(screen.queryByRole('navigation')).toBeNull()
  expect(role().value).toBe('sales'); expect(screen.queryByLabelText('Email')).toBeNull()
  expect(screen.getByText('From the Sales role:')).toBeTruthy()
  expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual(['Hello · can look up, not change', 'Tip calculator', 'Stripe: Read'])
  expect(screen.queryByRole('checkbox')).toBeNull(); expect(screen.queryByRole('radio')).toBeNull()
  expect(screen.getByRole('link', { name: 'Edit the Sales role' }).getAttribute('href')).toBe('/apps/access/roles/sales')
  // A role with nothing in it says so, and the save names the role alone.
  fireEvent.change(role(), { target: { value: 'office' } })
  expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual(['No apps'])
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'lee@shop.com', removed: false, role: 'office' }]); expect(where()).toBe('/apps/access/')
  // The role's own page is one link from the person.
  fireEvent.click((await row('sam@shop.com')).getByRole('link', { name: 'Edit' }))
  fireEvent.click(await screen.findByRole('link', { name: 'Edit the Sales role' }))
  expect((await screen.findByLabelText('Name') as HTMLInputElement).value).toBe('Sales'); expect(where()).toBe('/apps/access/roles/sales')
})
it('with their own set, each app says which keys it uses and what the person can do, and each key says what uses it', async () => {
  open('people/kim@shop.com'); await screen.findByRole('heading', { name: 'kim@shop.com · Can sign in' })
  expect(role().value).toBe('')
  expect(within(role()).getAllByRole('option').map(option => option.textContent)).toEqual(['Their own set', 'Office', 'Sales'])
  expect(ticks()).toEqual(['Hello'])
  expect(app('Hello').getByText('uses Stripe: look up, change')).toBeTruthy(); expect(app('Hello').getByText('can look up, not change')).toBeTruthy()
  expect(app('payroll').getByText('uses Bank: look up, change')).toBeTruthy(); expect(app('Tip calculator').getByText('uses no keys')).toBeTruthy()
  expect(screen.getAllByText('can look up, not change')).toHaveLength(1)
  expect([chosen('Stripe'), chosen('Bank'), chosen('Cloudflare')]).toEqual([['Read'], ['None'], ['Read']])
  expect(level('Stripe').getByText('used by Hello')).toBeTruthy(); expect(level('Bank').getByText('nothing of theirs uses it yet')).toBeTruthy()
  expect(level('Cloudflare').getByText('look-ups, no app needed')).toBeTruthy()
  // A Read-only key offers two choices, any other key three.
  const offered = (name: string) => level(name).getAllByRole('radio').map(radio => radio.parentElement!.textContent)
  expect(offered('Cloudflare')).toEqual(['None', 'Read']); expect(offered('Bank')).toEqual(['None', 'Read', 'Read & write'])
  // Ticking an app gives Read on its keys at None, never Read & write.
  fireEvent.click(screen.getByRole('checkbox', { name: 'payroll' }))
  expect(chosen('Bank')).toEqual(['Read']); expect(level('Bank').getByText('used by payroll')).toBeTruthy()
  expect(app('payroll').getByText('can look up, not change')).toBeTruthy()
  // Raising a level clears the app's line; lowering it to None says the app can't use the key.
  fireEvent.click(level('Stripe').getByRole('radio', { name: 'Read & write' }))
  expect(chosen('Stripe')).toEqual(['Read & write']); expect(app('Hello').queryByText('can look up, not change')).toBeNull()
  fireEvent.click(level('Stripe').getByRole('radio', { name: 'None' }))
  expect(app('Hello').getByText("can't use Stripe yet")).toBeTruthy(); expect(level('Stripe').getByText('used by Hello')).toBeTruthy()
  // Unticking an app takes no level away: a level holds in every app.
  fireEvent.click(screen.getByRole('checkbox', { name: 'Tip calculator' })); fireEvent.click(screen.getByRole('checkbox', { name: 'Tip calculator' }))
  expect(ticks()).toEqual(['Hello', 'payroll'])
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'kim@shop.com', removed: false, role: null, apps: ['hello', 'payroll'], keys: { stripe: null, bank: 'read', cloudflare: 'read' } }])
})
it('moving from a role to their own set starts from what that role gave', async () => {
  open('people/sam@shop.com'); fireEvent.change(await screen.findByLabelText('Role'), { target: { value: '' } })
  expect(ticks()).toEqual(['Hello', 'Tip calculator']); expect([chosen('Stripe'), chosen('Cloudflare')]).toEqual([['Read'], ['None']])
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
  expect(within(screen.getByRole('group', { name: 'Keys' })).getAllByRole('radio')).toHaveLength(8)
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
