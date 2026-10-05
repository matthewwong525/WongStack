import { expect, it } from 'vitest'
import type { SavedKey, Status } from '../../lib/access'
import { appUses, capital, dots, fill, heldUseLine, keyState, keyUseLine, levelName, levelsLine, NOTHING, shortLine, ticked, usesLine } from './levels'

const key = (id: string, title: string, changes: Partial<SavedKey> = {}): SavedKey => ({ id, title, levels: ['read', 'write'], saved: true, setup: false, usedBy: [], alone: false, ...changes })
const stripe = key('stripe', 'Stripe', { usedBy: [{ app: 'hello', need: 'write' }, { app: 'tips', need: 'read' }] })
const maps = key('maps', 'Maps', { saved: false, usedBy: [{ app: 'hello', need: 'read' }] })
const cloudflare = key('cloudflare', 'Cloudflare', { levels: ['read'], saved: false, setup: true, alone: true })
const spare = key('spare', 'Spare')
const status: Status = { origin: 'https://business.example.com', ownerEmail: 'owner@example.com', environment: 'live', key: 'ready', started: true,
  imported: 0, keysStarted: true, kept: 0, apps: ['hello', 'tips', 'payroll'],
  appKeys: { hello: [{ id: 'stripe', need: 'write' }, { id: 'maps', need: 'read' }], tips: [{ id: 'stripe', need: 'read' }], payroll: [] },
  keys: [stripe, maps, cloudflare, spare], roles: [], people: [], work: [] }

it('names a level, joins the parts of a line and starts a line with a capital', () => {
  expect([levelName(null), levelName('read'), levelName('write')]).toEqual(['None', 'Read', 'Read & write'])
  expect(dots('Sales', '', false, null, undefined, 'Can sign in')).toBe('Sales · Can sign in')
  expect(dots()).toBe('')
  expect(capital('uses no keys')).toBe('Uses no keys')
})

it('says which keys an app uses and whether it looks things up or also changes them', () => {
  expect(appUses(status, 'hello')).toEqual([{ key: stripe, need: 'write' }, { key: maps, need: 'read' }])
  expect(usesLine(status, 'hello')).toBe('uses Stripe: look up, change · Maps: look up')
  expect(usesLine(status, 'tips')).toBe('uses Stripe: look up')
  expect(usesLine(status, 'payroll')).toBe('uses no keys')
})

it('says in one plain line per key what a set can not do yet in an app it has', () => {
  expect(shortLine(status, 'hello', {})).toBe("can't use Stripe yet · can't use Maps yet")
  expect(shortLine(status, 'hello', { stripe: null, maps: 'read' })).toBe("can't use Stripe yet")
  expect(shortLine(status, 'hello', { stripe: 'read', maps: 'read' })).toBe('can look up, not change')
  // Read is enough where the app only looks things up, and Read & write is enough everywhere.
  expect(shortLine(status, 'hello', { stripe: 'write', maps: 'write' })).toBe('')
  expect(shortLine(status, 'tips', { stripe: 'read' })).toBe('')
  expect(shortLine(status, 'payroll', {})).toBe('')
})

it('lists the levels a set holds in the order the keys are shown', () => {
  expect(levelsLine(status, { cloudflare: 'read', stripe: 'write', maps: null })).toBe('Stripe: Read & write · Cloudflare: Read')
  expect(levelsLine(status, {})).toBe('')
})

it('says what uses a key, on the Keys view and under a level on a person or a role', () => {
  expect(keyUseLine(stripe)).toBe('Used by Hello: look up, change · Tip calculator: look up')
  expect(keyUseLine(cloudflare)).toBe('Look-ups, no app needed · Read only')
  expect(keyUseLine({ ...cloudflare, usedBy: [{ app: 'payroll', need: 'read' }] })).toBe('Used by payroll: look up · Look-ups, no app needed · Read only')
  expect(keyUseLine(spare)).toBe('Nothing uses it yet')
  expect(heldUseLine(stripe, ['hello', 'tips', 'payroll'], 'nothing of theirs uses it yet')).toBe('used by Hello, Tip calculator')
  expect(heldUseLine(stripe, ['payroll'], 'nothing of theirs uses it yet')).toBe('nothing of theirs uses it yet')
  expect(heldUseLine(cloudflare, [], 'nothing in this role uses it yet')).toBe('look-ups, no app needed')
  expect(heldUseLine({ ...stripe, alone: true }, ['tips'], 'nothing of theirs uses it yet')).toBe('used by Tip calculator · look-ups, no app needed')
})

it('says whether a key is saved, waits for its link, or waits for setup to make it', () => {
  expect([stripe, maps, cloudflare].map(keyState)).toEqual(['Saved', 'Not saved yet', 'One step left'])
})

it('ticking an app gives Read on each key it uses that is at None, and never Read & write', () => {
  expect(fill([stripe, maps], { stripe: 'write' }, null)).toEqual({ stripe: 'write', maps: null })
  expect(ticked(status, NOTHING, 'hello', true)).toEqual({ apps: ['hello'], keys: { stripe: 'read', maps: 'read' } })
  // A level already chosen is kept, and a key the app does not use is left alone.
  expect(ticked(status, { apps: ['payroll'], keys: { stripe: 'write', maps: null, spare: 'read' } }, 'hello', true))
    .toEqual({ apps: ['payroll', 'hello'], keys: { stripe: 'write', maps: 'read', spare: 'read' } })
  // Unticking takes the app away and no level with it: a level holds in every app.
  expect(ticked(status, { apps: ['hello', 'tips'], keys: { stripe: 'read' } }, 'hello', false)).toEqual({ apps: ['tips'], keys: { stripe: 'read' } })
  expect(NOTHING).toEqual({ apps: [], keys: {} })
})
