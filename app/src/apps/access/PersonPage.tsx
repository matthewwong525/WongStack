import { useState } from 'react'
import { Link } from 'react-router'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { Person, Role } from '../../lib/access'
import { at, type ViewProps } from './address'
import { Field, Group, Tick } from './Fields'
import { SetLabels } from './Labels'
import { fill, NOTHING, sameSet, type AccessSet } from './levels'
import { Page } from './Page'
import { SetFields } from './SetFields'
import { signInLine } from './status'

// What a role gives, named as labels: the role itself, opened, is the one place to change it.
function RoleSet({ status, role }: Pick<ViewProps, 'status'> & { role: Role }) {
  return <div className="grid gap-2">
    <p>From the {role.name} role:</p>
    <SetLabels status={status} set={role} />
    <Link to={at('roles', role.id)}>Edit the {role.name} role</Link>
  </div>
}

/** Who manages Access is the owner's own choice: the tick, and what it means right under it, at full weight. */
function Managing({ manager, onChange }: { manager: boolean; onChange: (manager: boolean) => void }) {
  return <Group legend="Managing">
    <Tick checked={manager} onChange={onChange}>Can manage Access</Tick>
    <p>Full trust. A manager can add and remove people and give anyone, themselves included, any app or key level.</p>
  </Group>
}

/** One person, opened: whether they can sign in, their role, then what it gives by name, or their own set in its
 *  three parts, then whether they manage Access. Without `person`, a new one. */
export function PersonPage({ person, ...props }: ViewProps & { person?: Person }) {
  const { status, save } = props
  // Where the fields start: the person as saved, or a new one with nothing.
  const start = { email: person?.email ?? '', role: person?.role ?? '', set: person ?? NOTHING, manager: person?.manager ?? false }
  const [email, setEmail] = useState(start.email)
  const [role, setRole] = useState(start.role)
  const [set, setSet] = useState<AccessSet>(start.set)
  const [manager, setManager] = useState(start.manager)
  const { owner } = status.viewer
  const chosen = status.roles.find(item => item.id === role)
  // A role is the whole answer: levels are sent only for a person's own set, one for every area and every key.
  const access = chosen ? { role } : { role: null, apps: fill(status.areas, set.apps, null), keys: fill(status.keys, set.keys, null) }
  const changed = email !== start.email || role !== start.role || !sameSet(set, start.set) || manager !== start.manager
  // Only the owner picks managers, and only a changed tick is sent: left out, the person keeps what they have.
  const picked = owner && manager !== start.manager && { manager }
  return <Page {...props} name={person?.email ?? 'Add person'} changed={changed} action="Save access" onSave={() => save('people', { email, removed: false, ...access, ...picked })}>
    {person ? <p className="text-muted-foreground">{signInLine(person, status).text}</p>
      : <Field label="Email"><Input type="email" required autoFocus value={email} onChange={event => setEmail(event.target.value)} /></Field>}
    {!owner && start.manager && <p>Manager · only the owner changes this</p>}
    {/* Leaving a role for their own set starts from what that role gave. */}
    <Field label="Role"><NativeSelect value={role} onChange={event => { setRole(event.target.value); setSet(status.roles.find(item => item.id === event.target.value) ?? set) }}>
      <NativeSelectOption value="">Their own set</NativeSelectOption>
      {status.roles.map(item => <NativeSelectOption key={item.id} value={item.id}>{item.name}</NativeSelectOption>)}
    </NativeSelect></Field>
    {chosen ? <RoleSet status={status} role={chosen} /> : <>
      <SetFields status={status} set={set} onChange={setSet} />
      <p>A new person starts with no apps.</p>
    </>}
    {owner && <Managing manager={manager} onChange={setManager} />}
  </Page>
}
