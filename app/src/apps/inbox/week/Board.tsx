import type { RefObject } from 'react'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TaskSlot, WeekPlan } from '@/lib/board'
import { cn } from '@/lib/utils'
import { BacklogGroupColumn, NewBacklogGroupColumn, PlanDay } from './Cells'
import type { useGroupDrag, useTaskDrag } from './drag'
import { tasksInBacklogGroup } from './edits'
import type { CaretFocus, GroupHandlers, TaskHandlers } from './handlers'
import { tasksInGroup, type PlanGroup } from './plan'
import type { TaskRowHandlers } from './TaskRow'

type TaskDrag = ReturnType<typeof useTaskDrag>
type GroupDrag = ReturnType<typeof useGroupDrag>
type Shared = { plan: WeekPlan; drag: TaskDrag; focus: CaretFocus; add: TaskHandlers['add']; rowHandlers: TaskRowHandlers }

/** The day cells: three columns by two rows on a wide screen, one column on a phone, or one day in the Day view. */
export function DayGroups({ day, plan, today, todayRef, groups, drag, focus, add, rowHandlers }: Shared & {
  day: boolean
  /** The slot of today, when the week on screen is this week. */
  today: TaskSlot | null
  todayRef: RefObject<HTMLDivElement | null>
  groups: PlanGroup[]
}) {
  return <>
    {day && tasksInGroup(plan.slots, groups[0]).length === 0 &&
      <p className="py-3 text-sm text-muted-foreground">No tasks on this day. Use Add task to add one.</p>}
    <div className={cn(!day && 'md:grid md:grid-cols-2 md:gap-x-6 lg:grid-cols-3')}>
      {groups.map(group => {
        const isToday = group.slots.includes(today!)
        return <div key={group.key} ref={isToday ? todayRef : undefined} className="border-b md:border-b-0">
          <PlanDay group={group} week={plan.week} tasks={tasksInGroup(plan.slots, group)} backlogGroups={plan.backlogGroups}
            today={isToday} draggingId={drag.draggingId} dragOverIndex={drag.indexFor(group.key)} dragOver={drag.isOver(group.key)}
            focus={focus} onAdd={add} {...rowHandlers} />
        </div>
      })}
    </div>
  </>
}

/** The backlog: tasks in no week, shown in every week, in groups the person names and orders. */
export function Backlog({ plan, groupDrag, drag, focus, add, rowHandlers, addingGroup, setAddingGroup, groupHandlers }: Shared & {
  groupDrag: GroupDrag
  addingGroup: boolean
  setAddingGroup: (adding: boolean) => void
  groupHandlers: GroupHandlers
}) {
  return <div className="mt-2 border-t pt-3">
    <div className="mb-1 flex items-center gap-2 px-1">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Unscheduled tasks</h2>
      <span className="text-muted-foreground/60 text-[10px]">every week</span>
      <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setAddingGroup(true)}><PlusIcon aria-hidden="true" />New subgroup</Button>
    </div>
    <div data-testid="backlog-grid" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-x-6">
      {/* During a group drag, the board shows the order a release would give. */}
      {(groupDrag.order ?? plan.backlogGroups).map((group, at) => <div key={group.id} data-group-drop-index={at} className="border-b md:border-b-0">
        <BacklogGroupColumn group={group} backlogGroups={plan.backlogGroups} index={plan.backlogGroups.indexOf(group)}
          lifted={groupDrag.draggingId === group.id} tasks={tasksInBacklogGroup(plan, group.id)} draggingId={drag.draggingId}
          dragOverIndex={drag.indexFor('backlog', group.id)} dragOver={drag.isOver('backlog', group.id)} focus={focus}
          onAdd={(groupId, title) => add('backlog', title, groupId)} onRenameGroup={groupHandlers.renameGroup}
          onDeleteGroup={groupHandlers.deleteGroup} onMoveGroup={groupHandlers.moveGroup} onGroupDragStart={groupDrag.start} {...rowHandlers} />
      </div>)}
      {addingGroup && <NewBacklogGroupColumn onCancel={() => setAddingGroup(false)} onSave={groupHandlers.createGroup} />}
    </div>
  </div>
}

/** The row being dragged stays in place, faded, and a copy follows the finger: the copy says what moves. */
export function DragGhosts({ drag, groupDrag }: { drag: TaskDrag; groupDrag: GroupDrag }) {
  const ghost = drag.drag ?? groupDrag.drag
  if (!ghost) return null
  const text = drag.drag ? drag.drag.task.title : groupDrag.drag!.item.name
  return <div style={{ left: ghost.x + 12, top: ghost.y - 16 }} className={cn(
    'bg-background pointer-events-none fixed z-50 max-w-[70vw] truncate rounded-md border px-3 py-1.5 shadow-lg',
    drag.drag ? 'text-sm' : 'text-muted-foreground text-xs font-semibold tracking-wide uppercase')}>{text}</div>
}
