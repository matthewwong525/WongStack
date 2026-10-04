import type { MiniApp } from '../../lib/apps'
import './AppList.css'

export function AppList({ apps, employee = false }: { apps: MiniApp[]; employee?: boolean }) {
  if (employee && !apps.some(app => app.name !== 'access')) return <div className="app-list-state">
    <p>No business apps assigned. Contact your employer.</p>
    <a href="/apps/access/">Open your assistant setup</a>
  </div>
  if (apps.length === 0) {
    return (
      <div className="app-list-state">
        <p className="app-list-empty-heading">Your next tool starts with a request.</p>
        <p className="app-list-empty-request">Ask in your chat: <q>Make me a tip calculator.</q></p>
      </div>
    )
  }
  return (
    <ul className="app-list">
      {apps.map((app) => (
        <li className="app-list-item" key={app.name}>
          <a className="app-list-link" href={app.href}>
            <span className="app-list-card-heading">
              <strong className="app-list-title">{app.title}</strong>{' '}
              {app.name === 'hello' && <span className="app-list-example">Example</span>}
              <span className="app-list-arrow" aria-hidden="true">→</span>
            </span>{' '}
            <span className="app-list-description">{app.description}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
