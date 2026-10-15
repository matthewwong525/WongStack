import type { Person, Status } from '../../lib/access'
import type { AccessSet } from './levels'

// Whose access decides: a role, or their own key levels, saved or about to be.
type Holder = Pick<Person, 'role'> & Pick<AccessSet, 'keys'>

// Install pages for two assistants, named as examples: any assistant that runs on the computer works.
const ASSISTANTS = 'Claude Code (https://claude.com/product/claude-code) or Codex (https://developers.openai.com/codex)'

/** Whether a person may connect an assistant, read the way setup reads it: while the install hands out its project,
 *  only Project code, held in their own set or through their role, lets them; otherwise everyone may. */
export function mayConnect(status: Pick<Status, 'project' | 'roles'>, person: Holder) {
  if (status.project !== 'ready') return true
  const role = status.roles.find(item => item.id === person.role)
  if (role) return !!role.builtIn || !!role.keys.code
  return !!person.keys.code
}

/** The note the owner forwards: address and sign-in email; for a person who may connect, install steps and `setup`,
 *  the one message for everyone, unchanged, so the whole note pastes into their assistant. No key; it sends nothing. */
export function welcomeNote(status: Pick<Status, 'project' | 'roles'>, person: Holder & Pick<Person, 'email'>, setup?: string) {
  const lines = [`You can now use our company app at ${window.location.origin}`, `Sign in with ${person.email}.`]
  if (!mayConnect(status, person)) return lines.join('\n')
  if (!setup) return [...lines, 'Then open Connect your assistant and follow its steps.'].join('\n')
  return [...lines, '', 'To connect your AI assistant:',
    `1. No assistant on your computer yet? Install one, such as ${ASSISTANTS}.`,
    '2. Paste this whole note into its chat.',
    `3. When it shows a sign-in link, sign in with ${person.email}.`,
    '', 'For the assistant:', setup].join('\n')
}

/** Whether a save newly gives a person the project: the install hands it out, and they may connect `after` it but
 *  could not before, as a new or removed person or by their saved set. Only then is there a message to send them. */
export function givesProject(status: Pick<Status, 'project' | 'roles'>, before: Holder & Pick<Person, 'status'> | undefined,
  after: Holder) {
  if (status.project !== 'ready') return false
  return mayConnect(status, after) && !(before?.status === 'active' && mayConnect(status, before))
}
