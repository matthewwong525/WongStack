import { useState } from 'react'
import { Link } from 'react-router'
import type { Person, Role } from '../../lib/access'
import { at, type ViewProps } from './address'
import { SetLabels } from './Labels'
import { fill, NOTHING, sameSet, type AccessSet } from './levels'
import { Page } from './Page'
import { SetFields } from './SetFields'
import { signInLine } from './status'

// What a role gives, as labels: the role's own page is the one place to change it.
function RoleSet({ status, role }: Pick<ViewProps, 'status'> & { role: Role }) {
  return <div className="access-own">
    <p>From the {role.name} role:</p>
    <SetLabels status={status} set={role} />
    <Link to={at('roles', role.id)}>Edit the {role.name} role</Link>
  </div>
}

/** Who manages Access is the owner's own choice: the tick, and what it means right under it, at full weight. */
function Managing({ manager, onChange }: { manager: boolean; onChange: (manager: boolean) => void }) {
  return <fieldset className="access-group"><legend>Managing</legend>
    <label className="access-choice"><input type="checkbox" checked={manager} onChange={event => onChange(event.target.checked)} />Can manage Access</label>
    <p>Full trust. A manager can add and remove people and give anyone, themselves included, any app or key level.</p>
  </fieldset>
}

/** One person: their role first, then what it gives, or their own ticks and levels, then whether they manage Access.
 *  Without `person`, a new one. */
export function PersonPage({ person, ...props }: ViewProps & { person?: Person }) {
  const { status, save } = props
  // Where the page starts: the person as saved, or a new one with nothing.
  const start = { email: person?.email ?? '', role: person?.role ?? '', set: person ?? NOTHING, manager: person?.manager ?? false }
  const [email, setEmail] = useState(start.email)
  const [role, setRole] = useState(start.role)
  const [set, setSet] = useState<AccessSet>(start.set)
  const [manager, setManager] = useState(start.manager)
  const { owner } = status.viewer
  const chosen = status.roles.find(item => item.id === role)
  // A role is the whole answer: ticks and levels are sent only for a person's own set.
  const access = chosen ? { role } : { role: null, apps: set.apps, keys: fill(status.keys, set.keys, null) }
  const changed = email !== start.email || role !== start.role || !sameSet(set, start.set) || manager !== start.manager
  // Only the owner picks managers, and only a changed tick is sent: left out, the person keeps what they have.
  const picked = owner && manager !== start.manager && { manager }
  return <Page {...props} name={person?.email ?? 'Add person'} changed={changed} action="Save access" onSave={() => save('people', { email, removed: false, ...access, ...picked })}>
    {person ? <h2>{person.email} · {signInLine(person, status).text}</h2> : <>
      <h2>Add person</h2>
      <label>Email<input type="email" required autoFocus value={email} onChange={event => setEmail(event.target.value)} /></label>
    </>}
    {!owner && start.manager && <p>Manager · only the owner changes this</p>}
    {/* Leaving a role for their own set starts from what that role gave. */}
    <label>Role<select value={role} onChange={event => { setRole(event.target.value); setSet(status.roles.find(item => item.id === event.target.value) ?? set) }}>
      <option value="">Their own set</option>
      {status.roles.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
    {chosen ? <RoleSet status={status} role={chosen} /> : <>
      <SetFields status={status} set={set} onChange={setSet} />
      <p>A new person starts with no apps. Project code is shared separately.</p>
    </>}
    {owner && <Managing manager={manager} onChange={setManager} />}
  </Page>
}
