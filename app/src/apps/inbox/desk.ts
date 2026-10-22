import { useEffect, useRef, useState } from 'react'
import type { Item } from './api'
import { choicesOf, draftKey, keepListed, multi, readDrafts, toggle, without, writeDrafts, type Draft } from './drafts'

export const cardId = (item: Item) => `inbox-${item.id}`
export const ownId = (item: Item) => `inbox-own-${item.id}`

/** The person's picks and words on the open decisions, kept on this device, the card the keys act on, and the cards
 *  that Change, own words or ticks hold open. Only the server's `listed` items keep theirs: gone or rebuilt drop. */
export function useDesk(decisions: Item[], listed: Item[] | undefined) {
  const [drafts, setDrafts] = useState(readDrafts)
  const [selected, setSelected] = useState('')
  const [held, setHeld] = useState<ReadonlySet<string>>(new Set())
  // The element to focus once a render has drawn it: kept until it is there, so a render in between can't drop it.
  const focus = useRef('')
  useEffect(() => writeDrafts(listed ? keepListed(drafts, listed) : drafts), [drafts, listed])
  useEffect(() => {
    const target = focus.current && document.getElementById(focus.current)
    if (target) { target.focus(); focus.current = '' }
  })
  const update = (item: Item, patch: Draft) => setDrafts(all => ({ ...all, [draftKey(item)]: { ...all[draftKey(item)], ...patch } }))
  const hold = (item: Item, on: boolean) => setHeld(all => new Set(on ? [...all, item.id] : [...all].filter(id => id !== item.id)))
  const go = (item: Item, element = cardId(item)) => { setSelected(item.id); focus.current = element }
  return {
    current: decisions.find(item => item.id === selected) ?? decisions[0],
    held: (item: Item) => held.has(item.id), draftOf: (item: Item): Draft | undefined => drafts[draftKey(item)],
    select: (item: Item) => setSelected(item.id),
    move: (from: Item, by: number) => go(decisions[Math.min(decisions.length - 1, Math.max(0, decisions.indexOf(from) + by))]),
    /** Picks choice `n`, keeping any words unpicked, or ticks it on a tick-several question; true when keys go on. */
    pick(item: Item, n: number) {
      if (n >= choicesOf(item).length) return false
      if (multi(item)) {
        setDrafts(all => ({ ...all, [draftKey(item)]: { ...all[draftKey(item)], ticks: toggle(all[draftKey(item)]?.ticks, n) } }))
        hold(item, true)
        return false
      }
      update(item, { pick: n })
      hold(item, false)
      return true
    },
    /** Typing picks the words, past every choice, and holds the card open so the first letter never folds it. */
    own: (item: Item, own: string) => { update(item, multi(item) ? { own } : { own, pick: choicesOf(item).length }); hold(item, true) },
    write: (item: Item) => { hold(item, true); go(item, ownId(item)) },
    clear: (item: Item) => setDrafts(all => without(all, draftKey(item))),
    reopen: (item: Item) => { hold(item, true); go(item) },
    fold: (item: Item) => { hold(item, false); go(item) },
    /** A plan card's note: it never changes Go or Not today. */
    note: (item: Item, own: string) => update(item, { own }),
    sent: (item: Item) => {
      setDrafts(all => Object.fromEntries(Object.entries(all).filter(([key]) => key !== draftKey(item) && !key.startsWith(`${item.id}.`))))
      hold(item, false)
    },
  }
}
export type Desk = ReturnType<typeof useDesk>
