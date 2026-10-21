import type { Level, SavedKey, Status } from '../../lib/access'

type Levels = Record<string, Level | null>
/** A set as a page edits it: the apps given, by folder, and a level per key. None is null, or left out. */
export type AccessSet = { apps: string[]; keys: Levels }
export const NOTHING: AccessSet = { apps: [], keys: {} }

const LEVEL = { read: 'Read', write: 'Read & write' }

/** A key's level as the screens name it. */
export const levelName = (level: Level | null) => level ? LEVEL[level] : 'None'
/** The parts of one line, the empty ones left out. */
export const dots = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' · ')
/** The keys Services lists: every registered key but the project's own code, which Access gives as its own ticks. */
export const keyRows = (keys: SavedKey[]) => keys.filter(key => key.id !== 'code')
/** A number with its word: `1 app`, `2 apps`, `3 people`. */
export const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** `Stripe Read`: a key and its level as one label. */
export const levelLabel = (title: string, level: Level) => `${title} ${levelName(level)}`

/** The title of each app a set is given, in the order the apps are shown: one that is no longer built has none. */
export const appLabels = (status: Status, apps: string[]) => status.apps.filter(app => apps.includes(app.id)).map(app => app.title)

/** One label per key a set holds a level for, in the order the keys are shown. */
export const levelLabels = (status: Status, keys: Levels) => status.keys.flatMap(key => {
  const level = keys[key.id]
  return level ? [levelLabel(key.title, level)] : []
})

/** What a set comes to on one line of a list: `2 apps, 1 key`, or `No apps`. The built-in role's is `Everything`. */
export const summary = (status: Status, set: AccessSet & { builtIn?: boolean }) => {
  if (set.builtIn) return 'Everything'
  const apps = appLabels(status, set.apps).length
  const keys = levelLabels(status, set.keys).length
  return [apps ? count(apps, 'app') : 'No apps', keys > 0 && count(keys, 'key')].filter(Boolean).join(', ')
}

const given = ({ apps, keys }: AccessSet) => JSON.stringify([[...apps].sort(), Object.entries(keys).filter(([, level]) => level).sort()])
/** Whether two sets give the same thing: the order of the lines, and a level at None, change nothing. */
export const sameSet = (one: AccessSet, other: AccessSet) => given(one) === given(other)

/** Under a key's level, only for a key whose service is set up for it: the level reaches the service itself too. */
export const keyLine = (key: SavedKey) => key.direct ? `Also reaches ${key.title} directly` : ''

/** Setup makes some keys itself, for the live app: no step can finish one on a preview, and a key only the live app
 *  may hold never comes to one. The others come by link. */
export const keyState = (key: SavedKey, environment: Status['environment']) =>
  key.saved ? 'Saved' : environment === 'live' ? (key.setup ? 'One step left' : 'Not saved yet')
    : key.liveOnly ? 'Live app only' : 'Not on previews yet'

/** Each app as a save names it: given, or not. */
export const ticks = (status: Status, apps: string[]) => Object.fromEntries(status.apps.map(app => [app.id, apps.includes(app.id)]))

/** A level for every key, as a save names them: the one held, or none. */
export const fill = (status: Status, held: Levels): Levels => Object.fromEntries(status.keys.map(key => [key.id, held[key.id] ?? null]))
