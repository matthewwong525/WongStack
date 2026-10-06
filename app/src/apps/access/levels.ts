import type { Area, Level, SavedKey, Status } from '../../lib/access'

type Levels = Record<string, Level | null>
/** A set as a page edits it: a level per area, by its folder, and a level per key. None is null, or left out. */
export type AccessSet = { apps: Levels; keys: Levels }
export const NOTHING: AccessSet = { apps: {}, keys: {} }
/** What an app or a skill needs of a set: a level per area and per key. */
export type Needs = { areas: Record<string, Level>; keys: Record<string, Level> }
/** An app or a skill a set has and can't fully use yet: the line that says so, and what would let it. */
export type Gap = { id: string; title: string; line: string; needs: Needs }

const LEVEL = { read: 'Read', write: 'Read & write' }
const REACH = { read: 'Look up', write: 'Look up & change' }
// What an app does with a key, in the words of the level table: look up, change.
const NEED = { read: 'look up', write: 'look up, change' }

/** A key's level as the screens name it. */
export const levelName = (level: Level | null) => level ? LEVEL[level] : 'None'
/** An area's level as the screens name it. */
export const reachName = (level: Level | null) => level ? REACH[level] : 'None'
/** The parts of one line, the empty ones left out. */
export const dots = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' · ')
export const capital = (text: string) => text[0].toUpperCase() + text.slice(1)
/** A number with its word: `1 app`, `2 apps`, `3 people`. */
export const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

const titled = (list: { id: string; title: string }[], id: string) => list.find(item => item.id === id)?.title ?? id
/** An area's title for a person to read; a name with no built area shows as it is. */
export const areaTitle = (status: Status, id: string) => titled(status.areas, id)

/** The keys an app uses, each with the most the app does with it. */
export const appUses = (status: Status, app: string) =>
  status.keys.flatMap(key => key.usedBy.filter(use => use.app === app).map(use => ({ key, need: use.need })))

/** What an app uses, for the Uses column: `Stripe: look up, change`, or `no keys`. */
export const usesWhat = (status: Status, app: string) =>
  dots(...appUses(status, app).map(({ key, need }) => `${key.title}: ${NEED[need]}`)) || 'no keys'

/** `uses Stripe: look up, change`, or `uses no keys`. */
export const usesLine = (status: Status, app: string) => `uses ${usesWhat(status, app)}`

/** Whether a held level falls short of the one needed: Look up & change, like Read & write, covers everything. */
const below = (held: Level | null | undefined, need: Level) => held !== 'write' && held !== need
const short = (held: Levels, needs: Record<string, Level>) => Object.fromEntries(Object.entries(needs).filter(([id, need]) => below(held[id], need)))

/** The part of what something needs that a set does not hold yet. */
export const missing = (set: AccessSet, needs: Needs): Needs => ({ areas: short(set.apps, needs.areas), keys: short(set.keys, needs.keys) })
const nothing = (needs: Needs) => !Object.keys(needs.areas).length && !Object.keys(needs.keys).length
/** Whether a set holds everything something needs. */
export const covers = (set: AccessSet, needs: Needs) => nothing(missing(set, needs))
/** A set raised to what something needs: a level already high enough is never lowered. */
export const raised = (set: AccessSet, needs: Needs): AccessSet => {
  const lacking = missing(set, needs)
  return { apps: { ...set.apps, ...lacking.areas }, keys: { ...set.keys, ...lacking.keys } }
}
/** A line of the one list a set is edited in, for marking what a starting point raised: `app:orders`, `key:stripe`. */
export const lines = (needs: Needs) => [...Object.keys(needs.areas).map(id => `app:${id}`), ...Object.keys(needs.keys).map(id => `key:${id}`)]

/** What choosing an app as a starting point gives: Look up on its area and Read on each key it uses, never more. */
export const appStart = (status: Status, app: string): Needs =>
  ({ areas: { [app]: 'read' }, keys: Object.fromEntries(appUses(status, app).map(({ key }) => [key.id, 'read'])) })
/** What an app needs of its keys to do what its area's level lets it: at Look up it only looks things up. */
const appNeeds = (status: Status, app: string, held: Level): Needs =>
  ({ areas: {}, keys: Object.fromEntries(appUses(status, app).map(({ key, need }) => [key.id, held === 'read' ? 'read' : need])) })

/** `Stripe Read`: a key and its level as one label. */
export const levelLabel = (title: string, level: Level) => `${title} ${levelName(level)}`
/** `Orders Look up & change`: an area and its level as one label. */
export const reachLabel = (title: string, level: Level) => `${title} ${reachName(level)}`
/** A key that offers Read alone is named without it: `Project code`. */
const keyLabel = (status: Status, id: string, level: Level) =>
  status.keys.find(key => key.id === id)?.levels.includes('write') ? levelLabel(titled(status.keys, id), level) : titled(status.keys, id)

/** What something needs, a label each: `Orders Look up & change`, `Stripe Read & write`, `Project code`. */
export const needLabels = (status: Status, needs: Needs) => [
  ...Object.entries(needs.areas).map(([id, level]) => reachLabel(areaTitle(status, id), level)),
  ...Object.entries(needs.keys).map(([id, level]) => keyLabel(status, id, level)),
]

/** What a held level leaves an app short of with one key: `none` can't use it, `read` can't change things. */
const lack = (need: Level, held?: Level | null) => !held ? 'none' : held === 'read' && need === 'write' ? 'read' : null

