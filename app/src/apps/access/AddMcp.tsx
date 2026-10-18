import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field } from './Fields'
import { answerSchema, Refusal, sendMcp, UNFINISHED, type Server } from './mcp'

/** The fields, drawn afresh each time the popup opens. A refusal shows under them and keeps what was typed. */
function AddForm({ onAdded }: { onAdded: (server: Server) => void }) {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [pending, setPending] = useState(false)
  const [refused, setRefused] = useState('')
  const add = async () => {
    setPending(true); setRefused('')
    try { onAdded((await sendMcp('servers', answerSchema, 'POST', { url: url.trim(), name: name.trim() || undefined })).server) }
    catch (error) { setRefused(error instanceof Refusal ? error.message : UNFINISHED); setPending(false) }
  }
  return <form className="grid gap-4" onSubmit={event => { event.preventDefault(); void add() }}>
    <DialogHeader><DialogTitle>Add an MCP</DialogTitle></DialogHeader>
    <fieldset className="grid min-w-0 gap-4" disabled={pending}>
      <Field label="Address"><Input type="url" required placeholder="https://mcp.example.com/mcp" value={url} onChange={event => setUrl(event.target.value)} /></Field>
      <Field label="Name"><Input placeholder="Canva" value={name} onChange={event => setName(event.target.value)} /></Field>
      {/* The "!" and the words mark it: nothing depends on colour. */}
      {refused && <p role="alert" className="wrap-anywhere"><span aria-hidden="true">! </span>{refused}</p>}
      <DialogFooter>
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit">Add</Button>
      </DialogFooter>
    </fieldset>
  </form>
}

/** Add an MCP by its address: the button and its popup. Once added, the keyboard goes to the new row's Connect, not
 *  back to this button. */
export function AddMcp({ onAdded }: { onAdded: (server: Server) => void }) {
  const [open, setOpen] = useState(false)
  const added = useRef(false)
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button type="button" onClick={() => { added.current = false }}><span aria-hidden="true">+ </span>Add MCP</Button></DialogTrigger>
    <DialogContent aria-describedby={undefined} onCloseAutoFocus={event => { if (added.current) event.preventDefault() }}>
      <AddForm onAdded={server => { added.current = true; setOpen(false); onAdded(server) }} />
    </DialogContent>
  </Dialog>
}
