// A person's own set and a role's set are the same two lists: the apps given, and a level per saved key.
import { AccessError } from './errors.mjs';
import { everyKey, heldLevels, offered, registered } from './levels.mjs';
import { ADMIN_ROLE, APP_ID } from './policy.mjs';

const LEVELS = ['read', 'write'];
// The same address shape the sign-in's email check takes.
const EMAIL = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;

export const isObject = value => typeof value === 'object' && value !== null && !Array.isArray(value);
/** A valid email as typed; the caller trims and lowercases it after the check. */
export const isEmail = value => typeof value === 'string' && EMAIL.test(value);
/** Only the named fields, each passing its check when present; `required` names those that must be there. */
export const shaped = (value, fields, required = []) => isObject(value) &&
  Object.keys(value).every(name => Object.hasOwn(fields, name) && fields[name](value[name])) &&
  required.every(name => Object.hasOwn(value, name));
const record = (value, key, item) => isObject(value) && Object.entries(value).every(([name, held]) => key(name) && item(held));
/** What a save may carry: per app given or not, and per key a level or null for None. An omitted one stays. */
export const setFields = {
  apps: value => record(value, name => APP_ID.test(name), held => held === true || held === false),
  keys: value => record(value, () => true, held => held === null || LEVELS.includes(held)),
};

/** The apps a person can be given: every app but Access itself, which is everyone's own setup page. */
export const businessApps = run => run.catalogue().filter(app => app !== 'access');

const storedLevels = value => {
  if (!record(value ?? {}, () => true, held => LEVELS.includes(held))) throw new Error('unreadable');
  return value ?? {};
};
const names = value => {
  if (!Array.isArray(value) || !value.every(name => typeof name === 'string')) throw new Error('unreadable');
  return value;
};

/** What Admin gives: every app and every key at its highest level, worked out on each read and never stored. */
const everything = (run, registry) => ({ apps: businessApps(run), keys: Object.fromEntries(everyKey(registry)) });

/** Everyone and every role, each with the set stored for it, Admin first with the set worked out for it. An app no
 *  longer built and a key no longer registered are ignored. */
export async function readSets(run) {
  const registry = await run.registry();
  const given = businessApps(run);
  const { people, roles } = await run.store().sets();
  const apps = value => { const stored = names(value); return given.filter(app => stored.includes(app)); };
  const stored = row => ({ unticked: apps(row.unticked), set: { apps: apps(row.apps), keys: Object.fromEntries(heldLevels(registry, storedLevels(row.keys))) } });
  return {
    people: people.map(person => {
      const { set, unticked } = stored(person);
      return { email: person.email, status: person.status, settled: person.settled === true, role: person.role ?? null, own: set, unticked };
    }),
    roles: roles.map(row => row.id === ADMIN_ROLE
      ? { id: row.id, name: row.name, builtIn: true, set: everything(run, registry), unticked: [] }
      : { id: row.id, name: row.name, builtIn: false, ...stored(row) }),
  };
}

/** What a person has now: their role's set when they hold one, else their own. */
export const heldSet = (person, roles) => roles.find(role => role.id === person.role)?.set ?? person.own;

/** Refuse an app that is not built, a key nobody registered, and a level the key does not offer. */
function checkChange(run, registry, { apps, keys }) {
  if (Object.keys(apps).some(app => !businessApps(run).includes(app))) throw new AccessError('unknown_app', 400);
  for (const [key, asked] of Object.entries(keys)) {
    if (!registered(registry, key)) throw new AccessError('unknown_key', 400);
    if (asked && !offered(registry, key).includes(asked)) throw new AccessError('level_not_offered', 400);
  }
}

/** The set after a change. Apps and keys are apart: giving an app changes no key level. */
export function changedSet(run, registry, base, { apps = {}, keys = {} }) {
  checkChange(run, registry, { apps, keys });
  const levels = { ...base.keys };
  for (const [id, asked] of Object.entries(keys)) {
    if (asked) levels[id] = asked; else delete levels[id];
  }
  return { apps: businessApps(run).filter(app => Object.hasOwn(apps, app) ? apps[app] : base.apps.includes(app)), keys: levels };
}
