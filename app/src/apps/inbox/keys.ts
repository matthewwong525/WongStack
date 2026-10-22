import { useEffect, useRef } from 'react'
import type { Item } from './api'

type Acts = {
  item: Item | undefined; move: (item: Item, by: number) => void; pick: (item: Item, n: number) => void; write: (item: Item) => void
  clear: (item: Item) => void; send: () => void
}
const MOVES: Record<string, number> = { j: 1, arrowdown: 1, k: -1, arrowup: -1 }
const typing = (target: EventTarget | null) => target instanceof Element && target.closest('input, textarea') !== null

/** What a key does to the outlined card, or null for a key that means nothing here. */
function action(key: string, acts: Acts, item: Item): (() => void) | null {
  if (Object.hasOwn(MOVES, key)) return () => acts.move(item, MOVES[key])
  if (/^[1-6]$/.test(key)) return () => acts.pick(item, Number(key) - 1)
  return key === 'n' ? () => acts.write(item) : key === 'z' ? () => acts.clear(item) : null
}

/** The decisions' keys, as on a daily decisions page. None fires while the person types, but Ctrl/⌘ Enter sends. */
export function useKeys(acts: Acts) {
  const latest = useRef(acts)
  useEffect(() => { latest.current = acts })
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase(), { item } = latest.current
      if (key === 'enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); return latest.current.send() }
      if (!item || event.ctrlKey || event.metaKey || event.altKey || typing(event.target)) return
      const run = action(key, latest.current, item)
      if (!run) return
      event.preventDefault()
      run()
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])
}
