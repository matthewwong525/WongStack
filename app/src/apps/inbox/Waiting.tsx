import { useCallback, useState } from 'react'
import { CalendarClockIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Loading } from '@/components/Loading'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { readInbox, readReviews, when, type Review } from './api'
import { Archive } from './Archive'
import { useFresh } from './line'

type List = { waiting: Review[]; computerOnline: boolean }

function Row({ page }: { page: Review }) {
  return <Card className="py-2"><CardContent className="px-3">
    <Link to={`/apps/inbox/?item=${page.id}`} className="flex min-h-11 min-w-0 items-center gap-2">
      <div className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate font-medium">{page.title}</span>
        <span className="truncate text-sm text-muted-foreground">{page.workspace} · {when(page.createdAt)}</span>
      </div>
      <Badge>Review</Badge>
    </Link>
  </CardContent></Card>
}

/** The review pages waiting on the person, newest first, then the Archive. */
export function Waiting() {
  const [list, setList] = useState<List | null>(null)
  const [failed, setFailed] = useState(false)
  const load = useCallback(() => void Promise.all([readReviews(''), readInbox()]).then(([pages, { computerOnline }]) => {
    setList({ waiting: [...pages.waiting].sort((a, b) => b.createdAt - a.createdAt), computerOnline })
    setFailed(false)
  }, () => setFailed(true)), [])
  useFresh(load)
  return <>
    <div className="mb-6 flex min-h-11 items-center gap-2">
      <h1 className="min-w-0 flex-1 truncate">Inbox</h1>
      {list && (list.computerOnline ? <Badge variant="secondary">Computer online</Badge> : <Badge variant="destructive">Computer offline</Badge>)}
      <Button variant="ghost" className="min-h-11" asChild><Link to="/apps/inbox/?view=schedules"><CalendarClockIcon />Schedules</Link></Button>
    </div>
    {failed && !list && <Alert variant="destructive" className="mb-6">
      <AlertTitle>Your pages could not be loaded.</AlertTitle>
      <AlertDescription><Button size="sm" onClick={load}>Retry</Button></AlertDescription>
    </Alert>}
    {!failed && !list && <Loading label="Loading…" className="mb-6 grid gap-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-14" /><Skeleton className="h-14" /></Loading>}
    {list && list.waiting.length === 0 && <p className="mb-6 text-sm text-muted-foreground">Nothing waits for you.</p>}
    {list && list.waiting.length > 0 && <section className="mb-6 grid gap-2" aria-labelledby="needs">
      <h2 id="needs" className="flex items-center gap-2 text-sm font-semibold">Needs you<Badge variant="secondary">{list.waiting.length}</Badge></h2>
      {list.waiting.map(page => <Row key={page.id} page={page} />)}
    </section>}
    <Archive />
  </>
}
