import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { at, type ViewProps } from './address'
import { count, summary } from './levels'
import { BuiltInRole, RolePage } from './RolePage'
import { holders } from './subjects'
import { Cell, Name, Row, Table } from './Table'
import { View } from './View'

// Each role on one line: how many apps and keys it gives, and how many people hold it. Admin, the role made for
// you, is first and gives everything: its panel only says so.
export function Roles(props: ViewProps) {
  const { status, id } = props
  const opened = status.roles.find(item => item.id === id)
  return <View {...props} add={<Button asChild><Link to={at('roles', 'new')}><span aria-hidden="true">+ </span>Add role</Link></Button>}>
    <Table view={props.view} columns={['Role', 'Apps and keys', 'People']}>
      {status.roles.map(role => {
        const page = at('roles', role.id)
        const people = holders(status, role.id).length
        return <Row key={role.id} to={page} current={role === opened}>
          <Name title={role.name} to={page} />
          <Cell>{summary(status, role)}</Cell>
          <Cell label="People">{people ? count(people, 'person', 'people') : 'Nobody yet'}</Cell>
        </Row>
      })}
    </Table>
    {opened?.builtIn ? <BuiltInRole {...props} role={opened} /> : (opened || id === 'new') && <RolePage key={id} {...props} role={opened} />}
  </View>
}
