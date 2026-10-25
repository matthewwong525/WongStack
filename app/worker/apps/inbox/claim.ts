import { z } from "zod";
import { inboxAction, mine, seen } from "./store.ts";
import { computerId, tick } from "./schedule-store.ts";

const claimed = z.strictObject({ id: z.string(), key: z.string(), revision: z.string(), dueAt: z.number() });

/** POST claim → the computer collects the runs waiting for it. Each is `taken` from then on: no other claim gets it,
 *  and it fails if no result comes. A clock run past its lateness is missed, never handed out. */
export const claim = inboxAction<{ computer: string }>({
  operationId: "inbox.claim", summary: "Collect waiting runs", description: "The person's computer collects the schedule runs waiting for it.",
  input: z.strictObject({ computer: computerId.describe("This computer's id.") }), output: z.strictObject({ runs: z.array(claimed) }),
  encoding: "json", effect: "write",
  async run(at, { computer }) {
    await seen(at);
    await tick(at);
    const { results: taken } = await mine(at, `UPDATE schedule_runs SET state = 'taken', claimed_at = ?4, updated_at = ?4
      WHERE installation_id = ?1 AND email = ?2 AND state = 'due' AND key IN (SELECT key FROM schedules WHERE installation_id = ?1
        AND email = ?2 AND host = 'app' AND state = 'on' AND computer_id = ?3) RETURNING id`, computer, at.now).all<{ id: string }>();
    const { results } = await mine(at, `SELECT r.id, r.key, s.revision, r.due_at AS dueAt FROM schedule_runs r JOIN schedules s
      ON s.installation_id = r.installation_id AND s.email = r.email AND s.key = r.key
      WHERE r.installation_id = ?1 AND r.email = ?2 AND r.id IN (SELECT value FROM json_each(?3)) ORDER BY r.due_at`,
    JSON.stringify(taken.map(row => row.id))).all<z.infer<typeof claimed>>();
    return Response.json({ runs: results });
  },
});
