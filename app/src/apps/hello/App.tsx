import { useState } from 'react'
import { useParams } from 'react-router'
import './Hello.css'

const waiting = 'Your greeting will appear here.'
const failed = 'Something went wrong. Try again.'

// The example app's page. Its server side is app/worker/apps/hello/. The API
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
    <>
      <p className="hello-example">Example app</p>
      <h1 className="hello-title">Hello</h1>
      <p className="hello-description">A small example you can make yours.</p>
      <form
        className="hello-form"
        onSubmit={(event) => {
          event.preventDefault()
          void greet()
        }}
      >
        <label className="hello-label" htmlFor="hello-name">Your name</label>
        <input className="hello-input" id="hello-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="given-name" placeholder="e.g. Sam" />
        <button className="hello-submit" type="submit">Say hello</button>
        <p className="hello-message" aria-live="polite">{message}</p>
      </form>
    </>
  )
}
