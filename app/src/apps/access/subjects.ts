import type { Level, SavedKey, Skill, Status } from '../../lib/access'
import { count, covers, dots, missing, needLabels } from './levels'

/** The people who hold a role, by email. A role not saved yet has nobody. */
export const holders = (status: Status, role?: string) =>
  status.people.filter(person => person.role === role).map(person => person.email)
export const holdersLine = (status: Status, role?: string) => holders(status, role).join(', ') || 'nobody yet'

/** Everything a tick or a level is given to: each role, then each active person with their own set. */
export const subjects = (status: Status) => [
  ...status.roles.map(role => ({ kind: 'roles' as const, id: role.id, name: role.name, label: dots(role.name, holdersLine(status, role.id)), set: role })),
  ...status.people.filter(person => person.status === 'active' && !person.role)
    .map(person => ({ kind: 'people' as const, id: person.email, name: person.email, label: person.email, set: person })),
]
type Subject = ReturnType<typeof subjects>[number]
// One value per role and per person, shaped as a save names them: roles by id, people by email.
type Each<T> = Record<Subject['kind'], Record<string, T>>

export function each<T>(list: Subject[], value: (subject: Subject) => T): Each<T> {
  const all: Each<T> = { roles: {}, people: {} }
  for (const subject of list) all[subject.kind][subject.id] = value(subject)
  return all
}
export const put = <T>(all: Each<T>, { kind, id }: Subject, value: T): Each<T> => ({ ...all, [kind]: { ...all[kind], [id]: value } })
/** Whether a page's values have moved from where they started. `put` keeps their order, so the text compares. */
export const differs = <T>(start: Each<T>, now: Each<T>) => JSON.stringify(start) !== JSON.stringify(now)

/** The owner has every app and holds every key, so a count of who has something names them first. */
const OWNER = 'Owner'

/** Who has something, counted for one line of a list: `Owner, 1 role, 2 people`, or `Nobody`. */
const tally = (owner: boolean, list: Subject[]) => {
  const of = (kind: Subject['kind']) => list.filter(subject => subject.kind === kind).length
  return [owner && OWNER, of('roles') && count(of('roles'), 'role'), of('people') && count(of('people'), 'person', 'people')].filter(Boolean).join(', ') || 'Nobody'
}

/** Who holds a key at one level: the owner, at the most the key offers, then how many roles and people with their own set. */
export const keyHolders = (status: Status, key: SavedKey, level: Level) =>
  tally(level === (key.levels.includes('write') ? 'write' : 'read'), subjects(status).filter(({ set }) => set.keys[key.id] === level))

/** Who has an area, at any level: the owner, then how many roles and people with their own set. */
export const appHolders = (status: Status, app: string) => tally(true, subjects(status).filter(({ set }) => set.apps[app]))

/** Every role and every person with their own set, each with what they lack of what a skill needs, a label each:
 *  none means they can run it. */
export const runners = (status: Status, skill: Skill) =>
  subjects(status).map(subject => ({ subject, lacking: needLabels(status, missing(subject.set, skill)) }))

/** How many people can run a skill, of everyone who can sign in: `2 of 5`. The owner always can. A person with a
 *  role is judged by the role's set, which is the set they are sent with. */
export function canRun(status: Status, skill: Skill): string {
  const people = status.people.filter(person => person.status === 'active')
  return `${1 + people.filter(person => covers(person, skill)).length} of ${1 + people.length}`
}
