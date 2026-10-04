import { setupSchema, useAccess } from '../lib/access'
import { appTitle } from '../lib/apps'
import { CopyText } from './CopyText'
import './AssistantSetup.css'

// One box, on Home and in Access, for every signed-in person. The prompt holds no keys.
export function AssistantSetup() {
  const { data, error, reload } = useAccess('setup', setupSchema)
  return <section aria-label="Connect your assistant" className="assistant-setup">
    <h2>Connect your assistant</h2>
    {!data && !error && <p role="status">Loading your setup…</p>}
    {error && <><p role="alert">Assistant setup is unavailable. Sign in to this app, then try again.</p><button type="button" onClick={reload}>Retry setup</button></>}
    {data && <>
      <p>Signed in as {data.identity.email}</p>
      <p>Apps: {data.apps.length ? data.apps.map(appTitle).join(', ') : 'None yet. Ask your employer.'}</p>
      {data.prompt.state === 'ready'
        ? <><CopyText text={data.prompt.text} label="Copy setup prompt" /><p>Paste it into your assistant and approve the sign-in on that computer.</p></>
        : <p>{data.prompt.message}</p>}
      <p className="assistant-setup-note">This connects the apps above. Project code and memory are set up separately.</p>
    </>}
  </section>
}
