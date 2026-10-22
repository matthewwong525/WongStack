import { useCallback, useEffect, useState } from 'react'
import { Loading } from '@/components/Loading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AgentCard } from './AgentCard'
import { answerable, readInbox, sendTap, type Inbox, type Item, type Refusal, type Tap } from './api'
import { useDesk } from './desk'
import { answerOf, without } from './drafts'
import { groupsOf, PLACES } from './groups'
import { useKeys } from './keys'
import { SendBar } from './SendBar'

/** How often an open, visible inbox looks again. */
export const REFRESH_MS = 15_000

const DECIDED: Item['kind'][] = ['start', 'question', 'approval']
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
    <p className="text-muted-foreground">Your agents, with their plans, questions, approvals and private links, show up here while your computer is
      signed in to this app.</p>
  </div>
}

/** The signed-in person's agents, one card each: those waiting on them first, then working, then done. Picked decisions
 *  and plan cards go together on Send, one tap each. */
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
  const groups = groupsOf(items)
  const decisions = groups.filter(group => group.place === 'Needs you')
    .flatMap(group => group.items.filter(item => DECIDED.includes(item.kind) && answerable(item.tap)))
  const desk = useDesk(decisions, data?.items)
  const picked = decisions.flatMap(item => { const choice = answerOf(item, desk.draftOf); return choice ? [{ item, choice }] : [] })
  const starts = picked.filter(({ choice }) => choice.action === 'go').length
  const keep = (item: Item, tap: Tap) => setAnswered(all => ({ ...all, [item.id]: { ...item, tap } }))
  const reload = (id: string) => { setAnswered(all => without(all, id)); void load() }
  const send = async () => {
    setSending(true)
    await Promise.all(picked.map(async ({ item, choice }) => {
      const result = await sendTap({ item: item.id, action: choice.action, version: item.version, text: choice.text })
      setSaid(all => ({ ...all, [item.id]: typeof result === 'string' ? REFUSED[result] : '' }))
      if (typeof result !== 'string') { desk.sent(item); keep(item, result) }
    }))
    setSending(false)
  }
  useKeys({ item: desk.current, move: desk.move, pick: (item, n) => { if (desk.pick(item, n)) desk.move(item, 1) }, write: desk.write,
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
    {PLACES.map(place => {
      const cards = groups.filter(group => group.place === place)
      const id = `inbox-${place.toLowerCase().replace(' ', '-')}`
      return cards.length > 0 && <section key={place} className="grid grid-cols-1 gap-3" aria-labelledby={id}>
        <div className="flex items-center gap-2"><h2 id={id} className="text-lg">{place}</h2><Badge variant="secondary">{cards.length}</Badge></div>
        {cards.map(group => <AgentCard key={group.key} group={group} online={data.computerOnline} desk={desk} said={said} onTap={keep}
          onReload={item => reload(item.id)} />)}
      </section>
    })}
    {decisions.length > 0 && <SendBar picked={picked.length} total={decisions.length} starts={starts} sending={sending} onSend={() => void send()} />}
  </div>
}
