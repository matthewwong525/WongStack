import { z } from 'zod'

// The inbox's own routes, read in the shapes app/worker/apps/inbox/ writes.
const tap = z.object({ id: z.string(), item: z.string(), action: z.string(), text: z.string(),
  state: z.enum(['waiting', 'delivering', 'sent', 'failed', 'changed', 'cancelled', 'expired']) })
const question = z.object({ text: z.string(), options: z.array(z.string()).optional(), multi: z.boolean().optional() })
const lines = z.array(z.string())
const plan = z.object({ willDo: lines, needs: lines, askFirst: lines,
  questions: z.array(z.object({ text: z.string(), options: lines.optional(), several: z.boolean().optional() })) })
const startCard = z.object({ state: z.enum(['ready', 'planning', 'no-plan']), plan: plan.optional() })
const status = z.object({ state: z.enum(['planning', 'working', 'done']), step: z.string().optional(), action: z.string().optional(),
  proof: z.string().optional() })
const wire = z.object({ id: z.string(), kind: z.enum(['plan', 'approval', 'question', 'link', 'start', 'agent']), title: z.string(), workspace: z.string(),
  actions: z.array(z.string()), version: z.string(), createdAt: z.number(), closesAt: z.number(), detail: z.unknown(),
  // An older app sends no link: such an item is never a link.
  link: z.object({ what: z.enum(['key', 'login', 'card', 'form', 'view']), url: z.string() }).nullable().default(null), tap: tap.nullable() })
/** The item's body read by its kind: a decision's words, a morning plan card, or where an agent stands; else null. */
const read = <Raw extends z.infer<typeof wire>>(raw: Raw) => ({ ...raw,
  detail: raw.kind === 'question' || raw.kind === 'approval' ? question.nullable().catch(null).parse(raw.detail) : null,
  start: raw.kind === 'start' ? startCard.nullable().catch(null).parse(raw.detail) : null,
  status: raw.kind === 'agent' ? status.nullable().catch(null).parse(raw.detail) : null })
const item = wire.transform(read)
const list = z.object({ items: z.array(item), computerOnline: z.boolean() })
const one = z.object({ item: wire.extend({ body: z.string() }).transform(read), computerOnline: z.boolean() })
const tapped = z.object({ tap })
const refused = z.object({ error: z.object({ code: z.string() }) })
export type Tap = z.infer<typeof tap>
export type Item = z.infer<typeof item>
export type Status = z.infer<typeof status>
export type MorningPlan = z.infer<typeof plan>
export type Inbox = z.infer<typeof list>
export type Plan = z.infer<typeof one>
/** Why a tap was not queued: the page changed, the action was already sent, too soon after the last, the item closed,
 *  or anything else. */
export type Refusal = 'changed' | 'done' | 'soon' | 'closed' | 'failed'

/** An action's name as its button says it: `approve` → *Approve*. */
export const label = (action: string) => action.charAt(0).toUpperCase() + action.slice(1)
/** Whether an item takes an answer now: none yet, or the last one never reached the chat. */
export const answerable = (tap: Tap | null) => !tap || tap.state === 'failed' || tap.state === 'cancelled'
/** Whether a tap is still on its way: waiting for the computer, or taken by it. */
export const pending = (tap: Tap) => tap.state === 'waiting' || tap.state === 'delivering'
/** The list carries this many characters of an answer; a longer one is read in full from its tap. */
export const PREVIEW = 200

/** A route's answer that was not a success: its HTTP status, which says whether the item is gone. */
export class Failed extends Error {
  status: number
  constructor(status: number) { super(`HTTP ${status}`); this.status = status }
}

async function call<T>(schema: z.ZodType<T>, route: string, input?: object): Promise<T> {
  const response = await fetch(`/apps/inbox/api/${route}`, input && { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input) })
  if (!response.ok) throw new Failed(response.status)
  return schema.parse(await response.json())
}

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
