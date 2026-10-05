import { Link } from 'react-router'
import { appTitle } from '../../lib/apps'
import { at, type ViewProps } from './address'
import { AppAccessPage } from './AppAccessPage'
import { Names } from './Labels'
import { capital, usesWhat } from './levels'
import { appHolders } from './subjects'
import { Row, Table } from './Table'
import { View } from './View'

// Each app with the keys it uses and who has it, the owner first: the quick way to give an app and the keys it needs.
export function Apps(props: ViewProps) {
  const { status, id } = props
  if (status.apps.includes(id)) return <AppAccessPage key={id} {...props} app={id} />
  return <View {...props}>
    <Table title="Apps" columns={['App', 'Uses', 'Who has it']} add={<p className="access-muted">Ask your assistant to build an app</p>}
      empty={!status.apps.length && <p>No apps built yet. Ask your assistant to make one.</p>}>
      {status.apps.map(app => {
        const page = at('apps', app)
        return <Row key={app} to={page}>
          <td><Link to={page}>{appTitle(app)}</Link></td>
          <td data-label="Uses">{capital(usesWhat(status, app))}</td>
          <td data-label="Who has it"><Names title="Who has it" items={appHolders(status, app)} /></td>
        </Row>
      })}
    </Table>
  </View>
}
