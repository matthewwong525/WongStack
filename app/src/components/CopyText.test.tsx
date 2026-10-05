// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AssistantSetup } from './AssistantSetup'
import { ConnectDialog } from './ConnectDialog'
import { CopyText } from './CopyText'

// The setup prompt is one long line. The text area part grows to fit what it holds unless it is told to keep its
// size, and a grid or flex child is as wide as its longest word unless it may shrink. These classes are what keep
// the prompt inside its box, on the page and in the popup.
const setup = { role: 'employee', api: 'authenticated', identity: { email: 'person@example.com', subject: 'person' }, apps: ['hello'],
  repository: 'manual_provider_setup', memory: 'independent_operator_setup', prompt: { state: 'ready', text: 'word'.repeat(200) } }
beforeEach(() => vi.stubGlobal('fetch', vi.fn(async () => Response.json(setup))))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const classes = (element: Element) => element.className.split(/\s+/)
const fits = (area: HTMLTextAreaElement) => {
  expect(classes(area)).toEqual(expect.arrayContaining(['field-sizing-fixed', 'w-full', 'wrap-anywhere']))
  expect(classes(area)).not.toContain('field-sizing-content')
  const fold = area.closest('details')!
  for (const wrapper of [fold, fold.parentElement!]) expect(classes(wrapper)).toEqual(expect.arrayContaining(['w-full', 'min-w-0']))
}

it('keeps the text to copy at its box\'s width, however long a line is', () => {
  render(<CopyText text={setup.prompt.text} label="Copy setup prompt" />)
  fits(document.querySelector('textarea')!)
})

it('keeps the setup steps in one column that can shrink, as a box on the page and inside the popup', async () => {
  const column = () => screen.getByRole('region', { name: 'Connect your assistant' }).firstElementChild!
  render(<AssistantSetup />); await screen.findByRole('button', { name: 'Copy setup prompt' })
  expect(classes(column())).toEqual(expect.arrayContaining(['grid', 'grid-cols-[minmax(0,1fr)]', 'wrap-anywhere']))
  expect(column().getAttribute('data-slot')).toBe('card'); fits(document.querySelector('textarea')!); cleanup()
  // Whatever opens the popup is the child; the steps load once it is open.
  render(<ConnectDialog><button type="button">Open</button></ConnectDialog>)
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Open' })); await screen.findByRole('button', { name: 'Copy setup prompt' })
  expect(classes(column())).toEqual(expect.arrayContaining(['grid', 'grid-cols-[minmax(0,1fr)]', 'wrap-anywhere']))
  expect(column().getAttribute('data-slot')).toBeNull(); fits(screen.getByRole('dialog').querySelector('textarea')!)
})
