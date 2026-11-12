// A person's save, and the status the owner's screen and an Admin's show. A removal and the sign-in list step it needs
// are saved together.
import { AccessError } from './errors.mjs';
import { keyCatalogue } from './levels.mjs';
import { ownerPass } from './pass.mjs';
import { ADMIN_ROLE } from './policy.mjs';
import { changedSet, heldSet, isEmail, readSets, setFields, shaped } from './sets.mjs';

// `role` is a role's id, or null for the person's own set; left out, they keep what they have.
const fields = { email: isEmail, removed: value => value === true || value === false,
  role: value => value === null || typeof value === 'string', ...setFields };
const nothing = () => ({ apps: [], keys: {} });

/** The role a save leaves the person with, and their own set when they hold none. Never both. */
function target(run, registry, { removed, role: asked, apps, keys }, existing, roles) {
  if (removed) return { role: null, own: nothing() };
  const role = asked === undefined ? existing?.role ?? null : asked;
  // Moving off a role starts from what the role gave; the named apps and levels apply on top.
  if (role === null) return { role, own: changedSet(run, registry, existing ? heldSet(existing, roles) : nothing(), { apps, keys }) };
  // A role is the whole answer to what a person has: no exceptions on top.
  if (apps || keys) throw new AccessError('role_with_own_set', 400);
  if (!roles.some(item => item.id === role)) throw new AccessError('unknown_role', 400);
  return { role, own: nothing() };
}

/** Add, change or remove one person. Only the owner moves a person on or off Admin, a removal included. */
export async function changePerson(run, pass, value) {
  if (!shaped(value, fields, ['email', 'removed'])) throw new AccessError('invalid_person', 400);
  const member = { ...value, email: value.email.trim().toLowerCase() };
  if (member.email === pass.email) throw new AccessError('owner_cannot_be_changed', 403);
  const { people, roles } = await readSets(run);
  const existing = people.find(person => person.email === member.email);
  const { role, own } = target(run, await run.registry(), member, existing, roles);
  // A removal always takes Admin away; a save that names no role keeps it.
  const [was, will] = [existing?.role === ADMIN_ROLE, role === ADMIN_ROLE];
  // Anyone but the owner who asks to pick an Admin, about themselves included, is refused whole.
  if (was !== will) ownerPass(pass);
  const status = member.removed ? 'removed' : 'active';
  // Only a change to who may sign in needs the sign-in list, and only the live app has one.
  const steps = !pass.live || !run.slots.signInList || existing?.status === status ? [] : ['policy', ...(member.removed ? ['sessions'] : [])];
  await run.store().savePerson({ actor: pass.actor, apps: run.catalogue(), email: member.email, status, own,
    // With no owner's pass, a save that leaves the person on Admin keeps the role the owner gave.
    role: role === ADMIN_ROLE && was === will ? undefined : role, steps,
    events: [member.removed ? 'person_removed' : 'person_changed', ...(member.keys ? ['key_level_changed'] : []),
      ...(was === will ? [] : [will ? 'admin_given' : 'admin_taken'])] });
}

/** Whether the sign-in list is there to change: `practice` on a preview, `none` with no list, else its key's state. */
const listKey = (run, pass) => !pass.live ? 'practice' : !run.slots.signInList ? 'none' : run.slots.signInList.ready() ? 'ready' : 'missing';

/** What the owner's screen, and an Admin's, shows. No key's value is here: only whether each one is saved. `viewer`
 *  is who asked: the screen draws by it, and every save checks again. `unticked`: who lost a look-only app. */
export async function accessStatus(run, pass) {
  const store = run.store();
  const [state, { people, roles }, waiting, registry] = await Promise.all([store.status(), readSets(run), store.sealed(), run.registry()]);
  if (!state) throw new AccessError('installation_mismatch');
  const listed = run.apps().filter(app => app.id !== 'access');
  const titles = ids => ids.map(id => listed.find(app => app.id === id).title);
  return { ownerEmail: pass.email, viewer: { email: pass.actor, owner: pass.owner },
    environment: pass.live ? 'live' : 'practice', key: listKey(run, pass),
    // `imported`: how many people the sign-in list already admitted when permissions started.
    started: state.started, imported: state.imported, keysStarted: state.keysStarted,
    // A project with no apps or no keys slot sends neither list, so the page shows no ticks or no levels.
    ...run.slots.apps && { apps: listed },
    ...run.slots.keys && { keys: keyCatalogue(registry, run.slots.secret ?? (() => undefined), waiting) },
    unticked: { people: people.filter(person => person.unticked.length).map(person => ({ email: person.email, apps: titles(person.unticked) })),
      roles: roles.filter(role => role.unticked.length).map(role => ({ name: role.name, apps: titles(role.unticked) })) },
    // The project's own fields, such as WongStack's Project code step.
    ...await run.slots.status?.(pass),
    // `builtIn` marks Admin, the one role nobody changes.
    roles: roles.map(role => ({ id: role.id, name: role.name, builtIn: role.builtIn, ...role.set })),
    people: people.map(person => ({ email: person.email, status: person.status, settled: person.settled, role: person.role,
      ...heldSet(person, roles) })),
    work: state.work };
}
