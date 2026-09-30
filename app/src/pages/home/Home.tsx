import { Suspense, useState } from 'react'
import { loadApps } from '../../lib/apps'
import { AppList } from './AppList'
import { Tutorial } from './Tutorial'
import './Home.css'

// The workspace heading stays when the welcome guide is removed.
export function Home() {
  const [apps] = useState(loadApps)

  return (
    <>
      <header className="home-heading">
        <h1 className="home-title">Your workspace, shaped around you</h1>
        <p className="home-description">Your tools, in one place.</p>
      </header>
      <Tutorial />
      <h2 className="home-apps-heading">Your apps</h2>
      <Suspense fallback={<p className="app-list-state">Loading your apps…</p>}>
        <AppList apps={apps} />
      </Suspense>
    </>
  )
}
