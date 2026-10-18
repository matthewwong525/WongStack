import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import type { SavedKey } from '../../lib/access'
import { AddMcp } from './AddMcp'
import { at, type ViewProps } from './address'
import { Confirm } from './Confirm'
import { Tick } from './Fields'
import { dots } from './levels'
import { answerSchema, browser, keyRows, Refusal, sendMcp, UNFINISHED, type McpRead, type Server, type Servers, type Share } from './mcp'
import { RowMenu } from './RowMenu'
import { Cell, Name, Row, Table } from './Table'
import { View } from './View'

const COLUMNS = ['MCP', 'Address', 'People', 'You']
const SHARED = { read: 'look-ups only', all: 'everything' }
const CHOICES = { read: 'Look-ups only', all: 'Everything' }
// An address gives way as a name does: a share of the row on a computer, cut with "…", whole in its title.
const ADDRESS = 'w-[30%] max-w-0 truncate text-muted-foreground @max-[44rem]:w-auto @max-[44rem]:max-w-none'

type Change = (server: Server, step: string, done: string, body?: object) => Promise<void>

/** What came back from a service's own sign-in page, said in the notice spot. */
function arrival(search: URLSearchParams, name: string) {
  const code = search.get('failed')
  if (search.has('connected')) return { text: `Connected to ${name}.`, failed: false }
  if (code === null) return undefined
  const known: Record<string, string> = {
    expired: `The sign-in to ${name} took too long. Press Connect to try again.`,
    wrong_person: `That sign-in began as someone else. Press Connect to sign in as yourself.`,
    refused: `${name} did not let the app in. Press Connect to try again.`,
  }
  return { text: known[code] ?? `Signing in to ${name} did not finish. Press Connect to try again.`, failed: true }
}

/** The one button a row offers the viewer, when their own sign-in is not live: a share in use makes it Connect mine. */
const primary = (server: Server) =>
  server.own?.state === 'connected' ? null : server.own ? 'Connect again' : server.shared ? 'Connect mine' : 'Connect'

/** The viewer's own state on one MCP, in words: never a colour alone. */
function ownLine({ own, shared }: Server) {
  const day = (iso: string) => new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' })
  if (own?.state === 'connected') return dots(own.account ? `Connected as ${own.account}` : 'Connected', day(own.at))
  if (own) return 'Needs a new sign-in'
  return shared ? `Using ${shared.who}'s sign-in, ${SHARED[shared.share]}` : 'Not connected'
}

/** Under the viewer's own live sign-in: let the team use it, look-ups only unless they pick everything. One person
 *  shares at a time, so another's share turns the box off. */
function ShareBox({ server, other, pending, onShare }: { server: Server; other: Server['shared']; pending: boolean; onShare: (share: Share) => void }) {
  const share = server.own!.share
  return <div className="grid gap-1.5 whitespace-normal">
    <Tick checked={share !== 'none'} disabled={pending || !!other} onChange={on => onShare(on ? 'read' : 'none')}>Let the team use my sign-in</Tick>
    {other && <p className="text-muted-foreground">{other.who} is sharing theirs.</p>}
    {share !== 'none' && <div role="radiogroup" aria-label="What the team can do" className="flex flex-wrap gap-x-4 gap-y-1 ps-6">{(['read', 'all'] as const).map(choice =>
      <Label key={choice} className="font-normal"><input type="radio" className="size-4 accent-primary" name={`share-${server.id}`} checked={share === choice}
        disabled={pending} onChange={() => onShare(choice)} />{CHOICES[choice]}</Label>)}</div>}
  </div>
}

