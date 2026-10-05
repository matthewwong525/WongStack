import { Link } from 'react-router'
import { at, type ViewProps } from './address'
import { dots, levelsLine } from './levels'
import { RolePage } from './RolePage'
import { appsLine } from './status'
import { holdersLine } from './subjects'
import { View } from './View'

// Each role with its apps, its key levels and who holds it.
export function Roles(props: ViewProps) {
  const { status, id, view } = props
  const opened = status.roles.find(item => item.id === id)
  if (opened || id === 'new') return <RolePage key={id} {...props} role={opened} />
  return <View view={view}>
    {!status.roles.length && <><p>No roles yet.</p><p>A role saves a set of apps and key levels to give to several people.</p></>}
    <Link className="access-button access-primary" to={at('roles', 'new')}>Add role</Link>
    <ul className="access-people">{status.roles.map(role => <li key={role.id}>
      <strong>{role.name}</strong>
      <p>{dots(appsLine(role, status), levelsLine(status, role.keys))}</p>
      <p>{status.people.some(person => person.role === role.id) ? holdersLine(status, role.id) : 'Nobody yet'}</p>
      <Link className="access-button" to={at('roles', role.id)}>Change</Link>
    </li>)}</ul>
  </View>
}
