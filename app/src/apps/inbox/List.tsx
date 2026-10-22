import { useCallback, useEffect, useState } from 'react'
import { Loading } from '@/components/Loading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { answerable, readInbox, sendTap, type Inbox, type Item, type Refusal, type Tap } from './api'
import { Decision } from './Decision'
import { useDesk } from './desk'
import { pickOf, textOf, without } from './drafts'
import { useKeys } from './keys'
import { PlanCard } from './PlanCard'
import { SendBar } from './SendBar'

/** How often an open, visible inbox looks again. */
export const REFRESH_MS = 15_000

const GROUPS = [['question', 'Needs you'], ['approval', 'Approvals'], ['plan', 'Plans to review']] as const
const REFUSED: Record<Refusal, string> = {
  changed: 'This changed since you opened it. Reload the page to see it.', done: 'That was already sent.', soon: 'Wait a few seconds, then try again.',
  closed: 'This has closed.', failed: 'Your answer did not reach the inbox. Try again.',
}

/** The server's open items, each with the person's newest answer here, then answered ones the server has closed. */
function shown(items: Item[], answered: Record<string, Item>) {
  const open = new Set(items.map(item => item.id))
  return [...items.map(item => answered[item.id] ?? item), ...Object.values(answered).filter(item => !open.has(item.id))]
}

function Status({ online }: { online: boolean }) {
  return online ? <Badge variant="secondary">Computer online</Badge> : <Badge variant="destructive">Computer offline</Badge>
}

function Empty() {
  return <div className="grid gap-1">
    <p className="font-semibold">Nothing is waiting on you.</p>
    <p className="text-muted-foreground">Plans to review, approvals and questions from your assistant show up here while your computer is signed in to this app.</p>
  </div>
}

/** Everything waiting on the signed-in person: questions first, then approvals, then plans. Picked decisions go
 *  together on Send, one tap each. */
export function List() {
  const [data, setData] = useState<Inbox | null>(null)
  const [error, setError] = useState(false)
  // What the person answered here, kept with its newest tap so the answer still shows once its item closes.
  const [answered, setAnswered] = useState<Record<string, Item>>({})
  const [said, setSaid] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const load = useCallback(() => readInbox().then(inbox => { setData(inbox); setError(false) }, () => setError(true)), [])
  useEffect(() => {
    void load()
    const look = () => { if (document.visibilityState === 'visible') void load() }
    const timer = setInterval(look, REFRESH_MS)
    document.addEventListener('visibilitychange', look)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', look) }
  }, [load])
  const items = data ? shown(data.items, answered) : []
  const decisions = GROUPS.flatMap(([kind]) => items.filter(item => item.kind === kind && kind !== 'plan' && answerable(item.tap)))
  const desk = useDesk(decisions, data?.items)
  const picked = decisions.flatMap(item => { const choice = pickOf(item, desk.draftOf(item)); return choice ? [{ item, choice }] : [] })
  const keep = (item: Item, tap: Tap) => setAnswered(all => ({ ...all, [item.id]: { ...item, tap } }))
  const reload = (id: string) => { setAnswered(all => without(all, id)); void load() }
  const send = async () => {
    setSending(true)
    await Promise.all(picked.map(async ({ item, choice }) => {
      const result = await sendTap({ item: item.id, action: choice.action, version: item.version, text: textOf(choice, desk.draftOf(item)) })
      setSaid(all => ({ ...all, [item.id]: typeof result === 'string' ? REFUSED[result] : '' }))
      if (typeof result !== 'string') { desk.sent(item); keep(item, result) }
    }))
    setSending(false)
  }
  useKeys({ item: desk.current, move: desk.move, pick: (item, n) => { if (desk.pick(item, n)) desk.move(item, 1) }, note: desk.openNote,
    clear: desk.clear, send: () => void send() })
  if (!data) return <div className="grid gap-4">
    <h1>Inbox</h1>
    {error ? <><p role="alert">The inbox is unavailable.</p>
      <Button type="button" variant="outline" className="justify-self-start" onClick={() => void load()}>Retry</Button></>
      : <Loading label="Loading your inbox…" className="grid gap-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></Loading>}
  </div>
  // One column that never grows past the screen: an auto column would widen to a card's longest unbroken line.
  return <div className="grid grid-cols-1 gap-6">
    <div className="flex flex-wrap items-center justify-between gap-2"><h1>Inbox</h1><Status online={data.computerOnline} /></div>
    {items.length === 0 && <Empty />}
    {GROUPS.map(([kind, title]) => {
      const group = items.filter(item => item.kind === kind)
      return group.length > 0 && <section key={kind} className="grid grid-cols-1 gap-3" aria-labelledby={`inbox-${kind}`}>
        <h2 id={`inbox-${kind}`} className="text-lg">{title}</h2>
        {group.map(item => {
          const own = { item, online: data.computerOnline, onTap: (tap: Tap) => keep(item, tap), onReload: () => reload(item.id) }
          return kind === 'plan' ? <PlanCard key={item.id} {...own} /> : <Decision key={item.id} {...own} desk={desk} said={said[item.id]} />
        })}
      </section>
    })}
    {decisions.length > 0 && <SendBar picked={picked.length} total={decisions.length} sending={sending} onSend={() => void send()} />}
  </div>
}
