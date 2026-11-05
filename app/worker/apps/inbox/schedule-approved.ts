import { z } from "zod";
import { fail, inboxAction, mine } from "./store.ts";
import { computerId, findSchedule, firstRun, schedule, scheduleKey, shown } from "./schedule-store.ts";

type Input = { key: string; computer: string; version: string; computerName: string };

/** POST schedule-approved → the computer says which version was approved on it, for the inbox to show; nothing runs on
 *  this word. A team copy binds to the first computer that approves it, and its clock starts. */
export const scheduleApproved = inboxAction<Input>({
  operationId: "inbox.schedule-approved", summary: "Report an approval", description: "The computer that runs a schedule reports the version approved on it.",
  input: z.strictObject({
    key: scheduleKey.describe("The schedule's key."), computer: computerId.describe("This computer's id."),
    version: z.string().regex(/^[a-f0-9]{64}$/).describe("The version the person approved here."),
    computerName: z.string().min(1).max(100).describe("This computer's name, as the inbox shows it."),
  }),
  output: z.strictObject({ schedule }), encoding: "json", effect: "write",
  async run(at, { key, computer, version, computerName }) {
    const row = await findSchedule(at, key);
    if (!row || row.host !== "app") return fail("not_found", 404);
    if (row.revision !== version) return fail("changed", 409);
    if (row.computer_id && row.computer_id !== computer) return fail("other_computer", 409);
    const next = row.computer_id ? row.next_run_at : row.state === "on" && row.ended_at === null ? firstRun(JSON.parse(row.timing_json), at.now) : null;
    await mine(at, `UPDATE schedules SET computer_id = ?4, approved_version = ?5, approved_at = ?8, approved_by_computer = ?4, computer_name = ?6,
      next_run_at = ?7, updated_at = ?8 WHERE installation_id = ?1 AND email = ?2 AND key = ?3`, key, computer, version, computerName, next, at.now).run();
    await at.wake(computer);
    return Response.json({ schedule: shown((await findSchedule(at, key))!) });
  },
});
