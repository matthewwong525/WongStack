// A person's own set and a role's set are the same two lists: the apps given, and a level per saved key.
import { z } from "zod";
import { type Core, AccessError, now } from "./core.ts";
import { catalogue } from "./catalogue.ts";
import { heldLevels, offered, registered, type Level } from "./key-levels.ts";

type Levels = Record<string, Level>;
/** `apps` names apps by folder, sorted. A given app is the whole app; a key's level is for the key used by itself. */
export type AccessSet = { apps: string[]; keys: Levels };
/** What a save may carry: per app given or not, and per key a level or null for None. An omitted one stays as it is. */
type SetChange = { apps?: Record<string, boolean>; keys?: Record<string, Level | null> };
// `unticked`: the apps this person or role could only look at, which a tick can not say, so they are not held.
type PersonRow = { email: string; status: "active" | "removed"; settled: boolean; role: string | null; manager: boolean; own: AccessSet; unticked: string[] };
type RoleRow = { id: string; name: string; set: AccessSet; unticked: string[] };
export type Sets = { people: PersonRow[]; roles: RoleRow[] };

const level = z.enum(["read", "write"]);
export const setFields = { apps: z.record(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), z.boolean()).optional(),
  keys: z.record(z.string(), level.nullable()).optional() };

// Where each kind of set is stored. Only a person's rows carry the revision that wrote them.
const stamp = ", (SELECT revision FROM wong_access_installation WHERE installation_id = ?1)";
const stores = {
  people: { apps: "wong_access_grants", keys: "wong_access_key_grants", owner: "email", stamp },
  roles: { apps: "wong_access_role_apps", keys: "wong_access_role_keys", owner: "role_id", stamp: "" },
} as const;
type SetKind = keyof typeof stores;

/** Every built app a person can be given; Access itself is everyone's own setup page. */
export const businessApps = () => catalogue().filter(app => app !== "access");
/** Owner reads and saves keep every built app listed, so a new one shows up unticked. */
export const catalogueWrites = (core: Core) => catalogue().map(app =>
  core.db.prepare("INSERT INTO wong_access_apps VALUES (?, ?) ON CONFLICT DO NOTHING").bind(core.installationId, app));
/** Each change is recorded under the person who made it: the owner, or a manager. */
export const audit = (core: Core, event: string) => core.db.prepare(`INSERT INTO wong_access_audit
  SELECT ?, installation_id, ?, ?, revision, ? FROM wong_access_installation WHERE installation_id = ?`)
  .bind(crypto.randomUUID(), core.actor, event, now(), core.installationId);

/** One batch per save: the built apps listed, the revision moved once, the changes, and an audit row per event.
 *  A row left at `read` from when an app could be held to look only is never held, and is cleared here: Access
 *  names who lost an app that way until the next save, which is this one. */
export async function save(core: Core, events: string[], changes: D1PreparedStatement[]): Promise<void> {
  await core.db.batch([...catalogueWrites(core),
    core.db.prepare("UPDATE wong_access_installation SET revision = revision + 1 WHERE installation_id = ?").bind(core.installationId),
    ...changes,
    ...[stores.people.apps, stores.roles.apps].map(table =>
      core.db.prepare(`DELETE FROM ${table} WHERE installation_id = ? AND level = 'read'`).bind(core.installationId)),
    ...events.map(event => audit(core, event))]);
}

/** Replace one person's own set, or one role's set, inside the caller's batch. */
export function setWrites(core: Core, kind: SetKind, owner: string, set: AccessSet): D1PreparedStatement[] {
  const store = stores[kind];
  const id = core.installationId;
  return [
    core.db.prepare(`DELETE FROM ${store.apps} WHERE installation_id = ? AND ${store.owner} = ?`).bind(id, owner),
    core.db.prepare(`DELETE FROM ${store.keys} WHERE installation_id = ? AND ${store.owner} = ?`).bind(id, owner),
    // A given app is a row at `write`, its table's last column, after a person's revision.
    ...set.apps.map(app => core.db.prepare(`INSERT INTO ${store.apps} VALUES (?1, ?2, ?3${store.stamp}, 'write')`).bind(id, owner, app)),
    ...Object.entries(set.keys).map(([key, held]) =>
      core.db.prepare(`INSERT INTO ${store.keys} VALUES (?1, ?2, ?3, ?4${store.stamp})`).bind(id, owner, key, held)),
  ];
}

