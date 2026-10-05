import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { MiniApp } from '../../lib/apps'

// Full-surface links to the workspace's apps: each card is one link.
export function AppList({ apps, employee = false }: { apps: MiniApp[]; employee?: boolean }) {
  if (employee && !apps.some(app => app.name !== 'access')) return <div className="mb-8 grid gap-2 text-muted-foreground">
    <p>No business apps assigned. Contact your employer.</p>
    <a href="/apps/access/">Open your assistant setup</a>
  </div>
  if (apps.length === 0) {
    return (
      <div className="mb-8 grid gap-2 text-muted-foreground">
        <p className="font-semibold text-foreground">Your next tool starts with a request.</p>
        <p className="select-text">Ask in your chat: <q>Make me a tip calculator.</q></p>
      </div>
    )
  }
  return (
    <ul className="mb-8 grid gap-3">
      {apps.map((app) => (
        <li key={app.name}>
          <a className="block rounded-xl no-underline" href={app.href}>
            <Card className="gap-2 px-6 py-4 transition-colors hover:border-primary">
              <span className="flex items-baseline gap-2">
                <strong className="min-w-0 flex-1 wrap-anywhere">{app.title}</strong>{' '}
                {app.name === 'hello' && <Badge variant="secondary">Example</Badge>}
                <span aria-hidden="true">→</span>
              </span>{' '}
              <span className="block text-muted-foreground wrap-anywhere">{app.description}</span>
            </Card>
          </a>
        </li>
      ))}
    </ul>
  )
}
