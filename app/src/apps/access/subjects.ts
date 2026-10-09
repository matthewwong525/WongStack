import type { Status } from '../../lib/access'

/** The people who hold a role, by email. A role not saved yet has nobody. */
export const holders = (status: Status, role?: string) =>
  status.people.filter(person => person.role === role).map(person => person.email)
export const holdersLine = (status: Status, role?: string) => holders(status, role).join(', ') || 'nobody yet'
