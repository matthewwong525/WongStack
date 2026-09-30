import { use } from 'react'
import type { MiniApp } from '../../lib/apps'
import './AppList.css'

export function AppList({ apps }: { apps: Promise<MiniApp[] | null> }) {
  const list = use(apps)

  if (list === null) {
    return <p className="app-list-state">Your apps could not load. Reload the page to try again.</p>
  }
  if (list.length === 0) {
    return (
      <div className="app-list-state">
        <p className="app-list-empty-heading">Your next tool starts with a request.</p>
        <p className="app-list-empty-request">Ask in your chat: <q>Make me a tip calculator.</q></p>
      </div>
    )
  }
  return (
    <ul className="app-list">
      {list.map((app) => (
        <li className="app-list-item" key={app.name}>
          <a className="app-list-link" href={app.href}>
            <span className="app-list-card-heading">
              <strong className="app-list-title">{app.title}</strong>
              {app.name === 'hello' && <span className="app-list-example">Example</span>}
              <span className="app-list-arrow" aria-hidden="true">→</span>
            </span>
            <span className="app-list-description">{app.description}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
