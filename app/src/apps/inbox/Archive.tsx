import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Loading } from '@/components/Loading'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { readReviews, when, type Review } from './api'
import { SearchField } from './SearchField'

/** Long enough that a word typed fast is one read. */
const SEARCH_DELAY_MS = 250
type List = Awaited<ReturnType<typeof readReviews>> & { q: string }

/** What a row says under its title: a waiting page's folder, else its answer and when it ended. */
const line = (row: Review) => row.endedAt === null && row.closesAt > Date.now() ? `Waiting · ${row.workspace}`
  : `${row.answered ? 'Answered' : 'No answer'}, ${when(row.endedAt ?? row.closesAt)} · ${row.workspace}`

/** The person's answered or closed review pages, newest first. A search finds pages by title, waiting ones too. */
export function Archive() {
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
  // Needs you shows the waiting pages; a search finds them here too.
  const rows = shown ? [...(shown.q.trim() ? shown.waiting : []), ...shown.archived] : []
  return <section className="grid gap-1" aria-labelledby="archive">
    <h2 id="archive" className="mb-1 text-sm font-semibold">Archive</h2>
    <div className="mb-2"><SearchField value={query} onChange={setQuery} onEscape={() => setQuery('')} label="Search reviews by title" autoFocus={false} /></div>
    {failed && <p role="alert" className="flex items-center gap-2 text-sm">Past pages could not be loaded.
      <Button size="sm" variant="outline" onClick={() => { setFailed(false); setAttempt(count => count + 1) }}>Retry</Button></p>}
    {!failed && !list && <Loading label="Loading…" className="grid gap-2"><Skeleton className="h-10" /><Skeleton className="h-10" /></Loading>}
    {shown && rows.length === 0 && <p className="text-sm text-muted-foreground">{shown.q.trim() ? 'No page matches.' : 'No answered pages yet.'}</p>}
    {rows.map(row => <Link key={row.id} to={`/apps/inbox/?item=${row.id}`} className="grid gap-0.5 rounded-md px-2 py-2 hover:bg-muted">
      <span className="min-w-0 truncate">{row.title}</span>
      <span className="text-sm text-muted-foreground">{line(row)}</span>
    </Link>)}
    {moreFailed && <p role="alert" className="text-sm">More pages could not be loaded. Try again.</p>}
    {shown?.more && <Button variant="ghost" className="mt-2 min-h-11 justify-self-start" onClick={() => void showMore(shown)}>Show more</Button>}
  </section>
}
