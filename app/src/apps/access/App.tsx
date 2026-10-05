import { appAccessSchema, useAccess } from '../../lib/access'
import { AssistantSetup } from '../../components/AssistantSetup'
import { Owner } from './Owner'
import { Own } from './Own'
import { FinishStep } from './Notices'
import './Access.css'

// The owner manages people, roles, apps and keys, and so does a manager: both find themselves in the People table.
// Everyone else sees what they can use. Connecting an assistant is a dropdown beside the heading, open for
// someone who manages nothing: it is what they came for.
export function App() {
  const { data, error, reload } = useAccess('apps', appAccessSchema)
  const manages = !!data && data.state !== 'legacy' && (data.role === 'owner' || !!data.manages)
  return <div className={manages ? 'access-page access-wide' : 'access-page'}>
    <div className="access-top">
      <h1>Access</h1>
      {data && <details className="access-connect" open={!manages}><summary>Connect your assistant</summary><AssistantSetup /></details>}
    </div>
    {!data && !error && <p role="status">Loading people…</p>}
    {error && <><p role="alert">Access is unavailable.</p><button type="button" onClick={reload}>Retry</button></>}
    {data?.state === 'legacy' && <FinishStep><strong>Access setup is not finished.</strong> Everyone who signs in keeps every app. To choose apps per person, ask your assistant:</FinishStep>}
    {data && data.state !== 'legacy' && (manages ? <Owner /> : <Own apps={data.apps} keys={(data.state === 'current' && data.keys) || []} />)}
  </div>
}
