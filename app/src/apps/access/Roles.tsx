import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { appTitle } from '../../lib/apps'
import { at, type ViewProps } from './address'
import { Gaps, Names } from './Labels'
import { levelLabels } from './levels'
import { RolePage } from './RolePage'
import { holders } from './subjects'
import { Cell, Row, Table } from './Table'
import { View } from './View'

// Each role with its apps, its key levels and who holds it. The line marked "!" sits under the apps it is about.
export function Roles(props: ViewProps) {
  const { status, id } = props
  const opened = status.roles.find(item => item.id === id)
  if (opened || id === 'new') return <RolePage key={id} {...props} role={opened} />
  return <View {...props}>
    <Table title="Roles" columns={['Role', 'Apps', 'Keys', 'People']}
      add={<Button asChild><Link to={at('roles', 'new')}><span aria-hidden="true">+ </span>Add role</Link></Button>}
      empty={!status.roles.length && <><p>No roles yet.</p><p>A role saves a set of apps and key levels to give to several people.</p></>}>
      {status.roles.map(role => {
        const page = at('roles', role.id)
        return <Row key={role.id} to={page}>
          <Cell><Link to={page}>{role.name}</Link></Cell>
          <Cell><div className="grid gap-2"><Names title="Apps" items={role.apps.map(appTitle)} none="No apps" /><Gaps status={status} set={role} /></div></Cell>
          <Cell label="Keys"><Names title="Keys" items={levelLabels(status, role.keys)} none="No keys" /></Cell>
          <Cell label="People"><Names title="People" items={holders(status, role.id)} none="Nobody yet" /></Cell>
        </Row>
      })}
    </Table>
  </View>
}
