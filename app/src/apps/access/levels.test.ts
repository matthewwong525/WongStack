import { expect, it } from 'vitest'
import type { Area, SavedKey, Skill, Status } from '../../lib/access'
import { aloneLine, appStart, appUses, areaTitle, capital, count, covers, dots, fill, gaps, keyLine, keyState, keyUseLine, keyUseShort, levelLabel, levelLabels, levelName, lines, missing, needLabels, NOTHING, opensLine, raised, reachLabel, reachLabels, reachName, sameSet, summary, usesLine, usesWhat, type AccessSet, type Needs } from './levels'

// A shop with four apps and one area with no screen. Hello changes things with Stripe and looks places up with Maps, the tip
// calculator looks prices up with Stripe, Orders changes things with Stripe and Bank, and Payroll and Customers use no key.
const key = (id: string, title: string, changes: Partial<SavedKey> = {}): SavedKey => ({ id, title, levels: ['read', 'write'], saved: true, setup: false, usedBy: [], alone: false, ...changes })
const stripe = key('stripe', 'Stripe', { usedBy: [{ app: 'hello', need: 'write' }, { app: 'tips', need: 'read' }, { app: 'orders', need: 'write' }] })
const maps = key('maps', 'Maps', { saved: false, usedBy: [{ app: 'hello', need: 'read' }] })
const bank = key('bank', 'Bank', { usedBy: [{ app: 'orders', need: 'write' }] })
const cloudflare = key('cloudflare', 'Cloudflare', { levels: ['read'], saved: false, setup: true, alone: true })
const code = key('code', 'Project code', { levels: ['read'], alone: true })
const spare = key('spare', 'Spare')
const area = (id: string, title: string, screen = true): Area => ({ id, title, description: '', screen })
const [payroll, orders, customers] = [area('payroll', 'Payroll'), area('orders', 'Orders'), area('customers', 'Customers', false)]
// Three skills. A refund changes an order, moves money with Stripe and needs the project. The weekly summary reads two
// areas and looks things up with Stripe. Setting up a device calls no area: it needs the project alone.
const refund: Skill = { id: 'refund', title: 'Refund a customer', areas: { orders: 'write' }, keys: { stripe: 'write', code: 'read' } }
const weekly: Skill = { id: 'weekly', title: 'Weekly summary', areas: { customers: 'read', payroll: 'read' }, keys: { stripe: 'read' } }
const install: Skill = { id: 'install', title: 'Set up a device', areas: {}, keys: { code: 'read' } }
const status: Status = { ownerEmail: 'owner@example.com', viewer: { email: 'owner@example.com', owner: true }, environment: 'live', key: 'ready', started: true,
  imported: 0, keysStarted: true, kept: 0,
  appKeys: { hello: [{ id: 'stripe', need: 'write' }, { id: 'maps', need: 'read' }], tips: [{ id: 'stripe', need: 'read' }], payroll: [],
    orders: [{ id: 'stripe', need: 'write' }, { id: 'bank', need: 'write' }], customers: [] },
  areas: [area('hello', 'Hello'), area('tips', 'Tip calculator'), payroll, orders, customers], skills: [refund, weekly, install],
  keys: [stripe, maps, bank, cloudflare, code, spare], roles: [], people: [], work: [], project: 'ready' }
// The gap lines of a set, as a row's panel says them.
const said = (set: AccessSet) => gaps(status, set).map(gap => gap.line)

it('names a level for a key and for an area, joins the parts of a line and starts a line with a capital', () => {
  expect([levelName(null), levelName('read'), levelName('write')]).toEqual(['None', 'Read', 'Read & write'])
  expect([reachName(null), reachName('read'), reachName('write')]).toEqual(['None', 'Look up', 'Look up & change'])
  // An area's title comes from the list of areas, a screen or not; a name with no built area shows as it is.
  expect([areaTitle(status, 'tips'), areaTitle(status, 'customers'), areaTitle(status, 'retired')]).toEqual(['Tip calculator', 'Customers', 'retired'])
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
  expect([usesWhat(status, 'tips'), usesWhat(status, 'customers')]).toEqual(['Stripe: look up', 'no keys'])
})

