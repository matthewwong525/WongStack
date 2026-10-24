import { z } from "zod";
import { fail, inboxAction, mine, type Scope } from "./store.ts";
import { findRun, findSchedule, firstRun, newId, run, RUN_COLUMNS, type RunRow, runId, runShown, schedule, scheduleKey, type ScheduleRow,
  settleRuns, shown } from "./schedule-store.ts";

const byKey = z.strictObject({ key: scheduleKey.describe("The schedule's key.") });

/** The caller's schedule on the app's clock, or the answer that says why not: unknown, or copied from Paseo. */
async function appSchedule(at: Scope, key: string): Promise<ScheduleRow | Response> {
  const row = await findSchedule(at, key);
  if (!row) return fail("not_found", 404);
  return row.host === "app" ? row : fail("not_app", 409);
}

/** One schedule action on the app's clock: `change` runs on the found schedule, then its computer hears look. */
const control = (name: string, summary: string, description: string, change: (at: Scope, row: ScheduleRow) => Promise<unknown>) =>
  inboxAction<{ key: string }>({
    operationId: `inbox.schedule-${name}`, summary, description, input: byKey, output: z.strictObject({ schedule }), encoding: "json", effect: "write",
    async run(at, { key }) {
      const row = await appSchedule(at, key);
      if (row instanceof Response) return row;
      await change(at, row);
      await at.wake(row.computer_id);
      return Response.json({ schedule: shown((await findSchedule(at, key))!) });
    },
  });

/** POST pause → stops a schedule's clock and cancels its waiting run. */
export const pause = control("pause", "Pause a schedule", "Stop a schedule until it is resumed; a run waiting for the computer is cancelled.",
  (at, row) => at.db.batch([
    mine(at, `UPDATE schedules SET state = 'paused', next_run_at = NULL, updated_at = ?4 WHERE installation_id = ?1 AND email = ?2
      AND key = ?3`, row.key, at.now),
    mine(at, `UPDATE schedule_runs SET state = 'cancelled', updated_at = ?4 WHERE installation_id = ?1 AND email = ?2 AND key = ?3
      AND state = 'due'`, row.key, at.now),
  ]));

/** POST resume → starts a schedule's clock again from now: times passed while paused start nothing. */
export const resume = control("resume", "Resume a schedule", "Start a paused schedule's clock again from now.",
  (at, row) => mine(at, `UPDATE schedules SET state = 'on', next_run_at = ?4, updated_at = ?5 WHERE installation_id = ?1 AND email = ?2
    AND key = ?3`, row.key, firstRun(JSON.parse(row.timing_json), at.now), at.now).run());

/** POST delete → removes a schedule from the app's clock, with its runs. Its record on the computer stays. */
export const scheduleDelete = inboxAction<{ key: string }>({
  operationId: "inbox.schedule-delete", summary: "Delete a schedule", description: "Take a schedule off the app's clock, with its runs.",
  input: byKey, output: z.strictObject({ deleted: z.literal(true) }), encoding: "json", effect: "write",
  async run(at, { key }) {
    const row = await appSchedule(at, key);
    if (row instanceof Response) return row;
    await at.db.batch([
      mine(at, "DELETE FROM schedule_runs WHERE installation_id = ?1 AND email = ?2 AND key = ?3", key),
      mine(at, "DELETE FROM schedules WHERE installation_id = ?1 AND email = ?2 AND key = ?3", key),
    ]);
    await at.wake(row.computer_id);
    return Response.json({ deleted: true });
  },
});

/** Whether a run started within the schedule's least gap between runs. */
async function tooSoon(at: Scope, row: ScheduleRow) {
  const last = (await mine(at, `SELECT MAX(due_at) AS at FROM schedule_runs WHERE installation_id = ?1 AND email = ?2 AND key = ?3
    AND state = 'started'`, row.key).first<{ at: number | null }>())!.at;
  return row.min_interval_ms !== null && last !== null && at.now - last < row.min_interval_ms;
}

/** POST run-now → asks the schedule's computer to run it now. The run waits until the computer takes it or the person
 *  cancels it; it never goes late. */
export const runNow = inboxAction<{ key: string }>({
  operationId: "inbox.run-now", summary: "Run a schedule now", description: "Ask the schedule's computer to start it now, once.",
  input: byKey, output: z.strictObject({ run }), encoding: "json", effect: "write",
  async run(at, { key }) {
    await settleRuns(at);
    const row = await appSchedule(at, key);
    if (row instanceof Response) return row;
    if (row.state === "paused") return fail("paused", 409);
    if (row.waiting !== null) return fail("already_waiting", 409);
    if (await tooSoon(at, row)) return fail("too_soon", 429);
    const id = newId();
    await mine(at, `INSERT INTO schedule_runs (installation_id, email, id, key, due_at, source, state, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, 'now', 'due', ?5)`, id, key, at.now).run();
    await at.wake(row.computer_id);
    return Response.json({ run: runShown((await findRun(at, id))!) });
  },
});

/** POST run-cancel → cancels a run still waiting for the computer; one it took goes on. */
export const runCancel = inboxAction<{ id: string }>({
  operationId: "inbox.run-cancel", summary: "Cancel a waiting run", description: "Cancel a run the computer has not taken yet.",
  input: z.strictObject({ id: runId.describe("The run's id.") }), output: z.strictObject({ run }), encoding: "json", effect: "write",
  async run(at, { id }) {
    const cancelled = await mine(at, `UPDATE schedule_runs SET state = 'cancelled', updated_at = ?4 WHERE installation_id = ?1 AND email = ?2
      AND id = ?3 AND state = 'due' RETURNING ${RUN_COLUMNS}`, id, at.now).first<RunRow>();
    if (!cancelled) return (await findRun(at, id)) ? fail("not_waiting", 409) : fail("not_found", 404);
    await at.wake(null);
    return Response.json({ run: runShown(cancelled) });
  },
});
