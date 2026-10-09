// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { App } from './App'
import type { BuiltApp, Person, SavedKey, Status } from '../../lib/access'
import { PROJECT_REQUEST } from './status'

// A shop with three apps: Hello changes things with Stripe, Payroll with Bank, and the tip calculator uses no key.
const key = (id: string, title: string, changes: Partial<SavedKey> = {}): SavedKey => ({ id, title, levels: ['read', 'write'], saved: true, setup: false, alone: false, ...changes })
const built = (id: string, title: string): BuiltApp => ({ id, title, description: `${title} for the shop` })
const person = (email: string, changes: Partial<Person> = {}): Person => ({ email, status: 'active', settled: true, role: null, manager: false, apps: [], keys: {}, ...changes })
const sales = () => ({ apps: ['hello', 'tips'], keys: { stripe: 'read' as const } })
const status = (): Status => ({ ownerEmail: 'owner@shop.com', viewer: { email: 'owner@shop.com', owner: true }, environment: 'live', key: 'ready', started: true, imported: 0,
  keysStarted: true, unticked: { people: [], roles: [] },
  apps: [built('hello', 'Hello'), built('payroll', 'Payroll'), built('tips', 'Tip calculator')],
  keys: [key('stripe', 'Stripe'), key('bank', 'Bank'),
    key('cloudflare', 'Cloudflare', { levels: ['read'], setup: true, alone: true }), key('code', 'Project code', { levels: ['read'], alone: true })],
  roles: [{ id: 'office', name: 'Office', apps: [], keys: {} }, { id: 'sales', name: 'Sales', ...sales() }, { id: 'support', name: 'Support', apps: ['hello'], keys: { stripe: 'read' } }],
  // Kim has Hello, which changes things with Stripe, and holds Stripe at Read: the two have nothing to do with each other.
  people: [person('gone@shop.com', { status: 'removed' }), person('kim@shop.com', { apps: ['hello'], keys: { stripe: 'read', cloudflare: 'read' } }),
    person('lee@shop.com', { role: 'sales', ...sales() }), person('sam@shop.com', { role: 'sales', ...sales() })],
  work: [], project: 'ready' })
let roster: Status
let fetchMock: ReturnType<typeof vi.fn>
// The apps a person can open.
const screens = () => roster.apps.map(item => item.id)
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
// Every tick in the panel by its words: each app, then the one that gives the project, then the owner's, for managing.
const ticks = () => checked(screen.getAllByRole('checkbox'))
const boxes = () => screen.getAllByRole('checkbox').map(input => input.parentElement!.textContent)
const MANAGE = 'Can manage Access'
const managing = () => screen.getByRole('checkbox', { name: MANAGE }) as HTMLInputElement
// A named group: Apps, Keys, Project or Managing, or one key's level choice by the name its legend starts with, with the quiet lines under it.
const part = (name: string) => screen.getByRole('group', { name: new RegExp(`^${name}( · |$)`) })
const level = (name: string) => within(part(name))
const pick = (name: string, to: string) => fireEvent.click(level(name).getByRole('radio', { name: to }))
const note = (name: string) => Array.from(part(name).querySelectorAll('p')).map(line => line.textContent)
const follows = (first: string, second: string) => !!(part(first).compareDocumentPosition(part(second)) & Node.DOCUMENT_POSITION_FOLLOWING)
// Apps: a press on one app's tick, and the apps that are ticked.
const give = (name: string) => fireEvent.click(level('Apps').getByRole('checkbox', { name }))
const given = () => checked(level('Apps').queryAllByRole('checkbox'))
// Project code is no line in Keys: it is one tick in a group of its own, with the step left under it while the app can't hand the project out.
const INSTALL = 'Can install the project'
const install = () => screen.getByRole('checkbox', { name: INSTALL }) as HTMLInputElement
const tick = () => fireEvent.click(install())
const project = () => level('Project')
const lacking = (step: 'key' | 'setup') => { roster.keys[3].saved = false; roster.project = step }
// Keys: every line with the level it shows, and the lines above None.
const lines = () => level('Keys').queryAllByRole('group')
const title = (line: Element) => line.querySelector('legend')!.firstChild!.textContent!
// The same line's whole legend: the key, then whether the app holds it.
const state = (line: Element) => line.querySelector('legend')!.textContent!
const levels = () => Object.fromEntries(lines().map(line => [title(line), checked(within(line).getAllByRole('radio'))[0]]))
const held = () => Object.fromEntries(Object.entries(levels()).filter(([, at]) => at !== 'None'))
const role = () => screen.getByLabelText('Role') as HTMLSelectElement
// What an earlier Access said about an app and a key together: none of it shows any more.
const GONE = /Start from|Can reach|Can't yet|can't use|not change|what it needs|Look up|gap|!/
const NO_APPS = { hello: false, payroll: false, tips: false }
const NO_KEYS = { stripe: null, bank: null, cloudflare: null, code: null }

