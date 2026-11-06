// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { App } from './App'
import type { SavedKey, Status } from '../../lib/access'

// Sealing is the browser's own crypto, tested in lib/seal.test.ts: here it marks the value, so a test sees it stay.
vi.mock('../../lib/seal', () => ({ seal: async (value: string, publicKey: string) => JSON.stringify({ v: 1, wrapped: btoa(publicKey), iv: 'aXY=', data: btoa(`sealed:${value.length}`) }) }))

// A shop's keys: Stripe is saved, Notion's API is saved and used directly, Mailchimp waits to be connected, and the
// Cloudflare look-up key waits for Access setup. Project code is Access's own and never a row here.
const key = (id: string, title: string, changes: Partial<SavedKey> = {}): SavedKey => ({ id, title, levels: ['read', 'write'], saved: true, setup: false, alone: false, parts: ['Key'], ...changes })
const SHOP = [key('stripe', 'Stripe', { purpose: 'Payments and refunds' }), key('notion-api', 'Notion API', { purpose: 'Team notes', direct: true, docs: 'https://developers.notion.com' }),
  key('mailchimp', 'Mailchimp', { purpose: 'Email', saved: false }), key('cloudflare', 'Cloudflare', { purpose: 'Account look-ups', saved: false, setup: true, parts: [] }),
  key('code', 'Project code', { purpose: "This project's own code", alone: true, parts: [] })]
const status = (keys: SavedKey[]): Status => ({ ownerEmail: 'owner@shop.com', viewer: { email: 'owner@shop.com', owner: true }, environment: 'live', key: 'ready', started: true,
  imported: 0, keysStarted: true, unticked: { people: [], roles: [] }, apps: [], roles: [], people: [], work: [], project: 'ready', keys })
