import { afterEach, expect, it, vi } from 'vitest'
import { decide, failureStatus, loadDevices, loadRequest, loadRequests, loadSession, revoke } from './api'
import type { Device, RequestDetail, Session } from './model'
import { device, future, json, past, request, session } from './fixtures'

afterEach(() => vi.unstubAllGlobals())
it('classifies failures without exposing server or thrown text', () => {
  expect(failureStatus(new Error('unavailable'))).toBe('unavailable')
  expect(failureStatus(new Error('secret'))).toBe('failed')
  expect(failureStatus('secret')).toBe('failed')
})
const signal = new AbortController().signal
function answer(value: unknown) { const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => json(value)); vi.stubGlobal('fetch', fetchMock); return fetchMock }

it('only calls same-origin protected core with no store, redirects or referrer', async () => {
  const fetchMock = answer(session)
  expect(await loadSession(signal)).toEqual(session)
  expect(fetchMock).toHaveBeenCalledWith('/api/memory-auth/session', {
    method: 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer', signal, headers: { Accept: 'application/json' },
  })
  answer([{ ...request, principalId: session.principalId }]); expect(await loadRequests(session, signal)).toHaveLength(1)
  answer([device]); expect(await loadDevices(session, signal)).toEqual([device])
  answer(request); expect(await loadRequest(session, request.id, signal)).toEqual(request)
})

it('submits the actual displayed code and scope with session CSRF; never issues a browser credential', async () => {
  const approved = { ...request, principalId: session.principalId, status: 'approved' }
  let fetchMock = answer(approved)
  expect((await decide(session, request, 'approve', signal)).status).toBe('approved')
  expect(fetchMock).toHaveBeenCalledWith(`/api/memory-auth/requests/${request.id}/approve`, {
    method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer', signal,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-Token': session.csrfToken }, body: JSON.stringify({ code: request.code, scopes: request.scopes }),
  })
  answer({ ...approved, status: 'claimed' }); expect((await decide(session, request, 'approve', signal)).status).toBe('claimed')
  fetchMock = answer({ ...request, status: 'denied' }); expect((await decide(session, request, 'deny', signal)).status).toBe('denied')
  expect(fetchMock.mock.calls[0][0]).toBe(`/api/memory-auth/requests/${request.id}/deny`)
  answer({ ...request, scopes: ['team-write'], status: 'denied' }); expect((await decide({ ...session, role: 'reader' }, { ...request, scopes: ['team-write'] }, 'deny', signal)).status).toBe('denied')
  fetchMock = answer({ ...device, status: 'revoked' }); expect((await revoke(session, device, signal)).status).toBe('revoked')
  expect(fetchMock).toHaveBeenCalledWith(`/api/memory-auth/devices/${device.id}/revoke`, expect.objectContaining({ body: '{}', method: 'POST' }))
})

