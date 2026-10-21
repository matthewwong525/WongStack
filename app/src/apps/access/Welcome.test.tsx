// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { App } from './App'
import type { BuiltApp, Person, SavedKey, Status } from '../../lib/access'

// The message to send a person given the project: a popup after the save, and a fold under their own project tick.
// A shop with three apps: Hello changes things with Stripe, Payroll with Bank, and the tip calculator uses no key.
const key = (id: string, title: string, changes: Partial<SavedKey> = {}): SavedKey => ({ id, title, levels: ['read', 'write'], saved: true, setup: false, alone: false, ...changes })
const built = (id: string, title: string): BuiltApp => ({ id, title, description: `${title} for the shop` })
const person = (email: string, changes: Partial<Person> = {}): Person => ({ email, status: 'active', settled: true, role: null, apps: [], keys: {}, ...changes })
const sales = () => ({ apps: ['hello', 'tips'], keys: { stripe: 'read' as const } })
const status = (): Status => ({ ownerEmail: 'owner@shop.com', viewer: { email: 'owner@shop.com', owner: true }, environment: 'live', key: 'ready', started: true, imported: 0,
  keysStarted: true, unticked: { people: [], roles: [] },
  apps: [built('hello', 'Hello'), built('payroll', 'Payroll'), built('tips', 'Tip calculator')],
  keys: [key('stripe', 'Stripe'), key('bank', 'Bank'),
    key('cloudflare', 'Cloudflare', { levels: ['read'], setup: true, alone: true }), key('code', 'Project code', { levels: ['read', 'write'], alone: true })],
  roles: [{ id: 'office', name: 'Office', apps: [], keys: {} }, { id: 'sales', name: 'Sales', ...sales() }, { id: 'support', name: 'Support', apps: ['hello'], keys: { stripe: 'read' } }],
  // Kim has Hello, which changes things with Stripe, and holds Stripe at Read: the two are not tied to each other.
  people: [person('gone@shop.com', { status: 'removed' }), person('kim@shop.com', { apps: ['hello'], keys: { stripe: 'read', cloudflare: 'read' } }),
    person('lee@shop.com', { role: 'sales', ...sales() }), person('sam@shop.com', { role: 'sales', ...sales() })],
  work: [], project: 'ready' })
