import { z } from "zod";
import { fail, inboxAction, mine } from "./store.ts";
import { findRun, run, runId, runShown, settleRuns } from "./schedule-store.ts";

type Input = { id: string; state: string; reason?: string; chatTitle?: string; agentId?: string };

/** A one-time schedule with no goal ends once its run started: the person sees it under Ended, never On. A goal ends
 *  only when a run proves its `until` met. */
const END_ONCE = `UPDATE schedules SET state = 'paused', next_run_at = NULL, ended_at = ?4, end_reason = 'Its one run started.', updated_at = ?4
  WHERE installation_id = ?1 AND email = ?2 AND ended_at IS NULL AND until IS NULL AND json_extract(timing_json, '$.mode') = 'once'
  AND key = (SELECT key FROM schedule_runs WHERE installation_id = ?1 AND email = ?2 AND id = ?3 AND state = 'started')`;

/** POST run-result → what became of a run the computer took: started, blocked (`not_approved`, `changed`, `ended`,
 *  `no_folder`, `no_work`, `checkins_off`) or failed. Only a `taken` run takes it; a timed-out one stays failed. */
export const runResult = inboxAction<Input>({
  operationId: "inbox.run-result", summary: "Report a run", description: "Say whether a collected schedule run started.",
  input: z.strictObject({
    id: runId.describe("The run's id."), state: z.enum(["started", "blocked", "failed"]).describe("What became of it."),
    reason: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/).optional().describe("Why it did not start, as a short code."),
    chatTitle: z.string().max(200).optional().describe("The chat it started."), agentId: z.string().max(100).optional().describe("The agent running it."),
  }),
  output: z.strictObject({ run }), encoding: "json", effect: "write",
  async run(at, { id, state, reason, chatTitle, agentId }) {
    await settleRuns(at);
    await at.db.batch([
      mine(at, `UPDATE schedule_runs SET state = ?4, result = ?5, chat_title = ?6, agent_id = ?7, updated_at = ?8
        WHERE installation_id = ?1 AND email = ?2 AND id = ?3 AND state = 'taken'`, id, state, reason ?? null, chatTitle ?? null, agentId ?? null, at.now),
      mine(at, END_ONCE, id, at.now),
    ]);
    await at.wake(null);
    const found = await findRun(at, id);
    return found ? Response.json({ run: runShown(found) }) : fail("not_found", 404);
  },
});