/** One MCP on one line: who is connected and shares, the viewer's own state and its one button, the rest behind `⋯`. */
function McpRow({ server, data, current, pending, connect, change, remove }: {
  server: Server; data: Servers; current: boolean; pending: boolean; connect: (server: Server) => void; change: Change; remove: (server: Server) => void
}) {
  const { me, manages } = data
  const label = primary(server)
  const live = server.own?.state === 'connected'
  const other = server.shared?.who === me ? null : server.shared
  const quiet = [
    server.own && <DropdownMenuItem key="disconnect" disabled={pending} onSelect={() => void change(server, 'disconnect', `Disconnected from ${server.name}.`)}>Disconnect</DropdownMenuItem>,
    live && <DropdownMenuItem key="refresh" disabled={pending} onSelect={() => void change(server, 'refresh', `${server.name}'s tool list is up to date.`)}>Refresh</DropdownMenuItem>,
    manages && other && <DropdownMenuItem key="stop" disabled={pending}
      onSelect={() => void change(server, 'share', `${other.who} no longer shares ${server.name}.`, { share: 'none', email: other.who })}>Stop sharing</DropdownMenuItem>,
    server.removable && <DropdownMenuItem key="remove" disabled={pending} onSelect={() => remove(server)}>Remove</DropdownMenuItem>,
  ].filter(Boolean)
  const shared = server.shared && `shared by ${server.shared.who === me ? 'you' : server.shared.who}, ${SHARED[server.shared.share]}`
  return <Row current={current}>
    <Name title={server.name} />
    <Cell label="Address" title={server.url} className={ADDRESS}>{server.url}</Cell>
    <Cell>{dots(`${server.connected} connected`, shared)}</Cell>
    <Cell id={`mcp-${server.id}`} label="You"><div className="grid justify-items-start gap-2">
      <span>{ownLine(server)}</span>
      {label && <Button type="button" size="sm" data-connect="" aria-label={`${label} ${server.name}`} disabled={pending} onClick={() => connect(server)}>{label}</Button>}
      {live && <ShareBox server={server} other={other} pending={pending} onShare={share => void change(server, 'share', 'Saved.', { share })} />}
    </div></Cell>
    <Cell actions>{quiet.length > 0 && <RowMenu label={`Actions for ${server.name}`}>{quiet}</RowMenu>}</Cell>
  </Row>
}

/** The owner's and an Admin's saved keys: what each is for and whether it is saved, never its value. */
function KeyList({ keys }: { keys: SavedKey[] }) {
  const notes = (key: SavedKey) => [key.direct && 'also used directly',
    !key.saved && (key.setup ? 'Ask the assistant to finish Access setup' : 'Ask the assistant for its key link')].filter(note => typeof note === 'string')
  return <section aria-labelledby="services-keys" className="grid min-w-0 gap-2">
    <h2 id="services-keys">Keys</h2>
    <Table labelledBy="services-keys" columns={['Key', 'For', 'State']}>{keys.map(key => <Row key={key.id}>
      <Name title={key.title} />
      <Cell>{key.purpose}{key.docs && <> · <a href={key.docs} target="_blank" rel="noreferrer">API guide</a></>}</Cell>
      <Cell>{key.saved ? 'Saved' : 'Not saved'}{notes(key).map(note => <span key={note} className="block text-muted-foreground">{note}</span>)}</Cell>
    </Row>)}</Table>
  </section>
}

