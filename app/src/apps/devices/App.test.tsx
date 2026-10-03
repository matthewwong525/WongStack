// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { routes } from '../../router'
import { device, future, json, past, request, session } from './fixtures'
// Warm the lazy route module before any test freezes the clock.
import './App'

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); Reflect.deleteProperty(navigator, 'clipboard') })
const root = '/api/memory-auth/'
const requestPage = `/apps/devices/?request=${request.id}`
type Handler = (url: string, init?: RequestInit) => Promise<Response>
const realSetTimeout = globalThis.setTimeout
async function open(handler?: Handler, url = '/apps/devices/', loading = false) {
  const fetchMock = vi.fn(async (path: string, init?: RequestInit) => {
    if (handler) return handler(path, init)
    if (path === root + 'session') return json(session)
    if (path === root + 'requests' || path === root + 'devices') return json([])
    return json(request)
  })
  vi.stubGlobal('fetch', fetchMock)
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  await act(async () => { render(<RouterProvider router={router} />) })
  // Let imports, response parsing and React updates settle without advancing
  // the fake deadline clock. A deferred test explicitly opts into loading.
  do {
    await act(async () => { await new Promise<void>((resolve) => realSetTimeout(resolve, 0)) })
  } while (!screen.queryByRole('heading', { name: 'Devices', level: 1 }) ||
    (!loading && screen.queryByText('Checking devices…')))
  return { fetchMock, router }
}
function answers(values: { session?: unknown; request?: unknown; requests?: unknown; devices?: unknown }, mutation?: Handler): Handler {
  return async (url, init) => {
    if (init?.method === 'POST' && mutation) return mutation(url, init)
    if (url === root + 'session') return json(values.session ?? session)
    if (url === root + 'requests') return json(values.requests ?? [])
    if (url === root + 'devices') return json(values.devices ?? [])
    return json(values.request ?? request)
  }
}
function clipboard(writeText = vi.fn(async (_text: string) => {})) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  return writeText
}
function pending<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const click = async (name: string) => { await act(async () => { fireEvent.click(screen.getByRole('button', { name })) }) }
const match = () => fireEvent.click(screen.getByRole('checkbox', { name: 'My request; code matches' }))

it('uses the main frame and appears in the home list without an extra login or People controls', async () => {
  const { router } = await open()
  expect(screen.getByRole('heading', { level: 1 }).closest('main')).not.toBeNull()
  expect(screen.getByRole('link', { name: 'WongStack' }).getAttribute('href')).toBe('/')
  expect(screen.getByText('As ana@example.com')).toBeTruthy()
  expect(screen.queryByRole('textbox')).toBeNull()
  expect(screen.queryByText('People')).toBeNull()
  expect(screen.queryByText(session.csrfToken!)).toBeNull()
  await act(async () => { await router.navigate('/') })
  expect(await screen.findByRole('link', { name: /Devices/ })).toBeTruthy()
})

it('copies a plain connection request without starting enrollment and handles copy failure', async () => {
  const writeText = clipboard()
  const { fetchMock } = await open()
  expect(screen.getByText('No computers connected.')).toBeTruthy()
  await click('Copy connection request')
  expect(writeText).toHaveBeenCalledWith(`Connect this computer to memory at ${window.location.origin}. Show me the Devices link and matching code.`)
  expect(screen.getByText('Copied. Paste in chat.')).toBeTruthy()
  expect(fetchMock.mock.calls.every(([, init]) => init?.method === 'GET')).toBe(true)
  writeText.mockRejectedValueOnce(new Error('private clipboard error'))
  await click('Copy connection request')
  expect(screen.getByText('Could not copy. Ask in chat to connect this computer.')).toBeTruthy()
  expect(screen.queryByText('private clipboard error')).toBeNull()
  Reflect.deleteProperty(navigator, 'clipboard')
  await click('Copy connection request')
  expect(screen.getByText('Could not copy. Ask in chat to connect this computer.')).toBeTruthy()
})

