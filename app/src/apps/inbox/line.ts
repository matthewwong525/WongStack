import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'

// The page's line to the app: one socket for the whole inbox, which only ever hears *look now*. A look makes each
// part read its own routes again; the line carries no item, tap or schedule. wiki/stack/live-line.md
const PATH = '/apps/inbox/api/line'
/** How often an open line says it is still there. */
export const PING_MS = 30_000
/** The first wait before opening a dropped line again; each failure doubles it, up to MAX_WAIT_MS. */
export const FIRST_WAIT_MS = 1_000
const MAX_WAIT_MS = 60_000

let socket: WebSocket | null = null
let up = false
let wait = FIRST_WAIT_MS
let retry: ReturnType<typeof setTimeout> | undefined
let ping: ReturnType<typeof setInterval> | undefined
const looks = new Set<() => void>()
const watchers = new Set<() => void>()

const lookAll = () => { for (const look of looks) look() }
function setUp(next: boolean) {
  if (up === next) return
  up = next
  for (const watch of watchers) watch()
}

/** True for the one message the app sends: `{"t":"look"}`. Anything else is ignored. */
function isLook(data: unknown) {
  try { return typeof data === 'string' && JSON.parse(data)?.t === 'look' } catch { return false }
}

function connect() {
  retry = undefined
  // http → ws, https → wss.
  const url = new URL(PATH, location.href)
  url.protocol = url.protocol.replace('http', 'ws')
  const ws = new WebSocket(url)
  socket = ws
  ws.onopen = () => {
    wait = FIRST_WAIT_MS
    ping = setInterval(() => ws.send('{"t":"ping"}'), PING_MS)
    setUp(true)
    // Whatever changed while the line was down shows now.
    lookAll()
  }
  ws.onmessage = event => { if (isLook(event.data)) lookAll() }
  // A refused or dropped line: the parts poll again until it reopens.
  ws.onclose = () => {
    if (socket !== ws) return
    clearInterval(ping)
    socket = null
    setUp(false)
    retry = setTimeout(connect, wait)
    wait = Math.min(wait * 2, MAX_WAIT_MS)
  }
}

function stop() {
  clearTimeout(retry)
  clearInterval(ping)
  const ws = socket
  socket = null
  retry = undefined
  wait = FIRST_WAIT_MS
  ws?.close()
  setUp(false)
}

const watch = (changed: () => void) => { watchers.add(changed); return () => { watchers.delete(changed) } }
const isUp = () => up

/** Keeps the line open while a part uses it, calls `onLook` on each look, and says whether the line is open. */
export function useLine(onLook: () => void = () => undefined) {
  const latest = useRef(onLook)
  useEffect(() => { latest.current = onLook })
  useEffect(() => {
    const look = () => latest.current()
    looks.add(look)
    if (looks.size === 1) connect()
    return () => {
      looks.delete(look)
      if (!looks.size) stop()
    }
  }, [])
  return useSyncExternalStore(watch, isUp)
}

/** How often an open, visible list reads again: every 15 s while the line is down, and once a minute while it is
 *  open, which keeps whether the computer is on honest. */
export const REFRESH_MS = 15_000
export const LINE_REFRESH_MS = 60_000

/** Reads `load` now, on each look, when the page comes back into view, and on the timer above. */
export function useFresh(load: () => void) {
  const latest = useRef(load)
  useEffect(() => { latest.current = load })
  const read = useCallback(() => latest.current(), [])
  const open = useLine(read)
  useEffect(() => { read() }, [read])
  useEffect(() => {
    const look = () => { if (document.visibilityState === 'visible') read() }
    const timer = setInterval(look, open ? LINE_REFRESH_MS : REFRESH_MS)
    document.addEventListener('visibilitychange', look)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', look) }
  }, [read, open])
  return open
}
