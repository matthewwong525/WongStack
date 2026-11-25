// Who may do what now: one store read per call, judged against the project's slots. Unreadable data never opens.
import { everyKey, heldLevels, holds, keyTitle, levelName, registered } from './levels.mjs';

// The built-in role's id: its holder has every app and key and manages Access. A role the owner makes gets a random
// id, never this one.
export const ADMIN_ROLE = 'admin';
export const APP_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LEVELS = ['read', 'write'];

/** The owner email the project names, trimmed and lowercased, or null. */
export const ownerOf = value => (typeof value === 'string' && value.trim().toLowerCase()) || null;

/** On a preview, a machine the project names as its checker stands in for the owner, against the practice list. */
export const checkerOwns = run => run.environment === 'preview' && !!run.who?.machine && run.slots.checker?.(run.who.machine) === true;

/** Once permissions start, only the owner and current people pass. */
const refusedOnceStarted = (role, email, status) => role !== 'owner' && (!email || status !== 'active');

/** A stored snapshot as the rules read it; anything else throws, and the caller is refused. `apps` or `keys` may be null
 *  when the store could not read them: only a caller who needs them is refused. */
function checked(row, registry, keysStarted) {
  const bit = value => value === true || value === false;
  if (!bit(row.started) || !bit(row.keysStarted) || !Number.isSafeInteger(row.revision) || row.revision < 1 ||
    ![null, 'active', 'removed'].includes(row.status) || !(row.role === null || typeof row.role === 'string') ||
    !(row.apps === null || (Array.isArray(row.apps) && row.apps.every(app => typeof app === 'string')))) throw new Error('unreadable');
  if (!keysStarted) return null;
  // Key levels are read only once they have started: until then an unreadable one takes no app away.
  if (!row.keys || typeof row.keys !== 'object' || Object.values(row.keys).some(level => !LEVELS.includes(level))) throw new Error('unreadable');
  return heldLevels(registry, row.keys);
}

/** The caller's policy: `legacy`, `unavailable`, `denied`, `not_started`, or `current` with apps and levels. */
export async function currentPolicy(run) {
  const owner = run.owner();
  // No owner named: the project's existing behaviour, with no store read.
  if (!owner) return { state: 'legacy' };
  const email = run.who?.email ?? null;
  const machine = !!run.who?.machine;
  const role = email === owner || checkerOwns(run) ? 'owner' : 'employee';
  try {
    const found = await run.store().policy(email ?? '');
    // No row yet: the owner has not opened Access, so nothing has started.
    if (!found) return { state: 'not_started', role, manages: role === 'owner' };
    checked(found, {}, false);
    // The owner manages Access, and so does an Admin: a current person holding the built-in role.
    const admin = !!email && found.status === 'active' && found.role === ADMIN_ROLE;
    const manages = role === 'owner' || admin;
    const outsider = refusedOnceStarted(role, email, found.status);
    // Only a removal writes `removed`, so it holds even before permissions start.
    if (outsider && found.status === 'removed') return { state: 'denied' };
    if (!found.started) return { state: 'not_started', role, manages };
    const keysStarted = found.keysStarted;
    const catalogue = run.catalogue();
    const registry = await run.registry();
    const every = () => ({ state: 'current', role, manages, revision: found.revision, apps: new Set(catalogue),
      keys: everyKey(registry), keysStarted });
    // A machine the wall admits keeps every app and every key, as before permissions started, so preview walks and the
    // look at the live app still reach them. It manages nobody unless it stands in for the owner.
    if (machine) return every();
    // On a preview, a signed-in person the practice list does not name keeps everything: the data is made up.
    if (outsider && !!email && found.status === null && run.environment === 'preview') {
      return { ...every(), manages: false, keys: keysStarted ? everyKey(registry) : null };
    }
    if (outsider) return { state: 'denied' };
    if (role === 'owner') return every();
    // An Admin's set is worked out like the owner's, so an app built later is theirs too. Their keys wait for key levels.
    if (admin) return { ...every(), keys: keysStarted ? everyKey(registry) : null };
    // A grant for an app that is no longer listed is ignored; unreadable grants refuse.
    if (!found.apps) throw new Error('unreadable');
    return { state: 'current', role, manages, revision: found.revision, apps: new Set(found.apps.filter(app => catalogue.includes(app))),
      keys: checked(found, registry, keysStarted), keysStarted };
  } catch {
    return { state: 'unavailable' };
  }
}