let roster: Status
let fetchMock: ReturnType<typeof vi.fn>
// The viewer's setup message: none on this preview, unless a test makes it ready.
let prompt: { state: 'ready'; text: string } | { state: 'unavailable'; message: string }
// The apps a person can open.
const screens = () => roster.apps.map(item => item.id)
beforeEach(() => {
  roster = status(); prompt = { state: 'unavailable', message: 'Not on this preview' }
  fetchMock = vi.fn(async (url: string) => {
    const path = url.replace('/api/access/', '')
    // The owner, or an Admin: an employee who manages. The status names which in `viewer`.
    if (path === 'apps') return Response.json({ state: 'current', role: roster.viewer.owner ? 'owner' : 'employee', manages: true, apps: ['access', ...screens()], revision: 1 })
    if (path === 'setup') return Response.json({ role: 'owner', api: 'authenticated', identity: { email: 'owner@shop.com', subject: 'owner' }, apps: screens(),
      repository: 'manual_provider_setup', memory: 'independent_operator_setup', prompt })
    return Response.json(roster)
  })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const open = (path = '') => render(<MemoryRouter initialEntries={[`/apps/access/${path}`]}><Routes><Route path="/apps/:name/*" element={<App />} /></Routes></MemoryRouter>)
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const posts = (path: string) => fetchMock.mock.calls.filter(([url, init]) => url.endsWith(path) && init?.method === 'POST')
const row = async (email: string) => within((await screen.findByRole('link', { name: email })).closest('tr')!)
const panel = async (name: string) => within(await screen.findByRole('dialog', { name }))
const part = (name: string) => screen.getByRole('group', { name: new RegExp(`^${name}( · |$)`) })
const give = (name: string) => fireEvent.click(within(part('Apps')).getByRole('checkbox', { name }))
const install = () => screen.getByRole('checkbox', { name: 'Can install the project' }) as HTMLInputElement
const publish = () => screen.getByRole('checkbox', { name: 'Can publish' }) as HTMLInputElement
const tick = () => fireEvent.click(install())
const project = () => within(part('Project'))
const lacking = (step: 'key' | 'setup') => { roster.keys[3].saved = false; roster.project = step }
// The popup a save opens with the message to send, and the message it shows.
const popup = () => within(screen.getByRole('alertdialog'))
const message = (box: { getByText: typeof screen.getByText }) => box.getByText(/^You can now use/, { selector: 'p' }).textContent
// Done closes the popup a save opened.
const done = async () => {
  fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Done' }))
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
}
const ADDRESS = `You can now use our company app at ${window.location.origin}`
const CONNECT = 'Then open Connect your assistant and follow its steps.'
it('opens a popup with the message to send after a save that newly gives a person the project, and none otherwise', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(async () => {}) } })
  // Ann is added with the project in her own set.
  open('people/new'); await panel('Add person')
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ann@shop.com' } }); tick()
  roster.people.push(person('ann@shop.com', { keys: { code: 'read' } })); click('Save access')
  await screen.findByRole('alertdialog')
  expect(popup().getByRole('heading').textContent).toBe('Send ann@shop.com this message')
  expect(message(popup())).toBe(`${ADDRESS}\nSign in with ann@shop.com.\n${CONNECT}`)
  // The Saved notice holds no message.
  const said = within(screen.getByText('Saved.').closest<HTMLElement>('[data-slot="alert"]')!)
  expect([said.queryByText(/^You can now use/), said.queryByRole('button')]).toEqual([null, null])
  // Copy sends nothing; Done closes it for good.
  const sends = posts('people').length
  fireEvent.click(popup().getByRole('button', { name: 'Copy' }))
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${ADDRESS}\nSign in with ann@shop.com.\n${CONNECT}`))
  expect(posts('people')).toHaveLength(sends)
  await done()
  // Kim, already listed, is given the project by her own set.
  cleanup(); open('people/kim@shop.com'); await panel('kim@shop.com'); tick()
  roster.people[1].keys = { ...roster.people[1].keys, code: 'read' }; click('Save access')
  expect(message(within(await screen.findByRole('alertdialog')))).toContain('Sign in with kim@shop.com.')
  // A save that gives no project, or keeps what she had, opens none.
  cleanup(); open('people/kim@shop.com'); await panel('kim@shop.com'); give('Payroll'); click('Save access'); await screen.findByText('Saved.')
  expect(screen.queryByRole('alertdialog')).toBeNull()
  cleanup(); open('people/new'); await panel('Add person')
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bo@shop.com' } }); roster.people.push(person('bo@shop.com')); click('Save access')
  await screen.findByText('Saved.'); expect(screen.queryByRole('alertdialog')).toBeNull()
  // A save that did not finish opens none.
  cleanup(); open('people/new'); await panel('Add person')
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'cy@shop.com' } }); tick()
  fetchMock.mockImplementationOnce(async () => Response.json({ code: 'unavailable' }, { status: 503 })); click('Save access')
  await screen.findByRole('alert'); expect(screen.queryByRole('alertdialog')).toBeNull()
  // An install not handing out its project yet opens none.
  cleanup(); roster.project = 'key'; open('people/new'); await panel('Add person')
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'di@shop.com' } }); tick()
  roster.people.push(person('di@shop.com', { keys: { code: 'read' } })); click('Save access')
  await screen.findByText('Saved.'); expect(screen.queryByRole('alertdialog')).toBeNull()
})
it('opens the popup when a role picked in the list gives the project, and not for a role without it', async () => {
  roster.roles[0].keys = { code: 'read' }
  open('people'); await row('kim@shop.com')
  fireEvent.change(screen.getByRole('combobox', { name: 'Role for kim@shop.com' }), { target: { value: 'support' } })
  await screen.findByText('kim@shop.com now has Support.'); expect(screen.queryByRole('alertdialog')).toBeNull()
  roster.people[2].role = 'office'
  fireEvent.change(screen.getByRole('combobox', { name: 'Role for lee@shop.com' }), { target: { value: 'office' } })
  await screen.findByText('lee@shop.com now has Office.')
  expect(message(within(await screen.findByRole('alertdialog')))).toBe(`${ADDRESS}\nSign in with lee@shop.com.\n${CONNECT}`)
})
it('folds the message under a saved person\'s own project tick while ticked, and nowhere else on their page', async () => {
  const fold = () => project().queryByText('Message to send them')
  // Kim has no project: no fold, and no message on her page, until the tick is on.
  open('people/kim@shop.com'); const kim = await panel('kim@shop.com')
  expect([fold(), kim.queryByText(/^You can now use/)]).toEqual([null, null])
  tick(); fireEvent.click(fold()!)
  expect(message(project())).toBe(`${ADDRESS}\nSign in with kim@shop.com.\n${CONNECT}`)
  expect(project().getByRole('button', { name: 'Copy' })).toBeTruthy()
  // The fold sits right under the tick, before Can publish.
  expect(install().compareDocumentPosition(fold()!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(fold()!.compareDocumentPosition(publish()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  tick(); expect(fold()).toBeNull()
  // None while the app can't hand the project out yet.
  cleanup(); lacking('key'); open('people/kim@shop.com'); await panel('kim@shop.com'); tick(); expect(fold()).toBeNull()
  // A person being added has none; neither has a role's set.
  cleanup(); open('people/new'); await panel('Add person'); tick(); expect(fold()).toBeNull()
  cleanup(); open('roles/office'); await panel('Office'); tick(); expect(fold()).toBeNull()
})
it('carries the setup message, unchanged, for a person who may connect, so they can paste it all into their assistant', async () => {
  const MESSAGE = 'Set up shop\'s project for me in this folder.\nThen tell me what works and what is left.'
  prompt = { state: 'ready', text: MESSAGE }
  open('people/new'); await panel('Add person')
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ann@shop.com' } }); tick()
  roster.people.push(person('ann@shop.com', { keys: { code: 'read' } })); click('Save access')
  await screen.findByRole('alertdialog')
  const note = await waitFor(() => popup().getByText(/For the assistant:/, { selector: 'p' }))
  expect(note.textContent).toBe([ADDRESS, 'Sign in with ann@shop.com.', '',
    'To connect your AI assistant:',
    '1. No assistant on your computer yet? Install one, such as Claude Code (https://claude.com/product/claude-code) or Codex (https://developers.openai.com/codex).',
    '2. Paste this whole note into its chat.', '3. When it shows a sign-in link, sign in with ann@shop.com.', '', 'For the assistant:', MESSAGE].join('\n'))
  // Lee may not connect, so her page reads no setup message.
  cleanup(); fetchMock.mockClear(); open('people/lee@shop.com'); await panel('lee@shop.com')
  expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/setup'))).toHaveLength(0)
})
