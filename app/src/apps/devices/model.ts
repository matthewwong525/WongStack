// Frontend contract for the protected core /api/memory-auth/ handlers.
// These projections contain no machine credentials, request secrets or JWTs.
// Core must verify the current human, object ownership, revisions, Origin and
// session-bound CSRF on every operation. Browser checks are only presentation.
type Role = 'owner' | 'admin' | 'member' | 'reader'
type Scope = 'personal-read' | 'personal-write' | 'team-read' | 'team-write'
export type Session = {
  protocolVersion: 1
  installationId: string
  repositoryId: string
  installationName: string
  verifiedHuman: true
  email: string
  principalId: string | null
  role: Role | null
  status: 'active' | 'pending-owner' | 'unlinked' | 'removed'
  csrfToken: string | null
  csrfExpiresAt: string | null
  ownerCandidate: { code: string; expiresAt: string } | null
}
export type RequestDetail = {
  id: string
  installationId: string
  repositoryId: string
  principalId: string | null
  label: string
  code: string
  scopes: Scope[]
  expiresAt: string
  status: 'pending' | 'approved' | 'claimed' | 'denied' | 'expired' | 'revoked'
}
export type Device = {
  id: string
  installationId: string
  repositoryId: string
  principalId: string
  label: string
  scopes: Scope[]
  status: 'connected' | 'expired' | 'revoked' | 'reauthorize'
  lastUsedAt: string | null
  expiresAt: string
  reauthorizeAt: string
}

type RecordValue = Record<string, unknown>
type Rule = (value: unknown) => boolean
const record = (value: unknown): value is RecordValue => typeof value === 'object' && value !== null && !Array.isArray(value)
const shape = (value: unknown, rules: Record<string, Rule>): value is RecordValue =>
  record(value) && Object.keys(value).length === Object.keys(rules).length && Object.entries(rules).every(([key, rule]) => rule(value[key]))
const text: Rule = (value) => typeof value === 'string' && value.length > 0 && value.length <= 100 && !/\p{Cc}/u.test(value)
const id: Rule = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(value)
const nullable = (rule: Rule): Rule => (value) => value === null || rule(value)
const oneOf = (values: readonly string[]): Rule => (value) => typeof value === 'string' && values.includes(value)
const date: Rule = (value) => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value))
const code: Rule = (value) => typeof value === 'string' && /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/.test(value)
const roles = ['owner', 'admin', 'member', 'reader'] as const
const scopes: readonly Scope[] = ['personal-read', 'personal-write', 'team-read', 'team-write']
const scopeList: Rule = (value) => Array.isArray(value) && value.length > 0 && value.length <= scopes.length && new Set(value).size === value.length && value.every(oneOf(scopes))
const email: Rule = (value) => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
const candidate: Rule = (value) => shape(value, { code, expiresAt: date })

function checked<T>(value: unknown, rules: Record<string, Rule>): T {
  if (!shape(value, rules)) throw new Error('unavailable')
  return value as T
}

export function parseSession(value: unknown): Session {
  const session = checked<Session>(value, {
    protocolVersion: (item) => item === 1, installationId: id, repositoryId: id,
    installationName: text, verifiedHuman: (item) => item === true, email,
    principalId: nullable(id), role: nullable(oneOf(roles)),
    status: oneOf(['active', 'pending-owner', 'unlinked', 'removed']),
    csrfToken: nullable((item) => typeof item === 'string' && /^[A-Za-z0-9_-]{32,256}$/.test(item)),
    csrfExpiresAt: nullable(date), ownerCandidate: nullable(candidate),
  })
  if (session.status === 'active' && (!session.principalId || !session.role || !session.csrfToken || !session.csrfExpiresAt)) throw new Error('unavailable')
  return session
}

const objectRules = { id, installationId: id, repositoryId: id, label: text, scopes: scopeList, expiresAt: date }
export function parseRequest(value: unknown): RequestDetail {
  const request = checked<RequestDetail>(value, {
    ...objectRules, principalId: nullable(id), code,
    status: oneOf(['pending', 'approved', 'claimed', 'denied', 'expired', 'revoked']),
  })
  if ((request.status === 'approved' || request.status === 'claimed') && request.principalId === null) throw new Error('unavailable')
  return request
}
export function parseDevice(value: unknown): Device {
  return checked<Device>(value, {
    ...objectRules, principalId: id, status: oneOf(['connected', 'expired', 'revoked', 'reauthorize']),
    lastUsedAt: nullable(date), reauthorizeAt: date,
  })
}
export function parseList<T>(value: unknown, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length > 100) throw new Error('unavailable')
  return value.map(parse)
}
export function reference(value: string | null): string | null {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{22,128}$/.test(value) ? value : null
}
export function belongsTo(session: Session, item: RequestDetail | Device): boolean {
  return session.installationId === item.installationId && session.repositoryId === item.repositoryId &&
    (item.principalId === null || item.principalId === session.principalId)
}
export function canManage(session: Session, now = Date.now()): boolean {
  return session.status === 'active' && session.principalId !== null && session.role !== null &&
    session.csrfToken !== null && session.csrfExpiresAt !== null && Date.parse(session.csrfExpiresAt) > now
}
export function canReview(session: Session, request: RequestDetail, now = Date.now()): boolean {
  return canManage(session, now) && belongsTo(session, request) && request.status === 'pending' &&
    Date.parse(request.expiresAt) > now
}
export function canApprove(session: Session, request: RequestDetail, now = Date.now()): boolean {
  return canReview(session, request, now) && (session.role !== 'reader' || !request.scopes.includes('team-write'))
}
export const scopeLabels: Record<Scope, string> = {
  'personal-read': 'Read your notes', 'personal-write': 'Save your notes',
  'team-read': 'Read team notes', 'team-write': 'Save team notes',
}
export function displayDate(value: string): string {
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
