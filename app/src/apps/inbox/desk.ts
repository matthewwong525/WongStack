import { useEffect, useRef, useState } from 'react'
import type { Item } from './api'
import { choicesOf, draftKey, keepListed, readDrafts, without, writeDrafts, type Draft } from './drafts'

export const cardId = (item: Item) => `inbox-${item.id}`
export const ownId = (item: Item) => `inbox-own-${item.id}`
export const noteId = (item: Item) => `inbox-note-${item.id}`

/** The person's picks and notes on the open decisions, kept on this device, the card the keys act on, and the cards
 *  that Change, own words or a note hold open. Only the server's `listed` items keep theirs: gone or rebuilt drop. */
export function useDesk(decisions: Item[], listed: Item[] | undefined) {
  const [drafts, setDrafts] = useState(readDrafts)
  const [selected, setSelected] = useState('')
  const [held, setHeld] = useState<ReadonlySet<string>>(new Set())
  const [noting, setNoting] = useState('')
  // The element to focus once the next render has drawn it.
  const focus = useRef('')
  useEffect(() => writeDrafts(listed ? keepListed(drafts, listed) : drafts), [drafts, listed])
  useEffect(() => { document.getElementById(focus.current)?.focus(); focus.current = '' })
  const update = (item: Item, patch: Draft) => setDrafts(all => ({ ...all, [draftKey(item)]: { ...all[draftKey(item)], ...patch } }))
  const hold = (item: Item, on: boolean) => setHeld(all => new Set(on ? [...all, item.id] : [...all].filter(id => id !== item.id)))
  const go = (item: Item, element = cardId(item)) => { setSelected(item.id); focus.current = element }
  return {
    current: decisions.find(item => item.id === selected) ?? decisions[0], noting,
    held: (item: Item) => held.has(item.id), draftOf: (item: Item): Draft | undefined => drafts[draftKey(item)], update,
    select: (item: Item) => setSelected(item.id),
    move: (from: Item, by: number) => go(decisions[Math.min(decisions.length - 1, Math.max(0, decisions.indexOf(from) + by))]),
    /** Picks choice `n`, or a question's own words one past its choices; true when the keys go on to the next card. */
    pick(item: Item, n: number) {
      const count = choicesOf(item).length
      if (n > count || (n === count && item.kind !== 'question')) return false
      update(item, { pick: n })
      hold(item, n === count)
      if (n === count) focus.current = ownId(item)
      return n < count
    },
    /** Own words hold their card open while they are written, so the first letter never folds it. */
    own: (item: Item, own: string) => { update(item, { own }); hold(item, true) },
    clear: (item: Item) => update(item, { pick: undefined }),
    reopen: (item: Item) => { hold(item, true); go(item) },
    fold: (item: Item) => { hold(item, false); go(item) },
    openNote: (item: Item) => { setNoting(item.id); go(item, noteId(item)) },
    closeNote: (item: Item) => { setNoting(''); go(item) },
    sent: (item: Item) => { setDrafts(all => without(all, draftKey(item))); hold(item, false) },
  }
}
export type Desk = ReturnType<typeof useDesk>
