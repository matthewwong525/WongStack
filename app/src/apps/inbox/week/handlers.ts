import { useMemo, type Dispatch, type RefObject, type SetStateAction } from 'react'
import { orderTasks, parseTaskTitle, shiftWeek, weekStart, type BacklogGroup, type Task, type TaskSlot, type WeekPlan } from '@/lib/board'
import { board } from '../api'
import {
  appendBacklogGroup, appendTask, defaultBacklogGroup, draftTask, indexOf, insertAfter, isDraft, moveBacklogGroup, moveTask,
  removeBacklogGroup, removeTask, renameBacklogGroup, replaceTask, setTaskStatus, tasksInBacklogGroup,
} from './edits'
import {
  addInputId, backlogAddInputId, formatTaskTitle, localDateFromIsoDate, planGroups, slotForDate, tasksInGroup,
  type PlanGroup, type ScheduleView,
} from './plan'

export type CaretFocus = { id: string; caret: number } | null

/** What every edit needs: the week on screen, the groups still being made, and the ways to show and send a change. */
export type EditContext = {
  planRef: RefObject<WeekPlan | null>
  pendingGroups: RefObject<Map<string, Promise<BacklogGroup>>>
  /** Shows the change now, sends it, and takes it back with `failure` shown if the request fails. */
  commit: (next: WeekPlan, send: () => Promise<unknown>, failure: string) => void
  /** Shows a week, unless the person has moved on to another week. */
  write: (forWeek: string, next: WeekPlan) => void
  fail: (text: string) => void
}

/** A group's id as the app knows it: a group still being made waits for its id. */
const savedGroupId = (context: EditContext, id: string) => id.startsWith('draft_group_')
  ? context.pendingGroups.current.get(id)!.then(group => group.id) : Promise.resolve(id)

/** The week's task edits. Each one shows at once and its request goes out behind it. Rows show only when the week is
 *  loaded, so the week is always there. */
