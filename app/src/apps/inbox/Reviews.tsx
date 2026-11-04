import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Loading } from '@/components/Loading'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { readReviews, when, type Review } from './api'
import { ViewToggle } from './week/Parts'
import { SearchField } from './week/Search'

/** Long enough that a word typed fast is one read. */
const SEARCH_DELAY_MS = 250
const HOUR = 3_600_000
type List = Awaited<ReturnType<typeof readReviews>> & { q: string }

/** How long a waiting page stays open: hours while under two days, else the day it closes. */
const left = (closesAt: number) => closesAt - Date.now() < 48 * HOUR
  ? `Closes in ${Math.max(1, Math.round((closesAt - Date.now()) / HOUR))} h` : `Closes ${when(closesAt)}`
const opens = (id: string) => `/apps/inbox/?item=${id}&from=reviews`

function Waiting({ rows }: { rows: Review[] }) {
  return <section className="mb-6 grid gap-2" aria-labelledby="waiting">
    <h2 id="waiting" className="flex items-center gap-2 text-sm font-semibold">Waiting<Badge variant="secondary">{rows.length}</Badge></h2>
    {rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing waits on you.</p>}
    {rows.map(row => <Link key={row.id} to={opens(row.id)}>
      <Card className="py-3"><CardContent className="grid gap-1 px-4">
        <span className="font-medium">{row.title}</span>
        <span className="text-sm text-muted-foreground">{row.workspace} · {left(row.closesAt)}</span>
      </CardContent></Card>
    </Link>)}
  </section>
}

function Archive({ rows, more, onMore, moreFailed }: { rows: Review[]; more: boolean; onMore: () => void; moreFailed: boolean }) {
  return <section className="grid gap-1" aria-labelledby="archive">
    <h2 id="archive" className="mb-1 text-sm font-semibold">Archive</h2>
    {rows.length === 0 && <p className="text-sm text-muted-foreground">No answered pages yet.</p>}
    {rows.map(row => <Link key={row.id} to={opens(row.id)} className="grid gap-0.5 rounded-md px-2 py-2 hover:bg-muted">
      <span className="min-w-0 truncate">{row.title}</span>
      <span className="text-sm text-muted-foreground">{row.answered ? 'Answered' : 'No answer'}, {when(row.endedAt ?? row.closesAt)} · {row.workspace}</span>
    </Link>)}
    {moreFailed && <p role="alert" className="text-sm">More pages could not be loaded. Try again.</p>}
    {more && <Button variant="ghost" className="mt-2 min-h-11 justify-self-start" onClick={onMore}>Show more</Button>}
  </section>
}

/** The person's review pages: those waiting on them, then the Archive of every one answered or closed, newest first. */
export function Reviews() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [list, setList] = useState<List | null>(null)
  const [failed, setFailed] = useState(false)
  const [moreFailed, setMoreFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => void readReviews(query).then(
      answer => { if (!cancelled) { setList({ ...answer, q: query }); setFailed(false); setMoreFailed(false) } },
      () => { if (!cancelled) setFailed(true) }), query.trim() ? SEARCH_DELAY_MS : 0)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [query, attempt])
  const showMore = (from: List) => readReviews(from.q, from.archived.at(-1)).then(next => {
    setMoreFailed(false)
    setList(current => current?.q === from.q ? { ...current, archived: [...current.archived, ...next.archived], more: next.more } : current)
  }, () => setMoreFailed(true))
  const shown = failed ? null : list
  const empty = shown && shown.waiting.length === 0 && shown.archived.length === 0
  return <>
    <div className="mb-6 flex min-h-11 items-center gap-3"><h1 className="min-w-0 flex-1 truncate">Inbox</h1></div>
    <div className="mb-5 flex flex-col gap-3">
      <ViewToggle view="reviews" onView={view => void navigate(`/apps/inbox/?view=${view}`)} />
      <SearchField value={query} onChange={setQuery} onEscape={() => setQuery('')} label="Search reviews by title" autoFocus={false} />
    </div>
    {failed && <Alert variant="destructive">
      <AlertTitle>Review pages could not be loaded.</AlertTitle>
      <AlertDescription><Button size="sm" onClick={() => { setFailed(false); setAttempt(count => count + 1) }}>Retry</Button></AlertDescription>
    </Alert>}
    {!failed && !list && <Loading label="Loading…" className="grid gap-2">
      <Skeleton className="h-4 w-24" /><Skeleton className="h-16" /><Skeleton className="h-16" />
    </Loading>}
    {empty && <p className="text-sm text-muted-foreground">{shown.q.trim() ? 'No page matches.' : 'No review pages yet. A plan or other work to review shows here.'}</p>}
    {shown && !empty && <>
      <Waiting rows={shown.waiting} />
      <Archive rows={shown.archived} more={shown.more} onMore={() => void showMore(shown)} moreFailed={moreFailed} />
    </>}
  </>
}
