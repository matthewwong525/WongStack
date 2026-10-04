import { useState } from 'react'
import { changeAccess, statusSchema, useAccess, type Person } from '../../lib/access'
import { CopyText } from '../../components/CopyText'
import { AssistantSetup } from '../../components/AssistantSetup'
import { PersonForm } from './PersonForm'
import { LoginStatus, privateInstructions } from './LoginStatus'

export function People() {
  const { data, error, reload } = useAccess('status', statusSchema)
  const [editing, setEditing] = useState<Person | null | undefined>()
  const [removing, setRemoving] = useState<Person | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  async function change(path: 'people' | 'retry' | 'login/connect', body?: object) {
    setPending(true); setMessage('')
    try {
      await changeAccess(path, body)
      setEditing(undefined); setRemoving(null); reload()
      setMessage(path === 'people' ? 'App access saved. Retry login changes to apply email admission or removal, then check the outcomes below.' : 'Login status refreshed. Check each outcome below.')
    } catch { setEditing(undefined); setRemoving(null); reload(); setMessage('The change outcome is uncertain. Current status is being checked; review it before trying again.') }
    finally { setPending(false) }
  }
  return <>
    {!data && !error && <p role="status">Loading people…</p>}
    {error && <><p role="alert">People management is unavailable. The verified employer can finish private setup or retry.</p><button type="button" onClick={reload}>Retry people</button><CopyText text={privateInstructions} label="Copy private setup instructions" /><AssistantSetup /></>}
    <p role="status">{message}</p>
    {data && <>
      <p>Employer: {data.ownerEmail}</p>
      {editing === undefined ? <section aria-label="People"><h2>People</h2>
        <button type="button" disabled={pending || !!removing} onClick={() => setEditing(null)}>Add person</button>
        {!data.people.length && <p>No people added yet.</p>}
        <ul className="access-people">{data.people.map(person => <li key={person.email}>
          <strong>{person.email}</strong><p>{person.status === 'removed' ? 'App/API access blocked' : person.apps.join(', ') || 'No apps assigned'}</p>
          <div className="access-actions"><button type="button" disabled={pending || !!removing} onClick={() => setEditing(person)}>{person.status === 'removed' ? 'Restore person' : 'Edit'}</button>
            {person.status === 'active' && <button type="button" disabled={pending} onClick={() => setRemoving(person)}>Remove access</button>}</div>
        </li>)}</ul>
      </section> : <PersonForm key={editing?.email ?? 'new'} person={editing} apps={data.apps} pending={pending} onSave={body => void change('people', body)} onCancel={() => setEditing(undefined)} />}
      {removing && <section aria-labelledby="remove-title" className="access-removal">
        <h2 id="remove-title">Remove {removing.email}'s app access?</h2>
        <p>New company work is blocked immediately. Login policy and session removal may remain pending. Other people may need to sign in again. Remove repository access separately through its provider; downloaded copies and memory remain separate.</p>
        <div className="access-actions"><button type="button" disabled={pending} onClick={() => void change('people', { email: removing.email, apps: [], removed: true })} autoFocus>Confirm removal</button><button type="button" disabled={pending} onClick={() => setRemoving(null)}>Cancel removal</button></div>
      </section>}
      <CopyText text={data.origin} label="Copy app link" />
      <LoginStatus status={data} pending={pending} onRetry={() => void change('retry')} onConnect={() => void change('login/connect')} />
      <AssistantSetup />
    </>}
  </>
}
