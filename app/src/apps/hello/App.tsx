import { useState } from 'react'
import { useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const waiting = 'Your greeting will appear here.'
const failed = 'Something went wrong. Try again.'

// The example app's page, built from the ready-made parts in app/src/components/ui/ with Tailwind classes
// for its spacing: no CSS file of its own. `max-w-lg` keeps the form a readable width inside the shared frame. Its server side is app/worker/apps/hello/. The API
// address comes from the page's own, so a copy under another name still works.
export function App() {
  const { name: app } = useParams()
  const [name, setName] = useState('')
  const [message, setMessage] = useState(waiting)

  const greet = async () => {
    try {
      const response = await fetch(`/apps/${app}/api/greeting?name=${encodeURIComponent(name)}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      setMessage(((await response.json()) as { message: string }).message)
    } catch {
      setMessage(failed)
    }
  }

  return (
    <div className="max-w-lg">
      <p className="mb-2 text-sm text-muted-foreground">Example app</p>
      <h1 className="mb-3">Hello</h1>
      <p className="mb-6 text-muted-foreground">A small example you can make yours.</p>
      <Card className="p-6">
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            void greet()
          }}
        >
          <Label htmlFor="hello-name">Your name</Label>
          <Input id="hello-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="given-name" placeholder="e.g. Sam" />
          <Button className="w-full" type="submit">Say hello</Button>
          <p className="min-h-6 text-muted-foreground wrap-anywhere" aria-live="polite">{message}</p>
        </form>
      </Card>
    </div>
  )
}
