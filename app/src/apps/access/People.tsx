import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import type { Person } from '../../lib/access'
import { at, type ViewProps } from './address'
import { Confirm } from './Confirm'
import { SetLabels } from './Labels'
import { dots } from './levels'
import { PersonPage } from './PersonPage'
import { RoleSelect } from './RoleSelect'
import { RowMenu } from './RowMenu'
import { canRetry, signInLine } from './status'
import { Cell, Row, Table } from './Table'
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
  const you = (email: string) => email === viewer && <span className="text-muted-foreground"> You</span>
  return <View {...props}>
    <Table title="People" columns={COLUMNS} actions="Actions"
      add={<Button asChild><Link to={at('people', 'new')}><span aria-hidden="true">+ </span>Add person</Link></Button>}>
      <Row>
        <Cell><span>{status.ownerEmail}</span>{you(status.ownerEmail)}</Cell>
        <Cell className="text-muted-foreground">Can sign in</Cell>
        <Cell>{dots('Owner', !owner && 'picks managers')}</Cell>
        <Cell>Every app and key</Cell>
        <Cell actions />
      </Row>
      {status.people.map(person => {
        const signIn = signInLine(person, status)
        const active = person.status === 'active'
        const page = at('people', person.email)
        return <Row key={person.email} to={page}>
          <Cell><Link to={page}>{person.email}</Link>{you(person.email)}</Cell>
          <Cell className="text-muted-foreground">{signIn.text}</Cell>
          <Cell>{active
            ? <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5"><RoleSelect {...props} person={person} />{person.manager && <span>Manager</span>}</div>
            : 'No role'}</Cell>
          <Cell><div className="grid gap-2"><SetLabels status={status} set={person} /></div></Cell>
          <Cell actions><RowMenu label={`Actions for ${person.email}`}>
            <DropdownMenuItem asChild><Link to={page}>{active ? 'Open' : 'Add back'}</Link></DropdownMenuItem>
            {signIn.unfinished && canRetry(status) && <DropdownMenuItem disabled={pending} onSelect={() => save('retry')}>Try again</DropdownMenuItem>}
            {active && (owner || !person.manager) && <DropdownMenuItem disabled={pending || !!removing} onSelect={() => setRemoving(person)}>Remove</DropdownMenuItem>}
          </RowMenu></Cell>
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
