import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { isAdmin, type Person, type Role } from '../../lib/access'
import type { ViewProps } from './address'
import { fill, ticks } from './levels'
import { givesProject } from './note'
import { offered } from './subjects'

/** A person's role, picked in their row, in the device's own picker. A pick saves at once, sending the role alone,
 *  and carries the undo. Admin is the owner's to give: picking it hands the save to `ask`, which asks first. */
export function RoleSelect({ status, pending, save, person, ask }: Pick<ViewProps, 'status' | 'pending' | 'save'> & { person: Person; ask: (give: () => void) => void }) {
  const roles = offered(status)
  if (isAdmin(status, person) && !status.viewer.owner) return <>Admin</>
  const who = { email: person.email, removed: false }
  const undo = person.role ? { ...who, role: person.role } : { ...who, role: null, apps: ticks(status, person.apps), keys: fill(status, person.keys) }
  // A pick that newly gives them the project also opens the message to send them.
  const give = (role?: Role) => save('people', { ...who, role: role?.id ?? null }, { text: `${person.email} now has ${role?.name ?? 'their own set'}.`, undo,
    welcome: givesProject(status, person, { role: role?.id ?? null, keys: person.keys }) ? person.email : undefined })
  return <NativeSelect aria-label={`Role for ${person.email}`} value={person.role ?? ''} disabled={pending} onChange={event => {
    const role = roles.find(item => item.id === event.target.value)
    if (role?.builtIn) ask(() => give(role))
    else give(role)
  }}>
    <NativeSelectOption value="">Own set</NativeSelectOption>
    {roles.map(item => <NativeSelectOption key={item.id} value={item.id}>{item.name}</NativeSelectOption>)}
  </NativeSelect>
}
