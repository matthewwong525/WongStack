import { useState } from 'react'
import { Link } from 'react-router'
import type { Person } from '../../lib/access'
import { CopyText } from '../../components/CopyText'
import { at, type ViewProps } from './address'
import { Confirm } from './Confirm'
import { SetLabels } from './Labels'
import { dots } from './levels'
import { Notices } from './Notices'
import { PersonPage } from './PersonPage'
import { canRetry, signInLine } from './status'
import { View } from './View'

// The view that opens first: each person's sign-in status and role, then a label per app and per key level.
// A manager is marked in words beside the role. Only the owner removes one, so a manager sees no Remove there.
export function People(props: ViewProps) {
  const { status, id, view, pending, save, reload } = props
  const { owner } = status.viewer
  const [removing, setRemoving] = useState<Person | null>(null)
  const opened = status.people.find(item => item.email === id)
  if (opened || id === 'new') return <PersonPage key={id} {...props} person={opened} />
  return <View view={view}>
    <Notices status={status} onRetry={reload} />
    {owner && <p className="access-muted">Owner: {status.ownerEmail}</p>}
    <Link className="access-button access-primary" to={at('people', 'new')}>Add person</Link>
    {!status.people.length && <p>No people added yet.</p>}
    <ul className="access-people">{status.people.map(person => {
      const signIn = signInLine(person, status)
      return <li key={person.email}>
        <div className="access-row-head"><strong>{person.email}</strong><span className="access-muted">{signIn.text}</span></div>
        {person.status === 'active' && <>
          <p className="access-muted">{dots(status.roles.find(role => role.id === person.role)?.name ?? 'Own set', person.manager && 'Manager')}</p>
          <SetLabels status={status} set={person} />
        </>}
        <div className="access-actions">
          {signIn.unfinished && canRetry(status) && <button type="button" disabled={pending} onClick={() => save('retry')}>Try again</button>}
          <Link className="access-button" to={at('people', person.email)}>{person.status === 'removed' ? 'Add back' : 'Edit'}</Link>
          {person.status === 'active' && (owner || !person.manager) && <button type="button" disabled={pending || !!removing} onClick={() => setRemoving(person)}>Remove</button>}
        </div>
      </li>
    })}</ul>
    {removing && <Confirm title={`Remove ${removing.email}?`} action="Remove access" pending={pending}
      onConfirm={() => save('people', { email: removing.email, apps: [], removed: true })} onCancel={() => setRemoving(null)}>
      {status.environment === 'live'
        ? "They are blocked at once. Everyone is signed out and signs in again. This can't be undone. Access to the project code is removed separately, where it was given."
        : 'They leave the practice list. The real sign-in list is not touched.'}
      {removing.manager && ' They stop managing Access too.'}
    </Confirm>}
    <CopyText text={status.origin} label="Copy app link" />
  </View>
}
