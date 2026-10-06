import { Button } from '@/components/ui/button'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { setupSchema, useAccess, type Code } from '../lib/access'
import { appTitle } from '../lib/apps'
import { CopyText } from './CopyText'

const STEP = 'font-semibold'

// The three steps, numbered by the list itself: copy, paste, approve. Copy is the one solid button. Then what to
// ask once it works, and what the connection reaches: the apps, and the whole project for a person given Project
// code. While the app can not hand the project out, the closing line says code and memory are set up separately.
function Steps({ text, email, apps, titles, code }: { text: string; email: string; apps: string[]; titles: Record<string, string>; code: Code }) {
  return <>
    <ol className="grid list-decimal gap-4 ps-6 marker:font-semibold">
      <li><div className="grid grid-cols-[minmax(0,1fr)] gap-2"><p className={STEP}>Copy your setup message</p><CopyText text={text} label="Copy" variant="default" /></div></li>
      <li><p className={STEP}>Paste it into your assistant's chat</p></li>
      <li><p className={STEP}>Approve the sign-in it opens</p><p className="text-muted-foreground">You sign in as {email}</p></li>
    </ol>
    <p>Then ask it: <q>What can I do here?</q></p>
    <p className="text-muted-foreground">It can use: {apps.length ? apps.map(app => titles[app] ?? appTitle(app)).join(', ') : 'no apps yet. Ask your employer.'}</p>
    {code === 'ready' && <><p className="text-muted-foreground">Project: the whole project, kept up to date</p><p className="text-muted-foreground">Your copy is for using, not publishing. Memory is set up separately.</p></>}
    {code === 'off' && <p className="text-muted-foreground">This connects the apps above. Project code and memory are set up separately.</p>}
  </>
}

// The body of the Connect your assistant popup, for every signed-in person: the one place the steps are. Its
// heading names the popup, and the line under it says what an assistant is. The message holds no keys. When the
// steps can't be read it says so and offers to try again; when there is nothing to copy, because setup is not ready on this app or the
// person lacks Project code, it says what the app answered, such as who to ask. One column that can shrink keeps the long message inside the popup.
export function AssistantSetup() {
  const { data, error, reload } = useAccess('setup', setupSchema)
  return <section aria-label="Connect your assistant"><div className="grid grid-cols-[minmax(0,1fr)] gap-4 wrap-anywhere">
    <DialogTitle asChild><h2 className="pe-8">Connect your assistant</h2></DialogTitle>
    <DialogDescription>Use your apps from an AI assistant on your computer, such as Claude Code or Codex.</DialogDescription>
    {!data && !error && <p role="status">Loading the steps…</p>}
    {error && <><p role="alert">The steps couldn't load.</p><Button type="button" className="justify-self-start" onClick={reload}>Try again</Button></>}
    {data && (data.prompt.state === 'ready' ? <Steps text={data.prompt.text} email={data.identity.email} apps={data.apps} titles={data.titles} code={data.code} /> : <p>{data.prompt.message}</p>)}
  </div></section>
}
