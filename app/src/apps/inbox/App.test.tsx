// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { routes } from '../../router'
import './line.test.kit'

let calls: string[]
beforeEach(() => {
  calls = []
  vi.stubGlobal('fetch', vi.fn(async (path: string) => {
    const url = new URL(path, 'https://app.test')
    // The page frame asks which apps the person may open.
    if (url.pathname.startsWith('/api/access/')) return Response.json({ state: 'legacy' })
    calls.push(url.pathname.replace('/apps/inbox/api/', ''))
    if (url.pathname.endsWith('/items')) return Response.json({ items: [], computerOnline: true })
    if (url.pathname.endsWith('/reviews')) return Response.json({ waiting: [], archived: [], more: false })
    return new Response(null, { status: 410 })
  }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const open = async (at: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [at] })
  await act(async () => { render(<RouterProvider router={router} />) })
}

it('opens the waiting pages at their own address, inside the page frame', async () => {
  await open('/apps/inbox/')
  expect(await screen.findByText('Nothing waits for you.')).toBeTruthy()
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Inbox')
  expect(calls.filter(call => call === 'items')).toHaveLength(1)
})

it('opens a plan from its link, not the waiting pages', async () => {
  await open(`/apps/inbox/?item=${'c'.repeat(32)}`)
  expect(await screen.findByRole('link', { name: /Back/ })).toBeTruthy()
  expect(calls).not.toContain('reviews')
  expect(calls.filter(call => call === 'item')).toHaveLength(1)
})
