import type { ReactNode } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CopyText } from '../../components/CopyText'
import type { ViewProps } from './address'
import { FINISH_REQUEST } from './status'

/** One notice in its box. It says nothing aloud unless `role` makes it a status or an alert. */
function Notice({ role, children }: { role?: 'status' | 'alert'; children: ReactNode }) {
  return <Alert role={role}><AlertDescription className="w-full gap-2 text-foreground wrap-anywhere">{children}</AlertDescription></Alert>
}

/** A step the owner hands to their assistant: the words to say, and the full request to copy. Left out, they
 *  are the ones for finishing Access setup. Where a key or a set is opened it is `plain`: the step needs no box there. */
export function FinishStep({ plain = false, say = 'Finish Access setup', request = FINISH_REQUEST, children }:
  { plain?: boolean; say?: string; request?: string; children: ReactNode }) {
  const step = <>
    <p>{children} <q>{say}</q></p>
    <CopyText text={request} label="Copy that request" />
  </>
  return plain ? <div className="grid gap-2">{step}</div> : <Notice>{step}</Notice>
}

// The one spot for notices, under the views on every owner screen. First what the last change came to: a save
// that did not finish interrupts, a finished one is only said, and a role picked in the list offers Undo.
// Then a preview's practice list and the first open after key levels start. The steps left before people can
// sign in show on People alone, with a person opened or not. The missing key is the owner's step, made with their Cloudflare token: a
// manager is told so, with nothing to copy.
export function Notices({ status, view, said, pending, save, reload }: ViewProps) {
  const people = view.name === 'people'
  return <>
    {said && <Notice role={said.failed ? 'alert' : 'status'}><p>
      <strong>{said.text}</strong>
      {said.undo && <> <Button type="button" variant="outline" size="sm" className="ms-2" disabled={pending} onClick={() => save('people', said.undo, { text: 'Undone.' })}>Undo</Button></>}
    </p></Notice>}
    {status.environment !== 'live' && <Notice><p><strong>Practice list.</strong> Changes here stay on previews. The real sign-in list is not touched.</p></Notice>}
    {status.kept > 0 && <Notice><p><strong>Key levels are on.</strong> Everyone kept what their apps already use. Lower a level any time.</p></Notice>}
    {people && status.key === 'missing' && (status.viewer.owner
      ? <FinishStep><strong>One step left.</strong> You can choose apps now. To let new people sign in, ask your assistant:</FinishStep>
      : <Notice><p><strong>One step left for the owner.</strong> You can choose apps now. New people can sign in once {status.ownerEmail} finishes Access setup.</p></Notice>)}
    {people && status.key === 'ready' && !status.started && <Notice>
      <p>The sign-in list could not be read yet. Everyone keeps every app until it can.</p>
      <Button type="button" variant="outline" size="sm" onClick={reload}>Read it again</Button>
    </Notice>}
    {people && status.imported > 0 && <Notice><p>
      {status.imported === 1 ? '1 person' : `${status.imported} people`} could already sign in. They keep every app until you change them.
    </p></Notice>}
  </>
}
