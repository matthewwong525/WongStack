import { useState } from 'react'
import type { Person } from '../../lib/access'
import { appTitle } from '../../lib/apps'

export function PersonForm({ person, apps, pending, onSave, onCancel }: {
  person: Person | null; apps: string[]; pending: boolean
  onSave: (value: { email: string; apps: string[]; removed: boolean }) => void; onCancel: () => void
}) {
  const [selected, setSelected] = useState(person?.apps ?? [])
  const [email, setEmail] = useState(person?.email ?? '')
  return <form className="access-form" onSubmit={event => { event.preventDefault(); onSave({ email, apps: selected, removed: false }) }}>
    <h2>{person ? 'Edit person' : 'Add person'}</h2>
    <label>Email<input type="email" required disabled={pending} autoFocus value={email} readOnly={!!person} onChange={event => setEmail(event.target.value)} /></label>
    <fieldset disabled={pending}><legend>Apps</legend>
      {apps.map(app => <label className="access-choice" key={app}>
        <input type="checkbox" checked={selected.includes(app)} onChange={event => setSelected(event.target.checked ? [...selected, app] : selected.filter(value => value !== app))} />
        {appTitle(app)}
      </label>)}
      {!apps.length && <p>No apps built yet. Ask your assistant to make one.</p>}
    </fieldset>
    <p>A new person starts with no apps. Project code is shared separately.</p>
    <div className="access-actions"><button type="submit" disabled={pending}>Save access</button><button type="button" disabled={pending} onClick={onCancel}>Cancel</button></div>
  </form>
}
