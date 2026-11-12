// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { back, cleanup, fireEvent, moment, render, screen, waitFor, within } from './test-dom.mjs'

// Closing an opened person, role, app or key with changes not saved asks first, in a popup over its panel.
// A shop where Hello changes things with Stripe, and the tip calculator uses no key.
const key = (id, title, changes = {}) => ({ id, title, levels: ['read', 'write'], saved: true, setup: false, alone: false, ...changes })
const built = (id, title) => ({ id, title, description: `${title} for the shop` })
const person = (email, changes = {}) => ({ email, status: 'active', settled: true, role: null, apps: [], keys: {}, ...changes })
const hello = () => ({ apps: ['hello'], keys: { stripe: 'read' } })
const status = () => ({ ownerEmail: 'owner@shop.com', viewer: { email: 'owner@shop.com', owner: true }, environment: 'live', key: 'ready', started: true, imported: 0,
  keysStarted: true, unticked: { people: [], roles: [] },
  apps: [built('hello', 'Hello'), built('tips', 'Tip calculator')],
  // Bank is set up to be used directly.
  keys: [key('stripe', 'Stripe'), key('bank', 'Bank', { direct: true })],
  roles: [{ id: 'sales', name: 'Sales', ...hello() }],
  people: [person('kim@shop.com', hello()), person('lee@shop.com', { role: 'sales', ...hello() })],
  work: [], project: 'ready' })
