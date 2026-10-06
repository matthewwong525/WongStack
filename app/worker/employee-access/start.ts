// Permissions, then key levels, start by themselves at the owner's first open, and take nothing away.
// Area levels have no start of their own: an area held before them reads as Look up & change.
import { type Core, now, permissionsStarted } from "./core.ts";
import { admittedEmails, loginAuthority } from "./login-management.ts";
import { needs } from "./key-catalogue.ts";
import { heldLevels } from "./key-levels.ts";
import { audit, businessApps, catalogueWrites, readSets, setWrites } from "./sets.ts";

/**
 * On the live app, everyone the sign-in list already admits becomes a person with every
 * built area at Look up & change, and the switch turns on, in one batch. A missing key or a failed read changes
 * nothing, so nobody is locked out. A preview starts with no import and no provider call.
 */
export async function startPermissions(core: Core): Promise<void> {
  if (await permissionsStarted(core)) return;
  let admitted: string[] = [];
  if (core.live) {
    const authority = loginAuthority(core.env);
    if (!authority) return;
    try { admitted = await admittedEmails(core, authority); }
    catch { return; }
  }
  const id = core.installationId;
  const known = await core.db.prepare("SELECT email FROM wong_access_members WHERE installation_id = ?")
    .bind(id).all<{ email: string }>();
  // The owner needs no row, and a person the owner already added keeps the apps chosen for them.
  const skip = new Set([core.email, ...known.results.map(row => row.email)]);
  const fresh = [...new Set(admitted)].filter(email => !skip.has(email));
  await core.db.batch([
    ...catalogueWrites(core),
    // Revision 1 marks a person the sign-in list admitted before Access managed it.
    ...fresh.flatMap(email => [
      core.db.prepare("INSERT INTO wong_access_members VALUES (?, ?, 'active', 0, 1, ?) ON CONFLICT DO NOTHING").bind(id, email, now()),
      ...businessApps().map(app => core.db.prepare("INSERT INTO wong_access_grants VALUES (?, ?, ?, 1, 'write') ON CONFLICT DO NOTHING").bind(id, email, app)),
    ]),
    core.db.prepare("UPDATE wong_access_installation SET policy_enabled = 1, revision = revision + 1 WHERE installation_id = ? AND policy_enabled = 0").bind(id),
    audit(core, `permissions_started:${fresh.length}`),
  ]);
}

/**
 * Once permissions have started, each person keeps, for every saved key their apps use, the level
 * those apps use, as their own set, and key levels turn on, in one batch. A key that only works
 * alone is given to nobody, and nobody is given a role. A failed batch changes nothing, so levels
 * stay off. The revision does not move, so a first-open note from the same request stays.
 */
export async function startKeyLevels(core: Core): Promise<void> {
  const id = core.installationId;
  const switches = await core.db.prepare("SELECT policy_enabled, keys_enabled FROM wong_access_installation WHERE installation_id = ?")
    .bind(id).first<{ policy_enabled: number; keys_enabled: number }>();
  if (!switches?.policy_enabled || switches.keys_enabled) return;
  const { people } = await readSets(core);
  const kept = people.filter(person => person.status === "active" && !person.role);
  await core.db.batch([
    ...catalogueWrites(core),
    // A level the owner already chose stays as chosen.
    ...kept.flatMap(person => setWrites(core, "people", person.email, { apps: person.own.apps,
      keys: { ...Object.fromEntries(heldLevels(Object.fromEntries(needs(Object.keys(person.own.apps))))), ...person.own.keys } })),
    core.db.prepare("UPDATE wong_access_installation SET keys_enabled = 1 WHERE installation_id = ? AND keys_enabled = 0").bind(id),
    audit(core, `key_levels_started:${kept.length}`),
  ]);
}
