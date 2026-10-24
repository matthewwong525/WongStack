// @vitest-environment jsdom
import { cleanup, screen, within } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { calls, card, FIRST, item, open, server, show, tapOf, tick, view } from './App.test.kit'
import { FIRST_WAIT_MS, LINE_REFRESH_MS, PING_MS, REFRESH_MS } from './line'
import { FakeSocket, line } from './line.test.kit'
import { TAP_POLL_MS } from './TapLine'

const reads = () => [calls.filter(call => call.path.endsWith('/items')).length, calls.filter(call => call.path.includes('/tap?id=')).length]
const waiting = () => { server.read = () => Response.json({ tap: tapOf(FIRST, 'waiting') }) }

it('reads the list and a waiting tap at each look on the open line, and ignores anything else it hears', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  server.items = [item(FIRST, 'approval', 'Send the quote', { tap: tapOf(FIRST, 'waiting') })]
  waiting()
  await open()
  expect(FakeSocket.all.map(socket => socket.url)).toEqual([`ws://${location.host}/apps/inbox/api/line`])
  // An opened line looks once, for whatever changed while it was down; then nothing asks every few seconds.
  await line().open()
  expect(reads()).toEqual([2, 1])
  await tick(REFRESH_MS)
  expect(reads()).toEqual([2, 1])
  for (const heard of ['{"t":"pong"}', 'null', 'not json', 42]) await line().say(heard)
  expect(reads()).toEqual([2, 1])
  server.read = () => Response.json({ tap: tapOf(FIRST, 'sent') })
  await line().say('{"t":"look"}')
  expect(reads()).toEqual([3, 2])
  expect(within(card('Send the quote')).getByRole('status').textContent).toBe('Sent')
  // A tap that arrived is not read again.
  await line().say('{"t":"look"}')
  expect(reads()).toEqual([4, 2])
  // Once a minute the list still reads, so a computer that went quiet shows; the line says it is there every 30 s.
  await tick(LINE_REFRESH_MS - REFRESH_MS)
  expect(reads()).toEqual([5, 2])
  expect(line().sent).toEqual(Array(Math.floor(LINE_REFRESH_MS / PING_MS)).fill('{"t":"ping"}'))
})

it('keeps one line while the person moves between views', async () => {
  await open()
  await line().open()
  await view('Schedules')
  await screen.findByText('No schedules yet')
  await view('Agents')
  await screen.findByText('Nothing is waiting on you.')
  expect(FakeSocket.all).toHaveLength(1)
  expect(line().closed).toBe(false)
})

it('asks every few seconds again when the line is refused or drops, and opens it again after a longer wait each time', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
  server.items = [item(FIRST, 'approval', 'Send the quote', { tap: tapOf(FIRST, 'waiting') })]
  waiting()
  // Waiting for the screen needs timeouts, which this test fakes: it moves the clock itself.
  show()
  await tick(0)
  expect(screen.getByText('Computer online')).toBeTruthy()
  // Refused: the next try comes after 1 s, then 2 s.
  await line().drop()
  await tick(FIRST_WAIT_MS)
  expect(FakeSocket.all).toHaveLength(2)
  await line().drop()
  await tick(FIRST_WAIT_MS)
  expect(FakeSocket.all).toHaveLength(2)
  await tick(FIRST_WAIT_MS)
  expect(FakeSocket.all).toHaveLength(3)
  // An old line that closes late changes nothing.
  await FakeSocket.all[0].drop()
  await tick(4 * FIRST_WAIT_MS)
  expect(FakeSocket.all).toHaveLength(3)
  await line().open()
  const [list, taps] = reads()
  await tick(REFRESH_MS)
  expect(reads()).toEqual([list, taps])
  // Dropped once open: the page asks as before, and the wait starts again from 1 s.
  await line().drop()
  await tick(REFRESH_MS)
  expect(reads()).toEqual([list + 1, taps + REFRESH_MS / TAP_POLL_MS])
  expect(FakeSocket.all).toHaveLength(4)
  // Leaving the page while it waits to try again ends the wait.
  await line().drop()
  cleanup()
  await tick(4 * FIRST_WAIT_MS)
  expect(FakeSocket.all).toHaveLength(4)
})
