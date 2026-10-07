// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ConnectDialog } from './ConnectDialog'

// The body of the Connect your assistant popup, in each of its four states. It is drawn only inside the popup.
const setup = () => ({ role: 'employee', api: 'authenticated', identity: { email: 'person@example.com', subject: 'person' }, apps: ['hello', 'access'], titles: undefined as Record<string, string> | undefined,
  repository: 'manual_provider_setup', memory: 'independent_operator_setup', prompt: { state: 'ready', text: 'Synthetic setup message' } as object })
let own: ReturnType<typeof setup>
let reply: () => Response | Promise<Response>
let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  own = setup(); reply = () => Response.json(own)
  fetchMock = vi.fn(async () => reply())
  vi.stubGlobal('fetch', fetchMock)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(async () => {}) } })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

// The popup, opened by its child.
function open() {
  render(<ConnectDialog><button type="button">Open</button></ConnectDialog>)
  fireEvent.click(screen.getByRole('button', { name: 'Open' }))
  return screen.getByRole('dialog', { name: 'Connect your assistant' })
}
const classesOf = (element: Element) => element.className.split(/\s+/)
const WHAT = 'Use your apps from an AI assistant on your computer, such as Claude Code or Codex.'

it('says it is loading under what an assistant is, with nothing to copy yet', () => {
  reply = () => new Promise<Response>(() => {})
  const popup = open()
  expect(within(popup).getByRole('status').textContent).toBe('Loading the steps…')
  // The heading names the popup and the line under it describes it: an assistant, with two named only as examples.
  expect(document.getElementById(popup.getAttribute('aria-describedby')!)!.textContent).toBe(WHAT)
  expect([within(popup).queryByRole('list'), within(popup).queryByRole('button', { name: 'Copy' }), within(popup).queryByRole('alert')]).toEqual([null, null, null])
})

it('gives three numbered steps with one solid Copy button, who signs in, what to ask and the apps it reaches', async () => {
  const popup = within(open())
  const copy = await popup.findByRole('button', { name: 'Copy' })
  // A numbered list: copy, paste, approve. The list itself draws the numbers.
  const steps = popup.getByRole('list')
  expect([steps.tagName, classesOf(steps).includes('list-decimal')]).toEqual(['OL', true])
  const items = within(steps).getAllByRole('listitem')
  expect(items.map(item => item.querySelector('p')!.textContent)).toEqual(['Copy your setup message', "Paste it into your assistant's chat", 'Approve the sign-in it opens'])
  // Copy is in the first step and is the popup's one solid button; the email is in the third.
  expect([items[0].contains(copy), copy.getAttribute('data-variant')]).toEqual([true, 'default'])
  expect(popup.getAllByRole('button').filter(button => button.getAttribute('data-variant') === 'default')).toEqual([copy])
  expect(within(items[2]).getByText('You sign in as person@example.com')).toBeTruthy()
  fireEvent.click(copy); await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Synthetic setup message'))
  // After the steps: what to ask once it works, and the apps by title.
  const ask = popup.getByText('What can I do here?')
  expect([ask.tagName, ask.parentElement!.textContent]).toEqual(['Q', 'Then ask it: What can I do here?'])
  expect(steps.compareDocumentPosition(ask) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(popup.getByText('It can use: Hello, Access')).toBeTruthy()
  // Copying by hand stays, as a small line.
  expect(popup.getByText("Can't copy? Show the message").tagName).toBe('SUMMARY')
  expect(popup.queryByText(/sign in to this app/i)).toBeNull()
  cleanup()
  // With no app yet, the last line says who to ask.
  own.apps = []
  expect(await within(open()).findByText('It can use: no apps yet. Ask your employer.')).toBeTruthy()
  cleanup()
  // An area with no screen has no card to take a title from: the app sends its title.
  own.apps = ['hello', 'customers']
  own.titles = { hello: 'Hello', customers: 'Customers' }
  expect(await within(open()).findByText('It can use: Hello, Customers')).toBeTruthy()
  cleanup()
  // An older answer names no titles: a name with no card shows as it is.
  own.titles = undefined
  expect(await within(open()).findByText('It can use: Hello, customers')).toBeTruthy()
})

it('says what the app answered when there is nothing to copy, with no steps', async () => {
  own.prompt = { state: 'unavailable', message: 'Ask your employer to finish the reviewed assistant setup.' }
  const popup = within(open())
  expect(await popup.findByText('Ask your employer to finish the reviewed assistant setup.')).toBeTruthy()
  expect([popup.queryByRole('list'), popup.queryByRole('button', { name: 'Copy' }), popup.queryByRole('textbox'), popup.queryByRole('alert')]).toEqual([null, null, null, null])
  expect(popup.queryByText(/You sign in as/)).toBeNull()
})

it('follows whether the person may have the project: the project when ready, the apps alone when off, who to ask when they lack Project code', async () => {
  const drawn = () => [!!screen.queryByText(/^It can use:/), !!screen.queryByText('Project: the whole project, kept up to date'), !!screen.queryByRole('button', { name: 'Copy' }),
    !!screen.queryByText('This connects the apps above. Project code and memory are set up separately.'), !!screen.queryByText('Your copy is for using, not publishing. Memory is set up separately.')]
  Object.assign(own, { code: 'ready' }); open(); await screen.findByText('Project: the whole project, kept up to date')
  expect(drawn()).toEqual([true, true, true, false, true]); cleanup()
  // Off, as before the app could hand the project out, and when the answer leaves it out.
  Object.assign(own, { code: 'off' }); open(); await screen.findByRole('button', { name: 'Copy' })
  expect(drawn()).toEqual([true, false, true, true, false]); cleanup()
  Object.assign(own, { code: 'lacked', prompt: { state: 'unavailable', message: 'Ask your admin for access to Connect your assistant.' } })
  open(); await screen.findByText('Ask your admin for access to Connect your assistant.')
  expect(drawn()).toEqual([false, false, false, false, false])
})

it('says the steps could not load and offers to try again, never telling a signed-in person to sign in', async () => {
  reply = () => Response.json({ code: 'unavailable' }, { status: 503 })
  const popup = within(open())
  expect((await popup.findByRole('alert')).textContent).toBe("The steps couldn't load.")
  expect(popup.queryByText(/sign in/i)).toBeNull()
  // Try again is the one button besides the popup's own ✕, and it reads the steps again.
  expect(popup.getAllByRole('button').map(button => button.textContent)).toEqual(['Try again', 'Close'])
  expect([popup.queryByRole('list'), popup.queryByRole('button', { name: 'Copy' })]).toEqual([null, null])
  reply = () => Response.json(own)
  fireEvent.click(popup.getByRole('button', { name: 'Try again' }))
  expect(await popup.findByRole('button', { name: 'Copy' })).toBeTruthy()
  expect([popup.queryByRole('alert'), fetchMock.mock.calls.length]).toEqual([null, 2])
})
