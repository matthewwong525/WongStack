import { expect, it } from 'vitest'
import type { SavedKey, Status } from '../../lib/access'
import { appTitle } from '../../lib/apps'
import { aloneLine, appUses, capital, dots, fill, gaps, hint, keyState, keyUseLine, levelLabel, levelLabels, levelName, NOTHING, sameSet, shortLine, ticked, usesLine, usesShort, usesWhat, type AccessSet } from './levels'

const key = (id: string, title: string, changes: Partial<SavedKey> = {}): SavedKey => ({ id, title, levels: ['read', 'write'], saved: true, setup: false, usedBy: [], alone: false, ...changes })
const stripe = key('stripe', 'Stripe', { usedBy: [{ app: 'hello', need: 'write' }, { app: 'tips', need: 'read' }] })
const maps = key('maps', 'Maps', { saved: false, usedBy: [{ app: 'hello', need: 'read' }] })
const cloudflare = key('cloudflare', 'Cloudflare', { levels: ['read'], saved: false, setup: true, alone: true })
const spare = key('spare', 'Spare')
const status: Status = { ownerEmail: 'owner@example.com', viewer: { email: 'owner@example.com', owner: true }, environment: 'live', key: 'ready', started: true,
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
  // The same words without the verb, for a column that is named Uses.
  expect([usesWhat(status, 'tips'), usesWhat(status, 'payroll')]).toEqual(['Stripe: look up', 'no keys'])
  // Beside a tick, the keys alone.
  expect([usesShort(status, 'hello'), usesShort(status, 'tips'), usesShort(status, 'payroll')]).toEqual(['uses Stripe, Maps', 'uses Stripe', 'uses no keys'])
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

it('names the fix under a level beside an app: Read to use the key, Read & write to change things', () => {
  expect(hint('hello', stripe, 'write')).toBe("Hello can't use Stripe yet. Pick Read to let it look things up.")
  expect(hint('tips', stripe, 'read', null)).toBe("Tip calculator can't use Stripe yet. Pick Read to let it look things up.")
  expect(hint('hello', stripe, 'write', 'read')).toBe('Hello also changes things. Pick Read & write to let it.')
  expect([hint('hello', stripe, 'write', 'write'), hint('tips', stripe, 'read', 'read'), hint('tips', stripe, 'read', 'write')]).toEqual(['', '', ''])
})

it('gives one gap line per app of a set that can not do its job yet, with the app named', () => {
  expect(gaps(status, { apps: ['hello', 'tips', 'payroll'], keys: { stripe: 'read', maps: 'read' } })).toEqual(['Hello can look up, not change'])
  expect(gaps(status, { apps: ['tips', 'hello'], keys: {} })).toEqual(["Tip calculator can't use Stripe yet", "Hello can't use Stripe yet · can't use Maps yet"])
  expect(gaps(status, { apps: ['hello', 'tips'], keys: { stripe: 'write', maps: 'read' } })).toEqual([])
  // An app that is not ticked has no gap, and neither has one that is no longer built: it shows its name and uses nothing.
  expect(gaps(status, { apps: ['retired'], keys: {} })).toEqual([]); expect(gaps(status, NOTHING)).toEqual([])
  expect(appTitle('retired')).toBe('retired')
})

it('labels the levels a set holds, one per key in the order the keys are shown', () => {
  expect(levelLabels(status, { cloudflare: 'read', stripe: 'write', maps: null })).toEqual(['Stripe Read & write', 'Cloudflare Read'])
  expect(levelLabels(status, {})).toEqual([])
  expect(levelLabel('Bank', 'read')).toBe('Bank Read')
})

it('knows when a set is back where it started, whatever the order of ticks and a key at None', () => {
  const start = { apps: ['hello', 'tips'], keys: { stripe: 'read' as const } }
  expect(sameSet(start, { apps: ['tips', 'hello'], keys: { maps: null, stripe: 'read' } })).toBe(true)
  expect(sameSet(NOTHING, { apps: [], keys: { stripe: null } })).toBe(true)
  const moves: AccessSet[] = [{ apps: ['hello'], keys: start.keys }, { apps: start.apps, keys: { stripe: 'write' } }, { apps: start.apps, keys: {} },
    { apps: start.apps, keys: { ...start.keys, maps: 'read' } }]
  for (const moved of moves) expect(sameSet(start, moved)).toBe(false)
})

it('says what uses a key, on the Keys view and a key page', () => {
  expect(keyUseLine(stripe)).toBe('Used by Hello: look up, change · Tip calculator: look up')
  expect(keyUseLine(cloudflare)).toBe('Look-ups, no app needed · Read only')
  expect(keyUseLine({ ...cloudflare, usedBy: [{ app: 'payroll', need: 'read' }] })).toBe('Used by payroll: look up · Look-ups, no app needed · Read only')
  expect(keyUseLine(spare)).toBe('Nothing uses it yet')
  // Project code works with no app too, and what it does is not a look-up.
  const code = { ...cloudflare, id: 'code', title: 'Project code' }
  expect([keyUseLine(code), aloneLine(code), aloneLine(cloudflare), aloneLine(spare)])
    .toEqual(['Installs the project, no app needed · Read only', 'installs the project, no app needed', 'look-ups, no app needed', ''])
})

it('says whether a key is saved, waits for its link, or waits for setup to make it, which no preview can', () => {
  expect([stripe, maps, cloudflare].map(key => keyState(key, 'live'))).toEqual(['Saved', 'Not saved yet', 'One step left'])
  expect([stripe, maps, cloudflare].map(key => keyState(key, 'practice'))).toEqual(['Saved', 'Not saved yet', 'Not on previews yet'])
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
