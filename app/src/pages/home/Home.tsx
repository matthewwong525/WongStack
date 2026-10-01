import { apps } from '../../lib/apps'
import { AppList } from './AppList'
import { Tutorial } from './Tutorial'
import './Home.css'

// The workspace heading stays when the welcome guide is removed.
export function Home() {
  return (
    <>
      <header className="home-heading">
        <h1 className="home-title">Your workspace, shaped around you</h1>
        <p className="home-description">Your tools, in one place.</p>
      </header>
      <Tutorial />
      <h2 className="home-apps-heading">Your apps</h2>
      <AppList apps={apps} />
    </>
  )
}
