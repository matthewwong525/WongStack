import { useCallback, useEffect, useRef, useState } from 'react'
import { CopyText } from '@/components/CopyText'
import { Button } from '@/components/ui/button'
import { cancelTap, pending, PREVIEW, readTap, type Tap } from './api'
import { useLine } from './line'

/** How often a waiting tap asks where it stands while the line is down; an open line says when to look. */
export const TAP_POLL_MS = 3_000

const SAID: Record<Exclude<Tap['state'], 'waiting' | 'delivering' | 'failed' | 'changed'>, string> = {
  sent: 'Sent', cancelled: 'Cancelled. Nothing was sent.', expired: 'This closed before your computer picked it up. Nothing was sent.',
}

/** Where one answer stands. While it waits it asks again, and offers Cancel until the computer takes it. */
export function TapLine({ tap, online, copy, onChange, onReload }: {
  tap: Tap; online: boolean; copy: string; onChange: (tap: Tap) => void; onReload: () => void
}) {
  const [problem, setProblem] = useState('')
  // The newest handler, so a parent's redraw never restarts the wait.
  const changed = useRef(onChange)
  useEffect(() => { changed.current = onChange })
  const live = pending(tap)
  const ask = useCallback(() => void readTap(tap.id).then(next => changed.current(next), () => undefined), [tap.id])
  const up = useLine(() => { if (live) ask() })
  useEffect(() => {
    if (!live || up) return
    const timer = setInterval(ask, TAP_POLL_MS)
    return () => clearInterval(timer)
  }, [ask, live, up])
  // The list carries the start of a long answer: one to copy is read in full.
  const cut = tap.state === 'failed' && tap.text.length >= PREVIEW
  useEffect(() => {
    if (cut) void readTap(tap.id).then(full => { if (full.text !== tap.text) changed.current(full) }, () => undefined)
  }, [cut, tap.id, tap.text])
  const cancel = () => cancelTap(tap.id).then(onChange, () => setProblem('Cancel did not go through. Try again.'))
  if (tap.state === 'delivering') return <p className="text-sm" role="status">Sending…</p>
  if (tap.state === 'waiting') return <div className="flex flex-wrap items-center gap-2" role="status">
    <span className="text-sm">{online ? 'Waiting…' : 'Waiting for your computer'}</span>
    <Button type="button" size="sm" variant="outline" onClick={() => void cancel()}>Cancel</Button>
    {problem && <span className="basis-full text-sm" role="alert">{problem}</span>}
  </div>
  if (tap.state === 'failed') return <div className="grid gap-2" role="status">
    <p className="text-sm font-semibold">Didn't arrive. Copy your answer into the chat.</p>
    <CopyText text={copy} label="Copy answer" />
  </div>
  if (tap.state === 'changed') return <div className="flex flex-wrap items-center gap-2" role="status">
    <span className="text-sm">This plan changed.</span>
    <Button type="button" size="sm" variant="outline" onClick={onReload}>Reload</Button>
  </div>
  return <p className="text-sm" role="status">{SAID[tap.state]}</p>
}
