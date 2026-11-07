import { z } from "zod";
import { fail, inboxAction, mine, online } from "./store.ts";
import { findSchedule, NOT_QUIET, run, RUN_COLUMNS, type RunRow, runShown, schedule, SCHEDULE_COLUMNS, scheduleKey, type ScheduleRow, settleRuns,
  shown } from "./schedule-store.ts";

/** GET schedules → the caller's schedules, on the app's clock or copied from Paseo, and if their computer is on. */
export const schedules = inboxAction({
  operationId: "inbox.schedules", summary: "List your schedules", description: "The signed-in person's schedules, each with its last run and the one waiting.",
  input: z.strictObject({}), output: z.strictObject({ schedules: z.array(schedule), computerOnline: z.boolean() }), encoding: "none", effect: "read",
  // Two hundred schedules at their longest words and instructions, each with two runs.
  limits: { inputBytes: 65536, outputBytes: 4194304, timeoutMs: 15000 },
  async run(at) {
    await settleRuns(at);
    const { results } = await mine(at, `SELECT ${SCHEDULE_COLUMNS} FROM schedules s WHERE installation_id = ?1 AND email = ?2
      ORDER BY s.name, s.key LIMIT 200`).all<ScheduleRow>();
    return Response.json({ schedules: results.map(shown), computerOnline: await online(at) });
  },
});

/** GET schedule?key= → one of the caller's schedules, its ten newest runs that found work, and `quiet`: the runs that
 *  found none since the oldest one shown, so a check every few minutes never buries the runs that did something. */
export const scheduleDetail = inboxAction<{ key: string }>({
  operationId: "inbox.schedule", summary: "Show a schedule", description: "One schedule, its ten newest runs that found work, newest first, and the count of quiet ones.",
  input: z.strictObject({ key: scheduleKey.describe("The schedule's key.") }),
  output: z.strictObject({ schedule, runs: z.array(run), quiet: z.number().int().nonnegative() }),
  encoding: "query", effect: "read",
  async run(at, { key }) {
    await settleRuns(at);
    const found = await findSchedule(at, key);
    if (!found) return fail("not_found", 404);
    const { results } = await mine(at, `SELECT ${RUN_COLUMNS} FROM schedule_runs WHERE installation_id = ?1 AND email = ?2 AND key = ?3
      AND ${NOT_QUIET} ORDER BY due_at DESC, rowid DESC LIMIT 10`, key).all<RunRow>();
    // A short list holds every run that found work, so every quiet run counts.
    const since = results.length === 10 ? results[9].due_at : 0;
    const { results: [counted] } = await mine(at, `SELECT COUNT(*) AS quiet FROM schedule_runs WHERE installation_id = ?1 AND email = ?2
      AND key = ?3 AND NOT ${NOT_QUIET} AND due_at >= ?4`, key, since).all<{ quiet: number }>();
    return Response.json({ schedule: shown(found), runs: results.map(runShown), quiet: counted.quiet });
  },
});