/** The saved keys a route lists; a reviewed exception lists none. */
export const listedKeys = access => !access || 'kind' in access ? [] : access.keys ?? [];
/** Whether a route passes a request on to its key's service. */
export const usedDirectly = access => !!access && 'direct' in access && access.direct === true;

function lackingKey(held, keys, need) {
  const key = keys.find(id => !holds(held?.get(id), need));
  return key ? { key, need } : null;
}

/** Whether the caller holds every mapped app. With no apps slot, a current person holds the whole app. Empty or
 *  malformed lists never turn an unreviewed route into an exception. */
function holdsApps(policy, apps, appsSlot) {
  if (!apps.length || !apps.every(app => APP_ID.test(app))) return false;
  if (!appsSlot) return true;
  // The owner reaches a route mapped to a name that is not built yet; nobody else does, an Admin included.
  return policy.role === 'owner' || apps.every(app => policy.apps.has(app));
}

/** Null when the call may run; otherwise what the caller lacks: `app`, or `{ key, need }`. */
export function refusal(policy, access, need, registry, appsSlot = true) {
  const keys = listedKeys(access);
  const alone = !!access && !('kind' in access) && !('apps' in access);
  // A mapping with no keys, or with a key nobody registered, opens nothing by a key alone.
  if (alone && !(keys.length && keys.every(id => registered(registry, id)))) return 'app';
  const direct = usedDirectly(access);
  if (policy.state === 'legacy' || policy.state === 'not_started') {
    // Direct use waits for key levels, which start after permissions: no direct call runs yet, the owner's included.
    if (direct) return { key: keys[0], need };
    // Everyone keeps what the sign-in gave them. A key working alone is new: only the owner has it yet.
    const owner = policy.state === 'not_started' && policy.role === 'owner';
    return alone && !owner ? { key: keys[0], need } : null;
  }
  if (policy.state !== 'current' || !access) return 'app';
  if ('kind' in access) return access.kind !== 'owner' || policy.role === 'owner' ? null : 'app';
  // An app's call asks for the app and nothing else: no key level, whatever the call does.
  if ('apps' in access) return holdsApps(policy, access.apps, appsSlot) ? null : 'app';
  // A key's own call is judged by what it does and the caller's level; a direct one too, once key levels start.
  if (direct && !policy.keysStarted) return { key: keys[0], need };
  return lackingKey(policy.keys, keys, need);
}

/** `need` is what a key's own call does: `read` looks up, `write` changes or sends. An app's call ignores it. */
export const policyAllows = (policy, access, need = 'write', registry = {}, appsSlot = true) =>
  refusal(policy, access, need, registry, appsSlot) === null;

/** A refusal names the key and the level that is missing, never a secret. */
export function policyDenied(policy, lacking = 'app', registry = {}) {
  const unavailable = policy.state === 'unavailable';
  const message = unavailable ? 'Access unavailable' : lacking === 'app' ? 'App access denied' :
    `${registered(registry, lacking.key) ? keyTitle(registry, lacking.key) : lacking.key}: ${levelName(lacking.need)} needed`;
  return Response.json({ error: { code: unavailable ? 'unavailable' : 'forbidden', message, requestId: crypto.randomUUID() } },
    { status: unavailable ? 503 : 403, headers: { 'Cache-Control': 'no-store' } });
}