const VALUE = 'mc_live_made-up-9f2c'
let side: 'owner' | 'admin' | 'teammate'; let keys: SavedKey[]; let fetchMock: ReturnType<typeof vi.fn>; let preview: boolean
let answer: (url: string, init?: RequestInit) => Response | undefined
beforeEach(() => {
  side = 'owner'; keys = SHOP; preview = false; answer = () => undefined
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const special = answer(url, init)
    if (special) return special
    if (url === '/api/access/keys/seal') return Response.json({ publicKey: 'public-half' })
    if (url.startsWith('/api/access/keys/')) {
      keys = keys.map(item => url.startsWith(`/api/access/keys/${item.id}/`) ? { ...item, waiting: { ends: '9f2c' } } : item)
      return Response.json({ name: 'MAILCHIMP_KEY', ends: '9f2c', waiting: true })
    }
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
const paste = async (title: string, name = 'Paste key') => fireEvent.click(within(within(await screen.findByRole('table', { name: 'Services' })).getByText(title).closest('tr')!).getByRole('button', { name }))
const sends = () => (fetchMock.mock.calls as [string, RequestInit][]).filter(([url]) => url.startsWith('/api/access/keys/'))

it('the owner and an Admin see every key: what each is for, whether it is saved, and a way to paste one, never a value or a level', async () => {
  for (const viewer of ['owner', 'admin'] as const) {
    side = viewer; open(); const table = await screen.findByRole('table', { name: 'Services' })
    // Services is the third view, counting its keys; the project's own code is not one of them.
    expect(tabs(), viewer).toEqual(['People 1', 'Roles 0', 'Services 4']); expect(screen.getByRole('link', { name: 'Services 4' }).getAttribute('aria-current')).toBe('page')
    expect(within(table).getAllByRole('row').slice(1).map(row => row.querySelector('td')!.textContent), viewer).toEqual(['Stripe', 'Notion API', 'Mailchimp', 'Cloudflare'])
    expect(['Stripe', 'Notion API', 'Mailchimp', 'Cloudflare'].map(title => line(table, title)), viewer).toEqual([['Stripe', 'Payments and refunds', 'Saved', 'Replace key'],
      ['Notion API', 'Team notes · API guide', 'Savedalso used directly', 'Replace key'], ['Mailchimp', 'Email', 'Not savedAsk the assistant to connect it, or paste the key', 'Paste key'],
      ['Cloudflare', 'Account look-ups', 'Not savedAsk the assistant to finish Access setup', '']])
    // The quiet lines are muted, each on its own line; a key used directly links its API guide.
    for (const note of ['also used directly', 'Ask the assistant to connect it, or paste the key']) expect(screen.getByText(note).className).toBe('block text-muted-foreground')
    expect(within(table).getByRole('link', { name: 'API guide' }).getAttribute('href')).toBe('https://developers.notion.com')
    // No value, no level, and no place to type a key until a paste box is opened.
    expect(document.body.textContent).not.toMatch(/sk_live|Read & write|Project code/)
    expect(screen.queryByRole('textbox')).toBeNull()
    cleanup()
  }
})
it('on a preview, names a key only the live app holds as such, and offers no paste box', async () => {
  preview = true; keys = SHOP.map(item => item.id === 'cloudflare' ? { ...item, liveOnly: true } : item); open()
  const table = await screen.findByRole('table', { name: 'Services' })
  expect([line(table, 'Cloudflare'), line(table, 'Mailchimp'), line(table, 'Stripe')]).toEqual([['Cloudflare', 'Account look-ups', 'Not savedLive app only', ''],
    ['Mailchimp', 'Email', 'Not savedAsk the assistant to connect it', 'Live app only'], ['Stripe', 'Payments and refunds', 'Saved', 'Live app only']])
  expect(within(table).queryByRole('button')).toBeNull()
})
it('names a tool added in a chat and what it counts as a look-up, with no value', async () => {
  keys = [key('notion', 'Notion', { purpose: 'Read our team wiki', direct: true, docs: 'https://developers.notion.com', levels: ['read'], liveOnly: true, chat: true, reads: ['POST search'] }),
    key('figma', 'Figma', { purpose: 'Design files', direct: true, docs: 'https://www.figma.com/developers/api', levels: ['read'], liveOnly: true, chat: true, parts: undefined })]; open()
  const table = await screen.findByRole('table', { name: 'Services' })
  expect(line(table, 'Notion')).toEqual(['Notion', 'Read our team wiki · API guide', 'Savedalso used directlyAdded in a chat · reads: GET anything, POST search', 'Replace key'])
  // A tool with no look-ups beyond GET says so; an older status names no parts, so no paste box.
  expect(line(table, 'Figma').slice(2)).toEqual(['Savedalso used directlyAdded in a chat · reads: GET anything', ''])
  expect(document.body.textContent).not.toMatch(/sk_live/)
})
it('pastes a key: sealed on the page, sent to its place, then shown as waiting for the next publish with its last four', async () => {
  open(); await paste('Mailchimp')
  const dialog = await screen.findByRole('alertdialog', { name: 'Paste the Mailchimp key' })
  expect(within(dialog).getByText(/only the next publish can open it/)).toBeTruthy()
  // Nothing pasted: the popup says so and sends nothing.
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save key' }))
  expect(within(dialog).getByRole('alert').textContent).toBe('Paste the key first.')
  const box = within(dialog).getByLabelText('Mailchimp key') as HTMLInputElement
  expect([box.type, box.autocomplete]).toEqual(['password', 'off'])
  fireEvent.change(box, { target: { value: `  ${VALUE} ` } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save key' }))
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  const [[lock], [address, init]] = sends()
  expect([lock, address, init.method, (init.headers as Record<string, string>).Origin]).toEqual(['/api/access/keys/seal', '/api/access/keys/mailchimp/0', 'PUT', window.location.origin])
  expect(JSON.parse(String(init.body))).toEqual({ sealed: { v: 1, wrapped: btoa('public-half'), iv: 'aXY=', data: btoa(`sealed:${VALUE.length}`) }, ends: '9f2c' })
  for (const [, sent] of fetchMock.mock.calls as [string, RequestInit | undefined][]) expect(String(sent?.body ?? '')).not.toContain('made-up')
  // The list is read again, and the row says the key waits.
  await waitFor(() => expect(line(screen.getByRole('table', { name: 'Services' }), 'Mailchimp')).toEqual(['Mailchimp', 'Email', 'Waiting for the next publish, ends in …9f2c', 'Replace key']))
  expect(document.body.textContent).not.toContain('made-up')
})
it('asks for each part of a key that has an ID and a secret, and sends each to its own place', async () => {
  keys = [key('shopify', 'Shopify', { purpose: 'Store orders', saved: false, chat: true, liveOnly: true, parts: ['Secret', 'ID'] })]; open()
  await paste('Shopify')
  const dialog = await screen.findByRole('alertdialog', { name: 'Paste the Shopify key' })
  fireEvent.change(within(dialog).getByLabelText('Secret'), { target: { value: 'shpss_made-up-1234' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save key' }))
  expect(within(dialog).getByRole('alert').textContent).toBe('Paste the key first.')
  fireEvent.change(within(dialog).getByLabelText('ID'), { target: { value: 'client-made-up-5678' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save key' }))
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  expect(sends().slice(1).map(([address, init]) => [address, JSON.parse(String(init.body)).ends])).toEqual([['/api/access/keys/shopify/0', '1234'], ['/api/access/keys/shopify/1', '5678']])
})
it('keeps a refusal in the popup, in words, and Cancel clears what was pasted', async () => {
  open(); await paste('Mailchimp')
  let dialog = await screen.findByRole('alertdialog')
  const type = () => fireEvent.change(within(dialog).getByLabelText('Mailchimp key'), { target: { value: VALUE } })
  const refusals: [(url: string) => Response | undefined, string][] = [
    [url => url.endsWith('/seal') ? Response.json({ error: { code: 'no_seal' } }, { status: 409 }) : undefined, 'This app has no lock for keys yet. Ask the assistant to make the pair of locks.'],
    [url => url.endsWith('/0') ? Response.json({ error: { code: 'live_only' } }, { status: 409 }) : undefined, 'Only the live app takes a key.'],
    [url => url.endsWith('/0') ? new Response('Bad gateway', { status: 502 }) : undefined, 'The key was not sent. Try again.']]
  for (const [refuse, words] of refusals) {
    answer = refuse; type()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save key' }))
    await waitFor(() => expect(within(dialog).getByRole('alert').textContent).toBe(words))
    expect(screen.getByRole('alertdialog')).toBe(dialog)
  }
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  await paste('Mailchimp'); dialog = await screen.findByRole('alertdialog')
  expect([(within(dialog).getByLabelText('Mailchimp key') as HTMLInputElement).value, within(dialog).queryByRole('alert')]).toEqual(['', null])
  // A saved key's box replaces it.
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  await paste('Stripe', 'Replace key')
  expect(await screen.findByRole('alertdialog', { name: 'Replace the Stripe key' })).toBeTruthy()
})
it('with no keys yet, says to ask the assistant to connect a service', async () => {
  keys = [key('code', 'Project code', { alone: true })]; open()
  await screen.findByText('No keys yet. Ask the assistant to connect a service.')
  expect([tabs(), screen.queryByRole('table')]).toEqual([['People 1', 'Roles 0', 'Services 0'], null])
})
it('a teammate gets no Services view, and its address shows only what they can use', async () => {
  side = 'teammate'; open(); await screen.findByRole('region', { name: 'You can use' })
  expect([screen.queryByRole('navigation'), screen.queryByRole('link', { name: /Services/ }), screen.queryByRole('table')]).toEqual([null, null, null])
  // Their own key shows with their level, and nothing about the other keys.
  expect(document.body.textContent).not.toMatch(/Mailchimp|Notion|Saved|Paste key/)
  expect(fetchMock.mock.calls.map(([url]) => url)).not.toContain('/api/access/status')
})
