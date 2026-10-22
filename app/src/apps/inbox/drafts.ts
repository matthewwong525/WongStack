import { z } from 'zod'
import { label, type Item } from './api'

const KEY = 'inbox-decisions'

// A pick is a choice's place: the version in the key changes whenever an item's words or options do. `object` drops
// the `note` an older draft kept, so it still reads.
const place = z.number().int().nonnegative()
const draft = z.object({ pick: place.optional(), own: z.string().optional(), ticks: z.array(place).optional() })
/** What the person picked on one decision, or ticked on a tick-several question, and their own words. */
export type Draft = z.infer<typeof draft>
type Drafts = Record<string, Draft>
/** One answer the person can pick: what its button says, and the tap it sends. */
export type Choice = { label: string; action: string; text: string }

export const draftKey = (item: Item) => `${item.id}:${item.version}`
/** `record` without `key`. */
export const without = <T>(record: Record<string, T>, key: string) => Object.fromEntries(Object.entries(record).filter(([each]) => each !== key))

/** The picks and words this device kept, or none when what it kept is unreadable. */
export function readDrafts(): Drafts {
  try {
    return z.record(z.string(), draft).parse(JSON.parse(localStorage.getItem(KEY) ?? '{}'))
  } catch {
    return {}
  }
}
export const writeDrafts = (drafts: Drafts) => localStorage.setItem(KEY, JSON.stringify(drafts))
/** Only the drafts of items still listed at the version shown: a gone or rebuilt item drops its own, and a plan card
 *  its questions'. */
export function keepListed(drafts: Drafts, items: Item[]): Drafts {
  const listed = new Set(items.map(draftKey))
  return Object.fromEntries(Object.entries(drafts).filter(([key]) => listed.has(key.replace(/^([^.:]+)\.\d+:/, '$1:'))))
}

/** An approval's action as its choice says it: `decline` → *Don't approve*. The tap still names the action. */
export const say = (action: string) => action === 'decline' ? "Don't approve" : label(action)
/** Whether a question takes several of its options at once. */
export const multi = (item: Item) => item.kind === 'question' && item.detail?.multi === true
/** `ticks` with `n` ticked or unticked. */
export const toggle = (ticks: number[] = [], n: number) => ticks.includes(n) ? ticks.filter(each => each !== n) : [...ticks, n]

const START: Choice[] = [{ label: 'Go', action: 'go', text: '' }, { label: 'Not today', action: 'skip', text: '' }]

/** An approval's actions, a plan card's Go and Not today, or a question's options; own words sit one past these. */
export const choicesOf = (item: Item): Choice[] => item.kind === 'approval'
  ? item.actions.map(action => ({ label: say(action), action, text: '' }))
  : item.kind === 'start' ? START : (item.detail?.options ?? []).map(option => ({ label: option, action: 'send', text: option }))

/** A plan card's questions, each a decision of its own, so it takes the same picks and words. */
export const questionsOf = (item: Item): Item[] => (item.start?.plan?.questions ?? []).map((question, n) => ({ ...item, id: `${item.id}.${n}`,
  kind: 'question', title: question.text, actions: [], detail: { text: question.text, options: question.options, multi: question.several },
  start: null, tap: null }))

/** A plan card's answer: Go unless Not today is picked, with the note, then on Go each question answered. */
function startPickOf(item: Item, draftOf: (item: Item) => Draft | undefined): Choice {
  const draft = draftOf(item) ?? {}
  const go = draft.pick !== 1
  const note = draft.own?.trim()
  const answers = go ? questionsOf(item).flatMap(question => {
    const answer = pickOf(question, draftOf(question))
    return answer ? [`${question.title}\n${answer.text}`] : []
  }) : []
  return { ...START[go ? 0 : 1], text: [note && `Note: ${note}`, ...answers].filter(Boolean).join('\n\n') }
}

/** The answer an item's drafts give, or null while they give none: a plan card always gives one. */
export const answerOf = (item: Item, draftOf: (item: Item) => Draft | undefined) =>
  item.kind === 'start' ? startPickOf(item, draftOf) : pickOf(item, draftOf(item))

/** The answer a draft gives, or null while it gives none. Own words go as `send`, on an approval too; a tick-several
 *  question sends each ticked option on its own line, then the words. */
export function pickOf(item: Item, draft: Draft = {}): Choice | null {
  const choices = choicesOf(item)
  const own = draft.own?.trim() ?? ''
  if (multi(item)) {
    const lines = [...choices.filter((_, n) => draft.ticks?.includes(n)).map(choice => choice.label), own].filter(Boolean)
    return lines.length > 0 ? { label: lines.join(', '), action: 'send', text: lines.join('\n') } : null
  }
  if (draft.pick === undefined) return null
  if (draft.pick < choices.length) return choices[draft.pick]
  return own ? { label: own, action: 'send', text: own } : null
}
