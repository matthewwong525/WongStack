import type { Level, SavedKey, Status } from '../../lib/access'
import { appTitle } from '../../lib/apps'

/** A set of apps and key levels as a page edits it: a key at None is null, or left out. */
export type AccessSet = { apps: string[]; keys: Record<string, Level | null> }
export const NOTHING: AccessSet = { apps: [], keys: {} }

const LEVEL = { read: 'Read', write: 'Read & write' }
// What an app does with a key, in the words of the level table: look up, change.
const NEED = { read: 'look up', write: 'look up, change' }

/** A level as the screens name it. */
export const levelName = (level: Level | null) => level ? LEVEL[level] : 'None'
/** The parts of one line, the empty ones left out. */
export const dots = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' · ')
export const capital = (text: string) => text[0].toUpperCase() + text.slice(1)

/** The keys an app uses, each with the most the app does with it. */
export const appUses = (status: Status, app: string) =>
  status.keys.flatMap(key => key.usedBy.filter(use => use.app === app).map(use => ({ key, need: use.need })))

/** `uses Stripe: look up, change`, or `uses no keys`. */
export const usesLine = (status: Status, app: string) =>
  `uses ${dots(...appUses(status, app).map(({ key, need }) => `${key.title}: ${NEED[need]}`)) || 'no keys'}`

/** `uses Stripe, Bank` beside an app's tick, or `uses no keys`. */
export const usesShort = (status: Status, app: string) =>
  `uses ${appUses(status, app).map(({ key }) => key.title).join(', ') || 'no keys'}`

/** What a held level leaves an app short of with one key: `none` can't use it, `read` can't change things. */
const lack = (need: Level, held?: Level | null) => !held ? 'none' : held === 'read' && need === 'write' ? 'read' : null

/** What a set can't do yet in an app it has: one plain line per key held below what the app does. */
export const shortLine = (status: Status, app: string, keys: AccessSet['keys']) => dots(...new Set(appUses(status, app).map(({ key, need }) =>
  ({ none: `can't use ${key.title} yet`, read: 'can look up, not change', ok: '' })[lack(need, keys[key.id]) ?? 'ok'])))

/** Under a level beside an app: what the app can't do yet, and the level that fixes it. */
export const hint = (app: string, key: SavedKey, need: Level, held?: Level | null) =>
  ({ none: `${appTitle(app)} can't use ${key.title} yet. Pick Read to let it look things up.`,
    read: `${appTitle(app)} also changes things. Pick Read & write to let it.`, ok: '' })[lack(need, held) ?? 'ok']

/** `Hello can look up, not change`: one line per app of a set that can't do its job yet. */
export const gaps = (status: Status, set: AccessSet) => set.apps.flatMap(app => {
  const short = shortLine(status, app, set.keys)
  return short ? [`${appTitle(app)} ${short}`] : []
})

/** `Stripe Read`: a key and its level as one label. */
export const levelLabel = (title: string, level: Level) => `${title} ${levelName(level)}`

/** One label per key a set holds a level for, in the order the keys are shown. */
export const levelLabels = (status: Status, keys: AccessSet['keys']) => status.keys.flatMap(key => {
  const level = keys[key.id]
  return level ? [levelLabel(key.title, level)] : []
})

/** Whether two sets give the same thing: the order of ticks, and a key at None, change nothing. */
export const sameSet = (one: AccessSet, other: AccessSet) => {
  const text = ({ apps, keys }: AccessSet) => JSON.stringify([[...apps].sort(), Object.entries(keys).filter(([, level]) => level).sort()])
  return text(one) === text(other)
}

/** What uses a key, for the Keys view and a key's page. */
export function keyUseLine(key: SavedKey): string {
  const by = dots(...key.usedBy.map(use => `${appTitle(use.app)}: ${NEED[use.need]}`))
  return dots(by && `Used by ${by}`, key.alone && 'Look-ups, no app needed', !by && !key.alone && 'Nothing uses it yet',
    !key.levels.includes('write') && 'Read only')
}

/** Setup makes some keys itself, for the live app: no step can finish one on a preview. The others arrive through a private link. */
export const keyState = (key: SavedKey, environment: Status['environment']) =>
  key.saved ? 'Saved' : !key.setup ? 'Not saved yet' : environment === 'live' ? 'One step left' : 'Not on previews yet'

/** A level for each of `keys`: the one held, or `none`. */
export const fill = (keys: SavedKey[], held: AccessSet['keys'], none: Level | null): AccessSet['keys'] =>
  Object.fromEntries(keys.map(key => [key.id, held[key.id] ?? none]))

/** A set after a tick. Ticking an app gives Read on each key it uses that is at None, never Read & write. */
export const ticked = (status: Status, set: AccessSet, app: string, on: boolean): AccessSet => on
  ? { apps: [...set.apps, app], keys: { ...set.keys, ...fill(appUses(status, app).map(use => use.key), set.keys, 'read') } }
  : { ...set, apps: set.apps.filter(item => item !== app) }
