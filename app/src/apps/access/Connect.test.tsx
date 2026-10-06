// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { App } from './App'
import { Connect } from './Connect'

// What the setup read answers for one person, and whether they may connect.
let own: Record<string, unknown>
beforeEach(() => {
  own = { role: 'employee', api: 'authenticated', identity: { email: 'employee@example.com', subject: 'employee' }, apps: ['hello'],
    repository: 'manual_provider_setup', memory: 'independent_operator_setup', prompt: { state: 'ready', text: 'Synthetic reviewed setup prompt' } }
  vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json(url.endsWith('/setup') ? own
    : { state: 'current', role: 'employee', manages: false, apps: ['access', 'hello'], revision: 1, keys: [], code: own.code })))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const page = () => render(<MemoryRouter initialEntries={['/apps/access/']}><Routes><Route path="/apps/:name/*" element={<App />} /></Routes></MemoryRouter>)
const steps = () => screen.getByRole('region', { name: 'Connect your assistant' })
const drawn = () => [!!screen.queryByText(/^Apps:/), !!screen.queryByText(/^Project:/), !!screen.queryByRole('button', { name: 'Copy setup prompt' }),
  !!screen.queryByText(/Project code and memory are set up separately/), !!screen.queryByText('Your copy is for using, not publishing. Memory is set up separately.')]
const LACKED = { code: 'lacked', prompt: { state: 'unavailable', message: 'Ask your admin for access to Connect your assistant.' } }

it('the steps on the page follow whether the person may connect: the project when ready, the apps alone when off, who to ask when they lack Project code', async () => {
  own.code = 'ready'; page(); await screen.findByText('Project: the whole project, kept up to date')
  expect(drawn()).toEqual([true, true, true, false, true]); cleanup()
  // Off, as before the app could hand the project out: the same steps and closing line as ever.
  own.code = 'off'; page(); await screen.findByText('Apps: Hello')
  expect(drawn()).toEqual([true, false, true, true, false]); cleanup()
  Object.assign(own, LACKED); page(); await screen.findByText('Ask your admin for access to Connect your assistant.')
  expect(drawn()).toEqual([false, false, false, false, false])
  expect(within(steps()).getByText('Signed in as employee@example.com')).toBeTruthy()
  // What they can use still shows under it.
  expect(screen.getByRole('region', { name: 'You can use' })).toBeTruthy()
})

it('a manager who lacks Project code reads the same in the popup from the button beside the heading', async () => {
  Object.assign(own, LACKED); render(<Connect />)
  fireEvent.click(screen.getByRole('button', { name: 'Connect your assistant' }))
  await screen.findByText('Ask your admin for access to Connect your assistant.')
  expect([!!steps().closest('[role="dialog"]'), ...drawn()]).toEqual([true, false, false, false, false, false])
})