it('shows loading, unavailable and retry without pretending a preview has memory', async () => {
  const wait = pending<Response>()
  const { fetchMock } = await open(async () => wait.promise, '/apps/devices/', true)
  expect(screen.getByText('Checking devices…')).toBeTruthy()
  expect(screen.queryByRole('button')).toBeNull()
  await act(async () => { wait.resolve(json({ error: 'missing handlers' }, 404)) })
  expect(screen.getByText('Devices unavailable here.')).toBeTruthy()
  expect(screen.getByText('Check your app address and sign-in.')).toBeTruthy()
  fetchMock.mockImplementation(answers({}))
  await click('Try again')
  expect(screen.getByText('No computers connected.')).toBeTruthy()
})

it('handles network failures and non-Error failures safely', async () => {
  for (const failure of [new Error('token secret'), 'private failure']) {
    const { fetchMock } = await open(async () => { throw failure })
    expect(screen.getByText('Could not load devices.')).toBeTruthy()
    expect(screen.queryByText(String(failure))).toBeNull()
    fetchMock.mockImplementation(answers({}))
    await click('Try again')
    expect(screen.getByText('No computers connected.')).toBeTruthy()
    cleanup()
  }
})

it('rejects malformed navigation before fetching and never follows an external request address', async () => {
  for (const url of ['/apps/devices/?request=https://evil.test', '/apps/devices/?request=short', '/apps/devices/?secret=bad',
    `${requestPage}&request=${request.id}`, '/apps/devices/extra', '/apps/devices/#secret']) {
    const { fetchMock } = await open(undefined, url)
    expect(screen.getByText('Devices unavailable here.')).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
    cleanup()
  }
  await open(undefined, '/apps/devices')
  expect(screen.getByText('No computers connected.')).toBeTruthy()
})

it('keeps setup, unlinked and removed logins passive and never creates an owner candidate on GET', async () => {
  for (const status of ['pending-owner', 'unlinked', 'removed'] as const) {
    const { fetchMock } = await open(answers({ session: { ...session, status, principalId: null, role: null, csrfToken: null, csrfExpiresAt: null } }), requestPage)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe({ 'pending-owner': 'Owner setup pending', unlinked: 'Login needs review', removed: 'Memory access removed' }[status])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button')).toBeNull()
    cleanup()
  }
  await open(answers({ session: { ...session, status: 'pending-owner', ownerCandidate: { code: request.code, expiresAt: future } } }))
  expect(screen.getByText(request.code)).toBeTruthy()
  expect(screen.getByText('Confirm this code with your installation operator.')).toBeTruthy()
  expect(screen.queryByRole('button')).toBeNull()
  cleanup()
  await open(answers({ session: { ...session, status: 'pending-owner', ownerCandidate: { code: request.code, expiresAt: past } } }))
  expect(screen.queryByText(request.code)).toBeNull()
  expect(screen.getByText('Ask your installation operator to finish setup.')).toBeTruthy()
})

it('keeps critical approval data visible, requires code acknowledgement and waits for actual machine claim', async () => {
  const wait = pending<Response>()
  const { fetchMock } = await open(answers({}, async () => wait.promise), requestPage)
  expect(screen.getByRole('heading', { name: 'Connect Laptop?' })).toBeTruthy()
  expect(screen.getByText(request.code)).toBeTruthy()
  expect(screen.getByText('Match this code in chat.')).toBeTruthy()
  expect(screen.getByText(/Read your notes · Save your notes · Read team notes/)).toBeTruthy()
  expect(screen.getByText(/Name supplied by requester/)).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Approve' }) as HTMLButtonElement).disabled).toBe(true)
  await click('Approve')
  expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0)
  match()
  await click('Approve')
  expect(screen.getByRole('button', { name: 'Confirming…' })).toBeTruthy()
  expect(screen.queryByText('Connected')).toBeNull()
  expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true)
  await act(async () => { wait.resolve(json({ ...request, principalId: session.principalId, status: 'approved' })) })
  expect(screen.getByText('Waiting for computer')).toBeTruthy()
  expect(screen.queryByText('Connected')).toBeNull()
  fetchMock.mockImplementation(answers({ request: { ...request, principalId: session.principalId, status: 'claimed' } }))
  await click('Check connection')
  expect(screen.getByText('Connected')).toBeTruthy()
  await click('← All devices')
  expect(screen.getByRole('heading', { name: 'Your computers' })).toBeTruthy()
})

