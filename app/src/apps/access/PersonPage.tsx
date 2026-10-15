import { useState } from 'react'
import { Link } from 'react-router'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { isAdmin, type Person, type Role } from '../../lib/access'
import { at, type ViewProps } from './address'
import { MakeAdmin } from './Confirm'
import { Field } from './Fields'
import { SetLabels } from './Labels'
import { fill, NOTHING, sameSet, ticks, type AccessSet } from './levels'
import { givesProject } from './note'
import { Page } from './Page'
import { SetFields } from './SetFields'
import { signInLine } from './status'
import { offered } from './subjects'

// What a role gives, named as labels: the role itself, opened, is the one place to change it. Admin gives
// everything, so it is said in words.
function RoleSet({ status, role }: Pick<ViewProps, 'status'> & { role: Role }) {
  if (role.builtIn) return <p>Every app and key. Can manage Access. Full trust.</p>
  return <div className="grid gap-2">
    <p>From the {role.name} role:</p>
    <SetLabels status={status} set={role} />
    <Link to={at('roles', role.id)}>Edit the {role.name} role</Link>
  </div>
}

/** One person, opened: sign-in, role, then what it gives, or their own apps and key levels. Without `person`, a new
 *  one. Admin is the owner's to give and take: a save that newly gives it asks first. */
export function PersonPage({ person, ...props }: ViewProps & { person?: Person }) {
  const { status, save } = props
  // Where the fields start: the person as saved, or a new one with nothing.
  const start = { email: person?.email ?? '', role: person?.role ?? '', set: person ?? NOTHING }
  const [email, setEmail] = useState(start.email)
  const [role, setRole] = useState(start.role)
  const [set, setSet] = useState<AccessSet>(start.set)
  // Admin is newly chosen, and the save waits for the owner's yes.
  const [asking, setAsking] = useState(false)
  const held = isAdmin(status, start)
  const chosen = status.roles.find(item => item.id === role)
  // A role is the whole answer: apps and levels are sent only for a person's own set, every app and every key named.
  const access = chosen ? { role } : { role: null, apps: ticks(status, set.apps), keys: fill(status, set.keys) }
  const changed = email !== start.email || role !== start.role || !sameSet(set, start.set)
  // A save that newly gives them the project comes back with a message to send them.
  const send = () => save('people', { email, removed: false, ...access }, givesProject(status, person, { role: role || null, keys: set.keys }) ? { text: 'Saved.', welcome: email } : undefined)
  return <Page {...props} name={person?.email ?? 'Add person'} changed={changed} action="Save access" onSave={chosen?.builtIn && !held ? () => setAsking(true) : send}>
    {asking && <MakeAdmin email={email} pending={props.pending} onConfirm={send} onCancel={() => setAsking(false)} />}
    {person ? <p className="text-muted-foreground">{signInLine(person, status).text}</p>
      : <Field label="Email"><Input type="email" required autoFocus value={email} onChange={event => setEmail(event.target.value)} /></Field>}
    {/* Leaving a role for their own set starts from what that role gave. */}
    {held && !status.viewer.owner ? <p>Admin · only the owner changes this</p>
      : <Field label="Role"><NativeSelect value={role} onChange={event => { setRole(event.target.value); setSet(status.roles.find(item => item.id === event.target.value) ?? set) }}>
        <NativeSelectOption value="">Their own set</NativeSelectOption>
        {offered(status).map(item => <NativeSelectOption key={item.id} value={item.id}>{item.name}</NativeSelectOption>)}
      </NativeSelect></Field>}
    {chosen ? <RoleSet status={status} role={chosen} /> : <SetFields status={status} set={set} onChange={setSet} person={person} />}
  </Page>
}
