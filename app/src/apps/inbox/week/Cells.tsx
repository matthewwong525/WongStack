import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDownIcon, ArrowUpIcon, GripVerticalIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import type { BacklogGroup, Task } from '@/lib/board'
import { cn } from '@/lib/utils'
import { useReturnFocus } from './hooks'
import { addInputId, backlogAddInputId, effortTotals, groupDateLabel, summarize, type PlanGroup } from './plan'
import { TaskRow, type TaskRowHandlers } from './TaskRow'

/** What a cell shares: its tasks, where a drag would drop, and the row the caret goes to. */
type CellProps = TaskRowHandlers & {
  tasks: Task[]
  backlogGroups: BacklogGroup[]
  dragOverIndex: number | null
  dragOver: boolean
  draggingId: string | null
  focus: { id: string; caret: number } | null
}

const DropLine = () => <div data-testid="drop-line" className="bg-primary mx-1 h-0.5 rounded-full" />

/** A cell's frame: its heading, its rows with the drop line, and a box that adds a task. An empty cell shows no words,
 *  but a drag can still drop there. */
function Cell({ cell, heading, testId, addId, addLabel, onAdd, className, ...props }: CellProps & {
  cell: Record<string, string>; heading: ReactNode; testId: string; addId: string; addLabel: string
  onAdd: (title: string) => void; className?: string
}) {
  const { tasks, backlogGroups, dragOverIndex, dragOver, draggingId, focus, ...handlers } = props
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  // The box is cleared first, so the next key goes into an empty box, whatever the network does.
  const add = () => {
    const title = draft.trim()
    if (!title) return
    setDraft('')
    onAdd(title)
    inputRef.current!.focus()
  }
  return <section {...cell} className={cn('rounded-lg py-3 transition-colors', dragOver && 'bg-primary/5 ring-primary/30 ring-1', className)}>
    {heading}
    {tasks.length === 0
      ? <div data-drop-index={0} className="pl-6">{dragOverIndex === 0 && <DropLine />}</div>
      : <ul data-testid={testId}>
        {tasks.map((task, index) => <div key={task.id} data-drop-index={index}>
          {dragOverIndex === index && <DropLine />}
          <TaskRow task={task} backlogGroups={backlogGroups} dragging={draggingId === task.id}
            focus={focus?.id === task.id ? focus : undefined} {...handlers} />
        </div>)}
        {dragOverIndex === tasks.length && <DropLine />}
      </ul>}
    <div className="flex items-center gap-2 pl-6">
      <PlusIcon aria-hidden="true" className="text-muted-foreground/50 size-3.5 shrink-0" />
      <input id={addId} ref={inputRef} value={draft} onChange={event => setDraft(event.target.value)} onBlur={add}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); add() } }}
        placeholder="Add task" aria-label={addLabel}
        className="placeholder:text-muted-foreground/50 min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none md:text-sm" />
    </div>
  </section>
}

/** One day of the week, or the weekend as one cell. New tasks go in the cell's first slot. */
export function PlanDay({ group, week, today, onAdd, ...props }: CellProps & {
  group: PlanGroup; week: string; today: boolean; onAdd: (slot: PlanGroup['key'], title: string) => void
}) {
  return <Cell {...props} cell={{ 'data-slot-key': group.key }} testId={`day-${group.key}`} addId={addInputId(group)}
    addLabel={`Add task to ${group.label}`} onAdd={title => onAdd(group.key, title)} heading={
      <div className="mb-1 flex items-baseline gap-2 px-1">
        <h2 className={cn('text-xs font-semibold tracking-wide uppercase', today ? 'text-foreground' : 'text-muted-foreground')}>
          {group.label}<span className="ml-1 font-normal opacity-60">{groupDateLabel(week, group)}</span>
        </h2>
        {today && <span className="bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-medium">today</span>}
        <span className="text-muted-foreground/70 ml-auto text-xs tabular-nums">{summarize(effortTotals(props.tasks))}</span>
      </div>} />
}

type GroupProps = CellProps & {
  group: BacklogGroup
  /** Where this group is on the board, for the moves at either end. */
  index: number
  /** True while this whole group is being dragged to a new place. */
  lifted: boolean
  onAdd: (groupId: string, title: string) => void
  onRenameGroup: (group: BacklogGroup, name: string) => string | null
  onDeleteGroup: (group: BacklogGroup) => void
  onMoveGroup: (group: BacklogGroup, index: number) => void
  onGroupDragStart: (group: BacklogGroup, event: React.PointerEvent) => void
}

