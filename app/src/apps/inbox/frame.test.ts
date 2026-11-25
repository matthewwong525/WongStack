import { expect, it } from 'vitest'
import { frameMessage } from './frame'

const plan = { actions: ['build', 'publish'], key: 'wong-review3:inbox' }

it('reads the kinds a plan page may send, with every field checked', () => {
  expect(frameMessage({ type: 'inbox:tap', action: 'publish', text: '' }, plan)).toEqual({ type: 'inbox:tap', action: 'publish', text: '' })
  expect(frameMessage({ type: 'inbox:tap', action: 'send', text: 'A note' }, plan)).toMatchObject({ action: 'send' })
  expect(frameMessage({ type: 'inbox:notes-get', key: 'wong-review3:inbox' }, plan)).toEqual({ type: 'inbox:notes-get', key: 'wong-review3:inbox' })
  expect(frameMessage({ type: 'inbox:notes-set', key: 'wong-review3:inbox', value: '{}' }, plan)).toMatchObject({ value: '{}' })
  // The page's own Back needs no key: a plan that names no review still has it.
  expect(frameMessage({ type: 'inbox:back' }, { ...plan, key: null })).toEqual({ type: 'inbox:back' })
  expect(frameMessage({ type: 'inbox:back' }, plan)).toEqual({ type: 'inbox:back' })
  // A picture by name needs no key either: a shared page asks for one.
  expect(frameMessage({ type: 'inbox:media', ref: 'm1', name: 'ad-3.mp4' }, { ...plan, key: null })).toEqual({ type: 'inbox:media', ref: 'm1', name: 'ad-3.mp4' })
})

it("refuses anything else: another kind, an extra field, a wrong type, another plan's key, too much text, or an action not offered", () => {
  for (const data of [null, 'inbox:tap', { type: 'inbox:hello' }, { type: 'inbox:tap', action: 'build', text: '', key: 'x' },
    { type: 'inbox:tap', action: 'build', text: 1 }, { type: 'inbox:notes-get', key: 'cf-access-token' },
    { type: 'inbox:notes-get', key: 'wong-review3:another-plan' }, { type: 'inbox:notes-set', key: 'wong-review3:another-plan', value: '{}' },
    { type: 'inbox:notes-set', key: 'wong-review3:inbox', value: 'x'.repeat(1_000_001) },
    { type: 'inbox:tap', action: 'build', text: 'n'.repeat(20_001) }, { type: 'inbox:tap', action: 'merge', text: '' },
    { type: 'inbox:back', key: 'wong-review3:inbox' }, { type: 'inbox:back', to: '/' },
    { type: 'inbox:media', ref: 'a b', name: 'x.png' }, { type: 'inbox:media', ref: 'm1', name: '' }, { type: 'inbox:media', ref: 'm1' },
    // An older plan still reports its scroll; nothing reads it now.
    { type: 'inbox:scroll', down: true }, { type: 'inbox:scroll', down: false, top: true }]) {
    expect(frameMessage(data, plan)).toBeNull()
  }
  expect(frameMessage({ type: 'inbox:notes-get', key: 'wong-review3:inbox' }, { ...plan, key: null })).toBeNull()
})
