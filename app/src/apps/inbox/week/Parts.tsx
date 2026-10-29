import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { ArchiveIcon, ArrowRightIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, SearchIcon, TargetIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { SweepDestination, TaskSearchResult } from '@/lib/board'
import { cn } from '@/lib/utils'
import { Failed, readInbox } from '../api'
import { REFRESH_MS, useFresh, useLine } from '../line'
import type { SearchState } from './hooks'
import { dayLabel, formatHours, formatWeek, localDay, moveScheduleDay, scheduleView, type EffortTotals, type ScheduleView } from './plan'
import { SearchField, TaskSearchResults } from './Search'

/** Whether the person's computer is on. A 403 (no Inbox access) shows no badge; a first read that fails another way
 *  tries again when the tab comes back into view or the network returns. */
export function InboxStatus({ onLook }: { onLook: () => void }) {
  const [online, setOnline] = useState<boolean | null>(null)
  const refused = useRef(false)
  // A later failed read keeps the last answer: only a first one hides the badge.
  const read = useCallback(() => readInbox().then(inbox => setOnline(inbox.computerOnline), (error: unknown) => {
    if (error instanceof Failed && error.status === 403) refused.current = true
  }), [])
  useEffect(() => { void read() }, [read])
  useEffect(() => {
    if (online !== null) return
    const retry = () => { if (!refused.current && document.visibilityState === 'visible') void read() }
    document.addEventListener('visibilitychange', retry)
    window.addEventListener('online', retry)
    return () => { document.removeEventListener('visibilitychange', retry); window.removeEventListener('online', retry) }
  }, [online, read])
  return online !== null && <LiveStatus online={online} read={read} onLook={onLook} />
}

/** The badge, kept current. Each look on the live line reads the week again; with no line, the badge's timer does. */
function LiveStatus({ online, read, onLook }: { online: boolean; read: () => Promise<void>; onLook: () => void }) {
  useFresh(() => void read())
  const open = useLine(onLook)
  const latest = useRef(onLook)
  useEffect(() => { latest.current = onLook })
  useEffect(() => {
    if (open) return
    const timer = setInterval(() => { if (document.visibilityState === 'visible') latest.current() }, REFRESH_MS)
    return () => clearInterval(timer)
  }, [open])
  return online ? <Badge variant="secondary">Computer online</Badge> : <Badge variant="destructive">Computer offline</Badge>
}

/** A short word after an edit: what moved, or what did not save. It stays until the next one or Close. */
export type Notice = { text: string; error: boolean }
export function NoticeLine({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  return <Alert variant={notice.error ? 'destructive' : 'default'} className="mb-3">
    <AlertTitle>{notice.text}</AlertTitle>
    <AlertDescription><Button size="sm" variant="outline" onClick={onClose}>Close</Button></AlertDescription>
  </Alert>
}

export function PlanHeader({ view, day, week, searchQuery, setSearchQuery, changeSelection }: {
  view: ScheduleView
  day: string
  week: string
  searchQuery: string | null
  setSearchQuery: Dispatch<SetStateAction<string | null>>
  changeSelection: (nextDay: string, nextView?: ScheduleView) => void
}) {
  return <>
    <div className="mb-5 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ToggleGroup type="single" aria-label="Task view" value={view} onValueChange={value => { if (value) changeSelection(day, scheduleView(value)) }}>
          <ToggleGroupItem className="min-h-11" value="day">Day</ToggleGroupItem>
          <ToggleGroupItem className="min-h-11" value="week">Week</ToggleGroupItem>
        </ToggleGroup>
        <Button variant="ghost" size="icon" className="size-11" aria-label="Search tasks" aria-pressed={searchQuery !== null}
          onClick={() => setSearchQuery(current => current === null ? '' : null)}><SearchIcon /></Button>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="size-11" aria-label={`Previous ${view}`}
          onClick={() => changeSelection(moveScheduleDay(day, view, -1))}><ChevronLeftIcon /></Button>
        <p className="min-w-0 flex-1 text-center text-sm font-medium">{view === 'week' ? `Week of ${formatWeek(week)}` : dayLabel(day)}</p>
        <Button variant="ghost" className="min-h-11" aria-pressed={day === localDay()} onClick={() => changeSelection(localDay())}>Today</Button>
        <Button variant="ghost" size="icon" className="size-11" aria-label={`Next ${view}`}
          onClick={() => changeSelection(moveScheduleDay(day, view, 1))}><ChevronRightIcon /></Button>
      </div>
    </div>
    {searchQuery !== null && <div className="mb-3">
      <SearchField value={searchQuery} onChange={setSearchQuery} onEscape={() => setSearchQuery(null)} />
    </div>}
  </>
}

/** The search results, the skeleton while the week loads, or the error when it did not. */
export function PlanStatus({ status, searchQuery, taskSearch, onChoose, onRetry }: {
  status: 'error' | 'loading' | 'ready' | 'results'
  searchQuery: string | null
  taskSearch: SearchState<TaskSearchResult[]> & { retry: () => void }
  onChoose: (task: TaskSearchResult) => void
  onRetry: () => void
}) {
  if (taskSearch.status !== 'idle') return <TaskSearchResults query={searchQuery!} search={taskSearch} onChoose={onChoose} />
  if (status === 'loading') return <div className="flex flex-col gap-6 pt-2">
    {[0, 1, 2].map(day => <div key={day} className="flex flex-col gap-2">
      <Skeleton className="h-3 w-16" /><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-4/5" />
    </div>)}
  </div>
  return status === 'error' && <Alert variant="destructive">
    <AlertTitle>Tasks could not be loaded.</AlertTitle>
    <AlertDescription><Button size="sm" onClick={onRetry}>Try again</Button></AlertDescription>
  </Alert>
}

/** The week's focus, the one thing on this screen that is not a task. It saves when the box loses focus. */
export function WeekGoal({ goal, onCommit }: { goal: string; onCommit: (goal: string) => void }) {
  const [draft, setDraft] = useState(goal)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const input = inputRef.current!
    input.style.height = 'auto'
    input.style.height = `${input.scrollHeight}px`
  }, [draft])
  return <div className="bg-muted/50 mb-3 flex items-start gap-2.5 rounded-lg px-3 py-2.5">
    <TargetIcon aria-hidden="true" className="text-primary mt-0.5 size-4 shrink-0" />
    <div className="min-w-0 flex-1">
      <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">Focus</p>
      <textarea ref={inputRef} rows={1} value={draft} onChange={event => setDraft(event.target.value)} onBlur={() => onCommit(draft.trim())}
        onKeyDown={event => {
          if (event.key === 'Escape') setDraft(goal)
          if (event.key === 'Enter') event.preventDefault()
          if (event.key === 'Enter' || event.key === 'Escape') event.currentTarget.blur()
        }}
        placeholder="What is this week for?" aria-label="Goal for the week"
        className="placeholder:text-muted-foreground/50 w-full resize-none overflow-hidden bg-transparent text-base font-medium outline-none md:text-sm" />
    </div>
  </div>
}

