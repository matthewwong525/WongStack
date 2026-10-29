import {
  daySlots, fromIsoDate, orderTasks, taskBand, weekStart, type DaySlot, type Task, type TaskBand, type TaskSlot,
} from '@/lib/board'

// What the week board shows: titles and hours, the day cells, and the day or week on screen.

/** The title a person types back: the estimate goes at its end, `handbook cleanup (1)`. */
export const formatTaskTitle = (title: string, estimateHours: number | null) =>
  estimateHours === null ? title : `${title} (${formatHours(estimateHours)})`

/** `0.5`, not `0.5000`; `1`, not `1.0`: as a person types them. */
export const formatHours = (hours: number) => Number(hours.toFixed(2)).toString()

const dayMs = 24 * 60 * 60 * 1000

/** The date a day slot of a week falls on. */
export const slotDate = (week: string, slot: TaskSlot) =>
  new Date(fromIsoDate(week).getTime() + daySlots.indexOf(slot as DaySlot) * dayMs)

export function slotForDate(date: Date): DaySlot {
  return daySlots[(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).getUTCDay() + 6) % 7]
}

/** A `YYYY-MM-DD` value as a local date, or null when it is no real day. */
export function localDateFromIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

/** A local date as `YYYY-MM-DD`: today when none is given. */
export function localDay(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** `2026-09-07` → "Sep 7": a week by its Monday. */
export const formatWeek = (week: string) =>
  fromIsoDate(week).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })

/** A day's load: unestimated work counts beside the hours, never as zero hours. */
export function effortTotals(tasks: Task[]) {
  const totals = { openHours: 0, doneHours: 0, unestimatedCount: 0 }
  for (const task of tasks) {
    const done = task.status === 'done'
    if (task.estimateHours === null) totals.unestimatedCount += done ? 0 : 1
    else if (done) totals.doneHours += task.estimateHours
    else totals.openHours += task.estimateHours
  }
  return totals
}
export type EffortTotals = ReturnType<typeof effortTotals>

/** The hours a cell shows beside its heading. */
export function summarize(totals: EffortTotals) {
  const parts: string[] = []
  if (totals.openHours > 0) parts.push(`${formatHours(totals.openHours)}h open`)
  if (totals.doneHours > 0) parts.push(`${formatHours(totals.doneHours)}h done`)
  if (totals.unestimatedCount > 0) parts.push(`${totals.unestimatedCount} unest.`)
  return parts.join(' · ')
}

/** One cell of the week. The weekend is one cell: `sat` takes its new tasks, and `sun` keeps the tasks filed there. */
export interface PlanGroup {
  key: TaskSlot
  slots: TaskSlot[]
  label: string
}

export const planGroups: PlanGroup[] = [
  { key: 'mon', slots: ['mon'], label: 'Mon' },
  { key: 'tue', slots: ['tue'], label: 'Tue' },
  { key: 'wed', slots: ['wed'], label: 'Wed' },
  { key: 'thu', slots: ['thu'], label: 'Thu' },
  { key: 'fri', slots: ['fri'], label: 'Fri' },
  { key: 'sat', slots: ['sat', 'sun'], label: 'Sat/Sun' },
]

/** A cell's order: the bands first, then Saturday before Sunday in each, because a position orders one slot only. */
export function orderAcrossSlots(lists: ReadonlyArray<readonly Task[]>): Task[] {
  const bands: TaskBand[] = [0, 1, 2]
  return bands.flatMap(band => lists.flatMap(tasks => orderTasks(tasks.filter(task => taskBand(task.status) === band))))
}

export const tasksInGroup = (slots: Record<TaskSlot, Task[]>, group: PlanGroup) =>
  orderAcrossSlots(group.slots.map(slot => slots[slot]))

/** The dates a cell covers, for the small number beside its heading. */
export function groupDateLabel(week: string, group: PlanGroup) {
  const [first, last] = [group.slots[0], group.slots.at(-1)!].map(slot => slotDate(week, slot).getUTCDate())
  return first === last ? String(first) : `${first}–${last}`
}

/** The estimates a row offers: a tap, not a number to type. */
export const estimateOptions = [0.25, 0.5, 1, 2, 4]

/** The add box of a cell, so Enter on the last row moves the caret into it. */
export const addInputId = (group: PlanGroup) => `add-task-${group.key}`
export const backlogAddInputId = (groupId: string) => `add-backlog-${groupId}`

/* ── The day or week on screen, from the address: `?day=YYYY-MM-DD&view=day|week`. */

export type ScheduleView = 'day' | 'week'
export const scheduleView = (value: string | null): ScheduleView => value === 'week' ? 'week' : 'day'
export const scheduleDay = (value: string | null) => value && localDateFromIsoDate(value) ? value : localDay()
export const scheduleWeek = (day: string) => weekStart(localDateFromIsoDate(day)!)

/** The one cell the Day view shows. */
export function selectedGroup(day: string): PlanGroup {
  const slot = slotForDate(localDateFromIsoDate(day)!)
  return { key: slot, label: dayLabel(day, { weekday: 'long' }), slots: [slot] }
}

export function moveScheduleDay(day: string, view: ScheduleView, count: number) {
  const date = localDateFromIsoDate(day)!
  date.setDate(date.getDate() + count * (view === 'week' ? 7 : 1))
  return localDay(date)
}

export const groupsForView = (day: string, view: ScheduleView) => view === 'week' ? planGroups : [selectedGroup(day)]

export const dayLabel = (day: string, format: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' }) =>
  localDateFromIsoDate(day)!.toLocaleDateString(undefined, format)

/** Text cut into the runs that are, and are not, one of the words. Where two words start at one place, the longer
 *  one is marked. */
export function splitOnWords(text: string, words: string[]) {
  const haystack = text.toLowerCase()
  const needles = words.map(word => word.toLowerCase())
  const parts: Array<{ text: string; match: boolean }> = []
  let plainFrom = 0
  let at = 0
  while (at < text.length) {
    const length = Math.max(0, ...needles.filter(needle => haystack.startsWith(needle, at)).map(needle => needle.length))
    if (length === 0) { at += 1; continue }
    if (at > plainFrom) parts.push({ text: text.slice(plainFrom, at), match: false })
    parts.push({ text: text.slice(at, at + length), match: true })
    at += length
    plainFrom = at
  }
  if (plainFrom < text.length) parts.push({ text: text.slice(plainFrom), match: false })
  return parts
}
