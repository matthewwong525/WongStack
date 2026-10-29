import { useCallback, useEffect, useRef, useState } from 'react'
import type { BacklogGroup, Task, TaskSlot } from '@/lib/board'
import { backlogGroupsWithMove } from './edits'

// Dragging by a handle, with Pointer Events: HTML drag and drop does nothing on iOS Safari. The target is read from the
// page under the pointer, so a redraw during a drag is safe.

/** Near the top or bottom edge, by this many pixels, a drag scrolls the page. */
const edgeZone = 72
const edgeSpeed = 14
/** A press becomes a drag after it travels this far. A shorter press is a tap, which opens the handle's menu. */
const dragThreshold = 5

type Options<Item, Target> = {
  targetAt: (x: number, y: number) => Target | null
  onDrop: (item: Item, target: Target) => void
  /** Keep the last target over a gap with none: a gap between columns is not "no drop". */
  sticky?: boolean
}

function usePointerDrag<Item, Target>({ targetAt, onDrop, sticky = false }: Options<Item, Target>) {
  const [drag, setDrag] = useState<{ item: Item; x: number; y: number } | null>(null)
  const [target, setTarget] = useState<Target | null>(null)
  const targetRef = useRef<Target | null>(null)
  const draggingRef = useRef<Item | null>(null)
  const pressed = useRef<{ item: Item; x: number; y: number } | null>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const edge = useRef(0)
  const latest = useRef({ targetAt, onDrop })
  useEffect(() => { latest.current = { targetAt, onDrop } })

  // A left button or a touch only. No preventDefault: the press is no drag yet, and a tap must still open the menu.
  const start = useCallback((item: Item, event: React.PointerEvent) => {
    if (event.button === 0) pressed.current = { item, x: event.clientX, y: event.clientY }
  }, [])

  useEffect(() => {
    function promote(event: PointerEvent) {
      const candidate = pressed.current
      if (!candidate || draggingRef.current) return
      if (Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y) < dragThreshold) return
      draggingRef.current = candidate.item
      targetRef.current = null
      pointer.current = { x: event.clientX, y: event.clientY }
      setDrag({ item: candidate.item, x: event.clientX, y: event.clientY })
      setTarget(null)
    }
    const release = () => { pressed.current = null }
    window.addEventListener('pointermove', promote)
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
    return () => {
      window.removeEventListener('pointermove', promote)
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
    }
  }, [])

  const dragging = drag !== null
  useEffect(() => {
    if (!dragging) return
    // No text selection during a drag: on iOS a press grows a selection, and its Copy bar covers the list.
    const body = document.body
    const before = [body.style.userSelect, body.style.webkitUserSelect, body.style.getPropertyValue('-webkit-touch-callout')]
    body.style.userSelect = 'none'
    body.style.webkitUserSelect = 'none'
    body.style.setProperty('-webkit-touch-callout', 'none')
    window.getSelection()!.removeAllRanges()

    function retarget() {
      const next = latest.current.targetAt(pointer.current.x, pointer.current.y)
      if (next === null && sticky) return
      targetRef.current = next
      setTarget(next)
    }
    let frame = requestAnimationFrame(scroll)
    // The page moved under a still pointer, so the target is read again.
    function scroll() {
      if (edge.current !== 0) { window.scrollBy(0, edge.current); retarget() }
      frame = requestAnimationFrame(scroll)
    }
    function move(event: PointerEvent) {
      pointer.current = { x: event.clientX, y: event.clientY }
      retarget()
      setDrag(current => ({ ...current!, x: event.clientX, y: event.clientY }))
      edge.current = event.clientY < edgeZone ? -edgeSpeed : window.innerHeight - event.clientY < edgeZone ? edgeSpeed : 0
    }
    function finish(commit: boolean) {
      const item = draggingRef.current!
      const dropped = targetRef.current
      draggingRef.current = null
      targetRef.current = null
      pressed.current = null
      edge.current = 0
      setDrag(null)
      setTarget(null)
      // The pointerup that ends a drag would land as a click on the handle and open its menu.
      swallowNextClick()
      if (commit && dropped !== null) latest.current.onDrop(item, dropped)
    }
    const end = () => finish(true)
    const cancel = () => finish(false)
    const suppress = (event: Event) => event.preventDefault()
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', cancel)
    document.addEventListener('selectstart', suppress)
    document.addEventListener('contextmenu', suppress)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', cancel)
      document.removeEventListener('selectstart', suppress)
      document.removeEventListener('contextmenu', suppress)
      body.style.userSelect = before[0]
      body.style.webkitUserSelect = before[1]
      body.style.setProperty('-webkit-touch-callout', before[2])
      window.getSelection()!.removeAllRanges()
    }
  }, [dragging, sticky])

  return { drag, target, start }
}

function swallowNextClick() {
  const suppress = (event: MouseEvent) => { event.preventDefault(); event.stopPropagation() }
  window.addEventListener('click', suppress, { capture: true, once: true })
  // A touch drag often sends no click, so nothing waits for one.
  setTimeout(() => window.removeEventListener('click', suppress, { capture: true }), 0)
}

export interface DropTarget {
  slot: TaskSlot
  backlogGroupId: string | null
  index: number
}

/** Moves tasks by their handle: the cell and the row a task would land in. */
export function useTaskDrag(onDrop: (task: Task, target: DropTarget) => void) {
  const { drag, target, start } = usePointerDrag<Task, DropTarget>({ targetAt: taskTargetAt, onDrop })
  const over = (slot: TaskSlot, backlogGroupId: string | null) => target?.slot === slot && target.backlogGroupId === backlogGroupId
  return {
    drag: drag && { task: drag.item, x: drag.x, y: drag.y },
    draggingId: drag?.item.id ?? null,
    start,
    /** The drop line of one cell, or null when the pointer is somewhere else. */
    indexFor: (slot: TaskSlot, backlogGroupId: string | null = null) => over(slot, backlogGroupId) ? target!.index : null,
    isOver: (slot: TaskSlot, backlogGroupId: string | null = null) => over(slot, backlogGroupId),
  }
}

/** A drop goes before the row whose top half holds the pointer. */
function taskTargetAt(x: number, y: number): DropTarget | null {
  const section = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-slot-key]')
  if (!section) return null
  const slot = section.dataset.slotKey as TaskSlot
  const backlogGroupId = section.dataset.backlogGroupId ?? null
  const rows = [...section.querySelectorAll<HTMLElement>('[data-drop-index]')]
  const before = rows.find(row => { const box = row.getBoundingClientRect(); return y < box.top + box.height / 2 })
  return { slot, backlogGroupId, index: before ? Number(before.dataset.dropIndex) : rows.length }
}

/** Moves backlog groups by their grip. `order` is the list as a release would leave it, while a drag is on. */
export function useGroupDrag(groups: BacklogGroup[], onDrop: (group: BacklogGroup, index: number) => void) {
  const { drag, target, start } = usePointerDrag<BacklogGroup, number>({
    targetAt: (x, y) => {
      const column = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-group-drop-index]')
      return column ? Number(column.dataset.groupDropIndex) : null
    },
    onDrop: (group, index) => { if (groups.findIndex(each => each.id === group.id) !== index) onDrop(group, index) },
    sticky: true,
  })
  return {
    drag,
    draggingId: drag?.item.id ?? null,
    start,
    order: drag && target !== null ? backlogGroupsWithMove(groups, drag.item.id, target) : null,
  }
}
