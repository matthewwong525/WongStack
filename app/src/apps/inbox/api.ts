import { z } from 'zod'
import type { BacklogGroup, SweepDestination, Task, TaskSearchResult, TaskSlot, TaskStatus, WeekPlan } from '@/lib/board'

// The inbox's own routes, read in the shapes app/worker/apps/inbox/ writes.
const tap = z.object({ id: z.string(), item: z.string(), action: z.string(), text: z.string(),
  state: z.enum(['waiting', 'delivering', 'sent', 'failed', 'changed', 'cancelled', 'expired']) })
// A closed review page: when it closed, and each answer that reached the chat.
const archived = z.object({ endedAt: z.number(), answers: z.array(z.object({ action: z.string(), text: z.string(), at: z.number() })) })
const item = z.object({ id: z.string(), kind: z.string(), title: z.string(), workspace: z.string(), actions: z.array(z.string()),
  version: z.string(), body: z.string(), tap: tap.nullable(), files: z.array(z.string()), archived: archived.optional() })
const review = z.object({ id: z.string(), title: z.string(), workspace: z.string(), createdAt: z.number(), closesAt: z.number(),
  endedAt: z.number().nullable(), answered: z.boolean() })
const reviews = z.object({ waiting: z.array(review), archived: z.array(review), more: z.boolean() })
// `board` is false for a teammate with no week board.
const list = z.object({ computerOnline: z.boolean(), board: z.boolean().optional() })
const one = z.object({ item, computerOnline: z.boolean() })
const tapped = z.object({ tap })
const refused = z.object({ error: z.object({ code: z.string() }) })
const timing = z.object({ mode: z.enum(['once', 'recurring']), cron: z.string().optional(), every: z.string().optional(), timezone: z.string(),
  dueAt: z.string().optional() })
const run = z.object({ id: z.string(), key: z.string(), dueAt: z.number(), source: z.enum(['clock', 'now']),
  state: z.enum(['due', 'taken', 'started', 'failed', 'blocked', 'missed', 'cancelled']), result: z.string().nullable() })
const schedule = z.object({ key: z.string(), host: z.enum(['app', 'paseo']), name: z.string(), summary: z.string(), timing,
  state: z.enum(['on', 'paused']), nextRunAt: z.number().nullable(), lastRun: run.nullable(), waiting: run.nullable(), instructions: z.string(),
  ended: z.object({ at: z.number(), reason: z.string() }).nullable(), version: z.string(), approvedVersion: z.string().nullable(),
  approvedAt: z.number().nullable(), computerName: z.string().nullable() })
const schedules = z.object({ schedules: z.array(schedule), computerOnline: z.boolean() })
const scheduleRuns = z.object({ schedule, runs: z.array(run), quiet: z.number() })
export type Tap = z.infer<typeof tap>
export type Plan = z.infer<typeof one>
export type Archived = NonNullable<Plan['item']['archived']>
export type Review = z.infer<typeof review>
export type Timing = z.infer<typeof timing>
export type Run = z.infer<typeof run>
export type Schedule = z.infer<typeof schedule>
export type Schedules = z.infer<typeof schedules>
/** Why a tap was not queued: the page changed, the action was already sent, too soon after the last, the item closed,
 *  a file it names is no longer held, or anything else. */
export type Refusal = 'changed' | 'done' | 'soon' | 'closed' | 'gone' | 'failed'

