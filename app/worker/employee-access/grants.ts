// One key's levels, or one area's levels with that area's key levels, for several roles and people in one save.
import { z } from "zod";
import { type Core, AccessError } from "./core.ts";
import { appKeys } from "./key-catalogue.ts";
import { type AccessSet, type SetChange, type SetKind, type Sets, changedSet, levelOrNone, readSets, save, setWrites } from "./sets.ts";

const each = <T extends z.ZodType>(value: T) => ({ roles: z.record(z.string(), value).default({}), people: z.record(z.string(), value).default({}) });
// Roles are named by id and people by email, each with a level or null for None. In the area form, `keys` holds
// per role or person a level for each key the area uses.
const grantSchema = z.union([
  z.object({ key: z.string(), ...each(levelOrNone) }).strict(),
  z.object({ app: z.string(), ...each(levelOrNone), keys: z.object(each(z.record(z.string(), levelOrNone))).strict().optional() }).strict(),
]);
type Grant = z.infer<typeof grantSchema>;
/** One role's or person's id, and their change. */
type Planned = [string, SetChange];

/** Each named role's or person's change. */
function changes(grant: Grant, kind: SetKind): Planned[] {
  if ("key" in grant) {
    const { key } = grant;
    return Object.entries(grant[kind]).map(([id, level]): Planned => [id, { keys: { [key]: level } }]);
  }
  const { app } = grant;
  const given = grant[kind];
  const levels: Record<string, NonNullable<SetChange["keys"]>> = grant.keys?.[kind] ?? {};
  const used = appKeys([app])[app].map(item => item.id);
  // The area's page sets that area's keys only; any other key has its own page.
  if (Object.values(levels).some(named => Object.keys(named).some(key => !used.includes(key)))) throw new AccessError("unknown_key", 400);
  // Someone named only for a key level keeps the area as they hold it.
  return [...new Set([...Object.keys(given), ...Object.keys(levels)])]
    .map((id): Planned => [id, { apps: Object.hasOwn(given, id) ? { [app]: given[id] } : {}, keys: levels[id] }]);
}

/** The set a change starts from. A person with a role has the role's set and nothing else, so they are refused here. */
function baseSet(kind: SetKind, id: string, { people, roles }: Sets): AccessSet {
  if (kind === "roles") {
    const role = roles.find(item => item.id === id);
    if (!role) throw new AccessError("unknown_role", 400);
    return role.set;
  }
  const person = people.find(item => item.email === id && item.status === "active");
  if (!person) throw new AccessError("unknown_person", 400);
  if (person.role) throw new AccessError("person_has_role", 400);
  return person.own;
}

/** Never adds or removes a person, so the sign-in list is not touched and no provider is called. */
export async function changeGrants(core: Core, value: unknown): Promise<void> {
  const parsed = grantSchema.safeParse(value);
  if (!parsed.success) throw new AccessError("invalid_grant", 400);
  const grant = parsed.data;
  const sets = await readSets(core);
  const writes = (["roles", "people"] as const).flatMap(kind => changes(grant, kind).flatMap(([id, change]) => {
    return setWrites(core, kind, id, changedSet(baseSet(kind, id, sets), change));
  }));
  await save(core, ["key" in grant ? "key_level_changed" : "app_access_changed"], writes);
}
