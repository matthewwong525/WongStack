// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Status } from '../../lib/access'
import { ProjectStep } from './ProjectStep'
import { FINISH_REQUEST, PROJECT_REQUEST, SAVE_REQUEST } from './status'

const status = (project: Status['project'], owner = true, projectSave?: Status['projectSave']): Status => ({ ownerEmail: 'owner@shop.com', viewer: { email: owner ? 'owner@shop.com' : 'kim@shop.com', owner },
  environment: 'live', key: 'ready', started: true, imported: 0, keysStarted: true, unticked: { people: [], roles: [] }, apps: [], keys: [], roles: [], people: [], work: [], project, projectSave })
beforeEach(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(async () => {}) } }))
afterEach(() => { cleanup(); vi.restoreAllMocks() })
const copies = async (request: string) => {
  fireEvent.click(screen.getByRole('button', { name: 'Copy that request' }))
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(request))
}

it('says nothing once the app can hand the project out', () => {
  const { container } = render(<ProjectStep status={status('ready')} />)
  expect(container.textContent).toBe(''); cleanup()
  expect(render(<ProjectStep status={status('ready', false)} />).container.textContent).toBe(''); cleanup()
  // Handed out and saved to: nothing either, for the owner or an Admin.
  for (const owner of [true, false]) { expect(render(<ProjectStep status={status('ready', owner, 'ready')} />).container.textContent).toBe(''); cleanup() }
})
it('asks for one step at a time: the install step alone while the project can not be handed out', () => {
  const { container } = render(<ProjectStep status={status('key', true, 'key')} />)
  expect(container.textContent).toMatch(/^One step first\./); expect(container.textContent).not.toMatch(/Saving/)
  expect(screen.getAllByRole('button')).toHaveLength(1)
})
it('tells the owner whose app holds only the older key that saving needs one more step, with its own request to copy', async () => {
  const { container } = render(<ProjectStep status={status('ready', true, 'key')} />)
  expect(container.querySelector('p')!.textContent).toBe('Saving needs one more step. People can install the project now. To let them save changes, the app needs a newer GitHub key. Ask your assistant: Let teammates save changes')
  await copies(SAVE_REQUEST)
  expect(SAVE_REQUEST).toMatch(/^Let teammates save changes: .*WONG_CODE_WRITE.*wiki\/stack\/employee-project\.md/)
})
it('sends the owner of a Cloudflare-kept project that can not save yet to finish Access setup', async () => {
  const { container } = render(<ProjectStep status={status('ready', true, 'setup')} />)
  expect(container.querySelector('p')!.textContent).toBe('Saving needs one more step. People can install the project now. To let them save changes, ask your assistant: Finish Access setup')
  expect(container.textContent).not.toMatch(/GitHub/)
  await copies(FINISH_REQUEST)
})
it("tells an Admin the save step is the owner's, with nothing to copy", () => {
  expect(render(<ProjectStep status={status('ready', false, 'key')} />).container.textContent).toBe('Saving needs one more step for the owner. owner@shop.com adds a GitHub key.'); cleanup()
  expect(render(<ProjectStep status={status('ready', false, 'setup')} />).container.textContent).toBe('Saving needs one more step for the owner. owner@shop.com finishes Access setup.')
  expect(screen.queryByRole('button')).toBeNull()
})
it('asks the owner for the GitHub key, with the words to say and the whole request to copy', async () => {
  const { container } = render(<ProjectStep status={status('key')} />)
  expect(container.querySelector('p')!.textContent).toBe('One step first. The app needs a GitHub key to hand the project out. Ask your assistant: Let teammates install the project')
  expect(screen.getByText('Let teammates install the project').tagName).toBe('Q')
  await copies(PROJECT_REQUEST)
  // The request names the key and the page that owns the steps, and repeats none of them.
  expect(PROJECT_REQUEST).toMatch(/^Let teammates install the project: .*WONG_CODE_WRITE.*wiki\/stack\/employee-project\.md/)
})
it("tells an Admin the GitHub key is the owner's step, with nothing to copy", () => {
  const { container } = render(<ProjectStep status={status('key', false)} />)
  expect(container.textContent).toBe('One step first for the owner. owner@shop.com adds a GitHub key.')
  expect(screen.queryByRole('button')).toBeNull()
})
it('sends the owner of an install with no project recorded to finish Access setup, never to make a GitHub key', async () => {
  const { container } = render(<ProjectStep status={status('setup')} />)
  expect(container.querySelector('p')!.textContent).toBe('One step first. The app does not know which project to hand out yet. Ask your assistant: Finish Access setup')
  expect(container.textContent).not.toMatch(/GitHub/)
  await copies(FINISH_REQUEST)
})
it('on a preview, says the project is the live app\'s alone, with no step for the owner or an Admin', () => {
  for (const owner of [true, false]) {
    const { container } = render(<ProjectStep status={status('live', owner, 'live')} />)
    expect(container.textContent).toBe('Live app only. People install the project and save changes from the live app.')
    expect(screen.queryByRole('button')).toBeNull(); cleanup()
  }
})
it("tells an Admin that finishing Access setup is the owner's step, with nothing to copy", () => {
  const { container } = render(<ProjectStep status={status('setup', false)} />)
  expect(container.textContent).toBe('One step first for the owner. owner@shop.com finishes Access setup.')
  expect(screen.queryByRole('button')).toBeNull()
})
