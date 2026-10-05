import { Link } from 'react-router'
import { at, type ViewProps } from './address'
import { KeyPage } from './KeyPage'
import { Labels } from './Labels'
import { keyState, keyUseLine, levelName } from './levels'
import { FinishStep } from './Notices'
import { holdersByLevel } from './subjects'
import { View } from './View'

// Every key the app holds: whether it is saved, what uses it, and who has it, a line per level. Never its value.
export function Keys(props: ViewProps) {
  const { status, id, view } = props
  const opened = status.keys.find(key => key.id === id)
  if (opened) return <KeyPage key={id} {...props} item={opened} />
  return <View view={view}>
    {!status.keys.length && <><p>No keys saved yet.</p><p>When an app needs a service, your assistant sends a private link for its key. It shows up here.</p></>}
    <ul className="access-people">{status.keys.map(key => {
      const held = holdersByLevel(status, key.id)
      return <li key={key.id}>
        <div className="access-row-head"><strong>{key.title}</strong><span className="access-muted">{keyState(key, status.environment)}</span></div>
        {/* Setup makes one key itself, so on the live app the owner asks their assistant to finish; any other key comes through its link. */}
        {key.saved ? <>
          <p>{keyUseLine(key)}</p>
          {held.map(({ level, names }) => <Labels key={level} title={levelName(level)} items={names} />)}
          {!held.length && <p>Nobody yet</p>}
          <Link className="access-button" to={at('keys', key.id)}>Edit</Link>
        </>
          : key.setup && status.environment === 'live' ? <FinishStep>Look-ups need a read-only key. Ask your assistant:</FinishStep>
          : <><p>{keyUseLine(key)}</p>{!key.setup && <p>Ask your assistant for the key link</p>}</>}
      </li>
    })}</ul>
  </View>
}
