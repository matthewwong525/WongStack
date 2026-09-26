import { useState } from 'react'

// The first change a person makes: pasting this message walks them through the whole loop,
// and the agent explains each step on the way. Removing the tutorial means deleting this file,
// Tutorial.test.tsx, the tutorial styles in App.css, and its one line in App.tsx.
const message =
  'Remove the tutorial from my home page. Walk me through each step and explain what it does.'

const labels = { ready: 'Copy', copied: 'Copied', failed: 'Select the message and copy it' }

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
    <section aria-labelledby="learn-the-loop">
      <h2 id="learn-the-loop">Learn the development loop</h2>
      <p>Your first change removes this box. Copy this message into your chat with the agent:</p>
      <blockquote>{message}</blockquote>
      <button type="button" aria-live="polite" onClick={copy}>
        {labels[state]}
      </button>
    </section>
  )
}
