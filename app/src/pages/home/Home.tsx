import { Button } from '@/components/ui/button'
import { apps } from '../../lib/apps'
import { AppList } from './AppList'
import { appAccessSchema, useAccess } from '../../lib/access'
import { Tutorial } from './Tutorial'

// The workspace heading stays when the welcome guide is removed.
export function Home() {
  const { data, error, reload } = useAccess('apps', appAccessSchema)
  // Once per-app permissions have started, an employee sees every app, with the ones they lack greyed;
  // the employer's list is the catalogue. Before that, everyone holds every app.
  const current = data?.state === 'current' ? data : undefined
  const held = current?.role === 'employee' ? current.apps : undefined
  const listed = current && !held ? apps.filter(app => current.apps.includes(app.name)) : apps
  return (
    <>
      <header className="mb-8">
        <h1 className="mb-3 wrap-anywhere">Your workspace, shaped around you</h1>
        <p className="text-muted-foreground">Your tools, in one place.</p>
      </header>
      {data && !held && <Tutorial />}
      <h2 className="mb-4">Your apps</h2>
      {!data && !error && <p role="status">Loading your apps…</p>}
      {error && <div className="grid justify-items-start gap-3"><p role="alert">Your app access is unavailable.</p><Button type="button" variant="outline" onClick={reload}>Retry apps</Button></div>}
      {data && <AppList apps={listed} held={held} code={data.code} />}
    </>
  )
}