it('works out what a set still lacks of what something needs, and raises it there without lowering a level', () => {
  // Four lines each way: a level that is absent, None, the lower one and the higher one, against a need to look up and a need to change.
  const needs: Needs = { areas: { a: 'read', b: 'read', c: 'read', d: 'read' }, keys: { a: 'write', b: 'write', c: 'write', d: 'write' } }
  const set: AccessSet = { apps: { b: null, c: 'read', d: 'write' }, keys: { b: null, c: 'read', d: 'write' } }
  expect(missing(set, needs)).toEqual({ areas: { a: 'read', b: 'read' }, keys: { a: 'write', b: 'write', c: 'write' } })
  expect(covers(set, needs)).toBe(false)
  // Raised, it holds everything, and the area already at Look up & change stays there.
  expect(raised(set, needs)).toEqual({ apps: { a: 'read', b: 'read', c: 'read', d: 'write' }, keys: { a: 'write', b: 'write', c: 'write', d: 'write' } })
  expect(missing(raised(set, needs), needs)).toEqual({ areas: {}, keys: {} }); expect(covers(raised(set, needs), needs)).toBe(true)
  // Short of a key alone is still short, and something that needs nothing is always covered.
  expect([covers({ apps: { d: 'read' }, keys: {} }, { areas: { d: 'read' }, keys: { d: 'read' } }), covers(NOTHING, { areas: {}, keys: {} })]).toEqual([false, true])
  // The lines a starting point marks in the one list, areas first.
  expect([lines(refund), lines(install), lines({ areas: {}, keys: {} })]).toEqual([['app:orders', 'key:stripe', 'key:code'], ['key:code'], []])
})

it('starts an app at Look up, with Read on each key it uses and never Read & write', () => {
  expect(appStart(status, 'hello')).toEqual({ areas: { hello: 'read' }, keys: { stripe: 'read', maps: 'read' } })
  expect(appStart(status, 'payroll')).toEqual({ areas: { payroll: 'read' }, keys: {} })
  // Pressed on a set that already changes things with Stripe, it lowers nothing.
  expect(raised({ apps: {}, keys: { stripe: 'write' } }, appStart(status, 'hello'))).toEqual({ apps: { hello: 'read' }, keys: { stripe: 'write', maps: 'read' } })
})

it('labels what something needs: an area and a key with their levels, and a key that offers Read alone by its name', () => {
  expect(needLabels(status, refund)).toEqual(['Orders Look up & change', 'Stripe Read & write', 'Project code'])
  expect(needLabels(status, weekly)).toEqual(['Customers Look up', 'Payroll Look up', 'Stripe Read'])
  expect(needLabels(status, install)).toEqual(['Project code'])
  // A name with no built area, and a key that is not in the list of keys, show as they are.
  expect(needLabels(status, { areas: { retired: 'write' }, keys: { cloudflare: 'read', vault: 'write' } })).toEqual(['retired Look up & change', 'Cloudflare', 'vault'])
  expect(needLabels(status, { areas: {}, keys: {} })).toEqual([])
  expect([reachLabel('Orders', 'read'), reachLabel('Orders', 'write')]).toEqual(['Orders Look up', 'Orders Look up & change'])
})

it("gives one gap line per app of a set that can not do what its area's level lets it, with the app named", () => {
  // An area that is not held has no gap, and neither has one that is no longer built.
  expect([said(NOTHING), said({ apps: { hello: null }, keys: {} }), said({ apps: { retired: 'write' }, keys: {} })]).toEqual([[], [], []])
  // At Look up an app only looks things up. With a key at None it can't use it, and Read would let it.
  expect(gaps(status, { apps: { hello: 'read' }, keys: { maps: null } })).toEqual([{ id: 'app:hello', title: 'Hello',
    line: "Hello can't use Stripe yet · can't use Maps yet", needs: { areas: {}, keys: { stripe: 'read', maps: 'read' } } }])
  // Read is enough at Look up, even where the app changes things with the key.
  expect(said({ apps: { hello: 'read' }, keys: { stripe: 'read', maps: 'read' } })).toEqual([])
  // At Look up & change it needs what it does with each key: Read where it looks up, Read & write where it changes things.
  expect(gaps(status, { apps: { hello: 'write' }, keys: { stripe: 'read', maps: 'read' } })).toEqual([{ id: 'app:hello', title: 'Hello',
    line: 'Hello can look up, not change', needs: { areas: {}, keys: { stripe: 'write', maps: 'read' } } }])
  expect(said({ apps: { hello: 'write' }, keys: { stripe: 'read' } })).toEqual(["Hello can look up, not change · can't use Maps yet"])
  // Read & write is enough everywhere.
  expect([said({ apps: { hello: 'write', tips: 'write' }, keys: { stripe: 'write', maps: 'read' } }), said({ apps: { hello: 'write', tips: 'read' }, keys: { stripe: 'write', maps: 'write' } })]).toEqual([[], []])
  // Two keys short the same way are said once. Apps come first, then the skills that wait.
  expect(said({ apps: { orders: 'write' }, keys: { stripe: 'read', bank: 'read' } })).toEqual(['Orders can look up, not change', 'Refund a customer: Stripe Read & write, Project code'])
  // Several apps, in the order the areas are shown.
  expect(said({ apps: { tips: 'read', hello: 'write' }, keys: {} })).toEqual(["Hello can't use Stripe yet · can't use Maps yet", "Tip calculator can't use Stripe yet"])
})