it('shows each person on one line with their role and counts, with nothing marked as missing, and opened, a role as labels with one link to it and no ticks', async () => {
  open(); const lee = await row('lee@shop.com')
  expect(picked('lee@shop.com')).toBe('Sales'); expect(lee.getByText('Can sign in')).toBeTruthy()
  // How many apps and keys, never their names: the list holds no label. Sales has Hello with Stripe at Read, and no row marks that.
  expect([(await cells('lee@shop.com'))[3], labels(screen)]).toEqual(['2 apps, 1 key', []])
  expect(picked('kim@shop.com')).toBe('Own set'); expect((await cells('kim@shop.com'))[3]).toBe('1 app, 2 keys')
  expect(screen.getByRole('table', { name: 'People' }).textContent).not.toMatch(GONE)
  // A removed person keeps the row's parts, with no role to pick and nothing counted.
  const gone = await row('gone@shop.com')
  expect((await cells('gone@shop.com')).slice(0, 4)).toEqual(['gone@shop.com', 'Removed', 'No role', 'No apps']); expect(gone.queryByRole('combobox')).toBeNull()
  fireEvent.click(lee.getByRole('link', { name: 'lee@shop.com' }))
  const opened = await panel('lee@shop.com'); expect(where()).toBe('/apps/access/people/lee@shop.com')
  // The list and the two views stay in place beside the panel, with her row marked.
  expect(screen.getByRole('table', { name: 'People' }).querySelector('tr[aria-current="true"] a')!.textContent).toBe('lee@shop.com'); expect(screen.getByRole('navigation', { name: 'Access views' })).toBeTruthy()
  expect(opened.getByText('Can sign in')).toBeTruthy()
  expect(role().value).toBe('sales'); expect(screen.queryByLabelText('Email')).toBeNull()
  // Opened, the names show: each kind of label is its own named list, an app by its title alone and a key with its level.
  expect(screen.getByText('From the Sales role:')).toBeTruthy()
  expect(labels(opened)).toEqual(['Hello', 'Tip calculator', 'Stripe Read'])
  expect(opened.getAllByRole('list').map(list => list.getAttribute('aria-label'))).toEqual(['Apps', 'Keys'])
  // A role is changed where the role is opened: no level and no tick but the owner's.
  expect(boxes()).toEqual([MANAGE]); expect(screen.queryByRole('radio')).toBeNull(); expect(['Apps', 'Keys'].map(name => screen.queryByRole('group', { name }))).toEqual([null, null])
  expect(screen.getByRole('link', { name: 'Edit the Sales role' }).getAttribute('href')).toBe('/apps/access/roles/sales')
  fireEvent.change(role(), { target: { value: 'support' } }); expect(screen.getByText('From the Support role:')).toBeTruthy()
  expect(labels(opened)).toEqual(['Hello', 'Stripe Read']); expect(screen.getByRole('dialog', { name: 'lee@shop.com' }).textContent).not.toMatch(GONE)
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
it("an app is ticked or not, whatever the person's key levels: no Start from, Can reach or Can't yet shows, and nothing is marked as missing", async () => {
  // Kim has Hello, which changes things with Stripe, and no level for Stripe at all.
  roster.people[1] = person('kim@shop.com', { apps: ['hello'] })
  open(); expect((await cells('kim@shop.com'))[3]).toBe('1 app')
  fireEvent.click((await row('kim@shop.com')).getByText('1 app')); await panel('kim@shop.com')
  expect([given(), held()]).toEqual([['Hello'], {}])
  for (const name of ['Start from', 'Can reach', "Can't yet"]) expect(screen.queryByRole('group', { name }), name).toBeNull()
  expect(screen.getByRole('dialog', { name: 'kim@shop.com' }).textContent).not.toMatch(GONE)
  // The only buttons are the panel's own: nothing fills a set in, and nothing gives what an app needs.
  expect(screen.getAllByRole('button').map(button => button.textContent).filter(text => /Hello|Give/.test(text!))).toEqual([])
})
it('with their own set, the panel has two groups, a tick for every app and then a level for every key, and neither moves the other', async () => {
  open('people/kim@shop.com'); await panel('kim@shop.com')
  expect(role().value).toBe('')
  expect(within(role()).getAllByRole('option').map(option => option.textContent)).toEqual(['Their own set', 'Office', 'Sales', 'Support'])
  // Apps: a tick per app, in the order they are shown, with no level beside one. Then the project's tick and the owner's.
  expect(boxes()).toEqual(['Hello', 'Payroll', 'Tip calculator', INSTALL, MANAGE]); expect([given(), level('Apps').queryAllByRole('radio'), ticks()]).toEqual([['Hello'], [], ['Hello']])
  // Keys: every key but Project code, each with its level.
  expect(lines().map(title)).toEqual(['Stripe', 'Bank', 'Cloudflare']); expect(levels()).toEqual({ Stripe: 'Read', Bank: 'None', Cloudflare: 'Read' })
  // A key offers three levels, or two when it is Read only.
  const offered = (name: string) => level(name).getAllByRole('radio').map(radio => radio.parentElement!.textContent)
  expect([offered('Bank'), offered('Cloudflare')]).toEqual([['None', 'Read', 'Read & write'], ['None', 'Read']])
  // Under a key, what its level does with the key by itself, and never which apps use it.
  expect([note('Stripe'), note('Bank'), note('Cloudflare')]).toEqual([[], [], []])
  // Apps come first, then Keys, then the project, then managing.
  expect([follows('Apps', 'Keys'), follows('Keys', 'Project'), follows('Project', 'Managing')]).toEqual([true, true, true])
  expect(screen.queryByText('Not saved yet')).toBeNull()
  // A tick moves no key level: Payroll changes things with Bank, and Bank stays at None. Unticking Hello leaves Stripe where it is.
  give('Payroll'); expect([given(), levels()]).toEqual([['Hello', 'Payroll'], { Stripe: 'Read', Bank: 'None', Cloudflare: 'Read' }]); expect(screen.getByText('Not saved yet')).toBeTruthy()
  give('Hello'); expect([given(), levels()]).toEqual([['Payroll'], { Stripe: 'Read', Bank: 'None', Cloudflare: 'Read' }])
  // A level moves no tick.
  pick('Bank', 'Read & write'); pick('Stripe', 'None'); expect([given(), held()]).toEqual([['Payroll'], { Bank: 'Read & write', Cloudflare: 'Read' }])
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'kim@shop.com', removed: false, role: null, apps: { hello: false, payroll: true, tips: false }, keys: { stripe: null, bank: 'write', cloudflare: 'read', code: null } }])
  // A key whose service is set up says its level also reaches the service directly, with nothing to switch on;
  // one that also works with no app says both, and one that offers Read alone names no change.
  cleanup(); roster.keys[0] = { ...roster.keys[0], direct: true }; roster.keys[1] = { ...roster.keys[1], direct: false }
  roster.keys[2] = { ...roster.keys[2], direct: true }
  open('people/kim@shop.com'); await panel('kim@shop.com')
  expect([note('Stripe'), note('Bank'), note('Cloudflare')]).toEqual([['Also reaches Stripe directly'], [], ['Also reaches Cloudflare directly']])
  expect(screen.queryByText(/Direct use|Look-ups only|Key settings/)).toBeNull()
})
it('says beside each key whether the app holds it, with the step left under one it does not, and a level saves either way', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(async () => {}) } })
  const LINK = 'Ask your assistant for the key link.'
  const said = (name: string) => note(name).filter(Boolean)
  // A step with a request to copy folds the request under it, which is a group of its own: only the keys' are read here.
  const keys = () => lines().filter(line => line.tagName === 'FIELDSET')
  roster.keys = [key('stripe', 'Stripe'), key('maps', 'Maps', { saved: false }), key('cloudflare', 'Cloudflare', { levels: ['read'], saved: false, setup: true, alone: true }),
    key('code', 'Project code', { levels: ['read'], alone: true })]
  open('people/kim@shop.com'); await panel('kim@shop.com')
  // The state sits in the key's own legend, in quiet words, so the name stays the first thing read.
  expect(keys().map(state)).toEqual(['Stripe · Saved', 'Maps · Not saved yet', 'Cloudflare · One step left']); expect(keys().map(title)).toEqual(['Stripe', 'Maps', 'Cloudflare'])
  expect(part('Maps').querySelector('legend span')!.className).toMatch(/text-muted-foreground/)
  // A saved key has no step. One that waits for its link says so; the key setup makes gives the owner the request to copy.
  expect([said('Stripe'), said('Maps')]).toEqual([[], [LINK]]); expect(level('Maps').queryByRole('button')).toBeNull()
  expect(said('Cloudflare')).toEqual(['Look-ups need a read-only key. Ask your assistant: Finish Access setup'])
  expect(level('Cloudflare').getByRole('button', { name: 'Copy that request' })).toBeTruthy()
  // A level is set before the key arrives, and nothing here is a change until it is.
  expect(screen.queryByText('Not saved yet')).toBeNull()
  pick('Maps', 'Read'); click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')[0].keys).toEqual({ stripe: 'read', maps: 'read', cloudflare: 'read', code: null })
  // A manager reads that the step is the owner's, with nothing to copy.
  cleanup(); roster.viewer = { email: 'kim@shop.com', owner: false }; open('people/new'); await panel('Add person')
  expect(said('Cloudflare')).toEqual(['Look-ups need a read-only key. owner@shop.com finishes that in Access setup.'])
  expect([level('Cloudflare').queryByRole('button'), said('Maps')]).toEqual([null, [LINK]])
  // No step can finish that key on a preview, so none is named there.
  cleanup(); roster.viewer = { email: 'owner@shop.com', owner: true }; roster.environment = 'practice'; open('people/new'); await panel('Add person')
  expect([state(part('Cloudflare')), said('Cloudflare'), state(part('Maps')), said('Maps')]).toEqual(['Cloudflare · Not on previews yet', [], 'Maps · Not saved yet', [LINK]])
})
it('a tick saves the app and no key level: every app is sent as given or not, and every key at the level it had', async () => {
  roster.people.push(person('pat@shop.com'))
  open('people/pat@shop.com'); await panel('pat@shop.com')
  expect([given(), held(), ticks()]).toEqual([[], {}, []]); expect(screen.queryByText('Not saved yet')).toBeNull()
  // Hello changes things with Stripe. Ticked, it gives no Stripe level, and nothing is sent until the save.
  give('Hello'); expect([given(), held()]).toEqual([['Hello'], {}])
  expect(screen.getByText('Not saved yet')).toBeTruthy(); expect(posts('people')).toHaveLength(0)
  roster.people[4] = person('pat@shop.com', { apps: ['hello'] })
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'pat@shop.com', removed: false, role: null, apps: { ...NO_APPS, hello: true }, keys: NO_KEYS }])
  // Saved, the row counts one app and no key, and opened again the tick is on.
  fireEvent.click(await screen.findByText('1 app')); await panel('pat@shop.com')
  expect([given(), held()]).toEqual([['Hello'], {}])
})
it('moving from a role to their own set starts from what that role gave', async () => {
  open('people/sam@shop.com'); fireEvent.change(await screen.findByLabelText('Role'), { target: { value: '' } })
  expect([given(), held()]).toEqual([['Hello', 'Tip calculator'], { Stripe: 'Read' }])
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'sam@shop.com', removed: false, role: null, apps: { hello: true, payroll: false, tips: true }, keys: { ...NO_KEYS, stripe: 'read' } }])
  cleanup()
  // Kim has her own set: picking a role hides the two groups, and coming back starts from that role too.
  open('people/kim@shop.com'); fireEvent.change(await screen.findByLabelText('Role'), { target: { value: 'sales' } })
  expect(boxes()).toEqual([MANAGE]); expect(screen.queryByRole('group', { name: 'Apps' })).toBeNull(); expect(screen.getByText('From the Sales role:')).toBeTruthy()
  fireEvent.change(role(), { target: { value: '' } })
  expect([given(), held()]).toEqual([['Hello', 'Tip calculator'], { Stripe: 'Read' }])
})
it('adds a person with a role in one save, from the keyboard, with every control labelled', async () => {
  open(); fireEvent.click(await screen.findByRole('link', { name: 'Add person' }))
  const email = await screen.findByLabelText('Email'); expect(document.activeElement).toBe(email)
  expect(where()).toBe('/apps/access/people/new'); expect(await panel('Add person')).toBeTruthy()
  expect([given(), held(), ticks()]).toEqual([[], {}, []])
  expect(screen.queryByText(/shared separately/)).toBeNull()
  // The two groups, the project's tick and the owner's are each a group under its own name.
  expect(['Apps', 'Keys', 'Project', 'Managing'].map(name => part(name).tagName)).toEqual(Array(4).fill('FIELDSET'))
  // An app is a real checkbox, named by the app.
  expect(level('Apps').getAllByRole('checkbox').map(box => [(box as HTMLInputElement).type, box.parentElement!.textContent])).toEqual([['checkbox', 'Hello'], ['checkbox', 'Payroll'], ['checkbox', 'Tip calculator']])
  // Each level choice is one radio group with its key as the legend: arrow keys move inside it, Tab moves to the next.
  const groups = lines().map(line => new Set(within(line).getAllByRole('radio').map(radio => (radio as HTMLInputElement).name)))
  expect(groups.map(names => names.size)).toEqual(Array(3).fill(1)); expect(new Set(groups.flatMap(names => Array.from(names))).size).toBe(3)
  // Two keys with three levels each and one that is Read only. Project code is a tick, so it adds none, and no app has a level.
  expect(level('Keys').getAllByRole('radio')).toHaveLength(8); expect(screen.getAllByRole('radio')).toHaveLength(8)
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
it('says so when there is no app or key to give yet', async () => {
  roster.apps = []; roster.keys = []
  open('people/new'); await screen.findByText('No apps built yet. Ask your assistant to make one.')
  expect(screen.getByText('No keys saved yet.')).toBeTruthy(); expect(boxes()).toEqual([MANAGE])
  // An app that lists no Project code offers no tick for it.
  expect([given(), lines(), screen.queryByRole('group', { name: 'Project' })]).toEqual([[], [], null])
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@shop.com' } }); click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'new@shop.com', removed: false, role: null, apps: {}, keys: {} }])
  // With one app, and Project code the only key, the two ticks are all there is: Keys lists no key, and no line says none is built or saved.
  cleanup(); roster.apps = status().apps.slice(0, 1); roster.keys = status().keys.slice(3)
  open('people/new'); await panel('Add person')
  expect([boxes(), lines()]).toEqual([['Hello', INSTALL, MANAGE], []])
  expect([screen.queryByText('No keys saved yet.'), screen.queryByText('No apps built yet. Ask your assistant to make one.')]).toEqual([null, null])
})
it('gives the project with one tick, off for a new person, and asks for the GitHub key under it only while it is on', async () => {
  lacking('key')
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(async () => {}) } })
  open('people/new'); await panel('Add person')
  expect(install().checked).toBe(false); expect(project().getAllByRole('checkbox')).toHaveLength(1)
  // The tick stands in for the level choice: Project code is no line among the keys.
  expect(lines().map(title)).toEqual(['Stripe', 'Bank', 'Cloudflare']); expect(screen.queryByRole('group', { name: 'Project code' })).toBeNull()
  // After the keys, before managing.
  expect([follows('Keys', 'Project'), follows('Project', 'Managing')]).toEqual([true, true])
  // Off, nothing is asked. On, the step is right under the tick, with the words to say and the request to copy.
  expect(project().queryByText(/One step first/)).toBeNull(); expect(screen.queryByRole('button', { name: /Copy/ })).toBeNull()
  tick()
  expect(project().getByText('One step first.')).toBeTruthy(); expect(project().getByText(/The app needs a read-only GitHub key to hand the project out\. Ask your assistant:/)).toBeTruthy()
  expect(project().getByText('Let teammates install the project')).toBeTruthy()
  fireEvent.click(project().getByRole('button', { name: 'Copy that request' }))
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(PROJECT_REQUEST))
  tick(); expect(project().queryByText(/One step first/)).toBeNull(); tick()
  // It saves before the key arrives, as Read on Project code, and ticks no app.
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@shop.com' } })
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'new@shop.com', removed: false, role: null, apps: NO_APPS, keys: { ...NO_KEYS, code: 'read' } }])
})
it('shows a saved tick as on, with nothing under it once the app can hand the project out, and unticking saves none', async () => {
  roster.people[1].keys = { stripe: 'read', code: 'read' }
  open('people/kim@shop.com'); await panel('kim@shop.com')
  expect(ticks()).toEqual(['Hello', INSTALL]); expect(project().queryByText(/One step first/)).toBeNull(); expect(project().queryByRole('button')).toBeNull()
  tick(); expect(install().checked).toBe(false)
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'kim@shop.com', removed: false, role: null, apps: { ...NO_APPS, hello: true }, keys: { ...NO_KEYS, stripe: 'read' } }])
  // An install that has no project recorded is sent to finish Access setup, not to make a GitHub key.
  cleanup(); lacking('setup')
  open('people/kim@shop.com'); await panel('kim@shop.com')
  expect(project().getByText('Finish Access setup')).toBeTruthy(); expect(project().queryByText(/GitHub/)).toBeNull()
  // A role's set shows as labels, with no tick: the tick is on the role's own page.
  fireEvent.change(role(), { target: { value: 'sales' } }); expect(screen.queryByRole('group', { name: 'Project' })).toBeNull()
})
it("tells a manager who ticks it that the key is the owner's step, with nothing to copy", async () => {
  lacking('key'); roster.viewer = { email: 'kim@shop.com', owner: false }
  open('people/lee@shop.com'); await panel('lee@shop.com'); fireEvent.change(role(), { target: { value: '' } })
  expect(install().checked).toBe(false); expect(project().queryByText(/One step first/)).toBeNull()
  tick()
  expect(project().getByText('One step first for the owner.').parentElement!.textContent).toBe('One step first for the owner. owner@shop.com adds a read-only GitHub key.')
  expect(screen.queryByRole('button', { name: /Copy/ })).toBeNull(); expect(screen.queryByText('Let teammates install the project')).toBeNull()
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'lee@shop.com', removed: false, role: null, apps: { hello: true, payroll: false, tips: true }, keys: { ...NO_KEYS, stripe: 'read', code: 'read' } }])
})
it('the owner picks a manager with one tick in the last group, full trust said right under it, and the save carries it', async () => {
  open('people/kim@shop.com'); await panel('kim@shop.com')
  const group = part('Managing')
  // Below her apps, her keys and the project, so the common edits come first.
  expect(follows('Project', 'Managing')).toBe(true)
  expect(managing().checked).toBe(false); expect(within(group).getAllByRole('checkbox')).toHaveLength(1)
  // The warning is plain text at full weight, never muted.
  const trust = within(group).getByText("Full trust: can change anyone's access.")
  expect([trust.tagName, trust.className]).toEqual(['P', ''])
  expect(screen.queryByText(/only the owner changes this/)).toBeNull()
  fireEvent.click(managing()); expect(ticks()).toEqual(['Hello', MANAGE])
  roster.people[1].manager = true
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'kim@shop.com', removed: false, role: null, apps: { ...NO_APPS, hello: true },
    keys: { ...NO_KEYS, stripe: 'read', cloudflare: 'read' }, manager: true }])
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
  expect(sent('people')[2]).toEqual({ email: 'new@shop.com', removed: false, role: null, apps: NO_APPS, keys: NO_KEYS, manager: true })
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
  await screen.findByRole('button', { name: 'Save access' }); give('Payroll')
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'kim@shop.com', removed: false, role: null, apps: { hello: true, payroll: true, tips: false },
    keys: { ...NO_KEYS, stripe: 'read', cloudflare: 'read' } }])
})
it("a manager has no tick to set: opened, a manager says only the owner changes it, and their save never names it", async () => {
  roster.viewer = { email: 'kim@shop.com', owner: false }; roster.people[1].manager = true
  open('people/kim@shop.com'); await panel('kim@shop.com')
  // A plain line under the sign-in state, above the role.
  const said = screen.getByText('Manager · only the owner changes this')
  expect(said.compareDocumentPosition(role()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(screen.queryByRole('group', { name: 'Managing' })).toBeNull(); expect(boxes()).toEqual(['Hello', 'Payroll', 'Tip calculator', INSTALL])
  expect(screen.queryByText(/Full trust/)).toBeNull()
  // A manager changes a manager's apps and levels, their own included.
  give('Payroll'); click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'kim@shop.com', removed: false, role: null, apps: { hello: true, payroll: true, tips: false },
    keys: { ...NO_KEYS, stripe: 'read', cloudflare: 'read' } }])
  // Someone who is not a manager has no such line, and a new person no tick.
  for (const [path, wait] of [['people/lee@shop.com', 'lee@shop.com'], ['people/new', 'Add person']]) {
    cleanup(); open(path); await panel(wait)
    expect(screen.queryByText(/only the owner changes this/), path).toBeNull(); expect(screen.queryByRole('checkbox', { name: MANAGE }), path).toBeNull()
  }
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@shop.com' } }); click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')[1]).toEqual({ email: 'new@shop.com', removed: false, role: null, apps: NO_APPS, keys: NO_KEYS })
})
