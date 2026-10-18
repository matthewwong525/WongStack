// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { App } from './App'
import { browser, type Server, type Servers } from './mcp'
import type { SavedKey, Status } from '../../lib/access'

// A shop's MCPs: the viewer is connected to Canva, Kim shares Linear for look-ups, nobody has connected Notion, and
// the viewer's Figma sign-in ended. The owner may remove each; Lee, a teammate, only Notion, which Lee added.
const mcp = (id: string, name: string, changes: Partial<Server> = {}): Server => ({ id, name, url: `https://mcp.${id}.com/mcp`, purpose: `${name} work`, tools: 4,
  toolsAt: '2026-10-18T12:00:00Z', connected: 0, shared: null, own: null, addedBy: 'kim@shop.com', removable: false, connect: `https://shop.example/apps/access/services/${id}`, ...changes })
const mine = (changes: Partial<NonNullable<Server['own']>> = {}): Server['own'] => ({ state: 'connected', account: 'me@canva.com', at: '2026-10-18T12:00:00Z', share: 'none', ...changes })
const KIM = { who: 'kim@shop.com', share: 'read' as const }
const shop = (owner: boolean): Server[] => [
  mcp('canva', 'Canva', { connected: 3, own: mine(), removable: owner }),
  mcp('linear', 'Linear', { connected: 1, shared: KIM, removable: owner }),
  mcp('notion', 'Notion', { addedBy: 'lee@shop.com', removable: true }),
  mcp('figma', 'Figma', { connected: 1, own: mine({ state: 'reconnect', account: null }), removable: owner }),
]
const key = (id: string, title: string, changes: Partial<SavedKey> = {}): SavedKey => ({ id, title, levels: ['read', 'write'], saved: true, setup: false, alone: false, ...changes })
const status = (): Status => ({ ownerEmail: 'owner@shop.com', viewer: { email: 'owner@shop.com', owner: true }, environment: 'live', key: 'ready', started: true, imported: 0,
  keysStarted: true, unticked: { people: [], roles: [] }, apps: [], roles: [], people: [], work: [], project: 'ready',
  keys: [key('stripe', 'Stripe', { purpose: 'Payments and refunds' }), key('notion-api', 'Notion API', { purpose: 'Team notes', direct: true, docs: 'https://developers.notion.com' }),
    key('mailchimp', 'Mailchimp', { purpose: 'Email', saved: false }), key('cloudflare', 'Cloudflare', { purpose: 'Account look-ups', saved: false, setup: true }),
    key('code', 'Project code', { alone: true })] })
let side: 'owner' | 'teammate'; let roster: Status; let list: Servers; let replies: Map<string, () => Response>; let fetchMock: ReturnType<typeof vi.fn>
const lists = (owner: boolean): Servers => ({ sealed: true, manages: owner, me: owner ? 'owner@shop.com' : 'lee@shop.com', servers: shop(owner) })
const asTeammate = () => { side = 'teammate'; list = lists(false) }
// What the server answers: a row, or a refusal in plain words.
const answer = (server: Server) => () => Response.json({ server })
const refuse = (status: number, message: string) => () => Response.json({ error: { code: 'refused', message, requestId: 'r1' } }, { status })
beforeEach(() => {
  side = 'owner'; roster = status(); list = lists(true); replies = new Map()
  fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const reply = replies.get(`${init?.method ?? 'GET'} ${url}`)
    if (reply) return reply()
    if (url === '/api/access/apps') return Response.json(side === 'owner' ? { state: 'current', role: 'owner', manages: true, apps: ['access'], revision: 1 }
      : { state: 'current', role: 'employee', apps: ['access'], revision: 1, keys: [] })
    // A value or a token the server never sends: were one sent, the screen would still not show it.
    if (url === '/api/access/status') return Response.json({ ...roster, keys: roster.keys.map(item => ({ ...item, value: 'sk_live_9f8e' })) })
    return Response.json({ ...list, servers: list.servers.map(server => ({ ...server, token: 'tok_live_77' })) })
  })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
