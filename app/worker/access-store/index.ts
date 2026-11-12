// The Access store on this app's D1 database: the module's operations over today's tables and SQL, with no table
// change. wiki/stack/employee-access.md
import type { AccessSet, Level, PolicyRow, Store, StoredSets, ToolRow, WorkRow } from "../../../.agents/skills/access/store/interface.mjs";

/** WongStack's own parts that keep their tables beside Access's, such as GitHub pushers, read the same session. */
export type D1AccessStore = Store & { db: D1DatabaseSession; installation(): Promise<string> };

const ADMIN_ROLE = "admin";
const LEASE_MS = 120_000;
// The lease (120 s) and the provider timeout (30 s) bound how long a lost write could still land.
const SETTLED_MS = 150_000;
const now = () => new Date().toISOString();
const json = <T>(value: unknown): T => JSON.parse(String(value)) as T;
// Where each kind of set is stored. Only a person's rows carry the revision that wrote them.
const stamp = ", (SELECT revision FROM wong_access_installation WHERE installation_id = ?1)";
const stores = {
  people: { apps: "wong_access_grants", keys: "wong_access_key_grants", owner: "email", stamp },
  roles: { apps: "wong_access_role_apps", keys: "wong_access_role_keys", owner: "role_id", stamp: "" },
} as const;
type SetKind = keyof typeof stores;
type StoredRow = { apps: string; unticked: string; keys: string };
const setColumns = (kind: SetKind, alias: string) => {
  const { apps, keys, owner } = stores[kind];
  const mine = `installation_id = ${alias}.installation_id AND ${owner} = ${alias}.${owner}`;
  // Only a row at `write` is a given app.
  return `(SELECT json_group_array(app_id) FROM ${apps} WHERE ${mine} AND level = 'write') AS apps,
    (SELECT json_group_array(app_id) FROM ${apps} WHERE ${mine} AND level = 'read') AS unticked,
    (SELECT json_group_object(key_id, level) FROM ${keys} WHERE ${mine}) AS keys`;
};
/** A change-record line, recorded under the person who made it: the owner, or an Admin. */
export const auditStatement = (db: D1DatabaseSession, id: string, actor: string, event: string) => db.prepare(`INSERT INTO wong_access_audit
  SELECT ?, installation_id, ?, ?, revision, ? FROM wong_access_installation WHERE installation_id = ?`)
  .bind(crypto.randomUUID(), actor, event, now(), id);
const storedSet = (row: StoredRow) => ({ apps: json<string[]>(row.apps), unticked: json<string[]>(row.unticked),
  keys: json<Record<string, Level>>(row.keys) });

/** The sign-in wall's names, written on the first row as a record and read by nothing. */
export type Recorded = { workerId?: string; appId?: string; teamDomain?: string; audience?: string };

