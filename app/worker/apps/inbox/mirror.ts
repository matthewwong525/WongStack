import { z } from "zod";
import { inboxAction, mine } from "./store.ts";
import { computerId, scheduleKey, timing } from "./schedule-store.ts";

const copied = z.strictObject({
  key: scheduleKey, name: z.string().min(1).max(200), summary: z.string().max(300), timing, nextRunAt: z.number().int().nonnegative().nullable(),
  state: z.enum(["on", "paused"]),
});
type Input = { computer: string; schedules: z.infer<typeof copied>[] };

/** PUT mirror → replaces the copies of this computer's Paseo schedules, so the inbox lists them. A copy is read-only:
 *  never clocked or claimed, and it never replaces a schedule on the app's clock. */
export const mirror = inboxAction<Input>({
  operationId: "inbox.mirror", summary: "Copy Paseo schedules", description: "The computer replaces its copies of the schedules Paseo runs.",
  input: z.strictObject({ computer: computerId.describe("This computer's id."), schedules: z.array(copied).max(100).describe("Its Paseo schedules.") }),
  output: z.strictObject({ mirrored: z.number() }), encoding: "json", effect: "write",
  limits: { inputBytes: 262144, outputBytes: 65536, timeoutMs: 15000 },
  async run(at, { computer, schedules }) {
    await at.db.batch([
      mine(at, `DELETE FROM schedules WHERE installation_id = ?1 AND email = ?2 AND host = 'paseo' AND computer_id = ?3
        AND key NOT IN (SELECT value FROM json_each(?4))`, computer, JSON.stringify(schedules.map(copy => copy.key))),
      ...schedules.map(copy => mine(at, `INSERT INTO schedules (installation_id, email, key, host, computer_id, name, summary, timing_json,
        revision, state, next_run_at, updated_at) VALUES (?1, ?2, ?3, 'paseo', ?4, ?5, ?6, ?7, '', ?8, ?9, ?10)
        ON CONFLICT (installation_id, email, key) DO UPDATE SET computer_id = excluded.computer_id, name = excluded.name,
          summary = excluded.summary, timing_json = excluded.timing_json, state = excluded.state, next_run_at = excluded.next_run_at,
          updated_at = excluded.updated_at WHERE schedules.host = 'paseo'`,
      copy.key, computer, copy.name, copy.summary, JSON.stringify(copy.timing), copy.state, copy.nextRunAt, at.now)),
    ]);
    await at.wake(null);
    const count = await mine(at, `SELECT COUNT(*) AS n FROM schedules WHERE installation_id = ?1 AND email = ?2 AND host = 'paseo'
      AND computer_id = ?3`, computer).first<{ n: number }>();
    return Response.json({ mirrored: count!.n });
  },
});
