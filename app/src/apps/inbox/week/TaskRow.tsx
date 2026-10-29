import { memo, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { CalendarDaysIcon, GripVerticalIcon, PauseIcon, PlayIcon, Trash2Icon } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseTaskTitle, toIsoDate, type BacklogGroup, type Task } from '@/lib/board'
import { cn } from '@/lib/utils'
import { useReturnFocus } from './hooks'
import { estimateOptions, formatHours, localDay, slotDate } from './plan'

export interface TaskRowHandlers {
  onToggle: (task: Task) => void
  onSetProgress: (task: Task) => void
  onSetCategory: (task: Task, groupId: string) => void
  onRename: (task: Task, title: string) => void
  onSetEstimate: (task: Task, hours: number | null) => void
  onMoveBy: (task: Task, delta: number) => void
  onMoveToBacklog: (task: Task) => void
  onMoveToDate: (task: Task, date: string) => void
  onCarryForward: (task: Task) => void
  onDelete: (task: Task) => void
  onDragStart: (task: Task, event: React.PointerEvent) => void
  /** Enter cuts the line at the caret, as a text editor does. */
  onSplit: (task: Task, before: string, after: string) => void
  /** Backspace at the start of a line joins it to the line above. */
  onMergeBack: (task: Task, text: string) => void
  onFocusSibling: (task: Task, delta: number, caret: number) => void
}

/** A chat's plan: a plan in the Inbox opens in the app, and any other link opens in a new tab. */
function PlanTag({ url }: { url: string }) {
  const at = URL.parse(url, location.href)
  const here = at?.origin === location.origin && at.pathname === '/apps/inbox/'
  return <Badge asChild variant="outline" className="mt-1 shrink-0">
    {here ? <Link to={`${at.pathname}${at.search}`}>Plan</Link> : <a href={url} target="_blank" rel="noreferrer">Plan</a>}
  </Badge>
}

/** The grip's menu: what the task is above the line, what to do with the row below it. */
function RowMenu({ task, backlogGroups, onDate, handlers }: {
  task: Task; backlogGroups: BacklogGroup[]; onDate: () => void; handlers: TaskRowHandlers
}) {
  const [open, setOpen] = useState(false)
  // True while the grip is pressed: the menu opens on release, because on press it would cover the row being dragged.
  const pressing = useRef(false)
  const scheduled = task.slot !== 'backlog'
  return <DropdownMenu open={open} onOpenChange={next => { if (!next || !pressing.current) setOpen(next) }}>
    {/* iOS takes press-and-hold as "select text": the styles stop its bar, and touch-none stops the scroll. */}
    <DropdownMenuTrigger aria-label={`Task actions for ${task.title}`}
      onPointerDown={event => { pressing.current = true; handlers.onDragStart(task, event) }}
      onPointerUp={() => { pressing.current = false }} onPointerCancel={() => { pressing.current = false }}
      onClick={() => setOpen(true)} onContextMenu={event => event.preventDefault()}
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
      className="text-muted-foreground/40 hover:text-muted-foreground active:text-foreground mt-0.5 -ml-1 shrink-0 cursor-grab touch-none self-start rounded p-1 select-none active:cursor-grabbing">
      <GripVerticalIcon aria-hidden="true" className="size-4" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="w-max min-w-48 max-w-(--radix-dropdown-menu-content-available-width)">
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>Estimate</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuGroup>
            {estimateOptions.map(hours => <DropdownMenuItem key={hours} onClick={() => handlers.onSetEstimate(task, hours)}>
              {formatHours(hours)}h{task.estimateHours === hours ? ' ✓' : ''}
            </DropdownMenuItem>)}
            <DropdownMenuItem onClick={() => handlers.onSetEstimate(task, null)}>
              No estimate{task.estimateHours === null ? ' ✓' : ''}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      {scheduled && <DropdownMenuSub>
        <DropdownMenuSubTrigger>Category</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuGroup>
            {backlogGroups.map(group => <DropdownMenuItem key={group.id} onClick={() => handlers.onSetCategory(task, group.id)}>
              {group.name}{task.backlogGroupId === group.id ? ' ✓' : ''}
            </DropdownMenuItem>)}
          </DropdownMenuGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>}
      <DropdownMenuSeparator />
      {scheduled && <>
        <DropdownMenuItem className="whitespace-nowrap" onClick={() => handlers.onCarryForward(task)}>Move to next week</DropdownMenuItem>
        <DropdownMenuItem className="whitespace-nowrap" onClick={() => handlers.onMoveToBacklog(task)}>Move to backlog</DropdownMenuItem>
      </>}
      <DropdownMenuItem className="whitespace-nowrap" onClick={() => { setOpen(false); onDate() }}>
        <CalendarDaysIcon aria-hidden="true" />Move to date…
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onClick={() => handlers.onDelete(task)}><Trash2Icon aria-hidden="true" />Delete</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
}

