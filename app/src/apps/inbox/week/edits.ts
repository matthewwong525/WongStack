import {
  clampIndexToBand, orderTasks, positionForBandEdge, positionForIndex, positionStep, taskBand, taskSlots,
  type BacklogGroup, type Task, type TaskSlot, type TaskStatus, type WeekPlan,
} from '@/lib/board'
import { orderAcrossSlots } from './plan'

// Edits on a week, made on the screen before the request goes out. What they give is what the person sees until a
// request fails, so they follow the Worker's rules exactly.

const daySlots = taskSlots.filter(slot => slot !== 'backlog')
const findTask = (plan: WeekPlan, id: string) => taskSlots.flatMap(slot => plan.slots[slot]).find(task => task.id === id)

/** Changes one task, wherever it is. */
export function replaceTask(plan: WeekPlan, id: string, update: Partial<Task>): WeekPlan {
  const slots = { ...plan.slots }
  for (const slot of taskSlots) slots[slot] = slots[slot].map(task => task.id === id ? { ...task, ...update } : task)
  return { ...plan, slots }
}

/** Moves the task to an end of its new band; a stop goes back to the top of the open tasks. */
export function setTaskStatus(plan: WeekPlan, id: string, status: TaskStatus): WeekPlan {
  const task = findTask(plan, id)
  if (!task || task.status === status) return plan
  const groupId = task.slot === 'backlog' ? task.backlogGroupId : null
  const others = tasksInHome(plan, task.slot, groupId).filter(candidate => candidate.id !== id)
  const edge = task.status === 'in_progress' && status === 'open' ? 'start' : 'end'
  const position = positionForBandEdge(others, taskBand(status), edge)
  return replaceHomeTasks(plan, task.slot, groupId, [...others, { ...task, status, position }])
}

export function removeTask(plan: WeekPlan, id: string): WeekPlan {
  const slots = { ...plan.slots }
  for (const slot of taskSlots) slots[slot] = slots[slot].filter(task => task.id !== id)
  return { ...plan, slots }
}

/** A new task is open, so it goes to the end of the open tasks, not the end of its cell. */
export function appendTask(plan: WeekPlan, task: Task): WeekPlan {
  const existing = tasksInHome(plan, task.slot, task.backlogGroupId)
  const position = positionForBandEdge(existing, taskBand(task.status), 'end')
  return replaceHomeTasks(plan, task.slot, task.backlogGroupId, [...existing, { ...task, position }])
}

/** Puts a task directly after another in the same cell, as Enter does. */
export function insertAfter(plan: WeekPlan, afterId: string, task: Task): WeekPlan {
  const existing = tasksInHome(plan, task.slot, task.backlogGroupId)
  const index = existing.findIndex(row => row.id === afterId)
  // The new line goes in its own band: a split under a started row still lands among the open tasks.
  const position = index === -1 ? null : positionForIndex(existing, index + 1, taskBand(task.status))
  if (position === null) return appendTask(plan, task)
  return replaceHomeTasks(plan, task.slot, task.backlogGroupId, [...existing, { ...task, position }])
}

/** Moves a task to a place in a cell. It gives the index it used, which the request sends, so both sides agree. */
export function moveTask(plan: WeekPlan, id: string, destination: TaskSlot, index: number, backlogGroupId?: string) {
  const task = findTask(plan, id)
  if (!task) return { plan, index }
  const withoutTask = removeTask(plan, id)
  const groupId = destination === 'backlog' ? backlogGroupId! : null
  // A drop that crossed a band goes back to the edge of the task's own band.
  const target = tasksInHome(withoutTask, destination, groupId)
  const band = taskBand(task.status)
  const clamped = clampIndexToBand(target, index, band)
  const position = positionForIndex(target, clamped, band) ?? positionForBandEdge(target, band, 'end')
  // A move files the task in the week on screen, not the week it had.
  const moved = { ...task, slot: destination, week: destination === 'backlog' ? null : plan.week,
    backlogGroupId: destination === 'backlog' ? groupId : task.backlogGroupId, position }
  return { plan: replaceHomeTasks(withoutTask, destination, groupId, [...target, moved]), index: clamped }
}

/** Where a task is in its cell, in the order the cell shows. */
export const indexOf = (plan: WeekPlan, slots: TaskSlot[], id: string, backlogGroupId: string | null = null) =>
  orderAcrossSlots(slots.map(slot => tasksInHome(plan, slot, slot === 'backlog' ? backlogGroupId : null)))
    .findIndex(task => task.id === id)

/** A task the app has not stored yet. The backlog has no week, so a draft there has none either. */
export function draftTask(week: string, slot: TaskSlot, title: string, estimateHours: number | null,
  backlogGroupId: string | null): Task {
  const now = new Date().toISOString()
  return { id: `draft_${crypto.randomUUID()}`, title, status: 'open', week: slot === 'backlog' ? null : week, slot,
    backlogGroupId: slot === 'backlog' ? backlogGroupId : null, position: 0, estimateHours, importKey: null, link: null,
    chat: null, createdAt: now, updatedAt: now }
}

export const isDraft = (task: Task) => task.id.startsWith('draft_')
/** Whether the week holds a task the app never saw: a reload now would erase what is being typed. */
export const hasDraft = (plan: WeekPlan) => taskSlots.some(slot => plan.slots[slot].some(isDraft))

