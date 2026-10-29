// The week board's server side: whose board a call reads, its errors and its shapes. The board's tables hold one
// board, the app owner's, so every route acts for the owner alone. wiki/development/reply-links.md
import { z } from "zod";
import { checkerOwns, defineAction, humanEmail, ownerEmail, type Action } from "../../../api/contract.ts";
import { isMonday, taskSlots, taskStatuses } from "../../../../src/lib/board.ts";
import { installationOf } from "../store.ts";
import { wake } from "../wake.ts";

/** A refusal a route answers with its code: what was sent is wrong, or names no such task or group. */
export class BoardError extends Error {
  code: "not_found" | "validation_failed";
  status: number;
  constructor(code: BoardError["code"]) {
    super(code);
    this.code = code;
    this.status = code === "not_found" ? 404 : 400;
  }
}

const ERRORS = { not_found: "No such task or group.", validation_failed: "Some fields need correction." };

/** The week as its Monday. */
export const mondayWeek = z.string().refine(isMonday).describe("The Monday of the week, as YYYY-MM-DD.");
export const slot = z.enum(taskSlots);
const status = z.enum(taskStatuses);
export const task = z.strictObject({
  id: z.string(), title: z.string(), status, week: z.string().nullable(), slot, backlogGroupId: z.string().nullable(), position: z.number(),
  estimateHours: z.number().nullable(), importKey: z.string().nullable(), link: z.string().nullable(), chat: z.string().nullable(),
  createdAt: z.string(), updatedAt: z.string(),
});
export const group = z.strictObject({ id: z.string(), name: z.string(), position: z.number(), isDefault: z.boolean() });
export const plan = z.strictObject({ week: z.string(), goal: z.string(), backlogGroups: z.array(group), slots: z.record(slot, z.array(task)) });

type Spec = Pick<Action, "operationId" | "summary" | "description" | "input" | "output" | "encoding" | "effect" | "limits" | "confirmWith">;

/** A board route: the owner alone passes, and the checker on staging. A daily route is `agentAvailable`, so a skill
 *  calls it through `company-api.mjs call`. A write wakes the owner's open Inbox. */
export function boardAction<Input>({ run, agentAvailable = false, examples = [], ...spec }: Spec & {
  agentAvailable?: boolean; examples?: Action["examples"]; run: (db: D1DatabaseSession, input: Input) => Promise<unknown>;
}): Action {
  return defineAction({
    ...spec, agentAvailable, examples, requiresIdentity: false, errors: ERRORS,
    allowed: identity => humanEmail(identity) !== null || identity?.kind === "service",
    handler: async (_request, env, { identity, input }) => {
      const owner = ownerEmail(env);
      if (!owner || (humanEmail(identity) !== owner && !checkerOwns(env, identity))) return Response.json({}, { status: 403 });
      const db = env.DB.withSession("first-primary");
      try {
        const answer = await run(db, input as Input);
        if (spec.effect === "write") await wake(env, await installationOf(db), owner, null);
        return Response.json(answer);
      } catch (error) {
        if (error instanceof BoardError) return Response.json({ error: { code: error.code } }, { status: error.status });
        throw error;
      }
    },
  });
}

/** The time a row changed, as every board table writes it. */
export const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";
