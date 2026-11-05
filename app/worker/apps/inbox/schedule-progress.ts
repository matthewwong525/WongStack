import { z } from "zod";
import { fail, inboxAction, mine, type Scope } from "./store.ts";
import { runId, scheduleKey } from "./schedule-store.ts";

/** A run's continuation may be this large. */
const PROGRESS_BYTES = 65536;
/** A claim older than its run's time limit, or an hour, and this much more is a run that died: a newer run takes it. */
const GRACE_MS = 10 * 60_000;
const DEFAULT_MINUTES = 60;

const claim = z.strictObject({ run: z.string(), at: z.number() }).nullable();
const held = z.strictObject({ progress: z.unknown(), claim });
type Row = { progress_json: string | null; progress_claim: string | null; progress_claimed_at: number | null };

const findProgress = (at: Scope, key: string) => mine(at, `SELECT progress_json, progress_claim, progress_claimed_at FROM schedules
  WHERE installation_id = ?1 AND email = ?2 AND key = ?3 AND host = 'app'`, key).first<Row>();
const shown = (row: Row) => ({ progress: row.progress_json === null ? null : JSON.parse(row.progress_json),
  claim: row.progress_claim === null ? null : { run: row.progress_claim, at: row.progress_claimed_at! } });

/** GET schedule-progress?key= → a schedule's continuation, and the run that holds it now. */
export const scheduleProgress = inboxAction<{ key: string }>({
  operationId: "inbox.schedule-progress", summary: "Read a schedule's progress", description: "What a schedule's runs left for the next one, and which run holds it.",
  input: z.strictObject({ key: scheduleKey.describe("The schedule's key.") }), output: held, encoding: "query", effect: "read",
  async run(at, { key }) {
    const row = await findProgress(at, key);
    return row ? Response.json(shown(row)) : fail("not_found", 404);
  },
});

/** PUT schedule-progress → the run that holds a schedule's progress writes it. With no run, only a first copy goes in:
 *  the move's progress from an old record, while no run holds it and none was written. */
export const scheduleProgressPut = inboxAction<{ key: string; run?: string; progress: unknown }>({
  operationId: "inbox.schedule-progress-put", summary: "Write a schedule's progress", description: "The run holding a schedule's progress saves it for the next run.",
  input: z.strictObject({ key: scheduleKey.describe("The schedule's key."),
    run: runId.optional().describe("The run that holds the progress; none for a first copy."), progress: z.unknown().describe("The continuation, as JSON.") }),
  output: held, encoding: "json", effect: "write", limits: { inputBytes: PROGRESS_BYTES + 4096, outputBytes: PROGRESS_BYTES + 4096, timeoutMs: 15000 },
  async run(at, { key, run, progress }) {
    const text = JSON.stringify(progress ?? null);
    if (new TextEncoder().encode(text).byteLength > PROGRESS_BYTES) return fail("too_large", 413);
    const holder = run === undefined ? "progress_claim IS NULL AND progress_json IS NULL AND ?4 IS NULL" : "progress_claim = ?4";
    const row = await mine(at, `UPDATE schedules SET progress_json = ?5, updated_at = ?6 WHERE installation_id = ?1 AND email = ?2 AND key = ?3
      AND host = 'app' AND ${holder} RETURNING progress_json, progress_claim, progress_claimed_at`, key, run ?? null, text, at.now).first<Row>();
    if (row) return Response.json(shown(row));
    return (await findProgress(at, key)) ? fail("not_claimed", 409) : fail("not_found", 404);
  },
});

/** POST schedule-progress-claim → one run at a time holds a schedule's progress. A newer run of the same schedule takes
 *  the claim of one that died; `release` gives it back. */
export const scheduleProgressClaim = inboxAction<{ key: string; run: string; release?: boolean }>({
  operationId: "inbox.schedule-progress-claim", summary: "Claim a schedule's progress", description: "Take or give back the one claim on a schedule's progress.",
  input: z.strictObject({ key: scheduleKey.describe("The schedule's key."), run: runId.describe("The run that asks."),
    release: z.boolean().optional().describe("Give the claim back.") }),
  output: z.strictObject({ claimed: z.boolean() }), encoding: "json", effect: "write",
  async run(at, { key, run, release }) {
    const asking = await mine(at, `SELECT due_at FROM schedule_runs WHERE installation_id = ?1 AND email = ?2 AND id = ?3 AND key = ?4
      AND state IN ('taken', 'started')`, run, key).first<{ due_at: number }>();
    if (!asking || !(await findProgress(at, key))) return fail("not_found", 404);
    if (release) {
      await mine(at, `UPDATE schedules SET progress_claim = NULL, progress_claimed_at = NULL, updated_at = ?5 WHERE installation_id = ?1
        AND email = ?2 AND key = ?3 AND progress_claim = ?4`, key, run, at.now).run();
      return Response.json({ claimed: false });
    }
    const taken = await mine(at, `UPDATE schedules SET progress_claim = ?4, progress_claimed_at = ?5, updated_at = ?5
      WHERE installation_id = ?1 AND email = ?2 AND key = ?3 AND (progress_claim IS NULL OR progress_claim = ?4
        OR (progress_claimed_at <= ?5 - (COALESCE(json_extract(run_json, '$.minutes'), ?7) * 60000 + ?8)
          AND COALESCE((SELECT r.due_at FROM schedule_runs r WHERE r.installation_id = ?1 AND r.email = ?2 AND r.id = progress_claim), -1) < ?6))
      RETURNING progress_claim`, key, run, at.now, asking.due_at, DEFAULT_MINUTES, GRACE_MS).first();
    return Response.json({ claimed: taken !== null });
  },
});
