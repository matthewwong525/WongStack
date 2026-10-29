import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { pendingWrites } from '../api'

/** Signals closer than this are one arrival: a tab switch sends two at once. */
const coalesceMs = 1000

/** Reads the week again each time the page is current again: a tab switch, a window focus, the network back. It gives
 *  a look for the live line, held the same way; a look inside the window reads once more at its end. */
export function useRevalidate(reload: () => void, paused: boolean) {
  const writing = useSyncExternalStore(pendingWrites.subscribe, pendingWrites.count) > 0
  const held = paused || writing
  const reloadRef = useRef(reload)
  const heldRef = useRef(held)
  // An arrival while held: one flag, so several become one read when the hold lifts.
  const queued = useRef(false)
  const last = useRef(0)
  const trailing = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => { reloadRef.current = reload }, [reload])

  const serve = useCallback(() => {
    last.current = Date.now()
    reloadRef.current()
  }, [])
  useEffect(() => {
    heldRef.current = held
    if (!held && queued.current) { queued.current = false; serve() }
  }, [held, serve])

  /** True when the hold took the signal. */
  const hold = useCallback(() => { if (heldRef.current) queued.current = true; return heldRef.current }, [])
  const arrived = useCallback(() => {
    if (!hold() && Date.now() - last.current >= coalesceMs) serve()
  }, [hold, serve])
  const look = useCallback(() => {
    if (hold()) return
    const since = Date.now() - last.current
    if (since >= coalesceMs) serve()
    else trailing.current ??= setTimeout(() => { trailing.current = undefined; serve() }, coalesceMs - since)
  }, [hold, serve])
  useEffect(() => () => clearTimeout(trailing.current), [])

  useEffect(() => {
    // Going away is no arrival: a tab nobody looks at reads nothing.
    const visible = () => { if (document.visibilityState === 'visible') arrived() }
    document.addEventListener('visibilitychange', visible)
    for (const event of ['focus', 'online', 'pageshow']) window.addEventListener(event, arrived)
    return () => {
      document.removeEventListener('visibilitychange', visible)
      for (const event of ['focus', 'online', 'pageshow']) window.removeEventListener(event, arrived)
    }
  }, [arrived])
  return look
}

/** Whether a read gave what is on screen already: a redraw for nothing moves the caret while the person types. */
export const sameData = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** Long enough that a word typed fast is one request, short enough to feel immediate. */
const searchDelayMs = 250

export type SearchState<T> =
  | { status: 'idle'; results: null }
  | { status: 'loading'; results: null }
  | { status: 'error'; results: null }
  | { status: 'ready'; results: T }

/** Searches when the typing stops. Each answer keeps its query, so a slow older answer never shows. */
export function useSearch<T>(query: string, search: (query: string) => Promise<T>) {
  const trimmed = query.trim()
  const [answer, setAnswer] = useState<{ key: string; results?: T; failed?: boolean } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const searchRef = useRef(search)
  useEffect(() => { searchRef.current = search })

  useEffect(() => {
    if (!trimmed) return
    let cancelled = false
    const timer = setTimeout(() => {
      searchRef.current(trimmed).then(
        results => { if (!cancelled) setAnswer({ key: trimmed, results }) },
        () => { if (!cancelled) setAnswer({ key: trimmed, failed: true }) })
    }, searchDelayMs)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [trimmed, attempt])

  const retry = useCallback(() => { setAnswer(null); setAttempt(count => count + 1) }, [])
  const state: SearchState<T> = !trimmed ? { status: 'idle', results: null }
    : answer?.key !== trimmed ? { status: 'loading', results: null }
      : answer.failed ? { status: 'error', results: null } : { status: 'ready', results: answer.results as T }
  return { ...state, retry }
}

// What opened the newest dialog. A menu item goes away when its menu closes, so a menu stands for its trigger.
let lastOpener: HTMLElement | null = null
function remember(event: FocusEvent) {
  const target = event.target as HTMLElement
  const menu = target.closest('[role="menu"]')
  lastOpener = menu ? document.getElementById(menu.getAttribute('aria-labelledby')!) : target
}

/** A dialog opened from page state has no trigger to go back to. Pass the result as `onCloseAutoFocus`: focus goes
 *  back to the control that opened it, if that control is still on the page. */
export function useReturnFocus(open: boolean) {
  const opener = useRef<HTMLElement | null>(null)
  // A layout effect runs before the dialog's portal mounts and moves the focus inside. The same listener is added once.
  useLayoutEffect(() => {
    document.addEventListener('focusin', remember)
    if (open) opener.current = lastOpener
  }, [open])
  return useCallback((event: Event) => {
    const target = opener.current
    if (!target?.isConnected) return
    event.preventDefault()
    target.focus()
  }, [])
}
