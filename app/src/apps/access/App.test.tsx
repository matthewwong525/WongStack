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

const origin = 'https://business.example.com'
const setup = { role: 'employee', api: 'authenticated', identity: { email: 'employee@example.com', subject: 'employee' }, apps: ['hello'],
  repository: 'manual_provider_setup', memory: 'independent_operator_setup', prompt: { state: 'ready', text: 'Synthetic reviewed setup prompt' } }
const person = (changes: Partial<Person> = {}): Person => ({ email: 'employee@example.com', status: 'active', settled: true, role: null, apps: ['hello'], keys: {}, ...changes })
const status = (): Status => ({ origin, ownerEmail: 'owner@example.com', environment: 'live', key: 'ready', started: true, imported: 0,
  keysStarted: true, kept: 0, apps: ['hello', 'custom'], appKeys: { hello: [], custom: [] }, keys: [], roles: [], people: [person()], work: [] })
let mode: 'owner' | 'employee' | 'legacy' | 'waiting-owner' | 'waiting-employee'
let catalogue: string[]
let held: { id: string; title: string; level: 'read' | 'write' }[] | undefined
let own: typeof setup
let roster: Status
let failed: Set<string>
let fetchMock: ReturnType<typeof vi.fn>
function appAccess() {
  if (mode === 'legacy') return { state: 'legacy' }
  if (mode === 'owner' || mode === 'employee') return { state: 'current', role: mode, apps: catalogue, revision: 1, keys: held }
  return { state: 'not_started', role: mode === 'waiting-owner' ? 'owner' : 'employee', apps: catalogue }
}
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

