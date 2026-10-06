// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Status } from '../../lib/access'
import { ProjectStep } from './ProjectStep'
import { FINISH_REQUEST, PROJECT_REQUEST } from './status'

const status = (project: Status['project'], owner = true): Status => ({ ownerEmail: 'owner@shop.com', viewer: { email: owner ? 'owner@shop.com' : 'kim@shop.com', owner },
  environment: 'live', key: 'ready', started: true, imported: 0, keysStarted: true, kept: 0, areas: [], skills: [], appKeys: {}, keys: [], roles: [], people: [], work: [], project })
beforeEach(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(async () => {}) } }))
afterEach(() => { cleanup(); vi.restoreAllMocks() })
const copies = async (request: string) => {
  fireEvent.click(screen.getByRole('button', { name: 'Copy that request' }))
  await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(request))
}

it('says nothing once the app can hand the project out', () => {
  const { container } = render(<ProjectStep status={status('ready')} />)
  expect(container.textContent).toBe(''); cleanup()
  expect(render(<ProjectStep status={status('ready', false)} />).container.textContent).toBe('')
})
it('asks the owner for the read-only GitHub key, with the words to say and the whole request to copy', async () => {
  const { container } = render(<ProjectStep status={status('key')} />)
  expect(container.querySelector('p')!.textContent).toBe('One step first. The app needs a read-only GitHub key to hand the project out. Ask your assistant: Let teammates install the project')
  expect(screen.getByText('Let teammates install the project').tagName).toBe('Q')
  await copies(PROJECT_REQUEST)
  // The request names the key and the page that owns the steps, and repeats none of them.
  expect(PROJECT_REQUEST).toMatch(/^Let teammates install the project: .*WONG_CODE_READ.*wiki\/stack\/employee-project\.md/)
})
it("tells a manager the GitHub key is the owner's step, with nothing to copy", () => {
  const { container } = render(<ProjectStep status={status('key', false)} />)
  expect(container.textContent).toBe('One step first for the owner. owner@shop.com adds a read-only GitHub key.')
  expect(screen.queryByRole('button')).toBeNull()
})
it('sends the owner of an install with no project recorded to finish Access setup, never to make a GitHub key', async () => {
  const { container } = render(<ProjectStep status={status('setup')} />)
  expect(container.querySelector('p')!.textContent).toBe('One step first. The app does not know which project to hand out yet. Ask your assistant: Finish Access setup')
  expect(container.textContent).not.toMatch(/GitHub/)
  await copies(FINISH_REQUEST)
})
it("tells a manager that finishing Access setup is the owner's step, with nothing to copy", () => {
  const { container } = render(<ProjectStep status={status('setup', false)} />)
  expect(container.textContent).toBe('One step first for the owner. owner@shop.com finishes Access setup.')
  expect(screen.queryByRole('button')).toBeNull()
})