const Where = () => { const { pathname, search } = useLocation(); return <span data-testid="where">{pathname + search}</span> }
const open = (path = 'services') => render(<MemoryRouter initialEntries={[`/apps/access/${path}`]}><Where /><Routes><Route path="/apps/:name/*" element={<App />} /></Routes></MemoryRouter>)
const where = () => screen.getByTestId('where').textContent
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const tabs = () => within(screen.getByRole('navigation', { name: 'Access views' })).getAllByRole('link').map(link => link.textContent)
const moment = () => act(async () => { await new Promise(resolve => setTimeout(resolve)) })
// One MCP's row, by its name; the viewer's state in it; the one button it offers; and what its menu holds.
const mcps = () => screen.findByRole('table', { name: 'MCPs' })
const row = (name: string) => screen.getByRole('table', { name: 'MCPs' }).querySelector(`span[title="${name}"]`)!.closest('tr')!
const cells = (name: string) => Array.from(row(name).querySelectorAll('td')).slice(0, 3).map(cell => cell.textContent)
const state = (name: string) => row(name).querySelectorAll('td')[3].querySelector('span')!.textContent
const offered = (name: string) => row(name).querySelector('[data-connect]')?.getAttribute('aria-label') ?? null
const menu = (name: string) => { fireEvent.keyDown(screen.getByLabelText(`Actions for ${name}`), { key: 'Enter' }); return within(screen.getByRole('menu')) }
const items = (name: string) => {
  if (!within(row(name)).queryByLabelText(`Actions for ${name}`)) return []
  const held = menu(name).getAllByRole('menuitem').map(item => item.textContent); fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' }); return held
}
const pick = (name: string, item: string) => fireEvent.click(menu(name).getByRole('menuitem', { name: item }))
const box = (name: string) => within(row(name)).getByRole('checkbox', { name: 'Let the team use my sign-in' }) as HTMLInputElement
const sent = (path: string) => fetchMock.mock.calls.filter(([url, init]) => url === `/api/mcp/${path}` && init?.method).map(([, init]) => [init.method, JSON.parse(init.body)])
const reads = () => fetchMock.mock.calls.filter(([url, init]) => url === '/api/mcp/servers' && !init?.method).length
const said = async (text: string) => (await screen.findByText(text)).closest('[data-slot="alert"]')!.getAttribute('role')
const leaving = () => vi.spyOn(browser, 'go').mockImplementation(() => {})

