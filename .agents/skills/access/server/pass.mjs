// The pass every Access read and save takes. Only this file makes one, after it has checked who is asking; a pass
// made anywhere else is refused. The owner is the person whose email the project names; on a preview, the project's
// checker machine counts too. An Admin is a current person the owner gave the built-in role.
import { AccessError } from './errors.mjs';
import { checkerOwns } from './policy.mjs';

const made = new WeakSet();
/** Whether a value is a pass this file made: a copy or a hand-built object never is. */
export const isPass = value => made.has(value);
const seal = fields => { const pass = Object.freeze(fields); made.add(pass); return pass; };
/** Refuse a pass this file did not make, so no save runs for a caller built by hand. */
export function checkedPass(pass) {
  if (!isPass(pass)) throw new AccessError('owner_required', 403);
  return pass;
}
/** Refuse a pass that is not the owner's own: an Admin's, the checker's on a live app, or one built by hand. */
export function ownerPass(pass) {
  if (!checkedPass(pass).owner) throw new AccessError('owner_required', 403);
  return pass;
}

/** The pass of the owner or an Admin. `email` is always the owner's; `actor` is who is asking; `live` is the live
 *  app, where the sign-in list is real; elsewhere Access keeps a practice list. */
export async function managerPass(run, request) {
  const owner = run.owner();
  // A project with no owner, with no sign-in, or with no store has no owner to check.
  if (!owner || !run.who) throw new AccessError('owner_setup_required');
  // A machine and a request body establish nothing. One exception, on a preview only: the checker stands in for the owner.
  const machine = checkerOwns(run);
  const person = run.who.email ?? null;
  const owns = machine || person === owner;
  // A machine, or a sign-in with no person, is never an Admin: refused before anything is read.
  if (!owns && !person) throw new AccessError('owner_required', 403);
  let store;
  try { store = run.store(); } catch { throw new AccessError('owner_setup_required'); }
  // Any other person passes only as an Admin, read on this request: once the role is taken, the next one is refused.
  if (!owns && !await store.admin(person)) throw new AccessError('owner_required', 403);
  const origin = new URL(request.url).origin;
  // Browser cookies can not change people from a foreign site.
  if (request.method !== 'GET' && request.headers.get('Origin') !== origin) throw new AccessError('origin_required', 403);
  // The checker has no person: its subject is its own name.
  const subject = machine ? run.who.machine : run.who.subject;
  // Only an owner request makes the store's first row: an Admin exists only once it does.
  if (owns) await store.open({ origin, owner, subject });
  // The checker stands in for the owner, so its changes are recorded under the owner's email.
  return seal({ origin, email: owner, actor: person ?? owner, owner: owns, subject, live: run.environment === 'live' });
}

/** The live app's own pass for a timed job: no request and no person. Null off the live app, with no owner, or before
 *  the owner first opened Access. It acts for the owner, as the checker does, yet is never the owner. */
export async function scheduledPass(run) {
  const owner = run.owner();
  if (run.environment !== 'live' || !owner) return null;
  let store;
  try { store = run.store(); } catch { return null; }
  const row = await store.installed();
  if (!row) return null;
  return seal({ origin: row.origin, email: owner, actor: owner, owner: false, subject: 'schedule', live: true });
}
