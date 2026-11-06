import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { sendKey, type SavedKey, type Status } from '../../lib/access'
import type { ViewProps } from './address'
import { Confirm } from './Confirm'
import { Field } from './Fields'
import { keyRows } from './levels'
import { Cell, Name, Row, Table } from './Table'
import { View } from './View'

/** The quiet lines under a key's state: muted, each on its own line. A tool added from a chat names what Read lets
 *  someone do with it, before anyone is given it. */
const notes = (key: SavedKey, live: boolean) => [key.direct && 'also used directly',
  key.chat && `Added in a chat · reads: ${['GET anything', ...key.reads ?? []].join(', ')}`, !key.saved && !key.waiting &&
  (!live && key.liveOnly ? 'Live app only' : key.setup ? 'Ask the assistant to finish Access setup'
    : `Ask the assistant to connect it${live ? ', or paste the key' : ''}`)]
  .filter(note => typeof note === 'string')

const state = (key: SavedKey) => key.waiting ? `Waiting for the next publish, ends in …${key.waiting.ends}` : key.saved ? 'Saved' : 'Not saved'

/** A key's paste box: one hidden field per part, sealed on this page before it is sent. Nobody sees it again. */
function PasteKey({ item, parts, sent }: { item: SavedKey; parts: string[]; sent: () => void }) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<string[]>([])
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState('')
  const close = () => { setOpen(false); setValues([]); setFailed('') }
  const save = async () => {
    const pasted = parts.map((_, at) => (values[at] ?? '').trim())
    if (pasted.some(value => !value)) return setFailed('Paste the key first.')
    setPending(true)
    try { await sendKey(item.id, pasted); close(); sent() } catch (error) { setFailed((error as Error).message) }
    setPending(false)
  }
  const replace = item.saved || item.waiting
  const field = (label: string, at: number) => <Input type="password" autoComplete="off" aria-label={label} placeholder="Paste it here"
    value={values[at] ?? ''} onChange={event => setValues(Object.assign([...values], { [at]: event.target.value }))} />
  return <>
    <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>{replace ? 'Replace key' : 'Paste key'}</Button>
    {open && <Confirm title={`${replace ? 'Replace' : 'Paste'} the ${item.title} key`} action="Save key" pending={pending} onCancel={close} onConfirm={() => void save()}>
      <span className="block">It is locked on this page, and only the next publish can open it. Nobody can see it again, you included.</span>
      {parts.map((label, at) => <span key={label} className="mt-3 block">{parts.length > 1 ? <Field label={label}>{field(label, at)}</Field> : field(`${item.title} key`, at)}</span>)}
      {failed && <span role="alert" className="mt-3 block text-destructive">{failed}</span>}
    </Confirm>}
  </>
}

/** Where a key is pasted: a button on the live app, or on a preview a line saying only the live app takes one. */
const pasteCell = (key: SavedKey, environment: Status['environment'], sent: () => void) => !key.parts?.length ? null
  : environment === 'live' ? <PasteKey item={key} parts={key.parts} sent={sent} /> : <span className="text-muted-foreground">Live app only</span>

/** The owner's and an Admin's third view: every key, what it is for and whether it is saved or waits for the next
 *  publish, never its value or a level, and a place to paste a key. Levels are set where a person or role is opened. */
export function Services(props: ViewProps) {
  const keys = keyRows(props.status.keys)
  const live = props.status.environment === 'live'
  return <View {...props}>
    {keys.length ? <Table view={props.view} columns={['Key', 'For', 'State']} actions="Paste a key">{keys.map(key => <Row key={key.id}>
      <Name title={key.title} className="min-w-36" />
      <Cell>{key.purpose}{key.docs && <> · <a href={key.docs} target="_blank" rel="noreferrer">API guide</a></>}</Cell>
      <Cell>{state(key)}{notes(key, live).map(note => <span key={note} className="block text-muted-foreground">{note}</span>)}</Cell>
      <Cell actions>{pasteCell(key, props.status.environment, props.reload)}</Cell>
    </Row>)}</Table>
      : <p>No keys yet. Ask the assistant to connect a service.</p>}
  </View>
}