/** What an app can't do yet with the keys it uses: one plain line per key held below what the app does. */
const shortLine = (status: Status, app: string, keys: Levels, needs: Needs) => dots(...new Set(appUses(status, app).map(({ key }) =>
  ({ none: `can't use ${key.title} yet`, read: 'can look up, not change', ok: '' })[lack(needs.keys[key.id], keys[key.id]) ?? 'ok'])))

/** An app counts once its area is held. Its gap is a key below what the area's level lets the app do. */
const appGaps = (status: Status, set: AccessSet): Gap[] => status.areas.flatMap(({ id, title }) => {
  const held = set.apps[id]
  if (!held) return []
  const needs = appNeeds(status, id, held)
  const line = shortLine(status, id, set.keys, needs)
  return line ? [{ id: `app:${id}`, title, line: `${title} ${line}`, needs }] : []
})

/** A skill counts once every area it calls is held. Its gap is a level, or a key, below what it needs. */
const skillGaps = (status: Status, set: AccessSet): Gap[] => status.skills.flatMap(skill => {
  const areas = Object.keys(skill.areas)
  const lacking = missing(set, skill)
  return areas.length > 0 && areas.every(id => set.apps[id]) && !nothing(lacking)
    ? [{ id: `skill:${skill.id}`, title: skill.title, line: `${skill.title}: ${needLabels(status, lacking).join(', ')}`, needs: skill }] : []
})

/** `Hello can look up, not change`, `Refund a customer: Stripe Read & write`: each app and skill of a set that can't do its job yet. */
export const gaps = (status: Status, set: AccessSet): Gap[] => [...appGaps(status, set), ...skillGaps(status, set)]

/** One label per area a set holds, in the order the areas are shown: an area with no screen says so. */
export const reachLabels = (status: Status, apps: Levels) => status.areas.flatMap(area => {
  const level = apps[area.id]
  return level ? [dots(reachLabel(area.title, level), !area.screen && 'No screen')] : []
})

/** One label per key a set holds a level for, in the order the keys are shown. */
export const levelLabels = (status: Status, keys: Levels) => status.keys.flatMap(key => {
  const level = keys[key.id]
  return level ? [levelLabel(key.title, level)] : []
})

/** What a set comes to on one line of a list: `2 apps, 1 key` or `No apps`, and how many of its apps and skills can't do their job yet. */
export const summary = (status: Status, set: AccessSet) => {
  const apps = reachLabels(status, set.apps).length
  const keys = levelLabels(status, set.keys).length
  return { line: [apps ? count(apps, 'app') : 'No apps', keys > 0 && count(keys, 'key')].filter(Boolean).join(', '), gaps: gaps(status, set).length }
}

const given = ({ apps, keys }: AccessSet) => JSON.stringify([apps, keys].map(levels => Object.entries(levels).filter(([, level]) => level).sort()))
/** Whether two sets give the same thing: the order of the lines, and a level at None, change nothing. */
export const sameSet = (one: AccessSet, other: AccessSet) => given(one) === given(other)

/** What a held area opens, under its level: its own screen, and each skill the set can run that calls it. */
export const opensLine = (status: Status, set: AccessSet, area: Area) => {
  const opened = set.apps[area.id] ? [area.screen && `${area.title} app`,
    ...status.skills.filter(skill => Object.hasOwn(skill.areas, area.id) && covers(set, skill)).map(skill => skill.title)].filter(Boolean).join(', ') : ''
  return dots(!area.screen && 'no screen', opened && `opens ${opened}`)
}

/** What a key that works with no app does: Project code installs the project, any other looks things up. */
const aloneDoes = (key: SavedKey) => key.id === 'code' ? 'installs the project' : 'look-ups'
/** The same for a key that works alone, saying no app is needed: under a key's level, and in an opened key. */
export const aloneLine = (key: SavedKey) => key.alone ? `${aloneDoes(key)}, no app needed` : ''

/** Under a key's level: which of the set's apps use it, and what it does with no app. */
export const keyLine = (status: Status, set: AccessSet, key: SavedKey) => {
  const users = key.usedBy.filter(use => set.apps[use.app]).map(use => areaTitle(status, use.app)).join(', ')
  return dots(users && `used by ${users}`, aloneLine(key))
}

/** What uses a key, for an opened key. */
export function keyUseLine(status: Status, key: SavedKey): string {
  const by = dots(...key.usedBy.map(use => `${areaTitle(status, use.app)}: ${NEED[use.need]}`))
  return dots(by && `Used by ${by}`, key.alone && capital(aloneLine(key)), !by && !key.alone && 'Nothing uses it yet',
    !key.levels.includes('write') && 'Read only')
}

/** The same, short enough for one line of the Keys list: how many apps, not which, and no `no app needed`. The key's panel says the rest. */
export const keyUseShort = (key: SavedKey): string =>
  dots(key.usedBy.length > 0 && count(key.usedBy.length, 'app'), key.alone && capital(aloneDoes(key))) || 'Nothing uses it yet'

/** Setup makes some keys itself, for the live app: no step can finish one on a preview. The others arrive through a private link. */
export const keyState = (key: SavedKey, environment: Status['environment']) =>
  key.saved ? 'Saved' : !key.setup ? 'Not saved yet' : environment === 'live' ? 'One step left' : 'Not on previews yet'

/** A level for each of `list`, as a save names them: the one held, or `none`. */
export const fill = (list: { id: string }[], held: Levels, none: Level | null): Levels =>
  Object.fromEntries(list.map(item => [item.id, held[item.id] ?? none]))
