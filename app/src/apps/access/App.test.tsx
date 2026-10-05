// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { App } from './App'
import { FINISH_REQUEST } from './status'
import { CopyText } from '../../components/CopyText'
import { AssistantSetup } from '../../components/AssistantSetup'
import { appAccessSchema, readAccess, statusSchema, useAccess, type Person, type Status } from '../../lib/access'
import { Home } from '../../pages/home/Home'
import { AppPage } from '../AppPage'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'

const setup = { role: 'employee', api: 'authenticated', identity: { email: 'employee@example.com', subject: 'employee' }, apps: ['hello'],
  repository: 'manual_provider_setup', memory: 'independent_operator_setup', prompt: { state: 'ready', text: 'Synthetic reviewed setup prompt' } }
const person = (changes: Partial<Person> = {}): Person => ({ email: 'employee@example.com', status: 'active', settled: true, role: null, manager: false, apps: ['hello'], keys: {}, ...changes })
const status = (): Status => ({ ownerEmail: 'owner@example.com', viewer: { email: 'owner@example.com', owner: true }, environment: 'live', key: 'ready', started: true, imported: 0,
  keysStarted: true, kept: 0, apps: ['hello', 'custom'], appKeys: { hello: [], custom: [] }, keys: [], roles: [], people: [person()], work: [] })
const saved = (id: string, title: string): Status['keys'][number] => ({ id, title, levels: ['read', 'write'], saved: true, setup: false, usedBy: [], alone: false })
let mode: 'owner' | 'manager' | 'employee' | 'legacy' | 'waiting-owner' | 'waiting-employee'
let catalogue: string[]
let held: { id: string; title: string; level: 'read' | 'write' }[] | undefined
let own: typeof setup
let roster: Status
let failed: Set<string>
let fetchMock: ReturnType<typeof vi.fn>
// A manager is an employee who manages: the role stays, and `manages` says so. The owner manages too.
function appAccess() {
  if (mode === 'legacy') return { state: 'legacy' }
  const role = mode.endsWith('owner') ? 'owner' : 'employee'
  const manages = role === 'owner' || mode === 'manager'
  if (mode.startsWith('waiting')) return { state: 'not_started', role, manages, apps: catalogue }
  return { state: 'current', role, manages, apps: catalogue, revision: 1, keys: held }
}
// The status as a manager is sent it: the same lists, and a viewer who is not the owner.
const asManager = () => { mode = 'manager'; roster.viewer = { email: 'employee@example.com', owner: false } }
// One person's row in the People table, what each of its cells says, and the role picked in it.
const tr = (email: string) => within(screen.getByRole('table', { name: 'People' })).getByText(email).closest('tr')!
const line = (email: string) => within(tr(email))
const cells = (email: string) => Array.from(tr(email).querySelectorAll('td')).map(cell => cell.textContent)
const role = (email: string) => screen.getByRole('combobox', { name: `Role for ${email}` }) as HTMLSelectElement
// A row's menu: its dots, the menu they open by the keyboard, and what it holds. The part draws a menu only while it is open.
const dots = (email: string) => screen.getByLabelText(`Actions for ${email}`); const shown = () => screen.queryByRole('menu')
const menu = (email: string) => { fireEvent.keyDown(dots(email), { key: 'Enter' }); return within(screen.getByRole('menu')) }
const shut = () => fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
const items = (email: string) => { const held = menu(email).getAllByRole('menuitem').map(item => item.textContent); shut(); return held }
// The part starts listening for a press outside it, and hands the keyboard back, a moment after it opens or closes.
const moment = () => act(async () => { await new Promise(resolve => setTimeout(resolve)) })
// Every label on the screen, and the box a notice sits in.
const labels = () => Array.from(document.querySelectorAll('[data-slot="badge"]')).map(item => item.textContent)
const notice = (text: Element) => text.closest<HTMLElement>('[data-slot="alert"]')!
// The popup for connecting an assistant, and whether it shows: the part draws it only while it is open.
const popup = () => screen.queryByRole('dialog'); const showing = () => !!popup(); const steps = () => screen.queryByRole('region', { name: 'Connect your assistant' })
const after = (first: Element, second: Element) => !!(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)
beforeEach(() => {
  mode = 'owner'; own = structuredClone(setup); roster = status(); catalogue = ['access', 'hello']; held = undefined; failed = new Set()
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const path = url.replace('/api/access/', '')
    if (failed.has(path)) return Response.json({ code: 'unavailable' }, { status: 503 })
    if (init?.method === 'POST') return Response.json(roster)
    if (path === 'apps') return Response.json(appAccess())
    if (path === 'setup') return Response.json(own)
    return Response.json(roster)
  })
  vi.stubGlobal('fetch', fetchMock)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(async () => {}) } })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
// The address bar: it shows where the screen is, and a click on it goes Back.
function Where() {
  const navigate = useNavigate()
  return <button type="button" data-testid="where" onClick={() => void navigate(-1)}>{useLocation().pathname}</button>
}
const open = (path = '') => render(<MemoryRouter initialEntries={[`/apps/access/${path}`]}><Where /><Routes><Route path="/apps/:name/*" element={<App />} /></Routes></MemoryRouter>)
const where = () => screen.getByTestId('where').textContent
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const follow = (name: string) => fireEvent.click(screen.getByRole('link', { name }))
const posts = (path: string) => fetchMock.mock.calls.filter(([url, init]) => url.endsWith(path) && init?.method === 'POST')
const sent = (path: string) => posts(path).map(([, init]) => JSON.parse(init.body))
const reads = (path: string) => fetchMock.mock.calls.filter(([url, init]) => url.endsWith(path) && init?.method !== 'POST')
const tabs = () => within(screen.getByRole('navigation', { name: 'Access views' })).getAllByRole('link')
const UNFINISHED = 'That did not finish. Check the list below before trying again.'

