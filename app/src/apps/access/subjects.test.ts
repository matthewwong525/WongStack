import { expect, it } from 'vitest'
import type { Person, SavedKey, Status } from '../../lib/access'
import { appHolders, differs, each, holders, holdersLine, keyHolders, put, subjects } from './subjects'

const person = (email: string, changes: Partial<Person> = {}): Person => ({ email, status: 'active', settled: true, role: null, manager: false, apps: [], keys: {}, ...changes })
const sales = { id: 'sales', name: 'Sales', apps: ['hello'], keys: { stripe: 'read' as const } }
const office = { id: 'office', name: 'Office', apps: [], keys: {} }
const kim = person('kim@shop.com', { apps: ['hello', 'tips'], keys: { stripe: 'write' } })
const status: Status = { ownerEmail: 'owner@example.com', viewer: { email: 'owner@example.com', owner: true }, environment: 'live', key: 'ready', started: true,
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

it('names who holds a key at each level and who has an app: the owner first, then roles, then people', () => {
  const key = (id: string, levels: SavedKey['levels'] = ['read', 'write']): SavedKey => ({ id, title: id, levels, saved: true, setup: false, usedBy: [], alone: false })
  // The owner holds every key at the most it offers.
  expect([keyHolders(status, key('stripe'), 'write'), keyHolders(status, key('stripe'), 'read')]).toEqual([['Owner', 'kim@shop.com'], ['Sales']])
  expect([keyHolders(status, key('cloudflare', ['read']), 'write'), keyHolders(status, key('cloudflare', ['read']), 'read')]).toEqual([[], ['Owner']])
  // Several holders of one level stay in the order they are listed: roles, then people.
  const more = { ...status, people: [...status.people, person('pat@shop.com', { keys: { stripe: 'read' } })] }
  expect(keyHolders(more, key('stripe'), 'read')).toEqual(['Sales', 'pat@shop.com'])
  expect([keyHolders(status, key('bank'), 'write'), keyHolders(status, key('bank'), 'read')]).toEqual([['Owner'], []])
  expect(appHolders(status, 'hello')).toEqual(['Owner', 'Sales', 'kim@shop.com'])
  expect(appHolders(status, 'tips')).toEqual(['Owner', 'kim@shop.com'])
  expect(appHolders(status, 'payroll')).toEqual(['Owner'])
})
