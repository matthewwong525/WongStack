import { appAccessSchema, useAccess } from '../../lib/access'
import { AssistantSetup } from '../../components/AssistantSetup'
import { People } from './People'
import './Access.css'

export function App() {
  const { data, error, reload } = useAccess('apps', appAccessSchema)
  return <div className="access-page">
    <h1>Access</h1>
    {!data && !error && <p role="status">Loading access…</p>}
    {error && <><p role="alert">Your access is unavailable.</p><button type="button" onClick={reload}>Retry access</button></>}
    {data && (data.state === 'current' && data.role === 'employee' ? <AssistantSetup /> : <People />)}
  </div>
}
