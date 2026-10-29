import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { daySlots, weekStart, type BacklogGroup, type SweepDestination, type Task, type TaskSearchResult, type WeekPlan } from '@/lib/board'
import { board } from '../api'
import { Backlog, DayGroups, DragGhosts } from './Board'
import { useGroupDrag, useTaskDrag, type DropTarget } from './drag'
import { hasDraft, isDraft, moveTask, sweepToBacklog, sweepToNextWeek, unfinishedInDays } from './edits'
import { useEdits, type CaretFocus } from './handlers'
import { sameData, useRevalidate, useSearch } from './hooks'
import { InboxStatus, NoticeLine, PlanHeader, PlanStatus, WeekGoal, WeekSummary, type Notice } from './Parts'
import {
  addInputId, effortTotals, groupsForView, scheduleDay, scheduleView, scheduleWeek, selectedGroup, slotForDate, type ScheduleView,
} from './plan'

// The clock, read in a function, so a render reads it the same way each time.
const today = () => new Date()

/** The Inbox: the person's week, opened many times a day. An edit shows at once and its request goes out behind it; a
 *  failed request takes it back. Coming back to the page, or a look on the live line, reads the week again quietly. */
export function Week() {
  const [params, setParams] = useSearchParams()
  const day = scheduleDay(params.get('day'))
  const view = scheduleView(params.get('view'))
  const week = scheduleWeek(day)
  const changeSelection = (nextDay: string, nextView: ScheduleView = view) => setParams({ day: nextDay, view: nextView })
  const viewRef = useRef(view)
  useEffect(() => { viewRef.current = view }, [view])
  const [plan, setPlan] = useState<WeekPlan | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [notice, setNotice] = useState<Notice | null>(null)
  /** Where the caret goes next: what Enter, Backspace and the arrows move. */
  const [focus, setFocus] = useState<CaretFocus>(null)
  const [addingGroup, setAddingGroup] = useState(false)
  const [addRequested, setAddRequested] = useState(false)
  const pendingGroups = useRef(new Map<string, Promise<BacklogGroup>>())
  const todayRef = useRef<HTMLDivElement>(null)
  const planRef = useRef<WeekPlan | null>(null)
  const currentWeek = weekStart(today())
  /** Null while the search is closed; a text, maybe empty, while it is open. */
  const [searchQuery, setSearchQuery] = useState<string | null>(null)
  const taskSearch = useSearch(searchQuery ?? '', query => board.search(query).then(answer => answer.tasks))
  /** The task a search result led to, until it was shown. */
  const [found, setFound] = useState<{ id: string; week: string } | null>(null)
  const status = taskSearch.status !== 'idle' ? 'results' : failed ? 'error' : plan?.week !== week ? 'loading' : 'ready'

  // The week on screen, for answers that come late: a write for a week no longer on screen is dropped.
  const weekRef = useRef(week)
  useEffect(() => { weekRef.current = week }, [week])
  const write = useCallback((forWeek: string, next: WeekPlan) => {
    if (forWeek !== weekRef.current) return
    planRef.current = next
    setPlan(next)
  }, [])
  const reload = useCallback(() => { setFailed(false); setAttempt(count => count + 1) }, [])

  useEffect(() => {
    let cancelled = false
    board.week(week).then(next => {
      if (cancelled) return
      // A read that found nothing new must not redraw the board: the caret would move while the person types.
      if (!sameData(planRef.current, next.plan)) { planRef.current = next.plan; setPlan(next.plan) }
      setFailed(false)
    }, () => {
      // Only a quiet read of the week on screen fails quietly; a first read has nothing to show but the error.
      if (!cancelled && planRef.current?.week !== week) setFailed(true)
    })
    return () => { cancelled = true }
  }, [week, attempt])

  // A typed task the app has not stored is only here: a read now would delete it.
  const arrive = useRevalidate(reload, plan ? hasDraft(plan) : false)

  // In the Week view of this week, today comes into view.
  useEffect(() => {
    if (status === 'ready' && week === currentWeek && view === 'week') todayRef.current!.scrollIntoView({ block: 'center' })
  }, [status, week, currentWeek, view])

  // A search result opens its week and marks the row, when that week is on screen.
  useEffect(() => {
    if (!found || plan?.week !== found.week) return
    const row = [...document.querySelectorAll<HTMLElement>('[data-task-id]')].find(each => each.dataset.taskId === found.id)
    if (!row) return
    row.scrollIntoView({ block: 'center' })
    row.dataset.found = ''
    const timer = setTimeout(() => setFound(null), 2000)
    return () => { clearTimeout(timer); delete row.dataset.found }
  }, [found, plan?.week])

  function chooseResult(task: TaskSearchResult) {
    // A backlog task is in every week, so the week on screen shows it already.
    const target = task.week ?? week
    setSearchQuery(null)
    changeSelection(target, 'week')
    setFound({ id: task.id, week: target })
  }

  const fail = useCallback((text: string) => setNotice({ text, error: true }), [])
  /** Shows the change, sends it, and takes it back only if the request fails. */
  const commit = useCallback((next: WeekPlan, send: () => Promise<unknown>, failure: string) => {
    const rollback = planRef.current!
    write(next.week, next)
    send().catch(() => { write(next.week, rollback); fail(failure) })
  }, [write, fail])
  const { handlers, groupHandlers } = useEdits({ planRef, pendingGroups, commit, write, fail, viewRef, setFocus, setAddingGroup })

  const drop = useCallback((task: Task, target: DropTarget) => {
    const state = planRef.current!
    const moved = moveTask(state, task.id, target.slot, target.index, target.backlogGroupId ?? undefined)
    // The week is the one on screen at the drop.
    commit(moved.plan, () => board.change(task.id, {
      week: state.week, slot: target.slot, backlogGroupId: target.backlogGroupId ?? undefined, index: moved.index,
    }), 'That move did not save.')
  }, [commit])
  const drag = useTaskDrag(drop)
  const groupDrag = useGroupDrag(plan?.backlogGroups ?? [], groupHandlers.moveGroup)

  // A task the app has not stored yet can only be typed in, deleted, split or joined.
  const rowHandlers = useMemo(() => {
    const stored = <Rest extends unknown[]>(act: (task: Task, ...rest: Rest) => void) =>
      (task: Task, ...rest: Rest) => { if (!isDraft(task)) act(task, ...rest) }
    return {
      onToggle: stored(handlers.onToggle), onSetProgress: stored(handlers.onSetProgress), onSetCategory: stored(handlers.onSetCategory),
      onMoveBy: stored(handlers.onMoveBy), onMoveToBacklog: stored(handlers.onMoveToBacklog), onMoveToDate: stored(handlers.onMoveToDate),
      onCarryForward: stored(handlers.onCarryForward), onSetEstimate: stored(handlers.onSetEstimate), onDragStart: stored(drag.start),
      onRename: handlers.onRename, onDelete: handlers.onDelete, onSplit: handlers.onSplit, onMergeBack: handlers.onMergeBack,
      onFocusSibling: handlers.onFocusSibling,
    }
  }, [handlers, drag.start])

  /** The end of the week: what did not happen is moved, not lost. */
  const sweep = (to: SweepDestination) => {
    const state = planRef.current!
    const moved = unfinishedInDays(state)
    const next = to === 'next_week' ? sweepToNextWeek(state) : sweepToBacklog(state)
    commit(next, () => board.sweep(state.week, to), 'Those tasks were not moved.')
    setNotice({ text: `${moved} unfinished ${moved === 1 ? 'task' : 'tasks'} moved to ${to === 'next_week' ? 'next week' : 'the backlog'}.`, error: false })
  }
  /** The week's focus, saved when the box loses focus, not at each key. */
  const setGoal = (goal: string) => {
    const state = planRef.current!
    if (goal !== state.goal) commit({ ...state, goal }, () => board.goal(state.week, goal), 'That goal did not save.')
  }

  useEffect(() => {
    if (!addRequested) return
    const frame = requestAnimationFrame(() => { document.getElementById(addInputId(selectedGroup(day)))!.focus(); setAddRequested(false) })
    return () => cancelAnimationFrame(frame)
  }, [addRequested, day])

  const weekTasks = plan ? daySlots.flatMap(slot => plan.slots[slot]) : []
  return <>
    <div className="mb-6 flex min-h-11 items-center gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-2"><h1 className="min-w-0 truncate">Inbox</h1><InboxStatus onLook={arrive} /></div>
      <Button className="min-h-11" disabled={status !== 'ready'} onClick={() => { changeSelection(day, 'day'); setAddRequested(true) }}>
        <PlusIcon data-icon="inline-start" />Add task
      </Button>
    </div>
    <PlanHeader view={view} day={day} week={week} searchQuery={searchQuery} setSearchQuery={setSearchQuery} changeSelection={changeSelection} />
    {notice && <NoticeLine notice={notice} onClose={() => setNotice(null)} />}
    <PlanStatus status={status} searchQuery={searchQuery} taskSearch={taskSearch} onChoose={chooseResult} onRetry={reload} />
    {status === 'ready' && <>
      {view === 'week' && <>
        <WeekGoal key={plan!.week} goal={plan!.goal} onCommit={setGoal} />
        <WeekSummary totals={effortTotals(weekTasks)} inProgressCount={weekTasks.filter(task => task.status === 'in_progress').length}
          unfinished={unfinishedInDays(plan!)} sweep={sweep} />
      </>}
      <DayGroups day={view === 'day'} plan={plan!} today={week === currentWeek ? slotForDate(today()) : null} todayRef={todayRef}
        groups={groupsForView(day, view)} drag={drag} focus={focus} add={handlers.add} rowHandlers={rowHandlers} />
      <Backlog plan={plan!} groupDrag={groupDrag} drag={drag} focus={focus} add={handlers.add} rowHandlers={rowHandlers}
        addingGroup={addingGroup} setAddingGroup={setAddingGroup} groupHandlers={groupHandlers} />
    </>}
    <DragGhosts drag={drag} groupDrag={groupDrag} />
  </>
}
