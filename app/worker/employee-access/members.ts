// Local denial and the desired provider generation commit together.
import { z } from "zod";
import { type Core, AccessError, now } from "./core.ts";
const changeSchema = z.object({ email: z.email().transform(value => value.trim().toLowerCase()),
  apps: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).max(200),
  removed: z.boolean() }).strict();
export async function changeMember(core: Core, value: unknown): Promise<void> {
  const parsed = changeSchema.safeParse(value);
  if (!parsed.success) throw new AccessError("invalid_person", 400);
  const member = parsed.data;
  if (member.email === core.pin.ownerEmail) throw new AccessError("owner_cannot_be_changed", 403);
  const catalogue = await core.db.prepare("SELECT app_id FROM wong_access_apps WHERE installation_id = ?")
    .bind(core.pin.installationId).all<{ app_id: string }>();
  if (member.apps.some(app => app === "access" || !catalogue.results.some(row => row.app_id === app))) throw new AccessError("unknown_app", 400);
  const id = core.pin.installationId;
  const revision = "(SELECT revision FROM wong_access_installation WHERE installation_id = ?)";
  const statements = [
    core.db.prepare("UPDATE wong_access_installation SET revision = revision + 1 WHERE installation_id = ?").bind(id),
    core.db.prepare(`INSERT INTO wong_access_members VALUES (?, ?, ?, ?, ${revision}, ?)
      ON CONFLICT(installation_id, email) DO UPDATE SET status = excluded.status,
      project_editing = excluded.project_editing, revision = excluded.revision, changed_at = excluded.changed_at`)
      .bind(id, member.email, member.removed ? "removed" : "active", 0, id, now()),
    core.db.prepare("DELETE FROM wong_access_grants WHERE installation_id = ? AND email = ?").bind(id, member.email),
    ...(!member.removed ? [...new Set(member.apps)].map(app => core.db.prepare(`INSERT INTO wong_access_grants VALUES (?, ?, ?, ${revision})`)
      .bind(id, member.email, app, id)) : []),
    core.db.prepare(`INSERT INTO wong_access_audit SELECT ?, installation_id, ?, ?, revision, ?
      FROM wong_access_installation WHERE installation_id = ?`).bind(crypto.randomUUID(), core.email,
      member.removed ? "person_removed" : "person_changed", now(), id),
  ];
  for (const kind of ["policy", ...(member.removed ? ["sessions"] : [])]) {
    statements.push(core.db.prepare(`INSERT INTO wong_access_work (installation_id, kind, generation, status)
      SELECT installation_id, ?, revision, 'pending' FROM wong_access_installation WHERE installation_id = ?
      ON CONFLICT(installation_id, kind) DO UPDATE SET generation = excluded.generation,
      status = 'pending', error_code = NULL, outcome = NULL`).bind(kind, id));
  }
  await core.db.batch(statements);
}
export async function accessStatus(core: Core): Promise<object> {
  const id = core.pin.installationId;
  const [people, connections, work, policyWrites] = await Promise.all([
    core.db.prepare(`SELECT email, status, revision,
      (SELECT json_group_array(app_id) FROM wong_access_grants g WHERE g.installation_id = m.installation_id AND g.email = m.email) apps
      FROM wong_access_members m WHERE installation_id = ? ORDER BY email`).bind(id).all(),
    core.db.prepare("SELECT provider, status, generation, verified_at, detail FROM wong_access_connections WHERE installation_id = ? AND provider = 'access'").bind(id).all(),
    core.db.prepare("SELECT kind, generation, status, retry_after, error_code, outcome FROM wong_access_work WHERE installation_id = ? AND kind IN ('policy', 'sessions')").bind(id).all(),
    core.db.prepare("SELECT intent_id, generation, status, started_at FROM wong_access_policy_writes WHERE installation_id = ?").bind(id).all(),
  ]);
  const installation = await core.db.prepare("SELECT policy_enabled FROM wong_access_installation WHERE installation_id = ?").bind(id).first<{ policy_enabled: number }>();
  if (!installation) throw new AccessError("installation_mismatch");
  const apps = await core.db.prepare("SELECT app_id FROM wong_access_apps WHERE installation_id = ? ORDER BY app_id").bind(id).all<{ app_id: string }>();
  return { origin: core.pin.origin, ownerEmail: core.email, policyEnabled: installation.policy_enabled === 1, apps: apps.results.map(row => row.app_id).filter(app => app !== "access"), people: people.results, connections: connections.results, work: work.results, policyWrites: policyWrites.results,
    limits: "Downloaded copies, manually granted repository access and independently installed memory remain separate. App session revocation can require remaining people to sign in again." };
}
