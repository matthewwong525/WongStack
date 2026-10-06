// Local denial and the desired provider generation commit together.
import { z } from "zod";
import { type Core, AccessError, now } from "./core.ts";
import { loginAuthority } from "./login-management.ts";
import { areas } from "./catalogue.ts";
import { appKeys, keyCatalogue } from "./key-catalogue.ts";
import { type AccessSet, type Sets, changedSet, heldSet, readSets, save, setFields, setWrites } from "./sets.ts";
import { skills } from "./skills.ts";

// `role` is a role's id, or null for the person's own set; left out, they keep what they have.
// `manager` lets the person manage Access; left out, they keep that too. A removed person is never one.
const changeSchema = z.object({ email: z.email().transform(value => value.trim().toLowerCase()),
  removed: z.boolean(), role: z.string().nullable().optional(), manager: z.boolean().optional(), ...setFields }).strict()
  .refine(change => !(change.removed && change.manager));
type Change = z.infer<typeof changeSchema>;
const nothing = (): AccessSet => ({ apps: {}, keys: {} });

/** The role a save leaves the person with, and their own set when they hold none. Never both. */
function target({ removed, role: asked, apps, keys }: Change, existing: Sets["people"][number] | undefined, roles: Sets["roles"]) {
  if (removed) return { role: null, own: nothing() };
  const role = asked === undefined ? existing?.role ?? null : asked;
  if (role === null) {
    // Moving off a role starts from what the role gave; the named levels apply on top.
    return { role, own: changedSet(existing ? heldSet(existing, roles) : nothing(), { apps, keys }) };
  }
  // A role is the whole answer to what a person has: no exceptions on top.
  if (apps || keys) throw new AccessError("role_with_own_set", 400);
  if (!roles.some(item => item.id === role)) throw new AccessError("unknown_role", 400);
  return { role, own: nothing() };
}

/**
 * Whether a save leaves the person a manager. Only the owner picks managers: anyone else who names the
 * switch, or removes a manager, themselves included, is refused whole. A removal always ends it.
 */
function managing(core: Core, { removed, manager }: Change, was: boolean): boolean {
  if (!core.owner && (manager !== undefined || (removed && was))) throw new AccessError("owner_required", 403);
  return !removed && (manager ?? was);
}

/** The switch is a row: cleared, then written again when it stays on, so a person added back starts without it. */
const managerWrites = (core: Core, email: string, manager: boolean) => [
  core.db.prepare("DELETE FROM wong_access_managers WHERE installation_id = ? AND email = ?").bind(core.installationId, email),
  ...(manager ? [core.db.prepare("INSERT INTO wong_access_managers VALUES (?, ?)").bind(core.installationId, email)] : []),
];

