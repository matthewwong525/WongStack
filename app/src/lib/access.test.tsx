// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { appAccessSchema, statusSchema, useAccess } from './access'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const allowed = { state: 'current', role: 'employee', apps: ['hello'], revision: 1, code: 'off' }
it('reload and target changes immediately hide stale grants while aborted replies cannot restore them', async () => {
  let finishOld: (reply: Response) => void = () => {}
  let finishCurrent: (reply: Response) => void = () => {}
  const transport = vi.fn(async () => Response.json(allowed))
  vi.stubGlobal('fetch', transport)
  const { result, rerender } = renderHook(({ path, schema }) => useAccess(path, schema),
    { initialProps: { path: 'apps', schema: appAccessSchema } })
  await waitFor(() => expect(result.current.data).toEqual(allowed))
  transport.mockImplementationOnce(() => new Promise<Response>(resolve => { finishOld = resolve }))
  act(() => result.current.reload())
  expect(result.current.data).toBeNull()
  expect(result.current.error).toBe(false)
  transport.mockImplementationOnce(() => new Promise<Response>(resolve => { finishCurrent = resolve }))
  rerender({ path: 'other-apps', schema: appAccessSchema })
  expect(result.current.data).toBeNull()
  await act(async () => finishOld(Response.json(allowed)))
  expect(result.current.data).toBeNull()
  const deselected = { ...allowed, apps: [], revision: 2 }
  await act(async () => finishCurrent(Response.json(deselected)))
  expect(result.current.data).toEqual(deselected)
  // The same route with a changed reader is also a new request, never a cache hit.
  transport.mockImplementationOnce(() => new Promise<Response>(resolve => { finishCurrent = resolve }))
  rerender({ path: 'other-apps', schema: appAccessSchema.describe('current permission contract') })
  expect(result.current.data).toBeNull()
  await act(async () => finishCurrent(Response.json(deselected)))
  expect(result.current.data).toEqual(deselected)
})
it('reload hides a previous failure while obtaining new authoritative permission readback', async () => {
  let finish: (reply: Response) => void = () => {}
  const transport = vi.fn(async () => Response.json({}, { status: 403 }))
  vi.stubGlobal('fetch', transport)
  const { result } = renderHook(() => useAccess('apps', appAccessSchema))
  await waitFor(() => expect(result.current.error).toBe(true))
  transport.mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve }))
  act(() => result.current.reload())
  expect(result.current.error).toBe(false)
  expect(result.current.data).toBeNull()
  await act(async () => finish(Response.json({ ...allowed, apps: [] })))
  expect(result.current.error).toBe(false)
  expect(result.current.data?.state).toBe('current')
})
const base = { ownerEmail: 'owner@example.com', viewer: { email: 'owner@example.com', owner: true }, environment: 'live', key: 'ready', started: true, imported: 0,
  keysStarted: true, apps: [], unticked: { people: [], roles: [] }, keys: [], roles: [], people: [], work: [] }
it('reads why the project can not be handed out, and works it out from Project code for a status sent without it', () => {
  const code = (saved: boolean) => ({ id: 'code', title: 'Project code', levels: ['read'], saved, setup: false, alone: true })
  const status = (changes: object) => statusSchema.parse({ ...base, ...changes })
  expect(['ready', 'key', 'setup'].map(project => status({ project, keys: [code(false)] }).project)).toEqual(['ready', 'key', 'setup'])
  // An older app, or a cached page: saved means ready, anything else asks for the key.
  expect([status({ keys: [code(true)] }).project, status({ keys: [code(false)] }).project, status({}).project]).toEqual(['ready', 'key', 'key'])
  expect(statusSchema.safeParse({ ...status({}), project: 'soon' }).success).toBe(false)
})

it("reads whether a key is set up to be used directly as a yes or no, and a status sent without it", () => {
  const key = (direct?: unknown) => ({ id: 'notion', title: 'Notion', levels: ['read', 'write'], saved: true, setup: false, alone: false, ...(direct !== undefined && { direct }) })
  const status = (changes: object) => statusSchema.safeParse({ ...base, ...changes })
  const read = status({ keys: [key(true), key(false), key()] })
  expect(read.data?.keys.map(item => item.direct)).toEqual([true, false, undefined])
  // The choice a key once carried is no yes or no.
  for (const wrong of [{ keys: [key({ offered: ['read'], mode: 'read' })] }, { keys: [key('read')] }, { keys: [key(null)] }]) expect(status(wrong).success).toBe(false)
})

it('reads apps as ticks: a list of apps per person and role, who an update unticked, and what a person holds themselves', () => {
  const person = (apps: unknown) => ({ email: 'kim@example.com', status: 'active', settled: true, role: null, manager: false, apps, keys: { stripe: 'read' } })
  const status = (changes: object) => statusSchema.safeParse({ ...base, ...changes })
  const read = status({ apps: [{ id: 'orders', title: 'Orders', description: 'Every order' }], roles: [{ id: 'sales', name: 'Sales', apps: ['orders'], keys: {} }], people: [person(['orders'])],
    unticked: { people: [{ email: 'kim@example.com', apps: ['Orders'] }], roles: [{ name: 'Sales', apps: ['Payroll'] }] } })
  expect([read.data?.apps, read.data?.roles[0].apps, read.data?.people[0].apps]).toEqual([[{ id: 'orders', title: 'Orders', description: 'Every order' }], ['orders'], ['orders']])
  expect(read.data?.unticked).toEqual({ people: [{ email: 'kim@example.com', apps: ['Orders'] }], roles: [{ name: 'Sales', apps: ['Payroll'] }] })
  // A status from before apps were ticks is refused: an app with a level, or no word on who was unticked.
  for (const old of [{ people: [person({ orders: 'write' })] }, { roles: [{ id: 'sales', name: 'Sales', apps: { orders: 'read' }, keys: {} }] }, { unticked: undefined }, { apps: undefined }]) expect(status(old).success).toBe(false)
  // What a person holds themselves: the screens they can open, and a level per key.
  const own = appAccessSchema.parse({ state: 'current', role: 'employee', apps: ['orders'], revision: 1, keys: [{ id: 'stripe', title: 'Stripe', level: 'read' }] })
  expect(own).toEqual({ state: 'current', role: 'employee', apps: ['orders'], revision: 1, code: 'off', keys: [{ id: 'stripe', title: 'Stripe', level: 'read' }] })
})
