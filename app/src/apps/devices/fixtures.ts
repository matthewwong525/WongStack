import type { Device, RequestDetail, Session } from './model'

// Synthetic test projections only; never imported by the app.
export const future = new Date(Date.now() + 86400000).toISOString()
export const past = '2020-01-01T00:00:00.000Z'
export const session: Session = {
  protocolVersion: 1, installationId: 'installation_12345678', repositoryId: 'repository_12345678',
  installationName: 'Our workspace', verifiedHuman: true, email: 'ana@example.com',
  principalId: 'principal_12345678', role: 'member', status: 'active',
  csrfToken: 'csrf_12345678901234567890123456789012', csrfExpiresAt: future, ownerCandidate: null,
}
export const request: RequestDetail = {
  id: 'request_12345678901234567890123456', installationId: session.installationId, repositoryId: session.repositoryId,
  principalId: null, label: 'Laptop', code: 'H7KM-42PT', scopes: ['personal-read', 'personal-write', 'team-read'], expiresAt: future, status: 'pending',
}
export const device: Device = {
  id: 'device_123456789012345678901234567', installationId: session.installationId, repositoryId: session.repositoryId,
  principalId: session.principalId!, label: 'Laptop', scopes: request.scopes, status: 'connected',
  lastUsedAt: null, expiresAt: future, reauthorizeAt: future,
}
export function json(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } })
}
