import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

// Keep the text selectable whether clipboard permission is granted or refused.
export function CopyText({ text, label }: { text: string; label: string }) {
  const [status, setStatus] = useState('')
  const [expanded, setExpanded] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(text); setStatus('Copied.') }
    catch { setExpanded(true); setStatus('Copy the text below by hand.') }
  }
  return <div className="flex w-full flex-col items-start">
    <Button type="button" variant="outline" onClick={copy}>{label}</Button>
    <p role="status" className="mt-2 text-sm empty:mt-0">{status}</p>
    <details className="mt-2 w-full" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary className="cursor-pointer text-sm">Show text to copy</summary>
      <Textarea className="mt-2" aria-label={label} value={text} readOnly rows={7} />
    </details>
  </div>
}
