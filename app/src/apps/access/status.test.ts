import { expect, it } from 'vitest'
import type { Person, Status } from '../../lib/access'
import { canRetry, signInLine } from './status'

const status = (changes: Partial<Status> = {}): Status => ({ origin: 'https://business.example.com', ownerEmail: 'owner@example.com', viewer: { email: 'owner@example.com', owner: true },
  environment: 'live', key: 'ready', started: true, imported: 0, keysStarted: true, kept: 0, apps: ['hello', 'orders'],
  appKeys: { hello: [], orders: [] }, keys: [], roles: [], people: [], work: [], ...changes })
const person = (changes: Partial<Person> = {}): Person => ({ email: 'bo@example.com', status: 'active', settled: true, role: null, manager: false, apps: ['hello'], keys: {}, ...changes })

it('gives each person one sign-in status', () => {
  expect(signInLine(person(), status())).toEqual({ text: 'Can sign in', unfinished: false })
  expect(signInLine(person({ settled: false }), status())).toEqual({ text: "Can't sign in yet", unfinished: true })
  expect(signInLine(person({ settled: false }), status({ environment: 'practice', key: 'practice' }))).toEqual({ text: 'Practice list', unfinished: false })
  const removed = person({ status: 'removed', apps: [] })
  expect(signInLine(removed, status())).toEqual({ text: 'Removed', unfinished: false })
  expect(signInLine({ ...removed, settled: false }, status())).toEqual({ text: 'Removed · still signing out', unfinished: true })
  expect(signInLine(removed, status({ work: [{ kind: 'policy', status: 'ready' }, { kind: 'sessions', status: 'failed' }] }))).toEqual({ text: 'Removed · still signing out', unfinished: true })
  expect(signInLine(removed, status({ work: [{ kind: 'policy', status: 'failed' }, { kind: 'sessions', status: 'ready' }] }))).toEqual({ text: 'Removed', unfinished: false })
  expect(signInLine({ ...removed, settled: false }, status({ environment: 'practice', key: 'practice' }))).toEqual({ text: 'Removed', unfinished: false })
})

it('offers Try again only where it can work', () => {
  expect(canRetry(status())).toBe(true)
  for (const changes of [{ key: 'missing' }, { started: false }, { environment: 'practice', key: 'practice' }] as const) expect(canRetry(status(changes))).toBe(false)
})