let roster
let fetchMock
// The apps a person can open.
const screens = () => roster.apps.map(item => item.id)
beforeEach(() => {
  roster = status()
  fetchMock = vi.fn(async (url) => {
    const path = url.replace('/api/access/', '')
    if (path === 'apps') return Response.json({ state: 'current', role: 'owner', apps: ['access', ...screens()], revision: 1 })
    if (path === 'setup') return Response.json({ role: 'owner', api: 'authenticated', identity: { email: 'owner@shop.com', subject: 'owner' }, apps: screens(),
      repository: 'manual_provider_setup', memory: 'independent_operator_setup', prompt: { state: 'unavailable', message: 'Not on this preview' } })
    return Response.json(roster)
  })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const open = (path = '') => render(`/apps/access/${path}`)
const where = () => decodeURIComponent(window.location.pathname)
const click = (name) => fireEvent.click(screen.getByRole('button', { name }))
const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
const question = () => screen.queryByRole('alertdialog', { name: 'Leave without saving?' })
// The panel an opened item sits in, and that none is open any more.
const panel = (name) => screen.getByRole('dialog', { name })
const closed = () => waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
// The parts start listening for a press outside them, and hand the keyboard back, a moment after they open or close.
// One of the views in the switch, by its title: its count follows.
const tab = (title) => within(screen.getByRole('navigation', { name: 'Access views' })).getByRole('link', { name: new RegExp(`^${title} \\d+$`) })
const radio = (group, name) => within(screen.getByRole('group', { name: new RegExp(`^${group} · `) })).getByRole('radio', { name })
// An app's tick in an opened person or role: one press gives the app or takes it away, and saves nothing.
const app = (name) => within(screen.getByRole('group', { name: 'Apps' })).getByRole('checkbox', { name })
// What the browser is told when the tab closes or reloads: true when it should ask.
const unloadAsks = () => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented }
// A press with the pointer: the panel answers one beside it once the click lands.
const press = async (on) => { await fireEvent.pointerDown(on); await fireEvent.click(on) }
const KIM = '/apps/access/people/kim@shop.com'

it('closes an untouched panel at once by its ✕, Escape, Cancel or a press on the page beside it, back to its view, with its row marked while it is open', async () => {
  const ways = [() => click('Close'), () => fireEvent.keyDown(panel('Sales'), { key: 'Escape' }), () => click('Cancel'), () => press(screen.getByRole('heading', { name: 'Access' }))]
  for (const [at, close] of ways.entries()) {
    await open('roles/sales'); await screen.findByRole('button', { name: 'Save role' }); await moment()
    // The list stays in place beside the panel, with the open role's row marked.
    const marked = screen.getByRole('table', { name: 'Roles' }).querySelector ('tr[aria-current="true"]')
    expect(within(marked).getByRole('link', { name: 'Sales' }), `${at}`).toBeTruthy()
    // A press inside the panel leaves it open, and so does the keyboard moving to the page beside it.
    // A press on a row beside it is the row's own to answer: the panel does not also go back to its view.
    await press(panel('Sales')); await fireEvent.focusIn(tab('People')); await press(within(marked).getByText('1 person')); await moment()
    expect([!!panel('Sales'), where()], `${at}`).toEqual([true, '/apps/access/roles/sales'])
    await close(); await closed()
    expect([where(), !!question(), document.querySelector('tr[aria-current]')], `${at}`).toEqual(['/apps/access/roles', false, null]); cleanup()
  }
  expect(posts()).toHaveLength(0)
})
it('asks in a popup before a panel changed only by a tick is closed by its ✕, Escape or Cancel, keeps the tick on staying, and saves nothing on leaving', async () => {
  await open('people/kim@shop.com'); await screen.findByRole('button', { name: 'Save access' })
  expect(unloadAsks()).toBe(false); expect(screen.queryByText('Not saved yet')).toBeNull()
  // One tick is a change that waits to be saved: the panel says so above its buttons, and nothing is sent.
  await fireEvent.click(app('Tip calculator')); expect(unloadAsks()).toBe(true)
  expect(screen.getByText('Not saved yet').compareDocumentPosition(screen.getByRole('button', { name: 'Save access' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); expect(posts()).toHaveLength(0)
  // Cancel asks over the panel: the way out is focused first, and the action is the one solid button.
  const cancel = screen.getByRole('button', { name: 'Cancel' }); cancel.focus(); await fireEvent.click(cancel)
  const ask = within(question()); expect(ask.getByText('Your changes here are not saved yet.')).toBeTruthy()
  const [stay, leave] = [ask.getByRole('button', { name: 'Keep editing' }), ask.getByRole('button', { name: 'Leave' })]
  await moment(); expect([document.activeElement, stay.getAttribute('data-variant'), leave.getAttribute('data-variant')]).toEqual([stay, 'outline', 'default'])
  // Both keep the button's mark, so access.css draws them as buttons where the page is served alone.
  expect([stay, leave].map(button => button.getAttribute('data-slot'))).toEqual(['button', 'button'])
  // A click on the dimmed page round the question does not answer it.
  const dimmed = document.querySelector('[data-slot="alert-dialog-overlay"]'); await fireEvent.pointerDown(dimmed); await fireEvent.click(dimmed)
  expect([!!question(), where()]).toEqual([true, KIM])
  // Staying keeps the change in the panel, and the keyboard goes back to where it was in it.
  await click('Keep editing'); expect(question()).toBeNull(); await moment()
  expect([document.activeElement, panel('kim@shop.com').contains(cancel)]).toEqual([cancel, true])
  expect([app('Tip calculator').checked, screen.getByRole('button', { name: 'Save access' }).closest('fieldset') .disabled]).toEqual([true, false])
  // The ✕ asks too, and Escape answers the question the same way as Keep editing: the panel stays.
  await click('Close'); expect(question()).toBeTruthy(); await fireEvent.keyDown(question(), { key: 'Escape' })
  expect([question(), where(), app('Tip calculator').checked]).toEqual([null, KIM, true]); await moment()
  // Escape on the panel asks as well; leaving goes to the list and sends nothing.
  await fireEvent.keyDown(panel('kim@shop.com'), { key: 'Escape' }); expect(question()).toBeTruthy(); await click('Leave')
  await closed(); expect(where()).toBe('/apps/access/'); expect(posts()).toHaveLength(0)
  expect(unloadAsks()).toBe(false); expect(screen.queryByText('Saved.')).toBeNull()
})
it("a view's link asks before a changed panel is left, goes where it led on leaving, and leaves at once from an untouched one", async () => {
  await open('people/kim@shop.com'); await screen.findByRole('button', { name: 'Save access' })
  // The views show beside the panel, each with its count.
  expect(within(screen.getByRole('navigation', { name: 'Access views' })).getAllByRole('link').map(link => link.textContent)).toEqual(['People 3', 'Roles 1', 'Services 2'])
  // A key's level raised is a change to lose, and it ticks no app.
  await fireEvent.click(radio('Stripe', 'Read & write')); await fireEvent.click(tab('Roles'))
  expect(question()).toBeTruthy(); expect(where()).toBe(KIM)
  // Staying keeps the change; leaving goes to the view the link named, and sends nothing.
  await click('Keep editing'); expect([radio('Stripe', 'Read & write').checked, app('Hello').checked, app('Tip calculator').checked]).toEqual([true, true, false])
  await fireEvent.click(tab('Roles')); await click('Leave')
  await screen.findByRole('table', { name: 'Roles' }); expect(where()).toBe('/apps/access/roles'); expect(posts()).toHaveLength(0)
  cleanup(); await open('people/kim@shop.com'); await screen.findByRole('button', { name: 'Save access' })
  await fireEvent.click(tab('Roles')); await screen.findByRole('table', { name: 'Roles' }); expect(question()).toBeNull(); expect(where()).toBe('/apps/access/roles')
})
it('closes at once a panel put back the way it was', async () => {
  await open('people/kim@shop.com'); await screen.findByRole('button', { name: 'Save access' })
  // A level raised and lowered, a key picked and set back to None, an app ticked and unticked or back: no change.
  await fireEvent.click(radio('Stripe', 'Read & write')); expect(screen.getByText('Not saved yet')).toBeTruthy(); await fireEvent.click(radio('Stripe', 'Read'))
  await fireEvent.click(radio('Bank', 'Read')); await fireEvent.click(radio('Bank', 'None'))
  for (const name of ['Tip calculator', 'Hello']) { await fireEvent.click(app(name)); expect([name, unloadAsks()]).toEqual([name, true]); await fireEvent.click(app(name)) }
  expect([app('Hello').checked, app('Tip calculator').checked, unloadAsks()]).toEqual([true, false, false]); expect(screen.queryByText('Not saved yet')).toBeNull()
  await click('Cancel'); await closed(); expect([question(), where()]).toEqual([null, '/apps/access/'])
})
// Every kind of opened item: a person, a new person, a role, a new role, an app and a key. One test each, so no one
// test opens the panel twenty times.
const pages = [
  ['people/lee@shop.com', () => fireEvent.change(screen.getByLabelText('Role'), { target: { value: '' } })],
  ['people/new', () => fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@shop.com' } })],
  ['roles/sales', () => fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Field sales' } })],
  ['people/kim@shop.com', () => fireEvent.click(app('Hello'))],
  ['people/kim@shop.com', () => fireEvent.click(radio('Bank', 'Read'))],
  ['roles/sales', () => fireEvent.click(app('Tip calculator'))],
  ['roles/new', () => fireEvent.click(app('Tip calculator'))],
  ['roles/new', () => fireEvent.change(screen.getByLabelText('Copy from a person'), { target: { value: 'kim@shop.com' } })],
]
it.each(pages)('asks on an opened item with a change: %s', async (path, change) => {
  const home = `/apps/access/${path.split('/')[0].replace('people', '')}`
  // Untouched, Cancel closes at once, and the list was there all along.
  await open(path); await screen.findByRole('button', { name: /^Save/ }); expect(screen.getByRole('table'), path).toBeTruthy(); await click('Cancel')
  await closed(); expect([path, where(), !!question()]).toEqual([path, home, false]); cleanup()
  // Changed, it asks; staying keeps the panel, leaving goes to its list.
  await open(path); await screen.findByRole('button', { name: /^Save/ }); await change(); await click('Cancel')
  expect([path, where(), !!question()]).toEqual([path, `/apps/access/${path}`, true])
  await click('Keep editing'); expect(question()).toBeNull(); await click('Cancel'); await click('Leave')
  await closed(); expect([path, where()]).toEqual([path, home]); cleanup()
  expect(posts()).toHaveLength(0)
})
it('the browser Back button and the host moving ask too, and a save passes without asking', async () => {
  window.history.replaceState(null, '', '/apps/access/')
  window.history.pushState({ usr: null, key: 'kim', idx: 1 }, '', KIM)
  const handle = await render(KIM)
  const at = () => decodeURIComponent(window.location.pathname)
  // The host moves the page, as the app's own links do, and tells it to read the address again.
  const move = async (to) => { window.history.pushState(null, '', to); handle.update(); await moment() }
  await screen.findByRole('button', { name: 'Save access' })
  // A tick is the only change.
  await fireEvent.click(app('Tip calculator')); expect(unloadAsks()).toBe(true)
  // Back is held: the panel stays, with its change, until the owner answers.
  await back()
  expect(question()).toBeTruthy(); expect(at()).toBe(KIM)
  await click('Keep editing'); expect(question()).toBeNull(); expect(app('Tip calculator').checked).toBe(true)
  // The panel's own ways out and the views' links are held the same way, by one question. The host asks it too.
  await click('Cancel'); expect(screen.getAllByRole('alertdialog')).toHaveLength(1); await click('Keep editing')
  await fireEvent.click(tab('Roles')); expect(screen.getAllByRole('alertdialog')).toHaveLength(1); expect(at()).toBe(KIM); await click('Keep editing')
  expect(handle.hold('/')).toBe(true); await moment(); expect(question()).toBeTruthy(); await click('Keep editing')
  await click('Close'); expect(question()).toBeTruthy(); expect(at()).toBe(KIM)
  await click('Leave'); await closed(); expect(at()).toBe('/apps/access/'); expect(posts()).toHaveLength(0)
  // An untouched panel is never held.
  await move('/apps/access/people/kim@shop.com'); await screen.findByRole('button', { name: 'Save access' }); expect(handle.hold('/')).toBe(false)
  await move('/apps/access/roles'); await screen.findByRole('region', { name: 'Roles' }); expect(question()).toBeNull()
  // A save is the owner's answer already: it lands on the list with its box, and no question.
  await move('/apps/access/people/kim@shop.com'); await screen.findByRole('button', { name: 'Save access' })
  await fireEvent.click(radio('Stripe', 'Read & write')); await click('Save access')
  await screen.findByText('Saved.'); expect(at()).toBe('/apps/access/'); expect(question()).toBeNull(); expect(posts()).toHaveLength(1)
})
