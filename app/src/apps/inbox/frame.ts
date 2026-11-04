import { z } from 'zod'

// What a plan's sealed page may ask of the inbox. Its notes sit under its own review page's key, and no other.
const key = z.string().regex(/^wong-review3:[\w-]{1,100}$/)
// By its tag, not instanceof: a buffer posted across a port can come from another realm.
const bytes = z.custom<ArrayBuffer>(value => Object.prototype.toString.call(value) === '[object ArrayBuffer]')
const message = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('inbox:tap'), action: z.string(), text: z.string().max(20_000),
    files: z.array(z.string().regex(/^[0-9a-f]{32}$/)).max(60).optional() }),
  // A file the person picked, its bytes handed over whole; the inbox sends it and answers its id by `ref`.
  z.strictObject({ type: z.literal('inbox:file'), ref: z.string().regex(/^[\w-]{1,64}$/), name: z.string().min(1).max(200),
    question: z.string().min(1).max(300), data: bytes }),
  z.strictObject({ type: z.literal('inbox:notes-get'), key }),
  z.strictObject({ type: z.literal('inbox:notes-set'), key, value: z.string().max(1_000_000) }),
  // The page's own Back was tapped: the inbox opens the week board.
  z.strictObject({ type: z.literal('inbox:back') }),
])
export type FrameMessage = z.infer<typeof message>

/** The notes key of the plan's own review page, from its `<body data-change>`, or null when it names none. */
export function notesKey(body: string): string | null {
  const change = /<body\b[^>]*\sdata-change="([\w-]{1,100})"/i.exec(body)?.[1]
  return change ? `wong-review3:${change}` : null
}

/** Whether the plan's page draws its own Back, from its `<body data-own-back>`; a page built before that draws none. */
export function ownBack(body: string): boolean {
  return /<body\b[^>]*\sdata-own-back(?=[\s=>])/i.test(body)
}

const ENTITIES: Record<string, string> = { '&quot;': '"', '&lt;': '<', '&gt;': '>', '&amp;': '&' }
const buttons = z.array(z.object({ name: z.string(), label: z.string() }))

/** Each button's label on the plan's page, by action, from its `#ready data-actions`: *Build and publish* on a plan,
 *  *Publish* on a preview. A page that names none, or names them badly, gives none. */
export function actionLabels(body: string): Record<string, string> {
  const escaped = /<div id="ready" data-actions="([^"]*)"/.exec(body)?.[1]
  if (!escaped) return {}
  try {
    const found = buttons.safeParse(JSON.parse(escaped.replace(/&(quot|lt|gt|amp);/g, entity => ENTITIES[entity]))).data ?? []
    return Object.fromEntries(found.map(button => [button.name, button.label]))
  } catch {
    return {}
  }
}

/** The page's message, or null: one of five kinds, each field checked, a tap only on an action its item offers, and
 *  notes only under the plan's own key. */
export function frameMessage(data: unknown, plan: { actions: string[]; key: string | null }): FrameMessage | null {
  const parsed = message.safeParse(data).data ?? null
  if (parsed?.type === 'inbox:tap') return parsed.action === 'send' || plan.actions.includes(parsed.action) ? parsed : null
  if (parsed?.type === 'inbox:back' || parsed?.type === 'inbox:file') return parsed
  return parsed && parsed.key === plan.key ? parsed : null
}
