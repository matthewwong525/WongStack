import { Suspense, useState } from 'react'
import { loadApps } from '../../lib/apps'
import { AppList } from './AppList'
import { Tutorial } from './Tutorial'

// The home page: the tutorial, then every mini app.
export function Home() {
  const [apps] = useState(loadApps)

  return (
    <>
      <Tutorial />
      <h1>Your apps</h1>
      <Suspense fallback={<p>Loading your apps…</p>}>
        <AppList apps={apps} />
      </Suspense>
    </>
  )
}
