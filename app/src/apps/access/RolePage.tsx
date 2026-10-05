import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { Role } from '../../lib/access'
import type { ViewProps } from './address'
import { Confirm } from './Confirm'
import { Field } from './Fields'
import { fill, NOTHING, sameSet, type AccessSet } from './levels'
import { Page } from './Page'
import { SetFields } from './SetFields'
import { holdersLine } from './subjects'
import { View } from './View'

/** One role: a name, its ticks and levels, and who holds it. Without `role`, a new one. */
export function RolePage({ role, ...props }: ViewProps & { role?: Role }) {
  const { status, pending, save } = props
  const [name, setName] = useState(role?.name ?? '')
  const [set, setSet] = useState<AccessSet>(role ?? NOTHING)
  const [removing, setRemoving] = useState<Role | null>(null)
  if (removing) return <View {...props}><Confirm title={`Remove ${removing.name}?`} action="Remove role" pending={pending}
    onConfirm={() => save('roles', { id: removing.id, removed: true })} onCancel={() => setRemoving(null)}>
    Its people keep the access they have now, as their own set.
  </Confirm></View>
  return <Page {...props} name={role?.name ?? 'Add role'} changed={name !== (role?.name ?? '') || !sameSet(set, role ?? NOTHING)} action="Save role"
    onSave={() => save('roles', { id: role?.id, name, apps: set.apps, keys: fill(status.keys, set.keys, null) })}
    extra={role && <Button type="button" variant="outline" onClick={() => setRemoving(role)}>Remove role</Button>}>
    <h2>{role ? 'Change role' : 'Add role'}</h2>
    <Field label="Name"><Input type="text" required maxLength={60} autoFocus={!role} value={name} onChange={event => setName(event.target.value)} /></Field>
    {!role && <Field label="Start from a person"><NativeSelect defaultValue="" onChange={event => setSet(status.people.find(person => person.email === event.target.value) ?? NOTHING)}>
      <NativeSelectOption value="">Nobody</NativeSelectOption>
      {status.people.filter(person => person.status === 'active').map(person => <NativeSelectOption key={person.email}>{person.email}</NativeSelectOption>)}
    </NativeSelect></Field>}
    <SetFields status={status} set={set} onChange={setSet} />
    <p>People: {holdersLine(status, role?.id)}</p>
  </Page>
}