it('denies without acknowledgement and never reports successful approval from a failed response', async () => {
  const mutation = vi.fn(async () => json({ error: 'server private text' }, 500))
  await open(answers({}, mutation), requestPage)
  match()
  await click('Approve')
  expect(screen.getByText('Could not confirm the change. Try again.')).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Connect Laptop?' })).toBeTruthy()
  expect(screen.queryByText('server private text')).toBeNull()
  match()
  mutation.mockResolvedValueOnce(json({ ...request, status: 'denied' }))
  await click('Deny')
  expect(screen.getByText('Denied')).toBeTruthy()
  expect(screen.getByText('Start a new request in chat.')).toBeTruthy()
})

it('keeps the full maximum-length requester name alongside the code and actions', async () => {
  const longRequest = { ...request, label: 'W'.repeat(100) }
  await open(answers({ request: longRequest }, async () => json({ ...longRequest, status: 'denied' })), requestPage)
  expect(screen.getByRole('heading', { name: `Connect ${longRequest.label}?` })).toBeTruthy()
  expect(screen.getByText(request.code)).toBeTruthy()
  expect(screen.getByRole('checkbox', { name: 'My request; code matches' })).toBeTruthy()
  await click('Deny')
  expect(screen.getByText('Denied')).toBeTruthy()
  expect(screen.getByRole('heading', { name: longRequest.label })).toBeTruthy()
})

it('exposes truthful terminal states, expiry and ineligible approval without action', async () => {
  for (const status of ['expired', 'denied', 'revoked'] as const) {
    await open(answers({ request: { ...request, status } }), requestPage)
    expect(screen.getByText({ expired: 'Request expired', denied: 'Denied', revoked: 'Revoked' }[status])).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
    cleanup()
  }
  await open(answers({ request: { ...request, expiresAt: past } }), requestPage)
  expect(screen.getByText('Request expired')).toBeTruthy()
  expect(screen.queryByRole('checkbox')).toBeNull()
  cleanup()
  await open(answers({ session: { ...session, csrfExpiresAt: past } }), requestPage)
  expect(screen.getByText('Approval unavailable. Check your access or refresh.')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Deny' })).toBeNull()
  cleanup()
  await open(answers({ session: { ...session, role: 'reader' }, request: { ...request, scopes: ['team-write'] } }, async () => json({ ...request, scopes: ['team-write'], status: 'denied' })), requestPage)
  expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
  await click('Deny')
  expect(screen.getByText('Denied')).toBeTruthy()
})

it('updates an open approval page when the request or CSRF proof expires without fetching', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(Date.parse(future) - 86_400_000))
  for (const expired of ['request', 'csrf'] as const) {
    const deadline = new Date(Date.now() + 1000).toISOString()
    const { fetchMock } = await open(answers(expired === 'request' ? { request: { ...request, expiresAt: deadline } } : { session: { ...session, csrfExpiresAt: deadline } }), requestPage)
    match()
    expect((screen.getByRole('button', { name: 'Approve' }) as HTMLButtonElement).disabled).toBe(false)
    const fetchCount = fetchMock.mock.calls.length
    await act(async () => { vi.advanceTimersByTime(1000) })
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Deny' })).toBeNull()
    expect(screen.getByText(expired === 'request' ? 'Request expired' : 'Approval unavailable. Check your access or refresh.')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(fetchCount)
    cleanup()
  }
})

it('hides an expired owner comparison code while the page stays open', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(Date.parse(future) - 86_400_000))
  const { fetchMock } = await open(answers({ session: { ...session, status: 'pending-owner', csrfExpiresAt: null,
    ownerCandidate: { code: request.code, expiresAt: new Date(Date.now() + 1000).toISOString() } } }))
  expect(screen.getByText(request.code)).toBeTruthy()
  await act(async () => { vi.advanceTimersByTime(1000) })
  expect(screen.queryByText(request.code)).toBeNull()
  expect(screen.getByText('Ask your installation operator to finish setup.')).toBeTruthy()
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

