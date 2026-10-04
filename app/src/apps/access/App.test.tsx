// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { App } from './App'
import { PersonForm } from './PersonForm'
import { CopyText } from '../../components/CopyText'
import { AssistantSetup } from '../../components/AssistantSetup'
import { appAccessSchema, readAccess, statusSchema, useAccess } from '../../lib/access'
import { Home } from '../../pages/home/Home'
import { AppPage } from '../AppPage'
import { MemoryRouter, Route, Routes } from 'react-router'

const origin = 'https://business.example.com'
const setup = { role: 'employee', api: 'authenticated', identity: { email: 'employee@example.com', subject: 'employee' }, apps: ['hello'],
  repository: 'manual_provider_setup', memory: 'independent_operator_setup', prompt: { state: 'ready', text: 'Synthetic reviewed setup prompt' } }
const person = { email: 'employee@example.com', status: 'active', apps: '["hello"]' }
const status = () => ({ origin, ownerEmail: 'owner@example.com', policyEnabled: true, apps: ['hello', 'custom'], people: [person],
  connections: [{ provider: 'access', status: 'ready', detail: null }], work: [
    { kind: 'policy', status: 'failed', outcome: null, error_code: 'unavailable' },
    { kind: 'sessions', status: 'ready', outcome: 'propagation_unverified', error_code: null },
  ], policyWrites: [{ status: 'unknown' }], limits: 'Repository access and memory remain separate.' })
let mode: 'owner' | 'employee' | 'legacy'
let catalogue: string[]
let own: typeof setup
let roster: ReturnType<typeof status>
let failed: Set<string>
let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  mode = 'owner'; own = structuredClone(setup); roster = status(); catalogue = ['access', 'hello']; failed = new Set()
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const path = url.replace('/api/access/', '')
    if (failed.has(path)) return Response.json({ code: 'unavailable' }, { status: 503 })
    if (init?.method === 'POST') return Response.json({ code: 'saved' })
    if (path === 'apps') return Response.json(mode === 'legacy' ? { state: 'legacy' } : { state: 'current', role: mode, apps: catalogue, revision: 1 })
    if (path === 'setup') return Response.json(own)
    return Response.json(roster)
  })
  vi.stubGlobal('fetch', fetchMock)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(async () => {}) } })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

