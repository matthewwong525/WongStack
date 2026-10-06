import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { setupSchema, useAccess } from '../lib/access'
import { appTitle } from '../lib/apps'
import { CopyText } from './CopyText'

const LINES = 'grid grid-cols-[minmax(0,1fr)] gap-3 wrap-anywhere'

// The steps for connecting an assistant. The prompt holds no keys. A person given Project code gets the text that
// installs the project; while the app can not hand the project out, everyone gets the apps-only text; a person
// who lacks Project code is told who to ask, and gets no text. On Access's own
// page it is a box. With `popup` it sits inside a popup, from Home's card or Access's button: the popup is the box,
// and this heading is the popup's own title. One column that can shrink keeps the long prompt inside either.
export function AssistantSetup({ popup = false }: { popup?: boolean }) {
  const { data, error, reload } = useAccess('setup', setupSchema)
  const heading = <h2>Connect your assistant</h2>
  const steps = <>
    {popup ? <DialogTitle asChild>{heading}</DialogTitle> : heading}
    {!data && !error && <p role="status">Loading your setup…</p>}
    {error && <><p role="alert">Assistant setup is unavailable. Sign in to this app, then try again.</p><Button type="button" variant="outline" className="justify-self-start" onClick={reload}>Retry setup</Button></>}
    {data && <>
      <p>Signed in as {data.identity.email}</p>
      {data.code !== 'lacked' && <p>Apps: {data.apps.length ? data.apps.map(appTitle).join(', ') : 'None yet. Ask your employer.'}</p>}
      {data.code === 'ready' && <p>Project: the whole project, kept up to date</p>}
      {data.prompt.state === 'ready'
        ? <><CopyText text={data.prompt.text} label="Copy setup prompt" /><p>Paste it into your assistant and approve the sign-in on that computer.</p></>
        : <p>{data.prompt.message}</p>}
      {data.code === 'ready' && <p className="text-muted-foreground">Your copy is for using, not publishing. Memory is set up separately.</p>}
      {data.code === 'off' && <p className="text-muted-foreground">This connects the apps above. Project code and memory are set up separately.</p>}
    </>}
  </>
  return <section aria-label="Connect your assistant">
    {popup ? <div className={LINES}>{steps}</div> : <Card className={cn(LINES, 'p-4')}>{steps}</Card>}
  </section>
}
