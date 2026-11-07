// Permissions, then key levels, start by themselves at the owner's first open, and take nothing away.
import { ZodError } from "zod";
import { type Core, AccessError, now, permissionsStarted } from "./core.ts";
import { admittedEmails, loginAuthority } from "./login-management.ts";
import { audit, businessApps, catalogueWrites } from "./sets.ts";

/** On the live app, everyone the sign-in list already admits becomes a person with every built app, and the switch
 *  turns on, in one batch. A missing key or a failed read changes nothing; a failed read logs, then returns why. */
export async function startPermissions(core: Core): Promise<string | null> {
  if (await permissionsStarted(core)) return null;
  let admitted: string[] = [];
  if (core.live) {
    const authority = loginAuthority(core.env);
    if (!authority) return null;
    try { admitted = await admittedEmails(core, authority); }
    catch (failure) {
      // A schema mismatch is an answer this app could not parse, such as a field it did not expect; any other throw,
      // such as the provider's timeout or a failed connection, means Cloudflare did not answer.
      const error = failure instanceof AccessError ? failure.code
        : failure instanceof ZodError ? "login_policy_unreadable" : "provider_unavailable";
      console.log(JSON.stringify({ event: "permissions_start_failed", error }));
      return error;
    }
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
  return null;
}

/** Once permissions have started, key levels turn on and nothing else changes: nobody is given a level, and a level
 *  already held is kept. The revision does not move, so a first-open note from the same request stays. */
export async function startKeyLevels(core: Core): Promise<void> {
  await core.db.prepare("UPDATE wong_access_installation SET keys_enabled = 1 WHERE installation_id = ? AND policy_enabled = 1 AND keys_enabled = 0")
    .bind(core.installationId).run();
}
