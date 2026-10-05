import { useState } from 'react'
import { Link } from 'react-router'
import type { Person } from '../../lib/access'
import { at, type ViewProps } from './address'
import { Confirm } from './Confirm'
import { SetLabels } from './Labels'
import { dots } from './levels'
import { PersonPage } from './PersonPage'
import { RoleSelect } from './RoleSelect'
import { RowMenu } from './RowMenu'
import { canRetry, signInLine } from './status'
import { Row, Table } from './Table'
import { View } from './View'

const COLUMNS = ['Person', 'Sign-in', 'Role', 'Apps and keys']

// The view that opens first: one row per person, with the same parts whatever state they are in. The owner is
// the first row, with nothing to change. A role is picked right in the row; the rest of what a row offers sits
// behind its menu. A manager is marked in words beside the role. Only the owner removes one, so a manager's
// menu has no Remove there.
export function People(props: ViewProps) {
  const { status, id, pending, save } = props
  const { owner, email: viewer } = status.viewer
  const [removing, setRemoving] = useState<Person | null>(null)
  const opened = status.people.find(item => item.email === id)
  if (opened || id === 'new') return <PersonPage key={id} {...props} person={opened} />
  const you = (email: string) => email === viewer && <span className="access-muted"> You</span>
  return <View {...props}>
    <Table title="People" columns={COLUMNS} actions="Actions"
      add={<Link className="access-button access-primary" to={at('people', 'new')}><span aria-hidden="true">+ </span>Add person</Link>}>
      <Row>
        <td><span>{status.ownerEmail}</span>{you(status.ownerEmail)}</td>
        <td className="access-muted">Can sign in</td>
        <td>{dots('Owner', !owner && 'picks managers')}</td>
        <td>Every app and key</td>
        <td className="access-row-actions" />
      </Row>
      {status.people.map(person => {
        const signIn = signInLine(person, status)
        const active = person.status === 'active'
        const page = at('people', person.email)
        return <Row key={person.email} to={page}>
          <td><Link to={page}>{person.email}</Link>{you(person.email)}</td>
          <td className="access-muted">{signIn.text}</td>
          <td>{active
            ? <div className="access-role"><RoleSelect {...props} person={person} />{person.manager && <span>Manager</span>}</div>
            : 'No role'}</td>
          <td><div className="access-lines"><SetLabels status={status} set={person} /></div></td>
          <td className="access-row-actions"><RowMenu label={`Actions for ${person.email}`}>
            <Link className="access-button" to={page}>{active ? 'Open' : 'Add back'}</Link>
            {signIn.unfinished && canRetry(status) && <button type="button" disabled={pending} onClick={() => save('retry')}>Try again</button>}
            {active && (owner || !person.manager) && <button type="button" disabled={pending || !!removing} onClick={() => setRemoving(person)}>Remove</button>}
          </RowMenu></td>
        </Row>
      })}
    </Table>
    {status.people.length === 0 && <p>No people added yet.</p>}
    {removing && <Confirm title={`Remove ${removing.email}?`} action="Remove access" pending={pending}
      onConfirm={() => save('people', { email: removing.email, apps: [], removed: true })} onCancel={() => setRemoving(null)}>
      {status.environment === 'live'
        ? "They are blocked at once. Everyone is signed out and signs in again. This can't be undone. Access to the project code is removed separately, where it was given."
        : 'They leave the practice list. The real sign-in list is not touched.'}
      {removing.manager && ' They stop managing Access too.'}
    </Confirm>}
  </View>
}
