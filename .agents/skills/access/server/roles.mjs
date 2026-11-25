// A role is a named set of apps and key levels that several people share, read live on every request.
import { AccessError } from './errors.mjs';
import { ADMIN_ROLE } from './policy.mjs';
import { changedSet, heldSet, isEmail, readSets, setFields, shaped } from './sets.mjs';

// `from` starts a new role from one person's current access; `removed` takes a role away.
const fields = { id: value => typeof value === 'string' && value.length > 0,
  name: value => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 60,
  from: isEmail, removed: value => value === true || value === false, ...setFields };

/** Create a role, change one, or remove one. A change reaches every holder on their next request. Admin is nobody's
 *  to rename, change or remove, the owner's included. A removed role's holders keep what it gave, as their own set. */
export async function changeRole(run, pass, value) {
  if (!shaped(value, fields)) throw new AccessError('invalid_role', 400);
  const { id, removed, apps, keys } = value;
  const name = value.name?.trim();
  const from = value.from?.trim().toLowerCase();
  if (id === ADMIN_ROLE) throw new AccessError('role_locked', 403);
  const { people, roles } = await readSets(run);
  const existing = roles.find(role => role.id === id);
  if (id !== undefined && !existing) throw new AccessError('unknown_role', 400);
  const store = run.store();
  if (removed) {
    if (!existing) throw new AccessError('invalid_role', 400);
    return store.removeRole({ actor: pass.actor, apps: run.catalogue(), id: existing.id, events: ['role_removed'],
      holders: people.filter(person => person.role === existing.id).map(person => ({ email: person.email, set: existing.set })) });
  }
  if (!name || (existing && from)) throw new AccessError('invalid_role', 400);
  if (roles.some(role => role !== existing && role.name.toLowerCase() === name.toLowerCase())) throw new AccessError('role_name_taken', 409);
  const source = people.find(person => person.email === from && person.status === 'active');
  if (from && !source) throw new AccessError('unknown_person', 400);
  const base = existing?.set ?? (source ? heldSet(source, roles) : { apps: [], keys: {} });
  await store.saveRole({ actor: pass.actor, apps: run.catalogue(), id: id ?? crypto.randomUUID(), name,
    set: changedSet(run, await run.registry(), base, { apps, keys }), events: ['role_changed'] });
}
