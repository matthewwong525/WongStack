import { z } from 'zod'
import { label, type Item } from './api'

/** The longest note the person can add to an answer. */
export const NOTE = 500
const KEY = 'inbox-decisions'

// A pick is a choice's place: the version in the key changes whenever an item's words or options do.
const draft = z.object({ pick: z.number().int().nonnegative().optional(), own: z.string().optional(), note: z.string().max(NOTE).optional() })
/** What the person picked on one decision, a question's own words, and the note that goes with it. */
export type Draft = z.infer<typeof draft>
type Drafts = Record<string, Draft>
/** One answer the person can pick: what its button says, and the tap it sends. */
export type Choice = { label: string; action: string; text: string }

export const draftKey = (item: Item) => `${item.id}:${item.version}`
/** `record` without `key`. */
export const without = <T>(record: Record<string, T>, key: string) => Object.fromEntries(Object.entries(record).filter(([each]) => each !== key))

/** The picks and notes this device kept, or none when what it kept is unreadable. */
export function readDrafts(): Drafts {
  try {
    return z.record(z.string(), draft).parse(JSON.parse(localStorage.getItem(KEY) ?? '{}'))
  } catch {
    return {}
  }
}
export const writeDrafts = (drafts: Drafts) => localStorage.setItem(KEY, JSON.stringify(drafts))
/** Only the drafts of items still listed at the version shown: a gone or rebuilt item drops its own. */
export function keepListed(drafts: Drafts, items: Item[]): Drafts {
  const listed = new Set(items.map(draftKey))
  return Object.fromEntries(Object.entries(drafts).filter(([key]) => listed.has(key)))
}

/** An approval's action as its choice says it: `decline` → *Don't approve*. The tap still names the action. */
export const say = (action: string) => action === 'decline' ? "Don't approve" : label(action)

/** An approval's actions, or a question's options; a question also takes words of the person's own, one past these. */
export const choicesOf = (item: Item): Choice[] => item.kind === 'approval'
  ? item.actions.map(action => ({ label: say(action), action, text: '' }))
  : (item.detail?.options ?? []).map(option => ({ label: option, action: 'send', text: option }))

/** The choice a draft picked, own words included, or null while nothing is picked or the own words are empty. */
export function pickOf(item: Item, draft: Draft = {}): Choice | null {
  const choices = choicesOf(item)
  if (draft.pick === undefined) return null
  if (draft.pick < choices.length) return choices[draft.pick]
  const own = draft.own?.trim()
  return own ? { label: own, action: 'send', text: own } : null
}

/** The words a picked choice sends: a question's answer, then the note on its own line. */
export const textOf = (choice: Choice, draft: Draft = {}) => [choice.text, draft.note?.trim()].filter(Boolean).join('\n')
