import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

// The first request gets to know the person, names the workspace, and walks through the change loop.
// Remove this file, Tutorial.test.tsx, and the Tutorial import/render in Home.tsx.
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
    <section className="mb-8" aria-labelledby="make-it-yours">
      <Card className="gap-3 p-6">
        <h2 id="make-it-yours">Make it yours</h2>
        <p className="text-muted-foreground">
          Want something different? Just ask in your chat. You’ll see a preview before anything goes live.
        </p>
        <blockquote className="my-3 rounded-md border-s-[3px] border-primary bg-muted p-4 wrap-anywhere select-all">{message}</blockquote>
        <Button className="h-auto min-h-11 self-start whitespace-normal" type="button" aria-live="polite" onClick={copy}>
          {labels[state]}
        </Button>
        <p className="text-muted-foreground">Paste it into your chat to start.</p>
      </Card>
    </section>
  )
}
