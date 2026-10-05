import { expect, it } from 'vitest'
import { appTitle } from '../../lib/apps'
import type { Person, Status } from '../../lib/access'
import { appsLine, canRetry, signInLine } from './status'

const status = (changes: Partial<Status> = {}): Status => ({ origin: 'https://business.example.com', ownerEmail: 'owner@example.com',
  environment: 'live', key: 'ready', started: true, imported: 0, keysStarted: true, kept: 0, apps: ['hello', 'orders'],
  appKeys: { hello: [], orders: [] }, keys: [], roles: [], people: [], work: [], ...changes })
const person = (changes: Partial<Person> = {}): Person => ({ email: 'bo@example.com', status: 'active', settled: true, role: null, apps: ['hello'], keys: {}, ...changes })

it('names a person’s apps in a few words', () => {
  expect(appsLine(person({ apps: [] }), status())).toBe('No apps')
  expect(appsLine(person(), status())).toBe('Hello')
  expect(appsLine(person({ apps: ['hello', 'orders'] }), status())).toBe('All apps')
  // One built app is named, not called all; an app with no card shows its name.
  expect(appsLine(person(), status({ apps: ['hello'] }))).toBe('Hello')
  expect(appsLine(person({ apps: ['hello', 'retired'] }), status({ apps: ['hello', 'orders', 'payroll'] }))).toBe('Hello, retired')
  expect(appTitle('retired')).toBe('retired')
  // A role's apps read the same way.
  expect(appsLine({ apps: ['hello', 'orders'] }, status())).toBe('All apps')
})

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