it('gives one gap line per skill once the set holds every area it calls, naming each area level and key it is short of', () => {
  // A skill that calls no area never counts on a row, and neither does one whose areas are not all held.
  expect([said({ apps: { payroll: 'write' }, keys: {} }), said({ apps: { customers: 'read' }, keys: { stripe: 'write' } })]).toEqual([[], []])
  // Every area held, and one a level short.
  expect(said({ apps: { orders: 'read' }, keys: { stripe: 'write', bank: 'write', code: 'read' } })).toEqual(['Refund a customer: Orders Look up & change'])
  // A key short.
  expect(said({ apps: { customers: 'read', payroll: 'read' }, keys: { stripe: null } })).toEqual(['Weekly summary: Stripe Read'])
  // Project code missing: a key that offers Read alone is named without a level. What would let the skill run is everything it needs.
  expect(gaps(status, { apps: { orders: 'write' }, keys: { stripe: 'write', bank: 'write' } })).toEqual([{ id: 'skill:refund', title: 'Refund a customer',
    line: 'Refund a customer: Project code', needs: refund }])
  // Several missing, on one line.
  expect(said({ apps: { orders: 'read' }, keys: {} })).toEqual(["Orders can't use Stripe yet · can't use Bank yet", 'Refund a customer: Orders Look up & change, Stripe Read & write, Project code'])
  // Covered: a higher level than the skill needs is enough.
  expect(said({ apps: { orders: 'write', customers: 'write', payroll: 'read' }, keys: { stripe: 'write', bank: 'write', code: 'read' } })).toEqual([])
})

it('finds nothing short in a set that covers every app and every skill', () => {
  const all: AccessSet = { apps: { hello: 'write', tips: 'write', payroll: 'write', orders: 'write', customers: 'write' }, keys: { stripe: 'write', maps: 'read', bank: 'write', code: 'read' } }
  expect(gaps(status, all)).toEqual([])
  expect([refund, weekly, install].map(skill => covers(all, skill))).toEqual([true, true, true])
  expect(summary(status, all)).toEqual({ line: '5 apps, 4 keys', gaps: 0 })
  // One area lowered, and the skill that changes things there waits again.
  const lowered: AccessSet = { ...all, apps: { ...all.apps, orders: 'read' } }
  expect(covers(lowered, refund)).toBe(false); expect(said(lowered)).toEqual(['Refund a customer: Orders Look up & change'])
})

it('labels the areas and the levels a set holds, in the order they are shown', () => {
  // An area with no screen says so; an area at None has no label.
  expect(reachLabels(status, { customers: 'read', hello: 'write', tips: null })).toEqual(['Hello Look up & change', 'Customers Look up · No screen'])
  expect(reachLabels(status, {})).toEqual([])
  expect(levelLabels(status, { cloudflare: 'read', stripe: 'write', maps: null })).toEqual(['Stripe Read & write', 'Cloudflare Read'])
  expect(levelLabels(status, {})).toEqual([])
  expect(levelLabel('Bank', 'read')).toBe('Bank Read')
})

