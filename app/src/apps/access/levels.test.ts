import { expect, it } from 'vitest'
import type { SavedKey, Status } from '../../lib/access'
import { appLabels, count, dots, fill, keyLine, keyState, levelLabel, levelLabels, levelName, NOTHING, sameSet, summary, ticks, type AccessSet } from './levels'

// A shop with four apps and six keys. Which app uses which key is not Access's to say.
const key = (id: string, title: string, changes: Partial<SavedKey> = {}): SavedKey => ({ id, title, levels: ['read', 'write'], saved: true, setup: false, alone: false, ...changes })
const stripe = key('stripe', 'Stripe')
const maps = key('maps', 'Maps', { saved: false })
const bank = key('bank', 'Bank')
const cloudflare = key('cloudflare', 'Cloudflare', { levels: ['read'], saved: false, setup: true, alone: true })
const code = key('code', 'Project code', { levels: ['read'], alone: true })
const spare = key('spare', 'Spare')
const app = (id: string, title: string) => ({ id, title, description: '' })
const status: Status = { ownerEmail: 'owner@example.com', viewer: { email: 'owner@example.com', owner: true }, environment: 'live', key: 'ready', started: true,
  imported: 0, keysStarted: true, unticked: { people: [], roles: [] },
  apps: [app('hello', 'Hello'), app('tips', 'Tip calculator'), app('payroll', 'Payroll'), app('orders', 'Orders')],
  keys: [stripe, maps, bank, cloudflare, code, spare], roles: [], people: [], work: [], project: 'ready' }
// Notion is set up to be used directly at both levels, and Ledger at Read alone.
const notion = key('notion', 'Notion', { direct: true })
const ledger = key('ledger', 'Ledger', { levels: ['read'], direct: true })

it("names a key's level, joins the parts of a line and counts with the right word", () => {
  expect([levelName(null), levelName('read'), levelName('write')]).toEqual(['None', 'Read', 'Read & write'])
  expect(dots('Sales', '', false, null, undefined, 'Can sign in')).toBe('Sales · Can sign in')
  expect(dots()).toBe('')
  expect([count(1, 'app'), count(2, 'app'), count(0, 'key'), count(1, 'person', 'people'), count(3, 'person', 'people')]).toEqual(['1 app', '2 apps', '0 keys', '1 person', '3 people'])
})

it('labels the apps and the key levels a set holds, in the order they are shown', () => {
  // An app has no level beside it; one that is no longer built has no label.
  expect(appLabels(status, ['orders', 'retired', 'hello'])).toEqual(['Hello', 'Orders'])
  expect(appLabels(status, [])).toEqual([])
  // A key at None has no label.
  expect(levelLabels(status, { cloudflare: 'read', stripe: 'write', maps: null })).toEqual(['Stripe Read & write', 'Cloudflare Read'])
  expect(levelLabels(status, {})).toEqual([])
  expect(levelLabel('Bank', 'read')).toBe('Bank Read')
})

it('sums a set up for one line of a list: how many apps and how many keys, and nothing else', () => {
  expect(summary(status, NOTHING)).toBe('No apps')
  expect(summary(status, { apps: ['payroll'], keys: {} })).toBe('1 app')
  expect(summary(status, { apps: ['hello', 'tips', 'payroll'], keys: { stripe: 'write', maps: 'read', cloudflare: 'read' } })).toBe('3 apps, 3 keys')
  // An app counts whatever level its keys are held at: Hello changes things with Stripe, and no level is no gap.
  expect(summary(status, { apps: ['hello', 'orders'], keys: { bank: 'read' } })).toBe('2 apps, 1 key')
  // A key no app uses still counts; a key at None and an app that is no longer built do not.
  expect(summary(status, { apps: ['retired'], keys: { spare: 'read', stripe: null } })).toBe('No apps, 1 key')
})

it('knows when a set is back where it started, whatever the order of its lines and a level at None', () => {
  const start: AccessSet = { apps: ['hello', 'tips'], keys: { stripe: 'read' } }
  expect(sameSet(start, { apps: ['tips', 'hello'], keys: { maps: null, stripe: 'read' } })).toBe(true)
  expect(sameSet(NOTHING, { apps: [], keys: { stripe: null } })).toBe(true)
  // An app taken away, an app added, a key at another level, a key taken away and a key added all differ.
  const moves: AccessSet[] = [{ apps: ['hello'], keys: start.keys }, { apps: [...start.apps, 'orders'], keys: start.keys }, { apps: start.apps, keys: { stripe: 'write' } },
    { apps: start.apps, keys: {} }, { apps: start.apps, keys: { ...start.keys, maps: 'read' } }]
  for (const moved of moves) expect(sameSet(start, moved)).toBe(false)
  // Comparing leaves both sets in the order they were.
  expect(start.apps).toEqual(['hello', 'tips'])
  expect(NOTHING).toEqual({ apps: [], keys: {} })
})

it("says under a key's level what the level does with the key by itself, and never which apps use it", () => {
  expect([keyLine(cloudflare), keyLine(code)]).toEqual(['', ''])
  // A key apps use says nothing of them: an app asks no level.
  expect([keyLine(stripe), keyLine(spare), keyLine({ ...spare, direct: false })]).toEqual(['', '', ''])
  // A key whose service is set up: its level also reaches the service itself, by what the level allows and nothing else.
  expect([keyLine(notion), keyLine(ledger)]).toEqual(['Also reaches Notion directly', 'Also reaches Ledger directly'])
  expect(keyLine({ ...ledger, alone: true })).toBe('Also reaches Ledger directly')
})

it('says whether a key is saved, waits for its link, or waits for setup to make it, which no preview can', () => {
  expect([stripe, maps, cloudflare].map(key => keyState(key, 'live'))).toEqual(['Saved', 'Not saved yet', 'One step left'])
  expect([stripe, maps, cloudflare].map(key => keyState(key, 'practice'))).toEqual(['Saved', 'Not saved yet', 'Not on previews yet'])
})

it('names every app and every key as a save sends them: an app given or not, a key at the level held or none', () => {
  // Every app is named, and one that is no longer built is not.
  expect(ticks(status, ['orders', 'retired'])).toEqual({ hello: false, tips: false, payroll: false, orders: true })
  expect(ticks({ ...status, apps: [] }, ['orders'])).toEqual({})
  expect(fill(status, { stripe: 'write', maps: null })).toEqual({ stripe: 'write', maps: null, bank: null, cloudflare: null, code: null, spare: null })
  expect(fill({ ...status, keys: [] }, { stripe: 'write' })).toEqual({})
})
