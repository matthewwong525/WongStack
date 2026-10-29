// The week board's shapes and rules, shared by its Worker (app/worker/apps/inbox/tasks/) and its screen
// (app/src/apps/inbox/week/), so a move means one thing on both sides. It imports nothing.

export const daySlots = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const
/** `backlog` is a slot rather than an absence, so every task has exactly one home. */
export const taskSlots = [...daySlots, "backlog"] as const
export type DaySlot = (typeof daySlots)[number]
export type TaskSlot = (typeof taskSlots)[number]

export const taskStatuses = ["open", "in_progress", "done"] as const
export type TaskStatus = (typeof taskStatuses)[number]

/** Where a week's unfinished work goes when it is swept. */
export const sweepDestinations = ["backlog", "next_week"] as const
export type SweepDestination = (typeof sweepDestinations)[number]

/** The backlog's catch-all group, `Other`: it can move, never be renamed or deleted. */
export const defaultBacklogGroupId = "backlog_other"

export interface Task {
  id: string
  title: string
  status: TaskStatus
  /** The task's Monday as `YYYY-MM-DD`, or null in the backlog, which belongs to no week. */
  week: string | null
  slot: TaskSlot
  /** Its backlog group and, when scheduled, its optional category. */
  backlogGroupId: string | null
  /** The order inside one status band; the bands come from `status`. */
  position: number
  estimateHours: number | null
  /** `daily:…` for a task the daily added, `chat:<agent id>` for a chat's to-do; null for one typed here. */
  importKey: string | null
  /** A chat's plan link, shown as Plan; null for most tasks. */
  link: string | null
  /** The chat (workspace) that works on the task, by name; null when none does. */
  chat: string | null
  createdAt: string
  updatedAt: string
}

export interface BacklogGroup {
  id: string
  name: string
  position: number
  isDefault: boolean
}

/** A task found by search, with enough of where it lives to say so without loading its week. */
export interface TaskSearchResult {
  id: string
  title: string
  status: TaskStatus
  week: string | null
  slot: TaskSlot
  backlogGroupId: string | null
  backlogGroupName: string | null
  importKey: string | null
}

/** Every slot is present, empty ones included, so the board renders without holes. */
export interface WeekPlan {
  week: string
  goal: string
  backlogGroups: BacklogGroup[]
  slots: Record<TaskSlot, Task[]>
}

/* ── Inline estimates: `handbook cleanup (1)`. The estimate lives in the title, so one parser serves every side. */

/** Only a trailing number in brackets counts; a dash or comma after it is dropped. */
const trailingEstimate = /\s*\((\d+(?:\.\d+)?)\)[\s\-–—.,:;]*$/

export function parseTaskTitle(raw: string): { title: string; estimateHours: number | null } {
  const trimmed = raw.trim()
  const match = trimmed.match(trailingEstimate)
  const estimateHours = match ? Number(match[1]) : 0
  // A zero-hour task is one someone typed `(0)` on, not an estimate worth keeping.
  if (!match || estimateHours <= 0) return { title: trimmed, estimateHours: null }
  return { title: trimmed.slice(0, match.index).trim(), estimateHours }
}

/* ── Positions: a reorder writes one row, the neighbours' midpoint, so no renumbering races on a phone. */

export const positionStep = 1000
/** Two positions closer than this can no longer be split by a float midpoint. */
const positionEpsilon = 1e-6

/** The position between `before` and `after`, one of them absent at a band's end, or null when the gap has collapsed.
 *  A band with tasks always gives one neighbour. */
function positionBetween(before: number | null, after: number | null): number | null {
  if (before === null) return after! - positionStep
  if (after === null) return before + positionStep
  return after - before < positionEpsilon ? null : before + (after - before) / 2
}

/** Evenly spaced positions for a home whose gaps have collapsed. */
export const rebalancedPositions = (count: number) => Array.from({ length: count }, (_, index) => (index + 1) * positionStep)