function createTaskHandlers(context: EditContext & {
  viewRef: RefObject<ScheduleView>
  setFocus: Dispatch<SetStateAction<CaretFocus>>
}) {
  const { planRef, commit, write, fail, viewRef, setFocus } = context
  const current = () => planRef.current!
  const edited = (raw: string, estimateHours: number | null) => {
    const parsed = parseTaskTitle(raw)
    return { title: parsed.title, estimateHours: parsed.estimateHours ?? estimateHours }
  }
  // In the Day view a cell is one day, also on the weekend.
  const groupOf = (slot: TaskSlot): PlanGroup => {
    const group = planGroups.find(each => each.slots.includes(slot))!
    return viewRef.current === 'week' ? group : { ...group, key: slot, slots: [slot] }
  }
  const tasksBeside = (state: WeekPlan, task: Task) => task.slot === 'backlog'
    ? tasksInBacklogGroup(state, task.backlogGroupId!) : tasksInGroup(state.slots, groupOf(task.slot))
  const indexBeside = (state: WeekPlan, task: Task) => task.slot === 'backlog'
    ? indexOf(state, ['backlog'], task.id, task.backlogGroupId) : indexOf(state, groupOf(task.slot).slots, task.id)
  const change = (task: Task, next: WeekPlan, body: Parameters<typeof board.change>[1], failure = 'That move did not save.') =>
    commit(next, () => board.change(task.id, body), failure)
  /** A draft's real id, once the app stored it; the caret stays on the same row. */
  const adopt = (week: string, draftId: string, created: Task) => {
    write(week, replaceTask(planRef.current!, draftId, { id: created.id }))
    setFocus(at => at?.id === draftId ? { ...at, id: created.id } : at)
  }
  const create = (state: WeekPlan, draft: Task, title: string) => board.add({ title, week: state.week, slot: draft.slot,
    backlogGroupId: draft.backlogGroupId ?? undefined }).then(({ task }) => adopt(state.week, draft.id, task))

  return {
    add(slot: TaskSlot, title: string, backlogGroupId?: string) {
      const state = current()
      const parsed = parseTaskTitle(title)
      const groupId = slot === 'backlog' ? backlogGroupId! : null
      const draft = draftTask(state.week, slot, parsed.title, parsed.estimateHours, groupId)
      // The row shows already; the answer only gives it its real id, so a later edit finds the task.
      commit(appendTask(state, draft), () => (groupId ? savedGroupId(context, groupId) : Promise.resolve(undefined))
        .then(saved => board.add({ title, week: state.week, slot, backlogGroupId: saved }))
        .then(({ task }) => write(state.week, replaceTask(planRef.current!, draft.id, task))), 'That task did not save.')
    },
    onToggle(task: Task) {
      const status = task.status === 'done' ? 'open' : 'done'
      change(task, setTaskStatus(current(), task.id, status), { status }, 'That change did not save.')
    },
    onSetProgress(task: Task) {
      const status = task.status === 'in_progress' ? 'open' : 'in_progress'
      change(task, setTaskStatus(current(), task.id, status), { status }, 'That change did not save.')
    },
    onSetCategory(task: Task, groupId: string) {
      change(task, replaceTask(current(), task.id, { backlogGroupId: groupId }), { backlogGroupId: groupId }, 'That category did not save.')
    },
    onRename(task: Task, raw: string) {
      const state = current()
      const next = edited(raw, task.estimateHours)
      const title = formatTaskTitle(next.title, next.estimateHours)
      // A line opened with Enter becomes a real task the first time it has text.
      if (isDraft(task)) commit(replaceTask(state, task.id, next), () => create(state, task, title), 'That task did not save.')
      else change(task, replaceTask(state, task.id, next), { title }, 'That rename did not save.')
    },
    onDelete(task: Task) {
      commit(removeTask(current(), task.id), () => isDraft(task) ? Promise.resolve() : board.remove(task.id), 'That task was not deleted.')
    },
    onMoveBy(task: Task, delta: number) {
      const state = current()
      const siblings = tasksBeside(state, task)
      const to = indexBeside(state, task) + delta
      if (to < 0 || to >= siblings.length) return
      if (task.slot === 'backlog') {
        const moved = moveTask(state, task.id, 'backlog', to, task.backlogGroupId!)
        return change(task, moved.plan, { slot: 'backlog', backlogGroupId: task.backlogGroupId!, index: moved.index })
      }
      // The weekend cell is two days, so a move lands in the slot of the row it passes, at its place in the bands.
      const target = siblings[to]
      const targetIndex = orderTasks(state.slots[target.slot]).findIndex(row => row.id === target.id)
      const index = delta > 0 && target.slot !== task.slot ? targetIndex + 1 : targetIndex
      const moved = moveTask(state, task.id, target.slot, index)
      change(task, moved.plan, { week: state.week, slot: target.slot, index: moved.index })
    },
    onMoveToBacklog(task: Task) {
      const state = current()
      const groupId = task.backlogGroupId ?? defaultBacklogGroup(state).id
      const moved = moveTask(state, task.id, 'backlog', tasksInBacklogGroup(state, groupId).length, groupId)
      change(task, moved.plan, { slot: 'backlog', backlogGroupId: groupId, index: moved.index })
    },
    onCarryForward(task: Task) {
      const state = current()
      change(task, removeTask(state, task.id), { week: shiftWeek(state.week, 1), slot: task.slot })
    },
    onMoveToDate(task: Task, date: string) {
      const state = current()
      const chosen = localDateFromIsoDate(date)
      if (!chosen) return
      const week = weekStart(chosen)
      const slot = slotForDate(chosen)
      if (week !== state.week) return change(task, removeTask(state, task.id), { week, slot })
      if (slot === task.slot) return
      const moved = moveTask(state, task.id, slot, state.slots[slot].length)
      change(task, moved.plan, { week, slot, index: moved.index })
    },
    /** Enter cuts the line at the caret. The end becomes a new line below, stored when it has text. */
    onSplit(task: Task, before: string, after: string) {
      const state = current()
      const kept = before.trim()
      const tail = parseTaskTitle(after)
      const draft = draftTask(state.week, task.slot, tail.title, tail.estimateHours, task.backlogGroupId)
      // Enter never blanks a task: an emptied line keeps its text.
      const renamed = Boolean(kept) && kept !== task.title
      const head = edited(kept, task.estimateHours)
      let next = insertAfter(state, task.id, draft)
      if (renamed) next = replaceTask(next, task.id, head)
      write(state.week, next)
      setFocus({ id: draft.id, caret: 0 })
      if (renamed && !isDraft(task)) {
        board.change(task.id, { title: formatTaskTitle(head.title, head.estimateHours) }).catch(() => fail('That rename did not save.'))
      }
      if (after.trim()) create(state, draft, after.trim()).catch(() => fail('That task did not save.'))
    },
    /** Backspace at the start of a line joins it to the line above, with the caret at the join. */
    onMergeBack(task: Task, text: string) {
      const state = current()
      const previous = tasksBeside(state, task)[indexBeside(state, task) - 1]
      // The first line of a cell has nothing above it to join.
      if (!previous) return
      const head = previous.title
      const joined = edited(`${head}${text.trim()}`, previous.estimateHours)
      write(state.week, replaceTask(removeTask(state, task.id), previous.id, joined))
      setFocus({ id: previous.id, caret: head.length })
      if (!isDraft(task)) board.remove(task.id).catch(() => fail('That task was not deleted.'))
      if (text.trim() && !isDraft(previous)) {
        board.change(previous.id, { title: formatTaskTitle(joined.title, joined.estimateHours) }).catch(() => fail('That rename did not save.'))
      }
    },
    /** An estimate is a tap on the hours, not a number to type. */
    onSetEstimate(task: Task, hours: number | null) {
      change(task, replaceTask(current(), task.id, { estimateHours: hours }), { title: formatTaskTitle(task.title, hours) },
        'That estimate did not save.')
    },
    onFocusSibling(task: Task, delta: number, caret: number) {
      const state = current()
      const next = tasksBeside(state, task)[indexBeside(state, task) + delta]
      if (next) return setFocus({ id: next.id, caret })
      if (delta < 0) return
      setFocus(null)
      // The row goes away as this runs; the next frame puts the caret in the cell's add box.
      const id = task.slot === 'backlog' ? backlogAddInputId(task.backlogGroupId!) : addInputId(groupOf(task.slot))
      requestAnimationFrame(() => document.getElementById(id)!.focus())
    },
  }
}

