// Whose rows a call reads. The live line's Worker imports only this, never `store.ts`, whose actions pull in the app's
// list of mini apps, which only the app's build can bundle. wiki/stack/live-line.md

/** Whose rows a call reads, and `wake`: after a write, tell the person's open inbox, and their computer, to look now.
 *  `wake()` reaches every computer, `wake(id)` that one, `wake(null)` the inbox alone. */
export type Scope = { db: D1DatabaseSession; installation: string; email: string; now: number; wake: (computer?: string | null) => Promise<void> };

/** `sql` bound to the caller's installation as ?1 and email as ?2, then `values` from ?3. */
export const mine = (at: Pick<Scope, "db" | "installation" | "email">, sql: string, ...values: (string | number | null)[]) =>
  at.db.prepare(sql).bind(at.installation, at.email, ...values);

/** Notes that the caller's computer is here now: a check-in, a claim, or a hello on its line. */
export const seen = (at: Pick<Scope, "db" | "installation" | "email" | "now">) => mine(at, `INSERT INTO inbox_seen
  (installation_id, email, last_checkin_at) VALUES (?1, ?2, ?3)
  ON CONFLICT (installation_id, email) DO UPDATE SET last_checkin_at = excluded.last_checkin_at`, at.now).run();
