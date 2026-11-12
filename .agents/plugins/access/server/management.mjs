// The finite management routes, status, retry, people and roles, for the owner and an Admin alone.
import { AccessError, boundedJson, reply } from './errors.mjs';
import { managerPass } from './pass.mjs';
import { accessStatus, changePerson } from './people.mjs';
import { changeRole } from './roles.mjs';
import { startAll } from './start.mjs';

// Each save the owner or an Admin can make. Only a people save can change who signs in, or who manages.
const saves = new Map([['people', changePerson], ['roles', changeRole]]);
/** A management refusal: its code, and the status it answers with. Anything else is `access_unavailable`. */
export const refused = error => reply({ code: error instanceof AccessError ? error.code : 'access_unavailable' },
  error instanceof AccessError ? error.status : 503);

/** `path` is the part after the prefix. */
export async function manage(run, request, path) {
  try {
    if (!['status', 'retry', ...saves.keys()].includes(path)) return reply({ error: 'Not found' }, 404);
    const pass = await managerPass(run, request);
    if (request.method === 'GET') {
      if (path !== 'status') return reply({ code: 'not_found' }, 404);
      // A read lists every app and, the first time, starts permissions and then key levels. An Admin's read runs the
      // same steps: they take nothing away, and do nothing once run. A failed start reruns at each open until it works.
      const startError = await startAll(run, pass);
      return reply({ ...await accessStatus(run, pass), startError });
    }
    if (request.method !== 'POST') return reply({ code: 'method_not_allowed' }, 405);
    if (path === 'status') return reply({ code: 'not_found' }, 404);
    const change = saves.get(path);
    if (change) await change(run, pass, await boundedJson(request, 65_536));
    // A people save is saved by now: a busy or failed sign-in step stays pending for Try again.
    // A role changes nobody's sign-in, so its save calls no list.
    if (path === 'people') await reconcile(run, pass).catch(() => {});
    if (path === 'retry') await reconcile(run, pass);
    return reply(await accessStatus(run, pass));
  } catch (error) {
    return refused(error);
  }
}

/** Bring the sign-in list and open sessions to the saved people, under the lease. A preview keeps a practice list. */
export async function reconcile(run, pass) {
  const list = run.slots.signInList;
  if (!pass.live || !list) return;
  const store = run.store();
  const holder = await store.lease();
  if (!holder) throw new AccessError('retry_pending', 409);
  try {
    // Each outcome is apart: a failed list change does not stop the session step.
    await list.reconcile({ store, owner: pass.email, holder, kind: 'policy' });
    await list.reconcile({ store, owner: pass.email, holder, kind: 'sessions' });
  } finally { await store.release(holder); }
}
