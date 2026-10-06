import type { Status } from '../../lib/access'
import { FinishStep } from './Notices'
import { PROJECT_REQUEST } from './status'

/** The one step left before the app can hand its project out, wherever Project code is given: a read-only GitHub
 *  key, or finishing Access setup on an install that has no project recorded. The owner gets the request to copy;
 *  a manager is told it is the owner's step. Nothing once the project can be handed out. */
export function ProjectStep({ status }: { status: Status }) {
  if (status.project === 'ready') return null
  const key = status.project === 'key'
  if (!status.viewer.owner) return <p><strong>One step first for the owner.</strong> {status.ownerEmail} {key ? 'adds a read-only GitHub key' : 'finishes Access setup'}.</p>
  return key
    ? <FinishStep plain say="Let teammates install the project" request={PROJECT_REQUEST}><strong>One step first.</strong> The app needs a read-only GitHub key to hand the project out. Ask your assistant:</FinishStep>
    : <FinishStep plain><strong>One step first.</strong> The app does not know which project to hand out yet. Ask your assistant:</FinishStep>
}
