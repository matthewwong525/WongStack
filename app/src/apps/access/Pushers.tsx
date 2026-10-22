import { useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { pushersSchema, savePusherEmail, useAccess, type Pusher } from '../../lib/access'
import type { ViewProps } from './address'
import { Cell, Name, Row, Table } from './Table'

const COLUMNS = ['GitHub name', 'Email', 'Sign-in']
const HEADING = 'access-pushers'

/** Why no pusher is listed, or what holds them back: one line each. Null where the rows say it all. */
const LINES: Record<string, ReactNode> = {
  no_github: <><strong>No GitHub key.</strong> Once the app holds the project's GitHub key, people who can push are listed here.</>,
  live_only: <><strong>Live app only.</strong> The live app reads who can push on GitHub.</>,
  not_started: <><strong>Finish Access setup.</strong> Then people who can push on GitHub can open previews.</>,
}

/** One field and Save, for a pusher whose email GitHub doesn't share. */
function EmailField({ pusher, saved }: { pusher: Pusher; saved: () => void }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'saving' | 'failed'>('idle')
  const save = async () => {
    setState('saving')
    try { await savePusherEmail(pusher.githubId, email); saved() } catch { setState('failed') }
  }
  return <form className="flex flex-wrap items-center gap-2" onSubmit={event => { event.preventDefault(); void save() }}>
    <Input type="email" required className="h-8 w-48 max-w-full" aria-label={`Email for @${pusher.login}`} placeholder={`@${pusher.login}'s email`}
      value={email} onChange={event => setEmail(event.target.value)} />
    <Button type="submit" size="sm" disabled={state === 'saving'}>Save</Button>
    {state === 'failed' && <span role="alert" className="text-destructive">That did not save. Try again.</span>}
  </form>
}

/** The People view's section for people who can push on GitHub: they can open previews, never the live app. */
export function Pushers({ view }: Pick<ViewProps, 'view'>) {
  // A failed load hides the section: the people table above is the screen's main thing.
  const { data, reload } = useAccess('pushers', pushersSchema)
  if (!data || data.state === 'not_github') return null
  const line = LINES[data.state]
  const split = data.split !== false
  return <section aria-labelledby={HEADING} className="grid gap-2">
    <div className="flex items-center gap-2"><h2 id={HEADING} className="text-base font-semibold">Can push on GitHub</h2>
      <Badge variant="secondary">{data.pushers.length}</Badge></div>
    <p className="text-muted-foreground">They can open previews, not the live app.</p>
    {line && <p>{line}</p>}
    {!split && <p><strong>Finish Access setup.</strong> Previews share the live app's sign-in until then.</p>}
    {data.state === 'unavailable' && <p className="text-muted-foreground">Couldn't reach GitHub. This is the last list.</p>}
    {data.pushers.length > 0 && <Table view={view} label={HEADING} columns={COLUMNS}>
      {data.pushers.map(pusher => <Row key={pusher.githubId}>
        <Name title={`@${pusher.login}`} />
        <Cell label="Email" className={pusher.email ? 'text-muted-foreground' : 'text-destructive'}>{pusher.email ?? 'Needs an email'}</Cell>
        <Cell label="Sign-in">{pusher.email
          ? <Badge variant="outline">{pusher.canOpenPreviews ? 'Can open previews' : 'Finish Access setup'}</Badge>
          : <EmailField pusher={pusher} saved={reload} />}</Cell>
      </Row>)}
    </Table>}
  </section>
}
