// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { FakeSocket, line } from './line.test.kit'
import { FIRST_WAIT_MS, PING_MS, useLine } from './line'

afterEach(() => { cleanup(); vi.useRealTimers() })

function Light() {
  return <p>{useLine() ? 'up' : 'down'}</p>
}

it('opens one line, pings while it is up, and opens it again after a drop, waiting longer each time', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  render(<><Light /><Light /></>)
  expect(FakeSocket.all).toHaveLength(1)
  expect(line().url).toBe('ws://localhost:3000/apps/inbox/api/line')
  await line().open()
  expect(screen.getAllByText('up')).toHaveLength(2)
  await act(async () => { vi.advanceTimersByTime(PING_MS) })
  expect(line().sent).toEqual(['{"t":"ping"}'])
  await line().say('not json')
  await line().say(42)
  await line().drop()
  expect(screen.getAllByText('down')).toHaveLength(2)
  await act(async () => { vi.advanceTimersByTime(FIRST_WAIT_MS) })
  expect(FakeSocket.all).toHaveLength(2)
  await line().drop()
  await act(async () => { vi.advanceTimersByTime(FIRST_WAIT_MS) })
  expect(FakeSocket.all).toHaveLength(2)
  await act(async () => { vi.advanceTimersByTime(FIRST_WAIT_MS) })
  expect(FakeSocket.all).toHaveLength(3)
  // A line that was replaced says nothing when it closes.
  await FakeSocket.all[0].drop()
  cleanup()
  expect(line().closed).toBe(true)
})
