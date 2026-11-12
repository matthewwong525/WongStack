// Permissions, then key levels, start by themselves at the owner's first open, and take nothing away.
import { AccessError, Unreadable } from './errors.mjs';
import { businessApps } from './sets.mjs';

/** On the live app, everyone the sign-in list already admits becomes a person with every app, and permissions turn
 *  on, in one step. A list with no key changes nothing; a failed read logs, then returns why. With no sign-in list
 *  the first open lists the owner alone. */
export async function startPermissions(run, pass) {
  const store = run.store();
  if ((await store.started()).policy) return null;
  let admitted = [];
  const list = run.slots.signInList;
  if (pass.live && list) {
    if (!list.ready()) return null;
    try { admitted = await list.admitted({ store }); }
    catch (failure) {
      // An answer this module could not read is `unreadable`; any other throw, such as a timeout, means no answer.
      const error = failure instanceof AccessError ? failure.code
        : failure instanceof Unreadable ? 'login_policy_unreadable' : 'provider_unavailable';
      console.log(JSON.stringify({ event: 'permissions_start_failed', error }));
      return error;
    }
  }
  await store.start({ actor: pass.actor, apps: run.catalogue(), given: businessApps(run), owner: pass.email, admitted });
  return null;
}

/** Once permissions have started, key levels turn on and nothing else changes: nobody is given a level. */
export const startKeyLevels = run => run.store().startKeys();

/** Every first-open step, as Access's first read runs them: list the apps, start permissions, then key levels. */
export async function startAll(run, pass) {
  await run.store().listApps(run.catalogue());
  const error = await startPermissions(run, pass);
  await startKeyLevels(run);
  return error;
}
