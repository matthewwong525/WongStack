import { Link } from 'react-router'
import { appTitle } from '../../lib/apps'
import { at, type ViewProps } from './address'
import { AppAccessPage } from './AppAccessPage'
import { capital, usesLine } from './levels'
import { appHolders } from './subjects'
import { View } from './View'

// Each app with the keys it uses and who has it: the quick way to give an app and the keys it needs.
export function Apps(props: ViewProps) {
  const { status, id, view } = props
  if (status.apps.includes(id)) return <AppAccessPage key={id} {...props} app={id} />
  return <View view={view}>
    {!status.apps.length && <p>No apps built yet. Ask your assistant to make one.</p>}
    <ul className="access-people">{status.apps.map(app => <li key={app}>
      <strong>{appTitle(app)}</strong>
      <p>{capital(usesLine(status, app))}</p>
      <p>{appHolders(status, app)}</p>
      <Link className="access-button" to={at('apps', app)}>Change</Link>
    </li>)}</ul>
  </View>
}
