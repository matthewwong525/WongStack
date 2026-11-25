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
  // The page's own Back was tapped: the inbox opens the chat list.
  z.strictObject({ type: z.literal('inbox:back') }),
  // A picture or video the page carries, by name; the inbox answers `inbox:media-result` by `ref`.
  z.strictObject({ type: z.literal('inbox:media'), ref: z.string().regex(/^[\w-]{1,64}$/), name: z.string().min(1).max(200) }),
])
export type FrameMessage = z.infer<typeof message>

/** The page's message, or null: one of six kinds, each field checked, a tap only on an action its item offers, and
 *  notes only under the plan's own key. */
export function frameMessage(data: unknown, plan: { actions: string[]; key: string | null }): FrameMessage | null {
  const parsed = message.safeParse(data).data ?? null
  if (parsed?.type === 'inbox:tap') return parsed.action === 'send' || plan.actions.includes(parsed.action) ? parsed : null
  if (parsed?.type === 'inbox:back' || parsed?.type === 'inbox:file' || parsed?.type === 'inbox:media') return parsed
  return parsed && parsed.key === plan.key ? parsed : null
}

/** The app's look, which its header switch sets on the root: the sealed page can't read the app's saved choice. */
export const appLook = () => document.documentElement.classList.contains('dark') ? 'dark' : 'light'

/** Fills the window under Layout's 3.5rem header and main's 2rem margins: only the frame scrolls, its bar below. */
export const PAGE_COLUMN = '-mb-8 flex h-[calc(100dvh-5.5rem)] flex-col gap-3'
