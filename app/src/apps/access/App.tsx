import { appAccessSchema, useAccess } from '../../lib/access'
import { AssistantSetup } from '../../components/AssistantSetup'
import { People } from './People'
import { FinishStep } from './Notices'
import './Access.css'

// The owner manages people; everyone else sees only their own setup box.
export function App() {
  const { data, error, reload } = useAccess('apps', appAccessSchema)
  return <div className="access-page">
    <h1>Access</h1>
    {!data && !error && <p role="status">Loading people…</p>}
    {error && <><p role="alert">Access is unavailable.</p><button type="button" onClick={reload}>Retry</button></>}
    {data?.state === 'legacy' && <FinishStep><strong>Access setup is not finished.</strong> Everyone who signs in keeps every app. To choose apps per person, ask your assistant:</FinishStep>}
    {data && data.state !== 'legacy' && data.role === 'owner' && <People />}
    {data && <AssistantSetup />}
  </div>
}
