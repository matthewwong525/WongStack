import { useState } from 'react'
import './Tutorial.css'

// The first request gets to know the person, names the workspace, and walks through the change loop.
// Remove this file, Tutorial.test.tsx, Tutorial.css, and the Tutorial import/render in Home.tsx.
const message =
  "Get to know me and make this home page mine. First ask if you may skim my Claude Code and Codex chats from the last 30 days on this computer. Then ask me two or three short rounds of questions about what you couldn't find. Save short notes about me on my wiki page and in your memory, never passwords, keys, or copies of my chats. Then ask what to call this page, update its heading, remove this welcome guide, explain each step, and show me a preview before publishing."

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
