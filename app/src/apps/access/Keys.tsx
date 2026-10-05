import { Link } from 'react-router'
import type { Level, SavedKey } from '../../lib/access'
import { at, type ViewProps } from './address'
import { KeyPage } from './KeyPage'
import { Names } from './Labels'
import { keyState, keyUseLine, levelName } from './levels'
import { FinishStep } from './Notices'
import { keyHolders } from './subjects'
import { Cell, Row, Table } from './Table'
import { View } from './View'

const LEVELS = ['write', 'read'] satisfies Level[]
const COLUMNS = ['Key', 'Saved', 'Used by', ...LEVELS.map(levelName)]

// Every key the app holds: whether it is saved, what uses it, and who has it, a column per level with the owner
// first. Never its value. A key that is not saved keeps the row's shape and says its next step in the cells.
export function Keys(props: ViewProps) {
  const { status, id } = props
  const opened = status.keys.find(key => key.id === id)
  if (opened) return <KeyPage key={id} {...props} item={opened} />
  // Setup makes one key itself, so on the live app the owner asks their assistant to finish, and a manager is told it is the owner's step; any other key comes through its link.
  const step = (key: SavedKey) => key.setup && status.environment === 'live' ? (status.viewer.owner
    ? <FinishStep plain>Look-ups need a read-only key. Ask your assistant:</FinishStep>
    : <p>Look-ups need a read-only key. {status.ownerEmail} finishes that in Access setup.</p>)
    : <><p>{keyUseLine(key)}</p>{!key.setup && <p>Ask your assistant for the key link</p>}</>
  return <View {...props}>
    <Table title="Keys" columns={COLUMNS} add={<p className="text-sm text-muted-foreground">Your assistant sends a link for a new key</p>}
      empty={!status.keys.length && <><p>No keys saved yet.</p><p>When an app needs a service, your assistant sends a private link for its key. It shows up here.</p></>}>
      {status.keys.map(key => {
        const page = at('keys', key.id)
        const state = <Cell className="text-muted-foreground">{keyState(key, status.environment)}</Cell>
        return key.saved ? <Row key={key.id} to={page}>
          <Cell><Link to={page}>{key.title}</Link></Cell>
          {state}
          <Cell>{keyUseLine(key)}</Cell>
          {LEVELS.map(level => <Cell key={level} label={levelName(level)}><Names title={levelName(level)} items={keyHolders(status, key, level)} none="Nobody" /></Cell>)}
        </Row> : <Row key={key.id}>
          <Cell><span>{key.title}</span></Cell>
          {state}
          <Cell colSpan={3}><div className="grid gap-2">{step(key)}</div></Cell>
        </Row>
      })}
    </Table>
  </View>
}
