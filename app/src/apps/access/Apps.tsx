import { at, type ViewProps } from './address'
import { AppAccessPage } from './AppAccessPage'
import { capital, usesWhat } from './levels'
import { appHolders } from './subjects'
import { Cell, Name, Row, Table } from './Table'
import { View } from './View'

// Each area on one line: the keys it uses and how many have it, the owner first. An app has a screen; an area with
// none exists for skills and assistants, says so beside its name, and is given the same way. Opened, it is the quick
// way to give one and the keys it needs. Nothing adds an app by hand, so a quiet line under the list says how one is made.
export function Apps(props: ViewProps) {
  const { status, id } = props
  const opened = status.areas.find(area => area.id === id)
  return <View {...props}>
    <Table view={props.view} columns={['App', 'Uses', 'Who has it']} hint="Ask your assistant to build an app."
      empty={!status.areas.length && <p>No apps built yet. Ask your assistant to make one.</p>}>
      {status.areas.map(area => {
        const page = at('apps', area.id)
        return <Row key={area.id} to={page} current={area === opened}>
          <Name title={area.title} to={page} marks={[!area.screen && 'No screen']} />
          <Cell label="Uses" cut={capital(usesWhat(status, area.id))} />
          <Cell label="Who has it">{appHolders(status, area.id)}</Cell>
        </Row>
      })}
    </Table>
    {opened && <AppAccessPage key={id} {...props} area={opened} />}
  </View>
}
