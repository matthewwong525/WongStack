import { z } from "zod";
import { fail, inboxAction, mine } from "./store.ts";
import { computerId, findSchedule, firstRun, readable, schedule, scheduleKey, shown, timing, type Timing } from "./schedule-store.ts";

type Input = { key: string; computer: string; name: string; summary: string; timing: Timing; revision: string; minIntervalMs?: number };

/** PUT schedule → puts one of the caller's schedules on the app's clock, bound to one computer. A schedule already here
 *  keeps whether it is paused; one copied from Paseo moves here, switched on. */
export const schedulePut = inboxAction<Input>({
  operationId: "inbox.schedule-put", summary: "Put a schedule on the app's clock", description: "Add or update a schedule the app starts on one computer.",
  input: z.strictObject({
    key: scheduleKey.describe("The schedule's key, as its record is named."), computer: computerId.describe("The computer that runs it."),
    name: z.string().min(1).max(200).describe("Its name."), summary: z.string().max(300).describe("What it does, in a line."),
    timing: timing.describe("When it runs, as the record's timing."), revision: z.string().regex(/^[a-f0-9]{64}$/).describe("The approved instructions' sha256."),
    minIntervalMs: z.number().int().positive().optional().describe("The least time between two runs asked for now."),
  }),
  output: z.strictObject({ schedule }), encoding: "json", effect: "write",
  async run(at, input) {
    if (!readable(input.timing)) return fail("bad_timing", 400);
    const before = await mine(at, "SELECT host, state FROM schedules WHERE installation_id = ?1 AND email = ?2 AND key = ?3", input.key)
      .first<{ host: string; state: string }>();
    const state = before?.host === "app" ? before.state : "on";
    await mine(at, `INSERT INTO schedules (installation_id, email, key, host, computer_id, name, summary, timing_json, revision, state,
      next_run_at, min_interval_ms, updated_at) VALUES (?1, ?2, ?3, 'app', ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
      ON CONFLICT (installation_id, email, key) DO UPDATE SET host = 'app', computer_id = excluded.computer_id, name = excluded.name,
        summary = excluded.summary, timing_json = excluded.timing_json, revision = excluded.revision, state = excluded.state,
        next_run_at = excluded.next_run_at, min_interval_ms = excluded.min_interval_ms, updated_at = excluded.updated_at`,
    input.key, input.computer, input.name, input.summary, JSON.stringify(input.timing), input.revision, state,
    state === "on" ? firstRun(input.timing, at.now) : null, input.minIntervalMs ?? null, at.now).run();
    await at.wake(input.computer);
    return Response.json({ schedule: shown((await findSchedule(at, input.key))!) });
  },
});
