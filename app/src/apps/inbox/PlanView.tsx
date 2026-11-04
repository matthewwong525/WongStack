import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Loading } from '@/components/Loading'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { type Archived, Failed, FILE_MAX, FILE_REFUSALS, label, pending, readInbox, readPlan, sendFile, sendTap, type Plan, type Tap } from './api'
import { AnswerLine } from './AnswerLine'
import { actionLabels, frameMessage, notesKey, ownBack } from './frame'
import { LINE_REFRESH_MS, REFRESH_MS, useLine } from './line'
import { TapLine } from './TapLine'

/** The app's look, which its header switch sets on the root: the sealed page can't read the app's saved choice. */
const appLook = () => document.documentElement.classList.contains('dark') ? 'dark' : 'light'

function Back({ to }: { to: string }) {
  return <Button asChild variant="ghost" className="justify-self-start"><Link to={to}>Back</Link></Button>
}

/** The row above an opened item: Back, and where it came from. The card or page shows the title, so it is for screen
 *  readers here. */
function Top({ item, back }: { item: Plan['item']; back: string }) {
  return <div className="flex min-w-0 items-center gap-2"><Back to={back} /><h1 className="sr-only">{item.title}</h1>
    <p className="min-w-0 truncate text-sm text-muted-foreground">{item.workspace}</p></div>
}

/** Keeps the line open beside an open plan; while its tap waits, asks on each look, and on a timer, whether the
 *  computer is there. A closed page has nothing to wait for, so it mounts none. */
function Watch({ waiting, look }: { waiting: boolean; look: () => void }) {
  const up = useLine(() => { if (waiting) look() })
  useEffect(() => {
    if (!waiting) return
    const timer = setInterval(look, up ? LINE_REFRESH_MS : REFRESH_MS)
    return () => clearInterval(timer)
  }, [look, waiting, up])
  return null
}

/** A plan opened by its link, sealed in a frame that reaches the inbox only through the port its first load is handed.
 *  A frame that loads again went elsewhere, so nothing replaces the port; a closed or answered page opens read-only. */
