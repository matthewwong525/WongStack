// Local denial and the desired provider generation commit together.
import { z } from "zod";
import { type Core, AccessError, now } from "./core.ts";
import { catalogue } from "./catalogue.ts";
import { loginAuthority } from "./login-management.ts";
const changeSchema = z.object({ email: z.email().transform(value => value.trim().toLowerCase()),
  apps: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).max(200),
  removed: z.boolean() }).strict();
/** Every built app a person can be given; Access itself is everyone's own setup page. */
export const businessApps = () => catalogue.filter(app => app !== "access");
/** Owner reads and saves keep every built app listed, so a new app shows up unticked. */
export const catalogueWrites = (core: Core) => catalogue.map(app =>
  core.db.prepare("INSERT INTO wong_access_apps VALUES (?, ?) ON CONFLICT DO NOTHING").bind(core.installationId, app));

export async function changeMember(core: Core, value: unknown): Promise<void> {
  const parsed = changeSchema.safeParse(value);
  if (!parsed.success) throw new AccessError("invalid_person", 400);
  const member = parsed.data;
  if (member.email === core.email) throw new AccessError("owner_cannot_be_changed", 403);
  if (member.apps.some(app => !businessApps().includes(app))) throw new AccessError("unknown_app", 400);
  const id = core.installationId;
  const status = member.removed ? "removed" : "active";
  const existing = await core.db.prepare("SELECT status FROM wong_access_members WHERE installation_id = ? AND email = ?")
    .bind(id, member.email).first<{ status: string }>();
  const revision = "(SELECT revision FROM wong_access_installation WHERE installation_id = ?)";
  const statements = [
    ...catalogueWrites(core),
    core.db.prepare("UPDATE wong_access_installation SET revision = revision + 1 WHERE installation_id = ?").bind(id),
    // A person's revision moves only when their sign-in changes, so an app choice never
    // makes someone who can already sign in look unfinished.
    core.db.prepare(`INSERT INTO wong_access_members VALUES (?, ?, ?, 0, ${revision}, ?)
      ON CONFLICT(installation_id, email) DO UPDATE SET project_editing = 0, changed_at = excluded.changed_at,
      revision = CASE WHEN wong_access_members.status = excluded.status THEN wong_access_members.revision ELSE excluded.revision END,
      status = excluded.status`)
      .bind(id, member.email, status, id, now()),
    core.db.prepare("DELETE FROM wong_access_grants WHERE installation_id = ? AND email = ?").bind(id, member.email),
    ...(!member.removed ? [...new Set(member.apps)].map(app => core.db.prepare(`INSERT INTO wong_access_grants VALUES (?, ?, ?, ${revision})`)
      .bind(id, member.email, app, id)) : []),
    core.db.prepare(`INSERT INTO wong_access_audit SELECT ?, installation_id, ?, ?, revision, ?
      FROM wong_access_installation WHERE installation_id = ?`).bind(crypto.randomUUID(), core.email,
      member.removed ? "person_removed" : "person_changed", now(), id),
  ];
  // Only a change to who may sign in needs the provider, and only the live app has one.
  const kinds = !core.live || existing?.status === status ? [] : ["policy", ...(member.removed ? ["sessions"] : [])];
  for (const kind of kinds) {
    statements.push(core.db.prepare(`INSERT INTO wong_access_work (installation_id, kind, generation, status)
      SELECT installation_id, ?, revision, 'pending' FROM wong_access_installation WHERE installation_id = ?
      ON CONFLICT(installation_id, kind) DO UPDATE SET generation = excluded.generation,
      status = 'pending', error_code = NULL, outcome = NULL`).bind(kind, id));
  }
  await core.db.batch(statements);
}

/** What the owner's screen shows. `settled` is true once the sign-in list matches a person's last change. */
export async function accessStatus(core: Core): Promise<object> {
  const id = core.installationId;
  const apps = businessApps();
  const [installation, people, work, firstOpen] = await Promise.all([
    core.db.prepare("SELECT policy_enabled FROM wong_access_installation WHERE installation_id = ?").bind(id).first<{ policy_enabled: number }>(),
    core.db.prepare(`SELECT m.email, m.status,
      m.revision <= COALESCE((SELECT c.generation FROM wong_access_connections c
        WHERE c.installation_id = m.installation_id AND c.provider = 'access'), 1) AS settled,
      (SELECT json_group_array(g.app_id) FROM wong_access_grants g WHERE g.installation_id = m.installation_id AND g.email = m.email) AS apps
      FROM wong_access_members m WHERE m.installation_id = ? ORDER BY m.email`).bind(id)
      .all<{ email: string; status: string; settled: number; apps: string }>(),
    core.db.prepare("SELECT kind, status, outcome, error_code FROM wong_access_work WHERE installation_id = ? AND kind IN ('policy', 'sessions') ORDER BY kind").bind(id).all(),
    // The first-open note stays until the owner changes someone.
    core.db.prepare(`SELECT CAST(substr(a.event, 21) AS INTEGER) AS imported FROM wong_access_audit a
      JOIN wong_access_installation i ON i.installation_id = a.installation_id AND i.revision = a.revision
      WHERE a.installation_id = ? AND a.event LIKE 'permissions_started:%'`).bind(id).first<{ imported: number }>(),
  ]);
  if (!installation) throw new AccessError("installation_mismatch");
  return { origin: core.origin, ownerEmail: core.email, environment: core.live ? "live" : "practice",
    // A preview holds no key and never needs one.
    key: !core.live ? "practice" : loginAuthority(core.env) ? "ready" : "missing",
    started: installation.policy_enabled === 1, imported: firstOpen?.imported ?? 0, apps,
    people: people.results.map(person => ({ email: person.email, status: person.status, settled: person.settled === 1,
      apps: z.array(z.string()).parse(JSON.parse(person.apps)).filter(app => apps.includes(app)) })),
    work: work.results };
}