function DateDialog({ task, open, setOpen, onMove }: { task: Task; open: boolean; setOpen: (open: boolean) => void; onMove: (date: string) => void }) {
  const back = useReturnFocus(open)
  const [date, setDate] = useState(() => task.week ? toIsoDate(slotDate(task.week, task.slot)) : localDay())
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent onCloseAutoFocus={back}>
      <DialogHeader>
        <DialogTitle>Move task to a date</DialogTitle>
        <DialogDescription>Choose the day for {task.title}.</DialogDescription>
      </DialogHeader>
      <form className="flex flex-col gap-4" onSubmit={event => { event.preventDefault(); onMove(date); setOpen(false) }}>
        <div className="grid gap-2">
          <Label htmlFor={`move-date-${task.id}`}>Date</Label>
          <Input id={`move-date-${task.id}`} type="date" required value={date} onChange={event => setDate(event.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit">Move task</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}

/** Sized, unfinished work gets the start button; other work gets the estimate picker. Started work keeps the button. */
function Progress({ task, handlers }: { task: Task; handlers: TaskRowHandlers }) {
  const started = task.status === 'in_progress'
  const hours = task.estimateHours === null ? null : `${formatHours(task.estimateHours)}h`
  if (task.status !== 'done' && (hours || started)) return <div className="flex shrink-0 flex-col items-center">
    <Button type="button" variant="ghost" size="icon-sm" aria-label={`${started ? 'Stop' : 'Start'} ${task.title}`}
      onClick={() => handlers.onSetProgress(task)} className="text-muted-foreground hover:text-foreground">
      {started ? <PauseIcon aria-hidden="true" /> : <PlayIcon aria-hidden="true" />}
    </Button>
    {hours && <span data-testid="task-hours" className="text-muted-foreground -mt-0.5 text-[10px] leading-none tabular-nums">{hours}</span>}
  </div>
  return <DropdownMenu>
    <DropdownMenuTrigger aria-label={`Estimate for ${task.title}`} className={cn('inline-flex h-7 shrink-0 items-center rounded px-1.5 text-xs tabular-nums transition-colors hover:text-foreground',
      hours ? 'text-muted-foreground' : 'text-muted-foreground/40')}>
      {hours ?? '–'}
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {estimateOptions.map(option => <DropdownMenuItem key={option} onClick={() => handlers.onSetEstimate(task, option)}>{formatHours(option)}h</DropdownMenuItem>)}
      <DropdownMenuItem onClick={() => handlers.onSetEstimate(task, null)}>No estimate</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
}

/** One line of the week. The title is always a text box, so a tap puts the caret there and a cell edits like a page. */
export const TaskRow = memo(function TaskRow({ task, backlogGroups, dragging, focus, ...handlers }: TaskRowHandlers & {
  task: Task
  backlogGroups: BacklogGroup[]
  dragging: boolean
  /** Set when the week moves the caret here: a new object each time, so the same caret asked twice still moves. */
  focus?: { caret: number }
}) {
  const canonical = task.title
  const [draft, setDraft] = useState(canonical)
  const [dateOpen, setDateOpen] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const dirty = useRef(false)

  // A task is a line of text: it wraps and the row grows.
  useEffect(() => {
    const input = inputRef.current!
    input.style.height = 'auto'
    input.style.height = `${input.scrollHeight}px`
  }, [draft])
  // The task can change under the box: a drag, a roll back, a real id. A line being typed keeps its text.
  useEffect(() => { if (!dirty.current) setDraft(canonical) }, [canonical])
  useEffect(() => {
    if (!focus) return
    const input = inputRef.current!
    input.focus({ preventScroll: true })
    const caret = Math.min(focus.caret, input.value.length)
    input.setSelectionRange(caret, caret)
  }, [focus])

  function save() {
    if (!dirty.current) return
    dirty.current = false
    const next = draft.trim()
    // A blank line is no task, but an existing one stays: deleting it would be too easy by accident.
    if (!next) return setDraft(canonical)
    if (next === canonical) return
    handlers.onRename(task, next)
    // A typed estimate goes to the picker.
    setDraft(parseTaskTitle(next).title)
  }

  function key(event: KeyboardEvent<HTMLTextAreaElement>) {
    const input = event.currentTarget
    const caret = input.selectionStart
    const up = event.key === 'ArrowUp'
    if (event.key === 'Enter' || (event.key === 'Backspace' && caret === 0 && input.selectionEnd === 0)) {
      event.preventDefault()
      dirty.current = false
      if (event.key === 'Enter') handlers.onSplit(task, draft.slice(0, caret), draft.slice(caret))
      else handlers.onMergeBack(task, draft)
    } else if (event.key === 'Escape') {
      dirty.current = false
      setDraft(canonical)
      input.blur()
    } else if ((up || event.key === 'ArrowDown') && event.altKey) {
      event.preventDefault()
      handlers.onMoveBy(task, up ? -1 : 1)
    } else if (up ? caret === 0 : event.key === 'ArrowDown' && caret === draft.length) {
      // A wrapped task is several lines: the caret leaves the row only from its very start or end.
      event.preventDefault()
      save()
      handlers.onFocusSibling(task, up ? -1 : 1, caret)
    }
  }

  const done = task.status === 'done'
  const started = task.status === 'in_progress'
  return <li data-task-id={task.id} data-testid="task-row" className={cn(
    // `data-found` marks, for a moment, the row a search result led to.
    'group/task flex items-start gap-2 rounded-md py-1.5 pr-1 pl-0.5 transition-colors duration-500 data-[found]:bg-muted data-[found]:ring-1 data-[found]:ring-ring/40',
    dragging && 'opacity-30')}>
    <RowMenu task={task} backlogGroups={backlogGroups} onDate={() => setDateOpen(true)} handlers={handlers} />
    <DateDialog task={task} open={dateOpen} setOpen={setDateOpen} onMove={date => handlers.onMoveToDate(task, date)} />
    <span className="relative mt-1 flex size-4 shrink-0">
      <Checkbox checked={done} onCheckedChange={() => handlers.onToggle(task)} aria-label={started ? `${task.title}, in progress` : task.title} />
      {started && <span aria-hidden="true" className="bg-primary pointer-events-none absolute inset-[5px] rounded-full" />}
    </span>
    <div className="min-w-0 flex-1">
      {/* 16px on a phone, or iOS Safari zooms in on focus. */}
      <textarea ref={inputRef} rows={1} data-testid="task-title" value={draft} placeholder="New task"
        aria-label={task.title ? `Edit ${task.title}` : 'New task'}
        onChange={event => { dirty.current = true; setDraft(event.target.value) }} onBlur={save} onKeyDown={key}
        className={cn('w-full resize-none overflow-hidden bg-transparent text-base leading-6 outline-none md:text-sm',
          started && 'font-medium', done && 'text-muted-foreground line-through')} />
      {task.chat && <p className="text-muted-foreground text-xs wrap-anywhere">{task.chat}</p>}
    </div>
    {task.link && <PlanTag url={task.link} />}
    <Progress task={task} handlers={handlers} />
  </li>
})