export function PlanView({ id }: { id: string }) {
  const [plan, setPlan] = useState<Plan | null>(null)
  const navigate = useNavigate()
  // Back returns to the Reviews list when a row there opened this page, else to the week.
  const back = useSearchParams()[0].get('from') === 'reviews' ? '/apps/inbox/?view=reviews' : '/apps/inbox/'
  const [gone, setGone] = useState<'closed' | 'unavailable' | null>(null)
  const [tap, setTap] = useState<Tap | null>(null)
  // When this view first saw its tap reach the chat: the computer closes the page soon after, so it reads closed now.
  const [sentAt, setSentAt] = useState<number | null>(null)
  const show = useCallback((next: Tap | null) => {
    setTap(next)
    if (next?.state === 'sent') setSentAt(at => at ?? Date.now())
  }, [])
  const frame = useRef<HTMLIFrameElement>(null)
  const channel = useRef<{ version: string; port: MessagePort | null } | null>(null)
  // True while the page waits to hear what became of its tap; `carried`, while that tap names files.
  const asked = useRef(false)
  const carried = useRef(false)
  const load = useCallback(() => readPlan(id).then(answer => { setPlan(answer); show(answer.item.archived ? null : answer.item.tap); setGone(null) },
    (error: unknown) => setGone(error instanceof Failed && (error.status === 404 || error.status === 410) ? 'closed' : 'unavailable')), [id, show])
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
  const post = (data: object) => channel.current?.port?.postMessage(data)
  // A tap that did not reach the chat may have taken its files with it: the page hears which the app still holds.
  const tell = async (state: string) => {
    const held = carried.current && state !== 'sent' ? await readPlan(id).then(answer => ({ files: answer.item.files }), () => ({})) : {}
    post({ type: 'inbox:result', state, ...held })
  }
  const settle = (next: Tap) => {
    show(next)
    if (asked.current && !pending(next)) { asked.current = false; void tell(next.state) }
  }
  const listen = async (item: Plan['item'], data: unknown) => {
    const message = frameMessage(data, { actions: item.actions, key: notesKey(item.body) })
    if (message?.type === 'inbox:notes-get') post({ type: 'inbox:notes', value: localStorage.getItem(message.key) })
    if (message?.type === 'inbox:notes-set' && !item.archived) localStorage.setItem(message.key, message.value)
    if (message?.type === 'inbox:back') void navigate(back)
    if (message?.type === 'inbox:file') post({ type: 'inbox:file-result', ref: message.ref, ...await upload(item, message) })
    if (message?.type !== 'inbox:tap') return
    // An older page still offers Send notes: it hears the link closed, and copies its notes.
    if (item.archived) { post({ type: 'inbox:result', state: 'closed' }); return }
    const files = message.files?.length ? { files: message.files } : {}
    carried.current = !!message.files?.length
    const result = await sendTap({ item: item.id, action: message.action, version: item.version, text: message.text, ...files })
    if (typeof result === 'string') void tell(result)
    else { asked.current = true; settle(result) }
  }
  const upload = async (item: Plan['item'], file: { name: string; question: string; data: ArrayBuffer }) => {
    // A closed page takes no file: the app would refuse it as closed anyway.
    if (item.archived) return { error: FILE_REFUSALS.closed }
    const size = file.data.byteLength
    if (size > FILE_MAX) return { error: FILE_REFUSALS.too_large }
    const sent = await sendFile({ item: item.id, ...file })
    return typeof sent === 'string' ? { error: sent } : { id: sent.id }
  }
  const greet = (item: Plan['item']) => {
    const before = channel.current
    before?.port?.close()
    if (before?.version === item.version) { before.port = null; return }
    const { port1, port2 } = new MessageChannel()
    port1.onmessage = event => void listen(item, event.data)
    channel.current = { version: item.version, port: port1 }
    const offer = item.archived || item.tap?.state === 'sent' ? { actions: [], readOnly: true } : { actions: item.actions }
    frame.current?.contentWindow?.postMessage({ type: 'inbox:hello', item: item.id, version: item.version, ...offer, workspace: item.workspace,
      files: item.files, theme: appLook() }, '*', [port2])
  }
  if (!plan) return <div className="grid gap-4">
    <Back to={back} />
    {gone === 'closed' && <p role="alert">This has closed. Ask its chat for a new link.</p>}
    {gone === 'unavailable' && <><p role="alert">The inbox is unavailable.</p>
      <Button type="button" variant="outline" className="justify-self-start" onClick={() => void load()}>Retry</Button></>}
    {!gone && <Loading label="Loading…" className="grid gap-3"><Skeleton className="h-8" /><Skeleton className="h-96" /></Loading>}
  </div>
  const { item } = plan
  const answered: Archived | undefined = item.archived
    ?? (tap?.state === 'sent' && sentAt !== null ? { endedAt: sentAt, answers: [{ action: tap.action, text: tap.text, at: sentAt }] } : undefined)
  // Fills the window under Layout's 3.5rem header and main's 2rem margins: only the frame scrolls, its bar at the foot.
  // A page drawing its own Back scrolls it away; an older one gets Top. Popups let links open a tab past the sandbox.
  return <div className="-mb-8 flex h-[calc(100dvh-5.5rem)] flex-col gap-3">
    {ownBack(item.body) ? <h1 className="sr-only">{item.title}</h1> : <Top item={item} back={back} />}
    {answered ? <AnswerLine archived={answered} labels={actionLabels(item.body)} /> : <Watch waiting={waiting} look={look} />}
    {tap && !answered && <TapLine tap={tap} online={plan.computerOnline} copy={tap.text || label(tap.action)} onChange={settle} onReload={() => void load()} />}
    <iframe key={item.version} ref={frame} title={item.title} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" srcDoc={item.body}
      className="ml-[calc(50%-50vw)] min-h-0 w-screen max-w-none flex-1" onLoad={() => greet(item)} />
  </div>
}
