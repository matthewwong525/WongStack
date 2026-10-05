// A person's own set and a role's set are the same two lists: apps, and a level per saved key.
import { z } from "zod";
import { type Core, AccessError, now } from "./core.ts";
import { catalogue } from "./catalogue.ts";
import { appKeys } from "./key-catalogue.ts";
import { heldLevels, offered, registered, type Level } from "./key-levels.ts";

export type AccessSet = { apps: string[]; keys: Record<string, Level> };
/** What a save may carry: app ticks, and per key a level, or null for None. An omitted key keeps its level. */
type SetChange = { apps?: string[]; keys?: Record<string, Level | null> };
type PersonRow = { email: string; status: "active" | "removed"; settled: boolean; role: string | null; own: AccessSet };
type RoleRow = { id: string; name: string; set: AccessSet };
export type Sets = { people: PersonRow[]; roles: RoleRow[] };

const level = z.enum(["read", "write"]);
export const levelOrNone = level.nullable();
export const setFields = { apps: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).max(200).optional(),
  keys: z.record(z.string(), levelOrNone).optional() };

// Where each kind of set is stored. Only a person's rows carry the revision that wrote them.
const stamp = ", (SELECT revision FROM wong_access_installation WHERE installation_id = ?1)";
const stores = {
  people: { apps: "wong_access_grants", keys: "wong_access_key_grants", owner: "email", stamp },
  roles: { apps: "wong_access_role_apps", keys: "wong_access_role_keys", owner: "role_id", stamp: "" },
} as const;
export type SetKind = keyof typeof stores;

/** Every built app a person can be given; Access itself is everyone's own setup page. */
export const businessApps = () => catalogue.filter(app => app !== "access");
/** Owner reads and saves keep every built app listed, so a new app shows up unticked. */
export const catalogueWrites = (core: Core) => catalogue.map(app =>
  core.db.prepare("INSERT INTO wong_access_apps VALUES (?, ?) ON CONFLICT DO NOTHING").bind(core.installationId, app));
export const audit = (core: Core, event: string) => core.db.prepare(`INSERT INTO wong_access_audit
  SELECT ?, installation_id, ?, ?, revision, ? FROM wong_access_installation WHERE installation_id = ?`)
  .bind(crypto.randomUUID(), core.email, event, now(), core.installationId);

/** One batch per save: the built apps listed, the revision moved once, the changes, and an audit row per event. */
export async function save(core: Core, events: string[], changes: D1PreparedStatement[]): Promise<void> {
  await core.db.batch([...catalogueWrites(core),
    core.db.prepare("UPDATE wong_access_installation SET revision = revision + 1 WHERE installation_id = ?").bind(core.installationId),
    ...changes, ...events.map(event => audit(core, event))]);
}

/** Replace one person's own set, or one role's set, inside the caller's batch. */
export function setWrites(core: Core, kind: SetKind, owner: string, set: AccessSet): D1PreparedStatement[] {
  const store = stores[kind];
  const id = core.installationId;
  return [
    core.db.prepare(`DELETE FROM ${store.apps} WHERE installation_id = ? AND ${store.owner} = ?`).bind(id, owner),
    core.db.prepare(`DELETE FROM ${store.keys} WHERE installation_id = ? AND ${store.owner} = ?`).bind(id, owner),
    ...set.apps.map(app => core.db.prepare(`INSERT INTO ${store.apps} VALUES (?1, ?2, ?3${store.stamp})`).bind(id, owner, app)),
    ...Object.entries(set.keys).map(([key, held]) =>
      core.db.prepare(`INSERT INTO ${store.keys} VALUES (?1, ?2, ?3, ?4${store.stamp})`).bind(id, owner, key, held)),
  ];
}

/** A stored set as it counts now: an app no longer built and a key no longer registered are ignored. */
const storedSet = (row: { apps: string; keys: string }): AccessSet => ({
  apps: z.array(z.string()).parse(JSON.parse(row.apps)).filter(app => businessApps().includes(app)),
  keys: Object.fromEntries(heldLevels(z.record(z.string(), level).parse(JSON.parse(row.keys)))),
});
const setColumns = (kind: SetKind, alias: string) => {
  const { apps, keys, owner } = stores[kind];
  const mine = `installation_id = ${alias}.installation_id AND ${owner} = ${alias}.${owner}`;
  return `(SELECT json_group_array(app_id) FROM ${apps} WHERE ${mine}) AS apps,
    (SELECT json_group_object(key_id, level) FROM ${keys} WHERE ${mine}) AS keys`;
};

/** Everyone and every role, each with the set stored for it. `settled`: the sign-in list matches the person's last change. */
export async function readSets(core: Core): Promise<Sets> {
  const id = core.installationId;
  const [people, roles] = await Promise.all([
    core.db.prepare(`SELECT m.email, m.status,
      m.revision <= COALESCE((SELECT c.generation FROM wong_access_connections c
        WHERE c.installation_id = m.installation_id AND c.provider = 'access'), 1) AS settled,
      (SELECT h.role_id FROM wong_access_member_roles h
        WHERE h.installation_id = m.installation_id AND h.email = m.email) AS role, ${setColumns("people", "m")}
      FROM wong_access_members m WHERE m.installation_id = ? ORDER BY m.email`).bind(id)
      .all<{ email: string; status: "active" | "removed"; settled: number; role: string | null; apps: string; keys: string }>(),
    core.db.prepare(`SELECT r.role_id AS id, r.name, ${setColumns("roles", "r")}
      FROM wong_access_roles r WHERE r.installation_id = ? ORDER BY lower(r.name)`).bind(id)
      .all<{ id: string; name: string; apps: string; keys: string }>(),
  ]);
  return {
    people: people.results.map(person => ({ email: person.email, status: person.status, settled: person.settled === 1,
      role: person.role, own: storedSet(person) })),
    roles: roles.results.map(role => ({ id: role.id, name: role.name, set: storedSet(role) })),
  };
}

/** What a person has now: their role's set when they hold one, else their own. */
export const heldSet = (person: PersonRow, roles: RoleRow[]): AccessSet =>
  roles.find(role => role.id === person.role)?.set ?? person.own;

/** Refuse an app that is not built, a key nobody registered, and a level the key does not offer. */
function checkChange(change: SetChange): void {
  if (change.apps?.some(app => !businessApps().includes(app))) throw new AccessError("unknown_app", 400);
  for (const [key, asked] of Object.entries(change.keys ?? {})) {
    if (!registered(key)) throw new AccessError("unknown_key", 400);
    if (asked && !offered(key).includes(asked)) throw new AccessError("level_not_offered", 400);
  }
}

/**
 * The set after a change. Ticks replace the apps; a level replaces a key's, and null removes it. A newly
 * ticked app gives Read on each key it uses that the set lacks and the change does not name: letting
 * someone change things is always the owner's own choice.
 */
export function changedSet(base: AccessSet, change: SetChange): AccessSet {
  checkChange(change);
  const apps = [...new Set(change.apps ?? base.apps)];
  const named = change.keys ?? {};
  const keys = { ...base.keys };
  for (const [key, asked] of Object.entries(named)) {
    if (asked) keys[key] = asked; else delete keys[key];
  }
  const ticked = appKeys(apps.filter(app => !base.apps.includes(app)));
  for (const { id } of Object.values(ticked).flat()) {
    if (!Object.hasOwn(named, id)) keys[id] ??= "read";
  }
  return { apps, keys };
}
