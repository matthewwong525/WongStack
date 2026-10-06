import { expect, it } from 'vitest'
import type { Person, Role, SavedKey, Skill, Status } from '../../lib/access'
import { appHolders, canRun, differs, each, holders, holdersLine, keyHolders, put, runners, subjects } from './subjects'

const key = (id: string, title = id, levels: SavedKey['levels'] = ['read', 'write']): SavedKey => ({ id, title, levels, saved: true, setup: false, usedBy: [], alone: false })
const person = (email: string, changes: Partial<Person> = {}): Person => ({ email, status: 'active', settled: true, role: null, manager: false, apps: {}, keys: {}, ...changes })
// Sales looks things up in Hello, with Stripe at Read and the project. The office has nothing yet. Kim has her own set.
const sales: Role = { id: 'sales', name: 'Sales', apps: { hello: 'read' }, keys: { stripe: 'read', code: 'read' } }
const office: Role = { id: 'office', name: 'Office', apps: {}, keys: {} }
const kim = person('kim@shop.com', { apps: { hello: 'write', tips: 'read' }, keys: { stripe: 'write', code: 'read' } })
// A person who holds a role is sent with the role's set on their own row.
const inSales = { role: 'sales', apps: sales.apps, keys: sales.keys }
// A refund changes things in Hello and with Stripe, and needs the project. Looking an order up needs less.
const refund: Skill = { id: 'refund', title: 'Refund a customer', areas: { hello: 'write' }, keys: { stripe: 'write', code: 'read' } }
const look: Skill = { id: 'look', title: 'Look up an order', areas: { hello: 'read' }, keys: { stripe: 'read' } }
const status: Status = { ownerEmail: 'owner@example.com', viewer: { email: 'owner@example.com', owner: true }, environment: 'live', key: 'ready', started: true,
  imported: 0, keysStarted: true, kept: 0, appKeys: { hello: [], tips: [], payroll: [] },
  areas: [{ id: 'hello', title: 'Hello', description: '', screen: true }, { id: 'tips', title: 'Tip calculator', description: '', screen: true }, { id: 'payroll', title: 'Payroll', description: '', screen: false }],
  skills: [refund, look], keys: [key('stripe', 'Stripe'), key('code', 'Project code', ['read'])], roles: [office, sales],
  people: [person('gone@shop.com', { status: 'removed' }), kim, person('lee@shop.com', inSales), person('sam@shop.com', inSales)], work: [], project: 'ready' }

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
  // An area's level is shaped the same way: the one held, or none.
  expect(each(list, ({ set }) => set.apps.hello ?? null)).toEqual({ roles: { office: null, sales: 'read' }, people: { 'kim@shop.com': 'write' } })
  // A page knows its values have moved, and when they are back where they started.
  expect(differs(levels, put(levels, list[0], 'write'))).toBe(true)
  expect(differs(levels, put(put(levels, list[0], 'write'), list[0], null))).toBe(false)
})

it('counts who holds a key at each level and who has an area: the owner first, then roles, then people', () => {
  // The owner holds every key at the most it offers.
  expect([keyHolders(status, key('stripe'), 'write'), keyHolders(status, key('stripe'), 'read')]).toEqual(['Owner, 1 person', '1 role'])
  expect([keyHolders(status, key('cloudflare', 'Cloudflare', ['read']), 'write'), keyHolders(status, key('cloudflare', 'Cloudflare', ['read']), 'read')]).toEqual(['Nobody', 'Owner'])
  // Several holders of one level are counted by kind: roles, then people with their own set.
  const more: Status = { ...status, roles: [{ ...office, keys: { stripe: 'read' } }, sales],
    people: [...status.people, person('pat@shop.com', { keys: { stripe: 'read' } }), person('ray@shop.com', { keys: { stripe: 'read' } })] }
  expect(keyHolders(more, key('stripe'), 'read')).toBe('2 roles, 2 people')
  expect([keyHolders(status, key('bank'), 'write'), keyHolders(status, key('bank'), 'read')]).toEqual(['Owner', 'Nobody'])
  // An area counts at either level: Sales looks things up in Hello and Kim changes them.
  expect(appHolders(status, 'hello')).toBe('Owner, 1 role, 1 person')
  expect(appHolders(status, 'tips')).toBe('Owner, 1 person')
  expect(appHolders(status, 'payroll')).toBe('Owner')
})

it('lists each role and each person with their own set with what they lack of what a skill needs, and nothing for one who can run it', () => {
  const lacks = (skill: Skill) => runners(status, skill).map(({ subject, lacking }) => [subject.label, lacking])
  expect(lacks(refund)).toEqual([['Office · nobody yet', ['Hello Look up & change', 'Stripe Read & write', 'Project code']],
    ['Sales · lee@shop.com, sam@shop.com', ['Hello Look up & change', 'Stripe Read & write']], ['kim@shop.com', []]])
  expect(lacks(look)).toEqual([['Office · nobody yet', ['Hello Look up', 'Stripe Read']], ['Sales · lee@shop.com, sam@shop.com', []], ['kim@shop.com', []]])
  // Each comes with the whole of what a tick is given to, so a panel can name it.
  expect(runners(status, refund).map(({ subject }) => subject)).toEqual(subjects(status))
  expect(runners({ ...status, roles: [], people: [] }, refund)).toEqual([])
})

it('counts how many people can run a skill, of everyone who can sign in: the owner always can', () => {
  // The owner and Kim can refund; Lee and Sam are judged by the Sales set on their own rows. A removed person is not counted.
  expect([canRun(status, refund), canRun(status, look)]).toEqual(['2 of 4', '4 of 4'])
  expect(canRun({ ...status, people: [...status.people, person('left@shop.com', { status: 'removed', apps: kim.apps, keys: kim.keys })] }, refund)).toBe('2 of 4')
  // The set on a person's own row decides, whatever the list of roles says.
  expect(canRun({ ...status, people: [person('lee@shop.com', { role: 'sales', apps: kim.apps, keys: kim.keys })] }, refund)).toBe('2 of 2')
  expect(canRun({ ...status, people: [] }, refund)).toBe('1 of 1')
})
