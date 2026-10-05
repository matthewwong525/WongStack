import type { Status } from '../../lib/access'
import { dots, levelName } from './levels'

/** The people who hold a role, by email. A role not saved yet has nobody. */
export const holdersLine = (status: Status, role?: string) =>
  status.people.filter(person => person.role === role).map(person => person.email).join(', ') || 'nobody yet'

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

/** `Sales: Read · kim@shop.com: Read`: who holds a level for a key. */
export const levelHolders = (status: Status, key: string) =>
  dots(...subjects(status).map(({ name, set }) => set.keys[key] && `${name}: ${levelName(set.keys[key])}`)) || 'Nobody yet'

/** `Sales, kim@shop.com`: who has an app. */
export const appHolders = (status: Status, app: string) =>
  subjects(status).filter(({ set }) => set.apps.includes(app)).map(({ name }) => name).join(', ') || 'Nobody yet'
