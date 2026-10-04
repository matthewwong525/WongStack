import { z } from "zod";
import { defineAction } from "./contract.ts";

// GET /api/health: the app is up, including the open starter.
export const health = defineAction({
  operationId: "main.health", summary: "Check the app", description: "Return whether the app is running.",
  input: z.strictObject({}), output: z.strictObject({ ok: z.literal(true) }), encoding: "none",
  effect: "read", agentAvailable: true, requiresIdentity: false, errors: {}, examples: [{ input: {}, output: { ok: true } }],
  handler: () => Response.json({ ok: true }),
});
