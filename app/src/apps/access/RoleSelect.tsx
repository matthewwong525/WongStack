import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { Person } from '../../lib/access'
import type { ViewProps } from './address'
import { fill } from './levels'

/** A person's role, picked right in their row, in the device's own picker. A pick saves at once, sending the role alone,
 *  and carries what puts the person back: their old role, or their own ticks and levels, filled as their page fills them. */
export function RoleSelect({ status, pending, save, person }: Pick<ViewProps, 'status' | 'pending' | 'save'> & { person: Person }) {
  const who = { email: person.email, removed: false }
  const undo = person.role ? { ...who, role: person.role } : { ...who, role: null, apps: person.apps, keys: fill(status.keys, person.keys, null) }
  return <NativeSelect aria-label={`Role for ${person.email}`} value={person.role ?? ''} disabled={pending} onChange={event => {
    const role = status.roles.find(item => item.id === event.target.value)
    save('people', { ...who, role: role?.id ?? null }, { text: `${person.email} now has ${role?.name ?? 'their own set'}.`, undo })
  }}>
    <NativeSelectOption value="">Own set</NativeSelectOption>
    {status.roles.map(item => <NativeSelectOption key={item.id} value={item.id}>{item.name}</NativeSelectOption>)}
  </NativeSelect>
}
