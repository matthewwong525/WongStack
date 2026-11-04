import { useState } from 'react'
import { Link } from 'react-router'
import { Loading } from '@/components/Loading'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Failed, NotSetUp } from './States'
import { address, BASE, isProblem, useRead, type Found, type Listing } from './read'

/** Long enough that a word typed fast is one read. */
const SEARCH_DELAY_MS = 250
/** The longest query the server takes. */
const MAX_QUERY = 100
const folderOf = (path: string) => path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
const CAPPED = <p className="text-sm text-muted-foreground">Only the first 2,000 pages are read.</p>

function Results({ query }: { query: string }) {
  const [found, retry] = useRead<Found>(`search?q=${encodeURIComponent(query)}`, SEARCH_DELAY_MS)
  if (found === undefined) return <p role="status" className="text-muted-foreground">Searching…</p>
  if (isProblem(found)) return <Failed what="Search" retry={retry} />
  return <Card className="grid gap-3 p-4" aria-label="Search results">
    {found.hits.map((hit) => <Link key={hit.path} to={`${BASE}${address(hit.path)}`} className="grid">
      <span className="font-medium">{hit.title}</span>
      <span className="text-sm text-muted-foreground wrap-anywhere">{hit.line}</span>
    </Link>)}
    {found.hits.length === 0 && <p className="text-muted-foreground">No page has those words.</p>}
    {found.capped && CAPPED}
  </Card>
}

function Folders({ listing }: { listing: Listing }) {
  const folders = [...new Set(listing.pages.map((page) => folderOf(page.path)))]
  return <div className="grid gap-4 sm:grid-cols-2">
    {folders.map((folder) => <Card key={folder} className="grid content-start gap-2 p-4">
      <h2 className="text-sm font-normal text-muted-foreground">{folder || 'Start here'}</h2>
      {listing.pages.filter((page) => folderOf(page.path) === folder).map((page) =>
        <Link key={page.path} to={`${BASE}${address(page.path)}`}>{page.title}</Link>)}
    </Card>)}
    {listing.pages.length === 0 && <p className="text-muted-foreground">No pages are saved yet.</p>}
    {listing.capped && CAPPED}
  </div>
}

/** Every page by folder, with search as the one main action. Under a page that is not there, its heading steps down. */
export function List({ under = false }: { under?: boolean }) {
  const [query, setQuery] = useState('')
  const [listing, retry] = useRead<Listing>('pages')
  const q = query.trim().slice(0, MAX_QUERY).trim()
  const Heading = under ? 'h2' : 'h1'
  if (listing === undefined) {
    return <Loading label="Loading pages…" className="grid gap-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-9" /><Skeleton className="h-40 rounded-xl" /></Loading>
  }
  if (listing === 'not-set-up') return <NotSetUp />
  if (isProblem(listing)) return <Failed what="The page list" retry={retry} />
  return <div className="grid gap-4">
    <div className="flex items-center gap-3"><Heading>Knowledge</Heading><Badge variant="outline">{listing.pages.length} pages</Badge></div>
    <Input type="search" maxLength={MAX_QUERY} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search knowledge" aria-label="Search knowledge" />
    {q.length >= 2 ? <Results query={q} /> : <Folders listing={listing} />}
  </div>
}
