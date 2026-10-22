import { z } from 'zod'

// What a plan's sealed page may ask of the inbox. Its notes sit under its own review page's key, and no other.
const key = z.string().regex(/^wong-review3:[\w-]{1,100}$/)
const message = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('inbox:tap'), action: z.string(), text: z.string().max(20_000) }),
  z.strictObject({ type: z.literal('inbox:notes-get'), key }),
  z.strictObject({ type: z.literal('inbox:notes-set'), key, value: z.string().max(1_000_000) }),
])
export type FrameMessage = z.infer<typeof message>

/** The notes key of the plan's own review page, from its `<body data-change>`, or null when it names none. */
export function notesKey(body: string): string | null {
  const change = /<body\b[^>]*\sdata-change="([\w-]{1,100})"/i.exec(body)?.[1]
  return change ? `wong-review3:${change}` : null
}

/** The page's message, or null: one of three kinds, each field checked, a tap only on an action its item offers, and
 *  notes only under the plan's own key. */
export function frameMessage(data: unknown, plan: { actions: string[]; key: string | null }): FrameMessage | null {
  const parsed = message.safeParse(data).data ?? null
  if (parsed?.type === 'inbox:tap') return parsed.action === 'send' || plan.actions.includes(parsed.action) ? parsed : null
  return parsed && parsed.key === plan.key ? parsed : null
}
