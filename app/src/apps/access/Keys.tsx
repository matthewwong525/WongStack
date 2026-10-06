import type { Level } from '../../lib/access'
import { at, type ViewProps } from './address'
import { KeyPage } from './KeyPage'
import { keyState, keyUseLine, levelName } from './levels'
import { keyHolders } from './subjects'
import { Cell, Name, Row, Table } from './Table'
import { View } from './View'

const LEVELS = ['write', 'read'] satisfies Level[]
const COLUMNS = ['Key', 'Saved', 'Used by', ...LEVELS.map(levelName)]

// Every key the app holds, each on one line: whether it is saved, what uses it, and how many have it, a column per
// level with the owner first. Never its value. A key that is not saved says so in words and opens like any other:
// its next step is in the panel. Nothing adds a key by hand, so a quiet line under the list says how one arrives.
export function Keys(props: ViewProps) {
  const { status, id } = props
  const opened = status.keys.find(key => key.id === id)
  return <View {...props}>
    <Table view={props.view} columns={COLUMNS} hint="Your assistant sends a link for a new key."
      empty={!status.keys.length && <><p>No keys saved yet.</p><p>When an app needs a service, your assistant sends a private link for its key. It shows up here.</p></>}>
      {status.keys.map(key => {
        const page = at('keys', key.id)
        return <Row key={key.id} to={page} current={key === opened}>
          <Name title={key.title} to={page} />
          <Cell className="text-muted-foreground">{keyState(key, status.environment)}</Cell>
          <Cell cut={keyUseLine(key)} />
          {LEVELS.map(level => <Cell key={level} label={levelName(level)}>{keyHolders(status, key, level)}</Cell>)}
        </Row>
      })}
    </Table>
    {opened && <KeyPage key={id} {...props} item={opened} />}
  </View>
}
