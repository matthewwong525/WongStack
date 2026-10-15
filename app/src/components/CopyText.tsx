import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

// One button copies the text, which stays selectable if the clipboard refuses: folded under the button, opening by
// itself on a failed copy, unless `shown` says it is already on screen. `variant` makes the button solid.
export function CopyText({ text, label, variant = 'outline', shown = false }: { text: string; label: string; variant?: 'default' | 'outline'; shown?: boolean }) {
  const [status, setStatus] = useState('')
  const [expanded, setExpanded] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(text); setStatus('Copied.') }
    catch { setExpanded(true); setStatus(shown ? 'Select the message above to copy it by hand.' : 'Copy the message below by hand.') }
  }
  return <div className="flex w-full min-w-0 flex-col items-start">
    <Button type="button" variant={variant} onClick={copy}>{label}</Button>
    <p role="status" className="mt-2 text-sm empty:mt-0">{status}</p>
    {!shown && <details className="mt-2 w-full min-w-0" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary className="cursor-pointer text-sm text-muted-foreground">Can't copy? Show the message</summary>
      <Textarea className="mt-2 field-sizing-fixed wrap-anywhere" aria-label="The message to copy" value={text} readOnly rows={7} />
    </details>}
  </div>
}