it('the owner sees people as a table with their own row first, adds a person in one save and opens one from their row', async () => {
  open(); expect(screen.getByText('Loading people…')).toBeTruthy()
  await screen.findByRole('link', { name: 'Add person' })
  const people = within(screen.getByRole('table', { name: 'People' }))
  // Every row shares the columns; the last names the menus for a screen reader alone.
  expect(people.getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Person', 'Sign-in', 'Role', 'Apps and keys', 'Actions'])
  // The owner is the first row, marked You, with nothing to change.
  const first = people.getAllByRole('row')[1]
  expect(Array.from(first.querySelectorAll('td')).map(cell => cell.textContent)).toEqual(['owner@example.com You', 'Can sign in', 'Owner', 'Every app and key', ''])
  expect(first.querySelector('a, button, select')).toBeNull(); expect(screen.queryByText(/^Owner:/)).toBeNull()
  // A person with no role has their own set, picked in the row's dropdown; their apps are labels.
  expect(cells('employee@example.com').slice(0, 2)).toEqual(['employee@example.com', 'Can sign in'])
  expect([role('employee@example.com').value, role('employee@example.com').selectedOptions[0].textContent]).toEqual(['', 'Own set'])
  expect(labels()).toEqual(['Hello'])
  expect(within(line('employee@example.com').getByRole('list', { name: 'Apps' })).getByText('Hello')).toBeTruthy(); expect(people.queryByRole('list', { name: 'Keys' })).toBeNull()
  // Nothing was saved yet: the notice spot is empty.
  expect(document.querySelector('[data-slot="alert"]')).toBeNull()
  // No operator panel, connection button, private-instructions copy or app link to copy.
  for (const name of [/Connect login management/, /Copy private setup instructions/, /Retry login changes/, 'Try again', 'Copy app link']) expect(screen.queryByRole('button', { name })).toBeNull()
  follow('Add person')
  const email = await screen.findByLabelText('Email'); expect(document.activeElement).toBe(email)
  fireEvent.change(email, { target: { value: 'new@example.com' } })
  expect(screen.getAllByRole('checkbox').every(input => !(input as HTMLInputElement).checked)).toBe(true)
  expect(screen.queryByRole('checkbox', { name: 'Access' })).toBeNull()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Hello' })); fireEvent.click(screen.getByRole('checkbox', { name: 'custom' }))
  roster.people.push(person({ email: 'new@example.com', apps: ['hello', 'custom'] }))
  click('Save access')
  // The list opens with the result in the one spot: under the views, above the table, said without interrupting.
  const said = notice(await screen.findByText('Saved.')); expect([said.getAttribute('role'), within(said).queryByRole('button')]).toEqual(['status', null])
  expect([after(screen.getByRole('navigation', { name: 'Access views' }), said), after(said, screen.getByRole('table', { name: 'People' }))]).toEqual([true, true])
  expect(screen.getAllByText('Saved.')).toHaveLength(1)
  expect(posts('people')[0][1]).toMatchObject({ redirect: 'error' })
  expect(sent('people')).toEqual([{ email: 'new@example.com', removed: false, role: null, apps: ['hello', 'custom'], keys: {} }])
  expect(line('new@example.com').getAllByRole('listitem').map(item => item.textContent)).toEqual(['Hello', 'custom'])
  // A click anywhere on a row that is not a control opens the person, and the box is gone on the next screen.
  fireEvent.click(line('employee@example.com').getByText('Can sign in')); fireEvent.click(await screen.findByRole('checkbox', { name: 'Hello' }))
  expect(screen.queryByText('Saved.')).toBeNull(); expect(screen.getByRole('heading', { name: 'employee@example.com · Can sign in' })).toBeTruthy()
  // Cancel with a change asks first, and leaving saves nothing.
  click('Cancel'); click('Leave')
  await screen.findByRole('link', { name: 'Add person' }); expect(sent('people')).toHaveLength(1)
  // A click on the owner's row opens nothing.
  fireEvent.click(line('owner@example.com').getByText('Every app and key')); expect(where()).toBe('/apps/access/')
})
it('switches between four views, each with its count, whose addresses survive Back and a reload, and shows People at an unknown address', async () => {
  roster.roles = [{ id: 'sales', name: 'Sales', apps: [], keys: {} }]; roster.people.push(person({ email: 'gone@example.com', status: 'removed', apps: [] }))
  const current = () => Array.from(document.querySelectorAll('[aria-current="page"]')).map(link => link.textContent)
  open(); await screen.findByRole('navigation', { name: 'Access views' })
  // People counts the owner and everyone who can sign in, never a removed person.
  expect(tabs().map(link => [link.textContent, link.getAttribute('href')])).toEqual([['People 2', '/apps/access/'], ['Roles 1', '/apps/access/roles'],
    ['Apps 2', '/apps/access/apps'], ['Keys 0', '/apps/access/keys']])
  expect(current()).toEqual(['People 2'])
  for (const tab of ['Roles 1', 'Apps 2', 'Keys 0']) {
    const name = tab.split(' ')[0]
    follow(tab); await screen.findByRole('region', { name })
    expect(current()).toEqual([tab]); expect(where()).toBe(`/apps/access/${name.toLowerCase()}`)
  }
  // Back returns to the view before, and one read of the status served all four.
  fireEvent.click(screen.getByTestId('where')); await screen.findByRole('region', { name: 'Apps' })
  expect(where()).toBe('/apps/access/apps'); expect(reads('status')).toHaveLength(1)
  for (const [path, name] of [['roles', 'Roles'], ['apps', 'Apps'], ['keys', 'Keys'], ['people', 'People'], ['nothing/new', 'People'], ['roles/nothing', 'Roles'],
    ['apps/nothing', 'Apps'], ['keys/nothing', 'Keys'], ['people/nobody@example.com', 'People']]) {
    cleanup(); open(path); await screen.findByRole('region', { name })
    expect(current().map(text => text!.split(' ')[0]), path).toEqual([name]); expect(screen.queryByRole('button', { name: /^Save/ }), path).toBeNull()
  }
})
it('keeps the four views and the one notice spot on an opened person, role, app and key, with the way back where the back link was', async () => {
  roster.roles = [{ id: 'sales', name: 'Sales', apps: [], keys: {} }]; roster.keys = [saved('stripe', 'Stripe')]
  roster.environment = 'practice'; roster.key = 'practice'
  for (const [path, view, name] of [['people/employee@example.com', 'People', 'employee@example.com'], ['people/new', 'People', 'Add person'], ['roles/sales', 'Roles', 'Sales'],
    ['roles/new', 'Roles', 'Add role'], ['apps/hello', 'Apps', 'Hello'], ['keys/stripe', 'Keys', 'Stripe']]) {
    open(path); await screen.findByRole('button', { name: /^Save/ })
    const views = screen.getByRole('navigation', { name: 'Access views' })
    expect(tabs().map(link => link.textContent), path).toEqual(['People 2', 'Roles 1', 'Apps 2', 'Keys 1'])
    expect(views.querySelector('[aria-current="page"]')!.textContent!.split(' ')[0], path).toBe(view)
    // Under the views sits the notice spot, then where the page is: its view as a link, then its name.
    const notice = screen.getByText(/Changes here stay on previews/); const crumb = screen.getByText('›').parentElement!
    expect([after(views, notice), after(notice, crumb), crumb.textContent], path).toEqual([true, true, `${view} › ${name}`])
    expect(within(crumb).getByRole('link', { name: view }).getAttribute('href'), path).toBe(tabs().find(link => link.textContent!.startsWith(view))!.getAttribute('href'))
    cleanup()
  }
})
it('every view says it is loading, and that Access is unavailable with Retry when the list cannot be read', async () => {
  for (const [path, name] of [['', 'People'], ['roles', 'Roles'], ['apps', 'Apps'], ['keys', 'Keys']]) {
    failed.add('status'); open(path); expect(screen.getByText('Loading people…')).toBeTruthy()
    await screen.findByText('Access is unavailable.'); expect(screen.queryByRole('navigation')).toBeNull()
    failed.delete('status'); click('Retry'); await screen.findByRole('region', { name }); cleanup()
  }
})
it('picks a role right in the row: it saves at once with the role alone, says what changed, and Undo puts back the role or the own set', async () => {
  roster.keys = [saved('stripe', 'Stripe'), saved('bank', 'Bank')]
  roster.roles = [{ id: 'office', name: 'Office', apps: [], keys: {} }, { id: 'sales', name: 'Sales', apps: ['custom'], keys: {} }]
  const before = () => person({ keys: { stripe: 'read' } })
  roster.people = [before(), person({ email: 'lee@example.com', role: 'sales', apps: ['custom'] })]
  open(); await screen.findByRole('link', { name: 'Add person' })
  expect(within(role('employee@example.com')).getAllByRole('option').map(option => option.textContent)).toEqual(['Own set', 'Office', 'Sales'])
  expect([role('employee@example.com').value, role('lee@example.com').value]).toEqual(['', 'sales'])
  // A click in the dropdown is not a click on the row: the list stays.
  fireEvent.click(role('employee@example.com')); expect(where()).toBe('/apps/access/')
  // Own set to a role: the role goes alone, and the box on top names the change.
  roster.people[0] = person({ role: 'sales', apps: ['custom'] })
  fireEvent.change(role('employee@example.com'), { target: { value: 'sales' } })
  const said = notice(await screen.findByText('employee@example.com now has Sales.')); expect(said.getAttribute('role')).toBe('status')
  expect(sent('people')).toEqual([{ email: 'employee@example.com', removed: false, role: 'sales' }])
  expect([role('employee@example.com').value, where()]).toEqual(['sales', '/apps/access/'])
  // Undo sends back their own set: the same apps, and every key at the level they held.
  roster.people[0] = before()
  fireEvent.click(within(said).getByRole('button', { name: 'Undo' })); await screen.findByText('Undone.')
  expect(sent('people')[1]).toEqual({ email: 'employee@example.com', removed: false, role: null, apps: ['hello'], keys: { stripe: 'read', bank: null } })
  expect(role('employee@example.com').value).toBe(''); expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
  // Role to role, and back to the old role.
  fireEvent.change(role('lee@example.com'), { target: { value: 'office' } }); await screen.findByText('lee@example.com now has Office.')
  click('Undo'); await screen.findByText('Undone.')
  expect(sent('people').slice(2)).toEqual([{ email: 'lee@example.com', removed: false, role: 'office' }, { email: 'lee@example.com', removed: false, role: 'sales' }])
  // A role to their own set says so, and the box is gone on the next screen.
  fireEvent.change(role('lee@example.com'), { target: { value: '' } }); await screen.findByText('lee@example.com now has their own set.')
  expect(sent('people')[4]).toEqual({ email: 'lee@example.com', removed: false, role: null })
  follow('Roles 2'); await screen.findByRole('region', { name: 'Roles' }); expect(screen.queryByText(/now has/)).toBeNull()
})
it('a role pick that did not save says so, offers no undo, and leaves the row showing what the person has', async () => {
  roster.roles = [{ id: 'sales', name: 'Sales', apps: [], keys: {} }]
  open(); await screen.findByRole('link', { name: 'Add person' }); failed.add('people')
  fireEvent.change(role('employee@example.com'), { target: { value: 'sales' } })
  const alert = await screen.findByRole('alert'); expect([alert.textContent, notice(alert)]).toEqual([UNFINISHED, alert])
  expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull(); expect(role('employee@example.com').value).toBe('')
  expect(posts('people')).toHaveLength(1); expect(reads('status').length).toBeGreaterThan(1)
})
it('keeps what a row offers behind its menu, which closes on a pick, on Escape and on a click anywhere else', async () => {
  open(); await screen.findByRole('link', { name: 'Add person' })
  const button = dots('employee@example.com')
  expect([button.tagName, !!shown(), items('employee@example.com')]).toEqual(['BUTTON', false, ['Open', 'Remove']])
  // A click on the dots is not a click on the row.
  fireEvent.click(button); expect(where()).toBe('/apps/access/')
  // An arrow key moves inside it and leaves it open; Escape closes it, and the keyboard is back on the dots.
  fireEvent.keyDown(menu('employee@example.com').getByRole('menuitem', { name: 'Open' }), { key: 'ArrowDown' }); expect(!!shown()).toBe(true)
  shut(); expect(!!shown()).toBe(false); await moment(); expect(document.activeElement).toBe(button)
  // A press anywhere else closes it.
  menu('employee@example.com'); await moment(); fireEvent.pointerDown(screen.getByText('People', { selector: 'h2' })); expect(!!shown()).toBe(false); await moment()
  // A pick closes it: Remove asks first, as it always did, and the keyboard stays on the question.
  fireEvent.click(menu('employee@example.com').getByRole('menuitem', { name: 'Remove' }))
  expect(!!shown()).toBe(false); expect(screen.getByRole('heading', { name: 'Remove employee@example.com?' })).toBeTruthy(); await moment()
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove access' })); click('Cancel')
  // A pick is not a click on the row: the list stayed. Open goes to the person's page.
  expect(where()).toBe('/apps/access/'); fireEvent.click(menu('employee@example.com').getByRole('menuitem', { name: 'Open' }))
  await screen.findByRole('heading', { name: 'employee@example.com · Can sign in' })
})
it('offers Try again only in the menu of the person whose sign-in step failed, and the retry clears it', async () => {
  roster.people.push(person({ email: 'new@example.com', settled: false }))
  roster.work = [{ kind: 'policy', status: 'failed' }]
  open(); await screen.findByText("Can't sign in yet")
  expect(cells('employee@example.com')[1]).toBe('Can sign in')
  // A waiting person's row keeps its parts; their menu holds one thing more.
  expect([items('new@example.com'), items('employee@example.com')]).toEqual([['Open', 'Try again', 'Remove'], ['Open', 'Remove']])
  expect(cells('new@example.com')).toHaveLength(cells('employee@example.com').length)
  roster.people[1].settled = true; roster.work = [{ kind: 'policy', status: 'ready' }]
  fireEvent.click(menu('new@example.com').getByRole('menuitem', { name: 'Try again' })); await screen.findByText('Checked again.')
  expect(cells('new@example.com')[1]).toBe('Can sign in')
  expect(posts('retry')).toHaveLength(1); expect(items('new@example.com')).toEqual(['Open', 'Remove'])
})
it('says one step is left when the live app has no key yet, with a request to copy and no retry', async () => {
  roster.key = 'missing'; roster.people[0].settled = false; roster.work = [{ kind: 'policy', status: 'pending' }]
  open(); await screen.findByText(/You can choose apps now/)
  expect(screen.getByText("Can't sign in yet")).toBeTruthy()
  expect(items('employee@example.com')).toEqual(['Open', 'Remove'])
  click('Copy that request'); await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(FINISH_REQUEST))
  // Choosing apps still works, and the step stays in the one spot on a page under People. Another view does not show it.
  follow('Add person'); expect(await screen.findByRole('button', { name: 'Save access' })).toBeTruthy()
  expect(screen.getByText(/You can choose apps now/)).toBeTruthy()
  follow('Roles 0'); await screen.findByRole('region', { name: 'Roles' }); expect(screen.queryByText(/You can choose apps now/)).toBeNull()
})
it('notes on the first open who could already sign in, and offers another read when the list could not be read', async () => {
  roster.imported = 3; roster.people[0].apps = ['hello', 'custom']
  open(); await screen.findByText('3 people could already sign in. They keep every app until you change them.')
  expect(labels()).toEqual(['Hello', 'custom']); cleanup()
  roster.imported = 1; open(); await screen.findByText(/^1 person could already sign in/); cleanup()
  roster.imported = 0; roster.started = false
  open(); await screen.findByText(/could not be read yet/)
  const before = reads('status').length; roster.started = true
  click('Read it again'); await waitFor(() => expect(screen.queryByText(/could not be read yet/)).toBeNull())
  expect(reads('status').length).toBe(before + 1)
})
it('says once, on the first open after key levels start, that everyone kept what their apps use', async () => {
  roster.kept = 2; open(); await screen.findByText(/Everyone kept what their apps already use\. Lower a level any time\./)
  expect(screen.getByText('Key levels are on.')).toBeTruthy(); cleanup()
  // The next save ends the count, and the note with it.
  roster.kept = 0; open(); await screen.findByRole('link', { name: 'Add person' })
  expect(screen.queryByText('Key levels are on.')).toBeNull()
})
it('marks a preview as a practice list on every view and never offers a provider retry there', async () => {
  roster.environment = 'practice'; roster.key = 'practice'; roster.people[0].settled = false
  roster.people.push(person({ email: 'gone@example.com', status: 'removed', settled: false, apps: [] }))
  for (const path of ['roles', 'apps', 'keys', 'people/new', '']) {
    cleanup(); open(path); await screen.findByText(/Changes here stay on previews/)
    expect(screen.getAllByText(/Changes here stay on previews/), path).toHaveLength(1)
  }
  // A removed person keeps the row's parts: their status, no role, no apps, and a menu that only adds them back.
  expect(cells('employee@example.com')[1]).toBe('Practice list')
  expect(cells('gone@example.com').slice(1, 4)).toEqual(['Removed', 'No role', 'No apps'])
  expect([items('gone@example.com'), items('employee@example.com')]).toEqual([['Add back'], ['Open', 'Remove']])
  fireEvent.click(menu('employee@example.com').getByRole('menuitem', { name: 'Remove' })); expect(screen.getByText(/leave the practice list/)).toBeTruthy()
})
it('confirms a removal by saying everyone signs in again, and a removed person can be added back with no apps', async () => {
  const remove = () => menu('employee@example.com').getByRole('menuitem', { name: 'Remove' })
  open(); await screen.findByRole('link', { name: 'Add person' }); fireEvent.click(remove())
  expect(screen.getByRole('heading', { name: 'Remove employee@example.com?' })).toBeTruthy()
  expect(screen.getByText(/Everyone is signed out and signs in again\. This can't be undone\./)).toBeTruthy()
  expect(screen.getByText(/project code is removed separately/)).toBeTruthy()
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove access' }))
  expect(remove().getAttribute('aria-disabled')).toBe('true'); shut()
  click('Cancel'); expect(screen.queryByRole('heading', { name: /^Remove / })).toBeNull(); fireEvent.click(remove())
  roster.people = [person({ status: 'removed', apps: [], settled: false })]; roster.work = [{ kind: 'sessions', status: 'failed' }]
  click('Remove access'); await screen.findByText('Removed · still signing out')
  expect(sent('people')).toEqual([{ email: 'employee@example.com', apps: [], removed: true }])
  // Still signing out, the menu keeps the retry beside Add back, and has no Remove.
  expect(items('employee@example.com')).toEqual(['Add back', 'Try again'])
  fireEvent.click(menu('employee@example.com').getByRole('menuitem', { name: 'Add back' })); await screen.findByRole('heading', { name: 'employee@example.com · Removed · still signing out' })
  expect(screen.getAllByRole('checkbox').every(input => !(input as HTMLInputElement).checked)).toBe(true)
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')[1]).toEqual({ email: 'employee@example.com', removed: false, role: null, apps: [], keys: {} })
})
it('an uncertain save reloads current status without replaying the mutation', async () => {
  open(); fireEvent.click(await screen.findByRole('link', { name: 'employee@example.com' }))
  await screen.findByRole('button', { name: 'Save access' }); failed.add('people'); click('Save access')
  // A save that did not finish interrupts: the same box in the same spot, as an alert.
  const alert = await screen.findByRole('alert'); expect([alert.textContent, notice(alert)]).toEqual([UNFINISHED, alert])
  await screen.findByRole('link', { name: 'employee@example.com' })
  expect(screen.queryByRole('button', { name: 'Save access' })).toBeNull()
  expect(posts('people')).toHaveLength(1)
  expect(reads('status').length).toBeGreaterThan(1)
})
it('reads Access is unavailable with Retry when people or permissions cannot be read', async () => {
  roster.people = []; failed.add('status')
  open(); await screen.findByText('Access is unavailable.')
  failed.delete('status'); click('Retry'); await screen.findByText('No people added yet.')
  // With nobody added, the owner's own row is still there.
  expect(cells('owner@example.com')[2]).toBe('Owner'); expect(tabs()[0].textContent).toBe('People 1')
  cleanup()
  failed.add('apps'); open(); await screen.findByText('Access is unavailable.')
  expect(screen.queryByRole('region', { name: 'Connect your assistant' })).toBeNull()
  failed.delete('apps'); click('Retry'); await screen.findByRole('link', { name: 'Add person' })
})
it('a person who manages nothing finds the steps for connecting on the page above what they can use, with no popup, before and after permissions start', async () => {
  for (const viewer of ['employee', 'waiting-employee'] as const) {
    mode = viewer; open(); await screen.findByText('Signed in as employee@example.com')
    expect(screen.getByText('Apps: Hello')).toBeTruthy()
    expect([screen.queryByRole('dialog', { hidden: true }), screen.queryByRole('button', { name: 'Connect your assistant' })]).toEqual([null, null])
    const can = screen.getByRole('region', { name: 'You can use' })
    // One label per app; with no key level, no Keys line at all.
    expect(within(within(can).getByRole('list', { name: 'Apps' })).getAllByRole('listitem').map(item => item.textContent)).toEqual(['Hello'])
    expect(within(can).getAllByRole('list')).toHaveLength(1); expect(can.querySelector('p')).toBeNull()
    expect(after(screen.getByRole('region', { name: 'Connect your assistant' }), can)).toBe(true)
    expect(screen.queryByRole('link', { name: 'Add person' })).toBeNull(); expect(screen.queryByRole('navigation')).toBeNull()
    click('Copy setup prompt'); await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(own.prompt.text))
    expect(screen.getByText(/approve the sign-in on that computer/)).toBeTruthy(); cleanup()
  }
  expect(reads('status')).toHaveLength(0)
  // Their apps by title and their key levels; before permissions start, every app.
  mode = 'employee'; catalogue = ['access', 'hello', 'tips']
  held = [{ id: 'stripe', title: 'Stripe', level: 'read' }, { id: 'bank', title: 'Bank', level: 'write' }]
  open(); const mine = within((await screen.findByText('Stripe Read')).closest('section')!)
  expect(mine.getAllByRole('list').map(list => [list.getAttribute('aria-label'), ...within(list).getAllByRole('listitem').map(item => item.textContent)]))
    .toEqual([['Apps', 'Hello', 'Tip calculator'], ['Keys', 'Stripe Read', 'Bank Read & write']]); cleanup()
  // With nothing given yet, one plain line says so.
  catalogue = ['access']; held = []; open(); await screen.findByText('No apps yet. Ask your employer.'); cleanup()
  // The owner manages people as soon as the owner is known, even before permissions start.
  mode = 'waiting-owner'; open(); await screen.findByRole('link', { name: 'Add person' })
  expect(screen.queryByRole('region', { name: 'You can use' })).toBeNull(); cleanup()
  own.apps = []; own.prompt = { state: 'unavailable', message: 'Finish reviewed setup' } as unknown as typeof own.prompt
  render(<AssistantSetup />); await screen.findByText('Finish reviewed setup')
  expect(screen.getByText(/None yet/)).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Copy setup prompt' })).toBeNull()
})
it('draws three sides: the owner and a manager the four views on a wider page with a button that opens the popup, everyone else what they can use with the steps on the page', async () => {
  for (const [side, manages] of [['owner', true], ['manager', true], ['employee', false]] as const) {
    mode = side; roster.viewer.owner = side === 'owner'
    open(); await screen.findByRole(manages ? 'navigation' : 'region', { name: manages ? 'Access views' : 'You can use' })
    const page = screen.getByRole('heading', { name: 'Access' }).parentElement!.parentElement!
    expect([!!screen.queryByRole('button', { name: 'Connect your assistant' }), showing(), !!screen.queryByRole('region', { name: 'You can use' }),
      !!screen.queryByRole('navigation', { name: 'Access views' }), page.className.includes('w-[min(60rem')], side).toEqual([manages, false, !manages, manages, manages])
    if (manages) await opensAndCloses(side)
    // In the popup or on the page, it is the same box, and its prompt still copies.
    const copy = await screen.findByRole('button', { name: 'Copy setup prompt' }); expect(!!copy.closest('[role="dialog"]'), side).toBe(manages)
    fireEvent.click(copy); await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(own.prompt.text))
    expect(reads('status').length > 0, side).toBe(manages); cleanup(); fetchMock.mockClear(); vi.mocked(navigator.clipboard.writeText).mockClear()
  }
})
// The button sits beside the heading. The popup shows on a press and shuts three ways; it is left open at the end.
async function opensAndCloses(side: string) {
  const press = () => click('Connect your assistant'); expect(screen.getByRole('button', { name: 'Connect your assistant' }).previousElementSibling!.tagName, side).toBe('H1')
  // Until it is pressed, nothing shows and the steps are not read.
  expect([showing(), !!steps(), reads('setup').length], side).toEqual([false, false, 0])
  // Close, a press on the dimmed page round the box, and Escape.
  const ways = [() => click('Close'), () => { const dimmed = document.querySelector('[data-slot="dialog-overlay"]')!; fireEvent.pointerDown(dimmed); fireEvent.click(dimmed) }, () => fireEvent.keyDown(popup()!, { key: 'Escape' })]
  for (const [at, close] of ways.entries()) {
    press(); expect(showing(), side).toBe(true); await screen.findByText('Signed in as employee@example.com')
    // The popup is named by the steps' own heading, and a press inside the box leaves it open.
    expect(screen.getByRole('dialog', { name: 'Connect your assistant' }), side).toBe(popup()); await moment(); fireEvent.pointerDown(steps()!); fireEvent.click(steps()!); expect(showing(), side).toBe(true)
    close(); expect([showing(), !!steps()], `${side} ${at}`).toEqual([false, false]); await moment()
  }
  press()
}
it('a manager finds their own row marked You under the owner row, which says who picks managers, with no Remove on a manager', async () => {
  asManager(); roster.people = [person({ manager: true }), person({ email: 'kim@example.com', manager: true }), person({ email: 'lee@example.com' })]
  open(); await screen.findByRole('link', { name: 'Add person' })
  // No box of their own above the views and no line naming the owner: the table says both.
  expect(screen.queryByRole('region', { name: 'You can use' })).toBeNull(); expect(screen.queryByText(/You manage Access/)).toBeNull()
  expect(tabs().map(link => link.textContent)).toEqual(['People 4', 'Roles 0', 'Apps 2', 'Keys 0'])
  // The owner's row is first, with nothing to change or remove.
  const first = within(screen.getByRole('table', { name: 'People' })).getAllByRole('row')[1]
  expect(Array.from(first.querySelectorAll('td')).map(cell => cell.textContent)).toEqual(['owner@example.com', 'Can sign in', 'Owner · picks managers', 'Every app and key', ''])
  expect(first.querySelector('a, button, select')).toBeNull()
  expect([cells('employee@example.com')[0], cells('kim@example.com')[0]]).toEqual(['employee@example.com You', 'kim@example.com'])
  // A manager is marked in words beside the role, and no manager's menu has Remove: not their own row, not another's.
  for (const email of ['employee@example.com', 'kim@example.com']) {
    expect(line(email).getByText('Manager')).toBeTruthy(); expect(items(email)).toEqual(['Open'])
    expect(role(email).disabled).toBe(false)
  }
  expect(line('lee@example.com').queryByText('Manager')).toBeNull(); expect(items('lee@example.com')).toEqual(['Open', 'Remove'])
  // Everyone else is theirs to remove, with the confirm the owner sees and no word about managing.
  fireEvent.click(menu('lee@example.com').getByRole('menuitem', { name: 'Remove' }))
  expect(screen.getByText(/Everyone is signed out and signs in again\. This can't be undone\./)).toBeTruthy(); expect(screen.queryByText(/stop managing/)).toBeNull()
  roster.people[2] = person({ email: 'lee@example.com', status: 'removed', apps: [] })
  click('Remove access'); await screen.findByText('Saved.')
  expect(sent('people')).toEqual([{ email: 'lee@example.com', apps: [], removed: true }])
  expect(cells('lee@example.com').slice(1, 3)).toEqual(['Removed', 'No role'])
  // The same four views on every one of them, with no box above.
  for (const name of ['Roles', 'Apps', 'Keys']) {
    follow(tabs().find(link => link.textContent!.startsWith(name))!.textContent!); await screen.findByRole('region', { name })
    expect(screen.queryByRole('region', { name: 'You can use' })).toBeNull()
  }
})
it('the owner sees who manages: Manager beside the role, their own row marked You, and a removal that says managing ends', async () => {
  roster.roles = [{ id: 'sales', name: 'Sales', apps: ['hello'], keys: {} }]
  roster.people = [person({ manager: true, role: 'sales' }), person({ email: 'lee@example.com' })]
  open(); await screen.findByRole('link', { name: 'Add person' })
  expect(cells('owner@example.com').slice(0, 3)).toEqual(['owner@example.com You', 'Can sign in', 'Owner'])
  expect(screen.queryByText(/picks managers/)).toBeNull(); expect(screen.queryByRole('region', { name: 'You can use' })).toBeNull()
  // The word sits beside the role or Own set, in the text itself.
  expect([role('employee@example.com').value, !!line('employee@example.com').queryByText('Manager')]).toEqual(['sales', true])
  expect([role('lee@example.com').value, !!line('lee@example.com').queryByText('Manager')]).toEqual(['', false])
  expect([items('employee@example.com'), items('lee@example.com')]).toEqual([['Open', 'Remove'], ['Open', 'Remove']])
  // Removing a manager says so; removing anyone else does not.
  fireEvent.click(menu('lee@example.com').getByRole('menuitem', { name: 'Remove' }))
  expect(screen.queryByText(/stop managing/)).toBeNull(); click('Cancel')
  fireEvent.click(menu('employee@example.com').getByRole('menuitem', { name: 'Remove' }))
  expect(screen.getByText(/where it was given\. They stop managing Access too\./)).toBeTruthy()
  // On a preview the same sentence follows the practice-list one.
  cleanup(); roster.environment = 'practice'; roster.key = 'practice'
  open(); await screen.findByRole('link', { name: 'Add person' }); fireEvent.click(menu('employee@example.com').getByRole('menuitem', { name: 'Remove' }))
  expect(screen.getByText(/The real sign-in list is not touched\. They stop managing Access too\./)).toBeTruthy()
})
it('tells a manager that one setup step is left for the owner, with nothing to copy', async () => {
  asManager(); roster.key = 'missing'; roster.people[0].settled = false; roster.work = [{ kind: 'policy', status: 'pending' }]
  open(); const step = (await screen.findByText('One step left for the owner.')).closest('p')!
  expect([!!notice(step), step.textContent]).toEqual([true, 'One step left for the owner. You can choose apps now. New people can sign in once owner@example.com finishes Access setup.'])
  expect(screen.queryByRole('button', { name: 'Copy that request' })).toBeNull(); expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
  expect(screen.queryByText('One step left.')).toBeNull()
  // Choosing apps still works.
  follow('Add person'); expect(await screen.findByRole('button', { name: 'Save access' })).toBeTruthy()
})
it('an install with no recorded owner says Access setup is not finished and still offers the setup box', async () => {
  mode = 'legacy'; open(); await screen.findByText(/Access setup is not finished/)
  expect(screen.queryByRole('link', { name: 'Add person' })).toBeNull(); expect(reads('status')).toHaveLength(0)
  click('Copy that request'); await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(FINISH_REQUEST))
  await screen.findByRole('button', { name: 'Copy setup prompt' })
})
it('copy fallback opens selectable text when clipboard is missing and reports neutral copy success', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
  render(<CopyText text="Safe instructions" label="Copy instructions" />); click('Copy instructions')
  await screen.findByText('Copy the text below by hand.')
  const input = screen.getByRole('textbox', { name: 'Copy instructions' }) as HTMLTextAreaElement
  expect(input.readOnly).toBe(true); expect(input.closest('details')?.open).toBe(true)
  const details = input.closest('details')!; details.open = false; fireEvent(details, new Event('toggle'))
})
it('Home shows one setup box to every signed-in person and keeps the welcome for everyone but a limited employee', async () => {
  for (const [viewer, welcome] of [['legacy', true], ['waiting-employee', true], ['waiting-owner', true], ['owner', true], ['employee', false]] as const) {
    mode = viewer; render(<Home />)
    await screen.findByRole('button', { name: 'Copy setup prompt' })
    expect(screen.getAllByRole('region', { name: 'Connect your assistant' })).toHaveLength(1)
    // Home keeps the box as it was: no popup round it, and no button to open one.
    expect(steps()!.closest('[role="dialog"]')).toBeNull(); expect(screen.queryByRole('button', { name: 'Connect your assistant' })).toBeNull()
    expect(!!screen.queryByRole('region', { name: 'Make it yours' })).toBe(welcome); cleanup()
  }
})
it('failed permissions or setup withhold app cards and support explicit retry', async () => {
  failed.add('apps'); render(<Home />); await screen.findByText('Your app access is unavailable.')
  expect(screen.queryByRole('link', { name: /Hello Example/ })).toBeNull()
  expect(screen.queryByRole('region', { name: 'Connect your assistant' })).toBeNull()
  failed.delete('apps'); mode = 'employee'; catalogue = ['access']; own.apps = []; click('Retry apps')
  await screen.findByText('No business apps assigned. Contact your employer.')
  expect(screen.getByRole('link', { name: 'Open your assistant setup' }).getAttribute('href')).toBe('/apps/access/')
  expect(screen.queryByRole('region', { name: 'Make it yours' })).toBeNull()
  cleanup(); failed.add('setup'); render(<AssistantSetup />); await screen.findByText(/Assistant setup is unavailable/)
  failed.delete('setup'); click('Retry setup'); await screen.findByText(/Signed in as employee@example.com/)
})
it('selected home cards and direct app pages obey the same current readback', async () => {
  mode = 'employee'; render(<Home />); await screen.findByRole('link', { name: /Hello Example/ })
  expect(screen.queryByRole('link', { name: /Tips/ })).toBeNull(); cleanup()
  const page = () => render(<MemoryRouter initialEntries={['/apps/hello/']}><Routes><Route path="/apps/:name/" element={<AppPage />} /></Routes></MemoryRouter>)
  catalogue = ['access']; page(); await screen.findByText('App access denied'); expect(screen.queryByText('Enter your name')).toBeNull(); cleanup()
  // Before permissions start, the page opens whatever the list says.
  mode = 'waiting-employee'; page(); await screen.findByRole('heading', { name: 'Hello' }); cleanup(); mode = 'employee'
  failed.add('apps'); page(); await screen.findByText('App access unavailable'); failed.delete('apps'); catalogue = ['access', 'hello']; click('Retry access'); await screen.findByRole('heading', { name: 'Hello' })
})
it('unmounted responses cannot overwrite newer resource state, and malformed roster readback stays unavailable', async () => {
  let fulfill: (value: Response) => void = () => {}, reject: (error: Error) => void = () => {}
  fetchMock.mockImplementationOnce(() => new Promise<Response>(resolve => { fulfill = resolve }))
  const mounted = render(<AssistantSetup />); mounted.unmount(); await act(async () => fulfill(Response.json(own)))
  fetchMock.mockImplementationOnce(() => new Promise<Response>((_resolve, fail) => { reject = fail }))
  const pending = render(<AssistantSetup />); pending.unmount(); await act(async () => reject(new Error('abort')))
  roster.people = [person({ apps: 'invalid' as unknown as string[] })]
  await expect(readAccess('status', statusSchema)).rejects.toThrow()
  // A status from before key levels, with no roles or keys, is refused too: the screen never guesses them.
  roster = { ...status(), roles: undefined as unknown as Status['roles'] }
  await expect(readAccess('status', statusSchema)).rejects.toThrow()
  function Probe() { const resource = useAccess('apps', appAccessSchema); return <span>{resource.data?.state}</span> }
  render(<Probe />); await screen.findByText('current')
  expect(within(screen.getByText('current').parentElement!).getByText('current')).toBeTruthy()
})
