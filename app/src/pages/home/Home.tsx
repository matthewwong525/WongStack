import { Button } from '@/components/ui/button'
import { apps } from '../../lib/apps'
import { AppList } from './AppList'
import { appAccessSchema, useAccess } from '../../lib/access'
import { AssistantSetup } from '../../components/AssistantSetup'
import { Tutorial } from './Tutorial'

// The workspace heading stays when the welcome guide is removed.
export function Home() {
  const { data, error, reload } = useAccess('apps', appAccessSchema)
  const employee = data?.state === 'current' && data.role === 'employee'
  const allowed = data?.state === 'current' ? apps.filter(app => data.apps.includes(app.name)) : apps
  return (
    <>
      <header className="mb-8">
        <h1 className="mb-3 wrap-anywhere">Your workspace, shaped around you</h1>
        <p className="text-muted-foreground">Your tools, in one place.</p>
      </header>
      {data && !employee && <Tutorial />}
      {data && <AssistantSetup className="my-6" />}
      <h2 className="mb-4">Your apps</h2>
      {!data && !error && <p role="status">Loading your apps…</p>}
      {error && <div className="grid justify-items-start gap-3"><p role="alert">Your app access is unavailable.</p><Button type="button" variant="outline" onClick={reload}>Retry apps</Button></div>}
      {data && <AppList apps={allowed} employee={employee} />}
    </>
  )
}
