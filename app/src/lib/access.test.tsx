// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { appAccessSchema, useAccess } from './access'

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