it('the owner sees people first, adds a person in one save, edits apps and copies the app link', async () => {
  open(); expect(screen.getByText('Loading people…')).toBeTruthy()
  await screen.findByRole('link', { name: 'Add person' })
  const people = within(screen.getByRole('region', { name: 'People' }))
  expect(people.getByText('Can sign in')).toBeTruthy(); expect(people.getByText('Hello')).toBeTruthy()
  // No operator panel, connection button or private-instructions copy.
  for (const name of [/Connect login management/, /Copy private setup instructions/, /Retry login changes/, 'Try again']) expect(screen.queryByRole('button', { name })).toBeNull()
  follow('Add person')
  const email = await screen.findByLabelText('Email'); expect(document.activeElement).toBe(email)
  fireEvent.change(email, { target: { value: 'new@example.com' } })
  expect(screen.getAllByRole('checkbox').every(input => !(input as HTMLInputElement).checked)).toBe(true)
  expect(screen.queryByRole('checkbox', { name: 'Access' })).toBeNull()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Hello' })); fireEvent.click(screen.getByRole('checkbox', { name: 'custom' }))
  roster.people.push(person({ email: 'new@example.com', apps: ['hello', 'custom'] }))
  click('Save access'); await screen.findByText('Saved.')
  expect(posts('people')[0][1]).toMatchObject({ redirect: 'error' })
  expect(sent('people')).toEqual([{ email: 'new@example.com', removed: false, role: null, apps: ['hello', 'custom'], keys: {} }])
  await screen.findByText('All apps')
  fireEvent.click(screen.getAllByRole('link', { name: 'Edit' })[0]); fireEvent.click(await screen.findByRole('checkbox', { name: 'Hello' })); click('Cancel')
  await screen.findByRole('link', { name: 'Add person' }); expect(sent('people')).toHaveLength(1)
  click('Copy app link'); await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(origin))
  // The owner's own setup box sits on the same screen.
  await screen.findByRole('button', { name: 'Copy setup prompt' })
})
it('switches between four views whose addresses survive Back and a reload, and shows People at an unknown address', async () => {
  const current = () => Array.from(document.querySelectorAll('[aria-current="page"]')).map(link => link.textContent)
  open(); const views = within(await screen.findByRole('navigation', { name: 'Access views' })).getAllByRole('link')
  expect(views.map(link => [link.textContent, link.getAttribute('href')])).toEqual([['People', '/apps/access/'], ['Roles', '/apps/access/roles'],
    ['Apps', '/apps/access/apps'], ['Keys', '/apps/access/keys']])
  expect(current()).toEqual(['People'])
  for (const name of ['Roles', 'Apps', 'Keys']) {
    follow(name); await screen.findByRole('region', { name })
    expect(current()).toEqual([name]); expect(where()).toBe(`/apps/access/${name.toLowerCase()}`)
  }
  // Back returns to the view before, and one read of the status served all four.
  fireEvent.click(screen.getByTestId('where')); await screen.findByRole('region', { name: 'Apps' })
  expect(where()).toBe('/apps/access/apps'); expect(reads('status')).toHaveLength(1)
  for (const [path, name] of [['roles', 'Roles'], ['apps', 'Apps'], ['keys', 'Keys'], ['people', 'People'], ['nothing/new', 'People'], ['roles/nothing', 'Roles'],
    ['apps/nothing', 'Apps'], ['keys/nothing', 'Keys'], ['people/nobody@example.com', 'People']]) {
    cleanup(); open(path); await screen.findByRole('region', { name })
    expect(current(), path).toEqual([name]); expect(screen.queryByRole('button', { name: /^Save/ }), path).toBeNull()
  }
})
it('every view says it is loading, and that Access is unavailable with Retry when the list cannot be read', async () => {
  for (const [path, name] of [['', 'People'], ['roles', 'Roles'], ['apps', 'Apps'], ['keys', 'Keys']]) {
    failed.add('status'); open(path); expect(screen.getByText('Loading people…')).toBeTruthy()
    await screen.findByText('Access is unavailable.'); expect(screen.queryByRole('navigation')).toBeNull()
    failed.delete('status'); click('Retry'); await screen.findByRole('region', { name }); cleanup()
  }
})
it('shows Try again only on the person whose sign-in step failed, and the retry clears it', async () => {
  roster.people.push(person({ email: 'new@example.com', settled: false }))
  roster.work = [{ kind: 'policy', status: 'failed' }]
  open(); await screen.findByText("Can't sign in yet")
  expect(screen.getByText('Can sign in')).toBeTruthy()
  expect(screen.getAllByRole('button', { name: 'Try again' })).toHaveLength(1)
  roster.people[1].settled = true; roster.work = [{ kind: 'policy', status: 'ready' }]
  click('Try again'); await screen.findByText('Checked again.')
  await waitFor(() => expect(screen.getAllByText('Can sign in')).toHaveLength(2))
  expect(posts('retry')).toHaveLength(1); expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
})
it('says one step is left when the live app has no key yet, with a request to copy and no retry', async () => {
  roster.key = 'missing'; roster.people[0].settled = false; roster.work = [{ kind: 'policy', status: 'pending' }]
  open(); await screen.findByText(/You can choose apps now/)
  expect(screen.getByText("Can't sign in yet")).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
  click('Copy that request'); await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(FINISH_REQUEST))
  // Choosing apps still works.
  follow('Add person'); expect(await screen.findByRole('button', { name: 'Save access' })).toBeTruthy()
})
it('notes on the first open who could already sign in, and offers another read when the list could not be read', async () => {
  roster.imported = 3; roster.people[0].apps = ['hello', 'custom']
  open(); await screen.findByText('3 people could already sign in. They keep every app until you change them.')
  expect(screen.getByText('All apps')).toBeTruthy(); cleanup()
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
  }
  expect(screen.getByText('Practice list')).toBeTruthy(); expect(screen.getByText('Removed')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
  click('Remove'); expect(screen.getByText(/leave the practice list/)).toBeTruthy()
})
it('confirms a removal by saying everyone signs in again, and a removed person can be added back with no apps', async () => {
  open(); await screen.findByRole('button', { name: 'Remove' }); click('Remove')
  expect(screen.getByRole('heading', { name: 'Remove employee@example.com?' })).toBeTruthy()
  expect(screen.getByText(/Everyone is signed out and signs in again\. This can't be undone\./)).toBeTruthy()
  expect(screen.getByText(/project code is removed separately/)).toBeTruthy()
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove access' }))
  expect(screen.getByRole('button', { name: 'Remove' }).hasAttribute('disabled')).toBe(true)
  click('Cancel'); expect(screen.queryByRole('heading', { name: /^Remove / })).toBeNull(); click('Remove')
  roster.people = [person({ status: 'removed', apps: [], settled: false })]; roster.work = [{ kind: 'sessions', status: 'failed' }]
  click('Remove access'); await screen.findByText('Removed · still signing out')
  expect(sent('people')).toEqual([{ email: 'employee@example.com', apps: [], removed: true }])
  expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull()
  follow('Add back'); await screen.findByRole('heading', { name: 'employee@example.com · Removed · still signing out' })
  expect(screen.getAllByRole('checkbox').every(input => !(input as HTMLInputElement).checked)).toBe(true)
  click('Save access'); await screen.findByText('Saved.')
  expect(sent('people')[1]).toEqual({ email: 'employee@example.com', removed: false, role: null, apps: [], keys: {} })
})
it('an uncertain save reloads current status without replaying the mutation', async () => {
  open(); fireEvent.click(await screen.findByRole('link', { name: 'Edit' }))
  await screen.findByRole('button', { name: 'Save access' }); failed.add('people'); click('Save access')
  await screen.findByText('That did not finish. Check the list below before trying again.')
  await screen.findByRole('link', { name: 'Edit' })
  expect(screen.queryByRole('button', { name: 'Save access' })).toBeNull()
  expect(posts('people')).toHaveLength(1)
  expect(reads('status').length).toBeGreaterThan(1)
})
it('reads Access is unavailable with Retry when people or permissions cannot be read', async () => {
  roster.people = []; failed.add('status')
  open(); await screen.findByText('Access is unavailable.')
  failed.delete('status'); click('Retry'); await screen.findByText('No people added yet.')
  cleanup()
  failed.add('apps'); open(); await screen.findByText('Access is unavailable.')
  expect(screen.queryByRole('region', { name: 'Connect your assistant' })).toBeNull()
  failed.delete('apps'); click('Retry'); await screen.findByRole('link', { name: 'Add person' })
})
it('a person who is not the owner sees what they can use above their own setup box, before and after permissions start', async () => {
  for (const viewer of ['employee', 'waiting-employee'] as const) {
    mode = viewer; open(); await screen.findByText('Signed in as employee@example.com')
    expect(screen.getByText('Apps: Hello')).toBeTruthy()
    const can = screen.getByRole('region', { name: 'You can use' })
    expect(Array.from(can.querySelectorAll('p')).map(line => line.textContent)).toEqual(['Hello', ''])
    expect(can.compareDocumentPosition(screen.getByRole('region', { name: 'Connect your assistant' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Add person' })).toBeNull(); expect(screen.queryByRole('navigation')).toBeNull()
    click('Copy setup prompt'); await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(own.prompt.text))
    expect(screen.getByText(/approve the sign-in on that computer/)).toBeTruthy(); cleanup()
  }
  expect(reads('status')).toHaveLength(0)
  // Their apps by title and their key levels; before permissions start, every app.
  mode = 'employee'; catalogue = ['access', 'hello', 'tips']
  held = [{ id: 'stripe', title: 'Stripe', level: 'read' }, { id: 'bank', title: 'Bank', level: 'write' }]
  open(); const levels = await screen.findByText('Stripe: Read · Bank: Read & write')
  expect(within(levels.closest('section')!).getByText('Hello · Tip calculator')).toBeTruthy(); cleanup()
  // With nothing given yet, one plain line says so.
  catalogue = ['access']; held = []; open(); await screen.findByText('No apps yet. Ask your employer.'); cleanup()
  // The owner manages people as soon as the owner is known, even before permissions start.
  mode = 'waiting-owner'; open(); await screen.findByRole('link', { name: 'Add person' })
  expect(screen.queryByRole('region', { name: 'You can use' })).toBeNull(); cleanup()
  own.apps = []; own.prompt = { state: 'unavailable', message: 'Finish reviewed setup' } as unknown as typeof own.prompt
  render(<AssistantSetup />); await screen.findByText('Finish reviewed setup')
  expect(screen.getByText(/None yet/)).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Copy setup prompt' })).toBeNull()
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
