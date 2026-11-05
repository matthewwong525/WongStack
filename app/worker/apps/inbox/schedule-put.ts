import { z } from "zod";
import { fail, inboxAction, mine, type Scope } from "./store.ts";
import { computerId, definition, type Definition, findSchedule, firstRun, readable, schedule, scheduleKey, scheduleVersion,
  shown } from "./schedule-store.ts";

type Input = Definition & { computer: string };
type Before = { host: string; state: string; ended_at: number | null; made_by: string | null; computer_id: string };

/** Writes `input` as the schedule of `at.email` on `computer`: an app row keeps whether it is paused and ended, and
 *  a row runs next only while on, not ended and bound to a computer. */
async function write(at: Scope, input: Definition, { computer, madeBy, before }: { computer: string; madeBy: string | null; before: Before | null }) {
  const version = await scheduleVersion(input);
  const kept = before?.host === "app";
  const state = kept ? before.state : "on", ended = kept ? before.ended_at : null;
  const next = state === "on" && ended === null && computer ? firstRun(input.timing, at.now) : null;
  await mine(at, `INSERT INTO schedules (installation_id, email, key, host, computer_id, name, summary, timing_json, revision, state,
    next_run_at, min_interval_ms, kind, instructions, run_json, authority_json, until, made_by, updated_at)
    VALUES (?1, ?2, ?3, 'app', ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)
    ON CONFLICT (installation_id, email, key) DO UPDATE SET host = 'app', computer_id = excluded.computer_id, name = excluded.name,
      summary = excluded.summary, timing_json = excluded.timing_json, revision = excluded.revision, state = excluded.state,
      next_run_at = excluded.next_run_at, min_interval_ms = excluded.min_interval_ms, kind = excluded.kind, instructions = excluded.instructions,
      run_json = excluded.run_json, authority_json = excluded.authority_json, until = excluded.until,
      made_by = COALESCE(schedules.made_by, excluded.made_by), updated_at = excluded.updated_at`,
  input.key, computer, input.name, input.summary, JSON.stringify(input.timing), version, state, next, input.authority?.minIntervalMs ?? null,
  input.kind ?? "chat", input.instructions, JSON.stringify(input.run), JSON.stringify(input.authority ?? {}), input.until ?? null, madeBy,
  at.now).run();
}

const before = (at: Scope, key: string) => mine(at, `SELECT host, state, ended_at, made_by, computer_id FROM schedules
  WHERE installation_id = ?1 AND email = ?2 AND key = ?3`, key).first<Before>();

/** PUT schedule → puts one of the caller's schedules on the app's clock, bound to one computer, and answers its
 *  version. One already here keeps whether it is paused or ended; one copied from Paseo moves here, switched on. */
export const schedulePut = inboxAction<Input>({
  operationId: "inbox.schedule-put", summary: "Put a schedule on the app's clock", description: "Add or update a schedule the app starts on one computer.",
  input: z.strictObject({ key: scheduleKey.describe("The schedule's key."), computer: computerId.describe("The computer that runs it."), ...definition }),
  output: z.strictObject({ schedule }), encoding: "json", effect: "write",
  async run(at, input) {
    if (!readable(input.timing)) return fail("bad_timing", 400);
    await write(at, input, { computer: input.computer, madeBy: null, before: await before(at, input.key) });
    await at.wake(input.computer);
    return Response.json({ schedule: shown((await findSchedule(at, input.key))!) });
  },
});

type TeamInput = Definition & { people: string[] };

/** PUT team-schedule → the owner makes one copy of a schedule for each person named. A copy is that person's own:
 *  unbound until they approve it on their computer, never read back to the owner. A person's own schedule is kept. */
export const teamSchedulePut = inboxAction<TeamInput>({
  operationId: "inbox.schedule-team-put", summary: "Make a schedule for the team", description: "The owner gives each person their own copy of one schedule.",
  input: z.strictObject({ people: z.array(z.email().max(254)).min(1).max(50).describe("Each teammate who gets a copy."),
    key: scheduleKey.describe("The schedule's key."), ...definition }),
  output: z.strictObject({ copied: z.number(), skipped: z.number() }), encoding: "json", effect: "write",
  async run(at, { people, ...input }) {
    // The contract answers a 403 as `forbidden`.
    if (at.email !== at.owner) return new Response(null, { status: 403 });
    if (!readable(input.timing)) return fail("bad_timing", 400);
    let copied = 0, skipped = 0;
    for (const email of new Set(people.map(person => person.toLowerCase()).filter(person => person !== at.owner))) {
      const theirs = { ...at, email };
      const found = await before(theirs, input.key);
      if (found && found.made_by === null) { skipped += 1; continue; }
      await write(theirs, input, { computer: found?.computer_id ?? "", madeBy: at.owner, before: found });
      copied += 1;
    }
    return Response.json({ copied, skipped });
  },
});
