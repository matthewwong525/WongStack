import { useState } from 'react'
import './CopyText.css'

// Keep the text selectable whether clipboard permission is granted or refused.
export function CopyText({ text, label }: { text: string; label: string }) {
  const [status, setStatus] = useState('')
  const [expanded, setExpanded] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(text); setStatus('Copied.') }
    catch { setExpanded(true); setStatus('Copy the text below by hand.') }
  }
  return <div className="copy-text">
    <button type="button" onClick={copy}>{label}</button>
    <p role="status">{status}</p>
    <details open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}><summary>Show text to copy</summary><textarea aria-label={label} value={text} readOnly rows={7} /></details>
  </div>
}
