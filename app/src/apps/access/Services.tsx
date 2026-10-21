import type { SavedKey, Status } from '../../lib/access'
import type { ViewProps } from './address'
import { keyRows } from './levels'
import { Cell, Name, Row, Table } from './Table'
import { View } from './View'

/** The quiet lines under a key's state: muted, each on its own line. */
const notes = (key: SavedKey, environment: Status['environment']) => [key.direct && 'also used directly', !key.saved &&
  (environment !== 'live' && key.liveOnly ? 'Live app only' : key.setup ? 'Ask the assistant to finish Access setup' : 'Ask the assistant for its key link')]
  .filter(note => typeof note === 'string')

/** The owner's and an Admin's third view: every key, what it is for and whether it is saved, never its value or a
 *  level. A status list: no button, and no place to type a key. Levels are set where a person or role is opened. */
export function Services(props: ViewProps) {
  const keys = keyRows(props.status.keys)
  return <View {...props}>
    {keys.length ? <Table view={props.view} columns={['Key', 'For', 'State']}>{keys.map(key => <Row key={key.id}>
      <Name title={key.title} />
      <Cell>{key.purpose}{key.docs && <> · <a href={key.docs} target="_blank" rel="noreferrer">API guide</a></>}</Cell>
      <Cell>{key.saved ? 'Saved' : 'Not saved'}{notes(key, props.status.environment).map(note => <span key={note} className="block text-muted-foreground">{note}</span>)}</Cell>
    </Row>)}</Table>
      : <p>No keys yet. Ask the assistant to connect a service; it sends you a private link for the key.</p>}
  </View>
}