it('sums a set up for one line of a list: how many apps and keys, and how many of its apps and skills can not do their job yet', () => {
  expect([count(1, 'app'), count(2, 'app'), count(0, 'key'), count(1, 'person', 'people'), count(3, 'person', 'people')]).toEqual(['1 app', '2 apps', '0 keys', '1 person', '3 people'])
  // No apps, one app, several apps and keys.
  expect(summary(status, NOTHING)).toEqual({ line: 'No apps', gaps: 0 })
  expect(summary(status, { apps: { payroll: 'read' }, keys: {} })).toEqual({ line: '1 app', gaps: 0 })
  expect(summary(status, { apps: { hello: 'write', tips: 'read', payroll: 'read' }, keys: { stripe: 'write', maps: 'read', cloudflare: 'read' } })).toEqual({ line: '3 apps, 3 keys', gaps: 0 })
  // A set with a gap: Hello changes things with Stripe and holds Read. With no level at all, both apps wait.
  expect(summary(status, { apps: { hello: 'write', tips: 'read' }, keys: { stripe: 'read', maps: 'read' } })).toEqual({ line: '2 apps, 2 keys', gaps: 1 })
  expect(summary(status, { apps: { tips: 'read', hello: 'read' }, keys: {} })).toEqual({ line: '2 apps', gaps: 2 })
  // A skill that waits counts too, alone or beside an app: an area with no screen counts as an app.
  expect(summary(status, { apps: { customers: 'read', payroll: 'read' }, keys: {} })).toEqual({ line: '2 apps', gaps: 1 })
  expect(summary(status, { apps: { orders: 'read', customers: 'read', payroll: 'read' }, keys: { spare: 'read', stripe: null } })).toEqual({ line: '3 apps, 1 key', gaps: 3 })
  // A key no app needs still counts; a key at None, an area at None and an area that is no longer built do not.
  expect(summary(status, { apps: { retired: 'write', hello: null }, keys: { spare: 'read', stripe: null } })).toEqual({ line: 'No apps, 1 key', gaps: 0 })
})

it('knows when a set is back where it started, whatever the order of its lines and a level at None', () => {
  const start: AccessSet = { apps: { hello: 'read', tips: 'write' }, keys: { stripe: 'read' } }
  expect(sameSet(start, { apps: { tips: 'write', orders: null, hello: 'read' }, keys: { maps: null, stripe: 'read' } })).toBe(true)
  expect(sameSet(NOTHING, { apps: { hello: null }, keys: { stripe: null } })).toBe(true)
  // An area taken away, an area at another level, a key at another level, a key taken away and a key added all differ.
  const moves: AccessSet[] = [{ apps: { hello: 'read' }, keys: start.keys }, { apps: { ...start.apps, hello: 'write' }, keys: start.keys }, { apps: start.apps, keys: { stripe: 'write' } },
    { apps: start.apps, keys: {} }, { apps: start.apps, keys: { ...start.keys, maps: 'read' } }]
  for (const moved of moves) expect(sameSet(start, moved)).toBe(false)
  // An area and a key of one name are not the same line.
  expect(sameSet({ apps: { stripe: 'read' }, keys: {} }, { apps: {}, keys: { stripe: 'read' } })).toBe(false)
})

it('says under an area what it opens: its own screen, and each skill the set can run that calls it', () => {
  // At None an app says nothing, and an area with no screen says only that.
  expect([opensLine(status, NOTHING, orders), opensLine(status, { apps: { orders: null }, keys: {} }, orders), opensLine(status, NOTHING, customers)]).toEqual(['', '', 'no screen'])
  // A held app opens its screen. A skill the set can't run yet is not named.
  expect(opensLine(status, { apps: { orders: 'read' }, keys: { stripe: 'write', code: 'read' } }, orders)).toBe('opens Orders app')
  expect(opensLine(status, { apps: { orders: 'write' }, keys: { stripe: 'write', code: 'read' } }, orders)).toBe('opens Orders app, Refund a customer')
  // An area with no screen opens only skills, and each area a skill calls names it.
  const reads: AccessSet = { apps: { customers: 'read', payroll: 'read' }, keys: { stripe: 'read' } }
  expect([opensLine(status, reads, customers), opensLine(status, reads, payroll)]).toEqual(['no screen · opens Weekly summary', 'opens Payroll app, Weekly summary'])
  expect(opensLine(status, { apps: { customers: 'write' }, keys: { stripe: 'read' } }, customers)).toBe('no screen')
})

