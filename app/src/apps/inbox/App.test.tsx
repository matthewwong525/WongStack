// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { expect, it } from 'vitest'
import { routes } from '../../router'
import { calls, open } from './week/week.test.kit'

it('opens the week at its own address, inside the page frame', async () => {
  const router = createMemoryRouter(routes, { initialEntries: ['/apps/inbox/'] })
  await act(async () => { render(<RouterProvider router={router} />) })
  expect(await screen.findByTestId('backlog-grid')).toBeTruthy()
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Inbox')
  expect(screen.getByRole('radio', { name: 'Day' }).getAttribute('aria-checked')).toBe('true')
  expect(calls('GET week')).toHaveLength(1)
})

it('opens a plan from its link, not the week', async () => {
  await open(`/apps/inbox/?item=${'c'.repeat(32)}`, false)
  expect(await screen.findByRole('link', { name: /Back/ })).toBeTruthy()
  expect(calls('GET week')).toHaveLength(0)
  expect(calls('GET item')).toHaveLength(1)
})