/** The store over `DB`, read from the primary. One per request. */
export function d1Store(DB: D1Database, recorded: Recorded = {}): D1AccessStore {
  const db = DB.withSession("first-primary");
  let found: string | undefined;
  /** The one installation's id, read once it exists. Every operation but the first open runs after it does. */
  async function installation(): Promise<string> {
    found ??= (await db.prepare("SELECT installation_id FROM wong_access_installation WHERE slot = 1")
      .first<{ installation_id: string }>())?.installation_id;
    if (!found) throw new Error("Access has no installation yet");
    return found;
  }
  const existing = () => installation().catch(() => null);

  const audit = (id: string, actor: string, event: string) => auditStatement(db, id, actor, event);
  /** Every app the project lists stays listed, so a new one shows up unticked. */
  const listing = (id: string, apps: readonly string[]) => apps.map(app =>
    db.prepare("INSERT INTO wong_access_apps VALUES (?, ?) ON CONFLICT DO NOTHING").bind(id, app));
  /** Replace one person's own set, or one role's set, inside the caller's batch. */
  function setWrites(id: string, kind: SetKind, owner: string, set: AccessSet): D1PreparedStatement[] {
    const store = stores[kind];
    return [
      db.prepare(`DELETE FROM ${store.apps} WHERE installation_id = ? AND ${store.owner} = ?`).bind(id, owner),
      db.prepare(`DELETE FROM ${store.keys} WHERE installation_id = ? AND ${store.owner} = ?`).bind(id, owner),
      // A given app is a row at `write`, its table's last column, after a person's revision.
      ...set.apps.map(app => db.prepare(`INSERT INTO ${store.apps} VALUES (?1, ?2, ?3${store.stamp}, 'write')`).bind(id, owner, app)),
      ...Object.entries(set.keys).map(([key, held]) =>
        db.prepare(`INSERT INTO ${store.keys} VALUES (?1, ?2, ?3, ?4${store.stamp})`).bind(id, owner, key, held)),
    ];
  }
  /** One batch per save: the apps listed, the revision moved once, the changes, and a record line per event. A row
   *  left at `read`, from when an app could be held to look only, is never held and is cleared here. */
  async function save(actor: string, apps: readonly string[], events: readonly string[], changes: (id: string) => D1PreparedStatement[]) {
    const id = await installation();
    await db.batch([...listing(id, apps),
      db.prepare("UPDATE wong_access_installation SET revision = revision + 1 WHERE installation_id = ?").bind(id),
      ...changes(id),
      ...[stores.people.apps, stores.roles.apps].map(table =>
        db.prepare(`DELETE FROM ${table} WHERE installation_id = ? AND level = 'read'`).bind(id)),
      ...events.map(event => audit(id, actor, event))]);
  }
  const roleRow = (id: string, email: string, role: string) => db.prepare("INSERT INTO wong_access_member_roles VALUES (?, ?, ?)").bind(id, email, role);
  const clearLevels = (id: string, key: string) => ["wong_access_key_grants", "wong_access_role_keys"].map(table =>
    db.prepare(`DELETE FROM ${table} WHERE installation_id = ? AND key_id = ?`).bind(id, key));
  const leaseCurrent = async (holder: string | undefined) => {
    const row = await db.prepare("SELECT holder FROM wong_access_leases WHERE installation_id = ? AND expires_at > ?")
      .bind(await installation(), now()).first<{ holder: string }>();
    return !!holder && row?.holder === holder;
  };

  return {
    db,
    installation,
    async policy(email): Promise<PolicyRow | null> {
      const row = await db.prepare(`
        SELECT i.policy_enabled, i.keys_enabled, i.revision, m.status, h.role_id AS held,
          CASE WHEN h.role_id IS NULL
            THEN (SELECT json_group_array(g.app_id) FROM wong_access_grants g
              WHERE g.installation_id = i.installation_id AND g.email = m.email AND g.level = 'write')
            ELSE (SELECT json_group_array(r.app_id) FROM wong_access_role_apps r
              WHERE r.installation_id = i.installation_id AND r.role_id = h.role_id AND r.level = 'write') END AS apps,
          CASE WHEN h.role_id IS NULL
            THEN (SELECT json_group_object(g.key_id, g.level) FROM wong_access_key_grants g
              WHERE g.installation_id = i.installation_id AND g.email = m.email)
            ELSE (SELECT json_group_object(r.key_id, r.level) FROM wong_access_role_keys r
              WHERE r.installation_id = i.installation_id AND r.role_id = h.role_id) END AS keys
        FROM wong_access_installation i
        LEFT JOIN wong_access_members m ON m.installation_id = i.installation_id AND m.email = ?
        LEFT JOIN wong_access_member_roles h ON h.installation_id = m.installation_id AND h.email = m.email
        WHERE i.slot = 1`).bind(email).first<{ policy_enabled: number; keys_enabled: number; revision: number;
          status: "active" | "removed" | null; held: string | null; apps: string; keys: string }>();
      if (!row) return null;
      // A switch that is neither on nor off, or a list that is no text, throws, and the rules refuse. A list that is no
      // JSON comes back null: only a caller who needs it is refused. Every other odd value goes to the rules as stored.
      const bit = (value: number) => { if (value !== 0 && value !== 1) throw new Error("unreadable"); return value === 1; };
      const read = <T>(value: unknown): T | null => {
        if (typeof value !== "string") throw new Error("unreadable");
        try { return json<T>(value); } catch { return null; }
      };
      return { started: bit(row.policy_enabled), keysStarted: bit(row.keys_enabled), revision: row.revision, status: row.status,
        role: row.held, apps: read<string[]>(row.apps), keys: read<Record<string, Level>>(row.keys) };
    },
    async open({ origin, owner, subject }) {
      if (await existing()) return;
      const id = crypto.randomUUID();
      await db.batch([
        db.prepare(`INSERT INTO wong_access_installation
          (slot, installation_id, origin, account_id, worker_id, access_app_id, access_policy_id,
           issuer, audience, owner_subject, owner_email, repository_id, repository_name, activated_at)
          VALUES (1, ?, ?, '', ?, ?, '', ?, ?, ?, ?, 1, '', ?) ON CONFLICT(slot) DO NOTHING`).bind(id, origin,
          recorded.workerId ?? "", recorded.appId ?? "", `https://${recorded.teamDomain ?? ""}`, recorded.audience ?? "", subject, owner, now()),
        // The first-seen signed subject is written to the record, never compared.
        db.prepare(`INSERT INTO wong_access_audit SELECT ?, installation_id, owner_email,
          'owner_first_seen:' || owner_subject, revision, activated_at
          FROM wong_access_installation WHERE installation_id = ?`).bind(crypto.randomUUID(), id),
        // Every installation has the Admin role. It goes on the row that won, whichever request wrote it.
        db.prepare(`INSERT INTO wong_access_roles SELECT installation_id, ?, 'Admin', revision
          FROM wong_access_installation WHERE slot = 1 ON CONFLICT DO NOTHING`).bind(ADMIN_ROLE),
      ]);
    },
    async admin(email) {
      const row = await db.prepare(`SELECT h.installation_id FROM wong_access_member_roles h
        JOIN wong_access_installation i ON i.installation_id = h.installation_id AND i.slot = 1
        JOIN wong_access_members m ON m.installation_id = h.installation_id AND m.email = h.email AND m.status = 'active'
        WHERE h.email = ? AND h.role_id = ?`).bind(email, ADMIN_ROLE).first();
      return !!row;
    },
    async installed() {
      return db.prepare("SELECT origin FROM wong_access_installation WHERE slot = 1").first<{ origin: string }>();
    },
    async started() {
      const row = await db.prepare("SELECT policy_enabled, keys_enabled FROM wong_access_installation WHERE slot = 1")
        .first<{ policy_enabled: number; keys_enabled: number }>();
      return { policy: row?.policy_enabled === 1, keys: row?.keys_enabled === 1 };
    },
    async listApps(apps) {
      const id = await existing();
      if (id) await db.batch(listing(id, apps));
    },
    async sets(): Promise<StoredSets> {
      const id = await installation();
      const [people, roles] = await Promise.all([
        db.prepare(`SELECT m.email, m.status,
          m.revision <= COALESCE((SELECT c.generation FROM wong_access_connections c
            WHERE c.installation_id = m.installation_id AND c.provider = 'access'), 1) AS settled,
          (SELECT h.role_id FROM wong_access_member_roles h
            WHERE h.installation_id = m.installation_id AND h.email = m.email) AS role, ${setColumns("people", "m")}
          FROM wong_access_members m WHERE m.installation_id = ? ORDER BY m.email`).bind(id)
          .all<StoredRow & { email: string; status: "active" | "removed"; settled: number; role: string | null }>(),
        db.prepare(`SELECT r.role_id AS id, r.name, ${setColumns("roles", "r")}
          FROM wong_access_roles r WHERE r.installation_id = ? ORDER BY r.role_id = ? DESC, lower(r.name)`).bind(id, ADMIN_ROLE)
          .all<StoredRow & { id: string; name: string }>(),
      ]);
      return {
        people: people.results.map(row => ({ email: row.email, status: row.status, settled: row.settled === 1, role: row.role, ...storedSet(row) })),
        roles: roles.results.map(row => ({ id: row.id, name: row.name, ...storedSet(row) })),
      };
    },
    async savePerson({ actor, apps, email, status, own, role, steps, events }) {
      await save(actor, apps, events, id => [
        // A person's revision moves only when their sign-in changes, so an app choice never makes someone who can
        // already sign in look unfinished.
        db.prepare(`INSERT INTO wong_access_members
          VALUES (?, ?, ?, 0, (SELECT revision FROM wong_access_installation WHERE installation_id = ?), ?)
          ON CONFLICT(installation_id, email) DO UPDATE SET project_editing = 0, changed_at = excluded.changed_at,
          revision = CASE WHEN wong_access_members.status = excluded.status THEN wong_access_members.revision ELSE excluded.revision END,
          status = excluded.status`).bind(id, email, status, id, now()),
        ...setWrites(id, "people", email, own),
        // The role a person holds is a row: cleared, then written again when they hold one. Undefined keeps it.
        ...role === undefined ? [] : [db.prepare("DELETE FROM wong_access_member_roles WHERE installation_id = ? AND email = ?").bind(id, email),
          ...role === null ? [] : [roleRow(id, email, role)]],
        ...steps.map(kind => db.prepare(`INSERT INTO wong_access_work (installation_id, kind, generation, status)
          SELECT installation_id, ?, revision, 'pending' FROM wong_access_installation WHERE installation_id = ?
          ON CONFLICT(installation_id, kind) DO UPDATE SET generation = excluded.generation,
          status = 'pending', error_code = NULL, outcome = NULL, scope = 'both'`).bind(kind, id)),
      ]);
    },
    async saveRole({ actor, apps, id: role, name, set, events }) {
      await save(actor, apps, events, id => [
        db.prepare(`INSERT INTO wong_access_roles
          VALUES (?, ?, ?, (SELECT revision FROM wong_access_installation WHERE installation_id = ?))
          ON CONFLICT(installation_id, role_id) DO UPDATE SET name = excluded.name, revision = excluded.revision`)
          .bind(id, role, name, id),
        ...setWrites(id, "roles", role, set),
      ]);
    },
    async removeRole({ actor, apps, id: role, holders, events }) {
      // Each holder keeps what the role gave, as their own set: tidying up roles locks nobody out.
      await save(actor, apps, events, id => [
        db.prepare("DELETE FROM wong_access_member_roles WHERE installation_id = ? AND role_id = ?").bind(id, role),
        ...holders.flatMap(holder => setWrites(id, "people", holder.email, holder.set)),
        ...setWrites(id, "roles", role, { apps: [], keys: {} }),
        db.prepare("DELETE FROM wong_access_roles WHERE installation_id = ? AND role_id = ?").bind(id, role),
      ]);
    },
    async start({ actor, apps, given, owner, admitted }) {
      const id = await installation();
      const known = await db.prepare("SELECT email FROM wong_access_members WHERE installation_id = ?").bind(id).all<{ email: string }>();
      // The owner needs no row, and a person the owner already added keeps the apps chosen for them.
      const skip = new Set([owner, ...known.results.map(row => row.email)]);
      const fresh = [...new Set(admitted)].filter(email => !skip.has(email));
      await db.batch([
        ...listing(id, apps),
        // Revision 1 marks a person the sign-in list admitted before Access managed it.
        ...fresh.flatMap(email => [
          db.prepare("INSERT INTO wong_access_members VALUES (?, ?, 'active', 0, 1, ?) ON CONFLICT DO NOTHING").bind(id, email, now()),
          ...given.map(app => db.prepare("INSERT INTO wong_access_grants VALUES (?, ?, ?, 1, 'write') ON CONFLICT DO NOTHING").bind(id, email, app)),
        ]),
        db.prepare("UPDATE wong_access_installation SET policy_enabled = 1, revision = revision + 1 WHERE installation_id = ? AND policy_enabled = 0").bind(id),
        audit(id, actor, `permissions_started:${fresh.length}`),
      ]);
      return fresh.length;
    },
    async startKeys() {
      // The revision does not move, so a first-open note from the same request stays.
      await db.prepare("UPDATE wong_access_installation SET keys_enabled = 1 WHERE slot = 1 AND policy_enabled = 1 AND keys_enabled = 0").run();
    },
    async status() {
      const id = await existing();
      if (!id) return null;
      const [state, work, notes] = await Promise.all([
        db.prepare("SELECT policy_enabled, keys_enabled FROM wong_access_installation WHERE installation_id = ?").bind(id)
          .first<{ policy_enabled: number; keys_enabled: number }>(),
        db.prepare("SELECT kind, status, outcome, error_code FROM wong_access_work WHERE installation_id = ? AND kind IN ('policy', 'sessions') ORDER BY kind")
          .bind(id).all<WorkRow>(),
        // A first-open note stays until the owner changes something.
        db.prepare(`SELECT a.event FROM wong_access_audit a
          JOIN wong_access_installation i ON i.installation_id = a.installation_id AND i.revision = a.revision
          WHERE a.installation_id = ? AND a.event LIKE 'permissions_started:%'`).bind(id).all<{ event: string }>(),
      ]);
      return { started: state!.policy_enabled === 1, keysStarted: state!.keys_enabled === 1,
        imported: Number(notes.results[0]?.event.slice("permissions_started:".length) ?? 0), work: work.results };
    },
    async audit(actor, event) {
      const id = await existing();
      if (id) await audit(id, actor, event).run();
    },
    async audited(event) {
      return !!await db.prepare("SELECT 1 FROM wong_access_audit WHERE event = ? LIMIT 1").bind(event).first();
    },

    async lease() {
      const id = await installation();
      const holder = crypto.randomUUID();
      const row = await db.prepare(`INSERT INTO wong_access_leases VALUES (?, ?, ?)
        ON CONFLICT(installation_id) DO UPDATE SET holder = excluded.holder, expires_at = excluded.expires_at
        WHERE wong_access_leases.expires_at < ? RETURNING holder`)
        .bind(id, holder, new Date(Date.now() + LEASE_MS).toISOString(), now()).first<{ holder: string }>();
      return row?.holder === holder ? holder : null;
    },
    async release(holder) {
      await db.prepare("DELETE FROM wong_access_leases WHERE installation_id = ? AND holder = ?").bind(await installation(), holder).run();
    },
    leaseCurrent,
    async step(kind) {
      return db.prepare("SELECT generation, status, scope FROM wong_access_work WHERE installation_id = ? AND kind = ?")
        .bind(await installation(), kind).first();
    },
    async stepFailed({ kind, generation, code }) {
      await db.prepare(`UPDATE wong_access_work SET status = 'failed', retry_after = ?, error_code = ?, outcome = NULL
        WHERE installation_id = ? AND kind = ? AND generation = ?`).bind(new Date(Date.now() + 30_000).toISOString(),
        code, await installation(), kind, generation).run();
    },
    async stepStale(kind) {
      await db.prepare("UPDATE wong_access_work SET status = 'pending', outcome = NULL WHERE installation_id = ? AND kind = ?")
        .bind(await installation(), kind).run();
    },
    async stepUnresolved() {
      await db.prepare("UPDATE wong_access_work SET status = 'pending', outcome = 'previous_policy_write_unresolved' WHERE installation_id = ? AND kind = 'policy'")
        .bind(await installation()).run();
    },
    async stepDone({ kind, generation, holder, outcome }) {
      const id = await installation();
      await db.batch([
        db.prepare(`UPDATE wong_access_work SET status = 'ready', retry_after = NULL, error_code = NULL, outcome = ?
          WHERE installation_id = ? AND kind = ? AND generation = ?
            AND EXISTS(SELECT 1 FROM wong_access_leases WHERE installation_id = ? AND holder = ? AND expires_at > ?)
            AND (? != 'policy' OR NOT EXISTS(SELECT 1 FROM wong_access_policy_writes WHERE installation_id = ? AND status != 'completed'))`)
          .bind(outcome, id, kind, generation, id, holder, now(), kind, id),
        // The newest generation the sign-in list is known to match: each person's state reads from it.
        db.prepare(`INSERT INTO wong_access_connections (installation_id, provider, status, generation, verified_at)
          SELECT installation_id, 'access', 'ready', generation, ? FROM wong_access_work
          WHERE installation_id = ? AND kind = 'policy' AND generation = ? AND status = 'ready' AND ? = 'policy'
          ON CONFLICT(installation_id, provider) DO UPDATE SET status = 'ready', sealed_material = NULL,
            generation = MAX(wong_access_connections.generation, excluded.generation), verified_at = excluded.verified_at`)
          .bind(now(), id, generation, kind),
      ]);
    },
    async stepWaiting() {
      return !!await db.prepare("SELECT 1 FROM wong_access_work WHERE installation_id = ? AND kind = 'policy' AND status != 'ready'")
        .bind(await installation()).first();
    },
    async beginWrite({ generation, holder }) {
      const id = await installation();
      const intent = crypto.randomUUID();
      await db.batch([
        db.prepare(`INSERT INTO wong_access_policy_writes SELECT ?, ?, ?, 'in_flight', ?
          WHERE EXISTS(SELECT 1 FROM wong_access_leases WHERE installation_id = ? AND holder = ? AND expires_at > ?)
            AND EXISTS(SELECT 1 FROM wong_access_work WHERE installation_id = ? AND kind = 'policy' AND generation = ?)`)
          .bind(intent, id, generation, now(), id, holder, now(), id, generation),
        db.prepare(`UPDATE wong_access_work SET status = 'pending', outcome = NULL WHERE installation_id = ? AND kind = 'policy'
          AND EXISTS(SELECT 1 FROM wong_access_policy_writes WHERE intent_id = ?)`).bind(id, intent),
      ]);
      const admitted = await db.prepare(`SELECT w.generation FROM wong_access_work w
        JOIN wong_access_policy_writes p ON p.installation_id = w.installation_id
        WHERE p.intent_id = ? AND w.kind = 'policy'`).bind(intent).first<{ generation: number }>();
      if (admitted?.generation === generation && await leaseCurrent(holder)) return intent;
      // No call has begun, so this intent has no unknown outcome.
      await db.prepare("UPDATE wong_access_policy_writes SET status = 'completed' WHERE intent_id = ?").bind(intent).run();
      return null;
    },
    async endWrite(intent, status) {
      await db.prepare(status === "completed" ? "UPDATE wong_access_policy_writes SET status = 'completed' WHERE intent_id = ?"
        : "UPDATE wong_access_policy_writes SET status = 'unknown' WHERE intent_id = ? AND status = 'in_flight'").bind(intent).run();
    },
    async unresolvedWrites() {
      const id = await installation();
      await db.prepare(`UPDATE wong_access_policy_writes SET status = 'completed'
        WHERE installation_id = ? AND status != 'completed' AND started_at < ?`).bind(id, new Date(Date.now() - SETTLED_MS).toISOString()).run();
      const row = await db.prepare("SELECT COUNT(*) pending FROM wong_access_policy_writes WHERE installation_id = ? AND status != 'completed'")
        .bind(id).first<{ pending: number }>();
      return row!.pending > 0;
    },
    async listed() {
      const rows = await db.prepare("SELECT email FROM wong_access_members WHERE installation_id = ? AND status = 'active'")
        .bind(await installation()).all<{ email: string }>();
      return rows.results.map(row => row.email);
    },

    async tools() {
      return (await db.prepare("SELECT id, title, purpose, docs, forward_json, levels_json FROM tools ORDER BY id").all<ToolRow>()).results;
    },
    async saveTool({ row, actor, clearLevels: clear }) {
      const id = await installation();
      await db.batch([...clear ? clearLevels(id, row.id) : [], db.prepare(`INSERT INTO tools VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET
        title = excluded.title, purpose = excluded.purpose, docs = excluded.docs, forward_json = excluded.forward_json,
        levels_json = excluded.levels_json, added_by = excluded.added_by, added_at = excluded.added_at`)
        .bind(row.id, row.title, row.purpose, row.docs, row.forward_json, row.levels_json, actor, now()), audit(id, actor, "tool_saved")]);
    },
    async removeTool(tool, actor) {
      const id = await installation();
      await db.batch([db.prepare("DELETE FROM tools WHERE id = ?").bind(tool), ...clearLevels(id, tool), audit(id, actor, "tool_removed")]);
    },
    async sealed() {
      const rows = await db.prepare("SELECT name, ends FROM sealed_keys").all<{ name: string; ends: string }>();
      return new Map(rows.results.map(row => [row.name, row.ends]));
    },
    async saveSealed({ name, sealed, ends, actor }) {
      // A newer key for the same name replaces a waiting one. The record names the key and who sent it, never its
      // value.
      await db.batch([db.prepare(`INSERT INTO sealed_keys VALUES (?, ?, ?, ?, ?) ON CONFLICT(name) DO UPDATE SET
        sealed = excluded.sealed, ends = excluded.ends, sent_by = excluded.sent_by, sent_at = excluded.sent_at`)
        .bind(name, sealed, ends, actor, Date.now()), audit(await installation(), actor, `key_sent:${name}`)]);
    },
  };
}
