import { Button } from '@/components/ui/button'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { setupSchema, useAccess, type Code } from '../lib/access'
import { appTitle } from '../lib/apps'
import { CopyText } from './CopyText'
import { Loading } from './Loading'

const STEP = 'font-semibold'

// Install pages for two assistants, named as examples: any assistant that runs on the computer works.
const ASSISTANTS = [{ name: 'Claude Code', href: 'https://claude.com/product/claude-code' }, { name: 'Codex', href: 'https://developers.openai.com/codex' }]

// Four steps, numbered by the list itself: have an assistant, copy, paste, approve; then what to ask what it reaches.
// While the app can not hand the project out, the closing line says project code is set up separately.
function Steps({ text, email, apps, titles, code }: { text: string; email: string; apps: string[]; titles: Record<string, string>; code: Code }) {
  return <>
    <ol className="grid list-decimal gap-4 ps-6 marker:font-semibold">
      <li><p className={STEP}>Have an AI assistant on your computer</p><p className="text-muted-foreground">No assistant yet? Install one, such as {ASSISTANTS.map((item, index) =>
        <span key={item.name}>{index > 0 && ' or '}<a href={item.href} target="_blank" rel="noreferrer">{item.name}</a></span>)}.</p></li>
      <li><div className="grid grid-cols-[minmax(0,1fr)] gap-2"><p className={STEP}>Copy your setup message</p><CopyText text={text} label="Copy" variant="default" /></div></li>
      <li><p className={STEP}>Paste it into your assistant's chat</p></li>
      <li><p className={STEP}>Approve the sign-in it opens</p><p className="text-muted-foreground">You sign in as {email}</p></li>
    </ol>
    <p>Then ask it: <q>What can I do here?</q></p>
    <p className="text-muted-foreground">It can use: {apps.length ? apps.map(app => titles[app] ?? appTitle(app)).join(', ') : 'no apps yet. Ask your employer.'}</p>
    {code === 'ready' && <><p className="text-muted-foreground">Project: the whole project, kept up to date</p><p className="text-muted-foreground">Your copy is for using, not publishing. Memory comes with the same sign-in.</p></>}
    {code === 'off' && <p className="text-muted-foreground">This connects the apps above and memory. Project code is set up separately.</p>}
  </>
}

// The body of the Connect your assistant popup, the one place the steps are. The message holds no keys. With nothing
// to copy it says what the app answered. One column that can shrink keeps the long message inside the popup.
export function AssistantSetup() {
  const { data, error, reload } = useAccess('setup', setupSchema)
  return <section aria-label="Connect your assistant"><div className="grid grid-cols-[minmax(0,1fr)] gap-4 wrap-anywhere">
    <DialogTitle asChild><h2 className="pe-8">Connect your assistant</h2></DialogTitle>
    <DialogDescription>Use your apps from an AI assistant on your computer, such as Claude Code or Codex.</DialogDescription>
    {!data && !error && <Loading label="Loading the steps…" className="grid gap-4">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-5 w-3/4" />)}</Loading>}
    {error && <><p role="alert">The steps couldn't load.</p><Button type="button" className="justify-self-start" onClick={reload}>Try again</Button></>}
    {data && (data.prompt.state === 'ready' ? <Steps text={data.prompt.text} email={data.identity.email} apps={data.apps} titles={data.titles} code={data.code} /> : <p>{data.prompt.message}</p>)}
  </div></section>
}
