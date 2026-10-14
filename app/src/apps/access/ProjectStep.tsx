import type { Status } from '../../lib/access'
import { FinishStep } from './Notices'
import { PROJECT_REQUEST, SAVE_REQUEST } from './status'

/** The one step left wherever Project code is given, and never two at once. First the step before the app can hand
 *  its project out: a GitHub key, or finishing Access setup on an install that has no project recorded. Then, while
 *  people already install the project, the step before they can save changes too. The owner gets the request to
 *  copy; an Admin is told it is the owner's step. Nothing once the app does both. */
export function ProjectStep({ status }: { status: Status }) {
  const installs = status.project === 'ready'
  const left = installs ? status.projectSave ?? 'ready' : status.project
  if (left === 'ready') return null
  const key = left === 'key'
  const lead = installs ? 'Saving needs one more step' : 'One step first'
  if (!status.viewer.owner) return <p><strong>{lead} for the owner.</strong> {status.ownerEmail} {key ? 'adds a GitHub key' : 'finishes Access setup'}.</p>
  if (installs) return key
    ? <FinishStep plain say="Let teammates save changes" request={SAVE_REQUEST}><strong>{lead}.</strong> People can install the project now. To let them save changes, the app needs a newer GitHub key. Ask your assistant:</FinishStep>
    : <FinishStep plain><strong>{lead}.</strong> People can install the project now. To let them save changes, ask your assistant:</FinishStep>
  return key
    ? <FinishStep plain say="Let teammates install the project" request={PROJECT_REQUEST}><strong>{lead}.</strong> The app needs a GitHub key to hand the project out. Ask your assistant:</FinishStep>
    : <FinishStep plain><strong>{lead}.</strong> The app does not know which project to hand out yet. Ask your assistant:</FinishStep>
}
