import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { at, type ViewProps } from './address'
import { Summary } from './Labels'
import { count } from './levels'
import { RolePage } from './RolePage'
import { holders } from './subjects'
import { Cell, Name, Row, Table } from './Table'
import { View } from './View'

// Each role on one line: how many apps and keys it gives, whether an app or a skill of it can't do its job yet, and how
// many people hold it. The names show where the role is opened, in the panel beside the list.
export function Roles(props: ViewProps) {
  const { status, id } = props
  const opened = status.roles.find(item => item.id === id)
  return <View {...props} add={<Button asChild><Link to={at('roles', 'new')}><span aria-hidden="true">+ </span>Add role</Link></Button>}>
    <Table view={props.view} columns={['Role', 'Apps and keys', 'People']}
      empty={!status.roles.length && <><p>No roles yet.</p><p>A role saves a set of apps and key levels to give to several people.</p></>}>
      {status.roles.map(role => {
        const page = at('roles', role.id)
        const people = holders(status, role.id).length
        return <Row key={role.id} to={page} current={role === opened}>
          <Name title={role.name} to={page} />
          <Cell><Summary status={status} set={role} /></Cell>
          <Cell label="People">{people ? count(people, 'person', 'people') : 'Nobody yet'}</Cell>
        </Row>
      })}
    </Table>
    {(opened || id === 'new') && <RolePage key={id} {...props} role={opened} />}
  </View>
}