it('hides other-person/install objects and rejects fake human or HTML responses', async () => {
  for (const values of [{ request: { ...request, principalId: 'other_principal_123456' } }, { devices: [{ ...device, repositoryId: 'another_repository' }] },
    { session: { ...session, verifiedHuman: false } }, { requests: [request] }, { session: { ...session, email: 'not verified', csrfToken: 'secret' } }]) {
    await open(answers(values), requestPage)
    expect(screen.getByText('Devices unavailable here.')).toBeTruthy()
    expect(screen.queryByText(request.code)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
    cleanup()
  }
  await open(async () => new Response('<html>logged out</html>'))
  expect(screen.getByText('Devices unavailable here.')).toBeTruthy()
})

it('lists personal pending requests and follows a new link in the same tab with the new code', async () => {
  const other = { ...request, id: 'request_another_1234567890123456789', label: 'Desktop', code: 'ABCD-2345' }
  const handler = answers({ requests: [{ ...request, principalId: session.principalId }] })
  const { fetchMock, router } = await open(handler)
  expect(screen.getByRole('heading', { name: 'Requests' })).toBeTruthy()
  await click('Laptop · Review')
  expect(screen.getByText(request.code)).toBeTruthy()
  match()
  fetchMock.mockImplementation(answers({ request: other }))
  await act(async () => { await router.navigate(`/apps/devices/?request=${other.id}`) })
  expect(screen.getByText(other.code)).toBeTruthy()
  expect(screen.queryByText(request.code)).toBeNull()
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
})

it('starts refresh in loading and clears acknowledgement when the same request returns', async () => {
  const { fetchMock } = await open(undefined, requestPage)
  match()
  const wait = pending<Response>()
  fetchMock.mockImplementation(async (url) => url === root + 'session' ? wait.promise : json(url === root + `requests/${request.id}` ? request : []))
  await click('Refresh')
  expect(screen.getByText('Checking devices…')).toBeTruthy()
  expect(screen.queryByText(request.code)).toBeNull()
  await act(async () => { wait.resolve(json(session)) })
  expect(screen.getByText(request.code)).toBeTruthy()
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
})

it('clears an open request on invalid same-tab navigation without another fetch', async () => {
  const { fetchMock, router } = await open(undefined, requestPage)
  match()
  const fetchCount = fetchMock.mock.calls.length
  await act(async () => { await router.navigate(`${requestPage}&secret=bad`) })
  expect(screen.getByText('Devices unavailable here.')).toBeTruthy()
  expect(screen.queryByText(request.code)).toBeNull()
  expect(fetchMock).toHaveBeenCalledTimes(fetchCount)
  await act(async () => { await router.navigate(requestPage) })
  expect(screen.getByText(request.code)).toBeTruthy()
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
})

it('closes revoke confirmation when its session proof expires', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(Date.parse(future) - 86_400_000))
  const { fetchMock } = await open(answers({ devices: [device], session: { ...session, csrfExpiresAt: new Date(Date.now() + 1000).toISOString() } }))
  await click('Revoke Laptop')
  expect(screen.getByRole('heading', { name: 'Revoke Laptop?' })).toBeTruthy()
  const fetchCount = fetchMock.mock.calls.length
  await act(async () => { vi.advanceTimersByTime(1000) })
  expect(screen.queryByRole('button', { name: 'Revoke' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Revoke Laptop' })).toBeNull()
  expect(fetchMock).toHaveBeenCalledTimes(fetchCount)
})

it('confirms revocation inline, preserves connected state on failure, and only adopts a server tombstone', async () => {
  const wait = pending<Response>()
  const mutation = vi.fn(async () => json({}, 500))
  await open(answers({ devices: [{ ...device, lastUsedAt: future }] }, mutation))
  expect(screen.getByText('Connected')).toBeTruthy()
  expect(screen.getByText(/Used /)).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Copy connection request' })).toBeTruthy()
  await click('Revoke Laptop')
  expect(screen.getByRole('heading', { name: 'Revoke Laptop?' })).toBeTruthy()
  expect(screen.getByText('Memory access will stop.')).toBeTruthy()
  await click('Cancel')
  expect(screen.queryByRole('heading', { name: 'Revoke Laptop?' })).toBeNull()
  await click('Revoke Laptop')
  await click('Revoke')
  expect(screen.getByText('Could not confirm the change. Try again.')).toBeTruthy()
  expect(screen.getByText('Connected')).toBeTruthy()
  mutation.mockImplementation(async () => wait.promise)
  await click('Revoke')
  expect(screen.getByRole('button', { name: 'Revoking…' })).toBeTruthy()
  expect(screen.getByText('Connected')).toBeTruthy()
  await act(async () => { wait.resolve(json({ ...device, status: 'revoked' })) })
  expect(screen.getByText('Revoked')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Revoke Laptop' })).toBeNull()
})

it('confirms one computer at a time and leaves other computers connected after revocation', async () => {
  const desktop = { ...device, id: 'device_desktop_1234567890123456789', label: 'Desktop' }
  await open(answers({ devices: [device, desktop] }, async () => json({ ...desktop, status: 'revoked' })))
  await click('Revoke Laptop')
  await click('Revoke Desktop')
  expect(screen.queryByRole('heading', { name: 'Revoke Laptop?' })).toBeNull()
  expect(screen.getByRole('heading', { name: 'Revoke Desktop?' })).toBeTruthy()
  await click('Revoke')
  expect(within(screen.getByText('Laptop').closest('li')!).getByText('Connected')).toBeTruthy()
  expect(within(screen.getByText('Desktop').closest('li')!).getByText('Revoked')).toBeTruthy()
})

it('shows dates, renewal/reapproval and ten-device guidance; removed authority has no revoke control', async () => {
  await open(answers({ devices: [device, { ...device, id: 'device_expired_123456789012345678', label: 'Desktop', status: 'expired' },
    { ...device, id: 'device_reapprove_12345678901234567', label: 'Phone', status: 'reauthorize' }, { ...device, id: 'device_revoked_123456789012345678', label: 'Old', status: 'revoked' }] }))
  expect(screen.getAllByText('Not used yet')).toHaveLength(4)
  expect(screen.getByText('Expired')).toBeTruthy()
  expect(screen.getByText('Approval needed')).toBeTruthy()
  expect(screen.getByText('Revoked')).toBeTruthy()
  expect(screen.getAllByText('Start a new request in chat.')).toHaveLength(3)
  const row = screen.getByText('Laptop').closest('li')!
  fireEvent.click(within(row).getByText('Access details'))
  expect(within(row).getByText(/Credential expires/)).toBeTruthy()
  expect(within(row).getByText(/Approve again by/)).toBeTruthy()
  expect(within(row).getByText(/Read your notes/)).toBeTruthy()
  fireEvent.click(screen.getAllByText('Access details').at(-1)!)
  expect(screen.getByText('Signing out leaves approved computers connected.')).toBeTruthy()
  cleanup()
  await open(answers({ devices: Array.from({ length: 10 }, (_, index) => ({ ...device, id: `device_${index}_12345678901234567890`, label: `Computer ${index}` })), session: { ...session, csrfExpiresAt: past } }))
  expect(screen.getByText('Ten computers connected. Revoke one before adding another.')).toBeTruthy()
  expect(screen.queryByRole('button', { name: /Revoke/ })).toBeNull()
})

it('aborts loading and mutations on unmount and ignores late successful and failed clipboard work', async () => {
  const listWait = pending<Response>()
  await open(async (url) => url === root + 'devices' ? listWait.promise : json(url === root + 'session' ? session : []), '/apps/devices/', true)
  cleanup()
  await act(async () => { listWait.resolve(json([])) })
  for (const fail of [false, true]) {
    const wait = pending<Response>()
    const { fetchMock } = await open(async () => wait.promise, '/apps/devices/', true)
    const signal = fetchMock.mock.calls[0][1]!.signal!
    cleanup()
    expect(signal.aborted).toBe(true)
    await act(async () => { if (fail) wait.reject(new Error('late')); else wait.resolve(json(session)) })

    const mutationWait = pending<Response>()
    await open(answers({}, async () => mutationWait.promise), requestPage)
    match()
    await click('Approve')
    cleanup()
    await act(async () => { if (fail) mutationWait.reject(new Error('late')); else mutationWait.resolve(json({ ...request, principalId: session.principalId, status: 'approved' })) })

    const copyWait = pending<void>()
    clipboard(vi.fn(async () => copyWait.promise))
    await open()
    await click('Copy connection request')
    cleanup()
    await act(async () => { if (fail) copyWait.reject(new Error('late')); else copyWait.resolve() })
  }
})