/** The days with their unfinished tasks taken out. */
function withoutUnfinished(plan: WeekPlan) {
  const slots = { ...plan.slots }
  for (const slot of daySlots) slots[slot] = slots[slot].filter(task => task.status === 'done')
  return slots
}

/** Unfinished work goes back to its group, each task at the end of its own band there. As the Worker does. */
export function sweepToBacklog(plan: WeekPlan): WeekPlan {
  const moving = daySlots.flatMap(slot => plan.slots[slot]).filter(task => task.status !== 'done')
  const slots = withoutUnfinished(plan)
  const ends = new Map<string, number>()
  const moved = moving.map(task => {
    const known = plan.backlogGroups.some(group => group.id === task.backlogGroupId)
    const groupId = known ? task.backlogGroupId! : defaultBacklogGroup(plan).id
    const key = `${groupId}:${taskBand(task.status)}`
    const position = ends.get(key) ?? positionForBandEdge(tasksInBacklogGroup(plan, groupId), taskBand(task.status), 'end')
    ends.set(key, position + positionStep)
    return { ...task, slot: 'backlog' as TaskSlot, week: null, backlogGroupId: groupId, position }
  })
  return { ...plan, slots: { ...slots, backlog: normalizeBacklog(plan, [...slots.backlog, ...moved]) } }
}

/** Unfinished day work goes to next week, which is not on screen, so here it only goes away. As the Worker does. */
export const sweepToNextWeek = (plan: WeekPlan): WeekPlan => ({ ...plan, slots: withoutUnfinished(plan) })

export const tasksInBacklogGroup = (plan: WeekPlan, groupId: string) =>
  orderTasks(plan.slots.backlog.filter(task => task.backlogGroupId === groupId))

/** `Other`, the group that takes what has no group. */
export const defaultBacklogGroup = (plan: WeekPlan) => plan.backlogGroups.find(group => group.isDefault)!

/** A new group goes at the end of the board, where its name was typed. */
export const appendBacklogGroup = (plan: WeekPlan, group: BacklogGroup): WeekPlan =>
  ({ ...plan, backlogGroups: [...plan.backlogGroups, group] })

/** Moves one group to a place, with even gaps as the Worker gives, so both sides agree with no reload. */
export const moveBacklogGroup = (plan: WeekPlan, id: string, index: number): WeekPlan => ({
  ...plan,
  backlogGroups: backlogGroupsWithMove(plan.backlogGroups, id, index).map((group, at) => ({ ...group, position: (at + 1) * positionStep })),
})

/** The group order with one group taken out and put back at an index, kept inside the list. */
export function backlogGroupsWithMove(groups: BacklogGroup[], id: string, index: number): BacklogGroup[] {
  const moving = groups.find(group => group.id === id)
  if (!moving) return groups
  const rest = groups.filter(group => group.id !== id)
  rest.splice(Math.min(Math.max(index, 0), rest.length), 0, moving)
  return rest
}

export const renameBacklogGroup = (plan: WeekPlan, id: string, name: string): WeekPlan =>
  ({ ...plan, backlogGroups: plan.backlogGroups.map(group => group.id === id ? { ...group, name } : group) })

/** Removes a group: its tasks go to the end of `Other`, and a day task's category becomes `Other`. */
export function removeBacklogGroup(plan: WeekPlan, id: string): WeekPlan {
  const fallback = defaultBacklogGroup(plan).id
  let position = tasksInBacklogGroup(plan, fallback).at(-1)?.position ?? 0
  const backlog = plan.slots.backlog.map(task => {
    if (task.backlogGroupId !== id) return task
    position += positionStep
    return { ...task, backlogGroupId: fallback, position }
  })
  const next = { ...plan, backlogGroups: plan.backlogGroups.filter(group => group.id !== id) }
  const slots = { ...next.slots, backlog: normalizeBacklog(next, backlog) }
  for (const slot of daySlots) {
    slots[slot] = slots[slot].map(task => task.backlogGroupId === id ? { ...task, backlogGroupId: fallback } : task)
  }
  return { ...next, slots }
}

function tasksInHome(plan: WeekPlan, slot: TaskSlot, backlogGroupId: string | null) {
  return slot === 'backlog' ? tasksInBacklogGroup(plan, backlogGroupId!) : orderTasks(plan.slots[slot])
}

function replaceHomeTasks(plan: WeekPlan, slot: TaskSlot, backlogGroupId: string | null, tasks: Task[]): WeekPlan {
  if (slot !== 'backlog') return { ...plan, slots: { ...plan.slots, [slot]: orderTasks(tasks) } }
  const backlog = [...plan.slots.backlog.filter(task => task.backlogGroupId !== backlogGroupId), ...tasks]
  return { ...plan, slots: { ...plan.slots, backlog: normalizeBacklog(plan, backlog) } }
}

const normalizeBacklog = (plan: WeekPlan, tasks: Task[]) =>
  plan.backlogGroups.flatMap(group => orderTasks(tasks.filter(task => task.backlogGroupId === group.id)))

/** How many unfinished day tasks a sweep would move. */
export const unfinishedInDays = (plan: WeekPlan) =>
  daySlots.reduce((count, slot) => count + plan.slots[slot].filter(task => task.status !== 'done').length, 0)
