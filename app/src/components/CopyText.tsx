import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

// One button copies the text. Keep the text selectable whether clipboard permission is granted or refused: it sits
// folded under the button, and opens by itself when the copy fails. `variant` makes the button the solid one
// where copying is the main thing to do.
export function CopyText({ text, label, variant = 'outline' }: { text: string; label: string; variant?: 'default' | 'outline' }) {
  const [status, setStatus] = useState('')
  const [expanded, setExpanded] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(text); setStatus('Copied.') }
    catch { setExpanded(true); setStatus('Copy the message below by hand.') }
  }
  return <div className="flex w-full min-w-0 flex-col items-start">
    <Button type="button" variant={variant} onClick={copy}>{label}</Button>
    <p role="status" className="mt-2 text-sm empty:mt-0">{status}</p>
    <details className="mt-2 w-full min-w-0" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary className="cursor-pointer text-sm text-muted-foreground">Can't copy? Show the message</summary>
      <Textarea className="mt-2 field-sizing-fixed wrap-anywhere" aria-label="The message to copy" value={text} readOnly rows={7} />
    </details>
  </div>
}
