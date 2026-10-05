import { expect, it } from 'vitest'
import type { Person, Status } from '../../lib/access'
import { appHolders, each, holdersLine, levelHolders, put, subjects } from './subjects'

const person = (email: string, changes: Partial<Person> = {}): Person => ({ email, status: 'active', settled: true, role: null, apps: [], keys: {}, ...changes })
const sales = { id: 'sales', name: 'Sales', apps: ['hello'], keys: { stripe: 'read' as const } }
const office = { id: 'office', name: 'Office', apps: [], keys: {} }
const kim = person('kim@shop.com', { apps: ['hello', 'tips'], keys: { stripe: 'write' } })
const status: Status = { origin: 'https://business.example.com', ownerEmail: 'owner@example.com', environment: 'live', key: 'ready', started: true,
  imported: 0, keysStarted: true, kept: 0, apps: ['hello', 'tips', 'payroll'], appKeys: { hello: [], tips: [], payroll: [] }, keys: [], roles: [office, sales],
  people: [person('gone@shop.com', { status: 'removed' }), kim, person('lee@shop.com', { role: 'sales', apps: ['hello'], keys: { stripe: 'read' } }),
    person('sam@shop.com', { role: 'sales', apps: ['hello'], keys: { stripe: 'read' } })], work: [] }

it('names who holds a role, and nobody for a role with no one or not saved yet', () => {
  expect(holdersLine(status, 'sales')).toBe('lee@shop.com, sam@shop.com')
  expect(holdersLine(status, 'office')).toBe('nobody yet')
  expect(holdersLine(status)).toBe('nobody yet')
})

it('gives ticks and levels to each role, then to each active person with their own set', () => {
  expect(subjects(status)).toEqual([
    { kind: 'roles', id: 'office', name: 'Office', label: 'Office · nobody yet', set: office },
    { kind: 'roles', id: 'sales', name: 'Sales', label: 'Sales · lee@shop.com, sam@shop.com', set: sales },
    // A person who holds a role has the role's set and nothing else; a removed person has nothing.
    { kind: 'people', id: 'kim@shop.com', name: 'kim@shop.com', label: 'kim@shop.com', set: kim },
  ])
})

it('shapes one value per role and person as a save names them, and changes one without touching the rest', () => {
  const list = subjects(status)
  const levels = each(list, ({ set }) => set.keys.stripe ?? null)
  expect(levels).toEqual({ roles: { office: null, sales: 'read' }, people: { 'kim@shop.com': 'write' } })
  expect(put(levels, list[0], 'write')).toEqual({ roles: { office: 'write', sales: 'read' }, people: { 'kim@shop.com': 'write' } })
  expect(put(levels, list[2], null)).toEqual({ roles: { office: null, sales: 'read' }, people: { 'kim@shop.com': null } })
  expect(levels.roles.office).toBeNull()
  expect(each([], () => true)).toEqual({ roles: {}, people: {} })
})

it('lists who has a level for a key and who has an app, roles first', () => {
  expect(levelHolders(status, 'stripe')).toBe('Sales: Read · kim@shop.com: Read & write')
  expect(levelHolders(status, 'bank')).toBe('Nobody yet')
  expect(appHolders(status, 'hello')).toBe('Sales, kim@shop.com')
  expect(appHolders(status, 'tips')).toBe('kim@shop.com')
  expect(appHolders(status, 'payroll')).toBe('Nobody yet')
})
