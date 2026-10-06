import { createContext, useContext, useEffect } from 'react'

/** Holds a move to another address when there are changes to lose: it returns true once it has asked. */
export type Ask = (to: string) => boolean

/** How an opened item leaves its question with the views, so their links can ask before they move; null takes it back. */
export const Asking = createContext<((ask: Ask | null) => void) | null>(null)

/** An opened item hands the views its question while it is drawn, and takes it back when it closes. */
export function useAsk(ask: Ask) {
  const leave = useContext(Asking)!
  useEffect(() => { leave(ask); return () => leave(null) })
}
