import { useState } from 'react'
import { Link } from 'react-router'
import type { Person } from '../../lib/access'
import { CopyText } from '../../components/CopyText'
import { at, type ViewProps } from './address'
import { Confirm } from './Confirm'
import { dots, levelsLine } from './levels'
import { Notices } from './Notices'
import { PersonPage } from './PersonPage'
import { appsLine, canRetry, signInLine } from './status'
import { View } from './View'

// The view that opens first: each person's role and sign-in status, then their apps and key levels.
export function People(props: ViewProps) {
  const { status, id, view, pending, save, reload } = props
  const [removing, setRemoving] = useState<Person | null>(null)
  const opened = status.people.find(item => item.email === id)
  if (opened || id === 'new') return <PersonPage key={id} {...props} person={opened} />
  return <View view={view}>
    <Notices status={status} onRetry={reload} />
    <Link className="access-button access-primary" to={at('people', 'new')}>Add person</Link>
    {!status.people.length && <p>No people added yet.</p>}
    <ul className="access-people">{status.people.map(person => {
      const signIn = signInLine(person, status)
      return <li key={person.email}>
        <strong>{person.email}</strong>
        <p>{dots(status.roles.find(role => role.id === person.role)?.name, signIn.text)}</p>
        {person.status === 'active' && <p>{dots(appsLine(person, status), levelsLine(status, person.keys))}</p>}
        <div className="access-actions">
          {signIn.unfinished && canRetry(status) && <button type="button" disabled={pending} onClick={() => save('retry')}>Try again</button>}
          <Link className="access-button" to={at('people', person.email)}>{person.status === 'removed' ? 'Add back' : 'Edit'}</Link>
          {person.status === 'active' && <button type="button" disabled={pending || !!removing} onClick={() => setRemoving(person)}>Remove</button>}
        </div>
      </li>
    })}</ul>
    {removing && <Confirm title={`Remove ${removing.email}?`} action="Remove access" pending={pending}
      onConfirm={() => save('people', { email: removing.email, apps: [], removed: true })} onCancel={() => setRemoving(null)}>
      {status.environment === 'live'
        ? "They are blocked at once. Everyone is signed out and signs in again. This can't be undone. Access to the project code is removed separately, where it was given."
        : 'They leave the practice list. The real sign-in list is not touched.'}
    </Confirm>}
    <CopyText text={status.origin} label="Copy app link" />
  </View>
}
