import { setupSchema, useAccess } from '../lib/access'
import { CopyText } from './CopyText'

export function AssistantSetup() {
  const { data, error, reload } = useAccess('setup', setupSchema)
  return <section aria-label="Connect your assistant">
    <h2>Connect your assistant</h2>
    {!data && !error && <p role="status">Loading your setup…</p>}
    {error && <><p role="alert">Assistant setup is unavailable. Ask your employer to finish setup or check your app access.</p><button type="button" onClick={reload}>Retry setup</button></>}
    {data && <>
      <p>App API access: Allowed for {data.identity.email}</p>
      <p>Apps: {data.apps.length ? data.apps.join(', ') : 'None assigned. Contact your employer.'}</p>
      {data.prompt.state === 'ready' ? <CopyText text={data.prompt.text} label="Copy setup prompt" /> : <p>{data.prompt.message}</p>}
      <p>Paste the prompt into your assistant. You may need to approve this business login on that computer.</p>
      <p>Repository: Set up access and sign in separately through its provider. App login grants no repository access.</p>
      <p>Memory: Separate setup. Keep any existing connection; ask your employer about a new one.</p>
    </>}
  </section>
}
