import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

// The first request asks about the person's work and builds their first app; setup already learned about them.
// Remove this file, Tutorial.test.tsx, and the Tutorial import/render in Home.tsx.
const message =
  "Help me build my first app. Grill me first: start from what you already know about me and ask about my work and where my time goes, one question at a time. Then suggest a few apps I'd use, build the one I pick, remove this welcome guide, explain each step, and show me a preview before publishing."

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
          Start with an app built for how you work. Just ask in your chat. You’ll see a preview before anything goes live.
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
