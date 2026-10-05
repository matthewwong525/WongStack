import type { ReactNode } from 'react'
import { CopyText } from '../../components/CopyText'
import type { ViewProps } from './address'
import { FINISH_REQUEST } from './status'

/** A step the owner hands to their assistant: the words to say, and the full request to copy. */
export function FinishStep({ children }: { children: ReactNode }) {
  return <div className="access-notice">
    <p>{children} <q>Finish Access setup</q></p>
    <CopyText text={FINISH_REQUEST} label="Copy that request" />
  </div>
}

// The one spot for notices, under the views on every owner screen. First what the last change came to: a save
// that did not finish interrupts, a finished one is only said, and a role picked in the list offers Undo.
// Then a preview's practice list and the first open after key levels start. The steps left before people can
// sign in show on People alone. The missing key is the owner's step, made with their Cloudflare token: a
// manager is told so, with nothing to copy.
export function Notices({ status, view, said, pending, save, reload }: ViewProps) {
  const people = view.name === 'people'
  return <>
    {said && <p className="access-notice" role={said.failed ? 'alert' : 'status'}>
      <strong>{said.text}</strong>
      {said.undo && <> <button type="button" disabled={pending} onClick={() => save('people', said.undo, { text: 'Undone.' })}>Undo</button></>}
    </p>}
    {status.environment !== 'live' && <p className="access-notice"><strong>Practice list.</strong> Changes here stay on previews. The real sign-in list is not touched.</p>}
    {status.kept > 0 && <p className="access-notice"><strong>Key levels are on.</strong> Everyone kept what their apps already use. Lower a level any time.</p>}
    {people && status.key === 'missing' && (status.viewer.owner
      ? <FinishStep><strong>One step left.</strong> You can choose apps now. To let new people sign in, ask your assistant:</FinishStep>
      : <p className="access-notice"><strong>One step left for the owner.</strong> You can choose apps now. New people can sign in once {status.ownerEmail} finishes Access setup.</p>)}
    {people && status.key === 'ready' && !status.started && <div className="access-notice">
      <p>The sign-in list could not be read yet. Everyone keeps every app until it can.</p>
      <button type="button" onClick={reload}>Read it again</button>
    </div>}
    {people && status.imported > 0 && <p className="access-notice">
      {status.imported === 1 ? '1 person' : `${status.imported} people`} could already sign in. They keep every app until you change them.
    </p>}
  </>
}
