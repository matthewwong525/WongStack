import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { setupSchema, useAccess } from '../lib/access'
import { appTitle } from '../lib/apps'
import { CopyText } from './CopyText'

const LINES = 'grid gap-3 wrap-anywhere'

// One box, on Home and in Access, for every signed-in person. The prompt holds no keys.
// With `popup` it sits inside a popup: the popup is the box, and this heading is the popup's own title.
export function AssistantSetup({ popup = false, className }: { popup?: boolean; className?: string }) {
  const { data, error, reload } = useAccess('setup', setupSchema)
  const heading = <h2>Connect your assistant</h2>
  const steps = <>
    {popup ? <DialogTitle asChild>{heading}</DialogTitle> : heading}
    {!data && !error && <p role="status">Loading your setup…</p>}
    {error && <><p role="alert">Assistant setup is unavailable. Sign in to this app, then try again.</p><Button type="button" variant="outline" className="justify-self-start" onClick={reload}>Retry setup</Button></>}
    {data && <>
      <p>Signed in as {data.identity.email}</p>
      <p>Apps: {data.apps.length ? data.apps.map(appTitle).join(', ') : 'None yet. Ask your employer.'}</p>
      {data.prompt.state === 'ready'
        ? <><CopyText text={data.prompt.text} label="Copy setup prompt" /><p>Paste it into your assistant and approve the sign-in on that computer.</p></>
        : <p>{data.prompt.message}</p>}
      <p className="text-muted-foreground">This connects the apps above. Project code and memory are set up separately.</p>
    </>}
  </>
  return <section aria-label="Connect your assistant" className={className}>
    {popup ? <div className={LINES}>{steps}</div> : <Card className={cn(LINES, 'p-4')}>{steps}</Card>}
  </section>
}
