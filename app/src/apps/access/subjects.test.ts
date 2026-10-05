import { expect, it } from 'vitest'
import type { Person, Status } from '../../lib/access'
import { appHolders, differs, each, holders, holdersByLevel, holdersLine, put, subjects } from './subjects'

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
  expect([holders(status, 'sales'), holders(status, 'office'), holders(status)]).toEqual([['lee@shop.com', 'sam@shop.com'], [], []])
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
  // A page knows its values have moved, and when they are back where they started.
  expect(differs(levels, put(levels, list[0], 'write'))).toBe(true)
  expect(differs(levels, put(put(levels, list[0], 'write'), list[0], null))).toBe(false)
})

it('groups who holds a key by level, the higher first, and lists who has an app, roles first', () => {
  expect(holdersByLevel(status, 'stripe')).toEqual([{ level: 'write', names: ['kim@shop.com'] }, { level: 'read', names: ['Sales'] }])
  // Several holders of one level stay in the order they are listed: roles, then people. A level nobody holds is left out.
  const more = { ...status, people: [...status.people, person('pat@shop.com', { keys: { stripe: 'read' } })] }
  expect(holdersByLevel(more, 'stripe')[1]).toEqual({ level: 'read', names: ['Sales', 'pat@shop.com'] })
  expect(holdersByLevel({ ...status, people: [] }, 'stripe')).toEqual([{ level: 'read', names: ['Sales'] }])
  expect(holdersByLevel(status, 'bank')).toEqual([])
  expect(appHolders(status, 'hello')).toEqual(['Sales', 'kim@shop.com'])
  expect(appHolders(status, 'tips')).toEqual(['kim@shop.com'])
  expect(appHolders(status, 'payroll')).toEqual([])
})
