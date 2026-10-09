import { expect, it } from 'vitest'
import type { Person, Role, SavedKey, Status } from '../../lib/access'
import { holders, holdersLine } from './subjects'

const key = (id: string, title = id, levels: SavedKey['levels'] = ['read', 'write']): SavedKey => ({ id, title, levels, saved: true, setup: false, alone: false })
const person = (email: string, changes: Partial<Person> = {}): Person => ({ email, status: 'active', settled: true, role: null, manager: false, apps: [], keys: {}, ...changes })
// Sales has Hello, with Stripe at Read and the project. The office has nothing yet. Kim has her own set.
const sales: Role = { id: 'sales', name: 'Sales', apps: ['hello'], keys: { stripe: 'read', code: 'read' } }
const office: Role = { id: 'office', name: 'Office', apps: [], keys: {} }
const kim = person('kim@shop.com', { apps: ['hello', 'tips'], keys: { stripe: 'write', code: 'read' } })
// A person who holds a role is sent with the role's set on their own row.
const inSales = { role: 'sales', apps: sales.apps, keys: sales.keys }
const status: Status = { ownerEmail: 'owner@example.com', viewer: { email: 'owner@example.com', owner: true }, environment: 'live', key: 'ready', started: true,
  imported: 0, keysStarted: true, unticked: { people: [], roles: [] },
  apps: [{ id: 'hello', title: 'Hello', description: '' }, { id: 'tips', title: 'Tip calculator', description: '' }, { id: 'payroll', title: 'Payroll', description: '' }],
  keys: [key('stripe', 'Stripe'), key('code', 'Project code', ['read'])], roles: [office, sales],
  people: [person('gone@shop.com', { status: 'removed' }), kim, person('lee@shop.com', inSales), person('sam@shop.com', inSales)], work: [], project: 'ready' }

it('names who holds a role, and nobody for a role with no one or not saved yet', () => {
  expect(holdersLine(status, 'sales')).toBe('lee@shop.com, sam@shop.com')
  expect(holdersLine(status, 'office')).toBe('nobody yet')
  expect(holdersLine(status)).toBe('nobody yet')
  expect([holders(status, 'sales'), holders(status, 'office'), holders(status)]).toEqual([['lee@shop.com', 'sam@shop.com'], [], []])
})