export async function changeMember(core: Core, value: unknown): Promise<void> {
  const parsed = changeSchema.safeParse(value);
  if (!parsed.success) throw new AccessError("invalid_person", 400);
  const member = parsed.data;
  if (member.email === core.email) throw new AccessError("owner_cannot_be_changed", 403);
  const { people, roles } = await readSets(core);
  const existing = people.find(person => person.email === member.email);
  const was = existing?.manager ?? false;
  const manager = managing(core, member, was);
  const { role, own } = target(member, existing, roles);
  const id = core.installationId;
  const status = member.removed ? "removed" : "active";
  const changes = [
    // A person's revision moves only when their sign-in changes, so an app choice never
    // makes someone who can already sign in look unfinished.
    core.db.prepare(`INSERT INTO wong_access_members
      VALUES (?, ?, ?, 0, (SELECT revision FROM wong_access_installation WHERE installation_id = ?), ?)
      ON CONFLICT(installation_id, email) DO UPDATE SET project_editing = 0, changed_at = excluded.changed_at,
      revision = CASE WHEN wong_access_members.status = excluded.status THEN wong_access_members.revision ELSE excluded.revision END,
      status = excluded.status`)
      .bind(id, member.email, status, id, now()),
    ...setWrites(core, "people", member.email, own),
    core.db.prepare("DELETE FROM wong_access_member_roles WHERE installation_id = ? AND email = ?").bind(id, member.email),
    ...(role === null ? [] : [core.db.prepare("INSERT INTO wong_access_member_roles VALUES (?, ?, ?)").bind(id, member.email, role)]),
    ...managerWrites(core, member.email, manager),
  ];
  // Only a change to who may sign in needs the provider, and only the live app has one.
  const kinds = !core.live || existing?.status === status ? [] : ["policy", ...(member.removed ? ["sessions"] : [])];
  for (const kind of kinds) {
    changes.push(core.db.prepare(`INSERT INTO wong_access_work (installation_id, kind, generation, status)
      SELECT installation_id, ?, revision, 'pending' FROM wong_access_installation WHERE installation_id = ?
      ON CONFLICT(installation_id, kind) DO UPDATE SET generation = excluded.generation,
      status = 'pending', error_code = NULL, outcome = NULL`).bind(kind, id));
  }
  await save(core, [member.removed ? "person_removed" : "person_changed", ...(member.keys ? ["key_level_changed"] : []),
    ...(manager === was ? [] : [manager ? "manager_added" : "manager_removed"])], changes);
}

/** What the owner's screen, and a manager's, shows. No key's value is here: only whether each one is saved.
 *  `viewer` is who asked, and whether they are the owner: the screen draws by it, and every save checks again.
 *  `areas` is every area a person can be given, and `skills` what each skill needs: who can run one is worked
 *  out from a set, never stored. */
export async function accessStatus(core: Core): Promise<object> {
  const id = core.installationId;
  // Access itself is everyone's own page, so it is nobody's to give.
  const given = areas().filter(area => area.id !== "access");
  const [installation, { people, roles }, work, notes] = await Promise.all([
    core.db.prepare("SELECT policy_enabled, keys_enabled FROM wong_access_installation WHERE installation_id = ?").bind(id)
      .first<{ policy_enabled: number; keys_enabled: number }>(),
    readSets(core),
    core.db.prepare("SELECT kind, status, outcome, error_code FROM wong_access_work WHERE installation_id = ? AND kind IN ('policy', 'sessions') ORDER BY kind").bind(id).all(),
    // A first-open note stays until the owner changes something.
    core.db.prepare(`SELECT a.event FROM wong_access_audit a
      JOIN wong_access_installation i ON i.installation_id = a.installation_id AND i.revision = a.revision
      WHERE a.installation_id = ? AND (a.event LIKE 'permissions_started:%' OR a.event LIKE 'key_levels_started:%')`).bind(id)
      .all<{ event: string }>(),
  ]);
  if (!installation) throw new AccessError("installation_mismatch");
  const noted = (event: string) => Number(notes.results.find(row => row.event.startsWith(event))?.event.slice(event.length) ?? 0);
  const uses = appKeys(given.map(area => area.id));
  return { ownerEmail: core.email, viewer: { email: core.actor, owner: core.owner },
    environment: core.live ? "live" : "practice",
    // A preview holds no key and never needs one.
    key: !core.live ? "practice" : loginAuthority(core.env) ? "ready" : "missing",
    started: installation.policy_enabled === 1, imported: noted("permissions_started:"),
    // `kept`: how many people kept what their apps use when key levels started.
    keysStarted: installation.keys_enabled === 1, kept: noted("key_levels_started:"),
    areas: given, appKeys: uses, keys: keyCatalogue(core.env, uses), skills: skills(),
    roles: roles.map(role => ({ id: role.id, name: role.name, ...role.set })),
    people: people.map(person => ({ email: person.email, status: person.status, settled: person.settled, role: person.role,
      manager: person.manager, ...heldSet(person, roles) })),
    work: work.results };
}
