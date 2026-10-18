import { Button } from '@/components/ui/button'
import { appAccessSchema, useAccess } from '../../lib/access'
import { Owner } from './Owner'
import { Teammate } from './Own'
import { FinishStep } from './Notices'

// The owner and an Admin manage people and roles; everyone else sees what they can use, and everyone has Services.
// The page sets no width or margin of its own; it measures itself, so rows stack by the room they have.
export function App() {
  const { data, error, reload } = useAccess('apps', appAccessSchema)
  const manages = !!data && data.state !== 'legacy' && (data.role === 'owner' || !!data.manages)
  return <div className="@container grid gap-4">
    <h1>Access</h1>
    {!data && !error && <p role="status">Loading people…</p>}
    {error && <><p role="alert">Access is unavailable.</p><Button type="button" variant="outline" className="justify-self-start" onClick={reload}>Retry</Button></>}
    {data?.state === 'legacy' && <FinishStep><strong>Access setup is not finished.</strong> Everyone who signs in keeps every app. To choose apps per person, ask your assistant:</FinishStep>}
    {data && data.state !== 'legacy' && (manages ? <Owner /> : <Teammate apps={data.apps} keys={(data.state === 'current' && data.keys) || []} />)}
  </div>
}
