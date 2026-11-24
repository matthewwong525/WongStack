import { expect, it } from 'vitest'
import { afterLoad, leaveLine, START, stopped } from './leave'

it('counts the first load as the page, and each later load as a try that starts the frame again', () => {
  const shown = afterLoad(START)
  expect(shown).toEqual({ loads: 1, tries: 0 })
  expect(leaveLine(shown.tries)).toBeNull()
  const left = afterLoad(shown)
  // A new start counts its own first load again.
  expect(left).toEqual({ loads: 0, tries: 1 })
  expect(leaveLine(left.tries)).toBe('This page tried to leave the page.')
  expect(stopped(left.tries)).toBe(false)
})

it('stops the frame at the third try, until a reload', () => {
  let seen = START
  for (let load = 0; load < 6; load++) seen = afterLoad(seen)
  expect(seen).toEqual({ loads: 0, tries: 3 })
  expect(stopped(seen.tries)).toBe(true)
  expect(leaveLine(seen.tries)).toBe('This page keeps trying to leave. Reload to try again.')
  expect(stopped(2)).toBe(false)
})
