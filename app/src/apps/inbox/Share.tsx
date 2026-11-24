import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { sharedLink, sharePage, stopSharing } from './api'

/** *Share with team* on the maker's own page; once shared, *Copy link* and *Stop sharing*. `token` is the open link's,
 *  and `onChange` hears the next. wiki/development/plain-pages.md#share-with-team */
export function ShareControls({ id, token, onChange }: { id: string; token: string | null; onChange: (token: string | null) => void }) {
  const [busy, setBusy] = useState(false)
  // What the last tap did, said beside the buttons: the app has no toasts.
  const [said, setSaid] = useState('')
  const act = async (work: () => Promise<string>, failed: string) => {
    setBusy(true)
    try { setSaid(await work()) } catch { setSaid(failed) } finally { setBusy(false) }
  }
  const share = () => act(async () => { onChange(await sharePage(id)); return '' }, 'The page was not shared. Try again.')
  const stop = () => act(async () => { await stopSharing(id); onChange(null); return '' }, 'The link is still on. Try again.')
  const copy = (value: string) => act(async () => { await navigator.clipboard.writeText(sharedLink(value)); return 'Link copied.' },
    'Copy failed. Select the link below to copy it.')
  return <>
    {said && <span role="status" className="text-sm text-muted-foreground">{said}</span>}
    {token === null
      ? <Button type="button" variant="outline" className="ml-auto" disabled={busy} onClick={() => void share()}>Share with team</Button>
      : <>
        <Badge variant="secondary" className="ml-auto">Shared with the team</Badge>
        <Button type="button" variant="outline" onClick={() => void copy(token)}>Copy link</Button>
        <Button type="button" variant="ghost" disabled={busy} onClick={() => void stop()}>Stop sharing</Button>
      </>}
  </>
}

/** The line under the controls once shared: who can open the link, and the link itself. */
export function SharedNote({ token }: { token: string }) {
  return <p className="min-w-0 break-all text-sm text-muted-foreground">
    Anyone who can open the Inbox with the link can open this page: {sharedLink(token)}</p>
}
