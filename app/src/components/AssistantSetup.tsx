import { Button } from '@/components/ui/button'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { setupSchema, useAccess } from '../lib/access'
import { appTitle } from '../lib/apps'
import { CopyText } from './CopyText'

const STEP = 'font-semibold'

// The three steps, numbered by the list itself: copy, paste, approve. Copy is the one solid button. Then what to
// ask once it works, and the apps the connection reaches.
function Steps({ text, email, apps }: { text: string; email: string; apps: string[] }) {
  return <>
    <ol className="grid list-decimal gap-4 ps-6 marker:font-semibold">
      <li><div className="grid grid-cols-[minmax(0,1fr)] gap-2"><p className={STEP}>Copy your setup message</p><CopyText text={text} label="Copy" variant="default" /></div></li>
      <li><p className={STEP}>Paste it into your assistant's chat</p></li>
      <li><p className={STEP}>Approve the sign-in it opens</p><p className="text-muted-foreground">You sign in as {email}</p></li>
    </ol>
    <p>Then ask it: <q>What can I do here?</q></p>
    <p className="text-muted-foreground">It can use: {apps.length ? apps.map(appTitle).join(', ') : 'no apps yet. Ask your employer.'}</p>
  </>
}

// The body of the Connect your assistant popup, for every signed-in person: the one place the steps are. Its
// heading names the popup, and the line under it says what an assistant is. The message holds no keys. When the
// steps can't be read it says so and offers to try again; when setup is not ready on this app it says that, with
// nothing to copy. One column that can shrink keeps the long message inside the popup.
export function AssistantSetup() {
  const { data, error, reload } = useAccess('setup', setupSchema)
  return <section aria-label="Connect your assistant"><div className="grid grid-cols-[minmax(0,1fr)] gap-4 wrap-anywhere">
    <DialogTitle asChild><h2 className="pe-8">Connect your assistant</h2></DialogTitle>
    <DialogDescription>Use your apps from an AI assistant on your computer, such as Claude Code or Codex.</DialogDescription>
    {!data && !error && <p role="status">Loading the steps…</p>}
    {error && <><p role="alert">The steps couldn't load.</p><Button type="button" className="justify-self-start" onClick={reload}>Try again</Button></>}
    {data && (data.prompt.state === 'ready' ? <Steps text={data.prompt.text} email={data.identity.email} apps={data.apps} /> : <p>Setup isn't ready on this app yet. Ask the owner.</p>)}
  </div></section>
}
