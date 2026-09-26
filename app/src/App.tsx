import { Suspense, useState } from 'react'
import { loadApps } from './apps'
import { AppList } from './AppList'
import { Tutorial } from './Tutorial'
import './App.css'

function App() {
  const [apps] = useState(loadApps)

  return (
    <main>
      <h1>Your apps</h1>
      <Suspense fallback={<p>Loading your apps…</p>}>
        <AppList apps={apps} />
      </Suspense>
      <Tutorial />
    </main>
  )
}

export default App
