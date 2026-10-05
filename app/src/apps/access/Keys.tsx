import { Link } from 'react-router'
import { at, type ViewProps } from './address'
import { KeyPage } from './KeyPage'
import { keyState, keyUseLine } from './levels'
import { FinishStep } from './Notices'
import { levelHolders } from './subjects'
import { View } from './View'

// Every key the app holds: whether it is saved, what uses it, and who has which level. Never its value.
export function Keys(props: ViewProps) {
  const { status, id, view } = props
  const opened = status.keys.find(key => key.id === id)
  if (opened) return <KeyPage key={id} {...props} item={opened} />
  return <View view={view}>
    {!status.keys.length && <><p>No keys saved yet.</p><p>When an app needs a service, your assistant sends a private link for its key. It shows up here.</p></>}
    <ul className="access-people">{status.keys.map(key => <li key={key.id}>
      <div className="access-row-head"><strong>{key.title}</strong><span>{keyState(key)}</span></div>
      {/* Setup makes one key itself, so the owner asks their assistant to finish; any other key comes through its link. */}
      {key.saved ? <><p>{keyUseLine(key)}</p><p>{levelHolders(status, key.id)}</p><Link className="access-button" to={at('keys', key.id)}>Change</Link></>
        : key.setup ? <FinishStep>Look-ups need a read-only key. Ask your assistant:</FinishStep>
        : <><p>{keyUseLine(key)}</p><p>Ask your assistant for the key link</p></>}
    </li>)}</ul>
  </View>
}
