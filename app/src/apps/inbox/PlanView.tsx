import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Loading } from '@/components/Loading'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Failed, label, pending, readInbox, readPlan, sendTap, type Plan, type Tap } from './api'
import { frameMessage, notesKey, ownBack } from './frame'
import { LINE_REFRESH_MS, REFRESH_MS, useLine } from './line'
import { TapLine } from './TapLine'

/** The app's look, which its header switch sets on the root: the sealed page can't read the app's saved choice. */
const appLook = () => document.documentElement.classList.contains('dark') ? 'dark' : 'light'

function Back() {
  return <Button asChild variant="ghost" className="justify-self-start"><Link to="/apps/inbox/">Back</Link></Button>
}

/** The row above an opened item: Back, and where it came from. The card or page shows the title, so it is for screen
 *  readers here. */
function Top({ item }: { item: Plan['item'] }) {
  return <div className="flex min-w-0 items-center gap-2"><Back /><h1 className="sr-only">{item.title}</h1>
    <p className="min-w-0 truncate text-sm text-muted-foreground">{item.workspace}</p></div>
}

/** A plan opened by its link: its page sealed in a frame that reaches the inbox only
 *  through the port its first load is handed. A frame that loads again went elsewhere: nothing replaces the port. */
export function PlanView({ id }: { id: string }) {
  const [plan, setPlan] = useState<Plan | null>(null)
  const navigate = useNavigate()
  const [gone, setGone] = useState<'closed' | 'unavailable' | null>(null)
  const [tap, setTap] = useState<Tap | null>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const channel = useRef<{ version: string; port: MessagePort | null } | null>(null)
  // True while the page waits to hear what became of its tap.
  const asked = useRef(false)
  const load = useCallback(() => readPlan(id).then(answer => { setPlan(answer); setTap(answer.item.tap); setGone(null) },
    (error: unknown) => setGone(error instanceof Failed && (error.status === 404 || error.status === 410) ? 'closed' : 'unavailable')), [id])
  useEffect(() => { void load() }, [load])
  useEffect(() => () => channel.current?.port?.close(), [])
  // The page follows the app's switch in place, so it keeps its notes.
  useEffect(() => {
    let shown = appLook()
    const observer = new MutationObserver(() => {
      const theme = appLook()
      if (theme !== shown) { shown = theme; channel.current?.port?.postMessage({ type: 'inbox:theme', theme }) }
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  // A waiting tap says whether the computer is there, so the view asks again; the plan itself stays.
  const waiting = tap?.state === 'waiting'
  const look = useCallback(() => {
    if (document.visibilityState === 'visible') void readInbox().then(({ computerOnline }) =>
      setPlan(shown => shown && { ...shown, computerOnline }), () => undefined)
  }, [])
  const up = useLine(() => { if (waiting) look() })
  useEffect(() => {
    if (!waiting) return
    const timer = setInterval(look, up ? LINE_REFRESH_MS : REFRESH_MS)
    return () => clearInterval(timer)
  }, [look, waiting, up])
  const post = (data: object) => channel.current?.port?.postMessage(data)
  const settle = (next: Tap) => {
    setTap(next)
    if (asked.current && !pending(next)) { asked.current = false; post({ type: 'inbox:result', state: next.state }) }
  }
  const listen = async (item: Plan['item'], data: unknown) => {
    const message = frameMessage(data, { actions: item.actions, key: notesKey(item.body) })
    if (message?.type === 'inbox:notes-get') post({ type: 'inbox:notes', value: localStorage.getItem(message.key) })
    if (message?.type === 'inbox:notes-set') localStorage.setItem(message.key, message.value)
    if (message?.type === 'inbox:back') void navigate('/apps/inbox/')
    if (message?.type !== 'inbox:tap') return
    const result = await sendTap({ item: item.id, action: message.action, version: item.version, text: message.text })
    if (typeof result === 'string') post({ type: 'inbox:result', state: result })
    else { asked.current = true; settle(result) }
  }
  const greet = (item: Plan['item']) => {
    const before = channel.current
    before?.port?.close()
    if (before?.version === item.version) { before.port = null; return }
    const { port1, port2 } = new MessageChannel()
    port1.onmessage = event => void listen(item, event.data)
    channel.current = { version: item.version, port: port1 }
    frame.current?.contentWindow?.postMessage({ type: 'inbox:hello', item: item.id, version: item.version, actions: item.actions, workspace: item.workspace, theme: appLook() }, '*', [port2])
  }
  if (!plan) return <div className="grid gap-4">
    <Back />
    {gone === 'closed' && <p role="alert">This has closed. Ask its chat for a new link.</p>}
    {gone === 'unavailable' && <><p role="alert">The inbox is unavailable.</p>
      <Button type="button" variant="outline" className="justify-self-start" onClick={() => void load()}>Retry</Button></>}
    {!gone && <Loading label="Loading…" className="grid gap-3"><Skeleton className="h-8" /><Skeleton className="h-96" /></Loading>}
  </div>
  const { item } = plan
  // Fills the window under Layout's 3.5rem header and main's 2rem margins: only the frame scrolls, its bar at the foot.
  // A page drawing its own Back scrolls it away; an older one gets Top. Popups let links open a tab past the sandbox.
  return <div className="-mb-8 flex h-[calc(100dvh-5.5rem)] flex-col gap-3">
    {ownBack(item.body) ? <h1 className="sr-only">{item.title}</h1> : <Top item={item} />}
    {tap && <TapLine tap={tap} online={plan.computerOnline} copy={tap.text || label(tap.action)} onChange={settle} onReload={() => void load()} />}
    <iframe key={item.version} ref={frame} title={item.title} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" srcDoc={item.body}
      className="ml-[calc(50%-50vw)] min-h-0 w-screen max-w-none flex-1" onLoad={() => greet(item)} />
  </div>
}