/** The backlog's group edits. A name that is not allowed gives its reason; null means done. */
function createGroupHandlers(context: EditContext & { setAddingGroup: (adding: boolean) => void }) {
  const { planRef, pendingGroups, commit, write, setAddingGroup } = context
  const nameError = (name: string, exceptId?: string) => {
    // The name box takes at most 80 characters, so only a name already in use is refused.
    const trimmed = name.trim()
    const taken = planRef.current!.backlogGroups.some(group =>
      group.id !== exceptId && group.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())
    return taken ? 'That subgroup already exists.' : null
  }

  return {
    createGroup(name: string) {
      const error = nameError(name)
      if (error) return error
      const state = planRef.current!
      const draft: BacklogGroup = { id: `draft_group_${crypto.randomUUID()}`, name: name.trim(),
        position: Math.max(...state.backlogGroups.map(group => group.position)) + 1000, isDefault: false }
      setAddingGroup(false)
      const save = board.addGroup(draft.name).then(({ group }) => group)
      pendingGroups.current.set(draft.id, save)
      commit(appendBacklogGroup(state, draft), () => save.then(group => {
        const after = planRef.current!
        write(state.week, {
          ...after,
          backlogGroups: after.backlogGroups.map(each => each.id === draft.id ? group : each),
          slots: { ...after.slots, backlog: after.slots.backlog.map(task =>
            task.backlogGroupId === draft.id ? { ...task, backlogGroupId: group.id } : task) },
        })
      }).finally(() => pendingGroups.current.delete(draft.id)), 'That subgroup did not save.')
      return null
    },
    renameGroup(group: BacklogGroup, name: string) {
      const error = nameError(name, group.id)
      if (error) return error
      const trimmed = name.trim()
      if (trimmed !== group.name) {
        commit(renameBacklogGroup(planRef.current!, group.id, trimmed), () => board.renameGroup(group.id, trimmed),
          'That subgroup rename did not save.')
      }
      return null
    },
    moveGroup(group: BacklogGroup, index: number) {
      commit(moveBacklogGroup(planRef.current!, group.id, index),
        () => savedGroupId(context, group.id).then(id => board.moveGroup(id, index)), 'That subgroup move did not save.')
    },
    deleteGroup(group: BacklogGroup) {
      const state = planRef.current!
      commit(removeBacklogGroup(state, group.id), () => board.removeGroup(group.id, state.week), 'That subgroup was not deleted.')
    },
  }
}

export type TaskHandlers = ReturnType<typeof createTaskHandlers>
export type GroupHandlers = ReturnType<typeof createGroupHandlers>

/** The week's edits, made once: the refs and setters never change. */
export function useEdits({ planRef, pendingGroups, commit, write, fail, viewRef, setFocus, setAddingGroup }: EditContext & {
  viewRef: RefObject<ScheduleView>
  setFocus: Dispatch<SetStateAction<CaretFocus>>
  setAddingGroup: (adding: boolean) => void
}) {
  return useMemo(() => {
    const context = { planRef, pendingGroups, commit, write, fail }
    return { handlers: createTaskHandlers({ ...context, viewRef, setFocus }), groupHandlers: createGroupHandlers({ ...context, setAddingGroup }) }
  }, [planRef, pendingGroups, commit, write, fail, viewRef, setFocus, setAddingGroup])
}
