import type { Person, Status } from '../../lib/access'

// What the owner pastes to their assistant when a key setup makes is missing: the live app's key for
// the sign-in list, or the read-only key for Cloudflare look-ups. One step makes both.
export const FINISH_REQUEST = 'Finish Access setup: run the Access setup step, so the live app has its key for the sign-in list and the read-only key for Cloudflare look-ups, as wiki/stack/employee-access.md describes.'

const live = (status: Status) => status.environment === 'live'

/** One sign-in status per person, and whether the sign-in step is still unfinished for them. */
export function signInLine(person: Person, status: Status): { text: string; unfinished: boolean } {
  if (person.status === 'removed') {
    const signingOut = status.work.some(work => work.kind === 'sessions' && work.status !== 'ready')
    const unfinished = live(status) && (!person.settled || signingOut)
    return { text: unfinished ? 'Removed · still signing out' : 'Removed', unfinished }
  }
  // A preview's people are for practice: the real sign-in list is never touched.
  if (!live(status)) return { text: 'Practice list', unfinished: false }
  return person.settled ? { text: 'Can sign in', unfinished: false } : { text: "Can't sign in yet", unfinished: true }
}

/** Try again can only work once the live app holds its key and permissions have started. */
export const canRetry = (status: Status) => live(status) && status.key === 'ready' && status.started
