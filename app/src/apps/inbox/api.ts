import { z } from 'zod'
import type { BacklogGroup, SweepDestination, Task, TaskSearchResult, TaskSlot, TaskStatus, WeekPlan } from '@/lib/board'

// The inbox's own routes, read in the shapes app/worker/apps/inbox/ writes.
const tap = z.object({ id: z.string(), item: z.string(), action: z.string(), text: z.string(),
  state: z.enum(['waiting', 'delivering', 'sent', 'failed', 'changed', 'cancelled', 'expired']) })
const item = z.object({ id: z.string(), kind: z.string(), title: z.string(), workspace: z.string(), actions: z.array(z.string()),
  version: z.string(), body: z.string(), tap: tap.nullable() })
const list = z.object({ computerOnline: z.boolean() })
const one = z.object({ item, computerOnline: z.boolean() })
const tapped = z.object({ tap })
const refused = z.object({ error: z.object({ code: z.string() }) })
export type Tap = z.infer<typeof tap>
export type Plan = z.infer<typeof one>
/** Why a tap was not queued: the page changed, the action was already sent, too soon after the last, the item closed,
 *  or anything else. */
export type Refusal = 'changed' | 'done' | 'soon' | 'closed' | 'failed'

/** An action's name as its button says it: `approve` → *Approve*. */
export const label = (action: string) => action.charAt(0).toUpperCase() + action.slice(1)
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
export const readTap = (id: string) => call(tapped, `tap?id=${id}`).then(answer => answer.tap)
export const cancelTap = (id: string) => call(tapped, 'tap-cancel', { id }).then(answer => answer.tap)

/** Queues a tap on the version the person saw; it waits there until their computer delivers it. */
export async function sendTap(input: { item: string; action: string; version: string; text: string }): Promise<Tap | Refusal> {
  try {
    const response = await fetch('/apps/inbox/api/tap', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) })
    const body: unknown = await response.json()
    if (response.ok) return tapped.parse(body).tap
    const code = refused.safeParse(body).data?.error.code
    return code === 'changed' || code === 'done' ? code : response.status === 429 ? 'soon' : response.status === 410 ? 'closed' : 'failed'
  } catch {
    return 'failed'
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