it('the owner sees every saved key above the MCPs: what each is for and whether it is saved, never a value or a sign-in', async () => {
  open(); const keys = await screen.findByRole('table', { name: 'Keys' }); await mcps()
  // Services is the third view, counting its keys and MCPs; the project's own code is Access's, not a row here.
  expect(tabs()).toEqual(['People 1', 'Roles 0', 'Services 8']); expect(screen.getByRole('link', { name: 'Services 8' }).getAttribute('aria-current')).toBe('page')
  const line = (title: string) => Array.from(within(keys).getByText(title).closest('tr')!.querySelectorAll('td')).map(cell => cell.textContent)
  expect(within(keys).getAllByRole('row').slice(1).map(item => item.querySelector('td')!.textContent)).toEqual(['Stripe', 'Notion API', 'Mailchimp', 'Cloudflare'])
  expect([line('Stripe'), line('Notion API'), line('Mailchimp'), line('Cloudflare')]).toEqual([['Stripe', 'Payments and refunds', 'Saved'],
    ['Notion API', 'Team notes · API guide', 'Savedalso used directly'], ['Mailchimp', 'Email', 'Not savedAsk the assistant for its key link'],
    ['Cloudflare', 'Account look-ups', 'Not savedAsk the assistant to finish Access setup']])
  // The quiet lines are muted, each on its own line; a key used directly links its API guide.
  for (const note of ['also used directly', 'Ask the assistant for its key link']) expect(screen.getByText(note).className).toBe('block text-muted-foreground')
  expect(within(keys).getByRole('link', { name: 'API guide' }).getAttribute('href')).toBe('https://developers.notion.com')
  // Each MCP: who is connected and shares, then the owner's own state and its one button.
  expect(['Canva', 'Linear', 'Notion', 'Figma'].map(name => [...cells(name), state(name), offered(name)])).toEqual([
    ['Canva', 'https://mcp.canva.com/mcp', '3 connected', 'Connected as me@canva.com · Oct 18', null],
    ['Linear', 'https://mcp.linear.com/mcp', '1 connected · shared by kim@shop.com, look-ups only', "Using kim@shop.com's sign-in, look-ups only", 'Connect mine Linear'],
    ['Notion', 'https://mcp.notion.com/mcp', '0 connected', 'Not connected', 'Connect Notion'],
    ['Figma', 'https://mcp.figma.com/mcp', '1 connected', 'Needs a new sign-in', 'Connect again Figma']])
  // The address gives way and keeps its whole in its title. The rest sits behind each row's menu: the owner may stop
  // another person's share and remove any MCP.
  expect([row('Canva').querySelectorAll('td')[1].getAttribute('title'), row('Canva').querySelectorAll('td')[1].className]).toEqual(['https://mcp.canva.com/mcp', expect.stringContaining('truncate')])
  expect(['Canva', 'Linear', 'Notion', 'Figma'].map(items)).toEqual([['Disconnect', 'Refresh', 'Remove'], ['Stop sharing', 'Remove'], ['Remove'], ['Disconnect', 'Remove']])
  // The share box sits under the owner's own live sign-in alone, off until ticked, with no choice until then.
  expect([box('Canva').checked, within(row('Linear')).queryByRole('checkbox'), within(row('Figma')).queryByRole('checkbox'), screen.queryByRole('radio')]).toEqual([false, null, null, null])
  // No value, no sign-in and no place to type a key.
  expect(document.body.textContent).not.toMatch(/sk_live|tok_live/); expect(screen.queryByRole('textbox')).toBeNull()
  expect(sent('servers')).toEqual([])
})
it('a teammate reaches Services beside their own view, sees every MCP with their own state and Add, but no keys, no Stop sharing and no Remove on others', async () => {
  asTeammate(); list.servers[0].own = mine({ account: null })
  open(''); await screen.findByRole('region', { name: 'You can use' }); await screen.findByRole('link', { name: 'Services 4' })
  expect([tabs(), screen.queryByRole('button', { name: 'Add MCP' })]).toEqual([['Your access ', 'Services 4'], null])
  fireEvent.click(screen.getByRole('link', { name: 'Services 4' })); await mcps()
  expect([where(), tabs(), screen.queryByRole('table', { name: 'Keys' }), screen.queryByRole('region', { name: 'You can use' })]).toEqual(['/apps/access/services', ['Your access ', 'Services 4'], null, null])
  // Add ends the views' line, as on every view.
  expect(screen.getByRole('navigation', { name: 'Access views' }).parentElement!.lastElementChild!.textContent).toBe('+ Add MCP')
  expect(['Canva', 'Linear', 'Notion', 'Figma'].map(name => [state(name), offered(name), items(name)])).toEqual([
    ['Connected · Oct 18', null, ['Disconnect', 'Refresh']],
    ["Using kim@shop.com's sign-in, look-ups only", 'Connect mine Linear', []],
    ['Not connected', 'Connect Notion', ['Remove']],
    ['Needs a new sign-in', 'Connect again Figma', ['Disconnect']]])
  expect(screen.queryByText(/Stop sharing/)).toBeNull(); expect(document.body.textContent).not.toMatch(/tok_live/)
  // Their own view is a link away, with Add gone from the line.
  fireEvent.click(screen.getByRole('link', { name: 'Your access' })); await screen.findByRole('region', { name: 'You can use' })
  expect([where(), screen.queryByRole('button', { name: 'Add MCP' })]).toEqual(['/apps/access/', null])
})
it('the share box saves on each change, starts at look-ups only, and says whose share is in use', async () => {
  asTeammate(); open(); await mcps()
  const canva = list.servers[0]
  replies.set('POST /api/mcp/servers/canva/share', answer({ ...canva, own: mine({ share: 'read' }), shared: { who: 'lee@shop.com', share: 'read' } }))
  fireEvent.click(box('Canva')); expect(await said('Saved.')).toBe('status')
  expect(sent('servers/canva/share')).toEqual([['POST', { share: 'read' }]])
  const radios = () => within(within(row('Canva')).getByRole('radiogroup', { name: 'What the team can do' })).getAllByRole('radio') as HTMLInputElement[]
  expect([box('Canva').checked, radios().map(radio => [radio.parentElement!.textContent, radio.checked]), cells('Canva')[2]])
    .toEqual([true, [['Look-ups only', true], ['Everything', false]], '3 connected · shared by you, look-ups only'])
  replies.set('POST /api/mcp/servers/canva/share', answer({ ...canva, own: mine({ share: 'all' }), shared: { who: 'lee@shop.com', share: 'all' } }))
  fireEvent.click(radios()[1]); await waitFor(() => expect(radios()[1].checked).toBe(true))
  expect(cells('Canva')[2]).toBe('3 connected · shared by you, everything')
  replies.set('POST /api/mcp/servers/canva/share', answer(canva))
  fireEvent.click(box('Canva')); await waitFor(() => expect(box('Canva').checked).toBe(false))
  expect([sent('servers/canva/share').map(([, body]) => body), screen.queryByRole('radio')]).toEqual([[{ share: 'read' }, { share: 'all' }, { share: 'none' }], null])
})
it('the share box is off while another person shares, and a share refused or unfinished says so and reads the list again', async () => {
  asTeammate(); list.servers[0].shared = { who: 'kim@shop.com', share: 'all' }; open(); await mcps()
  expect([box('Canva').disabled, within(row('Canva')).getByText('kim@shop.com is sharing theirs.').className, cells('Canva')[2]])
    .toEqual([true, 'text-muted-foreground', '3 connected · shared by kim@shop.com, everything'])
  // Kim stops; the list says so on its next read, and Kim's own share in between is refused in plain words.
  list.servers[0].shared = null; cleanup(); open(); await mcps(); const before = reads()
  replies.set('POST /api/mcp/servers/canva/share', refuse(409, 'kim@shop.com already shares Canva.'))
  fireEvent.click(box('Canva')); expect(await said('kim@shop.com already shares Canva.')).toBe('alert')
  await waitFor(() => expect(reads()).toBe(before + 1)); expect(box('Canva').checked).toBe(false)
  // An answer that is not the server's own words did not finish.
  replies.set('POST /api/mcp/servers/canva/share', () => new Response('Bad gateway', { status: 502 }))
  fireEvent.click(box('Canva')); expect(await said('That did not finish. Check the list below before trying again.')).toBe('alert')
})
it('a link to one MCP brings its row into view with its Connect focused, and starts Connect when it asks', async () => {
  const scrolled = vi.spyOn(Element.prototype, 'scrollIntoView')
  open('services/linear'); await mcps(); await moment()
  const button = screen.getByRole('button', { name: 'Connect mine Linear' })
  expect([document.activeElement, scrolled.mock.contexts, row('Linear').getAttribute('aria-current'), where()])
    .toEqual([button, [row('Linear').querySelectorAll('td')[3]], 'true', '/apps/access/services/linear'])
  // A row with nothing to connect comes into view alone; an MCP that is gone opens the list.
  cleanup(); scrolled.mockClear(); open('services/canva'); await mcps(); await moment()
  expect([scrolled.mock.contexts, document.activeElement]).toEqual([[row('Canva').querySelectorAll('td')[3]], document.body])
  cleanup(); scrolled.mockClear(); open('services/gone?connect=1'); await mcps(); await moment()
  expect([scrolled.mock.calls, where(), document.querySelector('tr[aria-current]'), sent('servers/gone/connect')]).toEqual([[], '/apps/access/services/gone', null, []])
  // With ?connect=1 it presses Connect at once, and the address drops it, so Back from the sign-in page asks nothing.
  cleanup(); const go = leaving(); replies.set('POST /api/mcp/servers/notion/connect', () => Response.json({ authorize: 'https://notion.example/authorize?state=s1' }))
  open('services/notion?connect=1'); await waitFor(() => expect(go).toHaveBeenCalledWith('https://notion.example/authorize?state=s1'))
  expect([sent('servers/notion/connect'), await said("Opening Notion's sign-in…"), where()]).toEqual([[['POST', {}]], 'status', '/apps/access/services'])
})
it('says what came back from a sign-in in the notice spot, for the owner and a teammate', async () => {
  const back = [['connected=1', 'Connected to Notion.', 'status'], ['failed=expired', 'The sign-in to Notion took too long. Press Connect to try again.', 'alert'],
    ['failed=wrong_person', 'That sign-in began as someone else. Press Connect to sign in as yourself.', 'alert'],
    ['failed=refused', 'Notion did not let the app in. Press Connect to try again.', 'alert'],
    ['failed=other', 'Signing in to Notion did not finish. Press Connect to try again.', 'alert']]
  for (const viewer of ['owner', 'teammate']) {
    if (viewer === 'teammate') asTeammate()
    for (const [query, text, role] of back) {
      open(`services/notion?${query}`); expect(await said(text), `${viewer} ${query}`).toBe(role)
      // The notice sits under the views, above the lists; the address keeps the row and drops the question.
      const notice = screen.getByText(text).closest('[data-slot="alert"]')!
      expect([!!(screen.getByRole('navigation', { name: 'Access views' }).compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING), where()]).toEqual([true, '/apps/access/services/notion'])
      expect(sent('servers/notion/connect')).toEqual([]); cleanup()
    }
  }
  // Back from a sign-in for an MCP removed meanwhile: nothing to say.
  open('services/gone?connected=1'); await mcps(); await moment(); expect([where(), document.querySelector('[data-slot="alert"]')]).toEqual(['/apps/access/services/gone', null])
})
it('Connect sends the browser to the service, and a refusal stays on the page in plain words', async () => {
  const go = leaving(); open(); await mcps()
  replies.set('POST /api/mcp/servers/figma/connect', () => Response.json({ authorize: 'https://figma.example/oauth?state=s2' }))
  click('Connect again Figma'); await waitFor(() => expect(go).toHaveBeenCalledWith('https://figma.example/oauth?state=s2'))
  replies.set('POST /api/mcp/servers/notion/connect', refuse(503, 'Connecting MCPs needs one more step from the owner: ask the assistant to run the update.'))
  click('Connect Notion'); expect(await said('Connecting MCPs needs one more step from the owner: ask the assistant to run the update.')).toBe('alert')
  expect(go).toHaveBeenCalledTimes(1)
})
it('goes to the page Connect names', () => {
  browser.go('#signed-in'); expect(window.location.hash).toBe('#signed-in')
})
it('adds an MCP by its address: a refusal shows under the fields and keeps what was typed, and the new row opens with Connect focused', async () => {
  open(); await mcps(); const add = screen.getByRole('button', { name: 'Add MCP' })
  fireEvent.click(add); const dialog = within(await screen.findByRole('dialog', { name: 'Add an MCP' }))
  const address = dialog.getByLabelText('Address') as HTMLInputElement; const name = dialog.getByLabelText('Name') as HTMLInputElement
  expect([address.type, address.required, name.required]).toEqual(['url', true, false])
  fireEvent.change(address, { target: { value: 'https://mcp.miro.com/mcp' } }); fireEvent.change(name, { target: { value: ' Miro ' } })
  replies.set('POST /api/mcp/servers', refuse(422, 'That address has no sign-in we can use.'))
  fireEvent.click(dialog.getByRole('button', { name: 'Add' }))
  const alert = await dialog.findByRole('alert'); expect(alert.textContent).toBe('! That address has no sign-in we can use.')
  expect([address.value, name.value, sent('servers')]).toEqual(['https://mcp.miro.com/mcp', ' Miro ', [['POST', { url: 'https://mcp.miro.com/mcp', name: 'Miro' }]]])
  // The fields come after the title, the refusal after the fields.
  expect(!!(name.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
  replies.set('POST /api/mcp/servers', () => new Response('Bad gateway', { status: 502 }))
  fireEvent.click(dialog.getByRole('button', { name: 'Add' })); await dialog.findByText('That did not finish. Check the list below before trying again.')
  // A blank name is left for the server to choose.
  fireEvent.change(name, { target: { value: ' ' } })
  replies.set('POST /api/mcp/servers', () => Response.json({ server: mcp('miro', 'Miro') }, { status: 201 }))
  fireEvent.click(dialog.getByRole('button', { name: 'Add' })); expect(await said('Added Miro. Press Connect to sign in.')).toBe('status')
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()); await moment()
  expect([sent('servers')[2], cells('Miro')[0], where(), document.activeElement]).toEqual([['POST', { url: 'https://mcp.miro.com/mcp' }], 'Miro', '/apps/access/services/miro',
    screen.getByRole('button', { name: 'Connect Miro' })])
  // Cancel saves nothing and hands the keyboard back to Add.
  fireEvent.click(add); fireEvent.click(within(await screen.findByRole('dialog', { name: 'Add an MCP' })).getByRole('button', { name: 'Cancel' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull()); await moment()
  expect([document.activeElement, sent('servers').length]).toEqual([add, 3])
})
it('with no MCPs yet, says the assistant can connect one or it can be added here, and the owner with no keys sees no Keys', async () => {
  list.servers = []; roster.keys = [key('code', 'Project code')]
  open(); await screen.findByText('No MCPs yet. Ask the assistant to connect one, or add it by its address.')
  expect([tabs(), screen.queryByRole('table'), screen.getAllByRole('button', { name: 'Add MCP' })]).toEqual([['People 1', 'Roles 0', 'Services 0'], null, expect.objectContaining({ length: 2 })])
  fireEvent.click(screen.getAllByRole('button', { name: 'Add MCP' })[1]); const dialog = within(await screen.findByRole('dialog', { name: 'Add an MCP' }))
  fireEvent.change(dialog.getByLabelText('Address'), { target: { value: 'https://mcp.canva.com/mcp' } })
  replies.set('POST /api/mcp/servers', answer(mcp('canva', 'Canva')))
  fireEvent.click(dialog.getByRole('button', { name: 'Add' })); await mcps()
  expect([cells('Canva')[0], screen.queryByText(/No MCPs yet/), tabs()[2]]).toEqual(['Canva', null, 'Services 1'])
})
it('says connecting needs one more step from the owner while the app cannot keep sign-ins yet', async () => {
  list.sealed = false; open(); await mcps()
  expect(screen.getByText('Connecting MCPs needs one more step: the owner asks the assistant to run the update.').tagName).toBe('P')
})
it('says it is loading, and that Services are unavailable with Retry when the MCPs cannot be read', async () => {
  asTeammate(); replies.set('GET /api/mcp/servers', refuse(503, 'Unavailable'))
  open(); expect(await screen.findByText('Loading services…')).toBeTruthy(); expect((await screen.findByRole('alert')).textContent).toBe('Services are unavailable.')
  expect([tabs(), screen.queryByRole('button', { name: 'Add MCP' })]).toEqual([['Your access ', 'Services '], null])
  replies.delete('GET /api/mcp/servers'); click('Retry'); expect(screen.getByText('Loading services…')).toBeTruthy(); await mcps()
  expect(tabs()[1]).toBe('Services 4')
})
it('removes an MCP only after a question that says everyone loses their sign-in, and says why when it may not', async () => {
  open(); await mcps()
  pick('Notion', 'Remove'); const ask = within(screen.getByRole('alertdialog', { name: 'Remove Notion?' }))
  expect(ask.getByText(/Everyone's sign-in to Notion is deleted/).textContent).toBe("Everyone's sign-in to Notion is deleted, and their chats can no longer use it. This can't be undone.")
  fireEvent.click(ask.getByRole('button', { name: 'Cancel' })); await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull()); expect(sent('servers/notion')).toEqual([])
  replies.set('DELETE /api/mcp/servers/notion', () => Response.json({ removed: true }))
  pick('Notion', 'Remove'); fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remove' }))
  expect(await said('Removed Notion.')).toBe('status'); expect([screen.queryByText('https://mcp.notion.com/mcp'), screen.queryByRole('alertdialog'), sent('servers/notion')]).toEqual([null, null, [['DELETE', {}]]])
  replies.set('DELETE /api/mcp/servers/canva', refuse(403, 'Others are connected to Canva: ask the owner or an Admin to remove it.'))
  pick('Canva', 'Remove'); fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remove' }))
  expect(await said('Others are connected to Canva: ask the owner or an Admin to remove it.')).toBe('alert'); expect(cells('Canva')[0]).toBe('Canva')
})
it('disconnects and refreshes the viewer\'s own sign-in, and the owner stops another person\'s share', async () => {
  open(); await mcps()
  replies.set('POST /api/mcp/servers/canva/refresh', answer({ ...list.servers[0], tools: 9 }))
  pick('Canva', 'Refresh'); expect(await said("Canva's tool list is up to date.")).toBe('status')
  replies.set('POST /api/mcp/servers/canva/disconnect', answer({ ...list.servers[0], connected: 2, own: null }))
  pick('Canva', 'Disconnect'); expect(await said('Disconnected from Canva.')).toBe('status')
  expect([cells('Canva')[2], state('Canva'), offered('Canva'), items('Canva')]).toEqual(['2 connected', 'Not connected', 'Connect Canva', ['Remove']])
  replies.set('POST /api/mcp/servers/linear/share', answer({ ...list.servers[1], shared: null }))
  pick('Linear', 'Stop sharing'); expect(await said('kim@shop.com no longer shares Linear.')).toBe('status')
  expect([sent('servers/canva/refresh'), sent('servers/canva/disconnect'), sent('servers/linear/share'), cells('Linear')[2], offered('Linear')])
    .toEqual([[['POST', {}]], [['POST', {}]], [['POST', { share: 'none', email: 'kim@shop.com' }]], '1 connected', 'Connect Linear'])
})