/* ── Bands: started work above open work, finished below both. A position orders tasks inside one band only. */

export type TaskBand = 0 | 1 | 2
export const taskBand = (status: TaskStatus): TaskBand => status === "in_progress" ? 0 : status === "done" ? 2 : 1

type Ordered = { status: TaskStatus; position: number }

/** Display order, and the only definition of it: the bands, then positions within each. */
export const orderTasks = <T extends Ordered>(tasks: readonly T[]): T[] =>
  [...tasks].sort((a, b) => taskBand(a.status) - taskBand(b.status) || a.position - b.position)

/** The half-open index range a band holds in sorted order, or null when it is empty. */
function bandRange(sorted: readonly Ordered[], band: TaskBand): [number, number] | null {
  const start = sorted.findIndex(task => taskBand(task.status) === band)
  if (start === -1) return null
  let end = start
  while (end < sorted.length && taskBand(sorted[end].status) === band) end += 1
  return [start, end]
}

/** The position at one end of a band; an empty band starts at `positionStep`. */
export function positionForBandEdge(tasks: readonly Ordered[], band: TaskBand, edge: "start" | "end"): number {
  const positions = tasks.filter(task => taskBand(task.status) === band).map(task => task.position)
  if (!positions.length) return positionStep
  return edge === "start" ? Math.min(...positions) - positionStep : Math.max(...positions) + positionStep
}

/** Pulls a drop's index in the banded order to the band's nearest edge: the band rule wins over the drop. */
export function clampIndexToBand(tasks: readonly Ordered[], index: number, band: TaskBand): number {
  const range = bandRange(orderTasks(tasks), band)
  return range ? Math.max(range[0], Math.min(index, range[1])) : 0
}

/** A move's position in the destination (without the moving task), between neighbours of its own band; null when
 *  the gap has collapsed and the home needs new spacing. */
export function positionForIndex(tasks: readonly Ordered[], index: number, band: TaskBand): number | null {
  const sorted = orderTasks(tasks)
  const range = bandRange(sorted, band)
  if (!range) return positionStep
  const clamped = clampIndexToBand(sorted, index, band)
  return positionBetween(clamped > range[0] ? sorted[clamped - 1].position : null, clamped < range[1] ? sorted[clamped].position : null)
}

/* ── Weeks: a week is its Monday as `YYYY-MM-DD`: sortable, and comparable without a parser. */

const dayMs = 24 * 60 * 60 * 1000

/** `2026-07-27` → a UTC-midnight Date, with no local-timezone drift. */
export function fromIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}
export const toIsoDate = (date: Date) => date.toISOString().slice(0, 10)

/** A real calendar day as `YYYY-MM-DD`. */
const isIsoDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && toIsoDate(fromIsoDate(value)) === value
export const isMonday = (value: string) => isIsoDate(value) && fromIsoDate(value).getUTCDay() === 1

/** The Monday of a local date's week: Sunday belongs to the week that started six days earlier. */
export function weekStart(date: Date): string {
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return toIsoDate(new Date(utc - ((new Date(utc).getUTCDay() + 6) % 7) * dayMs))
}

export const shiftWeek = (week: string, weeks: number) => toIsoDate(new Date(fromIsoDate(week).getTime() + weeks * 7 * dayMs))

/* ── Search: how a query becomes words. The Worker matches them and the screen marks them, so both agree. */

/** A search that finds more than this has stopped being a way to find one thing. */
export const searchResultLimit = 50
const maxSearchWords = 8
const maxWordLength = 100

/** Split on white space, each word once whatever its case, and bounded. */
export function searchWords(query: string): string[] {
  const words = new Map<string, string>()
  for (const raw of query.split(/\s+/)) {
    const word = raw.slice(0, maxWordLength)
    if (word && !words.has(word.toLowerCase()) && words.size < maxSearchWords) words.set(word.toLowerCase(), word)
  }
  return [...words.values()]
}
