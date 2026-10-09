import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import type { Person } from '../../lib/access'
import { at, type ViewProps } from './address'
import { Confirm } from './Confirm'
import { dots, summary } from './levels'
import { PersonPage } from './PersonPage'
import { RoleSelect } from './RoleSelect'
import { RowMenu } from './RowMenu'
import { canRetry, signInLine } from './status'
import { Cell, Name, Row, Table } from './Table'
import { View } from './View'

const COLUMNS = ['Person', 'Sign-in', 'Role', 'Apps and keys']

// The view that opens first: one row per person, each one line with the same parts whatever state they are in.
// The owner is the first row, with nothing to change. You and Manager sit beside the email. A role is picked right
// in the row; the rest of what a row offers sits behind its menu. The last cell counts apps and keys; the names show
// where the person is opened, in the panel beside the list. Only the owner removes a manager, so a manager's menu has
// no Remove there.
export function People(props: ViewProps) {
  const { status, id, pending, save } = props
  const { owner, email: viewer } = status.viewer
  const [removing, setRemoving] = useState<Person | null>(null)
  const opened = status.people.find(item => item.email === id)
  const you = (email: string) => email === viewer && 'You'
  return <View {...props} add={<Button asChild><Link to={at('people', 'new')}><span aria-hidden="true">+ </span>Add person</Link></Button>}>
    <Table view={props.view} columns={COLUMNS} actions="Actions">
      <Row>
        <Name title={status.ownerEmail} marks={[you(status.ownerEmail)]} />
        <Cell className="text-muted-foreground">Can sign in</Cell>
        <Cell>{dots('Owner', !owner && 'picks managers')}</Cell>
        <Cell>Everything</Cell>
        <Cell actions />
      </Row>
      {status.people.map(person => {
        const signIn = signInLine(person, status)
        const active = person.status === 'active'
        const page = at('people', person.email)
        return <Row key={person.email} to={page} current={person === opened}>
          <Name title={person.email} to={page} marks={[you(person.email), person.manager && 'Manager']} />
          <Cell className="text-muted-foreground">{signIn.text}</Cell>
          <Cell>{active ? <RoleSelect {...props} person={person} /> : 'No role'}</Cell>
          <Cell>{summary(status, person)}</Cell>
          <Cell actions><RowMenu label={`Actions for ${person.email}`}>
            <DropdownMenuItem asChild><Link to={page}>{active ? 'Open' : 'Add back'}</Link></DropdownMenuItem>
            {signIn.unfinished && canRetry(status) && <DropdownMenuItem disabled={pending} onSelect={() => save('retry')}>Try again</DropdownMenuItem>}
            {active && (owner || !person.manager) && <DropdownMenuItem disabled={pending} onSelect={() => setRemoving(person)}>Remove</DropdownMenuItem>}
          </RowMenu></Cell>
        </Row>
      })}
    </Table>
    {status.people.length === 0 && <p>No people added yet.</p>}
    {removing && <Confirm title={`Remove ${removing.email}?`} action="Remove access" pending={pending}
      onConfirm={() => save('people', { email: removing.email, removed: true })} onCancel={() => setRemoving(null)}>
      {status.environment === 'live'
        ? "They are blocked at once and can no longer download the project. Everyone is signed out and signs in again. This can't be undone. A copy of the project already on their device stays there. Access given where the project is kept is removed there."
        : 'They leave the practice list. The real sign-in list is not touched.'}
      {removing.manager && ' They stop managing Access too.'}
    </Confirm>}
    {(opened || id === 'new') && <PersonPage key={id} {...props} person={opened} />}
  </View>
}
