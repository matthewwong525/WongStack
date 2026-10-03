import { expect, it } from 'vitest'
import { belongsTo, canApprove, canManage, canReview, displayDate, parseDevice, parseList, parseRequest, parseSession, reference } from './model'
import { device, future, past, request, session } from './fixtures'

it('accepts only sanitized exact projections and bounded unique scopes', () => {
  expect(parseSession(session)).toEqual(session)
  expect(parseDevice(device)).toEqual(device)
  expect(parseRequest(request)).toEqual(request)
  expect(parseList([device], parseDevice)).toEqual([device])
  expect(parseList([], parseDevice)).toEqual([])
  expect(displayDate(future)).toBeTruthy()
  for (const value of [null, [], 'text', {}, { ...request, privateSecret: 'never render this' }, { ...request, id: 'short' }, { ...request, id: null },
    { ...request, label: '' }, { ...request, label: 'x'.repeat(101) }, { ...request, label: 'bad\nlabel' },
    { ...request, label: 'bad\u0085label' }, { ...request, label: 5 }, { ...request, code: 'not a code' }, { ...request, code: 3 },
    { ...request, scopes: [] }, { ...request, scopes: 'team-read' }, { ...request, scopes: ['team-read', 'team-read'] },
    { ...request, scopes: ['unknown'] }, { ...request, scopes: [false] }, { ...request, scopes: Array(5).fill('team-read') },
    { ...request, expiresAt: 'tomorrow' }, { ...request, expiresAt: '2026-99-99T00:00:00Z' }, { ...request, expiresAt: 1 },
    { ...request, status: 'not-real' }, { ...request, status: 1 }, { ...request, status: 'approved' }, { ...request, status: 'claimed' }]) {
    expect(() => parseRequest(value)).toThrow('unavailable')
  }
  expect(parseRequest({ ...request, status: 'approved', principalId: session.principalId }).status).toBe('approved')
  expect(parseRequest({ ...request, status: 'claimed', principalId: session.principalId }).status).toBe('claimed')
  for (const value of [null, {}, Array(101).fill(device)]) expect(() => parseList(value, parseDevice)).toThrow('unavailable')
  for (const value of [{ ...session, email: 1 }, { ...session, email: 'missing' }, { ...session, email: 'x'.repeat(255) },
    { ...session, verifiedHuman: false }, { ...session, protocolVersion: 2 }, { ...session, csrfToken: 5 }, { ...session, csrfToken: 'short' },
    ...['principalId', 'role', 'csrfToken', 'csrfExpiresAt'].map((field) => ({ ...session, [field]: null }))]) expect(() => parseSession(value)).toThrow('unavailable')
  expect(parseSession({ ...session, status: 'pending-owner', principalId: null, role: null, csrfToken: null, csrfExpiresAt: null, ownerCandidate: { code: request.code, expiresAt: future } }).status).toBe('pending-owner')
  expect(() => parseSession({ ...session, ownerCandidate: { code: 'wrong', expiresAt: future } })).toThrow('unavailable')
})

it('limits presentation to this person and installation and current permission ceilings', () => {
  expect(belongsTo(session, request)).toBe(true)
  expect(belongsTo(session, device)).toBe(true)
  for (const item of [{ ...device, installationId: 'other_installation' }, { ...device, repositoryId: 'other_repository' }, { ...device, principalId: 'other_principal__' }]) expect(belongsTo(session, item)).toBe(false)
  expect(canManage(session)).toBe(true)
  for (const value of [{ ...session, status: 'removed' as const }, ...['principalId', 'role', 'csrfToken', 'csrfExpiresAt'].map((field) => ({ ...session, [field]: null })), { ...session, csrfExpiresAt: past }]) expect(canManage(value)).toBe(false)
  expect(canApprove(session, request)).toBe(true)
  expect(canApprove({ ...session, role: 'reader' }, request)).toBe(true)
  expect(canApprove({ ...session, role: 'reader' }, { ...request, scopes: ['team-write'] })).toBe(false)
  expect(canApprove(session, { ...request, status: 'denied' })).toBe(false)
  expect(canApprove(session, { ...request, expiresAt: past })).toBe(false)
  expect(canApprove(session, { ...request, principalId: 'other_principal__' })).toBe(false)
  expect(canApprove({ ...session, status: 'unlinked' }, request)).toBe(false)
  expect(reference(request.id)).toBe(request.id)
  for (const value of [null, 'short', 'https://evil.test/id', '../requests', 'x'.repeat(129)]) expect(reference(value)).toBeNull()
})

it('closes request and CSRF actions exactly at their deadlines', () => {
  const deadline = Date.parse(future)
  expect(canManage(session, deadline - 1)).toBe(true)
  expect(canManage(session, deadline)).toBe(false)
  const longerSession = { ...session, csrfExpiresAt: new Date(deadline + 1000).toISOString() }
  expect(canReview(longerSession, request, deadline - 1)).toBe(true)
  expect(canReview(longerSession, request, deadline)).toBe(false)
  expect(canApprove(longerSession, request, deadline - 1)).toBe(true)
  expect(canApprove(longerSession, request, deadline)).toBe(false)
})