/** One group of the backlog. Its grip drags the group on press-and-move and opens its menu on a tap, as a row does. */
export function BacklogGroupColumn({ group, index, lifted, onAdd, onRenameGroup, onDeleteGroup, onMoveGroup, onGroupDragStart, ...props }: GroupProps) {
  const [renaming, setRenaming] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const back = useReturnFocus(confirming)
  const [menuOpen, setMenuOpen] = useState(false)
  const pressing = useRef(false)
  const count = props.tasks.length
  const pick = (action: () => void) => () => { setMenuOpen(false); action() }
  const heading = renaming
    ? <GroupNameEditor initial={group.name} onCancel={() => setRenaming(false)} onSave={name => {
      const error = onRenameGroup(group, name)
      if (!error) setRenaming(false)
      return error
    }} />
    : <div className="mb-1 flex min-h-7 items-center gap-2 px-1">
      <DropdownMenu open={menuOpen} onOpenChange={next => { if (!next || !pressing.current) setMenuOpen(next) }}>
        <DropdownMenuTrigger aria-label={`Manage ${group.name}`}
          onPointerDown={event => { pressing.current = true; onGroupDragStart(group, event) }}
          onPointerUp={() => { pressing.current = false }} onPointerCancel={() => { pressing.current = false }}
          onClick={() => setMenuOpen(true)} onContextMenu={event => event.preventDefault()}
          style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
          className="text-muted-foreground/40 hover:text-muted-foreground active:text-foreground -ml-1 shrink-0 cursor-grab touch-none rounded p-1 select-none active:cursor-grabbing">
          <GripVerticalIcon aria-hidden="true" className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-max min-w-44">
          <DropdownMenuGroup>
            {!group.isDefault && <DropdownMenuItem onClick={pick(() => setRenaming(true))}><PencilIcon aria-hidden="true" /> Rename</DropdownMenuItem>}
            <DropdownMenuItem disabled={index === 0} onClick={pick(() => onMoveGroup(group, index - 1))}>
              <ArrowUpIcon aria-hidden="true" /> Move earlier
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === props.backlogGroups.length - 1} onClick={pick(() => onMoveGroup(group, index + 1))}>
              <ArrowDownIcon aria-hidden="true" /> Move later
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {!group.isDefault && <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={pick(() => setConfirming(true))}>
              <Trash2Icon aria-hidden="true" /> Delete subgroup
            </DropdownMenuItem>
          </>}
        </DropdownMenuContent>
      </DropdownMenu>
      <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{group.name}</h3>
      {group.isDefault && <Badge variant="secondary">default</Badge>}
      <span className="text-muted-foreground/70 ml-auto text-xs tabular-nums">{summarize(effortTotals(props.tasks))}</span>
    </div>
  return <>
    <Cell {...props} cell={{ 'data-slot-key': 'backlog', 'data-backlog-group-id': group.id }} heading={heading}
      testId={group.isDefault ? 'day-backlog' : `backlog-group-${group.id}`} addId={backlogAddInputId(group.id)}
      addLabel={`Add task to ${group.name}`} onAdd={title => onAdd(group.id, title)} className={cn(lifted && 'opacity-30')} />
    <AlertDialog open={confirming} onOpenChange={setConfirming}>
      <AlertDialogContent onCloseAutoFocus={back}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {group.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {count === 0 ? 'The empty subgroup will be removed.' : `${count} ${count === 1 ? 'task' : 'tasks'} will move to Other.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => onDeleteGroup(group)}>Delete subgroup</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
}

/** The name box of a new group, where its column will be. */
export function NewBacklogGroupColumn({ onCancel, onSave }: { onCancel: () => void; onSave: (name: string) => string | null }) {
  return <section className="rounded-lg py-3"><GroupNameEditor initial="" onCancel={onCancel} onSave={onSave} /></section>
}

/** A group's name: Enter saves, Escape stops, and an empty name stops too. */
function GroupNameEditor({ initial, onCancel, onSave }: { initial: string; onCancel: () => void; onSave: (name: string) => string | null }) {
  const [name, setName] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => ref.current!.focus(), [])
  const save = () => name.trim() ? setError(onSave(name.trim())) : onCancel()
  return <div className="flex flex-col gap-1 px-1">
    <Input ref={ref} value={name} maxLength={80} aria-label="Subgroup name" aria-invalid={Boolean(error)}
      onChange={event => { setName(event.target.value); setError(null) }} onBlur={save}
      onKeyDown={event => {
        if (event.key === 'Enter') { event.preventDefault(); save() }
        if (event.key === 'Escape') { event.preventDefault(); onCancel() }
      }} />
    {error && <p className="text-destructive text-xs" role="alert">{error}</p>}
    <p className="text-muted-foreground text-[10px]">Enter to save · Esc to cancel</p>
  </div>
}
