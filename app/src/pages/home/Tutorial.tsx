import { useState } from 'react'
import './Tutorial.css'

// The first request names the workspace and walks through the change loop.
// Remove this file, Tutorial.test.tsx, Tutorial.css, and the Tutorial import/render in Home.tsx.
const message =
  'Help me make this home page my own. Ask me what to call it, update the heading, and remove this welcome guide. Explain each step and show me a preview before publishing.'

const labels = { ready: 'Copy your first request', copied: 'Copied', failed: 'Select the message and copy it' }

export function Tutorial() {
  const [state, setState] = useState<keyof typeof labels>('ready')

  // A browser without clipboard access throws or rejects; both land on the copy-by-hand label.
  const copy = () =>
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(message))
      .then(
        () => setState('copied'),
        () => setState('failed'),
      )

  return (
    <section className="tutorial" aria-labelledby="make-it-yours">
      <h2 className="tutorial-heading" id="make-it-yours">Make it yours</h2>
      <p className="tutorial-description">
        Want something different? Just ask in your chat. You’ll see a preview before anything goes live.
      </p>
      <blockquote className="tutorial-message">{message}</blockquote>
      <button className="tutorial-copy" type="button" aria-live="polite" onClick={copy}>
        {labels[state]}
      </button>
      <p className="tutorial-paste">Paste it into your chat to start.</p>
    </section>
  )
}
