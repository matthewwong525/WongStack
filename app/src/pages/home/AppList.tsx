import { useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ConnectDialog } from '../../components/ConnectDialog'
import type { MiniApp } from '../../lib/apps'

// A card that is a button fills its box, so the whole card takes the press.
const PRESS = 'flex w-full flex-col gap-2 rounded-xl px-6 py-4 text-left'

// What a card says: its title, then a label or an arrow, and one line under them.
function Face({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <>
    <span className="flex items-baseline gap-2">
      <strong className="min-w-0 flex-1 wrap-anywhere">{title}</strong>{' '}
      {children}
    </span>{' '}
    <span className="block text-muted-foreground wrap-anywhere">{description}</span>
  </>
}
const arrow = <span aria-hidden="true">→</span>

// An app the person lacks: greyed and labelled, so it is not marked by colour alone. The keyboard still reaches it.
// A press opens nothing and sends nothing; it says who to ask, under the card.
function Lacked({ app, asked, onAsk }: { app: MiniApp; asked: boolean; onAsk: () => void }) {
  return <>
    <Card className="bg-muted/40 p-0 shadow-none">
      <button type="button" aria-disabled="true" className={`${PRESS} cursor-not-allowed text-muted-foreground`} onClick={onAsk}>
        <Face title={app.title} description={app.description}><Badge variant="outline">No access</Badge></Face>
      </button>
    </Card>
    {asked && <p role="status" className="mt-2 text-sm wrap-anywhere">Ask your admin for access to {app.title}.</p>}
  </>
}

// The workspace's apps, each card one link. With `held`, the apps an employee holds once per-app permissions have
// started, every other app shows greyed. The last card connects an assistant, for every signed-in person.
export function AppList({ apps, held }: { apps: MiniApp[]; held?: string[] }) {
  const [asked, setAsked] = useState('')
  const lacks = (app: MiniApp) => !!held && !held.includes(app.name)
  // Access is everyone's, so it is not a business app.
  const unassigned = !!held && apps.every(app => app.name === 'access' || lacks(app))
  return (
    <>
      {unassigned && <p className="mb-4 text-muted-foreground">No business apps assigned. Contact your employer.</p>}
      {!unassigned && apps.length === 0 && (
        <div className="mb-4 grid gap-2 text-muted-foreground">
          <p className="font-semibold text-foreground">Your next tool starts with a request.</p>
          <p className="select-text">Ask in your chat: <q>Make me a tip calculator.</q></p>
        </div>
      )}
      <ul className="mb-8 grid gap-3">
        {apps.map((app) => (
          <li key={app.name}>
            {lacks(app) ? <Lacked app={app} asked={asked === app.name} onAsk={() => setAsked(app.name)} /> : (
              <a className="block rounded-xl no-underline" href={app.href}>
                <Card className="gap-2 px-6 py-4 transition-colors hover:border-primary">
                  <Face title={app.title} description={app.description}>
                    {app.name === 'hello' && <Badge variant="secondary">Example</Badge>}
                    {arrow}
                  </Face>
                </Card>
              </a>
            )}
          </li>
        ))}
        <li>
          <Card className="p-0 transition-colors hover:border-primary">
            <ConnectDialog>
              <button type="button" className={`${PRESS} cursor-pointer`}>
                <Face title="Connect your assistant" description="Use your apps from your own assistant.">{arrow}</Face>
              </button>
            </ConnectDialog>
          </Card>
        </li>
      </ul>
    </>
  )
}
