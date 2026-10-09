// Permissions, then key levels, start by themselves at the owner's first open, and take nothing away.
import { type Core, now, permissionsStarted } from "./core.ts";
import { admittedEmails, loginAuthority } from "./login-management.ts";
import { audit, businessApps, catalogueWrites } from "./sets.ts";

/**
 * On the live app, everyone the sign-in list already admits becomes a person with every
 * built app, and the switch turns on, in one batch. A missing key or a failed read changes
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
 * Once permissions have started, key levels turn on, and nothing else changes: nobody is given a level, since
 * an app needs none, and a level already held is kept. The revision does not move, so a first-open note from
 * the same request stays.
 */
export async function startKeyLevels(core: Core): Promise<void> {
  await core.db.prepare("UPDATE wong_access_installation SET keys_enabled = 1 WHERE installation_id = ? AND policy_enabled = 1 AND keys_enabled = 0")
    .bind(core.installationId).run();
}
