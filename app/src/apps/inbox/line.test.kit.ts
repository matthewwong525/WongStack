// A stand-in for the browser's WebSocket: a test opens, speaks on, and drops the inbox's line by hand. Until opened it
// stays connecting, so a page polls as it does with no line.
import { act } from '@testing-library/react'
import { beforeEach, vi } from 'vitest'

export class FakeSocket {
  static all: FakeSocket[] = []
  sent: string[] = []
  closed = false
  onopen: (() => void) | null = null
  onmessage: ((event: { data: unknown }) => void) | null = null
  onclose: (() => void) | null = null
  url: string
  constructor(url: URL) { this.url = String(url); FakeSocket.all.push(this) }
  send(data: string) { this.sent.push(data) }
  close() { this.closed = true }
  open = () => act(async () => { this.onopen?.() })
  say = (data: unknown) => act(async () => { this.onmessage?.({ data }) })
  /** The app refused the line, or it dropped. */
  drop = () => act(async () => { this.onclose?.() })
}
/** The newest line the page opened. */
export const line = () => FakeSocket.all.at(-1)!

beforeEach(() => {
  FakeSocket.all.length = 0
  vi.stubGlobal('WebSocket', FakeSocket)
})