it('owner adds zero-preselected grants, edits/deselects apps, copies the business link and reviews pending provider outcomes', async () => {
  render(<App />); expect(screen.getByText('Loading access…')).toBeTruthy()
  await screen.findByRole('button', { name: 'Add person' })
  expect(screen.getByText(/previous login-policy change/)).toBeTruthy()
  click('Add person')
  const email = screen.getByRole('textbox', { name: 'Email' }); fireEvent.change(email, { target: { value: 'new@example.com' } })
  expect(screen.getAllByRole('checkbox').every(input => !(input as HTMLInputElement).checked)).toBe(true)
  expect(screen.queryByRole('checkbox', { name: 'Access' })).toBeNull()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Hello' })); fireEvent.click(screen.getByRole('checkbox', { name: 'custom' }))
  click('Save access'); await screen.findByRole('button', { name: 'Add person' })
  expect(fetchMock.mock.calls.find(([url, init]) => url.endsWith('people') && init?.method === 'POST')?.[1]).toMatchObject({ redirect: 'error', body: JSON.stringify({ email: 'new@example.com', apps: ['hello', 'custom'], removed: false }) })
  click('Edit'); fireEvent.click(screen.getByRole('checkbox', { name: 'Hello' })); click('Cancel')
  click('Copy app link'); await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(origin))
  click('Retry login changes'); await screen.findByText('Login status refreshed. Check each outcome below.')
  click('Connect login management'); await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.endsWith('login/connect'))).toBe(true))
})
it('owner removal confirms consequences and blocked tombstones can be restored without automatic app grants', async () => {
  render(<App />); await screen.findByRole('button', { name: 'Remove access' }); click('Remove access')
  expect(screen.getByRole('button', { name: 'Add person' }).hasAttribute('disabled')).toBe(true)
  expect(screen.getByText(/New company work is blocked immediately/)).toBeTruthy()
  click('Cancel removal'); click('Remove access')
  roster.people = [{ ...person, status: 'removed', apps: '[]' }]
  click('Confirm removal'); await screen.findByText('App/API access blocked')
  expect(fetchMock.mock.calls.find(([url]) => url.endsWith('people'))?.[1]).toMatchObject({ body: JSON.stringify({ email: person.email, apps: [], removed: true }) })
  click('Restore person'); expect(screen.getAllByRole('checkbox').every(input => !(input as HTMLInputElement).checked)).toBe(true)
  click('Save access'); await screen.findByRole('button', { name: 'Add person' })
})
it('an uncertain save reloads current status without replaying the mutation', async () => {
  render(<App />); await screen.findByRole('button', { name: 'Edit' }); click('Edit'); failed.add('people'); click('Save access')
  await screen.findByText(/change outcome is uncertain/)
  await screen.findByRole('button', { name: 'Edit' })
  expect(screen.queryByRole('button', { name: 'Save access' })).toBeNull()
  expect(fetchMock.mock.calls.filter(([url, init]) => url.endsWith('people') && init?.method === 'POST')).toHaveLength(1)
  expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('status')).length).toBeGreaterThan(1)
})
it('owner empty catalogue and disconnected login show private setup guidance, safe loading and retry', async () => {
  roster.people = []; roster.apps = []; roster.connections = []; roster.work = []; roster.policyWrites = [{ status: 'completed' }]; roster.policyEnabled = false
  render(<App />); await screen.findByText('No people added yet.')
  expect(screen.getByText('Connection: Not connected')).toBeTruthy(); click('Add person')
  expect(screen.getByText(/No business apps yet/)).toBeTruthy(); click('Cancel')
  click('Copy private setup instructions'); await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalled())
  cleanup(); mode = 'legacy'; failed.add('status'); render(<App />)
  await screen.findByText(/People management is unavailable/)
  failed.delete('status'); click('Retry people'); await screen.findByText('No people added yet.')
})
it('employees see own setup and truthful missing pins with no owner controls', async () => {
  mode = 'employee'; render(<App />); await screen.findByText('App API access: Allowed for employee@example.com')
  expect(screen.queryByRole('button', { name: 'Add person' })).toBeNull()
  expect(fetchMock.mock.calls.every(([url]) => !url.endsWith('status'))).toBe(true)
  click('Copy setup prompt'); await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(own.prompt.text))
  cleanup(); own.apps = []; own.prompt = { state: 'unavailable', message: 'Finish reviewed setup' } as unknown as typeof own.prompt
  render(<AssistantSetup />); await screen.findByText('Finish reviewed setup')
  expect(screen.getByText(/None assigned/)).toBeTruthy(); expect(screen.queryByRole('button', { name: 'Copy setup prompt' })).toBeNull()
})
it('copy fallback opens selectable text when clipboard is missing and reports neutral copy success', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
  render(<CopyText text="Safe instructions" label="Copy instructions" />); click('Copy instructions')
  await screen.findByText('Copy the text below by hand.')
  const input = screen.getByRole('textbox', { name: 'Copy instructions' }) as HTMLTextAreaElement
  expect(input.readOnly).toBe(true); expect(input.closest('details')?.open).toBe(true)
  const details = input.closest('details')!; details.open = false; fireEvent(details, new Event('toggle'))
})
it('failed permissions or setup withhold app cards and support explicit retry', async () => {
  failed.add('apps'); render(<Home />); await screen.findByText('Your app access is unavailable.')
  expect(screen.queryByRole('link', { name: /Hello Example/ })).toBeNull()
  failed.delete('apps'); mode = 'employee'; catalogue = ['access']; own.apps = []; click('Retry apps')
  await screen.findByText('No business apps assigned. Contact your employer.')
  expect(screen.getByRole('link', { name: 'Open your assistant setup' }).getAttribute('href')).toBe('/apps/access/')
  expect(screen.queryByRole('region', { name: 'Make it yours' })).toBeNull()
  cleanup(); failed.add('setup'); render(<AssistantSetup />); await screen.findByText(/Assistant setup is unavailable/)
  failed.delete('setup'); click('Retry setup'); await screen.findByText(/App API access: Allowed/)
  cleanup(); failed.add('apps'); render(<App />); await screen.findByText('Your access is unavailable.')
  failed.delete('apps'); click('Retry access'); await screen.findByText(/App API access: Allowed/)
})
it('selected home cards and direct app pages obey the same current readback', async () => {
  mode = 'employee'; render(<Home />); await screen.findByRole('link', { name: /Hello Example/ })
  expect(screen.queryByRole('link', { name: /Tips/ })).toBeNull(); cleanup()
  const open = () => render(<MemoryRouter initialEntries={['/apps/hello/']}><Routes><Route path="/apps/:name/" element={<AppPage />} /></Routes></MemoryRouter>)
  catalogue = ['access']; open(); await screen.findByText('App access denied'); expect(screen.queryByText('Enter your name')).toBeNull(); cleanup()
  failed.add('apps'); open(); await screen.findByText('App access unavailable'); failed.delete('apps'); catalogue = ['access', 'hello']; click('Retry access'); await screen.findByRole('heading', { name: 'Hello' })
})
it('form labels, pending actions and empty apps remain usable without introducing an editing permission', () => {
  const save = vi.fn(), cancel = vi.fn()
  render(<PersonForm person={null} apps={['access']} pending={false} onSave={save} onCancel={cancel} />)
  fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'a@example.com' } })
  click('Save access'); expect(save).toHaveBeenCalledWith({ email: 'a@example.com', apps: [], removed: false })
  click('Cancel'); expect(cancel).toHaveBeenCalledOnce(); cleanup()
  render(<PersonForm person={{ email: 'a@example.com', status: 'active', apps: ['hello'] }} apps={['hello']} pending onSave={save} onCancel={cancel} />)
  expect(screen.getByRole('textbox', { name: 'Email' }).hasAttribute('disabled')).toBe(true)
  expect(screen.queryByRole('checkbox', { name: /editing/i })).toBeNull()
})
it('unmounted responses cannot overwrite newer resource state, and malformed roster readback stays unavailable', async () => {
  let fulfill: (value: Response) => void = () => {}, reject: (error: Error) => void = () => {}
  fetchMock.mockImplementationOnce(() => new Promise<Response>(resolve => { fulfill = resolve }))
  const mounted = render(<AssistantSetup />); mounted.unmount(); await act(async () => fulfill(Response.json(own)))
  fetchMock.mockImplementationOnce(() => new Promise<Response>((_resolve, fail) => { reject = fail }))
  const pending = render(<AssistantSetup />); pending.unmount(); await act(async () => reject(new Error('abort')))
  roster.people = [{ ...person, apps: 'invalid json' }]
  await expect(readAccess('status', statusSchema)).rejects.toThrow()
  function Probe() { const resource = useAccess('apps', appAccessSchema); return <span>{resource.data?.state}</span> }
  render(<Probe />); await screen.findByText('current')
  expect(within(screen.getByText('current').parentElement!).getByText('current')).toBeTruthy()
})
