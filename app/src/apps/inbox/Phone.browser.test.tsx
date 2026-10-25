// The inbox on a phone, in a real browser: a long answer wraps inside its card, and the page never scrolls sideways.
import '@/index.css'
import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, expect, it, vi } from 'vitest'
import { page } from 'vitest/browser'
import { routes } from '../../router'
import { card, item, QUESTION, server } from './App.test.kit'

const WORDS = 'the kits wait for another day, and the HP box stays in its carton until someone has a free afternoon '
const OPTIONS = ['Ship the doc fix (PR #1856) and close this chat; ', 'Set up the HP box and the kits now; ']
  .map(start => (start + WORDS.repeat(3)).slice(0, 200))

beforeEach(async () => {
  await page.viewport(390, 844)
  server.items = [item(QUESTION, 'question', 'Pre-order chat', { workspace: 'finicky-bullfrog',
    detail: { text: 'Ship the doc fix and close, or set up the HP box?', options: OPTIONS } })]
})

/** Opens the app at `at`, in its own frame and bar, once the question's answers show. */
async function open(at: string) {
  const inbox = vi.mocked(fetch)
  vi.stubGlobal('fetch', vi.fn(async (path: string, init?: RequestInit) => path === '/api/access/apps'
    ? Response.json({ state: 'current', role: 'employee', revision: 1, apps: ['inbox'] }) : inbox(path, init)))
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [at] })} />)
  await screen.findAllByRole('radio')
}

/** Each answer sits inside its card, its words too, on more than one line, and nothing is wider than the screen. */
function fits() {
  const box = card('Pre-order chat').getBoundingClientRect()
  const rows = within(card('Pre-order chat')).getAllByRole('radio')
  expect(rows).toHaveLength(2)
  for (const row of rows) {
    for (const each of [row, row.lastElementChild!].map(part => part.getBoundingClientRect())) {
      expect(each.left).toBeGreaterThanOrEqual(box.left)
      expect(each.right).toBeLessThanOrEqual(box.right)
    }
    expect(row.getBoundingClientRect().height).toBeGreaterThan(60)
  }
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390)
}

it('wraps a long answer inside its card in the list', async () => {
  await open('/apps/inbox/')
  fits()
})

it('wraps a long answer inside its card on the question\'s own page, read from its JSON body', async () => {
  await open(`/apps/inbox/?item=${QUESTION}`)
  fits()
  expect(document.querySelector('iframe')).toBeNull()
  expect(document.body.textContent).not.toContain('{"text"')
})
