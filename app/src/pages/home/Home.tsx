import { apps } from '../../lib/apps'
import { AppList } from './AppList'
import { appAccessSchema, useAccess } from '../../lib/access'
import { AssistantSetup } from '../../components/AssistantSetup'
import { Tutorial } from './Tutorial'
import './Home.css'

// The workspace heading stays when the welcome guide is removed.
export function Home() {
  const { data, error, reload } = useAccess('apps', appAccessSchema)
  const employee = data?.state === 'current' && data.role === 'employee'
  const allowed = data?.state === 'current' ? apps.filter(app => data.apps.includes(app.name)) : apps
  return (
    <>
      <header className="home-heading">
        <h1 className="home-title">Your workspace, shaped around you</h1>
        <p className="home-description">Your tools, in one place.</p>
      </header>
      {data && !employee && <Tutorial />}
      {data && <AssistantSetup />}
      <h2 className="home-apps-heading">Your apps</h2>
      {!data && !error && <p role="status">Loading your apps…</p>}
      {error && <><p role="alert">Your app access is unavailable.</p><button type="button" onClick={reload}>Retry apps</button></>}
      {data && <AppList apps={allowed} employee={employee} />}
    </>
  )
}
