// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ConnectDialog } from './ConnectDialog'
import { CopyText } from './CopyText'

// The setup message is one long line. The text area part grows to fit what it holds unless it is told to keep its
// size, and a grid or flex child is as wide as its longest word unless it may shrink. These classes are what keep
// the message inside its box, on the page and in the popup.
const setup = { role: 'employee', api: 'authenticated', identity: { email: 'person@example.com', subject: 'person' }, apps: ['hello'],
  repository: 'manual_provider_setup', memory: 'independent_operator_setup', prompt: { state: 'ready', text: 'word'.repeat(200) } }
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json(setup)))
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(async () => {}) } })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const classes = (element: Element) => element.className.split(/\s+/)
const fits = (area: HTMLTextAreaElement) => {
  expect(classes(area)).toEqual(expect.arrayContaining(['field-sizing-fixed', 'w-full', 'wrap-anywhere']))
  expect(classes(area)).not.toContain('field-sizing-content')
  const fold = area.closest('details')!
  for (const wrapper of [fold, fold.parentElement!]) expect(classes(wrapper)).toEqual(expect.arrayContaining(['w-full', 'min-w-0']))
}
const button = (name: string) => screen.getByRole('button', { name })

it('keeps the text to copy at its box\'s width, however long a line is', () => {
  render(<CopyText text={setup.prompt.text} label="Copy that request" />)
  fits(document.querySelector('textarea')!)
})

it('copies with one button, outlined unless it is told to be the solid one, and says so quietly', async () => {
  render(<CopyText text="Safe instructions" label="Copy that request" />)
  expect(button('Copy that request').getAttribute('data-variant')).toBe('outline')
  expect(screen.getByRole('status').textContent).toBe('')
  fireEvent.click(button('Copy that request')); await screen.findByText('Copied.')
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Safe instructions')
  // Copying by hand stays, folded under a small line that says what it is for.
  const fold = document.querySelector('details')!
  expect([fold.open, fold.querySelector('summary')!.textContent]).toEqual([false, "Can't copy? Show the message"])
  cleanup()
  render(<CopyText text="Safe instructions" label="Copy" variant="default" />)
  expect(button('Copy').getAttribute('data-variant')).toBe('default')
})

it('opens the text to select when the clipboard is missing, and it can be folded away again', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
  render(<CopyText text="Safe instructions" label="Copy instructions" />); fireEvent.click(button('Copy instructions'))
  await screen.findByText('Copy the message below by hand.')
  const input = screen.getByRole('textbox', { name: 'The message to copy' }) as HTMLTextAreaElement
  expect([input.readOnly, input.value, input.closest('details')!.open]).toEqual([true, 'Safe instructions', true])
  const details = input.closest('details')!; details.open = false; fireEvent(details, new Event('toggle'))
  await waitFor(() => expect(details.open).toBe(false))
})

it('keeps the setup steps in one column that can shrink, inside the popup', async () => {
  // Whatever opens the popup is the child; the steps load once it is open.
  render(<ConnectDialog><button type="button">Open</button></ConnectDialog>)
  expect(screen.queryByRole('dialog')).toBeNull()
  fireEvent.click(button('Open')); await screen.findByRole('button', { name: 'Copy' })
  const column = screen.getByRole('region', { name: 'Connect your assistant' }).firstElementChild!
  expect(classes(column)).toEqual(expect.arrayContaining(['grid', 'grid-cols-[minmax(0,1fr)]', 'wrap-anywhere']))
  // The popup is never wider or taller than the screen.
  const popup = screen.getByRole('dialog')
  expect(classes(popup)).toEqual(expect.arrayContaining(['max-w-[calc(100%-2rem)]', 'max-h-[calc(100dvh-2rem)]', 'overflow-y-auto']))
  fits(popup.querySelector('textarea')!)
})