/** An action's name as its button says it: `approve` → *Approve*. */
export const label = (action: string) => action.charAt(0).toUpperCase() + action.slice(1)
/** A moment as a list or an answer line shows it: *3 Nov, 14:02*. */
export const when = (at: number) => new Date(at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
/** Whether a tap is still on its way: waiting for the computer, or taken by it. */
export const pending = (tap: Tap) => tap.state === 'waiting' || tap.state === 'delivering'
/** The list carries this many characters of an answer; a longer one is read in full from its tap. */
export const PREVIEW = 200

/** A route's answer that was not a success: its HTTP status, which says whether the item is gone. */
export class Failed extends Error {
  status: number
  constructor(status: number) { super(`HTTP ${status}`); this.status = status }
}

let writes = 0
const writers = new Set<() => void>()
const count = (step: number) => { writes += step; for (const writer of writers) writer() }
/** The writes on their way. A reload waits for them, so it never paints over an edit the app has not stored yet. */
export const pendingWrites = {
  count: () => writes,
  subscribe: (listener: () => void) => { writers.add(listener); return () => { writers.delete(listener) } },
}

async function ask<T>(route: string, method = 'GET', input?: object): Promise<T> {
  const write = method !== 'GET'
  if (write) count(1)
  try {
    const response = await fetch(`/apps/inbox/api/${route}`, write
      ? { method, headers: { 'content-type': 'application/json' }, body: input && JSON.stringify(input) } : undefined)
    if (!response.ok) throw new Failed(response.status)
    return await response.json() as T
  } finally {
    if (write) count(-1)
  }
}
const call = async <T>(schema: z.ZodType<T>, route: string, input?: object) =>
  schema.parse(await ask(route, input ? 'POST' : 'GET', input))

export const readInbox = () => call(list, 'items')
export const readPlan = (id: string) => call(one, `item?id=${encodeURIComponent(id)}`)
/** The person's review pages matching `q`; `before` reads the Archive's next page after that row. */
export const readReviews = (q: string, before?: Review) => call(reviews, `reviews?${new URLSearchParams({
  ...(q.trim() && { q: q.trim() }), ...(before && { before: `${before.createdAt}:${before.id}` }) })}`)
export const readTap = (id: string) => call(tapped, `tap?id=${id}`).then(answer => answer.tap)
export const cancelTap = (id: string) => call(tapped, 'tap-cancel', { id }).then(answer => answer.tap)
export const readSchedules = () => call(schedules, 'schedules')
/** One schedule, its ten newest runs that found work, and how many quiet ones came between. */
export const readSchedule = (key: string) => call(scheduleRuns, `schedule?key=${encodeURIComponent(key)}`)

/** Pauses, resumes or runs a schedule, or cancels its waiting run: null when done, else why not, as the app's code. */
export async function changeSchedule(route: 'pause' | 'resume' | 'run-now' | 'run-cancel', input: { key: string } | { id: string }) {
  try {
    const response = await fetch(`/apps/inbox/api/${route}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) })
    return response.ok ? null : refused.safeParse(await response.json()).data?.error.code ?? 'failed'
  } catch {
    return 'failed'
  }
}

/** Queues a tap on the version the person saw; it waits there until their computer delivers it, with any files sent. */
export async function sendTap(input: { item: string; action: string; version: string; text: string; files?: string[] }): Promise<Tap | Refusal> {
  try {
    const response = await fetch('/apps/inbox/api/tap', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) })
    const body: unknown = await response.json()
    if (response.ok) return tapped.parse(body).tap
    const code = refused.safeParse(body).data?.error.code
    if (code === 'files_gone') return 'gone'
    return code === 'changed' || code === 'done' ? code : response.status === 429 ? 'soon' : response.status === 410 ? 'closed' : 'failed'
  } catch {
    return 'failed'
  }
}

const MB = 1024 * 1024
/** The most one file may be: the app's own limit, checked before a byte is sent. The app holds an item's files to its
 *  limit, counting only those it still has. */
export const FILE_MAX = 25 * MB
/** Why a file was not sent, in the words its page shows. */
export const FILE_REFUSALS = { too_large: 'too big: 25 MB at most', item: 'the files for this page pass 100 MB',
  full: 'the app is full for now; try again later', bad_file: 'this is not a file the page takes', failed: 'it was not sent; try again', closed: 'this page has closed' }
const fileId = z.object({ file: z.object({ id: z.string().regex(/^[0-9a-f]{32}$/) }) })

/** Sends one file for the item's page; resolves to its id, or the reason it was refused. */
export async function sendFile(input: { item: string; name: string; question: string; data: ArrayBuffer }): Promise<{ id: string } | string> {
  try {
    const query = new URLSearchParams({ item: input.item, name: input.name, question: input.question })
    const response = await fetch(`/apps/inbox/api/file?${query}`, { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: input.data })
    const body: unknown = await response.json()
    if (response.ok) return fileId.parse(body).file
    const code = refused.safeParse(body).data?.error.code
    // The view holds a file to 25 MB before it sends, so one the app finds too large passes the item's 100 MB.
    if (code === 'too_large') return FILE_REFUSALS.item
    return code === 'full' || code === 'bad_file' || code === 'closed' ? FILE_REFUSALS[code] : FILE_REFUSALS.failed
  } catch {
    return FILE_REFUSALS.failed
  }
}

const q = encodeURIComponent
/** A task change sends only what changed, so a check-off never races a rename. */
export type TaskChange = { title?: string; status?: TaskStatus; week?: string; slot?: TaskSlot; backlogGroupId?: string; index?: number }

/** The week board's routes: one week and the backlog, its tasks, and the backlog's groups. */
export const board = {
  week: (week: string) => ask<{ plan: WeekPlan }>(`week?week=${q(week)}`),
  goal: (week: string, goal: string) => ask<{ week: string; goal: string }>('week-goal', 'PUT', { week, goal }),
  sweep: (week: string, to: SweepDestination) => ask<{ plan: WeekPlan }>('sweep', 'POST', { week, to }),
  search: (text: string) => ask<{ tasks: TaskSearchResult[] }>(`task-search?q=${q(text)}`),
  add: (input: { title: string; week: string; slot: TaskSlot; backlogGroupId?: string }) => ask<{ task: Task }>('task', 'POST', input),
  change: (id: string, change: TaskChange) => ask<{ task: Task }>('task', 'PATCH', { id, ...change }),
  remove: (id: string) => ask<{ id: string }>(`task?id=${q(id)}`, 'DELETE'),
  addGroup: (name: string) => ask<{ group: BacklogGroup }>('group', 'POST', { name }),
  renameGroup: (id: string, name: string) => ask<{ group: BacklogGroup }>('group', 'PATCH', { id, name }),
  moveGroup: (id: string, index: number) => ask<{ groups: BacklogGroup[] }>('group-move', 'POST', { id, index }),
  removeGroup: (id: string, week: string) => ask<{ plan: WeekPlan }>(`group?id=${q(id)}&week=${q(week)}`, 'DELETE'),
}
