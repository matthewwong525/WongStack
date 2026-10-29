import { Fragment } from 'react'
import { PlayIcon, SearchIcon, SquareCheckIcon, SquareIcon, XIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { searchWords, type TaskSearchResult } from '@/lib/board'
import { cn } from '@/lib/utils'
import type { SearchState } from './hooks'
import { formatWeek, planGroups, splitOnWords } from './plan'

/** A box that searches as you type. Escape clears it, or closes the search when it is empty already. */
export function SearchField({ value, onChange, onEscape }: { value: string; onChange: (value: string) => void; onEscape: () => void }) {
  return <div className="relative">
    <SearchIcon aria-hidden="true" className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
    <Input type="search" aria-label="Search every week" placeholder="Search every week" value={value} autoFocus
      onChange={event => onChange(event.target.value)}
      onKeyDown={event => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        if (value) onChange('')
        else onEscape()
      }}
      // The browser's own clear button would sit beside this one.
      className="h-9 pr-9 pl-8 [&::-webkit-search-cancel-button]:hidden" />
    {value && <Button type="button" variant="ghost" size="icon-sm" aria-label="Clear" onClick={() => onChange('')}
      className="text-muted-foreground absolute top-1/2 right-1 -translate-y-1/2"><XIcon aria-hidden="true" /></Button>}
  </div>
}

/** Text with the query's words marked. A word matches as plain text, never as a pattern. */
function Highlight({ text, query }: { text: string; query: string }) {
  return splitOnWords(text, searchWords(query)).map((part, index) => part.match
    ? <mark key={index} className="bg-primary/15 text-foreground rounded-sm px-px">{part.text}</mark>
    : <Fragment key={index}>{part.text}</Fragment>)
}

const slotLabel = (slot: TaskSearchResult['slot']) => planGroups.find(group => group.slots.includes(slot))!.label
/** Where a found task is, because choosing it goes there. */
const placeOf = (task: TaskSearchResult) => task.week === null
  ? ['Backlog', task.backlogGroupName].filter(Boolean).join(' · ')
  : `${slotLabel(task.slot)} · Week of ${formatWeek(task.week)}`

const MARK = { open: SquareIcon, in_progress: PlayIcon, done: SquareCheckIcon }

/** Tasks found in every week, in place of the board. */
export function TaskSearchResults({ query, search, onChoose }: {
  query: string
  search: Exclude<SearchState<TaskSearchResult[]>, { status: 'idle' }> & { retry: () => void }
  onChoose: (task: TaskSearchResult) => void
}) {
  if (search.status === 'loading') return <div className="space-y-4 pt-2" data-testid="task-search-loading">
    {[0, 1, 2].map(row => <div key={row} className="space-y-1.5"><Skeleton className="h-4 w-3/5" /><Skeleton className="h-3 w-1/3" /></div>)}
  </div>
  if (search.status === 'error') return <Alert variant="destructive">
    <AlertTitle>That search did not run.</AlertTitle>
    <AlertDescription><Button size="sm" variant="outline" onClick={search.retry}>Retry</Button></AlertDescription>
  </Alert>
  if (search.results.length === 0) return <div className="py-8 text-center">
    <p className="text-sm font-medium">No tasks match “{query.trim()}”</p>
    <p className="text-muted-foreground text-sm">Every week and the backlog were searched.</p>
  </div>
  return <ul className="space-y-1">
    {search.results.map(task => {
      const Mark = MARK[task.status]
      return <li key={task.id}>
        <button type="button" data-testid="task-search-result" onClick={() => onChoose(task)}
          className="hover:bg-muted/50 w-full rounded-md px-2 py-2 text-left transition-colors">
          <p className="flex items-center gap-2 text-sm">
            <Mark aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
            <span className={cn('min-w-0 truncate', task.status === 'done' && 'text-muted-foreground line-through')}>
              <Highlight text={task.title} query={query} />
            </span>
            {task.status === 'open' && <span className="sr-only">Open</span>}
            {task.status === 'in_progress' && <Badge variant="secondary">In progress</Badge>}
            {task.status === 'done' && <Badge variant="outline">Done</Badge>}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">{placeOf(task)}</p>
        </button>
      </li>
    })}
  </ul>
}
