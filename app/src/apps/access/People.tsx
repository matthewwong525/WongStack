import { useState } from 'react'
import { changeAccess, statusSchema, useAccess, type Person } from '../../lib/access'
import { CopyText } from '../../components/CopyText'
import { PersonForm } from './PersonForm'
import { Notices } from './Notices'
import { appsLine, canRetry, signInLine } from './status'

// The owner's screen: people first, one status line each, one primary action per state.
export function People() {
  const { data, error, reload } = useAccess('status', statusSchema)
  const [editing, setEditing] = useState<Person | null | undefined>()
  const [removing, setRemoving] = useState<Person | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  async function change(path: 'people' | 'retry', body?: object) {
    setPending(true); setMessage('')
    try { await changeAccess(path, body); setMessage(path === 'people' ? 'Saved.' : 'Checked again.') }
    // The save may have landed: the list below is read again, so nothing is sent twice.
    catch { setMessage('That did not finish. Check the list below before trying again.') }
    setEditing(undefined); setRemoving(null); reload(); setPending(false)
  }
  return <>
    {!data && !error && <p role="status">Loading people…</p>}
    {error && <><p role="alert">Access is unavailable.</p><button type="button" onClick={reload}>Retry</button></>}
    <p role="status">{message}</p>
    {data && <>
      <Notices status={data} onRetry={reload} />
      {editing === undefined ? <section aria-label="People"><h2>People</h2>
        <button type="button" disabled={pending || !!removing} onClick={() => setEditing(null)}>Add person</button>
        {!data.people.length && <p>No people added yet.</p>}
        <ul className="access-people">{data.people.map(person => {
          const signIn = signInLine(person, data)
          return <li key={person.email}>
            <strong>{person.email}</strong>
            <p>{person.status === 'active' && `${appsLine(person, data)} · `}{signIn.text}</p>
            <div className="access-actions">
              {signIn.unfinished && canRetry(data) && <button type="button" disabled={pending} onClick={() => void change('retry')}>Try again</button>}
              <button type="button" disabled={pending || !!removing} onClick={() => setEditing(person)}>{person.status === 'removed' ? 'Add back' : 'Edit'}</button>
              {person.status === 'active' && <button type="button" disabled={pending || !!removing} onClick={() => setRemoving(person)}>Remove</button>}
            </div>
          </li>
        })}</ul>
      </section> : <PersonForm key={editing?.email ?? 'new'} person={editing} apps={data.apps} pending={pending} onSave={body => void change('people', body)} onCancel={() => setEditing(undefined)} />}
      {removing && <section aria-labelledby="remove-title" className="access-removal">
        <h2 id="remove-title">Remove {removing.email}?</h2>
        <p>{data.environment === 'live'
          ? "They are blocked at once. Everyone is signed out and signs in again. This can't be undone. Access to the project code is removed separately, where it was given."
          : 'They leave the practice list. The real sign-in list is not touched.'}</p>
        <div className="access-actions"><button type="button" disabled={pending} onClick={() => void change('people', { email: removing.email, apps: [], removed: true })} autoFocus>Remove access</button><button type="button" disabled={pending} onClick={() => setRemoving(null)}>Cancel</button></div>
      </section>}
      <CopyText text={data.origin} label="Copy app link" />
    </>}
  </>
}