/** The week's hours, and the move for its unfinished tasks. */
export function WeekSummary({ totals, inProgressCount, unfinished, sweep }: {
  totals: EffortTotals; inProgressCount: number; unfinished: number; sweep: (to: SweepDestination) => void
}) {
  return <div className="flex items-center gap-2 border-b pb-2">
    <p className="text-muted-foreground text-xs tabular-nums">
      This week {formatHours(totals.openHours)}h open · {formatHours(totals.doneHours)}h done
      {inProgressCount > 0 && ` · ${inProgressCount} in progress`}
      {totals.unestimatedCount > 0 && ` · ${totals.unestimatedCount} unestimated`}
    </p>
    {/* Hidden, not removed: removing it would move the week up when its last task is checked off. */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-hidden={unfinished === 0} tabIndex={unfinished === 0 ? -1 : undefined}
          className={cn('text-muted-foreground ml-auto h-7 shrink-0 text-xs', unfinished === 0 && 'pointer-events-none invisible')}>
          Move {unfinished} unfinished<ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-max min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => sweep('backlog')}><ArchiveIcon aria-hidden="true" /> To backlog</DropdownMenuItem>
          <DropdownMenuItem onClick={() => sweep('next_week')}><ArrowRightIcon aria-hidden="true" /> To next week</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
}
