import { expect, it } from 'vitest'
import { frameMessage, notesKey } from './frame'

const plan = { actions: ['build', 'publish'], key: 'wong-review3:inbox' }

it('reads the three kinds a plan page may send, with every field checked', () => {
  expect(frameMessage({ type: 'inbox:tap', action: 'publish', text: '' }, plan)).toEqual({ type: 'inbox:tap', action: 'publish', text: '' })
  expect(frameMessage({ type: 'inbox:tap', action: 'send', text: 'A note' }, plan)).toMatchObject({ action: 'send' })
  expect(frameMessage({ type: 'inbox:notes-get', key: 'wong-review3:inbox' }, plan)).toEqual({ type: 'inbox:notes-get', key: 'wong-review3:inbox' })
  expect(frameMessage({ type: 'inbox:notes-set', key: 'wong-review3:inbox', value: '{}' }, plan)).toMatchObject({ value: '{}' })
})

it("refuses anything else: another kind, an extra field, a wrong type, another plan's key, too much text, or an action not offered", () => {
  for (const data of [null, 'inbox:tap', { type: 'inbox:hello' }, { type: 'inbox:tap', action: 'build', text: '', key: 'x' },
    { type: 'inbox:tap', action: 'build', text: 1 }, { type: 'inbox:notes-get', key: 'cf-access-token' },
    { type: 'inbox:notes-get', key: 'wong-review3:another-plan' }, { type: 'inbox:notes-set', key: 'wong-review3:another-plan', value: '{}' },
    { type: 'inbox:notes-set', key: 'wong-review3:inbox', value: 'x'.repeat(1_000_001) },
    { type: 'inbox:tap', action: 'build', text: 'n'.repeat(20_001) }, { type: 'inbox:tap', action: 'merge', text: '' }]) {
    expect(frameMessage(data, plan)).toBeNull()
  }
  expect(frameMessage({ type: 'inbox:notes-get', key: 'wong-review3:inbox' }, { ...plan, key: null })).toBeNull()
})

it("reads a plan's notes key from its review page's body, and none from a page that names no change", () => {
  expect(notesKey('<!doctype html><body class="x" data-change="inbox-mini-app">')).toBe('wong-review3:inbox-mini-app')
  for (const body of ['<p data-change="inbox">', '<body data-change="">', '<body data-change="a b">', '<body>']) expect(notesKey(body)).toBeNull()
})