const stored = (value: string): Levels => z.record(z.string(), level).parse(JSON.parse(value));
/** Stored app names as they count now: an app no longer built is ignored. */
const storedApps = (value: string): string[] => {
  const names = z.array(z.string()).parse(JSON.parse(value));
  return businessApps().filter(app => names.includes(app));
};
type StoredRow = { apps: string; unticked: string; keys: string };
/** A stored set as it counts now: a key no longer registered is ignored too. */
const storedSet = (row: StoredRow) => ({
  unticked: storedApps(row.unticked), set: { apps: storedApps(row.apps), keys: Object.fromEntries(heldLevels(stored(row.keys))) } });
const setColumns = (kind: SetKind, alias: string) => {
  const { apps, keys, owner } = stores[kind];
  const mine = `installation_id = ${alias}.installation_id AND ${owner} = ${alias}.${owner}`;
  // Only a row at `write` is a given app.
  return `(SELECT json_group_array(app_id) FROM ${apps} WHERE ${mine} AND level = 'write') AS apps,
    (SELECT json_group_array(app_id) FROM ${apps} WHERE ${mine} AND level = 'read') AS unticked,
    (SELECT json_group_object(key_id, level) FROM ${keys} WHERE ${mine}) AS keys`;
};

/** Everyone and every role, each with the set stored for it. `settled`: the sign-in list matches the person's last change.
 *  `manager`: a current person the owner lets manage Access; a removed person is never one. */
export async function readSets(core: Core): Promise<Sets> {
  const id = core.installationId;
  const [people, roles] = await Promise.all([
    core.db.prepare(`SELECT m.email, m.status,
      m.revision <= COALESCE((SELECT c.generation FROM wong_access_connections c
        WHERE c.installation_id = m.installation_id AND c.provider = 'access'), 1) AS settled,
      (SELECT h.role_id FROM wong_access_member_roles h
        WHERE h.installation_id = m.installation_id AND h.email = m.email) AS role,
      m.status = 'active' AND EXISTS (SELECT 1 FROM wong_access_managers a
        WHERE a.installation_id = m.installation_id AND a.email = m.email) AS manager, ${setColumns("people", "m")}
      FROM wong_access_members m WHERE m.installation_id = ? ORDER BY m.email`).bind(id)
      .all<StoredRow & { email: string; status: "active" | "removed"; settled: number; role: string | null; manager: number }>(),
    core.db.prepare(`SELECT r.role_id AS id, r.name, ${setColumns("roles", "r")}
      FROM wong_access_roles r WHERE r.installation_id = ? ORDER BY lower(r.name)`).bind(id)
      .all<StoredRow & { id: string; name: string }>(),
  ]);
  return {
    people: people.results.map(person => {
      const { set, unticked } = storedSet(person);
      return { email: person.email, status: person.status, settled: person.settled === 1, role: person.role, manager: person.manager === 1, own: set, unticked };
    }),
    roles: roles.results.map(role => ({ id: role.id, name: role.name, ...storedSet(role) })),
  };
}

/** What a person has now: their role's set when they hold one, else their own. */
export const heldSet = (person: PersonRow, roles: RoleRow[]): AccessSet =>
  roles.find(role => role.id === person.role)?.set ?? person.own;

/** Refuse an app that is not built, a key nobody registered, and a level the key does not offer. */
function checkChange({ apps, keys }: Required<SetChange>): void {
  if (Object.keys(apps).some(app => !businessApps().includes(app))) throw new AccessError("unknown_app", 400);
  for (const [key, asked] of Object.entries(keys)) {
    if (!registered(key)) throw new AccessError("unknown_key", 400);
    if (asked && !offered(key).includes(asked)) throw new AccessError("level_not_offered", 400);
  }
}

/** The set after a change. Apps and keys are apart: giving an app changes no key level. */
export function changedSet(base: AccessSet, { apps = {}, keys = {} }: SetChange): AccessSet {
  checkChange({ apps, keys });
  const levels = { ...base.keys };
  for (const [id, asked] of Object.entries(keys)) {
    if (asked) levels[id] = asked; else delete levels[id];
  }
  return { apps: businessApps().filter(app => Object.hasOwn(apps, app) ? apps[app] : base.apps.includes(app)), keys: levels };
}
