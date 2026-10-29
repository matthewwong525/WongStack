// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { sendTap, type Tap } from './api'
import { line } from './line.test.kit'
import { TAP_POLL_MS, TapLine } from './TapLine'

const tapOf = (state: Tap['state'], text = ''): Tap => ({ id: 't'.repeat(32), item: 'i'.repeat(32), action: 'approve', text, state })
let answer: (path: string) => Response
beforeEach(() => {
  answer = () => Response.json({ tap: tapOf('sent') })
  vi.stubGlobal('fetch', vi.fn(async (path: string) => answer(path)))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers() })

function show(tap: Tap, online = true) {
  const changes: Tap[] = []
  const reload = vi.fn()
  const view = render(<TapLine tap={tap} online={online} copy="Send it: Approve" onChange={next => changes.push(next)} onReload={reload} />)
  return { changes, reload, view }
}
const status = () => screen.getByRole('status').textContent

it('says where an answer stands once it has left', () => {
  for (const [state, said] of [['sent', 'Sent'], ['cancelled', 'Cancelled. Nothing was sent.'],
    ['expired', 'This closed before your computer picked it up. Nothing was sent.'], ['delivering', 'Sending…']] as const) {
    show(tapOf(state))
    expect(status()).toBe(said)
    cleanup()
  }
})

it('waits for the computer, asks again while the line is down, and cancels', async () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  const { changes } = show(tapOf('waiting'), false)
  expect(status()).toContain('Waiting for your computer')
  await act(async () => { vi.advanceTimersByTime(TAP_POLL_MS) })
  await waitFor(() => expect(changes.map(tap => tap.state)).toEqual(['sent']))
  answer = () => Response.json({ error: { code: 'not_waiting' } }, { status: 409 })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cancel' })) })
  expect(screen.getByRole('alert').textContent).toBe('Cancel did not go through. Try again.')
  answer = () => Response.json({ tap: tapOf('cancelled') })
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cancel' })) })
  expect(changes.map(tap => tap.state)).toEqual(['sent', 'cancelled'])
})

it('asks on each look of an open line, and only while the answer is on its way', async () => {
  const { changes, view } = show(tapOf('waiting'))
  expect(status()).toContain('Waiting…')
  await line().open()
  await line().say('{"t":"look"}')
  await waitFor(() => expect(changes.length).toBeGreaterThan(0))
  answer = () => Response.json({}, { status: 500 })
  await line().say('{"t":"look"}')
  view.rerender(<TapLine tap={tapOf('sent')} online copy="" onChange={next => changes.push(next)} onReload={() => {}} />)
  const asked = vi.mocked(fetch).mock.calls.length
  await line().say('{"t":"look"}')
  expect(vi.mocked(fetch).mock.calls.length).toBe(asked)
})

it('reads the whole of a long answer that did not arrive, and offers the words to copy', async () => {
  const words = 'x'.repeat(200)
  answer = () => Response.json({ tap: tapOf('failed', `${words} and more`) })
  const { changes } = show(tapOf('failed', words))
  expect(screen.getByText("Didn't arrive. Copy your answer into the chat.")).toBeTruthy()
  expect(screen.getByLabelText<HTMLTextAreaElement>('The message to copy').value).toBe('Send it: Approve')
  await waitFor(() => expect(changes.map(tap => tap.text)).toEqual([`${words} and more`]))
  cleanup()
  answer = () => Response.json({ tap: tapOf('failed', words) })
  const same = show(tapOf('failed', words))
  answer = () => Response.json({}, { status: 500 })
  show(tapOf('failed', 'y'.repeat(200)))
  await act(async () => {})
  expect(same.changes).toEqual([])
})

it('offers Reload when the plan changed', async () => {
  const { reload } = show(tapOf('changed'))
  expect(status()).toContain('This plan changed.')
  fireEvent.click(screen.getByRole('button', { name: 'Reload' }))
  expect(reload).toHaveBeenCalled()
})

it('says why a tap was refused', async () => {
  const input = { item: 'i', action: 'approve', version: 'v1', text: '' }
  const cases: Array<[Response, string]> = [
    [Response.json({ error: { code: 'done' } }, { status: 409 }), 'done'], [Response.json({ error: { code: 'changed' } }, { status: 409 }), 'changed'],
    [Response.json({ error: { code: 'too_soon' } }, { status: 429 }), 'soon'], [Response.json({ error: { code: 'closed' } }, { status: 410 }), 'closed'],
    [Response.json({ error: { code: 'internal' } }, { status: 500 }), 'failed'], [Response.json({ tap: tapOf('waiting') }), 'waiting']]
  for (const [response, said] of cases) {
    answer = () => response
    const result = await sendTap(input)
    expect(typeof result === 'string' ? result : result.state).toBe(said)
  }
  answer = () => { throw new TypeError('offline') }
  expect(await sendTap(input)).toBe('failed')
})
