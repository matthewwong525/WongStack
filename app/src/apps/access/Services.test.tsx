// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { App } from './App'
import type { SavedKey, Status } from '../../lib/access'

// A shop's keys: Stripe is saved, Notion's API is saved and used directly, Mailchimp waits for its key link, and the
// Cloudflare look-up key waits for Access setup. Project code is Access's own and never a row here.
const key = (id: string, title: string, changes: Partial<SavedKey> = {}): SavedKey => ({ id, title, levels: ['read', 'write'], saved: true, setup: false, alone: false, ...changes })
const SHOP = [key('stripe', 'Stripe', { purpose: 'Payments and refunds' }), key('notion-api', 'Notion API', { purpose: 'Team notes', direct: true, docs: 'https://developers.notion.com' }),
  key('mailchimp', 'Mailchimp', { purpose: 'Email', saved: false }), key('cloudflare', 'Cloudflare', { purpose: 'Account look-ups', saved: false, setup: true }),
  key('code', 'Project code', { purpose: "This project's own code", alone: true })]
const status = (keys: SavedKey[]): Status => ({ ownerEmail: 'owner@shop.com', viewer: { email: 'owner@shop.com', owner: true }, environment: 'live', key: 'ready', started: true,
  imported: 0, keysStarted: true, unticked: { people: [], roles: [] }, apps: [], roles: [], people: [], work: [], project: 'ready', keys })
let side: 'owner' | 'admin' | 'teammate'; let keys: SavedKey[]; let fetchMock: ReturnType<typeof vi.fn>; let preview: boolean
beforeEach(() => {
  side = 'owner'; keys = SHOP; preview = false
  fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/access/apps') return Response.json(side === 'teammate' ? { state: 'current', role: 'employee', apps: ['access'], revision: 1, keys: [{ id: 'stripe', title: 'Stripe', level: 'read' }] }
      : { state: 'current', role: side === 'owner' ? 'owner' : 'employee', manages: true, apps: ['access'], revision: 1 })
    // A value the server never sends: were one sent, the screen would still not show it.
    return Response.json({ ...status(keys), ...(side === 'admin' && { viewer: { email: 'kim@shop.com', owner: false } }), ...(preview && { environment: 'practice' }),
      keys: keys.map(item => ({ ...item, value: 'sk_live_9f8e' })) })
  })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
const open = (path = 'services') => render(<MemoryRouter initialEntries={[`/apps/access/${path}`]}><Routes><Route path="/apps/:name/*" element={<App />} /></Routes></MemoryRouter>)
const tabs = () => within(screen.getByRole('navigation', { name: 'Access views' })).getAllByRole('link').map(link => link.textContent)
const line = (table: HTMLElement, title: string) => Array.from(within(table).getByText(title).closest('tr')!.querySelectorAll('td')).map(cell => cell.textContent)

it('the owner and an Admin see every key: what each is for and whether it is saved, never a value, a level or a place to type one', async () => {
  for (const viewer of ['owner', 'admin'] as const) {
    side = viewer; open(); const table = await screen.findByRole('table', { name: 'Services' })
    // Services is the third view, counting its keys; the project's own code is not one of them.
    expect(tabs(), viewer).toEqual(['People 1', 'Roles 0', 'Services 4']); expect(screen.getByRole('link', { name: 'Services 4' }).getAttribute('aria-current')).toBe('page')
    expect(within(table).getAllByRole('row').slice(1).map(row => row.querySelector('td')!.textContent), viewer).toEqual(['Stripe', 'Notion API', 'Mailchimp', 'Cloudflare'])
    expect(['Stripe', 'Notion API', 'Mailchimp', 'Cloudflare'].map(title => line(table, title)), viewer).toEqual([['Stripe', 'Payments and refunds', 'Saved'],
      ['Notion API', 'Team notes · API guide', 'Savedalso used directly'], ['Mailchimp', 'Email', 'Not savedAsk the assistant for its key link'],
      ['Cloudflare', 'Account look-ups', 'Not savedAsk the assistant to finish Access setup']])
    // The quiet lines are muted, each on its own line; a key used directly links its API guide.
    for (const note of ['also used directly', 'Ask the assistant for its key link']) expect(screen.getByText(note).className).toBe('block text-muted-foreground')
    expect(within(table).getByRole('link', { name: 'API guide' }).getAttribute('href')).toBe('https://developers.notion.com')
    // No value, no level, no button and no place to type a key.
    expect(document.body.textContent).not.toMatch(/sk_live|Read & write|Project code/)
    expect([screen.queryByRole('textbox'), within(screen.getByRole('region', { name: 'Services' })).queryByRole('button')]).toEqual([null, null])
    cleanup()
  }
})
it('on a preview, names a key only the live app holds as such, with no step to take', async () => {
  preview = true; keys = SHOP.map(item => item.id === 'cloudflare' ? { ...item, liveOnly: true } : item); open()
  const table = await screen.findByRole('table', { name: 'Services' })
  expect([line(table, 'Cloudflare'), line(table, 'Mailchimp')]).toEqual([['Cloudflare', 'Account look-ups', 'Not savedLive app only'],
    ['Mailchimp', 'Email', 'Not savedAsk the assistant for its key link']])
})
it('with no keys yet, says the assistant sends a private link for one', async () => {
  keys = [key('code', 'Project code', { alone: true })]; open()
  await screen.findByText('No keys yet. Ask the assistant to connect a service; it sends you a private link for the key.')
  expect([tabs(), screen.queryByRole('table')]).toEqual([['People 1', 'Roles 0', 'Services 0'], null])
})
it('a teammate gets no Services view, and its address shows only what they can use', async () => {
  side = 'teammate'; open(); await screen.findByRole('region', { name: 'You can use' })
  expect([screen.queryByRole('navigation'), screen.queryByRole('link', { name: /Services/ }), screen.queryByRole('table')]).toEqual([null, null, null])
  // Their own key shows with their level, and nothing about the other keys.
  expect(document.body.textContent).not.toMatch(/Mailchimp|Notion|Saved|key link/)
  expect(fetchMock.mock.calls.map(([url]) => url)).not.toContain('/api/access/status')
})
