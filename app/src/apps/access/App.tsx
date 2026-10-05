import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { appAccessSchema, useAccess } from '../../lib/access'
import { AssistantSetup } from '../../components/AssistantSetup'
import { Connect } from './Connect'
import { Owner } from './Owner'
import { Own } from './Own'
import { FinishStep } from './Notices'

// Whoever manages Access gets a page wider than the shared narrow column on a computer, so a table's columns fit.
// It never passes the screen: on a phone it is that column.
const WIDE = 'w-[min(60rem,100vw_-_2rem)] mx-[calc((100%_-_min(60rem,100vw_-_2rem))/2)]'

// The owner manages people, roles, apps and keys, and so does a manager: both find themselves in the People table.
// Everyone else sees what they can use. Connecting an assistant is a button beside the heading that opens a popup;
// someone who manages nothing gets the steps on the page: it is what they came for. The page measures itself, so a
// list's rows stack by the room they have.
export function App() {
  const { data, error, reload } = useAccess('apps', appAccessSchema)
  const manages = !!data && data.state !== 'legacy' && (data.role === 'owner' || !!data.manages)
  return <div className={cn('@container grid gap-4', manages && WIDE)}>
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
      <h1>Access</h1>
      {manages && <Connect />}
    </div>
    {!data && !error && <p role="status">Loading people…</p>}
    {error && <><p role="alert">Access is unavailable.</p><Button type="button" variant="outline" className="justify-self-start" onClick={reload}>Retry</Button></>}
    {data?.state === 'legacy' && <FinishStep><strong>Access setup is not finished.</strong> Everyone who signs in keeps every app. To choose apps per person, ask your assistant:</FinishStep>}
    {data && !manages && <AssistantSetup />}
    {data && data.state !== 'legacy' && (manages ? <Owner /> : <Own apps={data.apps} keys={(data.state === 'current' && data.keys) || []} />)}
  </div>
}
