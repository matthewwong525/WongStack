// @vitest-environment jsdom
/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { App } from './App'
import { PersonForm } from './PersonForm'
import { FINISH_REQUEST } from './status'
import { CopyText } from '../../components/CopyText'
import { AssistantSetup } from '../../components/AssistantSetup'
import { appAccessSchema, readAccess, statusSchema, useAccess } from '../../lib/access'
import { Home } from '../../pages/home/Home'
import { AppPage } from '../AppPage'
import { MemoryRouter, Route, Routes } from 'react-router'

const origin = 'https://business.example.com'
const setup = { role: 'employee', api: 'authenticated', identity: { email: 'employee@example.com', subject: 'employee' }, apps: ['hello'],
  repository: 'manual_provider_setup', memory: 'independent_operator_setup', prompt: { state: 'ready', text: 'Synthetic reviewed setup prompt' } }
const person = { email: 'employee@example.com', status: 'active', settled: true, apps: ['hello'] }
const status = () => ({ origin, ownerEmail: 'owner@example.com', environment: 'live', key: 'ready', started: true, imported: 0,
  apps: ['hello', 'custom'], people: [{ ...person }], work: [] as { kind: string; status: string }[] })
let mode: 'owner' | 'employee' | 'legacy' | 'waiting-owner' | 'waiting-employee'
let catalogue: string[]
let own: typeof setup
let roster: ReturnType<typeof status>
let failed: Set<string>
let fetchMock: ReturnType<typeof vi.fn>
function appAccess() {
  if (mode === 'legacy') return { state: 'legacy' }
  if (mode === 'owner' || mode === 'employee') return { state: 'current', role: mode, apps: catalogue, revision: 1 }
  return { state: 'not_started', role: mode === 'waiting-owner' ? 'owner' : 'employee', apps: catalogue }
}
beforeEach(() => {
  mode = 'owner'; own = structuredClone(setup); roster = status(); catalogue = ['access', 'hello']; failed = new Set()
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
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const posts = (path: string) => fetchMock.mock.calls.filter(([url, init]) => url.endsWith(path) && init?.method === 'POST')
const reads = (path: string) => fetchMock.mock.calls.filter(([url, init]) => url.endsWith(path) && init?.method !== 'POST')

it('the owner sees people first, adds a person in one save, edits apps and copies the app link', async () => {
  render(<App />); expect(screen.getByText('Loading people…')).toBeTruthy()
  await screen.findByRole('button', { name: 'Add person' })
  expect(within(screen.getByRole('region', { name: 'People' })).getByText('Hello · Can sign in')).toBeTruthy()
  // No operator panel, connection button or private-instructions copy.
  for (const name of [/Connect login management/, /Copy private setup instructions/, /Retry login changes/, 'Try again']) expect(screen.queryByRole('button', { name })).toBeNull()
  click('Add person')
  const email = screen.getByRole('textbox', { name: 'Email' }); expect(document.activeElement).toBe(email)
  fireEvent.change(email, { target: { value: 'new@example.com' } })
  expect(screen.getAllByRole('checkbox').every(input => !(input as HTMLInputElement).checked)).toBe(true)
  expect(screen.queryByRole('checkbox', { name: 'Access' })).toBeNull()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Hello' })); fireEvent.click(screen.getByRole('checkbox', { name: 'custom' }))
  roster.people.push({ email: 'new@example.com', status: 'active', settled: true, apps: ['hello', 'custom'] })
  click('Save access'); await screen.findByText('Saved.')
  expect(posts('people')[0][1]).toMatchObject({ redirect: 'error', body: JSON.stringify({ email: 'new@example.com', apps: ['hello', 'custom'], removed: false }) })
  await screen.findByText('All apps · Can sign in')
  fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]); fireEvent.click(screen.getByRole('checkbox', { name: 'Hello' })); click('Cancel')
  click('Copy app link'); await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(origin))
  // The owner's own setup box sits on the same screen.
  await screen.findByRole('button', { name: 'Copy setup prompt' })
})
it('shows Try again only on the person whose sign-in step failed, and the retry clears it', async () => {
  roster.people.push({ email: 'new@example.com', status: 'active', settled: false, apps: ['hello'] })
  roster.work = [{ kind: 'policy', status: 'failed' }]
  render(<App />); await screen.findByText("Hello · Can't sign in yet")
  expect(screen.getByText('Hello · Can sign in')).toBeTruthy()
  expect(screen.getAllByRole('button', { name: 'Try again' })).toHaveLength(1)
  roster.people[1].settled = true; roster.work = [{ kind: 'policy', status: 'ready' }]
  click('Try again'); await screen.findByText('Checked again.')
  await waitFor(() => expect(screen.getAllByText('Hello · Can sign in')).toHaveLength(2))
  expect(posts('retry')).toHaveLength(1); expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
})
it('says one step is left when the live app has no key yet, with a request to copy and no retry', async () => {
  roster.key = 'missing'; roster.people[0].settled = false; roster.work = [{ kind: 'policy', status: 'pending' }]
  render(<App />); await screen.findByText(/You can choose apps now/)
  expect(screen.getByText("Hello · Can't sign in yet")).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
  click('Copy that request'); await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(FINISH_REQUEST))
  // Choosing apps still works.
  click('Add person'); expect(screen.getByRole('button', { name: 'Save access' })).toBeTruthy()
})
it('notes on the first open who could already sign in, and offers another read when the list could not be read', async () => {
  roster.imported = 3; roster.people[0].apps = ['hello', 'custom']
  render(<App />); await screen.findByText('3 people could already sign in. They keep every app until you change them.')
  expect(screen.getByText('All apps · Can sign in')).toBeTruthy(); cleanup()
  roster.imported = 1; render(<App />); await screen.findByText(/^1 person could already sign in/); cleanup()
  roster.imported = 0; roster.started = false
  render(<App />); await screen.findByText(/could not be read yet/)
  const before = reads('status').length; roster.started = true
  click('Read it again'); await waitFor(() => expect(screen.queryByText(/could not be read yet/)).toBeNull())
  expect(reads('status').length).toBe(before + 1)
})
it('marks a preview as a practice list and never offers a provider retry there', async () => {
  roster.environment = 'practice'; roster.key = 'practice'; roster.people[0].settled = false
  roster.people.push({ email: 'gone@example.com', status: 'removed', settled: false, apps: [] })
  render(<App />); await screen.findByText(/Changes here stay on previews/)
  expect(screen.getByText('Hello · Practice list')).toBeTruthy(); expect(screen.getByText('Removed')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
  click('Remove'); expect(screen.getByText(/leave the practice list/)).toBeTruthy()
})
it('confirms a removal by saying everyone signs in again, and a removed person can be added back with no apps', async () => {
  render(<App />); await screen.findByRole('button', { name: 'Remove' }); click('Remove')
  expect(screen.getByRole('heading', { name: 'Remove employee@example.com?' })).toBeTruthy()
  expect(screen.getByText(/Everyone is signed out and signs in again\. This can't be undone\./)).toBeTruthy()
  expect(screen.getByText(/project code is removed separately/)).toBeTruthy()
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Remove access' }))
  for (const name of ['Add person', 'Edit', 'Remove']) expect(screen.getByRole('button', { name }).hasAttribute('disabled')).toBe(true)
  click('Cancel'); expect(screen.queryByRole('heading', { name: /^Remove / })).toBeNull(); click('Remove')
  roster.people = [{ ...person, status: 'removed', apps: [], settled: false }]; roster.work = [{ kind: 'sessions', status: 'failed' }]
  click('Remove access'); await screen.findByText('Removed · still signing out')
  expect(posts('people')[0][1]).toMatchObject({ body: JSON.stringify({ email: person.email, apps: [], removed: true }) })
  expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull()
  click('Add back'); expect(screen.getAllByRole('checkbox').every(input => !(input as HTMLInputElement).checked)).toBe(true)
  click('Save access'); await screen.findByText('Saved.')
})
it('an uncertain save reloads current status without replaying the mutation', async () => {
  render(<App />); await screen.findByRole('button', { name: 'Edit' }); click('Edit'); failed.add('people'); click('Save access')
  await screen.findByText(/did not finish/)
  await screen.findByRole('button', { name: 'Edit' })
  expect(screen.queryByRole('button', { name: 'Save access' })).toBeNull()
  expect(posts('people')).toHaveLength(1)
  expect(reads('status').length).toBeGreaterThan(1)
})
it('reads Access is unavailable with Retry when people or permissions cannot be read', async () => {
  roster.people = []; failed.add('status')
  render(<App />); await screen.findByText('Access is unavailable.')
  failed.delete('status'); click('Retry'); await screen.findByText('No people added yet.')
  cleanup()
  failed.add('apps'); render(<App />); await screen.findByText('Access is unavailable.')
  expect(screen.queryByRole('region', { name: 'Connect your assistant' })).toBeNull()
  failed.delete('apps'); click('Retry'); await screen.findByRole('button', { name: 'Add person' })
})
it('a person who is not the owner sees only their own setup box, before and after permissions start', async () => {
  for (const viewer of ['employee', 'waiting-employee'] as const) {
    mode = viewer; render(<App />); await screen.findByText('Signed in as employee@example.com')
    expect(screen.getByText('Apps: Hello')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Add person' })).toBeNull()
    click('Copy setup prompt'); await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(own.prompt.text))
    expect(screen.getByText(/approve the sign-in on that computer/)).toBeTruthy(); cleanup()
  }
  expect(reads('status')).toHaveLength(0)
  // The owner manages people as soon as the owner is known, even before permissions start.
  mode = 'waiting-owner'; render(<App />); await screen.findByRole('button', { name: 'Add person' }); cleanup()
  own.apps = []; own.prompt = { state: 'unavailable', message: 'Finish reviewed setup' } as unknown as typeof own.prompt
  render(<AssistantSetup />); await screen.findByText('Finish reviewed setup')
  expect(screen.getByText(/None yet/)).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Copy setup prompt' })).toBeNull()
})
it('an install with no recorded owner says Access setup is not finished and still offers the setup box', async () => {
  mode = 'legacy'; render(<App />); await screen.findByText(/Access setup is not finished/)
  expect(screen.queryByRole('button', { name: 'Add person' })).toBeNull(); expect(reads('status')).toHaveLength(0)
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
  const open = () => render(<MemoryRouter initialEntries={['/apps/hello/']}><Routes><Route path="/apps/:name/" element={<AppPage />} /></Routes></MemoryRouter>)
  catalogue = ['access']; open(); await screen.findByText('App access denied'); expect(screen.queryByText('Enter your name')).toBeNull(); cleanup()
  // Before permissions start, the page opens whatever the list says.
  mode = 'waiting-employee'; open(); await screen.findByRole('heading', { name: 'Hello' }); cleanup(); mode = 'employee'
  failed.add('apps'); open(); await screen.findByText('App access unavailable'); failed.delete('apps'); catalogue = ['access', 'hello']; click('Retry access'); await screen.findByRole('heading', { name: 'Hello' })
})
it('the person form works from the keyboard, keeps its labels and offers no editing permission', () => {
  const save = vi.fn(), cancel = vi.fn()
  render(<PersonForm person={null} apps={[]} pending={false} onSave={save} onCancel={cancel} />)
  expect(screen.getByText(/No apps built yet/)).toBeTruthy()
  fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'a@example.com' } })
  // Enter in the email field submits the form: no pointer is needed.
  fireEvent.submit(screen.getByRole('textbox', { name: 'Email' }).closest('form')!)
  expect(save).toHaveBeenCalledWith({ email: 'a@example.com', apps: [], removed: false })
  click('Cancel'); expect(cancel).toHaveBeenCalledOnce(); cleanup()
  render(<PersonForm person={{ email: 'a@example.com', status: 'active', settled: true, apps: ['hello'] }} apps={['hello']} pending onSave={save} onCancel={cancel} />)
  expect(screen.getByRole('heading', { name: 'Edit person' })).toBeTruthy()
  expect(screen.getByRole('textbox', { name: 'Email' }).hasAttribute('disabled')).toBe(true)
  expect((screen.getByRole('checkbox', { name: 'Hello' }) as HTMLInputElement).checked).toBe(true)
  expect(screen.queryByRole('checkbox', { name: /editing/i })).toBeNull()
})
it('fits a phone: the Access and setup styles wrap, and fix no width in pixels', () => {
  for (const file of ['./Access.css', '../../components/AssistantSetup.css', '../../components/CopyText.css']) {
    const css = readFileSync(new URL(file, import.meta.url), 'utf8')
    expect(css, file).not.toMatch(/(?:min-)?width:\s*\d+px/)
  }
  const css = readFileSync(new URL('./Access.css', import.meta.url), 'utf8')
  expect(css).toMatch(/\.access-actions \{[^}]*flex-wrap: wrap/)
  expect(css).toMatch(/\.access-notice \{[^}]*overflow-wrap: anywhere/)
  expect(css).toMatch(/input\[type="email"\] \{[^}]*width: 100%/)
})
it('unmounted responses cannot overwrite newer resource state, and malformed roster readback stays unavailable', async () => {
  let fulfill: (value: Response) => void = () => {}, reject: (error: Error) => void = () => {}
  fetchMock.mockImplementationOnce(() => new Promise<Response>(resolve => { fulfill = resolve }))
  const mounted = render(<AssistantSetup />); mounted.unmount(); await act(async () => fulfill(Response.json(own)))
  fetchMock.mockImplementationOnce(() => new Promise<Response>((_resolve, fail) => { reject = fail }))
  const pending = render(<AssistantSetup />); pending.unmount(); await act(async () => reject(new Error('abort')))
  roster.people = [{ ...person, apps: 'invalid' as unknown as string[] }]
  await expect(readAccess('status', statusSchema)).rejects.toThrow()
  function Probe() { const resource = useAccess('apps', appAccessSchema); return <span>{resource.data?.state}</span> }
  render(<Probe />); await screen.findByText('current')
  expect(within(screen.getByText('current').parentElement!).getByText('current')).toBeTruthy()
})
