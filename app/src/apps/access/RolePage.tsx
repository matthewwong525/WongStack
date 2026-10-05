import { useState } from 'react'
import type { Role } from '../../lib/access'
import type { ViewProps } from './address'
import { Confirm } from './Confirm'
import { fill, NOTHING, sameSet, type AccessSet } from './levels'
import { Page } from './Page'
import { SetFields } from './SetFields'
import { holdersLine } from './subjects'

/** One role: a name, its ticks and levels, and who holds it. Without `role`, a new one. */
export function RolePage({ status, view, pending, save, role }: ViewProps & { role?: Role }) {
  const [name, setName] = useState(role?.name ?? '')
  const [set, setSet] = useState<AccessSet>(role ?? NOTHING)
  const [removing, setRemoving] = useState<Role | null>(null)
  if (removing) return <Confirm title={`Remove ${removing.name}?`} action="Remove role" pending={pending}
    onConfirm={() => save('roles', { id: removing.id, removed: true })} onCancel={() => setRemoving(null)}>
    Its people keep the access they have now, as their own set.
  </Confirm>
  return <Page view={view} pending={pending} changed={name !== (role?.name ?? '') || !sameSet(set, role ?? NOTHING)} action="Save role"
    onSave={() => save('roles', { id: role?.id, name, apps: set.apps, keys: fill(status.keys, set.keys, null) })}
    extra={role && <button type="button" onClick={() => setRemoving(role)}>Remove role</button>}>
    <h2>{role ? 'Change role' : 'Add role'}</h2>
    <label>Name<input type="text" required maxLength={60} autoFocus={!role} value={name} onChange={event => setName(event.target.value)} /></label>
    {!role && <label>Start from a person<select defaultValue="" onChange={event => setSet(status.people.find(person => person.email === event.target.value) ?? NOTHING)}>
      <option value="">Nobody</option>
      {status.people.filter(person => person.status === 'active').map(person => <option key={person.email}>{person.email}</option>)}
    </select></label>}
    <SetFields status={status} set={set} onChange={setSet} />
    <p>People: {holdersLine(status, role?.id)}</p>
  </Page>
}