it('refuses missing, cached, redirected, non-JSON or malformed responses without reflecting their content', async () => {
  for (const response of [
    ...[401, 403, 404, 405, 410, 503].map((status) => json({ secret: 'never show' }, status)),
    new Response('<html>sign in</html>', { headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/html' } }),
    new Response('{}', { headers: { 'Cache-Control': 'no-store' } }),
    new Response(null, { headers: { 'Cache-Control': 'no-store' } }),
    Response.json(session), json(session), new Response('broken', { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }),
    new Response('{}', { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=60' } }),
  ]) {
    if (response.headers.get('Content-Type') === 'application/json' && response.headers.get('Cache-Control') === 'no-store' && response.status === 200) Object.defineProperty(response, 'redirected', { value: true })
    vi.stubGlobal('fetch', vi.fn(async () => response))
    await expect(loadSession(signal)).rejects.toThrow('unavailable')
  }
  vi.stubGlobal('fetch', vi.fn(async () => json({}, 500))); await expect(loadSession(signal)).rejects.toThrow('failed')
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{', { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }))); await expect(loadSession(signal)).rejects.toThrow('unavailable')
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('secret from network') })); await expect(loadSession(signal)).rejects.toThrow('failed')
})

it('does not fetch or mutate inaccessible, stale or invalid objects', async () => {
  let fetchMock = answer(request)
  await expect(loadRequest(session, 'https://evil.test', signal)).rejects.toThrow('unavailable'); expect(fetchMock).not.toHaveBeenCalled()
  for (const item of [{ ...request, principalId: 'someone_else_123456' }, { ...request, installationId: 'wrong_installation' }, { ...request, repositoryId: 'wrong_repository__' }, { ...request, id: 'different_request_1234567890123456' }]) {
    answer(item); await expect(loadRequest(session, request.id, signal)).rejects.toThrow('unavailable')
  }
  answer([request]); await expect(loadRequests(session, signal)).rejects.toThrow('unavailable')
  answer([{ ...request, principalId: session.principalId, installationId: 'wrong_installation' }]); await expect(loadRequests(session, signal)).rejects.toThrow('unavailable')
  answer([{ ...device, principalId: 'someone_else_123456' }]); await expect(loadDevices(session, signal)).rejects.toThrow('unavailable')
  fetchMock = answer(request)
  const decisionCases: [Session, RequestDetail][] = [[{ ...session, csrfExpiresAt: past }, request], [session, { ...request, expiresAt: past }], [{ ...session, role: 'reader' }, { ...request, scopes: ['team-write'] }]]
  for (const [current, item] of decisionCases) await expect(decide(current, item, 'approve', signal)).rejects.toThrow('unavailable')
  await expect(decide({ ...session, csrfExpiresAt: past }, request, 'deny', signal)).rejects.toThrow('unavailable')
  const revokeCases: [Session, Device][] = [[{ ...session, csrfExpiresAt: past }, device], [session, { ...device, principalId: 'someone_else_123456' }], [session, { ...device, status: 'revoked' }]]
  for (const [current, item] of revokeCases) await expect(revoke(current, item, signal)).rejects.toThrow('unavailable')
  expect(fetchMock).not.toHaveBeenCalled()
})

it('requires exact confirmed result IDs and transitions, even on a success envelope', async () => {
  for (const value of [{ ...request, principalId: session.principalId, status: 'approved', id: 'different_request_1234567890123456' }, request, { ...request, status: 'denied' }]) {
    answer(value); await expect(decide(session, request, 'approve', signal)).rejects.toThrow('unavailable')
  }
  answer({ ...request, principalId: session.principalId, status: 'approved' }); await expect(decide(session, request, 'deny', signal)).rejects.toThrow('unavailable')
  for (const value of [device, { ...device, id: 'different_device_12345678901234567', status: 'revoked' }, { ...device, status: 'revoked', privateSecret: 'never render' }]) {
    answer(value); await expect(revoke(session, device, signal)).rejects.toThrow('unavailable')
  }
  answer({ ...session, csrfExpiresAt: future, verifiedHuman: false }); await expect(loadSession(signal)).rejects.toThrow('unavailable')
})

it('confirms the displayed code and exact scope set before adopting mutation results', async () => {
  for (const decision of ['approve', 'deny'] as const) {
    const confirmed = { ...request, principalId: session.principalId, status: decision === 'approve' ? 'approved' : 'denied' }
    for (const change of [{ code: 'ABCD-2345' }, { scopes: ['personal-read', 'personal-write', 'team-write'] }, { scopes: ['personal-read'] }]) {
      answer({ ...confirmed, ...change })
      await expect(decide(session, request, decision, signal)).rejects.toThrow('unavailable')
    }
    answer({ ...confirmed, scopes: [...request.scopes].reverse() })
    expect((await decide(session, request, decision, signal)).status).toBe(confirmed.status)
  }
  for (const scopes of [['personal-read', 'personal-write', 'team-write'], ['personal-read']]) {
    answer({ ...device, status: 'revoked', scopes })
    await expect(revoke(session, device, signal)).rejects.toThrow('unavailable')
  }
  answer({ ...device, status: 'revoked', scopes: [...device.scopes].reverse() })
  expect((await revoke(session, device, signal)).status).toBe('revoked')
})
