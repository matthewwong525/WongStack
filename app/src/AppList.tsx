import { use } from 'react'
import type { MiniApp } from './apps'

export function AppList({ apps }: { apps: Promise<MiniApp[] | null> }) {
  const list = use(apps)

  if (list === null) {
    return <p>The list did not load. Reload the page to try again.</p>
  }
  if (list.length === 0) {
    return (
      <p>
        No mini apps yet. Ask the agent: <code>make me a tip calculator</code>
      </p>
    )
  }
  return (
    <ul>
      {list.map((app) => (
        <li key={app.name}>
          <a href={app.href}>
            <strong>{app.title}</strong>
            <span>{app.description}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}
