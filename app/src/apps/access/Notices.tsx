import type { ReactNode } from 'react'
import type { Status } from '../../lib/access'
import { CopyText } from '../../components/CopyText'
import { FINISH_REQUEST } from './status'

/** A step the owner hands to their assistant: the words to say, and the full request to copy. */
export function FinishStep({ children }: { children: ReactNode }) {
  return <div className="access-notice">
    <p>{children} <q>Finish Access setup</q></p>
    <CopyText text={FINISH_REQUEST} label="Copy that request" />
  </div>
}

// The states beside the people list: a preview, a missing key, a failed first read, the first open.
export function Notices({ status, onRetry }: { status: Status; onRetry: () => void }) {
  const live = status.environment === 'live'
  return <>
    {!live && <p className="access-notice"><strong>Practice list.</strong> Changes here stay on previews. The real sign-in list is not touched.</p>}
    {status.key === 'missing' && <FinishStep><strong>One step left.</strong> You can choose apps now. To let new people sign in, ask your assistant:</FinishStep>}
    {status.key === 'ready' && !status.started && <div className="access-notice">
      <p>The sign-in list could not be read yet. Everyone keeps every app until it can.</p>
      <button type="button" onClick={onRetry}>Read it again</button>
    </div>}
    {status.imported > 0 && <p className="access-notice">
      {status.imported === 1 ? '1 person' : `${status.imported} people`} could already sign in. They keep every app until you change them.
    </p>}
  </>
}