function List({ data, id, keys, mcp, add }: { data: Servers; id: string; keys?: SavedKey[]; mcp: McpRead; add: ReactNode }) {
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const [pending, setPending] = useState(false)
  const [removing, setRemoving] = useState<Server | null>(null)
  const say = (text: string, failed: boolean) => void navigate(at('services'), { replace: true, state: { text, failed } })
  const act = async (call: () => Promise<unknown>, done: string) => {
    setPending(true)
    try { await call(); say(done, false) }
    // The change may have landed: the list is read again, so nothing is sent twice.
    catch (error) { say(error instanceof Refusal ? error.message : UNFINISHED, true); mcp.reload() }
    setPending(false)
  }
  const path = (server: Server, step = '') => `servers/${encodeURIComponent(server.id)}${step}`
  const change: Change = (server, step, done, body) =>
    act(async () => mcp.keep((await sendMcp(path(server, `/${step}`), answerSchema, 'POST', body)).server), done)
  const connect = (server: Server) =>
    act(async () => browser.go((await sendMcp(path(server, '/connect'), z.object({ authorize: z.string() }))).authorize), `Opening ${server.name}'s sign-in…`)
  const remove = (server: Server) =>
    act(async () => { await sendMcp(path(server), z.object({ removed: z.literal(true) }), 'DELETE'); mcp.drop(server.id) }, `Removed ${server.name}.`)
  const named = data.servers.find(server => server.id === id)
  // A link to one MCP brings its row into view, with its Connect ready to press.
  useEffect(() => {
    const cell = document.getElementById(`mcp-${id}`)
    cell?.scrollIntoView({ block: 'center' })
    cell?.querySelector<HTMLElement>('[data-connect]')?.focus({ preventScroll: true })
  }, [id])
  // A link from a chat, or the way back from a sign-in: say what came of it, and press Connect when the link asks.
  // The address loses its question, so Back from the sign-in page does not start it again.
  useEffect(() => {
    if (!search.toString()) return
    void navigate(at('services', id), { replace: true, state: named && arrival(search, named.name) })
    if (search.get('connect') === '1') document.getElementById(`mcp-${id}`)?.querySelector<HTMLElement>('[data-connect]')?.click()
  }, [search, navigate, id, named])
  return <>
    {!!keys?.length && <KeyList keys={keys} />}
    <section aria-labelledby="services-mcps" className="grid min-w-0 gap-2">
      <h2 id="services-mcps">MCPs</h2>
      {!data.sealed && <p>Connecting MCPs needs one more step: the owner asks the assistant to run the update.</p>}
      {data.servers.length ? <Table labelledBy="services-mcps" columns={COLUMNS} actions="Actions">{data.servers.map(server =>
        <McpRow key={server.id} server={server} data={data} current={server === named} pending={pending}
          connect={server => void connect(server)} change={change} remove={setRemoving} />)}</Table>
        : <div className="flex flex-wrap items-center justify-between gap-2.5"><p>No MCPs yet. Ask the assistant to connect one, or add it by its address.</p>{add}</div>}
    </section>
    {removing && <Confirm title={`Remove ${removing.name}?`} action="Remove" pending={pending}
      onConfirm={() => void remove(removing).then(() => setRemoving(null))} onCancel={() => setRemoving(null)}>
      Everyone's sign-in to {removing.name} is deleted, and their chats can no longer use it. This can't be undone.
    </Confirm>}
  </>
}

/** Every MCP on the app, for everyone, each with the viewer's own Connect; the owner and Admins also see the saved
 *  keys. `frame` draws the views' line with the add button, then the body under it. */
export function Services({ mcp, id, keys, frame }: {
  mcp: McpRead; id: string; keys?: SavedKey[]; frame: (add: ReactNode, body: ReactNode) => ReactNode
}) {
  const navigate = useNavigate()
  const add = <AddMcp onAdded={server => {
    mcp.keep(server)
    void navigate(at('services', server.id), { replace: true, state: { text: `Added ${server.name}. Press Connect to sign in.`, failed: false } })
  }} />
  if (mcp.data) return frame(add, <List data={mcp.data} id={id} keys={keys} mcp={mcp} add={add} />)
  return frame(null, mcp.error
    ? <><p role="alert">Services are unavailable.</p><Button type="button" variant="outline" className="justify-self-start" onClick={mcp.reload}>Retry</Button></>
    : <p role="status">Loading services…</p>)
}

/** Services as the owner's and an Admin's third view, with the keys their status lists. */
export function ServicesView(props: ViewProps) {
  return <Services mcp={props.mcp} id={props.id} keys={keyRows(props.status.keys)} frame={(add, body) => <View {...props} add={add}>{body}</View>} />
}
