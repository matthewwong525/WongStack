import { useState } from 'react'
import { Link } from 'react-router'
import type { Person, Role } from '../../lib/access'
import { appTitle } from '../../lib/apps'
import { at, type ViewProps } from './address'
import { dots, fill, levelsLine, NOTHING, shortLine, type AccessSet } from './levels'
import { Page } from './Page'
import { SetFields } from './SetFields'
import { signInLine } from './status'

// What a role gives, as text: the role's own page is the one place to change it.
function RoleSet({ status, role }: Pick<ViewProps, 'status'> & { role: Role }) {
  const lines = [...role.apps.map(app => dots(appTitle(app), shortLine(status, app, role.keys))),
    role.apps.length ? '' : 'No apps', levelsLine(status, role.keys)].filter(Boolean)
  return <div>
    <p>From the {role.name} role:</p>
    <ul>{lines.map(line => <li key={line}>{line}</li>)}</ul>
    <Link to={at('roles', role.id)}>Edit the {role.name} role</Link>
  </div>
}

/** One person: their role first, then what it gives, or their own ticks and levels. Without `person`, a new one. */
export function PersonPage({ status, view, pending, save, person }: ViewProps & { person?: Person }) {
  const [email, setEmail] = useState(person?.email ?? '')
  const [role, setRole] = useState(person?.role ?? '')
  const [set, setSet] = useState<AccessSet>(person ?? NOTHING)
  const chosen = status.roles.find(item => item.id === role)
  // A role is the whole answer: ticks and levels are sent only for a person's own set.
  const access = chosen ? { role } : { role: null, apps: set.apps, keys: fill(status.keys, set.keys, null) }
  return <Page view={view} pending={pending} action="Save access" onSave={() => save('people', { email, removed: false, ...access })}>
    {person ? <h2>{person.email} · {signInLine(person, status).text}</h2> : <>
      <h2>Add person</h2>
      <label>Email<input type="email" required autoFocus value={email} onChange={event => setEmail(event.target.value)} /></label>
    </>}
    {/* Leaving a role for their own set starts from what that role gave. */}
    <label>Role<select value={role} onChange={event => { setRole(event.target.value); setSet(status.roles.find(item => item.id === event.target.value) ?? set) }}>
      <option value="">Their own set</option>
      {status.roles.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
    {chosen ? <RoleSet status={status} role={chosen} /> : <>
      <SetFields status={status} set={set} unused="nothing of theirs uses it yet" onChange={setSet} />
      <p>A new person starts with no apps. Project code is shared separately.</p>
    </>}
  </Page>
}
