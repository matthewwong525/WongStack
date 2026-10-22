import { useCallback, useEffect, useState } from 'react'
import { Loading } from '@/components/Loading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { answerable, readInbox, sendTap, type Inbox, type Item, type Refusal, type Tap } from './api'
import { ApproveAll } from './ApproveAll'
import { ItemCard } from './ItemCard'

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

/** Everything waiting on the signed-in person: questions first, then approvals, then plans. */
export function List() {
  const [data, setData] = useState<Inbox | null>(null)
  const [error, setError] = useState(false)
  // What the person answered here, kept with its newest tap so the answer still shows once its item closes.
  const [answered, setAnswered] = useState<Record<string, Item>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const load = useCallback(() => readInbox().then(inbox => { setData(inbox); setError(false) }, () => setError(true)), [])
  useEffect(() => {
    void load()
    const look = () => { if (document.visibilityState === 'visible') void load() }
    const timer = setInterval(look, REFRESH_MS)
    document.addEventListener('visibilitychange', look)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', look) }
  }, [load])
  const keep = (item: Item, tap: Tap) => setAnswered(all => ({ ...all, [item.id]: { ...item, tap } }))
  const reload = (id: string) => { setAnswered(all => Object.fromEntries(Object.entries(all).filter(([key]) => key !== id))); void load() }
  const note = (id: string, text: string) => setNotes(all => ({ ...all, [id]: text }))
  const answer = async (item: Item, action: string, text: string) => {
    const result = await sendTap({ item: item.id, action, version: item.version, text })
    if (typeof result === 'string') note(item.id, REFUSED[result])
    else { note(item.id, ''); keep(item, result) }
  }
  if (!data) return <div className="grid gap-4">
    <h1>Inbox</h1>
    {error ? <><p role="alert">The inbox is unavailable.</p>
      <Button type="button" variant="outline" className="justify-self-start" onClick={() => void load()}>Retry</Button></>
      : <Loading label="Loading your inbox…" className="grid gap-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></Loading>}
  </div>
  const items = shown(data.items, answered)
  return <div className="grid gap-6">
    <div className="flex flex-wrap items-center justify-between gap-2"><h1>Inbox</h1><Status online={data.computerOnline} /></div>
    {items.length === 0 && <Empty />}
    {GROUPS.map(([kind, title]) => {
      const group = items.filter(item => item.kind === kind)
      const unanswered = group.filter(item => answerable(item.tap))
      return group.length > 0 && <section key={kind} className="grid gap-3" aria-labelledby={`inbox-${kind}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id={`inbox-${kind}`} className="text-lg">{title}</h2>
          {kind === 'approval' && unanswered.length > 1 && <ApproveAll items={unanswered} onApprove={() => unanswered.forEach(item => void answer(item, 'approve', ''))} />}
        </div>
        {group.map(item => <ItemCard key={item.id} item={item} online={data.computerOnline} note={notes[item.id]}
          onAnswer={(...args) => void answer(...args)} onTap={tap => keep(item, tap)} onReload={() => reload(item.id)} />)}
      </section>
    })}
  </div>
}