it("says under a key which of the set's apps use it, and what it does with no app", () => {
  // Only apps the set holds are named; an app at None is not.
  expect(keyLine(status, { apps: { hello: 'read', tips: null, orders: 'write' }, keys: {} }, stripe)).toBe('used by Hello, Orders')
  expect([keyLine(status, NOTHING, cloudflare), keyLine(status, NOTHING, code)]).toEqual(['look-ups, no app needed', 'installs the project, no app needed'])
  expect(keyLine(status, { apps: { payroll: 'read' }, keys: {} }, { ...cloudflare, usedBy: [{ app: 'payroll', need: 'read' }] })).toBe('used by Payroll · look-ups, no app needed')
  expect([keyLine(status, NOTHING, stripe), keyLine(status, { apps: { hello: 'write' }, keys: {} }, spare)]).toEqual(['', ''])
})

it('says what uses a key, on the Keys view and a key page', () => {
  expect(keyUseLine(status, stripe)).toBe('Used by Hello: look up, change · Tip calculator: look up · Orders: look up, change')
  expect(keyUseLine(status, cloudflare)).toBe('Look-ups, no app needed · Read only')
  expect(keyUseLine(status, { ...cloudflare, usedBy: [{ app: 'payroll', need: 'read' }] })).toBe('Used by Payroll: look up · Look-ups, no app needed · Read only')
  // A name with no built area shows as it is.
  expect(keyUseLine(status, { ...spare, usedBy: [{ app: 'retired', need: 'read' }] })).toBe('Used by retired: look up')
  expect(keyUseLine(status, spare)).toBe('Nothing uses it yet')
  // The list's one line counts the apps and leaves the rest to the key's panel.
  expect(keyUseShort(stripe)).toBe('3 apps')
  expect(keyUseShort(cloudflare)).toBe('Look-ups')
  expect(keyUseShort({ ...cloudflare, usedBy: [{ app: 'payroll', need: 'read' }] })).toBe('1 app · Look-ups')
  expect(keyUseShort(spare)).toBe('Nothing uses it yet')
  // Project code works with no app too, and what it does is not a look-up.
  expect([keyUseLine(status, code), aloneLine(code), aloneLine(cloudflare), aloneLine(spare)])
    .toEqual(['Installs the project, no app needed · Read only', 'installs the project, no app needed', 'look-ups, no app needed', ''])
  expect(keyUseShort(code)).toBe('Installs the project')
})

it('keeps the Keys list line short enough to show whole in its column', () => {
  // The column holds about 30 characters at the narrowest width that still shows one-line rows.
  const apps = Array.from({ length: 12 }, (_, n) => ({ app: `app${n}`, need: 'read' as const }))
  const code = { ...cloudflare, id: 'code', title: 'Project code' }
  const lines = [cloudflare, code].map(alone => keyUseShort({ ...alone, usedBy: apps }))
  expect(lines).toEqual(['12 apps · Look-ups', '12 apps · Installs the project'])
  for (const line of lines) expect(line.length).toBeLessThanOrEqual(30)
})

it('says whether a key is saved, waits for its link, or waits for setup to make it, which no preview can', () => {
  expect([stripe, maps, cloudflare].map(key => keyState(key, 'live'))).toEqual(['Saved', 'Not saved yet', 'One step left'])
  expect([stripe, maps, cloudflare].map(key => keyState(key, 'practice'))).toEqual(['Saved', 'Not saved yet', 'Not on previews yet'])
})

it('names a level for every area and every key as a save sends them: the one held, or what stands for none', () => {
  expect(fill([stripe, maps], { stripe: 'write' }, null)).toEqual({ stripe: 'write', maps: null })
  // Every area is sent, a screen or not, and one not held is sent as None.
  expect(fill(status.areas, { hello: 'read', customers: 'write', tips: null }, null)).toEqual({ hello: 'read', tips: null, payroll: null, orders: null, customers: 'write' })
  // Giving an area gives Read on each of its keys still at None: a level already chosen is kept.
  expect(fill([stripe, maps, bank], { stripe: 'write', maps: null }, 'read')).toEqual({ stripe: 'write', maps: 'read', bank: 'read' })
  expect(fill([], { stripe: 'write' }, null)).toEqual({})
  expect(NOTHING).toEqual({ apps: {}, keys: {} })
})
