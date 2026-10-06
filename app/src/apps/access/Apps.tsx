import { appTitle } from '../../lib/apps'
import { at, type ViewProps } from './address'
import { AppAccessPage } from './AppAccessPage'
import { capital, usesWhat } from './levels'
import { appHolders } from './subjects'
import { Cell, Name, Row, Table } from './Table'
import { View } from './View'

// Each app on one line: the keys it uses and how many have it, the owner first. Opened, it is the quick way to give
// an app and the keys it needs. Nothing adds an app by hand, so a quiet line under the list says how one is made.
export function Apps(props: ViewProps) {
  const { status, id } = props
  return <View {...props}>
    <Table view={props.view} columns={['App', 'Uses', 'Who has it']} hint="Ask your assistant to build an app."
      empty={!status.apps.length && <p>No apps built yet. Ask your assistant to make one.</p>}>
      {status.apps.map(app => {
        const page = at('apps', app)
        return <Row key={app} to={page} current={app === id}>
          <Name title={appTitle(app)} to={page} />
          <Cell label="Uses" cut={capital(usesWhat(status, app))} />
          <Cell label="Who has it">{appHolders(status, app)}</Cell>
        </Row>
      })}
    </Table>
    {status.apps.includes(id) && <AppAccessPage key={id} {...props} app={id} />}
  </View>
}
